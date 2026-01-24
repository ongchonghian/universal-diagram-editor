/**
 * Library Registry - Central configuration for all CDN dependencies
 * Used by the auto-update system to track and update library versions
 */

// CDN provider types
export const CDN_TYPES = {
    UNPKG: 'unpkg',
    CDNJS: 'cdnjs',
    ESMSH: 'esm.sh',
    JSR: 'jsr',
    TAILWIND: 'tailwind' // Special case - no versioning
};

// Library registry with all CDN dependencies
export const LIBRARY_REGISTRY = {
    react: {
        name: 'React',
        cdn: CDN_TYPES.UNPKG,
        package: 'react',
        currentVersion: '18',
        urlPattern: 'https://unpkg.com/react@{version}/umd/react.production.min.js',
        testFn: () => typeof window.React !== 'undefined' && window.React.createElement,
        description: 'JavaScript library for building user interfaces'
    },
    'react-dom': {
        name: 'ReactDOM',
        cdn: CDN_TYPES.UNPKG,
        package: 'react-dom',
        currentVersion: '18',
        urlPattern: 'https://unpkg.com/react-dom@{version}/umd/react-dom.production.min.js',
        testFn: () => typeof window.ReactDOM !== 'undefined' && window.ReactDOM.createRoot,
        description: 'React DOM rendering'
    },
    babel: {
        name: 'Babel Standalone',
        cdn: CDN_TYPES.UNPKG,
        package: '@babel/standalone',
        currentVersion: 'latest',
        urlPattern: 'https://unpkg.com/@babel/standalone/babel.min.js',
        testFn: () => typeof window.Babel !== 'undefined',
        description: 'In-browser JavaScript transpiler',
        skipVersionCheck: true // Uses 'latest' tag
    },
    pako: {
        name: 'Pako',
        cdn: CDN_TYPES.CDNJS,
        package: 'pako',
        currentVersion: '2.1.0',
        urlPattern: 'https://cdnjs.cloudflare.com/ajax/libs/pako/{version}/pako.min.js',
        testFn: () => typeof window.pako !== 'undefined' && window.pako.deflate,
        description: 'Zlib port for compression'
    },
    monaco: {
        name: 'Monaco Editor',
        cdn: CDN_TYPES.CDNJS,
        package: 'monaco-editor',
        currentVersion: '0.44.0',
        urlPattern: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/{version}/min/vs/loader.min.js',
        testFn: () => typeof window.require !== 'undefined',
        description: 'Code editor that powers VS Code',
        additionalUrls: [
            // Monaco loads additional files via require.config
            'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/{version}/min/vs'
        ]
    },
    fontawesome: {
        name: 'Font Awesome',
        cdn: CDN_TYPES.CDNJS,
        package: 'font-awesome',
        currentVersion: '6.4.0',
        urlPattern: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/{version}/css/all.min.css',
        testFn: () => document.querySelector('link[href*="font-awesome"]') !== null,
        description: 'Icon library',
        isStylesheet: true
    },
    xyflow: {
        name: '@xyflow/react',
        cdn: CDN_TYPES.UNPKG,
        package: '@xyflow/react',
        currentVersion: '12',
        urlPattern: 'https://unpkg.com/@xyflow/react@{version}/dist/style.css',
        testFn: () => document.querySelector('link[href*="xyflow"]') !== null,
        description: 'React Flow for node-based diagrams',
        isStylesheet: true
    },
    dagre: {
        name: 'Dagre',
        cdn: CDN_TYPES.UNPKG,
        package: 'dagre',
        currentVersion: '0.8.5',
        urlPattern: 'https://unpkg.com/dagre@{version}/dist/dagre.min.js',
        testFn: () => typeof window.dagre !== 'undefined',
        description: 'Graph layout library'
    },
    tailwind: {
        name: 'Tailwind CSS',
        cdn: CDN_TYPES.TAILWIND,
        package: 'tailwindcss',
        currentVersion: 'latest',
        urlPattern: 'https://cdn.tailwindcss.com',
        testFn: () => typeof window.tailwind !== 'undefined',
        description: 'Utility-first CSS framework',
        skipVersionCheck: true // CDN always serves latest
    },
    'mermaid-ast': {
        name: 'Mermaid AST',
        cdn: CDN_TYPES.JSR,
        package: '@emily/mermaid-ast',
        scope: 'emily',
        currentVersion: '0.8',
        urlPattern: 'https://esm.sh/jsr/@emily/mermaid-ast@{version}',
        testFn: () => window.MermaidASTLoaded === true,
        description: 'Mermaid diagram AST parser',
        isESModule: true
    },
    excalidraw: {
        name: 'Excalidraw',
        cdn: CDN_TYPES.ESMSH,
        package: '@excalidraw/excalidraw',
        currentVersion: '0.17.0',
        urlPattern: 'https://esm.sh/@excalidraw/excalidraw@{version}?external=react,react-dom',
        testFn: () => window.ExcalidrawLoaded === true,
        description: 'Whiteboard drawing tool',
        isESModule: true,
        // Complex library configuration for testing
        testConfig: {
            // CSS file required for proper rendering
            cssUrl: 'https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@{version}/dist/prod/index.css',
            // Import map required for external React
            importMap: {
                'react': 'https://esm.sh/react@18.2.0',
                'react-dom': 'https://esm.sh/react-dom@18.2.0',
                'react-dom/client': 'https://esm.sh/react-dom@18.2.0/client',
                'react/jsx-runtime': 'https://esm.sh/react@18.2.0/jsx-runtime'
            },
            // Visual test: render component and check for specific elements
            visualTest: {
                // Element selectors that must exist after render
                requiredSelectors: ['.excalidraw', '[class*="App-toolbar"]', '[class*="layer-ui"]'],
                // Text that should appear in the rendered UI
                requiredText: ['Shapes'],
                // Timeout for visual test in ms
                timeout: 10000
            },
            // Pre-load dependencies before testing
            preloadDeps: ['react', 'react-dom']
        }
    },
    htm: {
        name: 'HTM',
        cdn: CDN_TYPES.ESMSH,
        package: 'htm',
        currentVersion: '3.1.1',
        urlPattern: 'https://esm.sh/htm@{version}',
        testFn: () => true, // Loaded in separate module
        description: 'JSX-like syntax using template literals',
        isESModule: true
    },
    'bpmn-js': {
        name: 'BPMN-JS',
        cdn: CDN_TYPES.UNPKG,
        package: 'bpmn-js',
        currentVersion: '16.4.0',
        urlPattern: 'https://unpkg.com/bpmn-js@{version}/dist/bpmn-modeler.production.min.js',
        testFn: () => typeof window.BpmnJS !== 'undefined',
        description: 'BPMN 2.0 diagram viewer and modeler',
        additionalUrls: [
            'https://unpkg.com/bpmn-js@{version}/dist/assets/diagram-js.css',
            'https://unpkg.com/bpmn-js@{version}/dist/assets/bpmn-font/css/bpmn.css'
        ],
        // Test configuration
        testConfig: {
            // CSS files required
            cssUrls: [
                'https://unpkg.com/bpmn-js@{version}/dist/assets/diagram-js.css',
                'https://unpkg.com/bpmn-js@{version}/dist/assets/bpmn-font/css/bpmn.css'
            ],
            // Visual test configuration
            visualTest: {
                // Test by instantiating the modeler
                initTest: `
                    const container = document.createElement('div');
                    container.style.width = '500px';
                    container.style.height = '400px';
                    document.body.appendChild(container);
                    const modeler = new BpmnJS({ container });
                    return typeof modeler.importXML === 'function';
                `,
                timeout: 8000
            }
        }
    },
    'bpmn-auto-layout': {
        name: 'BPMN Auto-Layout',
        cdn: CDN_TYPES.ESMSH,
        package: 'bpmn-auto-layout',
        currentVersion: '1.1.1',
        urlPattern: 'https://esm.sh/bpmn-auto-layout@{version}',
        testFn: () => true, // Dynamically imported
        description: 'Auto-layout for BPMN diagrams',
        isESModule: true,
        isDynamicImport: true
    },
    // React/ReactDOM from esm.sh (used by Excalidraw)
    'react-esm': {
        name: 'React (ESM)',
        cdn: CDN_TYPES.ESMSH,
        package: 'react',
        currentVersion: '18',
        urlPattern: 'https://esm.sh/react@{version}?bundle-deps',
        testFn: () => window.ExcalidrawLib?.React !== undefined,
        description: 'React for Excalidraw (bundled)',
        isESModule: true,
        linkedTo: 'react' // Sync version with main React
    },
    'react-dom-esm': {
        name: 'ReactDOM (ESM)',
        cdn: CDN_TYPES.ESMSH,
        package: 'react-dom',
        currentVersion: '18',
        urlPattern: 'https://esm.sh/react-dom@{version}/client?bundle-deps',
        testFn: () => window.ExcalidrawLib?.ReactDOM !== undefined,
        description: 'ReactDOM for Excalidraw (bundled)',
        isESModule: true,
        linkedTo: 'react-dom' // Sync version with main ReactDOM
    }
};

/**
 * Get all libraries that should be checked for updates
 */
export function getCheckableLibraries() {
    return Object.entries(LIBRARY_REGISTRY)
        .filter(([_, lib]) => !lib.skipVersionCheck && !lib.linkedTo)
        .map(([id, lib]) => ({ id, ...lib }));
}

/**
 * Get a library by its ID
 */
export function getLibraryById(id) {
    return LIBRARY_REGISTRY[id] ? { id, ...LIBRARY_REGISTRY[id] } : null;
}

/**
 * Get all libraries of a specific CDN type
 */
export function getLibrariesByCdn(cdnType) {
    return Object.entries(LIBRARY_REGISTRY)
        .filter(([_, lib]) => lib.cdn === cdnType)
        .map(([id, lib]) => ({ id, ...lib }));
}

/**
 * Build the full URL for a library with a specific version
 */
export function buildLibraryUrl(libraryId, version) {
    const lib = LIBRARY_REGISTRY[libraryId];
    if (!lib) return null;
    return lib.urlPattern.replace('{version}', version);
}

/**
 * Get all URLs for a library (main + additional)
 */
export function getAllLibraryUrls(libraryId, version) {
    const lib = LIBRARY_REGISTRY[libraryId];
    if (!lib) return [];
    
    const urls = [lib.urlPattern.replace('{version}', version)];
    if (lib.additionalUrls) {
        urls.push(...lib.additionalUrls.map(url => url.replace('{version}', version)));
    }
    return urls;
}

/**
 * Parse version from a URL
 */
export function parseVersionFromUrl(url) {
    // unpkg: @version/ pattern
    const unpkgMatch = url.match(/@([^/]+)\//);
    if (unpkgMatch) return unpkgMatch[1];
    
    // cdnjs: /version/ pattern after library name
    const cdnjsMatch = url.match(/\/(\d+\.\d+\.\d+)\//);
    if (cdnjsMatch) return cdnjsMatch[1];
    
    // esm.sh: @version at end or before ?
    const esmMatch = url.match(/@([^/?]+)(?:\?|$)/);
    if (esmMatch) return esmMatch[1];
    
    return null;
}

/**
 * Parse actual library versions from HTML content
 * Returns a map of library ID to actual version found in HTML
 */
export function parseVersionsFromHtml(html) {
    const versions = {};
    
    Object.entries(LIBRARY_REGISTRY).forEach(([id, lib]) => {
        if (lib.skipVersionCheck) return;
        
        // Build a regex pattern from the URL pattern to extract version
        const urlPattern = lib.urlPattern;
        // Escape special regex chars except {version}
        const escapedPattern = urlPattern
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .replace('\\{version\\}', '([^/?&"\']+)');
        
        const regex = new RegExp(escapedPattern);
        const match = html.match(regex);
        
        if (match && match[1]) {
            versions[id] = match[1];
        } else {
            // Fallback: try to find version in any URL containing the package name
            const packageName = lib.package.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let fallbackRegex;
            
            if (lib.cdn === CDN_TYPES.CDNJS) {
                // cdnjs: /package/version/
                fallbackRegex = new RegExp(`/${packageName}/([\\d.]+)/`, 'i');
            } else if (lib.cdn === CDN_TYPES.UNPKG) {
                // unpkg: @version/ or @version?
                fallbackRegex = new RegExp(`${packageName}@([^/?"']+)`, 'i');
            } else if (lib.cdn === CDN_TYPES.ESMSH || lib.cdn === CDN_TYPES.JSR) {
                // esm.sh: @version? or @version'
                fallbackRegex = new RegExp(`${packageName}@([^?'"]+)`, 'i');
            }
            
            if (fallbackRegex) {
                const fallbackMatch = html.match(fallbackRegex);
                if (fallbackMatch && fallbackMatch[1]) {
                    versions[id] = fallbackMatch[1];
                }
            }
        }
    });
    
    return versions;
}

/**
 * Get the actual current version for a library from HTML
 * Falls back to registry version if not found
 */
export function getActualVersion(libraryId, htmlVersions) {
    if (htmlVersions && htmlVersions[libraryId]) {
        return htmlVersions[libraryId];
    }
    return LIBRARY_REGISTRY[libraryId]?.currentVersion;
}

/**
 * Compare two semver versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1, v2) {
    // Handle 'latest' or non-semver versions
    if (v1 === 'latest' || v2 === 'latest') return 0;
    
    const normalize = v => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
    const parts1 = normalize(v1);
    const parts2 = normalize(v2);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 < p2) return -1;
        if (p1 > p2) return 1;
    }
    return 0;
}

/**
 * Check if an update is a major version change
 */
export function isMajorUpdate(currentVersion, newVersion) {
    const getMajor = v => {
        if (v === 'latest') return null;
        const match = v.replace(/^v/, '').match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    };
    
    const currentMajor = getMajor(currentVersion);
    const newMajor = getMajor(newVersion);
    
    if (currentMajor === null || newMajor === null) return false;
    return newMajor > currentMajor;
}

// Export for use in update manager
export default {
    CDN_TYPES,
    LIBRARY_REGISTRY,
    getCheckableLibraries,
    getLibraryById,
    getLibrariesByCdn,
    buildLibraryUrl,
    getAllLibraryUrls,
    parseVersionFromUrl,
    compareVersions,
    isMajorUpdate
};
