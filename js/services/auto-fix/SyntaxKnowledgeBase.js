
import syntaxData from './data/plantuml_syntax.json' with { type: "json" };

/**
 * SyntaxKnowledgeBase
 * Provides relevant syntax examples based on keywords or error context.
 */
export class SyntaxKnowledgeBase {
    constructor() {
        this.data = syntaxData;
    }

    /**
     * Find relevant examples based on keywords/context
     * @param {string[]} keywords - List of keywords to search for
     * @param {number} limit - Max number of examples to return
     * @returns {object[]} - List of syntax entries
     */
    getRelevantExamples(keywords, limit = 3) {
        if (!keywords || keywords.length === 0) return [];

        // Score entries based on keyword matches
        const scored = this.data.map(entry => {
            let score = 0;
            const entryText = (entry.topic + ' ' + entry.description).toLowerCase();
            const entryKeywords = new Set((entry.keywords || []).map(k => k.toLowerCase()));

            keywords.forEach(kw => {
                const lowerKw = kw.toLowerCase();
                if (entryText.includes(lowerKw)) score += 2; // Context match
                if (entryKeywords.has(lowerKw)) score += 5;   // Exact code keyword match
            });

            return { ...entry, score };
        });

        // Sort by score desc, then pick top N
        return scored
            .filter(e => e.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    
    /**
     * Extract potential keywords from an error message or code snippet
     * @param {string} text 
     */
    extractKeywords(text) {
        // Common PlantUML keywords of interest
        const INTERESTING_WORDS = [
            'timeline', 'gantt', 'mindmap', 'wbs', 'json', 'yaml', 
            'sequence', 'activity', 'component', 'class', 'object', 'state',
            'partition', 'group', 'package', 'namespace', 'rectangle',
            'note', 'start', 'stop', 'end', 'fork', 'split', 'if', 'else', 'while', 'repeat'
        ];
        
        const found = [];
        const lowerText = text.toLowerCase();
        
        INTERESTING_WORDS.forEach(word => {
            if (lowerText.includes(word)) found.push(word);
        });
        
        return found;
    }
}

export const syntaxKnowledgeBase = new SyntaxKnowledgeBase();
