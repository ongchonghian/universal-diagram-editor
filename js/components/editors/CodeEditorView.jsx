import React, { useRef, useState, useCallback, useEffect } from 'react';
import MonacoWrapper from './MonacoWrapper.jsx';
import { PreviewPanel } from './PreviewPanel.jsx';
import { PlantUmlToolbar } from '../PlantUmlToolbar.jsx';
import { MermaidToolbar } from '../MermaidToolbar.jsx';
import { SnippetInsertionDialog } from '../dialogs/SnippetInsertionDialog.jsx';
import { fixWithSmith } from '../../services/smith/index.js';
import { DiffReviewPane, monacoLanguageOf } from './DiffReviewPane.jsx';
import { DIAGRAM_TYPES } from '../../config.js';
import { Button } from '../common.jsx';
import { hasTemplates, getStarterCode, getBlankCode } from '../../notations.js';

export const CodeEditorView = ({
    textInput,
    setTextInput,
    diagramType,
    detectedModel,
    contextModel,
    cursorPos,
    setCursorPos,
    stats,
    loading,
    previewError,
    setPreviewError,
    previewImage,
    svgContent,
    bpmnMissingDI,
    onInlineAutoLayout,
    autoLayoutProcessing,
    errorLine,
    showTemplates,
    setShowTemplates,

    fileInputRef,
    readOnly = false,
    // App's ref, so App, the error markers and the review pane reach the same Monaco editor
    editorRef: externalEditorRef,
    // The Smith proposal under review, if any
    proposal = null,
    onProposalDone,
    onApplyRetyped,
    onOpenDesign
}) => {
    const localEditorRef = useRef(null);
    const editorRef = externalEditorRef || localEditorRef;
    const [selectedElement, setSelectedElement] = useState(null);
    const [snippetDialogSnippet, setSnippetDialogSnippet] = useState(null);
    const [isFixing, setIsFixing] = useState(false);
    // The result of the last Fix attempt, shown in the preview's error panel: { tone, text }
    const [fixMessage, setFixMessage] = useState(null);

    // A new error, or a new diagram, makes the last Fix message out of date
    useEffect(() => { setFixMessage(null); }, [previewError, diagramType]);

    // Handle snippet insertion from toolbar
    const handleSnippetInsert = useCallback((code, mode = 'cursor') => {
        if (editorRef.current) {
            if (mode === 'cursor') {
                editorRef.current.insertAtCursor(code);
            } else {
                editorRef.current.insertAtLocation(code, mode);
            }
        }
    }, []);

    const handleSnippetSelect = (snippet) => {
        setSnippetDialogSnippet(snippet);
    };

    // Handle element click in preview -> Select code
    const handleElementClick = useCallback((text) => {
        setSelectedElement(text);
        if (editorRef.current) {
            editorRef.current.findAndSelect(text);
        }
    }, []);

    // Scroll to error line
    const scrollToLine = useCallback((line) => {
        if (editorRef.current) {
            editorRef.current.scrollToLine(line);
        }
    }, []);

    // Handle rename request from Preview
    const handleRenameRequest = useCallback((oldText) => {
        // Simple prompt for MVP
        // In a real app we'd use a nice dialog
        const newText = window.prompt(`Rename '${oldText}' to:`, oldText);
        
        if (newText && newText !== oldText && editorRef.current) {
            // 1. Find and select the text in the code
            editorRef.current.findAndSelect(oldText);
            
            // 2. Replace the selection
            // We use 'replace' mode which targets current selection
            editorRef.current.insertAtLocation(newText, 'replace');
        }
    }, []);

    // Fix button: Smith's tool loop repairs the diagram, checking every edit with the real validator
    const handleAutoFix = async () => {
        if (!previewError || !textInput || isFixing) return;
        setIsFixing(true);
        setFixMessage(null);
        try {
            const result = await fixWithSmith({ code: textInput, type: diagramType, error: previewError });
            const proposal = result.proposal;
            if (!proposal) {
                setFixMessage({ tone: 'error', text: `Smith made no change, so the code is unchanged.${result.text ? ` Smith said: ${result.text}` : ''}` });
            } else if (proposal.type !== diagramType) {
                setFixMessage({ tone: 'error', text: 'Smith rewrote the diagram in another notation, so the fix was not applied. Ask Smith in the chat to convert the diagram instead.' });
            } else if (proposal.verified) {
                // Written as one undo step, so Ctrl+Z in the editor restores the broken code
                if (editorRef.current?.applyEdits) editorRef.current.applyEdits(proposal.code);
                else setTextInput(proposal.code);
            } else if (proposal.status === 'unverified') {
                setFixMessage({ tone: 'warning', text: 'Smith could not check the repair because the diagram server could not be reached. The code is unchanged.' });
            } else {
                setFixMessage({ tone: 'error', text: `Smith could not produce a valid diagram. The code is unchanged. Last error: ${proposal.error || 'unknown'}` });
            }
        } catch (e) {
            const text = e?.code === 'NOT_CONFIGURED'
                ? `${e.message} Open Syntext Smith to change the settings.`
                : `The fix failed: ${e.message}`;
            setFixMessage({ tone: 'error', text });
        } finally {
            setIsFixing(false);
        }
    };

    const withTemplates = hasTemplates(diagramType);
    const blankCode = getBlankCode(diagramType);
    const typeLabel = DIAGRAM_TYPES[diagramType]?.label || diagramType;
    // A C4 model written as JSON is drawn only in Design view, so the preview explains that instead of staying blank
    const isC4Json = diagramType === 'c4' && !!textInput?.trim() && !textInput.includes('@startuml') && !textInput.includes('!include');

    // The empty editor's main button: the template gallery where one exists, otherwise a working example
    const handleStart = () => {
        if (withTemplates) setShowTemplates(true);
        else setTextInput(getStarterCode(diagramType));
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row z-10 relative">
            {/* Editor Panel: beside the preview from tablet width up, above the preview on a phone */}
            <div className="h-1/2 md:h-auto md:w-1/2 min-w-0 overflow-hidden flex flex-col border-b md:border-b-0 md:border-r border-slate-200 relative bg-white">
                {!readOnly && diagramType === 'plantuml' && (
                    <PlantUmlToolbar 
                        detectedModel={detectedModel} 
                        contextModel={contextModel} 
                        onInsert={handleSnippetInsert}
                        onSnippetSelect={handleSnippetSelect}
                    />
                )}
                {!readOnly && diagramType === 'mermaid' && (
                    <MermaidToolbar 
                        detectedModel={detectedModel} 
                        contextModel={contextModel} 
                        onInsert={(code) => handleSnippetInsert(code, 'cursor')} 
                    />
                )}
                <div className="flex-1 min-h-0">
                    <MonacoWrapper
                        ref={editorRef}
                        value={textInput}
                        onChange={setTextInput}
                        language={monacoLanguageOf(diagramType)}
                        onCursorChange={(line, col) => setCursorPos({ line, col })}
                        readOnly={readOnly}
                    />
                </div>
                <div className="flex-none h-7 px-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                    <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
                    <span className="flex items-center gap-2">
                        <span>{(textInput || '').length.toLocaleString('en-GB')} {(textInput || '').length === 1 ? 'character' : 'characters'}</span>
                        <span className="w-px h-3 bg-slate-300" aria-hidden="true"></span>
                        <span>{DIAGRAM_TYPES[diagramType]?.label || diagramType}</span>
                        {readOnly && (<><span className="w-px h-3 bg-slate-300" aria-hidden="true"></span><span className="text-amber-700"><i className="fas fa-lock mr-1" aria-hidden="true"></i>Read-only</span></>)}
                    </span>
                </div>
                
                {/* Smith's proposal, reviewed one change at a time over the editor. The editor stays
                    mounted underneath, so its undo history survives the review. */}
                {proposal && (
                    <DiffReviewPane
                        original={textInput}
                        proposal={proposal}
                        currentType={diagramType}
                        readOnly={readOnly}
                        onCancel={onProposalDone}
                        onApply={(code) => {
                            if (proposal.type !== diagramType) {
                                onApplyRetyped?.(code, proposal.type);
                            } else if (editorRef.current?.applyEdits) {
                                editorRef.current.applyEdits(code);
                                editorRef.current.focus?.();
                            } else {
                                setTextInput(code);
                            }
                            onProposalDone?.();
                        }}
                    />
                )}

                {/* Empty State */}
                {!proposal && (!textInput || !textInput.trim()) && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white p-6">
                        <div className="w-full max-w-xs text-center">
                            <span className="mx-auto mb-4 w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center" aria-hidden="true">
                                <i className="fas fa-code"></i>
                            </span>
                            <h3 className="text-[15px] font-semibold text-slate-900">Start a diagram</h3>
                            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                                {withTemplates ? `Pick a template in ${typeLabel}, or open a file from your computer.` : `Start from a working example in ${typeLabel}, or open a file from your computer.`}
                            </p>
                            <div className="mt-5 flex flex-col gap-2">
                                <Button variant="primary" size="lg" icon={withTemplates ? 'fas fa-th-large' : 'fas fa-play'} onClick={handleStart}>
                                    {withTemplates ? 'Choose a template' : 'Start from an example'}
                                </Button>
                                <Button variant="secondary" size="lg" icon="fas fa-folder-open" onClick={() => fileInputRef.current?.click()}>
                                    Open a file
                                </Button>
                                {blankCode && (
                                    <Button variant="ghost" size="md" icon="fas fa-plus" onClick={() => setTextInput(blankCode)}>
                                        Start with a blank canvas
                                    </Button>
                                )}
                            </div>
                            <p className="mt-4 text-xs text-slate-400">You can also drop a file anywhere on this page.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Panel */}
            <PreviewPanel 
                svgContent={svgContent}
                previewImage={previewImage}
                loading={loading}
                error={previewError}
                bpmnMissingDI={bpmnMissingDI}
                errorLine={errorLine}
                onElementClick={handleElementClick}
                onInlineAutoLayout={onInlineAutoLayout}
                autoLayoutProcessing={autoLayoutProcessing}
                onScrollToLine={scrollToLine}
                contextModel={contextModel}
                onSnippetSelect={handleSnippetSelect}
                onInsert={handleSnippetInsert}
                onRenameRequest={handleRenameRequest}
                onRetry={handleAutoFix}
                isFixing={isFixing}
                fixMessage={fixMessage}
                diagramType={diagramType}
                designOnly={isC4Json}
                onOpenDesign={onOpenDesign}
            />

            <SnippetInsertionDialog 
                isOpen={!!snippetDialogSnippet}
                onClose={() => setSnippetDialogSnippet(null)}
                onInsert={handleSnippetInsert}
                snippet={snippetDialogSnippet}
                contextModel={contextModel}
                selectedElement={selectedElement}
            />
        </div>
    );
};
