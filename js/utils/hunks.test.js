import { describe, it, expect } from 'vitest';
import { mergeHunks, describeHunk, minimalEdit, mergedLineOf } from './hunks.js';

const original = ['flowchart TD', '  A --> B', '  B --> C', '  C --> D'].join('\n');
const modified = ['flowchart LR', '  A --> B', '  B --> X', '  X --> C', '  C --> D', '  D --> E'].join('\n');
// What Monaco's getLineChanges() reports for this pair
const hunks = [
    { originalStartLineNumber: 1, originalEndLineNumber: 1, modifiedStartLineNumber: 1, modifiedEndLineNumber: 1 },
    { originalStartLineNumber: 3, originalEndLineNumber: 3, modifiedStartLineNumber: 3, modifiedEndLineNumber: 4 },
    { originalStartLineNumber: 4, originalEndLineNumber: 0, modifiedStartLineNumber: 6, modifiedEndLineNumber: 6 }
];

describe('mergeHunks', () => {
    it('gives the proposal when every hunk is accepted, and the original when none is', () => {
        expect(mergeHunks(original, modified, hunks, () => true)).toBe(modified);
        expect(mergeHunks(original, modified, hunks, () => false)).toBe(original);
    });

    it('keeps only the accepted hunks', () => {
        const merged = mergeHunks(original, modified, hunks, i => i !== 0);
        expect(merged).toBe(['flowchart TD', '  A --> B', '  B --> X', '  X --> C', '  C --> D', '  D --> E'].join('\n'));
        expect(mergeHunks(original, modified, hunks, i => i === 2)).toBe(`${original}\n  D --> E`);
    });

    it('handles a deletion and an insertion at the start', () => {
        const deletion = [{ originalStartLineNumber: 2, originalEndLineNumber: 3, modifiedStartLineNumber: 1, modifiedEndLineNumber: 0 }];
        expect(mergeHunks(original, 'flowchart TD\n  C --> D', deletion, () => true)).toBe('flowchart TD\n  C --> D');
        expect(mergeHunks(original, 'flowchart TD\n  C --> D', deletion, () => false)).toBe(original);

        const atStart = [{ originalStartLineNumber: 0, originalEndLineNumber: 0, modifiedStartLineNumber: 1, modifiedEndLineNumber: 1 }];
        expect(mergeHunks(original, `%% title\n${original}`, atStart, () => true)).toBe(`%% title\n${original}`);
    });
});

describe('describeHunk', () => {
    it('names what each hunk does', () => {
        expect(hunks.map(describeHunk)).toEqual(['Line 1 changed', 'Line 3 changed', '1 line added after line 4']);
        expect(describeHunk({ originalStartLineNumber: 2, originalEndLineNumber: 3, modifiedStartLineNumber: 1, modifiedEndLineNumber: 0 })).toBe('Lines 2–3 removed');
    });
});

describe('minimalEdit', () => {
    it('replaces only the changed span', () => {
        expect(minimalEdit('A --> B\nB --> C', 'A --> B\nB --> D')).toEqual({ start: 14, end: 15, text: 'D' });
        expect(minimalEdit('abc', 'abXc')).toEqual({ start: 2, end: 2, text: 'X' });
        expect(minimalEdit('same', 'same')).toBeNull();
    });
});

describe('mergedLineOf', () => {
    it('finds where a hunk begins in the merged text', () => {
        // All accepted: the second hunk starts on line 3, the insertion after the four-line original shifts by one
        expect(mergedLineOf(hunks, 1, () => true)).toBe(3);
        expect(mergedLineOf(hunks, 2, () => true)).toBe(6);
        // With the second hunk rejected, the insertion moves up a line
        expect(mergedLineOf(hunks, 2, i => i !== 1)).toBe(5);
    });
});
