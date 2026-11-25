
import { ToolAdapter } from './tool-adapter.js';

/**
 * BPMN for auto-fix: bpmn-moddle must read the XML, and the XML must hold layout data,
 * because the preview cannot draw BPMN without it. A missing layout is reported as kind
 * DI_LAYOUT, which the BPMN patcher repairs with the auto-layout.
 */
export class BpmnAdapter extends ToolAdapter {
    constructor() {
        super('bpmn', { requireLayout: true });
    }
}
