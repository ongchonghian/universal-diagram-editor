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

    // Manual Copy fallback
    const copyToClipboard = async () => {
        if (!excalidrawAPI) return;
        
        try {
            // First attempt: Standard library export
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const files = excalidrawAPI.getFiles();
            
            const blob = await exportToBlob({
                elements,
                appState: {
                    ...appState,
                    exportWithDarkMode: appState.theme === 'dark',
                    exportBackground: true
                },
                files,
                mimeType: "image/png",
            });

            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob }),
            ]);
            console.log("Copied via exportToBlob");
        } catch (e) {
            console.warn("Standard export failed, trying canvas fallback", e);
            
            // Second attempt: Direct Canvas grab (bypasses font loading logic)
            try {
                const canvas = document.querySelector(".excalidraw__canvas");
                if (canvas) {
                    canvas.toBlob(async (blob) => {
                        if (blob) {
                            await navigator.clipboard.write([
                                new ClipboardItem({ [blob.type]: blob }),
                            ]);
                            console.log("Copied via canvas fallback");
                        }
                    }, "image/png");
                } else {
                    throw new Error("Canvas not found");
                }
            } catch (fallbackError) {
                console.error("All copy methods failed", fallbackError);
                alert("Failed to copy to clipboard. Please check browser permissions.");
            }
        }
    };


    return (
        <div className="w-full h-full border border-slate-200 rounded-lg overflow-hidden bg-white relative">
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
            {/* Custom Manual Copy Button as Fallback */}
            <button 
                onClick={copyToClipboard}
                className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md shadow-lg transition-all flex items-center gap-2 z-[9999]"
                title="Copy as PNG (Fallback)"
            >
                <i className="fas fa-copy"></i>
                <span>Copy as PNG</span>
            </button>
        </div>
    );
};

