// JSON Position to Line:Column Converter
// Converts character offset from JSON parse errors to line:column format

/**
 * Convert a character position (offset) to line and column numbers
 * @param {string} sourceCode - The source code text
 * @param {number} position - Character offset (0-based)
 * @returns {Object} { line: number, column: number } (1-based)
 */
export function convertPositionToLineColumn(sourceCode, position) {
    if (!sourceCode || position === null || position === undefined) {
        return { line: 1, column: 1 };
    }
    
    const lines = sourceCode.split('\n');
    let currentPos = 0;
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const lineLength = lines[lineNum].length + 1; // +1 for newline character
        
        if (currentPos + lineLength > position) {
            return {
                line: lineNum + 1,
                column: position - currentPos + 1
            };
        }
        
        currentPos += lineLength;
    }
    
    // Position beyond end of file - return last line
    return { 
        line: lines.length, 
        column: lines[lines.length - 1]?.length || 1 
    };
}

/**
 * Find the character position of a specific line and column
 * @param {string} sourceCode - The source code text
 * @param {number} line - Line number (1-based)
 * @param {number} column - Column number (1-based)
 * @returns {number} Character offset (0-based)
 */
export function convertLineColumnToPosition(sourceCode, line, column) {
    if (!sourceCode || line < 1) {
        return 0;
    }
    
    const lines = sourceCode.split('\n');
    let position = 0;
    
    // Sum up all lines before target line
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
        position += lines[i].length + 1; // +1 for newline
    }
    
    // Add column offset (adjust for 1-based to 0-based)
    position += Math.max(0, column - 1);
    
    return position;
}

/**
 * Extract position from common JSON error formats
 * @param {string} errorText - Error message text
 * @returns {number|null} Position if found, null otherwise
 */
export function extractPositionFromJSONError(errorText) {
    if (!errorText) return null;
    
    const patterns = [
        // "at position 123"
        /at\s+position\s+(\d+)/i,
        // "position 123"
        /position\s+(\d+)/i,
        // "at character 123"
        /at\s+character\s+(\d+)/i,
        // "offset 123"
        /offset\s+(\d+)/i,
        // JSON.parse error format: "in JSON at position 123"
        /in\s+JSON\s+at\s+position\s+(\d+)/i,
        // "(line 1 column 18)" - extract and convert
        /\(line\s+\d+\s+column\s+(\d+)\)/i,
    ];
    
    for (const pattern of patterns) {
        const match = errorText.match(pattern);
        if (match) {
            return parseInt(match[1], 10);
        }
    }
    
    return null;
}

/**
 * Parse JSON error and extract structured position info
 * @param {string} errorText - Error message
 * @param {string} sourceCode - Original source code
 * @returns {Object} { line, column, position }
 */
export function parseJSONErrorPosition(errorText, sourceCode) {
    const result = {
        line: null,
        column: null,
        position: null
    };
    
    // First try to extract position
    const position = extractPositionFromJSONError(errorText);
    if (position !== null) {
        result.position = position;
        const lineCol = convertPositionToLineColumn(sourceCode, position);
        result.line = lineCol.line;
        result.column = lineCol.column;
        return result;
    }
    
    // Try direct line:column patterns
    const lineColPatterns = [
        // "(line 1 column 18)"
        /\(line\s+(\d+)\s+column\s+(\d+)\)/i,
        // "line 1, column 18"
        /line\s+(\d+),?\s*column\s+(\d+)/i,
        // "1:18"
        /(\d+):(\d+)/,
    ];
    
    for (const pattern of lineColPatterns) {
        const match = errorText.match(pattern);
        if (match) {
            result.line = parseInt(match[1], 10);
            result.column = parseInt(match[2], 10);
            // Calculate position from line:column
            if (sourceCode) {
                result.position = convertLineColumnToPosition(sourceCode, result.line, result.column);
            }
            return result;
        }
    }
    
    // Fallback: check for "Unexpected end" errors - point to last line
    if (/unexpected\s+end/i.test(errorText) && sourceCode) {
        const lines = sourceCode.split('\n');
        result.line = lines.length;
        result.column = lines[lines.length - 1]?.length || 1;
    }
    
    return result;
}

export default {
    convertPositionToLineColumn,
    convertLineColumnToPosition,
    extractPositionFromJSONError,
    parseJSONErrorPosition
};
