import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import { PersonNode, SystemNode, ContainerNode, ComponentNode, DatabaseNode } from './CustomNodes.jsx';
import FloatingEdge from './FloatingEdge.jsx';
import FloatingConnectionLine from './FloatingConnectionLine.jsx';
import { Sidebar } from './Sidebar.jsx';
import { PropertiesPanel } from './PropertiesPanel.jsx';
import { SynergyC4Editor } from './SynergyEditor';
import { EditorToolbar } from '../common/EditorToolbar.jsx';

const nodeTypes = {
  person: PersonNode,
  system: SystemNode,
  container: ContainerNode,
  component: ComponentNode,
  database: DatabaseNode,
};

const edgeTypes = {
  floating: FloatingEdge,
};

const defaultEdgeOptions = {
    type: 'floating',
    markerEnd: {
        type: MarkerType.ArrowClosed,
    },
    style: { strokeWidth: 2, stroke: '#94a3b8' },
};

import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: node.measured?.width || 150, height: node.measured?.height || 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - (node.measured?.width || 150) / 2,
        y: nodeWithPosition.y - (node.measured?.height || 100) / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

const C4Flow = ({ initialNodes, initialEdges, onChange }) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || []);
  const [selectedElement, setSelectedElement] = useState(null);
  const { screenToFlowPosition, getNodes, getIntersectingNodes } = useReactFlow();

  // Sync internal state with prop changes if needed (optional, simplistic for now)
  // Real sync is hard, so we assume this editor owns the state once loaded.

  useEffect(() => {
    // Notify parent of changes
    // Debounce this in a real app
    if (onChange) {
        onChange({ nodes, edges });
    }
  }, [nodes, edges, onChange]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'floating', markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  const onAddNode = useCallback((type, label) => {
    // Add node to center of view
    // Position can be calculated via useReactFlow().getView() or project()
    // For simplicity, we just check screen center or random
    const newId = uuidv4();
    const newNode = {
      id: newId,
      type,
      position: { x: 250, y: 50 + (nodes.length * 20) }, // Staggered slightly
      data: { label: label, description: '', technology: '' },
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedElement(newNode);
  }, [nodes, setNodes]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    console.log('onDragOver');
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      console.log('onDrop triggered', event.clientX, event.clientY);

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/reactflow-label');
      
      console.log('Drop type:', type, 'Label:', label);

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        console.warn('Invalid drop type');
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: uuidv4(),
        type,
        position,
        data: { label: label, description: '', technology: '' },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedElement(newNode); // Auto-select new node
    },
    [screenToFlowPosition, setNodes],
  );

  // Helper to update parent size to fit children
  const updateParentSize = useCallback((parentId, nodes) => {
      if (!parentId) return nodes;

      const parent = nodes.find(n => n.id === parentId);
      if (!parent) return nodes;

      const children = nodes.filter(n => n.parentNode === parentId);
      if (children.length === 0) return nodes;

      // Calculate bounding box of children (relative to parent)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      children.forEach(child => {
          if (child.position.x < minX) minX = child.position.x;
          if (child.position.y < minY) minY = child.position.y;
          // Use measured dimensions if available, else defaults
          const width = child.measured?.width || child.width || 150;
          const height = child.measured?.height || child.height || 100;
          
          if (child.position.x + width > maxX) maxX = child.position.x + width;
          if (child.position.y + height > maxY) maxY = child.position.y + height;
      });

      // Add padding
      const padding = 20;
      const newWidth = Math.max(parent.style?.width || 200, maxX + padding);
      const newHeight = Math.max(parent.style?.height || 200, maxY + padding);

      // Only update if changed significantly
      if (newWidth !== parent.style?.width || newHeight !== parent.style?.height) {
          return nodes.map(n => {
              if (n.id === parentId) {
                  return {
                      ...n,
                      style: { ...n.style, width: newWidth, height: newHeight }
                  };
              }
              return n;
          });
      }
      return nodes;
  }, []);

  const onNodeDrag = useCallback((event, node) => {
      // Calculate intersections for visual feedback
      // We limit this to run not too often if performance is an issue, 
      // but interactions usually need to be snappy.
      
      const intersections = getIntersectingNodes(node).filter(
          (n) => (n.type === 'system' || n.type === 'container') && n.id !== node.id
      );

      setNodes((nds) => nds.map((n) => {
          const isTarget = intersections.some(i => i.id === n.id);
          // Only update if changes to avoid thrashing
          if (n.data.isDropTarget !== isTarget) {
              return { ...n, data: { ...n.data, isDropTarget: isTarget } };
          }
          return n;
      }));
  }, [getIntersectingNodes, setNodes]);

  const onNodeDragStop = useCallback(
      (event, node) => {
          // 1. Clear all highlight flags
          setNodes((nds) => nds.map(n => ({...n, data: {...n.data, isDropTarget: false}})));

          // 2. Check for intersections
          const intersections = getIntersectingNodes(node).filter(
            (n) => (n.type === 'system' || n.type === 'container') && n.id !== node.id
          );

          const parent = intersections[0];

          setNodes((nds) => {
             let nextNodes = [...nds];
             
             // Logic: Grouping
             if (parent) {
                const isChild = (node.type === 'container' && parent.type === 'system') ||
                                (node.type === 'component' && parent.type === 'container') || 
                                (node.type === 'database' && (parent.type === 'container' || parent.type === 'system'));
                
                if (isChild && node.parentNode !== parent.id) {
                    // Detach from old parent if exists (handled implicitly by re-parenting, 
                    // provided we correctly calculate relative pos)
                    
                    // Calculate relative position: Child Abs - Parent Abs
                    // Note: 'node.position' on drag stop is the *absolute* position if it was dragging
                    // (React Flow handles this weirdly depending on if it WAS a child before).
                    // Actually, if it WAS a child, position is relative to OLD parent.
                    // If it WAS loose, position is absolute.
                    
                    // We need actual absolute position of the dragging node.
                    // If it had a parent, we need to convert.
                    let childAbsX = node.position.x;
                    let childAbsY = node.position.y;
                    
                    if (node.parentNode) {
                        const oldParent = nds.find(n => n.id === node.parentNode);
                        if (oldParent) {
                             childAbsX += oldParent.position.x;
                             childAbsY += oldParent.position.y;
                        }
                    }

                    const relativeX = childAbsX - parent.position.x;
                    const relativeY = childAbsY - parent.position.y;
                    
                    nextNodes = nextNodes.map((n) => {
                        if (n.id === node.id) {
                            return { 
                                ...n, 
                                parentNode: parent.id, 
                                extent: 'parent', 
                                position: { x: relativeX, y: relativeY } 
                            };
                        }
                        return n;
                    });
                    
                    // Auto-resize the new parent
                    nextNodes = updateParentSize(parent.id, nextNodes);
                }
             } else if (node.parentNode) {
                // Logic: Detaching (dropped on empty canvas)
                const oldParent = nds.find(n => n.id === node.parentNode);
                if (oldParent) {
                     // Convert to absolute
                     const absoluteX = node.position.x + oldParent.position.x;
                     const absoluteY = node.position.y + oldParent.position.y;
                     
                     nextNodes = nextNodes.map(n => {
                         if (n.id === node.id) {
                             return { 
                                 ...n, 
                                 parentNode: undefined, 
                                 extent: undefined, 
                                 position: { x: absoluteX, y: absoluteY } 
                             };
                         }
                         return n;
                     });
                     
                     // Optional: Shrink old parent? (Maybe too complex for now, user might want to keep it big)
                }
             }
             
             // Also, if we just moved a child inside a parent (no reparenting), verify bounds?
             // If node.parentNode exists and didn't change, we might still want to grow the parent.
             if (node.parentNode && (!parent || parent.id === node.parentNode)) {
                 nextNodes = updateParentSize(node.parentNode, nextNodes);
             }

             return nextNodes;
          });
      },
      [getIntersectingNodes, setNodes, updateParentSize]
  );
  
  const onNodeDragStart = useCallback((event, node) => {
      // Optional: Visual feedback on start?
  }, []);

  const onLayout = useCallback(
    (direction) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction,
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges, setNodes, setEdges],
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedElement(node);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
      setSelectedElement(edge);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedElement(null);
  }, []);

  const handlePropertyChange = useCallback((id, newData) => {
      // Check if it's a node
      setNodes((nds) => nds.map((node) => {
        if (node.id === id) {
          // It's a node
           return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      }));

      // Check if it's an edge (edges store label at root level usually, or data)
      setEdges((eds) => eds.map((edge) => {
          if (edge.id === id) {
              return { ...edge, label: newData.label };
          }
          return edge;
      }));
      
      // Update selected element local state so UI reflects change immediately
      setSelectedElement((prev) => {
          if (prev && prev.id === id) {
             if (prev.source) { // Edge
                 return { ...prev, label: newData.label };
             } else { // Node
                 return { ...prev, data: { ...prev.data, ...newData } };
             }
          }
          return prev;
      });

  }, [setNodes, setEdges]);
  
  const handleDetach = useCallback(() => {
      if (selectedElement && selectedElement.parentNode) {
          // Find parent to calculate absolute pos
          const parent = nodes.find(n => n.id === selectedElement.parentNode);
          if (parent) {
             const absolutePos = {
                 x: parent.position.x + selectedElement.position.x,
                 y: parent.position.y + selectedElement.position.y
             };
             
             setNodes((nds) => nds.map(n => {
                 if (n.id === selectedElement.id) {
                     return { ...n, parentNode: undefined, extent: undefined, position: absolutePos };
                 }
                 return n;
             }));
             setSelectedElement(null); // Deselect to avoid stale state issues usually
          }
      }
  }, [selectedElement, nodes, setNodes]);

  // Handle deletion via backspace (standard ReactFlow) 
  // But we also need to clear selection if deleted
  const onNodesDelete = useCallback((deleted) => {
      if (selectedElement && deleted.find(n => n.id === selectedElement.id)) {
          setSelectedElement(null);
      }
  }, [selectedElement]);

  return (
    <div className="flex h-full w-full">
      <Sidebar />
      <div 
        className="flex-1 h-full flex flex-col relative" 
        ref={reactFlowWrapper}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <EditorToolbar 
            title="C4 Editor" 
            onAutoLayout={() => onLayout('TB')}
            className="border-b border-slate-200"
        />
        <div className="flex-1 relative h-full">

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionLineComponent={FloatingConnectionLine}
          onNodeClick={onNodeClick}
          onNodeDrag={onNodeDrag}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onNodesDelete={onNodesDelete}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
        >
          <Background color="#f1f5f9" gap={16} />
          <Controls />
        </ReactFlow>
        {selectedElement && (
            <PropertiesPanel 
                selectedElement={selectedElement} 
                onChange={handlePropertyChange} 
                onDetach={selectedElement.parentNode ? handleDetach : undefined}
            />
        )}
        </div>
      </div>
    </div>
  );
};

export const C4VisualEditor = (props) => {
  // Toggle for testing Synergy Codes PoC
  const useSynergy = true;

  if (useSynergy) {
      return (
          <ReactFlowProvider>
              <SynergyC4Editor {...props} />
          </ReactFlowProvider>
      );
  }

  return (
    <ReactFlowProvider>
      <C4Flow {...props} />
    </ReactFlowProvider>
  );
};
