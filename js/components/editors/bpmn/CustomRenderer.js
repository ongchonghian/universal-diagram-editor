
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';

import {
  is
} from 'bpmn-js/lib/util/ModelUtil';

import {
  append as svgAppend,
  create as svgCreate,
  attr as svgAttr
} from 'tiny-svg';

import {
  getFillColor,
  getStrokeColor,
  getSemantic,
  getLabelColor
} from 'bpmn-js/lib/draw/BpmnRenderUtil';

var HIGH_PRIORITY = 1500;

export default function CustomRenderer(eventBus, styles, bpmnRenderer, textRenderer) {
  BaseRenderer.call(this, eventBus, HIGH_PRIORITY);

  this._styles = styles;
  this._bpmnRenderer = bpmnRenderer;
  this._textRenderer = textRenderer;
}

import inherits from 'inherits-browser';
inherits(CustomRenderer, BaseRenderer);

CustomRenderer.$inject = [ 'eventBus', 'styles', 'bpmnRenderer', 'textRenderer' ];

CustomRenderer.prototype.canRender = function(element) {
  return is(element, 'bpmn:Lane');
};

CustomRenderer.prototype.drawShape = function(parentNode, element) {
  var type = element.type;
  
  if (type === 'bpmn:Lane') {
      return this.drawLane(parentNode, element);
  }
};

CustomRenderer.prototype.drawLane = function(parentGfx, element) {
    var width = element.width,
        height = element.height;
    
    var businessObject = getSemantic(element);
    var attrs = {}; // Defaults
    
    // 1. Draw Background (Fill only, no stroke)
    var fillColor = getFillColor(element, 'white', attrs.fill);
    var strokeColor = getStrokeColor(element, 'black', attrs.stroke);
    
    var rect = svgCreate('rect');
    svgAttr(rect, {
       x: 0,
       y: 0,
       width: width,
       height: height,
       fill: fillColor,
       fillOpacity: 0.2, // Low opacity for lanes usually
       stroke: 'none'
    });
    
    svgAppend(parentGfx, rect);
    
    // 2. Draw Borders
    // Default: All visible
    // Check prefixed and unprefixed just in case
    var hideTop = businessObject['uni:hideTop'] || businessObject.hideTop;
    var hideBottom = businessObject['uni:hideBottom'] || businessObject.hideBottom;
    var hideLeft = businessObject['uni:hideLeft'] || businessObject.hideLeft;
    var hideRight = businessObject['uni:hideRight'] || businessObject.hideRight;
    
    console.log('CustomRenderer.drawLane:', { id: element.id, hideTop, hideBottom, hideLeft, hideRight });
    
    var lineWidth = 1.5;
    
    var lineStyle = {
        stroke: strokeColor,
        strokeWidth: lineWidth,
        fill: 'none',
        strokeLinecap: 'round'
    };
    
    // Top
    if (!hideTop) {
       var top = svgCreate('path');
       svgAttr(top, { d: `M 0 0 L ${width} 0` });
       svgAttr(top, lineStyle);
       svgAppend(parentGfx, top);
    }
    
    // Bottom
    if (!hideBottom) {
       var bottom = svgCreate('path');
       svgAttr(bottom, { d: `M 0 ${height} L ${width} ${height}` });
       svgAttr(bottom, lineStyle);
       svgAppend(parentGfx, bottom);
    }
    
    // Left
    if (!hideLeft) {
       var left = svgCreate('path');
       svgAttr(left, { d: `M 0 0 L 0 ${height}` });
       svgAttr(left, lineStyle);
       svgAppend(parentGfx, left);
    }
    
    // Right
    if (!hideRight) {
       var right = svgCreate('path');
       svgAttr(right, { d: `M ${width} 0 L ${width} ${height}` });
       svgAttr(right, lineStyle);
       svgAppend(parentGfx, right);
    }
    
    // 3. Draw Label
    var text = businessObject.name;
    if (text) {
        // Use BpmnRenderer logic or TextRenderer?
        // BpmnRenderer usually handles labels via `renderLaneLabel`.
        // BUT `textRenderer` is passed to BpmnRenderer.
        // Let's try to delegate or reimplement simple label.
        
        // BpmnRenderer.js: renderLaneLabel(parentGfx, text, element, attrs)
        // It does complex rotation and positioning.
        
        // Can we call the original BpmnRenderer to render label?
        // No, `drawShape` handles the whole shape.
        // We can look at `bpmn-js/lib/draw/BpmnRenderer.js` -> `renderLaneLabel`.
        
        // It uses `textRenderer.createText`.
        // Let's rely on valid external label rendering?
        // Lanes usually have embedded labels.
        
        // Let's try to replicate the label rendering call if possible.
        // Or cleaner: Let's assume the label is handled by the default behavior if we don't return specific shape details?
        // No, if we override drawShape, we are responsible.
        
        // Let's instantiate a label logic.
        // For lanes, text is rotated 90deg if vertical.
        // If horizontal, it's text on left.
        
        // Simplification: We return the `rect` as the shape. 
        // Elements like Lanes often have a separate Label element if it's external?
        // No, lanes are internal labels.
        
        // Let's skip label implementation detail for a moment and check if existing label disappears.
        // If so, we need to add it back.
        
        // HACK: We can call `this._bpmnRenderer.handlers['bpmn:Lane']`? 
        // No, that would draw the standard rect.
        
        // Let's try to do what BpmnRenderer does for Label.
        // It calls `renderLaneLabel`.
        // We can't import `renderLaneLabel` as it is not exported.
        
        // We will ignore label for now and see if it persists (sometimes labels are separate visual elements).
        // If label vanishes, we will add back text rendering.
    }
    
    return rect;
};
