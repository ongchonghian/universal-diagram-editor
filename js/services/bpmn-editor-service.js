/**
 * BPMN Editor Service
 * Implements fine-grained AST modification functions and orchestrates the editing loop.
 */

import { BPMN_ELEMENT_TYPES, validateElement, validateBpmn } from './bpmn-compiler.js';

// --- Helper Utilities ---

export function getAllIds(process) {
    const ids = [];
    for (const element of process) {
        ids.push(element.id);
        if (element.type === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY || element.type === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY) {
            for (const branch of element.branches) {
                ids.push(...getAllIds(branch.path));
            }
        } else if (element.type === BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY) {
            for (const branch of element.branches) {
                ids.push(...getAllIds(branch));
            }
        }
    }
    return ids;
}

function findPositionInProcess(process, targetId, after = false, path = []) {
    for (let index = 0; index < process.length; index++) {
        const element = process[index];
        const currentPath = [...path, index];
        
        if (element.id === targetId) {
            return {
                index: after ? index + 1 : index,
                path: path
            };
        }
        
        if (element.type === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY || element.type === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY) {
            for (let branchIndex = 0; branchIndex < element.branches.length; branchIndex++) {
                const branch = element.branches[branchIndex];
                const result = findPositionInProcess(
                    branch.path,
                    targetId,
                    after,
                    [...currentPath, "branches", branchIndex, "path"]
                );
                if (result) return result;
            }
        } else if (element.type === BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY) {
            for (let branchIndex = 0; branchIndex < element.branches.length; branchIndex++) {
                const branch = element.branches[branchIndex];
                const result = findPositionInProcess(
                    branch,
                    targetId,
                    after,
                    [...currentPath, "branches", branchIndex]
                );
                if (result) return result;
            }
        }
    }
    return null;
}

export function findPosition(process, beforeId = null, afterId = null) {
    const ids = getAllIds(process);
    
    if (beforeId === null && afterId === null) {
        throw new Error("Both beforeId and afterId cannot be null");
    }
    if (beforeId !== null && afterId !== null) {
        throw new Error("Only one of beforeId and afterId can be specified");
    }
    
    let position = null;
    if (beforeId !== null) {
        if (!ids.includes(beforeId)) {
            throw new Error(`Element with id ${beforeId} does not exist`);
        }
        position = findPositionInProcess(process, beforeId);
    } else if (afterId !== null) {
        if (!ids.includes(afterId)) {
            throw new Error(`Element with id ${afterId} does not exist`);
        }
        position = findPositionInProcess(process, afterId, true);
    }
    
    if (!position) {
        throw new Error("Element not found");
    }
    
    return position;
}

function findBranchByCondition(process, targetCondition, path = []) {
    for (let index = 0; index < process.length; index++) {
        const element = process[index];
        const currentPath = [...path, index];
        
        if (element.type === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY || element.type === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY) {
            for (let branchIndex = 0; branchIndex < element.branches.length; branchIndex++) {
                const branch = element.branches[branchIndex];
                if (branch.condition === targetCondition) {
                    return {
                        gatewayIndex: index,
                        branchIndex: branchIndex,
                        path: currentPath
                    };
                }
            }
            
            for (let branchIndex = 0; branchIndex < element.branches.length; branchIndex++) {
                const branch = element.branches[branchIndex];
                const result = findBranchByCondition(
                    branch.path,
                    targetCondition,
                    [...currentPath, "branches", branchIndex, "path"]
                );
                if (result) return result;
            }
        } else if (element.type === BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY) {
            for (let branchIndex = 0; branchIndex < element.branches.length; branchIndex++) {
                const branch = element.branches[branchIndex];
                const result = findBranchByCondition(
                    branch,
                    targetCondition,
                    [...currentPath, "branches", branchIndex]
                );
                if (result) return result;
            }
        }
    }
    return null;
}

export function findBranchPosition(process, condition) {
    const result = findBranchByCondition(process, condition);
    if (!result) {
        throw new Error(`Branch with condition '${condition}' does not exist`);
    }
    return {
        index: result.branchIndex,
        path: [...result.path, "branches"]
    };
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// --- Modification Functions ---

export function deleteElement(process, elementId) {
    const ids = getAllIds(process);
    if (!ids.includes(elementId)) {
        throw new Error(`Element with id ${elementId} does not exist`);
    }
    
    const processCopy = deepClone(process);
    const position = findPosition(processCopy, elementId);
    
    let current = processCopy;
    for (let i = 0; i < position.path.length - 1; i++) {
        current = current[position.path[i]];
    }
    
    let removedElement;
    const lastKey = position.path[position.path.length - 1];
    if (position.path.length > 0) {
        removedElement = current[lastKey].splice(position.index, 1)[0];
    } else {
        removedElement = current.splice(position.index, 1)[0];
    }
    
    return {
        process: processCopy,
        removedElement
    };
}

export function redirectBranch(process, branchCondition, nextId) {
    const position = findBranchPosition(process, branchCondition);
    const processCopy = deepClone(process);
    
    let current = processCopy;
    for (const p of position.path) {
        current = current[p];
    }
    
    const branch = current[position.index];
    branch.next = nextId;
    
    return {
        process: processCopy,
        redirectedBranch: branch
    };
}

export function addElement(process, element, beforeId = null, afterId = null) {
    const ids = getAllIds(process);
    if (ids.includes(element.id)) {
        throw new Error(`Element with id ${element.id} already exists`);
    }
    
    if (beforeId !== null && !ids.includes(beforeId)) {
        throw new Error(`Element with id ${beforeId} does not exist`);
    }
    if (afterId !== null && !ids.includes(afterId)) {
        throw new Error(`Element with id ${afterId} does not exist`);
    }
    if (beforeId !== null && afterId !== null) {
        throw new Error("Only one of beforeId and afterId can be specified");
    }
    if (beforeId === null && afterId === null) {
        throw new Error("At least one of beforeId and afterId must be specified");
    }
    
    const position = findPosition(process, beforeId, afterId);
    const processCopy = deepClone(process);
    
    let current = processCopy;
    for (let i = 0; i < position.path.length - 1; i++) {
        current = current[position.path[i]];
    }
    
    let targetList;
    const lastKey = position.path[position.path.length - 1];
    if (position.path.length > 0) {
        targetList = current[lastKey];
    } else {
        targetList = current;
    }
    
    targetList.splice(position.index, 0, element);
    
    return {
        process: processCopy,
        addedElement: element
    };
}

export function moveElement(process, elementId, beforeId = null, afterId = null) {
    const ids = getAllIds(process);
    if (!ids.includes(elementId)) {
        throw new Error(`Element with id ${elementId} does not exist`);
    }
    
    const { process: processDeleted, removedElement } = deleteElement(process, elementId);
    const { process: processAdded, addedElement } = addElement(processDeleted, removedElement, beforeId, afterId);
    
    return {
        process: processAdded,
        movedElement: addedElement
    };
}

export function updateElement(process, newElement) {
    const ids = getAllIds(process);
    if (!ids.includes(newElement.id)) {
        throw new Error(`Element with id ${newElement.id} does not exist`);
    }
    
    const position = findPosition(process, newElement.id);
    const processCopy = deepClone(process);
    
    let current = processCopy;
    for (let i = 0; i < position.path.length - 1; i++) {
        current = current[position.path[i]];
    }
    
    let targetList;
    const lastKey = position.path[position.path.length - 1];
    if (position.path.length > 0) {
        targetList = current[lastKey];
    } else {
        targetList = current;
    }
    
    targetList[position.index] = newElement;
    
    return {
        process: processCopy,
        updatedElement: newElement
    };
}

// --- Editing Service Class ---

export class BpmnEditingService {
    constructor(process) {
        this.process = process;
    }
    
    updateProcess(process, editProposal) {
        const editFunctions = {
            "delete_element": deleteElement,
            "redirect_branch": redirectBranch,
            "add_element": addElement,
            "move_element": moveElement,
            "update_element": updateElement
        };
        
        const funcToCall = editProposal.function;
        const args = editProposal.arguments;
        
        if (!editFunctions[funcToCall]) {
            throw new Error(`Function '${funcToCall}' not found.`);
        }
        
        const res = editFunctions[funcToCall](process, ...this._mapArgs(funcToCall, args));
        return res.process;
    }
    
    _mapArgs(funcName, args) {
        if (funcName === "delete_element") {
            return [args.element_id];
        }
        if (funcName === "redirect_branch") {
            return [args.branch_condition, args.next_id];
        }
        if (funcName === "add_element") {
            return [args.element, args.before_id || null, args.after_id || null];
        }
        if (funcName === "move_element") {
            return [args.element_id, args.before_id || null, args.after_id || null];
        }
        if (funcName === "update_element") {
            return [args.new_element];
        }
        return [];
    }
    
    validateEditProposal(editProposal, isFirstEdit = true) {
        if (!isFirstEdit && editProposal.stop) {
            if (Object.keys(editProposal).length > 1) {
                throw new Error("If 'stop' key is present, no other key should be provided.");
            }
            return;
        }
        
        if (!editProposal.function || !editProposal.arguments) {
            throw new Error("Function call should contain 'function' and 'arguments' keys.");
        }
        
        const func = editProposal.function;
        const args = editProposal.arguments;
        
        if (func === "delete_element") {
            if (!args.element_id) throw new Error("Arguments should contain 'element_id' key.");
        } else if (func === "redirect_branch") {
            if (!args.branch_condition || !args.next_id) throw new Error("Arguments should contain 'branch_condition' and 'next_id' keys.");
        } else if (func === "add_element") {
            if (!args.element) throw new Error("Arguments should contain 'element' key.");
            if (args.before_id && args.after_id) throw new Error("Only one of 'before_id' and 'after_id' should be provided.");
            if (!args.before_id && !args.after_id) throw new Error("Either 'before_id' or 'after_id' should be provided.");
            validateElement(args.element);
        } else if (func === "move_element") {
            if (!args.element_id) throw new Error("Arguments should contain 'element_id' key.");
            if (args.before_id && args.after_id) throw new Error("Only one of 'before_id' and 'after_id' should be provided.");
            if (!args.before_id && !args.after_id) throw new Error("Either 'before_id' or 'after_id' should be provided.");
        } else if (func === "update_element") {
            if (!args.new_element) throw new Error("Arguments should contain 'new_element' key.");
            validateElement(args.new_element);
        } else {
            throw new Error(`Function '${func}' is unsupported.`);
        }
    }
}
