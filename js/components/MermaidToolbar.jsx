import { MERMAID_SNIPPETS } from '../config.js';
import { parseGantt, generateCsv, generateSuperPa, downloadFile } from '../utils/gantt-utils.js';

export const MermaidToolbar = ({ detectedModel, contextModel, onInsert, code }) => {
    // Determine context based on detected model
    // Use contextModel if available (from context-detection.js) 

    // STRICT MODE: If we didn't find a specific context and isInsideBlock is false (handled by modelSource logic above essentially),
    // but we need to cover the case where detectedModel was used (legacy fallback).
    
    // Actually, let's look at the logic above:
    // let modelSource = detectedModel;
    // if (contextModel && contextModel.model) { modelSource = contextModel.model; }
    
    // If contextModel exists but model is empty/none, modelSource remains detectedModel (global).
    // This is problematic if we want to be strict.
    // We should ONLY use detectedModel if we are sure we want global fallback.
    // The user wants strictness: "before @startjson... tools disabled".
    
    // So:
    // If contextModel exists:
    //    If isInsideBlock is false -> SHOW NOTHING.
    //    If isInsideBlock is true -> use contextModel.model.
    
    let effectiveContext = 'none';
    
    if (contextModel) {
        if (contextModel.isInsideBlock) {
             effectiveContext = contextModel.model;
        } else {
             effectiveContext = 'none';
        }
    } else {
        // Legacy/Loading state
        effectiveContext = detectedModel;
    }
    
    const context = effectiveContext.toLowerCase().includes('sequence') ? 'sequence' :
                    effectiveContext.toLowerCase().includes('flowchart') ? 'flowchart' :
                    effectiveContext.toLowerCase().includes('class') ? 'class' :
                    effectiveContext.toLowerCase().includes('state') ? 'state' :
                    effectiveContext.toLowerCase().includes('entity relationship') || effectiveContext.toLowerCase().includes('er diagram') ? 'er' :
                    effectiveContext.toLowerCase().includes('gantt') ? 'gantt' :
                    effectiveContext.toLowerCase().includes('pie') ? 'pie' :
                    effectiveContext.toLowerCase().includes('git graph') ? 'gitGraph' :
                    effectiveContext.toLowerCase().includes('mindmap') ? 'mindmap' :
                    effectiveContext.toLowerCase().includes('user journey') ? 'journey' :
                    effectiveContext.toLowerCase().includes('timeline') ? 'timeline' :
                    effectiveContext.toLowerCase().includes('quadrant') ? 'quadrantChart' :
                    effectiveContext.toLowerCase().includes('requirement') ? 'requirementDiagram' :
                    effectiveContext.toLowerCase().includes('c4') ? 'c4' :
                    effectiveContext.toLowerCase().includes('sankey') ? 'sankey' :
                    effectiveContext.toLowerCase().includes('xy chart') ? 'xyChart' :
                    effectiveContext.toLowerCase().includes('block') ? 'block' :
                    effectiveContext.toLowerCase().includes('packet') ? 'packet' :
                    effectiveContext.toLowerCase().includes('kanban') ? 'kanban' :
                    effectiveContext.toLowerCase().includes('architecture') ? 'architecture' :
                    'none'; // Default to none if not matched

    // If 'none', return empty
    // If 'flowchart' (was default), return flowchart snippets?
    // MERMAID_SNIPPETS['none'] is undefined.
    // So || [] will handle it.
    
    const snippets = MERMAID_SNIPPETS[context] || [];

    return (
        <div className="flex-none p-2 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar">
            {snippets?.map((snippet, idx) => (
                <button
                    key={idx}
                    onClick={() => onInsert(snippet.code)}
                    className="flex flex-col items-center justify-center w-12 h-12 bg-white border border-slate-200 rounded hover:bg-indigo-50 hover:border-indigo-200 transition-all flex-shrink-0 group"
                    title={snippet.label}
                >
                     <i className={`fas ${snippet.icon} text-slate-500 group-hover:text-indigo-600 mb-1 text-sm`}></i>
                    <span className="text-[10px] text-slate-400 group-hover:text-indigo-500 leading-none truncate w-full text-center px-1">{snippet.label}</span>
                </button>
            ))}

            {context === 'gantt' && (
                <>
                    <div className="w-px h-8 bg-slate-300 mx-1 self-center"></div>
                    <button
                        onClick={() => {
                            try {
                                const tasks = parseGantt(code);
                                const csv = generateCsv(tasks);
                                downloadFile(csv, 'gantt.csv', 'text/csv');
                            } catch (e) { console.error(e); alert('Export failed'); }
                        }}
                        className="flex flex-col items-center justify-center w-12 h-12 bg-white border border-slate-200 rounded hover:bg-emerald-50 hover:border-emerald-200 transition-all flex-shrink-0 group"
                        title="Export CSV"
                    >
                        <i className="fas fa-file-csv text-slate-500 group-hover:text-emerald-600 mb-1 text-sm"></i>
                        <span className="text-[10px] text-slate-400 group-hover:text-emerald-500 leading-none truncate w-full text-center px-1">CSV</span>
                    </button>
                    <button
                        onClick={() => {
                            try {
                                const tasks = parseGantt(code);
                                const titleMatch = code?.match(/title\s+(.+)$/m);
                                const title = titleMatch ? titleMatch[1].trim() : 'Project Plan';
                                const md = generateSuperPa(tasks, title);
                                const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
                                downloadFile(md, filename, 'text/markdown');
                            } catch (e) { console.error(e); alert('Export failed'); }
                        }}
                        className="flex flex-col items-center justify-center w-12 h-12 bg-white border border-slate-200 rounded hover:bg-purple-50 hover:border-purple-200 transition-all flex-shrink-0 group"
                        title="Export SuperPA"
                    >
                        <i className="fas fa-clipboard-list text-slate-500 group-hover:text-purple-600 mb-1 text-sm"></i>
                        <span className="text-[10px] text-slate-400 group-hover:text-purple-500 leading-none truncate w-full text-center px-1">SuperPA</span>
                    </button>
                </>
            )}
        </div>
    );
};
