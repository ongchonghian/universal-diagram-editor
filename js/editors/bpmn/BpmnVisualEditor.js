// BPMN Visual Editor Component
// Uses bpmn-js library for visual BPMN diagram editing

import { html, useState, useEffect, useRef } from '../react-helpers.js';
import { loadScript, loadCSS } from '../utils.js';

/**
 * Visual BPMN editor using bpmn-js modeler
 * @param {Object} props
 * @param {string} props.xml - BPMN XML content
 * @param {Function} props.onChange - Callback when XML changes
 * @param {Function} props.onError - Callback for errors
 */
export const BpmnVisualEditor = ({ xml, onChange, onError }) => {
    const containerRef = useRef(null);
    const modelerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const initEditor = async () => {
            try {
                // Load BPMN-JS CSS
                loadCSS('https://unpkg.com/bpmn-js@16.4.0/dist/assets/diagram-js.css');
                loadCSS('https://unpkg.com/bpmn-js@16.4.0/dist/assets/bpmn-font/css/bpmn.css');
                
                // Load BPMN-JS library if not already loaded
                if (!window.BpmnJS) {
                    await loadScript('https://unpkg.com/bpmn-js@16.4.0/dist/bpmn-modeler.production.min.js');
                }

                if (!containerRef.current || !window.BpmnJS) return;

                // Create modeler instance
                const modeler = new window.BpmnJS({
                    container: containerRef.current,
                    keyboard: { bindTo: window }
                });

                modelerRef.current = modeler;

                // Listen for changes and sync back to code
                modeler.on('commandStack.changed', async () => {
                    try {
                        const { xml } = await modeler.saveXML({ format: true });
                        onChange(xml);
                    } catch (err) {
                        console.error('Error exporting XML', err);
                    }
                });

                setIsReady(true);
                
                // Import initial XML
                if (xml) {
                    try {
                        await modeler.importXML(xml);
                    } catch (err) {
                        console.error('Initial Import Error', err);
                        if (onError) onError(err.message);
                    }
                }

            } catch (e) {
                console.error("Failed to load BPMN JS", e);
                if (onError) onError("Failed to load visual editor resources.");
            }
        };

        initEditor();

        // Cleanup on unmount
        return () => {
            if (modelerRef.current) modelerRef.current.destroy();
        };
    }, []);

    // Handle external XML updates
    useEffect(() => {
        if (modelerRef.current && xml && isReady) {
            modelerRef.current.saveXML({ format: true }).then((result) => {
                if (result.xml !== xml) {
                    modelerRef.current.importXML(xml).catch(err => {
                        console.error('External Update Import Error', err);
                    });
                }
            }).catch(() => {
                modelerRef.current.importXML(xml).catch(console.error);
            });
        }
    }, [xml, isReady]);

    return html`
        <div className="w-full h-full relative">
            ${!isReady && html`
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20">
                    <div className="loader mb-3"></div>
                    <span className="text-slate-500 text-xs">Loading Editor...</span>
                </div>
            `}
            <div ref=${containerRef} className="bjs-container" style=${{ visibility: isReady ? 'visible' : 'hidden' }} />
        </div>
    `;
};

export default BpmnVisualEditor;
