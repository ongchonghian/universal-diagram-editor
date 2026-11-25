/**
 * The provider-neutral model layer. See types.js for the message and event shapes.
 *
 * A config is { provider, model, apiKey, baseUrl? }.
 */
import { provider as gemini } from './providers/gemini.js';
import { provider as anthropic } from './providers/anthropic.js';
import { provider as openaiCompatible } from './providers/openai-compatible.js';
import { LLMError } from './types.js';

export { LLMError, textOf, textMessage } from './types.js';
export { normaliseBaseUrl } from './providers/openai-compatible.js';

export const PROVIDERS = {
    [gemini.id]: gemini,
    [anthropic.id]: anthropic,
    [openaiCompatible.id]: openaiCompatible
};

export const PROVIDER_IDS = Object.keys(PROVIDERS);

export function getProvider(id) {
    const provider = PROVIDERS[id];
    if (!provider) throw new LLMError(`Unknown provider "${id}".`, { provider: id, code: 'NOT_CONFIGURED' });
    return provider;
}

/** A sentence that says what the config still lacks, or null when the config is ready to use. */
export function missingSetting(config) {
    const provider = PROVIDERS[config?.provider];
    if (!provider) return 'Choose a provider in Syntext Smith settings.';
    if (provider.needsKey && !config.apiKey) return `Add your ${provider.label} API key in Syntext Smith settings.`;
    if (provider.needsBaseUrl && !config.baseUrl) return 'Add the base address of the OpenAI-compatible endpoint in Syntext Smith settings.';
    if (!config.model) return 'Choose a model in Syntext Smith settings.';
    return null;
}

/**
 * Send one turn and stream the reply.
 * @param {object} config   { provider, model, apiKey, baseUrl? }
 * @param {object} request  { system, messages, tools?, temperature?, maxTokens?, signal? }
 * @returns {AsyncGenerator} text, tool_call and done events
 */
export function streamTurn(config, request) {
    const missing = missingSetting(config);
    if (missing) throw new LLMError(missing, { provider: config?.provider, code: 'NOT_CONFIGURED' });
    return getProvider(config.provider).streamTurn(config, request);
}

/** The provider's current models, as [{ id, name }]. */
export function listModels(config, options) {
    return getProvider(config.provider).listModels(config, options);
}
