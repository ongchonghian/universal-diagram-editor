/**
 * Create a bpmn-moddle instance.
 * bpmn-moddle 10 exports the class by name (`export { BpmnModdle }`) and has no default export,
 * so `module.default || module` returns the module namespace, which is not a constructor.
 * The fallbacks keep older builds working.
 */
export async function createBpmnModdle(...args) {
    const mod = await import('bpmn-moddle');
    const BpmnModdle = mod.BpmnModdle || mod.default?.BpmnModdle || mod.default;
    if (typeof BpmnModdle !== 'function') {
        throw new Error('bpmn-moddle did not export a BpmnModdle constructor.');
    }
    return new BpmnModdle(...args);
}
