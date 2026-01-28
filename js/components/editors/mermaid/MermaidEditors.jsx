import React, { useState, useEffect } from 'react';

// Common helper for visual editing disclaimer
export const VisualEditingNotAvailable = ({ type }) => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <i className="fas fa-code text-2xl opacity-50"></i>
        </div>
        <h3 className="text-lg font-medium text-slate-700 mb-2">Code-Only Editing</h3>
        <p className="max-w-md text-sm">
            Visual editing for <strong>{type}</strong> diagrams is not yet available.
            Please use the code editor to make changes.
        </p>
    </div>
);

// Flowchart visual editor
export const MermaidFlowchartEditor = ({ code, onChange }) => {
    // Parsing flowchart requires complex DOM analysis or bespoke parser
    // For this MVP, we provide node-based text editing helper
    return (
        <div className="p-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                    <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                    <div>
                        <h4 className="font-medium text-blue-800 text-sm">Flowchart Editor</h4>
                        <p className="text-blue-600 text-xs mt-1">
                            Interactive node editing coming soon. Use the code editor for full control.
                        </p>
                    </div>
                </div>
            </div>
            {/* Placeholder for future visual graph editor */}
            <VisualEditingNotAvailable type="Flowchart" />
        </div>
    );
};

// Sequence diagram visual editor
export const MermaidSequenceEditor = ({ code, onChange }) => {
    return <VisualEditingNotAvailable type="Sequence Diagram" />;
};

// Pie chart visual editor
export const MermaidPieEditor = ({ code, onChange }) => {
    const [data, setData] = useState([]);
    const [title, setTitle] = useState('');
    
    useEffect(() => {
        // Simple regex parser for Pie chart
        if (!code) return;
        const titleMatch = code.match(/title\s+(.+)$/m);
        if (titleMatch) setTitle(titleMatch[1]);
        
        const matches = [...code.matchAll(/"([^"]+)"\s*:\s*([\d.]+)/g)];
        if (matches.length > 0) {
            setData(matches.map(m => ({ label: m[1], value: parseFloat(m[2]) })));
        }
    }, [code]);
    
    const updateCode = (newTitle, newData) => {
        let newCode = 'pie';
        if (newTitle) newCode += ` title ${newTitle}`;
        newCode += '\n';
        newData.forEach(item => {
            newCode += `    "${item.label}" : ${item.value}\n`;
        });
        onChange(newCode);
    };
    
    const handleValueChange = (idx, val) => {
        const newData = [...data];
        newData[idx].value = parseFloat(val) || 0;
        setData(newData);
        updateCode(title, newData);
    };
    
    const handleLabelChange = (idx, val) => {
        const newData = [...data];
        newData[idx].label = val;
        setData(newData);
        updateCode(title, newData);
    };
    
    const addNewSlice = () => {
        const newData = [...data, { label: 'New Slice', value: 10 }];
        setData(newData);
        updateCode(title, newData);
    };
    
    const removeSlice = (idx) => {
        const newData = data.filter((_, i) => i !== idx);
        setData(newData);
        updateCode(title, newData);
    };
    
    return (
        <div className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Edit Pie Chart</h3>
            
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Chart Title</label>
                <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => { setTitle(e.target.value); updateCode(e.target.value, data); }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Enter chart title"
                />
            </div>
            
            <div className="space-y-3 mb-6">
                <label className="block text-sm font-medium text-slate-700">Data Slices</label>
                {data.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                        <input 
                            type="text" 
                            value={item.label}
                            onChange={(e) => handleLabelChange(idx, e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            placeholder="Label"
                        />
                        <input 
                            type="number" 
                            value={item.value}
                            onChange={(e) => handleValueChange(idx, e.target.value)}
                            className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            placeholder="Value"
                        />
                        <button 
                            onClick={() => removeSlice(idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <i className="fas fa-trash"></i>
                        </button>
                    </div>
                ))}
            </div>
            
            <button 
                onClick={addNewSlice}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors text-sm"
            >
                <i className="fas fa-plus mr-2"></i> Add Slice
            </button>
        </div>
    );
};

// Gantt chart visual editor
export const MermaidGanttEditor = ({ code, onChange }) => {
    return <VisualEditingNotAvailable type="Gantt Chart" />;
};

// Timeline visual editor
export const MermaidTimelineEditor = ({ code, onChange }) => {
    return <VisualEditingNotAvailable type="Timeline" />;
};

// Journey visual editor
export const MermaidJourneyEditor = ({ code, onChange }) => {
    return <VisualEditingNotAvailable type="User Journey" />;
};

// Mindmap visual editor
export const MermaidMindmapEditor = ({ code, onChange }) => {
    return <VisualEditingNotAvailable type="Mindmap" />;
};
