/**
 * library.js - Saved tierlists ("My tierlists")
 *
 * A personal library, separate from the working tabs: save the current tab as
 * a named entry, reopen it later in a NEW tab (nothing is overwritten), rename,
 * pin, update it with the current tab, delete, export / import everything.
 *
 * Storage: localStorage "ut_tierlist_library" (array), all accesses in try/catch.
 * Entry: { id, name, pinned, created, updated, tiers }   (tiers = draft.tiers)
 */

import state from './state.js';
import { loadTabs, loadTierList } from './tierlist.js';
import { loadGallery } from './gallery.js';
import { recalcUsage } from './usage.js';
import { getBasePath } from './dataLoader.js';

const KEY = 'ut_tierlist_library';
const MAX = 50;
const EXPORT_APP = 'unitetools-tierlist-library';

const t = (key, fb, vars = {}) => {
  let s = window.translations?.[localStorage.getItem('lang') || 'fr']?.[key] ?? fb;
  Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, v); });
  return s;
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (m, type = 'info') => window.showToast?.(m, type);

// ── Storage ─────────────────────────────────────────────────────────────────

let storageOk = true;
let memory = [];

const valid = e => e && typeof e === 'object' && typeof e.id === 'string' && typeof e.name === 'string' &&
  Array.isArray(e.tiers) && e.tiers.every(x => x && Array.isArray(x.items));

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(valid) : [];
  } catch { storageOk = false; return memory; }
}

function writeAll(list) {
  memory = list;
  try { localStorage.setItem(KEY, JSON.stringify(list)); storageOk = true; return true; }
  catch { storageOk = false; return false; }
}

const uid = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const count = e => e.tiers.reduce((s, x) => s + x.items.length, 0);
const currentDraft = () => state.drafts.find(d => d.id === state.currentDraft);

// ── Actions ─────────────────────────────────────────────────────────────────

function saveCurrent(name) {
  const d = currentDraft();
  if (!d) return false;
  const list = readAll();
  if (list.length >= MAX) { toast(t('tierlist_lib_full', 'Library full ({n}). Delete one first.', { n: MAX }), 'error'); return false; }
  const now = Date.now();
  list.unshift({
    id: uid(),
    name: (name || '').trim().slice(0, 60) || d.label,
    pinned: false, created: now, updated: now,
    tiers: JSON.parse(JSON.stringify(d.tiers)),
  });
  if (!writeAll(list)) { toast(t('tierlist_lib_storage_failed', 'Could not save: browser storage blocked or full. Use Export.'), 'error'); return false; }
  toast(t('tierlist_lib_saved', 'Tierlist saved!'), 'success');
  return true;
}

/** Open an entry in a new tab, with fresh uids so nothing collides. */
function openEntry(id) {
  const e = readAll().find(x => x.id === id);
  if (!e) return;
  const newId = Math.max(0, ...state.drafts.map(d => d.id)) + 1;
  const tiers = JSON.parse(JSON.stringify(e.tiers)).map(tier => ({
    name: tier.name, color: tier.color,
    items: tier.items.map(it => ({ ...it, uid: state.nextUid() })),
  }));
  state.drafts.push({ id: newId, label: e.name.slice(0, 40), tiers });
  state.currentDraft = newId;
  recalcUsage(newId);
  loadTabs();
  loadTierList(newId);
  loadGallery(state.currentCategory);
  window.triggerAutoSave?.();
  toast(t('tierlist_lib_opened', 'Opened in a new tab: {name}', { name: e.name }), 'success');
  closePanel();
}

function update(id, patch) {
  const list = readAll();
  const e = list.find(x => x.id === id);
  if (!e) return;
  Object.assign(e, patch, { updated: Date.now() });
  writeAll(list);
}

function exportAll() {
  const data = { app: EXPORT_APP, version: 1, exported: new Date().toISOString(), entries: readAll() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `unitetools-tierlists-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const sig = e => JSON.stringify([e.name, e.tiers]);

async function importFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast(t('tierlist_lib_import_invalid', 'Invalid file.'), 'error'); return; }
  const incoming = Array.isArray(data) ? data : data?.entries;
  if (!Array.isArray(incoming)) { toast(t('tierlist_lib_import_invalid', 'Invalid file.'), 'error'); return; }

  const list = readAll();
  const known = new Set(list.map(sig));
  let added = 0, skipped = 0;
  const now = Date.now();
  for (const raw of incoming) {
    if (!valid(raw)) { skipped++; continue; }
    const e = {
      id: uid(), name: String(raw.name).slice(0, 60), pinned: !!raw.pinned,
      created: Number(raw.created) || now, updated: Number(raw.updated) || now,
      tiers: raw.tiers.map(x => ({ name: String(x.name ?? 'Tier'), color: x.color || '#95a5a6', items: x.items.filter(i => i && i.name && i.category && i.file) })),
    };
    if (known.has(sig(e)) || list.length >= MAX) { skipped++; continue; }
    list.push(e); known.add(sig(e)); added++;
  }
  if (added && !writeAll(list)) { toast(t('tierlist_lib_storage_failed', 'Could not save: browser storage blocked or full. Use Export.'), 'error'); return; }
  toast(t('tierlist_lib_imported', '{added} imported, {skipped} skipped.', { added, skipped }), 'success');
}

// ── Panel ───────────────────────────────────────────────────────────────────

let panel, overlay, filterText = '';

function build() {
  overlay = document.createElement('div');
  overlay.className = 'tl-lib-overlay';
  overlay.addEventListener('click', closePanel);

  panel = document.createElement('aside');
  panel.className = 'tl-lib-panel';
  panel.setAttribute('role', 'dialog');
  panel.innerHTML = `
    <div class="tl-lib-head"><h2></h2><button type="button" class="tl-lib-close" aria-label="Close">✕</button></div>
    <div class="tl-lib-save">
      <input type="text" class="tl-lib-name" maxlength="60">
      <button type="button" class="tl-lib-save-btn"></button>
    </div>
    <input type="search" class="tl-lib-search">
    <div class="tl-lib-warn" hidden></div>
    <div class="tl-lib-list"></div>
    <div class="tl-lib-foot">
      <button type="button" class="tl-lib-export"></button>
      <button type="button" class="tl-lib-import"></button>
      <input type="file" class="tl-lib-file" accept="application/json,.json" hidden>
    </div>`;
  document.body.append(overlay, panel);

  panel.querySelector('.tl-lib-close').addEventListener('click', closePanel);
  const nameEl = panel.querySelector('.tl-lib-name');
  panel.querySelector('.tl-lib-save-btn').addEventListener('click', () => { if (saveCurrent(nameEl.value)) { nameEl.value = ''; render(); } });
  nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') panel.querySelector('.tl-lib-save-btn').click(); });
  panel.querySelector('.tl-lib-search').addEventListener('input', e => { filterText = e.target.value.trim().toLowerCase(); renderList(); });
  panel.querySelector('.tl-lib-export').addEventListener('click', exportAll);
  const file = panel.querySelector('.tl-lib-file');
  panel.querySelector('.tl-lib-import').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => { if (file.files[0]) { await importFile(file.files[0]); file.value = ''; render(); } });
  panel.querySelector('.tl-lib-list').addEventListener('click', onClick);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) closePanel(); });
}

function render() {
  if (!panel) return;
  panel.querySelector('h2').textContent = t('tierlist_lib_title', '💾 My tierlists');
  panel.querySelector('.tl-lib-name').placeholder = t('tierlist_lib_name_ph', 'Name (default: {n})', { n: currentDraft()?.label || '' });
  panel.querySelector('.tl-lib-save-btn').textContent = t('tierlist_lib_save_btn', 'Save current tierlist');
  panel.querySelector('.tl-lib-search').placeholder = t('tierlist_lib_search_ph', 'Search...');
  panel.querySelector('.tl-lib-export').textContent = t('tierlist_lib_export', '⬇ Export');
  panel.querySelector('.tl-lib-import').textContent = t('tierlist_lib_import', '⬆ Import');
  const warn = panel.querySelector('.tl-lib-warn');
  warn.textContent = t('tierlist_lib_storage_warn', 'Browser storage unavailable: saves will be lost on reload. Use Export.');
  warn.hidden = storageOk;
  renderList();
}

function renderList() {
  const box = panel.querySelector('.tl-lib-list');
  const base = getBasePath();
  let list = readAll();
  const total = list.length;
  if (filterText) list = list.filter(e => e.name.toLowerCase().includes(filterText));
  list.sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));

  if (!list.length) {
    box.innerHTML = `<p class="tl-lib-empty">${esc(total ? t('tierlist_lib_no_match', 'No match.') : t('tierlist_lib_empty', 'Nothing saved yet. Build a tierlist, then press “Save current tierlist”.'))}</p>`;
    return;
  }

  box.innerHTML = list.map(e => {
    const thumbs = e.tiers.flatMap(x => x.items).slice(0, 7)
      .map(i => `<img src="${esc(`${base}assets/${i.category}/${i.file}`)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`).join('');
    const bars = e.tiers.map(x => `<span style="background:${esc(x.color || '#888')};flex:${Math.max(1, x.items.length)}" title="${esc(x.name)}: ${x.items.length}"></span>`).join('');
    let date = '';
    try { date = new Date(e.updated).toLocaleDateString(localStorage.getItem('lang') || 'fr', { day: '2-digit', month: 'short', year: 'numeric' }); } catch {}
    return `<article class="tl-lib-card${e.pinned ? ' pinned' : ''}" data-id="${esc(e.id)}">
      <div class="tl-lib-main" data-act="open" title="${esc(t('tierlist_lib_open', 'Open in a new tab'))}">
        <div class="tl-lib-name-row"><strong>${esc(e.name)}</strong><small>${count(e)} · ${esc(date)}</small></div>
        <div class="tl-lib-bars">${bars}</div>
        <div class="tl-lib-thumbs">${thumbs}</div>
      </div>
      <div class="tl-lib-actions">
        <button type="button" data-act="pin" title="${esc(t('tierlist_lib_pin', 'Pin'))}">${e.pinned ? '★' : '☆'}</button>
        <button type="button" data-act="overwrite" title="${esc(t('tierlist_lib_overwrite', 'Replace with current tierlist'))}">↻</button>
        <button type="button" data-act="rename" title="${esc(t('tierlist_lib_rename', 'Rename'))}">✎</button>
        <button type="button" data-act="del" class="danger" title="${esc(t('tierlist_lib_delete', 'Delete'))}">🗑</button>
      </div>
    </article>`;
  }).join('');
}

function onClick(ev) {
  const btn = ev.target.closest('[data-act]');
  const id = btn?.closest('.tl-lib-card')?.dataset.id;
  if (!id) return;
  const e = readAll().find(x => x.id === id);
  if (!e) return;
  switch (btn.dataset.act) {
    case 'open': openEntry(id); return;
    case 'pin': update(id, { pinned: !e.pinned }); break;
    case 'overwrite':
      if (confirm(t('tierlist_lib_confirm_overwrite', 'Replace this save with the current tierlist?'))) {
        const d = currentDraft();
        if (d) { update(id, { tiers: JSON.parse(JSON.stringify(d.tiers)) }); toast(t('tierlist_lib_updated', 'Save updated.'), 'success'); }
      }
      break;
    case 'rename': {
      const n = prompt(t('tierlist_lib_rename_prompt', 'New name:'), e.name);
      if (n && n.trim()) update(id, { name: n.trim().slice(0, 60) });
      break;
    }
    case 'del':
      if (confirm(t('tierlist_lib_confirm_delete', 'Delete this save?'))) writeAll(readAll().filter(x => x.id !== id));
      break;
  }
  render();
}

function openPanel() { if (!panel) build(); render(); overlay.classList.add('open'); panel.classList.add('open'); }
function closePanel() { overlay?.classList.remove('open'); panel?.classList.remove('open'); }

export function setupLibrary() {
  document.getElementById('library-btn')?.addEventListener('click', openPanel);
  document.addEventListener('translationsReady', () => { if (panel?.classList.contains('open')) render(); });
}