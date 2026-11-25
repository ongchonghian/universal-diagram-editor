import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { streamTurn, listModels, outputLimit, outputLimits, FALLBACK_MAX_TOKENS } from './gemini.js';
import { streamResponse, sse, jsonResponse, mockFetch, collect, pieces } from '../test-helpers.js';

const config = { provider: 'gemini', model: 'gemini-3.8-flash', apiKey: 'g-key' };
const tools = [{ name: 'edit_diagram', description: 'Edit', parameters: { type: 'object', properties: { code: { type: 'string' } } } }];

// The stream tests use a known limit, so each test needs only its stream response
beforeEach(() => { outputLimits.clear(); outputLimits.set(config.model, 65536); });
afterEach(() => vi.unstubAllGlobals());

// Written from Google's documented streamGenerateContent format
const TOOL_STREAM = sse([
    { candidates: [{ content: { role: 'model', parts: [{ text: 'I will ', thought: true }] } }] },
    { candidates: [{ content: { role: 'model', parts: [{ text: 'Adding a step. ' }] } }] },
    { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'edit_diagram', args: { code: 'A-->B' } }, thoughtSignature: 'SIG123' }] } }] },
    { candidates: [{ content: { role: 'model', parts: [{ text: '' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30, thoughtsTokenCount: 12 } }
]);

describe('Gemini adapter', () => {
    it('sends the key in a header, the system instruction and the tool declarations', async () => {
        const fetch = mockFetch(streamResponse([sse([{ candidates: [{ content: { parts: [{ text: 'hi' }] }, finishReason: 'STOP' }] }])]));
        await collect(streamTurn(config, { system: 'Be brief.', messages: [{ role: 'user', parts: [{ type: 'text', text: 'Hello' }] }], tools, temperature: 0.2 }));
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse');
        expect(url).not.toContain('g-key');
        expect(init.headers['x-goog-api-key']).toBe('g-key');
        const body = JSON.parse(init.body);
        expect(body.systemInstruction).toEqual({ parts: [{ text: 'Be brief.' }] });
        expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'Hello' }] }]);
        expect(body.generationConfig.temperature).toBe(0.2);
        expect(body.tools[0].functionDeclarations[0].name).toBe('edit_diagram');
    });

    it('streams text, yields the tool call, and keeps the raw parts with the thought signature', async () => {
        mockFetch(streamResponse(pieces(TOOL_STREAM, 17)));
        const events = await collect(streamTurn(config, { messages: [{ role: 'user', parts: [{ type: 'text', text: 'Add B' }] }], tools }));
        expect(events.filter(e => e.type === 'text').map(e => e.text).join('')).toBe('Adding a step. ');
        const call = events.find(e => e.type === 'tool_call');
        expect(call).toMatchObject({ name: 'edit_diagram', args: { code: 'A-->B' } });
        const done = events.at(-1);
        expect(done).toMatchObject({ type: 'done', stopReason: 'tool_use', usage: { inputTokens: 120, outputTokens: 42 } });
        expect(done.message.raw.content).toContainEqual({ functionCall: { name: 'edit_diagram', args: { code: 'A-->B' } }, thoughtSignature: 'SIG123' });
        expect(done.message.raw.content[0]).toEqual({ text: 'I will ', thought: true });
    });

    it('sends a Gemini assistant message back exactly as received, and maps tool results', async () => {
        mockFetch(streamResponse(pieces(TOOL_STREAM, 50)));
        const first = (await collect(streamTurn(config, { messages: [{ role: 'user', parts: [{ type: 'text', text: 'Add B' }] }], tools }))).at(-1);
        const call = first.message.parts.find(p => p.type === 'tool_call');

        const fetch = mockFetch(streamResponse([sse([{ candidates: [{ content: { parts: [{ text: 'Done.' }] }, finishReason: 'STOP' }] }])]));
        await collect(streamTurn(config, {
            messages: [
                { role: 'user', parts: [{ type: 'text', text: 'Add B' }] },
                first.message,
                { role: 'user', parts: [{ type: 'tool_result', id: call.id, name: call.name, content: { valid: true } }] }
            ],
            tools
        }));
        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body.contents[1]).toEqual({ role: 'model', parts: first.message.raw.content });
        // A made-up call id is not sent back to Gemini
        expect(body.contents[2]).toEqual({ role: 'user', parts: [{ functionResponse: { name: 'edit_diagram', response: { result: { valid: true } } } }] });
    });

    it('reports MAX_TOKENS and safety stops', async () => {
        mockFetch(streamResponse([sse([{ candidates: [{ content: { parts: [{ text: 'part' }] }, finishReason: 'MAX_TOKENS' }] }])]));
        expect((await collect(streamTurn(config, { messages: [] }))).at(-1).stopReason).toBe('max_tokens');
        mockFetch(streamResponse([sse([{ promptFeedback: { blockReason: 'SAFETY' } }])]));
        await expect(collect(streamTurn(config, { messages: [] }))).rejects.toThrow(/blocked the request \(SAFETY\)/);
    });

    it('passes on the provider error message', async () => {
        mockFetch(jsonResponse({ error: { code: 400, message: 'API key not valid.' } }, 400));
        await expect(collect(streamTurn(config, { messages: [] }))).rejects.toMatchObject({ status: 400, message: expect.stringContaining('API key not valid.') });
    });

    it('turns a failed fetch into a network error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
        await expect(collect(streamTurn(config, { messages: [] }))).rejects.toMatchObject({ code: 'NETWORK' });
    });

    it('lists only Gemini models that accept generateContent', async () => {
        mockFetch(jsonResponse({ models: [
            { name: 'models/gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', supportedGenerationMethods: ['generateContent', 'countTokens'] },
            { name: 'models/text-embedding-005', supportedGenerationMethods: ['embedContent'] },
            { name: 'models/gemini-embedding', supportedGenerationMethods: ['embedContent'] }
        ] }));
        expect(await listModels(config)).toEqual([{ id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' }]);
    });

    it('asks for the model\'s own output limit once, and falls back when the lookup fails', async () => {
        outputLimits.clear();
        const fetch = mockFetch(
            jsonResponse({ name: 'models/gemini-3.8-flash', outputTokenLimit: 65536 }),
            streamResponse([sse([{ candidates: [{ content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' }] }])]),
            streamResponse([sse([{ candidates: [{ content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' }] }])])
        );
        await collect(streamTurn(config, { messages: [] }));
        await collect(streamTurn(config, { messages: [] }));
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch.mock.calls[0][0]).toMatch(/\/models\/gemini-3\.8-flash$/);
        expect(JSON.parse(fetch.mock.calls[2][1].body).generationConfig.maxOutputTokens).toBe(65536);

        mockFetch(jsonResponse({ error: { message: 'not found' } }, 404));
        expect(await outputLimit({ ...config, model: 'gemini-x' })).toBe(FALLBACK_MAX_TOKENS);
    });
});

