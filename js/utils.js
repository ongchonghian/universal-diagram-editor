// Utility functions for Kroki Universal Diagram Generator
import { DIAGRAM_TYPES } from './config.js';
import pako from 'pako';

/**
 * Convert text string to Uint8Array bytes
 */
export const textToBytes = (text) => new TextEncoder().encode(text);

/**
 * Encode source code for Kroki URL using pako compression
 * @param {string} source - The diagram source code
 * @returns {string|null} - Base64 URL-safe encoded string or null on error
 */
export const encodeKroki = (source) => {
    if (!source || !source.trim()) return '';
    try {
        const data = textToBytes(source);
        const compressed = pako.deflate(data, { level: 9 });
        const len = compressed.byteLength;
        let binary = '';
        for (let i = 0; i < len; i++) binary += String.fromCharCode(compressed[i]);
        const base64 = btoa(binary);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (err) {
        console.error("Compression error:", err);
        return null;
    }
};

/**
 * Detect diagram type from file extension
 * @param {string} filename - The filename to check
 * @returns {string} - Detected diagram type key
 */
export const detectTypeFromExtension = (filename) => {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    for (const [key, config] of Object.entries(DIAGRAM_TYPES)) {
        if (config.extensions && config.extensions.includes(ext)) return key;
    }
    return 'bpmn';
};

/**
 * Detect diagram type from file content and filename
 * @param {string} filename - The filename
 * @param {string} content - The file content
 * @returns {string} - Detected diagram type key
 */
export const detectTypeFromContent = (filename, content) => {
    const extType = detectTypeFromExtension(filename);
    if (!content || !content.trim()) return extType;
    
    const trimmed = content.trim();
    
    // 1. Check for JSON based formats
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const json = JSON.parse(trimmed);
            
            // Excalidraw
            if (json.type === 'excalidraw') return 'excalidraw';
            
            // Vega-Lite
            if (json.$schema && json.$schema.includes('vega-lite')) return 'vegalite';
            
            // Vega
            if (json.$schema && json.$schema.includes('vega')) return 'vega';
            if (json.signals && json.scales && json.axes) return 'vega'; // Heuristic for Vega
            
            // Wavedrom (heuristic)
            if (json.signal || json.wave) return 'wavedrom';
            
            return extType;
        } catch (e) {
            // Not valid JSON, continue to text checks
        }
    }
    
    // 2. Check for Text/DSL formats
    
    // C4 JSON (Visual Editor)
    if (trimmed.startsWith('{') && trimmed.includes('"type":') && (trimmed.includes('"person"') || trimmed.includes('"system"'))) return 'c4';

    // LikeC4 (Legacy/DSL support if any)
    if (/^\s*specification\s*\{/m.test(trimmed) || /^\s*model\s*\{/m.test(trimmed)) return 'c4';
    
    // PlantUML
    if (/@startuml/m.test(trimmed) || /@startmindmap/m.test(trimmed) || /@startwbs/m.test(trimmed)) return 'plantuml';
    
    // Mermaid
    if (/^\s*classDiagram/m.test(trimmed) || 
        /^\s*sequenceDiagram/m.test(trimmed) || 
        /^\s*flowchart/m.test(trimmed) || 
        /^\s*graph\s/m.test(trimmed) ||
        /^\s*gantt/m.test(trimmed) ||
        /^\s*pie/m.test(trimmed) || 
        /^\s*stateDiagram/m.test(trimmed) ||
        /^\s*erDiagram/m.test(trimmed) ||
        /^\s*mindmap/m.test(trimmed) ||
        /^\s*timeline/m.test(trimmed) ||
        /^\s*journey/m.test(trimmed) ||
        /^\s*gitGraph/m.test(trimmed) ||
        /^\s*c4Context/m.test(trimmed)) {
        return 'mermaid';
    }
    
    // BPMN
    if (trimmed.includes('<bpmn:definitions') || trimmed.includes('<definitions')) return 'bpmn';

    // Ditaa
    if (/^\/--\+/m.test(trimmed) && /\|  \|/m.test(trimmed)) return 'ditaa';

    return extType;
};

/**
 * Detect specific diagram model/subtype from code content
 * @param {string} code - The diagram source code
 * @param {string} type - The main diagram type
 * @returns {string} - Specific model name
 */
export const detectSpecificModel = (code, type) => {
    if (!code || !code.trim()) return 'Empty';
    const cleanCode = code.trim();

    if (type === 'mermaid') {
        if (/^\s*sequenceDiagram/m.test(cleanCode)) return 'Sequence Diagram';
        if (/^\s*(graph|flowchart)\s+/m.test(cleanCode)) return 'Flowchart';
        if (/^\s*classDiagram/m.test(cleanCode)) return 'Class Diagram';
        if (/^\s*stateDiagram/m.test(cleanCode)) return 'State Diagram';
        if (/^\s*erDiagram/m.test(cleanCode)) return 'Entity Relationship';
        if (/^\s*gantt/m.test(cleanCode)) return 'Gantt Chart';
        if (/^\s*pie/m.test(cleanCode)) return 'Pie Chart';
        if (/^\s*timeline/m.test(cleanCode)) return 'Timeline';
        if (/^\s*mindmap/m.test(cleanCode)) return 'Mindmap';
        if (/^\s*journey/m.test(cleanCode)) return 'User Journey';
        if (/^\s*gitGraph/m.test(cleanCode)) return 'Git Graph';
        if (/^\s*quadrantChart/m.test(cleanCode)) return 'Quadrant Chart';
        if (/^\s*requirementDiagram/m.test(cleanCode)) return 'Requirement Diagram';
        if (/^\s*c4Context/m.test(cleanCode) || /^\s*c4Container/m.test(cleanCode) || /^\s*c4Component/m.test(cleanCode)) return 'C4 Diagram';
        if (/^\s*sankey-beta/m.test(cleanCode)) return 'Sankey Diagram';
        if (/^\s*xychart-beta/m.test(cleanCode)) return 'XY Chart';
        if (/^\s*block-beta/m.test(cleanCode)) return 'Block Diagram';
        if (/^\s*packet-beta/m.test(cleanCode)) return 'Packet Diagram';
        if (/^\s*kanban/m.test(cleanCode)) return 'Kanban Board';
        if (/^\s*architecture-beta/m.test(cleanCode)) return 'Architecture Diagram';
        return 'Mermaid Diagram';
    }

    if (type === 'c4') {
        // Check for JSON (Visual Editor)
        if (cleanCode.startsWith('{')) return 'C4 Model (Visual)';
        
        // Check for PlantUML C4
        if (/@startuml/m.test(cleanCode) || /!include.*C4/m.test(cleanCode)) return 'C4 Model (PlantUML)';
        
        return 'C4 Model';
    }

    if (type === 'plantuml') {
        if (/@startmindmap/m.test(cleanCode)) return 'Mindmap';
        if (/@startwbs/m.test(cleanCode)) return 'Work Breakdown Structure';
        if (/@startjson/m.test(cleanCode)) return 'JSON Data';
        if (/@startyaml/m.test(cleanCode)) return 'YAML Data';
        if (/@startgantt/m.test(cleanCode)) return 'Gantt Chart';
        
        if (/@startuml/m.test(cleanCode)) {
            // Timing Diagram
            if (/^(clock|binary|robust|concise)\s+/m.test(cleanCode)) return 'Timing Diagram';

            // Network Diagram (nwdiag within plantuml)
            if (/^nwdiag\s*\{/m.test(cleanCode)) return 'Network Diagram';

            // Deployment Diagram
            if (/^(node|cloud|database|artifact|folder|frame|component)\s+/m.test(cleanCode) || /^node\s+/m.test(cleanCode)) return 'Deployment Diagram';

            // State Diagram
            if (/^(\[\*\]|state\s+)/m.test(cleanCode)) return 'State Diagram';
            
            // Activity Diagram
            if (/^(start|stop|:|if\s*\()/m.test(cleanCode)) return 'Activity Diagram';
            
            // Component Diagram (component keyword also used in deployment, but primary use here)
            if (/^component\s+/m.test(cleanCode) && !/node|cloud/.test(cleanCode)) return 'Component Diagram';

            // Use Case Diagram
            if (/^(usecase|actor\s+[\w\s"]+as\s+[\w\s"]+$)/m.test(cleanCode) || /^\(/.test(cleanCode)) return 'Use Case Diagram';

            // Class Diagram
            if (/^(class|interface|enum|abstract)\s+/m.test(cleanCode) || /<\|--/.test(cleanCode)) return 'Class Diagram';
            
            // Sequence Diagram
            if (/^(participant|boundary|control|entity|database)\s+|->/.test(cleanCode)) return 'Sequence Diagram';
            
            return 'UML Diagram';
        }
    }

    if (type === 'bpmn') {
        if (/<(\w+:)?collaboration/i.test(cleanCode)) return 'Collaboration (Swimlanes)';
        if (/<(\w+:)?process/i.test(cleanCode)) return 'Process Flow';
        if (/<(\w+:)?definitions/i.test(cleanCode)) return 'BPMN Definition';
    }

    return DIAGRAM_TYPES[type]?.label || 'Diagram';
};

/**
 * Extract line number from error text
 * @param {string} errorText - Error message text
 * @returns {number|null} - Line number or null if not found
 */
export const extractErrorLine = (errorText) => {
    if (!errorText) return null;
    const patterns = [ /(?:line|row)\s*(\d+)/i, /:\s*(\d+)\s*:/, /error.*?(\d+):/i ];
    for (const pattern of patterns) {
        const match = errorText.match(pattern);
        if (match && match[1]) return parseInt(match[1], 10);
    }
    return null;
};

/**
 * Escape special regex characters in a string
 * @param {string} string - String to escape
 * @returns {string} - Escaped string safe for use in RegExp
 */
export const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Load external script with AMD compatibility handling
 * @param {string} src - Script URL
 * @returns {Promise} - Resolves when script is loaded
 */
export const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        
        // Temporarily remove AMD define to prevent conflicts
        let amdDefine = null;
        if (window.define && window.define.amd) {
            amdDefine = window.define;
            window.define = undefined;
        }
        
        script.onload = () => {
            if (amdDefine) window.define = amdDefine; 
            resolve();
        };
        
        script.onerror = (e) => {
            if (amdDefine) window.define = amdDefine; 
            reject(e);
        };
        
        document.head.appendChild(script);
    });
};

/**
 * Load external CSS file
 * @param {string} href - CSS URL
 */
export const loadCSS = (href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
};

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Check if BPMN content has DI information
 * @param {string} xml - BPMN XML content
 * @returns {boolean} - True if DI is present
 */
export const bpmnHasDI = (xml) => {
    return xml && (xml.includes('<bpmndi:BPMNDiagram') || xml.includes('<bpmndi:BPMNPlane'));
};

/**
 * Apply auto-layout to BPMN XML
 * @param {string} xml - BPMN XML content without DI
 * @returns {Promise<string>} - Layouted BPMN XML
 */
/**
 * Apply auto-layout to BPMN XML using bpmn-auto-layout
 * Supports Collaborations/Pools by layouting processes individually and stitching them together.
 * @param {string} xml - BPMN XML content without DI
 * @returns {Promise<string>} - Layouted BPMN XML
 */
export const applyBpmnAutoLayout = async (xml) => {
    try {
        const { layoutProcess } = await import('bpmn-auto-layout');
        // Dynamic import bpmn-moddle
        const BpmnModdleModule = await import('bpmn-moddle');
        const BpmnModdle = BpmnModdleModule.default || BpmnModdleModule;
        
        const moddle = new BpmnModdle();
        const { rootElement: definitions } = await moddle.fromXML(xml);
        
        // Check if there is a collaboration
        const collaboration = definitions.rootElements?.find(e => e.$type === 'bpmn:Collaboration');
        
        // If no collaboration or no participants, simple layout is enough
        if (!collaboration || !collaboration.participants || collaboration.participants.length === 0) {
            return await layoutProcess(xml);
        }

        // --- Advanced Layout for Collaboration ---
        
        // 1. Identify separate processes
        const participants = collaboration.participants;
        const processMap = new Map(); // processId -> { layoutXml, moddleContext }
        
        for (const participant of participants) {
            const processRef = participant.processRef;
            if (!processRef) continue;
            
            // Create a temporary definition for this process to layout it individually
            // We need to extract the process definition. 
            // processRef is already the object in moddle tree
           
            // Create a clean XML for just this process
            const tempDefinitions = moddle.create('bpmn:Definitions', {
                targetNamespace: definitions.targetNamespace,
                rootElements: [ processRef ]
            });
            
            // Serialize to XML
            const { xml: tempXml } = await moddle.toXML(tempDefinitions);
            
            // Layout this process
            try {
                const layoutedXml = await layoutProcess(tempXml);
                
                // Parse the layouted result to get the DI
                const subModdle = new BpmnModdle();
                const { rootElement: subDefs } = await subModdle.fromXML(layoutedXml);
                const subDiagram = subDefs.diagrams?.[0];
                const planeElement = subDiagram?.plane?.planeElement;
                
                if (planeElement) {
                    processMap.set(processRef.id, {
                        planeElement,
                        // Calculate bounds of this process
                        bounds: calculateBounds(planeElement)
                    });
                }
            } catch (e) {
                console.warn(`Failed to layout process ${processRef.id}`, e);
                // Continue without layout for this one?
            }
        }
        
        // 2. Clear existing diagrams if any
        definitions.diagrams = [];
        
        // 3. Create new DI container
        const newPlane = moddle.create('bpmndi:BPMNPlane', {
            bpmnElement: collaboration
        });
        const newDiagram = moddle.create('bpmndi:BPMNDiagram', {
            plane: newPlane
        });
        definitions.diagrams = [newDiagram];
        newPlane.planeElement = [];
        
        // 4. Arrange Pools (Stack vertically)
        const POOL_MARGIN = 50;
        const POOL_HEADER_WIDTH = 30; // Horizontal pool header? usually pools are horizontal, header on left.
        const POOL_PADDING = 30;
        
        let currentY = 0;
        const processShiftMap = new Map(); // processId -> { x, y }
        
        // We will layout pools vertically (Participants)
        for (const participant of participants) {
            const processId = participant.processRef?.id;
            const processLayout = processMap.get(processId);
            
            let poolWidth = 600; // Default min width
            let poolHeight = 200; // Default min height
            let childElements = [];
            
            if (processLayout) {
                const { bounds, planeElement } = processLayout;
                const pBounds = bounds;
                
                // Pool size wraps the process content
                const contentWidth = pBounds.maxX - pBounds.minX;
                const contentHeight = pBounds.maxY - pBounds.minY;
                
                poolWidth = Math.max(poolWidth, contentWidth + POOL_PADDING * 2 + POOL_HEADER_WIDTH);
                poolHeight = Math.max(poolHeight, contentHeight + POOL_PADDING * 2);
                
                // Calculate shift needed to place process inside pool (at currentY)
                // Process local coords usually start near 0,0 or whatever auto-layout did.
                // We want: Pool X = 0. Pool Y = currentY.
                // Content starts at Pool X + Header Width + Padding.
                // Shift X = (Pool X + Header + Padding) - MinX
                // Shift Y = (Pool Y + Padding) - MinY
                
                const shiftX = POOL_HEADER_WIDTH + POOL_PADDING - pBounds.minX;
                const shiftY = currentY + POOL_PADDING - pBounds.minY;
                
                processShiftMap.set(processId, { x: shiftX, y: shiftY });
                
                // Clone and shift elements
                childElements = getShiftedElements(moddle, planeElement, shiftX, shiftY, participant.processRef);
                
                // Update pool height/width if needed to fit everything? 
                // We already calculated based on bounding box, so strictly it fits.
            }
            
            // Create Pool Shape (Participant)
            const poolShape = moddle.create('bpmndi:BPMNShape', {
                bpmnElement: participant,
                isHorizontal: true,
                bounds: moddle.create('dc:Bounds', {
                    x: 0,
                    y: currentY,
                    width: poolWidth,
                    height: poolHeight
                })
            });
            
            newPlane.planeElement.push(poolShape);
            newPlane.planeElement.push(...childElements);
            
            currentY += poolHeight + POOL_MARGIN;
        }
        
        // 5. Handle Message Flows
        const messageFlows = collaboration.messageFlows || [];
        for (const flow of messageFlows) {
            // Simple straight line logic
            const sourceId = flow.sourceRef?.id;
            const targetId = flow.targetRef?.id;
            
            // We need to find the DI shapes for source and target
            // We search in newPlane.planeElement
            // Note: plain bpmnElement reference might be complex, we compare ID? 
            // moddle references are objects. flow.sourceRef is the semantic object.
            
            const sourceShape = newPlane.planeElement.find(e => e.bpmnElement === flow.sourceRef);
            const targetShape = newPlane.planeElement.find(e => e.bpmnElement === flow.targetRef);
            
            if (sourceShape && targetShape) {
                const p1 = getCenter(sourceShape.bounds);
                const p2 = getCenter(targetShape.bounds);
                
                // Create Edge
                const edge = moddle.create('bpmndi:BPMNEdge', {
                    bpmnElement: flow,
                    waypoint: [
                        moddle.create('dc:Point', { x: p1.x, y: p1.y }),
                        moddle.create('dc:Point', { x: p2.x, y: p2.y })
                    ]
                });
                newPlane.planeElement.push(edge);
            }
        }
        
        // Serialize final result
        const { xml: finalXml } = await moddle.toXML(definitions, { format: true });
        return finalXml;

    } catch (err) {
        console.error("Auto-layout error:", err);
        throw err;
    }
};

// --- Helpers ---

function calculateBounds(planeElements) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const el of planeElements) {
        if (el.bounds) {
            minX = Math.min(minX, el.bounds.x);
            minY = Math.min(minY, el.bounds.y);
            maxX = Math.max(maxX, el.bounds.x + el.bounds.width);
            maxY = Math.max(maxY, el.bounds.y + el.bounds.height);
        }
         // Edges? For now mainly nodes determine the "body" bounds.
         // If we have edges extending beyond nodes, we might clip them, but usually they are between nodes.
         // Let's include waypoints just in case.
         if (el.waypoint) {
             for (const p of el.waypoint) {
                 minX = Math.min(minX, p.x);
                 minY = Math.min(minY, p.y);
                 maxX = Math.max(maxX, p.x);
                 maxY = Math.max(maxY, p.y);
             }
         }
    }
    
    if (minX === Infinity) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    return { minX, minY, maxX, maxY };
}

function getCenter(bounds) {
    return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
    };
}

function getShiftedElements(moddle, planeElements, shiftX, shiftY, processRef) {
    const newElements = [];
    
    // We clone the DI elements to attach them to the new plane constraints
    // Also we need to ensure the semantic references (bpmnElement) point to the objects in our main 'definitions' tree.
    // Since 'processRef' was reused from the main tree, the IDs match.
    // However, when we did 'fromXML' on the 'subModdle', it created NEW semantic objects.
    // We must map them back to the original semantic objects in 'processRef'.
    
    // Create lookups
    const elementMap = new Map(); // id -> semantic element in processRef
    
    function indexElements(el) {
        if (el.id) elementMap.set(el.id, el);
        if (el.flowElements) el.flowElements.forEach(indexElements);
        if (el.laneSets) el.laneSets.forEach(ls => ls.lanes.forEach(indexElements));
    }
    indexElements(processRef);
    
    for (const el of planeElements) {
        // Find corresponding semantic element in original tree
        const originalSemantic = elementMap.get(el.bpmnElement?.id);
        if (!originalSemantic) continue; // Skip if connection to unknown?
        
        let newEl;
        
        if (el.$type === 'bpmndi:BPMNShape') {
             newEl = moddle.create('bpmndi:BPMNShape', {
                 bpmnElement: originalSemantic,
                 bounds: moddle.create('dc:Bounds', {
                     x: el.bounds.x + shiftX,
                     y: el.bounds.y + shiftY,
                     width: el.bounds.width,
                     height: el.bounds.height
                 }),
                 isMarkerVisible: el.isMarkerVisible
             });
        } else if (el.$type === 'bpmndi:BPMNEdge') {
             const points = el.waypoint.map(p => moddle.create('dc:Point', {
                 x: p.x + shiftX,
                 y: p.y + shiftY
             }));
             newEl = moddle.create('bpmndi:BPMNEdge', {
                 bpmnElement: originalSemantic,
                 waypoint: points
             });
             // Copy label bounds if any?
        }
        
        if (newEl) newElements.push(newEl);
    }
    
    return newElements;
}

/**
 * Check if BPMN content is valid
 * @param {string} text - Content to check
 * @returns {boolean} - True if valid BPMN
 */
export const isValidBpmnContent = (text) => {
    if (!text || typeof text !== 'string') return false;
    return text.includes('<bpmn:definitions') || text.includes('<definitions');
};

/**
 * Parse error info fallback
 */
export const parseErrorInfoFallback = (errorMessage, diagramType) => {
    // Default fallback parsing logic if ErrorDiagnostics is not available
    const line = extractErrorLine(errorMessage);
    return {
        line: line,
        message: errorMessage,
        shortMessage: errorMessage.split('\n')[0]
    };
};
