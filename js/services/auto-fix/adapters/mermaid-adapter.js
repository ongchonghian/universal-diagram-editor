
import { ToolAdapter } from './tool-adapter.js';
import mermaid from 'mermaid'; // Might need to be dynamically imported if in node/strict env, but here we assume bundle

export class MermaidAdapter extends ToolAdapter {
    async validate(code) {
        try {
            // Mermaid's parse function throws on error
            // Note: parse() is async in newer versions
            await mermaid.parse(code);
            return { valid: true, errors: [] };
        } catch (err) {
            return { 
                valid: false, 
                errors: [this.normalizeError(err, code)] 
            };
        }
    }

    normalizeError(err, code) {
        // Mermaid errors are text-based often
        const msg = err.message || String(err);
        
        // Try extract line number
        // "Parse error on line 5"
        const lineMatch = msg.match(/on line (\d+)/i);
        const line = lineMatch ? parseInt(lineMatch[1], 10) : null;

        let kind = 'PARSE';
        if (msg.includes('start') || msg.includes('end') || msg.includes('Generic')) {
            kind = 'PARSE';
        }

        return {
            kind,
            message: msg,
            line,
            col: null,
            raw: msg
        };
    }
}
