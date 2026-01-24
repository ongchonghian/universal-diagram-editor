/**
 * HTML Rewriter - Parse and update library URLs in index.html
 */

import { LIBRARY_REGISTRY } from './library-registry.js';

/**
 * Fetch current index.html content
 */
export async function fetchCurrentHtml() {
    try {
        const response = await fetch('./index.html');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Failed to fetch index.html:', error);
        throw error;
    }
}

/**
 * URL replacement patterns for each CDN type
 */
const URL_PATTERNS = {
    // unpkg: @version in URL path
    unpkg: {
        // Matches @version/ in URL (e.g., @18/, @16.4.0/)
        pattern: /@[\d.]+(?:-[a-z0-9.]+)?(?:\/|(?=\?|$))/gi,
        replace: (url, oldVersion, newVersion) => {
            return url.replace(new RegExp(`@${escapeRegex(oldVersion)}(\\/|\\?|$)`, 'g'), `@${newVersion}$1`);
        }
    },
    // cdnjs: /version/ in URL path
    cdnjs: {
        // Matches /x.y.z/ in URL
        pattern: /\/\d+\.\d+\.\d+\//g,
        replace: (url, oldVersion, newVersion) => {
            return url.replace(`/${oldVersion}/`, `/${newVersion}/`);
        }
    },
    // esm.sh: @version at end of package name
    esmsh: {
        // Matches @version before ? or end of import
        pattern: /@[\d.]+(?=\?|'|"|`|$)/g,
        replace: (url, oldVersion, newVersion) => {
            return url.replace(new RegExp(`@${escapeRegex(oldVersion)}(?=\\?|'|"|$)`, 'g'), `@${newVersion}`);
        }
    }
};

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Update library URLs in HTML content
 * @param {string} html - Original HTML content
 * @param {Object} updates - Map of library ID to { current, latest } versions
 * @returns {string} Updated HTML content
 */
export function updateLibraryUrls(html, updates) {
    let updatedHtml = html;
    const changes = [];

    Object.entries(updates).forEach(([libraryId, { current, latest }]) => {
        const lib = LIBRARY_REGISTRY[libraryId];
        if (!lib || !latest || current === latest) return;

        // Build regex patterns to find and replace version in URLs for this library
        const replacements = buildReplacementPatterns(lib, current, latest);
        
        replacements.forEach(({ searchPattern, replacement, description }) => {
            const regex = new RegExp(searchPattern, 'g');
            const matches = updatedHtml.match(regex);
            
            if (matches && matches.length > 0) {
                const before = updatedHtml;
                updatedHtml = updatedHtml.replace(regex, replacement);
                
                if (before !== updatedHtml) {
                    changes.push({
                        library: lib.name,
                        from: current,
                        to: latest,
                        description: description,
                        count: matches.length
                    });
                }
            }
        });
    });

    return { html: updatedHtml, changes };
}

/**
 * Build regex patterns for finding and replacing library URLs
 */
function buildReplacementPatterns(lib, currentVersion, newVersion) {
    const patterns = [];
    const escapedCurrent = escapeRegex(currentVersion);
    const packageName = escapeRegex(lib.package);
    
    switch (lib.cdn) {
        case 'unpkg':
            // Pattern: package@version/ or package@version?
            patterns.push({
                searchPattern: `(${packageName}@)${escapedCurrent}([/?'"\`])`,
                replacement: `$1${newVersion}$2`,
                description: `unpkg ${lib.package}`
            });
            break;
            
        case 'cdnjs':
            // Pattern: /package/version/
            patterns.push({
                searchPattern: `(/${lib.package}/)${escapedCurrent}(/)`,
                replacement: `$1${newVersion}$2`,
                description: `cdnjs ${lib.package}`
            });
            break;
            
        case 'esm.sh':
        case 'jsr':
            // Pattern: package@version? or package@version' or package@version"
            patterns.push({
                searchPattern: `(${packageName}@)${escapedCurrent}([?'"\`])`,
                replacement: `$1${newVersion}$2`,
                description: `esm.sh ${lib.package}`
            });
            break;
    }
    
    return patterns;
}

/**
 * Parse HTML to find all CDN URLs currently in use
 */
export function findCdnUrls(html) {
    const urls = {
        unpkg: [],
        cdnjs: [],
        esmsh: [],
        other: []
    };

    // Find script src attributes
    const scriptSrcRegex = /src=["']([^"']+)["']/gi;
    let match;
    while ((match = scriptSrcRegex.exec(html)) !== null) {
        categorizeUrl(match[1], urls);
    }

    // Find link href attributes
    const linkHrefRegex = /href=["']([^"']+)["']/gi;
    while ((match = linkHrefRegex.exec(html)) !== null) {
        if (match[1].includes('cdn') || match[1].includes('unpkg') || match[1].includes('esm.sh')) {
            categorizeUrl(match[1], urls);
        }
    }

    // Find ES module imports
    const importRegex = /(?:import|from)\s+["']([^"']+)["']/gi;
    while ((match = importRegex.exec(html)) !== null) {
        if (match[1].startsWith('http')) {
            categorizeUrl(match[1], urls);
        }
    }

    // Find dynamic imports
    const dynamicImportRegex = /import\s*\(\s*["']([^"']+)["']\s*\)/gi;
    while ((match = dynamicImportRegex.exec(html)) !== null) {
        if (match[1].startsWith('http')) {
            categorizeUrl(match[1], urls);
        }
    }

    return urls;
}

/**
 * Categorize URL by CDN provider
 */
function categorizeUrl(url, urls) {
    if (url.includes('unpkg.com')) {
        urls.unpkg.push(url);
    } else if (url.includes('cdnjs.cloudflare.com')) {
        urls.cdnjs.push(url);
    } else if (url.includes('esm.sh')) {
        urls.esmsh.push(url);
    } else if (url.includes('cdn.')) {
        urls.other.push(url);
    }
}

/**
 * Generate updated HTML and trigger download
 */
export function downloadUpdatedHtml(html, filename = 'index-updated.html') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

/**
 * Generate a diff summary of changes
 */
export function generateChangeSummary(changes) {
    if (changes.length === 0) {
        return 'No changes made.';
    }

    let summary = `Updated ${changes.length} URL(s):\n\n`;
    changes.forEach(({ library, from, to }) => {
        summary += `${library}:\n`;
        summary += `  - ${from}\n`;
        summary += `  + ${to}\n\n`;
    });

    return summary;
}

/**
 * Validate that the updated HTML is well-formed
 */
export function validateHtml(html) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Check for parsing errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            return { valid: false, error: parseError.textContent };
        }

        // Basic structure checks
        const hasHtml = doc.querySelector('html');
        const hasHead = doc.querySelector('head');
        const hasBody = doc.querySelector('body');

        if (!hasHtml || !hasHead || !hasBody) {
            return { valid: false, error: 'Missing required HTML structure' };
        }

        return { valid: true };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

export default {
    fetchCurrentHtml,
    updateLibraryUrls,
    findCdnUrls,
    downloadUpdatedHtml,
    generateChangeSummary,
    validateHtml
};
