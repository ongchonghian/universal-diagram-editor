/**
 * Controller for eval.html (development only).
 */
import { aiService } from '../js/services/ai-service.js';
import { PROVIDERS, PROVIDER_IDS } from '../js/services/llm/index.js';
import { loadCases, runSuite, summarise, GROUPS, PATH_NAMES } from './runner.js';

const $ = (id) => document.getElementById(id);
const allCases = loadCases();
let controller = null;
let lastReport = null;

const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const pct = (value) => (value === null || value === undefined ? '–' : `${value}%`);

function setup() {
    $('path').innerHTML = PATH_NAMES.map(p => `<option value="${p}">${({ chat: 'chat (text-only path, Phase 1 baseline)', loop: 'loop (tool loop, current Smith)' }[p] || p)}</option>`).join('');
    $('provider').innerHTML = PROVIDER_IDS.map(id => `<option value="${id}">${escapeHtml(PROVIDERS[id].label)}</option>`).join('');
    $('provider').value = aiService.getActiveConfig().provider;
    $('provider').addEventListener('change', () => {
        $('model').value = aiService.getSettings().providers[$('provider').value].model;
        updateKeyNotice();
    });
    $('model').value = aiService.getActiveConfig().model;
    $('api-key').addEventListener('input', updateKeyNotice);
    updateKeyNotice();

    const counts = Object.fromEntries(GROUPS.map(g => [g, allCases.filter(c => c.group === g).length]));
    $('groups').insertAdjacentHTML('beforeend', GROUPS.map(g =>
        `<label><input type="checkbox" name="group" value="${g}" checked> ${g} (${counts[g]})</label>`
    ).join(''));

    $('run').addEventListener('click', run);
    $('stop').addEventListener('click', () => controller?.abort());
    $('download').addEventListener('click', download);
    renderCases([]);
    renderSummary([]);
}

/** Apply this page's provider, model and key to the service in memory only; returns what is still missing. */
function applyRunSettings() {
    const provider = $('provider').value;
    const saved = aiService.getSettings().providers[provider];
    aiService.settings = {
        ...aiService.settings,
        provider,
        providers: {
            ...aiService.settings.providers,
            [provider]: { ...saved, model: $('model').value.trim() || saved.model, apiKey: $('api-key').value.trim() || saved.apiKey }
        }
    };
    return aiService.missingSetting();
}

function updateKeyNotice() {
    const provider = $('provider').value;
    const saved = aiService.getSettings().providers[provider];
    const needsKey = PROVIDERS[provider].needsKey && !saved.apiKey && !$('api-key').value.trim();
    $('key-notice').hidden = !needsKey;
    $('key-notice-text').textContent = needsKey ? `This page has no ${PROVIDERS[provider].label} API key.` : '';
}

function selectedCases() {
    const groups = new Set([...document.querySelectorAll('input[name=group]:checked')].map(i => i.value));
    const filter = $('filter').value.trim().toLowerCase();
    return allCases.filter(c => groups.has(c.group) && (!filter || c.id.toLowerCase().includes(filter)));
}

async function run() {
    const missing = applyRunSettings();
    if (missing) {
        $('progress').textContent = missing;
        updateKeyNotice();
        return;
    }
    const cases = selectedCases();
    if (!cases.length) {
        $('progress').textContent = 'The filters match no cases.';
        return;
    }

    controller = new AbortController();
    $('run').disabled = true;
    $('stop').disabled = false;
    $('download').disabled = true;
    const records = [];
    renderCases(records);

    try {
        lastReport = await runSuite(cases, {
            pathName: $('path').value,
            delayMs: Math.max(0, Number($('delay').value) || 0),
            signal: controller.signal,
            onCase: (record, index, total) => {
                records.push(record);
                $('progress').textContent = `${index + 1} of ${total} done. Last: ${record.id} (${record.outcome}).`;
                renderCases(records);
                renderSummary(records);
            }
        });
        $('progress').textContent = controller.signal.aborted
            ? `Stopped after ${records.length} of ${cases.length} cases. The report covers the cases that ran.`
            : `Finished ${records.length} cases.`;
        $('download').disabled = false;
    } catch (e) {
        $('progress').textContent = `The run stopped: ${e.message}`;
    } finally {
        $('run').disabled = false;
        $('stop').disabled = true;
        controller = null;
    }
}

function renderSummary(records) {
    const rows = [['All cases', summarise(records)], ...GROUPS
        .map(g => [g, records.filter(r => r.group === g)])
        .filter(([, rs]) => rs.length)
        .map(([g, rs]) => [g, summarise(rs)])];
    $('summary').innerHTML = `
        <thead><tr>
            <th scope="col">Group</th><th scope="col" class="num">Cases</th><th scope="col" class="num">Pass</th>
            <th scope="col" class="num">Fail</th><th scope="col" class="num">Unverified</th><th scope="col" class="num">Error</th>
            <th scope="col" class="num">Pass rate</th><th scope="col" class="num">First-attempt parse</th>
            <th scope="col" class="num">Tokens in / out</th><th scope="col" class="num">Seconds</th>
        </tr></thead>
        <tbody>${records.length ? rows.map(([name, s]) => `<tr>
            <th scope="row">${escapeHtml(name)}</th><td class="num">${s.total}</td><td class="num">${s.pass}</td>
            <td class="num">${s.fail}</td><td class="num">${s.unverified}</td><td class="num">${s.error}</td>
            <td class="num">${pct(s.passRate)}</td><td class="num">${pct(s.firstAttemptParseRate)}</td>
            <td class="num">${s.inputTokens} / ${s.outputTokens}</td><td class="num">${s.seconds}</td>
        </tr>`).join('') : '<tr><td colspan="10">Run the cases to see a summary.</td></tr>'}</tbody>`;
}

function renderCases(records) {
    const byId = new Map(records.map(r => [r.id, r]));
    const cases = selectedCases();
    $('cases').innerHTML = `
        <thead><tr>
            <th scope="col">Case</th><th scope="col">Task</th><th scope="col">Outcome</th>
            <th scope="col">Checks</th><th scope="col" class="num">Seconds</th><th scope="col">Detail</th>
        </tr></thead>
        <tbody>${cases.map(c => {
            const r = byId.get(c.id);
            if (!r) return `<tr><th scope="row">${escapeHtml(c.id)}</th><td>${c.task}</td><td>–</td><td></td><td></td><td></td></tr>`;
            const checks = (r.checks || []).map(k => `<span class="outcome ${k.status}" title="${escapeHtml(k.detail)}">${escapeHtml(k.name)}</span>`).join(' ');
            const failures = (r.checks || []).filter(k => k.status !== 'pass').map(k => `${k.name}: ${k.detail}`);
            const detail = [r.error, r.note, ...failures].filter(Boolean).join('\n');
            return `<tr>
                <th scope="row">${escapeHtml(r.id)}</th><td>${r.task}</td>
                <td class="outcome ${r.outcome}">${r.outcome}</td><td>${checks}</td><td class="num">${r.seconds}</td>
                <td>${detail || r.code ? `<details><summary>Show</summary>${detail ? `<pre>${escapeHtml(detail)}</pre>` : ''}${r.code ? `<pre>${escapeHtml(r.code)}</pre>` : ''}</details>` : ''}</td>
            </tr>`;
        }).join('')}</tbody>`;
}

function download() {
    if (!lastReport) return;
    const date = lastReport.startedAt.slice(0, 10);
    const name = `${date}-${lastReport.path}-${lastReport.model}.json`.replace(/[^\w.-]+/g, '-');
    const blob = new Blob([JSON.stringify(lastReport, null, 2) + '\n'], { type: 'application/json' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
    link.click();
    URL.revokeObjectURL(link.href);
}

setup();
