/**
 * Import/Export module - Handles JSON import and export of tierlists
 * Allows users to download their tierlists and share them
 */

import state from './state.js';
import { loadTabs, loadTierList } from './tierlist.js';
import { loadGallery } from './gallery.js';
import { recalcUsage } from './usage.js';

/**
 * Export all tierlists as JSON file download
 * @param {number} draftId - specific draft to export, or null for all
 */
export function exportTierlistsAsJSON(draftId = null) {
    try {
        const draftsToExport = draftId 
            ? state.drafts.filter(d => d.id === draftId)
            : state.drafts;

        if (draftsToExport.length === 0) {
            window.showToast?.('No tierlists to export', 'error');
            return;
        }

        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            drafts: draftsToExport,
            exportedCount: draftsToExport.length,
        };

        const json = JSON.stringify(exportData, null, 2);
        downloadJSON(json, `tierlists-${Date.now()}.json`);
        
        const count = draftsToExport.length;
        window.showToast?.(
            `Exported ${count} tierlist${count > 1 ? 's' : ''}`,
            'success'
        );
    } catch (err) {
        console.error('Error exporting tierlists:', err);
        window.showToast?.('Failed to export tierlists', 'error');
    }
}

/**
 * Export current tierlist only as JSON
 */
export function exportCurrentTierlist() {
    exportTierlistsAsJSON(state.currentDraft);
}

/**
 * Applies parsed import data (the { drafts: [...] } shape) to the current
 * state: validates it, asks for confirmation, reassigns fresh IDs/uids to
 * avoid collisions with existing tierlists, recalculates usage, persists,
 * and refreshes the UI. Shared by both the "paste JSON" and "choose file"
 * paths of the import modal.
 * @param {string} text - raw JSON text (from a textarea or a read file)
 * @returns {boolean} true if the import succeeded (or was applied), false otherwise
 */
function applyImportData(text) {
    let importData;
    try {
        importData = JSON.parse(text);
    } catch (err) {
        window.showToast?.('Invalid JSON — please check the pasted text or file', 'error');
        return false;
    }

    try {
        // Validate structure
        if (!importData.drafts || !Array.isArray(importData.drafts)) {
            throw new Error('Invalid format: missing or invalid drafts array');
        }

        if (importData.drafts.length === 0) {
            throw new Error('No tierlists to import');
        }

        // Show confirmation dialog
        const count = importData.drafts.length;
        const proceed = confirm(
            `Import ${count} tierlist${count > 1 ? 's' : ''}?\n\n` +
            `This will add to your existing tierlists.`
        );

        if (!proceed) return false;

        // Import: reassign IDs to avoid conflicts
        const maxId = state.drafts.reduce((m, d) => Math.max(m, d.id), 0);

        importData.drafts.forEach((draft, idx) => {
            const newId = maxId + idx + 1;
            const imported = {
                id: newId,
                label: draft.label || `Imported ${newId}`,
                tiers: (draft.tiers || []).map(tier => ({
                    name: tier.name || 'Tier',
                    color: tier.color || '#95a5a6',
                    items: (tier.items || []).map(item => ({
                        uid:          state.nextUid(), // fresh UID
                        name:         item.name,
                        category:     item.category,
                        file:         item.file,
                        // If the original item was configured, preserve that and all move fields
                        ...(item._configured ? {
                            _configured: true,
                            move1:      item.move1      ?? '',
                            move1Img:   item.move1Img   ?? '',
                            move2:      item.move2      ?? '',
                            move2Img:   item.move2Img   ?? '',
                            passive:    item.passive    ?? '',
                            passiveImg: item.passiveImg ?? '',
                            unite:      item.unite      ?? '',
                            uniteImg:   item.uniteImg   ?? '',
                        } : {
                            // Not configured — leave move fields undefined so auto-fill still applies
                            ...(item.move1      !== undefined ? { move1:      item.move1,      move1Img:   item.move1Img   ?? '' } : {}),
                            ...(item.move2      !== undefined ? { move2:      item.move2,      move2Img:   item.move2Img   ?? '' } : {}),
                            ...(item.passive    !== undefined ? { passive:    item.passive,    passiveImg: item.passiveImg ?? '' } : {}),
                            ...(item.unite      !== undefined ? { unite:      item.unite,      uniteImg:   item.uniteImg   ?? '' } : {}),
                        }),
                    })),
                })),
            };
            state.drafts.push(imported);
        });

        // Set current draft to first imported
        state.currentDraft = maxId + 1;

        // Recalculate usage for all drafts
        state.drafts.forEach(draft => recalcUsage(draft.id));

        // Persist the imported state
        window.triggerAutoSave?.();

        // Refresh UI
        loadTabs();
        loadTierList(state.currentDraft);
        loadGallery(state.currentCategory);

        window.showToast?.(
            `Imported ${count} tierlist${count > 1 ? 's' : ''}!`,
            'success'
        );
        return true;
    } catch (err) {
        console.error('Error importing tierlists:', err);
        window.showToast?.(
            `Import failed: ${err.message}`,
            'error'
        );
        return false;
    }
}

/**
 * Import tierlists from a JSON file, bypassing the modal entirely.
 * Kept for any code path that wants a direct file picker without the
 * paste-text option (e.g. programmatic calls). The main "Import" button
 * now opens the richer modal via showImportModal() instead.
 */
export function importTierlistsFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) { input.remove(); return; }
        const text = await file.text();
        applyImportData(text);
        input.remove();
    });

    document.body.appendChild(input);
    input.click();
}

/**
 * Import modal: lets the user either paste exported JSON text directly into
 * a textarea, or pick a file (which fills the textarea with its content so
 * it can still be reviewed/edited before confirming). A single "Import"
 * button then applies whatever text is currently in the textarea.
 */
export function showImportModal() {
    const modal = document.getElementById('import-modal');
    if (!modal) { importTierlistsFromFile(); return; } // fallback if markup is missing
    const textarea = document.getElementById('import-paste-area');
    const fileName = document.getElementById('import-file-name');
    if (textarea) textarea.value = '';
    if (fileName) fileName.textContent = '';
    modal.style.display = 'flex';
    textarea?.focus();
}

export function hideImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) modal.style.display = 'none';
}

function handleImportChooseFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        input.remove();
        if (!file) return;
        const text = await file.text();
        const textarea = document.getElementById('import-paste-area');
        const fileName  = document.getElementById('import-file-name');
        if (textarea) textarea.value = text;
        if (fileName)  fileName.textContent = `📄 ${file.name}`;
    });

    document.body.appendChild(input);
    input.click();
}

function handleImportConfirm() {
    const textarea = document.getElementById('import-paste-area');
    const text = textarea?.value.trim();
    if (!text) {
        window.showToast?.('Paste some JSON or choose a file first', 'error');
        return;
    }
    const ok = applyImportData(text);
    if (ok) hideImportModal();
}

export function setupImportModal() {
    document.getElementById('import-choose-file-btn')?.addEventListener('click', handleImportChooseFile);
    document.getElementById('import-confirm')?.addEventListener('click', handleImportConfirm);
    document.getElementById('import-cancel')?.addEventListener('click', hideImportModal);
}

/**
 * Helper: trigger JSON download
 */
function downloadJSON(jsonString, filename) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export as text (for copying/sharing)
 * Returns a formatted string representation
 */
export function exportAsText(draftId = null) {
    const draftsToExport = draftId
        ? state.drafts.filter(d => d.id === draftId)
        : state.drafts;

    let text = '=== Pokémon Unite Tierlist Export ===\n';
    text += `Exported: ${new Date().toLocaleString()}\n\n`;

    draftsToExport.forEach(draft => {
        text += `📋 ${draft.label}\n`;
        text += `${'─'.repeat(40)}\n`;

        draft.tiers.forEach(tier => {
            text += `\n[${tier.name}]\n`;
            if (tier.items.length === 0) {
                text += '  (empty)\n';
            } else {
                tier.items.forEach(item => {
                    text += `  • ${item.name}\n`;
                });
            }
        });
        text += '\n';
    });

    return text;
}

/**
 * Copy export text to clipboard
 */
export function copyToClipboard(draftId = null) {
    try {
        const text = exportAsText(draftId);
        navigator.clipboard.writeText(text).then(() => {
            window.showToast?.('Copied to clipboard!', 'success');
        }).catch(() => {
            window.showToast?.('Failed to copy to clipboard', 'error');
        });
    } catch (err) {
        console.error('Error copying to clipboard:', err);
        window.showToast?.('Failed to copy', 'error');
    }
}