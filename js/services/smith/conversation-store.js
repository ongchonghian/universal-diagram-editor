/**
 * Conversation storage for the Smith chat panel, in localStorage under universal_diagram_ai_conversations.
 *
 * Stored message shape:
 *   { role: 'user', content, pictures? }   pictures: the names of attached pictures. The pictures
 *                                          themselves stay in memory for the session only, because
 *                                          they would soon fill localStorage.
 *   { role: 'assistant', content, proposal?, trail?, suggestions?, limitReached?, isError?, isStopped? }
 *
 * Replies saved before the tool loop held a "[SUGGESTIONS]: [...]" line and fenced code. On load the
 * line moves into `suggestions`; the code stays in the text, and those replies offer no Apply button.
 */
const STORAGE_KEY = 'universal_diagram_ai_conversations';
const SUGGESTIONS_TAG = /\[SUGGESTIONS\]:\s*(\[[\s\S]*?\])/;

/** Move an old "[SUGGESTIONS]" line into the message's suggestions. */
export function upgradeMessage(message) {
    if (message?.role !== 'assistant' || typeof message.content !== 'string' || message.suggestions) return message;
    const match = message.content.match(SUGGESTIONS_TAG);
    if (!match) return message;
    let suggestions = [];
    try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) suggestions = parsed.filter(s => typeof s === 'string' && s.trim());
    } catch {
        // An unreadable tag is dropped from the text all the same
    }
    return { ...message, content: message.content.replace(match[0], '').trim(), suggestions };
}

function readAll() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        console.warn('[Smith] Ignoring unreadable stored conversations', e);
        return {};
    }
}

function writeAll(conversations) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
        // Usually a storage quota error. The chat keeps working; the conversation is not saved.
        console.warn('[Smith] Could not save conversations', e);
    }
}

/** The message as stored: attached pictures become a list of their names. */
export function storedMessage(message) {
    if (!message?.images?.length) return message;
    const { images, ...rest } = message;
    return { ...rest, pictures: images.map(image => image.name || 'picture') };
}

const titleFrom = (text) => text.slice(0, 30) + (text.length > 30 ? '...' : '');

export const conversationStore = {
    getAll() {
        return readAll();
    },

    get(id) {
        const conversation = readAll()[id];
        return conversation ? { ...conversation, messages: (conversation.messages || []).map(upgradeMessage) } : null;
    },

    create() {
        const id = Date.now().toString();
        const all = readAll();
        all[id] = { id, title: 'New Conversation', messages: [], lastModified: Date.now() };
        writeAll(all);
        return id;
    },

    remove(id) {
        const all = readAll();
        delete all[id];
        writeAll(all);
    },

    /** Replace a conversation's messages. */
    setMessages(id, messages) {
        const all = readAll();
        if (!all[id]) return;
        all[id].messages = messages.map(storedMessage);
        all[id].lastModified = Date.now();
        writeAll(all);
    },

    append(id, message) {
        const all = readAll();
        const conversation = all[id];
        if (!conversation) return;
        conversation.messages.push(storedMessage(message));
        if (message.role === 'user' && conversation.title === 'New Conversation') conversation.title = titleFrom(message.content);
        conversation.lastModified = Date.now();
        writeAll(all);
    }
};
