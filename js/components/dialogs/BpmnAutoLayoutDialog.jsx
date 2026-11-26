import React from 'react';
import { Modal, ModalHeader, ModalFooter, Button } from '../common.jsx';

// Dialog for BPMN Auto-Layout confirmation
export const BpmnAutoLayoutDialog = ({ isOpen, onClose, onApplyLayout, onSkip, isProcessing }) => {
    if (!isOpen) return null;

    return (
        <Modal onClose={isProcessing ? null : onClose} labelledBy="bpmn-layout-title" className="max-w-md">
            <ModalHeader
                id="bpmn-layout-title"
                icon="fas fa-diagram-project"
                tone="amber"
                title="Lay out this BPMN file?"
                subtitle="The file has no layout information"
            />

            <div className="px-5 py-5 space-y-3 text-[13px] leading-relaxed text-slate-600">
                <p>
                    The file describes the process steps, but not where each shape sits on the page. Without a layout, the preview cannot draw the diagram.
                </p>
                <p>
                    The app can generate a layout now, or open the file as it is.
                </p>
                <div className="flex gap-2.5 rounded-md bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600">
                    <i className="fas fa-info-circle text-slate-400 mt-0.5" aria-hidden="true"></i>
                    <p>Generated layouts suit simple and medium-sized processes. A complex flow may need some shapes moved by hand.</p>
                </div>
            </div>

            <ModalFooter>
                <Button variant="ghost" onClick={onSkip} disabled={isProcessing}>
                    Open without a layout
                </Button>
                <Button variant="primary" icon={isProcessing ? undefined : 'fas fa-magic'} onClick={onApplyLayout} disabled={isProcessing}>
                    {isProcessing ? <><span className="ui-spinner !border-indigo-300 !border-t-white mr-1.5 align-[-2px]"></span>Laying out…</> : 'Generate the layout'}
                </Button>
            </ModalFooter>
        </Modal>
    );
};
