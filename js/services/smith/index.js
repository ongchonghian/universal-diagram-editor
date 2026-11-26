/**
 * Smith's entry points for the chat panel, the Fix button and the evaluation set.
 */
import { aiService } from '../ai-service.js';
import { LLMError } from '../llm/index.js';
import { runAgentLoop, proposalOf } from './agent-loop.js';
import { TOOL_DEFINITIONS, createDraft } from './tools.js';
import { validateDiagram } from '../diagram-tools/validate.js';
import { hasLayout, layoutBpmn } from '../diagram-tools/bpmn-pipeline.js';
import { buildSystemPrompt, buildUserTurn, buildFixTurn } from './prompt.js';

function readyConfig() {
    const missing = aiService.missingSetting();
    if (missing) throw new LLMError(missing, { provider: aiService.getActiveConfig().provider, code: 'NOT_CONFIGURED' });
    return aiService.getActiveConfig();
}

/** Add a loop's tokens to the running totals that the evaluation set reads. */
function countUsage(usage) {
    aiService.usageTotals.inputTokens += usage.inputTokens;
    aiService.usageTotals.outputTokens += usage.outputTokens;
    aiService.usageTotals.calls += usage.calls;
}

/** How many pictures a chat message carried, in memory or as stored names. */
const pictureCount = (m) => m.images?.length || m.pictures?.length || 0;

/**
 * Earlier turns as text. Error notices, stopped replies and empty turns are not model turns.
 * Pictures from earlier turns are not sent again; a note says that the user attached them.
 */
export function historyOf(messages) {
    return messages
        .filter(m => (m.role === 'user' || m.role === 'assistant') && !m.isError && !m.isStopped && m.content?.trim())
        .map(m => {
            const count = pictureCount(m);
            const note = count ? `\n\n(The user attached ${count === 1 ? 'a picture' : `${count} pictures`} to this message.)` : '';
            return { role: m.role, content: m.content + note };
        });
}

/**
 * Answer a chat request.
 * @param {object} options { request, images (attached image parts), messages (earlier chat messages), code, type, signal, onEvent }
 */
export async function askSmith({ request, images = [], messages = [], code, type, signal, onEvent }) {
    const config = readyConfig();
    const result = await runAgentLoop({
        config,
        system: buildSystemPrompt(type),
        history: historyOf(messages),
        userTurn: buildUserTurn(request, code, type),
        images,
        code,
        type,
        temperature: Number(aiService.getSettings().temperature),
        signal,
        onEvent
    });
    countUsage(result.usage);
    return result;
}

/**
 * BPMN that parses but has no layout section needs a layout, not a model: the app lays the diagram out.
 * @returns {Promise<object|null>} a result shaped like runAgentLoop's, or null when this repair does not apply
 */
export async function layoutOnly(code, type) {
    if (type !== 'bpmn' || !code?.trim() || hasLayout(code)) return null;
    if ((await validateDiagram(code, 'bpmn')).status !== 'valid') return null;
    const draft = createDraft(code, 'bpmn');
    try {
        draft.code = await layoutBpmn(code);
    } catch {
        return null;
    }
    draft.layout = 'created';
    draft.validation = await validateDiagram(draft.code, 'bpmn', { requireLayout: true });
    const step = { action: 'layout', status: draft.validation.status, error: draft.validation.error, layout: 'created' };
    return {
        text: 'The diagram had no layout section, so the app laid the diagram out. The AI was not needed.',
        draft,
        trail: [step],
        proposal: proposalOf(draft),
        suggestions: [],
        usage: { inputTokens: 0, outputTokens: 0, calls: 0 },
        steps: 0,
        limitReached: false
    };
}

/**
 * Repair a diagram that fails to render. Works for every diagram type.
 * @param {object} options { code, type, error, signal, onEvent }
 */
export async function fixWithSmith({ code, type, error, signal, onEvent }) {
    const laidOut = await layoutOnly(code, type);
    if (laidOut) return laidOut;
    const config = readyConfig();
    const result = await runAgentLoop({
        config,
        system: buildSystemPrompt(type),
        userTurn: buildFixTurn(code, type, error),
        code,
        type,
        // A low temperature, because a repair should change as little as possible
        temperature: 0,
        // A repair needs a valid diagram only, so the Fix button neither looks at the picture nor suggests
        tools: TOOL_DEFINITIONS.filter(t => t.name !== 'suggest_next_steps' && t.name !== 'render_diagram'),
        signal,
        onEvent
    });
    countUsage(result.usage);
    return result;
}
