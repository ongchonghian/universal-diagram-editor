// Gives the editor's server (npm run dev, npm run preview) an address that draws Archify diagrams.
import { ARCHIFY_RENDER_PATH } from '../js/services/archify.js';
import { renderArchifyDocument } from './archify-render.js';

const MAX_BODY_BYTES = 2 * 1024 * 1024;

const readBody = (req) => new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
            reject(new Error('too-large'));
            req.destroy();
            return;
        }
        chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
});

const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
};

export const archifyMiddleware = (render = renderArchifyDocument) => async (req, res, next) => {
    if ((req.url || '').split('?')[0] !== ARCHIFY_RENDER_PATH) return next();
    if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Send the diagram with POST.' });
    // A JSON body makes a browser ask this server for permission before another website can post here.
    // This server never grants that permission, so only the editor's own page can start a render.
    if (!(req.headers['content-type'] || '').includes('application/json')) {
        return send(res, 415, { ok: false, error: 'Send the diagram as application/json.' });
    }
    try {
        const { content } = JSON.parse(await readBody(req));
        if (typeof content !== 'string' || !content.trim()) return send(res, 400, { ok: false, error: 'The request holds no diagram code.' });
        const result = await render(content);
        return send(res, result.ok || result.code !== 'archify-missing' ? 200 : 503, result);
    } catch (e) {
        if (e.message === 'too-large') return send(res, 413, { ok: false, error: 'The diagram code is larger than 2 MB.' });
        return send(res, 400, { ok: false, error: 'The request is not valid JSON.' });
    }
};

export function archifyPlugin() {
    return {
        name: 'universal-diagram-archify',
        configureServer(server) { server.middlewares.use(archifyMiddleware()); },
        configurePreviewServer(server) { server.middlewares.use(archifyMiddleware()); }
    };
}
