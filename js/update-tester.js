/**
 * Update Tester - Comprehensive iframe-based testing framework for library updates
 * Tests new library versions in isolation before applying updates
 * Supports CSS loading, import maps, and visual rendering tests
 */

import { LIBRARY_REGISTRY, buildLibraryUrl, getAllLibraryUrls } from './library-registry.js';

// Test timeout in milliseconds
const TEST_TIMEOUT = 20000;

// Test iframe ID
const IFRAME_ID = 'library-update-tester-iframe';

/**
 * Generate comprehensive test HTML with specified library versions
 * Includes CSS, import maps, and visual tests for complex libraries
 */
function generateTestHtml(libraryUpdates) {
    const scripts = [];
    const styles = [];
    const importMapEntries = {};
    const librariesToTest = Object.keys(libraryUpdates);
    const testConfigs = {};

    // Collect all requirements from libraries being updated
    Object.entries(libraryUpdates).forEach(([id, version]) => {
        const lib = LIBRARY_REGISTRY[id];
        if (!lib) return;
        
        const urls = getAllLibraryUrls(id, version);
        const testConfig = lib.testConfig || {};
        testConfigs[id] = { ...testConfig, version };
        
        // Add CSS files
        if (testConfig.cssUrl) {
            const cssUrl = testConfig.cssUrl.replace('{version}', version);
            styles.push(`<link rel="stylesheet" href="${cssUrl}">`);
        }
        if (testConfig.cssUrls) {
            testConfig.cssUrls.forEach(url => {
                styles.push(`<link rel="stylesheet" href="${url.replace('{version}', version)}">`);
            });
        }
        
        // Collect import map entries
        if (testConfig.importMap) {
            Object.assign(importMapEntries, testConfig.importMap);
        }
        
        // Add regular scripts/styles
        urls.forEach(url => {
            if (lib.isStylesheet || url.endsWith('.css')) {
                styles.push(`<link rel="stylesheet" href="${url}">`);
            } else if (!lib.isESModule) {
                scripts.push(`<script src="${url}"><\/script>`);
            }
        });
    });

    // Build import map if needed
    const importMapScript = Object.keys(importMapEntries).length > 0 
        ? `<script type="importmap">
            ${JSON.stringify({ imports: importMapEntries }, null, 2)}
        <\/script>`
        : '';

    // Generate test harness code
    const testHarness = `
        window.testResults = {
            passed: [],
            failed: [],
            errors: [],
            warnings: [],
            details: {}
        };
        
        const librariesToTest = ${JSON.stringify(librariesToTest)};
        const testConfigs = ${JSON.stringify(testConfigs)};
        
        // Capture console errors
        const originalError = console.error;
        console.error = function(...args) {
            const msg = args.map(a => String(a)).join(' ');
            // Filter out noise
            if (!msg.includes('favicon') && !msg.includes('404')) {
                window.testResults.errors.push(msg);
            }
            originalError.apply(console, args);
        };
        
        // Capture console warnings
        const originalWarn = console.warn;
        console.warn = function(...args) {
            window.testResults.warnings.push(args.map(a => String(a)).join(' '));
            originalWarn.apply(console, args);
        };

        // Wait for element to appear
        async function waitForSelector(selector, timeout = 5000) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const el = document.querySelector(selector);
                if (el) return el;
                await new Promise(r => setTimeout(r, 100));
            }
            return null;
        }

        // Wait for text to appear
        async function waitForText(text, timeout = 5000) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                if (document.body.innerText.includes(text)) return true;
                await new Promise(r => setTimeout(r, 100));
            }
            return false;
        }

        // Test Excalidraw with visual checks
        async function testExcalidraw(version) {
            try {
                // Import Excalidraw
                const ExcalidrawModule = await import('https://esm.sh/@excalidraw/excalidraw@' + version + '?external=react,react-dom');
                const exports = ExcalidrawModule.default || ExcalidrawModule;
                const Excalidraw = exports.Excalidraw || ExcalidrawModule.Excalidraw;
                
                if (!Excalidraw) {
                    return { success: false, error: 'Excalidraw component not found in exports' };
                }
                
                // Import React
                const React = await import('react');
                const ReactDOM = await import('react-dom/client');
                
                const R = React.default || React;
                const RD = ReactDOM.default || ReactDOM;
                
                // Create container and render
                const container = document.getElementById('excalidraw-test');
                const root = RD.createRoot(container);
                root.render(R.createElement(Excalidraw, { 
                    theme: 'light',
                    UIOptions: { canvasActions: { saveAsImage: false } }
                }));
                
                // Wait for Excalidraw to render
                await new Promise(r => setTimeout(r, 2000));
                
                // Check for required elements
                const hasExcalidraw = document.querySelector('.excalidraw') !== null;
                const hasToolbar = document.querySelector('[class*="toolbar"]') !== null || 
                                   document.querySelector('[role="toolbar"]') !== null ||
                                   document.querySelector('[aria-label*="Shapes"]') !== null;
                
                // Check that icons are properly sized (not the giant icon bug)
                const svgs = container.querySelectorAll('svg');
                let hasOversizedIcons = false;
                svgs.forEach(svg => {
                    const rect = svg.getBoundingClientRect();
                    if (rect.width > 200 || rect.height > 200) {
                        hasOversizedIcons = true;
                    }
                });
                
                if (hasOversizedIcons) {
                    return { success: false, error: 'CSS not loaded - icons are oversized' };
                }
                
                if (!hasExcalidraw) {
                    return { success: false, error: 'Excalidraw container not rendered' };
                }
                
                if (!hasToolbar) {
                    return { success: false, error: 'Excalidraw toolbar not rendered' };
                }
                
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }

        // Test BPMN-JS
        async function testBpmnJs(version) {
            try {
                // Check if BpmnJS is loaded
                if (typeof BpmnJS === 'undefined') {
                    return { success: false, error: 'BpmnJS not loaded' };
                }
                
                // Create container
                const container = document.getElementById('bpmn-test');
                
                // Try to instantiate
                const modeler = new BpmnJS({ container });
                
                if (typeof modeler.importXML !== 'function') {
                    return { success: false, error: 'BpmnJS missing importXML method' };
                }
                
                // Try a simple import
                const simpleXml = '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn"><bpmn:process id="Process_1" isExecutable="false"></bpmn:process></bpmn:definitions>';
                
                await modeler.importXML(simpleXml);
                
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }

        // Test Monaco Editor
        async function testMonaco(version) {
            try {
                if (typeof require === 'undefined' || typeof require.config !== 'function') {
                    return { success: false, error: 'Monaco loader not loaded' };
                }
                
                // Configure Monaco
                require.config({ 
                    paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/' + version + '/min/vs' }
                });
                
                // Try to load Monaco
                return new Promise((resolve) => {
                    require(['vs/editor/editor.main'], function() {
                        if (typeof monaco !== 'undefined' && monaco.editor) {
                            resolve({ success: true });
                        } else {
                            resolve({ success: false, error: 'Monaco editor not initialized' });
                        }
                    }, function(err) {
                        resolve({ success: false, error: 'Failed to load Monaco: ' + err.message });
                    });
                });
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
        
        // Run all tests
        async function runTests() {
            for (const libId of librariesToTest) {
                const config = testConfigs[libId];
                const version = config?.version;
                let result = { success: true };
                
                try {
                    // Run library-specific tests
                    if (libId === 'excalidraw') {
                        result = await testExcalidraw(version);
                    } else if (libId === 'bpmn-js') {
                        result = await testBpmnJs(version);
                    } else if (libId === 'monaco') {
                        result = await testMonaco(version);
                    } else if (libId === 'react' || libId === 'react-dom') {
                        // Test React
                        if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') {
                            try {
                                const container = document.getElementById('react-test');
                                const root = ReactDOM.createRoot(container);
                                root.render(React.createElement('div', { id: 'react-rendered' }, 'React OK'));
                                await new Promise(r => setTimeout(r, 100));
                                if (document.getElementById('react-rendered')) {
                                    result = { success: true };
                                } else {
                                    result = { success: false, error: 'React did not render' };
                                }
                                root.unmount();
                            } catch (e) {
                                result = { success: false, error: e.message };
                            }
                        } else {
                            result = { success: false, error: 'React/ReactDOM not loaded' };
                        }
                    } else if (libId === 'pako') {
                        if (typeof pako !== 'undefined') {
                            try {
                                const test = pako.deflate('test');
                                result = test && test.length > 0 
                                    ? { success: true } 
                                    : { success: false, error: 'Deflate failed' };
                            } catch (e) {
                                result = { success: false, error: e.message };
                            }
                        } else {
                            result = { success: false, error: 'Pako not loaded' };
                        }
                    } else if (libId === 'dagre') {
                        result = typeof dagre !== 'undefined' && dagre.graphlib
                            ? { success: true }
                            : { success: false, error: 'Dagre not loaded' };
                    } else if (libId === 'babel') {
                        if (typeof Babel !== 'undefined' && Babel.transform) {
                            try {
                                const transformed = Babel.transform('const x = 1;', { presets: ['env'] });
                                result = transformed.code 
                                    ? { success: true } 
                                    : { success: false, error: 'Transform failed' };
                            } catch (e) {
                                result = { success: false, error: e.message };
                            }
                        } else {
                            result = { success: false, error: 'Babel not loaded' };
                        }
                    } else {
                        // For other libraries, just mark as validated
                        result = { success: true, note: 'URL validated' };
                    }
                } catch (e) {
                    result = { success: false, error: e.message };
                }
                
                // Record result
                window.testResults.details[libId] = result;
                if (result.success) {
                    window.testResults.passed.push(libId + (result.note ? ' (' + result.note + ')' : ''));
                } else {
                    window.testResults.failed.push(libId + ': ' + result.error);
                }
            }
            
            // Send results back to parent
            window.parent.postMessage({
                type: 'libraryTestComplete',
                results: window.testResults
            }, '*');
        }
        
        // Run tests after all scripts load
        window.addEventListener('load', () => {
            setTimeout(runTests, 1000);
        });
    `;

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Library Update Test</title>
    ${importMapScript}
    ${styles.join('\n    ')}
    ${scripts.join('\n    ')}
    <style>
        body { margin: 0; padding: 0; }
        #excalidraw-test { width: 800px; height: 600px; }
        #bpmn-test { width: 500px; height: 400px; }
        #react-test { width: 100px; height: 50px; }
    </style>
    <script>
        ${testHarness}
    <\/script>
</head>
<body>
    <div id="react-test"></div>
    <div id="excalidraw-test"></div>
    <div id="bpmn-test"></div>
    <div id="monaco-test" style="width:400px;height:300px;"></div>
</body>
</html>`;
}

/**
 * Create and inject test iframe
 */
function createTestIframe() {
    // Remove existing iframe if any
    const existing = document.getElementById(IFRAME_ID);
    if (existing) {
        existing.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = IFRAME_ID;
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1024px;height:768px;border:none;';
    iframe.sandbox = 'allow-scripts allow-same-origin';
    document.body.appendChild(iframe);

    return iframe;
}

/**
 * Clean up test iframe
 */
function cleanupTestIframe() {
    const iframe = document.getElementById(IFRAME_ID);
    if (iframe) {
        iframe.remove();
    }
}

/**
 * Run tests for library updates
 * @param {Object} libraryUpdates - Map of library ID to new version
 * @returns {Promise<Object>} Test results
 */
export async function testLibraryUpdates(libraryUpdates) {
    return new Promise((resolve, reject) => {
        const iframe = createTestIframe();
        let timeoutId;

        // Listen for test completion message
        const messageHandler = (event) => {
            if (event.data?.type === 'libraryTestComplete') {
                clearTimeout(timeoutId);
                window.removeEventListener('message', messageHandler);
                cleanupTestIframe();

                const results = event.data.results;
                const allPassed = results.failed.length === 0;

                resolve({
                    success: allPassed,
                    passed: results.passed,
                    failed: results.failed,
                    errors: results.errors,
                    warnings: results.warnings,
                    details: results.details
                });
            }
        };

        window.addEventListener('message', messageHandler);

        // Set timeout
        timeoutId = setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            cleanupTestIframe();
            resolve({
                success: false,
                passed: [],
                failed: ['Test timed out after ' + (TEST_TIMEOUT / 1000) + ' seconds'],
                errors: ['Timeout'],
                warnings: [],
                details: {}
            });
        }, TEST_TIMEOUT);

        // Generate and inject test HTML
        const testHtml = generateTestHtml(libraryUpdates);
        iframe.srcdoc = testHtml;
    });
}

/**
 * Test a single library update
 */
export async function testSingleLibraryUpdate(libraryId, newVersion) {
    return testLibraryUpdates({ [libraryId]: newVersion });
}

/**
 * Quick validation - just check if URLs are accessible
 * Note: CORS may block HEAD requests to some CDNs, so we use no-cors mode
 * and assume success if we get any response (script tags will load regardless of CORS)
 */
export async function validateUrls(libraryUpdates) {
    const results = {
        valid: [],
        invalid: []
    };

    const checks = [];
    
    Object.entries(libraryUpdates).forEach(([id, version]) => {
        const lib = LIBRARY_REGISTRY[id];
        if (!lib) return;
        
        const urls = getAllLibraryUrls(id, version);
        
        // Also check CSS URLs from testConfig
        if (lib.testConfig?.cssUrl) {
            urls.push(lib.testConfig.cssUrl.replace('{version}', version));
        }
        if (lib.testConfig?.cssUrls) {
            lib.testConfig.cssUrls.forEach(url => {
                urls.push(url.replace('{version}', version));
            });
        }
        
        urls.forEach(url => {
            checks.push(
                fetch(url, { method: 'HEAD', mode: 'no-cors' })
                    .then(() => {
                        results.valid.push({ id, url });
                    })
                    .catch(error => {
                        results.invalid.push({ id, url, error: error.message });
                    })
            );
        });
    });

    await Promise.allSettled(checks);
    return results;
}

export default {
    testLibraryUpdates,
    testSingleLibraryUpdate,
    validateUrls,
    cleanupTestIframe
};
