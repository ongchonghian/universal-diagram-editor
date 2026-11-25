/**
 * Smith's agent loop: send the turn, run the tool calls against the draft, send the results back,
 * and repeat until the model stops calling tools or the loop reaches its step limit.
 */
import { streamTurn as defaultStreamTurn, textMessage, LLMError } from '../llm/index.js';
import { TOOL_DEFINITIONS, createDraft, runTool } from './tools.js';

export const MAX_STEPS = 8;

/**
 * @param {object} options
 *   config       model config { provider, model, apiKey, baseUrl? }
 *   system       system prompt
 *   history      earlier turns as [{ role, content }] text messages
 *   userTurn     this turn's user text
 *   code, type   the editor's current diagram
 *   temperature
 *   tools        tool definitions (defaults to every Smith tool)
 *   signal       AbortSignal
 *   onEvent      called with { type: 'text', text } (the reply so far) and { type: 'step', step } (a trail entry)
 *   streamTurn, validate   replaceable for tests
 * @returns {Promise<object>} { text, draft, trail, proposal, suggestions, usage, steps, limitReached }
 */
export async function runAgentLoop({
    config, system, history = [], userTurn, code, type, temperature,
    tools = TOOL_DEFINITIONS, signal, onEvent,
    streamTurn = defaultStreamTurn, validate, maxSteps = MAX_STEPS
}) {
    const draft = createDraft(code, type);
    const messages = [
        ...history.map(m => textMessage(m.role === 'assistant' ? 'assistant' : 'user', m.content)),
        textMessage('user', userTurn)
    ];
    const trail = [];
    const usage = { inputTokens: 0, outputTokens: 0, calls: 0 };
    const textParts = [];
    let steps = 0;
    let limitReached = false;

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
            if (done?.stopReason === 'max_tokens') {
                throw new LLMError('The AI reply was cut off because the reply reached the length limit. Ask for the change in smaller steps.', { provider: config.provider, code: 'MAX_TOKENS' });
            }
            break;
        }

        messages.push(done?.message || { role: 'assistant', parts: calls });
        const results = [];
        for (const call of calls) {
            signal?.throwIfAborted();
            const result = await runTool(draft, call, validate ? { validate } : undefined);
            results.push({ type: 'tool_result', id: call.id, name: call.name, content: result.content, isError: result.isError });
            if (result.step) {
                trail.push(result.step);
                onEvent?.({ type: 'step', step: result.step });
            }
        }
        signal?.throwIfAborted();
        // suggest_next_steps closes the turn. When a step holds only that call, the loop ends without
        // sending the acknowledgement back, which saves a model call.
        if (calls.every(c => c.name === 'suggest_next_steps')) break;
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
        error: draft.validation?.error || null
    };
}
