import React from 'react';
import { PLANTUML_SNIPPETS } from '../config.js';

export const PlantUmlToolbar = ({ detectedModel, contextModel, onInsert }) => {
    // Filter snippets based on current context
    const getSnippets = () => {
        const common = PLANTUML_SNIPPETS.common || [];
        
        // Use context model if available and inside a block, otherwise fallback to detectedModel
        // If we are strictly checking cursor context:
        // 1. If inside a block, show ONLY that model's tools + common.
        // 2. If NOT inside a block, decide what to show. unique "Start Block" tools? 
        //    Or just fallback to "detectedModel" (which is global file content detection) but maybe prompt to start?
        
        // Let's go with:
        // Use contextModel.model if isInsideBlock is true.
        // Else, if strict, maybe show nothing specific? Or just show everything?
        // The user request says: "if cursor before @startuml... tools should not appear or disabled"
        
        let effectiveModel = '';
        
        if (contextModel && contextModel.isInsideBlock) {
             effectiveModel = contextModel.model ? contextModel.model.toLowerCase() : '';
        } else {
             // Outside block. 
             // We could show "Start" snippets? 
             // For now, if we are outside, let's treat it as "unknown" or "none" which falls back to common/fallback.
             // But existing logic falls back to detectedModel.
             // If we want to accept the user's "disabled" request, we should NOT use detectedModel here.
             effectiveModel = 'none'; 
        }

        let specificSnippets = [];

        if (effectiveModel.includes('sequence')) {
            specificSnippets = PLANTUML_SNIPPETS.sequence || [];
        } else if (effectiveModel.includes('class')) {
            specificSnippets = PLANTUML_SNIPPETS.class || [];
        } else if (effectiveModel.includes('use case')) {
            specificSnippets = PLANTUML_SNIPPETS.usecase || [];
        } else if (effectiveModel.includes('activity')) {
            specificSnippets = PLANTUML_SNIPPETS.activity || [];
        } else if (effectiveModel.includes('state')) {
            specificSnippets = PLANTUML_SNIPPETS.state || [];
        } else if (effectiveModel.includes('component')) {
            specificSnippets = PLANTUML_SNIPPETS.component || [];
        } else if (effectiveModel.includes('deployment')) {
            specificSnippets = PLANTUML_SNIPPETS.deployment || [];
        } else if (effectiveModel.includes('timing')) {
            specificSnippets = PLANTUML_SNIPPETS.timing || [];
        } else if (effectiveModel.includes('network')) {
            specificSnippets = PLANTUML_SNIPPETS.network || [];
        } else if (effectiveModel.includes('gantt')) {
            specificSnippets = PLANTUML_SNIPPETS.gantt || [];
        } else if (effectiveModel.includes('mindmap')) {
            specificSnippets = PLANTUML_SNIPPETS.mindmap || [];
        } else if (effectiveModel.includes('breakdown')) { // Work Breakdown Structure
            specificSnippets = PLANTUML_SNIPPETS.wbs || [];
        } else if (effectiveModel.includes('json')) {
            specificSnippets = PLANTUML_SNIPPETS.json || [];
        } else if (effectiveModel.includes('yaml')) {
            specificSnippets = PLANTUML_SNIPPETS.yaml || [];
        } else if (effectiveModel === 'none') {
            // Strictly hide tools if outside a block
            return [];
        } else {
            // Fallback (only reached if effectiveModel is not 'none' but also not specific known one, e.g. 'uml')
            return [...(PLANTUML_SNIPPETS.fallback || []), ...common];
        }
        
        // Return specific + common (Note/Title)
        return [...specificSnippets, ...common];
    };

    return (
        <div className="flex-none p-2 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar">
            {getSnippets().map((snippet, idx) => (
                <button
                    key={idx}
                    onClick={() => onInsert(snippet.code)}
                    className="flex flex-col items-center justify-center w-12 h-12 bg-white border border-slate-200 rounded hover:bg-indigo-50 hover:border-indigo-200 transition-all flex-shrink-0 group relative"
                    title={snippet.label}
                >
                    <i className={`fas ${snippet.icon} text-slate-500 group-hover:text-indigo-600 mb-1 text-sm`}></i>
                    <span className="text-[10px] text-slate-400 group-hover:text-indigo-500 leading-none truncate w-full text-center px-1">{snippet.label}</span>
                </button>
            ))}
        </div>
    );
};
