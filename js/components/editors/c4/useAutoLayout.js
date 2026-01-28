import { useCallback } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { useReactFlow } from '@xyflow/react';

const elk = new ELK();

// Layout configuration
const elkOptions = {
    'elk.algorithm': 'layered',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    'elk.spacing.nodeNode': '80',
    'elk.direction': 'DOWN',
    // Hierarchical settings
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.padding': '[top=50,left=50,bottom=50,right=50]', // Padding inside containers
};

const useAutoLayout = () => {
    // Helper to build ELK graph from flat React Flow nodes
    const buildElkGraph = (nodes, edges) => {
        const elkNodes = [];
        const nodeMap = new Map();

        // 1. Create ELK nodes
        nodes.forEach((node) => {
            const elkNode = {
                id: node.id,
                width: node.width ?? 150, // Use actual width if measured, else default
                height: node.height ?? 80,
                labels: [{ text: node.data.label }],
                children: [],
                // Custom layout options for specific node types if needed
                layoutOptions: {
                    'elk.padding': '[top=60,left=30,bottom=30,right=30]', // Extra top padding for header
                }
            };
            nodeMap.set(node.id, elkNode);
        });

        // 2. Build Hierarchy
        const rootNodes = [];
        nodes.forEach((node) => {
            const elkNode = nodeMap.get(node.id);
            if (node.data.parentId) {
                const parent = nodeMap.get(node.data.parentId);
                if (parent) {
                    parent.children.push(elkNode);
                } else {
                    // Orphaned child (shouldn't happen in valid state)
                    rootNodes.push(elkNode);
                }
            } else {
                rootNodes.push(elkNode);
            }
        });

        // 3. Add Edges
        // ELK expects edges to be defined at the level of the Lowest Common Ancestor (LCA) usually,
        // or just globally for simple implementations. 
        // For simplicity, we'll assign edges to the root if they cross boundaries, 
        // or to the parent if both nodes are siblings.
        // Actually, 'elk.hierarchyHandling': 'INCLUDE_CHILDREN' handles edges somewhat automatically 
        // if we put them at the root or correctly nested.
        // Let's put all edges in the root graph for simplicity and see if ELK resolves them.
        
        const elkEdges = edges.map((edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
        }));

        return {
            id: 'root',
            layoutOptions: elkOptions,
            children: rootNodes,
            edges: elkEdges,
        };
    };

    const getLayoutedElements = useCallback(async (nodes, edges) => {
        const graph = buildElkGraph(nodes, edges);
        
        try {
            const layoutedGraph = await elk.layout(graph);
            
            // Flatten the result back to React Flow nodes
            const layoutedNodes = [];
            
            const processGraphNode = (graphNode, parentX = 0, parentY = 0) => {
                // We need to match back to original React Flow node to preserve data
                const originalNode = nodes.find(n => n.id === graphNode.id);
                
                if (originalNode && graphNode.id !== 'root') {
                    layoutedNodes.push({
                        ...originalNode,
                        position: {
                            // React Flow positions are relative to parent
                            // ELK positions are relative to parent as well.
                            // So we should just be able to use x/y directly.
                            x: graphNode.x,
                            y: graphNode.y,
                        },
                        // We might want to update width/height if ELK resized container?
                        // ELK resizes containers to fit children. We should adopt this size.
                        style: {
                            ...originalNode.style,
                            width: graphNode.width,
                            height: graphNode.height,
                        },
                        width: graphNode.width,
                        height: graphNode.height
                    });
                }

                if (graphNode.children) {
                    graphNode.children.forEach(child => processGraphNode(child));
                }
            };

            // Root itself isn't a node, so process its children
            if (layoutedGraph.children) {
                layoutedGraph.children.forEach(child => processGraphNode(child));
            }

            return { nodes: layoutedNodes, edges };

        } catch (error) {
            console.error('ELK Layout Error:', error);
            return { nodes, edges }; // Return original on error
        }
    }, []);

    return { getLayoutedElements };
};

export default useAutoLayout;
