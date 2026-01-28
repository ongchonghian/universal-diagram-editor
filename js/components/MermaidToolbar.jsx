import React from 'react';
import { MERMAID_SNIPPETS } from '../config.js';

export const MermaidToolbar = ({ detectedModel, onInsert }) => {
    // Determine context based on detected model
    const context = detectedModel.toLowerCase().includes('sequence') ? 'sequence' :
                    detectedModel.toLowerCase().includes('flowchart') ? 'flowchart' :
                    detectedModel.toLowerCase().includes('class') ? 'class' :
                    detectedModel.toLowerCase().includes('state') ? 'state' :
                    detectedModel.toLowerCase().includes('er') ? 'er' :
                    detectedModel.toLowerCase().includes('gantt') ? 'gantt' :
                    detectedModel.toLowerCase().includes('pie') ? 'pie' :
                    'common';

    const snippets = MERMAID_SNIPPETS[context] || MERMAID_SNIPPETS.flowchart; // Default fallback

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
