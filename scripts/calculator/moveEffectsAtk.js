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

// ── CERULEDGE — Lava Plume ───────────────────────────────────────────────────
function applyCeruledgeLavaPlume(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 1) return; // Lava Plume learned at level 1

  const isActive = state.attackerLavaPlumeActive ?? false;
  const bonusPct = 15;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/ceruledge/lava_plume.png')}
    <div style="flex:1;">
      ${moveBadge('Lava Plume', 1)}
      Lava Plume hits → next basic attack deals <strong style="color:#fff;">+${bonusPct}% damage</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Applies to the next Auto-attack only</span><br>
      <button class="lava-plume-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.lava-plume-toggle').onclick = () => {
    state.attackerLavaPlumeActive = !state.attackerLavaPlumeActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── CHANDELURE — Flamethrower+ ───────────────────────────────────────────────
function applyChandelureFlamethrowerPlus(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 11) return; // Upgrade at level 11

  const isActive = state.attackerFlamethrowerPlusActive ?? false;
  const bonusPct = 20;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/chandelure/flamethrower.png')}
    <div style="flex:1;">
      ${moveBadge('Flamethrower+', 11)}
      Explosion hits → <strong style="color:#fff;">+${bonusPct}% damage</strong> on all moves for 3s<br>
      <span style="font-size:0.8rem;color:${C}99;">Also applies to the triggering explosion itself</span><br>
      <button class="flamethrower-plus-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.flamethrower-plus-toggle').onclick = () => {
    state.attackerFlamethrowerPlusActive = !state.attackerFlamethrowerPlusActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── CHARIZARD — Seismic Slam (Unite) ─────────────────────────────────────────
function applyCharizardSeismicSlam(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 9) return; // Unite unlocks at level 9

  const isActive = state.attackerSeismicSlamActive ?? false;
  const bonusPct = 60;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/charizard/seismic_slam.png')}
    <div style="flex:1;">
      ${moveBadge('Seismic Slam (Unite)', 9)}
      While flying after the slam → basic attacks heal <strong style="color:#fff;">${bonusPct}% of damage dealt</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Basic hit only — excludes burns & additional damage</span><br>
      <button class="seismic-slam-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.seismic-slam-toggle').onclick = () => {
    state.attackerSeismicSlamActive = !state.attackerSeismicSlamActive;
    updateDamages();
  };
  card.appendChild(line);
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

// ── CINDERACE — Feint ────────────────────────────────────────────────────────
function applyCinderaceFeint(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.attackerCinderaceFeintHealActive ?? false;
  const bonusPct = 30;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/cinderace/feint.png')}
    <div style="flex:1;">
      ${moveBadge('Feint+', 13)}
      Dodge → next 3 auto attacks heal <strong style="color:#fff;">${bonusPct}% of damage dealt</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">These 3 auto attacks cannot critically hit</span><br>
      <button class="cinderace-feint-heal-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.cinderace-feint-heal-toggle').onclick = () => {
    state.attackerCinderaceFeintHealActive = !state.attackerCinderaceFeintHealActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── CRUSTLE — Shell Smash ─────────────────────────────────────────────────────
function applyCrustleShellSmash(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 4) return; // Shell Smash learned at level 4

  const baseStats      = state.currentAttacker.stats[level - 1];
  const conversionRate = level >= 11 ? 0.50 : 0.40;
  const atkBonus   = Math.floor(baseStats.def    * conversionRate);
  const spAtkBonus = Math.floor(baseStats.sp_def * conversionRate);
  if (state.attackerShellSmashActive) {
    atkStats.atk    += atkBonus;
    atkStats.sp_atk += spAtkBonus;
  }
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/crustle/shell_smash.png')}
    <div style="flex:1;">
      ${moveBadge('Shell Smash', 4)}
      ${level >= 11
        ? `<span style="font-size:0.75rem;color:#ffd740;margin-left:6px;">⬆️ Upgraded (50%)</span>`
        : `<span style="font-size:0.75rem;color:#aaa;margin-left:6px;">(40% · upgrades at lvl 11)</span>`}<br>
      <span style="font-size:0.85rem;color:#ccc;">Def/SpDef → 0 · Atk +${atkBonus} · SpAtk +${spAtkBonus}</span><br>
      <button class="shell-smash-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${state.attackerShellSmashActive ? C : '#0d2428'};
        color:${state.attackerShellSmashActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${state.attackerShellSmashActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.shell-smash-toggle').onclick = () => { state.attackerShellSmashActive = !state.attackerShellSmashActive; updateDamages(); };
  card.appendChild(line);
}

// ── CRUSTLE — Fury Cutter ─────────────────────────────────────────────────────
function applyCrustleFuryCutter(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level >= 6) return;
  const stacks    = state.attackerCrustleFuryCutterStacks ?? 0;
  const maxStacks = 3;
  const bonusPct  = Math.min(stacks * 20, 40);
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/crustle/fury_cutter.png')}
    <div style="flex:1;">
      ${moveBadge('Fury Cutter', 1)}
      Marks on target: <button class="stack-btn minus fc-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus fc-plus">+</button><br>
      → Damage <strong style="color:${bonusPct > 0 ? '#88ff88' : '#888'};">+${bonusPct}%</strong>
      ${bonusPct >= 40 ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}<br>
      <span style="font-size:0.8rem;color:${C}99;">Stacking damage is always rounded up</span>
    </div>
  `);
  line.querySelector('.fc-minus').onclick = () => { if ((state.attackerCrustleFuryCutterStacks ?? 0) > 0)        { state.attackerCrustleFuryCutterStacks = (state.attackerCrustleFuryCutterStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.fc-plus').onclick  = () => { if ((state.attackerCrustleFuryCutterStacks ?? 0) < maxStacks) { state.attackerCrustleFuryCutterStacks = (state.attackerCrustleFuryCutterStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

// ── DECIDUEYE — Leafage (+10% ATK for 3s) ────────────────────────────────────
function applyDecidueyeLeafage(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level >= 7) return;

  const isActive = state.attackerDecidueyeLeafageAtkBuff ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/decidueye/leafage.png')}
    <div style="flex:1;">
      ${moveBadge('Leafage', 1)}
      Move used → <strong style="color:#fff;">+10% ATK</strong> & <strong style="color:#fff;">+25% attack speed</strong> for 3s<br>
      <span style="font-size:0.8rem;color:${C}99;">ATK boost also applies to Leafage itself</span><br>
      <button class="decidueye-leafage-atk-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.decidueye-leafage-atk-toggle').onclick = () => {
    state.attackerDecidueyeLeafageAtkBuff = !state.attackerDecidueyeLeafageAtkBuff;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyDecidueyeLeafageStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'decidueye') return;
  if (level >= 7) return;
  if (!state.attackerDecidueyeLeafageAtkBuff) return;
  atkStats.atk = Math.floor(atkStats.atk * 1.10);
}

// ── DECIDUEYE — Razor Leaf (+10% ATK while active) ───────────────────────────
function applyDecidueyeRazorLeaf(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 7) return;

  const isActive = state.attackerDecidueyeRazorLeafAtkBuff ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/decidueye/razor_leaf.png')}
    <div style="flex:1;">
      ${moveBadge('Razor Leaf', 7)}
      While active → <strong style="color:#fff;">+10% ATK</strong> & enhanced auto attacks for 5.5s<br>
      <button class="decidueye-razor-leaf-atk-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.decidueye-razor-leaf-atk-toggle').onclick = () => {
    state.attackerDecidueyeRazorLeafAtkBuff = !state.attackerDecidueyeRazorLeafAtkBuff;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyDecidueyeRazorLeafStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'decidueye') return;
  if (level < 7) return;
  if (!state.attackerDecidueyeRazorLeafAtkBuff) return;
  atkStats.atk = Math.floor(atkStats.atk * 1.10);
}

// ── DARKRAI — Calm Mind ───────────────────────────────────────────────────────
function applyDarkraiCalmMind(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level >= 7) return;

  const isActive = state.attackerDarkraiCalmMindActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/darkrai/calm_mind.png')}
    <div style="flex:1;">
      ${moveBadge('Calm Mind', 1)}
      Move used → <strong style="color:#fff;">+30% Sp. Atk & +30% Sp. Def</strong> for 3s<br>
      <span style="font-size:0.8rem;color:${C}99;">Sp. Def not used in damage calc — only Sp. Atk applied here</span><br>
      <button class="darkrai-calm-mind-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.darkrai-calm-mind-toggle').onclick = () => {
    state.attackerDarkraiCalmMindActive = !state.attackerDarkraiCalmMindActive;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyDarkraiCalmMindStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'darkrai') return;
  if (level >= 7) return;
  if (!state.attackerDarkraiCalmMindActive) return;
  atkStats.sp_atk = Math.floor(atkStats.sp_atk * 1.30);
}

// ── DELPHOX — Fire Spin+ (lvl 13) ────────────────────────────────────────────
function applyDelphoxFireSpinPlus(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.attackerDelphoxFireSpinPlusActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/delphox/fire_spin.png')}
    <div style="flex:1;">
      ${moveBadge('Fire Spin+', 13)}
      Trap activation → <strong style="color:#fff;">+15% all damage from Delphox</strong> for 3s<br>
      <span style="font-size:0.8rem;color:${C}99;">Does not re-apply on subsequent trap ticks</span><br>
      <button class="delphox-fire-spin-plus-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.delphox-fire-spin-plus-toggle').onclick = () => {
    state.attackerDelphoxFireSpinPlusActive = !state.attackerDelphoxFireSpinPlusActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── DODRIO — Triple Trample (Unite) ──────────────────────────────────────────
function applyDodrioTripleTrample(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 9) return; // Unite unlocks at level 9

  const isActive = state.attackerDodrioTripleTrampleBuff ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/dodrio/triple_trample.png')}
    <div style="flex:1;">
      ${moveBadge('Triple Trample (Unite)', 9)}
      Arrival at destination → <strong style="color:#fff;">+25% ATK</strong> & <strong style="color:#fff;">−5% Sp. Atk</strong> for 3s<br>
      <span style="font-size:0.8rem;color:${C}99;">Also grants a 10% Max HP shield (not modeled here)</span><br>
      <button class="dodrio-triple-trample-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.dodrio-triple-trample-toggle').onclick = () => {
    state.attackerDodrioTripleTrampleBuff = !state.attackerDodrioTripleTrampleBuff;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyDodrioTripleTrampleStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'dodrio') return;
  if (level < 9) return;
  if (!state.attackerDodrioTripleTrampleBuff) return;
  atkStats.atk    = Math.floor(atkStats.atk    * 1.25);
  atkStats.sp_atk = Math.floor(atkStats.sp_atk * 0.95);
}

// ── DRAGAPULT — Dragon Dance+ (lvl 11) ───────────────────────────────────────
function applyDragapultDragonDanceHeal(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 11) return; // Upgrade at level 11

  const isActive = state.attackerDragapultDragonDanceHealActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/dragapult/dragon_dance.png')}
    <div style="flex:1;">
      ${moveBadge('Dragon Dance+', 11)}
      While flying → auto attacks heal <strong style="color:#fff;">25% of damage dealt</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Flying auto attacks also deal 10% reduced damage</span><br>
      <button class="dragapult-dragon-dance-heal-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.dragapult-dragon-dance-heal-toggle').onclick = () => {
    state.attackerDragapultDragonDanceHealActive = !state.attackerDragapultDragonDanceHealActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── DRAGAPULT — Phantom Force (KO stacks) ────────────────────────────────────
function applyDragapultPhantomForce(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 5) return; // Phantom Force learned at level 5

  const stacks    = state.attackerDragapultPhantomForceStacks ?? 0;
  const maxStacks = 10;
  const bonusAtk  = stacks * 8;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/dragapult/phantom_force.png')}
    <div style="flex:1;">
      ${moveBadge('Phantom Force', 5)}
      KOs: <button class="stack-btn minus pf-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus pf-plus">+</button><br>
      → ATK <strong style="color:${bonusAtk > 0 ? '#88ff88' : '#888'};">+${bonusAtk}</strong> (permanent for the battle)
      ${stacks >= maxStacks ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}<br>
      <span style="font-size:0.8rem;color:${C}99;">+8 ATK per KO, up to 10 times (max +80)</span>
    </div>
  `);
  line.querySelector('.pf-minus').onclick = () => { if ((state.attackerDragapultPhantomForceStacks ?? 0) > 0)        { state.attackerDragapultPhantomForceStacks = (state.attackerDragapultPhantomForceStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.pf-plus').onclick  = () => { if ((state.attackerDragapultPhantomForceStacks ?? 0) < maxStacks) { state.attackerDragapultPhantomForceStacks = (state.attackerDragapultPhantomForceStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

export function applyDragapultPhantomForceStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'dragapult') return;
  if (level < 5) return;
  const stacks = state.attackerDragapultPhantomForceStacks ?? 0;
  if (stacks <= 0) return;
  atkStats.atk += stacks * 8;
}

// ── DURALUDON — Revolving Ruin (Unite) ───────────────────────────────────────
function applyDuraludonRevolvingRuin(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 9) return; // Unite unlocks at level 9

  const stacks    = state.attackerDuraludonRevolvingRuinStacks ?? 0;
  const maxStacks = 5;
  const bonusPct  = stacks * 8;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/duraludon/revolving_ruin.png')}
    <div style="flex:1;">
      ${moveBadge('Revolving Ruin (Unite)', 9)}
      Enemies hit: <button class="stack-btn minus rr-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus rr-plus">+</button><br>
      → <strong style="color:${bonusPct > 0 ? '#88ff88' : '#888'};">+${bonusPct}% ATK</strong> for 8s
      ${stacks >= maxStacks ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}<br>
      <span style="font-size:0.8rem;color:${C}99;">+8% ATK per enemy hit, up to 5 stacks (max +40%)</span>
    </div>
  `);
  line.querySelector('.rr-minus').onclick = () => { if ((state.attackerDuraludonRevolvingRuinStacks ?? 0) > 0)        { state.attackerDuraludonRevolvingRuinStacks = (state.attackerDuraludonRevolvingRuinStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.rr-plus').onclick  = () => { if ((state.attackerDuraludonRevolvingRuinStacks ?? 0) < maxStacks) { state.attackerDuraludonRevolvingRuinStacks = (state.attackerDuraludonRevolvingRuinStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

export function applyDuraludonRevolvingRuinStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'duraludon') return;
  if (level < 9) return;
  const stacks = state.attackerDuraludonRevolvingRuinStacks ?? 0;
  if (stacks <= 0) return;
  atkStats.atk = Math.floor(atkStats.atk * (1 + stacks * 0.08));
}

// ── PALKIA — Aura Sphere (mark) ──────────────────────────────────────────────
function applyPalkiaAuraSphereMark(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 5) return; // Aura Sphere replaces Aqua Ring at level 5

  const isActive = state.attackerPalkiaAuraSphereMarked ?? false;
  const bonusDamage = Math.floor(atkStats.sp_atk * 0.64) + 192;
  const bonusHeal   = Math.floor(atkStats.sp_atk * 0.65) + 195;

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/palkia/aura_sphere.png')}
    <div style="flex:1;">
      ${moveBadge('Aura Sphere', 5)}
      Target marked for 4s → next damage dealt are true damage</strong> & <strong style="color:#4caf82;">heal </strong>, mark consumed<br>
      <button class="aura-sphere-mark-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Target marked' : 'Mark target'}</button>
    </div>
  `);
  line.querySelector('.aura-sphere-mark-toggle').onclick = () => {
    state.attackerPalkiaAuraSphereMarked = !state.attackerPalkiaAuraSphereMarked;
    updateDamages();
  };
  card.appendChild(line);
}

// ── GLACEON — Freeze Dry ─────────────────────────────────────────────────────
function applyGlaceonFreezeDry(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 6) return; // Freeze Dry appris au niveau 6

  const isActive = state.attackerGlaceonFreezeDryBuff ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/glaceon/freeze_dry.png')}
    <div style="flex:1;">
      ${moveBadge('Freeze Dry', 6)}
      Explosion hits an enemy → <strong style="color:#fff;">+50% Sp. Atk</strong><br>
      <button class="glaceon-freeze-dry-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.glaceon-freeze-dry-toggle').onclick = () => {
    state.attackerGlaceonFreezeDryBuff = !state.attackerGlaceonFreezeDryBuff;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyGlaceonFreezeDryStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'glaceon') return;
  if (level < 6) return;
  if (!state.attackerGlaceonFreezeDryBuff) return;
  atkStats.sp_atk = Math.floor(atkStats.sp_atk * 1.50);
}

// ── FALINKS — Bulk Up ─────────────────────────────────────────────────────────
function applyFalinksBulkUp(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 1) return; // Bulk Up disponible dès le niveau 1 (ou 3 selon le choix de move 2)

  const isActive = state.attackerFalinksBulkUpActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/falinks/bulk_up.png')}
    <div style="flex:1;">
      ${moveBadge('Bulk Up', 1)}
      Active → <strong style="color:#fff;">+30% ATK</strong> for 3s<br>
      <span style="font-size:0.8rem;color:${C}99;">Also grants +25% Def/Sp. Def & Attack Speed (see defender panel for the Def/Sp. Def buff)</span><br>
      <button class="falinks-bulkup-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.falinks-bulkup-toggle').onclick = () => {
    state.attackerFalinksBulkUpActive = !state.attackerFalinksBulkUpActive;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyFalinksBulkUpStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'falinks') return;
  if (!state.attackerFalinksBulkUpActive) return;
  atkStats.atk = Math.floor(atkStats.atk * 1.30);
}

// ── FALINKS — No Retreat (formation) ───────────────────────────────────────────
function applyFalinksNoRetreat(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 6) return; // No Retreat appris au niveau 6

  const upgraded = level >= 12;
  const atkBonusPct   = upgraded ? 40 : 25;
  const frontReducPct = upgraded ? 35 : 30;
  const isActive = state.attackerFalinksNoRetreatActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/falinks/no_retreat.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'No Retreat+' : 'No Retreat', upgraded ? 12 : 6)}
      In No Retreat formation → <strong style="color:#fff;">+${atkBonusPct}% ATK</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Also reduces damage taken from the front by ${frontReducPct}% (movement speed backward −10%) — see defender panel</span><br>
      <button class="falinks-noretreat-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ In formation' : 'Switch to No Retreat'}</button>
    </div>
  `);
  line.querySelector('.falinks-noretreat-toggle').onclick = () => {
    state.attackerFalinksNoRetreatActive = !state.attackerFalinksNoRetreatActive;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyFalinksNoRetreatStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'falinks') return;
  if (level < 6) return;
  if (!state.attackerFalinksNoRetreatActive) return;
  const bonus = level >= 12 ? 0.40 : 0.25;
  atkStats.atk = Math.floor(atkStats.atk * (1 + bonus));
}

// ── GARCHOMP — Auto-attack (stacks → Boosted) ───────────────────────────────────
function applyGarchompAutoAttack(atkStats, defStats, card) {
  const level    = state.attackerLevel || 1;
  const stacks   = Math.min(5, state.attackerPassiveStacks || 0);
  const boosted  = stacks >= 5;
  const atkSpeedBonus = 3 * (level - 1) + 28; // % Attack Speed at max stacks

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/basic_attack.png')}
    <div style="flex:1;">
      ${moveBadge('Auto-attack', 1)}
      Stacks: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${stacks}</strong>/5
      <button class="stack-btn plus">+</button>
      <br><span style="font-size:0.8rem;color:${C}99;">Gained on hitting an auto attack or move</span>
      <div style="margin-top:8px;font-size:0.85rem;">
        Status: <strong style="color:${boosted ? '#88ff88' : '#ff6666'};">${boosted ? 'Boosted attacks active' : 'Normal attacks'}</strong><br>
        ${boosted ? `
          <span style="color:#fff;">+${atkSpeedBonus}% Attack Speed · +30% Lifesteal on boosted hits</span><br>
          <span style="color:${C}99;">+10% target's remaining HP as bonus damage (capped 350 vs wild)</span>
        ` : ''}
      </div>
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.attackerPassiveStacks < 5) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── FERALIGATR — Crunch : Destructive Fangs (−30% Def cible) ───────────────────
function applyFeraligatrDestructiveFangs(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 5) return; // Crunch appris au niveau 5

  const isActive = state.attackerFeraligatrDestructiveFangsActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/feraligatr/crunch.png')}
    <div style="flex:1;">
      ${moveBadge('Crunch — Destructive Fangs', 5)}
      Empowered basic attack lands → <strong style="color:#fff;">−30% target's Defense</strong> for 5s<br>
      <span style="font-size:0.8rem;color:${C}99;">Only the Yellow Fang (Destructive) applies this; Red (Gluttonous) heals, Purple (Clamping) slows instead</span><br>
      <button class="feraligatr-destructive-fangs-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.feraligatr-destructive-fangs-toggle').onclick = () => {
    state.attackerFeraligatrDestructiveFangsActive = !state.attackerFeraligatrDestructiveFangsActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── HO-OH — Sacred Fire (flight) ────────────────────────────────────────────────
function applyHoohSacredFireFlight(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 7) return; // Sacred Fire learned at level 7

  const isActive = state.attackerHoohSacredFireFlying ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/hooh/sacred_fire.png')}
    <div style="flex:1;">
      ${moveBadge('Sacred Fire', 7)}
      While flying → <strong style="color:#fff;">+25% ATK</strong> & +30% movement speed<br>
      <span style="font-size:0.8rem;color:${C}99;">Next 3 basic attacks are boosted attacks; can move freely over walls</span><br>
      <button class="hooh-sacredfire-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.hooh-sacredfire-toggle').onclick = () => {
    state.attackerHoohSacredFireFlying = !state.attackerHoohSacredFireFlying;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyHoohSacredFireStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'hooh') return;
  if (level < 7) return;
  if (!state.attackerHoohSacredFireFlying) return;
  atkStats.atk = Math.floor(atkStats.atk * 1.25);
}

// ── HOOPA — Rings Unbound (Unite) ────────────────────────────────────────────
function applyHoopaRingsUnbound(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 9) return; // Unite unlocks at level 9

  const isActive = state.attackerHoopaUnboundActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/hoopa/rings_unbound.png')}
    <div style="flex:1;">
      ${moveBadge('Rings Unbound (Unite)', 9)}
      Hoopa Unbound (15s) → <strong style="color:#fff;">+40% Max HP</strong><br>
      <button class="hoopa-unbound-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.hoopa-unbound-toggle').onclick = () => {
    state.attackerHoopaUnboundActive = !state.attackerHoopaUnboundActive;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyHoopaRingsUnboundStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'hoopa') return;
  if (level < 9) return;
  if (!state.attackerHoopaUnboundActive) return;
  atkStats.hp = Math.floor(atkStats.hp * 1.40);
}

// ── INTELEON — Liquidation (5-hit stacking bonus) ─────────────────────────────
function applyInteleonLiquidation(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 7) return;

  const upgraded = level >= 13;
  const isActive = state.attackerInteleonLiquidationStacked ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/inteleon/liquidation.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Liquidation+' : 'Liquidation', upgraded ? 13 : 7)}
      5 bullets hit the same target → <strong style="color:#fff;">+20% damage to that target</strong> for 3s<br>
      <button class="inteleon-liquidation-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.inteleon-liquidation-toggle').onclick = () => {
    state.attackerInteleonLiquidationStacked = !state.attackerInteleonLiquidationStacked;
    updateDamages();
  };
  card.appendChild(line);
}

// ── INTELEON — Azure Spy Vision (Unite) ───────────────────────────────────────
function applyInteleonAzureSpyVision(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 9) return;

  const isActive = state.attackerInteleonAzureSpyVisionActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/inteleon/azure_spy_vision.png')}
    <div style="flex:1;">
      ${moveBadge('Azure Spy Vision (Unite)', 9)}
      While active (10.5s) → <strong style="color:#fff;">×2 Critical-Hit Rate</strong><br>
      <button class="inteleon-azurespyvision-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.inteleon-azurespyvision-toggle').onclick = () => {
    state.attackerInteleonAzureSpyVisionActive = !state.attackerInteleonAzureSpyVisionActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── LATIAS / LATIOS — Eon Power shared mechanics ─────────────────────────────
// Eon Power is accumulated by hitting opposing Pokémon with certain moves.
// Each Pokémon tracks its own moves' Eon Power independently, and a mon's two
// Eon Power moves are NEVER active at the same time — picking one resets/locks
// out the other (see applyLatiasEonPower / applyLatiosEonPower below).

// Dragon Pulse (Latias & Latios): gains projectiles at 25/50/75/100 Eon power
// (2/1/1/2 → 6 total).
export function getEonPowerProjectileCount(eonPower) {
  const eon = Math.max(0, eonPower || 0);
  if (eon >= 100) return 6;
  if (eon >= 75)  return 4;
  if (eon >= 50)  return 3;
  if (eon >= 25)  return 2;
  return 0;
}

// Per-projectile multiplier: -15% per successive projectile (cap -75%),
// plus +0.5% per Eon power point beyond 100 (caps at 1099 Eon power).
export function getEonPowerProjectileScaling(eonPower) {
  const eon = Math.min(1099, Math.max(0, eonPower || 0));
  const count = getEonPowerProjectileCount(eon);
  if (count === 0) return [];
  const eonDmgBonus = 1 + Math.max(0, eon - 100) * 0.005;
  return Array.from({ length: count }, (_, i) => (1 - Math.min(0.15 * i, 0.75)) * eonDmgBonus);
}

export const EON_POWER_PROJECTILE_MAX_EON = 1099;

// Dragon Breath (Latias only): +0.5% damage per Eon power point beyond 60 (caps at 1059 Eon power).
export function getLatiasDragonBreathMultiplier(eonPower) {
  const eon = Math.min(1059, Math.max(0, eonPower || 0));
  return 1 + Math.max(0, eon - 60) * 0.005;
}

export const LATIAS_DRAGON_PULSE_MAX_EON  = EON_POWER_PROJECTILE_MAX_EON;
export const LATIAS_DRAGON_BREATH_MAX_EON = 1059;

// Draco Meteor (Latios only): +1 comet per 25 Eon power, base 2, cap 6 at 100 Eon power.
export function getDracoMeteorCometCount(eonPower) {
  const eon = Math.max(0, eonPower || 0);
  return Math.min(6, 2 + Math.floor(eon / 25));
}

// First comet full damage; every subsequent comet is a flat -50% (not cumulative),
// plus +0.5% per Eon power point beyond 100 (caps at 1099 Eon power).
export function getDracoMeteorCometScaling(eonPower) {
  const eon = Math.min(1099, Math.max(0, eonPower || 0));
  const count = getDracoMeteorCometCount(eon);
  const eonDmgBonus = 1 + Math.max(0, eon - 100) * 0.005;
  return Array.from({ length: count }, (_, i) => (i === 0 ? 1 : 0.5) * eonDmgBonus);
}

export const LATIOS_DRAGON_PULSE_MAX_EON  = EON_POWER_PROJECTILE_MAX_EON;
export const LATIOS_DRACO_METEOR_MAX_EON  = 1099;

function applyLatiasEonPower(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 4) return; // Both moves learned at level 4

  const mode = state.attackerLatiasEonPowerMove || null; // 'dragonPulse' | 'dragonBreath' | null
  const maxEon = mode === 'dragonBreath' ? LATIAS_DRAGON_BREATH_MAX_EON : LATIAS_DRAGON_PULSE_MAX_EON;
  const eon = Math.min(maxEon, Math.max(0, state.attackerLatiasEonPower || 0));

  const setMode = (newMode) => {
    if (state.attackerLatiasEonPowerMove === newMode) {
      // Clicking the active mode again clears it entirely
      state.attackerLatiasEonPowerMove = null;
      state.attackerLatiasEonPower = 0;
    } else {
      state.attackerLatiasEonPowerMove = newMode;
      const cap = newMode === 'dragonBreath' ? LATIAS_DRAGON_BREATH_MAX_EON : LATIAS_DRAGON_PULSE_MAX_EON;
      state.attackerLatiasEonPower = Math.min(state.attackerLatiasEonPower || 0, cap);
    }
    updateDamages();
  };

  const projCount = mode === 'dragonPulse' ? getEonPowerProjectileCount(eon) : 0;
  const dpBonusPct = mode === 'dragonPulse'  ? Math.max(0, eon - 100) * 0.5 : 0;
  const dbBonusPct = mode === 'dragonBreath' ? Math.max(0, eon - 60)  * 0.5 : 0;
  const dbSlowLabel = level >= 10 ? '40%' : '30%';

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/latias/dragon_pulse.png')}
    <div style="flex:1;">
      ${moveBadge('Eon Power', 4)}
      <span style="font-size:0.8rem;color:${C}99;">Dragon Pulse and Dragon Breath track Eon Power separately and are never active together — pick which move is stacking.</span><br>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <button class="latias-mode-btn latias-mode-pulse" style="
          padding:6px 14px;background:${mode === 'dragonPulse' ? C : '#0d2428'};color:${mode === 'dragonPulse' ? '#000' : C};
          border:1px solid ${C};border-radius:6px;cursor:pointer;font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
        ">Dragon Pulse</button>
        <button class="latias-mode-btn latias-mode-breath" style="
          padding:6px 14px;background:${mode === 'dragonBreath' ? C : '#0d2428'};color:${mode === 'dragonBreath' ? '#000' : C};
          border:1px solid ${C};border-radius:6px;cursor:pointer;font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
        ">Dragon Breath</button>
      </div>
      ${mode ? `
        <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
          <span style="font-size:0.85rem;color:${C};">Eon power:</span>
          <button class="stack-btn minus latias-eon-minus" style="padding:2px 10px;">−</button>
          <input type="number" class="latias-eon-input" value="${eon}" min="0" max="${maxEon}" step="1" style="
            width:76px;background:#0d2428;color:${C};border:1px solid ${C};border-radius:4px;padding:4px 6px;
            text-align:center;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:0.9rem;">
          <button class="stack-btn plus latias-eon-plus" style="padding:2px 10px;">+</button>
          <span style="font-size:0.8rem;color:${C}99;">/ ${maxEon}</span>
        </div>
        <div style="margin-top:8px;font-size:0.85rem;color:#fff;">
          ${mode === 'dragonPulse'
            ? `→ <strong style="color:${C};">${projCount}</strong> projectile${projCount !== 1 ? 's' : ''} on hit${dpBonusPct > 0 ? ` · projectile damage <strong style="color:#88ff88;">+${dpBonusPct.toFixed(1)}%</strong>` : ''}`
            : `→ Damage ${dbBonusPct > 0 ? `<strong style="color:#88ff88;">+${dbBonusPct.toFixed(1)}%</strong>` : '<strong style="color:#888;">+0%</strong>'} · slow ${dbSlowLabel} for 3s${level >= 10 ? '' : ' (40% at level 10)'}`
          }
        </div>
      ` : ''}
    </div>
  `);

  line.querySelector('.latias-mode-pulse').onclick  = () => setMode('dragonPulse');
  line.querySelector('.latias-mode-breath').onclick = () => setMode('dragonBreath');

  if (mode) {
    const clamp = (v) => Math.min(maxEon, Math.max(0, v));
    line.querySelector('.latias-eon-minus').onclick = () => {
      state.attackerLatiasEonPower = clamp((state.attackerLatiasEonPower || 0) - 5);
      updateDamages();
    };
    line.querySelector('.latias-eon-plus').onclick = () => {
      state.attackerLatiasEonPower = clamp((state.attackerLatiasEonPower || 0) + 5);
      updateDamages();
    };
    line.querySelector('.latias-eon-input').onchange = (e) => {
      state.attackerLatiasEonPower = clamp(parseInt(e.target.value, 10) || 0);
      updateDamages();
    };
  }

  card.appendChild(line);
}

function applyLatiosEonPower(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 5) return; // Both moves learned at level 5

  const mode = state.attackerLatiosEonPowerMove || null; // 'dragonPulse' | 'dracoMeteor' | null
  const maxEon = LATIOS_DRAGON_PULSE_MAX_EON; // both cap at 1099 for Latios
  const eon = Math.min(maxEon, Math.max(0, state.attackerLatiosEonPower || 0));

  const setMode = (newMode) => {
    if (state.attackerLatiosEonPowerMove === newMode) {
      // Clicking the active mode again clears it entirely
      state.attackerLatiosEonPowerMove = null;
      state.attackerLatiosEonPower = 0;
    } else {
      state.attackerLatiosEonPowerMove = newMode;
      state.attackerLatiosEonPower = Math.min(state.attackerLatiosEonPower || 0, maxEon);
    }
    updateDamages();
  };

  const projCount  = mode === 'dragonPulse' ? getEonPowerProjectileCount(eon) : 0;
  const cometCount = mode === 'dracoMeteor' ? getDracoMeteorCometCount(eon)   : 0;
  const dpBonusPct = (mode === 'dragonPulse' || mode === 'dracoMeteor') ? Math.max(0, eon - 100) * 0.5 : 0;
  const upgraded   = level >= 11;

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/latios/dragon_pulse.png')}
    <div style="flex:1;">
      ${moveBadge('Eon Power', 5)}
      <span style="font-size:0.8rem;color:${C}99;">Dragon Pulse and Draco Meteor track Eon Power separately and are never active together — pick which move is stacking.</span><br>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <button class="latios-mode-btn latios-mode-pulse" style="
          padding:6px 14px;background:${mode === 'dragonPulse' ? C : '#0d2428'};color:${mode === 'dragonPulse' ? '#000' : C};
          border:1px solid ${C};border-radius:6px;cursor:pointer;font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
        ">Dragon Pulse</button>
        <button class="latios-mode-btn latios-mode-meteor" style="
          padding:6px 14px;background:${mode === 'dracoMeteor' ? C : '#0d2428'};color:${mode === 'dracoMeteor' ? '#000' : C};
          border:1px solid ${C};border-radius:6px;cursor:pointer;font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
        ">Draco Meteor</button>
      </div>
      ${mode ? `
        <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
          <span style="font-size:0.85rem;color:${C};">Eon power:</span>
          <button class="stack-btn minus latios-eon-minus" style="padding:2px 10px;">−</button>
          <input type="number" class="latios-eon-input" value="${eon}" min="0" max="${maxEon}" step="1" style="
            width:76px;background:#0d2428;color:${C};border:1px solid ${C};border-radius:4px;padding:4px 6px;
            text-align:center;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:0.9rem;">
          <button class="stack-btn plus latios-eon-plus" style="padding:2px 10px;">+</button>
          <span style="font-size:0.8rem;color:${C}99;">/ ${maxEon}</span>
        </div>
        <div style="margin-top:8px;font-size:0.85rem;color:#fff;">
          ${mode === 'dragonPulse'
            ? `→ <strong style="color:${C};">${projCount}</strong> projectile${projCount !== 1 ? 's' : ''} on hit${dpBonusPct > 0 ? ` · damage <strong style="color:#88ff88;">+${dpBonusPct.toFixed(1)}%</strong>` : ''}${upgraded ? ' · +3% missing HP dmg/projectile (cap 300)' : ''}`
            : `→ <strong style="color:${C};">${cometCount}</strong> comet${cometCount !== 1 ? 's' : ''}${dpBonusPct > 0 ? ` · damage <strong style="color:#88ff88;">+${dpBonusPct.toFixed(1)}%</strong>` : ''}${upgraded ? ' · +3% missing HP dmg/comet (cap 300)' : ''}`
          }
        </div>
      ` : ''}
    </div>
  `);

  line.querySelector('.latios-mode-pulse').onclick  = () => setMode('dragonPulse');
  line.querySelector('.latios-mode-meteor').onclick = () => setMode('dracoMeteor');

  if (mode) {
    const clamp = (v) => Math.min(maxEon, Math.max(0, v));
    line.querySelector('.latios-eon-minus').onclick = () => {
      state.attackerLatiosEonPower = clamp((state.attackerLatiosEonPower || 0) - 5);
      updateDamages();
    };
    line.querySelector('.latios-eon-plus').onclick = () => {
      state.attackerLatiosEonPower = clamp((state.attackerLatiosEonPower || 0) + 5);
      updateDamages();
    };
    line.querySelector('.latios-eon-input').onchange = (e) => {
      state.attackerLatiosEonPower = clamp(parseInt(e.target.value, 10) || 0);
      updateDamages();
    };
  }

  card.appendChild(line);
}

// ── LATIOS — Luster Purge mark (also benefits an allied Latias) ──────────────
// Simple on/off trigger: is the target currently marked by Luster Purge?
// If active, +20% damage on every subsequent hit against that target.
function applyLusterPurgeMark(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 7) return; 

  const isActive = state.attackerLatiosLusterPurgeMarkActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/latios/luster_purge.png')}
    <div style="flex:1;">
      ${moveBadge('Luster Purge — Mark', 7)}
      Target marked → <strong style="color:#fff;">+20% damage</strong> from Latios & allied Latias<br>
      <button class="luster-purge-mark-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Marked' : 'Mark inactive'}</button>
    </div>
  `);
  line.querySelector('.luster-purge-mark-toggle').onclick = () => {
    state.attackerLatiosLusterPurgeMarkActive = !state.attackerLatiosLusterPurgeMarkActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── LUCARIO ────────────────────────────────────────────────────────────────
// Extreme Speed+ (level 11 upgrade) : +7.5% Attack for 2s when the move is used.
// Single stack max — does not stack with itself (re-using the move just refreshes it).
function applyLucarioExtremeSpeed(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 11) return; // Upgrade unlocked at level 11

  const isActive = state.attackerLucarioExtremeSpeedActive ?? false;
  const bonusPct = 7.5;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/lucario/extreme_speed.png')}
    <div style="flex:1;">
      ${moveBadge('Extreme Speed+', 11)}
      Move used → <strong style="color:#fff;">+${bonusPct}% Attack</strong> for 2s<br>
      <span style="font-size:0.8rem;color:${C}99;">Single stack only (does not stack with itself)</span><br>
      <button class="lucario-espeed-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.lucario-espeed-toggle').onclick = () => {
    state.attackerLucarioExtremeSpeedActive = !state.attackerLucarioExtremeSpeedActive;
    updateDamages();
  };
  card.appendChild(line);
}

// Stat buff applied in statsManager.js (single stack, +7.5% ATK).
export function applyLucarioExtremeSpeedStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'lucario') return;
  if (level < 11) return;
  if (!state.attackerLucarioExtremeSpeedActive) return;
  atkStats.atk += Math.floor(atkStats.atk * (7.5 / 100));
}

// Aura Cannon (Unite, level 9) : if Power-Up Punch is learned, strengthens the
// damage of the next Power-Up Punch attack by ~20% (also extends its shove
// duration to 1s, which has no impact on damage calc).
function applyLucarioAuraCannonPUP(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 9) return; // Aura Cannon unlocks at level 9

  const isActive = state.attackerLucarioAuraCannonPUPActive ?? false;
  const bonusPct = 20;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/lucario/aura_cannon.png')}
    <div style="flex:1;">
      ${moveBadge('Aura Cannon (Unite)', 9)}
      Unite Move used (if Power-Up Punch learned) → next Power-Up Punch hit deals <strong style="color:#fff;">+${bonusPct}% damage</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Applies to the next Power-Up Punch attack only</span><br>
      <button class="lucario-aura-cannon-pup-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.lucario-aura-cannon-pup-toggle').onclick = () => {
    state.attackerLucarioAuraCannonPUPActive = !state.attackerLucarioAuraCannonPUPActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── MACHAMP ────────────────────────────────────────────────────────────────
// Close Combat+ (level 13) : +25% damage if the target has a status condition.
function applyMachampCloseCombatStatus(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.attackerMachampCloseCombatStatusActive ?? false;
  const bonusPct = 25;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/machamp/close_combat.png')}
    <div style="flex:1;">
      ${moveBadge('Close Combat+', 13)}
      Target affected by a status condition → <strong style="color:#fff;">+${bonusPct}% damage</strong><br>
      <button class="machamp-cc-status-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.machamp-cc-status-toggle').onclick = () => {
    state.attackerMachampCloseCombatStatusActive = !state.attackerMachampCloseCombatStatusActive;
    updateDamages();
  };
  card.appendChild(line);
}

// Cross Chop+ (level 13) : auto attacks permanently grant +3 Atk per target hit, up to 40 stacks.
function applyMachampCrossChopStacks(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 13) return; // Upgrade at level 13

  const stacks    = state.attackerMachampCrossChopStacks ?? 0;
  const maxStacks = 40;
  const perStack  = 3;
  const total     = stacks * perStack;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/machamp/cross_chop.png')}
    <div style="flex:1;">
      ${moveBadge('Cross Chop+', 13)}
      Auto attacks hit a target: <button class="stack-btn minus machamp-cc-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus machamp-cc-plus">+</button><br>
      → <strong style="color:${total > 0 ? '#88ff88' : '#888'};">+${total} Attack</strong> (permanent)
      ${stacks >= maxStacks ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}
    </div>
  `);
  line.querySelector('.machamp-cc-minus').onclick = () => { if ((state.attackerMachampCrossChopStacks ?? 0) > 0)        { state.attackerMachampCrossChopStacks = (state.attackerMachampCrossChopStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.machamp-cc-plus').onclick  = () => { if ((state.attackerMachampCrossChopStacks ?? 0) < maxStacks) { state.attackerMachampCrossChopStacks = (state.attackerMachampCrossChopStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

// Bulk Up (level 1) : self-buff, +15% Attack for 3s (peak value — the buff diminishes over the duration).
function applyMachampBulkUp(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 1 || level >= 5) return;

  const isActive = state.attackerMachampBulkUpActive ?? false;
  const bonusPct = 15;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/machamp/bulk_up.png')}
    <div style="flex:1;">
      ${moveBadge('Bulk Up', 1)}
      Move used → <strong style="color:#fff;">+${bonusPct}% Attack</strong> for 3s<br>
      <button class="machamp-bulkup-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.machamp-bulkup-toggle').onclick = () => {
    state.attackerMachampBulkUpActive = !state.attackerMachampBulkUpActive;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyMachampBulkUpStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'machamp') return;
  if (!state.attackerMachampBulkUpActive) return;
  atkStats.atk += Math.floor(atkStats.atk * 0.15);
}

// Dynamic Punch (level 5 : +15% Atk for 5s / level 11 upgrade : +20% Atk for 5s).
function applyMachampDynamicPunch(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 5) return; // Learned at level 5

  const upgraded = level >= 11;
  const bonusPct = upgraded ? 20 : 15;
  const isActive = state.attackerMachampDynamicPunchActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/machamp/dynamic_punch.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Dynamic Punch+' : 'Dynamic Punch', upgraded ? 11 : 5)}
      Move used → <strong style="color:#fff;">+${bonusPct}% Attack</strong> for 5s<br>
      <button class="machamp-dynpunch-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.machamp-dynpunch-toggle').onclick = () => {
    state.attackerMachampDynamicPunchActive = !state.attackerMachampDynamicPunchActive;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyMachampDynamicPunchStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'machamp') return;
  if (level < 5) return;
  if (!state.attackerMachampDynamicPunchActive) return;
  const bonusPct = level >= 11 ? 0.20 : 0.15;
  atkStats.atk += Math.floor(atkStats.atk * bonusPct);
}

// Barrage Blow (Unite, level 9) : +25% Attack (and +300 Def/Sp.Def, see moveEffectsDef.js) for 8s while channeling.
function applyMachampBarrageBlowAtk(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 9) return; // Unite unlocks at level 9

  const isActive = state.attackerMachampBarrageBlowActive ?? false;
  const bonusPct = 25;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/machamp/barrage_blow.png')}
    <div style="flex:1;">
      ${moveBadge('Barrage Blow (Unite)', 9)}
      Channeling (8s) → <strong style="color:#fff;">+${bonusPct}% Attack</strong><br>
      <button class="machamp-barrage-atk-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.machamp-barrage-atk-toggle').onclick = () => {
    state.attackerMachampBarrageBlowActive = !state.attackerMachampBarrageBlowActive;
    updateDamages();
  };
  card.appendChild(line);
}

export function applyMachampBarrageBlowStatBuff(pokemon, atkStats, level) {
  if (pokemon?.pokemonId !== 'machamp') return;
  if (level < 9) return;
  if (!state.attackerMachampBarrageBlowActive) return;
  atkStats.atk += Math.floor(atkStats.atk * 0.25);
}

// ── MEOWSCARADA — Leafage (4 leaves, 2nd-4th deal -20% dmg, 50% slow 2.5s) ─────
function applyMeowscaradaLeafage(atkStats, defStats, card) {
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/meowscarada/leafage.png')}
    <div style="flex:1;">
      ${moveBadge('Leafage', 1)}
      4 leaves fired → each hit slows by <strong style="color:#fff;">-50% Movement Speed</strong> for 2.5s<br>
      Once a leaf connects, every following leaf deals <strong style="color:#fff;">-20% damage</strong> (not cumulative)<br>
      <span style="font-size:0.8rem;color:${C}99;">Data entry: use tick_scaling [1, 0.8, 0.8, 0.8] on the 4 leaf hits</span>
    </div>
  `);
  card.appendChild(line);
}

// ── MEOWSCARADA — Flower Trick (flower bomb, execute + increased explosion) ───
function applyMeowscaradaFlowerTrick(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 6) return;
  const upgraded = level >= 11;

  const isActive = state.attackerMeowscaradaFlowerTrickIncreased ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/meowscarada/flower_trick.png')}
    <div style="flex:1;">
      ${moveBadge('Flower Trick', 6)}
      Attaches a flower bomb (5s) → detonate at will for area damage<br>
      Explosion also deals <strong style="color:#fff;">+18% target's missing HP</strong> <span style="font-size:0.8rem;color:${C}99;">(capped at 1000 vs Wild Pokémon — handled automatically via missing_hp_percent / wild_cap)</span><br>
      If the bombed target is damaged by Meowscarada before it pops → <strong style="color:#fff;">bigger AoE & ×1.6 explosion damage</strong><br>
      ${upgraded ? `<span style="font-size:0.8rem;color:${C}99;">Level 11: bigger bomb range/AoE, +30% Move Speed for 3s (diminishing -10%/s) when planting — not modeled here</span><br>` : ''}
      <button class="meowscarada-flower-trick-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Increased Explosion' : 'Activate Increased Explosion'}</button>
    </div>
  `);
  line.querySelector('.meowscarada-flower-trick-toggle').onclick = () => {
    state.attackerMeowscaradaFlowerTrickIncreased = !state.attackerMeowscaradaFlowerTrickIncreased;
    updateDamages();
  };
  card.appendChild(line);
}

// ── MEOWSCARADA — Night Slash (mark → +crit rate, cooldown/heal on marked) ────
function applyMeowscaradaNightSlash(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 6) return;
  const upgraded = level >= 11;
  const critBonus = upgraded ? 65 : 50;

  const isActive = state.attackerMeowscaradaNightSlashMarkActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/meowscarada/night_slash.png')}
    <div style="flex:1;">
      ${moveBadge('Night Slash', 6)}
      3 slashing waves (2nd/3rd deal 70% of the 1st) → apply a 5s Mark on hit enemies<br>
      Basic attacks vs Marked targets: <strong style="color:#fff;">+${critBonus}% Critical-Hit Rate</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Also reduces this move's cooldown by 0.5s and heals (100%/50%/20% cycle) on basic-attack hits vs Marked targets — not modeled here</span><br>
      <button class="meowscarada-night-slash-mark-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Target Marked' : 'Mark Target'}</button>
    </div>
  `);
  line.querySelector('.meowscarada-night-slash-mark-toggle').onclick = () => {
    state.attackerMeowscaradaNightSlashMarkActive = !state.attackerMeowscaradaNightSlashMarkActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── MEOWSCARADA — Trailblaze (leap, paralyze, attack/move speed, lvl13 shield) ─
function applyMeowscaradaTrailblaze(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 7) return;
  const upgraded = level >= 13;
  const shieldPct = (20 + 0.5 * (level - 1)).toFixed(1);

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/meowscarada/trailblaze.png')}
    <div style="flex:1;">
      ${moveBadge('Trailblaze', 7)}
      Leap on hit → target Paralyzed, <strong style="color:#fff;">-40% Attack Speed</strong> & <strong style="color:#fff;">-40% Movement Speed</strong> for 2s<br>
      On hit → Meowscarada gains <strong style="color:#fff;">+100% Attack Speed</strong> (4s) and <strong style="color:#fff;">+60% Movement Speed</strong> (4s, diminishing -5%/0.5s, min 35%)<br>
      Used from tall grass → increased leap range. KO/Assist → cooldown reset<br>
      ${upgraded ? `<span style="font-size:0.8rem;color:${C}99;">Level 13: grants a shield worth ${shieldPct}% Max HP for 3s — not modeled here</span>` : ''}
    </div>
  `);
  card.appendChild(line);
}

// ── MEWTWO Y — Future Sight (lock-on mark + additional explosion) ─────────────
// "The locked-on enemy ... takes 10% increased damage from Mewtwo" (3s).
// Level 11: increased to 15%. After 3s, an additional explosion deals damage
// equal to 50% of any damage the target received while locked-on (cap 1500).
function applyMewtwoYFutureSight(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 5) return; // Future Sight learned at level 5
  const upgraded = level >= 11;
  const bonusPct = upgraded ? 15 : 10;

  const isActive     = state.attackerMewtwoYFutureSightMarkActive ?? false;
  const damageTaken  = state.attackerMewtwoYFutureSightDamageTaken ?? 0;
  const isVsPlayer   = state.attackerMewtwoYFutureSightVsPlayer ?? true;
  let additionalExplosion = Math.floor(damageTaken * 0.5);
  if (isVsPlayer) additionalExplosion = Math.min(additionalExplosion, 1500);

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/mega_mewtwo_y/future_sight.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Future Sight+' : 'Future Sight', upgraded ? 11 : 5)}
      Target locked-on (3s) → <strong style="color:#fff;">+${bonusPct}% damage</strong> from Mewtwo<br>
      <span style="font-size:0.8rem;color:${C}99;">Also −35% Movement Speed on the target for 3s — not modeled here</span><br>
      <button class="mewtwo-y-futuresight-mark-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Target Locked-On' : 'Lock On Target'}</button>
      <div style="margin-top:10px;font-size:0.8rem;color:${C}99;">Additional Explosion — 50% of damage dealt while locked-on${isVsPlayer ? ' (capped at 1500 vs players)' : ''}:</div>
      <div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="font-size:0.85rem;color:${C};">Damage taken while locked-on:</span>
        <input type="number" class="mewtwo-y-futuresight-dmg-input" value="${damageTaken}" min="0" step="10" style="
          width:90px;background:#0d2428;color:${C};border:1px solid ${C};border-radius:4px;padding:4px 6px;
          text-align:center;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:0.9rem;">
        <button class="mewtwo-y-futuresight-vsplayer-toggle" style="
          padding:4px 12px;background:${isVsPlayer ? C : '#0d2428'};color:${isVsPlayer ? '#000' : C};
          border:1px solid ${C};border-radius:6px;cursor:pointer;font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.8rem;
        ">${isVsPlayer ? 'vs Player (cap 1500)' : 'vs Wild (no cap)'}</button>
      </div>
      <div style="margin-top:6px;font-size:0.9rem;color:#fff;">→ Additional Explosion: <strong style="color:${C};">${additionalExplosion}</strong> damage</div>
    </div>
  `);
  line.querySelector('.mewtwo-y-futuresight-mark-toggle').onclick = () => {
    state.attackerMewtwoYFutureSightMarkActive = !state.attackerMewtwoYFutureSightMarkActive;
    updateDamages();
  };
  line.querySelector('.mewtwo-y-futuresight-dmg-input').onchange = (e) => {
    state.attackerMewtwoYFutureSightDamageTaken = Math.max(0, parseInt(e.target.value, 10) || 0);
    updateDamages();
  };
  line.querySelector('.mewtwo-y-futuresight-vsplayer-toggle').onclick = () => {
    state.attackerMewtwoYFutureSightVsPlayer = !isVsPlayer;
    updateDamages();
  };
  card.appendChild(line);
}

// ── MEWTWO Y — Teleport (post-dash damage buff) ────────────────────────────────
// "For 2s after the first cast of Teleport, movement speed is increased by 15%,
// Mewtwo deals 20% more damage, and the Mega gauge increases 50% faster."
// Level 13: damage bonus → 30%.
function applyMewtwoYTeleportDash(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 7) return; // Teleport learned at level 7
  const upgraded = level >= 13;
  const bonusPct = upgraded ? 30 : 20;

  const isActive = state.attackerMewtwoYTeleportActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/mega_mewtwo_y/teleport.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Teleport+' : 'Teleport', upgraded ? 13 : 7)}
      After teleporting (2s) → <strong style="color:#fff;">+${bonusPct}% damage dealt</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Also +15% Movement Speed and faster Mega gauge gain — not modeled here</span><br>
      <button class="mewtwo-y-teleport-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.mewtwo-y-teleport-toggle').onclick = () => {
    state.attackerMewtwoYTeleportActive = !state.attackerMewtwoYTeleportActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── MEWTWO Y — Psystrike (distance-based damage bonus) ─────────────────────────
// "Psystrike damage is increased based on distance from the target enemy;
// dealing up to 40% increased damage when Mewtwo is attacking from slightly
// beyond its basic attack range."
function applyMewtwoYPsystrikeDistance(atkStats, defStats, card) {
  const level = state.attackerLevel;
  if (level < 5) return; // Psystrike learned at level 5

  const isActive = state.attackerMewtwoYPsystrikeDistanceActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/mega_mewtwo_y/psystrike.png')}
    <div style="flex:1;">
      ${moveBadge('Psystrike', 5)}
      Attacking from near max range → <strong style="color:#fff;">up to +40% damage</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Scales with distance from the target; capped at max basic-attack range +</span><br>
      <button class="mewtwo-y-psystrike-distance-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Max Range (+40%)' : 'Max Range Cast'}</button>
    </div>
  `);
  line.querySelector('.mewtwo-y-psystrike-distance-toggle').onclick = () => {
    state.attackerMewtwoYPsystrikeDistanceActive = !state.attackerMewtwoYPsystrikeDistanceActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
export function applyAttackerMoveEffects(pokemonId, atkStats, defStats, card) {
  const handlers = {
    greninja:   [applyGreninjaSmokescreenAttacker],
    dragonite:  [applyDragoniteDragonDance],
    aegislash:  [applyAegislashSacredSword, applyAegislashIronHead],
    azumarill:  [applyAzumarillBellyBash],
    blaziken:   [applyBlazikenSpinningFlameKick],
    buzzwole:   [applyBuzzwoleLunge],
    ceruledge:  [applyCeruledgeLavaPlume],
    chandelure: [applyChandelureFlamethrowerPlus],
    charizard:  [applyCharizardSeismicSlam],
    "mega-charizard-x": [applyCharizardSeismicSlam],
    "mega-charizard-y": [applyCharizardSeismicSlam],
    cinderace:  [applyCinderaceFeint],
    crustle:    [applyCrustleShellSmash, applyCrustleFuryCutter],
    darkrai:    [applyDarkraiCalmMind],
    decidueye:  [applyDecidueyeLeafage, applyDecidueyeRazorLeaf],
    delphox:    [applyDelphoxFireSpinPlus],
    dodrio:     [applyDodrioTripleTrample],
    dragapult:  [applyDragapultDragonDanceHeal, applyDragapultPhantomForce],
    duraludon:  [applyDuraludonRevolvingRuin],
    falinks:    [applyFalinksBulkUp, applyFalinksNoRetreat],
    palkia:     [applyPalkiaAuraSphereMark],
    feraligatr: [applyFeraligatrDestructiveFangs],
    garchomp:   [applyGarchompAutoAttack],
    glaceon:    [applyGlaceonFreezeDry],
    hooh:       [applyHoohSacredFireFlight],
    hoopa:      [applyHoopaRingsUnbound],
    inteleon:   [applyInteleonLiquidation, applyInteleonAzureSpyVision],
    latias:     [applyLatiasEonPower, applyLusterPurgeMark],
    latios:     [applyLatiosEonPower, applyLusterPurgeMark],
    lucario:    [applyLucarioExtremeSpeed, applyLucarioAuraCannonPUP],
    machamp:    [applyMachampCloseCombatStatus, applyMachampCrossChopStacks, applyMachampBulkUp, applyMachampDynamicPunch, applyMachampBarrageBlowAtk],
    meowscarada: [applyMeowscaradaLeafage, applyMeowscaradaFlowerTrick, applyMeowscaradaNightSlash, applyMeowscaradaTrailblaze],
    mewtwo_y:   [applyMewtwoYFutureSight, applyMewtwoYTeleportDash, applyMewtwoYPsystrikeDistance],
  };
  (handlers[pokemonId] ?? []).forEach(fn => fn(atkStats, defStats, card));
}