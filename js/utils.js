// Utility functions for Kroki Universal Diagram Generator
import { DIAGRAM_TYPES } from './config.js';

/**
 * Convert text string to Uint8Array bytes
 */
export const textToBytes = (text) => new TextEncoder().encode(text);

/**
 * Encode source code for Kroki URL using pako compression
 * @param {string} source - The diagram source code
 * @returns {string|null} - Base64 URL-safe encoded string or null on error
 */
export const encodeKroki = (source) => {
    if (!source || !source.trim()) return '';
    try {
        const data = textToBytes(source);
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
};

/**
 * Detect diagram type from file extension
 * @param {string} filename - The filename to check
 * @returns {string} - Detected diagram type key
 */
export const detectTypeFromExtension = (filename) => {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    for (const [key, config] of Object.entries(DIAGRAM_TYPES)) {
        if (config.extensions && config.extensions.includes(ext)) return key;
    }
    return 'bpmn';
};

/**
 * Detect specific diagram model/subtype from code content
 * @param {string} code - The diagram source code
 * @param {string} type - The main diagram type
 * @returns {string} - Specific model name
 */
export const detectSpecificModel = (code, type) => {
    if (!code || !code.trim()) return 'Empty';
    const cleanCode = code.trim();

    if (type === 'mermaid') {
        if (/^\s*sequenceDiagram/m.test(cleanCode)) return 'Sequence Diagram';
        if (/^\s*(graph|flowchart)\s+/m.test(cleanCode)) return 'Flowchart';
        if (/^\s*classDiagram/m.test(cleanCode)) return 'Class Diagram';
        if (/^\s*stateDiagram/m.test(cleanCode)) return 'State Diagram';
        if (/^\s*erDiagram/m.test(cleanCode)) return 'Entity Relationship';
        if (/^\s*gantt/m.test(cleanCode)) return 'Gantt Chart';
        if (/^\s*pie/m.test(cleanCode)) return 'Pie Chart';
        if (/^\s*timeline/m.test(cleanCode)) return 'Timeline';
        if (/^\s*mindmap/m.test(cleanCode)) return 'Mindmap';
        if (/^\s*journey/m.test(cleanCode)) return 'User Journey';
        return 'Mermaid Diagram';
    }

    if (type === 'plantuml' || type === 'c4plantuml') {
        if (/@startmindmap/m.test(cleanCode)) return 'Mindmap';
        if (/@startwbs/m.test(cleanCode)) return 'Work Breakdown Structure';
        if (/@startuml/m.test(cleanCode)) {
            if (/^\s*actor\s+|^\s*usecase\s+/m.test(cleanCode)) return 'Use Case Diagram';
            if (/^\s*(interface|class|enum)\s+/m.test(cleanCode)) return 'Class Diagram';
            if (/^\s*(participant|actor|boundary|control|entity|database)\s+|->/m.test(cleanCode)) return 'Sequence Diagram';
            return 'UML Diagram';
        }
    }

    if (type === 'bpmn') {
        if (/<(\w+:)?collaboration/i.test(cleanCode)) return 'Collaboration (Swimlanes)';
        if (/<(\w+:)?process/i.test(cleanCode)) return 'Process Flow';
        if (/<(\w+:)?definitions/i.test(cleanCode)) return 'BPMN Definition';
    }

    return DIAGRAM_TYPES[type]?.label || 'Diagram';
};

/**
 * Extract line number from error text
 * @param {string} errorText - Error message text
 * @returns {number|null} - Line number or null if not found
 */
export const extractErrorLine = (errorText) => {
    if (!errorText) return null;
    const patterns = [ /(?:line|row)\s*(\d+)/i, /:\s*(\d+)\s*:/, /error.*?(\d+):/i ];
    for (const pattern of patterns) {
        const match = errorText.match(pattern);
        if (match && match[1]) return parseInt(match[1], 10);
    }
    return null;
};

/**
 * Escape special regex characters in a string
 * @param {string} string - String to escape
 * @returns {string} - Escaped string safe for use in RegExp
 */
export const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Load external script with AMD compatibility handling
 * @param {string} src - Script URL
 * @returns {Promise} - Resolves when script is loaded
 */
export const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        
        // Temporarily remove AMD define to prevent conflicts
        let amdDefine = null;
        if (window.define && window.define.amd) {
            amdDefine = window.define;
            window.define = undefined;
        }
        
        script.onload = () => {
            if (amdDefine) window.define = amdDefine; 
            resolve();
        };
        
        script.onerror = (e) => {
            if (amdDefine) window.define = amdDefine; 
            reject(e);
        };
        
        document.head.appendChild(script);
    });
};

/**
 * Load external CSS file
 * @param {string} href - CSS URL
 */
export const loadCSS = (href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
};

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
