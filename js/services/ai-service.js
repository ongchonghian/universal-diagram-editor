/**
 * AI Service: Syntext Smith's settings, and the text-only chat path from before the tool loop.
 *
 * The chat panel and the Fix button use the tool loop in ./smith/. The text-only chat() and the
 * auto-fix service stay as the "chat" path of the evaluation set, so the tool loop can be measured
 * against the Phase 1 baseline. They are deleted once the loop passes that comparison.
 * Model calls go through the provider-neutral layer in ./llm/.
 */
import { validateDiagram } from './diagram-tools/validate.js';
import { LanguageDetector } from './auto-fix/language-detector.js';
import { extractCodeBlock } from '../utils/code-extract.js';
import { PROVIDERS, PROVIDER_IDS, streamTurn, missingSetting, textMessage, LLMError } from './llm/index.js';

export const DEFAULT_PROVIDER = 'gemini';
export const DEFAULT_MODEL = PROVIDERS.gemini.defaultModel;

// Model ids that Google has retired or shuts down on 1 December 2026.
// A stored setting that names one of these falls back to DEFAULT_MODEL, so existing users keep a working chat.
const RETIRED_MODELS = new Set([
    'gemini-pro',
    'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-001', 'gemini-1.5-pro-001',
    'gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-lite-001',
    'gemini-2.5-flash', 'gemini-2.5-pro'
]);

const SETTINGS_KEY = 'universal_diagram_ai_settings';
// Keys for this browser tab only. sessionStorage clears when the tab closes.
const SESSION_KEYS_KEY = 'universal_diagram_ai_keys';

const defaultProviders = () => Object.fromEntries(PROVIDER_IDS.map(id => [id, {
    model: PROVIDERS[id].defaultModel,
    apiKey: '',
    ...(PROVIDERS[id].needsBaseUrl ? { baseUrl: '' } : {})
}]));

/**
 * Settings shape:
 *   { provider, temperature, rememberKeys, providers: { [id]: { model, apiKey, baseUrl? } } }
 * API keys are kept in sessionStorage, and in localStorage only when rememberKeys is true.
 */
export class AIService {
    constructor() {
        this.STORAGE_KEY = SETTINGS_KEY;
        this.settings = this.loadSettings();
        this.usageTotals = { inputTokens: 0, outputTokens: 0, calls: 0 };
    }

    loadSettings() {
        const stored = this.readStoredJSON(SETTINGS_KEY, localStorage);
        const sessionKeys = this.readStoredJSON(SESSION_KEYS_KEY, sessionStorage) || {};
        const settings = { provider: DEFAULT_PROVIDER, temperature: 0.7, rememberKeys: false, providers: defaultProviders() };

        if (stored && !stored.providers) {
            // Settings saved before November 2026: Gemini only, with the key in localStorage.
            // A user who saved a key keeps the key remembered, as before.
            settings.temperature = stored.temperature ?? settings.temperature;
            settings.providers.gemini.model = stored.model || DEFAULT_MODEL;
            settings.providers.gemini.apiKey = stored.apiKey || '';
            settings.rememberKeys = !!stored.apiKey;
        } else if (stored) {
            settings.provider = PROVIDERS[stored.provider] ? stored.provider : DEFAULT_PROVIDER;
            settings.temperature = stored.temperature ?? settings.temperature;
            settings.rememberKeys = !!stored.rememberKeys;
            for (const id of PROVIDER_IDS) settings.providers[id] = { ...settings.providers[id], ...(stored.providers[id] || {}) };
        }

        for (const id of PROVIDER_IDS) {
            if (sessionKeys[id]) settings.providers[id].apiKey = sessionKeys[id];
        }
        const gemini = settings.providers.gemini;
        if (!gemini.model || RETIRED_MODELS.has(gemini.model)) gemini.model = DEFAULT_MODEL;

        if (stored && !stored.providers) this.persist(settings);
        return settings;
    }

    /**
     * Read a JSON value from browser storage.
     * Returns null when the entry is missing or holds invalid JSON, so a corrupt entry cannot stop the app from loading.
     */
    readStoredJSON(key, storage = localStorage) {
        try {
            const stored = storage.getItem(key);
            const parsed = stored ? JSON.parse(stored) : null;
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (e) {
            console.warn(`[AI] Ignoring unreadable stored value for ${key}`, e);
            return null;
        }
    }

    /** Write settings: keys go to sessionStorage always, and to localStorage only when remembered. */
    persist(settings) {
        const keys = Object.fromEntries(PROVIDER_IDS.map(id => [id, settings.providers[id].apiKey || '']).filter(([, k]) => k));
        const providers = Object.fromEntries(PROVIDER_IDS.map(id => {
            const { apiKey, ...rest } = settings.providers[id];
            return [id, settings.rememberKeys ? { ...rest, apiKey } : rest];
        }));
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, providers }));
            sessionStorage.setItem(SESSION_KEYS_KEY, JSON.stringify(keys));
        } catch (e) {
            console.warn('[AI] Could not save settings', e);
        }
    }

    /**
     * Save settings. Accepts any top-level fields, and per-provider fields under `providers`.
     */
    updateSettings(newSettings) {
        const providers = { ...this.settings.providers };
        for (const [id, values] of Object.entries(newSettings.providers || {})) {
            if (PROVIDERS[id]) providers[id] = { ...providers[id], ...values };
        }
        this.settings = { ...this.settings, ...newSettings, providers };
        this.persist(this.settings);
        return this.getSettings();
    }

    /** A copy of every setting, including each provider's own fields. */
    getSettings() {
        return { ...this.settings, providers: Object.fromEntries(PROVIDER_IDS.map(id => [id, { ...this.settings.providers[id] }])) };
    }

    /** The config the model layer needs for the chosen provider: { provider, model, apiKey, baseUrl? }. */
    getActiveConfig() {
        return { provider: this.settings.provider, ...this.settings.providers[this.settings.provider] };
    }

    /** A sentence naming the missing setting, or null when Smith is ready to call the model. */
    missingSetting() {
        return missingSetting(this.getActiveConfig());
    }

    isConfigured() {
        return !this.missingSetting();
    }


    /**
     * Validate diagram code with the shared validator (js/services/diagram-tools/validate.js).
     * @returns {Promise<{valid: boolean, status: string, error: string|null, line: number|null}>}
     */
    async validateSyntax(code, type) {
        return validateDiagram(code, type);
    }

    /**
     * Chat with history awareness.
     * @param {object} options
     *   trace     an object that chat() fills in for the evaluation set:
     *             { language, firstStatus, firstError, repairAttempts, finalStatus }
     *   onText    called with the reply so far, each time more text streams in
     *   onStatus  called with 'checking' or 'repairing' while the code block is validated
     *   signal    an AbortSignal; aborting stops the reply and throws an AbortError
     */
    async chat(message, history, contextCode, diagramType, { trace = null, onText, onStatus, signal } = {}) {
        const missing = this.missingSetting();
        if (missing) {
            throw new LLMError(missing, { provider: this.settings.provider, code: 'NOT_CONFIGURED' });
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

        // Error notices and stopped replies shown in the chat are not model turns
        history = history.filter(m => !m.isError && !m.isStopped);

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
        
        let responseText = await this.callLLM(systemPrompt, userContent, history, { onText, signal });

        // --- VALIDATION LOOP FOR CHAT ---
        // If response contains code block, valid it.
        // We only validate if it looks like there is code.
        const block = extractCodeBlock(responseText);

        if (block) {
            let extractedCode = block.code;
            // The reply can be in a different language from the editor's current type
            const language = this.resolveLanguage(block, diagramType);
            onStatus?.('checking');
            let validation = await this.validateSyntax(extractedCode, language);
            signal?.throwIfAborted();
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
                
                onStatus?.('repairing');
                try {
                     extractedCode = await this.fixDiagram(extractedCode, validation.error, language);
                     // The repair itself runs to the end; a Stop during the repair discards its result
                     signal?.throwIfAborted();
                     validation = await this.validateSyntax(extractedCode, language);

                     if (validation.valid) {
                         // Replace the code block in the original text with the fixed code
                         const fixedBlock = `\`\`\`${language}\n${extractedCode}\n\`\`\``;
                         responseText = responseText.replace(block.raw, () => fixedBlock);
                     }
                } catch (e) {
                    if (e?.name === 'AbortError') throw e;
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
     * Send one text turn to the chosen provider and return the whole reply text.
     * @param {object} options  { onText(textSoFar), signal }
     */
    async callLLM(systemInstructions, userContent, history = [], { onText, signal } = {}) {
        const messages = [...history.map(msg => textMessage(msg.role === 'assistant' ? 'assistant' : 'user', msg.content)), textMessage('user', userContent)];
        let text = '';
        let done = null;
        try {
            for await (const event of streamTurn(this.getActiveConfig(), {
                system: systemInstructions,
                messages,
                temperature: Number(this.settings.temperature),
                signal
            })) {
                if (event.type === 'text') {
                    text += event.text;
                    onText?.(text);
                } else if (event.type === 'done') {
                    done = event;
                }
            }
        } catch (error) {
            if (error?.name !== 'AbortError') console.error('AI Service Error:', error);
            throw error;
        }

        // Running token totals, read by the evaluation set to cost each case
        if (done) {
            this.usageTotals.inputTokens += done.usage.inputTokens;
            this.usageTotals.outputTokens += done.usage.outputTokens;
        }
        this.usageTotals.calls += 1;

        if (done?.stopReason === 'max_tokens') {
            throw new Error('The AI reply was cut off before the end because the reply reached the length limit. Ask for a smaller diagram, or ask for the change in smaller steps.');
        }
        if (done?.stopReason === 'blocked') {
            throw new Error(`The AI declined to answer (${done.finishReason || 'blocked'}). Try rewording the request.`);
        }
        if (!text) {
            throw new Error(`The AI returned no text (finish reason: ${done?.finishReason || 'unknown'}).`);
        }
        return text;
    }
}

export const aiService = new AIService();
