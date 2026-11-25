
import { ToolAdapter } from './tool-adapter.js';

export class PlantUmlAdapter extends ToolAdapter {
    /**
     * @param {'plantuml'|'c4'} type  C4 is validated against Kroki's c4plantuml endpoint
     */
    constructor(type = 'plantuml') {
        super(type === 'c4' ? 'c4' : 'plantuml');
    }

    normalizeError(result, code) {
        // The caller may pass a plain string, a validation result, or a preview error object
        const msg = typeof result === 'string'
            ? result
            : (result?.error?.message || (typeof result?.error === 'string' ? result.error : null) || result?.message || 'Unknown PlantUML Error');
        return {
            kind: 'PARSE', // Usually syntax error
            message: msg,
            line: result?.line ?? null,
            col: null,
            raw: msg
        };
    }
}
