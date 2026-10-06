/**
 * buildStorage.js - Saved builds for the damage calculator
 *
 * A build is a snapshot of the whole calculator, using the exact same payload
 * as the share link (shareLink.js: serializeState / applyState), so a saved
 * build, a shared link and an exported file always describe the same thing.
 *
 * Storage: localStorage key "ut_calc_builds" (array). No account, nothing sent
 * anywhere. Every storage access is wrapped in try/catch (private windows,
 * blocked site data, full quota...).
 *
 * Build: { id, name, note, pinned, created, updated, atk, def, s }
 *   atk / def : pokemonId       s : serializeState() payload
 */

import { state } from './state.js';
import { serializeState, applyState, buildURLFor } from './shareLink.js';
import { selectAttacker, selectDefender } from './pokemonManager.js';

const KEY = 'ut_calc_builds';
const MAX_BUILDS = 100;
const EXPORT_APP = 'unitetools-calc-builds';

// ── i18n helper (falls back to English text if a key is missing) ────────────

function tr(key, fallback, vars = {}) {
  const lang = localStorage.getItem('lang') || 'fr';
  let s = window.translations?.[lang]?.[key] ?? fallback;
  Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, v); });
  return s;
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// ── Storage ─────────────────────────────────────────────────────────────────

let storageOk = true;
let memory = [];   // fallback when localStorage is unavailable (lives until reload)

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(isValidBuild) : [];
  } catch {
    storageOk = false;
    return memory;
  }
}

function writeAll(list) {
  memory = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    storageOk = true;
    return true;
  } catch {
    storageOk = false;
    return false;
  }
}

function isValidBuild(b) {
  return b && typeof b === 'object' && typeof b.id === 'string'
    && typeof b.name === 'string' && typeof b.atk === 'string' && typeof b.def === 'string'
    && b.s && typeof b.s === 'object';
}

const uid = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Saved builds, for the Compare tab. */
export function getSavedBuilds() { return readAll(); }

// ── Helpers ─────────────────────────────────────────────────────────────────

const poke = id => state.allPokemon.find(p => p.pokemonId === id);
const pokeName = id => poke(id)?.displayName || id;

function defaultName() {
  return `${state.currentAttacker?.displayName || '?'} vs ${state.currentDefender?.displayName || '?'}`;
}

function fmtDate(ts) {
  try { return new Date(ts).toLocaleDateString(localStorage.getItem('lang') || 'fr', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

function toast(message) {
  let el = document.getElementById('shareToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'shareToast';
    el.className = 'share-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2400);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

// ── Actions ─────────────────────────────────────────────────────────────────

function saveCurrent(name, note) {
  if (!state.currentAttacker || !state.currentDefender) return false;
  const list = readAll();
  if (list.length >= MAX_BUILDS) {
    toast(tr('calc_builds_full', 'Build limit reached ({n}). Delete one first.', { n: MAX_BUILDS }));
    return false;
  }
  const now = Date.now();
  list.unshift({
    id: uid(),
    name: (name || '').trim().slice(0, 60) || defaultName(),
    note: (note || '').trim().slice(0, 200),
    pinned: false,
    created: now,
    updated: now,
    atk: state.currentAttacker.pokemonId,
    def: state.currentDefender.pokemonId,
    s: serializeState(),
  });
  if (!writeAll(list)) { toast(tr('calc_builds_storage_failed', 'Could not save: browser storage is blocked or full. Use Export instead.')); return false; }
  toast(tr('calc_builds_saved', 'Build saved!'));
  return true;
}

function loadBuild(id) {
  const b = readAll().find(x => x.id === id);
  if (!b) return;
  if (!poke(b.atk) || !poke(b.def)) { toast(tr('calc_builds_missing_pokemon', 'This build uses a Pokémon that no longer exists.')); return; }
  selectAttacker(b.atk);          // selecting a Pokémon resets its toggles,
  selectDefender(b.def);          // so the snapshot is applied last
  applyState(b.s);
  toast(tr('calc_builds_loaded', 'Build loaded: {name}', { name: b.name }));
  closePanel();
}

function updateBuild(id, patch) {
  const list = readAll();
  const b = list.find(x => x.id === id);
  if (!b) return;
  Object.assign(b, patch, { updated: Date.now() });
  writeAll(list);
}

function overwriteBuild(id) {
  if (!state.currentAttacker || !state.currentDefender) return;
  updateBuild(id, { atk: state.currentAttacker.pokemonId, def: state.currentDefender.pokemonId, s: serializeState() });
  toast(tr('calc_builds_updated', 'Build updated with the current setup.'));
}

function duplicateBuild(id) {
  const list = readAll();
  const b = list.find(x => x.id === id);
  if (!b) return;
  if (list.length >= MAX_BUILDS) { toast(tr('calc_builds_full', 'Build limit reached ({n}). Delete one first.', { n: MAX_BUILDS })); return; }
  const now = Date.now();
  list.unshift({ ...structuredClone(b), id: uid(), name: `${b.name} (copy)`.slice(0, 60), pinned: false, created: now, updated: now });
  writeAll(list);
}

function deleteBuild(id) {
  writeAll(readAll().filter(x => x.id !== id));
}

async function shareBuild(id) {
  const b = readAll().find(x => x.id === id);
  if (!b) return;
  const ok = await copyText(buildURLFor(b.atk, b.def, b.s));
  toast(ok ? tr('calc_share_copied', 'Link copied!') : tr('calc_share_failed', 'Copy failed.'));
}

// ── Export / import ─────────────────────────────────────────────────────────

function exportAll() {
  const data = { app: EXPORT_APP, version: 1, exported: new Date().toISOString(), builds: readAll() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `unitetools-builds-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const signature = b => JSON.stringify([b.name, b.atk, b.def, b.s]);

async function importFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); }
  catch { toast(tr('calc_builds_import_invalid', 'Invalid file.')); return; }

  const incoming = Array.isArray(data) ? data : data?.builds;
  if (!Array.isArray(incoming)) { toast(tr('calc_builds_import_invalid', 'Invalid file.')); return; }

  const list = readAll();
  const known = new Set(list.map(signature));
  let added = 0, skipped = 0;
  const now = Date.now();

  for (const raw of incoming) {
    if (!isValidBuild(raw)) { skipped++; continue; }
    const b = {
      id: uid(),
      name: String(raw.name).slice(0, 60),
      note: typeof raw.note === 'string' ? raw.note.slice(0, 200) : '',
      pinned: !!raw.pinned,
      created: Number(raw.created) || now,
      updated: Number(raw.updated) || now,
      atk: raw.atk, def: raw.def, s: raw.s,
    };
    if (known.has(signature(b))) { skipped++; continue; }
    if (list.length >= MAX_BUILDS) { skipped++; continue; }
    list.push(b);
    known.add(signature(b));
    added++;
  }

  if (added && !writeAll(list)) { toast(tr('calc_builds_storage_failed', 'Could not save: browser storage is blocked or full. Use Export instead.')); return; }
  toast(tr('calc_builds_imported', '{added} imported, {skipped} skipped.', { added, skipped }));
}

// ── Panel ───────────────────────────────────────────────────────────────────

let panel, overlay;
let filterText = '';
let filterPoke = '';

function buildPanel() {
  overlay = document.createElement('div');
  overlay.className = 'builds-overlay';
  overlay.addEventListener('click', closePanel);

  panel = document.createElement('aside');
  panel.className = 'builds-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Builds');
  panel.innerHTML = `
    <div class="builds-head">
      <h2 data-b="title"></h2>
      <button class="builds-close" type="button" aria-label="Close">✕</button>
    </div>
    <div class="builds-save">
      <input type="text" class="builds-name" maxlength="60" data-b="name-ph">
      <input type="text" class="builds-note" maxlength="200" data-b="note-ph">
      <button type="button" class="builds-save-btn" data-b="save"></button>
    </div>
    <div class="builds-filters">
      <input type="search" class="builds-search" data-b="search-ph">
      <select class="builds-poke-filter"></select>
    </div>
    <div class="builds-warn" hidden data-b="warn"></div>
    <div class="builds-list"></div>
    <div class="builds-foot">
      <button type="button" class="builds-export" data-b="export"></button>
      <button type="button" class="builds-import" data-b="import"></button>
      <input type="file" class="builds-file" accept="application/json,.json" hidden>
    </div>`;

  document.body.append(overlay, panel);

  panel.querySelector('.builds-close').addEventListener('click', closePanel);
  panel.querySelector('.builds-save-btn').addEventListener('click', () => {
    const nameEl = panel.querySelector('.builds-name');
    const noteEl = panel.querySelector('.builds-note');
    if (saveCurrent(nameEl.value, noteEl.value)) { nameEl.value = ''; noteEl.value = ''; render(); }
  });
  panel.querySelector('.builds-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') panel.querySelector('.builds-save-btn').click();
  });
  panel.querySelector('.builds-search').addEventListener('input', e => { filterText = e.target.value.trim().toLowerCase(); renderList(); });
  panel.querySelector('.builds-poke-filter').addEventListener('change', e => { filterPoke = e.target.value; renderList(); });
  panel.querySelector('.builds-export').addEventListener('click', exportAll);
  const file = panel.querySelector('.builds-file');
  panel.querySelector('.builds-import').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => { if (file.files[0]) { await importFile(file.files[0]); file.value = ''; render(); } });

  panel.querySelector('.builds-list').addEventListener('click', onListClick);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) closePanel(); });
}

function applyLabels() {
  const L = {
    title: tr('calc_builds_title', '💾 My builds'),
    save: tr('calc_builds_save_btn', 'Save current setup'),
    export: tr('calc_builds_export', '⬇ Export'),
    import: tr('calc_builds_import', '⬆ Import'),
    warn: tr('calc_builds_storage_warn', 'Browser storage is unavailable: builds will be lost when you reload. Use Export to keep them.'),
  };
  panel.querySelectorAll('[data-b]').forEach(el => {
    const k = el.dataset.b;
    if (k === 'name-ph') el.placeholder = tr('calc_builds_name_ph', 'Name (default: {n})', { n: defaultName() });
    else if (k === 'note-ph') el.placeholder = tr('calc_builds_note_ph', 'Note (optional)');
    else if (k === 'search-ph') el.placeholder = tr('calc_builds_search_ph', 'Search a build...');
    else if (L[k]) el.textContent = L[k];
  });
  panel.querySelector('.builds-warn').hidden = storageOk;
}

function render() {
  if (!panel) return;
  applyLabels();

  const list = readAll();
  const sel = panel.querySelector('.builds-poke-filter');
  const ids = [...new Set(list.flatMap(b => [b.atk]))].sort((a, b) => pokeName(a).localeCompare(pokeName(b)));
  sel.innerHTML = `<option value="">${esc(tr('calc_builds_all_pokemon', 'All attackers'))}</option>` +
    ids.map(id => `<option value="${esc(id)}"${id === filterPoke ? ' selected' : ''}>${esc(pokeName(id))}</option>`).join('');
  if (filterPoke && !ids.includes(filterPoke)) filterPoke = '';

  renderList();
}

function renderList() {
  const box = panel.querySelector('.builds-list');
  let list = readAll();
  const total = list.length;

  if (filterPoke) list = list.filter(b => b.atk === filterPoke);
  if (filterText) list = list.filter(b => `${b.name} ${b.note} ${pokeName(b.atk)} ${pokeName(b.def)}`.toLowerCase().includes(filterText));
  list.sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));

  if (!list.length) {
    box.innerHTML = `<p class="builds-empty">${esc(total
      ? tr('calc_builds_no_match', 'No build matches your search.')
      : tr('calc_builds_empty', 'No saved build yet. Set up the calculator, then press “Save current setup”.'))}</p>`;
    return;
  }

  box.innerHTML = list.map(b => {
    const a = poke(b.atk), d = poke(b.def);
    const itemsA = (b.s.i?.a || []).filter(Boolean).map(x => x[0]);
    return `<article class="build-card${b.pinned ? ' pinned' : ''}" data-id="${esc(b.id)}">
      <div class="build-main" data-act="load" title="${esc(tr('calc_builds_load', 'Load'))}">
        <div class="build-icons">
          <img src="${esc(a?.image || 'assets/items/none.png')}" alt="" onerror="this.style.visibility='hidden'">
          <span class="build-vs">vs</span>
          <img src="${esc(d?.image || 'assets/items/none.png')}" alt="" onerror="this.style.visibility='hidden'">
        </div>
        <div class="build-text">
          <span class="build-name">${esc(b.name)}</span>
          <span class="build-meta">Lv.${esc(b.s.al || 15)} · ${esc(itemsA.join(', ') || '-')}</span>
          ${b.note ? `<span class="build-note">${esc(b.note)}</span>` : ''}
          <span class="build-date">${esc(fmtDate(b.updated))}</span>
        </div>
      </div>
      <div class="build-actions">
        <button type="button" data-act="pin" title="${esc(tr('calc_builds_pin', 'Pin'))}">${b.pinned ? '★' : '☆'}</button>
        <button type="button" data-act="overwrite" title="${esc(tr('calc_builds_overwrite', 'Overwrite with current setup'))}">↻</button>
        <button type="button" data-act="rename" title="${esc(tr('calc_builds_rename', 'Rename'))}">✎</button>
        <button type="button" data-act="dup" title="${esc(tr('calc_builds_duplicate', 'Duplicate'))}">⧉</button>
        <button type="button" data-act="share" title="${esc(tr('calc_builds_copy_link', 'Copy link'))}">🔗</button>
        <button type="button" data-act="del" class="danger" title="${esc(tr('calc_builds_delete', 'Delete'))}">🗑</button>
      </div>
    </article>`;
  }).join('');
}

function onListClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.closest('.build-card')?.dataset.id;
  if (!id) return;

  switch (btn.dataset.act) {
    case 'load': loadBuild(id); return;
    case 'pin': { const b = readAll().find(x => x.id === id); if (b) updateBuild(id, { pinned: !b.pinned }); break; }
    case 'overwrite': {
      if (confirm(tr('calc_builds_confirm_overwrite', 'Replace this build with the current setup?'))) overwriteBuild(id);
      break;
    }
    case 'rename': {
      const b = readAll().find(x => x.id === id);
      const name = b && prompt(tr('calc_builds_rename_prompt', 'New name:'), b.name);
      if (name && name.trim()) updateBuild(id, { name: name.trim().slice(0, 60) });
      break;
    }
    case 'dup': duplicateBuild(id); break;
    case 'share': shareBuild(id); return;
    case 'del': {
      if (confirm(tr('calc_builds_confirm_delete', 'Delete this build?'))) deleteBuild(id);
      break;
    }
  }
  render();
}

function openPanel() {
  if (!panel) buildPanel();
  render();
  overlay.classList.add('open');
  panel.classList.add('open');
}

function closePanel() {
  overlay?.classList.remove('open');
  panel?.classList.remove('open');
}

// ── Init ────────────────────────────────────────────────────────────────────

export function initBuildStorage() {
  const btn = document.getElementById('buildsBtn');
  if (!btn) return;
  btn.addEventListener('click', openPanel);
  const refresh = () => { if (panel?.classList.contains('open')) render(); };
  document.addEventListener('translationsReady', refresh);
}