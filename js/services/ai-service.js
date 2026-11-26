/**
 * AI Service for communicating with LLM providers (Gemini, etc.)
 * Handles API keys, model configuration, and prompt generation.
 */
import { diagramCompiler } from './diagram-compiler.js';
import { rendererAdapter } from './RendererAdapter.js';
import { KROKI_BASE_URL } from '../config.js';
import { fileProcessor } from '../utils/file-processor.js';
import { bpmnCompiler } from './bpmn-compiler.js';
import { BpmnEditingService } from './bpmn-editor-service.js';
import { applyBpmnAutoLayout } from '../utils.js';


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
            try {
                const parsed = JSON.parse(stored);
                // Auto-migrate retired models
                if (parsed && parsed.model === 'gemini-3-pro-preview') {
                    parsed.model = 'gemini-3.1-pro-preview';
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(parsed));
                }
                return parsed;
            } catch (e) {
                console.error("Failed to parse stored AI settings", e);
            }
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

        if (diagramType === 'bpmn') {
            if (!contextCode) {
                const code = await this._generateInitialCode(prompt, '', 'bpmn');
                return code;
            }
            return await this._editBpmnAst(contextCode, prompt);
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
            throw new Error("Failed to parse AI response. The AI did not return valid JSON.");
        }

        // 4. Validate AST (Basic check)
        if (diagramType === 'bpmn') {
            if (!ast || (!ast.process && !Array.isArray(ast))) {
                throw new Error("Invalid BPMN AST structure returned by AI.");
            }
        } else {
            if (!ast || !ast.nodes) {
                 throw new Error("Invalid AST structure returned by AI.");
            }
        }

        // 5. Compile to Target Syntax
        const targetSyntax = (diagramType === 'c4') ? 'plantuml' : diagramType;
        
        try {
            const compiled = diagramCompiler.compile(ast, targetSyntax);
            if (diagramType === 'bpmn') {
                return await applyBpmnAutoLayout(compiled);
            }
            return compiled;
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
                const BpmnModdle = BpmnModdleModule.default || BpmnModdleModule.BpmnModdle || BpmnModdleModule;
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

    getBpmnJSONSystemPrompt() {
        return `
You are the Semantic Parsing Engine for BPMN process diagrams.
Your goal is to analyze the user request and generate a strict JSON Abstract Syntax Tree (AST) representing the process workflow.

STRICT RULES:
1. Return ONLY valid JSON inside a \`\`\`json code block. No explanation outside the code block.
2. Every element MUST have a unique "id" (alphanumeric, snake_case) and a "type".
3. The root object must contain a "process" array of elements.

SUPPORTED ELEMENTS:
- Tasks: "task", "userTask", "serviceTask", "sendTask", "receiveTask", "businessRuleTask", "manualTask", "scriptTask".
  Tasks must have a "label" (short description, 2-4 words).
- Events: "startEvent", "endEvent", "intermediateThrowEvent", "intermediateCatchEvent".
  Events can optionally have "eventDefinition" set to "timerEventDefinition" or "messageEventDefinition".
- Gateways:
  - "exclusiveGateway": Branching paths where only one condition is met.
    Attributes:
      - "label": Gateway question (e.g., "Is approved?")
      - "has_join": boolean (indicates if the branches merge back together later)
      - "branches": Array of objects:
        * "condition": string (condition to follow this path)
        * "path": Array of elements inside this branch
        * "next": (Optional) string target ID if jumping back to a previous task
  - "inclusiveGateway": Multiple branches executed in parallel if conditions are met.
    Attributes:
      - "label": description
      - "has_join": boolean
      - "branches": Array of objects (similar to exclusiveGateway). One branch can have "is_default": true (no "condition" attribute).
  - "parallelGateway": Branching paths executed in parallel (no conditions).
    Attributes:
      - "branches": Array of arrays, where each sub-array holds the sequence of elements for that branch.

CONSTRAINTS:
1. The top-level process MUST contain exactly one startEvent and at least one endEvent.
2. Parallel gateways must have a corresponding join gateway (automatically handled by setting has_join or merging at the end of the branch).
3. Do not include layout information or coordinates.

EXAMPLE:
\`\`\`json
{
  "process": [
    { "type": "startEvent", "id": "start" },
    { "type": "userTask", "id": "review", "label": "Review order" },
    {
      "type": "exclusiveGateway",
      "id": "check_stock",
      "label": "In stock?",
      "has_join": true,
      "branches": [
        {
          "condition": "Yes",
          "path": [
            { "type": "serviceTask", "id": "ship", "label": "Ship items" }
          ]
        },
        {
          "condition": "No",
          "path": [
            { "type": "sendTask", "id": "notify", "label": "Email customer" }
          ]
        }
      ]
    },
    { "type": "endEvent", "id": "end" }
  ]
}
\`\`\`
`;
    }

    getJSONSystemPrompt(diagramType) {
        if (diagramType === 'bpmn') {
            return this.getBpmnJSONSystemPrompt();
        }

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
     * Chat with history awareness and file context
     */
    async chat(message, history, contextCode, diagramType) {
         if (!this.hasApiKey()) {
            throw new Error('API Key is missing. Please configure it in settings.');
        }

        // BPMN edit hook
        if (diagramType === 'bpmn' && contextCode) {
            try {
                const updatedXml = await this._editBpmnAst(contextCode, message);
                const systemPrompt = `You are explaining the changes made to the BPMN diagram.
The process was edited successfully. Here is the updated XML code:
\`\`\`bpmn
${updatedXml}
\`\`\`
Explain the changes concisely to the user, and make sure to include the exact XML code block above in your response.`;
                const userContent = `User requested edit: ${message}. Explain what changed.`;
                let responseText = await this.callLLM(systemPrompt, userContent, history);
                return responseText;
            } catch (e) {
                console.error("BPMN AST Edit loop failed, falling back", e);
            }
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

        if (diagramType === 'bpmn') {
            responseText = await this._compileBpmnResponse(responseText);
        }

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
     * Chat with file context awareness
     * @param {string} message - User message
     * @param {Array} history - Chat history
     * @param {string} contextCode - Current code context (including file content)
     * @param {string} diagramType - Diagram type
     * @param {Array} files - Array of processed files [{filename, type, text, size}]
     */
    async chatWithFiles(message, history, contextCode, diagramType, files = []) {
        if (!this.hasApiKey()) {
            throw new Error('API Key is missing. Please configure it in settings.');
        }

        // BPMN edit hook
        if (diagramType === 'bpmn' && contextCode) {
            try {
                const updatedXml = await this._editBpmnAst(contextCode, message);
                const systemPrompt = `You are explaining the changes made to the BPMN diagram.
The process was edited successfully. Here is the updated XML code:
\`\`\`bpmn
${updatedXml}
\`\`\`
Explain the changes concisely to the user, and make sure to include the exact XML code block above in your response.`;
                const userContent = `User requested edit: ${message}. Explain what changed.`;
                let responseText = await this.callLLM(systemPrompt, userContent, history, files);
                return responseText;
            } catch (e) {
                console.error("BPMN AST Edit loop failed, falling back", e);
            }
        }

        // Check if message is a regeneration request
        if (message === '__REGENERATE__' && history.length > 0) {
            const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
            if (lastUserMsg) {
                message = lastUserMsg.content;
                if (history[history.length - 1].role === 'assistant') {
                    history.pop();
                }
            }
        }

        // Enhanced system prompt for file processing
        const systemPrompt = this.getFileAwareSystemPrompt(diagramType, files);
        
        const userContent = `
Context:
Diagram Type: ${diagramType}
${files.length > 0 ? `Uploaded Files: ${files.map(f => f.filename).join(', ')}` : 'No files uploaded'}
Current Code Context:
\`\`\`
${contextCode || '(Empty)'}
\`\`\`

User: ${message}
`;
        
        // Pass files to callLLM to handle base64 images
        let responseText = await this.callLLM(systemPrompt, userContent, history, files);

        if (diagramType === 'bpmn') {
            responseText = await this._compileBpmnResponse(responseText);
        }

        // Apply validation and auto-fix
        const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/;
        const match = responseText.match(codeBlockRegex);
        
        if (match) {
            let extractedCode = match[1].trim();
            let validation = await this.validateSyntax(extractedCode, diagramType);
            
            const MAX_CHAT_RETRIES = 1;
            let attempt = 0;
            
            while (!validation.valid && attempt < MAX_CHAT_RETRIES) {
                console.log(`[AI Chat with Files] Auto-correcting syntax error: ${validation.error}`);
                
                try {
                     extractedCode = await this.fixDiagram(extractedCode, validation.error, diagramType);
                     validation = await this.validateSyntax(extractedCode, diagramType);
                     
                     if (validation.valid) {
                         responseText = responseText.replace(match[0], `\`\`\`${diagramType}\n${extractedCode}\n\`\`\``);
                     }
                } catch (e) {
                    console.error("[AI Chat with Files] Auto-correction failed:", e);
                    break;
                }
                attempt++;
            }
            
            if (!validation.valid) {
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
            bpmn: `You are an expert in Business Process Model and Notation (BPMN) process flows.
            
            STRICT RULES:
            1. You DO NOT generate BPMN XML directly. You generate a JSON process tree representation inside a \`\`\`json code block.
            2. Follow the schema:
               {
                 "process": [
                   { "type": "startEvent", "id": "start1" },
                   { "type": "userTask", "id": "task1", "label": "Short Action Description" },
                   ...
                 ]
               }
            3. Supported element types:
               - Tasks: "task", "userTask", "serviceTask", "sendTask", "receiveTask", "businessRuleTask", "manualTask", "scriptTask" (must have a "label")
               - Events: "startEvent", "endEvent", "intermediateThrowEvent", "intermediateCatchEvent" (optional "eventDefinition": "timerEventDefinition" | "messageEventDefinition")
               - Gateways: "exclusiveGateway", "inclusiveGateway", "parallelGateway" (gateways contain a "branches" list of path elements).
            
            Always output only valid JSON AST. The system will compile it and handle layout coordinates automatically.`,
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
     * Get file-aware system prompt for enhanced context processing
     * @param {string} diagramType 
     * @param {Array} files 
     * @returns {string}
     */
    getFileAwareSystemPrompt(diagramType, files = []) {
        let basePrompt = this.getSystemPrompt(diagramType);
        
        if (files.length > 0) {
            const hasImages = files.some(f => f.type.startsWith('image/') || f.isBase64);

            basePrompt += `\n\nFILE PROCESSING INSTRUCTIONS:\n`;
            basePrompt += `The user has uploaded ${files.length} file(s). You have access to their content (text or visual data).\n\n`;

            basePrompt += `YOUR TASKS:\n`;
            if (hasImages) {
                basePrompt += `1. Carefully analyze both the visual structure and any text content within the uploaded images.\n`;
                basePrompt += `2. Identify what the image represents (e.g., a whiteboard sketch, a mind map, a software architecture diagram, a UI wireframe, a data table, a flowchart, or raw notes).\n`;
                basePrompt += `3. Extract key entities, relationships, hierarchies, visual groupings, sequence flows, and textual labels from the images.\n`;
                basePrompt += `4. Faithfully translate the visual semantics into the appropriate structural components of the target diagram.\n`;
            } else {
                basePrompt += `1. Carefully analyze the file content to understand the subject matter.\n`;
                basePrompt += `2. Extract key concepts, entities, processes, or relationships from the text.\n`;
            }

            basePrompt += `5. Based on the user's request and the extracted information, create an appropriate ${diagramType || 'diagram'}.\n`;
            basePrompt += `6. Reference specific parts of the files or images when relevant in your explanation.\n`;
            basePrompt += `7. If the content is extensive, complex, or messy, logically organize it into the requested diagram format, focusing on the most relevant structural information.\n\n`;

            basePrompt += `FILES UPLOADED:\n`;
            basePrompt += `${files.map((f, i) => `${i+1}. ${f.filename} (${f.type.toUpperCase()}, ${fileProcessor.formatFileSize(f.size)})`).join('\n')}\n\n`;
            
            basePrompt += `REMEMBER: You're generating a diagram that represents insights from the provided files. The content could be anything from raw notes to detailed wireframes. Consider the best way to model this visually:\n`;
            basePrompt += `- Process flow diagrams (for procedures, state changes, or user journeys)\n`;
            basePrompt += `- Architecture diagrams (for system designs or infrastructure)\n`;
            basePrompt += `- Mind maps or concept maps (for hierarchical data or brainstorming)\n`;
            basePrompt += `- Entity-relationship diagrams (for database or domain modeling)\n`;
            basePrompt += `- Gantt charts or timelines (for project schedules or sequential events)\n\n`;
            
            basePrompt += `Please analyze the content thoroughly first, then suggest the best diagram approach if the user's request is open-ended, and provide a complete, well-structured diagram code solution.\n`;
        }
        
        return basePrompt;
    }

    /**
     * Check if the currently selected model supports multimodal inputs (images)
     * @param {string} modelName 
     * @returns {boolean}
     */
    isModelMultimodal(modelName) {
        // Models that DO NOT support images
        const textOnlyModels = ['gemini-pro', 'gemini']; 
        return !textOnlyModels.includes(modelName);
    }

    /**
     * Call the LLM Provider (currently hardcoded for Gemini)
     */
    async callLLM(systemInstructions, userContent, history = [], files = []) {
        const { apiKey, model, temperature } = this.settings;
        
        // Gemini API Endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Map internal roles to Gemini roles
        const contents = history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }] // Need to enhance this if history contains images later
        }));

        // Build the current message parts
        const currentParts = [];
        
        // Add text part
        currentParts.push({ text: systemInstructions + "\n\n" + userContent });

        // Add file parts (for Base64 images)
        if (files && files.length > 0) {
            files.forEach(file => {
                if (file.isBase64 && file.text.startsWith('data:')) {
                    // Extract mime type and base64 data using a more robust regex
                    const match = file.text.match(/^data:(image\/[^;]+);base64,(.+)$/);
                    if (match && match.length === 3) {
                        currentParts.push({
                            inline_data: {
                                mime_type: match[1],
                                data: match[2]
                            }
                        });
                    } else {
                        console.warn('Failed to parse base64 image data payload for Gemini API');
                    }
                }
            });
        }

        // Add current user message
        contents.push({
            role: 'user',
            parts: currentParts
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

    async _compileBpmnResponse(responseText) {
        const jsonBlockRegex = /```json\n([\s\S]*?)```/;
        const jsonMatch = responseText.match(jsonBlockRegex);
        if (jsonMatch) {
            try {
                const cleanJson = jsonMatch[1].trim();
                const ast = JSON.parse(cleanJson);
                if (ast && (ast.process || Array.isArray(ast))) {
                    const xml = bpmnCompiler.compile(ast);
                    const layoutedXml = await applyBpmnAutoLayout(xml);
                    responseText = responseText.replace(jsonMatch[0], `\`\`\`bpmn\n${layoutedXml}\n\`\`\``);
                }
            } catch (e) {
                console.error("[BPMN Compilation Error in Chat]", e);
                responseText += `\n\n> ⚠️ **Error compiling BPMN JSON**: ${e.message}`;
            }
        }
        return responseText;
    }

    async _editBpmnAst(contextXml, changeRequest) {
        let astProcess;
        try {
            astProcess = bpmnCompiler.decompile(contextXml);
        } catch (e) {
            console.warn("Failed to decompile current BPMN XML, creating fresh diagram", e);
            return await this._generateInitialCode(changeRequest, '', 'bpmn');
        }
        
        const editorService = new BpmnEditingService(astProcess);
        let currentProcess = astProcess;
        
        const maxIterations = 10;
        let lastError = null;
        
        const systemPrompt = `
You are the BPMN Diagram Editing Engineer.
Your goal is to modify the existing process tree according to the user's change request.

You MUST call one function at a time. Do NOT execute multiple changes at once.
Respond with a single JSON object containing "function" and "arguments" keys. No other text.

SUPPORTED FUNCTIONS:
- {"function": "delete_element", "arguments": {"element_id": "string"}}
- {"function": "redirect_branch", "arguments": {"branch_condition": "string", "next_id": "string"}}
- {"function": "add_element", "arguments": {"element": {...}, "before_id": "string" (optional), "after_id": "string" (optional)}}
- {"function": "move_element", "arguments": {"element_id": "string", "before_id": "string" (optional), "after_id": "string" (optional)}}
- {"function": "update_element", "arguments": {"new_element": {...}}}

If the change request is fully satisfied and no more edits are needed, respond with:
{"stop": true}
`;

        let currentChangeRequest = changeRequest;
        
        for (let iter = 0; iter < maxIterations; iter++) {
            let userPrompt = `
Current Process AST:
\`\`\`json
${JSON.stringify(currentProcess, null, 2)}
\`\`\`

Change Request: ${currentChangeRequest}
`;
            if (lastError) {
                userPrompt += `\n\nERROR FROM PREVIOUS ATTEMPT:\n${lastError.message}\nPlease correct this and propose a valid function call.`;
            }
            
            const response = await this.callLLM(systemPrompt, userPrompt);
            let proposal;
            try {
                const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
                proposal = JSON.parse(cleanJson);
            } catch (e) {
                lastError = new Error("Your response was not valid JSON. Please reply ONLY with the proposed JSON object.");
                continue;
            }
            
            if (proposal.stop) {
                console.log(`[BPMN Edit Loop] Stopped at iteration ${iter}.`);
                break;
            }
            
            try {
                editorService.validateEditProposal(proposal, iter === 0);
                const updated = editorService.updateProcess(currentProcess, proposal);
                bpmnCompiler.validate(updated);
                currentProcess = updated;
                lastError = null;
            } catch (e) {
                console.warn(`[BPMN Edit Loop] Validation error in iteration ${iter}:`, e);
                lastError = e;
            }
        }
        
        const xml = bpmnCompiler.compile(currentProcess);
        const layoutedXml = await applyBpmnAutoLayout(xml);
        return layoutedXml;
    }
}

export const aiService = new AIService();
