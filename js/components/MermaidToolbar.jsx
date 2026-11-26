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
        <div className="flex-none h-10 px-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1 overflow-x-auto no-scrollbar" role="toolbar" aria-label="Insert a snippet">
            {(!snippets || snippets.length === 0) && (
                <span className="px-1 text-xs text-slate-400">Snippets appear here when the cursor is inside a diagram.</span>
            )}
            {snippets?.map((snippet, idx) => (
                <button
                    key={idx}
                    onClick={() => onInsert(snippet.code)}
                    className="h-7 px-2 inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-600 whitespace-nowrap shadow-sm hover:border-indigo-300 hover:text-indigo-700 transition-colors flex-shrink-0 group"
                    title={snippet.label}
                >
                     <i className={`fas ${snippet.icon} text-[11px] text-slate-400 group-hover:text-indigo-600`} aria-hidden="true"></i>
                    <span>{snippet.label}</span>
                </button>
            ))}
        </div>
    );
};
