
import React, { useState, useEffect } from 'react';
import { Button, Modal, ModalHeader, ModalFooter, Spinner } from '../common.jsx';
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

    const tabs = [
        ...(semanticDiff.visualDiffSupported ? [{ id: 'semantic', label: 'Semantic diff' }] : []),
        { id: 'overlay', label: 'Visual overlay' },
        { id: 'split', label: 'Side by side' }
    ];
    const summary = (() => {
        const d = semanticDiff.diffData;
        if (!d) return null;
        // bpmn-js-differ returns maps keyed by id (and has added() and removed() methods);
        // the Mermaid and PlantUML diffs return lists
        const count = (list, map) => (Array.isArray(list) ? list.length : Object.keys(map || {}).length);
        const added = count(d.added, d._added);
        const removed = count(d.removed, d._removed);
        const changed = count(null, d._changed) + count(null, d._layoutChanged);
        return [added && `${added} added`, changed && `${changed} changed`, removed && `${removed} removed`].filter(Boolean).join(' · ');
    })();
    const missing = (text) => <span className="text-[13px] text-slate-400">{text}</span>;

    return (
        <Modal onClose={onClose} labelledBy="verify-changes-title" className="w-[92vw] max-w-[1400px] h-[86vh]" z="z-[60]">
            <ModalHeader id="verify-changes-title" icon="fas fa-search-plus" title="Verify changes" subtitle="Compare the current diagram with the proposed one before you apply the change." onClose={onClose} closeLabel="Close the comparison">
                <div className="hidden md:flex items-center bg-slate-100 rounded-md p-0.5 mr-2" role="group" aria-label="Comparison view">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setViewMode(tab.id)}
                            aria-pressed={viewMode === tab.id}
                            className={`h-7 px-3 rounded text-xs font-medium transition-colors ${viewMode === tab.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </ModalHeader>

            {/* The view switch, below the title on a narrow screen */}
            <div className="md:hidden px-4 pt-3 flex">
                <div className="flex items-center bg-slate-100 rounded-md p-0.5" role="group" aria-label="Comparison view">
                    {tabs.map(tab => (
                        <button key={tab.id} type="button" onClick={() => setViewMode(tab.id)} aria-pressed={viewMode === tab.id}
                            className={`h-7 px-2.5 rounded text-xs font-medium ${viewMode === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 bg-slate-50 relative overflow-hidden flex flex-col">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20 animate-fade-in">
                        <Spinner text="Comparing the two versions…" />
                    </div>
                )}

                <div className="flex-1 relative overflow-auto ui-scroll p-4 flex items-center justify-center">

                    {/* 1. Semantic View */}
                    {viewMode === 'semantic' && (
                        <div className="w-full h-full bg-white rounded-lg border border-slate-200 overflow-hidden relative">
                            {diagramType === 'bpmn' ? (
                                <BpmnDiffView xml={newCode} diffData={semanticDiff.diffData} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center p-4">
                                    {hybridSvg ? (
                                        <div dangerouslySetInnerHTML={{ __html: hybridSvg }} className="max-w-full max-h-full" />
                                    ) : (
                                        missing('The highlighted view could not be drawn. Try Visual overlay or Side by side.')
                                    )}
                                </div>
                            )}
                            {/* Legend */}
                            <div className="absolute bottom-3 left-3 flex items-center gap-3 px-3 h-8 rounded-md bg-white/95 border border-slate-200 shadow-sm text-xs text-slate-600 pointer-events-none">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Added</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span>Removed</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Changed</span>
                            </div>
                        </div>
                    )}

                    {/* 2. Overlay View */}
                    {viewMode === 'overlay' && (
                        <div className="w-full h-full bg-white rounded-lg border border-slate-200 overflow-hidden relative flex items-center justify-center">
                            <div className="relative w-full h-full flex items-center justify-center">
                                {/* Old Layer */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 opacity-100">
                                     {oldSvg ? (
                                        <div dangerouslySetInnerHTML={{ __html: oldSvg }} className="max-w-full max-h-full mix-blend-multiply opacity-50 grayscale" style={{ filter: 'grayscale(100%) brightness(0.9)' }} />
                                    ) : missing('The current version could not be drawn.')}
                                </div>
                                {/* New Layer */}
                                <div
                                    className="absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-100"
                                    style={{ opacity: overlayOpacity }}
                                >
                                    {newSvg ? (
                                        <div dangerouslySetInnerHTML={{ __html: newSvg }} className="max-w-full max-h-full" />
                                    ) : missing('The proposed version could not be drawn.')}
                                </div>
                            </div>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 px-4 h-10 rounded-lg shadow-md border border-slate-200 flex items-center gap-3 z-10">
                                <span className="text-xs font-medium text-slate-500">Current</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={overlayOpacity}
                                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                                    aria-label="Blend between the current and the proposed diagram"
                                    className="w-48 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                />
                                <span className="text-xs font-medium text-indigo-700">Proposed</span>
                            </div>
                        </div>
                    )}

                    {/* 3. Split View */}
                    {viewMode === 'split' && (
                        <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: 'Current', svg: oldSvg, tone: 'text-slate-500' },
                                { label: 'Proposed', svg: newSvg, tone: 'text-indigo-700' }
                            ].map(side => (
                                <div key={side.label} className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col min-h-0">
                                    <div className={`h-9 px-3 flex items-center border-b border-slate-100 text-xs font-medium ${side.tone}`}>{side.label}</div>
                                    <div className="flex-1 p-4 flex items-center justify-center overflow-auto ui-scroll">
                                        {side.svg && <div dangerouslySetInnerHTML={{ __html: side.svg }} className="max-w-full max-h-full" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </div>

            <ModalFooter className="justify-between">
                <span className="text-xs text-slate-500 tabular-nums">{summary}</span>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" icon="fas fa-check" onClick={onConfirm}>
                        Apply
                    </Button>
                </div>
            </ModalFooter>
        </Modal>
    );
};
