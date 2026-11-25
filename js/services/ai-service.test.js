import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./RendererAdapter.js', () => ({
    rendererAdapter: { render: vi.fn().mockResolvedValue({ svg: '<svg><rect/></svg>', error: null }) }
}));

import { AIService, DEFAULT_MODEL } from './ai-service.js';

const STORAGE_KEY = 'universal_diagram_ai_settings';

beforeEach(() => localStorage.clear());

describe('AIService settings', () => {
    it('defaults to the current model', () => {
        expect(new AIService().getSettings().model).toBe(DEFAULT_MODEL);
    });

    it.each(['gemini-1.5-flash', 'gemini-pro', 'gemini-2.5-flash'])('replaces the retired model %s with the default', (model) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ model, apiKey: 'k' }));
        const settings = new AIService().getSettings();
        expect(settings.model).toBe(DEFAULT_MODEL);
        expect(settings.apiKey).toBe('k');
    });

    it('keeps a current or custom model', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ model: 'gemini-flash-latest' }));
        expect(new AIService().getSettings().model).toBe('gemini-flash-latest');
    });

    it('ignores unreadable stored settings', () => {
        localStorage.setItem(STORAGE_KEY, '{not json');
        expect(new AIService().getSettings().model).toBe(DEFAULT_MODEL);
    });
});

describe('AIService.chat validation trace', () => {
    it('records the first validation result and the language for the evaluation set', async () => {
        const service = new AIService();
        service.settings.apiKey = 'test-key';
        service.callLLM = vi.fn().mockResolvedValue('Here you go:\n```mermaid\nflowchart TD\n  A --> B\n```');
        const trace = {};
        const reply = await service.chat('Draw A to B', [], '', 'mermaid', trace);
        expect(trace).toMatchObject({ language: 'mermaid', firstStatus: 'valid', repairAttempts: 0, finalStatus: 'valid' });
        expect(reply).not.toMatch(/Warning/);
    });
});
