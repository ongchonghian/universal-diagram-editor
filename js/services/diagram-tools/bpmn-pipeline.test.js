import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripLayout, layoutSection, attachLayout, hasLayout, structureOf, layoutBpmn, completeBpmn, route } from './bpmn-pipeline.js';
import { createBpmnModdle } from '../../utils/bpmn-moddle.js';

const HEAD = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Defs" targetNamespace="http://bpmn.io/schema/bpmn">`;

const LINEAR = `${HEAD}
  <bpmn:process id="P">
    <bpmn:startEvent id="S" />
    <bpmn:task id="T1" name="Enter claim" />
    <bpmn:exclusiveGateway id="G" name="Complete?" />
    <bpmn:task id="T2" name="Pay" />
    <bpmn:endEvent id="E" />
    <bpmn:sequenceFlow id="F1" sourceRef="S" targetRef="T1" />
    <bpmn:sequenceFlow id="F2" sourceRef="T1" targetRef="G" />
    <bpmn:sequenceFlow id="F3" name="yes" sourceRef="G" targetRef="T2" />
    <bpmn:sequenceFlow id="F4" name="no" sourceRef="G" targetRef="T1" />
    <bpmn:sequenceFlow id="F5" sourceRef="T2" targetRef="E" />
  </bpmn:process>
</bpmn:definitions>`;

const LANES = `${HEAD}
  <bpmn:process id="P">
    <bpmn:laneSet id="LS">
      <bpmn:lane id="Clerk" name="Clerk"><bpmn:flowNodeRef>S</bpmn:flowNodeRef><bpmn:flowNodeRef>T1</bpmn:flowNodeRef><bpmn:flowNodeRef>E</bpmn:flowNodeRef></bpmn:lane>
      <bpmn:lane id="Manager" name="Manager"><bpmn:flowNodeRef>T2</bpmn:flowNodeRef></bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="S" />
    <bpmn:task id="T1" name="Enter" />
    <bpmn:task id="T2" name="Approve" />
    <bpmn:endEvent id="E" />
    <bpmn:sequenceFlow id="F1" sourceRef="S" targetRef="T1" />
    <bpmn:sequenceFlow id="F2" sourceRef="T1" targetRef="T2" />
    <bpmn:sequenceFlow id="F3" sourceRef="T2" targetRef="E" />
  </bpmn:process>
</bpmn:definitions>`;

const POOLS = `${HEAD}
  <bpmn:collaboration id="C">
    <bpmn:participant id="Shop" name="Shop" processRef="P1" />
    <bpmn:participant id="Bank" name="Bank" processRef="P2" />
    <bpmn:messageFlow id="M1" sourceRef="Pay" targetRef="Check" />
  </bpmn:collaboration>
  <bpmn:process id="P1">
    <bpmn:laneSet id="LS1">
      <bpmn:lane id="Till" name="Till"><bpmn:flowNodeRef>S1</bpmn:flowNodeRef><bpmn:flowNodeRef>Pay</bpmn:flowNodeRef></bpmn:lane>
      <bpmn:lane id="Store" name="Store"><bpmn:flowNodeRef>E1</bpmn:flowNodeRef></bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="S1" /><bpmn:task id="Pay" name="Pay" /><bpmn:endEvent id="E1" />
    <bpmn:sequenceFlow id="A1" sourceRef="S1" targetRef="Pay" /><bpmn:sequenceFlow id="A2" sourceRef="Pay" targetRef="E1" />
  </bpmn:process>
  <bpmn:process id="P2">
    <bpmn:startEvent id="S2" /><bpmn:task id="Check" name="Check funds" /><bpmn:endEvent id="E2" />
    <bpmn:sequenceFlow id="B1" sourceRef="S2" targetRef="Check" /><bpmn:sequenceFlow id="B2" sourceRef="Check" targetRef="E2" />
  </bpmn:process>
</bpmn:definitions>`;

/** Every shape's box and every edge's waypoints, read with bpmn-moddle, plus the import warnings. */
async function readLayout(xml) {
    const moddle = await createBpmnModdle();
    const { rootElement, warnings } = await moddle.fromXML(xml);
    const shapes = new Map();
    const edges = new Map();
    for (const item of rootElement.diagrams[0].plane.planeElement) {
        if (item.bounds) shapes.set(item.bpmnElement.id, item.bounds);
        if (item.waypoint) edges.set(item.bpmnElement.id, item.waypoint);
    }
    return { shapes, edges, warnings, plane: rootElement.diagrams[0].plane.bpmnElement.id };
}

const centreY = (b) => b.y + b.height / 2;
const inside = (b, outer) => b.x >= outer.x && b.y >= outer.y && b.x + b.width <= outer.x + outer.width && b.y + b.height <= outer.y + outer.height;

describe('stripLayout and attachLayout', () => {
    it('removes the layout section and puts the same section back', async () => {
        const full = await layoutBpmn(LINEAR);
        expect(hasLayout(full)).toBe(true);
        expect(hasLayout(stripLayout(full))).toBe(false);
        expect(attachLayout(stripLayout(full), layoutSection(full))).toBe(full);
    });

    it('strips the layout from XML that does not parse', () => {
        const broken = '<bpmn:definitions><bpmn:process id="P"><bpmn:task id="T"></bpmn:process>\n  <bpmndi:BPMNDiagram id="D"><bpmndi:BPMNPlane id="X" /></bpmndi:BPMNDiagram>\n</bpmn:definitions>';
        expect(stripLayout(broken)).toBe('<bpmn:definitions><bpmn:process id="P"><bpmn:task id="T"></bpmn:process>\n</bpmn:definitions>');
    });

    it('declares the layout prefixes when the root does not', async () => {
        const full = await layoutBpmn(LINEAR);
        expect(full).toContain('xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"');
        expect((await readLayout(full)).warnings).toEqual([]);
    });
});

describe('structureOf', () => {
    it('ignores names and attributes, and sees new elements and new connections', async () => {
        const base = await structureOf(LINEAR);
        expect(await structureOf(LINEAR.replace('Enter claim', 'Record claim'))).toBe(base);
        expect(await structureOf(LINEAR.replace('<bpmn:endEvent id="E" />', '<bpmn:endEvent id="E" /><bpmn:task id="T3" />'))).not.toBe(base);
        expect(await structureOf(LINEAR.replace('sourceRef="G" targetRef="T1"', 'sourceRef="G" targetRef="E"'))).not.toBe(base);
    });
});

describe('layoutBpmn', () => {
    it('draws every element of a plain process and keeps the XML as written', async () => {
        const full = await layoutBpmn(LINEAR);
        const { shapes, edges, warnings, plane } = await readLayout(full);
        expect(warnings).toEqual([]);
        expect(plane).toBe('P');
        expect([...shapes.keys()].sort()).toEqual(['E', 'G', 'S', 'T1', 'T2']);
        expect([...edges.keys()].sort()).toEqual(['F1', 'F2', 'F3', 'F4', 'F5']);
        // Apart from the layout prefixes on the root, the XML stays exactly as written
        const withoutPrefixes = stripLayout(full).replace(/ xmlns:(bpmndi|dc|di)="[^"]+"/g, '');
        expect(withoutPrefixes.replace(/\s+$/, '')).toBe(LINEAR);
    });

    it('draws lanes as bands that hold their own elements', async () => {
        const { shapes, edges, warnings } = await readLayout(await layoutBpmn(LANES));
        expect(warnings).toEqual([]);
        const clerk = shapes.get('Clerk');
        const manager = shapes.get('Manager');
        expect(clerk.y + clerk.height).toBe(manager.y);
        for (const id of ['S', 'T1', 'E']) expect(inside(shapes.get(id), clerk), id).toBe(true);
        expect(inside(shapes.get('T2'), manager)).toBe(true);
        expect(edges.size).toBe(3);
    });

    it('wraps pools around their processes, without overlap, and routes the message flow between them', async () => {
        const { shapes, edges, warnings, plane } = await readLayout(await layoutBpmn(POOLS));
        expect(warnings).toEqual([]);
        expect(plane).toBe('C');
        const shop = shapes.get('Shop');
        const bank = shapes.get('Bank');
        expect(shop.y + shop.height).toBeLessThan(bank.y);
        expect(shop.width).toBe(bank.width);
        for (const id of ['Till', 'Store', 'S1', 'Pay', 'E1']) expect(inside(shapes.get(id), shop), id).toBe(true);
        for (const id of ['S2', 'Check', 'E2']) expect(inside(shapes.get(id), bank), id).toBe(true);
        expect(inside(shapes.get('E1'), shapes.get('Store'))).toBe(true);
        const message = edges.get('M1');
        expect(message[0].y).toBe(shapes.get('Pay').y + shapes.get('Pay').height);
        expect(message.at(-1).y).toBe(shapes.get('Check').y);
    });
});

describe('route', () => {
    it('runs forward flows from right side to left side, and flows back below both boxes', () => {
        const a = { x: 0, y: 0, width: 100, height: 80 };
        const b = { x: 200, y: 100, width: 100, height: 80 };
        expect(route(a, b)).toEqual([{ x: 100, y: 40 }, { x: 150, y: 40 }, { x: 150, y: 140 }, { x: 200, y: 140 }]);
        expect(route(b, a).at(1).y).toBeGreaterThan(180);
    });
});

describe('completeBpmn', () => {
    it('keeps the layout exactly after a rename, and lays out again after a new element', async () => {
        const start = await layoutBpmn(LINEAR);
        const base = { baseCode: start, baseType: 'bpmn' };
        const renamed = await completeBpmn(stripLayout(start).replace('Enter claim', 'Record claim'), base);
        expect(renamed.layout).toBe('kept');
        expect(layoutSection(renamed.code)).toBe(layoutSection(start));

        const grown = await completeBpmn(stripLayout(start).replace('<bpmn:endEvent id="E" />', '<bpmn:endEvent id="E" />\n    <bpmn:task id="T3" name="Archive" />'), base);
        expect(grown.layout).toBe('regenerated');
        expect((await readLayout(grown.code)).shapes.has('T3')).toBe(true);
    });

    it('lays out a diagram that had no layout, and BPMN written over another notation', async () => {
        expect((await completeBpmn(LINEAR, { baseCode: LINEAR, baseType: 'bpmn' })).layout).toBe('created');
        expect((await completeBpmn(LINEAR, { baseCode: 'flowchart TD\n A --> B', baseType: 'mermaid' })).layout).toBe('created');
    });

    it('keeps the layout of an evaluation case after a rename', async () => {
        const cases = JSON.parse(readFileSync(join(process.cwd(), 'evals', 'cases', 'bpmn.json'), 'utf8'));
        const start = cases.find(c => c.id === 'bpmn-rename-review').startCode;
        const view = stripLayout(start);
        const name = view.match(/name="([^"]+)"/g)[1].slice(6, -1);
        const out = await completeBpmn(view.replace(`name="${name}"`, 'name="Line manager review"'), { baseCode: start, baseType: 'bpmn' });
        expect(out.layout).toBe('kept');
        expect(layoutSection(out.code)).toBe(layoutSection(start));
    });

    it('keeps the layout when a repair fixes XML that did not parse', async () => {
        const start = await layoutBpmn(LINEAR);
        const broken = start.replace('<bpmn:task id="T2" name="Pay" />', '<bpmn:task id="T2" name="Pay">');
        const out = await completeBpmn(stripLayout(start), { baseCode: broken, baseType: 'bpmn' });
        expect(out.layout).toBe('kept');
    });
});
