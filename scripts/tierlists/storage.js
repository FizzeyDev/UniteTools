/**
 * Storage module - Manages localStorage persistence for tierlists
 * Handles automatic saving and loading of draft data
 */

import state from './state.js';

const STORAGE_KEY = 'pokemonUniteTierlists';
const AUTO_SAVE_DEBOUNCE_MS = 500;

let autoSaveTimer = null;

/**
 * Save the current state.drafts to localStorage
 */
export function saveToLocalStorage() {
    try {
        const data = {
            drafts: state.drafts,
            currentDraft: state.currentDraft,
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('✓ Tierlists saved to localStorage');
        return true;
    } catch (err) {
        console.error('Error saving to localStorage:', err);
        return false;
    }
}

/**
 * Load drafts from localStorage into state
 * Returns true if data was loaded, false if no saved data exists
 */
export function loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            console.log('No saved tierlists found in localStorage');
            return false;
        }

        const data = JSON.parse(stored);
        
        // Restore drafts and current draft
        if (data.drafts && Array.isArray(data.drafts)) {
            state.drafts = data.drafts;
            state.currentDraft = data.currentDraft || 1;
            console.log(`✓ Loaded ${data.drafts.length} tierlist(s) from localStorage`);
            return true;
        }
        return false;
    } catch (err) {
        console.error('Error loading from localStorage:', err);
        return false;
    }
}

/**
 * Clear all saved data from localStorage
 */
export function clearLocalStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('✓ Cleared tierlists from localStorage');
        return true;
    } catch (err) {
        console.error('Error clearing localStorage:', err);
        return false;
    }
}

/**
 * Setup auto-save: save whenever state changes (debounced)
 * This should be called once during initialization
 */
export function setupAutoSave() {
    // This will be triggered by individual mutation functions
    // We expose a debounced save function
    window.triggerAutoSave = () => {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveToLocalStorage();
        }, AUTO_SAVE_DEBOUNCE_MS);
    };

    console.log('✓ Auto-save enabled');
}

/**
 * Get info about stored data (for debugging/UI)
 */
export function getStorageInfo() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        
        const data = JSON.parse(stored);
        return {
            draftCount: data.drafts?.length || 0,
            savedAt: data.savedAt,
            sizeKB: (new Blob([stored]).size / 1024).toFixed(2),
        };
    } catch (err) {
        return null;
    }
}