/**
 * presets.js — Farm Rota Preset management
 *
 * Presets are named snapshots of a Kill Queue saved to localStorage.
 * They can be loaded onto the player queue, the ally track, or the enemy track.
 *
 * Storage format:
 *   localStorage key: 'xpcalc_farm_presets'
 *   value: JSON array of { name: string, queue: KillEntry[] }
 *
 * Exposes: window.XPCalcPresets
 */

window.XPCalcPresets = (function () {
  'use strict';

  const STORAGE_KEY = 'xpcalc_farm_presets';
  const state = window.XPCalcState;
  const $ = id => document.getElementById(id);

  // ─── Storage helpers ─────────────────────────────────────────────────────

  /** Load all saved presets from localStorage. Returns [] on error. */
  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  }

  /** Persist the full presets array to localStorage. */
  function saveAll(presets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  }

  /**
   * Save the current player Kill Queue as a new named preset.
   * @param {string} name - Display name for the preset
   */
  function saveCurrentQueue(name) {
    if (!state.killQueue.length) return false;
    const presets = loadAll();
    presets.push({ name: name || 'Unnamed', queue: state.killQueue.map(e => ({ ...e })) });
    saveAll(presets);
    return true;
  }

  /**
   * Delete preset at the given index.
   * @param {number} idx
   */
  function deletePreset(idx) {
    const presets = loadAll();
    presets.splice(idx, 1);
    saveAll(presets);
    // Clear references if either track was using this index
    if (state.allyPresetIdx === idx) state.allyPresetIdx = null;
    if (state.enemyPresetIdx === idx) state.enemyPresetIdx = null;
  }

  /**
   * Load a preset onto the player Kill Queue.
   * @param {number} idx
   */
  function loadOntoPlayer(idx) {
    const presets = loadAll();
    if (!presets[idx]) return;
    state.killQueue = presets[idx].queue.map(e => ({ ...e }));
  }

  /**
   * Assign a preset to the ally simulation track.
   * @param {number|null} idx - null to clear
   */
  function assignToAlly(idx) {
    const presets = loadAll();
    if (idx === null || !presets[idx]) {
      state.allyPresetIdx = null;
      state.allyKillQueue = [];
      return;
    }
    state.allyPresetIdx = idx;
    state.allyKillQueue = presets[idx].queue.map(e => ({ ...e }));
  }

  /**
   * Assign a preset to the enemy simulation track.
   * @param {number|null} idx - null to clear
   */
  function assignToEnemy(idx) {
    const presets = loadAll();
    if (idx === null || !presets[idx]) {
      state.enemyPresetIdx = null;
      state.enemyKillQueue = [];
      return;
    }
    state.enemyPresetIdx = idx;
    state.enemyKillQueue = presets[idx].queue.map(e => ({ ...e }));
  }

  // ─── UI rendering ─────────────────────────────────────────────────────────

  /**
   * Render preset chips in the player Kill Queue's preset bar.
   * Each chip has a load button and a delete button.
   */
  function renderPlayerChips() {
    const container = $('preset-chips');
    const emptyHint = $('preset-empty-hint');
    if (!container) return;

    const presets = loadAll();
    Array.from(container.querySelectorAll('.preset-chip')).forEach(c => c.remove());

    if (presets.length === 0) {
      if (emptyHint) emptyHint.style.display = '';
      return;
    }
    if (emptyHint) emptyHint.style.display = 'none';

    presets.forEach((preset, idx) => {
      const chip = _makeChip(preset.name, idx, () => {
        loadOntoPlayer(idx);
        window.XPCalcQueue && window.XPCalcQueue.renderKillQueue();
      }, () => {
        deletePreset(idx);
        renderPlayerChips();
        renderAllySelector();
        renderEnemySelector();
      });
      container.appendChild(chip);
    });
  }

  /**
   * Render the ally preset selector (dropdown-style chips) in the ally config block.
   * Clicking a chip assigns that preset as the ally's track.
   */
  function renderAllySelector() {
    const container = $('ally-preset-chips');
    if (!container) return;

    const presets = loadAll();
    container.innerHTML = '';

    // "None" option
    const noneChip = _makeSelectorChip('None', state.allyPresetIdx === null, () => {
      assignToAlly(null);
      renderAllySelector();
      window.XPCalcUI && window.XPCalcUI.updateAllyExpShareDisplay();
    });
    container.appendChild(noneChip);

    presets.forEach((preset, idx) => {
      const chip = _makeSelectorChip(preset.name, state.allyPresetIdx === idx, () => {
        // assignToAlly updates state.allyPresetIdx, then we re-render so the chip shows active
        assignToAlly(idx);
        renderAllySelector();
        window.XPCalcUI && window.XPCalcUI.updateAllyExpShareDisplay();
      });
      container.appendChild(chip);
    });
  }

  function renderEnemySelector() {
    const container = $('enemy-preset-chips');
    if (!container) return;

    const presets = loadAll();
    container.innerHTML = '';

    // "None" option
    const noneChip = _makeSelectorChip('None', state.enemyPresetIdx === null, () => {
      assignToEnemy(null);
      renderEnemySelector();
    });
    container.appendChild(noneChip);

    presets.forEach((preset, idx) => {
      const chip = _makeSelectorChip(preset.name, state.enemyPresetIdx === idx, () => {
        assignToEnemy(idx);
        renderEnemySelector();
      });
      container.appendChild(chip);
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Build a preset chip (for the player queue bar): name button + delete button.
   */
  function _makeChip(name, idx, onLoad, onDelete) {
    const chip = document.createElement('div');
    chip.className = 'preset-chip';

    const nameBtn = document.createElement('button');
    nameBtn.className = 'preset-chip-name';
    nameBtn.textContent = name;
    nameBtn.title = `Load "${name}" onto queue`;
    nameBtn.addEventListener('click', onLoad);

    const delBtn = document.createElement('button');
    delBtn.className = 'preset-chip-del';
    delBtn.textContent = '✕';
    delBtn.title = `Delete "${name}"`;
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); onDelete(); });

    chip.appendChild(nameBtn);
    chip.appendChild(delBtn);
    return chip;
  }

  /**
   * Build a selector chip (for ally/enemy blocks): toggleable active state.
   */
  function _makeSelectorChip(name, isActive, onClick) {
    const chip = document.createElement('button');
    chip.className = 'preset-selector-chip' + (isActive ? ' active' : '');
    chip.textContent = name;
    chip.addEventListener('click', onClick);
    return chip;
  }

  // ─── Import / Export ─────────────────────────────────────────────────────

  /**
   * Export all presets as a JSON file download.
   */
  function exportPresets() {
    const presets = loadAll();
    if (presets.length === 0) {
      alert('No presets to export.');
      return;
    }
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'xpcalc-presets.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Open a file picker and import presets from a JSON file.
   * Merges with existing presets (no duplicates by name).
   */
  function importPresets() {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (!Array.isArray(imported)) throw new Error('Invalid format');
          // Validate basic structure
          const valid = imported.filter(p => p && typeof p.name === 'string' && Array.isArray(p.queue));
          if (valid.length === 0) throw new Error('No valid presets found');
          const existing = loadAll();
          // Merge: skip presets whose name already exists
          let added = 0;
          valid.forEach(p => {
            if (!existing.some(e => e.name === p.name)) {
              existing.push({ name: p.name, queue: p.queue.map(ev => ({ ...ev })) });
              added++;
            }
          });
          saveAll(existing);
          renderPlayerChips();
          renderAllySelector();
          renderEnemySelector();
          alert(`Imported ${added} preset(s). ${valid.length - added} skipped (name already exists).`);
        } catch (err) {
          alert('Import failed: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  // ─── Save modal ───────────────────────────────────────────────────────────

  /** Open the save-preset modal, pre-filling the summary. */
  function openSaveModal() {
    const input = $('preset-name-input');
    if (input) input.value = '';

    const summary = $('preset-save-summary');
    if (summary) {
      const n = state.killQueue.length;
      summary.innerHTML = n === 0
        ? '<span style="color:var(--text-dim);font-size:0.85rem;">⚠️ Kill Queue is empty — nothing to save.</span>'
        : `<span style="color:var(--text-dim);font-size:0.85rem;">Saving <strong style="color:var(--text)">${n} event${n > 1 ? 's' : ''}</strong> from the current Kill Queue.</span>`;
    }

    $('preset-save-modal').style.display = 'flex';
    if (input) setTimeout(() => input.focus(), 50);
  }

  /** Confirm and persist the save from the modal. */
  function confirmSave() {
    const input = $('preset-name-input');
    const name = (input ? input.value.trim() : '') || 'Unnamed';
    const saved = saveCurrentQueue(name);
    $('preset-save-modal').style.display = 'none';
    if (saved) {
      renderPlayerChips();
      renderAllySelector();
      renderEnemySelector();
    }
  }

  // ─── Event bindings ───────────────────────────────────────────────────────

  /** Bind all preset-related DOM events. Called once from main.js init. */
  function bindEvents() {
    $('preset-save-btn').addEventListener('click', openSaveModal);
    $('preset-save-close').addEventListener('click', () => { $('preset-save-modal').style.display = 'none'; });
    $('preset-save-cancel').addEventListener('click', () => { $('preset-save-modal').style.display = 'none'; });
    $('preset-save-confirm').addEventListener('click', confirmSave);
    $('preset-save-modal').addEventListener('click', e => {
      if (e.target === $('preset-save-modal')) $('preset-save-modal').style.display = 'none';
    });
    $('preset-name-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmSave();
    });

    // Import / Export
    const exportBtn = $('preset-export-btn');
    const importBtn = $('preset-import-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportPresets);
    if (importBtn) importBtn.addEventListener('click', importPresets);
  }

  return {
    loadAll,
    saveCurrentQueue,
    deletePreset,
    loadOntoPlayer,
    assignToAlly,
    assignToEnemy,
    renderPlayerChips,
    renderAllySelector,
    renderEnemySelector,
    openSaveModal,
    confirmSave,
    exportPresets,
    importPresets,
    bindEvents,
  };
})();