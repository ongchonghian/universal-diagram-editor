/**
 * Language Detector
 * Robustly identifies the diagram language and specific model based on content.
 */

export const LANGUAGES = {
    PLANTUML: 'plantuml',
    MERMAID: 'mermaid',
    BPMN: 'bpmn',
    UNKNOWN: 'unknown'
};

export class LanguageDetector {
    /**
     * Detect language from code content
     * @param {string} code 
     * @returns {string} One of LANGUAGES constants
     */
    static detectLanguage(code) {
        if (!code || typeof code !== 'string') return LANGUAGES.UNKNOWN;
        const trimmed = code.trim();

        // 1. BPMN (XML)
        if (trimmed.startsWith('<?xml') || trimmed.includes('<bpmn:definitions') || trimmed.includes('<definitions')) {
            return LANGUAGES.BPMN;
        }

        // 2. PlantUML (@start...)
        // Check for any @start directive
        if (/@start[a-z]+/i.test(trimmed)) {
            return LANGUAGES.PLANTUML;
        }

        // 3. Mermaid
        // Mermaid typically starts with a keyword (flowchart, graph, sequenceDiagram, etc.)
        // We look for the first non-empty line that isn't a comment
        const firstLine = this.getFirstSignificantLine(trimmed);
        if (this.isMermaidKeyword(firstLine)) {
            return LANGUAGES.MERMAID;
        }

        // Fallback checks for mermaid if header is missing but syntax looks like mermaid
        if (this.heuristicallyIsMermaid(trimmed)) {
            return LANGUAGES.MERMAID;
        }

        return LANGUAGES.UNKNOWN;
    }

    static getFirstSignificantLine(code) {
        const lines = code.split('\n');
        for (const line of lines) {
            const t = line.trim();
            if (t && !t.startsWith('%%') && !t.startsWith('//') && !t.startsWith('#')) {
                return t;
            }
        }
        return '';
    }

    static isMermaidKeyword(line) {
        const keywords = [
            'flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 
            'stateDiagram-v2', 'erDiagram', 'journey', 'gantt', 'gitGraph', 'timeline', 
            'mindmap', 'quadrantChart', 'sankey-beta', 'sankey', 'xychart-beta', 'pie',
            'requirementDiagram', 'c4Context', 'c4Container', 'c4Component', 'c4Dynamic', 'c4Deployment'
        ];
        
        // Check if line starts with any keyword (ignoring case)
        const firstToken = line.split(/\s+/)[0].toLowerCase();
        return keywords.some(k => k.toLowerCase() === firstToken);
    }

    static heuristicallyIsMermaid(code) {
        // e.g. check for arrow syntax common in mermaid graphs
        if (code.includes('-->') || code.includes('---') || code.includes('-.-')) return true;
        return false;
    }
}
