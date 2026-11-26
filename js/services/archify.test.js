import { describe, it, expect, vi } from 'vitest';
import { DIAGRAM_TYPES } from '../config.js';
import { getStarterCode } from '../notations.js';
import { detectSpecificModel } from '../utils.js';
import { rendererAdapter } from './RendererAdapter.js';
import {
    ARCHIFY_RENDER_PATH, ARCHIFY_UNAVAILABLE_MESSAGE,
    isArchifyDocument, readArchifyDocument, renderArchify
} from './archify.js';

const TREE = getStarterCode('archify');

const jsonResponse = (body, status = 200) => ({
    status,
    headers: { get: () => 'application/json; charset=utf-8' },
    json: async () => body
});

describe('Archify notation', () => {
    it('starts from a document that declares an Archify diagram kind', () => {
        expect(DIAGRAM_TYPES.archify.label).toBe('Archify');
        expect(readArchifyDocument(TREE)).toEqual({ type: 'tree' });
    });

    it('names the diagram kind beside the notation list', () => {
        expect(detectSpecificModel(TREE, 'archify')).toBe('Tree');
        expect(detectSpecificModel('{ "diagram_type": "erd", ', 'archify')).toBe('Entity Relationship');
        expect(detectSpecificModel('{}', 'archify')).toBe('Archify');
    });
});

describe('readArchifyDocument', () => {
    it('reports the line of a JSON syntax error', () => {
        const result = readArchifyDocument('{\n  "schema_version": 1,\n  oops\n}');
        expect(result.error).toContain('not valid JSON');
        expect(result.line).toBe(3);
    });

    it('lists the diagram kinds when "diagram_type" is missing', () => {
        const result = readArchifyDocument('{ "nodes": [] }');
        expect(result.error).toContain('workflow');
        expect(result.error).toContain('missing');
        expect(result.line).toBeNull();
    });

    it('points to the line of an unknown "diagram_type"', () => {
        const result = readArchifyDocument('{\n  "schema_version": 1,\n  "diagram_type": "gantt"\n}');
        expect(result.error).toContain('"gantt"');
        expect(result.line).toBe(3);
    });
});

describe('file detection', () => {
    it('opens a JSON file that declares an Archify diagram kind as Archify', () => {
        expect(rendererAdapter.detectType('orders.json', TREE, 'bpmn')).toBe('archify');
        expect(isArchifyDocument({ diagram_type: 'sequence' })).toBe(true);
    });

    it('leaves other JSON files with their own notation', () => {
        expect(rendererAdapter.detectType('sketch.json', '{"type":"excalidraw","elements":[]}', 'bpmn')).toBe('excalidraw');
        expect(isArchifyDocument({ diagram_type: 'pie' })).toBe(false);
        expect(isArchifyDocument([])).toBe(false);
    });
});

describe('renderArchify', () => {
    it('posts the code to the editor\'s server and returns the page', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse({ ok: true, html: '<!doctype html><p>tree</p>' }));
        const result = await renderArchify(TREE, fetchImpl);
        expect(result).toEqual({ html: '<!doctype html><p>tree</p>', error: null });
        const [url, request] = fetchImpl.mock.calls[0];
        expect(url).toBe(ARCHIFY_RENDER_PATH);
        expect(request.headers['Content-Type']).toBe('application/json');
        expect(JSON.parse(request.body)).toEqual({ content: TREE });
    });

    it('returns the renderer\'s own message when the diagram cannot be drawn', async () => {
        const fetchImpl = async () => jsonResponse({ ok: false, error: '[schema/required] / must have required property \'nodes\'' });
        const result = await renderArchify(TREE, fetchImpl);
        expect(result.html).toBeNull();
        expect(result.error.message).toContain('schema/required');
    });

    it('stops before the server when the code is not an Archify document', async () => {
        const fetchImpl = vi.fn();
        const result = await renderArchify('{ "nodes": ', fetchImpl);
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(result.error.message).toContain('not valid JSON');
    });

    it('explains how to start the renderer when the address serves a web page', async () => {
        const staticHost = async () => ({ status: 200, headers: { get: () => 'text/html' }, json: async () => { throw new Error('not JSON'); } });
        expect((await renderArchify(TREE, staticHost)).error.message).toBe(ARCHIFY_UNAVAILABLE_MESSAGE);
    });

    it('explains how to start the renderer when the server cannot be reached', async () => {
        const offline = async () => { throw new TypeError('Failed to fetch'); };
        expect((await renderArchify(TREE, offline)).error.message).toBe(ARCHIFY_UNAVAILABLE_MESSAGE);
    });

    it('reaches the preview through the renderer adapter', async () => {
        const original = globalThis.fetch;
        globalThis.fetch = async () => jsonResponse({ ok: true, html: '<p>page</p>' });
        try {
            const result = await rendererAdapter.render(TREE, 'archify');
            expect(result).toMatchObject({ svg: null, html: '<p>page</p>', error: null });
        } finally {
            globalThis.fetch = original;
        }
    });
});
