/**
 * AI Service for communicating with LLM providers (Gemini, etc.)
 * Handles API keys, model configuration, and prompt generation.
 */
import { diagramCompiler } from './diagram-compiler.js';
import { rendererAdapter } from './RendererAdapter.js';
import { LanguageDetector } from './auto-fix/language-detector.js';
import { extractCodeBlock } from '../utils/code-extract.js';


export class AIService {
    constructor() {
        this.STORAGE_KEY = 'universal_diagram_ai_settings';
        this.settings = this.loadSettings();
    }

    /**
     * Load settings from local storage or set defaults
     */
    loadSettings() {
        const defaults = {
            provider: 'gemini',
            model: 'gemini-1.5-flash',
            apiKey: '',
            temperature: 0.7
        };
        const stored = this.readStoredJSON(this.STORAGE_KEY);
        return stored ? { ...defaults, ...stored } : defaults;
    }

    /**
     * Read a JSON value from local storage.
     * Returns null when the entry is missing or holds invalid JSON, so a corrupt entry cannot stop the app from loading.
     */
    readStoredJSON(key) {
        try {
            const stored = localStorage.getItem(key);
            const parsed = stored ? JSON.parse(stored) : null;
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (e) {
            console.warn(`[AI] Ignoring unreadable stored value for ${key}`, e);
            return null;
        }
    }

    /**
     * Save settings to local storage
     * @param {Object} newSettings 
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
        return this.settings;
    }

    getSettings() {
        return { ...this.settings };
    }

    hasApiKey() {
        return !!this.settings.apiKey;
    }

    // --- Conversation Management ---

    getConversations() {
        return this.readStoredJSON('universal_diagram_ai_conversations') || {};
    }

    saveConversations(conversations) {
        try {
            localStorage.setItem('universal_diagram_ai_conversations', JSON.stringify(conversations));
        } catch (e) {
            // Usually a storage quota error. The chat keeps working; the conversation is not saved.
            console.warn('[AI] Could not save conversations', e);
        }
    }

    createConversation() {
        const id = Date.now().toString();
        const conversations = this.getConversations();
        conversations[id] = {
            id,
            title: 'New Conversation',
            messages: [],
            lastModified: Date.now()
        };
        this.saveConversations(conversations);
        return id;
    }

    getConversation(id) {
        const conversations = this.getConversations();
        return conversations[id] || null;
    }

    updateConversation(id, updates) {
        const conversations = this.getConversations();
        if (conversations[id]) {
            conversations[id] = { ...conversations[id], ...updates, lastModified: Date.now() };
            this.saveConversations(conversations);
        }
    }

    deleteConversation(id) {
        const conversations = this.getConversations();
        delete conversations[id];
        this.saveConversations(conversations);
    }

    addMessageToConversation(id, message) {
        const conversations = this.getConversations();
        if (conversations[id]) {
            conversations[id].messages.push(message);
            // Auto-generate title from first user message if title is default
            if (message.role === 'user' && conversations[id].title === 'New Conversation') {
                conversations[id].title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
            }
            conversations[id].lastModified = Date.now();
            this.saveConversations(conversations);
            return conversations[id];
        }
        return null;
    }

    // --- End Conversation Management ---

    /**
     * Generate diagram code based on prompt and context
     * Uses Neuro-Symbolic approach: LLM -> JSON AST -> Compiler -> Code
     * Includes Iterative Self-Correction Loop
     * @param {string} prompt - User instruction
     * @param {string} contextCode - Current code in editor
     * @param {string} diagramType - Type of diagram (mermaid, bpmn, etc.)
     */
    async generateDiagram(prompt, contextCode, diagramType) {
        if (!this.hasApiKey()) {
            throw new Error('API Key is missing. Please configure it in settings.');
        }

        if (!contextCode) {
            // New diagram
            const code = await this._generateInitialCode(prompt, '', diagramType);
            return code;
        }

        // Modification
        // We can use the chat capability for this
        const systemPrompt = this.getSystemPrompt(diagramType);
        const userMessage = `Current Code:\n\`\`\`${diagramType}\n${contextCode}\n\`\`\`\n\nRequest: ${prompt}`;
        
        const response = await this.callLLM(systemPrompt, userMessage);
        
        // Attempt auto-fix on the generated code if it's invalid
        // This connects the generation loop to our new AutoFix engine
        const { autoFixService } = await import('./auto-fix-service.js');
        // Pass diagramType as hint, no initial error
        const fixResult = await autoFixService.attemptAutoFix(response, diagramType, null);
        
        return fixResult.code;
    }

    /**
     * Internal method for the initial generation pass
     */
    async _generateInitialCode(prompt, contextCode, diagramType) {
        // 1. Get Schema/System Prompt for Semantic Parsing
        const systemPrompt = this.getJSONSystemPrompt(diagramType);
        
        // 2. Call LLM to get JSON AST
        const userMessage = `
Context Code:
\`\`\`
${contextCode || '(Empty)'}
\`\`\`

User Request: ${prompt}

Generate specific JSON AST. No markdown outside the JSON.
`;
        const jsonResponse = await this.callLLM(systemPrompt, userMessage);
        
        // 3. Parse JSON
        let ast;
        try {
            // Strip markdown block if present
            const cleanJson = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            ast = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Error", e);
            // Fallback: If AI fails to give JSON, maybe it gave code directly? 
            // For now, we strictly enforce JSON to avoid "hallucinated syntax". 
            // But we could retry demanding JSON.
            throw new Error("Failed to parse AI response. The AI did not return valid JSON.");
        }

        // 4. Validate AST (Basic check)
        if (!ast || !ast.nodes) {
             throw new Error("Invalid AST structure returned by AI.");
        }

        // 5. Compile to Target Syntax
        // Determine target syntax based on diagramType (mermaid, bpmn, plantuml, c4)
        // Note: 'c4' is usually PlantUML syntax in this app context
        const targetSyntax = (diagramType === 'c4') ? 'plantuml' : diagramType;
        
        try {
            return diagramCompiler.compile(ast, targetSyntax);
        } catch (e) {
             console.error("Compilation Error", e);
             throw new Error(`Failed to compile diagram: ${e.message}`);
        }
    }

    /**
     * Validate syntax using client-side parsers
     * @param {string} code 
     * @param {string} type 
     * @returns {Promise<{valid: boolean, error: string|null}>}
     */
    async validateSyntax(code, type) {
        if (!code || !code.trim()) return { valid: false, error: "Empty code" };

        try {
            if (type === 'mermaid') {
                const mermaid = await import('mermaid');
                // mermaid.parse throws on error
                // Initialize if needed (though usually done by app)
                // mermaid.initialize({ startOnLoad: false }); 
                
                try {
                    await mermaid.default.parse(code, { suppressErrors: false }); // .default for ES module interop

                    // Extra Heuristic for Timeline (Parse often misses 'section' syntax errors until render)
                    if (/^\s*timeline\b/m.test(code)) {
                        const timelineError = this.validateMermaidTimeline(code);
                        if (!timelineError.valid) return timelineError;
                    }

                    return { valid: true, error: null };
                } catch (e) {
                     // Mermaid.parse error. Ensure we return a string message.
                     return { valid: false, error: e.message || String(e) };
                }
            }

            if (type === 'bpmn') {
                const BpmnModdleModule = await import('bpmn-moddle');
                const BpmnModdle = BpmnModdleModule.default || BpmnModdleModule;
                const moddle = new BpmnModdle();
                
                // moddle.fromXML returns { rootElement, warnings }
                // It throws if XML is completely malformed
                try {
                    const { warnings } = await moddle.fromXML(code);
                    if (warnings && warnings.length > 0) {
                         // Some warnings are critical, some are not. 
                         return { valid: true, error: null };
                    }
                    return { valid: true, error: null };
                } catch (parseErr) {
                    return { valid: false, error: parseErr.message };
                }
            }

            if (type === 'plantuml' || type === 'c4') {
                // Use strict remote validation via Kroki
                return this.validateWithKroki(code, type);
            }
            
            // For Vega/Vega-Lite, try basic JSON parse
            if (type === 'vega' || type === 'vegalite') {
                try {
                    JSON.parse(code);
                    return { valid: true, error: null };
                } catch (e) {
                     return { valid: false, error: "Invalid JSON: " + e.message };
                }
            }

            return { valid: true, error: null };

        } catch (e) {
            // Mermaid parse error comes here
            return { valid: false, error: e.message || e.toString() };
        }
    }

    /**
     * Heuristic validator for Mermaid Timeline
     */
    validateMermaidTimeline(code) {
        if (!code) return { valid: false, error: "Empty code" };
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('section')) {
                // Check if section title contains a colon
                // Pattern: section Title That Has : A Colon
                if (line.includes(':')) {
                    return { 
                        valid: false, 
                        error: `Mermaid Timeline Syntax Error on line ${i+1}: Section titles cannot contain colons. Found: '${line}'. Please remove the colon.` 
                    };
                }
            }
        }
        return { valid: true, error: null };
    }

    /**
     * Validate using the Kroki service (acts as a remote parser)
     * This is used when no client-side parser is available (PlantUML, C4, etc.)
     */
    async validateWithKroki(code, type) {
        // The renderer already maps C4 to the right Kroki endpoint and sends long diagrams by POST
        const result = await rendererAdapter.validateSyntax(code, type);
        if (result.valid) return { valid: true, error: null };

        const message = result.error || 'Unknown error';
        if (/failed to fetch|networkerror|load failed/i.test(message)) {
            // Kroki could not be reached, so fall back to the local heuristic check
            console.warn("[AI] Kroki validation fetch failed:", message);
            return this.validatePlantUML(code);
        }

        const shortMessage = message.length > 300 ? `${message.slice(0, 300)}...` : message;
        return { valid: false, error: `Syntax Error (Kroki): ${shortMessage}` };
    }

    /**
     * Heuristic validator for PlantUML
     * Checks for structural correctness and common bad patterns
     */
    validatePlantUML(code) {
        const cleanCode = code.trim();
        
        // 1. Check for Start/End tags
        const startTag = cleanCode.match(/@start\w+/);
        const endTag = cleanCode.match(/@end\w+/);
        
        if (!startTag) return { valid: false, error: "Missing @startuml (or @startgantt, etc.) declaration." };
        if (!endTag) return { valid: false, error: "Missing @enduml (or @endgantt, etc.) termination." };
        
        // 2. Check for balanced braces {}
        // Simplistic check: count must be equal. (Ignores strings/comments for simplicity, but good enough for typical failure modes)
        const openBraces = (cleanCode.match(/\{/g) || []).length;
        const closeBraces = (cleanCode.match(/\}/g) || []).length;
        
        if (openBraces !== closeBraces) {
            return { valid: false, error: `Unbalanced braces: Found ${openBraces} '{' and ${closeBraces} '}'.` };
        }

        // 3. Gantt Specific checks (Common Failure Mode)
        if (cleanCode.includes('@startgantt')) {
            // Check for Invalid Alias syntax: [Task] as M1 (Should be [Task] as [M1])
            // Pattern looks for: [Something] as SomethingNotBracketed
            // We want to avoid flagging: [Task] as [M1] (Correct)
            const invalidAliasRegex = /\[[^\]]+\]\s+as\s+[a-zA-Z0-9_]+(?!\s*\[)/;
            const match = cleanCode.match(invalidAliasRegex);
            if (match) {
                return { valid: false, error: `Invalid Gantt Alias syntax near '${match[0]}'. Aliases must be in brackets, e.g., '[Task] as [T1]'.` };
            }

            // Check for invalid color syntax: is colored #Blue (should be is colored in #Blue)
            const invalidColor = /is\s+colored\s+#/i;
            if (invalidColor.test(cleanCode)) {
                return { valid: false, error: "Invalid color syntax. Use 'is colored in #Color'." };
            }
        }

        return { valid: true, error: null };
    }

    getJSONSystemPrompt(diagramType) {
        const schema = {
            meta: { 
                type: "diagram_type (e.g., sequence, flowchart, gantt)", 
                title: "string",
                direction: "TB or LR (optional)"
            },
            nodes: [
                { 
                    id: "string (alphanumeric_snake_case)", 
                    label: "string", 
                    type: "string (e.g., participant, task, class, milestone)",
                    section: "string (optional, for Gantt sections)",
                    style: {
                        startDate: "YYYY-MM-DD (for Gantt)",
                        duration: "number (days)",
                        color: "string (optional color code)"
                    }
                }
            ],
            edges: [
                {
                    sourceId: "node_id",
                    targetId: "node_id",
                    label: "string (optional)",
                    type: "string (connector type e.g., ->, -->)"
                }
            ]
        };

        return `
You are the Semantic Parsing Engine for a diagramming tool.
Your goal is to analyze the user request and generate a strict JSON Abstract Syntax Tree (AST).
You DO NOT generate diagram code directly. You generate JSON.

TARGET DIAGRAM TYPE: ${diagramType}

RULES:
1. Return ONLY valid JSON. No explanations.
2. Use alphanumeric IDs (snake_case) for nodes.
3. Map the user's logic into the schema provided below.

SCHEMA:
${JSON.stringify(schema, null, 2)}

SPECIFIC INSTRUCTIONS FOR ${diagramType.toUpperCase()}:
${this.getSpecificInstructions(diagramType)}
`;
    }

    getSpecificInstructions(type) {
        if (type === 'mermaid') return "For Flowcharts, use type='start/end/process/decision'. For Sequence, use type='participant/actor'. For Gantt/Timeline, use type='task/milestone' and fill 'section'. IMPORTANT: For Timeline, Do NOT use colons in section titles.";
        if (type === 'plantuml' || type === 'c4') return "For Gantt, use type='task' or 'milestone'. IMPORTANT: 'startDate' is required for tasks. Use 'style.duration' for length. For Sequence, use type='participant'.";
        return "";
    }

    /**
     * Chat with history awareness
     */
    async chat(message, history, contextCode, diagramType) {
         if (!this.hasApiKey()) {
            throw new Error('API Key is missing. Please configure it in settings.');
        }

        // Check if message is a regeneration request
        if (message === '__REGENERATE__') {
            const lastUserIndex = history.map(m => m.role).lastIndexOf('user');
            if (lastUserIndex === -1) {
                throw new Error('There is no earlier message to regenerate.');
            }
            // Re-send the last user message, and drop that message and every later turn from the history,
            // so the request holds the question once.
            message = history[lastUserIndex].content;
            history = history.slice(0, lastUserIndex);
        }

        // Error notices shown in the chat are not model turns
        history = history.filter(m => !m.isError);

        const systemPrompt = this.getSystemPrompt(diagramType);
        const userContent = `
Context:
Diagram Type: ${diagramType}
Current Code:
\`\`\`
${contextCode || '(Empty)'}
\`\`\`

User: ${message}
`;
        
        let responseText = await this.callLLM(systemPrompt, userContent, history);

        // --- VALIDATION LOOP FOR CHAT ---
        // If response contains code block, valid it.
        // We only validate if it looks like there is code.
        const block = extractCodeBlock(responseText);
        
        if (block) {
            let extractedCode = block.code;
            // The reply can be in a different language from the editor's current type
            const language = this.resolveLanguage(block, diagramType);
            let validation = await this.validateSyntax(extractedCode, language);
            
            // If invalid, try to fix (Self-Correction Loop)
            const MAX_CHAT_RETRIES = 1; // Keep it fast for chat
            let attempt = 0;
            
            while (!validation.valid && attempt < MAX_CHAT_RETRIES) {
                console.log(`[AI Chat] Auto-correcting syntax error: ${validation.error}`);
                
                try {
                     extractedCode = await this.fixDiagram(extractedCode, validation.error, language);
                     validation = await this.validateSyntax(extractedCode, language);
                     
                     if (validation.valid) {
                         // Replace the code block in the original text with the fixed code
                         const fixedBlock = `\`\`\`${language}\n${extractedCode}\n\`\`\``;
                         responseText = responseText.replace(block.raw, () => fixedBlock);
                     }
                } catch (e) {
                    console.error("[AI Chat] Auto-correction failed:", e);
                    break;
                }
                attempt++;
            }
            
            if (!validation.valid) {
                 // If still invalid, append a warning
                 responseText += `\n\n> ⚠️ **Warning**: The generated code may have syntax errors: ${validation.error}`;
            }
        }
        
        return responseText;
    }

    /**
     * Work out which language a fenced block is written in.
     * Order: the fence label, then strong signals in the code, then the editor's current type.
     */
    resolveLanguage(block, diagramType) {
        const labels = { mermaid: 'mermaid', plantuml: 'plantuml', puml: 'plantuml', bpmn: 'bpmn', vega: 'vega', vegalite: 'vegalite', 'vega-lite': 'vegalite' };
        const code = block.code;
        const isPlantUml = /@start[a-z]+/i.test(code);

        if (isPlantUml) return diagramType === 'c4' ? 'c4' : 'plantuml';
        if (labels[block.lang]) return labels[block.lang];
        if (code.startsWith('<?xml') || code.includes('<bpmn:definitions') || code.includes('<definitions')) return 'bpmn';
        if (LanguageDetector.isMermaidKeyword(LanguageDetector.getFirstSignificantLine(code))) return 'mermaid';
        return diagramType;
    }

    /**
     * Explain the current diagram
     */
    async explainDiagram(code, diagramType) {
        if (!this.hasApiKey()) {
            throw new Error('API Key is missing. Please configure it in settings.');
        }

        const systemPrompt = "You are a helpful expert software architect. Explain the provided diagram code in simple, clear terms suitable for a developer or business analyst.";
        const userMessage = `
Diagram Type: ${diagramType}
Code:
\`\`\`
${code}
\`\`\`

Please explain what this diagram represents.
`;
        return this.callLLM(systemPrompt, userMessage);
    }

     /**
     * Fix errors in the diagram
     */
    async fixDiagram(code, error, diagramType) {
        const result = await this.fixDiagramWithResult(code, error, diagramType);
        return result.code;
    }

    /**
     * Fix errors in the diagram and report the outcome.
     * @returns {Promise<{fixed: boolean, code: string, reason?: string, log: string[]}>}
     */
    async fixDiagramWithResult(code, error, diagramType) {
        const { autoFixService } = await import('./auto-fix-service.js');
        // We pass the existing error to the service to save a validation cycle if possible
        return autoFixService.attemptAutoFix(code, diagramType, error);
    }

    /**
     * Get specialized system prompt based on diagram type
     * Left for backward compatibility and for generic chat/explain tasks
     */
    getSystemPrompt(diagramType) {
        const base = "You are an expert software architect and diagramming assistant. Your goal is to generate valid, syntactically correct diagram code. If the user request is ambiguous (e.g., 'design a system'), first RECOMMEND the best diagram types to use. Explain why, then provide a list of options using the exact format: [SUGGESTIONS]: [\"Option A\", \"Option B\"]. Do not generate code immediately if the request is ambiguous.";
        
        const specifics = {
            mermaid: "You are a specific expert in Mermaid.js syntax. Ensure you use valid version 10+ syntax. Prefer 'flowchart TD' or 'sequenceDiagram'.",
            bpmn: "You are an expert in BPMN 2.0 XML. Ensure you generate valid XML with all required definitions, processes, and BPMNDiagram/BPMNPlane/BPMNShape tags if possible, though basic semantic XML is acceptable if auto-layout is applied later.",
            plantuml: `You are an expert in PlantUML. 
            For Generic/Sequence: Use @startuml/@enduml. 
            For Gantt: Use @startgantt/@endgantt.
            
            CRITICAL SYNTAX FOR GANTT:
            1. ALIASES: You MUST wrap aliases in brackets. 
               INCORRECT: [Task] as M1
               CORRECT:   [Task] as [M1]
            
            2. START DATE:
               INCORRECT: projectstart 2026-01-01
               CORRECT:   Project starts 2026-01-01
            
            3. COLORS:
               INCORRECT: [M1] is colored #Blue
               INCORRECT: M1 is colored in Blue
               CORRECT:   [M1] is colored in Blue
               CORRECT:   [M1] is colored in #0000FF
            
            4. DATES:
               CORRECT:   2026-01-01 to 2026-01-05 are colored in Red
            `,
            c4: "You are an expert in C4 Model using PlantUML C4-PlantUML library. Include !include <C4/C4_Container> etc.",
            vega: "You are an expert in Vega/Vega-Lite visualization grammar. Generate valid JSON.",
            default: ""
        };

        return `${base} ${specifics[diagramType] || specifics.default}`;
    }

    /**
     * Call the LLM Provider (currently hardcoded for Gemini)
     */
    async callLLM(systemInstructions, userContent, history = []) {
        const { apiKey, model, temperature } = this.settings;
        
        // Gemini API Endpoint. The key travels in a header, so the key stays out of the URL.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

        // Map internal roles to Gemini roles
        const contents = history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // Add current user message
        contents.push({
            role: 'user',
            parts: [{ text: userContent }]
        });

        const payload = {
            contents,
            generationConfig: {
                temperature: parseFloat(temperature),
                maxOutputTokens: 8192
            }
        };

        if (systemInstructions && systemInstructions.trim()) {
            payload.systemInstruction = { parts: [{ text: systemInstructions }] };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                 const blockReason = data.promptFeedback?.blockReason;
                 throw new Error(blockReason ? `The AI blocked the request (${blockReason}).` : 'No response generated from AI.');
            }

            const candidate = data.candidates[0];
            const text = (candidate.content?.parts || []).map(part => part.text || '').join('');

            if (candidate.finishReason === 'MAX_TOKENS') {
                throw new Error('The AI reply was cut off before the end because the reply reached the length limit. Ask for a smaller diagram, or ask for the change in smaller steps.');
            }
            if (!text) {
                throw new Error(`The AI returned no text (finish reason: ${candidate.finishReason || 'unknown'}).`);
            }

            return text;

        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    }
}

export const aiService = new AIService();
