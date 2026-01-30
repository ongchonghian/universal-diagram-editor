/**
 * Context detection for Monaco Editor cursor position
 * Determines the specific diagram type based on the cursor's location within the text.
 */
import { detectSpecificModel } from './utils.js';

/**
 * Get the context model at the current cursor position
 * @param {string} text - The full text content of the editor
 * @param {number} line - The current cursor line number (1-based)
 * @param {number} col - The current cursor column number (1-based)
 * @param {string} type - The general diagram type (plantuml, mermaid, c4, etc.)
 * @returns {object} - Context object { model: string, isInsideBlock: boolean }
 */
export const getCursorContext = (text, line, col, type) => {
    if (!text || !type) return { model: '', isInsideBlock: false };

    const lines = text.split('\n');
    const currentLineIndex = line - 1; // 0-based index

    // Default return for unknown types or empty text
    const defaultContext = { model: '', isInsideBlock: false };

    if (type === 'plantuml' || (type === 'c4' && text.includes('@startuml'))) {
        return getPlantUmlContext(lines, currentLineIndex);
    }
    
    if (type === 'mermaid') {
        return getMermaidContext(lines, currentLineIndex, text);
    }

    // Fallback context: just detect model globally if we can't be specific
    // treat the whole file as one block for other types for now
    return { 
        model: detectSpecificModel(text, type), 
        isInsideBlock: true 
    };
};

/**
 * PlantUML Context Detection
 * Finds the nearest @startuml/@enduml block surrounding the cursor
 */
const getPlantUmlContext = (lines, cursorLineIdx) => {
    let startLine = -1;
    let endLine = -1;

    // Search backwards for start directive
    for (let i = cursorLineIdx; i >= 0; i--) {
        const lineText = lines[i].trim();
        if (lineText.startsWith('@start')) {
            startLine = i;
            break;
        }
        if (lineText.startsWith('@end') && i !== cursorLineIdx) {
            // Found an end block before a start block (scanning backwards), 
            // implies we are outside the previous block or inside a nested one (unlikely for PlantUML top-level)
            // If we are strictly looking for the block WE ARE IN, encountering an @end means we are NOT in that block.
            // However, if we are ON the @end line, we are arguably "at the end of" the block.
            // Let's assume if we hit @end scanning up, we are not in the block defined by that @end.
            break; 
        }
    }

    if (startLine === -1) {
        // No start block found above cursor
        return { model: '', isInsideBlock: false };
    }

    // Check if we are physically inside the block (between start and end)
    // We found a start at startLine. Now look for its pair end.
    // Scan forwards from startLine
    for (let i = startLine; i < lines.length; i++) {
         const lineText = lines[i].trim();
         if (lineText.startsWith('@end')) {
             endLine = i;
             break;
         }
    }

    // If cursor is before startLine (impossible due to backward search loop starting at cursor)
    // If cursor is after endLine
    if (endLine !== -1 && cursorLineIdx > endLine) {
        return { model: '', isInsideBlock: false };
    }
    
    // We are inside (or on boundary of) a block
    // Extract block content to identify type
    const blockContent = lines.slice(startLine + 1, endLine !== -1 ? endLine : lines.length).join('\n');
    const startLineText = lines[startLine].trim();
    
    // Check specific start tags first
    if (startLineText.includes('@startmindmap')) return { model: 'Mindmap', isInsideBlock: true };
    if (startLineText.includes('@startwbs')) return { model: 'Work Breakdown Structure', isInsideBlock: true };
    if (startLineText.includes('@startgantt')) return { model: 'Gantt Chart', isInsideBlock: true };
    if (startLineText.includes('@startjson')) return { model: 'JSON Data', isInsideBlock: true };
    if (startLineText.includes('@startyaml')) return { model: 'YAML Data', isInsideBlock: true };
    
    // Analyze content for UML types
    const detected = detectSpecificModel(blockContent, 'plantuml');
    return { model: detected, isInsideBlock: true };
};

/**
 * Mermaid Context Detection
 * Mermaid often has single diagram per file, but can have frontmatter or multiple blocks.
 * For now, simpler logic: if we find a wrapper, fine. If not, treat whole file.
 * But wait, standard Mermaid file is just the diagram code.
 * If user mixes text, it might be different. 
 * Assuming standard usage, effectively 'always inside' unless empty.
 */
const getMermaidContext = (lines, cursorLineIdx, fullText) => {
    // Mermaid diagram types keywords
    const MERMAID_KEYWORDS = [
        'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 
        'erDiagram', 'gantt', 'pie', 'mindmap', 'timeline', 'journey', 'gitGraph',
        'quadrantChart', 'requirementDiagram', 'c4Context', 'c4Container', 
        'c4Component', 'sankey-beta', 'xychart-beta', 'block-beta', 'packet-beta', 
        'kanban', 'architecture-beta'
    ];
    
    // Search backwards for start of diagram
    for (let i = cursorLineIdx; i >= 0; i--) {
        const line = lines[i].trim();
        // Skip comments
        if (line.startsWith('%%')) continue;
        
        for (const kw of MERMAID_KEYWORDS) {
             // Check start of line matches keyword (exact match or followed by space/newline implied by startswith)
             // e.g. "graph TD" -> startsWith("graph") is true.
             // "graphical" -> startsWith("graph") is true. Risk?
             // Add check for boundary.
             if (line.startsWith(kw)) {
                 const charAfter = line[kw.length];
                 if (!charAfter || /\s/.test(charAfter) || /[({[]/.test(charAfter)) {
                     // likely a hit
                     // specific model detection for this block
                     const relevantText = lines.slice(i).join('\n');
                     return { 
                         model: detectSpecificModel(relevantText, 'mermaid'), 
                         isInsideBlock: true 
                     };
                 }
             }
        }
    }
    
    return { model: '', isInsideBlock: false };
};
