/**
 * Update Manager - Orchestrates the library update workflow
 */

import { LIBRARY_REGISTRY, getCheckableLibraries, isMajorUpdate, parseVersionsFromHtml } from './library-registry.js';
import { checkAllUpdates, getChangelogUrl } from './cdn-version-checker.js';
import { testLibraryUpdates, validateUrls } from './update-tester.js';
import { fetchCurrentHtml, updateLibraryUrls, downloadUpdatedHtml, generateChangeSummary, validateHtml } from './html-rewriter.js';

// LocalStorage keys
const STORAGE_KEYS = {
    LAST_CHECK: 'libraryUpdates_lastCheck',
    UPDATE_HISTORY: 'libraryUpdates_history',
    IGNORED_UPDATES: 'libraryUpdates_ignored'
};

// Maximum history entries to store
const MAX_HISTORY_ENTRIES = 10;

/**
 * Update Manager State
 */
class UpdateManager {
    constructor() {
        this.availableUpdates = [];
        this.testResults = null;
        this.isChecking = false;
        this.isTesting = false;
        this.listeners = new Set();
    }

    /**
     * Subscribe to state changes
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of state change
     */
    notify() {
        this.listeners.forEach(callback => callback(this.getState()));
    }

    /**
     * Get current state
     */
    getState() {
        return {
            availableUpdates: this.availableUpdates,
            testResults: this.testResults,
            isChecking: this.isChecking,
            isTesting: this.isTesting,
            lastCheck: this.getLastCheck()
        };
    }

    /**
     * Check for available updates
     */
    async checkForUpdates() {
        this.isChecking = true;
        this.notify();

        try {
            // First, fetch current HTML to parse actual versions
            const currentHtml = await fetchCurrentHtml();
            const actualVersions = parseVersionsFromHtml(currentHtml);
            
            console.log('Parsed actual versions from HTML:', actualVersions);
            
            // Check for updates using actual versions from HTML
            const results = await checkAllUpdates({ actualVersions });
            
            // Filter to only show libraries with updates
            this.availableUpdates = results
                .filter(r => r.hasUpdate && !this.isIgnored(r.id, r.latest))
                .map(r => ({
                    ...r,
                    changelogUrl: getChangelogUrl(LIBRARY_REGISTRY[r.id]),
                    selected: !r.isMajor // Auto-select non-major updates
                }));

            // Save check timestamp
            this.saveLastCheck();
            
            this.isChecking = false;
            this.notify();

            return this.availableUpdates;
        } catch (error) {
            this.isChecking = false;
            this.notify();
            throw error;
        }
    }

    /**
     * Test selected library updates
     */
    async testSelectedUpdates() {
        const selected = this.availableUpdates.filter(u => u.selected);
        if (selected.length === 0) {
            return { success: true, message: 'No updates selected' };
        }

        this.isTesting = true;
        this.notify();

        try {
            // Build updates map
            const updatesMap = {};
            selected.forEach(u => {
                updatesMap[u.id] = u.latest;
            });

            // First validate URLs exist
            const urlValidation = await validateUrls(updatesMap);
            if (urlValidation.invalid.length > 0) {
                this.testResults = {
                    success: false,
                    passed: [],
                    failed: urlValidation.invalid.map(i => `${i.id}: URL not found (${i.status || i.error})`),
                    errors: [],
                    warnings: []
                };
                this.isTesting = false;
                this.notify();
                return this.testResults;
            }

            // Run iframe tests
            this.testResults = await testLibraryUpdates(updatesMap);
            
            this.isTesting = false;
            this.notify();

            return this.testResults;
        } catch (error) {
            this.testResults = {
                success: false,
                passed: [],
                failed: ['Test error: ' + error.message],
                errors: [error.message],
                warnings: []
            };
            this.isTesting = false;
            this.notify();
            throw error;
        }
    }

    /**
     * Apply selected updates and download new HTML
     */
    async applyUpdates() {
        const selected = this.availableUpdates.filter(u => u.selected);
        if (selected.length === 0) {
            throw new Error('No updates selected');
        }

        // Fetch current HTML
        const currentHtml = await fetchCurrentHtml();

        // Build updates object
        const updates = {};
        selected.forEach(u => {
            updates[u.id] = { current: u.current, latest: u.latest };
        });

        // Update URLs in HTML
        const { html: updatedHtml, changes } = updateLibraryUrls(currentHtml, updates);

        // Validate the result
        const validation = validateHtml(updatedHtml);
        if (!validation.valid) {
            throw new Error('Generated HTML is invalid: ' + validation.error);
        }

        // Save to history before download
        this.saveToHistory(selected, currentHtml);

        // Generate summary
        const summary = generateChangeSummary(changes);
        console.log('Update Summary:\n', summary);

        // Trigger download
        downloadUpdatedHtml(updatedHtml);

        // Update available updates list
        this.availableUpdates = this.availableUpdates.filter(u => !u.selected);
        this.notify();

        return { success: true, changes, summary };
    }

    /**
     * Toggle selection for an update
     */
    toggleUpdate(libraryId) {
        const update = this.availableUpdates.find(u => u.id === libraryId);
        if (update) {
            update.selected = !update.selected;
            this.notify();
        }
    }

    /**
     * Select all updates
     */
    selectAll() {
        this.availableUpdates.forEach(u => u.selected = true);
        this.notify();
    }

    /**
     * Deselect all updates
     */
    deselectAll() {
        this.availableUpdates.forEach(u => u.selected = false);
        this.notify();
    }

    /**
     * Ignore an update (won't show in future checks)
     */
    ignoreUpdate(libraryId, version) {
        const ignored = this.getIgnoredUpdates();
        ignored[libraryId] = version;
        localStorage.setItem(STORAGE_KEYS.IGNORED_UPDATES, JSON.stringify(ignored));
        
        // Remove from available updates
        this.availableUpdates = this.availableUpdates.filter(u => u.id !== libraryId);
        this.notify();
    }

    /**
     * Check if an update is ignored
     */
    isIgnored(libraryId, version) {
        const ignored = this.getIgnoredUpdates();
        return ignored[libraryId] === version;
    }

    /**
     * Get ignored updates from storage
     */
    getIgnoredUpdates() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.IGNORED_UPDATES) || '{}');
        } catch {
            return {};
        }
    }

    /**
     * Clear ignored updates
     */
    clearIgnoredUpdates() {
        localStorage.removeItem(STORAGE_KEYS.IGNORED_UPDATES);
    }

    /**
     * Get last check timestamp
     */
    getLastCheck() {
        const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_CHECK);
        return timestamp ? new Date(timestamp) : null;
    }

    /**
     * Save last check timestamp
     */
    saveLastCheck() {
        localStorage.setItem(STORAGE_KEYS.LAST_CHECK, new Date().toISOString());
    }

    /**
     * Get update history
     */
    getHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.UPDATE_HISTORY) || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Save update to history
     */
    saveToHistory(updates, previousHtml) {
        const history = this.getHistory();
        
        history.unshift({
            date: new Date().toISOString(),
            libraries: updates.map(u => ({
                id: u.id,
                name: u.name,
                from: u.current,
                to: u.latest
            })),
            // Only store a truncated version of HTML to avoid quota issues
            previousHtmlPreview: previousHtml.substring(0, 1000) + '...'
        });

        // Limit history size
        while (history.length > MAX_HISTORY_ENTRIES) {
            history.pop();
        }

        localStorage.setItem(STORAGE_KEYS.UPDATE_HISTORY, JSON.stringify(history));
    }

    /**
     * Format time since last check
     */
    getTimeSinceLastCheck() {
        const lastCheck = this.getLastCheck();
        if (!lastCheck) return 'Never';

        const now = new Date();
        const diff = now - lastCheck;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }
}

// Create singleton instance
const updateManager = new UpdateManager();

// Export for use in UI
export { updateManager };
export default updateManager;
