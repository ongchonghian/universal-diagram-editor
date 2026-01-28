import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw, exportToBlob, serializeAsJSON, getSceneVersion } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

export const ExcalidrawVisualEditor = ({ json, onChange, onError }) => {
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const initialDataRef = useRef(null);
    const isUpdatingRef = useRef(false);

    // Initialize/Parse input JSON
    useEffect(() => {
        if (!json || !json.trim()) {
            initialDataRef.current = null; // Default empty
            return;
        }

        try {
            const parsed = JSON.parse(json);
            // Basic validation
            if (typeof parsed !== 'object') return;
            
            initialDataRef.current = parsed;
            
            // If API ready, update scene to match code changes (e.g. from text editor)
            // But be careful not to overwrite if user is drawing (handled by isUpdating check mostly)
            if (excalidrawAPI && !isUpdatingRef.current) {
                // Check if scene version differs significantly or just force update?
                // For safety, only update if versions differ or we really want to sync
                excalidrawAPI.updateScene({
                    elements: parsed.elements || [],
                    appState: parsed.appState || {},
                    files: parsed.files || {}
                });
            }
        } catch (e) {
            console.error("Invalid Excalidraw JSON", e);
            // Don't error loudly on every keystroke, let user fix code
        }
    }, [json, excalidrawAPI]);

    // Handle changes from Excalidraw
    const handleChange = useCallback((elements, appState, files) => {
        if (!onChange) return;
        
        // Prevent loops: set flag
        isUpdatingRef.current = true;
        
        // We debounce or just calling it might be fine if React handles it.
        // Excalidraw calls onChange on every mouse move/drag.
        // We probably should debounce this.
        
        // Serialize
        const content = serializeAsJSON(elements, appState, files, 'local');
        onChange(content);
        
        // Reset flag after render cycle
        setTimeout(() => { isUpdatingRef.current = false; }, 0);
    }, [onChange]);

    return (
        <div className="w-full h-full border border-slate-200 rounded-lg overflow-hidden bg-white">
             <Excalidraw
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                initialData={initialDataRef.current || undefined}
                onChange={handleChange}
                UIOptions={{
                    canvasActions: {
                        saveToActiveFile: false,
                        loadScene: false, 
                        saveAsImage: true
                    }
                }}
            />
        </div>
    );
};
