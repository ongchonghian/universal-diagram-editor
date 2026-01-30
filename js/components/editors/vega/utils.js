/**
 * Utilities for Vega/Vega-Lite editor
 */

// Infer field types from data array
export function inferFieldTypes(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return { fields: [], coordSystem: 'generic' };
    
    const sample = data[0];
    let hasGeo = false;

    const fields = Object.keys(sample).map(key => {
        const value = sample[key];
        let type = 'nominal';
        if (typeof value === 'number') type = 'quantitative';
        else if (value instanceof Date) type = 'temporal';
        else if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.length > 5) type = 'temporal'; // Simple check to avoid short strings like "1" being treated as date
        
        const lowerKey = key.toLowerCase();
        let geoRole = undefined;
        let analyticType = type === 'quantitative' ? 'measure' : 'dimension';

        if (['latitude', 'lat'].includes(lowerKey)) {
            geoRole = 'latitude';
            analyticType = 'dimension';
            hasGeo = true;
        }
        if (['longitude', 'lng', 'long'].includes(lowerKey)) {
             geoRole = 'longitude';
             analyticType = 'dimension';
             hasGeo = true;
        }

        return {
            fid: key,
            name: key,
            semanticType: type,
            analyticType: analyticType,
            geoRole: geoRole
        };
    });

    return {
        fields,
        coordSystem: hasGeo ? 'geographic' : 'generic'
    };
}

import { feature } from 'topojson-client';

// Parse Vega-Lite spec to extract data
export async function parseVegaLiteData(specCode) {
    try {
        console.log("Parsing Vega-Lite spec...");
        const spec = JSON.parse(specCode);
        let geoUrl = undefined;

        const extractFromDataObject = async (dataObj) => {
            if (!dataObj) return null;


            // 1. Inline values
            if (Array.isArray(dataObj.values)) {
                return dataObj.values;
            }

            // 2. URL data
            if (dataObj.url) {
                // Check if this is explicitly a map topology to capture geoUrl
                if (dataObj.format && (dataObj.format.type === 'topojson' || (dataObj.format.type === 'json' && dataObj.format.feature))) {
                    if (!geoUrl) {
                        console.log("Found explicitly typed TopoJSON/GeoJSON:", dataObj.url);
                        
                        // Manually fetch and process TopoJSON to ensure IDs are in properties
                        // and the correct feature layer is selected.
                        const processedUrl = await fetchAndProcessTopology(dataObj.url, dataObj.format.feature);
                        
                        // Check if we captured valid GeoJSON
                        if (processedUrl) {
                             geoUrl = {
                                type: 'GeoJSON',
                                url: processedUrl,
                                dataKey: 'id' // We explicitly ensured 'id' is in properties
                            };
                        } else {
                             // Fallback
                             geoUrl = {
                                type: dataObj.format.type === 'topojson' ? 'TopoJSON' : 'GeoJSON',
                                url: dataObj.url,
                                feature: dataObj.format.feature
                            };
                        }
                    }
                    // Do not return this as tabular data for GW
                    return null;
                }

                try {
                    console.log("Fetching data from:", dataObj.url);
                    const response = await fetch(dataObj.url);
                    if (!response.ok) {
                        console.warn("Fetch failed:", response.status);
                        return null;
                    }

                    const contentType = response.headers.get("content-type");

                    // Handle JSON
                    if ((contentType && contentType.includes("application/json")) || dataObj.url.endsWith('.json')) {
                        const jsonData = await response.json();
                        // GraphicWalker requires array data. If it's TopoJSON (common in geoshapes), ignore it.
                        if (jsonData.type === 'Topology' || !Array.isArray(jsonData)) return null;
                        return jsonData;
                    }

                    // Handle CSV/TSV using Papaparse
                    if ((contentType && (contentType.includes("text/csv") || contentType.includes("text/tab-separated-values"))) || 
                        dataObj.url.endsWith('.csv') || dataObj.url.endsWith('.tsv')) {
                        
                        const text = await response.text();
                        console.log(`Fetched ${text.length} chars from ${dataObj.url}`);
                        console.log("Preview text:", text.substring(0, 100));

                        // Dynamically import papaparse with AMD workaround
                        // This prevents "Can only have one anonymous define call" error if Monaco loader is present
                        const existingDefine = window.define;
                        if (window.define) window.define = undefined;
                        
                        let Papa;
                        try {
                            const papaModule = await import('papaparse');
                            Papa = papaModule.default || papaModule;
                        } finally {
                            if (existingDefine) window.define = existingDefine;
                        }

                        if (!Papa || typeof Papa.parse !== 'function') {
                             console.error("PapaParse import failed:", Papa);
                             return []; 
                        }

                        const parseResult = Papa.parse(text, {
                            header: true,
                            dynamicTyping: true,
                            skipEmptyLines: true,
                            transformHeader: h => h.trim() // Ensure headers are clean
                        });
                        
                        console.log("Papa Parse Result:", parseResult);
                        if (parseResult.errors.length > 0) {
                             console.warn("DSV Parse Errors:", parseResult.errors);
                        }
                        
                        return parseResult.data || [];
                    }
                    
                    // Fallback to JSON check
                    const json = await response.json();
                    return Array.isArray(json) ? json : null;
                } catch (err) {
                    console.warn("External data fetch failed for url:", dataObj.url, err);
                    return null;
                }
            }
            return null;
        };
        
        // 1. Try top-level data
        let result = await extractFromDataObject(spec.data);
        if (result && result.length > 0) return { data: result, geoUrl };
        
        // 2. Try layers (return the first valid tabular dataset found)
        if (spec.layer && Array.isArray(spec.layer)) {
            for (const layer of spec.layer) {
                if (layer.data) {
                    result = await extractFromDataObject(layer.data);
                    if (result && result.length > 0) return { data: result, geoUrl };
                }
            }
        }

        // 3. Try lookup transforms (if data is topology, lookup often contains the tabular data)
        if (spec.transform && Array.isArray(spec.transform)) {
            for (const t of spec.transform) {
                if (t.lookup && t.from && t.from.data) {
                    const res = await extractFromDataObject(t.from.data);
                     if (res && res.length > 0 && !result) {
                        result = res;
                    }
                }
            }
        }

        // 4. Try concat/vconcat/hconcat if needed (simple check)
        const checkConcat = async (list) => {
             for (const item of list) {
                 if (item.data) {
                     const res = await extractFromDataObject(item.data);
                     if (res) return res;
                 }
             }
             return null;
        };
        
        if (spec.concat) {
            const res = await checkConcat(spec.concat);
             if (res && !result) result = res;
        }
        if (spec.vconcat) {
            const res = await checkConcat(spec.vconcat);
             if (res && !result) result = res;
        }
        if (spec.hconcat) {
            const res = await checkConcat(spec.hconcat);
             if (res && !result) result = res;
        }

        return {
            data: result || [],
            geoUrl
        };

    } catch (e) {
        console.error("Failed to parse Vega-Lite spec", e);
    }
    return { data: [], geoUrl: undefined };
}

// Fetch and process TopoJSON/GeoJSON to ensure it's compatible with GraphicWalker
async function fetchAndProcessTopology(url, featureName) {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const json = await response.json();

        let geojson;
        if (json.type === 'Topology') {
            const objectKey = featureName || Object.keys(json.objects)[0];
            if (!json.objects[objectKey]) {
                console.warn(`Feature ${featureName} not found in TopoJSON`);
                return null;
            }
            console.log(`Converting TopoJSON feature '${objectKey}' to GeoJSON...`);
            geojson = feature(json, json.objects[objectKey]);
        } else if (json.type === 'FeatureCollection') {
            geojson = json;
        } else {
            return null;
        }

        // Ensure IDs are in properties for matching
        if (geojson && geojson.features) {
            console.log(`Patching ${geojson.features.length} features with IDs...`);
            geojson.features.forEach(f => {
                f.properties = f.properties || {};
                
                // 1. Copy root ID to properties.id if missing
                if (f.id !== undefined && f.properties.id === undefined) {
                    f.properties.id = f.id;
                }
                
                // 2. Also copy ID to 'name' as a fallback, because GraphicWalker often defaults to 'name'
                if (f.properties.name === undefined && (f.properties.id !== undefined)) {
                    f.properties.name = f.properties.id;
                }
            });
        }

        // Create Blob URL
        const blob = new Blob([JSON.stringify(geojson)], { type: 'application/json' });
        const blobUrl = URL.createObjectURL(blob);
        console.log("Created Blob URL for GeoJSON:", blobUrl);
        return blobUrl;

    } catch (e) {
        console.error("Error processing Topology:", e);
        return null;
    }
}


