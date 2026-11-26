/**
 * Provider-neutral types for the model layer.
 *
 * A neutral message:
 *   { role: 'user' | 'assistant', parts: Part[], raw?: { provider: string, content: any } }
 *
 * Parts:
 *   { type: 'text', text }
 *   { type: 'image', mimeType, data }              data is base64 without a data: prefix
 *   { type: 'tool_call', id, name, args }
 *   { type: 'tool_result', id, name, content, isError?, images? }
 *       content is a string or a JSON value; images is a list of image parts that belong to the result
 *       (render_diagram sends the rendered picture this way). Anthropic carries the images inside the
 *       tool result. Gemini and the OpenAI-compatible endpoint receive them as image parts right after
 *       the tool results, in the same user turn.
 *
 * `raw` holds the provider's own copy of an assistant message. An adapter sends `raw` back unchanged
 * when the message returns to the same provider, which keeps Gemini thought signatures and Claude
 * thinking blocks intact.
 *
 * Events yielded by streamTurn():
 *   { type: 'text', text }                            a fragment of visible reply text
 *   { type: 'tool_call', id, name, args }             a complete tool call
 *   { type: 'done', stopReason, usage, message }      stopReason: 'end' | 'tool_use' | 'max_tokens' | 'blocked' | 'other'
 *                                                     usage: { inputTokens, outputTokens }
 *                                                     message: the assistant message, with raw
 *
 * A tool definition: { name, description, parameters }  where parameters is a JSON Schema object.
 */

/** An error from a provider, with the provider's own message where one was given. */
export class LLMError extends Error {
    constructor(message, { provider, status = null, code = null } = {}) {
        super(message);
        this.name = 'LLMError';
        this.provider = provider;
        this.status = status;
        this.code = code;
    }
}

/** The visible text of a neutral message. */
export const textOf = (message) =>
    (message?.parts || []).filter(p => p.type === 'text').map(p => p.text).join('');

/** A plain text message. */
export const textMessage = (role, text) => ({ role, parts: [{ type: 'text', text }] });

/** The body of a tool result as a string, for providers that accept only text. */
export const resultText = (content) => (typeof content === 'string' ? content : JSON.stringify(content));

/** Turn a fetch failure into an LLMError that says what to check. */
export function networkError(error, label, provider) {
    if (error?.name === 'AbortError') return error;
    return new LLMError(
        `Could not reach ${label}. Check the network connection. For a custom endpoint, also check the address and that the server accepts requests from this page (CORS).`,
        { provider, code: 'NETWORK' }
    );
}

/** Read the provider's error message from a failed response. */
export async function responseError(response, label, provider) {
    let message = '';
    try {
        const body = await response.json();
        const err = Array.isArray(body) ? body[0]?.error : body?.error;
        message = (typeof err === 'string' ? err : err?.message) || body?.message || '';
    } catch {
        // The body was not JSON; the status code is all there is
    }
    const code = response.status === 401 || response.status === 403 ? 'AUTH' : response.status === 429 ? 'RATE_LIMIT' : null;
    return new LLMError(`${label} returned an error (${response.status})${message ? `: ${message}` : '.'}`, {
        provider, status: response.status, code
    });
}
