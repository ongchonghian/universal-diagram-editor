import { describe, it, expect, vi } from 'vitest';

vi.mock('../RendererAdapter.js', () => ({
    rendererAdapter: { render: vi.fn().mockResolvedValue({ svg: '<svg><rect/></svg>', error: null }) }
}));

import { runAgentLoop, proposalOf, CUT_OFF_NOTE } from './agent-loop.js';
import { applyEdits, runTool, createDraft, numberLines } from './tools.js';

const config = { provider: 'gemini', model: 'm', apiKey: 'k' };

/** A fake provider that plays one scripted step per call and records what it was sent. */
function fakeProvider(script) {
    const requests = [];
    let i = 0;
    async function* streamTurn(_config, request) {
        requests.push(JSON.parse(JSON.stringify(request.messages)));
        const step = script[i++] || { text: 'Done.' };
        if (step.text) yield { type: 'text', text: step.text };
        const calls = (step.calls || []).map((c, n) => ({ type: 'tool_call', id: `c${i}-${n}`, ...c }));
        for (const c of calls) yield c;
        yield {
            type: 'done',
            stopReason: step.stopReason || (calls.length ? 'tool_use' : 'end'),
            usage: { inputTokens: 10, outputTokens: 5 },
            message: { role: 'assistant', parts: [...(step.text ? [{ type: 'text', text: step.text }] : []), ...calls] }
        };
    }
    return { streamTurn, requests };
}

const validDummy = vi.fn(async (code) => (code.includes('BROKEN')
    ? { valid: false, status: 'invalid', error: 'Parse error on line 2', line: 2 }
    : { valid: true, status: 'valid', error: null, line: null }));

describe('applyEdits', () => {
    it('applies replacements in order', () => {
        expect(applyEdits('A --> B\nB --> C', [{ old_text: 'B --> C', new_text: 'B --> D' }, { old_text: 'D', new_text: 'E' }])).toEqual({ code: 'A --> B\nB --> E' });
    });

    it('refuses text that is missing or appears twice, and changes nothing', () => {
        expect(applyEdits('A --> B', [{ old_text: 'X', new_text: 'Y' }]).error).toMatch(/not found/);
        expect(applyEdits('B --> B', [{ old_text: 'B', new_text: 'C' }]).error).toMatch(/appears 2 times/);
        expect(applyEdits('A --> B', [{ old_text: 'A', new_text: 'Z' }, { old_text: 'missing', new_text: '' }]).error).toMatch(/^Edit 2: .*No edits were applied/);
    });

    it('refuses an empty edit list or an empty old_text', () => {
        expect(applyEdits('A', []).error).toBeTruthy();
        expect(applyEdits('A', [{ old_text: '', new_text: 'B' }]).error).toMatch(/write_diagram/);
    });
});

describe('runTool', () => {
    it('reads the draft with line numbers', async () => {
        const draft = createDraft('flowchart TD\n  A --> B', 'mermaid');
        const result = await runTool(draft, { name: 'read_diagram', args: {} });
        expect(result.content.code).toBe(numberLines('flowchart TD\n  A --> B'));
        expect(result.content.code.split('\n')[1]).toBe('2|   A --> B');
    });

    it('rejects an unknown type and input that was cut off', async () => {
        const draft = createDraft('', 'mermaid');
        expect((await runTool(draft, { name: 'write_diagram', args: { type: 'visio', code: 'x' } })).isError).toBe(true);
        expect((await runTool(draft, { name: 'edit_diagram', args: {}, invalidArgs: '{"ed' })).content).toMatch(/cut off/);
    });

    it('validates a written diagram with the real validator', async () => {
        const draft = createDraft('', 'mermaid');
        const result = await runTool(draft, { name: 'write_diagram', args: { type: 'mermaid', code: '```mermaid\nflowchart TD\n  A --> B\n```' } });
        expect(result.content).toEqual({ status: 'valid' });
        expect(draft.code).toBe('flowchart TD\n  A --> B');
    });
});

describe('runAgentLoop', () => {
    it('writes, repairs after the parser error, and returns a verified proposal', async () => {
        const { streamTurn, requests } = fakeProvider([
            { text: 'Drafting.', calls: [{ name: 'write_diagram', args: { type: 'mermaid', code: 'flowchart TD\n BROKEN' } }] },
            { calls: [{ name: 'edit_diagram', args: { edits: [{ old_text: 'BROKEN', new_text: 'A --> B' }] } }] },
            { text: 'Added A and B.', calls: [{ name: 'suggest_next_steps', args: { suggestions: ['Add C', ' ', 'Colour A'] } }] },
            { text: 'This step should never be requested.' }
        ]);
        const events = [];
        const result = await runAgentLoop({ config, system: 's', userTurn: 'Draw A to B', code: '', type: 'mermaid', streamTurn, validate: validDummy, onEvent: e => events.push(e) });

        expect(result.trail).toEqual([
            { action: 'write', type: 'mermaid', status: 'invalid', error: 'Parse error on line 2' },
            { action: 'edit', status: 'valid', error: null }
        ]);
        expect(result.proposal).toMatchObject({ type: 'mermaid', code: 'flowchart TD\n A --> B', verified: true, baseCode: '' });
        expect(result.suggestions).toEqual(['Add C', 'Colour A']);
        expect(result.text).toBe('Drafting.\n\nAdded A and B.');
        // suggest_next_steps ends the turn, so the loop made three model calls, not four
        expect(result.usage).toEqual({ inputTokens: 30, outputTokens: 15, calls: 3 });
        expect(requests).toHaveLength(3);
        // The parser error went back to the model as the tool result
        expect(requests[1].at(-1).parts[0]).toMatchObject({ type: 'tool_result', name: 'write_diagram', content: { status: 'invalid', error: 'Parse error on line 2', line: 2 } });
        expect(events.filter(e => e.type === 'step')).toHaveLength(2);
    });

    it('sends earlier turns as text, then the user turn', async () => {
        const { streamTurn, requests } = fakeProvider([{ text: 'Which notation?' }]);
        const result = await runAgentLoop({ config, history: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }], userTurn: 'Draw', code: '', type: 'mermaid', streamTurn });
        expect(requests[0].map(m => m.role)).toEqual(['user', 'assistant', 'user']);
        expect(result.proposal).toBeNull();
        expect(result.text).toBe('Which notation?');
    });

    it('stops at the step limit and marks an invalid draft as not verified', async () => {
        const looping = Array.from({ length: 10 }, () => ({ calls: [{ name: 'write_diagram', args: { type: 'mermaid', code: 'BROKEN' } }] }));
        const { streamTurn } = fakeProvider(looping);
        const result = await runAgentLoop({ config, userTurn: 'x', code: '', type: 'mermaid', streamTurn, validate: validDummy, maxSteps: 3 });
        expect(result.limitReached).toBe(true);
        expect(result.steps).toBe(3);
        expect(result.proposal).toMatchObject({ verified: false, status: 'invalid' });
    });

    it('returns a rejected edit to the model as an error result', async () => {
        const { streamTurn, requests } = fakeProvider([
            { calls: [{ name: 'edit_diagram', args: { edits: [{ old_text: 'nope', new_text: 'x' }] } }] },
            { text: 'Sorry.' }
        ]);
        const result = await runAgentLoop({ config, userTurn: 'x', code: 'A --> B', type: 'mermaid', streamTurn, validate: validDummy });
        expect(requests[1].at(-1).parts[0]).toMatchObject({ isError: true, content: expect.stringContaining('not found') });
        expect(result.trail[0].status).toBe('rejected');
        expect(result.proposal).toBeNull();
    });

    it('asks once for smaller steps after a cut-off reply, then gives up on a second one', async () => {
        const recovering = fakeProvider([
            { text: 'Writing the full diagram', stopReason: 'max_tokens' },
            { calls: [{ name: 'write_diagram', args: { type: 'mermaid', code: 'flowchart TD\n A --> B' } }] },
            { text: 'Done.' }
        ]);
        const result = await runAgentLoop({ config, userTurn: 'x', code: '', type: 'mermaid', streamTurn: recovering.streamTurn, validate: validDummy });
        expect(recovering.requests[1].at(-1)).toMatchObject({ role: 'user', parts: [{ type: 'text', text: CUT_OFF_NOTE }] });
        expect(recovering.requests[1].at(-2).role).toBe('assistant');
        expect(result.proposal).toMatchObject({ verified: true });

        const cutTwice = fakeProvider([{ text: 'a', stopReason: 'max_tokens' }, { text: 'b', stopReason: 'max_tokens' }]);
        await expect(runAgentLoop({ config, userTurn: 'x', code: '', type: 'mermaid', streamTurn: cutTwice.streamTurn })).rejects.toMatchObject({ code: 'MAX_TOKENS' });
    });

    it('sends attached pictures before the text, and the rendered picture with the tool result', async () => {
        const picture = { type: 'image', mimeType: 'image/jpeg', data: 'photo', name: 'whiteboard.jpg', width: 10, height: 10 };
        const render = { type: 'image', mimeType: 'image/png', data: 'render' };
        const look = vi.fn(async () => ({ image: render, width: 800, height: 600 }));
        const { streamTurn, requests } = fakeProvider([
            { calls: [{ name: 'write_diagram', args: { type: 'mermaid', code: 'flowchart TD\n A --> B' } }] },
            { calls: [{ name: 'render_diagram', args: {} }] },
            { text: 'Copied the sketch.' }
        ]);
        const result = await runAgentLoop({ config, userTurn: 'Turn this into a flowchart', images: [picture], code: '', type: 'mermaid', streamTurn, validate: validDummy, look });

        // Only the picture's type and data go to the model
        expect(requests[0][0].parts).toEqual([{ type: 'image', mimeType: 'image/jpeg', data: 'photo' }, { type: 'text', text: 'Turn this into a flowchart' }]);
        expect(look).toHaveBeenCalledWith('flowchart TD\n A --> B', 'mermaid');
        expect(requests[2].at(-1).parts[0]).toMatchObject({ name: 'render_diagram', content: { status: 'rendered' }, images: [render] });
        expect(result.trail.at(-1)).toEqual({ action: 'look', status: 'rendered' });
    });

    it('returns a render failure to the model as an error result', async () => {
        const draft = createDraft('flowchart TD\n A --> B', 'mermaid');
        const failed = await runTool(draft, { name: 'render_diagram', args: {} }, { look: async () => ({ error: 'Kroki is down' }) });
        expect(failed).toMatchObject({ isError: true, step: { action: 'look', status: 'failed', error: 'Kroki is down' } });
        expect((await runTool(createDraft('', 'mermaid'), { name: 'render_diagram', args: {} })).isError).toBe(true);
    });

    it('throws when the provider declines, and when the signal aborts', async () => {
        const blocked = fakeProvider([{ text: '', stopReason: 'blocked' }]);
        await expect(runAgentLoop({ config, userTurn: 'x', code: '', type: 'mermaid', streamTurn: blocked.streamTurn })).rejects.toMatchObject({ code: 'BLOCKED' });

        const controller = new AbortController();
        const aborting = fakeProvider([{ calls: [{ name: 'write_diagram', args: { type: 'mermaid', code: 'A' } }] }]);
        const validateThenAbort = vi.fn(async () => { controller.abort(); return { valid: true, status: 'valid' }; });
        await expect(runAgentLoop({ config, userTurn: 'x', code: '', type: 'mermaid', streamTurn: aborting.streamTurn, validate: validateThenAbort, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    });
});

describe('proposalOf', () => {
    it('reports a change of notation even when the code is the same', () => {
        const draft = createDraft('x', 'mermaid');
        draft.type = 'plantuml';
        expect(proposalOf(draft)).toMatchObject({ type: 'plantuml', baseType: 'mermaid', status: 'unverified', verified: false });
    });
});
