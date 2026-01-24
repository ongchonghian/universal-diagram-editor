// Unhandled Error Logger
// Tracks error patterns that couldn't be parsed for future improvement

const STORAGE_KEY = 'kroki_unhandled_errors';
const MAX_ENTRIES = 100;

/**
 * Logger for tracking unhandled error patterns
 * Stores in localStorage for developer review
 */
class UnhandledErrorLogger {
    constructor() {
        this.storageKey = STORAGE_KEY;
        this.maxEntries = MAX_ENTRIES;
    }
    
    /**
     * Log an error that couldn't be fully parsed
     * @param {string} errorText - Original error message
     * @param {string} diagramType - Type of diagram
     * @param {Object} parsedResult - What we managed to parse
     */
    log(errorText, diagramType, parsedResult = {}) {
        // Only log if we failed to extract a line number
        if (parsedResult.line) {
            return; // Successfully parsed, no need to log
        }
        
        try {
            const entry = {
                id: this.generateId(),
                timestamp: Date.now(),
                diagramType: diagramType || 'unknown',
                errorText: this.truncate(errorText, 500),
                parsed: {
                    line: parsedResult.line,
                    column: parsedResult.column,
                    code: parsedResult.code,
                    expected: parsedResult.expected,
                    found: parsedResult.found
                }
            };
            
            this.append(entry);
            
            // Also log to console in development
            if (this.isDevelopment()) {
                console.warn('[ErrorLogger] Unhandled error pattern:', {
                    diagramType,
                    errorPreview: this.truncate(errorText, 100)
                });
            }
        } catch (e) {
            // Silently fail - logging shouldn't break the app
            console.debug('[ErrorLogger] Failed to log error:', e);
        }
    }
    
    /**
     * Append entry to storage
     * @param {Object} entry - Error entry
     */
    append(entry) {
        const stored = this.getAll();
        
        // Check for duplicate (same error text and diagram type within last hour)
        const isDuplicate = stored.some(e => 
            e.diagramType === entry.diagramType &&
            e.errorText === entry.errorText &&
            (entry.timestamp - e.timestamp) < 3600000 // 1 hour
        );
        
        if (isDuplicate) {
            return; // Don't store duplicate
        }
        
        stored.push(entry);
        
        // Keep only recent entries
        while (stored.length > this.maxEntries) {
            stored.shift();
        }
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(stored));
        } catch (e) {
            // localStorage might be full or unavailable
            console.debug('[ErrorLogger] Storage error:', e);
        }
    }
    
    /**
     * Get all logged errors
     * @returns {Array} All error entries
     */
    getAll() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }
    
    /**
     * Get errors grouped by diagram type
     * @returns {Object} Errors grouped by diagram type with counts
     */
    getPatterns() {
        const all = this.getAll();
        const grouped = {};
        
        for (const entry of all) {
            const type = entry.diagramType;
            if (!grouped[type]) {
                grouped[type] = {
                    count: 0,
                    samples: []
                };
            }
            grouped[type].count++;
            
            // Keep up to 5 sample error texts per type
            if (grouped[type].samples.length < 5) {
                const exists = grouped[type].samples.some(s => s.errorText === entry.errorText);
                if (!exists) {
                    grouped[type].samples.push({
                        errorText: entry.errorText,
                        timestamp: entry.timestamp
                    });
                }
            }
        }
        
        return grouped;
    }
    
    /**
     * Get summary statistics
     * @returns {Object} Statistics
     */
    getStats() {
        const all = this.getAll();
        const patterns = this.getPatterns();
        
        return {
            totalErrors: all.length,
            diagramTypes: Object.keys(patterns).length,
            byType: Object.entries(patterns).map(([type, data]) => ({
                type,
                count: data.count
            })).sort((a, b) => b.count - a.count),
            oldestEntry: all.length > 0 ? new Date(all[0].timestamp).toISOString() : null,
            newestEntry: all.length > 0 ? new Date(all[all.length - 1].timestamp).toISOString() : null
        };
    }
    
    /**
     * Clear all logged errors
     */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('[ErrorLogger] Cleared all logged errors');
        } catch (e) {
            console.debug('[ErrorLogger] Failed to clear:', e);
        }
    }
    
    /**
     * Export errors as JSON for analysis
     * @returns {string} JSON string
     */
    export() {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            stats: this.getStats(),
            errors: this.getAll()
        }, null, 2);
    }
    
    /**
     * Print help for using the logger
     */
    help() {
        console.log(`
=== Unhandled Error Logger ===

Commands:
  window.errorLogger.getStats()     - Get summary statistics
  window.errorLogger.getPatterns()  - Get errors grouped by diagram type
  window.errorLogger.getAll()       - Get all logged errors
  window.errorLogger.export()       - Export as JSON string
  window.errorLogger.clear()        - Clear all logged errors
  window.errorLogger.help()         - Show this help

Purpose:
  This logger captures error messages that couldn't be fully parsed
  (i.e., we couldn't extract a line number). Review these patterns
  to improve error parsing coverage.
        `);
    }
    
    // Helper methods
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    truncate(str, maxLen) {
        if (!str) return '';
        return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
    }
    
    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    }
}

// Create singleton instance
const errorLogger = new UnhandledErrorLogger();

// Expose globally for console access
if (typeof window !== 'undefined') {
    window.errorLogger = errorLogger;
}

export { UnhandledErrorLogger };
export default errorLogger;
