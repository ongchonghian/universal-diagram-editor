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
import { parseGantt, generateCsv, generateSuperPa, downloadFile } from '../../../utils/gantt-utils.js';

// Main Mermaid Visual Editor Orchestrator
export const MermaidVisualEditor = ({ ast, code, astLoaded, detectedModel, onChange, onCodeChange, onError }) => {
    if (!astLoaded) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="loader mb-3 mx-auto"></div>
                    <span className="text-slate-500 text-sm">Loading visual editor...</span>
                </div>
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
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <i className="fas fa-project-diagram text-2xl opacity-50"></i>
                </div>
                <h3 className="text-lg font-medium text-slate-700 mb-2">Universal Mode</h3>
                <p className="max-w-md text-sm">
                    Visual editing for this diagram type is generic. 
                    Structure editing is best done via code.
                </p>
            </div>
        );
    };

    const getToolbarActions = () => {
        if (detectedModel && detectedModel.includes('Gantt')) {
            return [
                {
                    label: 'CSV',
                    icon: 'fas fa-file-csv',
                    title: 'Export as CSV',
                    onClick: () => {
                        try {
                            const tasks = parseGantt(code);
                            const csv = generateCsv(tasks);
                            const filename = 'gantt-export.csv';
                            downloadFile(csv, filename, 'text/csv');
                        } catch (e) {
                            if (onError) onError('Failed to export CSV: ' + e.message);
                            console.error(e);
                        }
                    }
                },
                {
                    label: 'SuperPA',
                    icon: 'fas fa-clipboard-list',
                    title: 'Export as SuperPA Markdown',
                    onClick: () => {
                         try {
                            const tasks = parseGantt(code);
                            // Extract title from code if possible, or use generic
                            const titleMatch = code.match(/title\s+(.+)$/m);
                            const title = titleMatch ? titleMatch[1].trim() : 'Project Plan';
                            
                            const md = generateSuperPa(tasks, title);
                            const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
                            downloadFile(md, filename, 'text/markdown');
                        } catch (e) {
                            if (onError) onError('Failed to export SuperPA: ' + e.message);
                            console.error(e);
                        }
                    }
                }
            ];
        }
        return [];
    };

    return (
        <div className="w-full h-full bg-white overflow-auto relative">
            <EditorToolbar
                title={`${detectedModel || 'Mermaid'} Editor`}
                subTitle="Visual Mode (Beta)"
                className="sticky top-0 z-10"
                actions={getToolbarActions()}
            />
            {renderSubEditor()}
        </div>
    );
};
