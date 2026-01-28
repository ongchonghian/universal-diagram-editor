import { debounce } from '../../../utils.js';

// Mermaid AST and layout synchronization controller
export const createMermaidSyncController = () => {
    let _ast = null;
    let _changeSource = null;
    let _debounceTimer = null;
    
    return {
        parseCode: (code, onSuccess, onError) => {
            if (_changeSource === 'visual') return;
            clearTimeout(_debounceTimer);
            _debounceTimer = setTimeout(() => {
                try {
                    if (!window.MermaidAST) { 
                        // Fallback/Simulated AST if library not loaded
                        console.warn('MermaidAST not loaded'); 
                        onSuccess({ type: 'root', code, timestamp: Date.now() });
                        return; 
                    }
                    _ast = window.MermaidAST.parse(code);
                    onSuccess(_ast);
                } catch (e) { 
                    if (onError) onError(e.message); 
                }
            }, 300);
        },
        renderToCode: (updatedAst) => {
            _changeSource = 'visual'; 
            _ast = updatedAst;
            try {
                // If library available use it, otherwise return code from ast if present
                const code = window.MermaidAST ? window.MermaidAST.render(updatedAst) : (updatedAst.code || '');
                setTimeout(() => { _changeSource = null; }, 50);
                return code;
            } catch (e) { 
                setTimeout(() => { _changeSource = null; }, 50); 
                return null; 
            }
        },
        getAst: () => _ast,
        isLoaded: () => !!window.MermaidAST
    };
};

// Default configuration for Mermaid charts
export const getDefautlMermaidConfig = (type) => {
    const configs = {
        flowchart: { direction: 'TD', nodeSpacing: 50, rankSpacing: 50 },
        sequence: { actorMargin: 50, boxMargin: 10, boxTextMargin: 5, noteMargin: 10, messageMargin: 35 },
        pie: { textPosition: 0.5 },
        gantt: { axisFormat: '%Y-%m-%d', barHeight: 20, barGap: 4 },
        timeline: { disableMulticolor: false },
        mindmap: { padding: 10 }
    };
    return configs[type] || {};
};
