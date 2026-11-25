import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./RendererAdapter.js', () => ({
    rendererAdapter: { render: vi.fn().mockResolvedValue({ svg: '<svg><rect/></svg>', error: null }) }
}));

import { AIService, DEFAULT_MODEL } from './ai-service.js';

const STORAGE_KEY = 'universal_diagram_ai_settings';
const SESSION_KEYS = 'universal_diagram_ai_keys';
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY));

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('AIService settings', () => {
    it('defaults to Gemini and the current model', () => {
        const service = new AIService();
        expect(service.getActiveConfig()).toMatchObject({ provider: 'gemini', model: DEFAULT_MODEL, apiKey: '' });
        expect(service.isConfigured()).toBe(false);
    });

    it.each(['gemini-1.5-flash', 'gemini-pro', 'gemini-2.5-flash'])('migrates old settings and replaces the retired model %s', (model) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider: 'gemini', model, apiKey: 'k', temperature: 0.3 }));
        const service = new AIService();
        expect(service.getActiveConfig()).toMatchObject({ provider: 'gemini', model: DEFAULT_MODEL, apiKey: 'k' });
        expect(service.getSettings()).toMatchObject({ temperature: 0.3, rememberKeys: true });
        // The old flat shape is rewritten in the new shape, with the saved key still remembered
        expect(stored().providers.gemini).toMatchObject({ model: DEFAULT_MODEL, apiKey: 'k' });
        expect(stored()).not.toHaveProperty('apiKey');
    });

    it('keeps a current or custom model', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ model: 'gemini-flash-latest' }));
        expect(new AIService().getActiveConfig().model).toBe('gemini-flash-latest');
    });

    it('ignores unreadable stored settings', () => {
        localStorage.setItem(STORAGE_KEY, '{not json');
        expect(new AIService().getActiveConfig().model).toBe(DEFAULT_MODEL);
    });

    it('keeps keys for the tab only unless the user chooses to remember them', () => {
        const service = new AIService();
        service.updateSettings({ provider: 'anthropic', providers: { anthropic: { apiKey: 'a-key', model: 'claude-haiku-5-5' } } });
        expect(stored().providers.anthropic).toEqual({ model: 'claude-haiku-5-5' });
        expect(JSON.parse(sessionStorage.getItem(SESSION_KEYS))).toEqual({ anthropic: 'a-key' });
        expect(new AIService().getActiveConfig()).toMatchObject({ provider: 'anthropic', apiKey: 'a-key' });

        service.updateSettings({ rememberKeys: true });
        expect(stored().providers.anthropic.apiKey).toBe('a-key');
        sessionStorage.clear();
        expect(new AIService().getActiveConfig().apiKey).toBe('a-key');
    });

    it('treats an OpenAI-compatible endpoint without a key as set up once it has an address and a model', () => {
        const service = new AIService();
        service.updateSettings({ provider: 'openai-compatible', providers: { 'openai-compatible': { baseUrl: 'http://localhost:11434/v1' } } });
        expect(service.missingSetting()).toMatch(/model/);
        service.updateSettings({ providers: { 'openai-compatible': { model: 'llama4' } } });
        expect(service.isConfigured()).toBe(true);
    });
});

describe('AIService.missingSetting', () => {
    it('says which setting is missing', () => {
        expect(new AIService().missingSetting()).toMatch(/Google Gemini API key/);
    });
});
