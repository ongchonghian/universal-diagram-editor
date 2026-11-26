/**
 * Auto-Fix Service (Diagram Doctor)
 * Implements the "Reproduce -> Classify -> Patch -> Verify" loop.
 */
import { aiService } from './ai-service.js';
import { LanguageDetector, LANGUAGES } from './auto-fix/language-detector.js'; // Note path fix
import { ErrorClassifier } from './auto-fix/error-classifier.js';
import { PatchProposer } from './auto-fix/patch-proposer.js';

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
        let language = LanguageDetector.detectLanguage(code);
        if (language === LANGUAGES.UNKNOWN && hintedType) {
            // Map hinted type to our internal constants if needed
            if (hintedType.includes('plantuml')) language = LANGUAGES.PLANTUML;
            else if (hintedType.includes('mermaid')) language = LANGUAGES.MERMAID;
            else if (hintedType.includes('bpmn')) language = LANGUAGES.BPMN;
        }

        const fixLog = [`Detected Language: ${language}`];
        let currentCode = code;
        const adapter = this.getAdapter(language);

        if (!adapter) {
            fixLog.push(`No adapter found for language: ${language}`);
            return { fixed: false, code, log: fixLog };
        }

        let validation = { valid: false };

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

            // 4. Propose Patches (Heuristics)
            console.log(`[AutoFix] Proposing patches for language: ${language}`);
            const patches = await PatchProposer.propose(currentCode, errors, language);
            
            // 5. APPLY PATCH STRATEGY
            let appliedPatchSuccess = false;

            // Iterate through heuristics to find one that actually works
            for (const patch of patches) {
                fixLog.push(`Trying heuristic: ${patch.description}`);
                try {
                    let newCode = currentCode;
                    if (typeof patch.apply === 'function') {
                        newCode = await patch.apply(currentCode);
                    } else {
                        newCode = patch.apply;
                    }

                    // CRITICAL CHECK: Did the code actually change?
                    if (newCode !== currentCode) {
                        currentCode = newCode;
                        appliedPatchSuccess = true;
                        fixLog.push(`-> Applied successfully.`);
                        break; // Stop trying other patches, go to next validation loop
                    } else {
                        fixLog.push(`-> Skipped (No-op: Code didn't change).`);
                    }
                } catch (e) {
                    fixLog.push(`-> Failed execution: ${e.message}`);
                }
            }

            // 6. ESCALATION: If heuristics failed/exhausted, call the LLM
            if (!appliedPatchSuccess) {
                fixLog.push("No effective heuristics found. Escalating to LLM.");
                try {
                     const result = await this._llmFix(currentCode, errors, language);
                     if (result.code !== currentCode) {
                        currentCode = result.code;
                        fixLog.push(`LLM applied fix.`);
                     } else {
                        fixLog.push(`LLM returned identical code. Aborting to prevent loop.`);
                        break;
                     }
                } catch (e) {
                     fixLog.push(`LLM fix failed: ${e.message}`);
                     console.error("[AutoFix] LLM failed:", e);
                     break; 
                }
            }
        }

        console.log("[AutoFix] Finished. Fixed:", validation?.valid, "Log:", fixLog);
        return { fixed: validation?.valid || false, code: currentCode, log: fixLog };
    }

    async _llmFix(code, errors, language) {
        const errorMsg = errors.map(e => `${e.kind}: ${e.message} (Line ${e.line})`).join('\n');
        
        let specificInstructions = "";

        // INJECT BPMN-SPECIFIC RULES
        if (language === LANGUAGES.BPMN) {
            specificInstructions = `
CRITICAL BPMN 2.0 RULES:
1. XML Headers: Must have <bpmn:definitions> with these EXACT namespaces:
   - xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
   - xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
   - xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
2. Structure:
   - Logic goes in <bpmn:process id="Process_1">
   - Visuals go in <bpmndi:BPMNDiagram>
3. Linkage:
   - Every <bpmndi:BPMNShape> MUST have a 'bpmnElement' attribute matching a process ID.
   - Example: <bpmndi:BPMNShape bpmnElement="StartEvent_1"> matches <bpmn:startEvent id="StartEvent_1">
            `;
        }

        // NEW: specific syntax retrieval
        let syntaxContext = "";
        if (language === LANGUAGES.PLANTUML) {
            try {
                const { syntaxKnowledgeBase } = await import('./auto-fix/SyntaxKnowledgeBase.js');
                // Combine error messages and code snippet for keyword extraction
                const combinedContext = errorReport + " " + code.substring(0, 500); 
                const keywords = syntaxKnowledgeBase.extractKeywords(combinedContext);
                
                if (keywords.length > 0) {
                    const examples = syntaxKnowledgeBase.getRelevantExamples(keywords, 3);
                    if (examples.length > 0) {
                        syntaxContext = `
--- RELEVANT SYNTAX EXAMPLES ---
The following are valid PlantUML examples related to your error context (${keywords.join(', ')}):

${examples.map(ex => `**${ex.topic}**:\n\`\`\`plantuml\n${ex.code}\n\`\`\``).join('\n\n')}
`;
                    }
                }
            } catch (e) {
                console.warn("[AutoFix] Failed to load syntax knowledge base:", e);
            }
        }

        const systemPrompt = `
You are an expert Diagram Syntax Repair Engineer for ${language}.
Your task is to fix syntax errors in the user's diagram code.

${syntaxContext}

--- ERROR REPORT ---
${errorMsg}

${specificInstructions}

--- RULES ---
1. Analyze the syntax error based on the ${language} specifications.
2. If the error mentions specific tokens (like colons, brackets), adjust them to valid syntax.
3. For PlantUML Timelines:
   - Do NOT use the 'section' keyword (it is for Gantt charts). Use comments or implicit grouping instead.
   - PREFERRED SYNTAX: Use the colon separator format WITH QUOTES for dates:
     \`"Date String" : Event Description\`
     \`"Feb 02" : Another Event\`
   - ALWAYS quote the date/time on the left side of the colon if it contains spaces.
   - If using the newline format, you MUST use semicolons at the end of events.
   - **CRITICAL: If the input looks like MERMAID Syntax (e.g. \`Date : Event\` inside \`@startuml\`), TRANSLATE IT to PlantUML Gantt:**
     Mermaid: \`Feb 02 : Event\`
     PlantUML Gantt: \`[Event] starts 2026-02-02\` (or just use relative start)
   - Ensure event descriptions do NOT contain internal colons unless escaped.
   - Ensure the 'timeline' keyword is at the start (after @startuml).
4. For Mermaid:
   - Ensure 'init' blocks are valid JSON.
5. YOU MUST RETURN THE CODE INSIDE A MARKDOWN BLOCK like:
\`\`\`${language}
 code here...
\`\`\`
`;
        const result = await aiService.callLLM(systemPrompt, code);
        console.log("[AutoFix] LLM Result Raw:", result.substring(0, 200) + "...");
        
        let fixedCode = null;
        
        // 1. Try to extract from Markdown Code Block
        // Relaxed regex: allows optional language, handles newlines flexibly
        const codeBlockMatch = result.match(/```(?:[\w\-\.]+)?\s*([\s\S]*?)\s*```/);
        
        if (codeBlockMatch) {
            fixedCode = codeBlockMatch[1].trim();
        } else {
             console.warn("[AutoFix] LLM did not return a code block. Attempting smart extraction...");
             
             // 2. Smart Extraction Fallback
             const trimmed = result.trim();
             
             // BPMN / XML
             if (language === LANGUAGES.BPMN || trimmed.includes('<?xml') || trimmed.includes('<bpmn:definitions') || trimmed.includes('<definitions')) {
                 const xmlStart = result.indexOf('<?xml');
                 const defStart = result.indexOf('<definitions');
                 const bpmnDefStart = result.indexOf('<bpmn:definitions');
                 
                 let startIndex = -1;
                 if (xmlStart !== -1) startIndex = xmlStart;
                 else if (bpmnDefStart !== -1) startIndex = bpmnDefStart;
                 else if (defStart !== -1) startIndex = defStart;
                 
                 if (startIndex !== -1) {
                     // Try to find the end
                     const endTag = '</bpmn:definitions>'; 
                     const endTagSimple = '</definitions>';
                     let endIndex = result.indexOf(endTag, startIndex);
                     if (endIndex === -1) endIndex = result.indexOf(endTagSimple, startIndex);
                     
                     if (endIndex !== -1) {
                         // Extract from start to end of closing tag
                         fixedCode = result.substring(startIndex, endIndex + (result.includes(endTag) ? endTag.length : endTagSimple.length));
                     } else {
                         // If no end tag found, just take from start to end of string (risky but better than nothing)
                         fixedCode = result.substring(startIndex);
                     }
                 }
             }
             
             // PlantUML
             if (!fixedCode && (language === LANGUAGES.PLANTUML || trimmed.includes('@start'))) {
                 const startMatch = result.match(/@start\w+/);
                 if (startMatch) {
                     const startIndex = startMatch.index;
                     const endMatch = result.match(/@end\w+/);
                     if (endMatch) {
                         fixedCode = result.substring(startIndex, endMatch.index + endMatch[0].length);
                     } else {
                         fixedCode = result.substring(startIndex);
                     }
                 }
             }
             
             // Mermaid (Graph/Sequence/Etc)
             if (!fixedCode && (language === LANGUAGES.MERMAID)) {
                 // Mermaid is harder because it doesn't always have a clear end marker like @enduml
                 // We look for common start keywords if they appear at the start of a line
                 const mermaidKeywords = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'journey', 'timeline'];
                 for (const kw of mermaidKeywords) {
                     const regex = new RegExp(`^\\s*${kw}\\b`, 'm');
                     const match = result.match(regex);
                     if (match) {
                         fixedCode = result.substring(match.index);
                         break;
                     }
                 }
             }
        }
        
        if (!fixedCode) {
             // Last resort: if the whole text looks like it *might* be code (no conversational intro), use it
             const trimmed = result.trim();
             if (trimmed.startsWith('<') || trimmed.startsWith('@') || trimmed.startsWith('graph') || trimmed.startsWith('sequenceDiagram')) {
                 fixedCode = trimmed;
             }
        }

        if (!fixedCode) {
             throw new Error("LLM failed to return valid code block.");
        }

        return { code: fixedCode };
    }
}

export const autoFixService = new AutoFixService();
