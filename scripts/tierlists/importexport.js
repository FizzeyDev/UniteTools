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
 * Import tierlists from JSON file
 * Shows a file picker dialog
 */
export function importTierlistsFromJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

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

            if (!proceed) return;

            // Import: reassign IDs to avoid conflicts
            const maxId = state.drafts.reduce((m, d) => Math.max(m, d.id), 0);
            let newMaxId = maxId;

            importData.drafts.forEach((draft, idx) => {
                const newId = maxId + idx + 1;
                const imported = {
                    id: newId,
                    label: draft.label || `Imported ${newId}`,
                    tiers: (draft.tiers || []).map(tier => ({
                        name: tier.name || 'Tier',
                        color: tier.color || '#95a5a6',
                        items: (tier.items || []).map(item => ({
                            uid:        state.nextUid(), // fresh UID
                            name:       item.name,
                            category:   item.category,
                            file:       item.file,
                            // preserve move selections
                            move1:      item.move1      ?? undefined,
                            move1Img:   item.move1Img   ?? undefined,
                            move2:      item.move2      ?? undefined,
                            move2Img:   item.move2Img   ?? undefined,
                            passive:    item.passive    ?? undefined,
                            passiveImg: item.passiveImg ?? undefined,
                            unite:      item.unite      ?? undefined,
                            uniteImg:   item.uniteImg   ?? undefined,
                        })),
                    })),
                };
                state.drafts.push(imported);
                newMaxId = newId;
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
        } catch (err) {
            console.error('Error importing tierlists:', err);
            window.showToast?.(
                `Import failed: ${err.message}`,
                'error'
            );
        } finally {
            input.remove();
        }
    });

    document.body.appendChild(input);
    input.click();
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