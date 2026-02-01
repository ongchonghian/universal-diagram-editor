/**
 * Tool Adapter Interface
 * Standardizes interaction with different validation engines (PlantUML, Mermaid, BPMN).
 */

export class ToolAdapter {
    constructor() {
        this.normalizedErrors = [];
    }

    /**
     * Run validation/rendering
     * @param {string} code 
     * @returns {Promise<{valid: boolean, errors: Array<import('../index.js').DiagError>}>}
     */
    async validate(code) {
        throw new Error('validate() must be implemented by subclass');
    }

    /**
     * Normalize raw error to DiagError
     * @param {any} rawError 
     * @returns {import('../index.js').DiagError}
     */
    normalizeError(rawError) {
        return {
            message: String(rawError),
            line: null,
            column: null,
            kind: 'UNKNOWN',
            raw: rawError
        };
    }
}
