import { describe, it, expect } from 'vitest';
import { readSSE } from './sse.js';
import { streamResponse, collect, pieces } from './test-helpers.js';

describe('readSSE', () => {
    it('reads events split across chunk boundaries', async () => {
        const text = 'event: a\ndata: {"x":1}\n\ndata: {"y":2}\n\n';
        for (const size of [1, 3, 7, text.length]) {
            const events = await collect(readSSE(streamResponse(pieces(text, size))));
            expect(events).toEqual([{ event: 'a', data: '{"x":1}' }, { event: 'message', data: '{"y":2}' }]);
        }
    });

    it('handles CRLF line endings, comments and multi-line data', async () => {
        const events = await collect(readSSE(streamResponse([': keep-alive\r\n\r\ndata: one\r\ndata: two\r\n\r\n'])));
        expect(events).toEqual([{ event: 'message', data: 'one\ntwo' }]);
    });

    it('reads a final event that has no blank line after it', async () => {
        const events = await collect(readSSE(streamResponse(['data: [DONE]'])));
        expect(events).toEqual([{ event: 'message', data: '[DONE]' }]);
    });
});
