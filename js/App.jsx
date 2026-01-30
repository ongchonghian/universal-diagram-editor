import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DIAGRAM_TYPES, KROKI_BASE_URL, MERMAID_TEMPLATES, PLANTUML_TEMPLATES } from './config.js';
import { 
    encodeKroki, detectTypeFromExtension, detectTypeFromContent, detectSpecificModel, bpmnHasDI, 
    isValidBpmnContent, applyBpmnAutoLayout, extractErrorLine, parseErrorInfoFallback 
} from './utils.js';
import { getCursorContext } from './context-detection.js';
import { parseError } from './error-diagnostics/index.js';
import { Button, LogoLoader, StatusBadge } from './components/common.jsx';
import MonacoWrapper from './components/editors/MonacoWrapper.jsx';
import { PlantUmlToolbar } from './components/PlantUmlToolbar.jsx';
import { MermaidToolbar } from './components/MermaidToolbar.jsx';
import { TemplateGalleryModal } from './components/dialogs/TemplateGalleryModal.jsx';
import { BpmnAutoLayoutDialog } from './components/dialogs/BpmnAutoLayoutDialog.jsx';
import { UpdatePanel } from './components/UpdatePanel.jsx';
import { BpmnVisualEditor } from './components/editors/BpmnVisualEditor.jsx';
import { MermaidVisualEditor } from './components/editors/mermaid/MermaidVisualEditor.jsx';
import { ExcalidrawVisualEditor } from './components/editors/ExcalidrawVisualEditor.jsx';
import { LikeC4VisualEditor } from './components/editors/LikeC4VisualEditor.jsx';
import { VegaVisualEditor } from './components/editors/VegaVisualEditor.jsx';
import { createMermaidSyncController } from './components/editors/mermaid/utils.js';

// MAIN APP COMPONENT
const App = () => {
    const [textInput, setTextInput] = useState('');
    const [diagramType, setDiagramType] = useState('bpmn');
    const [detectedModel, setDetectedModel] = useState('');
    const [contextModel, setContextModel] = useState({ model: '', isInsideBlock: false });
    const [url, setUrl] = useState('');
    const [stats, setStats] = useState({ length: 0, method: 'GET' });
    const [loading, setLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);
    const [errorLine, setErrorLine] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [svgContent, setSvgContent] = useState(null);
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
    const [viewMode, setViewMode] = useState('code');
    const [showTemplates, setShowTemplates] = useState(false);
    const [showUpdatePanel, setShowUpdatePanel] = useState(false);
    
    // BPMN Auto-Layout dialog state
    const [showAutoLayoutDialog, setShowAutoLayoutDialog] = useState(false);
    const [pendingBpmnXml, setPendingBpmnXml] = useState(null);
    const [autoLayoutProcessing, setAutoLayoutProcessing] = useState(false);
    const [bpmnMissingDI, setBpmnMissingDI] = useState(false);
    
    // Mermaid state
    const [mermaidAst, setMermaidAst] = useState(null);
    const [mermaidAstLoaded, setMermaidAstLoaded] = useState(!!window.MermaidASTLoaded);
    const mermaidSyncRef = useRef(createMermaidSyncController());
    
    const editorRef = useRef(null);
    
    // Check if visual editor is supported for current type AND content
    const isC4PlantUML = diagramType === 'c4' && (detectedModel === 'C4 Model (PlantUML)' || (textInput && textInput.includes('@startuml')));
    const isVisualSupported = DIAGRAM_TYPES[diagramType]?.hasVisualEditor === true && !isC4PlantUML;
    
    // Force code view if visual is not supported (e.g. loaded C4 PlantUML)
    useEffect(() => {
        if (!isVisualSupported && viewMode === 'visual') {
            setViewMode('code');
        }
    }, [isVisualSupported, viewMode]);

    // Listen for MermaidAST load
    useEffect(() => {
        if (window.MermaidASTLoaded) setMermaidAstLoaded(true);
        else {
            const handler = () => setMermaidAstLoaded(true);
            window.addEventListener('mermaid-ast-loaded', handler, { once: true });
            return () => window.removeEventListener('mermaid-ast-loaded', handler);
        }
    }, []);

    // Sync Mermaid AST
    useEffect(() => {
        if (diagramType !== 'mermaid' || !textInput.trim()) {
            setMermaidAst(null);
            return;
        }
        mermaidSyncRef.current.parseCode(
            textInput,
            (ast) => setMermaidAst(ast),
            (error) => console.log('Mermaid parse error:', error)
        );
    }, [textInput, diagramType]);

    // Update cursor context
    useEffect(() => {
        const context = getCursorContext(textInput, cursorPos.line, cursorPos.col, diagramType);
        setContextModel(context);
    }, [textInput, cursorPos, diagramType]);

    // Generate preview
    useEffect(() => {
        if (!textInput.trim()) {
            setUrl('');
            setPreviewImage(null);
            setSvgContent(null);
            setPreviewError(null);
            setBpmnMissingDI(false);
            setStats({ length: 0, method: '' });
            return;
        }

        const detected = detectSpecificModel(textInput, diagramType);
        setDetectedModel(detected);
        
        // Check for BPMN without DI - detect early and show helpful message
        if (diagramType === 'bpmn' && isValidBpmnContent(textInput) && !bpmnHasDI(textInput)) {
            setBpmnMissingDI(true);
            setPreviewError('This BPMN content is missing diagram layout information (DI). Without it, the diagram cannot be rendered.');
            setPreviewImage(null);
            setSvgContent(null);
            setLoading(false);
            setStats({ length: textInput.length, method: '' });
            return;
        }
        setBpmnMissingDI(false);
        
        const encoded = encodeKroki(textInput);
        if (!encoded) {
            setPreviewError('Failed to encode diagram');
            return;
        }

        // Determine correct Kroki endpoint
        let krokiType = diagramType;
        if (diagramType === 'c4' && (textInput.includes('@startuml') || textInput.includes('!include'))) {
            krokiType = 'c4plantuml';
        }

        const baseUrl = KROKI_BASE_URL;
        const newUrl = `${baseUrl}/${krokiType}/svg/${encoded}`;
        setUrl(newUrl);
        setStats({ length: textInput.length, method: newUrl.length > 4000 ? 'POST' : 'GET' });
        setPreviewError(null);
        setErrorLine(null);
        if (editorRef.current?.clearMarkers) editorRef.current.clearMarkers();
        setLoading(true);

        const fetchPreview = async () => {
            // Skip preview for:
            // 1. LikeC4 legacy (if any)
            // 2. C4 Model in Visual (JSON) mode - we render client side
            if (diagramType === 'likec4') return;
            if (diagramType === 'c4' && !isC4PlantUML) {
                // It's visual/JSON C4, so no Kroki preview needed (or supported)
                setSvgContent(null);
                setPreviewImage(null);
                setLoading(false);
                return; 
            }

            try {
                let response;
                if (newUrl.length > 4000) {
                    response = await fetch(`${baseUrl}/${krokiType}/svg`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain' },
                        body: textInput
                    });
                } else {
                    response = await fetch(newUrl);
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `HTTP ${response.status}`);
                }

                const svg = await response.text();
                setSvgContent(svg);
                setPreviewImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
                setPreviewError(null);
            } catch (err) {
                setPreviewError(err.message);
                setSvgContent(null);
                setPreviewImage(null);
                // Use consolidated error diagnostics module
                const errorInfo = parseError(err.message, diagramType, textInput) || parseErrorInfoFallback(err.message, diagramType);
                const line = errorInfo?.line || extractErrorLine(err.message);
                if (line) {
                    setErrorLine(line);
                    if (editorRef.current?.setMarkers) {
                        editorRef.current.setMarkers([{
                            startLineNumber: line,
                            startColumn: errorInfo?.column || 1,
                            endLineNumber: line,
                            endColumn: errorInfo?.endColumn || 1000,
                            message: errorInfo?.shortMessage || err.message,
                            severity: 8,
                            code: errorInfo?.code || 'syntax-error',
                            source: 'kroki',
                            relatedInformation: errorInfo ? [{
                                expected: errorInfo.expected,
                                found: errorInfo.found,
                                column: errorInfo.column,
                                diagramType: diagramType
                            }] : [{ diagramType: diagramType }]
                        }]);
                    }
                }
            }
            setLoading(false);
        };

        const timer = setTimeout(fetchPreview, 500);
        return () => clearTimeout(timer);
    }, [textInput, diagramType]);

    // Handle BPMN file content - check for DI and prompt if missing
    const handleBpmnFileContent = useCallback((content, detectedType) => {
        if (detectedType === 'bpmn' && !bpmnHasDI(content)) {
            // BPMN without DI - show dialog
            setPendingBpmnXml(content);
            setShowAutoLayoutDialog(true);
        } else {
            // Has DI or not BPMN - load directly
            setTextInput(content);
        }
    }, []);

    // Handle auto-layout dialog actions
    const handleApplyAutoLayout = useCallback(async () => {
        if (!pendingBpmnXml) return;
        setAutoLayoutProcessing(true);
        try {
            const layoutedXml = await applyBpmnAutoLayout(pendingBpmnXml);
            setTextInput(layoutedXml);
            setShowAutoLayoutDialog(false);
            setPendingBpmnXml(null);
        } catch (err) {
            console.error('Auto-layout failed:', err);
            setPreviewError('Auto-layout failed: ' + err.message);
            // Load original XML anyway
            setTextInput(pendingBpmnXml);
            setShowAutoLayoutDialog(false);
            setPendingBpmnXml(null);
        } finally {
            setAutoLayoutProcessing(false);
        }
    }, [pendingBpmnXml]);

    const handleSkipAutoLayout = useCallback(() => {
        if (pendingBpmnXml) {
            setTextInput(pendingBpmnXml);
        }
        setShowAutoLayoutDialog(false);
        setPendingBpmnXml(null);
    }, [pendingBpmnXml]);

    // Handle inline auto-layout from error panel (for pasted BPMN without DI)
    const handleInlineAutoLayout = useCallback(async () => {
        if (!textInput || !bpmnMissingDI) return;
        setAutoLayoutProcessing(true);
        setPreviewError('Generating layout...');
        try {
            const layoutedXml = await applyBpmnAutoLayout(textInput);
            setTextInput(layoutedXml);
            setBpmnMissingDI(false);
            setPreviewError(null);
        } catch (err) {
            console.error('Auto-layout failed:', err);
            setPreviewError('Auto-layout failed: ' + err.message);
        } finally {
            setAutoLayoutProcessing(false);
        }
    }, [textInput, bpmnMissingDI]);

    // Handle file drop
    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const detectedType = detectTypeFromContent(file.name, content);
            setDiagramType(detectedType);
            handleBpmnFileContent(content, detectedType);
        };
        reader.readAsText(file);
    }, [handleBpmnFileContent]);

    // Handle visual editor changes
    const handleVisualChange = useCallback((newXml) => {
        if (newXml !== textInput) setTextInput(newXml);
    }, [textInput]);

    // Handle snippet insert
    const handleSnippetInsert = useCallback((code) => {
        if (editorRef.current) editorRef.current.insertAtCursor(code);
    }, []);

    // File input ref for Open button
    const fileInputRef = useRef(null);

    // Handle file open via button
    const handleFileOpen = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const detectedType = detectTypeFromContent(file.name, content);
            setDiagramType(detectedType);
            handleBpmnFileContent(content, detectedType);
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset for same file selection
    }, [handleBpmnFileContent]);

    // Download SVG
    const handleDownloadSvg = useCallback(() => {
        if (!svgContent) return;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram-${diagramType}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    }, [svgContent, diagramType]);

    // Download PNG
    const handleDownloadPng = useCallback(() => {
        if (!svgContent) return;
        const img = new Image();
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width * 2; // 2x for better quality
            canvas.height = img.height * 2;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                const pngUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = `diagram-${diagramType}.png`;
                a.click();
                URL.revokeObjectURL(pngUrl);
            }, 'image/png');
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }, [svgContent, diagramType]);

    // Download source code
    const handleDownloadSource = useCallback(() => {
        if (!textInput.trim()) return;
        const ext = DIAGRAM_TYPES[diagramType]?.extensions?.[0] || '.txt';
        const mimeType = ext === '.json' ? 'application/json' : (ext === '.xml' || ext === '.bpmn' ? 'application/xml' : 'text/plain');
        const blob = new Blob([textInput], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    }, [textInput, diagramType]);

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
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden relative">
                {/* Code View (Split) */}
                <div className={`flex-1 flex transition-opacity duration-300 ${viewMode === 'code' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none absolute inset-0'}`}>
                    {/* Editor Panel */}
                    <div className="w-1/2 flex flex-col border-r border-slate-200 relative">
                        {diagramType === 'plantuml' && <PlantUmlToolbar detectedModel={detectedModel} contextModel={contextModel} onInsert={handleSnippetInsert} />}
                        {diagramType === 'mermaid' && <MermaidToolbar detectedModel={detectedModel} contextModel={contextModel} onInsert={handleSnippetInsert} />}
                        <div className="flex-1">
                            <MonacoWrapper
                                ref={editorRef}
                                value={textInput}
                                onChange={setTextInput}
                                language={DIAGRAM_TYPES[diagramType]?.monacoLang || 'xml'}
                                onCursorChange={(line, col) => setCursorPos({ line, col })}
                            />
                        </div>
                        <div className="flex-none px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
                            <span>{stats.length} chars {stats.method && `| ${stats.method}`}</span>
                        </div>
                        <div className="absolute inset-0 z-20 pointer-events-none">
                            {/* Empty State Overlay for Code View */}
                            {(!textInput || !textInput.trim()) && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm pointer-events-auto">
                                    <div className="text-center p-8 bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full mx-4">
                                        <i className="fas fa-code text-4xl text-indigo-500 mb-4"></i>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">Editor Empty</h3>
                                        <p className="text-sm text-slate-600 mb-6">Start a new diagram or open an existing file.</p>
                                        <div className="space-y-3">
                                            <button 
                                                onClick={() => {
                                                    if (['mermaid', 'plantuml', 'vega', 'vegalite'].includes(diagramType)) {
                                                        setShowTemplates(true);
                                                    } else if (diagramType === 'bpmn') {
                                                        const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>\n<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">\n  <bpmn:process id="Process_1" isExecutable="false">\n    <bpmn:startEvent id="StartEvent_1" />\n  </bpmn:process>\n  <bpmndi:BPMNDiagram id="BPMNDiagram_1">\n    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">\n      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">\n        <dc:Bounds x="412" y="240" width="36" height="36" />\n      </bpmndi:BPMNShape>\n    </bpmndi:BPMNPlane>\n  </bpmndi:BPMNDiagram>\n</bpmn:definitions>`;
                                                        setTextInput(defaultXml);
                                                    } else if (diagramType === 'excalidraw') {
                                                        const defaultData = { type: "excalidraw", version: 2, source: "https://excalidraw.com", elements: [], appState: { viewBackgroundColor: "#ffffff", gridSize: null }, files: {} };
                                                        setTextInput(JSON.stringify(defaultData, null, 2));
                                                    } else if (diagramType === 'c4') {
                                                        // Default to Visual C4 (JSON)
                                                        const defaultData = { nodes: [], edges: [] };
                                                        setTextInput(JSON.stringify(defaultData, null, 2));
                                                        // Auto-switch to design view for better UX?
                                                        setViewMode('visual');
                                                    } else {
                                                        // Fallback for others
                                                        setTextInput('// Start typing or selecting a template...');
                                                    }
                                                }}
                                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center justify-center"
                                            >
                                                <i className="fas fa-plus mr-2"></i>
                                                Create New
                                            </button>
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm flex items-center justify-center"
                                            >
                                                <i className="fas fa-folder-open mr-2"></i>
                                                Open File...
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className="w-1/2 flex flex-col bg-slate-100">
                        <div className="flex-none px-3 py-2 bg-white border-b border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600">
                                <i className="fas fa-image mr-1.5"></i> Preview
                            </span>
                            {loading && <LogoLoader size="sm" text="Rendering..." />}
                        </div>
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center" style={{backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                            {previewError ? (
                                <div className="text-center max-w-md">
                                    {bpmnMissingDI ? (
                                        <>
                                            <i className="fas fa-diagram-project text-4xl text-amber-500 mb-3"></i>
                                            <p className="text-sm text-amber-700 font-medium mb-2">Missing Diagram Layout</p>
                                            <p className="text-xs text-slate-600 mb-3">This BPMN content doesn't contain visual layout information (DI). Without it, the diagram cannot be rendered.</p>
                                            <button 
                                                onClick={handleInlineAutoLayout}
                                                disabled={autoLayoutProcessing}
                                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
                                            >
                                                {autoLayoutProcessing ? (
                                                    <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                                                ) : (
                                                    <><i className="fas fa-magic"></i> Auto-Generate Layout</>
                                                )}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-3"></i>
                                            <p className="text-sm text-red-600 font-medium mb-2">Rendering Error</p>
                                            <pre className="text-xs text-slate-600 bg-white p-3 rounded border overflow-auto max-h-48">{previewError}</pre>
                                            {errorLine && (
                                                <button onClick={() => editorRef.current?.scrollToLine(errorLine)}
                                                    className="mt-2 text-xs text-indigo-600 hover:underline">
                                                    Go to line {errorLine}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : previewImage ? (
                                <img src={previewImage} alt="Diagram Preview" className="max-w-full h-auto bg-white shadow-lg rounded" />
                            ) : (
                                <div className="text-center text-slate-400">
                                    <i className="fas fa-image text-4xl mb-3 opacity-30"></i>
                                    <p className="text-sm">Enter diagram code to see preview</p>
                                    <p className="text-xs mt-1">or drag & drop a file</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Visual View */}
                <div className={`flex-1 w-full h-full transition-opacity duration-300 ${viewMode === 'visual' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none absolute inset-0'}`}>
                    {diagramType === 'bpmn' && viewMode === 'visual' && (
                        <BpmnVisualEditor xml={textInput} onChange={handleVisualChange} onError={setPreviewError} />
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
                        />
                    )}
                    {diagramType === 'excalidraw' && viewMode === 'visual' && (
                        <ExcalidrawVisualEditor 
                            json={textInput} 
                            onChange={handleVisualChange} 
                            onError={setPreviewError} 
                        />
                    )}

                    {diagramType === 'c4' && viewMode === 'visual' && (
                        <LikeC4VisualEditor 
                            code={textInput} 
                            onChange={handleVisualChange} 
                            onError={setPreviewError} 
                        />
                    )}
                    {(diagramType === 'vega' || diagramType === 'vegalite') && viewMode === 'visual' && (
                        <VegaVisualEditor 
                            code={textInput}
                            diagramType={diagramType}
                            onChange={handleVisualChange} 
                            onError={setPreviewError} 
                        />
                    )}
                </div>
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
