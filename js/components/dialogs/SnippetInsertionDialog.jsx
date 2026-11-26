import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalFooter, Button, FieldLabel, inputClass } from '../common.jsx';

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

    const positions = [
        { mode: 'cursor', icon: 'fa-i-cursor', label: 'At the cursor' },
        { mode: 'replace', icon: 'fa-sync-alt', label: 'Replace the selection' },
        { mode: 'before', icon: 'fa-arrow-up', label: 'Before the selection' },
        { mode: 'after', icon: 'fa-arrow-down', label: 'After the selection' }
    ];

    return (
        <Modal onClose={onClose} labelledBy="snippet-title" className="max-w-md">
            <ModalHeader id="snippet-title" icon={`fas ${snippet.icon}`} title={`Insert ${snippet.label}`} subtitle={hasParams ? "Fill in the details, then choose where the code goes" : "Choose where the code goes"} onClose={onClose} closeLabel="Close" />

            <form onSubmit={handleSubmit}>
                <div className="px-5 py-5 space-y-5">
                    {hasParams ? (
                        <div className="space-y-4">
                           {snippet.params.map(param => (
                                <div key={param.name}>
                                    <FieldLabel htmlFor={`snippet-${param.name}`}>{param.label}</FieldLabel>
                                    {param.type === 'select' ? (
                                        <select
                                            id={`snippet-${param.name}`}
                                            value={values[param.name] || ''}
                                            onChange={(e) => handleChange(param.name, e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">Select...</option>
                                            {param.options.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            id={`snippet-${param.name}`}
                                            type="text"
                                            value={values[param.name] || ''}
                                            onChange={(e) => handleChange(param.name, e.target.value)}
                                            placeholder={`Enter the ${param.label.toLowerCase()}`}
                                            className={inputClass}
                                            autoFocus={param.name === snippet.params[0].name}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <fieldset className={hasParams ? 'pt-4 border-t border-slate-100' : ''}>
                        <legend className="block text-xs font-medium text-slate-700 mb-2">Where to insert</legend>
                        <div className="grid grid-cols-2 gap-2">
                            {positions.map(({ mode, icon, label }) => {
                                const selected = insertionMode === mode;
                                return (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setInsertionMode(mode)}
                                        aria-pressed={selected}
                                        className={`h-9 px-3 rounded-md text-xs font-medium border inline-flex items-center gap-2 transition-colors ${
                                            selected
                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                    >
                                        <i className={`fas ${icon} text-[11px] ${selected ? 'text-indigo-600' : 'text-slate-400'}`} aria-hidden="true"></i> {label}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>
                </div>

                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" icon="fas fa-plus">
                        Insert
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};
