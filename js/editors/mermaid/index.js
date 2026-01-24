// Mermaid Visual Editor - Main Router
// Routes to diagram-specific editors based on AST type

import { html, useState, useEffect } from '../../react-helpers.js';
import { MermaidGenericEditor } from './MermaidGenericEditor.js';
import { MermaidFlowchartEditor } from './MermaidFlowchartEditor.js';
import { MermaidSequenceEditor } from './MermaidSequenceEditor.js';
import { 
    MermaidTimelineEditor, 
    MermaidGanttEditor, 
    MermaidPieEditor, 
    MermaidMindmapEditor, 
    MermaidJourneyEditor 
} from './MermaidDataEditors.js';

/**
 * Main Mermaid Visual Editor component
 * Routes to appropriate diagram-specific editor based on AST type
 */
export const MermaidVisualEditor = ({ ast, code, astLoaded, onChange, onCodeChange, onError }) => {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    
    // Generate preview URL from code via Kroki
    useEffect(() => {
        if (!code || !code.trim()) {
            setPreviewUrl(null);
            return;
        }
        
        setPreviewLoading(true);
        const fetchPreview = async () => {
            try {
                const response = await fetch('https://kroki.io/mermaid/svg', {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: code
                });
                if (response.ok) {
                    const blob = await response.blob();
                    // Revoke previous URL to prevent memory leaks
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(URL.createObjectURL(blob));
                }
            } catch (e) {
                console.error('Preview error:', e);
            }
            setPreviewLoading(false);
        };
        
        const timer = setTimeout(fetchPreview, 500);
        return () => clearTimeout(timer);
    }, [code]);
    
    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, []);
    
    // Show loading state while MermaidAST loads
    if (!astLoaded) {
        return html`
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="loader mb-3 mx-auto"></div>
                    <span className="text-slate-500 text-sm">Loading Mermaid Editor...</span>
                </div>
            </div>
        `;
    }
    
    // Common props for all editors
    const editorProps = { ast, code, onChange, onCodeChange, previewUrl, previewLoading };
    
    // Route to diagram-specific editors based on AST type
    if (ast && ast.type) {
        switch (ast.type) {
            // Flow-based diagrams
            case 'flowchart':
                return html`<${MermaidFlowchartEditor} ...${editorProps} />`;
            
            // Behavioral diagrams
            case 'sequence':
                return html`<${MermaidSequenceEditor} ...${editorProps} />`;
            case 'timeline':
                return html`<${MermaidTimelineEditor} ...${editorProps} />`;
            case 'journey':
                return html`<${MermaidJourneyEditor} ...${editorProps} />`;
            
            // Data/Chart diagrams
            case 'gantt':
                return html`<${MermaidGanttEditor} ...${editorProps} />`;
            case 'pie':
                return html`<${MermaidPieEditor} ...${editorProps} />`;
            
            // Hierarchical diagrams
            case 'mindmap':
                return html`<${MermaidMindmapEditor} ...${editorProps} />`;
            
            // Diagrams using generic editor (Class, State, ER, etc.)
            case 'class':
            case 'state':
            case 'er':
            case 'c4':
            case 'requirement':
            case 'gitgraph':
            case 'sankey':
            case 'xychart':
            case 'quadrant':
            case 'block':
            case 'kanban':
            default:
                return html`<${MermaidGenericEditor} ...${editorProps} />`;
        }
    }
    
    // Fallback to generic editor
    return html`<${MermaidGenericEditor} ...${editorProps} />`;
};

// Re-export all editors for direct import if needed
export { MermaidGenericEditor } from './MermaidGenericEditor.js';
export { MermaidFlowchartEditor } from './MermaidFlowchartEditor.js';
export { MermaidSequenceEditor } from './MermaidSequenceEditor.js';
export { 
    MermaidTimelineEditor, 
    MermaidGanttEditor, 
    MermaidPieEditor, 
    MermaidMindmapEditor, 
    MermaidJourneyEditor 
} from './MermaidDataEditors.js';
export { createMermaidSyncController } from './MermaidSyncController.js';

export default MermaidVisualEditor;
