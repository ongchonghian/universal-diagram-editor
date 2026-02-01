
/**
 * Patch Proposer
 * Generates potential fixes based on error classification and language strategies.
 */
import { LANGUAGES } from '../auto-fix/language-detector.js';

import { proposePlantUmlPatches } from './strategies/plantuml-patcher.js';
import { proposeMermaidPatches } from './strategies/mermaid-patcher.js';
import { proposeBpmnPatches } from './strategies/bpmn-patcher.js';

export class PatchProposer {
    static async propose(code, errors, language, config = {}) {
        let patches = [];

        switch (language) {
            case LANGUAGES.PLANTUML:
                patches = await proposePlantUmlPatches(code, errors, config);
                break;
            case LANGUAGES.MERMAID:
                patches = await proposeMermaidPatches(code, errors, config);
                break;
            case LANGUAGES.BPMN:
                patches = await proposeBpmnPatches(code, errors, config);
                break;
        }

        // Deduplicate and sort by confidence
        return this.deduplicate(patches).sort((a, b) => b.confidence - a.confidence);
    }

    static deduplicate(patches) {
        const seen = new Set();
        return patches.filter(p => {
            const key = `${p.description}-${p.confidence}`; // Simple signature
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
