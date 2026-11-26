/**
 * The BPMN pipeline: Smith reads and writes semantic BPMN only, and the app owns the layout.
 *
 * - stripLayout() removes the layout section (bpmndi:BPMNDiagram) before the model sees the XML,
 *   which roughly halves the tokens Smith reads and resends at every step.
 * - completeBpmn() turns Smith's semantic XML back into a full diagram. When the structure is
 *   unchanged (the same elements, connections and lanes), the user's own layout is re-attached
 *   exactly, so a rename keeps every shape where it was. Otherwise layoutBpmn() lays the diagram out.
 * - layoutBpmn() arranges each process with bpmn-auto-layout, then places lanes as horizontal bands
 *   and wraps pools around their processes, because bpmn-auto-layout draws neither.
 *
 * The pipeline works on the text where it can, so the semantic XML stays exactly as Smith wrote it.
 */
import { createBpmnModdle } from '../../utils/bpmn-moddle.js';

const DI_BLOCK = /\n?[ \t]*<(\w+:)?BPMNDiagram\b[\s\S]*?<\/(\w+:)?BPMNDiagram>[ \t]*/g;
const CLOSING_DEFINITIONS = /<\/(\w+:)?definitions>\s*$/;
const NAMESPACES = {
    bpmndi: 'http://www.omg.org/spec/BPMN/20100524/DI',
    dc: 'http://www.omg.org/spec/DD/20100524/DC',
    di: 'http://www.omg.org/spec/DD/20100524/DI'
};

/** True when the XML holds a layout section. */
export const hasLayout = (xml) => /<(\w+:)?BPMNDiagram\b/.test(xml || '');

/** The XML without its layout section. Works on broken XML too, so the Fix button can use it. */
export function stripLayout(xml) {
    if (!xml || !hasLayout(xml)) return xml || '';
    return xml.replace(DI_BLOCK, '');
}

/** The layout section of the XML as text, or '' when there is none. */
export function layoutSection(xml) {
    return (xml || '').match(DI_BLOCK)?.map(block => block.replace(/^\n/, '')).join('\n') || '';
}

/** Declare the bpmndi, dc and di prefixes on the root element when the root does not declare them. */
function withLayoutNamespaces(xml) {
    const root = xml.match(/<(\w+:)?definitions\b[^>]*>/);
    if (!root) return xml;
    const missing = Object.entries(NAMESPACES).filter(([prefix]) => !new RegExp(`\\sxmlns:${prefix}=`).test(root[0]));
    if (!missing.length) return xml;
    const declarations = missing.map(([prefix, uri]) => ` xmlns:${prefix}="${uri}"`).join('');
    const opened = root[0].endsWith('/>') ? root[0] : root[0].replace(/>$/, `${declarations}>`);
    return xml.replace(root[0], opened);
}

/** Insert a layout section before the closing definitions tag. */
export function attachLayout(semanticXml, section) {
    if (!section) return semanticXml;
    const match = semanticXml.match(CLOSING_DEFINITIONS);
    if (!match) return semanticXml;
    const at = semanticXml.length - match[0].length;
    const before = semanticXml.slice(0, at).replace(/\s*$/, '');
    return withLayoutNamespaces(`${before}\n  ${section.trim()}\n${semanticXml.slice(at)}`);
}

// ---------------------------------------------------------------------------------------------
// Structure: what must stay the same for the old layout to fit the new XML

const isFlowNode = (e) => e.$instanceOf?.('bpmn:FlowNode');

function collectFlowElements(container, out) {
    for (const element of container.flowElements || []) {
        out.push(element);
        if (element.flowElements) collectFlowElements(element, out);
    }
    return out;
}

function leafLanes(laneSet, out = []) {
    for (const lane of laneSet?.lanes || []) {
        if (lane.childLaneSet?.lanes?.length) leafLanes(lane.childLaneSet, out);
        else out.push(lane);
    }
    return out;
}

function allLanes(laneSet, out = []) {
    for (const lane of laneSet?.lanes || []) {
        out.push(lane);
        if (lane.childLaneSet) allLanes(lane.childLaneSet, out);
    }
    return out;
}

/**
 * A text that is equal for two diagrams exactly when one layout fits both: the same elements
 * (by id and kind), the same connections, the same lanes holding the same elements, and the same pools.
 * Names, documentation and other attributes are left out, so a rename keeps the layout.
 */
export async function structureOf(xml) {
    const moddle = await createBpmnModdle();
    const { rootElement: definitions } = await moddle.fromXML(xml);
    const lines = [];
    for (const root of definitions.rootElements || []) {
        if (root.$type === 'bpmn:Process') {
            lines.push(`process ${root.id}`);
            for (const e of collectFlowElements(root, [])) {
                if (e.$type === 'bpmn:SequenceFlow') lines.push(`flow ${e.id} ${e.sourceRef?.id}>${e.targetRef?.id}`);
                else lines.push(`${e.$type} ${e.id}${e.attachedToRef ? ` on ${e.attachedToRef.id}` : ''}${e.$parent !== root ? ` in ${e.$parent.id}` : ''}`);
            }
            for (const set of root.laneSets || []) {
                for (const lane of allLanes(set)) lines.push(`lane ${lane.id} ${(lane.flowNodeRef || []).map(n => n.id).sort().join(',')}`);
            }
        } else if (root.$type === 'bpmn:Collaboration') {
            for (const p of root.participants || []) lines.push(`pool ${p.id} ${p.processRef?.id || ''}`);
            for (const m of root.messageFlows || []) lines.push(`message ${m.id} ${m.sourceRef?.id}>${m.targetRef?.id}`);
        }
    }
    return lines.sort().join('\n');
}

// ---------------------------------------------------------------------------------------------
// Layout

const POOL_HEADER = 30;
const LANE_HEADER = 30;
const PAD = 40;
const ROW = 120;
const LANE_MIN_HEIGHT = 150;
const POOL_MIN_HEIGHT = 160;
const POOL_GAP = 60;
const ORIGIN = { x: 100, y: 80 };

const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

/** Orthogonal waypoints between two boxes. */
export function route(s, t) {
    const sc = center(s);
    const tc = center(t);
    if (t.x >= s.x + s.width) {
        const x1 = s.x + s.width;
        const x2 = t.x;
        if (Math.abs(sc.y - tc.y) < 1) return [{ x: x1, y: sc.y }, { x: x2, y: tc.y }];
        const mx = Math.round((x1 + x2) / 2);
        return [{ x: x1, y: sc.y }, { x: mx, y: sc.y }, { x: mx, y: tc.y }, { x: x2, y: tc.y }];
    }
    if (t.x + t.width > s.x) {
        // The boxes share a column: leave from the bottom or top, straight down or up
        const down = tc.y > sc.y;
        const y1 = down ? s.y + s.height : s.y;
        const y2 = down ? t.y : t.y + t.height;
        if (Math.abs(sc.x - tc.x) < 1) return [{ x: sc.x, y: y1 }, { x: tc.x, y: y2 }];
        const my = Math.round((y1 + y2) / 2);
        return [{ x: sc.x, y: y1 }, { x: sc.x, y: my }, { x: tc.x, y: my }, { x: tc.x, y: y2 }];
    }
    // A flow back to an earlier element runs below both boxes
    const below = Math.max(s.y + s.height, t.y + t.height) + 30;
    return [{ x: sc.x, y: s.y + s.height }, { x: sc.x, y: below }, { x: tc.x, y: below }, { x: tc.x, y: t.y + t.height }];
}

/** A message flow between pools runs vertically, from the bottom of one box to the top of the other. */
function routeMessage(s, t) {
    const sc = center(s);
    const tc = center(t);
    const down = tc.y > sc.y;
    const y1 = down ? s.y + s.height : s.y;
    const y2 = down ? t.y : t.y + t.height;
    if (Math.abs(sc.x - tc.x) < 1) return [{ x: sc.x, y: y1 }, { x: tc.x, y: y2 }];
    const my = Math.round((y1 + y2) / 2);
    return [{ x: sc.x, y: y1 }, { x: sc.x, y: my }, { x: tc.x, y: my }, { x: tc.x, y: y2 }];
}

/** Lay out one process with bpmn-auto-layout. Returns the boxes of its flow nodes and the waypoints of its flows. */
async function autoLayoutProcess(moddle, definitions, process) {
    const { layoutProcess } = await import('bpmn-auto-layout');
    // bpmn-auto-layout follows each node's incoming and outgoing lists, which BPMN allows a writer to leave out.
    // Fill the lists from the flows' sourceRef and targetRef; only this temporary copy is serialised.
    const elements = collectFlowElements(process, []);
    for (const node of elements.filter(isFlowNode)) {
        node.incoming = [];
        node.outgoing = [];
    }
    for (const flow of elements.filter(e => e.$type === 'bpmn:SequenceFlow')) {
        flow.sourceRef?.outgoing?.push(flow);
        flow.targetRef?.incoming?.push(flow);
    }
    const single = moddle.create('bpmn:Definitions', { targetNamespace: definitions.targetNamespace || 'http://bpmn.io/schema/bpmn', rootElements: [process] });
    const { xml } = await moddle.toXML(single);
    const laidOut = await layoutProcess(xml);
    const reader = await createBpmnModdle();
    const { rootElement } = await reader.fromXML(laidOut);
    const boxes = new Map();
    const waypoints = new Map();
    for (const item of rootElement.diagrams?.[0]?.plane?.planeElement || []) {
        const id = item.bpmnElement?.id;
        if (!id) continue;
        if (item.bounds) boxes.set(id, { x: item.bounds.x, y: item.bounds.y, width: item.bounds.width, height: item.bounds.height });
        if (item.waypoint) waypoints.set(id, item.waypoint.map(p => ({ x: p.x, y: p.y })));
    }
    // The process itself gets a shape from the library; only its contents matter here
    boxes.delete(process.id);
    return { boxes, waypoints };
}

const extentOf = (boxes) => {
    const all = [...boxes.values()];
    if (!all.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return {
        minX: Math.min(...all.map(b => b.x)),
        minY: Math.min(...all.map(b => b.y)),
        maxX: Math.max(...all.map(b => b.x + b.width)),
        maxY: Math.max(...all.map(b => b.y + b.height))
    };
};

/**
 * Place a laid-out process at (left, top). With lanes, each leaf lane becomes a band, and each element
 * moves into the band of its lane while keeping its column. Returns the boxes, the edges, the lane boxes
 * (relative to the content's left edge) and the size of the content.
 */
function placeProcess(process, laid, left, top) {
    const flowElements = collectFlowElements(process, []);
    const nodes = flowElements.filter(isFlowNode);
    const flows = flowElements.filter(e => e.$type === 'bpmn:SequenceFlow');
    const attached = new Map(nodes.filter(n => n.attachedToRef).map(n => [n.id, n.attachedToRef.id]));
    const lanes = (process.laneSets || []).flatMap(set => leafLanes(set));
    const boxes = new Map();
    const { minX, minY } = extentOf(laid.boxes);
    const shiftX = left - minX;

    if (!lanes.length) {
        const shiftY = top - minY;
        for (const [id, b] of laid.boxes) boxes.set(id, { ...b, x: b.x + shiftX, y: b.y + shiftY });
        const edges = new Map();
        for (const flow of flows) {
            const points = laid.waypoints.get(flow.id);
            if (points) edges.set(flow.id, points.map(p => ({ x: p.x + shiftX, y: p.y + shiftY })));
        }
        const extent = extentOf(boxes);
        return { boxes, edges, laneBoxes: [], width: extent.maxX - left, height: Math.max(extent.maxY - top, 0) };
    }

    // Each element's lane; elements in no lane join the first lane
    const laneOf = new Map();
    for (const lane of lanes) for (const ref of lane.flowNodeRef || []) laneOf.set(ref.id, lane.id);
    const placed = nodes.filter(n => laid.boxes.has(n.id) && !attached.has(n.id));
    const rowsByLane = new Map(lanes.map(l => [l.id, []]));
    for (const node of placed) {
        const laneId = laneOf.get(node.id) || lanes[0].id;
        rowsByLane.get(laneId).push(Math.round(center(laid.boxes.get(node.id)).y));
    }

    const laneBoxes = [];
    let bandTop = top;
    for (const lane of lanes) {
        const rows = [...new Set(rowsByLane.get(lane.id))].sort((a, b) => a - b);
        const height = Math.max(LANE_MIN_HEIGHT, rows.length * ROW + PAD);
        for (const node of placed) {
            if ((laneOf.get(node.id) || lanes[0].id) !== lane.id) continue;
            const b = laid.boxes.get(node.id);
            const row = rows.indexOf(Math.round(center(b).y));
            const cy = bandTop + PAD / 2 + row * ROW + ROW / 2;
            boxes.set(node.id, { ...b, x: b.x + shiftX, y: Math.round(cy - b.height / 2) });
        }
        laneBoxes.push({ id: lane.id, y: bandTop, height });
        bandTop += height;
    }
    // Boundary events move with their host
    for (const [id, hostId] of attached) {
        const b = laid.boxes.get(id);
        const hostBefore = laid.boxes.get(hostId);
        const hostAfter = boxes.get(hostId);
        if (b && hostBefore && hostAfter) boxes.set(id, { ...b, x: b.x + (hostAfter.x - hostBefore.x), y: b.y + (hostAfter.y - hostBefore.y) });
    }
    const edges = new Map();
    for (const flow of flows) {
        const s = boxes.get(flow.sourceRef?.id);
        const t = boxes.get(flow.targetRef?.id);
        if (s && t) edges.set(flow.id, route(s, t));
    }
    const extent = extentOf(boxes);
    return { boxes, edges, laneBoxes, width: extent.maxX - left, height: bandTop - top };
}

/** The layout section for a set of shapes and edges, as XML text. */
function layoutXml(planeElementId, shapes, edges) {
    const n = (v) => Math.round(v);
    const lines = ['<bpmndi:BPMNDiagram id="BPMNDiagram_1">', `    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${planeElementId}">`];
    for (const s of shapes) {
        const attrs = s.horizontal ? ' isHorizontal="true"' : s.marker ? ' isMarkerVisible="true"' : '';
        lines.push(`      <bpmndi:BPMNShape id="${s.id}_di" bpmnElement="${s.id}"${attrs}>`);
        lines.push(`        <dc:Bounds x="${n(s.box.x)}" y="${n(s.box.y)}" width="${n(s.box.width)}" height="${n(s.box.height)}" />`);
        lines.push('      </bpmndi:BPMNShape>');
    }
    for (const [id, points] of edges) {
        lines.push(`      <bpmndi:BPMNEdge id="${id}_di" bpmnElement="${id}">`);
        for (const p of points) lines.push(`        <di:waypoint x="${n(p.x)}" y="${n(p.y)}" />`);
        lines.push('      </bpmndi:BPMNEdge>');
    }
    lines.push('    </bpmndi:BPMNPlane>', '  </bpmndi:BPMNDiagram>');
    return lines.join('\n');
}

/**
 * Lay out semantic BPMN XML and return the XML with a new layout section. The semantic part stays
 * exactly as written; an existing layout section is replaced.
 * @throws when the XML does not parse, or holds no process
 */
export async function layoutBpmn(xml) {
    const semantic = stripLayout(xml);
    const moddle = await createBpmnModdle();
    const { rootElement: definitions } = await moddle.fromXML(semantic);
    const roots = definitions.rootElements || [];
    const collaboration = roots.find(e => e.$type === 'bpmn:Collaboration');
    const pools = collaboration?.participants || [];
    const processes = roots.filter(e => e.$type === 'bpmn:Process');
    if (!processes.length && !pools.length) throw new Error('The XML holds no process to lay out.');

    const shapes = [];
    const edges = new Map();
    const boxOf = new Map();
    const addNodeShapes = (placed, process) => {
        for (const node of collectFlowElements(process, []).filter(isFlowNode)) {
            const box = placed.boxes.get(node.id);
            if (!box) continue;
            boxOf.set(node.id, box);
            shapes.push({ id: node.id, box, marker: node.$type === 'bpmn:ExclusiveGateway' });
        }
        for (const [id, points] of placed.edges) edges.set(id, points);
    };

    if (!pools.length) {
        // Processes without pools, one under the other
        let top = ORIGIN.y;
        for (const process of processes) {
            const laid = await autoLayoutProcess(moddle, definitions, process);
            const hasLanes = (process.laneSets || []).some(set => set.lanes?.length);
            const left = ORIGIN.x + (hasLanes ? LANE_HEADER + PAD : 0);
            const placed = placeProcess(process, laid, left, top + (hasLanes ? 0 : 0));
            const width = placed.width + (hasLanes ? PAD : 0);
            for (const lane of placed.laneBoxes) {
                shapes.push({ id: lane.id, horizontal: true, box: { x: ORIGIN.x, y: lane.y, width: width + LANE_HEADER + PAD, height: lane.height } });
            }
            addNodeShapes(placed, process);
            top += placed.height + POOL_GAP;
        }
        return attachLayout(semantic, layoutXml(processes[0].id, shapes, edges));
    }

    // Pools: lay out each pool's process, then stack the pools at one width
    const blocks = [];
    for (const pool of pools) {
        const process = pool.processRef;
        if (!process) {
            blocks.push({ pool, placed: null });
            continue;
        }
        const laid = await autoLayoutProcess(moddle, definitions, process);
        blocks.push({ pool, process, laid });
    }
    const contentLeft = ORIGIN.x + POOL_HEADER + LANE_HEADER + PAD;
    let top = ORIGIN.y;
    const placedBlocks = blocks.map(block => {
        if (!block.laid) {
            const result = { ...block, top, height: 100 };
            top += 100 + POOL_GAP;
            return result;
        }
        const hasLanes = (block.process.laneSets || []).some(set => set.lanes?.length);
        const placed = placeProcess(block.process, block.laid, contentLeft, top + (hasLanes ? 0 : PAD));
        const height = hasLanes ? placed.height : Math.max(POOL_MIN_HEIGHT, placed.height + 2 * PAD);
        const result = { ...block, placed, top, height };
        top += height + POOL_GAP;
        return result;
    });
    const poolWidth = Math.max(600, ...placedBlocks.filter(b => b.placed).map(b => b.placed.width + (contentLeft - ORIGIN.x) + PAD));
    for (const block of placedBlocks) {
        const poolBox = { x: ORIGIN.x, y: block.top, width: poolWidth, height: block.height };
        boxOf.set(block.pool.id, poolBox);
        shapes.push({ id: block.pool.id, horizontal: true, box: poolBox });
        if (!block.placed) continue;
        for (const lane of block.placed.laneBoxes) {
            shapes.push({ id: lane.id, horizontal: true, box: { x: ORIGIN.x + POOL_HEADER, y: lane.y, width: poolWidth - POOL_HEADER, height: lane.height } });
        }
        addNodeShapes(block.placed, block.process);
    }
    for (const message of collaboration.messageFlows || []) {
        const s = boxOf.get(message.sourceRef?.id);
        const t = boxOf.get(message.targetRef?.id);
        if (s && t) edges.set(message.id, routeMessage(s, t));
    }
    return attachLayout(semantic, layoutXml(collaboration.id, shapes, edges));
}

/**
 * Turn semantic XML from Smith into the full diagram.
 * @param {string} semantic  the XML Smith wrote, without a layout section
 * @param {{ baseCode: string, baseType: string }} base  the editor's diagram when the turn began
 * @returns {Promise<{ code: string, layout: 'kept'|'regenerated'|'created' }>}
 * @throws when the XML does not parse or cannot be laid out
 */
export async function completeBpmn(semantic, base, cache = {}) {
    const baseHasLayout = base.baseType === 'bpmn' && hasLayout(base.baseCode);
    if (baseHasLayout) {
        if (cache.baseStructure === undefined) {
            try {
                // XML that is not well formed partly parses, with warnings; its structure cannot be trusted
                const moddle = await createBpmnModdle();
                const { warnings } = await moddle.fromXML(stripLayout(base.baseCode));
                cache.baseStructure = warnings?.length ? null : await structureOf(stripLayout(base.baseCode));
            } catch {
                // A broken starting diagram: its layout can still be kept when the repair keeps the structure,
                // but there is no structure to compare, so the comparison uses the layout section's element ids
                cache.baseStructure = null;
            }
        }
        const same = cache.baseStructure !== null
            ? (await structureOf(semantic)) === cache.baseStructure
            : await layoutCovers(semantic, base.baseCode);
        if (same) return { code: attachLayout(semantic, layoutSection(base.baseCode)), layout: 'kept' };
    }
    return { code: await layoutBpmn(semantic), layout: baseHasLayout ? 'regenerated' : 'created' };
}

/** True when a layout section draws exactly the elements of the semantic XML, for starting diagrams that did not parse. */
async function layoutCovers(semantic, fullXml) {
    const drawn = new Set([...layoutSection(fullXml).matchAll(/bpmnElement="([^"]+)"/g)].map(m => m[1]));
    const moddle = await createBpmnModdle();
    const { rootElement: definitions } = await moddle.fromXML(semantic);
    const ids = new Set();
    for (const root of definitions.rootElements || []) {
        if (root.$type === 'bpmn:Process') {
            for (const e of collectFlowElements(root, [])) ids.add(e.id);
            for (const set of root.laneSets || []) for (const lane of allLanes(set)) ids.add(lane.id);
            if (!(definitions.rootElements || []).some(r => r.$type === 'bpmn:Collaboration')) ids.add(root.id);
        } else if (root.$type === 'bpmn:Collaboration') {
            ids.add(root.id);
            for (const p of root.participants || []) ids.add(p.id);
            for (const m of root.messageFlows || []) ids.add(m.id);
        }
    }
    return ids.size === drawn.size && [...ids].every(id => drawn.has(id));
}
