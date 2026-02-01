
import { KROKI_BASE_URL, DIAGRAM_TYPES } from '../config.js';
import { parseError } from '../error-diagnostics/index.js';
import pako from 'pako';
import mermaid from 'mermaid';

/**
 * Unified Renderer Adapter
 * Centralizes all rendering logic, Kroki API interactions, and diagram type handling.
 */
class RendererAdapter {
    constructor() {
        this.baseUrl = KROKI_BASE_URL;
    }

    /**
     * Parse and render a diagram
     * @param {string} content - The diagram source code
     * @param {string} type - The diagram type (bpmn, mermaid, etc.)
     * @param {Object} options - execution options (editorRef, internal flags)
     * @returns {Promise<{svg: string, url: string, error: object, errorLine: number}>}
     */
    async render(content, type, options = {}) {
        if (!content || !content.trim()) {
            return { svg: null, url: '', error: null };
        }

        // Special check for BPMN without DI
        if (type === 'bpmn' && this.isValidBpmnContent(content) && !this.bpmnHasDI(content)) {
            return {
                svg: null, 
                url: '', 
                error: { message: 'This BPMN content is missing diagram layout information (DI). Without it, the diagram cannot be rendered.' }
            };
        }

        // Handle client-side visual editors that don't need server rendering
        // LikeC4 (legacy) or Visual C4 (JSON) should be skipped here if handled by specific editors
        // But if it's PlantUML C4, we render it.
        const isC4PlantUML = type === 'c4' && (content.includes('@startuml') || content.includes('!include'));
        if (type === 'c4' && !isC4PlantUML) {
             // Visual C4 is handled client-side completely
             return { svg: null, url: '', error: null, skipped: true };
        }
        if (type === 'likec4') {
            return { svg: null, url: '', error: null, skipped: true };
        }

        // --- MERMAID CLIENT-SIDE RENDERING ---
        if (type === 'mermaid') {
            const id = `mermaid-${Date.now()}`;
            try {
                // Initialize if needed (usually doing it once is enough, but safe to call)
                // We use lazy initialization/ensure init here
                mermaid.initialize({ 
                    startOnLoad: false,
                    theme: 'default', // or 'dark' based on user preference if we had access
                    securityLevel: 'loose',
                });

                // mermaid.render returns strict object { svg }
                const { svg } = await mermaid.render(id, content);
                
                // For CSR, we don't have a URL, but we can generate a blob URL if needed for consistent API
                // For now, we'll leave URL empty or use a placeholder to indicate local render
                return { svg, url: '', error: null };
            } catch (err) {
                // Mermaid errors are often objects or strings
                // We need to parse them to extract line numbers if possible
                
                // Clean up any potential DOM elements left by mermaid error in some versions
                const errorElement = document.querySelector(`#d${id}`);
                if (errorElement) errorElement.remove();

                const errorMessage = err.message || err.str || String(err);
                
                // Parse mermaid error for line number
                // Format often includes "Parse error on line X"
                const errorInfo = this.parseMermaidError(errorMessage, content);
                
                return { 
                    svg: null, 
                    url: '', 
                    error: { 
                        message: errorInfo.message, 
                        info: errorInfo 
                    },
                    errorLine: errorInfo.line
                };
            }
        }

        const encoded = this.encodeKroki(content);
        if (!encoded) {
            return { svg: null, url: '', error: { message: 'Failed to encode diagram' } };
        }

        // Determine Kroki endpoint
        let krokiType = type;
        if (type === 'c4' && isC4PlantUML) {
            krokiType = 'c4plantuml';
        }

        const url = `${this.baseUrl}/${krokiType}/svg/${encoded}`;
        
        try {
            let response;
             if (url.length > 4000) {
                response = await fetch(`${this.baseUrl}/${krokiType}/svg`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: content
                });
            } else {
                response = await fetch(url);
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP ${response.status}`);
            }

            const svg = await response.text();
            return { svg, url, error: null };
        } catch (err) {
            const errorInfo = parseError(err.message, type, content) || this.parseErrorInfoFallback(err.message);
            const line = errorInfo?.line || this.extractErrorLine(err.message);
            
            return { 
                svg: null, 
                url, 
                error: { 
                    message: err.message, 
                    info: errorInfo 
                },
                errorLine: line
            };
        }
    }

    /**
     * Validate syntax without necessarily returning the full SVG (alias to render for now)
     * @param {string} content
     * @param {string} type
     * @returns {Promise<{valid: boolean, error: string|null, line: number|null}>}
     */
    async validateSyntax(content, type) {
        const result = await this.render(content, type);
        return {
            valid: !result.error,
            error: result.error ? result.error.message : null,
            line: result.errorLine || (result.error ? result.error.line : null)
        };
    }

    /**
     * Encode source code for Kroki
     */
    encodeKroki(source) {
        if (!source || !source.trim()) return '';
        try {
            const data = new TextEncoder().encode(source);
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
    }

    /**
     * Helper to detect file type from content/filename
     * (Logic moved/copied from utils.js)
     */
    detectType(filename, content) {
        // Reuse the logic from utils.js but we can implement it here to be self-contained
        // For now, to ensure consistency, I'll basically implement what we saw in utils.js
        const ext = '.' + filename.split('.').pop().toLowerCase();
        let extType = 'bpmn'; // Default fallback
        for (const [key, config] of Object.entries(DIAGRAM_TYPES)) {
            if (config.extensions && config.extensions.includes(ext)) {
                extType = key;
                break;
            }
        }

        if (!content || !content.trim()) return extType;
        const trimmed = content.trim();

        // 1. JSON
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const json = JSON.parse(trimmed);
                if (json.type === 'excalidraw') return 'excalidraw';
                if (json.$schema && json.$schema.includes('vega-lite')) return 'vegalite';
                if (json.$schema && json.$schema.includes('vega')) return 'vega';
                if (json.signals && json.scales && json.axes) return 'vega';
                if (json.signal || json.wave) return 'wavedrom';
                return extType;
            } catch (e) { /* ignore */ }
        }

        // 2. Text/DSL
        if (trimmed.startsWith('{') && trimmed.includes('"type":') && (trimmed.includes('"person"') || trimmed.includes('"system"'))) return 'c4';
        if (/^\s*specification\s*\{/m.test(trimmed) || /^\s*model\s*\{/m.test(trimmed)) return 'c4';
        if (/@startuml/m.test(trimmed) || /@startmindmap/m.test(trimmed) || /@startwbs/m.test(trimmed)) return 'plantuml';
        
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
        
        if (trimmed.includes('<bpmn:definitions') || trimmed.includes('<definitions')) return 'bpmn';
        if (/^\/--\+/m.test(trimmed) && /\|  \|/m.test(trimmed)) return 'ditaa';

        return extType;
    }

    // --- Helpers ---

    bpmnHasDI(xml) {
        return xml && (xml.includes('<bpmndi:BPMNDiagram') || xml.includes('<bpmndi:BPMNPlane'));
    }

    isValidBpmnContent(text) {
        if (!text || typeof text !== 'string') return false;
        return text.includes('<bpmn:definitions') || text.includes('<definitions');
    }

    extractErrorLine(errorText) {
        if (!errorText) return null;
        const patterns = [ /(?:line|row)\s*(\d+)/i, /:\s*(\d+)\s*:/, /error.*?(\d+):/i ];
        for (const pattern of patterns) {
            const match = errorText.match(pattern);
            if (match && match[1]) return parseInt(match[1], 10);
        }
        return null;
    }

    parseErrorInfoFallback(errorMessage) {
        const line = this.extractErrorLine(errorMessage);
        return {
            line: line,
            message: errorMessage,
            shortMessage: errorMessage.split('\n')[0]
        };
    }

    parseMermaidError(errorMessage, content) {
        // Try to extract line number from message
        // Common format: "Parse error on line X"
        const lineMatch = errorMessage.match(/on line (\d+)/i);
        let line = lineMatch ? parseInt(lineMatch[1], 10) : null;
        
        return {
            message: errorMessage,
            shortMessage: errorMessage.split('\n')[0],
            line: line,
            code: 'mermaid-parse-error'
        };
    }

    /**
     * Download SVG content
     */
    downloadSvg(svgContent, diagramType) {
        if (!svgContent) return;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram-${diagramType}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Download PNG from SVG content
     */
    downloadPng(svgContent, diagramType) {
        if (!svgContent) return;
        const img = new Image();
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width * 2; // 2x for better quality
            canvas.height = img.height * 2;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                const pngUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = `diagram-${diagramType}.png`;
                a.click();
                URL.revokeObjectURL(pngUrl);
            }, 'image/png');
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }
}

// Export singleton
export const rendererAdapter = new RendererAdapter();
