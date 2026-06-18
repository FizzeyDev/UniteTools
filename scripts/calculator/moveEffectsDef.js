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

// ── Dispatcher ────────────────────────────────────────────────────────────────
export function applyDefenderMoveEffects(pokemonId, atkStats, defStats, card) {
  const handlers = {
    armarouge: [applyArmarougeFlameCharge, applyArmarougeArmorCannon],
    blastoise: [applyBlastoiseRapidSpin],
    blaziken:  [applyBlazikenOverheat],
    ceruledge: [applyCeruledgeRevenantRend],
  };
  (handlers[pokemonId] ?? []).forEach(fn => fn(atkStats, defStats, card));
}