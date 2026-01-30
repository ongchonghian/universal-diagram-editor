
import {
  getChildLanes,
  LANE_INDENTATION
} from 'bpmn-js/lib/features/modeling/util/LaneUtil';

import {
  isHorizontal
} from 'bpmn-js/lib/util/DiUtil';

import {
  is
} from 'bpmn-js/lib/util/ModelUtil';


/**
 * Transposes the hierarchy of lanes within a Participant/Pool.
 * Converts [Stage > Role] to [Role > Stage] and vice versa.
 */
export default function CustomTransposeHandler(modeling, elementFactory) {
  this._modeling = modeling;
  this._elementFactory = elementFactory;
}

CustomTransposeHandler.$inject = [
  'modeling',
  'elementFactory'
];


CustomTransposeHandler.prototype.preExecute = function(context) {

  var modeling = this._modeling;
  var shape = context.shape; // The Participant (Pool) or Root Lane

  var outerLanes = getChildLanes(shape);

  if (!outerLanes || outerLanes.length === 0) {
     return; // Nothing to transpose
  }

  // 1. Scan / Map Phase
  // We identify dimensions.
  // Dim A = Outer Lanes (Current Parents)
  // Dim B = Inner Lanes (Current Children)
  
  var dimANames = [];
  var dimBNames = []; // We collect unique names for inner lanes
  
  // Matrix Content: [DimA_Name][DimB_Name] => [Elements]
  var contentMap = {};
  
  // Also track mapping of names to original objects for reference if needed?
  // Actually we rely on Names to merge.
  
  var isOriginalVertical = !isHorizontal(outerLanes[0]); // Check orientation of first parent
  
  outerLanes.forEach(function(outerLane) {
      var aName = outerLane.businessObject.name || outerLane.id;
      dimANames.push(aName);
      contentMap[aName] = {};
      
      var innerLanes = getChildLanes(outerLane);
      
      if (innerLanes.length === 0) {
          // Special case: Outer lane has content but no sub-lanes?
          // Treat as "Default" inner lane?
          // For now, assume consistent structure as per user requirement.
      }
      
      innerLanes.forEach(function(innerLane) {
          var bName = innerLane.businessObject.name || innerLane.id;
          if (dimBNames.indexOf(bName) === -1) {
              dimBNames.push(bName);
          }
          
          // Find elements in this inner lane
          // FlowNodes in bpmn-js are linked via refs, but visually they are centered in bounds.
          // Since we might be destroying lanes, we better grab children via containment?
          // Or usage of `lane.children` if available in shape model.
          // `innerLane.children` holds the shapes that are children of the lane shape.
          
          if (innerLane.children) {
              contentMap[aName][bName] = innerLane.children.slice(); // Copy array
          } else {
              contentMap[aName][bName] = [];
          }
      });
  });

  if (dimBNames.length === 0) {
      // Cannot transpose if no inner subdivision
      return;
  }
  
  // 2. Clear Old structure
  // We can just remove the Outer Lanes, which should remove Inner Lanes too.
  // BUT we must preserve content. 
  // We already have references in contentMap. 
  // Removing a lane does NOT delete the children shapes (Tasks), usually.
  // They become children of the Pool or Process.
  // However, `removeElements` might auto-remove children if not careful.
  // Let's safe-move them to the Pool first temporarily?
  // Or just rely on re-parenting later.
  
  // Actually, typical 'removeShape' in diagram-js removes children too.
  // So we MUST move content out first.
  
  var allContent = [];
  dimANames.forEach(function(a) {
      dimBNames.forEach(function(b) {
         if (contentMap[a][b]) {
             allContent = allContent.concat(contentMap[a][b]);
         }
      });
  });
  
  // Move all content to the Parent Shape (Pool) temporarily to save them
  if (allContent.length > 0) {
       modeling.moveElements(allContent, { x: 0, y: 0 }, shape);
  }
  
  // Remove old lanes
  modeling.removeElements(outerLanes);
  
  
  // 3. Rebuild Phase
  // New Hierarchy:
  // Outer = DimB (was Inner)
  // Inner = DimA (was Outer)
  
  // Orientation:
  // If Old Outer was Vertical -> New Outer should be Horizontal. 
  // (Because we are swapping Dimensions. Stages(V) > Roles(H)  becomes Roles(H) > Stages(V))
  
  var newOuterIsHorizontal = isOriginalVertical; // Swap
  
  // Calculate Geometry
  // We want to fill the shape bounds.
  
  var startX = shape.x + (isHorizontal(shape) ? LANE_INDENTATION : 0); 
  // Actually Pool has label on left usually (30px). 
  // Let's trust shape geometry. `shape.children` usually manages header space? 
  // Pools are special. Lane sets start after header.
  // If we assume Pool is Horizontal.
  
  var poolHeaderWidth = 30; // approx
  var bounds = {
      x: shape.x + poolHeaderWidth,
      y: shape.y,
      width: shape.width - poolHeaderWidth,
      height: shape.height
  };
  
  // Division logic
  var numNewOuter = dimBNames.length;
  var outerSize = Math.round((newOuterIsHorizontal ? bounds.height : bounds.width) / numNewOuter);
  
  dimBNames.forEach(function(bName, bIdx) {
      // Create New Outer Lane
      var outerBounds = {};
      if (newOuterIsHorizontal) {
          outerBounds = {
              x: bounds.x,
              y: bounds.y + (bIdx * outerSize),
              width: bounds.width,
              height: outerSize
          };
      } else {
           outerBounds = {
              x: bounds.x + (bIdx * outerSize),
              y: bounds.y,
              width: outerSize,
              height: bounds.height
          };
      }
      
      var newOuterLane = modeling.createShape({
          type: 'bpmn:Lane',
          isHorizontal: newOuterIsHorizontal,
          name: bName
      }, outerBounds, shape); // Parent is Pool
      
      // resize if last one to fit exactly? (Skip for simplicity, auto-layout might fix)
      
      // Update Name properly
      modeling.updateProperties(newOuterLane, { name: bName });
      
      
      // Create Inner Lanes (Dim A)
      var numNewInner = dimANames.length;
      // Inner size is based on the OTHER dimension
      var innerBaseSize = newOuterIsHorizontal ? outerBounds.width : outerBounds.height;
      // But wait.
      // If Outer is Horizontal(Row), Inner is Vertical(Col). So Inner Size is Width.
      // If Outer is Vertical(Col), Inner is Horizontal(Row). So Inner Size is Height.
      
      // Wait, simple logic:
      // If Outer is Horizontal: Inner divides Width.
      // If Outer is Vertical: Inner divides Height.
      
      var innerSize = Math.round((newOuterIsHorizontal ? 
          (outerBounds.width - LANE_INDENTATION) : // Header of Outer Lane
          (outerBounds.height - LANE_INDENTATION)) / numNewInner);
      
      dimANames.forEach(function(aName, aIdx) {
           var innerBounds = {};
           
           if (newOuterIsHorizontal) {
               // Outer is Row. Inner is Col (Vertical).
               // x advances. y is static relative to parent.
               innerBounds = {
                   x: outerBounds.x + LANE_INDENTATION + (aIdx * innerSize),
                   y: outerBounds.y,
                   width: innerSize,
                   height: outerBounds.height
               };
           } else {
               // Outer is Col. Inner is Row (Horizontal).
               innerBounds = {
                   x: outerBounds.x,
                   y: outerBounds.y + LANE_INDENTATION + (aIdx * innerSize),
                   width: outerBounds.width,
                   height: innerSize
               };
           }
           
           var newInnerLane = modeling.createShape({
               type: 'bpmn:Lane',
               isHorizontal: !newOuterIsHorizontal,
               name: aName
           }, innerBounds, newOuterLane);
           
           modeling.updateProperties(newInnerLane, { name: aName });
           
           // 4. Migrate Phase
           // Move content back from Pool to this specific Inner Lane
           var content = contentMap[aName][bName];
           if (content && content.length > 0) {
               modeling.moveElements(content, { x: 0, y: 0 }, newInnerLane);
           }
      });
  });

};
