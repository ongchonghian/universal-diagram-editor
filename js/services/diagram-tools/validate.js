/**
 * One validator for every caller: the Smith chat, the Auto-Fix button and the evaluation set.
 *
 * validateDiagram(code, type, options) returns:
 *   {
 *     valid:    boolean,   // false only when a real check found a fault
 *     status:   'valid' | 'invalid' | 'unverified',
 *     error:    string | null,
 *     line:     number | null,
 *     kind:     'PARSE' | 'DI_LAYOUT' | 'EMPTY' | null,
 *     warnings: string[]   // for example bpmn-moddle warnings
 *   }
 *
 * 'unverified' means the check could not run (for example the Kroki server could not be reached,
 * or the type is drawn only by a visual editor). An unverified diagram counts as valid, so a network
 * fault never sends good code to a repair loop.
 */
import { rendererAdapter } from '../RendererAdapter.js';
import { createBpmnModdle } from '../../utils/bpmn-moddle.js';

const NETWORK_ERROR = /failed to fetch|fetch failed|networkerror|load failed|network request failed|^HTTP (429|5\d\d)\b/i;

const result = (status, extra = {}) => ({
    valid: status !== 'invalid',
    status,
    error: null,
    line: null,
    kind: null,
    warnings: [],
    ...extra
});

const invalid = (error, extra = {}) => result('invalid', { error, kind: 'PARSE', ...extra });

const lineFromMessage = (message) => {
    const match = /\bline (\d+)/i.exec(message || '');
    return match ? parseInt(match[1], 10) : null;
};

export const isPlantUmlC4 = (code) => code.includes('@startuml') || code.includes('!include');

export const hasBpmnLayout = (code) => /<(\w+:)?BPMNDiagram\b/.test(code) && /<(\w+:)?BPMNPlane\b/.test(code);

/**
 * Mermaid's parser accepts colons in timeline section titles, but the renderer then draws the
 * diagram wrongly. This rule catches that case, which parse() misses.
 */
export function checkMermaidTimeline(code) {
    if (!/^\s*timeline\b/m.test(code)) return null;
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('section') && line.includes(':')) {
            return `Mermaid timeline error on line ${i + 1}: a section title cannot contain a colon. Found: '${line}'.`;
        }
    }
    return null;
}

async function validateMermaid(code, { render }) {
    const mermaidModule = await import('mermaid');
    const mermaid = mermaidModule.default || mermaidModule;
    try {
        await mermaid.parse(code, { suppressErrors: false });
    } catch (e) {
        const message = e?.message || e?.str || String(e);
        return invalid(message, { line: lineFromMessage(message) });
    }

    const timelineError = checkMermaidTimeline(code);
    if (timelineError) return invalid(timelineError, { line: lineFromMessage(timelineError) });

    if (render) {
        // Some faults pass parse() and fail only when Mermaid draws the diagram
        const rendered = await rendererAdapter.render(code, 'mermaid');
        if (rendered.error) {
            return invalid(rendered.error.message, { line: rendered.errorLine ?? lineFromMessage(rendered.error.message) });
        }
    }
    return result('valid');
}

async function validateBpmn(code, { requireLayout }) {
    const moddle = await createBpmnModdle();
    let warnings = [];
    try {
        const parsed = await moddle.fromXML(code);
        warnings = (parsed.warnings || []).map(w => w.message || String(w));
    } catch (e) {
        const message = e?.message || String(e);
        return invalid(message, { line: lineFromMessage(message) });
    }

    if (requireLayout && !hasBpmnLayout(code)) {
        return invalid('The BPMN XML has no diagram layout (BPMNDiagram and BPMNPlane), so the diagram cannot be drawn.', {
            kind: 'DI_LAYOUT',
            warnings
        });
    }
    return result('valid', { warnings });
}

function validateJsonSpec(code, compile) {
    let spec;
    try {
        spec = JSON.parse(code);
    } catch (e) {
        return invalid(`Invalid JSON: ${e.message}`, { line: lineFromMessage(e.message) });
    }
    try {
        compile(spec);
    } catch (e) {
        return invalid(e?.message || String(e));
    }
    return result('valid');
}

async function validateVegaLite(code) {
    const vegaLite = await import('vega-lite');
    return validateJsonSpec(code, spec => (vegaLite.compile || vegaLite.default.compile)(spec));
}

async function validateVega(code) {
    const vega = await import('vega');
    return validateJsonSpec(code, spec => (vega.parse || vega.default.parse)(spec));
}

async function validateWithKroki(code, type) {
    const rendered = await rendererAdapter.render(code, type);
    if (rendered.skipped) {
        return result('unverified', { error: 'This diagram form is drawn by the visual editor, so Smith cannot check it.' });
    }
    if (!rendered.error) return result('valid');

    const message = rendered.error.message || 'Unknown error';
    if (NETWORK_ERROR.test(message)) {
        return result('unverified', { error: `The diagram server could not be reached (${message}), so the code is not verified.` });
    }
    const shortMessage = message.length > 500 ? `${message.slice(0, 500)}...` : message;
    return invalid(shortMessage, { line: rendered.errorLine ?? lineFromMessage(message) });
}

/**
 * @param {string} code
 * @param {string} type  A key of DIAGRAM_TYPES (mermaid, bpmn, plantuml, c4, vega, vegalite, graphviz, ...)
 * @param {{ requireLayout?: boolean, render?: boolean }} [options]
 *   requireLayout: BPMN without layout data counts as invalid (kind 'DI_LAYOUT').
 *   render:        Mermaid is also drawn after it parses (default true).
 */
export async function validateDiagram(code, type, options = {}) {
    const { requireLayout = false, render = true } = options;
    if (!code || !code.trim()) return invalid('The diagram code is empty.', { kind: 'EMPTY' });

    try {
        switch (type) {
            case 'mermaid': return await validateMermaid(code, { render });
            case 'bpmn': return await validateBpmn(code, { requireLayout });
            case 'vegalite': return await validateVegaLite(code);
            case 'vega': return await validateVega(code);
            default: return await validateWithKroki(code, type);
        }
    } catch (e) {
        // A fault inside a validator (for example a failed dynamic import) is not a fault in the diagram
        return result('unverified', { error: `The ${type} check could not run: ${e?.message || e}` });
    }
}
