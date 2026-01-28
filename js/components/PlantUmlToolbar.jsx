import React, { useState } from 'react';
import { PLANTUML_SNIPPETS } from '../config.js';

export const PlantUmlToolbar = ({ detectedModel, onInsert }) => {
    const [activeTab, setActiveTab] = useState('common');

    // Filter snippets based on current context
    const getSnippets = () => {
        let snippets = [...(PLANTUML_SNIPPETS.common || [])];
        if (detectedModel.includes('Sequence')) snippets = [...snippets, ...(PLANTUML_SNIPPETS.sequence || [])];
        else if (detectedModel.includes('Class')) snippets = [...snippets, ...(PLANTUML_SNIPPETS.class || [])];
        else if (detectedModel.includes('Use Case')) snippets = [...snippets, ...(PLANTUML_SNIPPETS.usecase || [])];
        // Add more specific categories as needed or default to common
        return snippets;
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
