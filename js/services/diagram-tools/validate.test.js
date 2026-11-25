import { describe, it, expect, vi, beforeEach } from 'vitest';

// The renderer draws Mermaid with the browser and sends other types to Kroki; both are replaced here
vi.mock('../RendererAdapter.js', () => ({
    rendererAdapter: { render: vi.fn() }
}));

import { rendererAdapter } from '../RendererAdapter.js';
import { validateDiagram, checkMermaidTimeline, hasBpmnLayout, isPlantUmlC4 } from './validate.js';

const BPMN_NO_LAYOUT = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="D1" targetNamespace="http://example.com">
  <bpmn:process id="P1"><bpmn:startEvent id="S1" /><bpmn:endEvent id="E1" />
    <bpmn:sequenceFlow id="F1" sourceRef="S1" targetRef="E1" /></bpmn:process>
</bpmn:definitions>`;

const BPMN_WITH_LAYOUT = BPMN_NO_LAYOUT.replace('</bpmn:definitions>', `
  <bpmndi:BPMNDiagram id="DI1" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC">
    <bpmndi:BPMNPlane id="PL1" bpmnElement="P1">
      <bpmndi:BPMNShape id="S1_di" bpmnElement="S1"><dc:Bounds x="0" y="0" width="36" height="36" /></bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`);

beforeEach(() => {
    rendererAdapter.render.mockReset();
    rendererAdapter.render.mockResolvedValue({ svg: '<svg><rect/></svg>', error: null });
});

describe('validateDiagram: general', () => {
    it('reports empty code as invalid', async () => {
        const v = await validateDiagram('   ', 'mermaid');
        expect(v).toMatchObject({ valid: false, status: 'invalid', kind: 'EMPTY' });
    });
});

describe('validateDiagram: Mermaid', () => {
    it('accepts a valid flowchart and also draws the diagram', async () => {
        const v = await validateDiagram('flowchart TD\n  A --> B', 'mermaid');
        expect(v.status).toBe('valid');
        expect(rendererAdapter.render).toHaveBeenCalledWith('flowchart TD\n  A --> B', 'mermaid');
    });

    it('reports a parse error with its line number', async () => {
        const v = await validateDiagram('flowchart TD\n  A[Start] --> B{Valid?\n  B --> C', 'mermaid');
        expect(v.status).toBe('invalid');
        expect(v.kind).toBe('PARSE');
        expect(v.error).toBeTruthy();
    });

    it('reports a fault that only the renderer finds', async () => {
        rendererAdapter.render.mockResolvedValue({ svg: null, error: { message: 'Render failed on line 2' }, errorLine: 2 });
        const v = await validateDiagram('flowchart TD\n  A --> B', 'mermaid');
        expect(v).toMatchObject({ status: 'invalid', line: 2 });
    });

    it('skips the render step when asked', async () => {
        await validateDiagram('flowchart TD\n  A --> B', 'mermaid', { render: false });
        expect(rendererAdapter.render).not.toHaveBeenCalled();
    });

    it('rejects a colon in a timeline section title', () => {
        expect(checkMermaidTimeline('timeline\n  section 2020: Start\n    Event : detail')).toMatch(/line 2/);
        expect(checkMermaidTimeline('timeline\n  section Start\n    2020 : Event')).toBeNull();
        expect(checkMermaidTimeline('flowchart TD\n  section: A')).toBeNull();
    });
});

describe('validateDiagram: BPMN', () => {
    it('accepts BPMN without layout by default', async () => {
        const v = await validateDiagram(BPMN_NO_LAYOUT, 'bpmn');
        expect(v.status).toBe('valid');
        expect(v.warnings).toEqual([]);
    });

    it('reports missing layout when layout is required', async () => {
        const v = await validateDiagram(BPMN_NO_LAYOUT, 'bpmn', { requireLayout: true });
        expect(v).toMatchObject({ valid: false, status: 'invalid', kind: 'DI_LAYOUT' });
    });

    it('accepts BPMN with layout when layout is required', async () => {
        expect(hasBpmnLayout(BPMN_WITH_LAYOUT)).toBe(true);
        const v = await validateDiagram(BPMN_WITH_LAYOUT, 'bpmn', { requireLayout: true });
        expect(v.status).toBe('valid');
    });

    it('reports malformed XML as invalid', async () => {
        const v = await validateDiagram(BPMN_NO_LAYOUT.replace('<bpmn:endEvent id="E1" />', '<bpmn:endEvent id="E1">'), 'bpmn');
        expect(v.status).toBe('invalid');
    });

    it('returns bpmn-moddle warnings for an unresolved reference', async () => {
        const v = await validateDiagram(BPMN_NO_LAYOUT.replace('targetRef="E1"', 'targetRef="Missing"'), 'bpmn');
        expect(v.status).toBe('valid');
        expect(v.warnings.length).toBeGreaterThan(0);
    });
});

describe('validateDiagram: Vega-Lite and Vega', () => {
    const barLite = JSON.stringify({ data: { values: [{ a: 'x', b: 1 }] }, mark: 'bar', encoding: { x: { field: 'a', type: 'nominal' }, y: { field: 'b', type: 'quantitative' } } });

    it('accepts a valid Vega-Lite specification', async () => {
        expect((await validateDiagram(barLite, 'vegalite')).status).toBe('valid');
    });

    it('reports invalid JSON', async () => {
        const v = await validateDiagram('{ "mark": "bar", }', 'vegalite');
        expect(v.status).toBe('invalid');
        expect(v.error).toMatch(/Invalid JSON/);
    });

    it('reports a Vega-Lite specification that does not compile', async () => {
        const v = await validateDiagram(JSON.stringify({ mark: 'not-a-mark' }), 'vegalite');
        expect(v.status).toBe('invalid');
    });

    it('accepts a valid Vega specification and rejects a broken one', async () => {
        const vega = JSON.stringify({ width: 100, height: 100, data: [{ name: 't', values: [{ v: 1 }] }], marks: [{ type: 'rect', from: { data: 't' } }] });
        expect((await validateDiagram(vega, 'vega')).status).toBe('valid');
        const broken = JSON.stringify({ marks: [{ type: 'rect', from: { data: 'no-such-data' } }] });
        expect((await validateDiagram(broken, 'vega')).status).toBe('invalid');
    });
});

describe('validateDiagram: Kroki types', () => {
    it('passes PlantUML that Kroki renders', async () => {
        const v = await validateDiagram('@startuml\nA -> B\n@enduml', 'plantuml');
        expect(v.status).toBe('valid');
        expect(rendererAdapter.render).toHaveBeenCalledWith('@startuml\nA -> B\n@enduml', 'plantuml');
    });

    it('reports a Kroki syntax error with its line', async () => {
        rendererAdapter.render.mockResolvedValue({ svg: null, error: { message: 'Error 400: Syntax Error? (line: 9)' }, errorLine: 9 });
        const v = await validateDiagram('@startuml\nA ::: B\n@enduml', 'plantuml');
        expect(v).toMatchObject({ valid: false, status: 'invalid', line: 9 });
    });

    it.each(['Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', 'fetch failed', 'HTTP 503'])(
        'treats a network fault (%s) as unverified, not invalid',
        async (message) => {
            rendererAdapter.render.mockResolvedValue({ svg: null, error: { message } });
            const v = await validateDiagram('digraph { a -> b }', 'graphviz');
            expect(v).toMatchObject({ valid: true, status: 'unverified' });
        }
    );

    it('treats a C4 form drawn only by the visual editor as unverified', async () => {
        rendererAdapter.render.mockResolvedValue({ svg: null, error: null, skipped: true });
        const v = await validateDiagram('{ "elements": [] }', 'c4');
        expect(v.status).toBe('unverified');
    });

    it('recognises the PlantUML form of C4', () => {
        expect(isPlantUmlC4('@startuml\n!include <C4/C4_Context>\n@enduml')).toBe(true);
        expect(isPlantUmlC4('{ "elements": [] }')).toBe(false);
    });
});
