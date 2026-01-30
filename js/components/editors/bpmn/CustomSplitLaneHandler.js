
import {
  getChildLanes,
  LANE_INDENTATION
} from 'bpmn-js/lib/features/modeling/util/LaneUtil';

import {
  isHorizontal
} from 'bpmn-js/lib/util/DiUtil';


/**
 * A handler that splits a lane into a number of sub-lanes,
 * strictly following the requested orientation (Matrix Layout support).
 */
export default function CustomSplitLaneHandler(modeling) {
  this._modeling = modeling;
}

CustomSplitLaneHandler.$inject = [
  'modeling'
];


CustomSplitLaneHandler.prototype.preExecute = function(context) {

  var modeling = this._modeling;

  var shape = context.shape,
      newLanesCount = context.count;

  // If forceVerticalSplit is true, we want to create Vertical Lanes (Columns) inside the shape,
  // regardless of the shape's current orientation.
  var forceVerticalSplit = context.forceVerticalSplit; 

  var childLanes = getChildLanes(shape),
      existingLanesCount = childLanes.length;

  if (existingLanesCount > newLanesCount) {
    throw new Error('more than <' + newLanesCount + '> child lanes');
  }

  // Determine the orientation we are splitting along.
  // If forceVerticalSplit is true, we are splitting along the Width (creating columns).
  // Otherwise, we default to standard behavior: splitting along the height if horizontal, width if vertical.
  var splitAlongWidth = forceVerticalSplit === true ? true : !isHorizontal(shape);

  var laneBaseSize = splitAlongWidth ? shape.width : shape.height;
  var newLanesSize = Math.round(laneBaseSize / newLanesCount);

  var laneSize,
      laneBounds,
      newLaneAttrs,
      idx;

  for (idx = 0; idx < newLanesCount; idx++) {

    // if last lane
    if (idx === newLanesCount - 1) {
      laneSize = laneBaseSize - (newLanesSize * idx);
    } else {
      laneSize = newLanesSize;
    }

    if (splitAlongWidth) {
        // Vertical Split (Columns): Layout along X axis
        laneBounds = {
            x: shape.x + idx * newLanesSize + (idx === 0 ? 30 : 0), // Small hack: spacing? No, pure math first.
            // Actually, for vertical lanes inside horizontal, usually the parent has header on left.
            // But we are splitting the *content* area of the lane?
            // Standard bpmn-js split logic uses LANE_INDENTATION.
            // Let's stick to standard logic but transposed.
            
            x: shape.x + idx * newLanesSize + (idx === 0 ? LANE_INDENTATION : 0),
            y: shape.y,
            width: laneSize - (idx === 0 ? LANE_INDENTATION : 0),
            height: shape.height
        };
    } else {
        // Horizontal Split (Rows): Layout along Y axis
        // This is standard behavior for Horizontal Pools
        laneBounds = {
            x: shape.x + LANE_INDENTATION, // Header space
            y: shape.y + idx * newLanesSize,
            width: shape.width - LANE_INDENTATION,
            height: laneSize
        };
    }
    
    // Fix bounds if we are forcing vertical split on a Horizontal Lane
    // The previous logic assumed 'splitAlongWidth' meant the container itself was Vertical
    // But here we are making the container a matrix row.
    
    // Re-evaluating Bounds based on 'forceVerticalSplit':
    if (forceVerticalSplit) {
         // modifying 'splitAlongWidth' block logic above
         laneBounds = {
            x: shape.x + LANE_INDENTATION + (idx * newLanesSize), 
            y: shape.y,
            width: laneSize,
            height: shape.height
         };
         
         // Fix the first one taking the hit for indentation?
         // No, the parent (row) has the text on the left (Indentation). 
         // So the available space starts at x + INDENTATION.
         // Wait, LANE_INDENTATION is typically 30.
         
         var availableWidth = shape.width - LANE_INDENTATION;
         var colSize = Math.round(availableWidth / newLanesCount);
         
         if (idx === newLanesCount - 1) {
            colSize = availableWidth - (colSize * idx);
         }
         
         laneBounds = {
            x: shape.x + LANE_INDENTATION + (idx * Math.round(availableWidth / newLanesCount)),
            y: shape.y,
            width: colSize,
            height: shape.height
         };
    }


    if (idx < existingLanesCount) {
      // resize existing lane
      modeling.resizeShape(childLanes[idx], laneBounds);
    } else {
      // create a new lane at position
      newLaneAttrs = {
        type: 'bpmn:Lane',
        isHorizontal: !forceVerticalSplit // If forcing vertical columns, isHorizontal is false
      };

      modeling.createShape(newLaneAttrs, laneBounds, shape);
    }
  }
};
