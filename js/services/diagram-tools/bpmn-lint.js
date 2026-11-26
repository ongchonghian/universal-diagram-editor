/**
 * Plain checks on a BPMN process that the parser accepts but a reader would call mistakes.
 * Smith receives the findings with each edit, as advice: a finding does not make the diagram invalid.
 */
import { createBpmnModdle } from '../../utils/bpmn-moddle.js';

const NAMED = (e) => !!(e.name && e.name.trim());
const label = (e) => (NAMED(e) ? `"${e.name.trim()}" (${e.id})` : e.id);

function flowElementsOf(container, out = []) {
    for (const element of container.flowElements || []) {
        out.push(element);
        if (element.flowElements) flowElementsOf(element, out);
    }
    return out;
}

function lanesOf(laneSet, out = []) {
    for (const lane of laneSet?.lanes || []) {
        if (lane.childLaneSet?.lanes?.length) lanesOf(lane.childLaneSet, out);
        else out.push(lane);
    }
    return out;
}

/**
 * @returns {Promise<string[]>} one sentence per finding; empty when the XML does not parse
 */
export async function lintBpmn(xml) {
    let definitions;
    try {
        const moddle = await createBpmnModdle();
        definitions = (await moddle.fromXML(xml)).rootElement;
    } catch {
        return [];
    }
    const findings = [];
    const processes = (definitions.rootElements || []).filter(e => e.$type === 'bpmn:Process');
    const collaboration = (definitions.rootElements || []).find(e => e.$type === 'bpmn:Collaboration');
    const messageEnds = new Set((collaboration?.messageFlows || []).flatMap(m => [m.sourceRef?.id, m.targetRef?.id]));

    for (const process of processes) {
        const elements = flowElementsOf(process);
        const flows = elements.filter(e => e.$type === 'bpmn:SequenceFlow');
        const nodes = elements.filter(e => e.$instanceOf?.('bpmn:FlowNode'));
        const outgoing = new Map(nodes.map(n => [n.id, 0]));
        const incoming = new Map(nodes.map(n => [n.id, 0]));

        for (const flow of flows) {
            if (!flow.sourceRef || !flow.targetRef) {
                findings.push(`Sequence flow ${flow.id} has no ${flow.sourceRef ? 'target' : 'source'}: give it a sourceRef and a targetRef that name existing elements.`);
                continue;
            }
            outgoing.set(flow.sourceRef.id, (outgoing.get(flow.sourceRef.id) || 0) + 1);
            incoming.set(flow.targetRef.id, (incoming.get(flow.targetRef.id) || 0) + 1);
        }

        // A process directly inside the definitions should start somewhere; sub-processes are checked as nodes
        if (nodes.length && !nodes.some(n => n.$type === 'bpmn:StartEvent' && n.$parent === process)) {
            findings.push(`Process ${process.id} has no start event.`);
        }

        for (const node of nodes) {
            const kind = node.$type.replace('bpmn:', '');
            const isEnd = node.$type === 'bpmn:EndEvent';
            const isStart = node.$type === 'bpmn:StartEvent' || node.$type === 'bpmn:BoundaryEvent';
            const isCompensation = node.isForCompensation;
            // An element that sends or receives a message flow may end or begin its own path
            const talksToAnotherPool = messageEnds.has(node.id);
            if (!isEnd && !isCompensation && !talksToAnotherPool && outgoing.get(node.id) === 0) {
                findings.push(`${kind} ${label(node)} is a dead end: add a flow out of it, or end the path with an end event.`);
            }
            if (!isStart && !isCompensation && !talksToAnotherPool && incoming.get(node.id) === 0 && node.$parent === process) {
                findings.push(`${kind} ${label(node)} cannot be reached: no flow leads to it.`);
            }
            const splits = (node.$type === 'bpmn:ExclusiveGateway' || node.$type === 'bpmn:InclusiveGateway') && outgoing.get(node.id) > 1;
            if (splits && !NAMED(node)) {
                findings.push(`Gateway ${node.id} splits the flow but has no name: name it with the question it decides, such as "Approved?".`);
            }
            if (splits) {
                const unnamed = flows.filter(f => f.sourceRef === node && !NAMED(f) && f !== node.default);
                if (unnamed.length) findings.push(`Gateway ${label(node)} has outgoing flows without a name (${unnamed.map(f => f.id).join(', ')}): name each branch, such as "yes" and "no".`);
            }
        }

        for (const set of process.laneSets || []) {
            for (const lane of lanesOf(set)) {
                if (!(lane.flowNodeRef || []).length) findings.push(`Lane ${label(lane)} holds no elements: add flowNodeRef entries for its elements, or remove the lane.`);
            }
        }
    }
    return findings;
}
