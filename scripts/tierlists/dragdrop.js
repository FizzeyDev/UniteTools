import state from './state.js';
import { getUsageMap, getMaxUsage } from './usage.js';
import { loadTierList } from './tierlist.js';
import { loadGallery } from './gallery.js';
import { showMoveModal } from './modals.js';

let dragPayload = null;

export function setupDragDrop() {

    // ── dragstart ──────────────────────────────────────────────────────────
    document.addEventListener('dragstart', e => {
        // If already dragging (e.g. ghost image passes over a draggable tier-item), ignore
        if (dragPayload !== null) { e.preventDefault(); return; }

        const galleryItem = e.target.closest('#gallery img, #gallery .gallery-item');
        const tierItem    = e.target.closest('.tier-item');

        if (galleryItem) {
            dragPayload = {
                name:     galleryItem.dataset.name || galleryItem.alt,
                category: galleryItem.dataset.category || state.currentCategory,
                fromTier: null,
                uid:      null,
            };
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
            setTimeout(() => galleryItem.classList.add('dragging'), 0);

        } else if (tierItem) {
            const row = tierItem.closest('.tier-row');
            if (!row) return;
            const fromTier = parseInt(row.dataset.tierIndex);
            const draft    = state.drafts.find(d => d.id === state.currentDraft);
            const uid      = tierItem.dataset.uid ? parseInt(tierItem.dataset.uid) : null;
            const stored   = draft?.tiers[fromTier]?.items.find(i => i.uid === uid);
            dragPayload = {
                name:     tierItem.dataset.name,
                category: tierItem.dataset.category,
                fromTier,
                uid,
                snapshot: stored ? { ...stored } : null,
            };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
            setTimeout(() => tierItem.classList.add('dragging'), 0);
        } else {
            return;
        }

        document.body.classList.add('is-dragging');
    });

    // ── dragend ──────────────────────────────────────────────────────────
    document.addEventListener('dragend', () => {
        document.body.classList.remove('is-dragging');
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.tier-items').forEach(t => {
            t.classList.remove('drag-over');
            t.querySelector('.preview-placeholder')?.remove();
        });
        document.getElementById('remove-zone')?.classList.remove('active');
        // Always reset — even if DOM was replaced during drop (e.g. after intra-tier
        // reorder the container is swapped and dragend may fire on a detached node).
        dragPayload = null;
    });

    // ── dragover ──────────────────────────────────────────────────────────
    document.addEventListener('dragover', e => {
        e.preventDefault();

        const tierZone   = e.target.closest('.tier-items')
                        ?? e.target.closest('.tier-item')?.closest('.tier-row')?.querySelector('.tier-items')
                        ?? e.target.closest('.tier-row')?.querySelector('.tier-items');
        const removeZone = e.target.closest('#remove-zone');

        // Clear stale drag-over highlights
        document.querySelectorAll('.tier-items.drag-over').forEach(t => {
            if (t !== tierZone) {
                t.classList.remove('drag-over');
                t.querySelector('.preview-placeholder')?.remove();
            }
        });

        if (tierZone) {
            tierZone.classList.add('drag-over');
            if (!tierZone.querySelector('.preview-placeholder')) {
                const ph     = document.createElement('div');
                ph.className = 'preview-placeholder';
                tierZone.appendChild(ph);
            }
            e.dataTransfer.dropEffect = dragPayload?.fromTier !== null ? 'move' : 'copy';
        }

        if (removeZone && dragPayload?.fromTier !== null) {
            removeZone.classList.add('active');
            e.dataTransfer.dropEffect = 'move';
        } else {
            document.getElementById('remove-zone')?.classList.remove('active');
        }
    });

    // ── dragleave ──────────────────────────────────────────────────────────
    document.addEventListener('dragleave', e => {
        const tierZone = e.target.closest('.tier-items');
        if (tierZone) {
            const related = e.relatedTarget;
            if (!tierZone.contains(related)) {
                tierZone.classList.remove('drag-over');
                tierZone.querySelector('.preview-placeholder')?.remove();
            }
        }
        const removeZone = e.target.closest('#remove-zone');
        if (removeZone && !e.relatedTarget?.closest('#remove-zone')) {
            removeZone.classList.remove('active');
        }
    });

    // ── drop ──────────────────────────────────────────────────────────────
    document.addEventListener('drop', e => {
        e.preventDefault();

        // Resolve tierZone BEFORE removing placeholders, because e.target may
        // be the placeholder itself (a detached node after removal won't climb the DOM).
        const tierZone   = e.target.closest('.tier-items')
                        ?? e.target.closest('.preview-placeholder')?.closest('.tier-items')
                        ?? e.target.closest('.tier-item')?.closest('.tier-row')?.querySelector('.tier-items')
                        ?? e.target.closest('.tier-row')?.querySelector('.tier-items');

        document.querySelectorAll('.tier-items').forEach(t => {
            t.classList.remove('drag-over');
            t.querySelector('.preview-placeholder')?.remove();
        });
        document.getElementById('remove-zone')?.classList.remove('active');

        if (!dragPayload) return;
        const removeZone = e.target.closest('#remove-zone');
        const gallery    = e.target.closest('#gallery');
        const draft      = state.drafts.find(d => d.id === state.currentDraft);
        if (!draft) { dragPayload = null; return; }

        // ── Drop into a tier row ──────────────────────────────────────────
        if (tierZone) {
            const tierIndex  = parseInt(tierZone.dataset.tierIndex);
            const targetTier = draft.tiers[tierIndex];
            if (!targetTier) { dragPayload = null; return; }

            // Moving an existing item between tiers (uid-based)
            if (dragPayload.fromTier !== null) {
                if (dragPayload.fromTier !== tierIndex) {
                    const origin = draft.tiers[dragPayload.fromTier];
                    if (origin) {
                        origin.items = origin.items.filter(i => i.uid !== dragPayload.uid);
                    }
                    const item = dragPayload.snapshot || { name: dragPayload.name, category: dragPayload.category };
                    targetTier.items.push({ ...item });
                    loadTierList(state.currentDraft);
                    loadGallery(state.currentCategory);
                }
                dragPayload = null;
                return;
            }

            // Adding from gallery
            const usageMap = getUsageMap(dragPayload.category);
            if ((usageMap.get(dragPayload.name) || 0) >= getMaxUsage(dragPayload.category)) {
                window.showToast?.(`${dragPayload.name} is already placed the maximum number of times`, 'error');
                dragPayload = null;
                return;
            }

            if (dragPayload.category === 'pokemon') {
                state.pendingAdd = { name: dragPayload.name, category: dragPayload.category, tierIndex };
                showMoveModal(dragPayload.name, tierIndex, false);
                dragPayload = null;
                return;
            } else {
                usageMap.set(dragPayload.name, (usageMap.get(dragPayload.name) || 0) + 1);
                const src  = dragPayload.category === 'items' ? state.itemData : state.battleItemData;
                const file = src.find(i => i.name === dragPayload.name)?.file;
                targetTier.items.push({
                    uid: state.nextUid(),
                    name: dragPayload.name,
                    category: dragPayload.category,
                    file,
                });
            }

            dragPayload = null;
            loadTierList(state.currentDraft);
            loadGallery(state.currentCategory);
            return;
        }

        // ── Drop onto remove zone or back into gallery ────────────────────
        if ((removeZone || gallery) && dragPayload?.fromTier !== null) {
            const origin = draft.tiers[dragPayload.fromTier];
            if (origin) {
                origin.items = origin.items.filter(i => i.uid !== dragPayload.uid);
                const map = getUsageMap(dragPayload.category);
                map.set(dragPayload.name, Math.max((map.get(dragPayload.name) || 1) - 1, 0));
            }
            dragPayload = null;
            loadTierList(state.currentDraft);
            loadGallery(state.currentCategory);
        }

        dragPayload = null;
    });

    // ── Click-to-add on gallery items (fallback for drag issues) ─────────
    document.getElementById('gallery')?.addEventListener('click', e => {
        const img = e.target.closest('.gallery-item, img[data-name]');
        if (!img) return;

        const name     = img.dataset.name || img.alt;
        const category = img.dataset.category || state.currentCategory;
        const draft    = state.drafts.find(d => d.id === state.currentDraft);
        if (!draft) return;

        const usageMap = getUsageMap(category);
        if ((usageMap.get(name) || 0) >= getMaxUsage(category)) {
            window.showToast?.(`${name} is already placed the maximum number of times`, 'error');
            return;
        }

        // Add to first tier with space, or tier 0 if all full
        const targetTierIndex = 0;
        const targetTier = draft.tiers[targetTierIndex];
        if (!targetTier) return;

        if (category === 'pokemon') {
            state.pendingAdd = { name, category, tierIndex: targetTierIndex };
            showMoveModal(name, targetTierIndex, false);
            return;
        } else {
            usageMap.set(name, (usageMap.get(name) || 0) + 1);
            const src  = category === 'items' ? state.itemData : state.battleItemData;
            const file = src.find(i => i.name === name)?.file;
            targetTier.items.push({ uid: state.nextUid(), name, category, file });
        }

        loadTierList(state.currentDraft);
        loadGallery(state.currentCategory);
        window.showToast?.(`${name} added to ${draft.tiers[targetTierIndex].name}`, 'success');
    });
}