import React from 'react';
import { 
    MermaidFlowchartEditor, 
    MermaidSequenceEditor, 
    MermaidPieEditor, 
    MermaidGanttEditor, 
    MermaidTimelineEditor, 
    MermaidJourneyEditor, 
    MermaidMindmapEditor 
} from './MermaidEditors.jsx';
import { EditorToolbar } from '../common/EditorToolbar.jsx';

// Main Mermaid Visual Editor Orchestrator
export const MermaidVisualEditor = ({ ast, code, astLoaded, detectedModel, onChange, onCodeChange, onError }) => {
    if (!astLoaded) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                <span className="inline-flex items-center gap-2 text-[13px] text-slate-500" role="status">
                    <span className="ui-spinner" aria-hidden="true"></span>
                    Loading the visual editor…
                </span>
            </div>
        );
    }

    // Route to appropriate sub-editor based on detected model
    const renderSubEditor = () => {
        const handleCodeChange = (newCode) => {
            if (onCodeChange) onCodeChange(newCode);
        };

        if (detectedModel.includes('Flowchart')) {
            return <MermaidFlowchartEditor code={code} onChange={handleCodeChange} />;
        }
        if (detectedModel.includes('Sequence')) {
            return <MermaidSequenceEditor code={code} onChange={handleCodeChange} />;
        }
        if (detectedModel.includes('Pie')) {
            return <MermaidPieEditor code={code} onChange={handleCodeChange} />;
        }
        if (detectedModel.includes('Gantt')) {
            return <MermaidGanttEditor code={code} onChange={handleCodeChange} />;
        }
        if (detectedModel.includes('Timeline')) {
            return <MermaidTimelineEditor code={code} onChange={handleCodeChange} />;
        }
        if (detectedModel.includes('Journey')) {
            return <MermaidJourneyEditor code={code} onChange={handleCodeChange} />;
        }
        if (detectedModel.includes('Mindmap')) {
            return <MermaidMindmapEditor code={code} onChange={handleCodeChange} />;
        }
        
        // Fallback
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <span className="mb-4 w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center" aria-hidden="true">
                    <i className="fas fa-project-diagram"></i>
                </span>
                <h3 className="text-[15px] font-semibold text-slate-900">Edit this diagram in code</h3>
                <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">
                    The visual editor handles pie charts only for now. Switch to Code to change this {detectedModel || 'diagram'}.
                </p>
            </div>
        );
    };

    return (
        <div className="w-full h-full bg-white overflow-auto relative">
            <EditorToolbar
                title={detectedModel || 'Mermaid'}
                subTitle="Visual editor · Beta"
                className="sticky top-0 z-10"
            />
            {renderSubEditor()}
        </div>
    );
};
