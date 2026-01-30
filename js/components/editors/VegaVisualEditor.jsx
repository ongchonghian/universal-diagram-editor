import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GraphicWalker } from '@kanaries/graphic-walker';
import { parseVegaLiteData, inferFieldTypes } from './vega/utils.js';
import { EditorToolbar } from './common/EditorToolbar.jsx';
import { SAMPLE_DATASETS } from './vega/sampleData.js';

export const VegaVisualEditor = ({ code, onChange, onError }) => {
    const [activeView, setActiveView] = useState('chart'); // 'chart' | 'explore'
    const [data, setData] = useState([]);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(false);
    const [updateKey, setUpdateKey] = useState(0); // To force GraphicWalker remount
    const [showSampleModal, setShowSampleModal] = useState(false);
    const [gwSessionId, setGwSessionId] = useState('vega-editor-explore-session');
    
    // Refs
    const chartContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const gwStoreRef = useRef(null);

    // Parse incoming code for GraphicWalker
    useEffect(() => {
        let isMounted = true;
        
        const loadData = async () => {
            if (!code) return;
            
            setLoading(true);
            try {
                // We only need to parse data for GraphicWalker explicitly.
                // We only need to parse data for GraphicWalker explicitly.
                // vega-embed handles the spec directly.
                const { data: extractedData, geoUrl } = await parseVegaLiteData(code);
                
                if (isMounted) {
                    if (extractedData && extractedData.length > 0) {
                        console.log("Loaded Vega Data:", extractedData.length, "rows", extractedData[0]);
                        console.log("Loaded GeoUrl:", geoUrl);
                        setData(extractedData);
                        const { fields: inferredFields, coordSystem: inferredCoordSystem } = inferFieldTypes(extractedData);
                        setFields(inferredFields);
                        setUpdateKey(prev => prev + 1); // Force GW update
                        setGwSessionId(`vega-session-${Date.now()}`); // Force new session
                        
                        // If we have a background map (geoUrl), force coordinate system to geographic
                        const finalCoordSystem = geoUrl ? 'geographic' : inferredCoordSystem;

                        // Store implicit config for GW
                        gwStoreRef.current = { 
                            ...gwStoreRef.current,
                            _implicitConfig: {
                                config: { coordSystem: finalCoordSystem },
                                layout: { geoUrl }
                            }
                        };
                        console.log("Setting GraphicWalker Config:", gwStoreRef.current._implicitConfig);
                    }
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Error extracting data for Explorer:", err);
                    // Don't show global error here as it might be a valid spec that we just can't extract data from easily
                }
            } finally {
                if (isMounted) setLoading(false);
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

    const handleLoadSample = (sample) => {
        if (sample.spec) {
            onChange(JSON.stringify(sample.spec, null, 2));
            setShowSampleModal(false);
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

    const renderSampleGrid = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-4">
            {SAMPLE_DATASETS.map(sample => (
                <button
                    key={sample.id}
                    onClick={() => handleLoadSample(sample)}
                    className="flex flex-col items-center p-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-center group"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-2 group-hover:bg-indigo-200 group-hover:text-indigo-700">
                        <i className={sample.icon}></i>
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-800">
                        {sample.label}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {sample.description}
                    </span>
                </button>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full bg-slate-50">
            {/* Toolbar */}
            <EditorToolbar
                title="Vega Editor"
                onImport={() => fileInputRef.current?.click()}
                actions={[
                    {
                        label: 'Samples',
                        icon: 'fas fa-vials',
                        onClick: () => setShowSampleModal(true),
                        title: 'Load sample data'
                    },
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

                {/* Sample Data Modal */}
                {showSampleModal && (
                    <div className="absolute inset-0 z-40 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700">Load Sample Data</h3>
                                <button onClick={() => setShowSampleModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto">
                                <p className="text-sm text-slate-500 mb-4 px-2">
                                    Select a sample dataset to replace the current diagram content.
                                </p>
                                {renderSampleGrid()}
                            </div>
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
                                    keepAlive={gwSessionId}
                                    defaultConfig={gwStoreRef.current?._implicitConfig}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <i className="fas fa-table text-4xl mb-4 opacity-30"/>
                                <h3 className="text-lg font-medium text-slate-600">No Data Available</h3>
                                <p className="text-sm max-w-xs text-center mt-2 mb-6">
                                    Define distinct <code>data.values</code> or <code>data.url</code> in your spec, or use the <b>Import Data</b> button.
                                </p>
                                
                                <div className="max-w-xl w-full">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
                                        Or Try Sample Data
                                    </h4>
                                    {renderSampleGrid()}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

