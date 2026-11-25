
import { ToolAdapter } from './tool-adapter.js';

export class MermaidAdapter extends ToolAdapter {
    constructor() {
        super('mermaid');
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
