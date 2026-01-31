import React, { useState, useEffect } from 'react';

export const SnippetInsertionDialog = ({ isOpen, onClose, onInsert, snippet, contextModel, selectedElement }) => {
    const [values, setValues] = useState({});
    const [insertionMode, setInsertionMode] = useState('cursor'); // 'cursor', 'before', 'after', 'replace'
    
    // Reset state when snippet changes or dialog opens
    useEffect(() => {
        if (isOpen && snippet) {
            const initialValues = {};
            if (snippet.params) {
                snippet.params.forEach(param => {
                    initialValues[param.name] = param.defaultValue || '';
                    
                    // Smart pre-fill based on selection
                    if (selectedElement) {
                        // If there's a 'source' param, pre-fill with selected element
                        if (param.name === 'source') {
                            initialValues[param.name] = selectedElement;
                        }
                        // If there's a 'name' param (e.g., for participant), pre-fill it
                        else if (param.name === 'name' && !initialValues[param.name]) {
                             initialValues[param.name] = selectedElement;
                        }
                        // If it's a Note and has 'target', pre-fill
                        else if ((param.name === 'target' || param.name === 'participant') && !initialValues[param.name]) {
                             initialValues[param.name] = selectedElement;
                        }
                    }
                });
            }
            setValues(initialValues);
            
            // Default insertion mode
            if (selectedElement) {
                // If we selected something, default to 'after' typically, or 'replace' if the user intent is editing
                // 'after' is safer for adding next steps
                setInsertionMode('after');
            } else {
                setInsertionMode('cursor');
            }
        }
    }, [isOpen, snippet, contextModel, selectedElement]);

    if (!isOpen || !snippet) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        
        let code = snippet.code;
        
        // Replace placeholders with values
        Object.entries(values).forEach(([key, value]) => {
            const val = value || (key === 'alias' ? '' : 'value');
            code = code.replaceAll(`\${${key}}`, val);
        });
        
        // Clean up empty aliases
        code = code.replace(/ as \s*\n/g, '\n'); 
        code = code.replace(/"" as /g, '');
        
        onInsert(code, insertionMode);
        onClose();
    };

    const handleChange = (name, value) => {
        setValues(prev => ({ ...prev, [name]: value }));
    };

    const hasParams = snippet.params && snippet.params.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <i className={`fas ${snippet.icon} text-indigo-500`}></i>
                        Insert {snippet.label}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6">
                    {hasParams ? (
                        <div className="space-y-4 mb-6">
                           {snippet.params.map(param => (
                                <div key={param.name}>
                                    <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wide">
                                        {param.label}
                                    </label>
                                    {param.type === 'select' ? (
                                        <select
                                            value={values[param.name] || ''}
                                            onChange={(e) => handleChange(param.name, e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="">Select...</option>
                                            {param.options.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={values[param.name] || ''}
                                            onChange={(e) => handleChange(param.name, e.target.value)}
                                            placeholder={`Enter ${param.label.toLowerCase()}...`}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            autoFocus={param.name === snippet.params[0].name}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mb-6 p-4 bg-indigo-50 text-indigo-700 rounded-lg text-sm">
                            <p>Inserting <strong>{snippet.label}</strong> snippet.</p>
                            <p className="mt-1 text-xs opacity-70">Choose where to place this code below.</p>
                        </div>
                    )}
                    
                    <div className="pt-2 border-t border-slate-100 mt-4">
                        <label className="block text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">
                            Insertion Position
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setInsertionMode('cursor')}
                                className={`py-2 px-3 rounded text-xs font-medium border transition-colors ${
                                    insertionMode === 'cursor' 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <i className="fas fa-i-cursor mr-1.5"></i> At Cursor
                            </button>
                            <button
                                type="button"
                                onClick={() => setInsertionMode('replace')}
                                className={`py-2 px-3 rounded text-xs font-medium border transition-colors ${
                                    insertionMode === 'replace' 
                                    ? 'bg-amber-50 border-amber-200 text-amber-700' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <i className="fas fa-sync-alt mr-1.5"></i> Replace Selection
                            </button>
                            <button
                                type="button"
                                onClick={() => setInsertionMode('before')}
                                className={`py-2 px-3 rounded text-xs font-medium border transition-colors ${
                                    insertionMode === 'before' 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <i className="fas fa-arrow-up mr-1.5"></i> Before Selection
                            </button>
                            <button
                                type="button"
                                onClick={() => setInsertionMode('after')}
                                className={`py-2 px-3 rounded text-xs font-medium border transition-colors ${
                                    insertionMode === 'after' 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <i className="fas fa-arrow-down mr-1.5"></i> After Selection
                            </button>
                        </div>
                    </div>
                 
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors"
                        >
                            Insert Code
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
