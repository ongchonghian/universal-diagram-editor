// Mermaid Sync Controller
// Manages bi-directional synchronization between code editor and visual editor

/**
 * Creates a new Mermaid sync controller for managing AST state
 * and preventing infinite sync loops between code and visual editors
 * @returns {Object} Controller with parse/render methods
 */
export const createMermaidSyncController = () => {
    let ast = null;
    let changeSource = null; // 'code' | 'visual' | null
    let debounceTimer = null;
    
    return {
        /**
         * Parse code to AST (Code → Visual direction)
         * @param {string} code - Mermaid diagram code
         * @param {Function} onSuccess - Callback with parsed AST
         * @param {Function} onError - Callback with error message
         */
        parseCode: (code, onSuccess, onError) => {
            // Prevent sync loops when visual editor made the change
            if (changeSource === 'visual') return;
            
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                try {
                    if (!window.MermaidAST) {
                        onError('MermaidAST not loaded yet');
                        return;
                    }
                    ast = window.MermaidAST.parse(code);
                    onSuccess(ast);
                } catch (e) {
                    onError(e.message);
                }
            }, 300);
        },
        
        /**
         * Render AST to code (Visual → Code direction)
         * @param {Object} updatedAst - Modified AST object
         * @returns {string|null} - Rendered code or null on error
         */
        renderToCode: (updatedAst) => {
            changeSource = 'visual';
            ast = updatedAst;
            try {
                const code = window.MermaidAST.render(ast);
                // Reset changeSource after a tick to allow next code change
                setTimeout(() => { changeSource = null; }, 50);
                return code;
            } catch (e) {
                console.error('Error rendering AST:', e);
                setTimeout(() => { changeSource = null; }, 50);
                return null;
            }
        },
        
        /**
         * Get current AST
         * @returns {Object|null} Current AST or null
         */
        getAst: () => ast,
        
        /**
         * Set AST directly (for external updates)
         * @param {Object} newAst - New AST object
         */
        setAst: (newAst) => { ast = newAst; },
        
        /**
         * Detect diagram type from code
         * @param {string} code - Mermaid diagram code
         * @returns {string|null} Diagram type or null
         */
        detectType: (code) => {
            if (!window.MermaidAST) return null;
            try {
                return window.MermaidAST.detectDiagramType(code);
            } catch (e) {
                return null;
            }
        },
        
        /**
         * Check if MermaidAST library is loaded
         * @returns {boolean}
         */
        isLoaded: () => !!window.MermaidAST
    };
};
