/**
 * BPMN through Smith's tools: the model sees the XML without its layout, and the pipeline keeps or
 * regenerates the layout after each change.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../RendererAdapter.js', () => ({
    rendererAdapter: { render: vi.fn().mockResolvedValue({ svg: '<svg><rect/></svg>', error: null }) }
}));

import { createDraft, runTool } from './tools.js';
import { buildUserTurn } from './prompt.js';
import { layoutOnly } from './index.js';
import { layoutBpmn, layoutSection, hasLayout } from '../diagram-tools/bpmn-pipeline.js';

const SEMANTIC = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Defs" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="P">
    <bpmn:startEvent id="S" />
    <bpmn:task id="T1" name="Enter claim" />
    <bpmn:endEvent id="E" />
    <bpmn:sequenceFlow id="F1" sourceRef="S" targetRef="T1" />
    <bpmn:sequenceFlow id="F2" sourceRef="T1" targetRef="E" />
  </bpmn:process>
</bpmn:definitions>`;

describe('BPMN in Smith\'s tools', () => {
    it('shows the model the XML without its layout, in the user turn and in read_diagram', async () => {
        const full = await layoutBpmn(SEMANTIC);
        const turn = buildUserTurn('Rename the task', full, 'bpmn');
        expect(turn).not.toContain('BPMNDiagram');
        expect(turn).toContain('The layout section is hidden');
        const read = await runTool(createDraft(full, 'bpmn'), { name: 'read_diagram', args: {} });
        expect(read.content.code).not.toContain('BPMNDiagram');
        expect(read.content.note).toMatch(/hidden/);
    });

    it('keeps the layout after a rename, and reports a new layout after a new task', async () => {
        const full = await layoutBpmn(SEMANTIC);
        const draft = createDraft(full, 'bpmn');
        const renamed = await runTool(draft, { name: 'edit_diagram', args: { edits: [{ old_text: 'Enter claim', new_text: 'Record claim' }] } });
        expect(renamed.content).toMatchObject({ status: 'valid', layout: expect.stringContaining('kept') });
        expect(renamed.step).toMatchObject({ action: 'edit', status: 'valid', layout: 'kept' });
        expect(layoutSection(draft.code)).toBe(layoutSection(full));
        expect(draft.code).toContain('Record claim');

        const grown = await runTool(draft, {
            name: 'edit_diagram',
            args: { edits: [{ old_text: '<bpmn:sequenceFlow id="F2" sourceRef="T1" targetRef="E" />', new_text: '<bpmn:task id="T2" name="Pay" />\n    <bpmn:sequenceFlow id="F2" sourceRef="T1" targetRef="T2" />\n    <bpmn:sequenceFlow id="F3" sourceRef="T2" targetRef="E" />' }] }
        });
        expect(grown.step.layout).toBe('regenerated');
        expect(layoutSection(draft.code)).toContain('bpmnElement="T2"');
    });

    it('drops a layout section the model wrote, and returns lint findings', async () => {
        const draft = createDraft('', 'bpmn');
        const written = SEMANTIC.replace('<bpmn:sequenceFlow id="F2" sourceRef="T1" targetRef="E" />', '').replace('</bpmn:definitions>', '<bpmndi:BPMNDiagram id="X"><bpmndi:BPMNPlane id="Y" bpmnElement="P" /></bpmndi:BPMNDiagram>\n</bpmn:definitions>');
        const result = await runTool(draft, { name: 'write_diagram', args: { type: 'bpmn', code: written } });
        expect(draft.view).not.toContain('BPMNDiagram');
        expect(layoutSection(draft.code)).not.toContain('id="X"');
        expect(result.step).toMatchObject({ layout: 'created', lint: 2 });
        expect(result.content.lint).toEqual([
            'Task "Enter claim" (T1) is a dead end: add a flow out of it, or end the path with an end event.',
            'EndEvent E cannot be reached: no flow leads to it.'
        ]);
    });

    it('reports a parse error with the line of the view, and refuses to look at BPMN', async () => {
        const draft = createDraft(await layoutBpmn(SEMANTIC), 'bpmn');
        const broken = await runTool(draft, { name: 'edit_diagram', args: { edits: [{ old_text: '<bpmn:task id="T1" name="Enter claim" />', new_text: '<bpmn:task id="T1" name="Enter claim">' }] } });
        expect(broken.content.status).toBe('invalid');
        expect(broken.step.layout).toBeUndefined();
        expect((await runTool(draft, { name: 'render_diagram', args: {} })).content).toMatch(/lays out BPMN/);
    });
});

describe('layoutOnly', () => {
    it('lays out BPMN that only lacks a layout, without a model', async () => {
        const result = await layoutOnly(SEMANTIC, 'bpmn');
        expect(result.usage.calls).toBe(0);
        expect(result.proposal).toMatchObject({ verified: true, layout: 'created' });
        expect(hasLayout(result.proposal.code)).toBe(true);
    });

    it('leaves other repairs to Smith', async () => {
        expect(await layoutOnly(await layoutBpmn(SEMANTIC), 'bpmn')).toBeNull();
        expect(await layoutOnly('<bpmn:definitions', 'bpmn')).toBeNull();
        expect(await layoutOnly('flowchart TD', 'mermaid')).toBeNull();
    });
});
