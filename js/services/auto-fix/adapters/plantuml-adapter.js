
import { ToolAdapter } from './tool-adapter.js';
import { rendererAdapter } from '../../RendererAdapter.js';

export class PlantUmlAdapter extends ToolAdapter {
    async validate(code) {
        // Reuse the server-side validator from RendererAdapter (Kroki based)
        // Since we can't run PlantUML.jar in browser directly
        const result = await rendererAdapter.validateSyntax(code, 'plantuml');
        
        if (result.valid) {
            return { valid: true, errors: [] };
        }

        return {
            valid: false,
            errors: [this.normalizeError(result, code)]
        };
    }

    normalizeError(result, code) {
        const msg = result.error || 'Unknown PlantUML Error';
        return {
            kind: 'PARSE', // Usually syntax error
            message: msg,
            line: result.line,
            col: null,
            raw: msg
        };
    }
}
