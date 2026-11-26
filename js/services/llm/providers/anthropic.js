/**
 * Anthropic Claude adapter: the Messages API with streaming, called straight from the browser.
 *
 * - Browser calls need the header anthropic-dangerous-direct-browser-access. Organisations with
 *   zero data retention cannot use browser access and receive an error.
 * - Current Claude models reject sampling settings, so this adapter never sends temperature.
 * - Thinking blocks (with their signatures) are kept in `raw` and sent back unchanged.
 * - For the models that support the server-side fallback, a request that a safety classifier
 *   declines is re-run on a fallback model chosen by Anthropic ("fallbacks": "default").
 */
import { readSSE, parseData } from '../sse.js';
import { LLMError, networkError, responseError, resultText } from '../types.js';

const ID = 'anthropic';
const LABEL = 'Anthropic';
const BASE = 'https://api.anthropic.com/v1';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const FALLBACK_MODELS = new Set(['claude-fable-5-2', 'claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);

const STOP_REASONS = { end_turn: 'end', stop_sequence: 'end', tool_use: 'tool_use', max_tokens: 'max_tokens', refusal: 'blocked' };

function headers(config, { beta } = {}) {
    return {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        ...(beta ? { 'anthropic-beta': beta } : {})
    };
}

const imageBlock = (part) => ({ type: 'image', source: { type: 'base64', media_type: part.mimeType, data: part.data } });

function toMessages(messages) {
    return messages.map(message => {
        if (message.role === 'assistant' && message.raw?.provider === ID) {
            return { role: 'assistant', content: message.raw.content };
        }
        const content = message.parts.map(part => {
            switch (part.type) {
                case 'text': return { type: 'text', text: part.text };
                case 'image': return imageBlock(part);
                case 'tool_call': return { type: 'tool_use', id: part.id, name: part.name, input: part.args || {} };
                case 'tool_result': return {
                    type: 'tool_result',
                    tool_use_id: part.id,
                    content: part.images?.length
                        ? [{ type: 'text', text: resultText(part.content) }, ...part.images.map(imageBlock)]
                        : resultText(part.content),
                    ...(part.isError ? { is_error: true } : {})
                };
                default: throw new Error(`Unknown message part type "${part.type}".`);
            }
        });
        return { role: message.role, content };
    });
}

export function buildRequest(config, { system, messages, tools, maxTokens = 32000 }) {
    const useFallback = FALLBACK_MODELS.has(config.model);
    const body = {
        model: config.model,
        max_tokens: maxTokens,
        stream: true,
        messages: toMessages(messages)
    };
    if (system && system.trim()) body.system = system;
    if (tools?.length) {
        body.tools = tools.map(t => ({ name: t.name, description: t.description, input_schema: t.parameters, eager_input_streaming: true }));
    }
    if (useFallback) body.fallbacks = 'default';
    return {
        url: `${BASE}/messages`,
        init: { method: 'POST', headers: headers(config, { beta: useFallback ? FALLBACK_BETA : null }), body: JSON.stringify(body) }
    };
}

export async function* streamTurn(config, request) {
    const { url, init } = buildRequest(config, request);
    let response;
    try {
        response = await fetch(url, { ...init, signal: request.signal });
    } catch (e) {
        throw networkError(e, LABEL, ID);
    }
    if (!response.ok) throw await responseError(response, LABEL, ID);

    // Content blocks by index, rebuilt from the stream for `raw`
    const blocks = [];
    const jsonBuffers = [];
    const neutralParts = [];
    let stopReason = null;
    let usage = { inputTokens: 0, outputTokens: 0 };

    for await (const { event, data } of readSSE(response)) {
        if (event === 'ping') continue;
        const payload = parseData(data, LABEL);
        switch (payload.type) {
            case 'message_start': {
                const u = payload.message?.usage || {};
                usage.inputTokens = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
                usage.outputTokens = u.output_tokens || 0;
                break;
            }
            case 'content_block_start': {
                const block = { ...payload.content_block };
                if (block.type === 'tool_use') {
                    jsonBuffers[payload.index] = '';
                    block.input = {};
                }
                blocks[payload.index] = block;
                break;
            }
            case 'content_block_delta': {
                const block = blocks[payload.index];
                const delta = payload.delta || {};
                if (!block) break;
                if (delta.type === 'text_delta') {
                    block.text = (block.text || '') + delta.text;
                    const last = neutralParts[neutralParts.length - 1];
                    if (last?.type === 'text') last.text += delta.text;
                    else neutralParts.push({ type: 'text', text: delta.text });
                    yield { type: 'text', text: delta.text };
                } else if (delta.type === 'input_json_delta') {
                    jsonBuffers[payload.index] += delta.partial_json || '';
                } else if (delta.type === 'thinking_delta') {
                    block.thinking = (block.thinking || '') + delta.thinking;
                } else if (delta.type === 'signature_delta') {
                    block.signature = (block.signature || '') + delta.signature;
                }
                break;
            }
            case 'content_block_stop': {
                const block = blocks[payload.index];
                if (block?.type === 'tool_use') {
                    const json = jsonBuffers[payload.index];
                    const call = { type: 'tool_call', id: block.id, name: block.name, args: {} };
                    try {
                        call.args = json ? JSON.parse(json) : {};
                        block.input = call.args;
                    } catch {
                        // With eager input streaming the API does not check the input. The caller returns an error result.
                        call.invalidArgs = json;
                    }
                    neutralParts.push(call);
                    yield call;
                }
                break;
            }
            case 'message_delta':
                if (payload.delta?.stop_reason) stopReason = payload.delta.stop_reason;
                if (payload.usage?.output_tokens !== undefined) usage.outputTokens = payload.usage.output_tokens;
                break;
            case 'error':
                throw new LLMError(`${LABEL} returned an error: ${payload.error?.message || payload.error?.type || 'unknown error'}`, {
                    provider: ID, code: payload.error?.type === 'overloaded_error' ? 'OVERLOADED' : null
                });
            default:
                break;
        }
    }

    yield {
        type: 'done',
        stopReason: STOP_REASONS[stopReason] || (stopReason ? 'other' : 'end'),
        finishReason: stopReason,
        usage,
        message: { role: 'assistant', parts: neutralParts, raw: { provider: ID, content: blocks.filter(Boolean) } }
    };
}

/** The models this key can use, as { id, name }. */
export async function listModels(config, { signal } = {}) {
    let response;
    try {
        response = await fetch(`${BASE}/models?limit=1000`, { headers: headers(config), signal });
    } catch (e) {
        throw networkError(e, LABEL, ID);
    }
    if (!response.ok) throw await responseError(response, LABEL, ID);
    const body = await response.json();
    return (body.data || []).map(m => ({ id: m.id, name: m.display_name || m.id }));
}

export const provider = {
    id: ID,
    label: LABEL,
    defaultModel: 'claude-opus-5-5',
    needsKey: true,
    needsBaseUrl: false,
    keyUrl: 'https://console.anthropic.com/settings/keys',
    streamTurn,
    listModels
};
