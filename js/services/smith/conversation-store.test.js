import { describe, it, expect, beforeEach } from 'vitest';
import { conversationStore, upgradeMessage } from './conversation-store.js';
import { historyOf } from './index.js';

beforeEach(() => localStorage.clear());

describe('conversation store', () => {
    it('moves an old [SUGGESTIONS] line into suggestions', () => {
        const old = { role: 'assistant', content: 'Pick one.\n[SUGGESTIONS]: ["Flowchart", "Sequence"]' };
        expect(upgradeMessage(old)).toEqual({ role: 'assistant', content: 'Pick one.', suggestions: ['Flowchart', 'Sequence'] });
        expect(upgradeMessage({ role: 'user', content: '[SUGGESTIONS]: ["x"]' }).content).toBe('[SUGGESTIONS]: ["x"]');
    });

    it('upgrades old messages on load and names a conversation after its first request', () => {
        const id = conversationStore.create();
        conversationStore.append(id, { role: 'user', content: 'Draw the order process for the warehouse team' });
        conversationStore.append(id, { role: 'assistant', content: 'Done.\n[SUGGESTIONS]: ["Add lanes"]' });
        const convo = conversationStore.get(id);
        expect(convo.title).toBe('Draw the order process for the...');
        expect(convo.messages[1].suggestions).toEqual(['Add lanes']);
    });

    it('stores the names of attached pictures, never the pictures', () => {
        const id = conversationStore.create();
        conversationStore.append(id, { role: 'user', content: 'Copy this', images: [{ type: 'image', mimeType: 'image/png', data: 'AAAA', name: 'board.png' }] });
        expect(conversationStore.get(id).messages[0]).toEqual({ role: 'user', content: 'Copy this', pictures: ['board.png'] });
        expect(localStorage.getItem('universal_diagram_ai_conversations')).not.toContain('AAAA');
    });

    it('ignores unreadable stored conversations', () => {
        localStorage.setItem('universal_diagram_ai_conversations', '{broken');
        expect(conversationStore.getAll()).toEqual({});
    });
});

describe('historyOf', () => {
    it('keeps only real turns', () => {
        expect(historyOf([
            { role: 'user', content: 'a' },
            { role: 'assistant', content: 'Error: x', isError: true },
            { role: 'assistant', content: 'part', isStopped: true },
            { role: 'assistant', content: 'b', proposal: { code: 'x' } }
        ])).toEqual([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }]);
    });

    it('notes pictures from earlier turns instead of sending them again', () => {
        expect(historyOf([{ role: 'user', content: 'Copy this', pictures: ['a.png', 'b.png'] }])[0].content)
            .toBe('Copy this\n\n(The user attached 2 pictures to this message.)');
    });
});
