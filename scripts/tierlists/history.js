/**
 * history.js - Undo / redo for the tierlist page
 *
 * Every mutation of the tierlists already goes through window.triggerAutoSave()
 * (storage.js), so that is the single hook: each call takes a snapshot of
 * state.drafts. Undo/redo just walk that stack and re-render.
 *
 * Only the content of the drafts is snapshotted (tabs, tiers, items, moves).
 * Which tab is open and the gallery filters are not part of the history.
 */

import state from './state.js';
import { loadTabs, loadTierList } from './tierlist.js';
import { loadGallery } from './gallery.js';
import { recalcUsage } from './usage.js';

const MAX_STEPS = 100;

let stack = [];       // JSON strings of state.drafts
let index = -1;
let restoring = false;

const snapshot = () => JSON.stringify(state.drafts);

/** Take a snapshot if something changed since the last one. */
export function recordHistory() {
  if (restoring) return;
  const snap = snapshot();
  if (stack[index] === snap) return;
  stack = stack.slice(0, index + 1);      // a new action drops the redo branch
  stack.push(snap);
  if (stack.length > MAX_STEPS) stack.shift();
  index = stack.length - 1;
  updateButtons();
}

/** Baseline = the state after the page has loaded. */
export function resetHistory() {
  stack = [snapshot()];
  index = 0;
  updateButtons();
}

function restore(snap) {
  restoring = true;
  try {
    state.drafts = JSON.parse(snap);
    if (!state.drafts.find(d => d.id === state.currentDraft)) state.currentDraft = state.drafts[0].id;
    recalcUsage(state.currentDraft);
    loadTabs();
    loadTierList(state.currentDraft);
    loadGallery(state.currentCategory);
  } finally {
    restoring = false;
  }
  window.triggerAutoSave?.();   // persist (record is skipped while restoring and dedupes afterwards)
}

export function undo() {
  if (index <= 0) { window.showToast?.('Nothing to undo', 'info'); return; }
  index--;
  restore(stack[index]);
  updateButtons();
  window.showToast?.('Undone', 'info');
}

export function redo() {
  if (index >= stack.length - 1) { window.showToast?.('Nothing to redo', 'info'); return; }
  index++;
  restore(stack[index]);
  updateButtons();
  window.showToast?.('Redone', 'info');
}

function updateButtons() {
  const u = document.getElementById('undo-btn');
  const r = document.getElementById('redo-btn');
  if (u) u.disabled = index <= 0;
  if (r) r.disabled = index >= stack.length - 1;
}

export function setupHistory() {
  document.getElementById('undo-btn')?.addEventListener('click', undo);
  document.getElementById('redo-btn')?.addEventListener('click', redo);

  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
  });

  // Take a snapshot after every mutation (wraps the autosave hook from storage.js)
  const original = window.triggerAutoSave;
  window.triggerAutoSave = (...args) => { recordHistory(); original?.(...args); };

  resetHistory();
}