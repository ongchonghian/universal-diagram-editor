import { useCallback, useState } from 'react';

/**
 * Custom hook for managing Undo/Redo history.
 * Maintains past and future stacks of { nodes, edges }.
 */
export const useUndoRedo = () => {
    // History stacks
    const [past, setPast] = useState([]);
    const [future, setFuture] = useState([]);

    /**
     * Captures the current state into the past stack.
     * Call this BEFORE making a change that you want to be undoable.
     * @param {Array} nodes 
     * @param {Array} edges 
     */
    const takeSnapshot = useCallback((nodes, edges) => {
        // Deep copy to ensure we store value, not reference
        const nodesCopy = JSON.parse(JSON.stringify(nodes));
        const edgesCopy = JSON.parse(JSON.stringify(edges));
        
        setPast((prev) => [...prev, { nodes: nodesCopy, edges: edgesCopy }]);
        setFuture([]); // Clear future history whenever a new action occurs
    }, []);

    /**
     * Reverts to the last state in the past stack.
     */
    const undo = useCallback(({ nodes, edges, setNodes, setEdges }) => {
        setPast((prevPast) => {
            if (prevPast.length === 0) return prevPast;

            const previousState = prevPast[prevPast.length - 1]; // State to restore
            const newPast = prevPast.slice(0, prevPast.length - 1);
            
            // Push CURRENT state to future before undoing
            // We use the passed-in current nodes/edges
            const currentState = { 
                nodes: JSON.parse(JSON.stringify(nodes)), 
                edges: JSON.parse(JSON.stringify(edges)) 
            };
            
            setFuture((prevFuture) => [...prevFuture, currentState]);
            
            // Apply the previous state
            setNodes(previousState.nodes);
            setEdges(previousState.edges);
            
            return newPast;
        });
    }, []);

    /**
     * Advances to the next state in the future stack.
     */
    const redo = useCallback(({ nodes, edges, setNodes, setEdges }) => {
        setFuture((prevFuture) => {
            if (prevFuture.length === 0) return prevFuture;

            const nextState = prevFuture[prevFuture.length - 1]; // State to restore
            const newFuture = prevFuture.slice(0, prevFuture.length - 1);
            
            // Push CURRENT state to past before redoing
            const currentState = { 
                nodes: JSON.parse(JSON.stringify(nodes)), 
                edges: JSON.parse(JSON.stringify(edges)) 
            };
            
            setPast((prevPast) => [...prevPast, currentState]);
            
            // Apply the next state
            setNodes(nextState.nodes);
            setEdges(nextState.edges);
            
            return newFuture;
        });
    }, []);

    return {
        past,
        future,
        takeSnapshot,
        undo,
        redo,
        canUndo: past.length > 0,
        canRedo: future.length > 0
    };
};
