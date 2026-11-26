import { describe, it, expect } from 'vitest';
import { lintBpmn } from './bpmn-lint.js';

const wrap = (body) => `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="D" targetNamespace="x">
  <bpmn:process id="P">${body}</bpmn:process>
</bpmn:definitions>`;

describe('lintBpmn', () => {
    it('finds nothing in a tidy process', async () => {
        expect(await lintBpmn(wrap(`
            <bpmn:startEvent id="S" /><bpmn:exclusiveGateway id="G" name="Approved?" />
            <bpmn:task id="A" name="Pay" /><bpmn:task id="R" name="Reject" /><bpmn:endEvent id="E" />
            <bpmn:sequenceFlow id="F1" sourceRef="S" targetRef="G" />
            <bpmn:sequenceFlow id="F2" name="yes" sourceRef="G" targetRef="A" />
            <bpmn:sequenceFlow id="F3" name="no" sourceRef="G" targetRef="R" />
            <bpmn:sequenceFlow id="F4" sourceRef="A" targetRef="E" /><bpmn:sequenceFlow id="F5" sourceRef="R" targetRef="E" />`))).toEqual([]);
    });

    it('names dead ends, unreachable steps, unnamed gateways and branches, and empty lanes', async () => {
        const findings = await lintBpmn(wrap(`
            <bpmn:laneSet id="LS"><bpmn:lane id="L1" name="Clerk"><bpmn:flowNodeRef>S</bpmn:flowNodeRef></bpmn:lane><bpmn:lane id="L2" name="Auditor" /></bpmn:laneSet>
            <bpmn:startEvent id="S" /><bpmn:exclusiveGateway id="G" />
            <bpmn:task id="A" name="Pay" /><bpmn:task id="R" name="Reject" /><bpmn:task id="X" name="Orphan" /><bpmn:endEvent id="E" />
            <bpmn:sequenceFlow id="F1" sourceRef="S" targetRef="G" />
            <bpmn:sequenceFlow id="F2" sourceRef="G" targetRef="A" />
            <bpmn:sequenceFlow id="F3" sourceRef="G" targetRef="R" />
            <bpmn:sequenceFlow id="F4" sourceRef="A" targetRef="E" />
            <bpmn:sequenceFlow id="F6" sourceRef="X" targetRef="E" />`));
        expect(findings).toEqual([
            'Gateway G splits the flow but has no name: name it with the question it decides, such as "Approved?".',
            'Gateway G has outgoing flows without a name (F2, F3): name each branch, such as "yes" and "no".',
            'Task "Reject" (R) is a dead end: add a flow out of it, or end the path with an end event.',
            'Task "Orphan" (X) cannot be reached: no flow leads to it.',
            'Lane "Auditor" (L2) holds no elements: add flowNodeRef entries for its elements, or remove the lane.'
        ]);
    });

    it('reports a flow without a target, and a process without a start event', async () => {
        const findings = await lintBpmn(wrap('<bpmn:task id="A" /><bpmn:endEvent id="E" /><bpmn:sequenceFlow id="F1" sourceRef="A" /><bpmn:sequenceFlow id="F2" sourceRef="A" targetRef="E" />'));
        expect(findings).toContain('Sequence flow F1 has no target: give it a sourceRef and a targetRef that name existing elements.');
        expect(findings).toContain('Process P has no start event.');
    });

    it('returns nothing for XML that does not parse', async () => {
        expect(await lintBpmn('<bpmn:definitions')).toEqual([]);
    });
});
