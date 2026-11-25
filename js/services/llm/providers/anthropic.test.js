import { describe, it, expect, afterEach, vi } from 'vitest';
import { streamTurn, listModels } from './anthropic.js';
import { streamResponse, namedSse, jsonResponse, mockFetch, collect, pieces } from '../test-helpers.js';

const config = { provider: 'anthropic', model: 'claude-opus-5-5', apiKey: 'a-key' };
const tools = [{ name: 'edit_diagram', description: 'Edit', parameters: { type: 'object', properties: { code: { type: 'string' } } } }];
const user = (text) => ({ role: 'user', parts: [{ type: 'text', text }] });

afterEach(() => vi.unstubAllGlobals());

// Written from Anthropic's documented Messages streaming events
const TOOL_STREAM = namedSse([
    { type: 'message_start', message: { id: 'msg_1', role: 'assistant', content: [], usage: { input_tokens: 200, output_tokens: 1 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'EqQBCgYIAhgC' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Adding ' } },
    { type: 'ping' },
    { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'a step.' } },
    { type: 'content_block_stop', index: 1 },
    { type: 'content_block_start', index: 2, content_block: { type: 'tool_use', id: 'toolu_01', name: 'edit_diagram', input: {} } },
    { type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '{"code": "A' } },
    { type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '-->B"}' } },
    { type: 'content_block_stop', index: 2 },
    { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 55 } },
    { type: 'message_stop' }
]);

describe('Anthropic adapter', () => {
    it('sends the browser-access header, no temperature, and tools with eager input streaming', async () => {
        const fetch = mockFetch(streamResponse([TOOL_STREAM]));
        await collect(streamTurn(config, { system: 'Be brief.', messages: [user('Hello')], tools, temperature: 0.7 }));
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe('https://api.anthropic.com/v1/messages');
        expect(init.headers).toMatchObject({
            'x-api-key': 'a-key',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
            'anthropic-beta': 'server-side-fallback-2026-07-01'
        });
        const body = JSON.parse(init.body);
        expect(body).toMatchObject({ model: 'claude-opus-5-5', stream: true, system: 'Be brief.', fallbacks: 'default' });
        expect(body).not.toHaveProperty('temperature');
        expect(body.tools[0]).toEqual({ name: 'edit_diagram', description: 'Edit', input_schema: tools[0].parameters, eager_input_streaming: true });
    });

    it('leaves out the fallback for models without server-side fallback', async () => {
        const fetch = mockFetch(streamResponse([TOOL_STREAM]));
        await collect(streamTurn({ ...config, model: 'claude-haiku-5-5' }, { messages: [user('Hi')] }));
        const [, init] = fetch.mock.calls[0];
        expect(init.headers).not.toHaveProperty('anthropic-beta');
        expect(JSON.parse(init.body)).not.toHaveProperty('fallbacks');
    });

    it('streams text, joins tool input fragments, and keeps the thinking block with its signature', async () => {
        mockFetch(streamResponse(pieces(TOOL_STREAM, 23)));
        const events = await collect(streamTurn(config, { messages: [user('Add B')], tools }));
        expect(events.filter(e => e.type === 'text').map(e => e.text).join('')).toBe('Adding a step.');
        expect(events.find(e => e.type === 'tool_call')).toEqual({ type: 'tool_call', id: 'toolu_01', name: 'edit_diagram', args: { code: 'A-->B' } });
        const done = events.at(-1);
        expect(done).toMatchObject({ stopReason: 'tool_use', usage: { inputTokens: 200, outputTokens: 55 } });
        expect(done.message.raw.content).toEqual([
            { type: 'thinking', thinking: '', signature: 'EqQBCgYIAhgC' },
            { type: 'text', text: 'Adding a step.' },
            { type: 'tool_use', id: 'toolu_01', name: 'edit_diagram', input: { code: 'A-->B' } }
        ]);
    });

    it('sends the raw assistant content back unchanged, with tool results in the next user turn', async () => {
        mockFetch(streamResponse([TOOL_STREAM]));
        const first = (await collect(streamTurn(config, { messages: [user('Add B')], tools }))).at(-1);
        const fetch = mockFetch(streamResponse([TOOL_STREAM]));
        await collect(streamTurn(config, {
            messages: [user('Add B'), first.message, { role: 'user', parts: [{ type: 'tool_result', id: 'toolu_01', name: 'edit_diagram', content: { valid: false }, isError: true }] }],
            tools
        }));
        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body.messages[1]).toEqual({ role: 'assistant', content: first.message.raw.content });
        expect(body.messages[2].content[0]).toEqual({ type: 'tool_result', tool_use_id: 'toolu_01', content: '{"valid":false}', is_error: true });
    });

    it('flags tool input that is not valid JSON, and maps a refusal to blocked', async () => {
        mockFetch(streamResponse([namedSse([
            { type: 'message_start', message: { usage: { input_tokens: 5 } } },
            { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 't1', name: 'edit_diagram', input: {} } },
            { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"code": "cut' } },
            { type: 'content_block_stop', index: 0 },
            { type: 'message_delta', delta: { stop_reason: 'refusal' }, usage: { output_tokens: 3 } }
        ])]));
        const events = await collect(streamTurn(config, { messages: [user('x')], tools }));
        expect(events.find(e => e.type === 'tool_call').invalidArgs).toBe('{"code": "cut');
        expect(events.at(-1).stopReason).toBe('blocked');
    });

    it('throws on an error event in the stream and on an error response', async () => {
        mockFetch(streamResponse([namedSse([{ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }])]));
        await expect(collect(streamTurn(config, { messages: [user('x')] }))).rejects.toMatchObject({ code: 'OVERLOADED', message: expect.stringContaining('Overloaded') });
        mockFetch(jsonResponse({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, 401));
        await expect(collect(streamTurn(config, { messages: [user('x')] }))).rejects.toMatchObject({ code: 'AUTH', message: expect.stringContaining('invalid x-api-key') });
    });

    it('lists models with their display names', async () => {
        const fetch = mockFetch(jsonResponse({ data: [{ id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5' }] }));
        expect(await listModels(config)).toEqual([{ id: 'claude-opus-5-5', name: 'Claude Opus 5.5' }]);
        expect(fetch.mock.calls[0][1].headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    });
});
