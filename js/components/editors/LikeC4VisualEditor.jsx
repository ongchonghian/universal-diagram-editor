import React, { useCallback, useMemo } from 'react';
import { C4VisualEditor as C4Editor } from './c4/C4VisualEditor.jsx';

export const LikeC4VisualEditor = ({ code, onChange, onError }) => {
    // Parse initial state from code (which we assume is JSON for this editor)
    // If it's actual LikeC4 DSL, we can't parse it easily client-side.
    // So we fallback to empty if JSON parse fails.
    
    const { initialNodes, initialEdges } = useMemo(() => {
        try {
            if (!code) return { initialNodes: [], initialEdges: [] };
            const data = JSON.parse(code);
            return { 
                initialNodes: data.nodes || [], 
                initialEdges: data.edges || [] 
            };
        } catch (e) {
            console.warn("Failed to parse C4 JSON, starting empty", e);
            // If it's not JSON, it might be DSL. We unfortunately ignore it for the Visual Editor 
            // as we are strictly "Visual First" now with this custom editor.
            return { initialNodes: [], initialEdges: [] };
        }
    }, [code]); // Only re-calc if code prop changes significantly (string comparison)

    const handleChange = useCallback((data) => {
        // Serialize back to string
        const jsonString = JSON.stringify(data, null, 2);
        if (jsonString !== code) {
            onChange(jsonString);
        }
    }, [onChange, code]);

    return (
        <div className="w-full h-full bg-slate-50">
            <C4Editor 
                initialNodes={initialNodes} 
                initialEdges={initialEdges} 
                onChange={handleChange} 
            />
        </div>
    );
};
