import { describe, it, expect, afterEach, vi } from 'vitest';
import { streamTurn, listModels, normaliseBaseUrl } from './openai-compatible.js';
import { streamResponse, sse, jsonResponse, mockFetch, collect, pieces } from '../test-helpers.js';

const config = { provider: 'openai-compatible', model: 'llama4', apiKey: '', baseUrl: 'http://localhost:11434/v1/' };
const tools = [{ name: 'edit_diagram', description: 'Edit', parameters: { type: 'object', properties: { code: { type: 'string' } } } }];
const user = (text) => ({ role: 'user', parts: [{ type: 'text', text }] });

afterEach(() => vi.unstubAllGlobals());

// Written from OpenAI's documented Chat Completions streaming format
const TOOL_STREAM = sse([
    { choices: [{ index: 0, delta: { role: 'assistant', content: 'Adding ' } }] },
    { choices: [{ index: 0, delta: { content: 'a step.' } }] },
    { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call_a', type: 'function', function: { name: 'edit_diagram', arguments: '' } }] } }] },
    { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '{"code":' } }] } }] },
    { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '"A-->B"}' } }] } }] },
    { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
    { choices: [], usage: { prompt_tokens: 90, completion_tokens: 20 } },
    '[DONE]'
]);

describe('OpenAI-compatible adapter', () => {
    it('normalises the base address', () => {
        expect(normaliseBaseUrl(' https://openrouter.ai/api/v1/ ')).toBe('https://openrouter.ai/api/v1');
        expect(normaliseBaseUrl('openrouter.ai')).toBeNull();
        expect(normaliseBaseUrl('')).toBeNull();
    });

    it('sends no Authorization header without a key, and a system message first', async () => {
        const fetch = mockFetch(streamResponse([TOOL_STREAM]));
        await collect(streamTurn(config, { system: 'Be brief.', messages: [user('Hello')], tools, temperature: 0.3 }));
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe('http://localhost:11434/v1/chat/completions');
        expect(init.headers).not.toHaveProperty('Authorization');
        const body = JSON.parse(init.body);
        expect(body.messages[0]).toEqual({ role: 'system', content: 'Be brief.' });
        expect(body).toMatchObject({ stream: true, temperature: 0.3, stream_options: { include_usage: true } });
        expect(body.tools[0].function.name).toBe('edit_diagram');
    });

    it('sends a bearer key when one is set', async () => {
        const fetch = mockFetch(streamResponse([TOOL_STREAM]));
        await collect(streamTurn({ ...config, apiKey: 'sk-1' }, { messages: [user('Hi')] }));
        expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-1');
    });

    it('joins tool-call fragments by index and reads the usage chunk', async () => {
        mockFetch(streamResponse(pieces(TOOL_STREAM, 13)));
        const events = await collect(streamTurn(config, { messages: [user('Add B')], tools }));
        expect(events.filter(e => e.type === 'text').map(e => e.text).join('')).toBe('Adding a step.');
        expect(events.find(e => e.type === 'tool_call')).toEqual({ type: 'tool_call', id: 'call_a', name: 'edit_diagram', args: { code: 'A-->B' } });
        expect(events.at(-1)).toMatchObject({ stopReason: 'tool_use', usage: { inputTokens: 90, outputTokens: 20 } });
    });

    it('maps tool calls and tool results back to Chat Completions messages', async () => {
        const fetch = mockFetch(streamResponse([TOOL_STREAM]));
        await collect(streamTurn(config, {
            messages: [
                user('Add B'),
                { role: 'assistant', parts: [{ type: 'text', text: 'Adding.' }, { type: 'tool_call', id: 'call_a', name: 'edit_diagram', args: { code: 'x' } }] },
                { role: 'user', parts: [{ type: 'tool_result', id: 'call_a', name: 'edit_diagram', content: 'ok' }] }
            ]
        }));
        const { messages } = JSON.parse(fetch.mock.calls[0][1].body);
        expect(messages[1]).toEqual({ role: 'assistant', content: 'Adding.', tool_calls: [{ id: 'call_a', type: 'function', function: { name: 'edit_diagram', arguments: '{"code":"x"}' } }] });
        expect(messages[2]).toEqual({ role: 'tool', tool_call_id: 'call_a', content: 'ok' });
    });

    it('retries once without temperature when the endpoint rejects temperature', async () => {
        const fetch = mockFetch(
            jsonResponse({ error: { message: "Unsupported value: 'temperature' does not support 0.7" } }, 400),
            streamResponse([TOOL_STREAM])
        );
        await collect(streamTurn(config, { messages: [user('Hi')], temperature: 0.7 }));
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(JSON.parse(fetch.mock.calls[1][1].body)).not.toHaveProperty('temperature');
    });

    it('does not retry other 400 errors', async () => {
        const fetch = mockFetch(jsonResponse({ error: { message: 'model not found' } }, 400));
        await expect(collect(streamTurn(config, { messages: [user('Hi')], temperature: 0.7 }))).rejects.toThrow(/model not found/);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('lists models sorted by id', async () => {
        mockFetch(jsonResponse({ data: [{ id: 'qwen3' }, { id: 'llama4' }] }));
        expect(await listModels(config)).toEqual([{ id: 'llama4', name: 'llama4' }, { id: 'qwen3', name: 'qwen3' }]);
    });
});
