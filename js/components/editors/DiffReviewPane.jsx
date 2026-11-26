import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DIAGRAM_TYPES } from '../../config.js';
import { mergeHunks, describeHunk, mergedLineOf } from '../../utils/hunks.js';
import { SemanticDiffModal } from '../dialogs/SemanticDiffModal.jsx';
import { Button } from '../common.jsx';

/** The Monaco language id for a diagram type. */
export const monacoLanguageOf = (type) => (
    type === 'bpmn' ? 'xml'
        : type === 'vega' || type === 'vegalite' || type === 'excalidraw' ? 'json'
            : type === 'c4' ? 'plantuml'
                : type
);

const typeName = (type) => DIAGRAM_TYPES[type]?.label || DIAGRAM_TYPES[type]?.name || type;

/**
 * Review a Smith proposal in the code pane, one change (hunk) at a time.
 *
 * A Monaco diff editor shows the editor's current code against the result of the accepted hunks.
 * The hunks come from the diff editor's getLineChanges() for the whole proposal, read once.
 * Apply hands the merged text to onApply, which writes it into the editor as one undo step.
 *
 * When the proposal is in another notation, per-hunk review does not apply: Apply replaces the
 * whole diagram and switches the editor's type.
 */
export const DiffReviewPane = ({ original, proposal, currentType, onApply, onCancel, readOnly = false }) => {
    const containerRef = useRef(null);
    const diffRef = useRef(null);
    const modifiedModelRef = useRef(null);
    const [hunks, setHunks] = useState(null);
    const [rejected, setRejected] = useState(() => new Set());
    const [showVisual, setShowVisual] = useState(false);
    const [monacoMissing, setMonacoMissing] = useState(false);
    const retyped = proposal.type !== currentType;

    const isAccepted = (i) => !rejected.has(i);
    const merged = useMemo(() => {
        if (retyped || !hunks || rejected.size === 0) return proposal.code;
        return mergeHunks(original, proposal.code, hunks, i => !rejected.has(i));
    }, [retyped, hunks, rejected, original, proposal.code]);

    // One diff editor for each pair of texts
    useEffect(() => {
        const monaco = window.monaco;
        if (!monaco || !containerRef.current) {
            setMonacoMissing(true);
            return undefined;
        }
        setHunks(null);
        setRejected(new Set());
        const diff = monaco.editor.createDiffEditor(containerRef.current, {
            readOnly: true,
            originalEditable: false,
            automaticLayout: true,
            renderSideBySide: false,
            // Whitespace changes are real changes in diagram code, and every hunk must be listed
            ignoreTrimWhitespace: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderOverviewRuler: false,
            fontSize: 13,
            fontFamily: "'Fira Code', 'Monaco', monospace"
        });
        const originalModel = monaco.editor.createModel(original ?? '', monacoLanguageOf(currentType));
        const modifiedModel = monaco.editor.createModel(proposal.code ?? '', monacoLanguageOf(proposal.type));
        diff.setModel({ original: originalModel, modified: modifiedModel });
        diffRef.current = diff;
        modifiedModelRef.current = modifiedModel;

        let captured = false;
        const sub = diff.onDidUpdateDiff(() => {
            if (captured) return;
            captured = true;
            setHunks(diff.getLineChanges() || []);
        });
        return () => {
            sub.dispose();
            diff.dispose();
            originalModel.dispose();
            modifiedModel.dispose();
            diffRef.current = null;
            modifiedModelRef.current = null;
        };
    }, [original, proposal.code, proposal.type, currentType]);

    // The right-hand text follows the decisions, so the diff shows exactly what Apply writes
    useEffect(() => {
        const model = modifiedModelRef.current;
        if (model && hunks && model.getValue() !== merged) model.setValue(merged);
    }, [merged, hunks]);

    const toggle = (i, accept) => setRejected(prev => {
        const next = new Set(prev);
        if (accept) next.delete(i); else next.add(i);
        return next;
    });

    const reveal = (i) => {
        const editor = diffRef.current?.getModifiedEditor();
        if (!editor || !hunks) return;
        const line = mergedLineOf(hunks, i, isAccepted);
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
    };

    const acceptedCount = hunks ? hunks.length - rejected.size : 0;
    const nothingToApply = !retyped && hunks !== null && (hunks.length === 0 || acceptedCount === 0);
    const status = proposal.verified
        ? { tone: 'text-emerald-700', icon: 'fa-check-circle', text: 'Checked: the full proposal is valid' }
        : proposal.status === 'unverified'
            ? { tone: 'text-amber-700', icon: 'fa-question-circle', text: 'Not checked: the diagram server could not be reached' }
            : { tone: 'text-red-700', icon: 'fa-exclamation-circle', text: 'Not verified: the proposal still has an error' };

    return (
        <section className="absolute inset-0 z-30 flex flex-col bg-white animate-fade-in" aria-label="Review Smith's change">
            <header className="flex-none px-3 py-2.5 border-b border-slate-200 bg-white">
                <div className="flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs shrink-0" aria-hidden="true">
                        <i className="fas fa-code-branch"></i>
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[13px] font-semibold text-slate-900 leading-tight flex items-center gap-2">
                            Review Smith's change
                            <span className="h-5 px-1.5 inline-flex items-center rounded text-[11px] font-medium bg-slate-100 text-slate-600">{typeName(proposal.type)}</span>
                        </h2>
                        <p className={`mt-1 text-xs flex items-center gap-1.5 ${status.tone}`}>
                            <i className={`fas ${status.icon}`} aria-hidden="true"></i>{status.text}
                        </p>
                    </div>
                </div>
                {(retyped || proposal.baseCode !== original || proposal.layout === 'regenerated' || (!retyped && rejected.size > 0)) && (
                    <div className="mt-2 ml-[38px] space-y-1 text-xs leading-relaxed">
                        {retyped ? (
                            <p className="text-slate-600">
                                Smith rewrote the diagram in {typeName(proposal.type)}. Applying replaces the whole diagram and switches the editor from {typeName(currentType)} to {typeName(proposal.type)}.
                            </p>
                        ) : proposal.baseCode !== original && (
                            <p className="text-slate-600">
                                The editor has changed since Smith made this proposal. The comparison is with the current code.
                            </p>
                        )}
                        {proposal.layout === 'regenerated' && (
                            <p className="text-amber-700">
                                The change adds, removes or reconnects elements, so the app laid out the diagram again: the layout section changes as well.
                            </p>
                        )}
                        {!retyped && rejected.size > 0 && (
                            <p className="text-amber-700">
                                Smith checked the full proposal only. After you apply, the preview shows whether the code without the rejected changes still works.
                            </p>
                        )}
                    </div>
                )}
            </header>

            {!retyped && hunks && hunks.length > 0 && (
                <ol className="flex-none max-h-40 overflow-y-auto ui-scroll border-b border-slate-200 divide-y divide-slate-100 text-xs bg-slate-50/60" aria-label="Changes">
                    {hunks.map((hunk, i) => {
                        const accepted = isAccepted(i);
                        return (
                            <li key={i} className="flex items-center gap-2 pl-3 pr-2 h-9">
                                <button onClick={() => reveal(i)} className="flex-1 min-w-0 text-left truncate text-slate-700 hover:text-indigo-700" title="Show this change">
                                    <span className="inline-block w-5 text-slate-400 tabular-nums">{i + 1}.</span>
                                    <span className={accepted ? '' : 'line-through text-slate-400'}>{describeHunk(hunk)}</span>
                                </button>
                                <div className="flex items-center p-0.5 rounded-md bg-slate-100 shrink-0" role="group" aria-label={`Change ${i + 1}`}>
                                    <button
                                        onClick={() => toggle(i, true)}
                                        aria-pressed={accepted}
                                        className={`h-6 px-2 inline-flex items-center gap-1 rounded font-medium transition-colors ${accepted ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        <i className="fas fa-check text-[10px]" aria-hidden="true"></i>
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => toggle(i, false)}
                                        aria-pressed={!accepted}
                                        className={`h-6 px-2 inline-flex items-center gap-1 rounded font-medium transition-colors ${!accepted ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        <i className="fas fa-times text-[10px]" aria-hidden="true"></i>
                                        Reject
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}

            <div className="flex-1 relative min-h-0">
                <div ref={containerRef} className="absolute inset-0" />
                {monacoMissing && (
                    <p className="absolute inset-0 flex items-center justify-center text-[13px] text-slate-500">The code editor has not loaded yet, so the change cannot be shown.</p>
                )}
                {hunks && hunks.length === 0 && !retyped && (
                    <p className="absolute top-3 left-1/2 -translate-x-1/2 z-10 text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 shadow-sm text-slate-600">
                        The proposal matches the current code.
                    </p>
                )}
            </div>

            <footer className="flex-none h-12 px-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 tabular-nums truncate">
                    {retyped ? 'Replaces the whole diagram' : hunks ? `${acceptedCount} of ${hunks.length} ${hunks.length === 1 ? 'change' : 'changes'} accepted` : 'Comparing…'}
                </span>
                <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                    {!retyped && ['bpmn', 'mermaid', 'plantuml'].includes(proposal.type) && (
                        <Button variant="secondary" size="sm" icon="fas fa-search-plus" onClick={() => setShowVisual(true)} disabled={nothingToApply}>
                            Visual diff
                        </Button>
                    )}
                    <Button
                        variant="primary"
                        size="sm"
                        icon="fas fa-check"
                        onClick={() => onApply(merged)}
                        disabled={readOnly || nothingToApply || (!retyped && hunks === null)}
                    >
                        Apply
                    </Button>
                </div>
            </footer>

            {showVisual && (
                <SemanticDiffModal
                    isOpen={true}
                    onClose={() => setShowVisual(false)}
                    onConfirm={() => { setShowVisual(false); onApply(merged); }}
                    oldCode={original}
                    newCode={merged}
                    diagramType={proposal.type}
                />
            )}
        </section>
    );
};
