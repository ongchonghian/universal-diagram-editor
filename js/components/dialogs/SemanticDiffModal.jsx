
import React, { useState, useEffect } from 'react';
import { Button } from '../common.jsx';
import { rendererAdapter } from '../../services/RendererAdapter.js';
import { diffUtils } from '../../utils/diff-utils.js';
import { BpmnDiffView } from '../diff/BpmnDiffView.jsx';

export const SemanticDiffModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    oldCode, 
    newCode, 
    diagramType 
}) => {
    const [viewMode, setViewMode] = useState('semantic'); // 'semantic', 'overlay', 'split'
    const [loading, setLoading] = useState(true);
    const [semanticDiff, setSemanticDiff] = useState({ diffCode: null, visualDiffSupported: false, diffData: null });
    
    // For general overlay/split views
    const [oldSvg, setOldSvg] = useState(null);
    const [newSvg, setNewSvg] = useState(null);
    const [overlayOpacity, setOverlayOpacity] = useState(0.5);
    const [hybridSvg, setHybridSvg] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        
        const generate = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // 1. Generate Semantic Diff Data
                const result = await diffUtils.generateSemanticDiff(oldCode, newCode, diagramType);
                setSemanticDiff(result);

                // 2. Render Old and New SVGs (for Overlay/Split)
                // In parallel
                const [oldRes, newRes] = await Promise.all([
                    rendererAdapter.render(oldCode, diagramType),
                    rendererAdapter.render(newCode, diagramType)
                ]);

                if (oldRes.error || newRes.error) {
                    console.warn("Render error during diff:", oldRes.error || newRes.error);
                }

                setOldSvg(oldRes.svg);
                setNewSvg(newRes.svg);

                // 3. Render Hybrid Semantic Code (if supported and not BPMN)
                // BPMN handles semantics via its own viewer, so we skip this specific render step for BPMN.
                if (result.visualDiffSupported && result.diffCode && diagramType !== 'bpmn') {
                    const hybridRes = await rendererAdapter.render(result.diffCode, diagramType);
                    setHybridSvg(hybridRes.svg);
                }
                
                // Default to Overlay if semantic not supported
                if (!result.visualDiffSupported) {
                    setViewMode('overlay');
                }

            } catch (e) {
                console.error("Diff generation failed", e);
                setError(e.message);
                setViewMode('overlay'); // Fallback
            } finally {
                setLoading(false);
            }
        };

        generate();

    }, [isOpen, oldCode, newCode, diagramType]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-[90vw] h-[85vh] flex flex-col overflow-hidden border border-slate-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <i className="fas fa-search-plus text-indigo-500"></i>
                        Verify Changes
                    </h3>
                    <div className="flex bg-slate-200 rounded-lg p-1 text-sm">
                        {semanticDiff.visualDiffSupported && (
                            <button 
                                onClick={() => setViewMode('semantic')}
                                className={`px-3 py-1.5 rounded-md font-medium transition-all ${viewMode === 'semantic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                                Semantic Diff
                            </button>
                        )}
                        <button 
                            onClick={() => setViewMode('overlay')}
                            className={`px-3 py-1.5 rounded-md font-medium transition-all ${viewMode === 'overlay' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                        >
                            Visual Overlay
                        </button>
                        <button 
                            onClick={() => setViewMode('split')}
                            className={`px-3 py-1.5 rounded-md font-medium transition-all ${viewMode === 'split' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                        >
                            Side-by-Side
                        </button>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-100 relative overflow-hidden flex flex-col">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <span className="text-sm text-slate-500 font-medium">Analyzing changes...</span>
                            </div>
                        </div>
                    )}

                    {/* Views */}
                    <div className="flex-1 relative overflow-auto p-4 flex items-center justify-center">
                        
                        {/* 1. Semantic View */}
                        {viewMode === 'semantic' && (
                            <div className="w-full h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
                                {diagramType === 'bpmn' ? (
                                    <BpmnDiffView xml={newCode} diffData={semanticDiff.diffData} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center p-4">
                                        {hybridSvg ? (
                                            <div dangerouslySetInnerHTML={{ __html: hybridSvg }} className="max-w-full max-h-full" />
                                        ) : (
                                            <div className="text-red-500">Failed to render semantic diff.</div>
                                        )}
                                    </div>
                                )}
                                {/* Legend */}
                                <div className="absolute bottom-4 left-4 flex gap-3 pointer-events-none">
                                    <div className="bg-green-100 border border-green-300 px-3 py-1 rounded-full text-xs text-green-800 font-medium shadow-sm flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div> Added
                                    </div>
                                    <div className="bg-red-100 border border-red-300 px-3 py-1 rounded-full text-xs text-red-800 font-medium shadow-sm flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Removed
                                    </div>
                                    <div className="bg-amber-100 border border-amber-300 px-3 py-1 rounded-full text-xs text-amber-800 font-medium shadow-sm flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> Changed
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. Overlay View */}
                        {viewMode === 'overlay' && (
                            <div className="w-full h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative flex items-center justify-center">
                                <div className="relative w-full h-full flex items-center justify-center">
                                    {/* Old Layer */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 opacity-100">
                                         {oldSvg ? (
                                            <div dangerouslySetInnerHTML={{ __html: oldSvg }} className="max-w-full max-h-full mix-blend-multiply opacity-50 grayscale" style={{ filter: 'grayscale(100%) brightness(0.9)' }} />
                                        ) : <span className="text-slate-400">Old missing</span>}
                                    </div>
                                    {/* New Layer */}
                                    <div 
                                        className="absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-100"
                                        style={{ opacity: overlayOpacity }}
                                    >
                                        {newSvg ? (
                                            <div dangerouslySetInnerHTML={{ __html: newSvg }} className="max-w-full max-h-full" />
                                        ) : <span className="text-slate-400">New missing</span>}
                                    </div>
                                </div>
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-3 z-10">
                                    <span className="text-xs font-bold text-slate-500">OLD</span>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.01" 
                                        value={overlayOpacity} 
                                        onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                                        className="w-48 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <span className="text-xs font-bold text-indigo-600">NEW</span>
                                </div>
                            </div>
                        )}

                        {/* 3. Split View */}
                        {viewMode === 'split' && (
                            <div className="w-full h-full grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                                    <div className="p-2 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 text-center uppercase tracking-wider">Before</div>
                                    <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
                                        {oldSvg && <div dangerouslySetInnerHTML={{ __html: oldSvg }} className="max-w-full max-h-full" />}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                                    <div className="p-2 border-b border-slate-100 bg-slate-50 text-xs font-bold text-indigo-600 text-center uppercase tracking-wider">After</div>
                                    <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
                                        {newSvg && <div dangerouslySetInnerHTML={{ __html: newSvg }} className="max-w-full max-h-full" />}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
                     <div className="text-xs text-slate-400">
                        {semanticDiff.diffData?.added?.length > 0 && <span>{semanticDiff.diffData.added.length} additions </span>}
                        {semanticDiff.diffData?.removed?.length > 0 && <span>• {semanticDiff.diffData.removed.length} removals</span>}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            icon="fas fa-check" 
                            onClick={onConfirm}
                        >
                            Accept Changes
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
