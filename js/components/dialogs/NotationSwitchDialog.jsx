import React from 'react';
import { DIAGRAM_TYPES } from '../../config.js';
import { Button, Modal, ModalHeader, ModalFooter } from '../common.jsx';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

/**
 * Asks what to do with the code in the editor when the user picks another notation:
 * start a new diagram in that notation, or keep the code and read it in that notation.
 */
export const NotationSwitchDialog = ({ from, to, onStartNew, onKeepCode, onCancel }) => {
    if (!to) return null;
    const fromLabel = DIAGRAM_TYPES[from]?.label || from;
    const toLabel = DIAGRAM_TYPES[to]?.label || to;
    const undoKey = isMac ? '⌘Z' : 'Ctrl+Z';

    return (
        <Modal onClose={onCancel} labelledBy="notation-switch-title" className="max-w-md">
            <ModalHeader
                id="notation-switch-title"
                icon="fas fa-exchange-alt"
                title={`Switch to ${toLabel}?`}
                subtitle={`The editor holds ${fromLabel} code`}
                onClose={onCancel}
                closeLabel="Keep the current notation"
            />
            <div className="px-5 py-4 space-y-2 text-[14px] leading-relaxed text-slate-600">
                <p>{toLabel} uses a different language, so it will probably show an error for the {fromLabel} code.</p>
                <p>
                    A new diagram replaces the code in the editor with an example in {toLabel}.
                    To get the {fromLabel} code back, press <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-slate-50 text-xs font-mono">{undoKey}</kbd> in the editor.
                </p>
            </div>
            <ModalFooter>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button variant="secondary" onClick={onKeepCode}>Keep the code</Button>
                <Button variant="primary" onClick={onStartNew} autoFocus>Start a new {toLabel} diagram</Button>
            </ModalFooter>
        </Modal>
    );
};
