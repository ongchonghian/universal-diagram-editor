import React, { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  Background,
  Handle,
  Position,
  NodeResizer,
  useOnSelectionChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Synergy Codes Imports
import { 
    NodePanel, 
    NodeIcon, 
    NodeDescription 
} from '@synergycodes/overflow-ui';
import './synergy-lib.css'; // Local copy
import '@synergycodes/overflow-ui/tokens.css'; // Correct export path

// Using FontAwesome for icons as placeholders
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faUser, faDatabase, faLayerGroup, faCode, faLink } from '@fortawesome/free-solid-svg-icons';

// Hooks and Components
import { PropertiesPanel } from './PropertiesPanel.jsx';
import { useUndoRedo } from './useUndoRedo.js';
import { AutoLayoutButton } from './AutoLayoutButton.jsx';
import { SynergySidebar } from './SynergySidebar.jsx';
import useAutoLayout from './useAutoLayout.js';

// Editor Context for passing callbacks to nodes
const EditorContext = React.createContext({
    onResizeStart: () => {},
});

const SynergyNode = ({ data, selected, width, height }) => {
    const { onResizeStart } = React.useContext(EditorContext);

    // Map C4 types to icons
    let icon = <FontAwesomeIcon icon={faServer} />;
    if (data.type === 'person') icon = <FontAwesomeIcon icon={faUser} />;
    if (data.type === 'database') icon = <FontAwesomeIcon icon={faDatabase} />;
    if (data.type === 'container') icon = <FontAwesomeIcon icon={faLayerGroup} />;
    if (data.type === 'component') icon = <FontAwesomeIcon icon={faCode} />;

    const isGrouped = !!data.parentId;
    const isHighlighted = !!data.isGroupHighlighted;

    const borderClass = selected 
        ? '!border-blue-500' 
        : isHighlighted 
            ? '!border-blue-300 border-dashed' 
            : '!border-slate-300';
    
    const showLinkIcon = isHighlighted && isGrouped;

    // Scaling Logic: Font size and Icon size
    const currentWidth = width || 150;
    
    // Scale font between 12px and 32px based on width
    const fontSize = Math.max(12, Math.min(32, 12 + (currentWidth - 150) / 10));
    const iconSize = Math.max(16, Math.min(48, 16 + (currentWidth - 150) / 8));

    return (
        <>
            <NodeResizer 
                isVisible={selected} 
                minWidth={150} 
                minHeight={80} 
                lineStyle={{ border: '1px solid #1a192b' }} 
                handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
                onResizeStart={onResizeStart} 
            />
            <NodePanel.Root 
                selected={selected} 
                className={`w-full h-full !border-2 !bg-white ${borderClass}`}
            >
                <NodePanel.Header>
                    <div className="flex items-center gap-3 w-full" style={{ fontSize: `${fontSize}px` }}>
                        <div style={{ width: `${iconSize}px`, height: `${iconSize}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <NodeIcon icon={icon} className="w-full h-full" />
                        </div>
                        <NodeDescription 
                            label={data.label} 
                            description={data.description || data.type} 
                        />
                        {showLinkIcon && (
                            <div className="ml-auto" title="Grouped">
                                <FontAwesomeIcon icon={faLink} className="text-blue-400" style={{ width: `${Math.max(12, iconSize * 0.6)}px` }} />
                            </div>
                        )}
                    </div>
                </NodePanel.Header>
                {/* Optional Content Section */}
                {data.technology && (
                    <NodePanel.Content isVisible={true}>
                        <div className="text-gray-500 mt-2 px-1" style={{ fontSize: `${Math.max(10, fontSize * 0.8)}px` }}>
                            [{data.technology}]
                        </div>
                    </NodePanel.Content>
                )}
                
                <NodePanel.Handles isVisible={true}>
                    <Handle id="top" type="target" position={Position.Top} style={{ background: '#555' }} />
                    <Handle id="bottom" type="source" position={Position.Bottom} style={{ background: '#555' }} />
                    <Handle id="left" type="target" position={Position.Left} style={{ background: '#555' }} />
                    <Handle id="right" type="source" position={Position.Right} style={{ background: '#555' }} />
                </NodePanel.Handles>
            </NodePanel.Root>
        </>
    );
};

const nodeTypes = {
  person: SynergyNode,
  system: SynergyNode,
  container: SynergyNode,
  component: SynergyNode,
  database: SynergyNode,
};

const defaultNodes = [
    {
        id: '1',
        type: 'person',
        data: { label: 'User', description: 'A user of the banking system', type: 'person' },
        position: { x: 250, y: 50 },
    },
    {
        id: '2',
        type: 'system',
        data: { label: 'Internet Banking', description: 'Allows customers to view implementation', type: 'system', technology: 'Java/Spring' },
        position: { x: 250, y: 250 },
    },
    {
        id: '3',
        type: 'database',
        data: { label: 'Database', description: 'Stores user data', type: 'database', technology: 'PostgreSQL' },
        position: { x: 250, y: 550 },
    },
];

const defaultEdges = [
    { id: 'e1-2', source: '1', target: '2', animated: true, label: 'Uses', type: 'smoothstep' },
    { id: 'e2-3', source: '2', target: '3', label: 'Reads/Writes', type: 'smoothstep' },
];

export const SynergyC4Editor = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
    const [selectedElement, setSelectedElement] = useState(null);
    const { screenToFlowPosition, getIntersectingNodes } = useReactFlow();
    const [clipboard, setClipboard] = useState([]); // Clipboard for Copy/Paste
    
    // Undo/Redo Hook
    const { takeSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo();
    
    // AutoLayout Hook
    const { getLayoutedElements } = useAutoLayout();

    const onAddNode = useCallback((type, label) => {
        const newId = crypto.randomUUID();
        const newNode = {
            id: newId,
            type,
            position: { x: 250, y: 50 + (nodes.length * 20) }, // Staggered
            data: { label: label, description: `New ${label}`, type: type },
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedElement(newNode);
    }, [nodes, setNodes]);

    // Custom onNodesChange to handle grouping
    const onNodesChangeWithGrouping = useCallback(
        (changes) => {
            const additionalChanges = [];

            changes.forEach((change) => {
                if (change.type === 'position' && change.dragging) {
                    const movingNodeId = change.id;
                    const children = nodes.filter(n => n.data?.parentId === movingNodeId);
                    
                    if (children.length > 0 && change.position) {
                        const movingNode = nodes.find(n => n.id === movingNodeId);
                        
                        if (movingNode && movingNode.position) {
                             const deltaX = change.position.x - movingNode.position.x;
                             const deltaY = change.position.y - movingNode.position.y;
                             
                             if (deltaX !== 0 || deltaY !== 0) {
                                 children.forEach(child => {
                                     additionalChanges.push({
                                         id: child.id,
                                         type: 'position',
                                         position: {
                                             x: child.position.x + deltaX,
                                             y: child.position.y + deltaY,
                                         },
                                         dragging: true 
                                     });
                                 });
                             }
                        }
                    }
                }
            });

            onNodesChange([...changes, ...additionalChanges]);
        },
        [onNodesChange, nodes]
    );

    // Group Highlighting Logic
    useOnSelectionChange({
        onChange: ({ nodes: selectedNodes }) => {
            const activeGroupIds = new Set();
            
            selectedNodes.forEach(node => {
                activeGroupIds.add(node.id);
                if (node.data?.parentId) activeGroupIds.add(node.data.parentId);
            });

            setNodes((nds) => nds.map((n) => {
                const belongsToActiveGroup = 
                    activeGroupIds.has(n.id) || 
                    (n.data?.parentId && activeGroupIds.has(n.data.parentId));

                if (!!n.data.isGroupHighlighted !== belongsToActiveGroup) {
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            isGroupHighlighted: belongsToActiveGroup
                        }
                    };
                }
                return n;
            }));
        },
    });

    const onNodeDragStart = useCallback((event, node) => {
        takeSnapshot(nodes, edges);
    }, [nodes, edges, takeSnapshot]);

    const onConnect = useCallback(
        (params) => {
            takeSnapshot(nodes, edges);
            setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds));
        },
        [setEdges, nodes, edges, takeSnapshot],
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        console.log('[SynergyEditor] Drag over'); 
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            takeSnapshot(nodes, edges);

            console.log('[SynergyEditor] Drop event', event.clientX, event.clientY);
            const type = event.dataTransfer.getData('application/reactflow');
            const label = event.dataTransfer.getData('application/reactflow-label');
            console.log('[SynergyEditor] Drop data:', type, label);

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode = {
                id: crypto.randomUUID(),
                type: type,
                position,
                data: { label: label, description: `New ${label}`, type: type },
            };

            setNodes((nds) => nds.concat(newNode));
            setSelectedElement(newNode);
        },
        [screenToFlowPosition, setNodes, nodes, edges, takeSnapshot],
    );

    const onNodeClick = useCallback((event, node) => {
        setSelectedElement(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedElement(null);
    }, []);

    const handlePropertyChange = useCallback((id, newData) => {
        takeSnapshot(nodes, edges);

        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, ...newData } };
            }
            return node;
        }));
        
        setSelectedElement((prev) => {
            if (prev && prev.id === id) {
                return { ...prev, data: { ...prev.data, ...newData } };
            }
            return prev;
        });
    }, [setNodes, nodes, edges, takeSnapshot]);

    const onLayout = useCallback(async () => {
        takeSnapshot(nodes, edges); 

        const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
            nodes, 
            edges
        );
        
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [nodes, edges, setNodes, setEdges, takeSnapshot, getLayoutedElements]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.metaKey || event.ctrlKey) {
                
                // Grouping: 'g'
                if (event.key === 'g') {
                    event.preventDefault();
                    
                    // Ungroup: Cmd+Shift+G
                    if (event.shiftKey) {
                        const selectedNodes = nodes.filter(n => n.selected);
                        if (selectedNodes.length === 0) return;

                        takeSnapshot(nodes, edges);

                        setNodes((nds) => nds.map((n) => {
                            if (n.selected && n.data?.parentId) {
                                const { parentId, ...restData } = n.data;
                                return { ...n, data: restData, zIndex: 0 };
                            }
                            return n;
                        }));
                    } 
                    // Group: Cmd+G
                    else {
                        const selectedNodes = nodes.filter(n => n.selected);
                        if (selectedNodes.length < 2) return;

                        let parent = selectedNodes.find(n => n.type === 'system');
                        if (!parent) parent = selectedNodes.find(n => n.type === 'container');
                        
                        if (!parent) return; 

                        takeSnapshot(nodes, edges);

                        setNodes((nds) => nds.map((n) => {
                            if (n.id === parent.id) return n;

                            if (n.selected) {
                                 const isChild = (n.type === 'container' && parent.type === 'system') ||
                                                (n.type === 'component' && parent.type === 'container') || 
                                                (n.type === 'database' && (parent.type === 'container' || parent.type === 'system'));
                                
                                if (isChild) {
                                    return {
                                        ...n,
                                        data: { ...n.data, parentId: parent.id },
                                        zIndex: 10
                                    };
                                }
                            }
                            return n;
                        }));
                    }
                }
                
                // Undo: Cmd+Z
                if (event.key === 'z' && !event.shiftKey) {
                    event.preventDefault();
                    if (canUndo) {
                        undo({ nodes, edges, setNodes, setEdges });
                    }
                }
                
                // Redo: Cmd+Shift+Z
                if (event.key === 'z' && event.shiftKey) {
                    event.preventDefault();
                    if (canRedo) {
                        redo({ nodes, edges, setNodes, setEdges });
                    }
                }

                // Copy: Cmd+C
                if (event.key === 'c') {
                    event.preventDefault();
                    const selectedNodes = nodes.filter(n => n.selected);
                    if (selectedNodes.length === 0) return;

                    const nodesToCopy = new Set(selectedNodes);
                    
                    const findDescendants = (parentId) => {
                        return nodes.filter(n => n.data?.parentId === parentId);
                    };

                    selectedNodes.forEach(node => {
                        const stack = [node.id];
                        while (stack.length > 0) {
                            const currentId = stack.pop();
                            const children = findDescendants(currentId);
                            children.forEach(child => {
                                if (!nodesToCopy.has(child)) {
                                    nodesToCopy.add(child);
                                    stack.push(child.id);
                                }
                            });
                        }
                    });

                    setClipboard(Array.from(nodesToCopy));
                }

                // Paste: Cmd+V
                if (event.key === 'v') {
                    event.preventDefault();
                    if (clipboard.length === 0) return;
                    
                    takeSnapshot(nodes, edges);

                    const idMap = new Map();
                    clipboard.forEach(node => {
                        idMap.set(node.id, crypto.randomUUID());
                    });

                    const pastedNodes = clipboard.map(node => {
                        const newId = idMap.get(node.id);
                        const oldParentId = node.data?.parentId;
                        const newParentId = oldParentId && idMap.has(oldParentId) 
                            ? idMap.get(oldParentId) 
                            : oldParentId;

                        return {
                            ...node,
                            id: newId,
                            position: {
                                x: node.position.x + 50, 
                                y: node.position.y + 50
                            },
                            selected: true,
                            data: {
                                ...node.data,
                                parentId: newParentId
                            }
                        };
                    });

                    const nodesWithDeselected = nodes.map(n => ({...n, selected: false}));
                    setNodes([...nodesWithDeselected, ...pastedNodes]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nodes, edges, setNodes, setEdges, takeSnapshot, undo, redo, canUndo, canRedo, clipboard]);

    return (
        <div className="flex h-full w-full">
            <SynergySidebar onAddNode={onAddNode} />
            <div 
                className="flex-1 h-full relative" 
                style={{ background: '#fafafa' }}
                onDrop={onDrop}
                onDragOver={onDragOver}
            >
            <EditorContext.Provider value={{
                onResizeStart: () => takeSnapshot(nodes, edges)
            }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChangeWithGrouping}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    onNodeClick={onNodeClick}
                    onNodeDragStart={onNodeDragStart} 
                    onNodesDelete={() => takeSnapshot(nodes, edges)}
                    onPaneClick={onPaneClick}
                    fitView
                >
                    <Background color="#f1f5f9" gap={16} />
                    <Controls />
                    <AutoLayoutButton onLayout={onLayout} />
                </ReactFlow>
            </EditorContext.Provider>
            {selectedElement && (
                <PropertiesPanel 
                    selectedElement={selectedElement} 
                    onChange={handlePropertyChange} 
                />
            )}
            </div>
        </div>
    );
};
