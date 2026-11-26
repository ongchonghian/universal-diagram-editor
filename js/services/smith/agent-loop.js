/**
 * Smith's agent loop: send the turn, run the tool calls against the draft, send the results back,
 * and repeat until the model stops calling tools or the loop reaches its step limit.
 */
import { streamTurn as defaultStreamTurn, textMessage, LLMError } from '../llm/index.js';
import { TOOL_DEFINITIONS, createDraft, runTool } from './tools.js';

export const MAX_STEPS = 8;

export const CUT_OFF_NOTE = 'Your last reply reached the length limit before the tool call was complete, so the call was lost and the draft is unchanged. Make the change in smaller steps: write a shorter first version with write_diagram, then add the rest with edit_diagram.';

/**
 * @param {object} options
 *   config       model config { provider, model, apiKey, baseUrl? }
 *   system       system prompt
 *   history      earlier turns as [{ role, content }] text messages
 *   userTurn     this turn's user text
 *   images       image parts the user attached to this turn ({ type: 'image', mimeType, data })
 *   code, type   the editor's current diagram
 *   temperature
 *   tools        tool definitions (defaults to every Smith tool)
 *   signal       AbortSignal
 *   onEvent      called with { type: 'text', text } (the reply so far) and { type: 'step', step } (a trail entry)
 *   streamTurn, validate, look   replaceable for tests
 * @returns {Promise<object>} { text, draft, trail, proposal, suggestions, usage, steps, limitReached }
 */
export async function runAgentLoop({
    config, system, history = [], userTurn, images = [], code, type, temperature,
    tools = TOOL_DEFINITIONS, signal, onEvent,
    streamTurn = defaultStreamTurn, validate, look, maxSteps = MAX_STEPS
}) {
    const toolDeps = { ...(validate ? { validate } : {}), ...(look ? { look } : {}) };
    const draft = createDraft(code, type);
    const messages = [
        ...history.map(m => textMessage(m.role === 'assistant' ? 'assistant' : 'user', m.content)),
        // Pictures go before the text, which is the order the providers recommend
        { role: 'user', parts: [...images.map(({ mimeType, data }) => ({ type: 'image', mimeType, data })), { type: 'text', text: userTurn }] }
    ];
    const trail = [];
    const usage = { inputTokens: 0, outputTokens: 0, calls: 0 };
    const textParts = [];
    let steps = 0;
    let limitReached = false;
    let cutOffRetried = false;

    const emitText = (current) => onEvent?.({ type: 'text', text: [...textParts, current].filter(Boolean).join('\n\n') });

    while (true) {
        if (steps >= maxSteps) {
            limitReached = true;
            break;
        }
        steps++;
        let stepText = '';
        let done = null;
        const calls = [];
        for await (const event of streamTurn(config, { system, messages, tools, temperature, signal })) {
            if (event.type === 'text') {
                stepText += event.text;
                emitText(stepText);
            } else if (event.type === 'tool_call') {
                calls.push(event);
            } else if (event.type === 'done') {
                done = event;
            }
        }
        usage.calls++;
        if (done) {
            usage.inputTokens += done.usage.inputTokens;
            usage.outputTokens += done.usage.outputTokens;
        }
        if (stepText.trim()) textParts.push(stepText.trim());
        if (done?.stopReason === 'blocked') {
            throw new LLMError(`The AI declined to answer (${done.finishReason || 'blocked'}). Try rewording the request.`, { provider: config.provider, code: 'BLOCKED' });
        }
        if (!calls.length) {
            if (done?.stopReason === 'max_tokens' && !cutOffRetried) {
                // The reply hit the length limit before a tool call was complete, so the call was lost.
                // Ask once for the change in smaller steps.
                cutOffRetried = true;
                const message = done.message;
                if (message?.parts?.length || message?.raw?.content?.length) messages.push(message);
                messages.push(textMessage('user', CUT_OFF_NOTE));
                continue;
            }
            if (done?.stopReason === 'max_tokens') {
                throw new LLMError('The AI reply was cut off because the reply reached the length limit. Ask for the change in smaller steps.', { provider: config.provider, code: 'MAX_TOKENS' });
            }
            break;
        }

        messages.push(done?.message || { role: 'assistant', parts: calls });
        const results = [];
        for (const call of calls) {
            signal?.throwIfAborted();
            const result = await runTool(draft, call, toolDeps);
            results.push({
                type: 'tool_result', id: call.id, name: call.name, content: result.content, isError: result.isError,
                ...(result.images?.length ? { images: result.images } : {})
            });
            if (result.step) {
                trail.push(result.step);
                onEvent?.({ type: 'step', step: result.step });
            }
        }
        signal?.throwIfAborted();
        // suggest_next_steps closes the turn. When a step holds only that call, the loop ends without
        // sending the acknowledgement back, which saves a model call.
        if (calls.every(c => c.name === 'suggest_next_steps')) break;
        if (results.some(r => r.images)) dropOlderRenders(messages);
        messages.push({ role: 'user', parts: results });
    }

    return {
        text: textParts.join('\n\n'),
        draft,
        trail,
        proposal: proposalOf(draft),
        suggestions: draft.suggestions,
        usage,
        steps,
        limitReached
    };
}

export const OLDER_RENDER_NOTE = 'This earlier render was removed to save space. A newer render follows.';

/**
 * Remove the pictures from earlier render_diagram results, because a newer render replaces them.
 * Every step resends the whole conversation, so each picture kept would be paid for again on every
 * later step. Pictures the user attached stay.
 */
export function dropOlderRenders(messages) {
    for (const message of messages) {
        if (message.role !== 'user') continue;
        for (const part of message.parts) {
            if (part.type !== 'tool_result' || !part.images) continue;
            delete part.images;
            part.content = typeof part.content === 'object' && part.content
                ? { ...part.content, note: OLDER_RENDER_NOTE }
                : OLDER_RENDER_NOTE;
        }
    }
}

/** The change for the user to review, or null when the draft is unchanged. */
export function proposalOf(draft) {
    if (draft.code === draft.baseCode && draft.type === draft.baseType) return null;
    const status = draft.validation?.status || 'unverified';
    return {
        type: draft.type,
        code: draft.code,
        baseCode: draft.baseCode,
        baseType: draft.baseType,
        status,
        verified: status === 'valid',
        error: draft.validation?.error || null,
        ...(draft.layout ? { layout: draft.layout } : {}),
        ...(draft.lint?.length ? { lint: draft.lint } : {})
    };
}
