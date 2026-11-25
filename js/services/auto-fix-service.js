/**
 * Auto-Fix Service (Diagram Doctor)
 * Implements the "Reproduce -> Classify -> Patch -> Verify" loop.
 */
import { aiService } from './ai-service.js';
import { LanguageDetector, LANGUAGES } from './auto-fix/language-detector.js'; // Note path fix
import { ErrorClassifier } from './auto-fix/error-classifier.js';
import { PatchProposer } from './auto-fix/patch-proposer.js';
import { extractCodeBlock } from '../utils/code-extract.js';

import { PlantUmlAdapter } from './auto-fix/adapters/plantuml-adapter.js';
import { MermaidAdapter } from './auto-fix/adapters/mermaid-adapter.js';
import { BpmnAdapter } from './auto-fix/adapters/bpmn-adapter.js';

class AutoFixService {
    constructor() {
        this.MAX_ATTEMPTS = 3;
    }

    getAdapter(language) {
        switch (language) {
            case LANGUAGES.PLANTUML: return new PlantUmlAdapter();
            case LANGUAGES.MERMAID: return new MermaidAdapter();
            case LANGUAGES.BPMN: return new BpmnAdapter();
            default: return null;
        }
    }

    /**
     * Attempt to fix the diagram code.
     * @param {string} code 
     * @param {string} hintedType - Optional hint (e.g. from editor)
     * @param {any} existingError - Optional error context
     */
    async attemptAutoFix(code, hintedType = null, existingError = null) {
        // 1. Detect Language
        // The caller's type is the most reliable signal. Content detection runs only when the caller gives no type.
        let language = LANGUAGES.UNKNOWN;
        if (hintedType) {
            // C4 in this app is written in PlantUML
            if (hintedType.includes('plantuml') || hintedType === 'c4') language = LANGUAGES.PLANTUML;
            else if (hintedType.includes('mermaid')) language = LANGUAGES.MERMAID;
            else if (hintedType.includes('bpmn')) language = LANGUAGES.BPMN;
        } else {
            language = LanguageDetector.detectLanguage(code);
        }

        const fixLog = [`Detected Language: ${language}`];
        let currentCode = code;
        const adapter = this.getAdapter(language);

        if (!adapter) {
            fixLog.push(`No adapter found for language: ${language}`);
            return { fixed: false, code, reason: 'unsupported', log: fixLog };
        }

        let validation = { valid: false };
        let reason = 'failed';

        for (let attempt = 1; attempt <= this.MAX_ATTEMPTS; attempt++) {
            fixLog.push(`\nAttempt ${attempt}: Validating...`);

            // 2. Run Adapter (Validation)
            if (attempt === 1 && existingError) {
                // normalize existing error if passed
                validation = { 
                    valid: false, 
                    errors: [adapter.normalizeError(existingError, currentCode)] 
                };
            } else {
                validation = await adapter.validate(currentCode);
            }

            if (validation.valid) {
                fixLog.push("Validation Passed!");
                return { fixed: true, code: currentCode, log: fixLog };
            }

            // 3. Classify Errors
            const errors = validation.errors.map(e => ({
                ...e,
                kind: ErrorClassifier.classify(e, language)
            }));

            fixLog.push(`Errors found: ${errors.length}. First: [${errors[0].kind}] ${errors[0].message}`);

            // 4. Propose Patches
            console.log(`[AutoFix] Proposing patches for language: ${language}`);
            const patches = await PatchProposer.propose(currentCode, errors, language);
            console.log(`[AutoFix] Proposed patches:`, patches);
            
            if (patches.length === 0) {
                fixLog.push("No heuristic patches found. Falling back to LLM.");
                console.log("[AutoFix] No patches found, trying LLM...");
                try {
                     const result = await this._llmFix(currentCode, errors, language);
                     currentCode = result.code;
                     fixLog.push(`LLM applied fix.`);
                } catch (e) {
                     fixLog.push(`LLM fix failed: ${e.message}`);
                     console.error("[AutoFix] LLM failed:", e);
                     if (!aiService.hasApiKey()) reason = 'no-key';
                     break; 
                }
                continue;
            }

            // 5. Apply Best Patch
            const bestPatch = patches[0];
            fixLog.push(`Applying patch: ${bestPatch.description} (Confidence: ${bestPatch.confidence})`);
            console.log(`[AutoFix] Applying patch: ${bestPatch.description}`);
            
            try {
                if (typeof bestPatch.apply === 'function') {
                    const newCode = await bestPatch.apply(currentCode);
                    if (newCode === currentCode) {
                         console.warn("[AutoFix] Patch applied but code did not change!");
                    } else {
                         console.log("[AutoFix] Code changed.");
                    }
                    currentCode = newCode;
                } else {
                    currentCode = bestPatch.apply; // Direct string replacement if implemented that way
                }
            } catch (e) {
                fixLog.push(`Patch application failed: ${e.message}`);
                console.error("[AutoFix] Patch application failed:", e);
                break;
            }
        }

        // The last attempt may have changed the code, so check the final code once more
        if (currentCode !== code) {
            validation = await adapter.validate(currentCode);
            fixLog.push(validation.valid ? "Final validation passed." : "Final validation failed.");
        }

        console.log("[AutoFix] Finished. Fixed:", validation.valid, "Log:", fixLog);
        return { fixed: !!validation.valid, code: currentCode, reason: validation.valid ? undefined : reason, log: fixLog };
    }

    async _llmFix(code, errors, language) {
        if (!aiService.hasApiKey()) {
            throw new Error('API Key is missing. Please configure it in settings.');
        }

        const errorMsg = errors.map(e => `${e.kind}: ${e.message} (Line ${e.line})`).join('\n');
        
        const systemPrompt = `
You are an expert Diagram Debugger for ${language}.
The code has the following errors:
${errorMsg}

Fix the code. Return ONLY the fixed code. No markdown blocks.
`;
        const result = await aiService.callLLM(systemPrompt, code);
        
        // Use the fenced block when the model adds one despite the instruction
        const block = extractCodeBlock(result);
        const fixedCode = block ? block.code : result.trim();

        return { code: fixedCode };
    }
}

export const autoFixService = new AutoFixService();
