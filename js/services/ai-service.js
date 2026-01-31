/**
 * AI Service for communicating with LLM providers (Gemini, etc.)
 * Handles API keys, model configuration, and prompt generation.
 */
import { diagramCompiler } from './diagram-compiler.js';

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
     * @param {string} prompt - User instruction
     * @param {string} contextCode - Current code in editor
     * @param {string} diagramType - Type of diagram (mermaid, bpmn, etc.)
     */
    async generateDiagram(prompt, contextCode, diagramType) {
        if (!this.hasApiKey()) {
            throw new Error('API Key is missing. Please configure it in settings.');
        }

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
        if (type === 'mermaid') return "For Flowcharts, use type='start/end/process/decision'. For Sequence, use type='participant/actor'. For Gantt, use type='task/milestone' and fill 'section' and 'style.startDate'.";
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
        return this.callLLM(systemPrompt, userContent, history);
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
        if (!this.hasApiKey()) {
             throw new Error('API Key is missing. Please configure it in settings.');
        }
 
        const systemPrompt = "You are an expert at debugging diagram code. Fix the syntax error in the provided code. Return ONLY the fixed code.";
        const userMessage = `
 Diagram Type: ${diagramType}
 Error Message: ${error}
 Broken Code:
 \`\`\`
 ${code}
 \`\`\`
 
 Fix the code structure/syntax so it renders correctly.
 `;
         return this.callLLM(systemPrompt, userMessage);
     }

    /**
     * Get specialized system prompt based on diagram type
     * Left for backward compatibility and for generic chat/explain tasks
     */
    getSystemPrompt(diagramType) {
        const base = "You are an expert software architect and diagramming assistant. Your goal is to generate valid, syntactically correct diagram code.";
        
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
