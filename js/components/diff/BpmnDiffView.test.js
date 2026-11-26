import { describe, it, expect, vi } from 'vitest';

vi.mock('bpmn-js/lib/NavigatedViewer', () => ({ default: class {} }));
vi.mock('bpmn-js/dist/assets/diagram-js.css', () => ({}));
vi.mock('bpmn-js/dist/assets/bpmn-font/css/bpmn.css', () => ({}));

import { diffMarkers } from './BpmnDiffView.jsx';
import { diffUtils } from '../../utils/diff-utils.js';

const xml = (tasks) => `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="D" targetNamespace="t">
  <bpmn:process id="P">${tasks}</bpmn:process>
</bpmn:definitions>`;

describe('diffMarkers', () => {
    it('marks added and changed elements from a real bpmn-js-differ result', async () => {
        const before = xml('<bpmn:task id="T1" name="Review" /><bpmn:task id="T2" name="Pay" />');
        const after = xml('<bpmn:task id="T1" name="Check" /><bpmn:task id="T3" name="Ship" />');
        const { diffData } = await diffUtils.generateSemanticDiff(before, after, 'bpmn');
        const markers = Object.fromEntries(diffMarkers(diffData));
        expect(markers['diff-added']).toEqual(['T3']);
        expect(markers['diff-changed']).toContain('T1');
        expect(Object.keys(diffData._removed)).toEqual(['T2']);
    });

    it('returns nothing without a diff', () => {
        expect(diffMarkers(null)).toEqual([]);
    });
});
