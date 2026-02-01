
import { ToolAdapter } from './tool-adapter.js';

export class BpmnAdapter extends ToolAdapter {
    async validate(code) {
        const errors = [];
        let valid = true;

        // 1. Basic XML check (fast fail)
        if (!code.trim().startsWith('<?xml') && !code.includes('<bpmn:definitions') && !code.includes('<definitions')) {
             return { 
                 valid: false, 
                 errors: [{ 
                     kind: 'PARSE', 
                     message: 'Invalid BPMN XML header', 
                     line: 1, 
                     col: 1, 
                     raw: 'Invalid header' 
                }] 
             };
        }

        // 2. Client-side XML DOM Parser check
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(code, "text/xml");
        const parserError = xmlDoc.querySelector("parsererror");
        
        if (parserError) {
            const errorText = parserError.textContent;
            return {
                valid: false,
                errors: [{
                    kind: 'PARSE',
                    message: `XML Parse Error: ${errorText}`,
                    line: null, // Hard to get exact line from DOMParser in browser
                    col: null,
                    raw: errorText
                }]
            };
        }

        // 3. DI Presence Check (Layout)
        const hasDi = code.includes('<bpmndi:BPMNDiagram') || code.includes('<bpmndi:BPMNPlane');
        if (!hasDi) {
            valid = false;
            errors.push({
                kind: 'DI_LAYOUT',
                message: 'Missing Diagram Layout (DI)',
                line: null,
                col: null,
                raw: 'Missing DI'
            });
        }

        return { valid: errors.length === 0, errors };
    }
}
