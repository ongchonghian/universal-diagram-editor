/**
 * Hunk logic for reviewing a proposed change one part at a time.
 *
 * A hunk is one entry of Monaco's diffEditor.getLineChanges(), with 1-based line numbers:
 *   { originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber }
 * An end line number of 0 means the side holds no lines: an insertion when the original end is 0,
 * a deletion when the modified end is 0. The start number then names the line after which the
 * change sits.
 */

const splitLines = (text) => (text ?? '').split('\n');

/** The original lines a hunk replaces, as a 0-based [start, end) range. */
function originalRange(hunk) {
    if (hunk.originalEndLineNumber === 0) return [hunk.originalStartLineNumber, hunk.originalStartLineNumber];
    return [hunk.originalStartLineNumber - 1, hunk.originalEndLineNumber];
}

/** The modified lines a hunk brings in. */
function modifiedLines(hunk, lines) {
    if (hunk.modifiedEndLineNumber === 0) return [];
    return lines.slice(hunk.modifiedStartLineNumber - 1, hunk.modifiedEndLineNumber);
}

/**
 * Build the text that keeps the accepted hunks and drops the rejected ones.
 * @param {string} original  the editor's current code
 * @param {string} modified  the proposal
 * @param {Array} hunks      getLineChanges() between original and modified
 * @param {(index: number) => boolean} isAccepted
 */
export function mergeHunks(original, modified, hunks, isAccepted) {
    const oldLines = splitLines(original);
    const newLines = splitLines(modified);
    const out = [];
    let cursor = 0;
    const ordered = hunks.map((hunk, index) => ({ hunk, index }))
        .sort((a, b) => originalRange(a.hunk)[0] - originalRange(b.hunk)[0]);
    for (const { hunk, index } of ordered) {
        const [start, end] = originalRange(hunk);
        out.push(...oldLines.slice(cursor, start));
        out.push(...(isAccepted(index) ? modifiedLines(hunk, newLines) : oldLines.slice(start, end)));
        cursor = end;
    }
    out.push(...oldLines.slice(cursor));
    return out.join('\n');
}

/** The 1-based line in the merged text where a hunk begins, for scrolling to that hunk. */
export function mergedLineOf(hunks, index, isAccepted) {
    const size = (h, accepted) => {
        const [start, end] = originalRange(h);
        const added = h.modifiedEndLineNumber === 0 ? 0 : h.modifiedEndLineNumber - h.modifiedStartLineNumber + 1;
        return accepted ? added - (end - start) : 0;
    };
    const target = originalRange(hunks[index])[0];
    let shift = 0;
    hunks.forEach((h, i) => {
        if (i !== index && originalRange(h)[0] < target) shift += size(h, isAccepted(i));
    });
    return Math.max(1, target + shift + 1);
}

/** A short label for a hunk, such as "Lines 4–6 changed", "Added after line 3" or "Lines 7–8 removed". */
export function describeHunk(hunk) {
    const range = (start, end) => (start === end ? `Line ${start}` : `Lines ${start}–${end}`);
    if (hunk.originalEndLineNumber === 0) {
        const count = hunk.modifiedEndLineNumber - hunk.modifiedStartLineNumber + 1;
        const where = hunk.originalStartLineNumber === 0 ? 'at the start' : `after line ${hunk.originalStartLineNumber}`;
        return `${count === 1 ? '1 line' : `${count} lines`} added ${where}`;
    }
    if (hunk.modifiedEndLineNumber === 0) return `${range(hunk.originalStartLineNumber, hunk.originalEndLineNumber)} removed`;
    return `${range(hunk.originalStartLineNumber, hunk.originalEndLineNumber)} changed`;
}

/**
 * The smallest single replacement that turns one text into another, as character offsets.
 * Applying only the changed span keeps the cursor and scroll position where they are.
 * @returns {{ start: number, end: number, text: string } | null}  null when the texts are equal
 */
export function minimalEdit(oldText, newText) {
    if (oldText === newText) return null;
    let start = 0;
    const max = Math.min(oldText.length, newText.length);
    while (start < max && oldText[start] === newText[start]) start++;
    let oldEnd = oldText.length;
    let newEnd = newText.length;
    while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
        oldEnd--;
        newEnd--;
    }
    return { start, end: oldEnd, text: newText.slice(start, newEnd) };
}
