// Mermaid Generic Editor
// Fallback editor for diagram types without specific editors
// Shows preview + AST property panel

import { html, useState } from '../../react-helpers.js';

/**
 * Generic Mermaid editor with preview and AST explorer
 * Used as fallback for diagram types without dedicated editors
 */
export const MermaidGenericEditor = ({ ast, code, onChange, onCodeChange, previewUrl, previewLoading }) => {
    const [selectedElement, setSelectedElement] = useState(null);
    
    return html`
        <div className="w-full h-full flex">
            <!-- Left: Preview -->
            <div className="flex-1 flex flex-col bg-slate-50">
                <div className="flex-none px-3 py-2 bg-white border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">
                        <i className="fas fa-eye mr-1.5"></i>
                        Live Preview
                        ${ast && ast.type && html`
                            <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px]">
                                ${ast.type}
                            </span>
                        `}
                    </span>
                    ${previewLoading && html`
                        <span className="text-xs text-slate-400">
                            <i className="fas fa-circle-notch fa-spin mr-1"></i>
                            Rendering...
                        </span>
                    `}
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center" 
                     style=${{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    ${previewUrl ? html`
                        <img src=${previewUrl} alt="Diagram Preview" className="max-w-full h-auto bg-white shadow-lg rounded" />
                    ` : html`
                        <div className="text-center text-slate-400">
                            <i className="fas fa-image text-4xl mb-3 opacity-30"></i>
                            <p className="text-sm">Preview will appear here</p>
                        </div>
                    `}
                </div>
            </div>
            
            <!-- Right: Property Panel -->
            <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
                <div className="flex-none px-3 py-2 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600">
                        <i className="fas fa-sliders-h mr-1.5"></i>
                        Properties
                    </span>
                </div>
                <div className="flex-1 overflow-auto p-3">
                    ${ast ? html`
                        <div className="space-y-3">
                            <div className="text-xs">
                                <label className="block text-slate-500 mb-1">Diagram Type</label>
                                <div className="px-2 py-1.5 bg-slate-100 rounded text-slate-700 font-medium">
                                    ${ast.type || 'Unknown'}
                                </div>
                            </div>
                            
                            <!-- AST Explorer -->
                            <div className="text-xs">
                                <label className="block text-slate-500 mb-1">Structure</label>
                                <div className="bg-slate-50 rounded p-2 max-h-64 overflow-auto">
                                    <pre className="text-[10px] text-slate-600 whitespace-pre-wrap">
                                        ${JSON.stringify(ast, (key, value) => {
                                            if (value instanceof Map) {
                                                return Object.fromEntries(value);
                                            }
                                            return value;
                                        }, 2)}
                                    </pre>
                                </div>
                            </div>
                            
                            <div className="pt-2 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 italic">
                                    Full visual editing for this diagram type coming soon. 
                                    Use the Code view for advanced editing.
                                </p>
                            </div>
                        </div>
                    ` : html`
                        <div className="text-center text-slate-400 py-8">
                            <i className="fas fa-info-circle text-2xl mb-2 opacity-50"></i>
                            <p className="text-xs">Enter valid Mermaid code to see properties</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
};

export default MermaidGenericEditor;
