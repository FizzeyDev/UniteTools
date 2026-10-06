/**
 * compareTab.js - "Compare" tab of the calculator
 *
 *   Mode 1  Build vs Build : damage of every move for two setups, side by side
 *   Mode 2  Item swap      : "what if I replace item X by Y?" for one slot,
 *                            with a ranking of every held item
 *
 * Numbers are NOT recomputed here. Each setup is loaded into the real
 * calculator (same code path as a saved build or a shared link), the rendered
 * move cards are read back, and the user's own setup is restored at the end,
 * all in one synchronous pass (the browser never paints the intermediate
 * states). So the figures always match the Damage Calculator tab exactly.
 */

import { state } from './state.js';
import { serializeState, applyState } from './shareLink.js';
import { selectAttacker, selectDefender } from './pokemonManager.js';
import { updateItemCard } from './itemManager.js';
import { getSavedBuilds } from './buildStorage.js';

const tr = (key, fb, vars = {}) => {
  let s = window.translations?.[localStorage.getItem('lang') || 'fr']?.[key] ?? fb;
  Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, v); });
  return s;
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('en-US');

// Items that are auto-equipped for one specific Pokémon (not free to pick)
const SPECIAL_ITEM = /(ite( [XY])?|Rusted Sword)$/;

// ── Reading the calculator ──────────────────────────────────────────────────

const capture = () => ({ atk: state.currentAttacker?.pokemonId, def: state.currentDefender?.pokemonId, s: serializeState() });

function loadSetup({ atk, def, s }) {
  selectAttacker(atk);
  selectDefender(def);
  applyState(s);               // ends with updateDamages()
}

function num(el) {
  if (el.dataset?.total != null) return Number(el.dataset.total) || 0;
  const m = /-?\d[\d,]*/.exec(el.textContent.replace(/\s/g, ''));
  return m ? Number(m[0].replace(/,/g, '')) : 0;
}

/** Reads the move cards currently rendered by the calculator. */
function scrape() {
  return [...document.querySelectorAll('#movesGrid .move-card')].map(card => ({
    title: card.querySelector('.move-title strong')?.textContent.trim() || '?',
    img: card.querySelector('.move-title img')?.getAttribute('src') || '',
    lines: [...card.querySelectorAll('.damage-line')].map(line => {
      const nameEl = line.querySelector('.dmg-name')?.cloneNode(true);
      nameEl?.querySelectorAll('.formula-tooltip, i, br').forEach(e => e.remove());
      const v = { normal: null, crit: null, heal: null, shield: null };
      line.querySelectorAll('.dmg-values > span').forEach(sp => {
        const c = sp.classList;
        const kind = c.contains('dmg-crit') ? 'crit' : c.contains('dmg-heal') ? 'heal' : c.contains('dmg-shield') ? 'shield' : c.contains('dmg-normal') ? 'normal' : null;
        if (kind && v[kind] == null) v[kind] = num(sp);
      });
      return { name: nameEl?.textContent.trim() || '', ...v };
    }),
  }));
}

/** Runs fn with the user's setup saved and restored around it. */
function withSetupRestored(fn) {
  const saved = capture();
  try { return fn(); }
  finally { loadSetup(saved); }
}

const cardDamage = card => card.lines.reduce((s, l) => s + (l.normal || 0), 0);
const totalDamage = res => res.reduce((s, c) => s + cardDamage(c), 0);

// ── Presentation helpers ────────────────────────────────────────────────────

const pokeOf = id => state.allPokemon.find(p => p.pokemonId === id);
const itemOf = name => state.allItems.find(i => i.name === name);

function delta(a, b) {
  const d = b - a;
  const cls = d > 0 ? 'pos' : d < 0 ? 'neg' : 'zero';
  const pct = a ? (d / a) * 100 : null;
  const sign = d > 0 ? '+' : '';
  return `<span class="cmp-delta ${cls}">${d === 0 ? '0' : `${sign}${fmt(d)}`}${pct != null && d !== 0 ? ` <small>(${sign}${pct.toFixed(1)}%)</small>` : ''}</span>`;
}

function setupSummary(entry) {
  const a = pokeOf(entry.atk), d = pokeOf(entry.def);
  const items = (entry.s.i?.a || []).filter(Boolean).map(x => x[0]);
  return `<div class="cmp-sum">
    <div class="cmp-sum-poke"><img src="${esc(a?.image || '')}" alt=""><span>vs</span><img src="${esc(d?.image || '')}" alt=""></div>
    <div class="cmp-sum-text"><strong>${esc(a?.displayName || entry.atk)}</strong> vs ${esc(d?.displayName || entry.def)}
      <small>Lv.${esc(entry.s.al || 15)} · ${esc(items.join(', ') || '-')}</small></div>
  </div>`;
}

/** Table of A vs B. rowsA / rowsB come from scrape(). */
function compareTable(resA, resB, { crit = false, labelA = 'A', labelB = 'B' } = {}) {
  const n = Math.max(resA.length, resB.length);
  let body = '';
  let totA = 0, totB = 0;

  for (let i = 0; i < n; i++) {
    const ca = resA[i], cb = resB[i];
    const title = ca && cb && ca.title !== cb.title ? `${ca.title} ↔ ${cb.title}` : (ca || cb).title;
    body += `<tr class="cmp-move"><th colspan="4">${esc(title)}</th></tr>`;
    // Align the lines by name (an item can add or remove a bonus line)
    const keyed = card => {
      const seen = {};
      return new Map((card?.lines || []).map(l => { const k = `${l.name}#${seen[l.name] = (seen[l.name] ?? -1) + 1}`; return [k, l]; }));
    };
    const ma = keyed(ca), mb = keyed(cb);
    const keys = [...ma.keys(), ...[...mb.keys()].filter(k => !ma.has(k))];
    for (const k of keys) {
      const la = ma.get(k), lb = mb.get(k);
      const name = (la || lb).name;
      const pick = l => l == null ? null : (l.heal != null ? l.heal : l.shield != null ? l.shield : (crit && l.crit != null ? l.crit : l.normal));
      const va = pick(la), vb = pick(lb);
      const kind = (la || lb).heal != null ? ' 💚' : (la || lb).shield != null ? ' 🛡' : '';
      if (va == null || vb == null) {
        if (la?.heal == null && la?.shield == null && lb?.heal == null && lb?.shield == null) { totA += la?.normal || 0; totB += lb?.normal || 0; }
        body += `<tr><td>${esc(name)}${kind}</td><td class="num">${va == null ? '—' : fmt(va)}</td><td class="num">${vb == null ? '—' : fmt(vb)}</td><td class="num">${delta(va ?? 0, vb ?? 0)}</td></tr>`;
        continue;
      }
      if (la.heal == null && la.shield == null) { totA += la.normal || 0; totB += lb.normal || 0; }
      body += `<tr><td>${esc(name)}${kind}</td><td class="num">${fmt(va)}</td><td class="num">${fmt(vb)}</td><td class="num">${delta(va, vb)}</td></tr>`;
    }
  }

  return `<table class="cmp-table">
    <thead><tr><th>${esc(tr('calc_cmp_move', 'Move'))}</th><th class="num">${esc(labelA)}</th><th class="num">${esc(labelB)}</th><th class="num">Δ</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td>${esc(tr('calc_cmp_total', 'Total (all damage lines)'))}</td><td class="num">${fmt(totA)}</td><td class="num">${fmt(totB)}</td><td class="num">${delta(totA, totB)}</td></tr></tfoot>
  </table>`;
}

// ── Panel ───────────────────────────────────────────────────────────────────

const ui = {
  mode: 'builds',        // 'builds' | 'items'
  a: 'current', b: '',   // build ids ('current' = live setup)
  crit: false,
  slot: 0,
  rankBy: 'total',
  pick: null,            // { name|null, stacks, act }
  showAll: false,
};

let root;

function buildShell() {
  root = document.getElementById('tab-compare');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';
  root.classList.add('cmp-panel');
  root.innerHTML = `
    <div class="cmp-head">
      <h2 data-c="title"></h2>
      <p data-c="subtitle"></p>
      <div class="cmp-modes">
        <button type="button" data-mode="builds"></button>
        <button type="button" data-mode="items"></button>
      </div>
    </div>
    <div class="cmp-body"></div>`;

  root.querySelector('.cmp-modes').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (b) { ui.mode = b.dataset.mode; render(); }
  });
  root.querySelector('.cmp-body').addEventListener('change', onChange);
  root.querySelector('.cmp-body').addEventListener('click', onClick);
  root.querySelector('.cmp-body').addEventListener('input', onInput);
}

function renderShell() {
  root.querySelector('[data-c=title]').textContent = tr('calc_cmp_title', '⚖️ Compare');
  root.querySelector('[data-c=subtitle]').textContent = ui.mode === 'builds'
    ? tr('calc_cmp_sub_builds', 'Pick two setups (your current one or saved builds) and see every move side by side.')
    : tr('calc_cmp_sub_items', 'What if I replace one of the attacker\'s items? Ranked by the damage gained, using your current setup.');
  const [b1, b2] = root.querySelectorAll('.cmp-modes button');
  b1.textContent = tr('calc_cmp_mode_builds', 'Build vs Build');
  b2.textContent = tr('calc_cmp_mode_items', 'Item swap');
  b1.classList.toggle('active', ui.mode === 'builds');
  b2.classList.toggle('active', ui.mode === 'items');
}

function entryFor(id) {
  if (id === 'current') return capture();
  const b = getSavedBuilds().find(x => x.id === id);
  return b ? { atk: b.atk, def: b.def, s: b.s } : null;
}

const buildLabel = id => id === 'current' ? tr('calc_cmp_current', 'Current setup') : (getSavedBuilds().find(x => x.id === id)?.name || '?');

// ── Mode 1: build vs build ──────────────────────────────────────────────────

function renderBuilds(body) {
  const builds = getSavedBuilds();
  if (!builds.length) {
    body.innerHTML = `<p class="cmp-empty">${esc(tr('calc_cmp_no_builds', 'No saved build yet. Save one with the Builds button, then come back here to compare it with your current setup.'))}</p>`;
    return;
  }
  if (!ui.b || (ui.b !== 'current' && !builds.some(x => x.id === ui.b))) ui.b = builds[0].id;
  if (ui.a !== 'current' && !builds.some(x => x.id === ui.a)) ui.a = 'current';

  const opts = sel => `<option value="current"${sel === 'current' ? ' selected' : ''}>${esc(tr('calc_cmp_current', 'Current setup'))}</option>` +
    builds.map(b => `<option value="${esc(b.id)}"${sel === b.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('');

  const A = entryFor(ui.a), B = entryFor(ui.b);
  const [resA, resB] = withSetupRestored(() => { loadSetup(A); const ra = scrape(); loadSetup(B); const rb = scrape(); return [ra, rb]; });

  body.innerHTML = `
    <div class="cmp-pickers">
      <div class="cmp-picker"><label>A</label><select data-sel="a">${opts(ui.a)}</select>${setupSummary(A)}</div>
      <button type="button" class="cmp-swap" data-act="swap-ab" title="${esc(tr('calc_cmp_swap_ab', 'Swap A and B'))}">⇄</button>
      <div class="cmp-picker"><label>B</label><select data-sel="b">${opts(ui.b)}</select>${setupSummary(B)}</div>
    </div>
    <label class="cmp-check"><input type="checkbox" data-opt="crit"${ui.crit ? ' checked' : ''}> ${esc(tr('calc_cmp_crit', 'Show critical hits'))}</label>
    ${compareTable(resA, resB, { crit: ui.crit, labelA: `A · ${buildLabel(ui.a)}`.slice(0, 28), labelB: `B · ${buildLabel(ui.b)}`.slice(0, 28) })}`;
}

// ── Mode 2: item swap ───────────────────────────────────────────────────────

function candidateItems(slot) {
  const others = new Set(state.attackerItems.filter((it, i) => it && i !== slot).map(it => it.name));
  return state.allItems.filter(it => !SPECIAL_ITEM.test(it.name) && !others.has(it.name));
}

function equipOnSlot(slot, pick) {
  if (pick.name == null) {
    state.attackerItems[slot] = null;
    state.attackerItemStacks[slot] = 0;
    state.attackerItemActivated[slot] = false;
    updateItemCard('attacker', slot, null);
    applyState({ v: 1 });
  } else {
    const entries = [0, 0, 0];
    entries[slot] = [pick.name, pick.stacks || 0, pick.act ? 1 : 0];
    applyState({ v: 1, i: { a: entries } });
  }
}

function renderItems(body) {
  if (!state.currentAttacker) { body.innerHTML = ''; return; }
  const cur = state.attackerItems[ui.slot];
  const curName = cur?.name ?? null;
  const base = scrapeNow();
  const cards = base.map((c, i) => ({ i, title: c.title }));
  if (ui.rankBy !== 'total' && !cards.some(c => String(c.i) === String(ui.rankBy))) ui.rankBy = 'total';
  const metric = res => ui.rankBy === 'total' ? totalDamage(res) : cardDamage(res[Number(ui.rankBy)] || { lines: [] });
  const baseVal = metric(base);

  // Evaluate every candidate (one pass, user's setup restored at the end)
  const rows = withSetupRestored(() => {
    const out = [];
    const evaluate = pick => { equipOnSlot(ui.slot, pick); return scrape(); };
    out.push({ name: null, res: evaluate({ name: null }) });
    candidateItems(ui.slot).forEach(it => { if (it.name !== curName) out.push({ name: it.name, res: evaluate({ name: it.name, stacks: 0 }) }); });
    return out;
  }).map(r => ({ name: r.name, val: metric(r.res) }));

  rows.sort((x, y) => y.val - x.val);
  const shown = ui.showAll ? rows : rows.slice(0, 10);

  const slotBtns = [0, 1, 2].map(i => {
    const it = state.attackerItems[i];
    return `<button type="button" class="cmp-slot${i === ui.slot ? ' active' : ''}" data-slot="${i}">
      <img src="${esc(it?.image || 'assets/items/none.png')}" alt=""><span>${esc(it?.display_name || it?.name || tr('calc_cmp_empty_slot', 'Empty'))}</span></button>`;
  }).join('');

  const rankOpts = `<option value="total"${ui.rankBy === 'total' ? ' selected' : ''}>${esc(tr('calc_cmp_rank_total', 'All moves'))}</option>` +
    cards.map(c => `<option value="${c.i}"${String(ui.rankBy) === String(c.i) ? ' selected' : ''}>${esc(c.title)}</option>`).join('');

  const list = shown.map(r => {
    const it = r.name ? itemOf(r.name) : null;
    const d = r.val - baseVal;
    const pct = baseVal ? (d / baseVal) * 100 : 0;
    const cls = d > 0.5 ? 'pos' : d < -0.5 ? 'neg' : 'zero';
    const active = ui.pick && ui.pick.name === r.name;
    return `<button type="button" class="cmp-item-row${active ? ' active' : ''}" data-item="${esc(r.name ?? '')}" data-none="${r.name == null ? 1 : 0}">
      <img src="${esc(it?.image || 'assets/items/none.png')}" alt="">
      <span class="cmp-item-name">${esc(it ? (it.display_name || it.name) : tr('calc_cmp_no_item', 'No item'))}</span>
      <span class="cmp-item-val">${fmt(r.val)}</span>
      <span class="cmp-delta ${cls}">${d > 0 ? '+' : ''}${pct.toFixed(1)}%</span></button>`;
  }).join('');

  let detail = '';
  if (ui.pick) {
    const pickSel = ui.pick;
    const res = withSetupRestored(() => { equipOnSlot(ui.slot, pickSel); return scrape(); });
    const nm = pickSel.name == null ? tr('calc_cmp_no_item', 'No item') : (itemOf(pickSel.name)?.display_name || pickSel.name);
    detail = `<div class="cmp-detail">
      <div class="cmp-detail-head"><strong>${esc(curName ? (cur.display_name || cur.name) : tr('calc_cmp_empty_slot', 'Empty'))}</strong> → <strong>${esc(nm)}</strong>
        ${pickSel.name != null ? `<label class="cmp-inline">${esc(tr('calc_cmp_stacks', 'Stacks'))} <input type="number" min="0" max="99" value="${pickSel.stacks || 0}" data-opt="stacks"></label>
        <label class="cmp-inline"><input type="checkbox" data-opt="act"${pickSel.act ? ' checked' : ''}> ${esc(tr('calc_cmp_activated', 'Activated'))}</label>` : ''}
        <label class="cmp-inline"><input type="checkbox" data-opt="crit"${ui.crit ? ' checked' : ''}> ${esc(tr('calc_cmp_crit', 'Show critical hits'))}</label></div>
      ${compareTable(base, res, { crit: ui.crit, labelA: tr('calc_cmp_now', 'Now'), labelB: tr('calc_cmp_after', 'With swap') })}
    </div>`;
  }

  body.innerHTML = `
    <div class="cmp-note">${esc(tr('calc_cmp_items_note', 'Items that need stacks are evaluated at 0 stacks in the ranking; click one to set its stacks. Items auto-equipped for one Pokémon (Mega Stones...) are left out.'))}</div>
    <div class="cmp-slots">${slotBtns}</div>
    <div class="cmp-rank-row"><label>${esc(tr('calc_cmp_rank_by', 'Rank by'))}</label><select data-opt="rankBy">${rankOpts}</select>
      <span class="cmp-base">${esc(tr('calc_cmp_base', 'Current: {v}', { v: fmt(baseVal) }))}</span></div>
    <div class="cmp-rank">${list}</div>
    ${rows.length > 10 ? `<button type="button" class="cmp-more" data-act="more">${esc(ui.showAll ? tr('calc_cmp_less', 'Show less') : tr('calc_cmp_more', 'Show all ({n})', { n: rows.length }))}</button>` : ''}
    ${detail}`;
}

function scrapeNow() { return scrape(); }

// ── Events ──────────────────────────────────────────────────────────────────

function onChange(e) {
  const t = e.target;
  if (t.dataset.sel === 'a') { ui.a = t.value; render(); }
  else if (t.dataset.sel === 'b') { ui.b = t.value; render(); }
  else if (t.dataset.opt === 'crit') { ui.crit = t.checked; render(); }
  else if (t.dataset.opt === 'rankBy') { ui.rankBy = t.value; render(); }
  else if (t.dataset.opt === 'act' && ui.pick) { ui.pick.act = t.checked; render(); }
}

function onInput(e) {
  const t = e.target;
  if (t.dataset.opt === 'stacks' && ui.pick) {
    clearTimeout(onInput._t);
    onInput._t = setTimeout(() => { ui.pick.stacks = Math.max(0, Math.min(99, parseInt(t.value, 10) || 0)); render(); }, 350);
  }
}

function onClick(e) {
  const slot = e.target.closest('[data-slot]');
  if (slot) { ui.slot = Number(slot.dataset.slot); ui.pick = null; render(); return; }

  const row = e.target.closest('[data-item]');
  if (row) {
    ui.pick = row.dataset.none === '1' ? { name: null } : { name: row.dataset.item, stacks: 0, act: false };
    render();
    return;
  }
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'swap-ab') { [ui.a, ui.b] = [ui.b, ui.a]; render(); }
  else if (act === 'more') { ui.showAll = !ui.showAll; render(); }
}

function render() {
  if (!root || !state.allPokemon.length) return;
  renderShell();
  const body = root.querySelector('.cmp-body');
  const scroll = root.scrollTop;
  if (ui.mode === 'builds') renderBuilds(body); else renderItems(body);
  root.scrollTop = scroll;
}

export function initCompareTab() {
  buildShell();
  if (!root) return;
  document.addEventListener('calcTabChanged', e => { if (e.detail?.tab === 'compare') { ui.pick = null; render(); } });
  document.addEventListener('translationsReady', () => { if (root.classList.contains('active')) render(); });
}