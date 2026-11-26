// Utility functions for Kroki Universal Diagram Generator
import { DIAGRAM_TYPES } from './config.js';
import pako from 'pako';
import { ARCHIFY_DIAGRAM_LABELS } from './services/archify.js';







/**
 * Detect specific diagram model/subtype from code content
 * @param {string} code - The diagram source code
 * @param {string} type - The main diagram type
 * @returns {string} - Specific model name
 */
export const detectSpecificModel = (code, type) => {
    if (!code || !code.trim()) return 'Empty';
    const cleanCode = code.trim();

    if (type === 'mermaid') {
        if (/^\s*sequenceDiagram/m.test(cleanCode)) return 'Sequence Diagram';
        if (/^\s*(graph|flowchart)\s+/m.test(cleanCode)) return 'Flowchart';
        if (/^\s*classDiagram/m.test(cleanCode)) return 'Class Diagram';
        if (/^\s*stateDiagram/m.test(cleanCode)) return 'State Diagram';
        if (/^\s*erDiagram/m.test(cleanCode)) return 'Entity Relationship';
        if (/^\s*gantt/m.test(cleanCode)) return 'Gantt Chart';
        if (/^\s*pie/m.test(cleanCode)) return 'Pie Chart';
        if (/^\s*timeline/m.test(cleanCode)) return 'Timeline';
        if (/^\s*mindmap/m.test(cleanCode)) return 'Mindmap';
        if (/^\s*journey/m.test(cleanCode)) return 'User Journey';
        if (/^\s*gitGraph/m.test(cleanCode)) return 'Git Graph';
        if (/^\s*quadrantChart/m.test(cleanCode)) return 'Quadrant Chart';
        if (/^\s*requirementDiagram/m.test(cleanCode)) return 'Requirement Diagram';
        if (/^\s*c4Context/m.test(cleanCode) || /^\s*c4Container/m.test(cleanCode) || /^\s*c4Component/m.test(cleanCode)) return 'C4 Diagram';
        if (/^\s*sankey-beta/m.test(cleanCode)) return 'Sankey Diagram';
        if (/^\s*xychart-beta/m.test(cleanCode)) return 'XY Chart';
        if (/^\s*block-beta/m.test(cleanCode)) return 'Block Diagram';
        if (/^\s*packet-beta/m.test(cleanCode)) return 'Packet Diagram';
        if (/^\s*kanban/m.test(cleanCode)) return 'Kanban Board';
        if (/^\s*architecture-beta/m.test(cleanCode)) return 'Architecture Diagram';
        return 'Mermaid Diagram';
    }

    if (type === 'c4') {
        // Check for JSON (Visual Editor)
        if (cleanCode.startsWith('{')) return 'C4 Model (Visual)';
        
        // Check for PlantUML C4
        if (/@startuml/m.test(cleanCode) || /!include.*C4/m.test(cleanCode)) return 'C4 Model (PlantUML)';
        
        return 'C4 Model';
    }

    if (type === 'plantuml') {
        if (/@startmindmap/m.test(cleanCode)) return 'Mindmap';
        if (/@startwbs/m.test(cleanCode)) return 'Work Breakdown Structure';
        if (/@startjson/m.test(cleanCode)) return 'JSON Data';
        if (/@startyaml/m.test(cleanCode)) return 'YAML Data';
        if (/@startgantt/m.test(cleanCode)) return 'Gantt Chart';
        
        if (/@startuml/m.test(cleanCode)) {
            // Timing Diagram
            if (/^(clock|binary|robust|concise)\s+/m.test(cleanCode)) return 'Timing Diagram';

            // Network Diagram (nwdiag within plantuml)
            if (/^nwdiag\s*\{/m.test(cleanCode)) return 'Network Diagram';

            // Deployment Diagram
            if (/^(node|cloud|database|artifact|folder|frame|component)\s+/m.test(cleanCode) || /^node\s+/m.test(cleanCode)) return 'Deployment Diagram';

            // State Diagram
            if (/^(\[\*\]|state\s+)/m.test(cleanCode)) return 'State Diagram';
            
            // Activity Diagram
            if (/^(start|stop|:|if\s*\()/m.test(cleanCode)) return 'Activity Diagram';
            
            // Component Diagram (component keyword also used in deployment, but primary use here)
            if (/^component\s+/m.test(cleanCode) && !/node|cloud/.test(cleanCode)) return 'Component Diagram';

            // Use Case Diagram
            if (/^(usecase|actor\s+[\w\s"]+as\s+[\w\s"]+$)/m.test(cleanCode) || /^\(/.test(cleanCode)) return 'Use Case Diagram';

            // Class Diagram
            if (/^(class|interface|enum|abstract)\s+/m.test(cleanCode) || /<\|--/.test(cleanCode)) return 'Class Diagram';
            
            // Sequence Diagram
            if (/^(participant|boundary|control|entity|database)\s+|->/.test(cleanCode)) return 'Sequence Diagram';
            
            return 'UML Diagram';
        }
    }

    if (type === 'bpmn') {
        if (/<(\w+:)?collaboration/i.test(cleanCode)) return 'Collaboration (Swimlanes)';
        if (/<(\w+:)?process/i.test(cleanCode)) return 'Process Flow';
        if (/<(\w+:)?definitions/i.test(cleanCode)) return 'BPMN Definition';
    }

    if (type === 'archify') {
        // The diagram kind is read from the code as typed, so the badge keeps up while the JSON is incomplete
        const kind = /"diagram_type"\s*:\s*"(\w+)"/.exec(cleanCode)?.[1];
        if (ARCHIFY_DIAGRAM_LABELS[kind]) return ARCHIFY_DIAGRAM_LABELS[kind];
    }

    return DIAGRAM_TYPES[type]?.label || 'Diagram';
};



/**
 * Escape special regex characters in a string
 * @param {string} string - String to escape
 * @returns {string} - Escaped string safe for use in RegExp
 */
export const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Load external script with AMD compatibility handling
 * @param {string} src - Script URL
 * @returns {Promise} - Resolves when script is loaded
 */
export const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        
        // Temporarily remove AMD define to prevent conflicts
        let amdDefine = null;
        if (window.define && window.define.amd) {
            amdDefine = window.define;
            window.define = undefined;
        }
        
        script.onload = () => {
            if (amdDefine) window.define = amdDefine; 
            resolve();
        };
        
        script.onerror = (e) => {
            if (amdDefine) window.define = amdDefine; 
            reject(e);
        };
        
        document.head.appendChild(script);
    });
};

/**
 * Load external CSS file
 * @param {string} href - CSS URL
 */
export const loadCSS = (href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
};

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};


/**
 * Lay out BPMN XML: each process with bpmn-auto-layout, lanes as bands, pools around their processes.
 * An existing layout section is replaced. The pipeline lives in js/services/diagram-tools/bpmn-pipeline.js.
 * @param {string} xml - BPMN XML, with or without a layout section
 * @returns {Promise<string>} - the XML with a new layout section
 */
export const applyBpmnAutoLayout = async (xml) => {
    const { layoutBpmn } = await import('./services/diagram-tools/bpmn-pipeline.js');
    return layoutBpmn(xml);
};




