/**
 * shareLink.js - Share the current calculator setup as a link
 *
 * URL format (all parameters optional, old links keep working):
 *   damage-calc.html?atk=toxtricity&def=absol&s=<base64url JSON>
 *
 *   atk / def : attacker / defender pokemonId (same params main.js already read)
 *   s         : everything else, as compact JSON (see serializeState):
 *                 al/dl  levels (only if not 15)      dt  defender timer (mobs)
 *                 ah/dh  HP % (only if not 100)       aa/da  exact HP (only if typed)
 *                 i      items       { a:[[name,stacks,activated]|0 x3], d:[...] }
 *                 c      checked buff/debuff boxes (+ stack counter) { id: stacks|1 }
 *                 x      every other state value that differs from its default
 *                        (Poison/Electric timbre, Morpeko form, Punk Rock stacks...)
 *                 cd     Custom Doll stats [hp, def, sp_def]
 *
 * Restoring replays the UI (slider/checkbox events) instead of writing the
 * state directly, so the page ends up exactly as if the user had clicked.
 * Not shared: allies, and the Build Optimizer / Combat Log / Compare Patch tabs.
 */

import { state } from './state.js';
import { updateDamages } from './damageDisplay.js';
import { updateHPDisplays, updateSliderStyle } from './uiManager.js';
import { updateItemCard } from './itemManager.js';

const VERSION = 1;

// ── State keys that are NOT serialized through "x" ──────────────────────────
// (handled explicitly, or runtime-only)
const SKIP_KEYS = new Set([
  'allPokemon', 'allItems', 'currentAttacker', 'currentDefender', 'currentSlotTarget',
  'attackerLevel', 'defenderLevel', 'defenderTimer', 'isEditingHP',
  'attackerItems', 'defenderItems', 'attackerItemStacks', 'defenderItemStacks',
  'attackerItemActivated', 'defenderItemActivated',
  'attackerHPPercent', 'defenderHPPercent', 'attackerHPAbsolute', 'defenderHPAbsolute',
]);

// Defaults captured when this module loads, i.e. before any user interaction
const DEFAULTS = {};
Object.keys(state).forEach(k => {
  if (!SKIP_KEYS.has(k) && isPrimitive(state[k])) DEFAULTS[k] = state[k];
});

function isPrimitive(v) {
  return typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string';
}

// ── base64url helpers (UTF-8 safe) ───────────────────────────────────────────

function encode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

// ── Serialize ────────────────────────────────────────────────────────────────

function serializeItems(side) {
  const items = state[`${side}Items`];
  const stacks = state[`${side}ItemStacks`];
  const active = state[`${side}ItemActivated`];
  const out = items.map((it, i) => (it ? [it.name, stacks[i] || 0, active[i] ? 1 : 0] : 0));
  return out.some(Boolean) ? out : null;
}

/** Checked buff/debuff boxes: { id: 1 } or { id: stackCounter } when the box has one. */
function serializeCheckboxes() {
  const out = {};
  document.querySelectorAll('#tab-calculator input[type="checkbox"][id]').forEach(cb => {
    if (!cb.checked) return;
    const counter = cb.parentElement?.querySelector('.ability-stacks-container .stack-value');
    out[cb.id] = counter ? (parseInt(counter.textContent, 10) || 0) : 1;
  });
  return out;
}

function serializeExtras() {
  const out = {};
  Object.keys(state).forEach(k => {
    if (SKIP_KEYS.has(k) || !isPrimitive(state[k])) return;
    const v = state[k];
    if (k in DEFAULTS) {
      if (v !== DEFAULTS[k]) out[k] = v;
    } else if (v) {
      out[k] = v;   // key created at runtime (e.g. attackerToxtricityTimbre)
    }
  });
  return out;
}

export function serializeState() {
  const s = { v: VERSION };
  if (state.attackerLevel !== 15) s.al = state.attackerLevel;
  if (state.defenderLevel !== 15) s.dl = state.defenderLevel;
  if (state.currentDefender?.timerBased) s.dt = state.defenderTimer;
  if (state.attackerHPPercent !== 100) s.ah = state.attackerHPPercent;
  if (state.defenderHPPercent !== 100) s.dh = state.defenderHPPercent;
  if (state.attackerHPAbsolute != null) s.aa = state.attackerHPAbsolute;
  if (state.defenderHPAbsolute != null) s.da = state.defenderHPAbsolute;

  const ia = serializeItems('attacker');
  const id = serializeItems('defender');
  if (ia || id) s.i = { a: ia, d: id };

  const c = serializeCheckboxes();
  if (Object.keys(c).length) s.c = c;

  const x = serializeExtras();
  if (Object.keys(x).length) s.x = x;

  const cs = state.currentDefender?.customStats;
  if (state.currentDefender?.pokemonId === 'custom-doll' && cs) s.cd = [cs.hp, cs.def, cs.sp_def];

  return s;
}

export function buildShareURL() {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  if (state.currentAttacker) url.searchParams.set('atk', state.currentAttacker.pokemonId);
  if (state.currentDefender) url.searchParams.set('def', state.currentDefender.pokemonId);
  const s = serializeState();
  if (Object.keys(s).length > 1) url.searchParams.set('s', encode(s));
  return url.toString();
}

// ── Restore ──────────────────────────────────────────────────────────────────

function fire(el, type) {
  el.dispatchEvent(new Event(type, { bubbles: true }));
}

function setSlider(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value;
  fire(el, 'input');
}

function restoreItems(side, list) {
  if (!list) return;
  const items = state[`${side}Items`];
  const stacks = state[`${side}ItemStacks`];
  const active = state[`${side}ItemActivated`];
  list.forEach((entry, slot) => {
    if (!entry) return;
    const [name, stack, act] = entry;
    const item = state.allItems.find(i => i.name === name);
    if (!item) return;
    items[slot] = item;
    stacks[slot] = stack || 0;
    active[slot] = !!act;
    updateItemCard(side, slot, item);   // also renders the stack counter and the Activate toggle from the arrays
  });
}

function restoreCheckboxes(map) {
  if (!map) return;
  Object.entries(map).forEach(([id, counter]) => {
    const cb = document.getElementById(id);
    if (!cb || cb.type !== 'checkbox') return;
    cb.checked = true;
    fire(cb, 'change');

    // Boxes with a stack / caster-level counter: click +/- until it matches
    const box = cb.parentElement?.querySelector('.ability-stacks-container');
    const valueEl = box?.querySelector('.stack-value');
    if (!valueEl || counter === 1 && parseInt(valueEl.textContent, 10) === 1) return;
    for (let guard = 0; guard < 40; guard++) {
      const cur = parseInt(valueEl.textContent, 10) || 0;
      if (cur === counter) break;
      box.querySelector(cur < counter ? '.plus' : '.minus')?.click();
      if ((parseInt(valueEl.textContent, 10) || 0) === cur) break;   // capped
    }
  });
}

/**
 * Apply the "s" payload. Call after selectAttacker()/selectDefender()
 * (selecting a Pokémon resets its toggles, so this must come last).
 */
export function restoreSharedState(params) {
  const raw = params.get('s');
  if (!raw) return;

  let s;
  try { s = decode(raw); } catch { console.warn('[share] invalid link payload'); return; }
  if (!s || typeof s !== 'object') return;

  if (s.al) setSlider('levelSliderAttacker', s.al);
  if (s.dl) setSlider('levelSliderDefender', s.dl);
  if (s.dt != null) setSlider('timerSliderDefender', s.dt);
  if (s.ah != null) setSlider('hpSliderAttacker', s.ah);
  if (s.dh != null) setSlider('hpSliderDefender', s.dh);

  if (s.cd && state.currentDefender?.customStats) {
    const [hp, def, spDef] = s.cd;
    Object.assign(state.currentDefender.customStats, { hp, def, sp_def: spDef });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = Number(v).toLocaleString(); };
    set('defenderMaxHP', hp); set('defenderDefCustom', def); set('defenderSpDefCustom', spDef);
  }

  if (s.i) { restoreItems('attacker', s.i.a); restoreItems('defender', s.i.d); }
  restoreCheckboxes(s.c);

  if (s.x) {
    Object.entries(s.x).forEach(([k, v]) => {
      if (!SKIP_KEYS.has(k) && isPrimitive(v)) state[k] = v;
    });
  }
  if (s.aa != null) state.attackerHPAbsolute = s.aa;
  if (s.da != null) state.defenderHPAbsolute = s.da;

  updateSliderStyle(document.getElementById('levelSliderAttacker'), state.attackerLevel);
  updateSliderStyle(document.getElementById('levelSliderDefender'), state.defenderLevel);
  updateHPDisplays();
  updateDamages();
}

// ── Share button ─────────────────────────────────────────────────────────────

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
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers / contexts without the async clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export function initShareLink() {
  const btn = document.getElementById('shareBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const url = buildShareURL();
    history.replaceState(null, '', url);   // the address bar now holds the link too
    const t = key => window.translations?.[localStorage.getItem('lang') || 'fr']?.[key];
    const ok = await copyText(url);
    toast(ok ? (t('calc_share_copied') || 'Link copied!') : (t('calc_share_failed') || 'Copy failed - the link is in the address bar.'));
  });
}
