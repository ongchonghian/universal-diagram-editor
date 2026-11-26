/**
 * Evaluation runner. Runs cases against a "path" (the way Smith answers) and builds a JSON report.
 *
 * Paths:
 *   loop  The tool loop (js/services/smith/): askSmith() for create and edit cases, and
 *         fixWithSmith() for fix cases. The chat panel and the Fix button use this path.
 *
 * The text-only "chat" path from before the tool loop was removed on 25 November 2026, after the
 * loop matched or beat its baseline in every group (evals/results/2026-11-25-*.json).
 *
 * Cases run one at a time. Running in sequence keeps the token count per case exact and stays
 * inside free-tier rate limits.
 */
import { aiService } from '../js/services/ai-service.js';
import { askSmith, fixWithSmith } from '../js/services/smith/index.js';
import { buildSystemPrompt } from '../js/services/smith/prompt.js';
import { validateDiagram } from '../js/services/diagram-tools/validate.js';
import { rendererAdapter } from '../js/services/RendererAdapter.js';
import { KROKI_BASE_URL } from '../js/config.js';
import { runChecks, outcomeOf } from './checks.js';

const caseModules = import.meta.glob('./cases/*.json', { eager: true, import: 'default' });
// Pictures for the image cases, as addresses the page can fetch
const fixtureUrls = import.meta.glob('./fixtures/*', { eager: true, query: '?url', import: 'default' });

/** Every case, in file order (one file per diagram group). */
export function loadCases() {
    return Object.keys(caseModules).sort().flatMap(path => caseModules[path]);
}

export const GROUPS = ['mermaid', 'plantuml', 'c4', 'bpmn', 'vega', 'graphviz', 'kroki', 'type-choice', 'image'];

const MIME_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

/** A case's picture (evals/fixtures/<name>) as an image part. */
export async function loadFixtureImage(name) {
    const url = fixtureUrls[`./fixtures/${name}`];
    if (!url) throw new Error(`The picture evals/fixtures/${name} is missing.`);
    const blob = await (await fetch(url)).blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { type: 'image', mimeType: MIME_TYPES[name.split('.').pop().toLowerCase()] || blob.type, data: btoa(binary), name };
}

/** The editor type a case runs under. */
export const editorTypeOf = (caseDef) => caseDef.editorType || caseDef.type;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** A short, stable fingerprint of the system prompts, so a report records which prompt it measured. */
export function promptVersion(cases) {
    const types = [...new Set(cases.map(editorTypeOf))].sort();
    const text = types.map(buildSystemPrompt).join('\n---\n');
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

const PATHS = {
    async loop(caseDef) {
        const editorType = editorTypeOf(caseDef);
        const code = caseDef.startCode || '';
        const result = caseDef.task === 'fix'
            ? await fixWithSmith({ code, type: editorType, error: (await validateDiagram(code, editorType, { requireLayout: editorType === 'bpmn' })).error })
            : await askSmith({ request: caseDef.prompt, images: caseDef.image ? [await loadFixtureImage(caseDef.image)] : [], code, type: editorType });
        // Only drafts the parser saw count; a rejected edit left the draft unchanged, and a look is not a check
        const checked = result.trail.filter(s => (s.action === 'edit' || s.action === 'write') && s.status !== 'rejected');
        const looks = result.trail.filter(s => s.action === 'look').length;
        const notes = [
            result.limitReached ? 'Reached the step limit.' : '',
            `${result.steps} model steps.`,
            looks ? `Looked at the render ${looks === 1 ? 'once' : `${looks} times`}.` : ''
        ].filter(Boolean).join(' ');
        if (!result.proposal) return { code: null, type: null, firstStatus: null, repairAttempts: 0, note: `The loop made no change. ${notes}` };
        return {
            code: result.proposal.code,
            type: result.proposal.type,
            firstStatus: caseDef.task === 'fix' ? null : (checked[0]?.status ?? null),
            repairAttempts: Math.max(0, checked.length - 1),
            looks,
            note: notes
        };
    }
};

export const PATH_NAMES = Object.keys(PATHS);

/**
 * Run one case.
 * @returns {Promise<object>} the case record for the report
 */
export async function runCase(caseDef, pathName) {
    const started = Date.now();
    const usageBefore = { ...aiService.usageTotals };
    const record = { id: caseDef.id, group: caseDef.group, type: caseDef.type, task: caseDef.task };
    try {
        const output = await PATHS[pathName](caseDef);
        record.outputType = output.type;
        record.firstStatus = output.firstStatus;
        record.repairAttempts = output.repairAttempts;
        record.looks = output.looks ?? 0;
        record.note = output.note;
        if (!output.code) {
            record.outcome = 'fail';
            record.checks = [];
        } else {
            record.checks = await runChecks(caseDef, output);
            record.outcome = outcomeOf(record.checks);
        }
        record.code = output.code;
    } catch (e) {
        // A provider or network fault: the case did not run, so it is reported apart from failures
        record.outcome = 'error';
        record.error = e?.message || String(e);
    }
    record.seconds = Math.round((Date.now() - started) / 100) / 10;
    record.inputTokens = aiService.usageTotals.inputTokens - usageBefore.inputTokens;
    record.outputTokens = aiService.usageTotals.outputTokens - usageBefore.outputTokens;
    record.modelCalls = aiService.usageTotals.calls - usageBefore.calls;
    return record;
}

const rate = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);

/** Headline numbers for a set of case records. */
export function summarise(records) {
    const count = (outcome) => records.filter(r => r.outcome === outcome).length;
    const ran = records.filter(r => r.outcome !== 'error');
    const firstAttempt = ran.filter(r => r.task !== 'fix');
    return {
        total: records.length,
        pass: count('pass'),
        fail: count('fail'),
        unverified: count('unverified'),
        error: count('error'),
        // Rates leave out cases that did not run (provider or network faults)
        passRate: rate(count('pass'), ran.length),
        firstAttemptParseRate: rate(firstAttempt.filter(r => r.firstStatus === 'valid').length, firstAttempt.length),
        inputTokens: records.reduce((sum, r) => sum + (r.inputTokens || 0), 0),
        outputTokens: records.reduce((sum, r) => sum + (r.outputTokens || 0), 0),
        seconds: Math.round(records.reduce((sum, r) => sum + (r.seconds || 0), 0))
    };
}

export function buildReport(records, { pathName, cases, startedAt }) {
    const settings = aiService.getSettings();
    const active = aiService.getActiveConfig();
    const byGroup = {};
    for (const group of GROUPS) {
        const inGroup = records.filter(r => r.group === group);
        if (inGroup.length) byGroup[group] = summarise(inGroup);
    }
    return {
        schema: 1,
        startedAt,
        finishedAt: new Date().toISOString(),
        provider: active.provider,
        model: active.model,
        temperature: Number(settings.temperature),
        path: pathName,
        promptVersion: promptVersion(cases),
        // Only whether a private server was used; the address itself stays out of committed reports
        krokiServer: rendererAdapter.getBaseUrl() === KROKI_BASE_URL ? 'public kroki.io' : 'custom',
        summary: summarise(records),
        byGroup,
        cases: records
    };
}

/**
 * Run a list of cases in sequence.
 * @param {object} options { pathName, delayMs, signal, onCase(record, index, total) }
 */
export async function runSuite(cases, { pathName = 'loop', delayMs = 1500, signal, onCase } = {}) {
    if (!PATHS[pathName]) throw new Error(`Unknown path "${pathName}". Known paths: ${PATH_NAMES.join(', ')}`);
    const startedAt = new Date().toISOString();
    const records = [];
    for (let i = 0; i < cases.length; i++) {
        if (signal?.aborted) break;
        const record = await runCase(cases[i], pathName);
        records.push(record);
        onCase?.(record, i, cases.length);
        if (i < cases.length - 1 && !signal?.aborted) await sleep(delayMs);
    }
    return buildReport(records, { pathName, cases, startedAt });
}
