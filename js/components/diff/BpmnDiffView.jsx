
import React, { useEffect, useRef } from 'react';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

/**
 * BpmnDiffView
 * Renders the "New" diagram and applies overlays for added/removed/changed elements.
 */
/** The overlay class for each changed element id, from a bpmn-js-differ result. */
export function diffMarkers(diffData) {
    if (!diffData) return [];
    const ids = (map) => Object.keys(map || {});
    const changed = new Set([...ids(diffData._changed), ...ids(diffData._layoutChanged)]);
    return [['diff-added', ids(diffData._added)], ['diff-changed', [...changed]]];
}

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

            // bpmn-js-differ returns four maps keyed by element id: _added, _changed, _layoutChanged
            // and _removed. This view draws the new diagram, so removed elements have no shape here.
            for (const [className, ids] of diffMarkers(diffData)) {
                for (const id of ids) {
                    const element = elementRegistry.get(id);
                    // Shapes get a frame; sequence flows (which have waypoints, not a size) are skipped
                    if (!element || element.waypoints) continue;
                    overlays.add(id, {
                        position: { top: -5, left: -5 },
                        html: `<div class="${className}-border" style="width:${element.width + 10}px;height:${element.height + 10}px"></div>`
                    });
                }
            }

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
                    pointer-events: none;
                }
                .diff-changed-border {
                    border: 2px dashed #f59e0b;
                    background: rgba(245, 158, 11, 0.05);
                    border-radius: 4px;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
};
