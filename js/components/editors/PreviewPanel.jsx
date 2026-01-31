import React, { useEffect, useRef, useState } from 'react';
import { LogoLoader } from '../common.jsx';
import { getPlantUmlSnippets } from '../../utils/plantUmlUtils.js';
import { MERMAID_SNIPPETS } from '../../config.js';

export const PreviewPanel = ({ 
    svgContent, 
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
    diagramType // Added prop
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
                    <img src={previewImage} alt="Diagram Preview" className="max-w-full h-auto bg-white shadow-lg rounded" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center max-w-md">
                        {bpmnMissingDI ? (
                            <>
                                <i className="fas fa-diagram-project text-4xl text-amber-500 mb-3"></i>
                                <p className="text-sm text-amber-700 font-medium mb-2">Missing Diagram Layout</p>
                                <p className="text-xs text-slate-600 mb-3">This BPMN content doesn't contain visual layout information (DI). Without it, the diagram cannot be rendered.</p>
                                <button 
                                    onClick={onInlineAutoLayout}
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
                                <pre className="text-xs text-slate-600 bg-white p-3 rounded border overflow-auto max-h-48 text-left">{error}</pre>
                                {errorLine && (
                                    <button onClick={() => onScrollToLine && onScrollToLine(errorLine)}
                                        className="mt-2 text-xs text-indigo-600 hover:underline">
                                        Go to line {errorLine}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex items-center justify-center p-4"
                 style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                    backgroundSize: '20px 20px'
                 }}>
                <div className="text-center text-slate-400">
                    <i className="fas fa-image text-4xl mb-3 opacity-30"></i>
                    <p className="text-sm">Enter diagram code to see preview</p>
                    <p className="text-xs mt-1">or drag & drop a file</p>
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
                className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()} 
            >
                {contextMenu.targetText && (
                    <>
                        <div className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-indigo-50 border-b border-indigo-100 mb-1 truncate max-w-[200px]">
                            Selected: {contextMenu.targetText}
                        </div>
                        <button
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-b border-slate-100"
                            onClick={() => {
                                onRenameRequest && onRenameRequest(contextMenu.targetText);
                                setContextMenu(null);
                            }}
                        >
                            <i className="fas fa-pen w-4 text-center opacity-70"></i>
                            Rename
                        </button>
                    </>
                )}

                <div className="px-3 py-1.5 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                    Insert Snippet
                </div>
                
                {snippets.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto py-1">
                        {snippets.map((snippet, idx) => (
                            <button
                                key={idx}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                                onClick={() => {
                                    onSnippetSelect && onSnippetSelect(snippet);
                                    setContextMenu(null);
                                }}
                            >
                                <i className={`fas ${snippet.icon} w-4 text-center opacity-70`}></i>
                                {snippet.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="px-3 py-2 text-xs text-slate-400 italic">No snippets available for this context</div>
                )}
            </div>
        );
    };

    return (
        <div className="w-1/2 flex flex-col bg-slate-100 relative">
            <style jsx global>{`
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
            
            <div className="flex-none px-3 py-2 bg-white border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                    <i className="fas fa-image mr-1.5"></i> Preview
                </span>
                {loading && <LogoLoader size="sm" text="Rendering..." />}
            </div>
            
            <div className="flex-1 overflow-auto flex flex-col">
                {renderContent()}
            </div>
            
            {renderContextMenu()}
        </div>
    );
};
