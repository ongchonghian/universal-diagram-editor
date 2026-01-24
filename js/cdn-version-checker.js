/**
 * CDN Version Checker - Query CDN APIs for latest library versions
 */

import { CDN_TYPES, LIBRARY_REGISTRY, compareVersions } from './library-registry.js';

// Cache for API responses (5 minute TTL)
const versionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Check version from unpkg.com
 * Uses package.json endpoint to get latest version
 */
async function checkUnpkgVersion(packageName) {
    const cacheKey = `unpkg:${packageName}`;
    const cached = versionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.version;
    }

    try {
        // unpkg redirects @latest to actual version, we can fetch package.json
        const response = await fetch(`https://unpkg.com/${packageName}@latest/package.json`, {
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const version = data.version;
        
        versionCache.set(cacheKey, { version, timestamp: Date.now() });
        return version;
    } catch (error) {
        console.warn(`Failed to check unpkg version for ${packageName}:`, error);
        return null;
    }
}

/**
 * Check version from cdnjs.com
 * Uses official API endpoint
 */
async function checkCdnjsVersion(libraryName) {
    const cacheKey = `cdnjs:${libraryName}`;
    const cached = versionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.version;
    }

    try {
        const response = await fetch(`https://api.cdnjs.com/libraries/${libraryName}?fields=version`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const version = data.version;
        
        versionCache.set(cacheKey, { version, timestamp: Date.now() });
        return version;
    } catch (error) {
        console.warn(`Failed to check cdnjs version for ${libraryName}:`, error);
        return null;
    }
}

/**
 * Check version from npm registry (used by esm.sh)
 * esm.sh mirrors npm packages
 */
async function checkNpmVersion(packageName) {
    const cacheKey = `npm:${packageName}`;
    const cached = versionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.version;
    }

    try {
        // Use npm registry API
        const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const version = data.version;
        
        versionCache.set(cacheKey, { version, timestamp: Date.now() });
        return version;
    } catch (error) {
        console.warn(`Failed to check npm version for ${packageName}:`, error);
        return null;
    }
}

/**
 * Check version from JSR (jsr.io)
 * Used for packages like @emily/mermaid-ast
 */
async function checkJsrVersion(scope, packageName) {
    const cacheKey = `jsr:@${scope}/${packageName}`;
    const cached = versionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.version;
    }

    try {
        const response = await fetch(`https://jsr.io/@${scope}/${packageName}/meta.json`, {
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        // JSR meta.json has 'latest' field or we can get from versions
        const version = data.latest || Object.keys(data.versions || {}).sort(compareVersions).pop();
        
        versionCache.set(cacheKey, { version, timestamp: Date.now() });
        return version;
    } catch (error) {
        console.warn(`Failed to check JSR version for @${scope}/${packageName}:`, error);
        return null;
    }
}

/**
 * Check latest version for a library based on its CDN type
 * @param {Object} library - Library config from registry
 * @param {string} actualCurrentVersion - Optional actual current version from HTML (overrides registry)
 */
export async function checkLibraryVersion(library, actualCurrentVersion = null) {
    const currentVersion = actualCurrentVersion || library.currentVersion;
    
    if (library.skipVersionCheck) {
        return { current: currentVersion, latest: currentVersion, hasUpdate: false };
    }

    let latestVersion = null;

    switch (library.cdn) {
        case CDN_TYPES.UNPKG:
            latestVersion = await checkUnpkgVersion(library.package);
            break;
        case CDN_TYPES.CDNJS:
            latestVersion = await checkCdnjsVersion(library.package);
            break;
        case CDN_TYPES.ESMSH:
            latestVersion = await checkNpmVersion(library.package);
            break;
        case CDN_TYPES.JSR:
            latestVersion = await checkJsrVersion(library.scope, library.package.split('/').pop());
            break;
        case CDN_TYPES.TAILWIND:
            // Tailwind CDN always serves latest, skip version check
            return { current: 'latest', latest: 'latest', hasUpdate: false };
        default:
            console.warn(`Unknown CDN type: ${library.cdn}`);
            return null;
    }

    if (!latestVersion) {
        return { current: currentVersion, latest: null, hasUpdate: false, error: 'Failed to fetch version' };
    }

    const hasUpdate = compareVersions(currentVersion, latestVersion) < 0;

    return {
        current: currentVersion,
        latest: latestVersion,
        hasUpdate
    };
}

/**
 * Check all libraries for updates
 * @param {Object} options - Options object
 * @param {Array} options.libraries - Libraries to check (defaults to all from registry)
 * @param {Object} options.actualVersions - Map of library ID to actual version from HTML
 * Returns array of update info objects
 */
export async function checkAllUpdates(options = {}) {
    const { libraries = null, actualVersions = {} } = options;
    
    const libsToCheck = libraries || Object.entries(LIBRARY_REGISTRY)
        .filter(([_, lib]) => !lib.skipVersionCheck && !lib.linkedTo)
        .map(([id, lib]) => ({ id, ...lib }));

    const results = await Promise.allSettled(
        libsToCheck.map(async (lib) => {
            const actualVersion = actualVersions[lib.id];
            const versionInfo = await checkLibraryVersion(lib, actualVersion);
            return {
                id: lib.id,
                name: lib.name,
                ...versionInfo,
                isMajor: versionInfo.hasUpdate && isMajorVersionChange(versionInfo.current, versionInfo.latest)
            };
        })
    );

    return results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
}

/**
 * Check if the version change is a major version bump
 */
function isMajorVersionChange(current, latest) {
    if (!current || !latest) return false;
    
    const getMajor = v => {
        const match = String(v).replace(/^v/, '').match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    };
    
    return getMajor(latest) > getMajor(current);
}

/**
 * Get changelog URL for a library (if available)
 */
export function getChangelogUrl(library) {
    const packageName = library.package;
    
    // Common changelog locations
    const urls = {
        // React ecosystem
        'react': 'https://github.com/facebook/react/releases',
        'react-dom': 'https://github.com/facebook/react/releases',
        // Monaco
        'monaco-editor': 'https://github.com/microsoft/monaco-editor/releases',
        // Excalidraw
        '@excalidraw/excalidraw': 'https://github.com/excalidraw/excalidraw/releases',
        // BPMN
        'bpmn-js': 'https://github.com/bpmn-io/bpmn-js/releases',
        // Others
        'dagre': 'https://github.com/dagrejs/dagre/releases',
        '@xyflow/react': 'https://github.com/xyflow/xyflow/releases',
        'pako': 'https://github.com/nodeca/pako/releases',
        'htm': 'https://github.com/developit/htm/releases'
    };
    
    return urls[packageName] || `https://www.npmjs.com/package/${packageName}?activeTab=versions`;
}

/**
 * Clear the version cache
 */
export function clearCache() {
    versionCache.clear();
}

export default {
    checkLibraryVersion,
    checkAllUpdates,
    getChangelogUrl,
    clearCache
};
