// Fix Suggestion Database
// Common error patterns and their suggested fixes for diagram syntax

/**
 * Token to character mapping for Mermaid parser tokens
 */
const MERMAID_TOKEN_MAP = {
    'SQE': ']',      // Square bracket end
    'SQS': '[',      // Square bracket start
    'PE': ')',       // Parenthesis end
    'PS': '(',       // Parenthesis start
    'DIAMOND_STOP': '}',
    'DIAMOND_START': '{',
    'DOUBLECIRCLEEND': '))',
    'DOUBLECIRCLESTART': '((',
    'STADIUMEND': '])',
    'STADIUMSTART': '([',
    'SUBROUTINEEND': ']]',
    'SUBROUTINESTART': '[[',
    'CYLINDEREND': ')]',
    'CYLINDERSTART': '[(',
    'TAGEND': '>',
    'TAGSTART': '<',
    'TRAPEND': '\\]',
    'INVTRAPEND': '/]',
    'PIPE': '|',
};

/**
 * Fix patterns for different diagram types
 */
const FIX_PATTERNS = {
    mermaid: [
        // Missing diagram type declaration
        {
            pattern: /no diagram type detected|unknown\s+diagram\s+type|invalid\s+diagram|parse\s+error\s+on\s+line\s+1|missing\s+diagram\s+type\s+declaration/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add flowchart declaration',
                description: 'Mermaid diagrams need a type declaration on the first line',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: 'flowchart TD\n'
                }
            }, {
                title: 'Add sequence diagram declaration',
                description: 'Use sequenceDiagram for sequence diagrams',
                edit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: 'sequenceDiagram\n'
                }
            }, {
                title: 'Add class diagram declaration',
                description: 'Use classDiagram for class diagrams',
                edit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: 'classDiagram\n'
                }
            }]
        },
        // Subgraph not closed
        {
            pattern: /subgraph\s+not\s+closed|missing\s+end/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add "end" to close subgraph',
                description: 'Subgraphs must be closed with "end"',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: line + 1, startColumn: 1, endLineNumber: line + 1, endColumn: 1 },
                    text: 'end\n'
                }
            }]
        },
        // Invalid arrow syntax
        {
            pattern: /invalid\s+arrow|unknown\s+link\s+type/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Use --> for solid arrow',
                description: 'Standard arrow syntax in Mermaid',
                isPreferred: true,
                edit: null
            }, {
                title: 'Use -.-> for dotted arrow',
                description: 'Dotted arrow syntax in Mermaid',
                edit: null
            }, {
                title: 'Use ==> for thick arrow',
                description: 'Thick arrow syntax in Mermaid',
                edit: null
            }]
        }
    ],

    plantuml: [
        // Missing @startuml (detected by welcome message or explicit error)
        {
            pattern: /welcome to plantuml|missing\s+@startuml|no\s+@startuml|@startuml\s+expected/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add @startuml at beginning',
                description: 'PlantUML diagrams must start with @startuml',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: '@startuml\n'
                }
            }]
        },
        // Missing @enduml
        {
            pattern: /missing\s+@enduml|no\s+@enduml|@enduml\s+expected/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add @enduml at end',
                description: 'PlantUML diagrams must end with @enduml',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: 99999, startColumn: 1, endLineNumber: 99999, endColumn: 1 },
                    text: '\n@enduml'
                }
            }]
        },
        // Invalid arrow
        {
            pattern: /syntax\s+error.*?arrow|invalid.*?arrow|unknown.*?->/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Use -> for message arrow',
                description: 'Standard arrow for sequence diagrams',
                isPreferred: true,
                edit: null
            }, {
                title: 'Use --> for response arrow',
                description: 'Dashed arrow for return messages',
                edit: null
            }, {
                title: 'Use ->> for async message',
                description: 'Arrow with open head',
                edit: null
            }]
        },
        // Missing colon in message
        {
            pattern: /missing\s+colon|expected\s+:/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add colon before message',
                description: 'Messages need format: A -> B: message',
                isPreferred: true,
                edit: null
            }]
        }
    ],

    graphviz: [
        // Generic syntax error - suggest common fixes
        {
            pattern: /syntax\s+error/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add closing brace }',
                description: 'Close the graph definition with }',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: 99999, startColumn: 1, endLineNumber: 99999, endColumn: 1 },
                    text: '\n}'
                }
            }, {
                title: 'Add semicolon',
                description: 'Add semicolon at end of statement',
                edit: {
                    range: { startLineNumber: line, startColumn: 1000, endLineNumber: line, endColumn: 1000 },
                    text: ';'
                }
            }]
        },
        // Missing closing brace (specific pattern)
        {
            pattern: /syntax\s+error.*?near\s+['"]\}['"]|unclosed.*?brace/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add closing brace }',
                description: 'Close the graph definition',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: 99999, startColumn: 1, endLineNumber: 99999, endColumn: 1 },
                    text: '\n}'
                }
            }]
        },
        // Invalid graph type
        {
            pattern: /invalid\s+graph\s+type|expected\s+(di)?graph/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Use "digraph" for directed graph',
                description: 'Directed graphs use: digraph G { }',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: 'digraph G '
                }
            }, {
                title: 'Use "graph" for undirected graph',
                description: 'Undirected graphs use: graph G { }',
                edit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: 'graph G '
                }
            }]
        }
    ],

    erd: [
        // Missing bracket
        {
            pattern: /expecting\s+['"]\]['"]/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add closing bracket ]',
                description: 'Entity names must be in brackets [Entity]',
                isPreferred: true,
                edit: extracted?.column ? {
                    range: { 
                        startLineNumber: line, 
                        startColumn: extracted.column, 
                        endLineNumber: line, 
                        endColumn: extracted.column 
                    },
                    text: ']'
                } : {
                    range: { startLineNumber: line, startColumn: 1000, endLineNumber: line, endColumn: 1000 },
                    text: ']'
                }
            }]
        }
    ],

    nomnoml: [
        // Missing bracket - use precise column from extracted info
        {
            pattern: /expected\s+['"]\]['"]/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add closing bracket ]',
                description: 'Node definitions must be in brackets [Node]',
                isPreferred: true,
                edit: extracted?.column ? {
                    range: { 
                        startLineNumber: line, 
                        startColumn: extracted.column, 
                        endLineNumber: line, 
                        endColumn: extracted.column 
                    },
                    text: ']'
                } : {
                    range: { startLineNumber: line, startColumn: 1000, endLineNumber: line, endColumn: 1000 },
                    text: ']'
                }
            }]
        }
    ],

    bpmn: [
        // XML parsing errors
        {
            pattern: /xml\s+parsing\s+error|invalid\s+xml|not\s+well-formed/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Check XML syntax',
                description: 'Ensure all tags are properly closed and attributes are quoted',
                isPreferred: true,
                edit: null
            }]
        },
        // Unclosed tag
        {
            pattern: /unclosed\s+tag\s+['"]?(\w+)['"]?|missing\s+closing\s+tag/i,
            extract: (match) => ({ tag: match[1] }),
            getFix: (match, code, line, extracted) => {
                const tag = extracted?.tag || extracted?.near || 'element';
                return [{
                    title: `Add closing tag </${tag}>`,
                    description: 'XML tags must be closed',
                    isPreferred: true,
                    edit: {
                        range: { startLineNumber: line, startColumn: 1000, endLineNumber: line, endColumn: 1000 },
                        text: `</${tag}>`
                    }
                }];
            }
        }
    ],

    c4plantuml: [
        // Missing include
        {
            pattern: /unknown\s+function|!include.*?not\s+found/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add C4 include directive',
                description: 'C4 diagrams need library includes',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 },
                    text: '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml\n'
                }
            }]
        }
    ],
    
    // JSON-based diagrams (Vega, Vega-Lite, Excalidraw, Wavedrom)
    vega: [
        {
            pattern: /unexpected\s+token|expected\s+[,:\[\]{}]/i,
            getFix: (match, code, line, extracted) => {
                const fixes = [];
                if (/expected\s+[',]/i.test(match[0]) || /missing\s+comma/i.test(match[0])) {
                    fixes.push({
                        title: 'Add missing comma',
                        isPreferred: true,
                        edit: {
                            range: { startLineNumber: line, startColumn: extracted?.column || 1, endLineNumber: line, endColumn: extracted?.column || 1 },
                            text: ','
                        }
                    });
                }
                if (/expected\s+[':]/i.test(match[0]) || /missing\s+colon/i.test(match[0])) {
                    fixes.push({
                        title: 'Add missing colon',
                        isPreferred: fixes.length === 0,
                        edit: {
                            range: { startLineNumber: line, startColumn: extracted?.column || 1, endLineNumber: line, endColumn: extracted?.column || 1 },
                            text: ':'
                        }
                    });
                }
                return fixes;
            }
        },
        {
            pattern: /unexpected\s+end|unterminated/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add closing brace }',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: 99999, startColumn: 1, endLineNumber: 99999, endColumn: 1 },
                    text: '\n}'
                }
            }, {
                title: 'Add closing bracket ]',
                edit: {
                    range: { startLineNumber: 99999, startColumn: 1, endLineNumber: 99999, endColumn: 1 },
                    text: '\n]'
                }
            }]
        },
        {
            pattern: /missing\s+required\s+property\s+['"]?(\w+)['"]?/i,
            getFix: (match, code, line, extracted) => {
                const prop = match[1] || 'data';
                return [{
                    title: `Add "${prop}" property`,
                    description: `Add the required "${prop}" property`,
                    isPreferred: true,
                    edit: {
                        range: { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 },
                        text: `  "${prop}": {},\n`
                    }
                }];
            }
        }
    ],
    
    vegalite: [
        // Inherit vega patterns
    ],
    
    excalidraw: [
        {
            pattern: /unexpected\s+token|invalid\s+json/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Check JSON syntax',
                description: 'Excalidraw uses JSON format',
                isPreferred: true,
                edit: null
            }]
        }
    ],
    
    wavedrom: [
        {
            pattern: /unexpected\s+token|invalid\s+json/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add signal property',
                description: 'Wavedrom requires "signal" array',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: '{ "signal": [] }'
                }
            }]
        }
    ],
    
    // BlockDiag family
    blockdiag: [
        {
            pattern: /unexpected|syntax\s+error/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add blockdiag declaration',
                description: 'BlockDiag needs "blockdiag { }" wrapper',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: 'blockdiag {\n'
                }
            }, {
                title: 'Add closing brace',
                edit: {
                    range: { startLineNumber: 99999, startColumn: 1, endLineNumber: 99999, endColumn: 1 },
                    text: '\n}'
                }
            }]
        },
        {
            pattern: /unknown\s+node\s+['"]?(\w+)['"]?/i,
            getFix: (match, code, line, extracted) => {
                const nodeName = match[1] || 'node';
                return [{
                    title: `Define node "${nodeName}"`,
                    description: 'Add node definition',
                    isPreferred: true,
                    edit: {
                        range: { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 },
                        text: `  ${nodeName} [label = "${nodeName}"];\n`
                    }
                }];
            }
        },
        {
            pattern: /group.*not\s+closed/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Close group with }',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: line, startColumn: 1000, endLineNumber: line, endColumn: 1000 },
                    text: '\n  }'
                }
            }]
        }
    ],
    
    // Structurizr
    structurizr: [
        {
            pattern: /expected\s+['"]?workspace['"]?|workspace.*not\s+found/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add workspace declaration',
                description: 'Structurizr DSL requires workspace block',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: 'workspace {\n    model {\n    }\n    views {\n    }\n}\n'
                }
            }]
        },
        {
            pattern: /unknown\s+keyword\s+['"]?(\w+)['"]?/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Check Structurizr DSL syntax',
                description: 'Valid keywords: workspace, model, views, person, softwareSystem, container, component',
                isPreferred: true,
                edit: null
            }]
        },
        {
            pattern: /relationship.*not\s+found|source.*not\s+found/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Define referenced element first',
                description: 'Elements must be defined before referencing in relationships',
                isPreferred: true,
                edit: null
            }]
        }
    ],
    
    // Ditaa (ASCII art)
    ditaa: [
        {
            pattern: /unclosed\s+box|box.*not\s+closed/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Add closing box line',
                description: 'Ditaa boxes need closing with +---+',
                isPreferred: true,
                edit: {
                    range: { startLineNumber: line + 1, startColumn: 1, endLineNumber: line + 1, endColumn: 1 },
                    text: '+---+\n'
                }
            }]
        },
        {
            pattern: /invalid\s+(?:box|corner)/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Use valid box characters',
                description: 'Use +, -, |, /, \\ for boxes',
                isPreferred: true,
                edit: null
            }]
        },
        {
            pattern: /invalid\s+color/i,
            getFix: (match, code, line, extracted) => [{
                title: 'Use valid color code',
                description: 'Colors: cRED, cBLU, cGRE, cPNK, cBLK, cYEL',
                isPreferred: true,
                edit: null
            }]
        }
    ]
};

// Generic patterns that apply to all diagram types
const GENERIC_PATTERNS = [
    // Unclosed string
    {
        pattern: /unclosed\s+string|unterminated\s+string|missing\s+["']/i,
        getFix: (match, code, line, extracted) => [{
            title: 'Add closing quote',
            description: 'Strings must be properly quoted',
            isPreferred: true,
            edit: {
                range: { startLineNumber: line, startColumn: 1000, endLineNumber: line, endColumn: 1000 },
                text: '"'
            }
        }]
    },
    // General bracket issues
    {
        pattern: /unmatched\s+bracket|bracket\s+mismatch/i,
        getFix: (match, code, line, extracted) => [{
            title: 'Check bracket matching',
            description: 'Ensure all brackets are properly paired',
            isPreferred: true,
            edit: null
        }]
    }
];

/**
 * Get fix suggestions based on extracted expected token
 * @param {Object} extracted - Extracted error info with expected/found
 * @param {number} line - Error line
 * @param {string} diagramType - Diagram type
 * @returns {Array} Fix suggestions
 */
function getTokenBasedFixes(extracted, line, diagramType) {
    const suggestions = [];
    
    if (!extracted?.expected) return suggestions;
    
    const expected = extracted.expected;
    const column = extracted.column || 1000;
    
    // Map Mermaid tokens to actual characters
    let charToInsert = MERMAID_TOKEN_MAP[expected] || null;
    
    // Direct character expectations
    if (!charToInsert) {
        if (expected === ']' || expected === ')' || expected === '}' || 
            expected === '"' || expected === "'" || expected === '>' ||
            expected === ',' || expected === ':' || expected === '[' || expected === '{') {
            charToInsert = expected;
        }
    }
    
    if (charToInsert) {
        const tokenName = {
            ']': 'closing bracket',
            ')': 'closing parenthesis',
            '}': 'closing brace',
            '"': 'closing quote',
            "'": 'closing quote',
            '>': 'closing angle bracket',
            ',': 'comma',
            ':': 'colon',
            '[': 'opening bracket',
            '{': 'opening brace',
            ']]': 'subroutine end',
            '))': 'double circle end',
            '])': 'stadium end',
            ')]': 'cylinder end',
        }[charToInsert] || `'${charToInsert}'`;
        
        suggestions.push({
            title: `Add ${tokenName}`,
            description: `Insert '${charToInsert}' at error position`,
            isPreferred: true,
            edit: {
                range: { 
                    startLineNumber: line, 
                    startColumn: column, 
                    endLineNumber: line, 
                    endColumn: column 
                },
                text: charToInsert
            }
        });
    }
    
    return suggestions;
}

/**
 * Get fix suggestions for an error
 * @param {string} errorText - The error message
 * @param {string} diagramType - The diagram type
 * @param {number} line - The error line number
 * @param {Object} extracted - Extracted error info (expected, found, column, etc.)
 * @returns {Array} Array of fix suggestions
 */
export function getFixSuggestions(errorText, diagramType, line, extracted = {}) {
    if (!errorText) return [];

    const suggestions = [];
    
    // First, try token-based fixes from extracted info
    const tokenFixes = getTokenBasedFixes(extracted, line, diagramType);
    suggestions.push(...tokenFixes);
    
    // Get type-specific patterns
    const typePatterns = FIX_PATTERNS[diagramType] || [];
    
    // Check type-specific patterns
    for (const fixPattern of typePatterns) {
        const match = errorText.match(fixPattern.pattern);
        if (match) {
            const patternExtracted = fixPattern.extract ? fixPattern.extract(match) : {};
            // Merge pattern extracted with passed extracted
            const mergedExtracted = { ...extracted, ...patternExtracted };
            const fixes = fixPattern.getFix(match, null, line, mergedExtracted);
            if (fixes && fixes.length > 0) {
                // Avoid duplicate fixes
                for (const fix of fixes) {
                    if (!suggestions.some(s => s.title === fix.title)) {
                        suggestions.push(fix);
                    }
                }
            }
        }
    }

    // Check generic patterns if no type-specific matches
    if (suggestions.length === 0) {
        for (const fixPattern of GENERIC_PATTERNS) {
            const match = errorText.match(fixPattern.pattern);
            if (match) {
                const fixes = fixPattern.getFix(match, null, line, extracted);
                if (fixes && fixes.length > 0) {
                    suggestions.push(...fixes);
                }
            }
        }
    }

    return suggestions;
}

/**
 * Apply a fix to code
 * @param {string} code - The original code
 * @param {Object} fix - The fix to apply
 * @returns {string} The modified code
 */
export function applyFix(code, fix) {
    if (!fix || !fix.edit) return code;

    const lines = code.split('\n');
    const { startLineNumber, startColumn, endLineNumber, endColumn } = fix.edit.range || fix.edit;
    const text = fix.edit.text;

    // Handle special line numbers (99999 = end of file)
    const actualStartLine = Math.min(startLineNumber, lines.length + 1);
    const actualEndLine = Math.min(endLineNumber, lines.length + 1);

    if (actualStartLine > lines.length) {
        // Append at end
        return code + text;
    }

    // Simple replacement for single line
    if (actualStartLine === actualEndLine) {
        const line = lines[actualStartLine - 1] || '';
        const actualStartCol = Math.min(startColumn, line.length + 1);
        const actualEndCol = Math.min(endColumn, line.length + 1);
        const before = line.substring(0, actualStartCol - 1);
        const after = line.substring(actualEndCol - 1);
        lines[actualStartLine - 1] = before + text + after;
    }

    return lines.join('\n');
}

export default { getFixSuggestions, applyFix, MERMAID_TOKEN_MAP };
