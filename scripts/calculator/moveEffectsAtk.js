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

// ── AEGISLASH ─────────────────────────────────────────────────────────────────
function applyAegislashSacredSword(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 5) return; // Sacred Sword learned at level 5

  // Effect level 5+ : −25% defender Defense for 3s after the Slash hits
  const isDefPenActive = state.attackerAegislashSacredSwordDefPen ?? false;
  const lineDefPen = document.createElement('div');
  lineDefPen.className = 'global-bonus-line';
  lineDefPen.innerHTML = wrap(`
    ${icon('assets/moves/aegislash/sacred_sword.png')}
    <div style="flex:1;">
      ${moveBadge('Sacred Sword', 5)}
      Slash hits → <strong style="color:#fff;">−25% defender's Defense</strong> for 3s<br>
      <span style="font-size:0.8rem;color:${C}99;">Applies to all following moves</span><br>
      <button class="sacred-sword-defpen-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isDefPenActive ? C : '#0d2428'};
        color:${isDefPenActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isDefPenActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  lineDefPen.querySelector('.sacred-sword-defpen-toggle').onclick = () => {
    state.attackerAegislashSacredSwordDefPen = !state.attackerAegislashSacredSwordDefPen;
    updateDamages();
  };
  card.appendChild(lineDefPen);

  // Effect level 11+ : +50 ATK for 3s if the triangular zone hits
  if (level >= 11) {
    const isAtkActive = state.attackerAegislashSacredSwordAtkBuff ?? false;
    const lineAtk = document.createElement('div');
    lineAtk.className = 'global-bonus-line';
    lineAtk.innerHTML = wrap(`
      ${icon('assets/moves/aegislash/sacred_sword.png')}
      <div style="flex:1;">
        ${moveBadge('Sacred Sword+', 11)}
        Triangular zone hits → <strong style="color:#fff;">+50 ATK</strong> for 3s<br>
        <span style="font-size:0.8rem;color:${C}99;">Applies to all following moves</span><br>
        <button class="sacred-sword-atk-toggle" style="
          margin-top:8px;padding:6px 16px;
          background:${isAtkActive ? C : '#0d2428'};
          color:${isAtkActive ? '#000' : C};
          border:1px solid ${C};border-radius:6px;cursor:pointer;
          font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
        ">${isAtkActive ? '✓ Active' : 'Activate'}</button>
      </div>
    `);
    lineAtk.querySelector('.sacred-sword-atk-toggle').onclick = () => {
      state.attackerAegislashSacredSwordAtkBuff = !state.attackerAegislashSacredSwordAtkBuff;
      updateDamages();
    };
    card.appendChild(lineAtk);
  }
}

export function applyAegislashSacredSwordStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'aegislash') return;
  if (level < 11) return;
  if (!state.attackerAegislashSacredSwordAtkBuff) return;
  atkStats.atk += 50;
}

// ── AEGISLASH — Iron Head ─────────────────────────────────────────────────────
function applyAegislashIronHead(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.attackerAegislashIronHeadAtkBuff ?? false;
  const bonusPct = 10;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/aegislash/iron_head.png')}
    <div style="flex:1;">
      ${moveBadge('Iron Head+', 13)}
      Shield blocks an attack → <strong style="color:#fff;">+${bonusPct}% ATK</strong> for 3s<br>
      <span style="font-size:0.8rem;color:${C}99;">Applies to all following moves</span><br>
      <button class="iron-head-atk-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.iron-head-atk-toggle').onclick = () => {
    state.attackerAegislashIronHeadAtkBuff = !state.attackerAegislashIronHeadAtkBuff;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyAegislashIronHeadStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'aegislash') return;
  if (level < 13) return;
  if (!state.attackerAegislashIronHeadAtkBuff) return;
  atkStats.atk += Math.floor(atkStats.atk * 0.10);
}

// ── AZUMARILL ─────────────────────────────────────────────────────────────────
function applyAzumarillBellyBash(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 8) return; // Unite unlocks at level 8

  const isActive = state.attackerAzumarillBellyBashAtkBuff ?? false;
  const flatBonus = 6 * (level - 1) + 72;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/azumarill/belly_bash.png')}
    <div style="flex:1;">
      ${moveBadge('Belly Bash (Unite)', 8)}
      Belly pounds → <strong style="color:#fff;">+${flatBonus} ATK</strong> for 8s<br>
      <span style="font-size:0.8rem;color:${C}99;">Flat bonus — scales with level</span><br>
      <button class="belly-bash-atk-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.belly-bash-atk-toggle').onclick = () => {
    state.attackerAzumarillBellyBashAtkBuff = !state.attackerAzumarillBellyBashAtkBuff;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyAzumarillBellyBashStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'azumarill') return;
  if (level < 8) return;
  if (!state.attackerAzumarillBellyBashAtkBuff) return;
  atkStats.atk += 6 * (level - 1) + 72;
}

// ── BLAZIKEN — Spinning Flame Kick (Unite) ──────────────────────────────────
function applyBlazikenSpinningFlameKick(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 8) return; // Unite unlocks at level 8

  const isActive = state.attackerBlazikenSpinningFlameKickAtkBuff ?? false;
  const bonusPct = 30;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/blaziken/spinning_flame_kick.png')}
    <div style="flex:1;">
      ${moveBadge('Spinning Flame Kick (Unite)', 8)}
      Flaming kick hits → <strong style="color:#fff;">+${bonusPct}% ATK</strong> for 4s<br>
      <span style="font-size:0.8rem;color:${C}99;">Switches user to Kick Style</span><br>
      <button class="spinning-flame-kick-atk-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.spinning-flame-kick-atk-toggle').onclick = () => {
    state.attackerBlazikenSpinningFlameKickAtkBuff = !state.attackerBlazikenSpinningFlameKickAtkBuff;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyBlazikenSpinningFlameKickStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'blaziken') return;
  if (level < 8) return;
  if (!state.attackerBlazikenSpinningFlameKickAtkBuff) return;
  atkStats.atk += Math.floor(atkStats.atk * 0.30);
}

// ── BUZZWOLE — Lunge ──────────────────────────────────────────────────────────
function applyBuzzwoleLunge(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 13) return; // Upgrade at level 13

  const stacks    = state.attackerBuzzwoleLungeStacks ?? 0;
  const maxStacks = 5;
  const bonusPct  = stacks * 10;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/buzzwole/lunge.png')}
    <div style="flex:1;">
      ${moveBadge('Lunge+', 13)}
      Players hit: <button class="stack-btn minus lunge-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus lunge-plus">+</button><br>
      → ATK <strong style="color:${bonusPct > 0 ? '#88ff88' : '#888'};">+${bonusPct}%</strong> for 2s
      ${bonusPct >= 50 ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}
    </div>
  `);
  line.querySelector('.lunge-minus').onclick = () => { if ((state.attackerBuzzwoleLungeStacks ?? 0) > 0)        { state.attackerBuzzwoleLungeStacks = (state.attackerBuzzwoleLungeStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.lunge-plus').onclick  = () => { if ((state.attackerBuzzwoleLungeStacks ?? 0) < maxStacks) { state.attackerBuzzwoleLungeStacks = (state.attackerBuzzwoleLungeStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

// ── BUZZWOLE — Leech Life+ (lvl 11) is automatic and rendered directly in
// damageDisplay.js via the move's tick scaling — no toggle needed here.

export function applyBuzzwoleLungeStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'buzzwole') return;
  if (level < 13) return;
  const stacks = state.attackerBuzzwoleLungeStacks ?? 0;
  if (stacks <= 0) return;
  atkStats.atk += Math.floor(atkStats.atk * 0.10 * stacks);
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
export function applyAttackerMoveEffects(pokemonId, atkStats, defStats, card) {
  const handlers = {
    greninja:  [applyGreninjaSmokescreenAttacker],
    dragonite: [applyDragoniteDragonDance],
    aegislash: [applyAegislashSacredSword, applyAegislashIronHead],
    azumarill: [applyAzumarillBellyBash],
    blaziken:  [applyBlazikenSpinningFlameKick],
    buzzwole:  [applyBuzzwoleLunge],
  };
  (handlers[pokemonId] ?? []).forEach(fn => fn(atkStats, defStats, card));
}