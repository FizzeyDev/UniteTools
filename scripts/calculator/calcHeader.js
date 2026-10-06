/**
 * calcHeader.js - Header actions of the calculator page
 *   - "⋯" menu (important information, how to use)
 *   - Swap attacker / defender (button + X key)
 */

import { state } from './state.js';
import { serializeState, applyState } from './shareLink.js';
import { selectAttacker, selectDefender } from './pokemonManager.js';

const tr = (key, fb) => window.translations?.[localStorage.getItem('lang') || 'fr']?.[key] ?? fb;

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

// ── "⋯" menu ────────────────────────────────────────────────────────────────

function setupMenu() {
  const btn = document.getElementById('calcMoreBtn');
  const list = document.getElementById('calcMenuList');
  if (!btn || !list) return;
  const close = () => { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    list.hidden = !list.hidden;
    btn.setAttribute('aria-expanded', String(!list.hidden));
  });
  list.addEventListener('click', close);
  document.addEventListener('click', e => { if (!e.target.closest('.calc-menu')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

// ── Swap ────────────────────────────────────────────────────────────────────

/**
 * The defender becomes the attacker and vice versa. Levels, HP and held items
 * follow; Pokémon-specific toggles (buffs, stacks...) don't map from one side
 * to the other, so they are reset.
 */
export function swapSides() {
  const atk = state.currentAttacker;
  const def = state.currentDefender;
  if (!atk || !def) return;
  if (def.category === 'mob' || def.category === 'other') {
    toast(tr('calc_swap_impossible', 'This target cannot be used as an attacker.'));
    return;
  }

  const s = serializeState();
  selectAttacker(def.pokemonId);
  selectDefender(atk.pokemonId);
  applyState({
    v: 1,
    al: s.dl, dl: s.al,
    ah: s.dh, dh: s.ah,
    i: { a: s.i?.d || null, d: s.i?.a || null },
  });
  toast(tr('calc_swap_done', 'Attacker and defender swapped.'));
}

function isTyping() {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export function initCalcHeader() {
  setupMenu();
  document.getElementById('swapBtn')?.addEventListener('click', swapSides);
  document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'x' || e.ctrlKey || e.metaKey || e.altKey || isTyping()) return;
    if (!document.getElementById('tab-calculator')?.classList.contains('active')) return;
    e.preventDefault();
    swapSides();
  });
}