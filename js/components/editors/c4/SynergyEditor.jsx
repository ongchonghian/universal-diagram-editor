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
  useOnSelectionChange,
  getViewportForBounds,
  getNodesBounds
} from '@xyflow/react';
import { toPng } from 'html-to-image';
import '@xyflow/react/dist/style.css';

// Synergy Codes Imports
import { 
    NodePanel, 
    NodeIcon, 
    NodeDescription,
    Snackbar
} from '@synergycodes/overflow-ui';
import './synergy-lib.css'; // Local copy
import '@synergycodes/overflow-ui/tokens.css'; // Correct export path

// Using FontAwesome for icons as placeholders
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faUser, faDatabase, faLayerGroup, faCode, faLink, faCheckCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

// Hooks and Components
import { PropertiesPanel } from './PropertiesPanel.jsx';
import { useUndoRedo } from './useUndoRedo.js';
import { SynergySidebar } from './SynergySidebar.jsx';
import useAutoLayout from './useAutoLayout.js';
import { EditorToolbar } from '../common/EditorToolbar.jsx';

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

export const SynergyC4Editor = ({ initialNodes = defaultNodes, initialEdges = defaultEdges, onChange }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedElement, setSelectedElement] = useState(null);
    const { screenToFlowPosition, getIntersectingNodes } = useReactFlow();
    const [clipboard, setClipboard] = useState([]); // Clipboard for Copy/Paste
    const [snackbar, setSnackbar] = useState({ open: false, title: '', subtitle: '', variant: 'success' }); // Snackbar State
    
    // Sync up changes to parent
    useEffect(() => {
        if (onChange) {
            onChange({ nodes, edges });
        }
    }, [nodes, edges, onChange]);
    
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



    // Group Highlighting Logic
    // Group Highlighting Logic
    useOnSelectionChange({
        onChange: ({ nodes: selectedNodes }) => {
            const activeGroupIds = new Set();
            
            selectedNodes.forEach(node => {
                activeGroupIds.add(node.id);
                if (node.parentId) activeGroupIds.add(node.parentId);
            });

            setNodes((nds) => nds.map((n) => {
                const belongsToActiveGroup = 
                    activeGroupIds.has(n.id) || 
                    (n.parentId && activeGroupIds.has(n.parentId));

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
        [setEdges, nodes, edges, takeSnapshot]
    );

    // Helper: Calculate intersection area
    const getIntersectionArea = (rect1, rect2) => {
        const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
        const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
        return xOverlap * yOverlap;
    };



    // Helper to check if a node is a descendant of another
    const isDescendant = (parent, childId) => {
        if (!parent.parentId) return false;
        if (parent.parentId === childId) return true;
        const grandParent = nodes.find(n => n.id === parent.parentId);
        if (!grandParent) return false;
        return isDescendant(grandParent, childId);
    };

    const onNodeDrag = useCallback((event, node) => {
        // Helper to get absolute position
        const getAbsolutePosition = (n) => {
            if (!n.parentId) return n.position;
            const parent = nodes.find(p => p.id === n.parentId);
            if (!parent) return n.position;
            const parentPos = getAbsolutePosition(parent);
            return {
                x: n.position.x + parentPos.x,
                y: n.position.y + parentPos.y
            };
        };

        const nodeAbsPos = getAbsolutePosition(node);
        const nodeWidth = node.measured?.width || node.width || 150;
        const nodeHeight = node.measured?.height || node.height || 80;
        
        const nodeBounds = {
            x: nodeAbsPos.x,
            y: nodeAbsPos.y,
            width: nodeWidth,
            height: nodeHeight
        };

        // 1. Highlight Potential Parents
        const potentialParents = nodes.filter(n => 
            (n.type === 'system' || n.type === 'container') && 
            n.id !== node.id &&
            n.id !== node.parentId &&
            !isDescendant(n, node.id) // Prevent cycling
        );

        let bestCandidate = null;
        let maxOverlap = 0;
        const nodeArea = nodeBounds.width * nodeBounds.height;

        potentialParents.forEach(parent => {
            // Basic hierarchy check
            const isValidParent = (node.type === 'container' && parent.type === 'system') ||
                                  (node.type === 'component' && parent.type === 'container') ||
                                  (node.type === 'database' && (parent.type === 'container' || parent.type === 'system'));

            if (!isValidParent) return;

            // Parent is usually top-level or child of another. We need its absolute bounds too.
            const parentAbsPos = getAbsolutePosition(parent);
            const parentWidth = parent.measured?.width || parent.width || 150;
            const parentHeight = parent.measured?.height || parent.height || 80;

            const parentBounds = {
                x: parentAbsPos.x,
                y: parentAbsPos.y,
                width: parentWidth,
                height: parentHeight
            };

            const intersection = getIntersectionArea(nodeBounds, parentBounds);
            // DEBUG LOGGING
            if (intersection > 0) {
                 console.log(`Checking overlap: ${node.id} vs ${parent.id}`, {
                     intersection,
                     nodeArea,
                     threshold: nodeArea * 0.5,
                     ratio: intersection / nodeArea
                 });
            }

            if (intersection > (nodeArea * 0.5) && intersection > maxOverlap) {
                maxOverlap = intersection;
                bestCandidate = parent;
            }
        });

        // Update Highlighting ONLY if changed
        const currentHighlighted = nodes.find(n => n.data.isGroupHighlighted);
        const shouldUpdateHighlight = 
            (bestCandidate && (!currentHighlighted || currentHighlighted.id !== bestCandidate.id)) ||
            (!bestCandidate && currentHighlighted);

        if (shouldUpdateHighlight) {
            setNodes((nds) => nds.map((n) => {
                // Do NOT touch the dragged node's position manually; let onNodesChange handle it.
                // We only need to update highlighting on OTHER nodes.
                
                if (bestCandidate && n.id === bestCandidate.id) {
                    return { ...n, data: { ...n.data, isGroupHighlighted: true } };
                }
                if (n.data.isGroupHighlighted) { 
                    return { ...n, data: { ...n.data, isGroupHighlighted: false } };
                }
                return n;
            }));
        }

        // 2. Auto-Expand Logic (if node has parent)
        if (node.parentId) {
            const parent = nodes.find(n => n.id === node.parentId);
            if (parent) {
                 const padding = 40;
                 // Use style logic for resizing as that's what renders
                 const currentWidth = parent.style?.width ? parseInt(parent.style.width) : (parent.width || 150);
                 const currentHeight = parent.style?.height ? parseInt(parent.style.height) : (parent.height || 80);
                 
                 // Node position is RELATIVE to parent
                 const rightEdge = node.position.x + nodeWidth;
                 const bottomEdge = node.position.y + nodeHeight;

                 let newWidth = currentWidth;
                 let newHeight = currentHeight;
                 let changed = false;

                 if (rightEdge + padding > currentWidth) {
                     newWidth = rightEdge + padding;
                     changed = true;
                 }
                 if (bottomEdge + padding > currentHeight) {
                     newHeight = bottomEdge + padding;
                     changed = true;
                 }

                 if (changed) {
                     setNodes(nds => nds.map(n => {
                         if (n.id === parent.id) {
                             return {
                                 ...n,
                                 style: { ...n.style, width: newWidth, height: newHeight },
                                 width: newWidth,
                                 height: newHeight
                             };
                         }
                         return n;
                     }));
                 }
            }
        }

    }, [nodes, setNodes]);

    const onNodeDragStop = useCallback((event, node) => {
         // Helper to get absolute position
         const getAbsolutePosition = (n) => {
            if (!n.parentId) return n.position;
            const parent = nodes.find(p => p.id === n.parentId);
            if (!parent) return n.position;
            const parentPos = getAbsolutePosition(parent);
            return {
                x: n.position.x + parentPos.x,
                y: n.position.y + parentPos.y
            };
        };

         const highlightedParent = nodes.find(n => n.data.isGroupHighlighted);
         const nodeAbsPos = getAbsolutePosition(node);
         const nodeWidth = node.measured?.width || node.width || 150;
         const nodeHeight = node.measured?.height || node.height || 80;

         // CASE 1: Reparenting
         // CASE 1: Reparenting
         // CASE 1: Reparenting
         if (highlightedParent) {
             // 1. Final Cycle Check (Safety)
             if (isDescendant(highlightedParent, node.id)) {
                 console.warn("Attempted to group into descendant. Aborting.");
                  // Clear highlight
                  setNodes(nds => nds.map(n => {
                      if (n.id === highlightedParent.id) return { ...n, data: { ...n.data, isGroupHighlighted: false } };
                      return n;
                  }));
                 return;
             }

             takeSnapshot(nodes, edges);

             // 2. Safe Dimension Calculation
             // Ensure we fallback to reasonable defaults if 'measured' is missing
             const parentAbsPos = getAbsolutePosition(highlightedParent);
             const newRelX = nodeAbsPos.x - parentAbsPos.x;
             const newRelY = nodeAbsPos.y - parentAbsPos.y;

             console.log('[Synergy] Grouping Debug:', {
                 nodeId: node.id,
                 parentId: highlightedParent.id,
                 nodeAbsPos,
                 parentAbsPos,
                 newRelX,
                 newRelY,
                 nodeMeasured: node.measured
             });

             if (isNaN(newRelX) || isNaN(newRelY)) {
                 console.error('[Synergy] Invalid relative position calculated. Aborting group.');
                 return;
             }

             const safeNodeWidth = node.measured?.width || node.width || 150;
             const safeNodeHeight = node.measured?.height || node.height || 80;

             setNodes(nds => nds.map(n => {
                 if (n.id === node.id) {
                     // Cleanup old data
                     const { parentId: _, ...restData } = n.data;
                     return {
                         ...n,
                         position: { x: newRelX, y: newRelY },
                         parentId: highlightedParent.id,
                         extent: 'parent',
                         data: restData, 
                         zIndex: 10
                     };
                 }
                 if (n.id === highlightedParent.id) {
                     // Auto-expand logic
                     const currentWidth = n.measured?.width || n.width || 150;
                     const currentHeight = n.measured?.height || n.height || 80;

                     // Ensure defaults are numbers
                     const safeW = (typeof currentWidth === 'number' && !isNaN(currentWidth)) ? currentWidth : 150;
                     const safeH = (typeof currentHeight === 'number' && !isNaN(currentHeight)) ? currentHeight : 80;
                     
                     const paddingX = Math.max(40, safeNodeWidth * 0.1);
                     const paddingY = Math.max(40, safeNodeHeight * 0.1);

                     const rightEdge = newRelX + safeNodeWidth;
                     const bottomEdge = newRelY + safeNodeHeight;

                     let finalWidth = safeW;
                     let finalHeight = safeH;

                     if (rightEdge + paddingX > safeW) finalWidth = Math.ceil(rightEdge + paddingX);
                     if (bottomEdge + paddingY > safeH) finalHeight = Math.ceil(bottomEdge + paddingY);

                     if (isNaN(finalWidth) || isNaN(finalHeight)) {
                         console.error('[Synergy] Invalid final dimensions calculated:', { finalWidth, finalHeight });
                         return n; // Abort update for parent
                     }

                     return { 
                        ...n, 
                        style: { ...n.style, width: finalWidth, height: finalHeight },
                        width: finalWidth,
                        height: finalHeight,
                        data: { ...n.data, isGroupHighlighted: false } 
                     };
                 }
                 return n;
             }));
             
             setSnackbar({ open: true, title: 'Grouped', subtitle: `Moved to ${highlightedParent.data.label}`, variant: 'success' });
             return;
         }

         // CASE 2: Detaching
         if (node.parentId) {
             const parent = nodes.find(n => n.id === node.parentId);
             if (parent) {
                 const parentAbsPos = getAbsolutePosition(parent);
                 const parentWidth = parent.measured?.width || parent.width || 150;
                 const parentHeight = parent.measured?.height || parent.height || 80;

                 const nodeBounds = { x: nodeAbsPos.x, y: nodeAbsPos.y, width: nodeWidth, height: nodeHeight };
                 const parentBounds = { x: parentAbsPos.x, y: parentAbsPos.y, width: parentWidth, height: parentHeight };
                 
                 const intersection = getIntersectionArea(nodeBounds, parentBounds);
                 const nodeArea = nodeBounds.width * nodeBounds.height;
                 
                 // If overlaps less than 30% OR is completely outside
                 if (intersection < nodeArea * 0.3) {
                     takeSnapshot(nodes, edges);
                     
                     setNodes(nds => nds.map(n => {
                         if (n.id === node.id) {
                            const { parentId: _, ...restData } = n.data;
                            return {
                                ...n,
                                position: { x: nodeAbsPos.x, y: nodeAbsPos.y }, // Go absolute
                                parentId: undefined, // Native detach
                                extent: undefined,
                                data: restData,
                                zIndex: 0
                            };
                         }
                         return n;
                     }));
                     setSnackbar({ open: true, title: 'Detached', subtitle: 'Node is now independent', variant: 'success' });
                 }
             }
         }

    }, [nodes, edges, setNodes, takeSnapshot, setSnackbar]);

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
        setSnackbar({
            open: true,
            title: 'Layout Applied',
            subtitle: 'The diagram has been auto-arranged.',
            variant: 'success'
        });
    }, [nodes, edges, setNodes, setEdges, takeSnapshot, getLayoutedElements]);



    const handleDownloadImage = useCallback(() => {
        const flowElement = document.querySelector('.react-flow');
        if (!flowElement) return;

        const nodesBounds = getNodesBounds(nodes);
        const transform = getViewportForBounds(
            nodesBounds,
            nodesBounds.width,
            nodesBounds.height,
            0.5,
            10
        );

        toPng(flowElement, {
            backgroundColor: '#fff',
            width: nodesBounds.width,
            height: nodesBounds.height,
            style: {
                width: nodesBounds.width,
                height: nodesBounds.height,
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
            },
        }).then((dataUrl) => {
            const a = document.createElement('a');
            a.setAttribute('download', 'c4-diagram.png');
            a.setAttribute('href', dataUrl);
            a.click();
        });
    }, [nodes]);
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
                className="flex-1 h-full flex flex-col relative" 
                style={{ background: '#fafafa' }}
                onDrop={onDrop}
                onDragOver={onDragOver}
            >
            <EditorToolbar 
                title="C4 Editor" 
                subTitle="Synergy Mode"
                onAutoLayout={onLayout}
                actions={[
                    {
                        label: 'Export Image',
                        icon: 'fas fa-image',
                        onClick: handleDownloadImage,
                        title: 'Download current view as PNG'
                    }
                ]}
                className="border-b border-slate-200"
            />
            <div className="flex-1 relative w-full h-full">
            <EditorContext.Provider value={{
                onResizeStart: () => takeSnapshot(nodes, edges)
            }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    onNodeClick={onNodeClick}
                    onNodeDragStart={onNodeDragStart}
                    onNodeDrag={onNodeDrag}
                    onNodeDragStop={onNodeDragStop} 
                    onNodesDelete={() => takeSnapshot(nodes, edges)}
                    onPaneClick={onPaneClick}
                    fitView
                >
                    <Background color="#f1f5f9" gap={16} />
                    <Controls />

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
            {snackbar.open && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
                    <Snackbar 
                        variant={snackbar.variant} 
                        title={snackbar.title}
                        subtitle={snackbar.subtitle}
                        close={true}
                        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    />
                </div>
            )}
        </div>
    );
};
