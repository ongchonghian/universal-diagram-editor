
import React, { useEffect, useRef } from 'react';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

/**
 * BpmnDiffView
 * Renders the "New" diagram and applies overlays for added/removed/changed elements.
 */
export const BpmnDiffView = ({ xml, diffData }) => {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const viewer = new NavigatedViewer({
            container: containerRef.current
        });
        viewerRef.current = viewer;

        viewer.importXML(xml).then(() => {
            const overlays = viewer.get('overlays');
            const elementRegistry = viewer.get('elementRegistry');

            if (!diffData) return;

            // Apply Diffs
            // diffData keys are element IDs. Value { changeType: 'added'|'removed'|'changed' }
            
            Object.entries(diffData).forEach(([id, change]) => {
                const element = elementRegistry.get(id);
                if (!element) return; // Might be removed or not found

                // We can't easily visualize "removed" elements if we only render the new XML.
                // bpmn-js-differ usually works by rendering BOTH or using a visual differ that computes specific delta visualization.
                // However, for single-view overlay:
                // - Added: Green overlay.
                // - Changed: Amber overlay.
                // - Removed: We can't show them if they are not in the XML.
                
                // Strategy: We are rendering the NEW XML.
                // So we can show "Added" and "Changed". 
                // "Removed" elements are gone. 
                // To show removed elements, we would need to merge the diagrams or show the Old diagram as background?
                // For now, let's highlight Added and Changed/Moved.
                
                let className = '';
                if (change.changeType === 'added') className = 'diff-added';
                else if (change.changeType === 'changed' || change.changeType === 'layout-changed') className = 'diff-changed';
                
                if (className) {
                    overlays.add(id, {
                        position: {
                            bottom: 0,
                            right: 0
                        },
                        html: `<div class="${className}-marker"></div>`
                    });
                    
                    // Also color the shape itself?
                    // We can use modeling/graphics, but NavigatedViewer is read-only.
                    // Overlays are safer.
                    
                    // Let's add a full bounding box overlay
                     overlays.add(id, {
                        position: { top: -5, left: -5, right: -5, bottom: -5 },
                        html: `<div class="${className}-border"></div>`
                    });
                }
            });

        }).catch(err => {
            console.error("BPMN Viewer Error", err);
        });

        return () => {
            viewer.destroy();
        };
    }, [xml, diffData]);

    return (
        <div className="w-full h-full relative">
            <div ref={containerRef} className="w-full h-full bg-slate-50"></div>
            <style>{`
                .diff-added-border {
                    border: 2px solid #22c55e;
                    background: rgba(34, 197, 94, 0.1);
                    border-radius: 4px;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }
                .diff-changed-border {
                    border: 2px dashed #f59e0b;
                    background: rgba(245, 158, 11, 0.05);
                    border-radius: 4px;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
};
