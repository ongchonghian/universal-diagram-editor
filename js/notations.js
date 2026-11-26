// What each notation offers a user who is starting or switching a diagram:
// its group in the notation list, its starter code, its templates, its file types and its Design view.
import {
    DIAGRAM_TYPES,
    MERMAID_TEMPLATES,
    PLANTUML_TEMPLATES,
    BPMN_TEMPLATES,
    EXCALIDRAW_TEMPLATES,
    VEGA_TEMPLATES,
    VEGALITE_TEMPLATES,
    C4_VISUAL_TEMPLATES,
    C4_PLANTUML_TEMPLATES,
    GRAPHVIZ_TEMPLATES
} from './config.js';

/** The notation list, grouped by the kind of diagram a user has in mind. */
export const NOTATION_GROUPS = [
    { label: 'Many kinds of diagram', types: ['mermaid', 'plantuml', 'graphviz', 'nomnoml', 'pikchr', 'blockdiag', 'archify'] },
    { label: 'Business processes', types: ['bpmn'] },
    { label: 'Data and architecture', types: ['erd', 'c4'] },
    { label: 'Charts', types: ['vegalite', 'vega'] },
    { label: 'Sketches and text art', types: ['excalidraw', 'ditaa', 'svgbob'] },
    { label: 'Hardware and timing', types: ['wavedrom', 'bytefield', 'wireviz'] }
];

const TEMPLATES = {
    mermaid: MERMAID_TEMPLATES,
    plantuml: PLANTUML_TEMPLATES,
    bpmn: BPMN_TEMPLATES,
    excalidraw: EXCALIDRAW_TEMPLATES,
    vega: VEGA_TEMPLATES,
    vegalite: VEGALITE_TEMPLATES,
    c4: [...(C4_VISUAL_TEMPLATES || []), ...(C4_PLANTUML_TEMPLATES || [])],
    graphviz: GRAPHVIZ_TEMPLATES
};

export const hasTemplates = (type) => (TEMPLATES[type]?.length || 0) > 0;

/** Code that draws a small, valid diagram in this notation: its example, or else its first template. */
export const getStarterCode = (type) => {
    const example = DIAGRAM_TYPES[type]?.example;
    if (example && example.trim()) return example.replace(/^\n/, '');
    return TEMPLATES[type]?.[0]?.code || '';
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

const BLANK = {
    bpmn: EMPTY_BPMN,
    excalidraw: JSON.stringify({ type: 'excalidraw', version: 2, source: 'https://excalidraw.com', elements: [], appState: { viewBackgroundColor: '#ffffff', gridSize: null }, files: {} }, null, 2),
    c4: JSON.stringify({ nodes: [], edges: [] }, null, 2)
};

/** An empty canvas, for the notations whose Design view starts from one. Null for code-only notations. */
export const getBlankCode = (type) => BLANK[type] || null;

/** The file picker's filter: every extension a notation claims. */
export const fileAcceptList = () => [...new Set(Object.values(DIAGRAM_TYPES).flatMap(t => t.extensions || []))].join(',');

/** True when the code is empty, or is one of this notation's own starters that the user has not changed. */
export const isUntouchedStarter = (type, code) => {
    const trimmed = (code || '').trim();
    if (!trimmed) return true;
    const starters = [getStarterCode(type), getBlankCode(type), ...(TEMPLATES[type] || []).map(t => t.code)];
    return starters.some(s => s && s.trim() === trimmed);
};

const MERMAID_DESIGN_MODELS = ['Pie'];

/**
 * Whether Design view can edit this diagram, and the reason to show when it cannot.
 * `detectedModel` is the diagram kind the editor recognised in the code, such as "Pie Chart".
 */
export const getDesignSupport = (type, detectedModel = '', code = '') => {
    const label = DIAGRAM_TYPES[type]?.label || type;
    if (!DIAGRAM_TYPES[type]?.hasVisualEditor) {
        return { supported: false, reason: `Design view is not available for ${label}. Edit the code instead.` };
    }
    if (type === 'c4' && (code.includes('@startuml') || detectedModel === 'C4 Model (PlantUML)')) {
        return { supported: false, reason: 'Design view edits C4 models written as JSON. This model is written in PlantUML.' };
    }
    if (type === 'mermaid') {
        if (!MERMAID_DESIGN_MODELS.some(m => detectedModel.includes(m))) {
            const kind = detectedModel ? `a ${detectedModel.toLowerCase()}` : 'this diagram';
            return { supported: false, reason: `Design view edits Mermaid pie charts only. Edit ${kind} in the code.` };
        }
    }
    return { supported: true, reason: '' };
};

/**
 * Keep a renderer's error line only when it points inside the user's code.
 * A diagram server can report a line in its own source, such as "worker.js:90".
 */
export const lineInCode = (line, code) => {
    const n = Number(line);
    if (!Number.isInteger(n) || n < 1) return null;
    const count = (code || '').split('\n').length;
    return n <= count ? n : null;
};

/** Remove a server's stack trace and repeated lines from an error message, so the user reads only the cause. */
export const cleanErrorMessage = (message) => {
    const kept = [];
    for (const line of String(message || '').split('\n')) {
        const text = line.trim();
        if (!text || /^at\s/.test(text)) continue;
        // A line that only repeats the end of the line before it, such as "Error 400: Error: X" then "Error: X"
        if (kept.length && kept[kept.length - 1].trim().endsWith(text)) continue;
        kept.push(line);
    }
    return kept.join('\n').trim();
};
