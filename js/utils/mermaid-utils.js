/**
 * Utility functions for parsing various Mermaid diagram types.
 */

import { parseGantt } from './gantt-utils.js';

/**
 * Parses Mermaid Journey code.
 * @param {string} code - The Mermaid Journey code.
 * @returns {Array} - Array of objects representing journey steps.
 */
export const parseJourney = (code) => {
    if (!code) return [];
    
    const lines = code.split('\n');
    const items = [];
    let currentSection = '';
    
    // Regex for journey steps: Task name: Score: Actors
    // Example: Make tea: 5: Me
    // Example with comma in actors: Do work: 1: Me, Cat
    const stepRegex = /^\s*(.+?)\s*:\s*(\d)\s*:\s*(.+)$/;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('journey') || trimmed.startsWith('title')) continue;
        
        if (trimmed.startsWith('section')) {
            currentSection = trimmed.replace('section', '').trim();
            continue;
        }
        
        const match = stepRegex.exec(line);
        if (match) {
            items.push({
                type: 'journey',
                section: currentSection,
                task: match[1].trim(),
                score: match[2].trim(),
                actors: match[3].trim(),
            });
        }
    }
    
    return items;
};

/**
 * Parses Mermaid Pie chart code.
 * @param {string} code - The Mermaid Pie chart code.
 * @returns {Array} - Array of objects representing pie slices.
 */
export const parsePie = (code) => {
    if (!code) return [];
    
    const items = [];
    
    // Regex for pie slices: "Label" : Value
    // Example: "Dogs" : 386
    const sliceRegex = /^\s*"([^"]+)"\s*:\s*([\d.]+)/;
    
    const lines = code.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('pie') || trimmed.startsWith('title')) continue;
        
        const match = sliceRegex.exec(line);
        if (match) {
            items.push({
                type: 'pie',
                label: match[1].trim(),
                value: parseFloat(match[2]),
                // We'll calculate percentage properly if we have the full total, 
                // but let's do a post-pass or just store raw values for now.
            });
        }
    }
    
    // Calculate percentages
    const total = items.reduce((sum, item) => sum + item.value, 0);
    items.forEach(item => {
        item.percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) + '%' : '0%';
        item.total = total;
    });
    
    return items;
};

/**
 * Parses Mermaid Timeline code.
 * @param {string} code 
 * @returns {Array} 
 */
export const parseTimeline = (code) => {
    if (!code) return [];
    const lines = code.split('\n');
    const items = [];
    let currentSection = ''; // Period logic in timeline is section-like

    // Timeline syntax is loose. 
    // timeline
    //   title ...
    //   section Period 1
    //     Event 1 : ...
    //     Event 2 : ...
    
    // Or just:
    //   Period 1 : Event 1 : Event 2
    
    // We will look for simple colon separated values or indentation
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('timeline') || trimmed.startsWith('title')) continue;
        
        if (trimmed.startsWith('section')) {
            currentSection = trimmed.replace('section', '').trim();
            continue;
        }

        // Try to capture "Event : Description" or just "Event"
        // Also handling "Period : Event" style if no explicit section
        // Ideally we just want to match the text that appears on screen.
        
        const parts = trimmed.split(':');
        if (parts.length > 0) {
            // If strictly mapping to on-screen elements, usually specific parts are rendered.
            // For now, let's treat every substantial part as a potential target.
            parts.forEach(p => {
                const partTrimmed = p.trim();
                if (partTrimmed) {
                    items.push({
                        type: 'timeline',
                        section: currentSection,
                        event: partTrimmed
                    });
                }
            });
        }
    }
    return items;
};

/**
 * Parses Mermaid Mindmap code.
 */
export const parseMindmap = (code) => {
    if (!code) return [];
    const lines = code.split('\n');
    const items = [];
    
    // Mindmap is indentation based or shape based (root((Root)))
    // We want the text inside the shape.
    
    for (const line of lines) {
        let trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('mindmap')) continue;
        
        // Remove shape punctuation roughly: (), [], (()), [[]], etc.
        // Or just matching the label text if explicit
        // e.g. root((Mindmap Root)) -> Mindmap Root
        
        // Regex to extract content inside paired brackets/parens/etc or just raw text
        // (([\w\s]+)) or similar.
        // Let's just strip standard mermaid shape markers at start/end
        
        let label = trimmed;
        // Simple heuristic strip
        label = label.replace(/^[:\s]*[\(\[\{\)\}\]]+/, '').replace(/[\(\[\{\)\}\]]+$/, '').trim();
        
        if (label) {
             items.push({
                type: 'mindmap',
                label: label
            });
        }
    }
    return items;
};

/**
 * Parses Mermaid Flowchart code.
 */
export const parseFlowchart = (code) => {
    if (!code) return [];
    const lines = code.split('\n');
    const items = [];
    
    // Matches: ID[Label] or ID(Label) or ID{Label} etc.
    // Also matches just ID if no label
    const nodeRegex = /([a-zA-Z0-9_]+)\s*([\[\(\{\>]+)(.*?)([\]\)\}\>]+)/;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('graph') || trimmed.startsWith('flowchart')) continue;

        // Start from left of relationships to catch nodes?
        // e.g. A[Start] --> B{Decide}
        // We can split by connection arrows first?
        
        // Let's just look for regex matches in the line.
        let match;
        // Global search implementation manually or capture well-known patterns
        // We can do a global match on the whole code or line by line
        
        const nodes = trimmed.split(/\s*[-=.>]{2,}\s*/); // Split by arrows
        nodes.forEach(part => {
             const nodeMatch = part.match(nodeRegex);
             if (nodeMatch) {
                 items.push({
                     type: 'flowchart',
                     id: nodeMatch[1],
                     label: nodeMatch[3].trim(),
                     shape: 'Node' // Could infer from brackets
                 });
             } else {
                 // Just an ID?
                 const cleanID = part.replace(/[\[\(\{\}\)\]]/g, '').trim();
                 if (cleanID && !cleanID.includes('|')) { // Filter out edge labels with pipes
                     items.push({
                         type: 'flowchart',
                         id: cleanID,
                         label: cleanID,
                         shape: 'Node'
                     });
                 }
             }
        });
    }
    return items;
};

/**
 * Parses Mermaid Sequence code.
 */
export const parseSequence = (code) => {
    if (!code) return [];
    const lines = code.split('\n');
    const items = [];
    
    // Participants: participant A or actor A or participant A as Alice
    const participantRegex = /^(participant|actor)\s+([^\s]+)(\s+as\s+(.+))?$/i;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('sequenceDiagram')) continue;
        
        const match = trimmed.match(participantRegex);
        if (match) {
            items.push({
                type: 'sequence',
                subtype: 'participant',
                id: match[2],
                label: match[4] || match[2],
                actorType: match[1] // participant or actor
            });
        }
    }
    // Note: Sequence messages are harder to map to tooltips without precise coordinate info from mermaid
    return items;
};

/**
 * Parses Mermaid Class Diagram code.
 */
export const parseClass = (code) => {
    if (!code) return [];
    const lines = code.split('\n');
    const items = [];
    
    // class Animal { ... }
    // class Animal
    
    let currentClass = null;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('classDiagram')) continue;
        
        if (trimmed.startsWith('class ')) {
             const parts = trimmed.split(' ');
             const className = parts[1];
             if (className) {
                 const name = className.replace('{', '').trim();
                 items.push({
                     type: 'class',
                     name: name,
                     members: []
                 });
                 currentClass = name;
             }
        } else if (currentClass && trimmed !== '}') {
             // Attribute or method
             // This assumes we are inside brackets block
             // Crude check, but OK for MVP
             const classObj = items.find(i => i.name === currentClass);
             if (classObj) {
                 classObj.members.push(trimmed);
             }
        }
    }
    return items;
};

/**
 * Parses Mermaid State code.
 */
export const parseState = (code) => {
    if (!code) return [];
    const lines = code.split('\n');
    const items = [];
    
    // state "Some Description" as StateName
    // StateName : Description
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('stateDiagram')) continue;
        
        if (trimmed.includes(':')) {
            const parts = trimmed.split(':');
            const state = parts[0].trim();
            const desc = parts[1].trim();
            if (state && desc) {
                items.push({
                    type: 'state',
                    name: state,
                    description: desc
                });
            }
        }
    }
    return items;
};

/**
 * Parses Mermaid ER code.
 */
export const parseER = (code) => {
    if (!code) return [];
    const lines = code.split('\n');
    const items = [];
    
    // EntityName { ... }
    // Entity1 rel Entity2 : label
    
    // Set to avoid duplicates
    const foundEntities = new Set();
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('erDiagram')) continue;
        
        // Detect entity definition: Name {
        // Support hyphens in name
        const defMatch = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*\{/);
        if (defMatch) {
             const name = defMatch[1];
             if (!foundEntities.has(name)) {
                 items.push({
                     type: 'er',
                     name: name,
                     attributes: []
                 });
                 foundEntities.add(name);
             }
        } else {
            // Detect Relationship: Name1 ... Name2
            // Looks for typical relationship connectors: |o--o|, }|..|{, etc.
            // Simplified: Word [symbols] Word
            const relMatch = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*[\}\|o\.]+[-.]+[\}\|o\.]+\s*([a-zA-Z0-9_\-]+)/);
            if (relMatch) {
                const ent1 = relMatch[1];
                const ent2 = relMatch[2];
                
                [ent1, ent2].forEach(name => {
                    if (!foundEntities.has(name)) {
                        items.push({
                            type: 'er',
                            name: name,
                            attributes: [] // No attributes from relationship lines
                        });
                        foundEntities.add(name);
                    }
                });
            }
        }
    }
    return items;
};


/**
 * Main dispatcher to parse Mermaid code based on type.
 * @param {string} code - The Mermaid code.
 * @param {string} type - The detected diagram type (lower case).
 * @returns {Array} - Array of parsed objects.
 */
export const parseMermaid = (code, type) => {
    if (!code || !type) return [];
    
    const lowerType = type.toLowerCase();
    const lowerCode = code.toLowerCase();
    
    // Heuristic detection if type is generic or checking content
    
    if (lowerType.includes('gantt') || lowerCode.startsWith('gantt')) {
        return parseGantt(code).map(t => ({ ...t, type: 'gantt' }));
    }
    
    if (lowerType.includes('journey') || lowerCode.startsWith('journey')) {
        return parseJourney(code);
    }
    
    if (lowerType.includes('pie') || lowerCode.startsWith('pie')) {
        return parsePie(code);
    }
    
    if (lowerType.includes('timeline') || lowerCode.startsWith('timeline')) {
        return parseTimeline(code);
    }
    
    if (lowerType.includes('mindmap') || lowerCode.startsWith('mindmap')) {
        return parseMindmap(code);
    }
    
    if (lowerType.includes('flowchart') || lowerCode.startsWith('graph') || lowerCode.startsWith('flowchart')) {
        return parseFlowchart(code);
    }
    
    if (lowerType.includes('sequence') || lowerCode.startsWith('sequencediagram')) {
        return parseSequence(code);
    }
    
    if (lowerType.includes('class') || lowerCode.startsWith('classdiagram')) {
        return parseClass(code);
    }
    
    if (lowerType.includes('state') || lowerCode.startsWith('statediagram')) {
        return parseState(code);
    }
    
    if (lowerType.includes('er') || lowerCode.startsWith('erdiagram')) {
        return parseER(code);
    }
    
    return [];
};

export { parseGantt };
