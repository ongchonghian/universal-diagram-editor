/**
 * AI Service for communicating with LLM providers (Gemini, etc.)
 * Handles API keys, model configuration, and prompt generation.
 */
import { diagramCompiler } from './diagram-compiler.js';
import { rendererAdapter } from './RendererAdapter.js';
import { KROKI_BASE_URL } from '../config.js';


export class AIService {
    constructor() {
        this.STORAGE_KEY = 'universal_diagram_ai_settings';
        this.settings = this.loadSettings();
    }

    /**
     * Load settings from local storage or set defaults
     */
    loadSettings() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            provider: 'gemini',
            model: 'gemini-1.5-flash',
            apiKey: '',
            temperature: 0.7
        };
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
        const stored = localStorage.getItem('universal_diagram_ai_conversations');
        return stored ? JSON.parse(stored) : {};
    }

    saveConversations(conversations) {
        localStorage.setItem('universal_diagram_ai_conversations', JSON.stringify(conversations));
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
        // Map app types to Kroki types
        const krokiType = (type === 'c4') ? 'c4plantuml' : type;

        // Encode
        const encoded = rendererAdapter.encodeKroki(code);
        if (!encoded) return { valid: false, error: "Validation failed: Could not encode code." };

        const url = `${KROKI_BASE_URL}/${krokiType}/svg/${encoded}`;

        try {
            const response = await fetch(url);
            if (response.ok) {
                return { valid: true, error: null };
            } else {
                // Kroki returns 400 for syntax errors, usually with plain text explanation
                const text = await response.text();
                return { valid: false, error: `Syntax Error (Kroki): ${text.slice(0, 300)}...` }; // Truncate long HTML errors
            }
        } catch (e) {
            console.warn("[AI] Kroki validation fetch failed:", e);
            // If network fails (offline), we can't validate strictly.
            // Fallback to heuristic or assume valid to allow offline usage?
            // User likely online if using AI.
            // But let's fallback to heuristic for PlantUML just in case.
            if (type === 'plantuml' || type === 'c4') {
                return this.validatePlantUML(code);
            }
            return { valid: true, error: null, warning: "Validation skipped (Network error)" };
        }
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
        if (message === '__REGENERATE__' && history.length > 0) {
            // Find last user message
            const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
            if (lastUserMsg) {
                message = lastUserMsg.content;
                // Remove the last assistant response from history to avoid confusion
                if (history[history.length - 1].role === 'assistant') {
                    history.pop();
                }
            }
        }

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
        const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/;
        const match = responseText.match(codeBlockRegex);
        
        if (match) {
            let extractedCode = match[1].trim();
            // Try to validate
            let validation = await this.validateSyntax(extractedCode, diagramType);
            
            // If invalid, try to fix (Self-Correction Loop)
            const MAX_CHAT_RETRIES = 1; // Keep it fast for chat
            let attempt = 0;
            
            while (!validation.valid && attempt < MAX_CHAT_RETRIES) {
                console.log(`[AI Chat] Auto-correcting syntax error: ${validation.error}`);
                
                try {
                     extractedCode = await this.fixDiagram(extractedCode, validation.error, diagramType);
                     validation = await this.validateSyntax(extractedCode, diagramType);
                     
                     if (validation.valid) {
                         // Replace the code block in the original text with the fixed code
                         responseText = responseText.replace(match[0], `\`\`\`${diagramType}\n${extractedCode}\n\`\`\``);
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
        const { autoFixService } = await import('./auto-fix-service.js');
        // We pass the existing error to the service to save a validation cycle if possible
        const result = await autoFixService.attemptAutoFix(code, diagramType, error);
        return result.code;
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
        
        // Gemini API Endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Map internal roles to Gemini roles
        const contents = history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // Add current user message
        contents.push({
            role: 'user',
            parts: [{ text: systemInstructions + "\n\n" + userContent }]
        });

        const payload = {
            contents,
            generationConfig: {
                temperature: parseFloat(temperature),
                maxOutputTokens: 8192
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                 throw new Error('No response generated from AI.');
            }

            const text = data.candidates[0].content.parts[0].text;
            return text;

        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    }
}

export const aiService = new AIService();
