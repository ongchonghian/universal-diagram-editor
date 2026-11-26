/**
 * Read a server-sent event stream from a fetch Response.
 * Yields { event, data } for each event. `data` joins multi-line data fields with "\n".
 * Comment lines (starting with ":") and events without data are skipped.
 */
export async function* readSSE(response) {
    if (!response.body) throw new Error('The response has no body to stream.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let event = '';
    let data = [];

    const flush = function* () {
        if (data.length) yield { event: event || 'message', data: data.join('\n') };
        event = '';
        data = [];
    };

    try {
        while (true) {
            const { value, done } = await reader.read();
            buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
            let newline;
            while ((newline = buffer.search(/\r\n|\r|\n/)) !== -1) {
                const line = buffer.slice(0, newline);
                buffer = buffer.slice(newline + (buffer.startsWith('\r\n', newline) ? 2 : 1));
                if (line === '') {
                    yield* flush();
                } else if (!line.startsWith(':')) {
                    const colon = line.indexOf(':');
                    const field = colon === -1 ? line : line.slice(0, colon);
                    let value = colon === -1 ? '' : line.slice(colon + 1);
                    if (value.startsWith(' ')) value = value.slice(1);
                    if (field === 'event') event = value;
                    else if (field === 'data') data.push(value);
                }
            }
            if (done) break;
        }
        if (buffer) {
            // A final line without a trailing newline
            const colon = buffer.indexOf(':');
            if (colon !== -1 && buffer.slice(0, colon) === 'data') data.push(buffer.slice(colon + 1).replace(/^ /, ''));
        }
        yield* flush();
    } finally {
        reader.releaseLock?.();
    }
}

/** Parse an event's JSON data, with a clear error when the server sent something else. */
export function parseData(data, label) {
    try {
        return JSON.parse(data);
    } catch {
        throw new Error(`${label} sent a stream event that is not valid JSON.`);
    }
}
