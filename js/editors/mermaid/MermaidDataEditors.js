// Mermaid Data Diagram Editors
// Includes: Timeline, Gantt, Pie, Mindmap, Journey editors

import { html, useState, useEffect } from '../../react-helpers.js';

// Timeline Editor
export const MermaidTimelineEditor = ({ ast, code, onChange, onCodeChange, previewUrl, previewLoading }) => {
    const [sections, setSections] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [editValue, setEditValue] = useState('');
    
    useEffect(() => {
        if (!code) return;
        const lines = code.split('\n');
        const extractedSections = [];
        let currentSection = null;
        
        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'timeline' || trimmed.startsWith('%%') || trimmed.startsWith('title')) return;
            
            const sectionMatch = trimmed.match(/^section\s+(.+)$/i);
            if (sectionMatch) {
                currentSection = { type: 'section', title: sectionMatch[1], events: [], lineIndex: idx };
                extractedSections.push(currentSection);
                return;
            }
            
            const periodMatch = trimmed.match(/^(.+?)\s*:\s*(.+)$/);
            if (periodMatch) {
                const item = {
                    type: 'period',
                    period: periodMatch[1].trim(),
                    events: periodMatch[2].split(':').map(e => e.trim()).filter(e => e),
                    lineIndex: idx
                };
                if (currentSection) currentSection.events.push(item);
                else extractedSections.push(item);
            }
        });
        setSections(extractedSections);
    }, [code]);
    
    const handleAddPeriod = () => onCodeChange(code.trimEnd() + '\n    New Period : New Event');
    const handleAddSection = () => onCodeChange(code.trimEnd() + '\n    section New Section');
    
    return html`
        <div className="w-full h-full flex">
            <div className="flex-1 flex flex-col bg-slate-50">
                <div className="flex-none px-3 py-2 bg-white border-b border-slate-200 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600"><i className="fas fa-clock mr-1.5"></i>Timeline Editor</span>
                    <button onClick=${handleAddSection} className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">
                        <i className="fas fa-folder-plus mr-1"></i> Section
                    </button>
                    <button onClick=${handleAddPeriod} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200">
                        <i className="fas fa-plus mr-1"></i> Period
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center" style=${{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    ${previewUrl ? html`<img src=${previewUrl} alt="Timeline" className="max-w-full h-auto bg-white shadow-lg rounded" />` : html`
                        <div className="text-center text-slate-400"><i className="fas fa-clock text-4xl mb-3 opacity-30"></i><p className="text-sm">Timeline preview</p></div>
                    `}
                </div>
            </div>
            <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
                <div className="flex-none px-3 py-2 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600"><i className="fas fa-edit mr-1.5"></i>Timeline Elements</span>
                </div>
                <div className="flex-1 overflow-auto p-2">
                    ${sections.length === 0 ? html`
                        <div className="text-center text-slate-400 py-8"><i className="fas fa-info-circle text-2xl mb-2 opacity-50"></i><p className="text-xs">No timeline elements found</p></div>
                    ` : html`
                        <div className="space-y-2">
                            ${sections.map((item, idx) => html`
                                <div key=${idx} className="p-2 bg-slate-50 rounded text-xs">
                                    ${item.type === 'section' ? html`
                                        <div className="font-semibold text-indigo-600 mb-1"><i className="fas fa-folder mr-1"></i>${item.title}</div>
                                        ${item.events.map((e, i) => html`<div key=${i} className="ml-2 pl-2 border-l-2 border-indigo-200 text-slate-600">${e.period}: ${e.events.join(', ')}</div>`)}
                                    ` : html`<div className="text-slate-700">${item.period}: ${item.events.join(', ')}</div>`}
                                </div>
                            `)}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
};

// Gantt Editor
export const MermaidGanttEditor = ({ ast, code, onChange, onCodeChange, previewUrl, previewLoading }) => {
    const [tasks, setTasks] = useState([]);
    
    useEffect(() => {
        if (!code) return;
        const lines = code.split('\n');
        const extractedTasks = [];
        let currentSection = null;
        
        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'gantt' || trimmed.startsWith('%%')) return;
            
            const sectionMatch = trimmed.match(/^section\s+(.+)$/i);
            if (sectionMatch) {
                currentSection = sectionMatch[1];
                return;
            }
            
            const taskMatch = trimmed.match(/^(.+?)\s*:\s*(.+)$/);
            if (taskMatch && !['title', 'dateFormat', 'axisFormat', 'excludes'].includes(taskMatch[1].toLowerCase())) {
                extractedTasks.push({ name: taskMatch[1], details: taskMatch[2], section: currentSection, lineIndex: idx });
            }
        });
        setTasks(extractedTasks);
    }, [code]);
    
    const handleAddTask = () => onCodeChange(code.trimEnd() + '\n    New Task : a1, 2024-01-01, 1d');
    
    return html`
        <div className="w-full h-full flex">
            <div className="flex-1 flex flex-col bg-slate-50">
                <div className="flex-none px-3 py-2 bg-white border-b border-slate-200 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600"><i className="fas fa-tasks mr-1.5"></i>Gantt Editor</span>
                    <button onClick=${handleAddTask} className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">
                        <i className="fas fa-plus mr-1"></i> Task
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center" style=${{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    ${previewUrl ? html`<img src=${previewUrl} alt="Gantt Chart" className="max-w-full h-auto bg-white shadow-lg rounded" />` : html`
                        <div className="text-center text-slate-400"><i className="fas fa-tasks text-4xl mb-3 opacity-30"></i><p className="text-sm">Gantt chart preview</p></div>
                    `}
                </div>
            </div>
            <div className="w-72 border-l border-slate-200 bg-white flex flex-col">
                <div className="flex-none px-3 py-2 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600">Tasks (${tasks.length})</span>
                </div>
                <div className="flex-1 overflow-auto p-2">
                    ${tasks.map((task, idx) => html`
                        <div key=${idx} className="p-2 bg-slate-50 rounded text-xs mb-1">
                            ${task.section && html`<div className="text-[10px] text-indigo-500 mb-1">${task.section}</div>`}
                            <div className="font-medium">${task.name}</div>
                            <div className="text-slate-500 text-[10px]">${task.details}</div>
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
};

// Pie Editor
export const MermaidPieEditor = ({ ast, code, onChange, onCodeChange, previewUrl, previewLoading }) => {
    const [slices, setSlices] = useState([]);
    
    useEffect(() => {
        if (!code) return;
        const lines = code.split('\n');
        const extractedSlices = [];
        
        lines.forEach((line, idx) => {
            const match = line.trim().match(/^"(.+?)"\s*:\s*([\d.]+)$/);
            if (match) {
                extractedSlices.push({ label: match[1], value: parseFloat(match[2]), lineIndex: idx });
            }
        });
        setSlices(extractedSlices);
    }, [code]);
    
    const handleAddSlice = () => onCodeChange(code.trimEnd() + '\n    "New Slice" : 10');
    
    return html`
        <div className="w-full h-full flex">
            <div className="flex-1 flex flex-col bg-slate-50">
                <div className="flex-none px-3 py-2 bg-white border-b border-slate-200 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600"><i className="fas fa-chart-pie mr-1.5"></i>Pie Chart Editor</span>
                    <button onClick=${handleAddSlice} className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">
                        <i className="fas fa-plus mr-1"></i> Slice
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center" style=${{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    ${previewUrl ? html`<img src=${previewUrl} alt="Pie Chart" className="max-w-full h-auto bg-white shadow-lg rounded" />` : html`
                        <div className="text-center text-slate-400"><i className="fas fa-chart-pie text-4xl mb-3 opacity-30"></i><p className="text-sm">Pie chart preview</p></div>
                    `}
                </div>
            </div>
            <div className="w-72 border-l border-slate-200 bg-white flex flex-col">
                <div className="flex-none px-3 py-2 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600">Slices (${slices.length})</span>
                </div>
                <div className="flex-1 overflow-auto p-2">
                    ${slices.map((slice, idx) => html`
                        <div key=${idx} className="p-2 bg-slate-50 rounded text-xs mb-1 flex justify-between items-center">
                            <span className="font-medium">${slice.label}</span>
                            <span className="text-indigo-600">${slice.value}</span>
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
};

// Mindmap Editor
export const MermaidMindmapEditor = ({ ast, code, onChange, onCodeChange, previewUrl, previewLoading }) => {
    const handleAddNode = () => onCodeChange(code.trimEnd() + '\n    New Node');
    
    return html`
        <div className="w-full h-full flex">
            <div className="flex-1 flex flex-col bg-slate-50">
                <div className="flex-none px-3 py-2 bg-white border-b border-slate-200 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600"><i className="fas fa-brain mr-1.5"></i>Mindmap Editor</span>
                    <button onClick=${handleAddNode} className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">
                        <i className="fas fa-plus mr-1"></i> Node
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center" style=${{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    ${previewUrl ? html`<img src=${previewUrl} alt="Mindmap" className="max-w-full h-auto bg-white shadow-lg rounded" />` : html`
                        <div className="text-center text-slate-400"><i className="fas fa-brain text-4xl mb-3 opacity-30"></i><p className="text-sm">Mindmap preview</p></div>
                    `}
                </div>
            </div>
            <div className="w-72 border-l border-slate-200 bg-white flex flex-col">
                <div className="flex-none px-3 py-2 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600">Structure</span>
                </div>
                <div className="flex-1 overflow-auto p-2">
                    <p className="text-xs text-slate-500">Edit mindmap nodes in code view. Add child nodes using indentation.</p>
                </div>
            </div>
        </div>
    `;
};

// Journey Editor
export const MermaidJourneyEditor = ({ ast, code, onChange, onCodeChange, previewUrl, previewLoading }) => {
    const [tasks, setTasks] = useState([]);
    
    useEffect(() => {
        if (!code) return;
        const lines = code.split('\n');
        const extractedTasks = [];
        let currentSection = null;
        
        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'journey' || trimmed.startsWith('%%')) return;
            
            const sectionMatch = trimmed.match(/^section\s+(.+)$/i);
            if (sectionMatch) {
                currentSection = sectionMatch[1];
                return;
            }
            
            const taskMatch = trimmed.match(/^(.+?)\s*:\s*(\d+)(?:\s*:\s*(.+))?$/);
            if (taskMatch && !['title'].includes(taskMatch[1].toLowerCase())) {
                extractedTasks.push({ name: taskMatch[1], score: parseInt(taskMatch[2]), actors: taskMatch[3] || '', section: currentSection, lineIndex: idx });
            }
        });
        setTasks(extractedTasks);
    }, [code]);
    
    const handleAddTask = () => onCodeChange(code.trimEnd() + '\n    New Task: 5: Actor');
    
    const getScoreColor = (score) => {
        const colors = { 1: 'bg-red-100 text-red-700', 2: 'bg-orange-100 text-orange-700', 3: 'bg-yellow-100 text-yellow-700', 4: 'bg-lime-100 text-lime-700', 5: 'bg-green-100 text-green-700' };
        return colors[score] || 'bg-slate-100 text-slate-700';
    };
    
    return html`
        <div className="w-full h-full flex">
            <div className="flex-1 flex flex-col bg-slate-50">
                <div className="flex-none px-3 py-2 bg-white border-b border-slate-200 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600"><i className="fas fa-route mr-1.5"></i>User Journey Editor</span>
                    <button onClick=${handleAddTask} className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">
                        <i className="fas fa-plus mr-1"></i> Task
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center" style=${{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    ${previewUrl ? html`<img src=${previewUrl} alt="User Journey" className="max-w-full h-auto bg-white shadow-lg rounded" />` : html`
                        <div className="text-center text-slate-400"><i className="fas fa-route text-4xl mb-3 opacity-30"></i><p className="text-sm">User journey preview</p></div>
                    `}
                </div>
            </div>
            <div className="w-72 border-l border-slate-200 bg-white flex flex-col">
                <div className="flex-none px-3 py-2 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600">Tasks (${tasks.length})</span>
                </div>
                <div className="flex-1 overflow-auto p-2">
                    ${tasks.map((task, idx) => html`
                        <div key=${idx} className="p-2 bg-slate-50 rounded text-xs mb-1">
                            ${task.section && html`<div className="text-[10px] text-indigo-500 mb-1">${task.section}</div>`}
                            <div className="flex justify-between items-center">
                                <span className="font-medium">${task.name}</span>
                                <span className=${`px-1.5 py-0.5 rounded text-[10px] font-medium ${getScoreColor(task.score)}`}>${task.score}</span>
                            </div>
                            ${task.actors && html`<div className="text-[10px] text-slate-500 mt-1">Actors: ${task.actors}</div>`}
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
};
