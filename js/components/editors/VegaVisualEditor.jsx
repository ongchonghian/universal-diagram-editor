import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GraphicWalker } from '@kanaries/graphic-walker';
import { parseVegaLiteData, inferFieldTypes } from './vega/utils.js';
import { EditorToolbar } from './common/EditorToolbar.jsx';

export const VegaVisualEditor = ({ code, onChange, onError }) => {
    const [activeView, setActiveView] = useState('chart'); // 'chart' | 'explore'
    const [data, setData] = useState([]);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(false);
    const [updateKey, setUpdateKey] = useState(0); // To force GraphicWalker remount
    
    // Refs
    const chartContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const gwStoreRef = useRef(null);

    // Parse incoming code for GraphicWalker
    useEffect(() => {
        let isMounted = true;
        
        const loadData = async () => {
            if (!code) return;
            
            try {
                // We only need to parse data for GraphicWalker explicitly.
                // vega-embed handles the spec directly.
                const extractedData = await parseVegaLiteData(code);
                
                if (isMounted) {
                    if (extractedData.length > 0) {
                        setData(extractedData);
                        setFields(inferFieldTypes(extractedData));
                        setUpdateKey(prev => prev + 1); // Force GW update
                    }
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Error extracting data for Explorer:", err);
                    // Don't show global error here as it might be a valid spec that we just can't extract data from easily
                }
            }
        };

        loadData();

        return () => { isMounted = false; };
    }, [code]);

    // Handle Chart Rendering
    useEffect(() => {
        if (activeView === 'chart' && code && chartContainerRef.current) {
            let view;
            
            const renderChart = async () => {
                try {
                    // Dynamically import vega-embed to avoid top-level load crashes
                    const vegaEmbed = (await import('vega-embed')).default;
                    
                    let spec;
                    try {
                        spec = JSON.parse(code);
                    } catch (e) {
                        // Ignore parsing errors while typing
                        return;
                    }
                    
                    const result = await vegaEmbed(chartContainerRef.current, spec, {
                        mode: 'vega-lite',
                        actions: {
                            export: true,
                            source: false,
                            compiled: false,
                            editor: false
                        },
                        width: 'container', // Attempt to fill container
                        renderer: 'svg'     // Sharper rendering
                    });
                    view = result.view;
                } catch (err) {
                    console.error("Vega Embed Error:", err);
                    if (err.message && err.message.includes('Expected')) {
                        // JSON parse error usually
                        return; 
                    }
                    onError && onError("Preview Error: " + err.message);
                }
            };
            
            renderChart();
            
            return () => {
                if (view) view.finalize();
            };
        }
    }, [code, activeView]);

    const handleImportData = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);

        try {
            // Dynamically import papaparse
            const Papa = (await import('papaparse')).default;

            const applyDataToSpec = (newData) => {
                 try {
                    let spec = {};
                    try {
                        spec = JSON.parse(code);
                    } catch {
                        // if Code is empty or invalid, start fresh
                        spec = {
                            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
                            "mark": "bar",
                            "encoding": {}
                        };
                    }

                    spec.data = { values: newData };
                    
                    // Reset file input
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    
                    onChange(JSON.stringify(spec, null, 2));
                    setLoading(false);
                    setActiveView('explore'); // Auto-switch to Explorer
                } catch (err) {
                    onError("Failed to update execution with new data: " + err.message);
                    setLoading(false);
                }
            };

            if (file.name.endsWith('.csv')) {
                Papa.parse(file, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.data && results.data.length > 0) {
                            applyDataToSpec(results.data);
                        } else {
                            onError("Imported CSV appears empty.");
                            setLoading(false);
                        }
                    },
                    error: (err) => {
                        onError("CSV Parse Error: " + err.message);
                        setLoading(false);
                    }
                });
            } else if (file.name.endsWith('.json')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const json = JSON.parse(ev.target.result);
                        applyDataToSpec(Array.isArray(json) ? json : [json]);
                    } catch (err) {
                        onError("Invalid JSON file.");
                        setLoading(false);
                    }
                };
                reader.readAsText(file);
            } else {
                onError("Unsupported file format. Please import .csv or .json");
                setLoading(false);
            }
        } catch (err) {
            console.error("Chunk load error:", err);
            onError("Failed to load generic parser libraries. Please check your connection.");
            setLoading(false);
        }
    };

    const handleExportAnalysis = useCallback(async () => {
        if (gwStoreRef.current) {
            try {
                // Attempt to export the spec from GraphicWalker
                // explicit exportCode implementation depends on version, checking standard API
                const exportedSpec = await gwStoreRef.current.exportCode();
                if (exportedSpec) {
                    onChange(JSON.stringify(exportedSpec, null, 2));
                    setActiveView('chart');
                    // Optional: Notify user
                }
            } catch (err) {
                console.error("Failed to export GraphicWalker spec:", err);
                onError("Could not export analysis: " + err.message);
            }
        }
    }, [onChange, onError]);

    return (
        <div className="flex flex-col h-full w-full bg-slate-50">
            {/* Toolbar */}
            <EditorToolbar
                title="Vega Editor"
                onImport={() => fileInputRef.current?.click()}
                actions={[
                    ...(activeView === 'explore' ? [{
                        label: 'Save to Diagram',
                        icon: 'fas fa-save',
                        onClick: handleExportAnalysis,
                        primary: true,
                        title: 'Save current analysis as the chart spec'
                    }] : [])
                ]}
            >
                {/* View Toggles */}
                 <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveView('chart')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            activeView === 'chart' 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <i className="fas fa-chart-bar mr-2"/>
                        Chart Preview
                    </button>
                    <button
                        onClick={() => setActiveView('explore')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            activeView === 'explore' 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <i className="fas fa-compass mr-2"/>
                        Data Explorer
                    </button>
                </div>
            </EditorToolbar>

            {/* Hidden Input for Import */}
            <input 
                type="file" 
                ref={fileInputRef}
                accept=".csv,.json"
                className="hidden"
                onChange={handleImportData}
            />

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center">
                        <div className="flex flex-col items-center">
                            <i className="fas fa-circle-notch fa-spin text-indigo-500 text-3xl mb-3"/>
                            <span className="text-slate-600 font-medium">Processing...</span>
                        </div>
                    </div>
                )}

                {/* Chart View */}
                <div 
                    className={`h-full w-full p-4 overflow-auto flex items-center justify-center transition-opacity duration-300 ${
                        activeView === 'chart' ? 'opacity-100 visible' : 'opacity-0 invisible absolute inset-0'
                    }`}
                >
                    {code ? (
                        <div className="w-full h-full flex flex-col">
                           <div ref={chartContainerRef} className="w-full flex-1" style={{ minHeight: '300px' }} />
                        </div>
                    ) : (
                         <div className="text-center text-slate-400">
                            <i className="fas fa-code text-4xl mb-4 opacity-30"/>
                            <p>Enter Vega-Lite JSON to render chart</p>
                        </div>
                    )}
                </div>

                {/* Explore View (Rath) */}
                {activeView === 'explore' && (
                    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
                        {data.length > 0 ? (
                            <div className="flex-1 overflow-auto">
                                <GraphicWalker
                                    key={updateKey}
                                    data={data}
                                    fields={fields}
                                    hideProfilers={false}
                                    storeRef={gwStoreRef}
                                    keepAlive="vega-editor-explore-session"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <i className="fas fa-table text-4xl mb-4 opacity-30"/>
                                <h3 className="text-lg font-medium text-slate-600">No Data Available</h3>
                                <p className="text-sm max-w-xs text-center mt-2">
                                    Define distinct <code>data.values</code> or <code>data.url</code> in your spec, or use the <b>Import Data</b> button.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

