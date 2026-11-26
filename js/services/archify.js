// Archify diagrams: JSON documents that the Archify renderer turns into a standalone HTML page.
// The renderer needs Node, so the editor's own server runs it (see server/vite-plugin-archify.js).
// This file has no imports, because the browser and that server both load it.

/** The diagram kinds Archify draws, with the name shown beside the notation list. */
export const ARCHIFY_DIAGRAM_LABELS = {
    architecture: 'Architecture',
    workflow: 'Workflow',
    sequence: 'Sequence',
    dataflow: 'Data Flow',
    lifecycle: 'Lifecycle',
    erd: 'Entity Relationship',
    class: 'Class Diagram',
    tree: 'Tree',
    timeline: 'Timeline',
    waterfall: 'Waterfall'
};

export const ARCHIFY_DIAGRAM_TYPES = Object.keys(ARCHIFY_DIAGRAM_LABELS);

export const ARCHIFY_RENDER_PATH = '/api/archify/render';

export const ARCHIFY_UNAVAILABLE_MESSAGE =
    'Archify diagrams are drawn by the Archify renderer on this computer. Start the editor with "npm run dev" to draw this diagram.';

/** True when a parsed JSON value declares one of Archify's diagram kinds. */
export const isArchifyDocument = (json) =>
    !!json && typeof json === 'object' && !Array.isArray(json) && ARCHIFY_DIAGRAM_TYPES.includes(json.diagram_type);

/** The line a JSON syntax error points to, read from the parser's message. */
const jsonErrorLine = (message, code) => {
    const line = /line (\d+)/i.exec(message);
    if (line) return Number(line[1]);
    const position = /position (\d+)/i.exec(message);
    if (position) return code.slice(0, Number(position[1])).split('\n').length;
    return null;
};

/**
 * Read the diagram kind from Archify code.
 * @returns {{type: string} | {error: string, line: number|null}}
 */
export const readArchifyDocument = (code) => {
    let json;
    try {
        json = JSON.parse(code);
    } catch (e) {
        return { error: `The code is not valid JSON: ${e.message}`, line: jsonErrorLine(e.message, code) };
    }
    if (!isArchifyDocument(json)) {
        const found = json && typeof json === 'object' && typeof json.diagram_type === 'string' ? `"${json.diagram_type}"` : 'missing';
        const at = code.indexOf('"diagram_type"');
        return {
            error: `"diagram_type" must be one of: ${ARCHIFY_DIAGRAM_TYPES.join(', ')}. The value in the code is ${found}.`,
            line: at >= 0 ? code.slice(0, at).split('\n').length : null
        };
    }
    return { type: json.diagram_type };
};

/**
 * Ask the editor's server to draw Archify code.
 * @returns {Promise<{html: string|null, error: {message: string}|null, errorLine?: number|null}>}
 */
export async function renderArchify(code, fetchImpl = globalThis.fetch) {
    const doc = readArchifyDocument(code);
    if (doc.error) return { html: null, error: { message: doc.error }, errorLine: doc.line };

    const unavailable = { html: null, error: { message: ARCHIFY_UNAVAILABLE_MESSAGE } };
    let response;
    try {
        response = await fetchImpl(ARCHIFY_RENDER_PATH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: code })
        });
    } catch (e) {
        return unavailable;
    }
    // A static host answers this address with a web page, or with "not found"
    if (!(response.headers.get('content-type') || '').includes('application/json')) return unavailable;

    let body;
    try {
        body = await response.json();
    } catch (e) {
        return unavailable;
    }
    if (body.ok && typeof body.html === 'string') return { html: body.html, error: null };
    return { html: null, error: { message: body.error || 'Archify could not draw the diagram.' }, errorLine: body.line ?? null };
}
