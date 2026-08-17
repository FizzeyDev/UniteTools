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

// ── LEAFEON — Solar Blade (charging damage reduction) ────────────────────────
function applyLeafeonSolarBlade(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 10) return; // Upgrade at level 10

  const isActive = state.defenderLeafeonSolarBladeDmgReduc ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/leafeon/solar_blade.png')}
    <div style="flex:1;">
      ${moveBadge('Solar Blade+', 10)}
      While charging → <strong style="color:#fff;">−50% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Active only while gathering light</span><br>
      <button class="solar-blade-dmgreduc-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.solar-blade-dmgreduc-toggle').onclick = () => {
    state.defenderLeafeonSolarBladeDmgReduc = !state.defenderLeafeonSolarBladeDmgReduc;
    updateDamages();
  };
  card.appendChild(line);
}

// ── LUCARIO / MEGA-LUCARIO — Power-Up Punch (charging) ───────────────────────
// Shared between Lucario and Mega-Lucario: identical text & numbers on both kits.
// "While held down: charges up power for up to 4s, reducing damage received by
// 30% and decreasing movement speed by 15%." (movement speed has no impact on
// damage calc, so only the -30% damage reduction is modeled here.)
function applyLucarioPowerUpPunchCharge(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Power-Up Punch learned at level 5

  const isActive = state.defenderLucarioPowerUpPunchCharging ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/lucario/power_up_punch.png')}
    <div style="flex:1;">
      ${moveBadge('Power-Up Punch', 5)}
      While charging (up to 4s) → <strong style="color:#fff;">−30% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Active only while the punch is charging · also -15% Movement Speed (no dmg impact)</span><br>
      <button class="lucario-pup-charge-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.lucario-pup-charge-toggle').onclick = () => {
    state.defenderLucarioPowerUpPunchCharging = !state.defenderLucarioPowerUpPunchCharging;
    updateDamages();
  };
  card.appendChild(line);
}

// ── MACHAMP — Barrage Blow (Unite) charge ─────────────────────────────────────
// "Machamp gains ... Defense by 300, and Sp. Defense by 300 for 8s before unleashing..."
function applyMachampBarrageBlowDef(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 9) return; // Unite unlocks at level 9

  const isActive = state.defenderMachampBarrageBlowActive ?? false;
  const defBonus = 300;
  if (isActive) {
    defStats.def    += defBonus;
    defStats.sp_def += defBonus;
  }
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/machamp/barrage_blow.png')}
    <div style="flex:1;">
      ${moveBadge('Barrage Blow (Unite)', 9)}
      Channeling (8s) → <strong style="color:#fff;">+${defBonus} Def & Sp. Def</strong><br>
      <button class="machamp-barrage-def-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.machamp-barrage-def-toggle').onclick = () => {
    state.defenderMachampBarrageBlowActive = !state.defenderMachampBarrageBlowActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── METAGROSS — Zen Headbutt (post-hit damage reduction) ─────────────────────
function applyMetagrossZenHeadbutt(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.defenderMetagrossZenHeadbuttActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/metagross/zen_headbutt.png')}
    <div style="flex:1;">
      ${moveBadge('Zen Headbutt+', 13)}
      After dealing damage with Zen Headbutt (2s) → <strong style="color:#fff;">−20% damage received</strong><br>
      <button class="metagross-zenheadbutt-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.metagross-zenheadbutt-toggle').onclick = () => {
    state.defenderMetagrossZenHeadbuttActive = !state.defenderMetagrossZenHeadbuttActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── METAGROSS — Magnet Rise (levitating damage reduction) ────────────────────
function applyMetagrossMagnetRise(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.defenderMetagrossMagnetRiseActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/metagross/magnet_rise.png')}
    <div style="flex:1;">
      ${moveBadge('Magnet Rise+', 13)}
      While levitating (up to 4s) → <strong style="color:#fff;">−30% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Active only while levitating</span><br>
      <button class="metagross-magnetrise-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.metagross-magnetrise-toggle').onclick = () => {
    state.defenderMetagrossMagnetRiseActive = !state.defenderMetagrossMagnetRiseActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── MEW — Light Screen (moving wall, damage mitigation) ──────────────────────
// "While the wall moves with Mew, enemy attacks that pass through it will deal
// 25% reduced damage but will not prevent enemies from passing and does not
// shove them anymore." (Only active once the wall is re-cast to follow Mew.)
function applyMewLightScreenWall(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 3) return; // Light Screen learned at level 3

  const upgraded = level >= 12; // Level 12: bigger wall (no dmg impact)
  const isActive = state.defenderMewLightScreenWallActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/mew/light_screen.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Light Screen+' : 'Light Screen', upgraded ? 12 : 3)}
      Wall following Mew (recast within 4s) → <strong style="color:#fff;">−25% damage received</strong> from attacks passing through<br>
      <span style="font-size:0.8rem;color:${C}99;">Active only while the wall is moving with Mew · no longer blocks or shoves enemies while moving${upgraded ? ' · larger wall at level 12' : ''}</span><br>
      <button class="mew-lightscreen-wall-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.mew-lightscreen-wall-toggle').onclick = () => {
    state.defenderMewLightScreenWallActive = !state.defenderMewLightScreenWallActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── MEWTWO X — Psystrike (channeling damage reduction) ────────────────────────
// "While Mewtwo is directing psychic waves, it takes 15% reduced damage."
function applyMewtwoXPsystrikeChannel(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Psystrike learned at level 5

  const isActive = state.defenderMewtwoXPsystrikeChanneling ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/mega_mewtwo_x/psystrike.png')}
    <div style="flex:1;">
      ${moveBadge('Psystrike', 5)}
      Directing psychic waves → <strong style="color:#fff;">−15% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Active only while channeling the move</span><br>
      <button class="mewtwo-x-psystrike-channel-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.mewtwo-x-psystrike-channel-toggle').onclick = () => {
    state.defenderMewtwoXPsystrikeChanneling = !state.defenderMewtwoXPsystrikeChanneling;
    updateDamages();
  };
  card.appendChild(line);
}

// ── MEWTWO Y — Psystrike (channeling damage reduction) ────────────────────────
// "While Mewtwo is directing psychic waves, it takes 15% reduced damage."
function applyMewtwoYPsystrikeChannel(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Psystrike learned at level 5

  const isActive = state.defenderMewtwoYPsystrikeChanneling ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/mega_mewtwo_y/psystrike.png')}
    <div style="flex:1;">
      ${moveBadge('Psystrike', 5)}
      Directing psychic waves → <strong style="color:#fff;">−15% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Active only while channeling the move</span><br>
      <button class="mewtwo-y-psystrike-channel-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.mewtwo-y-psystrike-channel-toggle').onclick = () => {
    state.defenderMewtwoYPsystrikeChanneling = !state.defenderMewtwoYPsystrikeChanneling;
    updateDamages();
  };
  card.appendChild(line);
}

// ── MIMIKYU — Trick Room ─────────────────────────────────────────────────────
// "While inside the Trick Room, Mimikyu receives 50% reduced damage from
// enemies outside of the Trick Room."
function applyMimikyuTrickRoom(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 7) return; // Trick Room learned at level 7

  const isActive = state.defenderMimikyuTrickRoomActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/mimikyu/trick_room.png')}
    <div style="flex:1;">
      ${moveBadge('Trick Room', 7)}
      Inside the Trick Room, attacker outside of it → <strong style="color:#fff;">−50% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Only applies to damage coming from outside the Trick Room area</span><br>
      <button class="mimikyu-trickroom-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.mimikyu-trickroom-toggle').onclick = () => {
    state.defenderMimikyuTrickRoomActive = !state.defenderMimikyuTrickRoomActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── MOLTRES — Sky Attack (Def / Sp. Def stacks) ─────────────────────────────
// "Each hit increases the user's Def and SpDef by 8% for 4s, stacking up to
// 5 times." Modeled as a 0–5 stack counter (only relevant when Moltres is
// the defender — the actual +8%/stack Def & Sp. Def mutation is applied in
// statsManager.js).
function applyMoltresSkyAttackStacks(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 7) return; // Sky Attack learned at level 7

  const stacks    = state.defenderMoltresSkyAttackStacks ?? 0;
  const maxStacks = 5;
  const bonusPct  = stacks * 8;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/moltres/sky_attack.png')}
    <div style="flex:1;">
      ${moveBadge('Sky Attack', 7)}
      Stacks: <button class="stack-btn minus sa-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus sa-plus">+</button><br>
      → Def & Sp. Def <strong style="color:${bonusPct > 0 ? '#88ff88' : '#888'};">+${bonusPct}%</strong> for 4s
      ${stacks >= maxStacks ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}
    </div>
  `);
  line.querySelector('.sa-minus').onclick = () => { if ((state.defenderMoltresSkyAttackStacks ?? 0) > 0)        { state.defenderMoltresSkyAttackStacks = (state.defenderMoltresSkyAttackStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.sa-plus').onclick  = () => { if ((state.defenderMoltresSkyAttackStacks ?? 0) < maxStacks) { state.defenderMoltresSkyAttackStacks = (state.defenderMoltresSkyAttackStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

// ── SCIZOR — Boosted Auto Attack (Defense stacks) ───────────────────────────
// "Becomes a boosted attack with every third attack, decreasing enemy
// movement speed by 30% for 2s when it hits and increasing Scizor's Defense
// by 40% for 6s. This Defense increase can stack additively up to 3 times
// and the duration refreshes when gaining another stack." Movement speed
// debuff on the enemy isn't modeled here (no damage impact); the Defense
// stacking is applied to defStats in statsManager.js.
function applyScizorAutoAttackDefStacks(atkStats, defStats, card) {
  const stacks    = state.defenderScizorAutoAttackDefStacks ?? 0;
  const maxStacks = 3;
  const bonusPct  = stacks * 40;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/scizor/technician.png')}
    <div style="flex:1;">
      ${moveBadge('Boosted Auto Attack', 1)}
      Stacks: <button class="stack-btn minus scizor-aa-def-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus scizor-aa-def-plus">+</button><br>
      → Def <strong style="color:${bonusPct > 0 ? '#88ff88' : '#888'};">+${bonusPct}%</strong> for 6s
      ${stacks >= maxStacks ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}<br>
      <span style="font-size:0.8rem;color:${C}99;">Also slows the attacker hit by 30% for 2s — not modeled here</span>
    </div>
  `);
  line.querySelector('.scizor-aa-def-minus').onclick = () => { if ((state.defenderScizorAutoAttackDefStacks ?? 0) > 0)        { state.defenderScizorAutoAttackDefStacks = (state.defenderScizorAutoAttackDefStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.scizor-aa-def-plus').onclick  = () => { if ((state.defenderScizorAutoAttackDefStacks ?? 0) < maxStacks) { state.defenderScizorAutoAttackDefStacks = (state.defenderScizorAutoAttackDefStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

// ── SCIZOR — Swords Dance+ (dash damage reduction) ──────────────────────────
function applyScizorSwordsDanceDashReduc(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.defenderScizorSwordsDanceDashActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/scizor/swords_dance.png')}
    <div style="flex:1;">
      ${moveBadge('Swords Dance+', 13)}
      While dashing → <strong style="color:#fff;">−50% damage received</strong><br>
      <button class="scizor-swords-dance-dash-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.scizor-swords-dance-dash-toggle').onclick = () => {
    state.defenderScizorSwordsDanceDashActive = !state.defenderScizorSwordsDanceDashActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── SCYTHER — Swords Dance+ (dash damage reduction) ─────────────────────────
function applyScytherSwordsDanceDashReduc(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.defenderScytherSwordsDanceDashActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/scyther/swords_dance.png')}
    <div style="flex:1;">
      ${moveBadge('Swords Dance+', 13)}
      While dashing → <strong style="color:#fff;">−50% damage received</strong><br>
      <button class="scyther-swords-dance-dash-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.scyther-swords-dance-dash-toggle').onclick = () => {
    state.defenderScytherSwordsDanceDashActive = !state.defenderScytherSwordsDanceDashActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── SIRFETCH'D — Detect (damage reduction after Impervious) ────────────────
// "For 0.6s the user is Impervious, negating damage received, afterwards the
// user instead reduces damage received by 30% for up to 2.4s." Only the
// −30% window is modeled here (the Impervious 0.6s is a full negation, not a
// damage-calc multiplier); the level 13 upgrade only affects cooldown.
function applySirfetchdDetect(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 7) return; // Detect learned at level 7

  const isActive = state.defenderSirfetchdDetectActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/sirfetchd/detect.png')}
    <div style="flex:1;">
      ${moveBadge('Detect', 7)}
      After the Impervious window (2.4s) → <strong style="color:#fff;">−30% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">The first 0.6s (Impervious, full negation) isn't modeled here</span><br>
      <button class="sirfetchd-detect-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.sirfetchd-detect-toggle').onclick = () => {
    state.defenderSirfetchdDetectActive = !state.defenderSirfetchdDetectActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── SKELEDIRGE — Snarl (fear damage debuff) ─────────────────────────────────
// "For 2.5s opposing Pokémon hit by this move deal 20% less damage to the
// user." Level 13 increases the debuff to 30%.
function applySkeledirgeSnarl(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 7) return; // Snarl learned at level 7

  const upgraded = level >= 13;
  const percent  = upgraded ? 30 : 20;

  const isActive = state.defenderSkeledirgeSnarlActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/skeledirge/snarl.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Snarl+' : 'Snarl', upgraded ? 13 : 7)}
      Hit target → <strong style="color:#fff;">−${percent}% damage dealt to Skeledirge</strong> for 2.5s<br>
      <button class="skeledirge-snarl-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.skeledirge-snarl-toggle').onclick = () => {
    state.defenderSkeledirgeSnarlActive = !state.defenderSkeledirgeSnarlActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── SLOWBRO — Amnesia (Def / Sp. Def buff + HP regen) ───────────────────────
// "Slowbro briefly becomes unstoppable, gaining +250 Defense for 4s and
// restoring 17.5% of Slowbro's Oblivious health (blue HP) every second for
// 4s." Level 13 adds +125 Sp. Defense. Only the flat Def/Sp.Def buff is
// modeled here (applied in statsManager.js); the Oblivious-HP regen isn't a
// damage-calc value.
function applySlowbroAmnesia(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 6) return; // Amnesia learned at level 6

  const upgraded = level >= 13;
  const isActive = state.defenderSlowbroAmnesiaActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/slowbro/amnesia.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Amnesia+' : 'Amnesia', upgraded ? 13 : 6)}
      Unstoppable → <strong style="color:#fff;">+250 Defense</strong>${upgraded ? ' & <strong style="color:#fff;">+125 Sp. Defense</strong>' : ''} for 4s<br>
      <span style="font-size:0.8rem;color:${C}99;">Also restores 17.5% Oblivious HP/s for 4s — not modeled here</span><br>
      <button class="slowbro-amnesia-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.slowbro-amnesia-toggle').onclick = () => {
    state.defenderSlowbroAmnesiaActive = !state.defenderSlowbroAmnesiaActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── SNORLAX — Block+ (Def / Sp. Def buff while walling) ────────────────────
// "Increases the user's Defense and Sp. Def by 35% while holding up the
// wall." Only the level 13 upgrade has a stat effect — the base level 7
// version is just the shield/wall/stun, already covered by the "shields"
// entry in the move data.
function applySnorlaxBlock(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 13) return; // Upgrade at level 13

  const isActive = state.defenderSnorlaxBlockActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/snorlax/block.png')}
    <div style="flex:1;">
      ${moveBadge('Block+', 13)}
      While holding up the wall → <strong style="color:#fff;">+35% Def & Sp. Def</strong><br>
      <button class="snorlax-block-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.snorlax-block-toggle').onclick = () => {
    state.defenderSnorlaxBlockActive = !state.defenderSnorlaxBlockActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── SYLVEON — Calm Mind (Sp. Def buff) ──────────────────────────────────────
// Sp. Def side of the +10% Sp. Defense (3s) granted by Calm Mind. The
// Sp. Attack side is modeled in moveEffectsAtk.js / statsManager.js.
function applySylveonCalmMindDef(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 6) return; // Calm Mind learned at level 6

  const upgraded = level >= 12;
  const isActive = state.defenderSylveonCalmMindActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/sylveon/calm_mind.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Calm Mind+' : 'Calm Mind', upgraded ? 12 : 6)}
      For 3s → <strong style="color:#fff;">+10% Sp. Defense</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Also +40% Sp. Attack (see Attacker tab) & +30% Movement Speed — not modeled here${upgraded ? '. Level 12 blocks one move + grants a shield (calculated separately above) — not modeled here either' : ''}</span><br>
      <button class="sylveon-calm-mind-def-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.sylveon-calm-mind-def-toggle').onclick = () => {
    state.defenderSylveonCalmMindActive = !state.defenderSylveonCalmMindActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── TALONFLAME — Brave Bird+ (damage reduction stacks) ──────────────────────
// "Reduces damage received by 25% per opposing Pokémon hit for 5s (up to 3
// times; maximum 75%)."
function applyTalonflameBraveBird(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 13) return; // Upgrade at level 13

  const stacks    = state.defenderTalonflameBraveBirdStacks ?? 0;
  const maxStacks = 3;
  const bonusPct  = stacks * 25;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/talonflame/brave_bird.png')}
    <div style="flex:1;">
      ${moveBadge('Brave Bird+', 13)}
      Opposing Pokémon hit: <button class="stack-btn minus talonflame-bb-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus talonflame-bb-plus">+</button><br>
      → Damage received <strong style="color:${bonusPct > 0 ? '#88ff88' : '#888'};">−${bonusPct}%</strong> for 5s
      ${stacks >= maxStacks ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}
    </div>
  `);
  line.querySelector('.talonflame-bb-minus').onclick = () => { if ((state.defenderTalonflameBraveBirdStacks ?? 0) > 0)        { state.defenderTalonflameBraveBirdStacks = (state.defenderTalonflameBraveBirdStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.talonflame-bb-plus').onclick  = () => { if ((state.defenderTalonflameBraveBirdStacks ?? 0) < maxStacks) { state.defenderTalonflameBraveBirdStacks = (state.defenderTalonflameBraveBirdStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

// ── TALONFLAME — Flame Sweep (Unite, damage reduction while active) ────────
// "becoming unstoppable, receiving 50% reduced damage" during the sweep.
function applyTalonflameFlameSweep(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 9) return; // Flame Sweep learned at level 9

  const isActive = state.defenderTalonflameFlameSweepActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/talonflame/flame_sweep.png')}
    <div style="flex:1;">
      ${moveBadge('Flame Sweep', 9)}
      While sweeping → <strong style="color:#fff;">−50% damage received</strong><br>
      <button class="talonflame-flame-sweep-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.talonflame-flame-sweep-toggle').onclick = () => {
    state.defenderTalonflameFlameSweepActive = !state.defenderTalonflameFlameSweepActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── TINKATON — Thief (Def / Sp. Def buff, self stacks) ──────────────────────
// "the user gains a Thief buff for 5s, increasing their Defense and Sp. Def
// by 10% per target hit (up to 5 times; maximum 50%)." Level 11 strengthens
// this to 25% per target hit (maximum 125%). The target-side debuff is
// modeled in moveEffectsAtk.js / statsManager.js.
function applyTinkatonThiefBuff(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Thief learned at level 5

  const perStackPct = level >= 11 ? 25 : 10;
  const stacks       = state.defenderTinkatonThiefStacks ?? 0;
  const maxStacks    = 5;
  const bonusPct     = stacks * perStackPct;

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/tinkaton/thief.png')}
    <div style="flex:1;">
      ${moveBadge(level >= 11 ? 'Thief+' : 'Thief', level >= 11 ? 11 : 5)}
      Opposing Pokémon hit: <button class="stack-btn minus tinkaton-thief-minus">−</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus tinkaton-thief-plus">+</button><br>
      → Def & Sp. Def <strong style="color:${bonusPct > 0 ? '#88ff88' : '#888'};">+${bonusPct}%</strong> for 5s
      ${stacks >= maxStacks ? '<span style="color:#ffd740;font-size:0.8rem;"> ✦ MAX</span>' : ''}
    </div>
  `);
  line.querySelector('.tinkaton-thief-minus').onclick = () => { if ((state.defenderTinkatonThiefStacks ?? 0) > 0)        { state.defenderTinkatonThiefStacks = (state.defenderTinkatonThiefStacks ?? 0) - 1; updateDamages(); } };
  line.querySelector('.tinkaton-thief-plus').onclick  = () => { if ((state.defenderTinkatonThiefStacks ?? 0) < maxStacks) { state.defenderTinkatonThiefStacks = (state.defenderTinkatonThiefStacks ?? 0) + 1; updateDamages(); } };
  card.appendChild(line);
}

// ── TREVENANT — Pain Split (mitigation tier, redirected as True damage) ────
// "While the link holds, a percentage of damage that Trevenant would take is
// mitigated and instead redirected to the linked enemy as True damage. The
// lower Trevenant's remaining HP, the greater the percentage redirected."
// The mitigation itself is applied as a multiplier in multiplierManager.js;
// the redirected True damage amount is displayed inline in damageDisplay.js
// against each incoming damage line, derived from the already-computed value.
function applyTrevenantPainSplit(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 7) return; // Pain Split learned at level 7

  const upgraded = level >= 13;
  const band = state.defenderTrevenantPainSplitBand || 'none';

  const bands = [
    { key: 'none', label: 'No Link', pct: 0 },
    { key: 'high', label: 'Above 70% HP', pct: 30 },
    { key: 'mid',  label: '40%–70% HP',   pct: 40 },
    { key: 'low',  label: 'Below 40% HP', pct: 50 },
  ];

  const buttonsHtml = bands.map(b => `
    <button class="pain-split-band-btn" data-band="${b.key}" style="
      padding:6px 12px;margin:2px;
      background:${band === b.key ? C : '#0d2428'};
      color:${band === b.key ? '#000' : C};
      border:1px solid ${C};border-radius:6px;cursor:pointer;
      font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.8rem;
    ">${b.label}${b.pct > 0 ? ` (${b.pct}%)` : ''}</button>
  `).join('');

  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/trevenant/pain_split.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Pain Split+' : 'Pain Split', upgraded ? 13 : 7)}
      Linked (${upgraded ? '8.5s' : '6s'}) → <strong style="color:#fff;">damage taken redirected as True damage</strong>, by Trevenant's remaining HP<br>
      <div style="margin-top:8px;">${buttonsHtml}</div>
      <span style="font-size:0.8rem;color:${C}99;">Redirected amount shown on each incoming damage line below</span>
    </div>
  `);
  line.querySelectorAll('.pain-split-band-btn').forEach(btn => {
    btn.onclick = () => {
      state.defenderTrevenantPainSplitBand = btn.dataset.band;
      updateDamages();
    };
  });
  card.appendChild(line);
}

// ── TYRANITAR — Sand Tomb (damage reduction, in the dust cloud) ────────────
// "while the user is in the cloud of dust, they take 15% reduced damage."
function applyTyranitarSandTombDefense(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 9) return; // Sand Tomb learned at level 9

  const upgraded = level >= 13;
  const isActive = state.defenderTyranitarSandTombDustActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/tyranitar/sand_tomb.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Sand Tomb+' : 'Sand Tomb', upgraded ? 13 : 9)}
      In the dust cloud (${upgraded ? '8s' : '6s'}) → <strong style="color:#fff;">−15% damage received</strong><br>
      <button class="tyranitar-sand-tomb-def-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.tyranitar-sand-tomb-def-toggle').onclick = () => {
    state.defenderTyranitarSandTombDustActive = !state.defenderTyranitarSandTombDustActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── URSHIFU — Rock Smash (damage reduction while charging) ─────────────────
// "The user receives 20% reduced damage as they charge power for up to 2s."
function applyUrshifuRockSmash(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 1) return; // Rock Smash learned at level 1

  const isActive = state.defenderUrshifuRockSmashActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/urshifu/rock_smash.png')}
    <div style="flex:1;">
      ${moveBadge('Rock Smash', 1)}
      While charging (up to 2s) → <strong style="color:#fff;">−20% damage received</strong><br>
      <button class="urshifu-rock-smash-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.urshifu-rock-smash-toggle').onclick = () => {
    state.defenderUrshifuRockSmashActive = !state.defenderUrshifuRockSmashActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── URSHIFU — Wicked Blow (damage reduction while charging) ────────────────
// "receives 20% reduced damage ... as they charge power." Level 11:
// "Strengthens damage reduction while charging this move to 40%."
function applyUrshifuWickedBlow(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Wicked Blow learned at level 5

  const upgraded = level >= 11;
  const percent  = upgraded ? 40 : 20;

  const isActive = state.defenderUrshifuWickedBlowActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/urshifu/wicked_blow.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Wicked Blow+' : 'Wicked Blow', upgraded ? 11 : 5)}
      While charging (up to 2.5s) → <strong style="color:#fff;">−${percent}% damage received</strong><br>
      <button class="urshifu-wicked-blow-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.urshifu-wicked-blow-toggle').onclick = () => {
    state.defenderUrshifuWickedBlowActive = !state.defenderUrshifuWickedBlowActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── URSHIFU — Surging Strikes+ (damage reduction while striking) ───────────
// "Receives 30% reduced damage while using this move." (level 11 upgrade)
function applyUrshifuSurgingStrikes(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 11) return; // Upgrade at level 11

  const isActive = state.defenderUrshifuSurgingStrikesActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/urshifu/surging_strikes.png')}
    <div style="flex:1;">
      ${moveBadge('Surging Strikes+', 11)}
      While striking → <strong style="color:#fff;">−30% damage received</strong><br>
      <button class="urshifu-surging-strikes-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.urshifu-surging-strikes-toggle').onclick = () => {
    state.defenderUrshifuSurgingStrikesActive = !state.defenderUrshifuSurgingStrikesActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── URSHIFU — Flowing Fists (Unite, damage reduction while unleashing) ─────
// "the user becomes unstoppable and receives 30% reduced damage as they
// unleash a minimum of 5 consecutive blows."
function applyUrshifuFlowingFistsDef(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 9) return; // Flowing Fists learned at level 9

  const isActive = state.defenderUrshifuFlowingFistsActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/urshifu/flowing_fists.png')}
    <div style="flex:1;">
      ${moveBadge('Flowing Fists', 9)}
      While unleashing consecutive blows → <strong style="color:#fff;">−30% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Number of blows is set in the Attacker tab</span><br>
      <button class="urshifu-ff-def-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.urshifu-ff-def-toggle').onclick = () => {
    state.defenderUrshifuFlowingFistsActive = !state.defenderUrshifuFlowingFistsActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── VAPOREON — Flip Turn (damage reduction while cloaked) ──────────────────
// "reducing damage received by 15% ... while cloaked in water." Level 12:
// "Increases the damage reduction to 30%."
function applyVaporeonFlipTurn(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 6) return; // Flip Turn learned at level 6

  const upgraded = level >= 12;
  const percent  = upgraded ? 30 : 15;

  const isActive = state.defenderVaporeonFlipTurnActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/vaporeon/flip_turn.png')}
    <div style="flex:1;">
      ${moveBadge(upgraded ? 'Flip Turn+' : 'Flip Turn', upgraded ? 12 : 6)}
      While cloaked in water (up to 3s) → <strong style="color:#fff;">−${percent}% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">Also +40%→60% Movement Speed — not modeled here. Shield is calculated separately above</span><br>
      <button class="vaporeon-flip-turn-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.vaporeon-flip-turn-toggle').onclick = () => {
    state.defenderVaporeonFlipTurnActive = !state.defenderVaporeonFlipTurnActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── VENUSAUR — Giga Drain (damage reduction on cast) ────────────────────────
// "Venusaur also takes 40% reduced damage for 2.5s."
function applyVenusaurGigaDrain(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Giga Drain learned at level 5

  const isActive = state.defenderVenusaurGigaDrainActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/venusaur/giga_drain.png')}
    <div style="flex:1;">
      ${moveBadge('Giga Drain', 5)}
      On cast → <strong style="color:#fff;">−40% damage received</strong> for 2.5s<br>
      <span style="font-size:0.8rem;color:${C}99;">This move's healing isn't boosted by Overgrow — heal is calculated separately above</span><br>
      <button class="venusaur-giga-drain-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.venusaur-giga-drain-toggle').onclick = () => {
    state.defenderVenusaurGigaDrainActive = !state.defenderVenusaurGigaDrainActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── ZACIAN — Sacred Sword (damage reduction during the slash) ──────────────
// "During this slash, Zacian briefly becomes unstoppable and reduces damage
// taken by 30%."
function applyZacianSacredSwordDef(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 5) return; // Sacred Sword learned at level 5

  const isActive = state.defenderZacianSacredSwordActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/zacian/sacred_sword.png')}
    <div style="flex:1;">
      ${moveBadge('Sacred Sword', 5)}
      During the slash → <strong style="color:#fff;">−30% damage received</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">+20% Attack & Defense Pierce buff shown in the Attacker tab</span><br>
      <button class="zacian-sacred-sword-def-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.zacian-sacred-sword-def-toggle').onclick = () => {
    state.defenderZacianSacredSwordActive = !state.defenderZacianSacredSwordActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── ZACIAN — Play Rough (damage reduction from hit targets) ────────────────
// "If Play Rough connects, Zacian receives 25% reduced damage from the
// enemies hit for 3s after landing."
function applyZacianPlayRough(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 7) return; // Play Rough learned at level 7

  const isActive = state.defenderZacianPlayRoughActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/zacian/play_rough.png')}
    <div style="flex:1;">
      ${moveBadge('Play Rough', 7)}
      On hit, for 3s → <strong style="color:#fff;">−25% damage received</strong> from hit targets<br>
      <button class="zacian-play-rough-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.zacian-play-rough-toggle').onclick = () => {
    state.defenderZacianPlayRoughActive = !state.defenderZacianPlayRoughActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── SABLEYE — Knock Off ───────────────────────────────────────────────────────
function applySableyeKnockOff(atkStats, defStats, card) {
  const level = state.defenderLevel;
  if (level < 4) return; // Knock Off learned at level 4

  const isActive = state.defenderSableyeKnockOffActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/sableye/knock_off.png')}
    <div style="flex:1;">
      ${moveBadge('Knock Off', 4)}
      While using this move → <strong style="color:#fff;">−40% damage received</strong><br>
      <button class="sableye-knockoff-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Activate'}</button>
    </div>
  `);
  line.querySelector('.sableye-knockoff-toggle').onclick = () => {
    state.defenderSableyeKnockOffActive = !state.defenderSableyeKnockOffActive;
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
    leafeon:   [applyLeafeonSolarBlade],
    lucario:      [applyLucarioPowerUpPunchCharge],
    "mega-lucario": [applyLucarioPowerUpPunchCharge],
    machamp:   [applyMachampBarrageBlowDef],
    metagross: [applyMetagrossZenHeadbutt, applyMetagrossMagnetRise],
    mew:       [applyMewLightScreenWall],
    mewtwo_x:  [applyMewtwoXPsystrikeChannel],
    mewtwo_y:  [applyMewtwoYPsystrikeChannel],
    mimikyu:   [applyMimikyuTrickRoom],
    moltres:   [applyMoltresSkyAttackStacks],
    palkia:    [applyPalkiaDragonClawDefStacks],
    sableye:   [applySableyeKnockOff],
    scizor:    [applyScizorAutoAttackDefStacks, applyScizorSwordsDanceDashReduc],
    scyther:   [applyScytherSwordsDanceDashReduc],
    sirfetchd: [applySirfetchdDetect],
    skeledirge: [applySkeledirgeSnarl],
    slowbro:   [applySlowbroAmnesia],
    snorlax:   [applySnorlaxBlock],
    sylveon:   [applySylveonCalmMindDef],
    talonflame: [applyTalonflameBraveBird, applyTalonflameFlameSweep],
    tinkaton:   [applyTinkatonThiefBuff],
    trevenant:  [applyTrevenantPainSplit],
    tyranitar:  [applyTyranitarSandTombDefense],
    urshifu:    [applyUrshifuRockSmash, applyUrshifuWickedBlow, applyUrshifuSurgingStrikes, applyUrshifuFlowingFistsDef],
    vaporeon:   [applyVaporeonFlipTurn],
    venusaur:   [applyVenusaurGigaDrain],
    zacian:     [applyZacianSacredSwordDef, applyZacianPlayRough],
  };
  (handlers[pokemonId] ?? []).forEach(fn => fn(atkStats, defStats, card));
}