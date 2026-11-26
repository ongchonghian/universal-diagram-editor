/**
 * Checks the evaluation cases themselves: shape, coverage, and starting diagrams that behave
 * as each task needs. Kroki-rendered starting diagrams are checked against the server by hand,
 * because unit tests make no network calls.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../js/services/RendererAdapter.js', () => ({
    rendererAdapter: { render: vi.fn().mockResolvedValue({ svg: '<svg><rect/></svg>', error: null }) }
}));

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DIAGRAM_TYPES } from '../js/config.js';
import { validateDiagram } from '../js/services/diagram-tools/validate.js';
import { isKnownCheck } from './checks.js';

// Vitest runs from the repository root
const dir = join(process.cwd(), 'evals', 'cases');
const cases = readdirSync(dir).filter(f => f.endsWith('.json')).flatMap(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const LOCAL_TYPES = ['mermaid', 'bpmn', 'vegalite', 'vega'];

describe('evaluation cases', () => {
    it('hold 64 cases with unique ids', () => {
        expect(cases).toHaveLength(64);
        expect(new Set(cases.map(c => c.id)).size).toBe(cases.length);
    });

    it('cover the planned groups in the planned numbers', () => {
        const count = (g) => cases.filter(c => c.group === g).length;
        expect({
            mermaid: count('mermaid'), plantuml: count('plantuml'), c4: count('c4'), bpmn: count('bpmn'),
            vega: count('vega'), graphviz: count('graphviz'), kroki: count('kroki'), 'type-choice': count('type-choice'), image: count('image')
        }).toEqual({ mermaid: 14, plantuml: 8, c4: 4, bpmn: 12, vega: 6, graphviz: 4, kroki: 10, 'type-choice': 2, image: 4 });
    });

    it('find the picture of every image case', () => {
        for (const c of cases.filter(c => c.image)) {
            expect(existsSync(join(process.cwd(), 'evals', 'fixtures', c.image)), c.image).toBe(true);
        }
        expect(cases.filter(c => c.group === 'image').every(c => c.image)).toBe(true);
    });

    it.each(cases.map(c => [c.id, c]))('%s is well formed', (_id, c) => {
        expect(['create', 'edit', 'fix']).toContain(c.task);
        const editorType = c.editorType || c.type;
        expect(Object.keys(DIAGRAM_TYPES)).toContain(editorType);
        if (c.type !== null) expect(Object.keys(DIAGRAM_TYPES)).toContain(c.type);
        if (c.task !== 'fix') expect(c.prompt).toBeTruthy();
        if (c.task !== 'create') expect(c.startCode).toBeTruthy();
        expect(c.checks.length).toBeGreaterThan(0);
        for (const check of c.checks) expect(isKnownCheck(check)).toBe(true);
        expect(c.checks).toContain('parses');
    });

    const local = cases.filter(c => c.startCode && LOCAL_TYPES.includes(c.type));

    it.each(local.filter(c => c.task === 'edit').map(c => [c.id, c]))('%s starts from a valid diagram', async (_id, c) => {
        const v = await validateDiagram(c.startCode, c.type, { requireLayout: c.type === 'bpmn' });
        expect(v.status, v.error).toBe('valid');
    });

    it.each(local.filter(c => c.task === 'fix').map(c => [c.id, c]))('%s starts from a broken diagram', async (_id, c) => {
        const v = await validateDiagram(c.startCode, c.type, { requireLayout: c.type === 'bpmn' });
        expect(v.status).toBe('invalid');
    });
});
