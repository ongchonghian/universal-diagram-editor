import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./RendererAdapter.js', () => ({
    rendererAdapter: { render: vi.fn().mockResolvedValue({ svg: '<svg><rect/></svg>', error: null }) }
}));

import { AIService, DEFAULT_MODEL } from './ai-service.js';
import { streamResponse, sse, mockFetch } from './llm/test-helpers.js';
import { outputLimits } from './llm/providers/gemini.js';

const STORAGE_KEY = 'universal_diagram_ai_settings';
const SESSION_KEYS = 'universal_diagram_ai_keys';
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY));

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // A known output limit, so each test needs only its stream response
    outputLimits.set(DEFAULT_MODEL, 65536);
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

describe('AIService.chat', () => {
    it('records the first validation result and the language for the evaluation set', async () => {
        const service = new AIService();
        service.updateSettings({ providers: { gemini: { apiKey: 'test-key' } } });
        service.callLLM = vi.fn().mockResolvedValue('Here you go:\n```mermaid\nflowchart TD\n  A --> B\n```');
        const trace = {};
        const reply = await service.chat('Draw A to B', [], '', 'mermaid', { trace });
        expect(trace).toMatchObject({ language: 'mermaid', firstStatus: 'valid', repairAttempts: 0, finalStatus: 'valid' });
        expect(reply).not.toMatch(/Warning/);
    });

    it('streams the reply through the chosen provider and counts tokens', async () => {
        const service = new AIService();
        service.updateSettings({ providers: { gemini: { apiKey: 'test-key' } } });
        mockFetch(streamResponse([sse([
            { candidates: [{ content: { parts: [{ text: 'Hello ' }] } }] },
            { candidates: [{ content: { parts: [{ text: 'there.' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4 } }
        ])]));
        const seen = [];
        const reply = await service.chat('Hi', [], '', 'mermaid', { onText: (t) => seen.push(t) });
        expect(reply).toBe('Hello there.');
        expect(seen).toEqual(['Hello ', 'Hello there.']);
        expect(service.usageTotals).toEqual({ inputTokens: 10, outputTokens: 4, calls: 1 });
    });

    it('stops with an AbortError when the signal aborts', async () => {
        const service = new AIService();
        service.updateSettings({ providers: { gemini: { apiKey: 'test-key' } } });
        const controller = new AbortController();
        controller.abort();
        vi.stubGlobal('fetch', vi.fn((url, init) => init.signal.aborted
            ? Promise.reject(new DOMException('Aborted', 'AbortError'))
            : Promise.resolve(streamResponse([]))));
        await expect(service.chat('Hi', [], '', 'mermaid', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('says which setting is missing', async () => {
        await expect(new AIService().chat('Hi', [], '', 'mermaid')).rejects.toMatchObject({ code: 'NOT_CONFIGURED', message: expect.stringContaining('Google Gemini API key') });
    });
});
