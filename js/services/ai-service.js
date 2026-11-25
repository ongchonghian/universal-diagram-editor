/**
 * AI Service for communicating with LLM providers (Gemini, etc.)
 * Handles API keys, model configuration, and prompt generation.
 */
import { validateDiagram } from './diagram-tools/validate.js';
import { LanguageDetector } from './auto-fix/language-detector.js';
import { extractCodeBlock } from '../utils/code-extract.js';

export const DEFAULT_MODEL = 'gemini-3.8-flash';

// Model ids that Google has retired or shuts down on 1 December 2026.
// A stored setting that names one of these falls back to DEFAULT_MODEL, so existing users keep a working chat.
const RETIRED_MODELS = new Set([
    'gemini-pro',
    'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-001', 'gemini-1.5-pro-001',
    'gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-lite-001',
    'gemini-2.5-flash', 'gemini-2.5-pro'
]);

export class AIService {
    constructor() {
        this.STORAGE_KEY = 'universal_diagram_ai_settings';
        this.settings = this.loadSettings();
        this.usageTotals = { inputTokens: 0, outputTokens: 0, calls: 0 };
    }

    /**
     * Load settings from local storage or set defaults
     */
    loadSettings() {
        const defaults = {
            provider: 'gemini',
            model: DEFAULT_MODEL,
            apiKey: '',
            temperature: 0.7
        };
        const stored = this.readStoredJSON(this.STORAGE_KEY);
        const settings = stored ? { ...defaults, ...stored } : defaults;
        if (!settings.model || RETIRED_MODELS.has(settings.model)) {
            settings.model = DEFAULT_MODEL;
        }
        return settings;
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
     * Validate diagram code with the shared validator (js/services/diagram-tools/validate.js).
     * @returns {Promise<{valid: boolean, status: string, error: string|null, line: number|null}>}
     */
    async validateSyntax(code, type) {
        return validateDiagram(code, type);
    }

    /**
     * Chat with history awareness
     */
    /**
     * @param {object|null} trace  Optional object that chat() fills in for the evaluation set:
     *   { language, firstStatus, firstError, repairAttempts, finalStatus }
     */
    async chat(message, history, contextCode, diagramType, trace = null) {
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
            if (trace) {
                trace.language = language;
                trace.firstStatus = validation.status;
                trace.firstError = validation.error;
                trace.repairAttempts = 0;
            }

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
                if (trace) trace.repairAttempts = attempt;
            }

            if (!validation.valid) {
                 // If still invalid, append a warning
                 responseText += `\n\n> ⚠️ **Warning**: The generated code may have syntax errors: ${validation.error}`;
            } else if (validation.status === 'unverified') {
                 responseText += `\n\n> ℹ️ **Note**: ${validation.error}`;
            }
            if (trace) trace.finalStatus = validation.status;
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

            // Running token totals, read by the evaluation set to cost each case
            const usage = data.usageMetadata || {};
            this.usageTotals.inputTokens += usage.promptTokenCount || 0;
            this.usageTotals.outputTokens += (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0);
            this.usageTotals.calls += 1;

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
