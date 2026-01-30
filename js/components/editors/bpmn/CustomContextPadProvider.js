
import {
  is
} from 'bpmn-js/lib/util/ModelUtil';

import {
  isExpanded,
  isEventSubProcess
} from 'bpmn-js/lib/util/DiUtil';

import {
  isAny
} from 'bpmn-js/lib/features/modeling/util/ModelingUtil';

import {
  getChildLanes
} from 'bpmn-js/lib/features/modeling/util/LaneUtil';

import {
  assign
} from 'min-dash';

/**
 * A Context Pad Provider that adds "Split Vertical" actions for Lanes.
 */
export default function CustomContextPadProvider(
    config, injector, eventBus,
    contextPad, modeling, elementFactory,
    connect, create, popupMenu,
    canvas, rules, translate) {

  config = config || {};

  contextPad.registerProvider(this);

  this._contextPad = contextPad;
  this._modeling = modeling;
  this._translate = translate;
}

CustomContextPadProvider.$inject = [
  'config.contextPad',
  'injector',
  'eventBus',
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'popupMenu',
  'canvas',
  'rules',
  'translate'
];

CustomContextPadProvider.prototype.getContextPadEntries = function(element) {
  var modeling = this._modeling;
  var translate = this._translate;
  var contextPad = this._contextPad;

  var actions = {};

  var businessObject = element.businessObject;

  function removeElement(e) {
    modeling.removeElements([ element ]);
  }

  // --- Helper to Trigger Custom Split ---
  function splitLaneHandler(count, forceVertical) {
    return function(event, element) {
      // Execute the custom command logic directly via modeling.
      // We need to register command handler for 'lane.split' to use our custom one,
      // OR we can just execute a custom command string if we registered one.
      // But simpler: modifying the 'lane.split' handler or calling specific method?
      // Since we replaced the handler logic in a separate file, we need a way to invoke it.
      
      // OPTION A: The standard `modeling.splitLane` calls `lane.split`. 
      // We will override `lane.split` command handler in BpmnVisualEditor setup.
      // But standard `modeling.splitLane` only takes (element, count). 
      // It doesn't pass 'forceVertical'.
      
      // So we need to call `commandStack.execute` directly with our extra params.
      // usage of 'lane.split' caused an override error because it's already registered by core.
      // We will use a custom command id 'custom.lane.split'.
      modeling._commandStack.execute('custom.lane.split', {
        shape: element,
        count: count,
        forceVerticalSplit: forceVertical
      });
      
      contextPad.open(element, true);
    };
  }


  if (isAny(businessObject, [ 'bpmn:Lane', 'bpmn:Participant' ]) && isExpanded(element)) {
    
    // Check if it's a lane/participant
    var childLanes = getChildLanes(element);

    // Add explicit "Merge" (Delete)
    // We only create this entry if we can delete
    assign(actions, {
      'lane-delete': {
        group: 'lane-edit',
        className: 'bpmn-icon-trash',
        title: translate('Delete Lane (Merge)'),
        action: {
          click: removeElement
        }
      }
    });

    // Only allow splitting if strictly fewer than needed lanes
    // (Standard logic)
    if (childLanes.length < 2) {
        
      // Add "Split Vertical" (Matrix Columns)
      // This corresponds to user request: "Vertical swimlanes for 1 horizontal swimlane"
      assign(actions, {
        'lane-divide-two-vertical': {
          group: 'lane-divide',
          className: 'bpmn-icon-connection-multi', // Placeholder icon: "Parallel" look?
          // ideally we want a rotated split icon. bpmn-icon-lane-insert-below is horizontal.
          // Let's use 'bpmn-icon-screw-wrench' or generic for now if no specific icon exists.
          // Actually, 'bpmn-icon-parallel-mi-marker' looks like 3 vertical lines.
          imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><path d="M5 2h2v18H5V2zm5 0h2v18h-2V2zm5 0h2v18h-2V2z" fill="black"/></svg>', // Custom SVG data URI?
          // Using standard lane divide icons.
          // Ideally they should be rotated 90 degrees to indicate vertical, but for now distinct icons are better than identical ones.
          className: 'bpmn-icon-lane-divide-two', 
          title: translate('Split Vertically (2 Sub-lanes)'),
          action: {
            click: splitLaneHandler(2, true) // Force Vertical
          }
        },
        'lane-divide-three-vertical': {
            group: 'lane-divide',
            className: 'bpmn-icon-lane-divide-three', 
            title: translate('Split Vertically (3 Sub-lanes)'),
            action: {
              click: splitLaneHandler(3, true) // Force Vertical
            }
        }
      });
      
      // Keep standard Horizontal split? 
      // The user specially asked for vertical. Standard context pad might still add horizontal ones?
      // If we *register* this provider, it ADDS to existing entries from other providers.
      // If we *register* this provider, it ADDS to existing entries from other providers.
      // If we want to strictly CONTROL it, we might need to override.
      // For now, adding these new options is safe.
    }
  }

  // Transpose Action for Pools (Participants)
  if (is(businessObject, 'bpmn:Participant')) {
      assign(actions, {
        'lane-transpose': {
            group: 'lane-edit',
            className: 'bpmn-icon-loop-marker', // Placeholder "Rotate/Loop" icon
            title: translate('Transpose Grid (Switch H/V Hierarchy)'),
            action: {
              click: function(event, element) {
                  modeling._commandStack.execute('custom.lane.transpose', {
                    shape: element
                  });
              }
            }
        }
      });
  }

  // Border Toggles for Lanes
  if (is(element, 'bpmn:Lane')) {
      console.log('Generating border toggles for lane:', element.id);
      
      // Icons: SVG Data URIs for distinct border lines
      // We must URI encode the SVG string to be safe (especially # for colors)
      
      var bgRect = "<rect x='2' y='2' width='18' height='18' style='fill:none;stroke:%23ccc;stroke-width:1;stroke-dasharray:2,2'/>";
      var strokeStyle = "style='fill:none;stroke:black;stroke-width:2'";
      
      function createIcon(lineSvg) {
          var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'>" + 
                    bgRect + 
                    lineSvg + 
                    "</svg>";
          return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
      }
      
      // Top
      var iconTop = createIcon("<line x1='2' y1='2' x2='20' y2='2' " + strokeStyle + "/>");
      
      // Bottom
      var iconBottom = createIcon("<line x1='2' y1='20' x2='20' y2='20' " + strokeStyle + "/>");
      
      // Left
      var iconLeft = createIcon("<line x1='2' y1='2' x2='2' y2='20' " + strokeStyle + "/>");
      
      // Right
      var iconRight = createIcon("<line x1='20' y1='2' x2='20' y2='20' " + strokeStyle + "/>");

      var toggles = [
          { name: 'Top', prop: 'uni:hideTop', imageUrl: iconTop },
          { name: 'Bottom', prop: 'uni:hideBottom', imageUrl: iconBottom },
          { name: 'Left', prop: 'uni:hideLeft', imageUrl: iconLeft },
          { name: 'Right', prop: 'uni:hideRight', imageUrl: iconRight }
      ];
      
      toggles.forEach(function(t) {
         // Determine current state
         // Note: moddle properties with prefix might be accessible via 'get'
         // or directly if mapped. Usually `element.businessObject['uni:hideTop']` works if defined.
         // Let's allow fallback to non-prefixed just in case.
         
         var isHidden = element.businessObject[t.prop];
         // Try logging all keys to see what exists
         // console.log('Lane BO keys:', Object.keys(element.businessObject));
         
         var title = isHidden ? 'Show ' + t.name + ' Border' : 'Hide ' + t.name + ' Border';
         
         actions['lane-toggle-' + t.prop] = {
             group: 'lane-borders',
             imageUrl: t.imageUrl, 
             title: translate(title),
             action: {
                 click: function(event, element) {
                     var current = element.businessObject[t.prop];
                     var update = {};
                     update[t.prop] = !current;
                     console.log('Toggling border:', t.prop, 'New value:', !current);
                     console.log('Current BO:', element.businessObject);
                     modeling.updateProperties(element, update);
                 }
             }
         };
      });
  }

  return actions;
};

/**
 * Handle multiple selected elements.
 */
CustomContextPadProvider.prototype.getMultiElementContextPadEntries = function(elements) {
  var modeling = this._modeling;
  var translate = this._translate;
  
  console.log('CustomContextPadProvider.getMultiElementContextPadEntries called with:', elements);

  var actions = {};
  
  // Check if all elements are Lanes
  var allLanes = elements.every(function(element) {
    return is(element, 'bpmn:Lane');
  });

  console.log('All elements are lanes:', allLanes);
  
  if (!allLanes || elements.length < 2) {
    return actions;
  }
  
  // Check if they share the same parent?
  // Ideally we only merge siblings.
  var parent = elements[0].parent;
  var sameParent = elements.every(function(element) {
    return element.parent === parent;
  });
  
  console.log('All elements have same parent:', sameParent, parent);
  
  if (!sameParent) {
    return actions;
  }

  function mergeLanes(e) {
      // Logic to merge lanes:
      // 1. Pick the first lane as TARGET.
      // 2. Move contents of other lanes (SOURCES) to TARGET.
      // 3. Delete SOURCES.
      // 4. (Optional) Resize TARGET? Standard behavior of removing a lane is that the sibling expands.
      //    So if we remove SOURCES, TARGET should expand? 
      //    With standard bpmn-js, if we remove a lane, the other lanes resize. 
      //    If we remove ALL other lanes, the remaining one should fill parent.
      
      // Sort elements? Maybe by x/y to be deterministic.
      // But preserving first selection or visual order is fine.
      
      var targetLane = elements[0];
      var sources = elements.slice(1);
      
      var elementsToMove = [];
      
      sources.forEach(function(lane) {
         var children = getChildLanes(lane); // Wait, getChildLanes returns sub-lanes. We want *FlowNodes*?
         // Lanes contain elements in 'flowNodeRef'.
         // But physically they are children in the underlying model if nested?
         // In bpmn-js, elements are children of the process/participant, NOT the lane.
         // 'flowNodeRef' links them. 
         // BUT visually, we use 'modeling.moveElements'.
         // We need to identify which elements are *visually* inside the lane?
         // OR we just rely on the fact that if we delete a lane, elements inside might be lost or float?
         // Standard behavior: Deleting a lane does NOT delete the elements if they are flow nodes, 
         // they just lose the lane ref. BUT visual containment might be tricky.
         // Let's explicitly move them to the target lane to be safe and ensure they are assigned.
         
         // We can find elements enclosed by the lane shape?
         // Or just use the model refs.
         
         // Using CLI or internal helpers to find children? 
         // 'lane.children' property in diagram-js shape hierarchy?
         if (lane.children && lane.children.length > 0) {
             elementsToMove = elementsToMove.concat(lane.children);
         }
      });
      
      if (elementsToMove.length > 0) {
          modeling.moveElements(elementsToMove, { x: 0, y: 0 }, targetLane);
      }
      
      modeling.removeElements(sources);
  }

  assign(actions, {
    'lanes-merge': {
      group: 'edit',
      className: 'bpmn-icon-trash', // Using trash icon as "Merge/Delete Others"
      title: translate('Merge Selected Lanes'),
      action: {
        click: mergeLanes
      }
    }
  });

  return actions;
};
