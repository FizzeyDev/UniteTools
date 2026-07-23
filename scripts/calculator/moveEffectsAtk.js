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
  };
  (handlers[pokemonId] ?? []).forEach(fn => fn(atkStats, defStats, card));
}