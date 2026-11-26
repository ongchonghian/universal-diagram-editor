/**
 * Google Gemini adapter: generateContent with server-sent events (streamGenerateContent?alt=sse).
 * The key travels in the x-goog-api-key header, so the key stays out of the URL.
 */
import { readSSE, parseData } from '../sse.js';
import { LLMError, networkError, responseError, resultText } from '../types.js';

const ID = 'gemini';
const LABEL = 'Google Gemini';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Ids this adapter makes up when Gemini sends a function call without one. They are not sent back.
const LOCAL_ID = 'local-call-';

const STOP_REASONS = {
    STOP: 'end', MAX_TOKENS: 'max_tokens',
    SAFETY: 'blocked', RECITATION: 'blocked', BLOCKLIST: 'blocked', PROHIBITED_CONTENT: 'blocked', SPII: 'blocked', IMAGE_SAFETY: 'blocked'
};

function toContents(messages) {
    return messages.map(message => {
        const role = message.role === 'assistant' ? 'model' : 'user';
        if (message.role === 'assistant' && message.raw?.provider === ID) {
            // Sent back exactly as received, thought signatures included
            return { role, parts: message.raw.content };
        }
        const parts = message.parts.map(part => {
            switch (part.type) {
                case 'text': return { text: part.text };
                case 'image': return { inlineData: { mimeType: part.mimeType, data: part.data } };
                case 'tool_call': return { functionCall: { ...(part.id?.startsWith(LOCAL_ID) ? {} : { id: part.id }), name: part.name, args: part.args || {} } };
                case 'tool_result': return {
                    functionResponse: {
                        ...(part.id?.startsWith(LOCAL_ID) ? {} : { id: part.id }),
                        name: part.name,
                        response: part.isError ? { error: resultText(part.content) } : { result: part.content }
                    }
                };
                default: throw new Error(`Unknown message part type "${part.type}".`);
            }
        });
        // Pictures that belong to tool results follow the function responses in the same turn
        for (const part of message.parts) {
            for (const image of (part.type === 'tool_result' && part.images) || []) {
                parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
            }
        }
        return { role, parts };
    });
}

// Used when the model's own output limit cannot be read
export const FALLBACK_MAX_TOKENS = 16384;

// Each model's output limit (outputTokenLimit), read once per page load. Gemini counts thinking within this limit,
// so a fixed lower cap can cut off a long tool call, such as a BPMN diagram with layout data.
export const outputLimits = new Map();

/** The model's output token limit from GET /models/{id}, or the fallback when the lookup fails. */
export async function outputLimit(config, signal) {
    if (outputLimits.has(config.model)) return outputLimits.get(config.model);
    let limit = FALLBACK_MAX_TOKENS;
    try {
        const response = await fetch(`${BASE}/models/${encodeURIComponent(config.model)}`, { headers: { 'x-goog-api-key': config.apiKey }, signal });
        if (response.ok) {
            const body = await response.json();
            if (Number.isInteger(body.outputTokenLimit) && body.outputTokenLimit > 0) limit = body.outputTokenLimit;
        }
    } catch (e) {
        if (e?.name === 'AbortError') throw e;
    }
    outputLimits.set(config.model, limit);
    return limit;
}

export function buildRequest(config, { system, messages, tools, temperature, maxTokens = FALLBACK_MAX_TOKENS }) {
    const body = {
        contents: toContents(messages),
        generationConfig: { maxOutputTokens: maxTokens }
    };
    if (temperature !== undefined && temperature !== null) body.generationConfig.temperature = Number(temperature);
    if (system && system.trim()) body.systemInstruction = { parts: [{ text: system }] };
    if (tools?.length) {
        body.tools = [{ functionDeclarations: tools.map(t => ({ name: t.name, description: t.description, parameters: t.parameters })) }];
    }
    return {
        url: `${BASE}/models/${encodeURIComponent(config.model)}:streamGenerateContent?alt=sse`,
        init: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
            body: JSON.stringify(body)
        }
    };
}

/** Join consecutive plain text parts. Parts with a signature or other fields stay separate and unchanged. */
function appendPart(parts, part) {
    const last = parts[parts.length - 1];
    const plain = (p) => p && typeof p.text === 'string' && Object.keys(p).every(k => k === 'text' || k === 'thought');
    if (plain(last) && plain(part) && !!last.thought === !!part.thought) {
        parts[parts.length - 1] = { ...last, text: last.text + part.text };
    } else {
        parts.push(part);
    }
}

export async function* streamTurn(config, request) {
    const maxTokens = request.maxTokens ?? await outputLimit(config, request.signal);
    const { url, init } = buildRequest(config, { ...request, maxTokens });
    let response;
    try {
        response = await fetch(url, { ...init, signal: request.signal });
    } catch (e) {
        throw networkError(e, LABEL, ID);
    }
    if (!response.ok) throw await responseError(response, LABEL, ID);

    const rawParts = [];
    const neutralParts = [];
    let finishReason = null;
    let usage = { inputTokens: 0, outputTokens: 0 };
    let callCount = 0;

    for await (const { data } of readSSE(response)) {
        const chunk = parseData(data, LABEL);
        if (chunk.error) throw new LLMError(`${LABEL} returned an error: ${chunk.error.message || 'unknown error'}`, { provider: ID, status: chunk.error.code });
        if (chunk.promptFeedback?.blockReason) {
            throw new LLMError(`The AI blocked the request (${chunk.promptFeedback.blockReason}).`, { provider: ID, code: 'BLOCKED' });
        }
        if (chunk.usageMetadata) {
            const u = chunk.usageMetadata;
            usage = { inputTokens: u.promptTokenCount || 0, outputTokens: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0) };
        }
        const candidate = chunk.candidates?.[0];
        if (!candidate) continue;
        if (candidate.finishReason) finishReason = candidate.finishReason;
        for (const part of candidate.content?.parts || []) {
            appendPart(rawParts, part);
            if (part.functionCall) {
                const call = {
                    type: 'tool_call',
                    id: part.functionCall.id || `${LOCAL_ID}${++callCount}`,
                    name: part.functionCall.name,
                    args: part.functionCall.args || {}
                };
                neutralParts.push(call);
                yield call;
            } else if (typeof part.text === 'string' && part.text && !part.thought) {
                const last = neutralParts[neutralParts.length - 1];
                if (last?.type === 'text') last.text += part.text;
                else neutralParts.push({ type: 'text', text: part.text });
                yield { type: 'text', text: part.text };
            }
        }
    }

    const hasCalls = neutralParts.some(p => p.type === 'tool_call');
    const stopReason = hasCalls && (finishReason === 'STOP' || !finishReason) ? 'tool_use' : (STOP_REASONS[finishReason] || (finishReason ? 'other' : 'end'));
    yield {
        type: 'done',
        stopReason,
        finishReason,
        usage,
        message: { role: 'assistant', parts: neutralParts, raw: { provider: ID, content: rawParts } }
    };
}

/** Models that accept generateContent, as { id, name }. */
export async function listModels(config, { signal } = {}) {
    const models = [];
    let pageToken = '';
    for (let page = 0; page < 5; page++) {
        const url = `${BASE}/models?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        let response;
        try {
            response = await fetch(url, { headers: { 'x-goog-api-key': config.apiKey }, signal });
        } catch (e) {
            throw networkError(e, LABEL, ID);
        }
        if (!response.ok) throw await responseError(response, LABEL, ID);
        const body = await response.json();
        for (const m of body.models || []) {
            if (!(m.supportedGenerationMethods || []).includes('generateContent')) continue;
            const id = String(m.name || '').replace(/^models\//, '');
            if (!id.startsWith('gemini')) continue;
            if (Number.isInteger(m.outputTokenLimit) && m.outputTokenLimit > 0) outputLimits.set(id, m.outputTokenLimit);
            models.push({ id, name: m.displayName || id });
        }
        pageToken = body.nextPageToken;
        if (!pageToken) break;
    }
    return models;
}

export const provider = {
    id: ID,
    label: LABEL,
    defaultModel: 'gemini-3.8-flash',
    needsKey: true,
    needsBaseUrl: false,
    keyUrl: 'https://aistudio.google.com/app/apikey',
    streamTurn,
    listModels
};
