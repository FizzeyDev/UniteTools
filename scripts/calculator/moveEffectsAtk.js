import { state } from './state.js';
import { updateDamages } from './damageDisplay.js';

// ── Couleurs Move Effect (cyan/teal, distinct du violet Passive) ──────────────
const MOVE_COLOR  = '#26c6da';
const MOVE_BG     = '#0d2a2d';
const MOVE_BORDER = `border-left:4px solid ${MOVE_COLOR}`;

function moveBadge(name, level = null) {
  return `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
      <span style="
        background:${MOVE_COLOR};
        color:#000;
        font-size:0.65rem;
        font-weight:900;
        font-family:'Exo 2',sans-serif;
        letter-spacing:0.06em;
        padding:2px 7px;
        border-radius:20px;
        text-transform:uppercase;
      ">Move Effect</span>
      <strong style="color:${MOVE_COLOR};">${name}</strong>
      ${level != null ? `<span style="color:#5a8a8f;font-size:0.8rem;">(Lv.${level})</span>` : ''}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// GRENINJA — Smokescreen (Level 13)
// Increases BASE Attack by 20% for 2s when exiting stealth.
// Only available at level ≥ 13. Affects raw base stat only (not item bonuses).
// ─────────────────────────────────────────────────────────────────────────────
export function applyGreninjaSmokescreenAttacker(atkStats, defStats, card) {
  if (state.attackerLevel < 13) return;

  const isActive = state.attackerGreninjaSmokescreenActive ?? false;

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = `
    <div style="
      margin:12px 0;
      padding:10px;
      background:${MOVE_BG};
      border-radius:8px;
      ${MOVE_BORDER};
      display:flex;
      align-items:center;
      gap:12px;
    ">
      <img
        src="assets/moves/greninja/smokescreen.png"
        style="width:40px;height:40px;border-radius:6px;"
        onerror="this.src='assets/moves/missing.png'"
      >
      <div style="flex:1;">
        ${moveBadge('Smokescreen', 13)}
        Exit stealth → <strong style="color:#fff;">+20% base ATK</strong> for 2s<br>
        <span style="font-size:0.8rem;color:#5a8a8f;">
          Only affects base ATK stat (items excluded)
        </span><br>
        <button class="smokescreen-toggle" style="
          margin-top:8px;
          padding:6px 16px;
          background:${isActive ? MOVE_COLOR : '#1a3a3e'};
          color:${isActive ? '#000' : MOVE_COLOR};
          border:1px solid ${MOVE_COLOR};
          border-radius:6px;
          cursor:pointer;
          font-weight:700;
          font-family:'Rajdhani',sans-serif;
          font-size:0.85rem;
          letter-spacing:0.04em;
          transition:all 0.15s;
        ">
          ${isActive ? '✓ Active' : 'Activate'}
        </button>
      </div>
    </div>
  `;

  line.querySelector('.smokescreen-toggle').onclick = () => {
    state.attackerGreninjaSmokescreenActive = !state.attackerGreninjaSmokescreenActive;
    updateDamages();
  };

  card.appendChild(line);
}

/**
 * Applique le buff stat Smokescreen sur atkStats AVANT le calcul des dégâts.
 * Doit être appelé après getModifiedStats(), sur le stat brut de base.
 * On stocke la base sans items pour n'augmenter que la portion "base".
 */
export function applyGreninjaSmokescreenStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'greninja') return;
  if (level < 13) return;
  if (!state.attackerGreninjaSmokescreenActive) return;

  // La stat de base au niveau courant (sans items)
  const baseAtk = pokemon.stats?.[level - 1]?.atk ?? 0;
  const bonus   = Math.floor(baseAtk * 0.20);
  atkStats.atk += bonus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher UI : affiche les blocs Move Effect dans la card attaquant
// ─────────────────────────────────────────────────────────────────────────────
export function applyAttackerMoveEffects(pokemonId, atkStats, defStats, card) {
  const handlers = {
    greninja: applyGreninjaSmokescreenAttacker,
  };
  handlers[pokemonId]?.(atkStats, defStats, card);
}