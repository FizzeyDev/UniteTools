import { state } from './state.js';
import { updateDamages } from './damageDisplay.js';
import { MOVE_DEF, moveBadge } from './effectColors.js';

const { color: C, bg: BG, border: BORDER } = MOVE_DEF;

function wrap(content) {
  return `<div style="margin:12px 0;padding:10px;background:${BG};border-radius:8px;${BORDER};display:flex;align-items:center;gap:12px;">${content}</div>`;
}
function icon(src) {
  return `<img src="${src}" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">`;
}

// ── ARMAROUGE ─────────────────────────────────────────────────────────────────
function applyArmarougeFlameCharge(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.defenderArmarougeFlameChargeDmgReduc ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/armarouge/flame_charge.png')}
    <div style="flex:1;">
      ${moveBadge('Flame Charge+', 13)}
      Flame Charge hits → <strong style="color:#fff;">−20% damage received</strong><br>
      <button class="flame-charge-reduc-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.flame-charge-reduc-toggle').onclick = () => {
    state.defenderArmarougeFlameChargeDmgReduc = !state.defenderArmarougeFlameChargeDmgReduc;
    updateDamages();
  };
  card.appendChild(line);
}

// ── ARMAROUGE — Armor Cannon ──────────────────────────────────────────────────
function applyArmarougeArmorCannon(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Armor Cannon learned at level 5

  const isActive = state.defenderArmarougeArmorCannonDebuff ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/armarouge/armor_cannon.png')}
    <div style="flex:1;">
      ${moveBadge('Armor Cannon', 5)}
      On cooldown → <strong style="color:#fff;">−5% Def & Sp. Def</strong><br>
      <button class="armor-cannon-debuff-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.armor-cannon-debuff-toggle').onclick = () => {
    state.defenderArmarougeArmorCannonDebuff = !state.defenderArmarougeArmorCannonDebuff;
    updateDamages();
  };
  card.appendChild(line);
}

// ── BLASTOISE — Rapid Spin ────────────────────────────────────────────────────
function applyBlastoiseRapidSpin(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.defenderBlastoiseRapidSpinDefBuff ?? false;
  const defBonus = 17 * (level - 1) + 500;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/blastoise/rapid_spin.png')}
    <div style="flex:1;">
      ${moveBadge('Rapid Spin+', 13)}
      While spinning → <strong style="color:#fff;">+${defBonus} Def & Sp. Def</strong><br>
      <button class="rapid-spin-def-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.rapid-spin-def-toggle').onclick = () => {
    state.defenderBlastoiseRapidSpinDefBuff = !state.defenderBlastoiseRapidSpinDefBuff;
    updateDamages();
  };
  card.appendChild(line);
}

// ── BLAZIKEN — Overheat ───────────────────────────────────────────────────────
function applyBlazikenOverheat(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 7) return; // Overheat learned at level 7

  const isActive = state.defenderBlazikenOverheatDmgReduc ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/blaziken/overheat.png')}
    <div style="flex:1;">
      ${moveBadge('Overheat', 7)}
      Charging in place → <strong style="color:#fff;">−25% damage received</strong> & Hindrance Resistant<br>
      <span style="font-size:0.8rem;color:${C}99;">Active only while charging</span><br>
      <button class="overheat-dmgreduc-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.overheat-dmgreduc-toggle').onclick = () => {
    state.defenderBlazikenOverheatDmgReduc = !state.defenderBlazikenOverheatDmgReduc;
    updateDamages();
  };
  card.appendChild(line);
}

// ── CERULEDGE — Revenant Rend (Unite) ─────────────────────────────────────────
function applyCeruledgeRevenantRend(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 9) return; // Unite unlocks at level 9

  const isActive = state.defenderCeruledgeRevenantRendBuff ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/ceruledge/revenant_rend.png')}
    <div style="flex:1;">
      ${moveBadge('Revenant Rend (Unite)', 9)}
      Charging the blades → <strong style="color:#fff;">−70% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Active only during the 0.5s charge before the slash</span><br>
      <button class="revenant-rend-dmgreduc-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.revenant-rend-dmgreduc-toggle').onclick = () => {
    state.defenderCeruledgeRevenantRendBuff = !state.defenderCeruledgeRevenantRendBuff;
    updateDamages();
  };
  card.appendChild(line);
}

// ── CLEFABLE — Follow Me ──────────────────────────────────────────────────────
function applyClefableFollowMe(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 12) return; // Upgrade at level 12

  const isActive = state.defenderClefableFollowMeBuff ?? false;
  const defBonus   = 150;
  const spDefBonus = 100;
  if (isActive) {
    defStats.def    += defBonus;
    defStats.sp_def += spDefBonus;
  }
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/clefable/follow_me.png')}
    <div style="flex:1;">
      ${moveBadge('Follow Me+', 12)}
      Move used → <strong style="color:#fff;">+${defBonus} Def & +${spDefBonus} Sp. Def</strong> for 3s<br>
      <button class="follow-me-statbuff-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.follow-me-statbuff-toggle').onclick = () => {
    state.defenderClefableFollowMeBuff = !state.defenderClefableFollowMeBuff;
    updateDamages();
  };
  card.appendChild(line);
}

// ── CLEFABLE — Block (Unite) ──────────────────────────────────────────────────
function applyClefableBlock(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 8) return; // Unite unlocks at level 8

  const isActive = state.defenderClefableBlockDmgReduc ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/clefable/block.png')}
    <div style="flex:1;">
      ${moveBadge('Block (Unite)', 8)}
      Holding the wall → <strong style="color:#fff;">−25% damage received</strong> & unstoppable<br>
      <span style="font-size:0.8rem;color:${C}99;">Active for 4s while the wall is held</span><br>
      <button class="block-dmgreduc-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.block-dmgreduc-toggle').onclick = () => {
    state.defenderClefableBlockDmgReduc = !state.defenderClefableBlockDmgReduc;
    updateDamages();
  };
  card.appendChild(line);
}

// ── CRUSTLE — Shell Smash ─────────────────────────────────────────────────────
function applyCrustleShellSmash(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 4) return; // Shell Smash learned at level 4

  const isActive = state.defenderShellSmashActive ?? false;
  // Les bonus Def/SpDef (item, Sturdy…) déjà appliqués sont aussi annulés,
  // puisque le move réduit la Defense/Sp.Def de base à 0 pendant le buff.
  if (isActive) {
    defStats.def    = 0;
    defStats.sp_def = 0;
  }
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/crustle/shell_smash.png')}
    <div style="flex:1;">
      ${moveBadge('Shell Smash', 4)}
      Smashing the shell → <strong style="color:#fff;">Def & Sp. Def → 0</strong> for 4.5s<br>
      <span style="font-size:0.8rem;color:${C}99;">All modifiers work with 0 base Def/Sp.Def during the buff</span><br>
      <button class="defender-shell-smash-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.defender-shell-smash-toggle').onclick = () => {
    state.defenderShellSmashActive = !state.defenderShellSmashActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── DELPHOX — Fanciful Fireworks (Unite) ─────────────────────────────────────
function applyDelphoxFancifulFireworks(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 9) return; // Unite unlocks at level 9

  const isActive = state.defenderDelphoxFancifulFireworksAntiHeal ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/delphox/fanciful_fireworks.png')}
    <div style="flex:1;">
      ${moveBadge('Fanciful Fireworks (Unite)', 9)}
      Inside zone → <strong style="color:#fff;">−50% HP recovery</strong> on attacker (1.75s linger after exit)<br>
      <button class="delphox-fireworks-antiheal-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.delphox-fireworks-antiheal-toggle').onclick = () => {
    state.defenderDelphoxFancifulFireworksAntiHeal = !state.defenderDelphoxFancifulFireworksAntiHeal;
    updateDamages();
  };
  card.appendChild(line);
}

// ── DODRIO — Drill Peck (Dash) ─────────────────────────────────────────────────
function applyDodrioDrillPeckDash(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Drill Peck learned at level 5

  const isActive = state.defenderDodrioDrillPeckDash ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/dodrio/drill_peck.png')}
    <div style="flex:1;">
      ${moveBadge('Drill Peck (Dash)', 5)}
      Full-gauge dash → <strong style="color:#fff;">−20% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Active only during the dash</span><br>
      <button class="dodrio-drill-peck-dash-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.dodrio-drill-peck-dash-toggle').onclick = () => {
    state.defenderDodrioDrillPeckDash = !state.defenderDodrioDrillPeckDash;
    updateDamages();
  };
  card.appendChild(line);
}

// ── DRAGONITE — Hyper Beam (charging) ──────────────────────────────────────────
function applyDragoniteHyperBeamCharge(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.defenderDragoniteHyperBeamCharging ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/dragonite/hyper_beam.png')}
    <div style="flex:1;">
      ${moveBadge('Hyper Beam+', 13)}
      Charging the beam → <strong style="color:#fff;">−50% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Active only while channeling Hyper Beam</span><br>
      <button class="dragonite-hyper-beam-charge-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.dragonite-hyper-beam-charge-toggle').onclick = () => {
    state.defenderDragoniteHyperBeamCharging = !state.defenderDragoniteHyperBeamCharging;
    updateDamages();
  };
  card.appendChild(line);
}

// ── DURALUDON — Laser Focus ────────────────────────────────────────────────────
function applyDuraludonLaserFocus(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 1) return; // Laser Focus learned at level 1

  const isActive = state.defenderDuraludonLaserFocusActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/duraludon/laser_focus.png')}
    <div style="flex:1;">
      ${moveBadge('Laser Focus', 1)}
      On activation → <strong style="color:#fff;">−20% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Active only for the first 0.6s</span><br>
      <button class="duraludon-laser-focus-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.duraludon-laser-focus-toggle').onclick = () => {
    state.defenderDuraludonLaserFocusActive = !state.defenderDuraludonLaserFocusActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
export function applyDefenderMoveEffects(pokemonId, atkStats, defStats, card) {
  const handlers = {
    armarouge: [applyArmarougeFlameCharge, applyArmarougeArmorCannon],
    blastoise: [applyBlastoiseRapidSpin],
    blaziken:  [applyBlazikenOverheat],
    ceruledge: [applyCeruledgeRevenantRend],
    clefable:  [applyClefableFollowMe, applyClefableBlock],
    crustle:   [applyCrustleShellSmash],
    delphox:   [applyDelphoxFancifulFireworks],
    dodrio:    [applyDodrioDrillPeckDash],
    dragonite: [applyDragoniteHyperBeamCharge],
    duraludon: [applyDuraludonLaserFocus],
  };
  (handlers[pokemonId] ?? []).forEach(fn => fn(atkStats, defStats, card));
}