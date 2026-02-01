
import { ERROR_KINDS } from '../error-classifier.js';
// We need to import the auto-layout utility
// Since we are in an ES module environment, we assume utils.js exports it
import { applyBpmnAutoLayout } from '../../../utils.js';

export async function proposeBpmnPatches(code, errors, config) {
    const patches = [];

    // 1. Missing DI / Layout
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
