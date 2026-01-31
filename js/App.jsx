
import React, { useRef, useCallback, useEffect } from 'react';
import { DIAGRAM_TYPES } from './config.js';
import { rendererAdapter } from './services/RendererAdapter.js';

// Hooks
import { useDiagramState } from './hooks/useDiagramState.js';
import { useRemoteRenderer } from './hooks/useRemoteRenderer.js';
import { useAutoLayout } from './hooks/useAutoLayout.js';
import { useCopilot } from './hooks/useCopilot.js';

// Components
import { Button, StatusBadge } from './components/common.jsx';
import { CodeEditorView } from './components/editors/CodeEditorView.jsx';
import { TemplateGalleryModal } from './components/dialogs/TemplateGalleryModal.jsx';
import { BpmnAutoLayoutDialog } from './components/dialogs/BpmnAutoLayoutDialog.jsx';
import { UpdatePanel } from './components/UpdatePanel.jsx';
import { BpmnVisualEditor } from './components/editors/BpmnVisualEditor.jsx';
import { MermaidVisualEditor } from './components/editors/mermaid/MermaidVisualEditor.jsx';
import { ExcalidrawVisualEditor } from './components/editors/ExcalidrawVisualEditor.jsx';
import { LikeC4VisualEditor } from './components/editors/LikeC4VisualEditor.jsx';
import { VegaVisualEditor } from './components/editors/VegaVisualEditor.jsx';
import { AICopilot } from './components/AICopilot.jsx';

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
        handleDownloadSource
    } = useDiagramState();

    const editorRef = useRef(null);
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
            const detectedType = rendererAdapter.detectType(file.name, content);
            setDiagramType(detectedType);
            
            // Check for BPMN without DI
            if (detectedType === 'bpmn' && rendererAdapter.isValidBpmnContent(content) && !rendererAdapter.bpmnHasDI(content)) {
                promptAutoLayout(content);
            } else {
                setTextInput(content);
            }
        };
        reader.readAsText(file);
    }, [promptAutoLayout, setDiagramType, setTextInput]);

    // Handle file open via button
    const handleFileOpen = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const detectedType = rendererAdapter.detectType(file.name, content);
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
    }, [promptAutoLayout, setDiagramType, setTextInput]);

    // Handle visual editor changes
    const handleVisualChange = useCallback((newXml) => {
        if (newXml !== textInput) setTextInput(newXml);
    }, [textInput, setTextInput]);
    
    // Handle snippet insert - requires editorRef
    const handleSnippetInsert = useCallback((code) => {
        if (editorRef.current) editorRef.current.insertAtCursor(code);
    }, []);

    return (
        <div className="h-full flex flex-col bg-slate-50"
             onDrop={handleFileDrop}
             onDragOver={(e) => e.preventDefault()}>
            
            {/* Header */}
            <header className="flex-none bg-white border-b border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold text-slate-800 flex items-center">
                            <img src="Universal Diagram Editor.png" alt="Logo" className="w-10 h-10 mr-2" />
                            Universal Diagram Editor
                        </h1>
                        <select
                            value={diagramType}
                            onChange={(e) => { setDiagramType(e.target.value); setViewMode('code'); }}
                            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {Object.entries(DIAGRAM_TYPES).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                        {detectedModel && <StatusBadge type="info" text={detectedModel} />}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* File buttons */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileOpen}
                            accept=".bpmn,.xml,.mmd,.mermaid,.puml,.plantuml,.wsd,.dot,.gv,.json,.yaml,.yml"
                            className="hidden"
                        />
                        <Button variant="secondary" size="sm" icon="fas fa-folder-open" onClick={() => fileInputRef.current?.click()}>Open</Button>
                        <Button variant="secondary" size="sm" icon="fas fa-save" onClick={handleDownloadSource} disabled={!textInput.trim()}>Save</Button>
                        <Button variant="secondary" size="sm" icon="fas fa-download" onClick={handleDownloadSvg} disabled={!svgContent}>SVG</Button>
                        <Button variant="secondary" size="sm" icon="fas fa-image" onClick={handleDownloadPng} disabled={!svgContent}>PNG</Button>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            icon={readOnly ? "fas fa-lock" : "fas fa-lock-open"} 
                            onClick={() => setReadOnly(!readOnly)}
                            className={readOnly ? "text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100" : ""}
                        >
                            {readOnly ? "Locked" : "Unlocked"}
                        </Button>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        {isVisualSupported && (
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('code')}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'code' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                                >
                                    <i className="fas fa-code mr-1"></i> Code
                                </button>
                                <button
                                    onClick={() => setViewMode('visual')}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'visual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                                >
                                    <i className="fas fa-paint-brush mr-1"></i> Design
                                </button>
                            </div>
                        )}
                        {['mermaid', 'plantuml', 'bpmn', 'excalidraw', 'vega', 'vegalite', 'c4', 'graphviz'].includes(diagramType) && (
                            <Button variant="secondary" size="sm" icon="fas fa-th-large" onClick={() => setShowTemplates(true)}>
                                Templates
                            </Button>
                        )}
                        {DIAGRAM_TYPES[diagramType]?.docs && (
                            <a href={DIAGRAM_TYPES[diagramType].docs} target="_blank" rel="noopener noreferrer"
                               className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Documentation">
                                <i className="fas fa-book"></i>
                            </a>
                        )}
                        <button 
                            onClick={() => setShowUpdatePanel(true)}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" 
                            title="Check for library updates"
                        >
                            <i className="fas fa-sync-alt"></i>
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <button 
                            onClick={() => setShowCopilot(!showCopilot)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                showCopilot 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <i className="fas fa-magic"></i>
                            <span className="hidden md:inline">Syntext Smith</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden relative">
                {/* Editor Area Wrapper */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    {/* Code View (Split) */}
                    <div className={`flex-1 flex transition-opacity duration-300 ${viewMode === 'code' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none absolute inset-0'}`}>
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
                            bpmnMissingDI={bpmnMissingDI}
                            onInlineAutoLayout={handleInlineAutoLayout}
                            autoLayoutProcessing={autoLayoutProcessing}
                            errorLine={errorLine}
                            showTemplates={showTemplates}
                            setShowTemplates={setShowTemplates}
                            fileInputRef={fileInputRef}
                            readOnly={readOnly}
                            editorRef={editorRef}
                        />
                    </div>

                    {/* Visual View */}
                    <div className={`flex-1 w-full h-full transition-opacity duration-300 ${viewMode === 'visual' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none absolute inset-0'}`}>
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
                    </div>
                </div>

                {/* AI Copilot Sidebar */}
                {showCopilot && (
                    <aside className="w-96 border-l border-slate-200 bg-white transition-all duration-300 ease-in-out flex flex-col z-20 shadow-xl">
                        <AICopilot 
                            isOpen={showCopilot} 
                            onClose={() => setShowCopilot(false)} 
                            contextCode={textInput} 
                            diagramType={diagramType}
                            onApplyCode={handleAiCodeApply}
                            isSidebar={true}
                        />
                    </aside>
                )}
            </main>

            {/* Template Modal */}
            <TemplateGalleryModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} onSelect={setTextInput} diagramType={diagramType} />
            
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
