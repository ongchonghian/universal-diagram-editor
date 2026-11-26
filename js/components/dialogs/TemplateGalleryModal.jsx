import React, { useState, useMemo } from 'react';
import { 
    MERMAID_TEMPLATES, 
    PLANTUML_TEMPLATES,
    BPMN_TEMPLATES,
    EXCALIDRAW_TEMPLATES,
    VEGA_TEMPLATES,
    VEGALITE_TEMPLATES,

    C4_VISUAL_TEMPLATES,
    C4_PLANTUML_TEMPLATES,
    GRAPHVIZ_TEMPLATES,
    DIAGRAM_TYPES
} from '../../config.js';
import { Modal, ModalHeader, inputClass } from '../common.jsx';

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
        if (diagramType === 'c4' || diagramType === 'all') {
            all = [...all, ...addTemplates(C4_VISUAL_TEMPLATES, 'c4-visual')];
            all = [...all, ...addTemplates(C4_PLANTUML_TEMPLATES, 'c4-plantuml')];
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

    const TYPE_TAGS = { 'c4-visual': 'C4 visual', 'c4-plantuml': 'C4 PlantUML' };
    // A type tag helps only when the gallery mixes kinds of template
    const mixedTypes = new Set(templates.map(t => t.type)).size > 1;
    const notation = DIAGRAM_TYPES[diagramType]?.label || diagramType;

    return (
        <Modal onClose={onClose} labelledBy="templates-title" className="max-w-4xl max-h-[85vh]">
            <ModalHeader id="templates-title" icon="fas fa-th-large" title="Templates" subtitle={`Start from a ${notation} example. The template replaces the code in the editor.`} onClose={onClose} closeLabel="Close templates" />

            <div className="px-5 py-3 border-b border-slate-100">
                <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" aria-hidden="true"></i>
                    <input
                        type="text"
                        placeholder="Search templates"
                        aria-label="Search templates"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${inputClass} pl-8`}
                        autoFocus
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto ui-scroll p-5 bg-slate-50/70">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {templates.map((template) => (
                        <button
                            type="button"
                            key={`${template.type}-${template.id}`}
                            onClick={() => { onSelect(template.code); onClose(); }}
                            className="text-left bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group h-full flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <span className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors" aria-hidden="true">
                                    <i className={`fas ${template.icon}`}></i>
                                </span>
                                {mixedTypes && (
                                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 h-5 inline-flex items-center rounded">
                                        {TYPE_TAGS[template.type] || template.type}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-[13px] font-semibold text-slate-900">{template.label}</h3>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 flex-1">{template.description}</p>
                        </button>
                    ))}
                    {templates.length === 0 && (
                        <div className="col-span-full py-12 text-center">
                            <i className="fas fa-search text-2xl text-slate-300 mb-3" aria-hidden="true"></i>
                            <p className="text-[13px] font-medium text-slate-700">No template matches "{searchTerm}"</p>
                            <p className="mt-1 text-xs text-slate-500">The search looks in template names and descriptions.</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
