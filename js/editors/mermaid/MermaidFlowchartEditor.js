// Mermaid Flowchart Editor
// Interactive node-based editing for flowchart diagrams

import { html, useState, useEffect } from '../../react-helpers.js';
import { escapeRegex } from '../../utils.js';

/**
 * Flowchart editor with node/edge list and inline editing
 */
export const MermaidFlowchartEditor = ({ ast, code, onChange, onCodeChange, previewUrl, previewLoading }) => {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [editingNode, setEditingNode] = useState(null);
    const [editValue, setEditValue] = useState('');
    
    // Parse AST to extract nodes and edges
    useEffect(() => {
        if (!ast || ast.type !== 'flowchart') return;
        
        const extractedNodes = [];
        const extractedEdges = [];
        
        // Extract nodes from AST
        if (ast.nodes) {
            if (ast.nodes instanceof Map) {
                ast.nodes.forEach((node, id) => {
                    extractedNodes.push({
                        id: id,
                        label: node.text?.text || node.label || id,
                        shape: node.shape || 'rectangle'
                    });
                });
            } else if (Array.isArray(ast.nodes)) {
                ast.nodes.forEach(node => {
                    extractedNodes.push({
                        id: node.id,
                        label: node.text?.text || node.label || node.id,
                        shape: node.shape || 'rectangle'
                    });
                });
            }
        }
        
        // Extract edges from AST
        if (ast.edges && Array.isArray(ast.edges)) {
            ast.edges.forEach((edge, idx) => {
                extractedEdges.push({
                    id: `e-${idx}`,
                    from: edge.from || edge.source,
                    to: edge.to || edge.target,
                    label: edge.text?.text || edge.label || ''
                });
            });
        }
        
        setNodes(extractedNodes);
        setEdges(extractedEdges);
    }, [ast]);
    
    // Handle node label edit
    const handleNodeEdit = (nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setEditingNode(nodeId);
            setEditValue(node.label);
        }
    };
    
    const handleEditSave = () => {
        if (!editingNode || !ast) return;
        
        const node = nodes.find(n => n.id === editingNode);
        if (node && node.label !== editValue) {
            let newCode = code;
            
            // Try different bracket types for replacement
            const patterns = [
                { old: `${editingNode}[${node.label}]`, new: `${editingNode}[${editValue}]` },
                { old: `${editingNode}(${node.label})`, new: `${editingNode}(${editValue})` },
                { old: `${editingNode}{${node.label}}`, new: `${editingNode}{${editValue}}` },
                { old: `${editingNode}((${node.label}))`, new: `${editingNode}((${editValue}))` },
                { old: `${editingNode}([${node.label}])`, new: `${editingNode}([${editValue}])` },
                { old: `${editingNode}[[${node.label}]]`, new: `${editingNode}[[${editValue}]]` },
                { old: `${editingNode}[(${node.label})]`, new: `${editingNode}[(${editValue})]` },
                { old: `${editingNode}[/${node.label}/]`, new: `${editingNode}[/${editValue}/]` },
                { old: `${editingNode}[\\${node.label}\\]`, new: `${editingNode}[\\${editValue}\\]` },
                { old: `${editingNode}{{${node.label}}}`, new: `${editingNode}{{${editValue}}}` },
            ];
            
            for (const p of patterns) {
                if (code.includes(p.old)) {
                    newCode = code.replace(p.old, p.new);
                    break;
                }
            }
            
            if (newCode !== code) {
                onCodeChange(newCode);
            }
        }
        
        setEditingNode(null);
        setEditValue('');
    };
    
    const handleEditCancel = () => {
        setEditingNode(null);
        setEditValue('');
    };
    
    // Add new node
    const handleAddNode = () => {
        const newId = `Node${nodes.length + 1}`;
        const newNodeCode = `\n    ${newId}[New Node]`;
        onCodeChange(code + newNodeCode);
    };
    
    // Add new edge
    const handleAddEdge = () => {
        if (nodes.length < 2) return;
        const newEdgeCode = `\n    ${nodes[0]?.id || 'A'} --> ${nodes[1]?.id || 'B'}`;
        onCodeChange(code + newEdgeCode);
    };
    
    return html`
        <div className="w-full h-full flex">
            <!-- Left: Interactive Preview -->
            <div className="flex-1 flex flex-col bg-slate-50">
                <!-- Toolbar -->
                <div className="flex-none px-3 py-2 bg-white border-b border-slate-200 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600 mr-2">
                        <i className="fas fa-project-diagram mr-1.5"></i>
                        Flowchart Editor
                    </span>
                    <button 
                        onClick=${handleAddNode}
                        className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                    >
                        <i className="fas fa-plus mr-1"></i> Node
                    </button>
                    <button 
                        onClick=${handleAddEdge}
                        className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                        disabled=${nodes.length < 2}
                    >
                        <i className="fas fa-arrow-right mr-1"></i> Edge
                    </button>
                    <div className="flex-1"></div>
                    ${previewLoading && html`
                        <span className="text-xs text-slate-400">
                            <i className="fas fa-circle-notch fa-spin mr-1"></i>
                        </span>
                    `}
                </div>
                
                <!-- Preview Area -->
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center"
                     style=${{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    ${previewUrl ? html`
                        <img src=${previewUrl} alt="Flowchart" className="max-w-full h-auto bg-white shadow-lg rounded" />
                    ` : html`
                        <div className="text-center text-slate-400">
                            <i className="fas fa-project-diagram text-4xl mb-3 opacity-30"></i>
                            <p className="text-sm">Flowchart preview</p>
                        </div>
                    `}
                </div>
            </div>
            
            <!-- Right: Node/Edge List Panel -->
            <div className="w-72 border-l border-slate-200 bg-white flex flex-col">
                <div className="flex-none px-3 py-2 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600">
                        <i className="fas fa-list mr-1.5"></i>
                        Elements
                    </span>
                </div>
                <div className="flex-1 overflow-auto">
                    <!-- Nodes Section -->
                    <div className="p-2 border-b border-slate-100">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">
                            Nodes (${nodes.length})
                        </div>
                        <div className="space-y-1">
                            ${nodes.map(node => html`
                                <div 
                                    key=${node.id}
                                    className=${`p-2 rounded text-xs cursor-pointer transition-colors ${
                                        selectedNode === node.id 
                                            ? 'bg-indigo-50 border border-indigo-200' 
                                            : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                                    }`}
                                    onClick=${() => setSelectedNode(node.id)}
                                    onDoubleClick=${() => handleNodeEdit(node.id)}
                                >
                                    ${editingNode === node.id ? html`
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                value=${editValue}
                                                onChange=${(e) => setEditValue(e.target.value)}
                                                onKeyDown=${(e) => {
                                                    if (e.key === 'Enter') handleEditSave();
                                                    if (e.key === 'Escape') handleEditCancel();
                                                }}
                                                className="flex-1 px-1 py-0.5 text-xs border rounded"
                                                autoFocus
                                            />
                                            <button onClick=${handleEditSave} className="text-green-600 hover:text-green-700">
                                                <i className="fas fa-check"></i>
                                            </button>
                                            <button onClick=${handleEditCancel} className="text-slate-400 hover:text-slate-600">
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    ` : html`
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-slate-700">${node.label}</span>
                                            <span className="text-[10px] text-slate-400">${node.id}</span>
                                        </div>
                                    `}
                                </div>
                            `)}
                            ${nodes.length === 0 && html`
                                <div className="text-center text-slate-400 py-2 text-xs">
                                    No nodes found
                                </div>
                            `}
                        </div>
                    </div>
                    
                    <!-- Edges Section -->
                    <div className="p-2">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">
                            Edges (${edges.length})
                        </div>
                        <div className="space-y-1">
                            ${edges.map(edge => html`
                                <div 
                                    key=${edge.id}
                                    className="p-2 rounded text-xs bg-slate-50 hover:bg-slate-100 border border-transparent"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-600">${edge.from}</span>
                                        <i className="fas fa-arrow-right text-[8px] text-slate-400"></i>
                                        <span className="text-slate-600">${edge.to}</span>
                                        ${edge.label && html`
                                            <span className="text-[10px] text-indigo-500 ml-1">"${edge.label}"</span>
                                        `}
                                    </div>
                                </div>
                            `)}
                            ${edges.length === 0 && html`
                                <div className="text-center text-slate-400 py-2 text-xs">
                                    No edges found
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                
                <!-- Help Text -->
                <div className="flex-none p-2 border-t border-slate-100 bg-slate-50">
                    <p className="text-[10px] text-slate-400">
                        <i className="fas fa-info-circle mr-1"></i>
                        Double-click a node to edit its label
                    </p>
                </div>
            </div>
        </div>
    `;
};

export default MermaidFlowchartEditor;
