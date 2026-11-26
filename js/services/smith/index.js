/**
 * Smith's entry points for the chat panel, the Fix button and the evaluation set.
 */
import { aiService } from '../ai-service.js';
import { LLMError } from '../llm/index.js';
import { runAgentLoop } from './agent-loop.js';
import { TOOL_DEFINITIONS } from './tools.js';
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
 * Repair a diagram that fails to render. Works for every diagram type.
 * @param {object} options { code, type, error, signal, onEvent }
 */
export async function fixWithSmith({ code, type, error, signal, onEvent }) {
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
