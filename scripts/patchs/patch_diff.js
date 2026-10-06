/**
 * patch_diff.js - "Stat changes" tab of the Patch Tracker
 *
 * Automatic diff between two patch snapshots of poke_data (the archives listed
 * in scripts/calculator/patchesConfig.js + the live file). Nothing is typed by
 * hand: adding a snapshot to patchesConfig.js makes it show up here.
 *
 * For each Pokémon it reports:
 *   - stat changes (HP, Atk, Def, Sp.Atk, Sp.Def, Crit, Lifesteal) by level
 *   - move changes: damage / heal / shield formulas, added or removed entries,
 *     learn / upgrade levels
 *   - passive changes (numeric fields, description)
 *   - new / removed Pokémon
 * and flags the ones that are listed in the official patch notes
 * (data/patches.json) so data corrections are easy to tell apart from balance changes.
 *
 * Buff / nerf colors compare the value of each entry at level 15, with the
 * Pokémon's own level-15 stats as reference. Non-numeric changes stay neutral.
 *
 * Integration with patch_tracker.js (classic script) goes through events:
 *   patchDiffRender  (tracker -> here)  { search, filter }
 *   patchDiffOpen    (tracker -> here)  { date }   open the diff of that patch
 *   patchDiffReady   (here -> tracker)             snapshots are known
 * and window.PatchDiff.previousSnapshotFor(date).
 */

import { patches } from '../calculator/patchesConfig.js';
import { buildMonsMap, mapPokeDataWithMons } from '../calculator/dataLoader.js';

// ── Small helpers ───────────────────────────────────────────────────────────

function t(key, fallback, vars = {}) {
  const lang = localStorage.getItem('lang') || 'fr';
  let s = window.translations?.[lang]?.[key] ?? fallback;
  Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, v); });
  return s;
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/** Name key tolerant to punctuation differences ("Sirfetch'd" / "Sirfetchd", "Mega-Charizard Y" / "Mega Charizard Y"). */
const nk = n => String(n ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const fmtNum = n => (typeof n === 'number' ? (Number.isInteger(n) ? n.toLocaleString('en-US') : String(+n.toFixed(2))) : String(n));

// ── Snapshots ───────────────────────────────────────────────────────────────
// { id, label, file, date, version } sorted newest -> oldest

let SNAPSHOTS = [];
let OFFICIAL = [];        // data/patches.json -> patches[]
let monsMapPromise = null;
const dataCache = new Map();

function snapshotDate(entry, official) {
  // 1) same name as an official patch ("Drive to Victory (Current)" -> "Drive to Victory")
  const name = entry.label.replace(/\s*\(current\)\s*$/i, '').trim().toLowerCase();
  const byName = official.find(p => p.name.trim().toLowerCase() === name);
  if (byName) return byName;
  // 2) archive file name: poke_data_DD-MM.json (the year comes from the newest official patch)
  const m = entry.file.match(/(\d{2})-(\d{2})\.json$/);
  if (m) {
    const year = (official[0]?.date || '').slice(0, 4) || String(new Date().getFullYear());
    const date = `${year}-${m[2]}-${m[1]}`;
    return official.find(p => p.date === date) || { date, version: null, name: entry.label };
  }
  // 3) live file without a matching name: newest official patch
  return official[0] || { date: '', version: null, name: entry.label };
}

function buildSnapshots() {
  SNAPSHOTS = patches
    .map(p => {
      const o = snapshotDate(p, OFFICIAL);
      return { id: p.id, label: p.label.replace(/\s*\(current\)\s*$/i, ''), file: p.file, date: o.date, version: o.version || null, isLive: p.id === 'live' };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Snapshot right before the one that matches this patch date (or null). */
function previousSnapshotFor(date) {
  const i = SNAPSHOTS.findIndex(s => s.date === date);
  return i >= 0 && i < SNAPSHOTS.length - 1 ? SNAPSHOTS[i + 1] : null;
}
let resolveReady;
const ready = new Promise(r => { resolveReady = r; });
window.PatchDiff = { previousSnapshotFor };

async function loadSnapshot(snap) {
  if (!dataCache.has(snap.id)) {
    dataCache.set(snap.id, (async () => {
      if (!monsMapPromise) monsMapPromise = fetch('data/pokemons.json').then(r => r.json()).then(buildMonsMap);
      const [raw, monsMap] = await Promise.all([
        fetch(snap.file).then(r => { if (!r.ok) throw new Error(`${snap.file} -> HTTP ${r.status}`); return r.json(); }),
        monsMapPromise,
      ]);
      return new Map(mapPokeDataWithMons(raw, monsMap).map(p => [p.pokemonId, p]));
    })());
  }
  return dataCache.get(snap.id);
}

// ── Diff engine ─────────────────────────────────────────────────────────────

const STAT_KEYS = [
  ['hp', 'HP'], ['atk', 'Atk'], ['def', 'Def'], ['sp_atk', 'Sp.Atk'], ['sp_def', 'Sp.Def'],
  ['crit', 'Crit %'], ['lifesteal', 'Lifesteal %'],
];

const SCALING_LABEL = {
  physical: 'Atk', special: 'Sp.Atk', atk: 'Atk', sp_atk: 'Sp.Atk', hp: 'Max HP', def: 'Def', sp_def: 'Sp.Def',
};

const PERCENT_FIELDS = [
  ['max_hp_percent', 'target max HP'], ['missing_hp_percent', 'target missing HP'],
  ['current_hp_percent', 'target current HP'], ['self_max_hp_percent', 'own max HP'],
];

// Fields that never count as a change (text only)
const IGNORED = new Set(['notes', 'name', 'image']);

/** Human formula of one damage / heal / shield entry, e.g. "75% Sp.Atk + 21/lvl + 390 (x5)". */
function describeEntry(e, style) {
  if (!e) return '—';
  const parts = [];
  PERCENT_FIELDS.forEach(([k, label]) => { if (e[k] != null) parts.push(`${fmtNum(e[k])}% ${label}`); });
  if (e.multiplier || (!parts.length && e.multiplier === 0 && !e.constant && !e.levelCoef)) {
    const scaling = e.scaling || style;
    parts.push(`${fmtNum(e.multiplier)}% ${SCALING_LABEL[scaling] || SCALING_LABEL[style] || ''}`.trim());
  }
  if (e.levelCoef) parts.push(`${fmtNum(e.levelCoef)}/lvl`);
  if (e.constant) parts.push(`${fmtNum(e.constant)}`);
  let out = parts.join(' + ') || '0';
  if (e.is_tick && e.tick_count) out += ` (x${e.tick_count})`;
  if (e.wild_cap != null) out += ` [wild cap ${fmtNum(e.wild_cap)}]`;
  return out;
}

/** Value of an entry at level 15 against a fixed reference stat, for buff/nerf direction only. */
function entryValue(e, stats15, style) {
  if (!e) return 0;
  let v = 0;
  PERCENT_FIELDS.forEach(([k]) => { if (e[k] != null) v += e[k] * 60; });   // ~6000 reference HP
  const scaling = e.scaling || style;
  const stat = { physical: stats15.atk, special: stats15.sp_atk, atk: stats15.atk, sp_atk: stats15.sp_atk, hp: stats15.hp, def: stats15.def, sp_def: stats15.sp_def }[scaling] || 0;
  v += ((e.multiplier || 0) / 100) * stat + (e.levelCoef || 0) * 14 + (e.constant || 0);
  if (e.is_tick && e.tick_count) v *= e.tick_count;
  return v;
}

const dirOf = (a, b) => (b > a ? 'up' : b < a ? 'down' : 'flat');

function statChanges(a, b) {
  const rows = [];
  const la = a.stats || [], lb = b.stats || [];
  STAT_KEYS.forEach(([key, label]) => {
    const changed = [];
    // Field absent from the whole older snapshot = it was not recorded then, not "0": nothing to compare
    if (la.length && lb.length && !la.some(l => l?.[key] != null) && lb.some(l => l?.[key] != null)) return;
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
      const va = la[i]?.[key] ?? 0, vb = lb[i]?.[key] ?? 0;
      if (va !== vb) changed.push({ lvl: i + 1, a: va, b: vb });
    }
    if (!changed.length) return;
    const first = changed[0], last = changed[changed.length - 1];
    const at = c => `Lv.${c.lvl}: ${fmtNum(c.a)} → ${fmtNum(c.b)}`;
    const shown = first === last ? at(first) : `${at(first)} · ${at(last)}`;
    const dir = dirOf(last.a ?? 0, last.b ?? 0);
    const at15 = changed.find(c => c.lvl === 15);
    rows.push({ label, text: shown, extra: changed.length > 2 ? t('patch_diff_levels', '{n} levels', { n: changed.length }) : '', dir, lv15: at15 || null });
  });
  return rows;
}

/** Entries of one kind (damages / heals / shields) keyed by name + occurrence. */
function keyed(list) {
  const seen = {};
  const map = new Map();
  (list || []).forEach(e => {
    const n = seen[e.name] = (seen[e.name] || 0) + 1;
    map.set(`${e.name}#${n}`, e);
  });
  return map;
}

function entriesEqual(x, y) {
  const strip = e => Object.fromEntries(Object.entries(e).filter(([k]) => !IGNORED.has(k)));
  return JSON.stringify(strip(x), Object.keys(strip(x)).sort()) === JSON.stringify(strip(y), Object.keys(strip(y)).sort());
}

const KIND_LABEL = { damages: '', heals: 'Heal', shields: 'Shield' };

function moveChanges(ma, mb, style, stats15) {
  const rows = [];

  ['learnLevel', 'unlearn', 'upgradeLevel'].forEach(k => {
    if ((ma[k] ?? null) !== (mb[k] ?? null)) {
      const label = { learnLevel: 'Learn level', unlearn: 'Replaced at level', upgradeLevel: 'Upgrade level' }[k];
      rows.push({ label, old: ma[k] ?? '—', neu: mb[k] ?? '—', dir: 'flat' });
    }
  });

  ['damages', 'heals', 'shields'].forEach(kind => {
    const A = keyed(ma[kind]), B = keyed(mb[kind]);
    const prefix = KIND_LABEL[kind] ? `${KIND_LABEL[kind]}: ` : '';
    new Set([...A.keys(), ...B.keys()]).forEach(key => {
      const ea = A.get(key), eb = B.get(key);
      const name = (eb || ea).name;
      if (ea && eb) {
        if (entriesEqual(ea, eb)) return;
        const fa = describeEntry(ea, style), fb = describeEntry(eb, style);
        const dir = dirOf(entryValue(ea, stats15, style), entryValue(eb, stats15, style));
        if (fa === fb) {
          // Something other than the formula changed (tick count, flags...)
          const keys = new Set([...Object.keys(ea), ...Object.keys(eb)]);
          const diffs = [...keys].filter(k => !IGNORED.has(k) && JSON.stringify(ea[k]) !== JSON.stringify(eb[k]))
            .map(k => `${k}: ${JSON.stringify(ea[k]) ?? '—'} → ${JSON.stringify(eb[k]) ?? '—'}`);
          rows.push({ label: prefix + name, text: diffs.join(', '), dir: 'flat' });
        } else {
          rows.push({ label: prefix + name, old: fa, neu: fb, dir });
        }
      } else if (eb) {
        rows.push({ label: prefix + name, neu: describeEntry(eb, style), tag: t('patch_diff_added', 'added'), dir: 'flat' });
      } else {
        rows.push({ label: prefix + name, old: describeEntry(ea, style), tag: t('patch_diff_removed', 'removed'), dir: 'flat' });
      }
    });
  });
  return rows;
}

function passiveChanges(a, b) {
  const pa = a.passive, pb = b.passive;
  if (!pa && !pb) return [];
  if (!pa || !pb) return [{ label: (pb || pa).name, tag: pb ? t('patch_diff_added', 'added') : t('patch_diff_removed', 'removed'), dir: 'flat' }];
  const rows = [];
  new Set([...Object.keys(pa), ...Object.keys(pb)]).forEach(k => {
    if (k === 'image' || k === 'name') return;
    if (JSON.stringify(pa[k]) === JSON.stringify(pb[k])) return;
    if (k === 'description') { rows.push({ label: t('patch_diff_description', 'Description'), tag: t('patch_diff_text_changed', 'text updated'), dir: 'flat' }); return; }
    const dir = typeof pa[k] === 'number' && typeof pb[k] === 'number' ? dirOf(pa[k], pb[k]) : 'flat';
    rows.push({ label: k, old: fmtNum(pa[k] ?? '—'), neu: fmtNum(pb[k] ?? '—'), dir });
  });
  return rows;
}

function diffPokemon(a, b) {
  const sections = [];
  const style = b.style || a.style;
  const stats15 = (b.stats || [])[14] || (b.stats || []).slice(-1)[0] || {};

  if (a.role !== b.role || a.style !== b.style) {
    sections.push({ title: t('patch_diff_general', 'General'), rows: [{ label: 'Role / style', old: `${a.role} / ${a.style}`, neu: `${b.role} / ${b.style}`, dir: 'flat' }] });
  }
  const stats = statChanges(a, b);
  if (stats.length) sections.push({ title: t('patch_diff_stats', 'Stats'), rows: stats });

  const passive = passiveChanges(a, b);
  if (passive.length) sections.push({ title: `${t('patch_diff_passive', 'Passive')}: ${b.passive?.name || a.passive?.name || ''}`, rows: passive });

  const mA = new Map((a.moves || []).map(m => [m.name, m]));
  const mB = new Map((b.moves || []).map(m => [m.name, m]));
  new Set([...mA.keys(), ...mB.keys()]).forEach(name => {
    const ma = mA.get(name), mb = mB.get(name);
    if (ma && mb) {
      const rows = moveChanges(ma, mb, style, stats15);
      if (rows.length) sections.push({ title: name, icon: mb.image, rows });
    } else if (mb) {
      sections.push({ title: name, icon: mb.image, rows: [{ label: t('patch_diff_move', 'Move'), tag: t('patch_diff_added', 'added'), dir: 'flat' }] });
    } else {
      sections.push({ title: name, icon: ma.image, rows: [{ label: t('patch_diff_move', 'Move'), tag: t('patch_diff_removed', 'removed'), dir: 'flat' }] });
    }
  });

  return sections;
}

// ── Compute the whole diff for two snapshots ────────────────────────────────

function officialFor(from, to) {
  // Patches released after "from" up to and including "to"
  return OFFICIAL.filter(p => p.date > from.date && p.date <= to.date);
}

const diffCache = new Map();
function computeDiff(from, to) {
  const key = `${from.id}>${to.id}`;
  if (!diffCache.has(key)) diffCache.set(key, computeDiffRaw(from, to).catch(err => { diffCache.delete(key); throw err; }));
  return diffCache.get(key);
}

async function computeDiffRaw(from, to) {
  const [A, B] = await Promise.all([loadSnapshot(from), loadSnapshot(to)]);
  const covered = officialFor(from, to);
  const listed = new Map();   // display name -> 'buff' | 'nerf' | 'tweak'
  covered.forEach(p => {
    (p.buffs || []).forEach(n => listed.set(nk(n), listed.get(nk(n)) === 'nerf' ? 'tweak' : 'buff'));
    (p.nerfs || []).forEach(n => listed.set(nk(n), listed.get(nk(n)) === 'buff' ? 'tweak' : 'nerf'));
    (p.tweaks || []).forEach(n => listed.set(nk(n), 'tweak'));
  });

  const results = [];
  B.forEach((b, id) => {
    const a = A.get(id);
    if (!a) { results.push({ id, rec: b, isNew: true, sections: [], up: 0, down: 0, flat: 0, official: listed.get(nk(b.displayName)) || null }); return; }
    const sections = diffPokemon(a, b);
    if (!sections.length) return;
    const all = sections.flatMap(s => s.rows);
    results.push({
      id, rec: b, sections,
      up: all.filter(r => r.dir === 'up').length,
      down: all.filter(r => r.dir === 'down').length,
      flat: all.filter(r => r.dir === 'flat').length,
      official: listed.get(nk(b.displayName)) || null,
    });
  });
  A.forEach((a, id) => { if (!B.has(id)) results.push({ id, rec: a, isRemoved: true, sections: [], up: 0, down: 0, flat: 0, official: null }); });

  return { results, covered };
}

// ── Rendering ───────────────────────────────────────────────────────────────

const ui = { from: null, to: null, search: '', filter: 'any', sort: 'changes', active: false, pokemonRoles: {} };

function roleOf(rec) {
  return ui.pokemonRoles[rec.displayName] || null;
}

function rowHTML(r, compact = false) {
  if (compact && r.lv15) r = { label: `${r.label} Lv.15`, old: fmtNum(r.lv15.a), neu: fmtNum(r.lv15.b), dir: dirOf(r.lv15.a, r.lv15.b) };
  const arrow = r.dir === 'up' ? '<span class="pd-arrow up">▲</span>' : r.dir === 'down' ? '<span class="pd-arrow down">▼</span>' : '';
  const body = r.text != null
    ? `<span class="pd-text">${esc(r.text)}${r.extra ? ` <em>(${esc(r.extra)})</em>` : ''}</span>`
    : `${r.old != null ? `<span class="pd-old">${esc(r.old)}</span>` : ''}${r.old != null && r.neu != null ? '<span class="pd-to">→</span>' : ''}${r.neu != null ? `<span class="pd-new ${r.dir}">${esc(r.neu)}</span>` : ''}`;
  return `<div class="pd-row">
    <span class="pd-label">${esc(r.label)}</span>
    <span class="pd-values">${body}${r.tag ? `<span class="pd-tag">${esc(r.tag)}</span>` : ''}${arrow}</span>
  </div>`;
}

function cardHTML(r) {
  const officialBadge = r.official
    ? `<span class="pd-badge official ${r.official}" title="${esc(t('patch_diff_official_tip', 'Listed in the official patch notes'))}">📋 ${esc(t(`patch_diff_official_${r.official}`, r.official))}</span>`
    : `<span class="pd-badge data" title="${esc(t('patch_diff_data_tip', 'Not in the official notes: hidden change or data update'))}">${esc(t('patch_diff_data', 'data'))}</span>`;

  const pills = r.isNew
    ? `<span class="pill pill-buff">${esc(t('patch_diff_new', 'NEW'))}</span>`
    : r.isRemoved
      ? `<span class="pill pill-nerf">${esc(t('patch_diff_removed_pill', 'REMOVED'))}</span>`
      : [r.up ? `<span class="pill pill-buff">▲ ${r.up}</span>` : '', r.down ? `<span class="pill pill-nerf">▼ ${r.down}</span>` : '', r.flat ? `<span class="pill pill-tweak">● ${r.flat}</span>` : ''].join('');

  const body = r.isNew || r.isRemoved
    ? `<div class="pd-body"><p class="pd-note">${esc(r.isNew ? t('patch_diff_new_note', 'Added in this range.') : t('patch_diff_removed_note', 'Not present anymore in the newer data.'))}</p></div>`
    : `<div class="pd-body">${r.sections.map(s => `
        <div class="pd-section">
          <div class="pd-section-title">${s.icon ? `<img src="${esc(s.icon)}" alt="" onerror="this.style.display='none'">` : ''}${esc(s.title)}</div>
          ${s.rows.map(rowHTML).join('')}
        </div>`).join('')}</div>`;

  return `<details class="pd-card">
    <summary>
      <img class="pd-avatar" src="${esc(r.rec.image)}" alt="" onerror="this.style.visibility='hidden'">
      <span class="pd-name">${esc(r.rec.displayName)}</span>
      ${r.isNew || r.isRemoved ? '' : officialBadge}
      <span class="pd-pills">${pills}</span>
      <span class="pd-chevron">▾</span>
    </summary>
    ${body}
  </details>`;
}

function optionsHTML(selectedId) {
  return SNAPSHOTS.map(s => `<option value="${esc(s.id)}" ${s.id === selectedId ? 'selected' : ''}>${esc(s.label)}${s.version ? ` (${esc(s.version)})` : ''} - ${esc(s.date)}</option>`).join('');
}

async function render() {
  const main = document.getElementById('mainContent');
  if (!main || !ui.active) return;
  if (SNAPSHOTS.length < 2) {
    main.innerHTML = `<div class="empty">${esc(t('patch_diff_need_two', 'At least two patch snapshots are needed (see scripts/calculator/patchesConfig.js).'))}</div>`;
    return;
  }
  if (!ui.from) ui.from = SNAPSHOTS[1];
  if (!ui.to) ui.to = SNAPSHOTS[0];

  main.innerHTML = `
    <div class="pd-controls">
      <label>${esc(t('patch_diff_from', 'From'))}<select id="pdFrom">${optionsHTML(ui.from.id)}</select></label>
      <button class="filter-btn" id="pdSwap" title="${esc(t('patch_diff_swap', 'Swap'))}">⇄</button>
      <label>${esc(t('patch_diff_to', 'To'))}<select id="pdTo">${optionsHTML(ui.to.id)}</select></label>
      <label>${esc(t('patch_diff_sort', 'Sort'))}
        <select id="pdSort">
          <option value="changes" ${ui.sort === 'changes' ? 'selected' : ''}>${esc(t('patch_diff_sort_changes', 'Most changes'))}</option>
          <option value="name" ${ui.sort === 'name' ? 'selected' : ''}>${esc(t('patch_diff_sort_name', 'Name'))}</option>
        </select>
      </label>
    </div>
    <div id="pdResult"><div class="empty">${esc(t('patch_loading', 'Loading…'))}</div></div>`;

  document.getElementById('pdFrom').onchange = e => { ui.from = SNAPSHOTS.find(s => s.id === e.target.value); render(); };
  document.getElementById('pdTo').onchange = e => { ui.to = SNAPSHOTS.find(s => s.id === e.target.value); render(); };
  document.getElementById('pdSort').onchange = e => { ui.sort = e.target.value; render(); };
  document.getElementById('pdSwap').onclick = () => { [ui.from, ui.to] = [ui.to, ui.from]; render(); };

  const target = document.getElementById('pdResult');
  if (ui.from.id === ui.to.id) { target.innerHTML = `<div class="empty">${esc(t('patch_diff_same', 'Pick two different snapshots.'))}</div>`; return; }

  // Always compare older -> newer, even if the user picked them the other way round
  const [older, newer] = ui.from.date <= ui.to.date ? [ui.from, ui.to] : [ui.to, ui.from];

  let diff;
  try { diff = await computeDiff(older, newer); }
  catch (err) { target.innerHTML = `<div class="empty">${esc(err.message)}</div>`; return; }
  if (!document.getElementById('pdResult')) return;   // tab changed while loading

  const q = ui.search.trim().toLowerCase();
  let list = diff.results.filter(r => {
    if (q && !r.rec.displayName.toLowerCase().includes(q)) return false;
    if (ui.filter !== 'any' && roleOf(r.rec) !== ui.filter) return false;
    if (ui.favs && !ui.favs.has(nk(r.rec.displayName))) return false;
    return true;
  });
  list.sort((a, b) => ui.sort === 'name'
    ? a.rec.displayName.localeCompare(b.rec.displayName)
    : (b.isNew - a.isNew) || ((b.up + b.down + b.flat) - (a.up + a.down + a.flat)) || a.rec.displayName.localeCompare(b.rec.displayName));

  const changed = diff.results.filter(r => !r.isNew && !r.isRemoved).length;
  const nNew = diff.results.filter(r => r.isNew).length;
  const officialCount = diff.results.filter(r => r.official).length;
  const covered = diff.covered.length
    ? diff.covered.map(p => `${p.version} ${p.name}`).join(' · ')
    : t('patch_diff_no_official', 'no official patch in this range');

  target.innerHTML = `
    <div class="pd-summary">
      <div class="pd-summary-line"><strong>${changed}</strong> ${esc(t('patch_diff_changed', 'Pokémon changed'))}${nNew ? ` · <strong>${nNew}</strong> ${esc(t('patch_diff_new_lc', 'new'))}` : ''} · <strong>${officialCount}</strong> ${esc(t('patch_diff_in_notes', 'in the official notes'))}</div>
      <div class="pd-summary-covers">${esc(t('patch_diff_covers', 'Patches covered:'))} ${esc(covered)}</div>
      ${diff.covered.length > 1 ? `<div class="pd-summary-warn">${esc(t('patch_diff_multi', 'Several patches happened between these two snapshots: their changes are merged.'))}</div>` : ''}
    </div>
    ${list.length ? list.map(cardHTML).join('') : `<div class="empty">${esc(t('patch_diff_none', 'No difference found.'))}</div>`}`;
}


// ── Public API used by patch_tracker.js (exact values in patch cards / Pokémon sheet) ──

/** Snapshot pair (older, newer) whose range contains this patch date, or null before the first snapshot. */
function rangeFor(date) {
  const asc = SNAPSHOTS.slice().reverse();
  for (let i = 1; i < asc.length; i++) {
    if (asc[i - 1].date < date && date <= asc[i].date) {
      return { from: asc[i - 1], to: asc[i], covered: officialFor(asc[i - 1], asc[i]) };
    }
  }
  return null;
}

/** Compact HTML of diff sections (stat rows show the level-15 value). */
function sectionsHTML(sections) {
  return sections.map(s => `
    <div class="pd-section">
      <div class="pd-section-title">${s.icon ? `<img src="${esc(s.icon)}" alt="" onerror="this.style.display='none'">` : ''}${esc(s.title)}</div>
      ${s.rows.map(r => rowHTML(r, true)).join('')}
    </div>`).join('');
}

/** One-line teaser: the first changes, e.g. "Atk Lv.15 312 → 330 · Surf 75% → 80%". */
function headline(sections, max = 2) {
  const out = [];
  for (const s of sections) {
    for (const r of s.rows) {
      const c = r.lv15 ? { label: `${r.label} Lv.15`, old: fmtNum(r.lv15.a), neu: fmtNum(r.lv15.b) } : r;
      const name = s.title && !r.lv15 && s.title !== r.label ? `${s.title}${r.label && r.label !== s.title ? ' · ' + r.label : ''}` : c.label;
      if (c.old != null && c.neu != null) out.push(`${name}: ${c.old} → ${c.neu}`);
      else if (r.tag) out.push(`${name} (${r.tag})`);
      else if (r.text) out.push(`${name}: ${r.text}`);
      if (out.length >= max) return out;
    }
  }
  return out;
}

async function valuesForPatch(patch) {
  const range = rangeFor(patch.date);
  if (!range) return null;
  const diff = await computeDiff(range.from, range.to);
  const names = [...patch.buffs, ...patch.nerfs, ...patch.tweaks];
  const byName = new Map(diff.results.filter(r => !r.isNew && !r.isRemoved).map(r => [nk(r.rec.displayName), r]));
  const items = new Map();
  names.forEach(n => { if (byName.has(nk(n))) items.set(n, byName.get(nk(n))); });
  const nameKeys = new Set(names.map(nk));
  const showOthers = range.to.date === patch.date;   // hidden changes are attributed to the last patch of the range
  const others = showOthers ? diff.results.filter(r => !r.isNew && !r.isRemoved && !r.official && !nameKeys.has(nk(r.rec.displayName))) : [];
  return { range, merged: range.covered.length > 1, items, others, missing: names.filter(n => !items.has(n)) };
}

/** Numeric changes of one Pokémon across every pair of consecutive snapshots (newest first). */
async function historyFor(displayName) {
  const asc = SNAPSHOTS.slice().reverse();
  const out = [];
  for (let i = 1; i < asc.length; i++) {
    const diff = await computeDiff(asc[i - 1], asc[i]);
    const res = diff.results.find(r => nk(r.rec.displayName) === nk(displayName));
    if (res && !res.isNew && !res.isRemoved && res.sections.length) {
      out.push({ from: asc[i - 1], to: asc[i], covered: diff.covered, res });
    } else if (res && res.isNew) {
      out.push({ from: asc[i - 1], to: asc[i], covered: diff.covered, res });
    }
  }
  return out.reverse();
}

async function calcIdFor(displayName) {
  if (!SNAPSHOTS.length) return null;
  const live = await loadSnapshot(SNAPSHOTS[0]);
  for (const [id, rec] of live) if (nk(rec.displayName) === nk(displayName)) return id;
  return null;
}

const sinceDate = () => (SNAPSHOTS.length ? SNAPSHOTS[SNAPSHOTS.length - 1].date : null);
Object.assign(window.PatchDiff, { sinceDate, rangeFor, sectionsHTML, headline, valuesForPatch, historyFor, calcIdFor, ready });

// ── Wiring ──────────────────────────────────────────────────────────────────

document.addEventListener('patchDiffRender', e => {
  ui.active = true;
  ui.search = e.detail?.search ?? '';
  ui.filter = e.detail?.filter ?? 'any';
  ui.favs = e.detail?.favs ? new Set([...e.detail.favs].map(nk)) : null;
  render();
});

// Any other tab means the diff is not on screen anymore
document.querySelectorAll('.tab-btn').forEach(btn =>
  btn.addEventListener('click', () => { ui.active = btn.dataset.view === 'diff'; })
);

document.addEventListener('patchDiffOpen', e => {
  const to = SNAPSHOTS.find(s => s.date === e.detail?.date);
  const from = to && previousSnapshotFor(to.date);
  if (!to || !from) return;
  ui.to = to; ui.from = from;
  document.querySelector('.tab-btn[data-view="diff"]')?.click();
});

document.addEventListener('translationsReady', () => { if (ui.active) render(); });

(async function init() {
  try {
    const [pj, pokemons] = await Promise.all([
      fetch('data/patches.json').then(r => r.json()),
      fetch('data/pokemons.json').then(r => r.json()),
    ]);
    OFFICIAL = (Array.isArray(pj) ? pj : pj.patches).slice().sort((a, b) => b.date.localeCompare(a.date));
    ui.pokemonRoles = Object.fromEntries((Array.isArray(pokemons) ? pokemons : pokemons.pokemon).map(p => [p.name, p.role]));
    buildSnapshots();
    document.dispatchEvent(new CustomEvent('patchDiffReady'));
  } catch (err) {
    console.error('[patch_diff] init failed', err);
  }
  resolveReady();
})();