import React from 'react';
import { getPlantUmlSnippets } from '../utils/plantUmlUtils.js';

export const PlantUmlToolbar = ({ contextModel, onInsert, onSnippetSelect }) => {
    const snippets = getPlantUmlSnippets(contextModel);

    const handleSnippetClick = (snippet) => {
        if (snippet.params && snippet.params.length > 0) {
            onSnippetSelect(snippet);
        } else {
            onInsert(snippet.code, 'cursor');
        }
    };

    return (
        <div className="flex-none h-10 px-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1 overflow-x-auto no-scrollbar" role="toolbar" aria-label="Insert a snippet">
            {(!snippets || snippets.length === 0) && (
                <span className="px-1 text-xs text-slate-400">Snippets appear here when the cursor is inside a diagram.</span>
            )}
            {snippets.map((snippet, idx) => (
                <button
                    key={idx}
                    onClick={() => handleSnippetClick(snippet)}
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
