
import { ERROR_KINDS } from '../error-classifier.js';

export async function proposeMermaidPatches(code, errors, config) {
    const patches = [];

    // 1. Check for missing 'end'
    const missingEnd = errors.some(e => 
        e.kind === ERROR_KINDS.PARSE && 
        (e.message.includes('EOF') || e.message.includes('end') || e.message.includes('Expecting'))
    );

    if (missingEnd) {
        // Simple heuristic: if it looks like we opened a block but didn't close it
        if (!code.trim().endsWith('end')) {
            patches.push({
                description: "Append missing 'end' keyword",
                confidence: 0.9,
                apply: (c) => c + '\nend'
            });
        }
    }

    // 2. Init blocks causing issues?
    if (code.includes('%%{init:') && errors.some(e => e.kind === ERROR_KINDS.PARSE)) {
         patches.push({
            description: "Remove config/init block to isolate error",
            confidence: 0.6,
            apply: (c) => c.replace(/%%\{init:.*?\}%%\s*/s, '')
        });
    }

    return patches;
}
