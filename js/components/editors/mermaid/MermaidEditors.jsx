import React, { useState, useEffect } from 'react';

// Common helper for visual editing disclaimer
export const VisualEditingNotAvailable = ({ type }) => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <span className="mb-4 w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center" aria-hidden="true">
            <i className="fas fa-code"></i>
        </span>
        <h3 className="text-[15px] font-semibold text-slate-900">Edit this diagram in code</h3>
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">
            The visual editor cannot change a {type} yet. Switch to Code to make changes.
        </p>
    </div>
);

// Flowchart visual editor
export const MermaidFlowchartEditor = ({ code, onChange }) => {
    // Parsing flowchart requires complex DOM analysis or bespoke parser
    // For this MVP, we provide node-based text editing helper
    return (
        <div className="h-full">
            {/* Placeholder for future visual graph editor */}
            <VisualEditingNotAvailable type="flowchart" />
        </div>
    );
};

// Sequence diagram visual editor
export const MermaidSequenceEditor = ({ code, onChange }) => {
    return <VisualEditingNotAvailable type="sequence diagram" />;
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
        <div className="p-6 max-w-2xl">
            
            <div className="mb-6">
                <label htmlFor="pie-title" className="block text-xs font-medium text-slate-700 mb-1.5">Chart title</label>
                <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => { setTitle(e.target.value); updateCode(e.target.value, data); }}
                    id="pie-title"
                    className="w-full h-9 px-3 bg-white text-[13px] text-slate-800 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Enter the chart title"
                />
            </div>
            
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700"><span className="flex-1">Slices</span><span className="w-24">Value</span><span className="w-8" aria-hidden="true"></span></div>
                {data.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                        <input 
                            type="text" 
                            value={item.label}
                            onChange={(e) => handleLabelChange(idx, e.target.value)}
                            aria-label={`Slice ${idx + 1} label`}
                            className="flex-1 h-9 px-3 bg-white text-[13px] text-slate-800 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="Label"
                        />
                        <input 
                            type="number" 
                            value={item.value}
                            onChange={(e) => handleValueChange(idx, e.target.value)}
                            aria-label={`Slice ${idx + 1} value`}
                            className="w-24 tabular-nums h-9 px-3 bg-white text-[13px] text-slate-800 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="Value"
                        />
                        <button 
                            onClick={() => removeSlice(idx)}
                            aria-label={`Remove the ${item.label} slice`}
                            title="Remove the slice"
                            className="w-8 h-8 inline-flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <i className="fas fa-trash-alt text-xs" aria-hidden="true"></i>
                        </button>
                    </div>
                ))}
            </div>
            
            <button 
                onClick={addNewSlice}
                className="h-8 px-3 inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-md shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors text-[13px]"
            >
                <i className="fas fa-plus text-xs" aria-hidden="true"></i> Add a slice
            </button>
        </div>
    );
};

// Gantt chart visual editor
export const MermaidGanttEditor = ({ code, onChange }) => {
    return <VisualEditingNotAvailable type="Gantt chart" />;
};

// Timeline visual editor
export const MermaidTimelineEditor = ({ code, onChange }) => {
    return <VisualEditingNotAvailable type="timeline" />;
};

// Journey visual editor
export const MermaidJourneyEditor = ({ code, onChange }) => {
    return <VisualEditingNotAvailable type="user journey" />;
};

// Mindmap visual editor
export const MermaidMindmapEditor = ({ code, onChange }) => {
    return <VisualEditingNotAvailable type="mind map" />;
};
