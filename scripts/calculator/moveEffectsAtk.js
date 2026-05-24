import { state } from './state.js';
import { updateDamages } from './damageDisplay.js';
import { MOVE_ATK, moveBadge } from './effectColors.js';

const { color: C, bg: BG, border: BORDER } = MOVE_ATK;

function wrap(content) {
  return `<div style="margin:12px 0;padding:10px;background:${BG};border-radius:8px;${BORDER};display:flex;align-items:center;gap:12px;">${content}</div>`;
}
function icon(src) {
  return `<img src="${src}" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">`;
}

// ── GRENINJA ──────────────────────────────────────────────────────────────────
export function applyGreninjaSmokescreenAttacker(atkStats, defStats, card) {
  if (state.attackerLevel < 13) return;
  const isActive = state.attackerGreninjaSmokescreenActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/greninja/smokescreen.png')}
    <div style="flex:1;">
      ${moveBadge('Smokescreen', 13)}
      Exit stealth → <strong style="color:#fff;">+20% base ATK</strong> for 2s<br>
      <span style="font-size:0.8rem;color:${C}99;">Only affects base ATK stat (items excluded)</span><br>
      <button class="smokescreen-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.smokescreen-toggle').onclick = () => { state.attackerGreninjaSmokescreenActive = !state.attackerGreninjaSmokescreenActive; updateDamages(); };
  card.appendChild(line);
}

export function applyGreninjaSmokescreenStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'greninja') return;
  if (level < 13) return;
  if (!state.attackerGreninjaSmokescreenActive) return;
  const baseAtk = pokemon.stats?.[level - 1]?.atk ?? 0;
  atkStats.atk += Math.floor(baseAtk * 0.20);
}

// ── DRAGONITE ─────────────────────────────────────────────────────────────────
function applyDragoniteDragonDance(atkStats, defStats, card) {
  if (state.attackerLevel < 5) return;
  const stacks    = state.attackerDragonDanceStacks ?? 0;
  const maxStacks = 3;
  const bonusPct  = stacks * 10;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/dragonite/dragon_dance.png')}
    <div style="flex:1;">
      ${moveBadge('Dragon Dance', 5)}
      Stacks: <button class="stack-btn minus dd-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus dd-plus">+</button><br>
      → ATK <strong style="color:${bonusPct > 0 ? '#88ff88' : '#888'};">+${bonusPct}%</strong>
      ${bonusPct >= 30 ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}
    </div>
  `);
  line.querySelector('.dd-minus').onclick = () => { if ((state.attackerDragonDanceStacks ?? 0) > 0)        { state.attackerDragonDanceStacks = (state.attackerDragonDanceStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.dd-plus').onclick  = () => { if ((state.attackerDragonDanceStacks ?? 0) < maxStacks) { state.attackerDragonDanceStacks = (state.attackerDragonDanceStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
export function applyAttackerMoveEffects(pokemonId, atkStats, defStats, card) {
  const handlers = {
    greninja:  applyGreninjaSmokescreenAttacker,
    dragonite: applyDragoniteDragonDance,
  };
  handlers[pokemonId]?.(atkStats, defStats, card);
}