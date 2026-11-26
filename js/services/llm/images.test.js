/**
 * How each adapter sends pictures: pictures the user attached, and the picture that render_diagram
 * returns with its tool result.
 */
import { describe, it, expect } from 'vitest';
import { buildRequest as gemini } from './providers/gemini.js';
import { buildRequest as anthropic } from './providers/anthropic.js';
import { buildRequest as openai } from './providers/openai-compatible.js';

const image = { type: 'image', mimeType: 'image/png', data: 'iVBORw0KGgo' };
const userWithPicture = { role: 'user', parts: [image, { type: 'text', text: 'Turn this into a flowchart.' }] };
const call = { type: 'tool_call', id: 'call_1', name: 'render_diagram', args: {} };
const result = { type: 'tool_result', id: 'call_1', name: 'render_diagram', content: { status: 'rendered' }, images: [image] };
const messages = [userWithPicture, { role: 'assistant', parts: [call] }, { role: 'user', parts: [result] }];
const body = (built) => JSON.parse(built.init.body);

describe('pictures in requests', () => {
    it('Gemini sends inline data, with the rendered picture after the function response', () => {
        const contents = body(gemini({ model: 'm', apiKey: 'k' }, { messages })).contents;
        expect(contents[0].parts[0]).toEqual({ inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgo' } });
        expect(contents[2].parts).toEqual([
            { functionResponse: { id: 'call_1', name: 'render_diagram', response: { result: { status: 'rendered' } } } },
            { inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgo' } }
        ]);
    });

    it('Anthropic sends base64 image blocks, with the rendered picture inside the tool result', () => {
        const sent = body(anthropic({ model: 'claude-haiku-5-5', apiKey: 'k' }, { messages })).messages;
        const block = { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo' } };
        expect(sent[0].content[0]).toEqual(block);
        expect(sent[2].content).toEqual([{
            type: 'tool_result',
            tool_use_id: 'call_1',
            content: [{ type: 'text', text: '{"status":"rendered"}' }, block]
        }]);
    });

    it('the OpenAI-compatible endpoint receives the rendered picture in a user message after the tool message', () => {
        const sent = body(openai({ model: 'm', baseUrl: 'http://localhost:11434/v1' }, { messages })).messages;
        const url = 'data:image/png;base64,iVBORw0KGgo';
        expect(sent[0].content[0]).toEqual({ type: 'image_url', image_url: { url } });
        expect(sent[2]).toEqual({ role: 'tool', tool_call_id: 'call_1', content: '{"status":"rendered"}' });
        expect(sent[3]).toEqual({
            role: 'user',
            content: [{ type: 'text', text: 'Picture from render_diagram:' }, { type: 'image_url', image_url: { url } }]
        });
    });
});
