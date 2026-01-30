import React from 'react';
import { MERMAID_SNIPPETS } from '../config.js';

export const MermaidToolbar = ({ detectedModel, contextModel, onInsert }) => {
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
        </div>
    );
};
