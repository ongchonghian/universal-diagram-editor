// Runs the Archify renderer installed on this computer. Node only.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readArchifyDocument } from '../js/services/archify.js';

export const ARCHIFY_MISSING_MESSAGE =
    'The editor could not find Archify on this computer. Install the Archify skill, or set ARCHIFY_HOME to the Archify folder, then restart the editor.';

const RENDER_TIMEOUT_MS = 30000;

const hasCli = (home) => existsSync(path.join(home, 'bin', 'archify.mjs'));

/**
 * The folder that holds Archify: ARCHIFY_HOME when it is set, otherwise the folders where the skill installs.
 * @returns {string|null}
 */
export function findArchifyHome(env = process.env, homeDir = os.homedir()) {
    if (env.ARCHIFY_HOME) return hasCli(env.ARCHIFY_HOME) ? env.ARCHIFY_HOME : null;
    const candidates = [
        path.join(homeDir, '.claude', 'skills', 'archify'),
        path.join(homeDir, '.agents', 'skills', 'archify')
    ];
    return candidates.find(hasCli) || null;
}

const run = (file, args, options) => new Promise((resolve) => {
    execFile(file, args, options, (error, stdout, stderr) => resolve({ error, stdout, stderr }));
});

/** Keep Archify's own diagnostics ("[code] message Fix: …") when it prints them; otherwise keep its whole message. */
const readableError = (output, tempDir) => {
    const lines = output.split(tempDir).join('').split('\n').map(l => l.trimEnd()).filter(l => l.trim());
    const diagnostics = lines.filter(l => /^\[[\w/.-]+\]/.test(l));
    return (diagnostics.length ? diagnostics : lines).join('\n') || 'Archify could not draw the diagram.';
};

/**
 * Draw Archify code as a standalone HTML page.
 * @returns {Promise<{ok: true, html: string} | {ok: false, code: string, error: string, line?: number|null}>}
 */
export async function renderArchifyDocument(content, { home = findArchifyHome() } = {}) {
    const doc = readArchifyDocument(content);
    if (doc.error) return { ok: false, code: 'invalid-document', error: doc.error, line: doc.line };
    if (!home) return { ok: false, code: 'archify-missing', error: ARCHIFY_MISSING_MESSAGE };

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'diagram-editor-archify-'));
    try {
        const input = path.join(tempDir, 'diagram.json');
        const output = path.join(tempDir, 'diagram.html');
        await fs.writeFile(input, content, 'utf8');

        // The diagram kind comes from a fixed list, and the code travels in a file, so the command line holds no user text
        const { error, stdout, stderr } = await run(
            process.execPath,
            [path.join(home, 'bin', 'archify.mjs'), 'render', doc.type, input, output],
            { cwd: tempDir, timeout: RENDER_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 }
        );
        if (error) {
            if (error.killed) return { ok: false, code: 'timeout', error: 'Archify took longer than 30 seconds to draw the diagram.' };
            return { ok: false, code: 'render-failed', error: readableError(`${stderr}\n${stdout}`, tempDir) };
        }
        return { ok: true, html: await fs.readFile(output, 'utf8') };
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}
