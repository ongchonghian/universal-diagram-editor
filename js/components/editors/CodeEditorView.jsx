import React, { useRef, useState, useCallback, useEffect } from 'react';
import MonacoWrapper from './MonacoWrapper.jsx';
import { PreviewPanel } from './PreviewPanel.jsx';
import { PlantUmlToolbar } from '../PlantUmlToolbar.jsx';
import { MermaidToolbar } from '../MermaidToolbar.jsx';
import { SnippetInsertionDialog } from '../dialogs/SnippetInsertionDialog.jsx';
import { aiService } from '../../services/ai-service.js';

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
    readOnly = false // Added prop
}) => {
    const editorRef = useRef(null);
    const [selectedElement, setSelectedElement] = useState(null);
    const [snippetDialogSnippet, setSnippetDialogSnippet] = useState(null);
    const [isFixing, setIsFixing] = useState(false);

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

    const [editorWidth, setEditorWidth] = useState(50); // percentage
    const splitPaneRef = useRef(null);

    // Resize handler
    const handleResizeMouseDown = useCallback((e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = editorWidth;
        const containerWidth = splitPaneRef.current?.getBoundingClientRect().width || window.innerWidth;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaPercent = (deltaX / containerWidth) * 100;
            const newWidth = Math.min(Math.max(20, startWidth + deltaPercent), 80); // Min 20%, Max 80%
            setEditorWidth(newWidth);
            
            // Trigger Monaco layout update
            if (editorRef.current) {
                // We might need to access the monaco instance directly or trigger a resize event
                window.dispatchEvent(new Event('resize')); 
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            // Final layout update
            window.dispatchEvent(new Event('resize'));
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [editorWidth]);

    // Handle Auto-Fix request
    const handleAutoFix = async () => {
        if (!previewError || !textInput) return;
        
        setIsFixing(true);
        try {
            console.log("Requesting AI Auto-Fix...");
            
            // Call AI Service to fix
            const fixedCode = await aiService.fixDiagram(textInput, previewError, diagramType);
            
            if (fixedCode && fixedCode !== textInput) {
                setTextInput(fixedCode);
            }
        } catch (e) {
            console.error("Auto-Fix failed:", e);
            alert("Failed to auto-fix diagram: " + e.message);
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <div ref={splitPaneRef} className="flex-1 flex overflow-hidden transition-opacity duration-300 opacity-100 z-10 relative h-full">
            {/* Editor Panel */}
            <div 
                className="flex flex-col border-r border-slate-200 relative h-full" 
                style={{ width: `${editorWidth}%` }}
            >
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
                        code={textInput}
                    />
                )}
                <div className="flex-1 relative min-h-0">
                    <div className="absolute inset-0">
                        <MonacoWrapper
                            ref={editorRef}
                            value={textInput}
                            onChange={setTextInput}
                            language={
                                diagramType === 'bpmn' ? 'xml' : 
                                diagramType === 'vega' || diagramType === 'vegalite' || diagramType === 'excalidraw' ? 'json' :
                                diagramType === 'c4' ? 'plantuml' : // default
                                diagramType
                            }
                            onCursorChange={(line, col) => setCursorPos({ line, col })}
                            readOnly={readOnly}
                        />
                    </div>
                </div>
                <div className="flex-none px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
                    <div className="flex items-center gap-3">
                        {!readOnly && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => editorRef.current?.undo()}
                                    className="p-1 hover:bg-slate-200 rounded transition-colors" 
                                    title="Undo (Ctrl+Z)"
                                >
                                    <i className="fas fa-undo text-slate-600"></i>
                                </button>
                                <button
                                    onClick={() => editorRef.current?.redo()}
                                    className="p-1 hover:bg-slate-200 rounded transition-colors" 
                                    title="Redo (Cmd+Shift+Z)"
                                >
                                    <i className="fas fa-redo text-slate-600"></i>
                                </button>
                            </div>
                        )}
                        <span>{stats.length} chars {stats.method && `| ${stats.method}`}</span>
                    </div>
                </div>
                
                {/* Empty State Overlay */}
                {(!textInput || !textInput.trim()) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm pointer-events-auto z-20">
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
                                        const defaultData = { nodes: [], edges: [] };
                                        setTextInput(JSON.stringify(defaultData, null, 2));
                                    } else {
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

            {/* Resize Handle */}
            <div
                className="w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 transition-colors z-20 flex flex-col justify-center items-center group touch-none"
                onMouseDown={handleResizeMouseDown}
                style={{ backgroundColor: '#e2e8f0' }} // slate-200
            >
                 <div className="h-8 w-1 bg-slate-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>

            {/* Preview Panel */}
            <div style={{ width: `${100 - editorWidth}%` }} className="flex flex-col relative">
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
                    diagramType={diagramType}
                    code={textInput}
                />
            </div>

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
