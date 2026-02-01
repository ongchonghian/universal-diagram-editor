
import { ERROR_KINDS } from '../error-classifier.js';

export async function proposePlantUmlPatches(code, errors, config) {
    const patches = [];

    // 1. Timeline colons
    if (code.includes('timeline') && errors.some(e => e.kind === ERROR_KINDS.PARSE)) {
        patches.push({
            description: "Sanitize colons in timeline labels",
            confidence: 0.8,
            apply: (c) => {
                console.log("[Patcher] Input code length:", c.length);
                console.log("[Patcher] First 100 chars:", JSON.stringify(c.slice(0, 100)));
                return c.replace(/^(\s*(?!title|header|footer|legend|caption)(?:[^:\n]+)?\s*:\s*)(.+)$/gm, 
                    (matchStr, prefixPart, contentPart) => {
                        console.log("[Patcher] Matched:", JSON.stringify(matchStr));
                        return prefixPart + contentPart.replace(/:/g, ' -');
                    }
                );
            }
        });
    }

    // 2. Missing @enduml
    if (code.includes('@start') && !code.includes('@end')) {
        // Find what start tag was used
        const match = code.match(/@start([a-z]+)/i);
        if (match) {
            const tag = match[1];
             patches.push({
                description: `Append missing @end${tag}`,
                confidence: 0.95,
                apply: (c) => c + `\n@end${tag}`
            });
        }
    }

    return patches;
}
