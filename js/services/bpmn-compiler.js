/**
 * BPMN Compiler
 * Parses BPMN 2.0 XML into JSON tree AST and compiles JSON tree AST back to XML.
 * Ports the logic from bpmn-assistant's python-based generator and validator.
 */

export const BPMN_ELEMENT_TYPES = {
    TASK: "task",
    USER_TASK: "userTask",
    SERVICE_TASK: "serviceTask",
    SEND_TASK: "sendTask",
    RECEIVE_TASK: "receiveTask",
    BUSINESS_RULE_TASK: "businessRuleTask",
    MANUAL_TASK: "manualTask",
    SCRIPT_TASK: "scriptTask",
    EXCLUSIVE_GATEWAY: "exclusiveGateway",
    INCLUSIVE_GATEWAY: "inclusiveGateway",
    PARALLEL_GATEWAY: "parallelGateway",
    START_EVENT: "startEvent",
    END_EVENT: "endEvent",
    INTERMEDIATE_THROW_EVENT: "intermediateThrowEvent",
    INTERMEDIATE_CATCH_EVENT: "intermediateCatchEvent"
};

export const TASK_TYPES = new Set([
    BPMN_ELEMENT_TYPES.TASK,
    BPMN_ELEMENT_TYPES.USER_TASK,
    BPMN_ELEMENT_TYPES.SERVICE_TASK,
    BPMN_ELEMENT_TYPES.SEND_TASK,
    BPMN_ELEMENT_TYPES.RECEIVE_TASK,
    BPMN_ELEMENT_TYPES.BUSINESS_RULE_TASK,
    BPMN_ELEMENT_TYPES.MANUAL_TASK,
    BPMN_ELEMENT_TYPES.SCRIPT_TASK
]);

// --- AST Validator ---

export function validateElement(element) {
    if (!element || typeof element !== 'object') {
        throw new Error(`Element is not a valid object: ${JSON.stringify(element)}`);
    }
    if (!element.id) {
        throw new Error(`Element is missing an ID: ${JSON.stringify(element)}`);
    }
    if (!element.type) {
        throw new Error(`Element is missing a type: ${JSON.stringify(element)}`);
    }

    // Auto-initialize branches array for gateways if missing or null
    if (
        element.type === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY ||
        element.type === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY ||
        element.type === BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY
    ) {
        if (element.branches === undefined || element.branches === null) {
            element.branches = [];
        }
        // Normalize branches for exclusive/inclusive gateways to map label->condition and process->path if they exist, or convert array branches to objects
        if (
            (element.type === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY ||
             element.type === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY) &&
            Array.isArray(element.branches)
        ) {
            for (let k = 0; k < element.branches.length; k++) {
                let branch = element.branches[k];
                if (Array.isArray(branch)) {
                    // It's an array of elements directly. Convert to standard branch object.
                    element.branches[k] = {
                        condition: `Path ${k + 1}`,
                        path: branch
                    };
                } else if (branch && typeof branch === 'object') {
                    if (branch.label !== undefined && branch.condition === undefined) {
                        branch.condition = branch.label;
                    }
                    if (branch.process !== undefined && branch.path === undefined) {
                        branch.path = branch.process;
                    }
                }
            }
        }
        // Normalize parallel gateway branches (convert objects to arrays if provided)
        if (element.type === BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY && Array.isArray(element.branches)) {
            for (let k = 0; k < element.branches.length; k++) {
                const branch = element.branches[k];
                if (branch && typeof branch === 'object' && !Array.isArray(branch)) {
                    element.branches[k] = branch.path || branch.process || [];
                }
            }
        }
    }
    
    const supportedTypes = Object.values(BPMN_ELEMENT_TYPES);
    if (!supportedTypes.includes(element.type)) {
        throw new Error(`Unsupported element type: ${element.type}. Supported: ${supportedTypes.join(', ')}`);
    }
    
    if (TASK_TYPES.has(element.type)) {
        if (element.label === undefined || element.label === null) {
            throw new Error(`Task element is missing a label: ${JSON.stringify(element)}`);
        }
    } else if (element.type === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY) {
        if (!Array.isArray(element.branches)) {
            throw new Error(`Exclusive gateway is missing or has invalid 'branches' array: ${JSON.stringify(element)}`);
        }
        
        const branchPaths = [];
        for (const branch of element.branches) {
            if (branch.condition === undefined || !branch.path) {
                throw new Error(`Invalid branch in exclusive gateway: ${JSON.stringify(branch)}`);
            }
            if (!Array.isArray(branch.path)) {
                throw new Error(`Exclusive gateway branch 'path' must be an array: ${JSON.stringify(branch)}`);
            }
            branchPaths.push(branch.path);
        }
        
        if (branchPaths.length > 0 && branchPaths.every(path => path.length === 0)) {
            throw new Error("Exclusive gateway must have at least one branch with elements; all branch paths are empty.");
        }
    } else if (element.type === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY) {
        if (!Array.isArray(element.branches)) {
            throw new Error(`Inclusive gateway is missing or has invalid 'branches' array: ${JSON.stringify(element)}`);
        }
        for (const branch of element.branches) {
            if (!branch.path) {
                throw new Error(`Invalid branch in inclusive gateway (missing 'path'): ${JSON.stringify(branch)}`);
            }
            if (!branch.is_default && branch.condition === undefined) {
                throw new Error(`Invalid branch in inclusive gateway (non-default branch missing 'condition'): ${JSON.stringify(branch)}`);
            }
        }
    } else if (element.type === BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY) {
        if (!Array.isArray(element.branches)) {
            throw new Error(`Parallel gateway is missing or has invalid 'branches' array: ${JSON.stringify(element)}`);
        }
        for (const branch of element.branches) {
            if (!Array.isArray(branch)) {
                throw new Error(`Parallel gateway branch must be an array: ${JSON.stringify(branch)}`);
            }
        }
    }
}

export function validateBpmn(process, isTopLevel = true) {
    if (!Array.isArray(process)) {
        throw new Error("Process must be an array of elements");
    }
    
    const filteredProcess = process.filter(el => el && el.type !== 'sequenceFlow' && el.type !== 'bpmn:sequenceFlow');
    
    const seenIds = new Set();
    let startEventCount = 0;
    
    for (const element of filteredProcess) {
        validateElement(element);
        
        if (seenIds.has(element.id)) {
            throw new Error(`Duplicate element ID found: ${element.id}`);
        }
        seenIds.add(element.id);
        
        if (isTopLevel && element.type === BPMN_ELEMENT_TYPES.START_EVENT) {
            startEventCount++;
        }
        
        if (element.type === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY || element.type === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY) {
            for (const branch of element.branches) {
                validateBpmn(branch.path, false);
            }
        } else if (element.type === BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY) {
            for (const branch of element.branches) {
                validateBpmn(branch, false);
            }
        }
    }
    
    if (isTopLevel) {
        if (startEventCount !== 1) {
            throw new Error(`Process must contain exactly one start event, found ${startEventCount}`);
        }
        if (!processHasEndEvent(filteredProcess)) {
            throw new Error("Process must contain at least one end event");
        }
        
        // Ensure it transforms successfully
        const transformer = new BpmnProcessTransformer();
        transformer.transform(filteredProcess);
    }
}

function processHasEndEvent(process) {
    for (const element of process) {
        if (element.type === BPMN_ELEMENT_TYPES.END_EVENT) {
            return true;
        }
        if (element.type === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY || element.type === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY) {
            for (const branch of element.branches) {
                if (processHasEndEvent(branch.path)) return true;
            }
        } else if (element.type === BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY) {
            for (const branch of element.branches) {
                if (processHasEndEvent(branch)) return true;
            }
        }
    }
    return false;
}

// --- AST Transformer ---

export class BpmnProcessTransformer {
    transform(process, parentNextElementId = null) {
        const elements = [];
        const flows = [];
        
        function add_flow(sourceRef, targetRef, flowId = null, condition = null) {
            for (const flow of flows) {
                if (flow.sourceRef === sourceRef && flow.targetRef === targetRef) {
                    return;
                }
            }
            
            const id = flowId || `${sourceRef}-${targetRef}`;
            flows.push({
                id,
                sourceRef,
                targetRef,
                condition
            });
        }
        
        const self = this;
        
        function handle_exclusive_gateway(element, nextElementId = null) {
            let joinGatewayId = null;
            if (element.has_join) {
                joinGatewayId = `${element.id}-join`;
                elements.push({
                    id: joinGatewayId,
                    type: "exclusiveGateway",
                    label: null
                });
            }
            
            for (const branch of element.branches) {
                if (!branch.path || branch.path.length === 0) {
                    const targetRef = branch.next || joinGatewayId || nextElementId;
                    if (targetRef) {
                        add_flow(element.id, targetRef, null, branch.condition || null);
                    }
                    continue;
                }
                
                const branchNext = branch.next;
                let branchStructure;
                if (branchNext) {
                    branchStructure = self.transform(branch.path, branchNext);
                } else {
                    branchStructure = self.transform(branch.path, joinGatewayId || nextElementId);
                }
                
                elements.push(...branchStructure.elements);
                flows.push(...branchStructure.flows);
                
                const firstElement = branchStructure.elements[0];
                if (firstElement) {
                    add_flow(element.id, firstElement.id, null, branch.condition || null);
                }
            }
            return joinGatewayId;
        }
        
        function handle_inclusive_gateway(element, nextElementId = null) {
            let joinGatewayId = null;
            let defaultFlowId = null;
            if (element.has_join) {
                joinGatewayId = `${element.id}-join`;
                elements.push({
                    id: joinGatewayId,
                    type: "inclusiveGateway",
                    label: null
                });
            }
            
            for (const branch of element.branches) {
                const isDefault = branch.is_default || false;
                
                if (!branch.path || branch.path.length === 0) {
                    const targetRef = branch.next || joinGatewayId || nextElementId;
                    if (targetRef) {
                        const flowId = `${element.id}-${targetRef}`;
                        add_flow(element.id, targetRef, flowId, branch.condition || null);
                        if (isDefault) {
                            defaultFlowId = flowId;
                        }
                    }
                    continue;
                }
                
                const branchNext = branch.next;
                let branchStructure;
                if (branchNext) {
                    branchStructure = self.transform(branch.path, branchNext);
                } else {
                    branchStructure = self.transform(branch.path, joinGatewayId || nextElementId);
                }
                
                elements.push(...branchStructure.elements);
                flows.push(...branchStructure.flows);
                
                const firstElement = branchStructure.elements[0];
                if (firstElement) {
                    const flowId = `${element.id}-${firstElement.id}`;
                    add_flow(element.id, firstElement.id, flowId, branch.condition || null);
                    if (isDefault) {
                        defaultFlowId = flowId;
                    }
                }
            }
            
            if (defaultFlowId) {
                for (const elem of elements) {
                    if (elem.id === element.id) {
                        elem.default_flow = defaultFlowId;
                        break;
                    }
                }
            }
            return joinGatewayId;
        }
        
        function handle_parallel_gateway(element) {
            if (!element.branches || element.branches.length === 0) {
                return null;
            }
            const joinGatewayId = `${element.id}-join`;
            elements.push({
                id: joinGatewayId,
                type: "parallelGateway",
                label: null
            });
            
            for (const branch of element.branches) {
                const branchStructure = self.transform(branch, joinGatewayId);
                if (branchStructure.elements.length === 0) {
                    throw new Error(`Parallel gateway '${element.id}' cannot have an empty branch.`);
                }
                elements.push(...branchStructure.elements);
                flows.push(...branchStructure.flows);
                
                const firstElement = branchStructure.elements[0];
                add_flow(element.id, firstElement.id);
                
                const lastElement = branchStructure.elements[branchStructure.elements.length - 1];
                add_flow(lastElement.id, joinGatewayId);
            }
            
            return joinGatewayId;
        }
        
        for (let i = 0; i < process.length; i++) {
            const element = process[i];
            const nextElementId = (i < process.length - 1) ? process[i + 1].id : parentNextElementId;
            
            const transformedElement = {
                id: element.id,
                type: element.type,
                label: element.label || null
            };
            
            if (element.eventDefinition) {
                transformedElement.eventDefinition = element.eventDefinition;
            }
            
            elements.push(transformedElement);
            
            if (element.type === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY) {
                const joinGatewayId = handle_exclusive_gateway(element, nextElementId);
                if (joinGatewayId && nextElementId) {
                    add_flow(joinGatewayId, nextElementId);
                } else if (!joinGatewayId && nextElementId && element.branches.length === 0) {
                    add_flow(element.id, nextElementId);
                }
            } else if (element.type === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY) {
                const joinGatewayId = handle_inclusive_gateway(element, nextElementId);
                if (joinGatewayId && nextElementId) {
                    add_flow(joinGatewayId, nextElementId);
                } else if (!joinGatewayId && nextElementId && element.branches.length === 0) {
                    add_flow(element.id, nextElementId);
                }
            } else if (element.type === BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY) {
                const joinGatewayId = handle_parallel_gateway(element);
                if (joinGatewayId && nextElementId) {
                    add_flow(joinGatewayId, nextElementId);
                } else if (!joinGatewayId && nextElementId) {
                    add_flow(element.id, nextElementId);
                }
            } else if (nextElementId && element.type !== BPMN_ELEMENT_TYPES.END_EVENT) {
                add_flow(element.id, nextElementId);
            }
        }
        
        for (const element of elements) {
            element.incoming = flows.filter(f => f.targetRef === element.id).map(f => f.id);
            element.outgoing = flows.filter(f => f.sourceRef === element.id).map(f => f.id);
        }
        
        return { elements, flows };
    }
}

// --- AST Xml Generator ---

export class BpmnXmlGenerator {
    constructor() {
        this.transformer = new BpmnProcessTransformer();
    }
    
    create_bpmn_xml(process) {
        const transformed = this.transformer.transform(process);
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" `;
        xml += `xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" `;
        xml += `xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" `;
        xml += `xmlns:di="http://www.omg.org/spec/DD/20100524/DI" `;
        xml += `id="definitions_1" `;
        xml += `targetNamespace="http://bpmn.io/schema/bpmn">\n`;
        
        xml += `  <bpmn:process id="Process_1" isExecutable="false">\n`;
        
        // Add elements
        for (const element of transformed.elements) {
            const tagName = `bpmn:${element.type}`;
            const labelAttr = element.label ? ` name="${this.escapeXml(element.label)}"` : '';
            const defaultAttr = element.default_flow ? ` default="${element.default_flow}"` : '';
            
            xml += `    <${tagName} id="${element.id}"${labelAttr}${defaultAttr}>\n`;
            
            for (const inc of element.incoming) {
                xml += `      <bpmn:incoming>${inc}</bpmn:incoming>\n`;
            }
            for (const out of element.outgoing) {
                xml += `      <bpmn:outgoing>${out}</bpmn:outgoing>\n`;
            }
            
            if (element.eventDefinition) {
                xml += `      <bpmn:${element.eventDefinition} id="${element.eventDefinition}_${element.id}" />\n`;
            }
            
            xml += `    </${tagName}>\n`;
        }
        
        // Add flows
        for (const flow of transformed.flows) {
            const nameAttr = flow.condition ? ` name="${this.escapeXml(flow.condition)}"` : '';
            xml += `    <bpmn:sequenceFlow id="${flow.id}" sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}"${nameAttr} />\n`;
        }
        
        xml += `  </bpmn:process>\n`;
        xml += `</bpmn:definitions>`;
        
        return xml;
    }
    
    escapeXml(unsafe) {
        return unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    }
}

// --- XML to AST JSON Parser (Decompiler) ---

export class BpmnJsonGenerator {
    constructor() {
        this.elements = {};
        this.flows = {};
        this.process = [];
    }
    
    _find_process_element(root) {
        let processElem = root.querySelector('process') || root.querySelector('bpmn\\:process');
        if (processElem) return processElem;
        
        const queue = [root];
        while (queue.length > 0) {
            const current = queue.shift();
            if (current.localName === 'process') {
                return current;
            }
            for (let i = 0; i < current.children.length; i++) {
                queue.push(current.children[i]);
            }
        }
        throw new Error("No process element found in the BPMN XML");
    }
    
    create_bpmn_json(bpmnXml) {
        this.elements = {};
        this.flows = {};
        this.process = [];
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(bpmnXml, "text/xml");
        
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
            throw new Error(`XML Parse Error: ${parserError.textContent}`);
        }
        
        const processElement = this._find_process_element(xmlDoc);
        this._get_elements_and_flows(processElement);
        
        const startEvents = Object.values(this.elements).filter(e => e.type === BPMN_ELEMENT_TYPES.START_EVENT);
        if (startEvents.length !== 1) {
            throw new Error("Process must contain exactly one start event");
        }
        
        this._build_process_structure();
        return this.process;
    }
    
    _build_process_structure() {
        const startEvent = Object.values(this.elements).find(e => e.type === BPMN_ELEMENT_TYPES.START_EVENT);
        this.process = this._build_structure_recursive(startEvent.id);
    }
    
    _build_structure_recursive(currentId, stopAt = null, visited = null) {
        if (!visited) {
            visited = new Set();
        }
        
        if (visited.has(currentId) || currentId === stopAt) {
            return [];
        }
        
        visited.add(currentId);
        
        const currentElement = this.elements[currentId];
        if (!currentElement) return [];
        
        const handler = this._get_gateway_handler(currentElement.type);
        if (handler) {
            return handler.call(this, currentId, stopAt, visited);
        }
        
        const result = [ { ...currentElement } ];
        const outgoingFlows = this._get_outgoing_flows(currentId);
        
        if (outgoingFlows.length === 1) {
            const nextId = outgoingFlows[0].target;
            result.push(...this._build_structure_recursive(nextId, stopAt, visited));
        }
        
        return result;
    }
    
    _build_exclusive_gateway(gatewayId, stopAt, visited) {
        const gateway = { ...this.elements[gatewayId] };
        gateway.branches = [];
        gateway.has_join = false;
        
        const outgoingFlows = this._get_outgoing_flows(gatewayId);
        const commonBranchEndpoint = this._find_common_branch_endpoint(gatewayId);
        let nextElement = null;
        
        if (commonBranchEndpoint && this._is_exclusive_gateway(commonBranchEndpoint) && this._get_outgoing_flows(commonBranchEndpoint).length === 1) {
            gateway.has_join = true;
            const joinOutgoingFlows = this._get_outgoing_flows(commonBranchEndpoint);
            if (joinOutgoingFlows.length !== 1) {
                throw new Error("Join gateway should have exactly one outgoing flow");
            }
            nextElement = joinOutgoingFlows[0].target;
        } else {
            nextElement = commonBranchEndpoint;
        }
        
        for (const flow of outgoingFlows) {
            const branchPath = this._build_structure_recursive(flow.target, commonBranchEndpoint, new Set(visited));
            const branch = this._build_eg_branch(branchPath, commonBranchEndpoint, flow);
            gateway.branches.push(branch);
        }
        
        const result = [gateway];
        if (nextElement) {
            result.push(...this._build_structure_recursive(nextElement, stopAt, visited));
        }
        return result;
    }
    
    _build_inclusive_gateway(gatewayId, stopAt, visited) {
        const gateway = { ...this.elements[gatewayId] };
        gateway.branches = [];
        gateway.has_join = false;
        
        const outgoingFlows = this._get_outgoing_flows(gatewayId);
        const commonBranchEndpoint = this._find_common_branch_endpoint(gatewayId);
        let nextElement = null;
        
        if (commonBranchEndpoint && this._is_inclusive_gateway(commonBranchEndpoint) && this._get_outgoing_flows(commonBranchEndpoint).length === 1) {
            gateway.has_join = true;
            const joinOutgoingFlows = this._get_outgoing_flows(commonBranchEndpoint);
            if (joinOutgoingFlows.length !== 1) {
                throw new Error("Join gateway should have exactly one outgoing flow");
            }
            nextElement = joinOutgoingFlows[0].target;
        } else {
            nextElement = commonBranchEndpoint;
        }
        
        const defaultFlowId = gateway.default_flow;
        
        for (const flow of outgoingFlows) {
            const branchPath = this._build_structure_recursive(flow.target, commonBranchEndpoint, new Set(visited));
            const branch = this._build_ig_branch(branchPath, commonBranchEndpoint, flow, defaultFlowId);
            gateway.branches.push(branch);
        }
        
        delete gateway.default_flow;
        
        const result = [gateway];
        if (nextElement) {
            result.push(...this._build_structure_recursive(nextElement, stopAt, visited));
        }
        return result;
    }
    
    _build_parallel_gateway(gatewayId, stopAt, visited) {
        const gateway = { ...this.elements[gatewayId] };
        gateway.branches = [];
        
        const outgoingFlows = this._get_outgoing_flows(gatewayId);
        const joinElement = this._find_common_branch_endpoint(gatewayId);
        
        if (!joinElement || !this._is_parallel_gateway(joinElement) || this._get_outgoing_flows(joinElement).length !== 1) {
            throw new Error("Parallel gateway must have a corresponding join gateway");
        }
        
        for (const flow of outgoingFlows) {
            const branch = this._build_structure_recursive(flow.target, joinElement, new Set(visited));
            gateway.branches.push(branch);
        }
        
        const result = [gateway];
        const joinOutgoingFlows = this._get_outgoing_flows(joinElement);
        const nextElement = joinOutgoingFlows[0].target;
        result.push(...this._build_structure_recursive(nextElement, stopAt, visited));
        return result;
    }
    
    _build_eg_branch(branchPath, commonBranchEndpoint, flow) {
        const branch = {
            condition: flow.condition,
            path: branchPath
        };
        this._populate_branch_transitions(branch, branchPath, flow, commonBranchEndpoint);
        return branch;
    }
    
    _build_ig_branch(branchPath, commonBranchEndpoint, flow, defaultFlowId) {
        const isDefault = flow.id === defaultFlowId;
        const branch = {
            path: branchPath,
            is_default: isDefault
        };
        if (!isDefault) {
            branch.condition = flow.condition;
        }
        this._populate_branch_transitions(branch, branchPath, flow, commonBranchEndpoint);
        return branch;
    }
    
    _populate_branch_transitions(branch, branchPath, flow, commonBranchEndpoint) {
        if (!branchPath || branchPath.length === 0) {
            if (flow.target !== commonBranchEndpoint) {
                branch.next = flow.target;
            }
            return;
        }
        
        const lastElement = branchPath[branchPath.length - 1];
        const lastOutgoingFlows = this._get_outgoing_flows(lastElement.id);
        
        if (lastElement.type === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY || lastElement.type === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY) {
            this._handle_nested_gateway_branch(branch, lastElement, lastOutgoingFlows, commonBranchEndpoint);
        } else if (lastElement.type === BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY) {
            const joinId = this._find_common_branch_endpoint(lastElement.id);
            if (joinId === null) {
                throw new Error("Parallel gateway should have a corresponding join gateway");
            }
            const joinOutgoingFlows = this._get_outgoing_flows(joinId);
            if (joinOutgoingFlows.length !== 1) {
                throw new Error("Join gateway should have one outgoing flow");
            }
            const joinTarget = joinOutgoingFlows[0].target;
            if (joinTarget !== commonBranchEndpoint) {
                branch.next = joinTarget;
            }
        } else if (lastOutgoingFlows.length === 1 && lastOutgoingFlows[0].target !== commonBranchEndpoint) {
            branch.next = lastOutgoingFlows[0].target;
        }
    }
    
    _handle_nested_gateway_branch(branch, lastElement, lastOutgoingFlows, commonBranchEndpoint) {
        if (!lastElement.has_join) {
            for (const subBranch of lastElement.branches) {
                const subFlow = this._get_flow_for_branch(lastElement.id, subBranch, lastOutgoingFlows);
                if (subFlow === null) {
                    throw new Error(`Unable to resolve sequence flow for branch originating from ${lastElement.id}`);
                }
                this._populate_branch_transitions(subBranch, subBranch.path || [], subFlow, commonBranchEndpoint);
            }
            return;
        }
        
        const joinId = this._find_common_branch_endpoint(lastElement.id);
        if (joinId === null) {
            const errorMessages = {
                [BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY]: "Exclusive gateway should have a corresponding join gateway",
                [BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY]: "Inclusive gateway should have a corresponding join gateway"
            };
            throw new Error(errorMessages[lastElement.type] || "Gateway should have a corresponding join gateway");
        }
        
        const joinOutgoingFlows = this._get_outgoing_flows(joinId);
        if (joinOutgoingFlows.length !== 1) {
            throw new Error("Join gateway should have one outgoing flow");
        }
        
        const joinTarget = joinOutgoingFlows[0].target;
        if (joinTarget !== commonBranchEndpoint) {
            branch.next = joinTarget;
        }
    }
    
    _get_flow_for_branch(gatewayId, branch, outgoingFlows = null) {
        const flows = outgoingFlows || this._get_outgoing_flows(gatewayId);
        const branchCondition = branch.condition;
        if (branchCondition !== undefined && branchCondition !== null) {
            for (const flow of flows) {
                if (flow.condition === branchCondition) {
                    return flow;
                }
            }
        }
        
        if (branch.is_default) {
            const defaultFlowId = this.elements[gatewayId].default_flow;
            if (defaultFlowId) {
                for (const flow of flows) {
                    if (flow.id === defaultFlowId) {
                        return flow;
                    }
                }
            }
        }
        
        const branchPath = branch.path || [];
        if (branchPath.length > 0) {
            const targetId = branchPath[0].id;
            for (const flow of flows) {
                if (flow.target === targetId) {
                    return flow;
                }
            }
        }
        
        if (flows.length === 1) {
            return flows[0];
        }
        
        return null;
    }
    
    _is_parallel_gateway(gatewayId) {
        return this.elements[gatewayId].type === BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY;
    }
    
    _is_exclusive_gateway(gatewayId) {
        return this.elements[gatewayId].type === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY;
    }
    
    _is_inclusive_gateway(gatewayId) {
        return this.elements[gatewayId].type === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY;
    }
    
    _get_outgoing_flows(elementId) {
        return Object.values(this.flows).filter(flow => flow.source === elementId);
    }
    
    _find_common_branch_endpoint(gatewayId) {
        const paths = this._trace_paths(gatewayId);
        if (paths.length === 0) return null;
        
        for (const elementId of paths[0]) {
            if (paths.slice(1).every(path => path.includes(elementId))) {
                return elementId;
            }
        }
        return null;
    }
    
    _trace_paths(gatewayId) {
        const paths = [];
        const queue = [ [gatewayId, [gatewayId], new Set([gatewayId])] ];
        
        while (queue.length > 0) {
            const [currentId, currentPath, visited] = queue.shift();
            const outgoingFlows = this._get_outgoing_flows(currentId);
            
            if (outgoingFlows.length === 0) {
                paths.push(currentPath);
                continue;
            }
            
            for (const flow of outgoingFlows) {
                const nextId = flow.target;
                if (!visited.has(nextId)) {
                    const newPath = [...currentPath, nextId];
                    const newVisited = new Set(visited);
                    newVisited.add(nextId);
                    queue.push([nextId, newPath, newVisited]);
                } else {
                    paths.push([...currentPath, nextId]);
                }
            }
        }
        
        return paths.map(path => path.slice(1));
    }
    
    _get_gateway_handler(elementType) {
        const handlers = {
            [BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY]: this._build_exclusive_gateway,
            [BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY]: this._build_inclusive_gateway,
            [BPMN_ELEMENT_TYPES.PARALLEL_GATEWAY]: this._build_parallel_gateway
        };
        return handlers[elementType];
    }
    
    _get_elements_and_flows(processElement) {
        const labeledElements = new Set([
            BPMN_ELEMENT_TYPES.TASK,
            BPMN_ELEMENT_TYPES.USER_TASK,
            BPMN_ELEMENT_TYPES.SERVICE_TASK,
            BPMN_ELEMENT_TYPES.SEND_TASK,
            BPMN_ELEMENT_TYPES.RECEIVE_TASK,
            BPMN_ELEMENT_TYPES.BUSINESS_RULE_TASK,
            BPMN_ELEMENT_TYPES.MANUAL_TASK,
            BPMN_ELEMENT_TYPES.SCRIPT_TASK,
            BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY,
            BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY,
            BPMN_ELEMENT_TYPES.START_EVENT,
            BPMN_ELEMENT_TYPES.END_EVENT,
            BPMN_ELEMENT_TYPES.INTERMEDIATE_THROW_EVENT,
            BPMN_ELEMENT_TYPES.INTERMEDIATE_CATCH_EVENT
        ]);
        
        const supportedTypes = new Set(Object.values(BPMN_ELEMENT_TYPES));
        
        const children = processElement.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const tag = child.localName;
            const elemId = child.getAttribute("id");
            
            if (supportedTypes.has(tag)) {
                this.elements[elemId] = {
                    type: tag,
                    id: elemId
                };
                
                if (labeledElements.has(tag)) {
                    const name = child.getAttribute("name");
                    if (name) {
                        this.elements[elemId].label = name;
                    }
                }
                
                if (tag === BPMN_ELEMENT_TYPES.INCLUSIVE_GATEWAY || tag === BPMN_ELEMENT_TYPES.EXCLUSIVE_GATEWAY) {
                    const defaultFlow = child.getAttribute("default");
                    if (defaultFlow) {
                        this.elements[elemId].default_flow = defaultFlow;
                    }
                }
                
                for (let j = 0; j < child.children.length; j++) {
                    const grandchild = child.children[j];
                    if (grandchild.localName.endsWith("EventDefinition")) {
                        this.elements[elemId].eventDefinition = grandchild.localName;
                        break;
                    }
                }
            } else if (tag === 'sequenceFlow') {
                this.flows[elemId] = {
                    id: elemId,
                    source: child.getAttribute("sourceRef"),
                    target: child.getAttribute("targetRef"),
                    condition: child.getAttribute("name") || null
                };
            }
        }
    }
}

// --- Unified Compiler Export ---

class BpmnCompiler {
    constructor() {
        this.generator = new BpmnJsonGenerator();
        this.xmlGenerator = new BpmnXmlGenerator();
    }
    
    validate(process) {
        validateBpmn(process, true);
    }
    
    compile(ast) {
        // Compile the tree JSON to semantic XML
        let process = Array.isArray(ast) ? ast : (ast.process || []);
        process = process.filter(el => el && el.type !== 'sequenceFlow' && el.type !== 'bpmn:sequenceFlow');
        this.validate(process);
        return this.xmlGenerator.create_bpmn_xml(process);
    }
    
    decompile(xml) {
        // Parse raw XML into tree JSON AST
        return this.generator.create_bpmn_json(xml);
    }
}

export const bpmnCompiler = new BpmnCompiler();
