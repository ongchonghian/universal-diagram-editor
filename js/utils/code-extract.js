/**
 * Shared extraction of fenced code blocks from an AI reply.
 * The chat validation loop, the auto-fix service and Apply Code all use this helper,
 * so all three read the same code from the same reply.
 */

const FENCE_REGEX = /```([\w+-]*)[ \t]*\r?\n([\s\S]*?)```/g;

/**
 * Find every fenced code block in a reply.
 * @param {string} text
 * @returns {Array<{raw: string, lang: string, code: string}>}
 */
export function extractCodeBlocks(text) {
    if (!text || typeof text !== 'string') return [];
    const blocks = [];
    for (const match of text.matchAll(FENCE_REGEX)) {
        const code = match[2].trim();
        if (code) {
            blocks.push({ raw: match[0], lang: match[1].toLowerCase(), code });
        }
    }
    return blocks;
}

/**
 * Find the diagram block in a reply.
 * A reply can hold a short example as well as the full diagram, so the longest block wins.
 * @param {string} text
 * @returns {{raw: string, lang: string, code: string}|null}
 */
export function extractCodeBlock(text) {
    const blocks = extractCodeBlocks(text);
    if (blocks.length === 0) return null;
    return blocks.reduce((longest, block) => (block.code.length > longest.code.length ? block : longest));
}
