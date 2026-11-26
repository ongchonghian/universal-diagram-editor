import React, { useEffect, useRef, useState } from 'react';
import { LogoLoader } from '../common.jsx';
import { ZoomPanWrapper } from '../common/ZoomPanWrapper.jsx';
import { getPlantUmlSnippets } from '../../utils/plantUmlUtils.js';
import { parseMermaid } from '../../utils/mermaid-utils.js';
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
    diagramType, // Added prop
    isFixing = false, // Added prop
    code // Added prop
}) => {
    const containerRef = useRef(null);
    const [selectedText, setSelectedText] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    

    
    // Mermaid Tooltip State
    const [parsedData, setParsedData] = useState([]);
    const [tooltip, setTooltip] = useState(null);

    // Parse Mermaid code when it changes
    useEffect(() => {
        if (diagramType === 'mermaid' && code) {
            try {
                // Detect type from code content for broader support
                let type = 'unknown';
                const lowerCode = code.toLowerCase().trim();
                // Check for config block at start (%%{init...}%%)
                const codeWithoutConfig = lowerCode.replace(/^%%\{[^}]+\}%%\s*/s, '').trim();
                if (codeWithoutConfig.startsWith('gantt') || lowerCode.includes('\ngantt')) type = 'gantt';
                else if (lowerCode.startsWith('journey')) type = 'journey';
                else if (lowerCode.startsWith('pie')) type = 'pie';
                else if (lowerCode.startsWith('timeline')) type = 'timeline';
                else if (lowerCode.startsWith('mindmap')) type = 'mindmap';
                else if (lowerCode.startsWith('graph') || lowerCode.startsWith('flowchart')) type = 'flowchart';
                else if (lowerCode.startsWith('sequence')) type = 'sequence';
                else if (lowerCode.startsWith('class')) type = 'class';
                else if (lowerCode.startsWith('state')) type = 'state';
                else if (lowerCode.startsWith('er')) type = 'er';
                
                if (type !== 'unknown') {
                    const data = parseMermaid(code, type);
                    console.log('Parsed Mermaid data:', type, data.length, 'items', data.slice(0, 3));
                    setParsedData(data);
                } else {
                    console.log('Could not detect Mermaid type from code starting with:', lowerCode.substring(0, 50));
                    setParsedData([]);
                }
            } catch (e) {
                console.error("Failed to parse Mermaid for tooltip", e);
                setParsedData([]);
            }
        } else {
            setParsedData([]);
        }
    }, [code, diagramType]);

    // Ref for ZoomPanWrapper
    const zoomRef = useRef(null);

    // Effect to fit diagram to screen when content changes
    useEffect(() => {
        if (svgContent && zoomRef.current) {
            // Small delay to allow rendering
            setTimeout(() => {
                zoomRef.current.fitToScreen();
            }, 100);
        }
    }, [svgContent]);

    // Helper to find text from event target
    const findTextFromTarget = (target) => {
        let textFound = null;
        
        // 1. Check if we clicked a text element directly
        if ((target.tagName === 'text' || target.tagName === 'tspan') && target.textContent) {
            textFound = target.textContent.trim();
        } 
        
        if (!textFound) {
            // 2. Try to find a parent group and look for text within it
            // For Gantt, be more careful - only look at immediate parent's direct text child
            let parent = target.closest('g');
            if (parent) {
                // Look for direct text child first (more specific)
                const directTextEl = Array.from(parent.children).find(el => el.tagName === 'text');
                if (directTextEl && directTextEl.textContent) {
                    textFound = directTextEl.textContent.trim();
                }
                
                // If no direct text child, try querySelector but limit scope
                if (!textFound) {
                    const textEl = parent.querySelector(':scope > text');
                    if (textEl && textEl.textContent) {
                        textFound = textEl.textContent.trim();
                    }
                }
                
                // Sometimes text is inside foreignObject div (flowcharts, etc)
                if (!textFound) {
                     const div = parent.querySelector('foreignObject div');
                     if (div && div.textContent) textFound = div.textContent.trim();
                }
            }
        }
        
        // 3. Fallback: Check siblings
        if (!textFound && target.parentNode) {
            const siblings = Array.from(target.parentNode.children);
            const textSibling = siblings.find(el => el.tagName === 'text' || el.tagName === 'foreignObject');
            if (textSibling && textSibling.textContent) textFound = textSibling.textContent.trim();
        }
        
        return textFound;
    };

    // Handle clicks on SVG elements
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !svgContent) return;

        // Helper for fuzzy matching (handles truncation and slight differences)
        const fuzzyMatch = (itemText, foundText) => {
            if (!itemText || !foundText) return false;
            const cleanItem = itemText.trim().toLowerCase();
            const cleanFound = foundText.trim().toLowerCase();
            // Exact match (highest priority)
            if (cleanItem === cleanFound) return true;
            // One fully contains the other (for truncated text)
            // But require significant overlap - at least 80% of the shorter string
            const shorter = cleanItem.length < cleanFound.length ? cleanItem : cleanFound;
            const longer = cleanItem.length < cleanFound.length ? cleanFound : cleanItem;
            if (longer.includes(shorter) && shorter.length >= longer.length * 0.7) return true;
            return false;
        };
        
        // Score-based matching for finding best match (returns match score, higher is better)
        const matchScore = (itemText, foundText) => {
            if (!itemText || !foundText) return 0;
            const cleanItem = itemText.trim().toLowerCase();
            const cleanFound = foundText.trim().toLowerCase();
            // Exact match = highest score
            if (cleanItem === cleanFound) return 1000;
            // Full containment with length similarity
            if (cleanItem.includes(cleanFound)) return 500 + (cleanFound.length / cleanItem.length) * 100;
            if (cleanFound.includes(cleanItem)) return 500 + (cleanItem.length / cleanFound.length) * 100;
            return 0;
        };

        const handleClick = (e) => {
            let target = e.target;
            const textFound = findTextFromTarget(target);
            
            // Priority: Check if we have a tooltip data match for this element
            let bestMatchText = textFound;
            
            if (diagramType === 'mermaid' && parsedData.length > 0) {
                 const isGanttBar = parsedData[0].type === 'gantt' && target.tagName === 'rect';
                 if (isGanttBar) bestMatchText = null;

                 // 1. Text Match using score-based matching to find best match
                 if (textFound && !isGanttBar) {
                     let bestMatch = null;
                     let bestScore = 0;
                     for (const item of parsedData) {
                        if (item.type === 'gantt') {
                            const score = matchScore(item.task, textFound);
                            if (score > bestScore) {
                                bestScore = score;
                                bestMatch = item;
                            }
                        }
                     }
                     if (bestMatch) bestMatchText = bestMatch.task;
                 }
                 
                 // 2. For Gantt bars, find the associated text label
                 if (parsedData[0].type === 'gantt' && target.tagName === 'rect') {
                      const barRect = target.getBoundingClientRect();
                      
                      // Find text element at same Y position (same row)
                      const allTextElements = Array.from(container.querySelectorAll('text'));
                      let closestText = null;
                      let closestDistance = Infinity;
                      
                      for (const textEl of allTextElements) {
                          const textRect = textEl.getBoundingClientRect();
                          const yDistance = Math.abs(textRect.top + textRect.height/2 - (barRect.top + barRect.height/2));
                          if (yDistance < 25) {
                              const xDistance = Math.abs(textRect.left - barRect.left);
                              if (yDistance + xDistance/10 < closestDistance) {
                                  closestDistance = yDistance + xDistance/10;
                                  closestText = textEl.textContent?.trim();
                              }
                          }
                      }
                      
                      if (closestText) {
                          // Use score-based matching to find best match
                          let bestMatch = null;
                          let bestScore = 0;
                          for (const item of parsedData) {
                              if (item.type === 'gantt') {
                                  const score = matchScore(item.task, closestText);
                                  if (score > bestScore) {
                                      bestScore = score;
                                      bestMatch = item;
                                  }
                              }
                          }
                          if (bestMatch) bestMatchText = bestMatch.task;
                      }
                      
                      // Fallback: ID matching
                      if (!bestMatchText) {
                          const parent = target.closest('g');
                          const elementId = target.id || (parent ? parent.id : '');
                          if (elementId) {
                              const match = parsedData.find(t => t.id && (elementId === t.id || elementId.endsWith('-' + t.id) || elementId.endsWith(t.id)));
                              if (match) bestMatchText = match.task;
                          }
                      }
                 }
            }

            if (bestMatchText && onElementClick) {
                console.log('Clicked element - textFound:', textFound, 'bestMatch:', bestMatchText);
                setSelectedText(bestMatchText);
                onElementClick(bestMatchText);
                
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

        // We bind these events to the containerRef which is now inside the ZoomPanWrapper content
        // However, ZoomPanWrapper handles mouse events too. We need to be careful.
        // Clicks should propagate if not dragging.
        // Let's attach to the SVG container div directly.
        
        container.addEventListener('click', handleClick);
        container.addEventListener('dblclick', handleDoubleClick);
        container.addEventListener('contextmenu', handleContextMenu);
        
        // Hover Effects for Tooltips
        const handleMouseOver = (e) => {
            if (parsedData.length === 0) return;
            
            const target = e.target;
            const textFound = findTextFromTarget(target);
            const isGanttBar = parsedData.length > 0 && parsedData[0].type === 'gantt' && target.tagName === 'rect';
            
            if (textFound && !isGanttBar) {
                // Find matching data based on text content
                let match = null;
                
                // Use score-based matching to find the best match
                let bestScore = 0;
                for (const item of parsedData) {
                    const type = item.type;
                    let score = 0;
                    
                    if (type === 'gantt' || type === 'journey') {
                        score = matchScore(item.task, textFound);
                    } else if (type === 'pie' || type === 'mindmap' || type === 'flowchart') {
                        score = matchScore(item.label, textFound);
                    } else if (type === 'timeline') {
                        score = matchScore(item.event, textFound);
                    } else if (type === 'sequence') {
                        score = Math.max(matchScore(item.label, textFound), matchScore(item.id, textFound));
                    } else if (type === 'class' || type === 'state' || type === 'er') {
                        score = matchScore(item.name, textFound);
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        match = item;
                    }
                }

                if (match) {
                    // Calculate position relative to viewport
                    const rect = target.getBoundingClientRect();
                    console.log('Tooltip match found:', match.task || match.label || match.name, 'for text:', textFound);
                    setTooltip({
                        x: rect.right + 10,
                        y: rect.top,
                        data: match
                    });
                }
            } else if (parsedData.length > 0) {
                 // Fallback strategies for diagrams where text matching is unreliable (Gantt, Pie)
                 
                 // PIE CHART SLICE LOGIC
                 if (parsedData[0].type === 'pie' && target.tagName === 'path') {
                    const allPaths = Array.from(container.querySelectorAll('path'));
                    const sliceIndex = allPaths.indexOf(target);
                    if (sliceIndex >= 0 && sliceIndex < parsedData.length) {
                        setTooltip({
                            x: e.clientX + 15,
                            y: e.clientY + 15,
                            data: parsedData[sliceIndex]
                        });
                        // Allow highlighting based on data
                        if (onElementClick) {
                             // We don't auto-click here to avoid jumping around, but if user clicks, we can use this data
                        }
                    }
                 }
                 
                 // GANTT CHART TASK LOGIC
                 // Strategy: Find the text label associated with this bar and match by text
                 
                 if (parsedData[0].type === 'gantt' && target.tagName === 'rect') {
                     const parent = target.closest('g');
                     const barRect = target.getBoundingClientRect();
                     
                     // Strategy 1: Find text element in same row (similar Y position)
                     // Gantt task labels are usually aligned with their bars
                     const allTextElements = Array.from(container.querySelectorAll('text'));
                     let closestText = null;
                     let closestDistance = Infinity;
                     
                     for (const textEl of allTextElements) {
                         const textRect = textEl.getBoundingClientRect();
                         // Check if text is roughly at same vertical position (within 20px)
                         const yDistance = Math.abs(textRect.top + textRect.height/2 - (barRect.top + barRect.height/2));
                         if (yDistance < 25) {
                             // Prefer text that's to the left of the bar (task labels) or overlapping
                             const xDistance = Math.abs(textRect.left - barRect.left);
                             if (yDistance + xDistance/10 < closestDistance) {
                                 closestDistance = yDistance + xDistance/10;
                                 closestText = textEl.textContent?.trim();
                             }
                         }
                     }
                     
                     if (closestText) {
                         // Use score-based matching to find best match
                         let bestMatch = null;
                         let bestScore = 0;
                         for (const item of parsedData) {
                             if (item.type === 'gantt') {
                                 const score = matchScore(item.task, closestText);
                                 if (score > bestScore) {
                                     bestScore = score;
                                     bestMatch = item;
                                 }
                             }
                         }
                         if (bestMatch) {
                             console.log('Gantt bar matched via nearby text:', closestText, '->', bestMatch.task, 'score:', bestScore);
                             setTooltip({
                                 x: barRect.right + 10,
                                 y: barRect.top,
                                 data: bestMatch
                             });
                             return;
                         }
                     }
                     
                     // Strategy 2: Try ID matching as fallback
                     const elementId = target.id || (parent ? parent.id : '');
                     if (elementId) {
                         const idMatch = parsedData.find(t => t.id && (elementId === t.id || elementId.endsWith('-' + t.id) || elementId.endsWith(t.id)));
                         if (idMatch) {
                             setTooltip({
                                 x: barRect.right + 10,
                                 y: barRect.top,
                                 data: idMatch
                             });
                             return;
                         }
                     }
                 }
            }
        };

        const handleMouseOut = () => {
             setTooltip(null);
        };

        if (parsedData.length > 0) {
            container.addEventListener('mouseover', handleMouseOver);
            container.addEventListener('mouseout', handleMouseOut);
        }

        return () => {
            container.removeEventListener('click', handleClick);
            container.removeEventListener('dblclick', handleDoubleClick);
            container.removeEventListener('contextmenu', handleContextMenu);
            
            if (parsedData.length > 0) {
                container.removeEventListener('mouseover', handleMouseOver);
                container.removeEventListener('mouseout', handleMouseOut);
            }
        };
    }, [svgContent, onElementClick, contextModel, onRenameRequest, parsedData]);

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
                <ZoomPanWrapper ref={zoomRef} className="w-full h-full bg-slate-100">
                    <div 
                        ref={containerRef}
                        className="diagram-preview w-full h-full flex items-center justify-center p-4 content-container"
                        dangerouslySetInnerHTML={{ __html: svgContent }} 
                        style={{
                            minHeight: '100%',
                            minWidth: '100%'
                        }}
                    />
                </ZoomPanWrapper>
            );
        }
        
        if (previewImage) {
            return (
                <ZoomPanWrapper className="w-full h-full bg-slate-100">
                    <div className="w-full h-full flex items-center justify-center p-4 content-container">
                        <img src={previewImage} alt="Diagram Preview" className="max-w-full h-auto bg-white shadow-lg rounded" />
                    </div>
                </ZoomPanWrapper>
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
                                    <div className="flex gap-2 justify-center mt-3">
                                        {errorLine && (
                                            <button onClick={() => onScrollToLine && onScrollToLine(errorLine)}
                                                className="px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors flex items-center gap-1">
                                                <i className="fas fa-arrow-right"></i> Go to line {errorLine}
                                            </button>
                                        )}
                                        {onRetry && (
                                            <button onClick={onRetry}
                                                disabled={isFixing}
                                                className={`px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors flex items-center gap-1 ${isFixing ? 'opacity-70 cursor-wait' : ''}`}>
                                                {isFixing ? (
                                                    <><i className="fas fa-spinner fa-spin"></i> Fixing...</>
                                                ) : (
                                                    <><i className="fas fa-magic"></i> Auto-Fix (AI)</>
                                                )}
                                            </button>
                                        )}
                                    </div>

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
        <div className="h-full flex flex-col bg-slate-100 relative overflow-hidden">
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
                    max-width: none !important; /* Allow zooming */
                    width: auto !important;
                    height: auto !important;
                    overflow: visible !important;
                }
                .diagram-preview g:hover {
                    cursor: pointer;
                    opacity: 0.8;
                }
            `}</style>
            
            <div className="flex-none px-3 py-2 bg-white border-b border-slate-200 flex items-center justify-between z-10">
                <span className="text-xs font-medium text-slate-600">
                    <i className="fas fa-image mr-1.5"></i> Preview
                </span>
                {loading && <LogoLoader size="sm" text="Rendering..." />}
            </div>
            
            <div className="flex-1 relative overflow-hidden">
                {renderContent()}
            </div>
            
            {renderContextMenu()}
            
            {/* Tooltip Overlay */}
            {tooltip && (
                <div 
                    className="fixed z-50 bg-slate-800 text-white text-xs px-3 py-2 rounded shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                    style={{ 
                        top: tooltip.y, 
                        left: tooltip.x,
                        maxWidth: '250px'
                    }}
                >
                    {/* Header */}
                    <div className="font-semibold mb-1 border-b border-slate-600 pb-1">
                        {tooltip.data.type === 'pie' ? tooltip.data.label : 
                         tooltip.data.type === 'mindmap' || tooltip.data.type === 'flowchart' || tooltip.data.type === 'sequence' ? tooltip.data.id || tooltip.data.label :
                         tooltip.data.type === 'class' || tooltip.data.type === 'state' || tooltip.data.type === 'er' ? tooltip.data.name :
                         tooltip.data.task}
                    </div>
                    
                    {/* Content Body */}
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                        
                        {/* Gantt Specifics */}
                        {tooltip.data.type === 'gantt' && (
                            <>
                                {tooltip.data.section && (
                                     <>
                                        <span className="text-slate-400">Section:</span>
                                        <span>{tooltip.data.section}</span>
                                     </>
                                )}
                                
                                <span className="text-slate-400">Start:</span>
                                <span>{tooltip.data.start || 'N/A'}</span>
                                
                                <span className="text-slate-400">End:</span>
                                <span>{tooltip.data.end || 'N/A'}</span>
                                
                                {tooltip.data.duration && (
                                    <>
                                        <span className="text-slate-400">Duration:</span>
                                        <span>{tooltip.data.duration}</span>
                                    </>
                                )}
                                
                                {tooltip.data.status && (
                                     <>
                                        <span className="text-slate-400">Status:</span>
                                        <span>{tooltip.data.status}</span>
                                     </>
                                )}
                            </>
                        )}

                        {/* Journey Specifics */}
                        {tooltip.data.type === 'journey' && (
                            <>
                                <span className="text-slate-400">Score:</span>
                                <span className="flex items-center gap-1">
                                    {tooltip.data.score} 
                                    <i className="fas fa-star text-yellow-500 text-[10px]"></i>
                                </span>
                                
                                <span className="text-slate-400">Actors:</span>
                                <span>{tooltip.data.actors}</span>
                            </>
                        )}
                        
                        {/* Pie Specifics */}
                        {tooltip.data.type === 'pie' && (
                             <>
                                <span className="text-slate-400">Value:</span>
                                <span>{tooltip.data.value}</span>
                                
                                <span className="text-slate-400">Share:</span>
                                <span>{tooltip.data.percentage}</span>
                             </>
                        )}

                        {/* Timeline Specifics */}
                        {tooltip.data.type === 'timeline' && (
                             <>
                                <span className="text-slate-400">Section:</span>
                                <span>{tooltip.data.section || 'N/A'}</span>
                             </>
                        )}

                        {/* Mindmap Specifics */}
                        {tooltip.data.type === 'mindmap' && (
                             <>
                                <span className="text-slate-400">Type:</span>
                                <span>Node</span>
                             </>
                        )}

                        {/* Flowchart Specifics */}
                        {tooltip.data.type === 'flowchart' && (
                             <>
                                <span className="text-slate-400">ID:</span>
                                <span>{tooltip.data.id}</span>
                                <span className="text-slate-400">Shape:</span>
                                <span>{tooltip.data.shape}</span>
                             </>
                        )}

                        {/* Sequence Specifics */}
                        {tooltip.data.type === 'sequence' && (
                             <>
                                <span className="text-slate-400">ID:</span>
                                <span>{tooltip.data.id}</span>
                                <span className="text-slate-400">Type:</span>
                                <span>{tooltip.data.actorType}</span>
                             </>
                        )}

                        {/* Class Specifics */}
                        {tooltip.data.type === 'class' && (
                             <>
                                <span className="text-slate-400">Members:</span>
                                <span>{tooltip.data.members.length} defined</span>
                                {tooltip.data.members.length > 0 && (
                                    <div className="col-span-2 text-[10px] text-slate-300 pl-2 border-l border-slate-600 mt-1">
                                        {tooltip.data.members.slice(0, 3).map((m, i) => <div key={i}>{m}</div>)}
                                        {tooltip.data.members.length > 3 && <div>...</div>}
                                    </div>
                                )}
                             </>
                        )}

                        {/* State Specifics */}
                        {tooltip.data.type === 'state' && (
                             <>
                                <span className="text-slate-400">Description:</span>
                                <span>{tooltip.data.description}</span>
                             </>
                        )}
                        
                        {/* ER Specifics */}
                        {tooltip.data.type === 'er' && (
                             <>
                                <span className="text-slate-400">Entity:</span>
                                <span>Entity</span>
                             </>
                        )}
                    </div>
                </div>
            )}
            
            {renderContextMenu()}
        </div>
    );
};
