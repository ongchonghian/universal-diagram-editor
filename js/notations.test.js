import { describe, it, expect } from 'vitest';
import { DIAGRAM_TYPES } from './config.js';
import {
    NOTATION_GROUPS, hasTemplates, getStarterCode, getBlankCode, fileAcceptList,
    isUntouchedStarter, getDesignSupport, lineInCode, cleanErrorMessage
} from './notations.js';

describe('notation list', () => {
    it('lists every notation exactly once', () => {
        const listed = NOTATION_GROUPS.flatMap(g => g.types);
        expect(new Set(listed).size).toBe(listed.length);
        expect([...listed].sort()).toEqual(Object.keys(DIAGRAM_TYPES).sort());
    });
});

describe('starter code', () => {
    it('gives every notation code to start from, never a placeholder comment', () => {
        for (const type of Object.keys(DIAGRAM_TYPES)) {
            const code = getStarterCode(type);
            expect(code.trim(), type).not.toBe('');
            expect(code, type).not.toContain('Start typing');
        }
    });

    it('offers a blank canvas only where Design view starts from one', () => {
        expect(getBlankCode('bpmn')).toContain('bpmn:definitions');
        expect(JSON.parse(getBlankCode('c4'))).toEqual({ nodes: [], edges: [] });
        expect(getBlankCode('erd')).toBeNull();
    });

    it('knows which notations have templates', () => {
        expect(hasTemplates('mermaid')).toBe(true);
        expect(hasTemplates('graphviz')).toBe(true);
        expect(hasTemplates('erd')).toBe(false);
    });
});

describe('file picker filter', () => {
    it('accepts every extension a notation claims', () => {
        const accept = fileAcceptList().split(',');
        for (const ext of ['.erd', '.excalidraw', '.c4', '.vl', '.nomnoml', '.bob', '.json5', '.bpmn']) {
            expect(accept).toContain(ext);
        }
        expect(new Set(accept).size).toBe(accept.length);
    });
});

describe('isUntouchedStarter', () => {
    it('treats empty code and unchanged starters as safe to replace', () => {
        expect(isUntouchedStarter('erd', '')).toBe(true);
        expect(isUntouchedStarter('erd', getStarterCode('erd'))).toBe(true);
        expect(isUntouchedStarter('bpmn', getBlankCode('bpmn'))).toBe(true);
    });

    it('treats edited code as the user\'s work', () => {
        expect(isUntouchedStarter('erd', getStarterCode('erd') + '\n[Invoice]')).toBe(false);
    });
});

describe('getDesignSupport', () => {
    it('allows Design view for BPMN', () => {
        expect(getDesignSupport('bpmn').supported).toBe(true);
    });

    it('explains why a code-only notation has no Design view', () => {
        const support = getDesignSupport('erd');
        expect(support.supported).toBe(false);
        expect(support.reason).toContain('ERD');
    });

    it('allows Mermaid pie charts and refuses other Mermaid diagrams with the reason', () => {
        expect(getDesignSupport('mermaid', 'Pie Chart').supported).toBe(true);
        const flow = getDesignSupport('mermaid', 'Flowchart');
        expect(flow.supported).toBe(false);
        expect(flow.reason).toContain('pie charts only');
    });

    it('refuses Design view for a C4 model written in PlantUML', () => {
        expect(getDesignSupport('c4', '', '@startuml\n@enduml').supported).toBe(false);
        expect(getDesignSupport('c4', '', '{"nodes":[]}').supported).toBe(true);
    });
});

describe('error lines and messages', () => {
    it('keeps a line inside the code and drops one outside it', () => {
        const code = 'a\nb\nc';
        expect(lineInCode(2, code)).toBe(2);
        expect(lineInCode(90, code)).toBeNull();
        expect(lineInCode(0, code)).toBeNull();
        expect(lineInCode(undefined, code)).toBeNull();
    });

    it('removes a server stack trace and repeated lines', () => {
        const raw = 'Error: Syntax error in graph\nError: Syntax error in graph\n    at Worker._convert (file:///usr/local/kroki/src/worker.js:90:15)\n    at async file:///usr/local/kroki/src/index.js:26:23';
        expect(cleanErrorMessage(raw)).toBe('Error: Syntax error in graph');
        expect(cleanErrorMessage('Error 400: Error: Bad graph\nError: Bad graph\n    at x (y.js:1:1)')).toBe('Error 400: Error: Bad graph');
    });

    it('keeps a parser message with its pointer line intact', () => {
        const msg = 'Parse error on line 2:\n...A --> \n-------^\nExpecting NODE';
        expect(cleanErrorMessage(msg)).toBe(msg);
    });
});
