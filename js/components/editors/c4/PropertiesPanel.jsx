import React, { useEffect, useState } from 'react';
import { 
    Input, 
    TextArea, 
    Accordion, 
    NodeIcon 
} from '@synergycodes/overflow-ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette } from '@fortawesome/free-solid-svg-icons';


export const PropertiesPanel = ({ selectedElement, onChange, onDetach }) => {
    const [formData, setFormData] = useState({ label: '', description: '', technology: '', style: {} });

    useEffect(() => {
        if (selectedElement) {
            setFormData({
                label: selectedElement.data?.label || selectedElement.label || '', 
                description: selectedElement.data?.description || '',
                technology: selectedElement.data?.technology || '',
                style: selectedElement.data?.style || {},
            });
        }
    }, [selectedElement]);

    const handleChange = (field, value) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);
        onChange(selectedElement.id, newData);
    };

    if (!selectedElement) {
        return (
            <div className="w-64 bg-slate-50 border-l border-slate-200 p-4 text-center text-slate-500 text-sm">
                Select a node or edge to edit its properties.
            </div>
        );
    }

    const { type } = selectedElement;
    const isEdge = !type && selectedElement.source && selectedElement.target; // Simple check for edge
    const isNode = !isEdge;

    return (
        <aside className="w-72 bg-white border-l border-slate-200 p-4 shadow-xl z-20 overflow-y-auto h-full absolute right-0 top-0 bottom-0">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Properties</h3>
                <span className="text-xs uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                    {isEdge ? 'Connection' : type}
                </span>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Label</label>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Label</label>
                    <Input
                        value={formData.label}
                        onChange={(e) => handleChange('label', e.target.value)}
                        placeholder="e.g. User, Backend API"
                    />
                </div>

                {isNode && (
                    <>
                        {(type === 'container' || type === 'component' || type === 'database') && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Technology</label>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Technology</label>
                                <Input
                                    value={formData.technology}
                                    onChange={(e) => handleChange('technology', e.target.value)}
                                    placeholder="e.g. Java, PostgreSQL, React"
                                />
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                            <TextArea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Description of this element..."
                                minRows={3}
                            />
                        </div>

                        <Accordion 
                            label="Appearance"
                            icon={<NodeIcon icon={<FontAwesomeIcon icon={faPalette} />} />}
                            defaultOpen={false}
                            className="bg-transparent"
                        >
                            <div className="flex gap-2 p-2">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-slate-500">Background</span>
                                    <input 
                                        type="color" 
                                        value={formData.style?.backgroundColor || '#ffffff'} 
                                        onChange={(e) => handleChange('style', { ...formData.style, backgroundColor: e.target.value })}
                                        className="h-8 w-16 cursor-pointer border border-slate-200 rounded p-0 overflow-hidden"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-slate-500">Text</span>
                                    <input 
                                        type="color" 
                                        value={formData.style?.color || '#000000'}
                                        onChange={(e) => handleChange('style', { ...formData.style, color: e.target.value })}
                                        className="h-8 w-16 cursor-pointer border border-slate-200 rounded p-0 overflow-hidden"
                                    />
                                </div>
                            </div>
                        </Accordion>

                        {onDetach && (
                            <div className="pt-4 border-t border-slate-100">
                                <button 
                                    onClick={onDetach}
                                    className="w-full py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded hover:bg-slate-200 transition-colors"
                                >
                                    <i className="fas fa-expand-arrows-alt mr-2"></i> Detach from Group
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </aside>
    );
};
