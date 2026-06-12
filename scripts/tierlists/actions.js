import state from './state.js';
import { getUsageMap } from './usage.js';
import { loadTabs, loadTierList } from './tierlist.js';
import { loadGallery } from './gallery.js';

export function addTab() {
    const maxId = state.drafts.reduce((m, d) => Math.max(m, d.id), 0);
    const newId = maxId + 1;
    const label = `Tierlist ${newId}`;
    state.drafts.push({
        id: newId,
        label,
        tiers: [
            { name: 'S', color: '#e74c3c', items: [] },
            { name: 'A', color: '#3498db', items: [] },
            { name: 'B', color: '#2ecc71', items: [] },
            { name: 'C', color: '#f1c40f', items: [] },
            { name: 'D', color: '#9b59b6', items: [] }
        ]
    });
    state.currentDraft = newId;
    loadTabs();
    loadTierList(newId);
    loadGallery(state.currentCategory);
}

export function duplicateDraft(sourceDraftId) {
    const source = state.drafts.find(d => d.id === sourceDraftId);
    if (!source) return;

    const maxId = state.drafts.reduce((m, d) => Math.max(m, d.id), 0);
    const newId = maxId + 1;

    // Deep-clone tiers but strip items (empty copy)
    const newTiers = source.tiers.map(t => ({
        name: t.name,
        color: t.color,
        items: [],
    }));

    state.drafts.push({
        id: newId,
        label: `${source.label || `Tierlist ${sourceDraftId}`} (copy)`,
        tiers: newTiers,
    });
    state.currentDraft = newId;
    loadTabs();
    loadTierList(newId);
    loadGallery(state.currentCategory);
}

export function renameDraft(draftId, newLabel) {
    const draft = state.drafts.find(d => d.id === draftId);
    if (!draft) return;
    draft.label = newLabel.trim() || `Tierlist ${draftId}`;
    loadTabs();
}

export function addTier(draftId) {
    const draft = state.drafts.find(d => d.id === draftId);
    if (!draft) return;
    draft.tiers.push({ name: `Tier ${draft.tiers.length + 1}`, color: '#95a5a6', items: [] });
    loadTierList(draftId);
}

export function duplicateTier(draftId, tierIndex) {
    const draft = state.drafts.find(d => d.id === draftId);
    if (!draft) return;
    const tier = draft.tiers[tierIndex];
    if (!tier) return;

    // Clone tier without items (empty copy, structure only)
    const clone = {
        name: `${tier.name} (copy)`,
        color: tier.color,
        items: [],
    };
    draft.tiers.splice(tierIndex + 1, 0, clone);
    loadTierList(draftId);
}

export function deleteTier(draftId, tierIndex) {
    const draft = state.drafts.find(d => d.id === draftId);
    if (!draft) return;
    const tier = draft.tiers[tierIndex];
    if (!tier) return;
    tier.items.forEach(item => {
        const map = getUsageMap(item.category);
        map.set(item.name, Math.max((map.get(item.name) || 1) - 1, 0));
    });
    draft.tiers.splice(tierIndex, 1);
    loadTierList(draftId);
    loadGallery(state.currentCategory);
}

export function clearDraft(draftId) {
    const draft = state.drafts.find(d => d.id === draftId);
    if (!draft) return;
    draft.tiers.forEach(tier => {
        tier.items.forEach(item => {
            const map = getUsageMap(item.category);
            map.set(item.name, Math.max((map.get(item.name) || 1) - 1, 0));
        });
        tier.items = [];
    });
    loadTierList(draftId);
    loadGallery(state.currentCategory);
}

/**
 * Remove a single item by its unique uid from any tier of the given draft.
 */
export function removeItemByUid(draftId, uid) {
    const draft = state.drafts.find(d => d.id === draftId);
    if (!draft) return;
    for (const tier of draft.tiers) {
        const idx = tier.items.findIndex(i => i.uid === uid);
        if (idx !== -1) {
            const [removed] = tier.items.splice(idx, 1);
            const map = getUsageMap(removed.category);
            map.set(removed.name, Math.max((map.get(removed.name) || 1) - 1, 0));
            loadTierList(draftId);
            loadGallery(state.currentCategory);
            return;
        }
    }
}

/**
 * Reorder an item within a tier (drag & drop intra-tier).
 * Moves the item at fromIndex to toIndex within the same tier.
 */
export function reorderItemInTier(draftId, tierIndex, fromIndex, toIndex) {
    const draft = state.drafts.find(d => d.id === draftId);
    if (!draft) return;
    const tier = draft.tiers[tierIndex];
    if (!tier) return;
    if (fromIndex === toIndex) return;
    const [item] = tier.items.splice(fromIndex, 1);
    tier.items.splice(toIndex, 0, item);
    loadTierList(draftId);
}