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

// ── PALKIA — Dragon Claw+ (Def/SpDef stacks on hit, self-buff) ───────────────
function applyPalkiaDragonClawDefStacks(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 13) return; // Enhanced effect unlocks at level 13

  const stacks    = state.defenderPalkiaDragonClawStacks ?? 0;
  const maxStacks = 3;
  const bonusPct  = stacks * 10;

  if (stacks > 0) {
    defStats.def    = Math.floor(defStats.def    * (1 + bonusPct / 100));
    defStats.sp_def = Math.floor(defStats.sp_def * (1 + bonusPct / 100));
  }

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/palkia/dragon_claw.png')}
    <div style="flex:1;">
      ${moveBadge('Dragon Claw+', 13)}
      First Hit connects: <button class="stack-btn minus pk-dc-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus pk-dc-plus">+</button><br>
      → <strong style="color:${bonusPct > 0 ? '#88ff88' : '#888'};">+${bonusPct}% Def & Sp. Def</strong> for 5s
      ${stacks >= maxStacks ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}<br>
      <span style="font-size:0.8rem;color:${C}99;">+10% per target hit with the First Hit, up to 3 stacks</span>
    </div>
  `);
  line.querySelector('.pk-dc-minus').onclick = () => { if ((state.defenderPalkiaDragonClawStacks ?? 0) > 0)        { state.defenderPalkiaDragonClawStacks = (state.defenderPalkiaDragonClawStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.pk-dc-plus').onclick  = () => { if ((state.defenderPalkiaDragonClawStacks ?? 0) < maxStacks) { state.defenderPalkiaDragonClawStacks = (state.defenderPalkiaDragonClawStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

// ── ELDEGOSS — Cotton Spore+ (Def/SpDef +50%) ─────────────────────────────────
function applyEldegossCottonSporePlus(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 12) return; // Upgrade at level 12

  const isActive = state.defenderEldegossCottonSporePlusBuff ?? false;
  const bonusPct = 50;

  if (isActive) {
    defStats.def    = Math.floor(defStats.def    * (1 + bonusPct / 100));
    defStats.sp_def = Math.floor(defStats.sp_def * (1 + bonusPct / 100));
  }

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/eldegoss/cotton_spore.png')}
    <div style="flex:1;">
      ${moveBadge('Cotton Spore+', 12)}
      Spores burst → <strong style="color:#fff;">+${bonusPct}% Def & Sp. Def</strong> for 2s<br>
      <button class="cotton-spore-statbuff-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.cotton-spore-statbuff-toggle').onclick = () => {
    state.defenderEldegossCottonSporePlusBuff = !state.defenderEldegossCottonSporePlusBuff;
    updateDamages();
  };
  card.appendChild(line);
}

// ── FALINKS — Bulk Up (Def/Sp. Def, côté défenseur) ───────────────────────────
function applyFalinksBulkUp(atkStats, defStats, card) {
  const isActive = state.defenderFalinksBulkUpActive ?? false;
  const bonusPct = 25;

  if (isActive) {
    defStats.def    = Math.floor(defStats.def    * (1 + bonusPct / 100));
    defStats.sp_def = Math.floor(defStats.sp_def * (1 + bonusPct / 100));
  }

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/falinks/bulk_up.png')}
    <div style="flex:1;">
      ${moveBadge('Bulk Up', 1)}
      Active → <strong style="color:#fff;">+${bonusPct}% Def & Sp. Def</strong> for 3s<br>
      <span style="font-size:0.8rem;color:${C}99;">Also grants +30% ATK & +25% Attack Speed (see attacker panel for the ATK buff)</span><br>
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
    state.defenderFalinksBulkUpActive = !state.defenderFalinksBulkUpActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── FALINKS — No Retreat (formation) ──────────────────────────────────────────
function applyFalinksNoRetreat(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 6) return; // No Retreat appris au niveau 6

  const upgraded = level >= 12; // -30% → -35% au niveau 12
  const reducPct = upgraded ? 35 : 30;
  const isActive = state.defenderFalinksNoRetreatActive ?? false;
  const isFront  = state.defenderFalinksNoRetreatFront   ?? false;

  // La réduction ne s'applique que si la formation est active ET que le coup vient de face.
  // Elle se combine multiplicativement avec la réduction Battle Armor déjà appliquée
  // dans passiveEffectsDef.js (ex: Brass 10% + No Retreat 30% ≈ 37% ; Trooper attaché 90% + 35% ≈ 93.6%).
  if (isActive && isFront) {
    const factor = 1 - reducPct / 100;
    defStats.def    = Math.floor(defStats.def    / factor);
    defStats.sp_def = Math.floor(defStats.sp_def / factor);
  }

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/falinks/no_retreat.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'No Retreat+' : 'No Retreat', upgraded ? 12 : 6)}
      Formation active → <strong style="color:#fff;">−${reducPct}% damage taken from the front</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Also grants +${upgraded ? 40 : 25}% ATK (attacker side) & −10% backward move speed; facing direction locked while active</span><br>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="falinks-noretreat-formation-toggle" style="
          padding:6px 16px;
          background:${isActive ? C : '#0d2428'};
          color:${isActive ? '#000' : C};
          border:1px solid ${C};border-radius:6px;cursor:pointer;
          font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
        ">${isActive ? '✓ In formation' : 'Switch to No Retreat'}</button>
        ${isActive ? `
        <button class="falinks-noretreat-front-toggle" style="
          padding:6px 16px;
          background:${isFront ? C : '#0d2428'};
          color:${isFront ? '#000' : C};
          border:1px solid ${C};border-radius:6px;cursor:pointer;
          font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
        ">${isFront ? '✓ Hit from front' : 'Hit from front?'}</button>` : ''}
      </div>
    </div>
  `);
  line.querySelector('.falinks-noretreat-formation-toggle').onclick = () => {
    state.defenderFalinksNoRetreatActive = !state.defenderFalinksNoRetreatActive;
    if (!state.defenderFalinksNoRetreatActive) state.defenderFalinksNoRetreatFront = false;
    updateDamages();
  };
  const frontBtn = line.querySelector('.falinks-noretreat-front-toggle');
  if (frontBtn) frontBtn.onclick = () => {
    state.defenderFalinksNoRetreatFront = !state.defenderFalinksNoRetreatFront;
    updateDamages();
  };
  card.appendChild(line);
}

// ── GARCHOMP — Dig ─────────────────────────────────────────────────────────────
function applyGarchompDig(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return;

  const isActive  = state.defenderGarchompDigDefBuff ?? false;
  const defBonus  = 25 * (level - 1) + 25;
  const upgraded  = level >= 11;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/garchomp/dig.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Dig+' : 'Dig', upgraded ? 11 : 5)}
      On emerging → <strong style="color:#fff;">+${defBonus} Def & Sp. Def</strong><br>
      <button class="garchomp-dig-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.garchomp-dig-toggle').onclick = () => {
    state.defenderGarchompDigDefBuff = !state.defenderGarchompDigDefBuff;
    updateDamages();
  };
  card.appendChild(line);
}

// ── GARCHOMP — Dragon Rush ──────────────────────────────────────────────────────
function applyGarchompDragonRush(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Dragon Rush learned at level 5

  const isActive = state.defenderGarchompDragonRushDmgReduc ?? false;
  const upgraded = level >= 11;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/garchomp/dragon_rush.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Dragon Rush+' : 'Dragon Rush', upgraded ? 11 : 5)}
      Channeling before the dash → <strong style="color:#fff;">−45% damage received</strong><br>
      <button class="garchomp-dragonrush-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.garchomp-dragonrush-toggle').onclick = () => {
    state.defenderGarchompDragonRushDmgReduc = !state.defenderGarchompDragonRushDmgReduc;
    updateDamages();
  };
  card.appendChild(line);
}

// ── GARCHOMP — Livid Outrage (Unite) ────────────────────────────────────────────
function applyGarchompLividOutrage(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 9) return; // Unite unlocked at level 9

  const isActive = state.defenderGarchompLividOutrageActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/garchomp/livid_outrage.png')}
    <div style="flex:1;">
      ${moveBadge('Livid Outrage (Unite)', 9)}
      While rampaging → <strong style="color:#fff;">−30% damage received</strong><br>
      <button class="garchomp-livid-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.garchomp-livid-toggle').onclick = () => {
    state.defenderGarchompLividOutrageActive = !state.defenderGarchompLividOutrageActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── FALINKS — Dust Devil Formation (Unite) ────────────────────────────────────
function applyFalinksDustDevilFormation(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 9) return; // Unite débloqué au niveau 9

  const isActive = state.defenderFalinksDustDevilActive ?? false;
  const target   = state.defenderFalinksTarget || 'brass';
  const applies  = isActive && target === 'trooper_attached';

  // -30% supplémentaire, uniquement sur les Troopers, se combine avec les -90% de Battle Armor (≈93% total)
  if (applies) {
    defStats.def    = Math.floor(defStats.def    / 0.70);
    defStats.sp_def = Math.floor(defStats.sp_def / 0.70);
  }

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/falinks/dust_devil_formation.png')}
    <div style="flex:1;">
      ${moveBadge('Dust Devil Formation (Unite)', 9)}
      While active → <strong style="color:#fff;">−30% damage on the Troopers</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Stacks with Battle Armor's target-based reduction (Trooper attached → ≈93% total). No effect on the Brass or on detached Troopers.</span><br>
      <button class="falinks-dustdevil-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.falinks-dustdevil-toggle').onclick = () => {
    state.defenderFalinksDustDevilActive = !state.defenderFalinksDustDevilActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── GOODRA — Muddy Water (Def/Sp. Def stacks) ─────────────────────────────────
function applyGoodraMuddyWaterDefStacks(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Muddy Water appris au niveau 5

  const upgraded  = level >= 11;
  const stacks    = state.defenderGoodraMuddyWaterStacks ?? 0;
  const maxStacks = 4;
  const perStack  = upgraded ? (10 * (level - 1) + 108) : (6 * (level - 1) + 72);
  const total     = stacks * perStack;

  if (stacks > 0) {
    defStats.def    += total;
    defStats.sp_def += total;
  }

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/goodra/muddy_water.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Muddy Water+' : 'Muddy Water', upgraded ? 11 : 5)}
      Hits an enemy: <button class="stack-btn minus goodra-mw-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus goodra-mw-plus">+</button><br>
      → <strong style="color:${total > 0 ? '#88ff88' : '#888'};">+${total} Def & Sp. Def</strong> for 2s
      ${stacks >= maxStacks ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}<br>
      <span style="font-size:0.8rem;color:${C}99;">+${perStack} per stack · re-using Muddy Water within 6s increases the stack intensity, up to 4 stacks</span>
    </div>
  `);
  line.querySelector('.goodra-mw-minus').onclick = () => { if ((state.defenderGoodraMuddyWaterStacks ?? 0) > 0)        { state.defenderGoodraMuddyWaterStacks = (state.defenderGoodraMuddyWaterStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.goodra-mw-plus').onclick  = () => { if ((state.defenderGoodraMuddyWaterStacks ?? 0) < maxStacks) { state.defenderGoodraMuddyWaterStacks = (state.defenderGoodraMuddyWaterStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

// ── HO-OH — Safeguard ─────────────────────────────────────────────────────────
function applyHoohSafeguard(atkStats, defStats, card) {
  const isActive = state.defenderHoohSafeguardActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/hooh/safeguard.png')}
    <div style="flex:1;">
      ${moveBadge('Safeguard', 1)}
      Protective field up → <strong style="color:#fff;">−50% next incoming damage</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Also grants +40% movement speed for 3s when it absorbs a hit</span><br>
      <button class="hooh-safeguard-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.hooh-safeguard-toggle').onclick = () => {
    state.defenderHoohSafeguardActive = !state.defenderHoohSafeguardActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── HO-OH — Sky Attack ───────────────────────────────────────────────────────
function applyHoohSkyAttack(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Sky Attack learned at level 5

  const isActive = state.defenderHoohSkyAttackActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/hooh/sky_attack.png')}
    <div style="flex:1;">
      ${moveBadge('Sky Attack', 5)}
      While charging the loop → <strong style="color:#fff;">−30% damage received</strong><br>
      <button class="hooh-skyattack-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.hooh-skyattack-toggle').onclick = () => {
    state.defenderHoohSkyAttackActive = !state.defenderHoohSkyAttackActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── HOOPA — Rings Unbound (Unite) ────────────────────────────────────────────
function applyHoopaRingsUnbound(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 9) return; // Unite unlocks at level 9

  const isActive = state.defenderHoopaUnboundActive ?? false;
  if (isActive) {
    defStats.hp = Math.floor(defStats.hp * 1.40);
  }

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
    state.defenderHoopaUnboundActive = !state.defenderHoopaUnboundActive;
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
    eldegoss:  [applyEldegossCottonSporePlus],
    falinks:   [applyFalinksBulkUp, applyFalinksNoRetreat, applyFalinksDustDevilFormation],
    garchomp:  [applyGarchompDig, applyGarchompDragonRush, applyGarchompLividOutrage],
    goodra:    [applyGoodraMuddyWaterDefStacks],
    hooh:      [applyHoohSafeguard, applyHoohSkyAttack],
    hoopa:     [applyHoopaRingsUnbound],
    palkia:    [applyPalkiaDragonClawDefStacks],
  };
  (handlers[pokemonId] ?? []).forEach(fn => fn(atkStats, defStats, card));
}