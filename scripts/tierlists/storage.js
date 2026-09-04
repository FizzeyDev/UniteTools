/**
 * Storage module - Manages localStorage persistence for tierlists
 */

import state from './state.js';
import { recalcUsage } from './usage.js';

const STORAGE_KEY = 'pokemonUniteTierlists';
const AUTO_SAVE_DEBOUNCE_MS = 400;

let autoSaveTimer = null;

/**
 * Save the current state to localStorage
 */
export function saveToLocalStorage() {
    try {
        const data = {
            drafts:        state.drafts,
            currentDraft:  state.currentDraft,
            uidCounter:    state._uidCounter,
            colorHistory:  state.colorHistory,
            askMovesOnAdd: state.askMovesOnAdd,
            savedAt:       new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.warn('[storage] Could not save:', err);
    }
}

/**
 * Load drafts from localStorage into state.
 * MUST be called after loadData() so pokemonData etc. are available for recalcUsage.
 * Returns true if data was restored, false if nothing was saved.
 */
export function loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return false;

        const data = JSON.parse(stored);
        if (!data.drafts || !Array.isArray(data.drafts) || data.drafts.length === 0) return false;

        // Restore core state
        state.drafts       = data.drafts;
        state.currentDraft = data.currentDraft || data.drafts[0].id;
        state._uidCounter  = data.uidCounter   || 0;

        // Restore color history
        if (Array.isArray(data.colorHistory)) {
            state.colorHistory = data.colorHistory;
        }

        // Restore "ask moves on add" preference (default stays true if never saved)
        if (typeof data.askMovesOnAdd === 'boolean') {
            state.askMovesOnAdd = data.askMovesOnAdd;
        }

        // Guard: make sure currentDraft still exists
        if (!state.drafts.find(d => d.id === state.currentDraft)) {
            state.currentDraft = state.drafts[0].id;
        }

        // Rebuild usage maps from ALL drafts
        // recalcUsage clears all maps each call, so we accumulate manually here.
        state.pokemonUsage.clear();
        state.itemUsage.clear();
        state.drafts.forEach(draft => {
            draft.tiers.forEach(tier => {
                tier.items.forEach(item => {
                    const map = item.category === 'pokemon' ? state.pokemonUsage : state.itemUsage;
                    map.set(item.name, (map.get(item.name) || 0) + 1);
                });
            });
        });

        return true;
    } catch (err) {
        console.warn('[storage] Could not restore:', err);
        return false;
    }
}

/**
 * Clear all saved data from localStorage
 */
export function clearLocalStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (err) {
        console.warn('[storage] Could not clear:', err);
        return false;
    }
}

/**
 * Setup auto-save: exposes window.triggerAutoSave() for all mutation sites.
 * Debounced so rapid changes (e.g. drag-drop) only write once.
 */
export function setupAutoSave() {
    window.triggerAutoSave = () => {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(saveToLocalStorage, AUTO_SAVE_DEBOUNCE_MS);
    };
}

/**
 * Storage info for debugging
 */
export function getStorageInfo() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        const data = JSON.parse(stored);
        return {
            draftCount: data.drafts?.length || 0,
            savedAt:    data.savedAt,
            sizeKB:     (new Blob([stored]).size / 1024).toFixed(2),
        };
    } catch { return null; }
}