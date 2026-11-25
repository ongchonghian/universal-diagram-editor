/**
 * AI Service: Syntext Smith's settings and running token totals.
 *
 * The chat panel and the Fix button call the model through the tool loop in ./smith/, which uses
 * the provider-neutral layer in ./llm/.
 */
import { PROVIDERS, PROVIDER_IDS, missingSetting } from './llm/index.js';

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
        // Running token totals across Smith's turns, read by the evaluation set to cost each case
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
}

export const aiService = new AIService();
