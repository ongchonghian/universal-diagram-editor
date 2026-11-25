/**
 * Evaluation runner. Runs cases against a "path" (the way Smith answers) and builds a JSON report.
 *
 * Paths:
 *   chat  The current Smith: aiService.chat() for create and edit cases, and the Auto-Fix button's
 *         aiService.fixDiagramWithResult() for fix cases.
 * Phase 3 of the rebuild adds the tool loop as a second path.
 *
 * Cases run one at a time. Running in sequence keeps the token count per case exact and stays
 * inside free-tier rate limits.
 */
import { aiService } from '../js/services/ai-service.js';
import { extractCodeBlock } from '../js/utils/code-extract.js';
import { validateDiagram } from '../js/services/diagram-tools/validate.js';
import { rendererAdapter } from '../js/services/RendererAdapter.js';
import { KROKI_BASE_URL } from '../js/config.js';
import { runChecks, outcomeOf } from './checks.js';

const caseModules = import.meta.glob('./cases/*.json', { eager: true, import: 'default' });

/** Every case, in file order (one file per diagram group). */
export function loadCases() {
    return Object.keys(caseModules).sort().flatMap(path => caseModules[path]);
}

export const GROUPS = ['mermaid', 'plantuml', 'c4', 'bpmn', 'vega', 'graphviz', 'kroki', 'type-choice'];

/** The editor type a case runs under. */
export const editorTypeOf = (caseDef) => caseDef.editorType || caseDef.type;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** A short, stable fingerprint of the system prompts, so a report records which prompt it measured. */
export function promptVersion(cases) {
    const types = [...new Set(cases.map(editorTypeOf))].sort();
    const text = types.map(t => aiService.getSystemPrompt(t)).join('\n---\n');
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

const PATHS = {
    async chat(caseDef) {
        const editorType = editorTypeOf(caseDef);
        if (caseDef.task === 'fix') {
            const before = await validateDiagram(caseDef.startCode, editorType, { requireLayout: editorType === 'bpmn' });
            const result = await aiService.fixDiagramWithResult(caseDef.startCode, before.error, editorType);
            return { code: result.code, type: editorType, firstStatus: null, repairAttempts: null, note: result.reason || '' };
        }

        const trace = {};
        const reply = await aiService.chat(caseDef.prompt, [], caseDef.startCode || '', editorType, trace);
        const block = extractCodeBlock(reply);
        if (!block) return { code: null, type: null, firstStatus: null, repairAttempts: 0, note: 'The reply held no code block.' };
        // A case without a fixed type lets the reply choose the notation
        const type = caseDef.type || trace.language || aiService.resolveLanguage(block, editorType);
        return { code: block.code, type, firstStatus: trace.firstStatus ?? null, repairAttempts: trace.repairAttempts ?? 0, note: '' };
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
    const byGroup = {};
    for (const group of GROUPS) {
        const inGroup = records.filter(r => r.group === group);
        if (inGroup.length) byGroup[group] = summarise(inGroup);
    }
    return {
        schema: 1,
        startedAt,
        finishedAt: new Date().toISOString(),
        provider: settings.provider,
        model: settings.model,
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
export async function runSuite(cases, { pathName = 'chat', delayMs = 1500, signal, onCase } = {}) {
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
