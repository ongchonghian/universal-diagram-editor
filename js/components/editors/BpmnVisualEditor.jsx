import React, { useState, useEffect, useRef } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import resizeTask from 'bpmn-js-task-resize';
import CustomContextPadProvider from './bpmn/CustomContextPadProvider';
import CustomSplitLaneHandler from './bpmn/CustomSplitLaneHandler';
import CustomTransposeHandler from './bpmn/CustomTransposeHandler';
import CustomRenderer from './bpmn/CustomRenderer';
const universalModdle = {
  "name": "UniversalDiagram",
  "uri": "http://universal-diagram/ns",
  "prefix": "uni",
  "xml": {
    "tagAlias": "lowerCase"
  },
  "types": [
    {
      "name": "LaneExtension",
      "extends": [
        "bpmn:Lane"
      ],
      "properties": [
        {
          "name": "hideTop",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "hideBottom",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "hideLeft",
          "isAttr": true,
          "type": "Boolean"
        },
        {
          "name": "hideRight",
          "isAttr": true,
          "type": "Boolean"
        }
      ]
    }
  ]
};

// Custom module to bundle our extensions
const customModule = {
  __init__: [ 'customContextPadProvider', 'customSplitLaneHandler', 'customTransposeHandler', 'customRenderer' ],
  customContextPadProvider: [ 'type', CustomContextPadProvider ],
  customSplitLaneHandler: [ 'type', CustomSplitLaneHandler ],
  customTransposeHandler: [ 'type', CustomTransposeHandler ],
  customRenderer: [ 'type', CustomRenderer ]
};

// We also need to override the default 'lane.split' handler command.
// We can do this by registering a command interceptor or just overwriting it?
// Best way in bpmn-js: The handler is registered to 'lane.split'.
// If we register OUR handler to 'lane.split' in __init__, it might conflict.
// Actually, handlers are registered specifically via commandStack.registerHandler.

const customModelingModule = {
    __init__: [ 'modelingExtension' ],
    modelingExtension: [ 'type', function(commandStack, modeling) {
        // Register our custom handler for 'custom.lane.split' to avoid collision with default 'lane.split'
        commandStack.registerHandler('custom.lane.split', CustomSplitLaneHandler);
        commandStack.registerHandler('custom.lane.transpose', CustomTransposeHandler);
    }]
};


const EMPTY_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="412" y="240" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export const BpmnVisualEditor = ({ xml, onChange, onError }) => {
    const containerRef = useRef(null);
    const [modeler, setModeler] = useState(null);
    const lastXmlRef = useRef(null);
    
    useEffect(() => {
        if (!containerRef.current) return;

        const newModeler = new BpmnModeler({
            container: containerRef.current,
            additionalModules: [
                resizeTask,
                customModule,
                customModelingModule
            ],
            moddleExtensions: {
                uni: universalModdle
            },
            taskResizingEnabled: true
        });

        newModeler.on('commandStack.changed', async () => {
            try {
                const { xml: newXml } = await newModeler.saveXML({ format: true });
                lastXmlRef.current = newXml;
                onChange(newXml);
            } catch (e) {
                console.error(e);
            }
        });

        setModeler(newModeler);

        return () => {
             newModeler.destroy();
        };
    }, []);

    // Handle XML prop updates (external changes)
    useEffect(() => {
        if (!modeler) return;
        
        const content = (xml && xml.trim()) ? xml : EMPTY_BPMN;
        
        // Avoid re-importing if the content matches what we just saved (or previously imported)
        if (content === lastXmlRef.current) return;

        lastXmlRef.current = content;
        
        modeler.importXML(content).catch(err => {
            console.error("BPMN import error", err);
            onError?.(err.message);
            // Try fallback to empty if import failed
            if (content !== EMPTY_BPMN) {
                modeler.importXML(EMPTY_BPMN).then(() => {
                    lastXmlRef.current = EMPTY_BPMN;
                }).catch(e => console.error("Fallback error", e));
            }
        });
        
    }, [xml, modeler]);

    return (
        <div className="w-full h-full relative">
            <div ref={containerRef} className="w-full h-full bg-white"></div>
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur border border-slate-200 rounded-lg shadow-sm p-2 text-xs text-slate-500">
                Powered by bpmn.io
            </div>
        </div>
    );
};
