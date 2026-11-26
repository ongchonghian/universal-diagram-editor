/**
 * Pass checks for evaluation cases.
 *
 * A case lists its checks, for example:
 *   ["parses", "renders", { "contains": "Bank" }, { "keeps": ["User", "Auth"] }, "no-removals"]
 *
 * "no-removals" may name the ids the requested change is allowed to remove, for example
 * { "no-removals": ["Flow_3"] } when a new gateway replaces the flow between two tasks.
 *
 * Each check returns { name, status: 'pass' | 'fail' | 'unverified', detail }.
 * 'unverified' means the check could not run (for example the diagram server was unreachable).
 */
import { validateDiagram } from '../js/services/diagram-tools/validate.js';
import { renderDiagram, svgHasContent } from '../js/services/diagram-tools/render.js';
import { diffUtils } from '../js/utils/diff-utils.js';

const CHECK_NAMES = ['parses', 'renders', 'contains', 'keeps', 'typeIn', 'no-removals', 'bpmn-layout', 'bpmn-no-warnings', 'bounds-unchanged', 'bpmn-containers-drawn'];

/** Ids of the lanes and pools in BPMN XML that the layout section draws no shape for. */
export function undrawnContainers(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return null;
    const ids = [...doc.getElementsByTagNameNS('*', 'lane'), ...doc.getElementsByTagNameNS('*', 'participant')]
        .map(e => e.getAttribute('id')).filter(Boolean);
    const drawn = new Set([...doc.getElementsByTagNameNS('*', 'BPMNShape')].map(s => s.getAttribute('bpmnElement')));
    return ids.filter(id => !drawn.has(id));
}

/** The name of a check entry, whether the entry is a string or a one-key object. */
export const checkName = (check) => (typeof check === 'string' ? check : Object.keys(check)[0]);

export const isKnownCheck = (check) => CHECK_NAMES.includes(checkName(check));

const pass = (name, detail = '') => ({ name, status: 'pass', detail });
const fail = (name, detail = '') => ({ name, status: 'fail', detail });
const unverified = (name, detail = '') => ({ name, status: 'unverified', detail });

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when the code holds the term as a whole word (case-sensitive), or as a quoted label. */
export const codeHasTerm = (code, term) => new RegExp(`(^|[^\\w])${escapeRegExp(term)}([^\\w]|$)`).test(code);

/**
 * Read the bounds of every BPMN shape, keyed by the id of the element the shape draws.
 * @returns {Map<string, string>} element id -> "x,y,width,height"
 */
export function readBpmnShapeBounds(xml) {
    const bounds = new Map();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return bounds;
    for (const shape of Array.from(doc.getElementsByTagNameNS('*', 'BPMNShape'))) {
        const element = shape.getAttribute('bpmnElement');
        const box = shape.getElementsByTagNameNS('*', 'Bounds')[0];
        if (!element || !box) continue;
        bounds.set(element, ['x', 'y', 'width', 'height'].map(a => Number(box.getAttribute(a))).join(','));
    }
    return bounds;
}

/**
 * Element ids that the semantic diff reports as removed, for the types the diff supports.
 * The Mermaid and PlantUML diffs compare lines: a changed line marks the first id on that line as
 * removed, even when the element is still in the new code. Only ids missing from the new code count.
 */
export async function removedElements(oldCode, newCode, type) {
    const { diffData, visualDiffSupported } = await diffUtils.generateSemanticDiff(oldCode, newCode, type);
    if (!visualDiffSupported || !diffData) return null;
    if (type === 'bpmn') return Object.keys(diffData._removed || {});
    return (diffData.removed || []).filter(id => !codeHasTerm(newCode, id));
}

/**
 * @param {object} caseDef  The evaluation case
 * @param {{ code: string, type: string }} output  The diagram code the path produced, and its type
 * @returns {Promise<Array<{name, status, detail}>>}
 */
export async function runChecks(caseDef, output) {
    const results = [];
    const { code, type } = output;
    let validation = null;
    const getValidation = async () => (validation ||= await validateDiagram(code, type));

    for (const check of caseDef.checks) {
        const name = checkName(check);
        const arg = typeof check === 'string' ? null : check[name];
        try {
            switch (name) {
                case 'parses': {
                    const v = await getValidation();
                    results.push(v.status === 'valid' ? pass(name) : v.status === 'unverified' ? unverified(name, v.error) : fail(name, v.error));
                    break;
                }
                case 'renders': {
                    const r = await renderDiagram(code, type);
                    if (r.skipped) results.push(unverified(name, 'This form is drawn only by the visual editor.'));
                    else if (svgHasContent(r.svg)) results.push(pass(name));
                    else results.push(fail(name, r.error || 'The SVG holds no shapes.'));
                    break;
                }
                case 'contains': {
                    const found = code.toLowerCase().includes(String(arg).toLowerCase());
                    results.push(found ? pass(name) : fail(name, `The code does not contain "${arg}".`));
                    break;
                }
                case 'keeps': {
                    const missing = arg.filter(term => !codeHasTerm(code, term));
                    results.push(missing.length ? fail(name, `Missing: ${missing.join(', ')}`) : pass(name));
                    break;
                }
                case 'typeIn': {
                    results.push(arg.includes(type) ? pass(name) : fail(name, `The reply is ${type}; expected one of ${arg.join(', ')}.`));
                    break;
                }
                case 'no-removals': {
                    const allowed = new Set(Array.isArray(arg) ? arg : []);
                    const removed = (await removedElements(caseDef.startCode, code, type))?.filter(id => !allowed.has(id)) ?? null;
                    if (removed === null) results.push(unverified(name, `The semantic diff does not support ${type}.`));
                    else results.push(removed.length ? fail(name, `Removed: ${removed.join(', ')}`) : pass(name));
                    break;
                }
                case 'bpmn-layout': {
                    const v = await validateDiagram(code, 'bpmn', { requireLayout: true });
                    results.push(v.status === 'valid' ? pass(name) : fail(name, v.error));
                    break;
                }
                case 'bpmn-no-warnings': {
                    const v = await getValidation();
                    if (v.status !== 'valid') results.push(fail(name, 'The XML does not parse.'));
                    else results.push(v.warnings.length ? fail(name, v.warnings.slice(0, 3).join(' | ')) : pass(name));
                    break;
                }
                case 'bpmn-containers-drawn': {
                    const missing = undrawnContainers(code);
                    if (missing === null) results.push(fail(name, 'The XML does not parse.'));
                    else results.push(missing.length ? fail(name, `No shape for: ${missing.join(', ')}`) : pass(name));
                    break;
                }
                case 'bounds-unchanged': {
                    const before = readBpmnShapeBounds(caseDef.startCode);
                    const after = readBpmnShapeBounds(code);
                    const moved = [...before].filter(([id, box]) => after.get(id) !== box).map(([id]) => id);
                    results.push(moved.length ? fail(name, `Moved or missing shapes: ${moved.join(', ')}`) : pass(name));
                    break;
                }
                default:
                    results.push(fail(name, `Unknown check "${name}".`));
            }
        } catch (e) {
            results.push(fail(name, `The check threw: ${e?.message || e}`));
        }
    }
    return results;
}

/** Combine check results into one case outcome: fail beats unverified beats pass. */
export function outcomeOf(checkResults) {
    if (checkResults.some(r => r.status === 'fail')) return 'fail';
    if (checkResults.some(r => r.status === 'unverified')) return 'unverified';
    return 'pass';
}
