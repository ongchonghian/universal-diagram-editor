// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { getStarterCode } from '../js/notations.js';
import { ARCHIFY_RENDER_PATH } from '../js/services/archify.js';
import { findArchifyHome, renderArchifyDocument, ARCHIFY_MISSING_MESSAGE } from './archify-render.js';
import { archifyMiddleware } from './vite-plugin-archify.js';

const TREE = getStarterCode('archify');
const installed = findArchifyHome();

describe('findArchifyHome', () => {
    it('uses ARCHIFY_HOME only when the folder holds the Archify command', () => {
        const home = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-home-'));
        try {
            expect(findArchifyHome({ ARCHIFY_HOME: home }, home)).toBeNull();
            fs.mkdirSync(path.join(home, 'bin'));
            fs.writeFileSync(path.join(home, 'bin', 'archify.mjs'), '');
            expect(findArchifyHome({ ARCHIFY_HOME: home }, home)).toBe(home);
        } finally {
            fs.rmSync(home, { recursive: true, force: true });
        }
    });

    it('finds the skill in the user\'s skills folder', () => {
        const userHome = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-user-'));
        try {
            expect(findArchifyHome({}, userHome)).toBeNull();
            const skill = path.join(userHome, '.claude', 'skills', 'archify');
            fs.mkdirSync(path.join(skill, 'bin'), { recursive: true });
            fs.writeFileSync(path.join(skill, 'bin', 'archify.mjs'), '');
            expect(findArchifyHome({}, userHome)).toBe(skill);
        } finally {
            fs.rmSync(userHome, { recursive: true, force: true });
        }
    });
});

describe('renderArchifyDocument', () => {
    it('says how to install Archify when the computer has no copy', async () => {
        const result = await renderArchifyDocument(TREE, { home: null });
        expect(result).toEqual({ ok: false, code: 'archify-missing', error: ARCHIFY_MISSING_MESSAGE });
    });

    it('refuses code that is not an Archify document, without starting Archify', async () => {
        const result = await renderArchifyDocument('{ "diagram_type": "gantt" }', { home: '/no/such/folder' });
        expect(result.ok).toBe(false);
        expect(result.code).toBe('invalid-document');
    });

    it.skipIf(!installed)('draws the starter diagram as a standalone page', async () => {
        const result = await renderArchifyDocument(TREE);
        expect(result.ok).toBe(true);
        expect(result.html).toContain('<svg');
        expect(result.html).toContain('Online shop');
    });

    it.skipIf(!installed)('returns Archify\'s diagnostics for a document that breaks the schema', async () => {
        const result = await renderArchifyDocument(TREE.replace('"nodes"', '"nodez"'));
        expect(result.ok).toBe(false);
        expect(result.code).toBe('render-failed');
        expect(result.error).toContain('[schema/required]');
        expect(result.error).not.toContain(os.tmpdir());
    });
});

describe('archifyMiddleware', () => {
    const call = async (middleware, { method = 'POST', url = ARCHIFY_RENDER_PATH, contentType = 'application/json', body = '' } = {}) => {
        const req = new PassThrough();
        Object.assign(req, { method, url, headers: { 'content-type': contentType } });
        const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; } };
        const done = new Promise((resolve) => { res.end = (text) => resolve(JSON.parse(text)); });
        const next = vi.fn();
        const pending = middleware(req, res, next);
        req.end(body);
        await pending;
        return next.mock.calls.length ? { next: true } : { status: res.statusCode, body: await done };
    };

    it('leaves every other address to the editor', async () => {
        expect(await call(archifyMiddleware(vi.fn()), { url: '/index.html' })).toEqual({ next: true });
    });

    it('draws the code it is sent', async () => {
        const render = vi.fn(async () => ({ ok: true, html: '<p>page</p>' }));
        const result = await call(archifyMiddleware(render), { body: JSON.stringify({ content: TREE }) });
        expect(render).toHaveBeenCalledWith(TREE);
        expect(result).toEqual({ status: 200, body: { ok: true, html: '<p>page</p>' } });
    });

    it('refuses a request that another website could send without permission', async () => {
        const render = vi.fn();
        const result = await call(archifyMiddleware(render), { contentType: 'text/plain', body: JSON.stringify({ content: TREE }) });
        expect(result.status).toBe(415);
        expect(render).not.toHaveBeenCalled();
    });

    it('refuses GET, an empty diagram and a broken request', async () => {
        const render = vi.fn();
        expect((await call(archifyMiddleware(render), { method: 'GET' })).status).toBe(405);
        expect((await call(archifyMiddleware(render), { body: JSON.stringify({ content: ' ' }) })).status).toBe(400);
        expect((await call(archifyMiddleware(render), { body: '{' })).status).toBe(400);
        expect(render).not.toHaveBeenCalled();
    });

    it('answers 503 when the computer has no copy of Archify', async () => {
        const render = async () => ({ ok: false, code: 'archify-missing', error: ARCHIFY_MISSING_MESSAGE });
        const result = await call(archifyMiddleware(render), { body: JSON.stringify({ content: TREE }) });
        expect(result.status).toBe(503);
        expect(result.body.error).toBe(ARCHIFY_MISSING_MESSAGE);
    });
});
