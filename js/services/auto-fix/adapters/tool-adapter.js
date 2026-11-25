/**
 * Tool Adapter Interface
 * Standardizes interaction with different validation engines (PlantUML, Mermaid, BPMN).
 */

import { validateDiagram } from '../../diagram-tools/validate.js';

export class ToolAdapter {
    /**
     * @param {string} type  The DIAGRAM_TYPES key this adapter validates
     * @param {object} [validateOptions]  Options passed to validateDiagram
     */
    constructor(type, validateOptions = {}) {
        this.type = type;
        this.validateOptions = validateOptions;
        this.normalizedErrors = [];
    }

    /**
     * Validate with the shared validator and convert the result to the auto-fix shape.
     * An 'unverified' result (for example the diagram server could not be reached) is reported
     * as not valid with kind UNVERIFIED, so the repair loop stops instead of changing good code.
     * @returns {Promise<{valid: boolean, status: string, errors: Array}>}
     */
    async validate(code) {
        const v = await validateDiagram(code, this.type, this.validateOptions);
        if (v.status === 'valid') return { valid: true, status: v.status, errors: [] };
        return {
            valid: false,
            status: v.status,
            errors: [{
                kind: v.status === 'unverified' ? 'UNVERIFIED' : (v.kind || 'PARSE'),
                message: v.error,
                line: v.line,
                col: null,
                raw: v.error
            }]
        };
    }


    /**
     * Normalize raw error to DiagError
     * @param {any} rawError 
     * @returns {import('../index.js').DiagError}
     */
    normalizeError(rawError) {
        return {
            message: typeof rawError === 'string' ? rawError : (rawError?.message || String(rawError)),
            line: null,
            column: null,
            kind: 'UNKNOWN',
            raw: rawError
        };
    }
}
