
import { ToolAdapter } from './tool-adapter.js';
import { rendererAdapter } from '../../RendererAdapter.js';

export class PlantUmlAdapter extends ToolAdapter {
    async validate(code) {
        const errors = [];

        // 1. Client-Side Checks (Linter)
        // Check for common timeline mistakes
        if (code.includes('timeline')) {
             if (/^\s*section\s+/m.test(code)) {
                 errors.push(this.createLocalError(
                     "The 'section' keyword is not allowed in PlantUML Timelines (it is for Gantt charts). Use comments or implicit grouping.",
                     code,
                     /^\s*section\s+/m
                 ));
             }
             // Check for unquoted colons in descriptions
             const lines = code.split('\n');
             lines.forEach((line, index) => {
                 // heuristic: line has colon but isn't a date separator
                 // e.g. "Some : Description" is failing if "Some" isn't a known date format or if mapped weirdly
                 // But simpler: just check for multiple colons or colons in the description part
                 // Regex rule: ^ (date) : (desc with :) $
                 if (/^[^:\n]+:[^:\n]+:/.test(line)) {
                     errors.push({
                         kind: 'SYNTAX_TIMELINE',
                         message: "Avoid using colons ':' in timeline event descriptions as it breaks parsing. Use hyphens or escape them.",
                         line: index + 1
                     });
                 }
                 // Check for ambiguous newline events without semicolons
                 // valid: :Event;
                 // suspicious: :Event (without semicolon) can be flaky in some versions or contexts
                 if (line.trim().startsWith(':') && !line.trim().endsWith(';') && !line.includes(';')) {
                      // Warn about missing semicolon, but maybe not a hard error? 
                      // actually let's mark it as a potential syntax issue to encourage the fix
                      errors.push({
                          kind: 'SYNTAX_TIMELINE',
                          message: "Event definitions starting with ':' should usually end with a semicolon ';' in timelines for reliable parsing.",
                          line: index + 1
                      });
                 }
                 
                 // Check for unquoted dates containing spaces before the colon
                 // e.g. "Feb 02 : Event" -> matches ^\s*[^":\n]+\s+[^":\n]+ :
                 // But be careful not to match valid things.
                 // Heuristic: If line starts with alphanumeric, has spaces, then a colon, but NO quotes at start.
                 const stripped = line.trim();
                 if (/^[a-zA-Z0-9]+\s+[a-zA-Z0-9\s]*:/.test(stripped) && !stripped.startsWith('"') && !stripped.startsWith("'")) {
                      errors.push({
                          kind: 'SYNTAX_TIMELINE',
                          message: "Timeline dates with spaces must be quoted (e.g., \"Feb 02\" : Event).",
                          line: index + 1
                      });
                 }
             });
        }

        // Basic block check
        const startState = (code.match(/@start/g) || []).length;
        const endState = (code.match(/@end/g) || []).length;
        if (startState !== endState) {
             errors.push({
                 kind: 'PARSE',
                 message: `Block mismatch: Found ${startState} @start tags and ${endState} @end tags.`,
                 line: 1
             });
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        // 2. Renderer Validation (WASM or Remote)
        // Uses the configured renderer from RendererAdapter
        const result = await rendererAdapter.validateSyntax(code, 'plantuml');
        
        if (result.valid) {
            return { valid: true, errors: [] };
        }

        return {
            valid: false,
            errors: [this.normalizeError(result, code)]
        };
    }

    createLocalError(msg, code, pattern) {
        // Try to find line number
        let line = 1;
        if (pattern) {
            const lines = code.split('\n');
            for(let i=0; i<lines.length; i++) {
                if (pattern.test(lines[i])) {
                    line = i + 1;
                    break;
                }
            }
        }
        return {
            kind: 'PARSE',
            message: msg,
            line: line,
            col: null,
            raw: msg
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
