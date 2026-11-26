
import { ERROR_KINDS } from '../error-classifier.js';
// We need to import the auto-layout utility
// Since we are in an ES module environment, we assume utils.js exports it
import { applyBpmnAutoLayout } from '../../../utils.js';

const REQUIRED_NAMESPACES = {
    'xmlns:bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
    'xmlns:bpmndi': 'http://www.omg.org/spec/BPMN/20100524/DI',
    'xmlns:dc': 'http://www.omg.org/spec/DD/20100524/DC',
    'xmlns:di': 'http://www.omg.org/spec/DD/20100524/DI'
};

export async function proposeBpmnPatches(code, errors, config) {
    const patches = [];

    // 1. Fix Missing Namespaces (Critical for bpmn-moddle)
    // This pairs with the "NAMESPACE" error kind we added to the Adapter
    if (errors.some(e => e.kind === 'NAMESPACE' || e.kind === ERROR_KINDS.NAMESPACE)) {
        patches.push({
            description: "Inject missing BPMN Namespaces",
            confidence: 1.0, // High confidence because we know the exact strings
            apply: (c) => {
                let fixed = c;
                // Regex to find the opening <definitions> or <bpmn:definitions> tag
                const defTagMatch = fixed.match(/<([a-z0-9]+:)?definitions([^>]*)>/i);
                
                if (defTagMatch) {
                    let attributes = defTagMatch[2];
                    const fullTag = defTagMatch[0];
                    
                    // Append missing namespaces
                    Object.entries(REQUIRED_NAMESPACES).forEach(([key, url]) => {
                        if (!attributes.includes(key)) {
                            attributes += ` ${key}="${url}"`;
                        }
                    });
                    
                    // Reconstruct the tag
                    const newTag = `<${defTagMatch[1] || ''}definitions${attributes}>`;
                    fixed = fixed.replace(fullTag, newTag);
                }
                return fixed;
            }
        });
    }

    // 2. Missing DI / Layout
    if (errors.some(e => e.kind === ERROR_KINDS.DI_LAYOUT)) {
        patches.push({
            description: "Generate BPMN Diagram Layout (DI)",
            confidence: 0.95,
            apply: async (c) => {
                try {
                     return await applyBpmnAutoLayout(c);
                } catch (e) {
                    console.warn("Auto layout failed in patcher", e);
                    throw e; // Let the engine handle failure
                }
            }
        });
    }

    return patches;
}
