
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

        // 2. Namespace Integrity Check
        const requiredNamespaces = [
            'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"',
            'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"',
            'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"',
            'xmlns:di="http://www.omg.org/spec/DD/20100524/DI"'
        ];

        const missingNamespaces = requiredNamespaces.filter(ns => !code.includes(ns));
        if (missingNamespaces.length > 0) {
            // Only fail if it's missing the definitions entirely, otherwise we might be too strict on exact string match
            // But user asked for strict check.
            // Let's check for the URL part mostly to be safe against prefix changes, but user gave exact strings.
            // valid = false; 
            // errors.push({ ... });
            
            // Actually, let's just check for the URLs to be robust against prefix variations (e.g. xmlns:semantic)
            // But standard bpmn-js needs these specific prefixes usually for the DI to work right with the default moddle?
            // The user code snippet checks for the whole string. I will follow that.
            
            valid = false;
            errors.push({
                kind: 'NAMESPACE',
                message: `Missing required BPMN namespaces: ${missingNamespaces.join(', ')}`,
                line: 1,
                col: 1,
                raw: 'Missing Namespaces'
            });
        }

        // 3. Client-side XML DOM Parser check
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

        // 4. DI Presence & Quality Check (Layout)
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
        } else {
            // Check for "Bad Layout" (e.g. all shapes at 0,0) which is common with AI generation
            // We use the xmlDoc parsed above
            const bounds = xmlDoc.getElementsByTagName("dc:Bounds");
            if (bounds.length > 0) {
                let allZero = true;
                for (let i = 0; i < bounds.length; i++) {
                    const x = parseFloat(bounds[i].getAttribute("x") || "0");
                    const y = parseFloat(bounds[i].getAttribute("y") || "0");
                    // If any shape is significantly away from 0,0, assume layout is attempted
                    if (x > 5 || y > 5) { 
                        allZero = false;
                        break;
                    }
                }

                if (allZero) {
                    valid = false;
                     errors.push({
                        kind: 'DI_LAYOUT', // Triggers auto-layout patch
                        message: 'Bad Diagram Layout: All shapes are at (0,0). Auto-layout required.',
                        line: null,
                        col: null,
                        raw: 'Bad Layout'
                    });
                }
            }
        }

        // 5. Semantic Validation (Check for start/end events, gateway matching, etc.)
        if (errors.length === 0) {
            try {
                const { bpmnCompiler } = await import('../../bpmn-compiler.js');
                const ast = bpmnCompiler.decompile(code);
                bpmnCompiler.validate(ast);
            } catch (semanticErr) {
                valid = false;
                errors.push({
                    kind: 'SEMANTIC_ERROR',
                    message: `BPMN Semantic Error: ${semanticErr.message}`,
                    line: null,
                    col: null,
                    raw: semanticErr.message
                });
            }
        }

        return { valid: errors.length === 0, errors };
    }
}
