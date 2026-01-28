/**
 * Utilities for Vega/Vega-Lite editor
 */

// Infer field types from data array
export function inferFieldTypes(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    
    const sample = data[0];
    return Object.keys(sample).map(key => {
        const value = sample[key];
        let type = 'nominal';
        if (typeof value === 'number') type = 'quantitative';
        else if (value instanceof Date) type = 'temporal';
        else if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.length > 5) type = 'temporal'; // Simple check to avoid short strings like "1" being treated as date
        
        return {
            fid: key,
            name: key,
            semanticType: type,
            analyticType: type === 'quantitative' ? 'measure' : 'dimension'
        };
    });
}

// Parse Vega-Lite spec to extract data
export async function parseVegaLiteData(specCode) {
    try {
        const spec = JSON.parse(specCode);
        
        // 1. Inline values
        if (spec.data && Array.isArray(spec.data.values)) {
            return spec.data.values;
        }
        
        // 2. URL data
        if (spec.data && spec.data.url) {
            try {
                const response = await fetch(spec.data.url);
                if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);
                
                const contentType = response.headers.get("content-type");
                
                // Handle JSON
                if (contentType && contentType.includes("application/json") || spec.data.url.endsWith('.json')) {
                    const jsonData = await response.json();
                    return Array.isArray(jsonData) ? jsonData : []; // GraphicWalker needs an array
                }
                
                // Handle CSV (simple fallback if no library)
                // For a robust solution we might want a CSV parser, but here is a simple one for now
                if (contentType && contentType.includes("text/csv") || spec.data.url.endsWith('.csv')) {
                    const text = await response.text();
                    return parseCsv(text);
                }

                // Default to JSON if unknown
                const json = await response.json();
                return Array.isArray(json) ? json : [];
            } catch (err) {
                console.warn("External data fetch failed:", err);
                return [];
            }
        }
    } catch (e) {
        console.error("Failed to parse Vega-Lite spec", e);
    }
    return [];
}

// Simple CSV Parser fallback
function parseCsv(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    // Naive split by comma (doesn't handle quoted commas)
    // TODO: Use a proper CSV library if needed
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
            // Try to convert to number if possible
            const val = values[i]?.trim();
            obj[header] = isNaN(Number(val)) ? val : Number(val);
        });
        return obj;
    });
}
