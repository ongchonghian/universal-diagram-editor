/**
 * OpenAI-compatible adapter: the Chat Completions API with streaming, at a base address the user sets.
 * Works with endpoints that copy OpenAI's Chat Completions shape, such as OpenRouter, Ollama,
 * LM Studio and Gemini's compatibility endpoint.
 *
 * - The Authorization header is sent only when a key is set (a local Ollama needs none).
 * - Some models reject a temperature setting. When the endpoint names temperature in a 400 error,
 *   the adapter retries once without temperature.
 * - Tool-call fragments arrive in pieces and are joined by their index.
 */
import { readSSE, parseData } from '../sse.js';
import { LLMError, networkError, responseError, resultText } from '../types.js';

const ID = 'openai-compatible';
const LABEL = 'The OpenAI-compatible endpoint';

const STOP_REASONS = { stop: 'end', tool_calls: 'tool_use', function_call: 'tool_use', length: 'max_tokens', content_filter: 'blocked' };

/** Trim a base address to its canonical form, or return null when the address is not http(s). */
export function normaliseBaseUrl(value) {
    const text = String(value || '').trim().replace(/\/+$/, '');
    if (!text) return null;
    try {
        const url = new URL(text);
        return url.protocol === 'http:' || url.protocol === 'https:' ? text : null;
    } catch {
        return null;
    }
}

function headers(config) {
    return {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
    };
}

function toMessages(system, messages) {
    const out = [];
    if (system && system.trim()) out.push({ role: 'system', content: system });
    for (const message of messages) {
        if (message.role === 'assistant') {
            const text = message.parts.filter(p => p.type === 'text').map(p => p.text).join('');
            const calls = message.parts.filter(p => p.type === 'tool_call');
            out.push({
                role: 'assistant',
                content: text || null,
                ...(calls.length ? {
                    tool_calls: calls.map(c => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args || {}) } }))
                } : {})
            });
            continue;
        }
        // Tool results become separate "tool" messages; the rest of the user turn follows them
        for (const part of message.parts.filter(p => p.type === 'tool_result')) {
            out.push({ role: 'tool', tool_call_id: part.id, content: (part.isError ? 'Error: ' : '') + resultText(part.content) });
        }
        // Tool messages hold text only, so pictures from tool results follow in the user message
        const resultImages = message.parts.flatMap(p => (p.type === 'tool_result' && p.images?.length
            ? [{ type: 'text', text: `Picture from ${p.name}:` }, ...p.images]
            : []));
        const rest = [...resultImages, ...message.parts.filter(p => p.type === 'text' || p.type === 'image')];
        if (!rest.length) continue;
        const hasImage = rest.some(p => p.type === 'image');
        out.push({
            role: 'user',
            content: hasImage
                ? rest.map(p => (p.type === 'text'
                    ? { type: 'text', text: p.text }
                    : { type: 'image_url', image_url: { url: `data:${p.mimeType};base64,${p.data}` } }))
                : rest.map(p => p.text).join('\n\n')
        });
    }
    return out;
}

export function buildRequest(config, { system, messages, tools, temperature }, { withTemperature = true } = {}) {
    const base = normaliseBaseUrl(config.baseUrl);
    if (!base) throw new LLMError('Enter the base address of the OpenAI-compatible endpoint in the settings, starting with http:// or https://.', { provider: ID, code: 'NOT_CONFIGURED' });
    const body = {
        model: config.model,
        messages: toMessages(system, messages),
        stream: true,
        stream_options: { include_usage: true }
    };
    if (withTemperature && temperature !== undefined && temperature !== null) body.temperature = Number(temperature);
    if (tools?.length) {
        body.tools = tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
    }
    return { url: `${base}/chat/completions`, init: { method: 'POST', headers: headers(config), body: JSON.stringify(body) } };
}

async function send(config, request, options) {
    const { url, init } = buildRequest(config, request, options);
    try {
        return await fetch(url, { ...init, signal: request.signal });
    } catch (e) {
        throw networkError(e, LABEL, ID);
    }
}

export async function* streamTurn(config, request) {
    let response = await send(config, request);
    if (response.status === 400 && request.temperature !== undefined && request.temperature !== null) {
        const error = await responseError(response, LABEL, ID);
        if (!/temperature/i.test(error.message)) throw error;
        response = await send(config, request, { withTemperature: false });
    }
    if (!response.ok) throw await responseError(response, LABEL, ID);

    let text = '';
    const calls = [];
    let finishReason = null;
    let usage = { inputTokens: 0, outputTokens: 0 };

    for await (const { data } of readSSE(response)) {
        if (data.trim() === '[DONE]') break;
        const chunk = parseData(data, LABEL);
        if (chunk.error) throw new LLMError(`${LABEL} returned an error: ${chunk.error.message || 'unknown error'}`, { provider: ID });
        if (chunk.usage) {
            usage = { inputTokens: chunk.usage.prompt_tokens || 0, outputTokens: chunk.usage.completion_tokens || 0 };
        }
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;
        const delta = choice.delta || {};
        if (typeof delta.content === 'string' && delta.content) {
            text += delta.content;
            yield { type: 'text', text: delta.content };
        }
        (delta.tool_calls || []).forEach((fragment, position) => {
            const index = fragment.index ?? position;
            const call = calls[index] || (calls[index] = { id: '', name: '', json: '' });
            if (fragment.id) call.id = fragment.id;
            if (fragment.function?.name) call.name += fragment.function.name;
            if (fragment.function?.arguments) call.json += fragment.function.arguments;
        });
    }

    const parts = text ? [{ type: 'text', text }] : [];
    for (const [index, call] of calls.entries()) {
        if (!call) continue;
        const part = { type: 'tool_call', id: call.id || `call_${index}`, name: call.name, args: {} };
        try {
            part.args = call.json ? JSON.parse(call.json) : {};
        } catch {
            part.invalidArgs = call.json;
        }
        parts.push(part);
        yield part;
    }

    const hasCalls = parts.some(p => p.type === 'tool_call');
    yield {
        type: 'done',
        stopReason: hasCalls && finishReason !== 'length' ? 'tool_use' : (STOP_REASONS[finishReason] || (finishReason ? 'other' : 'end')),
        finishReason,
        usage,
        message: { role: 'assistant', parts }
    };
}

/** The endpoint's models, as { id, name }, sorted by id. */
export async function listModels(config, { signal } = {}) {
    const base = normaliseBaseUrl(config.baseUrl);
    if (!base) throw new LLMError('Enter the base address first.', { provider: ID, code: 'NOT_CONFIGURED' });
    let response;
    try {
        response = await fetch(`${base}/models`, { headers: headers(config), signal });
    } catch (e) {
        throw networkError(e, LABEL, ID);
    }
    if (!response.ok) throw await responseError(response, LABEL, ID);
    const body = await response.json();
    const list = Array.isArray(body) ? body : (body.data || body.models || []);
    return list
        .map(m => ({ id: m.id || m.name, name: m.name && m.name !== m.id ? `${m.name} (${m.id})` : (m.id || m.name) }))
        .filter(m => m.id)
        .sort((a, b) => a.id.localeCompare(b.id));
}

export const provider = {
    id: ID,
    label: 'OpenAI-compatible endpoint',
    defaultModel: '',
    needsKey: false,
    needsBaseUrl: true,
    keyUrl: null,
    streamTurn,
    listModels
};
