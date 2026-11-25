/**
 * Helpers for the adapter tests. The stream fixtures in the tests are written by hand from each
 * provider's documented event format; they are not recordings of live traffic.
 */
import { vi } from 'vitest';

/** A Response whose body streams the given text chunks, split exactly where the chunks split. */
export function streamResponse(chunks, { status = 200 } = {}) {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
        start(controller) {
            for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
            controller.close();
        }
    });
    return new Response(body, { status, headers: { 'Content-Type': 'text/event-stream' } });
}

/** SSE text for a list of data payloads (objects are JSON-encoded). */
export const sse = (payloads) => payloads.map(p => `data: ${typeof p === 'string' ? p : JSON.stringify(p)}\n\n`).join('');

/** SSE text with named events, as Anthropic sends them. */
export const namedSse = (payloads) => payloads.map(p => `event: ${p.type}\ndata: ${JSON.stringify(p)}\n\n`).join('');

export const jsonResponse = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Replace fetch with a mock that returns the given responses in order. */
export function mockFetch(...responses) {
    const fn = vi.fn();
    for (const r of responses) fn.mockResolvedValueOnce(r);
    vi.stubGlobal('fetch', fn);
    return fn;
}

/** Collect every event from a stream. */
export async function collect(stream) {
    const events = [];
    for await (const event of stream) events.push(event);
    return events;
}

/** Split a string into pieces of the given size, to test chunk boundaries. */
export const pieces = (text, size) => text.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) || [];
