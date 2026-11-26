
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { DIAGRAM_TYPES } from './config.js';
import { rendererAdapter } from './services/RendererAdapter.js';

// Hooks
import { useDiagramState } from './hooks/useDiagramState.js';
import { useRemoteRenderer } from './hooks/useRemoteRenderer.js';
import { useAutoLayout } from './hooks/useAutoLayout.js';
import { useCopilot } from './hooks/useCopilot.js';

// Components
import { Button, IconButton, StatusBadge, ToolbarDivider } from './components/common.jsx';
import { CodeEditorView } from './components/editors/CodeEditorView.jsx';
import { TemplateGalleryModal } from './components/dialogs/TemplateGalleryModal.jsx';
import { BpmnAutoLayoutDialog } from './components/dialogs/BpmnAutoLayoutDialog.jsx';
import { UpdatePanel } from './components/UpdatePanel.jsx';
import { LazyPanel, lazyNamed } from './components/LazyPanel.jsx';
import { AICopilot } from './components/AICopilot.jsx';
import { NotationSwitchDialog } from './components/dialogs/NotationSwitchDialog.jsx';
import { NOTATION_GROUPS, getStarterCode, isUntouchedStarter, fileAcceptList, hasTemplates } from './notations.js';

// The visual editors bring in large libraries (bpmn-js, Excalidraw, React Flow, Graphic Walker).
// Each editor downloads the first time someone opens Design view for its diagram type,
// so the code view and preview start without them.
const BpmnVisualEditor = lazyNamed(() => import('./components/editors/BpmnVisualEditor.jsx'), 'BpmnVisualEditor');
const MermaidVisualEditor = lazyNamed(() => import('./components/editors/mermaid/MermaidVisualEditor.jsx'), 'MermaidVisualEditor');
const ExcalidrawVisualEditor = lazyNamed(() => import('./components/editors/ExcalidrawVisualEditor.jsx'), 'ExcalidrawVisualEditor');
const LikeC4VisualEditor = lazyNamed(() => import('./components/editors/LikeC4VisualEditor.jsx'), 'LikeC4VisualEditor');
const VegaVisualEditor = lazyNamed(() => import('./components/editors/VegaVisualEditor.jsx'), 'VegaVisualEditor');

// MAIN APP COMPONENT
const App = () => {
    // 1. Diagram State (Core)
    const {
        textInput, setTextInput,
        diagramType, setDiagramType,
        detectedModel,
        contextModel,
        cursorPos, setCursorPos,
        viewMode, setViewMode,
        showTemplates, setShowTemplates,
        readOnly, setReadOnly,
        mermaidAst,
        mermaidAstLoaded,
        mermaidSyncRef,
        isVisualSupported,
        designSupport,
        handleDownloadSource
    } = useDiagramState();

    // A notation the user picked while the editor held code in another notation; the switch waits for their choice
    const [pendingNotation, setPendingNotation] = useState(null);
    const handleNotationChange = useCallback((next) => {
        if (next === diagramType) return;
        if (isUntouchedStarter(diagramType, textInput)) {
            // The code is empty or an unchanged example, so the switch can start the new notation afresh
            setDiagramType(next);
            setTextInput('');
            setViewMode('code');
        } else {
            setPendingNotation(next);
        }
    }, [diagramType, textInput, setDiagramType, setTextInput, setViewMode]);
    const finishNotationSwitch = useCallback((startNew) => {
        const next = pendingNotation;
        setPendingNotation(null);
        if (!next) return;
        setDiagramType(next);
        if (startNew) setTextInput(getStarterCode(next));
        setViewMode('code');
    }, [pendingNotation, setDiagramType, setTextInput, setViewMode]);

    const editorRef = useRef(null);
    // The Smith proposal open for review in the code pane
    const [pendingProposal, setPendingProposal] = useState(null);
    const fileInputRef = useRef(null);
    const [showUpdatePanel, setShowUpdatePanel] = React.useState(false);

    // Derived state for fallback/checks
    const isC4PlantUML = diagramType === 'c4' && (detectedModel === 'C4 Model (PlantUML)' || (textInput && textInput.includes('@startuml')));
    
    // Check for BPMN without DI (Derived State)
    // We calculate this on every render so it's always in sync with textInput
    const bpmnMissingDI = (diagramType === 'bpmn' && rendererAdapter.isValidBpmnContent(textInput) && !rendererAdapter.bpmnHasDI(textInput));

    // 2. Remote Renderer (Kroki)
    const {
        url,
        stats,
        loading,
        previewError, setPreviewError,
        errorLine,
        previewImage,
        svgContent,
        htmlContent,
        handleDownloadSvg,
        handleDownloadPng
    } = useRemoteRenderer(textInput, diagramType, editorRef, isC4PlantUML, bpmnMissingDI);

    // 3. Auto Layout (BPMN)
    const {
        showAutoLayoutDialog, setShowAutoLayoutDialog,
        autoLayoutProcessing,
        handleApplyAutoLayout,
        handleSkipAutoLayout,
        handleInlineAutoLayout,
        promptAutoLayout
    } = useAutoLayout(textInput, setTextInput, setPreviewError, bpmnMissingDI);

    // 4. Copilot (AI)
    const {
        showCopilot, setShowCopilot,
        handleAiCodeApply
    } = useCopilot(setTextInput, setDiagramType, setViewMode, diagramType);


    // Handle file drop 
    // Logic needs to interact with both useDiagramState (state) and useAutoLayout (logic)
    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const detectedType = rendererAdapter.detectType(file.name, content, diagramType);
            setDiagramType(detectedType);
            
            // Check for BPMN without DI
            if (detectedType === 'bpmn' && rendererAdapter.isValidBpmnContent(content) && !rendererAdapter.bpmnHasDI(content)) {
                promptAutoLayout(content);
            } else {
                setTextInput(content);
            }
        };
        reader.readAsText(file);
    }, [promptAutoLayout, setDiagramType, setTextInput, diagramType]);

    // Handle file open via button
    const handleFileOpen = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const detectedType = rendererAdapter.detectType(file.name, content, diagramType);
            setDiagramType(detectedType);
            
            // Check for BPMN without DI
            if (detectedType === 'bpmn' && rendererAdapter.isValidBpmnContent(content) && !rendererAdapter.bpmnHasDI(content)) {
                promptAutoLayout(content);
            } else {
                setTextInput(content);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset for same file selection
    }, [promptAutoLayout, setDiagramType, setTextInput, diagramType]);

    // Handle visual editor changes
    const handleVisualChange = useCallback((newXml) => {
        if (newXml !== textInput) setTextInput(newXml);
    }, [textInput, setTextInput]);
    
    // Handle snippet insert - requires editorRef
    const handleSnippetInsert = useCallback((code) => {
        if (editorRef.current) editorRef.current.insertAtCursor(code);
    }, []);

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden"
             onDrop={handleFileDrop}
             onDragOver={(e) => e.preventDefault()}>
            
            {/* Header: one row. Labels fold into icons on narrower screens; the icons keep their names. */}
            <header className="flex-none h-12 bg-white border-b border-slate-200 px-3 flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 shrink-0">
                    <h1 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900 shrink-0">
                        <img src="Universal Diagram Editor.png" alt="" className="w-7 h-7 rounded-md" />
                        <span className="hidden min-[1360px]:inline">Universal Diagram Editor</span>
                        <span className="sr-only min-[1360px]:hidden">Universal Diagram Editor</span>
                    </h1>
                    <ToolbarDivider className="hidden min-[1360px]:block" />
                    <select
                        value={diagramType}
                        onChange={(e) => handleNotationChange(e.target.value)}
                        aria-label="Diagram notation"
                        title="Diagram notation: the language the code is written in"
                        className="h-8 pl-2.5 pr-8 text-[13px] font-medium text-slate-800 bg-white border border-slate-200 rounded-md shadow-sm hover:border-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {NOTATION_GROUPS.map(group => (
                            <optgroup key={group.label} label={group.label}>
                                {group.types.filter(key => DIAGRAM_TYPES[key]).map(key => (
                                    <option key={key} value={key}>{DIAGRAM_TYPES[key].label}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    {detectedModel && <StatusBadge type="info" text={detectedModel} className="hidden lg:inline-flex max-w-[11rem] truncate" />}
                </div>

                <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {/* Always shown, so the header keeps its place; Design is dimmed, with the reason, when it cannot edit this diagram */}
                    <div className="flex items-center bg-slate-100 rounded-md p-0.5 ml-2 shrink-0" role="group" aria-label="Editor view">
                        {[
                            { mode: 'code', icon: 'fas fa-code', label: 'Code' },
                            { mode: 'visual', icon: 'fas fa-paint-brush', label: 'Design' }
                        ].map(({ mode, icon, label }) => {
                            const unavailable = mode === 'visual' && !isVisualSupported;
                            const active = viewMode === mode;
                            return (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => { if (!unavailable) setViewMode(mode); }}
                                    aria-pressed={active}
                                    aria-disabled={unavailable || undefined}
                                    title={unavailable ? designSupport.reason : undefined}
                                    className={`h-7 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium rounded transition-colors ${active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : unavailable ? 'text-slate-400 cursor-not-allowed' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    <i className={`${icon} text-[11px] ${active ? 'text-indigo-600' : ''}`} aria-hidden="true"></i> {label}
                                </button>
                            );
                        })}
                    </div>

                    <span className="flex-1 min-w-2" aria-hidden="true"></span>

                    {/* File actions */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileOpen}
                        accept={fileAcceptList()}
                        className="hidden"
                    />
                    <Button variant="ghost" size="sm" collapse="xl" icon="fas fa-folder-open" onClick={() => fileInputRef.current?.click()}>Open</Button>
                    <Button variant="ghost" size="sm" collapse="xl" icon="fas fa-save" onClick={handleDownloadSource} disabled={!textInput.trim()}>Save</Button>
                    <Button variant="ghost" size="sm" collapse="xl" icon="fas fa-download" onClick={handleDownloadSvg} disabled={!svgContent} title={htmlContent ? "Use the export menu inside the preview to download this diagram as SVG" : "Download as SVG"}>SVG</Button>
                    <Button variant="ghost" size="sm" collapse="xl" icon="fas fa-image" onClick={handleDownloadPng} disabled={!svgContent} title={htmlContent ? "Use the export menu inside the preview to download this diagram as PNG" : "Download as PNG"}>PNG</Button>
                    <ToolbarDivider />

                    {/* Tools */}
                    <Button
                        variant={readOnly ? "warning" : "ghost"}
                        size="sm"
                        collapse="xl"
                        icon={readOnly ? "fas fa-lock" : "fas fa-lock-open"}
                        onClick={() => setReadOnly(!readOnly)}
                        aria-pressed={readOnly}
                        title={readOnly ? "Locked: select to allow edits to the code" : "Unlocked: select to stop edits to the code"}
                    >
                        {readOnly ? "Locked" : "Unlocked"}
                    </Button>
                    {hasTemplates(diagramType) && (
                        <Button variant="ghost" size="sm" collapse="xl" icon="fas fa-th-large" onClick={() => setShowTemplates(true)}>
                            Templates
                        </Button>
                    )}
                    {DIAGRAM_TYPES[diagramType]?.docs && (
                        <a href={DIAGRAM_TYPES[diagramType].docs} target="_blank" rel="noopener noreferrer"
                           className="hidden sm:inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-md text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                           title="Documentation" aria-label={`${DIAGRAM_TYPES[diagramType].label} documentation`}>
                            <i className="fas fa-book" aria-hidden="true"></i>
                        </a>
                    )}
                    <IconButton
                        icon="fas fa-sync-alt"
                        size="sm"
                        label="Check for library updates"
                        onClick={() => setShowUpdatePanel(true)}
                        className="hidden sm:inline-flex shrink-0"
                    />
                    <ToolbarDivider />
                    <button
                        type="button"
                        onClick={() => setShowCopilot(!showCopilot)}
                        aria-pressed={showCopilot}
                        aria-label="Syntext Smith"
                        className={`h-8 px-3 shrink-0 inline-flex items-center gap-2 text-[13px] font-medium rounded-md transition-colors ${
                            showCopilot
                            ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                            : 'bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300'
                        }`}
                    >
                        <i className={`fas fa-magic text-xs ${showCopilot ? '' : 'text-indigo-600'}`} aria-hidden="true"></i>
                        <span className="hidden lg:inline whitespace-nowrap">Syntext Smith</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden relative">
                {/* Editor Area Wrapper */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    {/* Code View (Split) */}
                    <div className={`flex-1 min-h-0 flex transition-opacity duration-300 ${viewMode === 'code' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none absolute inset-0'}`}>
                        <CodeEditorView
                            textInput={textInput}
                            setTextInput={setTextInput}
                            diagramType={diagramType}
                            detectedModel={detectedModel}
                            contextModel={contextModel}
                            cursorPos={cursorPos}
                            setCursorPos={setCursorPos}
                            stats={stats}
                            loading={loading}
                            previewError={previewError}
                            setPreviewError={setPreviewError}
                            previewImage={previewImage}
                            svgContent={svgContent}
                            htmlContent={htmlContent}
                            bpmnMissingDI={bpmnMissingDI}
                            onInlineAutoLayout={handleInlineAutoLayout}
                            autoLayoutProcessing={autoLayoutProcessing}
                            errorLine={errorLine}
                            showTemplates={showTemplates}
                            setShowTemplates={setShowTemplates}
                            fileInputRef={fileInputRef}
                            readOnly={readOnly}
                            editorRef={editorRef}
                            proposal={pendingProposal}
                            onProposalDone={() => setPendingProposal(null)}
                            onApplyRetyped={handleAiCodeApply}
                            onOpenDesign={isVisualSupported ? () => setViewMode('visual') : undefined}
                        />
                    </div>

                    {/* Visual View */}
                    <div className={`flex-1 w-full h-full transition-opacity duration-300 ${viewMode === 'visual' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none absolute inset-0'}`}>
                        <LazyPanel name="design editor" resetKey={diagramType}>
                        {diagramType === 'bpmn' && viewMode === 'visual' && (
                            <BpmnVisualEditor xml={textInput} onChange={handleVisualChange} onError={setPreviewError} readOnly={readOnly} />
                        )}
                        {diagramType === 'mermaid' && viewMode === 'visual' && (
                            <MermaidVisualEditor
                                ast={mermaidAst}
                                code={textInput}
                                astLoaded={mermaidAstLoaded}
                                detectedModel={detectedModel}
                                onChange={(ast) => {
                                    const newCode = mermaidSyncRef.current.renderToCode(ast);
                                    if (newCode) setTextInput(newCode);
                                }}
                                onCodeChange={setTextInput}
                                onError={setPreviewError}
                                readOnly={readOnly}
                            />
                        )}
                        {diagramType === 'excalidraw' && viewMode === 'visual' && (
                            <ExcalidrawVisualEditor 
                                json={textInput} 
                                onChange={handleVisualChange} 
                                onError={setPreviewError} 
                                readOnly={readOnly}
                            />
                        )}

                        {diagramType === 'c4' && viewMode === 'visual' && (
                            <LikeC4VisualEditor 
                                code={textInput} 
                                onChange={handleVisualChange} 
                                onError={setPreviewError} 
                                readOnly={readOnly}
                            />
                        )}
                        {(diagramType === 'vega' || diagramType === 'vegalite') && viewMode === 'visual' && (
                            <VegaVisualEditor 
                                code={textInput}
                                diagramType={diagramType}
                                onChange={handleVisualChange}
                                onError={setPreviewError}
                                readOnly={readOnly}
                            />
                        )}
                        </LazyPanel>
                    </div>
                </div>

                {/* AI Copilot Sidebar */}
                {showCopilot && (
                    <aside className="absolute inset-y-0 right-0 w-full sm:w-96 lg:static lg:w-96 shrink-0 border-l border-slate-200 bg-white flex flex-col z-30 shadow-xl lg:shadow-none animate-fade-in" aria-label="Syntext Smith">
                        <AICopilot 
                            isOpen={showCopilot} 
                            onClose={() => setShowCopilot(false)} 
                            contextCode={textInput} 
                            diagramType={diagramType}
                            onReviewProposal={(proposal) => {
                                setPendingProposal(proposal);
                                setViewMode('code');
                            }}
                            isSidebar={true}
                        />
                    </aside>
                )}
            </main>

            {/* Template Modal */}
            <TemplateGalleryModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} onSelect={setTextInput} diagramType={diagramType} />
            
            {/* Notation switch: start a new diagram, or keep the code */}
            <NotationSwitchDialog
                from={diagramType}
                to={pendingNotation}
                onStartNew={() => finishNotationSwitch(true)}
                onKeepCode={() => finishNotationSwitch(false)}
                onCancel={() => setPendingNotation(null)}
            />

            {/* BPMN Auto-Layout Dialog */}
            <BpmnAutoLayoutDialog 
                isOpen={showAutoLayoutDialog} 
                onClose={() => setShowAutoLayoutDialog(false)} 
                onApplyLayout={handleApplyAutoLayout}
                onSkip={handleSkipAutoLayout}
                isProcessing={autoLayoutProcessing}
            />
            
            {/* Library Update Panel */}
            <UpdatePanel isOpen={showUpdatePanel} onClose={() => setShowUpdatePanel(false)} />
        </div>
    );
};

export default App;
