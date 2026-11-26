
import { ERROR_KINDS } from '../error-classifier.js';

export async function proposePlantUmlPatches(code, errors, config) {
    const patches = [];

    // 1. Timeline colons - heuristic fix for pure sequence diagrams
    // BUT: If it has the 'timeline' keyword, it's likely a malformed Mermaid/Gantt attempt.
    // We should NOT apply this valid-sequence-fix because it yields a nonsense diagram (Actors named dates acting on Event actors).
    // We want to force escalation to LLM for translation.
    if (!code.includes('timeline') && errors.some(e => e.kind === ERROR_KINDS.PARSE)) {
        patches.push({
            description: "Sanitize colons in labels",
            confidence: 0.8,
            apply: (c) => c.replace(/^(\s*(?!title|header|footer|legend|caption)(?:[^:\n]+)?\s*:\s*)(.+)$/gm, 
                (matchStr, prefixPart, contentPart) => prefixPart + contentPart.replace(/:/g, ' -')
            )
        });
    }

    // 2. Timeline 'section' keyword (not supported in strict timeline, use comments or grouping)
    // If 'section' is used, the user heavily implies it's a Gantt chart, not a strict Timeline.
    // Proposal: Switch to @startgantt and remove 'timeline' keyword.
    if (code.includes('section') && errors.some(e => e.kind === ERROR_KINDS.PARSE)) {
         patches.push({
             description: "Convert to Gantt Chart (Found 'section' keyword)",
             confidence: 0.95, // High confidence this is actually a Gantt
             apply: (c) => {
                 let newCode = c
                     .replace(/@startuml/i, '@startgantt')
                     .replace(/@enduml/i, '@endgantt')
                     .replace(/^\s*timeline\s*/gm, ''); // Remove the 'timeline' keyword which is invalid in Gantt
                 return newCode;
             }
         });
    }

    // Fallback: If they really want a timeline, just comment out section
    if (code.includes('timeline') && code.includes('section') && errors.some(e => e.kind === ERROR_KINDS.PARSE)) {
        patches.push({
            description: "Comment out unsupported 'section' keywords in timeline",
            confidence: 0.6, // Lower confidence, maybe they want Gantt
            apply: (c) => c.replace(/^\s*section\s+(.+)$/gm, "' section $1")
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
