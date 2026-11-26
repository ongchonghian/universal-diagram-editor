import React, { useEffect, useRef, useState } from 'react';
import { Button, Spinner } from '../common.jsx';
import { getPlantUmlSnippets } from '../../utils/plantUmlUtils.js';
import { MERMAID_SNIPPETS } from '../../config.js';

export const PreviewPanel = ({ 
    svgContent, 
    htmlContent, // A whole page from a renderer that returns HTML in place of SVG (Archify)
    previewImage, 
    loading, 
    error, 
    bpmnMissingDI, 
    onElementClick, 
    onInlineAutoLayout, 
    autoLayoutProcessing,
    onRetry,
    errorLine,
    onScrollToLine,
    contextModel,
    onSnippetSelect,
    onInsert,
    onRenameRequest,
    diagramType, // Added prop
    isFixing = false,
    fixMessage = null, // The result of the last Fix attempt: { tone: 'error' | 'warning', text }
    designOnly = false, // The code is drawn only in Design view (a C4 model written as JSON)
    onOpenDesign
}) => {
    const containerRef = useRef(null);
    const [selectedText, setSelectedText] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);

    // Helper to find text from event target
    const findTextFromTarget = (target) => {
        let textFound = null;
        
        // Check if we clicked a text element directly
        if (target.tagName === 'text' || target.tagName === 'tspan') {
            textFound = target.textContent.trim();
        } else {
            // Try to find a parent group
            let parent = target.closest('g');
            if (parent) {
                // Look for text within this group
                const textEl = parent.querySelector('text');
                if (textEl) {
                    textFound = textEl.textContent.trim();
                }
            }
        }
        return textFound;
    };

    // Handle clicks on SVG elements
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !svgContent) return;

        const handleClick = (e) => {
            let target = e.target;
            const textFound = findTextFromTarget(target);

            if (textFound && onElementClick) {
                console.log('Clicked element text:', textFound);
                setSelectedText(textFound);
                onElementClick(textFound);
                
                // Visual feedback
                container.querySelectorAll('.highlighted-element').forEach(el => {
                    el.classList.remove('highlighted-element');
                });
                
                const highlightTarget = target.closest('g') || target;
                highlightTarget.classList.add('highlighted-element');
            }
        };

        const handleDoubleClick = (e) => {
            let target = e.target;
            const textFound = findTextFromTarget(target);
            
            if (textFound && onRenameRequest) {
                e.preventDefault();
                e.stopPropagation();
                onRenameRequest(textFound);
            }
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            
            // Find underlying element
            let target = e.target;
            const textFound = findTextFromTarget(target);
            
            if (textFound && onElementClick) {
                 // Auto-select text on right click too
                 onElementClick(textFound);
                 setSelectedText(textFound);
            }

            // Always allow context menu, even if no element clicked (for general snippets)
            if (!contextModel) return;
            
            setContextMenu({ 
                x: e.clientX, 
                y: e.clientY,
                targetText: textFound // Store targeted text
            });
        };

        container.addEventListener('click', handleClick);
        container.addEventListener('dblclick', handleDoubleClick);
        container.addEventListener('contextmenu', handleContextMenu);
        
        return () => {
            container.removeEventListener('click', handleClick);
            container.removeEventListener('dblclick', handleDoubleClick);
            container.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [svgContent, onElementClick, contextModel, onRenameRequest]);

    // Close context menu on any click
    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });
        return () => {
            window.removeEventListener('click', closeMenu);
            window.removeEventListener('keydown', closeMenu);
        };
    }, []);

    // Inject SVG content safely
    const renderContent = () => {
        if (loading) return null;

        if (htmlContent) {
            // The page runs its own viewer script. The sandbox gives the page a separate origin,
            // so the script cannot read the editor's saved drafts or API keys.
            return (
                <iframe
                    title="Diagram preview"
                    srcDoc={htmlContent}
                    sandbox="allow-scripts allow-downloads"
                    className="flex-1 w-full min-h-0 border-0 bg-white"
                />
            );
        }
        
        if (svgContent) {
            return (
                <div 
                    ref={containerRef}
                    className="w-full h-full flex items-center justify-center p-4 diagram-preview"
                    dangerouslySetInnerHTML={{ __html: svgContent }} 
                    style={{
                        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                        backgroundSize: '20px 20px'
                    }}
                />
            );
        }
        
        if (previewImage) {
            return (
                <div className="w-full h-full flex items-center justify-center p-4"
                     style={{
                        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                        backgroundSize: '20px 20px'
                     }}>
                    <img src={previewImage} alt="Diagram preview" className="max-w-full h-auto bg-white shadow-sm ring-1 ring-slate-900/5 rounded-lg" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex-1 flex items-center justify-center p-6">
                    {bpmnMissingDI ? (
                        <div className="w-full max-w-sm text-center">
                            <span className="mx-auto mb-4 w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center" aria-hidden="true">
                                <i className="fas fa-diagram-project"></i>
                            </span>
                            <h3 className="text-[15px] font-semibold text-slate-900">This BPMN file has no layout</h3>
                            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                                The file describes the process, but not where each shape sits on the page. The app can lay out the diagram for you.
                            </p>
                            <Button
                                variant="primary"
                                size="lg"
                                className="mt-5"
                                icon={autoLayoutProcessing ? undefined : 'fas fa-magic'}
                                onClick={onInlineAutoLayout}
                                disabled={autoLayoutProcessing}
                            >
                                {autoLayoutProcessing ? <><span className="ui-spinner !border-indigo-300 !border-t-white mr-1.5 align-[-2px]"></span>Laying out the diagram…</> : 'Generate the layout'}
                            </Button>
                        </div>
                    ) : (
                        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="flex items-start gap-3 px-4 pt-4">
                                <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0" aria-hidden="true">
                                    <i className="fas fa-exclamation-triangle text-sm"></i>
                                </span>
                                <div className="min-w-0">
                                    <h3 className="text-[13px] font-semibold text-slate-900">The diagram could not be drawn</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {errorLine ? `The code has an error on line ${errorLine}.` : 'The code has an error.'}
                                    </p>
                                </div>
                            </div>
                            <pre className="mx-4 mt-3 text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-md overflow-auto ui-scroll max-h-48 text-left whitespace-pre font-mono">{error}</pre>
                            {fixMessage && (
                                <p role="status" className={`mx-4 mt-3 text-xs leading-relaxed text-left px-3 py-2 rounded-md border ${fixMessage.tone === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {fixMessage.text}
                                </p>
                            )}
                            <div className="flex items-center justify-end gap-2 px-4 py-3 mt-3 border-t border-slate-100 bg-slate-50/70">
                                {errorLine && (
                                    <Button variant="secondary" size="sm" icon="fas fa-arrow-right" onClick={() => onScrollToLine && onScrollToLine(errorLine)}>
                                        Go to line {errorLine}
                                    </Button>
                                )}
                                {onRetry && (
                                    <Button variant="primary" size="sm" icon={isFixing ? undefined : 'fas fa-magic'} onClick={onRetry} disabled={isFixing} aria-busy={isFixing}>
                                        {isFixing ? <><span className="ui-spinner !border-indigo-300 !border-t-white mr-1.5 align-[-2px]"></span>Smith is fixing the code…</> : 'Fix with Smith'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex-1 flex items-center justify-center p-6"
                 style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                    backgroundSize: '20px 20px'
                 }}>
                <div className="text-center max-w-xs">
                    <span className="mx-auto mb-3 w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-400 flex items-center justify-center" aria-hidden="true">
                        <i className="fas fa-image"></i>
                    </span>
                    {designOnly ? (
                        <>
                            <p className="text-[13px] font-medium text-slate-600">This C4 model is drawn in Design view</p>
                            <p className="text-xs text-slate-400 mt-1">C4 models written as JSON have no preview here. Open Design view to see and edit the model.</p>
                            {onOpenDesign && (
                                <Button variant="secondary" size="sm" icon="fas fa-paint-brush" onClick={onOpenDesign} className="mt-3">Open Design view</Button>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-[13px] font-medium text-slate-600">The preview appears here</p>
                            <p className="text-xs text-slate-400 mt-1">Type diagram code in the editor, or drop a file on this page.</p>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderContextMenu = () => {
        if (!contextMenu || !contextModel) return null;
        
        let snippets = [];

        if (diagramType === 'mermaid') {
             let effectiveContext = 'none';
             if (contextModel && contextModel.isInsideBlock) {
                 effectiveContext = contextModel.model || 'none';
             }
             
             const lowerCtx = effectiveContext.toLowerCase();
             const context = lowerCtx.includes('sequence') ? 'sequence' :
                    lowerCtx.includes('flowchart') ? 'flowchart' :
                    lowerCtx.includes('class') ? 'class' :
                    lowerCtx.includes('state') ? 'state' :
                    lowerCtx.includes('er diagram') ? 'er' :
                    'none';

             snippets = MERMAID_SNIPPETS[context] || [];
             if (MERMAID_SNIPPETS.styling) {
                 snippets = [...snippets, ...MERMAID_SNIPPETS.styling];
             }
        } else {
             // Default to PlantUML
             snippets = getPlantUmlSnippets(contextModel);
        }
        
        return (
            <div 
                className="fixed z-50 bg-white rounded-lg shadow-xl ring-1 ring-slate-900/5 border border-slate-200 py-1 min-w-[180px] animate-fade-in"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()} 
            >
                {contextMenu.targetText && (
                    <>
                        <div className="px-3 py-1.5 text-xs text-slate-500 border-b border-slate-100 mb-1 truncate max-w-[220px]">
                            Selected: <span className="font-medium text-slate-800">{contextMenu.targetText}</span>
                        </div>
                        <button
                            className="w-full text-left px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
                            onClick={() => {
                                onRenameRequest && onRenameRequest(contextMenu.targetText);
                                setContextMenu(null);
                            }}
                        >
                            <i className="fas fa-pen w-4 text-center text-[11px] text-slate-400" aria-hidden="true"></i>
                            Rename
                        </button>
                    </>
                )}

                <div className="px-3 pt-2 pb-1 text-xs font-medium text-slate-500">
                    Insert a snippet
                </div>
                
                {snippets.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto ui-scroll pb-1">
                        {snippets.map((snippet, idx) => (
                            <button
                                key={idx}
                                className="w-full text-left px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2 transition-colors"
                                onClick={() => {
                                    onSnippetSelect && onSnippetSelect(snippet);
                                    setContextMenu(null);
                                }}
                            >
                                <i className={`fas ${snippet.icon} w-4 text-center text-[11px] text-slate-400`} aria-hidden="true"></i>
                                {snippet.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="px-3 py-2 text-xs text-slate-400">This part of the diagram has no snippets.</div>
                )}
            </div>
        );
    };

    return (
        <div className="h-1/2 md:h-auto md:w-1/2 min-w-0 flex flex-col bg-slate-50 relative">
            <style>{`
                .highlighted-element {
                    outline: 2px solid #6366f1;
                    outline-offset: 2px;
                    cursor: pointer;
                }
                .highlighted-element text {
                    font-weight: bold;
                    fill: #4f46e5;
                }
                .diagram-preview svg {
                    max-width: 100%;
                    height: auto;
                }
                .diagram-preview g:hover {
                    cursor: pointer;
                    opacity: 0.8;
                }
            `}</style>
            
            <div className="flex-none h-10 px-3 bg-white border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                    <i className="fas fa-image text-[11px] text-slate-400" aria-hidden="true"></i> Preview
                </span>
                {loading && <Spinner text="Drawing…" />}
            </div>
            
            <div className="flex-1 overflow-auto ui-scroll flex flex-col">
                {renderContent()}
            </div>
            
            {renderContextMenu()}
        </div>
    );
};
