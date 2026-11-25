import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../js/services/RendererAdapter.js', () => ({
    rendererAdapter: { render: vi.fn() }
}));

import { rendererAdapter } from '../js/services/RendererAdapter.js';
import { runChecks, outcomeOf, codeHasTerm, readBpmnShapeBounds, isKnownCheck } from './checks.js';
import { svgHasContent } from '../js/services/diagram-tools/render.js';

const shape = (id, x) => `<bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}"><dc:Bounds x="${x}" y="10" width="100" height="80" /></bpmndi:BPMNShape>`;
const bpmn = (taskName, x) => `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="D" targetNamespace="http://example.com">
  <bpmn:process id="P"><bpmn:task id="T1" name="${taskName}" /><bpmn:task id="T2" name="Other" /></bpmn:process>
  <bpmndi:BPMNDiagram id="DI"><bpmndi:BPMNPlane id="PL" bpmnElement="P">${shape('T1', x)}${shape('T2', 200)}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>`;

beforeEach(() => {
    rendererAdapter.render.mockReset();
    rendererAdapter.render.mockResolvedValue({ svg: '<svg><rect width="1"/></svg>', error: null });
});

describe('helpers', () => {
    it('matches whole terms only', () => {
        expect(codeHasTerm('A --> Auth', 'Auth')).toBe(true);
        expect(codeHasTerm('A --> Author', 'Auth')).toBe(false);
        expect(codeHasTerm('task "Pay claimant";', 'Pay claimant')).toBe(true);
    });

    it('detects drawn content in an SVG', () => {
        expect(svgHasContent('<svg><g><path d="M0 0"/></g></svg>')).toBe(true);
        expect(svgHasContent('<svg><g></g></svg>')).toBe(false);
        expect(svgHasContent(null)).toBe(false);
    });

    it('reads BPMN shape bounds by element id', () => {
        expect(readBpmnShapeBounds(bpmn('Review', 10)).get('T1')).toBe('10,10,100,80');
    });

    it('knows every check name used by the cases', () => {
        expect(isKnownCheck('parses')).toBe(true);
        expect(isKnownCheck({ keeps: ['A'] })).toBe(true);
        expect(isKnownCheck('looks-nice')).toBe(false);
    });
});

describe('runChecks', () => {
    it('passes a Mermaid edit that parses, renders, keeps the nodes and adds the label', async () => {
        const caseDef = { checks: ['parses', 'renders', { keeps: ['Auth', 'User'] }, { contains: 'refresh' }] };
        const results = await runChecks(caseDef, { code: 'sequenceDiagram\n  User->>Auth: refresh token', type: 'mermaid' });
        expect(results.map(r => r.status)).toEqual(['pass', 'pass', 'pass', 'pass']);
        expect(outcomeOf(results)).toBe('pass');
    });

    it('fails when a kept node is missing or the label is absent', async () => {
        const caseDef = { checks: [{ keeps: ['Auth', 'Gateway'] }, { contains: 'retry' }] };
        const results = await runChecks(caseDef, { code: 'sequenceDiagram\n  User->>Auth: hi', type: 'mermaid' });
        expect(results[0]).toMatchObject({ status: 'fail', detail: 'Missing: Gateway' });
        expect(results[1].status).toBe('fail');
        expect(outcomeOf(results)).toBe('fail');
    });

    it('fails renders when the SVG is empty', async () => {
        rendererAdapter.render.mockResolvedValue({ svg: '<svg></svg>', error: null });
        const [result] = await runChecks({ checks: ['renders'] }, { code: 'digraph { }', type: 'graphviz' });
        expect(result.status).toBe('fail');
    });

    it('reports an unreachable diagram server as unverified', async () => {
        rendererAdapter.render.mockResolvedValue({ svg: null, error: { message: 'Failed to fetch' } });
        const results = await runChecks({ checks: ['parses'] }, { code: 'digraph { a -> b }', type: 'graphviz' });
        expect(results[0].status).toBe('unverified');
        expect(outcomeOf(results)).toBe('unverified');
    });

    it('checks the notation chosen by the reply', async () => {
        const [ok] = await runChecks({ checks: [{ typeIn: ['mermaid', 'plantuml'] }] }, { code: 'x', type: 'plantuml' });
        const [bad] = await runChecks({ checks: [{ typeIn: ['mermaid', 'plantuml'] }] }, { code: 'x', type: 'wavedrom' });
        expect([ok.status, bad.status]).toEqual(['pass', 'fail']);
    });

    it('passes a BPMN rename that keeps every shape in place, and fails a move', async () => {
        const start = bpmn('Review', 10);
        const caseDef = { startCode: start, checks: ['bpmn-layout', 'bounds-unchanged', 'no-removals'] };
        const renamed = await runChecks(caseDef, { code: bpmn('Line review', 10), type: 'bpmn' });
        expect(renamed.map(r => r.status)).toEqual(['pass', 'pass', 'pass']);
        const moved = await runChecks(caseDef, { code: bpmn('Line review', 50), type: 'bpmn' });
        expect(moved[1]).toMatchObject({ status: 'fail', detail: 'Moved or missing shapes: T1' });
    });

    it('fails no-removals when a BPMN element is deleted', async () => {
        const start = bpmn('Review', 10);
        const without = start.replace('<bpmn:task id="T2" name="Other" />', '').replace(shape('T2', 200), '');
        const [result] = await runChecks({ startCode: start, checks: ['no-removals'] }, { code: without, type: 'bpmn' });
        expect(result).toMatchObject({ status: 'fail' });
        expect(result.detail).toMatch(/T2/);
    });

    it('lets no-removals allow the ids the requested change replaces', async () => {
        const start = bpmn('Review', 10);
        const without = start.replace('<bpmn:task id="T2" name="Other" />', '').replace(shape('T2', 200), '');
        const [result] = await runChecks({ startCode: start, checks: [{ 'no-removals': ['T2'] }] }, { code: without, type: 'bpmn' });
        expect(result.status).toBe('pass');
    });

    it('does not count a Mermaid node as removed while the node is still in the code', async () => {
        const start = 'flowchart TD\n    Start([Order received]) --> Check{In stock?}\n    Check --> Ship[Ship order]';
        const inserted = 'flowchart TD\n    Start([Order received]) --> Pay{Paid?}\n    Pay --> Check{In stock?}\n    Check --> Ship[Ship order]';
        const [kept] = await runChecks({ startCode: start, checks: ['no-removals'] }, { code: inserted, type: 'mermaid' });
        expect(kept.status).toBe('pass');
        const dropped = 'flowchart TD\n    Check{In stock?} --> Ship[Ship order]';
        const [lost] = await runChecks({ startCode: start, checks: ['no-removals'] }, { code: dropped, type: 'mermaid' });
        expect(lost).toMatchObject({ status: 'fail', detail: 'Removed: Start' });
    });
});
