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
        <div className="flex-none p-2 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar">
            {snippets.map((snippet, idx) => (
                <button
                    key={idx}
                    onClick={() => handleSnippetClick(snippet)}
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
