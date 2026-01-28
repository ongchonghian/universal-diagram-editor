import React, { useState, useMemo } from 'react';
import { 
    MERMAID_TEMPLATES, 
    PLANTUML_TEMPLATES,
    BPMN_TEMPLATES,
    EXCALIDRAW_TEMPLATES,
    VEGA_TEMPLATES,
    VEGALITE_TEMPLATES,

    LIKEC4_TEMPLATES,
    C4PLANTUML_TEMPLATES,
    GRAPHVIZ_TEMPLATES
} from '../../config.js';

export const TemplateGalleryModal = ({ isOpen, onClose, onSelect, diagramType }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    // Combine templates
    const templates = useMemo(() => {
        let all = [];
        
        // Helper to add templates
        const addTemplates = (source, type) => {
            // Handle both Array and Object/Map structures if necessary, though config.js uses Arrays
            const list = Array.isArray(source) ? source : Object.values(source);
            return list.map(t => ({ ...t, type }));
        };

        if (diagramType === 'mermaid' || diagramType === 'all') {
            all = [...all, ...addTemplates(MERMAID_TEMPLATES, 'mermaid')];
        }
        if (diagramType === 'plantuml' || diagramType === 'all') {
            all = [...all, ...addTemplates(PLANTUML_TEMPLATES, 'plantuml')];
        }
        if (diagramType === 'bpmn' || diagramType === 'all') {
            all = [...all, ...addTemplates(BPMN_TEMPLATES, 'bpmn')];
        }
        if (diagramType === 'excalidraw' || diagramType === 'all') {
            all = [...all, ...addTemplates(EXCALIDRAW_TEMPLATES, 'excalidraw')];
        }

        if (diagramType === 'vega' || diagramType === 'all') {
            all = [...all, ...addTemplates(VEGA_TEMPLATES, 'vega')];
        }
        if (diagramType === 'vegalite' || diagramType === 'all') {
            all = [...all, ...addTemplates(VEGALITE_TEMPLATES, 'vegalite')];
        }
        if (diagramType === 'likec4' || diagramType === 'all') {
            all = [...all, ...addTemplates(LIKEC4_TEMPLATES, 'likec4')];
        }
        if (diagramType === 'c4plantuml' || diagramType === 'all') {
            all = [...all, ...addTemplates(C4PLANTUML_TEMPLATES, 'c4plantuml')];
        }
        if (diagramType === 'graphviz' || diagramType === 'all') {
            all = [...all, ...addTemplates(GRAPHVIZ_TEMPLATES, 'graphviz')];
        }

        return all.filter(t => 
            t.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
            t.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [diagramType, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col relative z-50">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">Diagram Templates</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-3 text-slate-400"></i>
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {templates.map((template) => (
                            <div 
                                key={template.id}
                                onClick={() => { onSelect(template.code); onClose(); }}
                                className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group h-full flex flex-col"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <i className={`fas ${template.icon}`}></i>
                                    </div>
                                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                        {template.type}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-slate-800 mb-1">{template.label}</h3>
                                <p className="text-xs text-slate-500 flex-1">{template.description}</p>
                            </div>
                        ))}
                        {templates.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-500">
                                <i className="fas fa-search text-3xl mb-3 opacity-30"></i>
                                <p>No templates found matching "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
