/**
 * Smith's tools. Each tool works on a draft: a working copy of the diagram that the editor does not
 * see until the user applies the proposal.
 *
 * edit_diagram and write_diagram validate on every call and return the parser's verdict, so the
 * model sees the real error in the same step.
 */
import { DIAGRAM_TYPES } from '../../config.js';
import { validateDiagram } from '../diagram-tools/validate.js';

export const DIAGRAM_TYPE_IDS = Object.keys(DIAGRAM_TYPES);

/** A new draft for the editor's current code and type. */
export function createDraft(code, type) {
    return { code: code || '', type, baseCode: code || '', baseType: type, validation: null, suggestions: [] };
}

export const TOOL_DEFINITIONS = [
    {
        name: 'read_diagram',
        description: 'Read the current draft of the diagram, with line numbers. Call this before an edit when you are not sure of the exact current text.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'edit_diagram',
        description: 'Change the draft with exact text replacements, applied in order. Each old_text must appear exactly once in the draft; include a few surrounding lines when a short text appears more than once. Copy old_text exactly, without line numbers. Returns the validation result.',
        parameters: {
            type: 'object',
            properties: {
                edits: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            old_text: { type: 'string', description: 'Text to replace, copied exactly from the draft' },
                            new_text: { type: 'string', description: 'Replacement text' }
                        },
                        required: ['old_text', 'new_text']
                    }
                }
            },
            required: ['edits']
        }
    },
    {
        name: 'write_diagram',
        description: 'Replace the whole draft. Use for a new diagram, a change of notation, or a rewrite of most of the diagram. Returns the validation result.',
        parameters: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: DIAGRAM_TYPE_IDS, description: 'The notation of the code' },
                code: { type: 'string', description: 'The complete diagram source, without markdown fences' }
            },
            required: ['type', 'code']
        }
    },
    {
        name: 'suggest_next_steps',
        description: 'Offer the user two to four short follow-up requests, shown as buttons under your reply. Call this once, at the end of your turn.',
        parameters: {
            type: 'object',
            properties: { suggestions: { type: 'array', items: { type: 'string' } } },
            required: ['suggestions']
        }
    }
];

/** The draft with line numbers, as the model reads it. */
export function numberLines(code) {
    const lines = code.split('\n');
    const width = String(lines.length).length;
    return lines.map((line, i) => `${String(i + 1).padStart(width)}| ${line}`).join('\n');
}

const count = (text, part) => {
    let n = 0;
    for (let i = text.indexOf(part); i !== -1; i = text.indexOf(part, i + part.length)) n++;
    return n;
};

/**
 * Apply exact replacements in order. All replacements apply, or none do.
 * @returns {{ code: string } | { error: string }}
 */
export function applyEdits(code, edits) {
    if (!Array.isArray(edits) || edits.length === 0) return { error: 'edits must hold at least one replacement.' };
    let next = code;
    for (const [i, edit] of edits.entries()) {
        const oldText = edit?.old_text;
        const newText = edit?.new_text;
        const label = edits.length > 1 ? `Edit ${i + 1}: ` : '';
        if (typeof oldText !== 'string' || typeof newText !== 'string') return { error: `${label}old_text and new_text must both be strings.` };
        if (oldText === '') return { error: `${label}old_text is empty. Use write_diagram to write a whole diagram.` };
        const matches = count(next, oldText);
        if (matches === 0) {
            return { error: `${label}old_text was not found in the draft. No edits were applied. Call read_diagram to see the exact current text.` };
        }
        if (matches > 1) {
            return { error: `${label}old_text appears ${matches} times in the draft. No edits were applied. Include more surrounding text so that old_text appears once.` };
        }
        const at = next.indexOf(oldText);
        next = next.slice(0, at) + newText + next.slice(at + oldText.length);
    }
    return { code: next };
}

/** The validation result in the shape the model reads. */
const verdict = (validation) => ({
    status: validation.status,
    ...(validation.error ? { error: validation.error } : {}),
    ...(validation.line ? { line: validation.line } : {}),
    ...(validation.warnings?.length ? { warnings: validation.warnings.slice(0, 5) } : {})
});

/**
 * Run one tool call against the draft.
 * @returns {Promise<{ content: object|string, isError: boolean, step: object|null }>}
 *   step is the entry for the validation trail, or null for tools that do not change the draft
 */
export async function runTool(draft, call, { validate = validateDiagram } = {}) {
    if (call.invalidArgs !== undefined) {
        return { content: 'The tool input was cut off or was not valid JSON. Send a smaller edit, or split the change into several edit_diagram calls.', isError: true, step: null };
    }
    const args = call.args || {};
    switch (call.name) {
        case 'read_diagram':
            return { content: { type: draft.type, code: draft.code ? numberLines(draft.code) : '(empty)' }, isError: false, step: null };

        case 'edit_diagram': {
            if (!draft.code) return { content: 'The draft is empty. Use write_diagram.', isError: true, step: null };
            const result = applyEdits(draft.code, args.edits);
            if (result.error) return { content: result.error, isError: true, step: { action: 'edit', status: 'rejected', error: result.error } };
            draft.code = result.code;
            draft.validation = await validate(draft.code, draft.type);
            return { content: verdict(draft.validation), isError: false, step: { action: 'edit', status: draft.validation.status, error: draft.validation.error } };
        }

        case 'write_diagram': {
            if (!DIAGRAM_TYPE_IDS.includes(args.type)) {
                return { content: `Unknown type "${args.type}". Use one of: ${DIAGRAM_TYPE_IDS.join(', ')}.`, isError: true, step: null };
            }
            if (typeof args.code !== 'string' || !args.code.trim()) return { content: 'code is empty.', isError: true, step: null };
            draft.type = args.type;
            draft.code = stripFence(args.code);
            draft.validation = await validate(draft.code, draft.type);
            return { content: verdict(draft.validation), isError: false, step: { action: 'write', type: draft.type, status: draft.validation.status, error: draft.validation.error } };
        }

        case 'suggest_next_steps': {
            const list = Array.isArray(args.suggestions) ? args.suggestions : [];
            draft.suggestions = list.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()).slice(0, 4);
            return { content: 'Shown to the user.', isError: false, step: null };
        }

        default:
            return { content: `Unknown tool "${call.name}".`, isError: true, step: null };
    }
}

/** Remove a markdown fence that a model wrapped around the code despite the instruction. */
function stripFence(code) {
    const match = code.trim().match(/^```[\w-]*\n([\s\S]*?)\n```$/);
    return match ? match[1] : code;
}
