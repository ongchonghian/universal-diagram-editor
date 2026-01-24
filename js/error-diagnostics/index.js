// Error Diagnostics Module
// Enhanced error parsing and diagnostics for diagram syntax errors

import { getFixSuggestions } from './fixes.js';
import { getErrorExplanation } from './explanations.js';
import { parseJSONErrorPosition, convertPositionToLineColumn } from './json-position-converter.js';
import errorLogger from './error-logger.js';

// Store source code for position conversion (set externally)
let currentSourceCode = '';

/**
 * Set the current source code for position conversion
 * @param {string} code - Source code
 */
export function setSourceCode(code) {
    currentSourceCode = code || '';
}

/**
 * Parse error text and extract structured error information
 * @param {string} errorText - Raw error message from Kroki or parser
 * @param {string} diagramType - The diagram type (mermaid, plantuml, etc.)
 * @param {string} sourceCode - Optional source code for position conversion
 * @returns {Object} Structured error information
 */
export function parseError(errorText, diagramType, sourceCode = null) {
    if (!errorText) {
        return null;
    }
    
    // Use provided source code or fall back to stored
    const code = sourceCode || currentSourceCode;

    const result = {
        line: null,
        column: null,
        endColumn: null,
        expected: null,      // What token was expected
        found: null,         // What token was found
        near: null,          // Context around error
        offset: null,        // Character offset (if available)
        message: errorText,
        shortMessage: null,  // Cleaned up message
        code: null,
        severity: 'error',
        diagramType: diagramType,
        suggestions: []
    };

    // Extract detailed error information based on diagram type
    const extracted = extractDetailedInfo(errorText, diagramType, code);
    Object.assign(result, extracted);

    // Categorize the error and get error code
    const errorInfo = categorizeError(errorText, diagramType, extracted);
    result.code = errorInfo.code;
    result.shortMessage = errorInfo.shortMessage || result.message;

    // Get fix suggestions with enhanced info
    result.suggestions = getFixSuggestions(errorText, diagramType, result.line, extracted);
    
    // Log unhandled errors for future improvement
    errorLogger.log(errorText, diagramType, result);

    return result;
}

/**
 * Extract detailed error information from error text
 * @param {string} errorText - Error message
 * @param {string} diagramType - Diagram type
 * @param {string} sourceCode - Source code for position conversion
 * @returns {Object} Extracted information
 */
function extractDetailedInfo(errorText, diagramType, sourceCode = '') {
    const result = {
        line: null,
        column: null,
        endColumn: null,
        expected: null,
        found: null,
        near: null,
        offset: null
    };

    if (!errorText) return result;

    // Try diagram-specific extractors first
    const extractors = {
        mermaid: extractMermaidError,
        plantuml: extractPlantUMLError,
        c4plantuml: extractPlantUMLError,
        graphviz: extractGraphVizError,
        dot: extractGraphVizError,
        erd: extractERDError,
        nomnoml: extractNomnomlError,
        bpmn: extractBPMNError,
        blockdiag: extractBlockDiagError,
        seqdiag: extractBlockDiagError,
        actdiag: extractBlockDiagError,
        nwdiag: extractBlockDiagError,
        pikchr: extractPikchrError,
        structurizr: extractStructurizrError,
        // JSON-based diagrams
        vega: (err) => extractJSONError(err, sourceCode),
        vegalite: (err) => extractJSONError(err, sourceCode),
        excalidraw: (err) => extractJSONError(err, sourceCode),
        wavedrom: (err) => extractJSONError(err, sourceCode),
        // ASCII art diagrams
        ditaa: extractDitaaError,
        svgbob: extractDitaaError,
        // YAML-based
        wireviz: extractYAMLError
    };

    const extractor = extractors[diagramType];
    if (extractor) {
        const extracted = extractor(errorText);
        Object.assign(result, extracted);
    }

    // Fall back to generic extraction if no line found
    if (!result.line) {
        const generic = extractGenericError(errorText);
        Object.assign(result, generic);
    }
    
    // If we have an offset but no line, try to convert using source code
    if (!result.line && result.offset && sourceCode) {
        const lineCol = convertPositionToLineColumn(sourceCode, result.offset);
        result.line = lineCol.line;
        result.column = lineCol.column;
    }

    // Set defaults for marker display
    if (result.line && !result.column) {
        result.column = 1;
    }
    
    // Calculate endColumn based on found token or default to end of line
    if (result.column) {
        if (result.found && result.found.length > 0) {
            result.endColumn = result.column + result.found.length;
        } else if (result.near && result.near.length > 0) {
            result.endColumn = result.column + result.near.length;
        } else {
            result.endColumn = 1000; // Highlight to end of line
        }
    }

    return result;
}

/**
 * Extract error info from Mermaid error messages
 */
function extractMermaidError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null, offset: null };

    // Pattern 1: "Parse error on line X:" with visual pointer
    // Example: "Parse error on line 2:\n...TD    A[Start --> B[End]\n----------------------^"
    const parseErrorMatch = errorText.match(/Parse error on line (\d+):/i);
    if (parseErrorMatch) {
        result.line = parseInt(parseErrorMatch[1], 10);
        
        // Try to find column from visual pointer (----^)
        const pointerMatch = errorText.match(/\n(-+)\^/);
        if (pointerMatch) {
            result.column = pointerMatch[1].length + 1;
        }
    }

    // Pattern 2: "Expecting 'X', 'Y', ... got 'Z'"
    const expectingMatch = errorText.match(/Expecting\s+([^,]+(?:,\s*'[^']+')*)[\s,]+got\s+['"]?(\w+)['"]?/i);
    if (expectingMatch) {
        // Extract first expected token
        const firstExpected = expectingMatch[1].match(/'([^']+)'/);
        result.expected = firstExpected ? firstExpected[1] : expectingMatch[1].trim();
        result.found = expectingMatch[2];
    }

    // Pattern 3: "unexpected character: ->X<-"
    const unexpectedCharMatch = errorText.match(/unexpected character:\s*->(.+?)<-/i);
    if (unexpectedCharMatch) {
        result.found = unexpectedCharMatch[1];
    }

    // Pattern 4: "at offset: X"
    const offsetMatch = errorText.match(/at offset:\s*(\d+)/i);
    if (offsetMatch) {
        result.offset = parseInt(offsetMatch[1], 10);
    }

    // Pattern 5: "Lexical error on line X"
    if (!result.line) {
        const lexicalMatch = errorText.match(/Lexical error on line (\d+)/i);
        if (lexicalMatch) {
            result.line = parseInt(lexicalMatch[1], 10);
        }
    }

    // Pattern 6: "No diagram type detected"
    if (errorText.includes('No diagram type detected')) {
        result.line = 1;
        result.column = 1;
    }

    return result;
}

/**
 * Extract error info from PlantUML error messages
 */
function extractPlantUMLError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null };

    // Pattern 1: "Syntax Error: line X"
    const syntaxMatch = errorText.match(/Syntax Error[:\s]+line\s+(\d+)/i);
    if (syntaxMatch) {
        result.line = parseInt(syntaxMatch[1], 10);
    }

    // Pattern 2: "ERROR line X in ..."
    const errorLineMatch = errorText.match(/ERROR\s+line\s+(\d+)/i);
    if (errorLineMatch) {
        result.line = parseInt(errorLineMatch[1], 10);
    }

    // Pattern 3: "(X, Y)" format - line, column
    const posMatch = errorText.match(/\((\d+),\s*(\d+)\)/);
    if (posMatch) {
        result.line = parseInt(posMatch[1], 10);
        result.column = parseInt(posMatch[2], 10);
    }

    // Pattern 4: Check for missing @startuml/@enduml by presence of welcome message
    if (errorText.includes('Welcome to PlantUML')) {
        result.line = 1;
        result.expected = '@startuml';
    }

    return result;
}

/**
 * Extract error info from GraphViz error messages
 */
function extractGraphVizError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null };

    // Pattern 1: "<stdin>: syntax error in line X near 'Y'"
    const stdinMatch = errorText.match(/<stdin>:\s*syntax error in line (\d+)(?: near ['"]([^'"]+)['"])?/i);
    if (stdinMatch) {
        result.line = parseInt(stdinMatch[1], 10);
        if (stdinMatch[2]) {
            result.near = stdinMatch[2];
        }
    }

    // Pattern 2: "<stdin>:X: ..."
    if (!result.line) {
        const lineMatch = errorText.match(/<stdin>:(\d+):/);
        if (lineMatch) {
            result.line = parseInt(lineMatch[1], 10);
        }
    }

    // Pattern 3: "near 'X'"
    if (!result.near) {
        const nearMatch = errorText.match(/near\s+['"]([^'"]+)['"]/i);
        if (nearMatch) {
            result.near = nearMatch[1];
        }
    }

    return result;
}

/**
 * Extract error info from ERD error messages
 */
function extractERDError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null };

    // Pattern: '"<stdin>" (line X, column Y): unexpected "Z" expecting "W"'
    const erdMatch = errorText.match(/"?<stdin>"?\s*\(line\s+(\d+),\s*column\s+(\d+)\):\s*unexpected\s+["']([^"']+)["']\s*expecting\s+["']([^"']+)["']/i);
    if (erdMatch) {
        result.line = parseInt(erdMatch[1], 10);
        result.column = parseInt(erdMatch[2], 10);
        result.found = erdMatch[3];
        result.expected = erdMatch[4];
    }

    // Simpler pattern: "(line X, column Y)"
    if (!result.line) {
        const simpleMatch = errorText.match(/\(line\s+(\d+),\s*column\s+(\d+)\)/i);
        if (simpleMatch) {
            result.line = parseInt(simpleMatch[1], 10);
            result.column = parseInt(simpleMatch[2], 10);
        }
    }

    return result;
}

/**
 * Extract error info from Nomnoml error messages
 */
function extractNomnomlError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null };

    // Pattern 1: "Parse error at line X column Y, expected "Z" but got W"
    const parseMatch = errorText.match(/Parse error at line (\d+) column (\d+),\s*expected\s+["']([^"']+)["']\s*but got\s+(.+?)(?:\n|$)/i);
    if (parseMatch) {
        result.line = parseInt(parseMatch[1], 10);
        result.column = parseInt(parseMatch[2], 10);
        result.expected = parseMatch[3];
        result.found = parseMatch[4].trim();
    }

    // Pattern 2: JSON-like properties in error (line: X, column: Y)
    if (!result.line) {
        const lineMatch = errorText.match(/line:\s*(\d+)/i);
        const colMatch = errorText.match(/column:\s*(\d+)/i);
        if (lineMatch) result.line = parseInt(lineMatch[1], 10);
        if (colMatch) result.column = parseInt(colMatch[1], 10);
    }

    // Extract expected/actual from JSON-like properties
    const expectedMatch = errorText.match(/expected:\s*['"]([^'"]+)['"]/i);
    const actualMatch = errorText.match(/actual:\s*['"]([^'"]+)['"]/i);
    if (expectedMatch) result.expected = expectedMatch[1];
    if (actualMatch) result.found = actualMatch[1];

    return result;
}

/**
 * Extract error info from BPMN/XML error messages
 */
function extractBPMNError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null };

    // Pattern 1: "Line: X, Column: Y"
    const xmlMatch = errorText.match(/Line:\s*(\d+)(?:,\s*Column:\s*(\d+))?/i);
    if (xmlMatch) {
        result.line = parseInt(xmlMatch[1], 10);
        if (xmlMatch[2]) {
            result.column = parseInt(xmlMatch[2], 10);
        }
    }

    // Pattern 2: "line X, column Y"
    if (!result.line) {
        const simpleMatch = errorText.match(/line\s+(\d+)(?:,?\s*column\s+(\d+))?/i);
        if (simpleMatch) {
            result.line = parseInt(simpleMatch[1], 10);
            if (simpleMatch[2]) {
                result.column = parseInt(simpleMatch[2], 10);
            }
        }
    }

    // Pattern 3: Extract tag name from "element 'X'"
    const elementMatch = errorText.match(/element\s+['"]([^'"]+)['"]/i);
    if (elementMatch) {
        result.near = elementMatch[1];
    }

    return result;
}

/**
 * Extract error info from BlockDiag family error messages
 */
function extractBlockDiagError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null };

    // Pattern 1: "ParseException: line X, column Y"
    const parseExMatch = errorText.match(/ParseException[:\s]+line\s+(\d+)(?:,?\s*column\s+(\d+))?/i);
    if (parseExMatch) {
        result.line = parseInt(parseExMatch[1], 10);
        if (parseExMatch[2]) {
            result.column = parseInt(parseExMatch[2], 10);
        }
    }

    // Pattern 2: "line X: ..."
    if (!result.line) {
        const lineMatch = errorText.match(/line\s+(\d+):/i);
        if (lineMatch) {
            result.line = parseInt(lineMatch[1], 10);
        }
    }

    // Pattern 3: "at line X"
    if (!result.line) {
        const atLineMatch = errorText.match(/at\s+line\s+(\d+)/i);
        if (atLineMatch) {
            result.line = parseInt(atLineMatch[1], 10);
        }
    }
    
    // Pattern 4: "unknown node 'X'"
    const unknownNodeMatch = errorText.match(/unknown\s+node\s+['"]?(\w+)['"]?/i);
    if (unknownNodeMatch) {
        result.near = unknownNodeMatch[1];
    }
    
    // Pattern 5: "group 'X' not closed"
    const groupMatch = errorText.match(/group\s+['"]?(\w+)['"]?\s+not\s+closed/i);
    if (groupMatch) {
        result.near = groupMatch[1];
        result.expected = '}';
    }

    return result;
}

/**
 * Extract error info from Pikchr error messages
 */
function extractPikchrError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null };

    // Pattern 1: "line X:"
    const lineMatch = errorText.match(/line\s+(\d+):/i);
    if (lineMatch) {
        result.line = parseInt(lineMatch[1], 10);
    }
    
    // Pattern 2: "at line X column Y"
    const lineColMatch = errorText.match(/at\s+line\s+(\d+)\s+column\s+(\d+)/i);
    if (lineColMatch) {
        result.line = parseInt(lineColMatch[1], 10);
        result.column = parseInt(lineColMatch[2], 10);
    }

    return result;
}

/**
 * Extract error info from Structurizr error messages (DSL and JSON)
 */
function extractStructurizrError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null };

    // Pattern 1: "Line X:" (DSL format)
    const lineMatch = errorText.match(/Line\s+(\d+):/i);
    if (lineMatch) {
        result.line = parseInt(lineMatch[1], 10);
    }
    
    // Pattern 2: "expected 'workspace'" (DSL format)
    if (/expected\s+['"]?workspace['"]?/i.test(errorText)) {
        result.line = result.line || 1;
        result.expected = 'workspace';
    }
    
    // Pattern 3: "unknown keyword 'X'"
    const keywordMatch = errorText.match(/unknown\s+keyword\s+['"]?(\w+)['"]?/i);
    if (keywordMatch) {
        result.found = keywordMatch[1];
    }
    
    // Pattern 4: "relationship source 'X' not found"
    const relMatch = errorText.match(/(?:relationship|source|destination)\s+['"]?(\w+)['"]?\s+not\s+found/i);
    if (relMatch) {
        result.near = relMatch[1];
    }
    
    // Pattern 5: JSON format - delegate to JSON extractor patterns
    const jsonPosMatch = errorText.match(/(?:position|at)\s+(\d+)/i);
    if (jsonPosMatch && !result.line) {
        result.offset = parseInt(jsonPosMatch[1], 10);
    }

    return result;
}

/**
 * Extract error info from JSON-based diagram error messages (Vega, Vega-Lite, Excalidraw, Wavedrom)
 */
function extractJSONError(errorText, sourceCode = '') {
    const result = { line: null, column: null, expected: null, found: null, near: null, offset: null };
    
    // Use the JSON position parser
    const posInfo = parseJSONErrorPosition(errorText, sourceCode);
    if (posInfo.line) {
        result.line = posInfo.line;
        result.column = posInfo.column;
    }
    if (posInfo.position !== null) {
        result.offset = posInfo.position;
    }
    
    // Pattern 1: "Unexpected token X"
    const tokenMatch = errorText.match(/unexpected\s+token\s+['"]?(.+?)['"]?(?:\s|,|$)/i);
    if (tokenMatch) {
        result.found = tokenMatch[1].trim();
    }
    
    // Pattern 2: "Expected X" or "expecting X"
    const expectedMatch = errorText.match(/(?:expected|expecting)\s+['"]?([,:\[\]{}])['"]?/i);
    if (expectedMatch) {
        result.expected = expectedMatch[1];
    }
    
    // Pattern 3: "Expected property name"
    if (/expected\s+property\s+name/i.test(errorText)) {
        result.expected = 'property name';
    }
    
    // Pattern 4: "Unterminated string"
    if (/unterminated\s+string/i.test(errorText)) {
        result.expected = '"';
    }
    
    // Pattern 5: "Unexpected end of JSON"
    if (/unexpected\s+end/i.test(errorText)) {
        result.expected = '}'; // Or ] - we'll suggest both
    }
    
    // Pattern 6: Vega/Vega-Lite schema errors
    const schemaMatch = errorText.match(/missing\s+required\s+property\s+['"]?(\w+)['"]?/i);
    if (schemaMatch) {
        result.expected = schemaMatch[1];
        result.line = result.line || 1; // Schema errors typically at root
    }
    
    // Pattern 7: "Invalid mark type"
    const markMatch = errorText.match(/invalid\s+(?:mark|type)\s+['"]?(\w+)['"]?/i);
    if (markMatch) {
        result.found = markMatch[1];
    }

    return result;
}

/**
 * Extract error info from Ditaa (ASCII art) error messages
 */
function extractDitaaError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null };
    
    // Pattern 1: "invalid box/corner at line X"
    const boxMatch = errorText.match(/invalid\s+(?:box|corner).*?(?:at|near|line)\s+(\d+)/i);
    if (boxMatch) {
        result.line = parseInt(boxMatch[1], 10);
    }
    
    // Pattern 2: "unclosed box at line X"
    const unclosedMatch = errorText.match(/unclosed\s+(?:box|shape).*?line\s+(\d+)/i);
    if (unclosedMatch) {
        result.line = parseInt(unclosedMatch[1], 10);
        result.expected = 'closing box line';
    }
    
    // Pattern 3: "invalid color code"
    const colorMatch = errorText.match(/invalid\s+color\s+(?:code)?\s*['"]?(\w+)['"]?/i);
    if (colorMatch) {
        result.found = colorMatch[1];
    }
    
    // Pattern 4: Generic "error" with line number
    if (!result.line) {
        const lineMatch = errorText.match(/(?:error|line)\s+(\d+)/i);
        if (lineMatch) {
            result.line = parseInt(lineMatch[1], 10);
        }
    }
    
    // Pattern 5: ASCII art specific - "character X at position Y"
    const charMatch = errorText.match(/character\s+['"]?(.+?)['"]?\s+at\s+(?:position|line)\s+(\d+)/i);
    if (charMatch) {
        result.found = charMatch[1];
        result.line = parseInt(charMatch[2], 10);
    }
    
    // Fallback: If no line found but error exists, assume line 1
    if (!result.line && /error/i.test(errorText)) {
        result.line = 1;
    }

    return result;
}

/**
 * Extract error info from YAML-based diagram error messages (Wireviz)
 */
function extractYAMLError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null };
    
    // Pattern 1: "line X, column Y"
    const lineColMatch = errorText.match(/line\s+(\d+),?\s*column\s+(\d+)/i);
    if (lineColMatch) {
        result.line = parseInt(lineColMatch[1], 10);
        result.column = parseInt(lineColMatch[2], 10);
    }
    
    // Pattern 2: "at line X"
    if (!result.line) {
        const lineMatch = errorText.match(/at\s+line\s+(\d+)/i);
        if (lineMatch) {
            result.line = parseInt(lineMatch[1], 10);
        }
    }
    
    // Pattern 3: "mapping values are not allowed"
    if (/mapping\s+values\s+(?:are\s+)?not\s+allowed/i.test(errorText)) {
        result.expected = 'proper indentation';
    }
    
    // Pattern 4: "could not find expected ':'"
    const expectedMatch = errorText.match(/could\s+not\s+find\s+expected\s+['"]?(.+?)['"]?/i);
    if (expectedMatch) {
        result.expected = expectedMatch[1];
    }
    
    // Pattern 5: "found unexpected ':'"
    const foundMatch = errorText.match(/found\s+unexpected\s+['"]?(.+?)['"]?/i);
    if (foundMatch) {
        result.found = foundMatch[1];
    }

    return result;
}

/**
 * Generic error extraction for unknown diagram types
 */
function extractGenericError(errorText) {
    const result = { line: null, column: null, expected: null, found: null, near: null };

    const patterns = [
        // "line X, column Y"
        /line\s+(\d+)(?:,?\s*column\s+(\d+))?/i,
        // "(X:Y)" or "(X, Y)"
        /\((\d+)[,:]\s*(\d+)\)/,
        // "X:Y:"
        /(\d+):(\d+):/,
        // "line X" or "row X"
        /(?:line|row)\s+(\d+)/i,
        // ":X:" format
        /:\s*(\d+)\s*:/,
    ];

    for (const pattern of patterns) {
        const match = errorText.match(pattern);
        if (match) {
            result.line = parseInt(match[1], 10);
            if (match[2]) {
                result.column = parseInt(match[2], 10);
            }
            break;
        }
    }

    // Try to extract "near 'X'" or "found 'X'"
    const nearMatch = errorText.match(/near\s+['"]([^'"]+)['"]/i);
    const foundMatch = errorText.match(/(?:found|got|actual)\s+['"]?([^'"}\s]+)['"]?/i);
    const expectedMatch = errorText.match(/(?:expected|expecting)\s+['"]?([^'"}\s,]+)['"]?/i);

    if (nearMatch) result.near = nearMatch[1];
    if (foundMatch) result.found = foundMatch[1];
    if (expectedMatch) result.expected = expectedMatch[1];

    return result;
}

/**
 * Categorize error and assign error code
 * @param {string} errorText - Error message
 * @param {string} diagramType - Diagram type
 * @param {Object} extracted - Extracted error info
 * @returns {Object} Error categorization {code, shortMessage}
 */
function categorizeError(errorText, diagramType, extracted) {
    const lowerError = errorText.toLowerCase();

    // Build short message from extracted info
    let shortMessage = null;
    if (extracted.expected && extracted.found) {
        shortMessage = `Expected '${extracted.expected}' but found '${extracted.found}'`;
    } else if (extracted.expected) {
        shortMessage = `Expected '${extracted.expected}'`;
    } else if (extracted.found) {
        shortMessage = `Unexpected '${extracted.found}'`;
    } else if (extracted.near) {
        shortMessage = `Error near '${extracted.near}'`;
    }

    // Common error categories with patterns
    const categories = [
        // Expected token patterns (from extracted info)
        {
            test: () => extracted.expected === ']' || extracted.expected === 'SQE',
            code: 'missing-bracket',
            message: shortMessage || 'Missing closing bracket ]'
        },
        {
            test: () => extracted.expected === ')' || extracted.expected === 'PE',
            code: 'missing-paren',
            message: shortMessage || 'Missing closing parenthesis )'
        },
        {
            test: () => extracted.expected === '}',
            code: 'missing-brace',
            message: shortMessage || 'Missing closing brace }'
        },
        // Text pattern matching
        {
            test: () => /expecting\s+['"]?\]|unclosed\s+bracket|expected\s+['"]?SQE/i.test(lowerError),
            code: 'missing-bracket',
            message: shortMessage || 'Missing closing bracket ]'
        },
        {
            test: () => /expecting\s+['"]?\)|unclosed\s+paren/i.test(lowerError),
            code: 'missing-paren',
            message: shortMessage || 'Missing closing parenthesis )'
        },
        {
            test: () => /expecting\s+['"]?\}|unclosed\s+brace/i.test(lowerError),
            code: 'missing-brace',
            message: shortMessage || 'Missing closing brace }'
        },
        // PlantUML specific
        {
            test: () => /welcome to plantuml|@startuml.*missing|missing.*@startuml/i.test(errorText),
            code: 'plantuml-missing-start',
            message: 'Missing @startuml declaration'
        },
        {
            test: () => /@enduml.*missing|missing.*@enduml/i.test(lowerError),
            code: 'plantuml-missing-end',
            message: 'Missing @enduml declaration'
        },
        // Mermaid specific
        {
            test: () => /no diagram type detected/i.test(errorText),
            code: 'unknown-diagram',
            message: 'Missing diagram type declaration (e.g., flowchart TD)'
        },
        {
            test: () => /unexpected.*token|unexpected.*character/i.test(lowerError),
            code: 'unexpected-token',
            message: shortMessage || 'Unexpected token'
        },
        // Arrow syntax
        {
            test: () => /invalid.*arrow|unknown.*link|arrow.*syntax/i.test(lowerError),
            code: 'invalid-arrow',
            message: shortMessage || 'Invalid arrow syntax'
        },
        // XML/BPMN
        {
            test: () => /xml.*error|invalid.*xml|malformed|not well.?formed/i.test(lowerError),
            code: 'xml-error',
            message: shortMessage || 'XML parsing error'
        },
        {
            test: () => /unclosed.*tag|missing.*closing.*tag/i.test(lowerError),
            code: 'unclosed-tag',
            message: shortMessage || 'Unclosed XML tag'
        },
        // Generic syntax error
        {
            test: () => /syntax\s+error/i.test(lowerError),
            code: 'syntax-error',
            message: shortMessage || 'Syntax error'
        }
    ];

    for (const category of categories) {
        if (category.test()) {
            return {
                code: `${diagramType}-${category.code}`,
                shortMessage: category.message
            };
        }
    }

    // Default
    return {
        code: `${diagramType}-generic-error`,
        shortMessage: shortMessage || 'Diagram error'
    };
}

/**
 * Convert parsed error to Monaco marker format
 * @param {Object} errorInfo - Parsed error information
 * @returns {Object} Monaco marker object
 */
export function toMonacoMarker(errorInfo) {
    if (!errorInfo || !errorInfo.line) {
        return null;
    }

    return {
        startLineNumber: errorInfo.line,
        startColumn: errorInfo.column || 1,
        endLineNumber: errorInfo.line,
        endColumn: errorInfo.endColumn || 1000,
        message: errorInfo.shortMessage || errorInfo.message,
        severity: 8, // monaco.MarkerSeverity.Error = 8
        code: errorInfo.code,
        source: 'diagram-validator',
        // Store extra info for code actions
        relatedInformation: errorInfo.expected ? [{
            expected: errorInfo.expected,
            found: errorInfo.found,
            near: errorInfo.near
        }] : undefined
    };
}

/**
 * Create Monaco code action for a fix suggestion
 * @param {Object} suggestion - Fix suggestion
 * @param {Object} marker - Monaco marker
 * @param {Object} model - Monaco model
 * @returns {Object} Monaco code action
 */
export function toMonacoCodeAction(suggestion, marker, model) {
    return {
        title: suggestion.title,
        kind: 'quickfix',
        diagnostics: [marker],
        isPreferred: suggestion.isPreferred || false,
        edit: {
            edits: [{
                resource: model.uri,
                edit: suggestion.edit
            }]
        }
    };
}

// Re-export utilities
export { getFixSuggestions } from './fixes.js';
export { getErrorExplanation } from './explanations.js';
export { convertPositionToLineColumn, parseJSONErrorPosition } from './json-position-converter.js';
export { default as errorLogger } from './error-logger.js';
