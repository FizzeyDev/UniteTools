import { state } from './state.js';
import { calculateDamage } from './damageCalculator.js';
import { updateDamages } from './damageDisplay.js';
import { PASSIVE_ATK, passiveBadge } from './effectColors.js';

const { color: C, bg: BG, border: BORDER } = PASSIVE_ATK;

function wrap(content) {
  return `<div style="margin:12px 0;padding:10px;background:${BG};border-radius:8px;${BORDER};display:flex;align-items:center;gap:12px;">${content}</div>`;
}
function icon(src) {
  return `<img src="${src}" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">`;
}

// ── BUZZWOLE ──────────────────────────────────────────────────────────────────
function applyBuzzwoleAttacker(atkStats, defStats, card) {
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/buzzwole/beast_boost.png')}
    <div style="flex:1;">
      ${passiveBadge('Beast Boost', null, PASSIVE_ATK)}
      Stacks: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${state.attackerPassiveStacks}</strong>/6
      <button class="stack-btn plus">+</button>
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.attackerPassiveStacks < 6) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── CERULEDGE ─────────────────────────────────────────────────────────────────
function applyCeruledgeAttacker(atkStats, defStats, card) {
  if (state.attackerLevel < 5) return;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/ceruledge/weak_armor.png')}
    <div style="flex:1;">
      ${passiveBadge('Weak Armor', null, PASSIVE_ATK)}
      Stacks: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${state.attackerPassiveStacks}</strong>/6
      <button class="stack-btn plus">+</button>
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.attackerPassiveStacks < 6) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── CHANDELURE ────────────────────────────────────────────────────────────────
function applyChandelureAttacker(atkStats, defStats, card) {
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/chandelure/infiltrator.png')}
    <div style="flex:1;">
      ${passiveBadge('Infiltrator', null, PASSIVE_ATK)}
      Stacks: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${state.attackerPassiveStacks}</strong>/6
      <button class="stack-btn plus">+</button>
      <br>→ Ignore ${(state.attackerPassiveStacks * 5).toFixed(1)}% Sp. Def
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.attackerPassiveStacks < 6) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── DARKRAI ───────────────────────────────────────────────────────────────────
function applyDarkraiAttacker(atkStats, defStats, card) {
  const asleep = state.attackerDarkraiSleep || false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/darkrai/bad_dreams.png')}
    <div style="flex:1;">
      ${passiveBadge('Bad Dreams', null, PASSIVE_ATK)}
      Status: <strong style="color:${asleep ? '#3498db' : '#e74c3c'};">${asleep ? 'Active' : 'Inactive'}</strong><br>
      <button class="sleep-toggle" style="margin-top:8px;padding:6px 14px;background:${asleep ? '#3498db' : '#e74c3c'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${asleep ? 'Asleep' : 'Awake'}
      </button>
    </div>
  `);
  line.querySelector('.sleep-toggle').onclick = () => { state.attackerDarkraiSleep = !asleep; updateDamages(); };
  card.appendChild(line);
}

// ── DECIDUEYE ─────────────────────────────────────────────────────────────────
function applyDecidueyeAttacker(atkStats, defStats, card) {
  const distant = state.attackerDecidueyeDistant || false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/decidueye/long_reach.png')}
    <div style="flex:1;">
      ${passiveBadge('Long Reach', null, PASSIVE_ATK)}
      Target: <strong style="color:${distant ? C : '#e67e22'};">${distant ? 'Distant' : 'Close'}</strong><br>
      Damage bonus: <strong>+20%</strong><br>
      <button class="distance-toggle" style="margin-top:8px;padding:6px 14px;background:${distant ? C : '#e67e22'};color:${distant ? '#000' : 'white'};border:none;border-radius:6px;cursor:pointer;">
        ${distant ? 'Distant' : 'Close'}
      </button>
    </div>
  `);
  line.querySelector('.distance-toggle').onclick = () => { state.attackerDecidueyeDistant = !distant; updateDamages(); };
  card.appendChild(line);
}

// ── CHARIZARD Y ───────────────────────────────────────────────────────────────
function applyZardyAttacker(atkStats, defStats, card) {
  const isMega        = state.attackerZardyForm === 'mega';
  const blazeActive   = state.attackerBlazeActive   ?? false;
  const droughtActive = state.attackerDroughtActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${BG};border-radius:8px;${BORDER};display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;">
        <button class="zardy-normal" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${!isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${!isMega ? 'disabled' : ''}>Normal</button>
        <button class="zardy-mega"   style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${isMega ? '#7f8c8d' : '#27ae60'};color:white;"  ${isMega ? 'disabled' : ''}>Méga</button>
      </div>
      ${!isMega ? `
        <div style="display:flex;align-items:center;gap:12px;">
          ${icon('assets/moves/mega_charizard_y/blaze.png')}
          <div style="flex:1;">
            ${passiveBadge('Blaze', null, PASSIVE_ATK)}
            Status: <strong style="color:${blazeActive ? '#3498db' : '#e74c3c'};">${blazeActive ? 'Active' : 'Inactive'}</strong><br>
            <button class="blaze-toggle" style="margin-top:8px;padding:8px 16px;background:${blazeActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
              ${blazeActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      ` : `
        <div style="display:flex;align-items:center;gap:12px;">
          ${icon('assets/moves/mega_charizard_y/drought.png')}
          <div style="flex:1;">
            ${passiveBadge('Drought', null, PASSIVE_ATK)}
            Sunny Area: <strong style="color:${droughtActive ? '#3498db' : '#e74c3c'};">${droughtActive ? 'Active' : 'Inactive'}</strong><br>
            <button class="drought-toggle" style="margin-top:8px;padding:8px 16px;background:${droughtActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
              ${droughtActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      `}
    </div>
  `;
  line.querySelector('.zardy-normal').onclick = () => { state.attackerZardyForm = 'normal'; state.attackerDroughtActive = false; updateDamages(); };
  line.querySelector('.zardy-mega').onclick   = () => { state.attackerZardyForm = 'mega';   state.attackerBlazeActive   = false; updateDamages(); };
  if (!isMega) line.querySelector('.blaze-toggle').onclick   = () => { state.attackerBlazeActive   = !state.attackerBlazeActive;   updateDamages(); };
  else         line.querySelector('.drought-toggle').onclick = () => { state.attackerDroughtActive = !state.attackerDroughtActive; updateDamages(); };
  card.appendChild(line);
}

// ── AEGISLASH ─────────────────────────────────────────────────────────────────
function applyAegislashAttacker(atkStats, defStats, card) {
  if (state.attackerLevel < 7) return;
  const isSword = state.attackerStance === 'sword';
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/aegislash/stance_change.png')}
    <div style="flex:1;">
      ${passiveBadge('Stance Change', null, PASSIVE_ATK)}
      Form: <strong style="color:${isSword ? '#e74c3c' : '#3498db'};">${isSword ? 'Blade' : 'Shield'}</strong><br>
      <button class="stance-toggle" style="margin-top:8px;padding:8px 16px;background:${isSword ? '#3498db' : '#e74c3c'};color:white;border:none;border-radius:6px;cursor:pointer;">
        Switch to ${isSword ? 'Shield' : 'Blade'} Forme
      </button>
    </div>
  `);
  line.querySelector('.stance-toggle').onclick = () => { state.attackerStance = isSword ? 'shield' : 'sword'; updateDamages(); };
  card.appendChild(line);
}

// ── ARMAROUGE ─────────────────────────────────────────────────────────────────
function applyArmarougeAttacker(atkStats, defStats, card) {
  const exampleDef = state.currentAttacker.style === 'special' ? defStats.sp_def : defStats.def;
  const passive = state.currentAttacker.passive || { extraAutoMultiplier: 60, extraAutoConstant: 120 };
  const flashBonus = calculateDamage(
    { multiplier: passive.extraAutoMultiplier, levelCoef: 0, constant: passive.extraAutoConstant },
    atkStats.sp_atk, exampleDef, state.attackerLevel, false
  );
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/armarouge/flash_fire.png')}
    <div style="flex:1;">
      ${passiveBadge('Flash Fire', null, PASSIVE_ATK)}
      Next AA: <strong style="color:${state.attackerFlashFireActive ? '#88ff88' : '#ff6666'};">${state.attackerFlashFireActive ? 'Active' : 'Inactive'}</strong> (+${flashBonus.toLocaleString()} dmg)<br>
      <button class="flashfire-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerFlashFireActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${state.attackerFlashFireActive ? 'Deactivate' : 'Activate'} proc
      </button>
    </div>
  `);
  line.querySelector('.flashfire-toggle').onclick = () => { state.attackerFlashFireActive = !state.attackerFlashFireActive; updateDamages(); };
  card.appendChild(line);
}

// ── MEGA GYARADOS ─────────────────────────────────────────────────────────────
function applyMegaGyaradosAttacker(atkStats, defStats, card) {
  const passive = state.currentAttacker.passive;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = `
    ${wrap(`
      ${icon('assets/moves/mega_gyarados/intimidate.png')}
      <div style="flex:1;">
        ${passiveBadge('Intimidate', null, PASSIVE_ATK)}
        HP +1200, Atk +100<br>
        <button class="intimidate-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerMegaGyaradosEvolve ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.attackerMegaGyaradosEvolve ? 'Gyarados' : 'Magikarp'}
        </button>
      </div>
    `)}
    ${wrap(`
      ${icon(passive.image)}
      <div style="flex:1;">
        ${passiveBadge(passive.name, null, PASSIVE_ATK)}
        Atk +${passive.bonusPercentAtk}% · Def Pen +${passive.bonusDefPen}%<br>
        <button class="moldbreaker-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerMoldBreakerActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.attackerMoldBreakerActive ? 'Mega Evolve' : 'Normal'}
        </button>
      </div>
    `)}
  `;
  line.querySelector('.intimidate-toggle').onclick  = () => { state.attackerMegaGyaradosEvolve = !state.attackerMegaGyaradosEvolve; updateDamages(); };
  line.querySelector('.moldbreaker-toggle').onclick = () => { state.attackerMoldBreakerActive  = !state.attackerMoldBreakerActive;  updateDamages(); };
  card.appendChild(line);
}

// ── MEGA LUCARIO ──────────────────────────────────────────────────────────────
function applyMegaLucarioAttacker(atkStats, defStats, card) {
  const isMega = state.attackerLucarioForm === 'mega';
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${BG};border-radius:8px;${BORDER};display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;">
        <button class="lucario-normal" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${!isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${!isMega ? 'disabled' : ''}>Normal</button>
        <button class="lucario-mega"   style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${isMega ? '#7f8c8d' : '#27ae60'};color:white;"  ${isMega ? 'disabled' : ''}>Méga</button>
      </div>
      ${!isMega ? `
        <div style="display:flex;align-items:center;gap:12px;">
          ${icon('assets/moves/mega_lucario/justified.png')}
          <div style="flex:1;">
            ${passiveBadge('Justified', null, PASSIVE_ATK)}
            Stacks: <button class="stack-btn minus just-minus">-</button>
            <strong style="color:${C};">${state.attackerLucarioJustifiedStacks}</strong>/4
            <button class="stack-btn plus just-plus">+</button>
            <br>→ Atk +${state.attackerLucarioJustifiedStacks * 8}%
          </div>
        </div>
      ` : `
        <div style="display:flex;align-items:center;gap:12px;">
          ${icon('assets/moves/mega_lucario/adaptability.png')}
          <div style="flex:1;">
            ${passiveBadge('Adaptability', null, PASSIVE_ATK)}
            Stacks: <button class="stack-btn minus adapt-minus">-</button>
            <strong style="color:${C};">${state.attackerLucarioAdaptabilityStacks}</strong>/10
            <button class="stack-btn plus adapt-plus">+</button>
            <br>→ Atk +${state.attackerLucarioAdaptabilityStacks * 5}%
          </div>
        </div>
      `}
    </div>
  `;
  line.querySelector('.lucario-normal').onclick = () => { state.attackerLucarioForm = 'normal'; state.attackerLucarioAdaptabilityStacks = 0; updateDamages(); };
  line.querySelector('.lucario-mega').onclick   = () => { state.attackerLucarioForm = 'mega';   state.attackerLucarioJustifiedStacks    = 0; updateDamages(); };
  if (!isMega) {
    line.querySelector('.just-minus').onclick  = () => { if (state.attackerLucarioJustifiedStacks > 0) { state.attackerLucarioJustifiedStacks--;  updateDamages(); } };
    line.querySelector('.just-plus').onclick   = () => { if (state.attackerLucarioJustifiedStacks < 4) { state.attackerLucarioJustifiedStacks++;  updateDamages(); } };
  } else {
    line.querySelector('.adapt-minus').onclick = () => { if (state.attackerLucarioAdaptabilityStacks > 0)  { state.attackerLucarioAdaptabilityStacks--; updateDamages(); } };
    line.querySelector('.adapt-plus').onclick  = () => { if (state.attackerLucarioAdaptabilityStacks < 10) { state.attackerLucarioAdaptabilityStacks++; updateDamages(); } };
  }
  card.appendChild(line);
}

// ── GYARADOS ──────────────────────────────────────────────────────────────────
function applyGyaradosAttacker(atkStats, defStats, card) {
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/gyarados/moxie.png')}
    <div style="flex:1;">
      ${passiveBadge('Moxie', null, PASSIVE_ATK)}
      HP +1200, Atk +100<br>
      <button class="moxie-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerGyaradosEvolve ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${state.attackerGyaradosEvolve ? 'Gyarados' : 'Magikarp'}
      </button>
    </div>
  `);
  line.querySelector('.moxie-toggle').onclick = () => { state.attackerGyaradosEvolve = !state.attackerGyaradosEvolve; updateDamages(); };
  card.appendChild(line);
}

// ── MACHAMP ───────────────────────────────────────────────────────────────────
function applyMachampAttacker(atkStats, defStats, card) {
  const passive = state.currentAttacker.passive;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon(passive.image)}
    <div style="flex:1;">
      ${passiveBadge(passive.name, null, PASSIVE_ATK)}
      ${passive.description}<br>
      <button class="guts-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerMachampActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${state.attackerMachampActive ? 'Debuff' : 'Not debuff'}
      </button>
    </div>
  `);
  line.querySelector('.guts-toggle').onclick = () => { state.attackerMachampActive = !state.attackerMachampActive; updateDamages(); };
  card.appendChild(line);
}

// ── MEOWSCARADA ───────────────────────────────────────────────────────────────
function applyMeowscaradaAttacker(atkStats, defStats, card) {
  const passive = state.currentAttacker.passive;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon(passive.image)}
    <div style="flex:1;">
      ${passiveBadge(passive.name, null, PASSIVE_ATK)}
      ${passive.description}<br>
      <button class="overgrow-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerMeowscaradaActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${state.attackerMeowscaradaActive ? 'Activate' : 'Deactivate'}
      </button>
    </div>
  `);
  line.querySelector('.overgrow-toggle').onclick = () => { state.attackerMeowscaradaActive = !state.attackerMeowscaradaActive; updateDamages(); };
  card.appendChild(line);
}

// ── MEGA MEWTWO X ─────────────────────────────────────────────────────────────
function applyMegaMewtwoAttacker(atkStats, hpStats, card) {
  const isMega = state.attackerMewtwoForm === 'mega';
  const stacks = state.attackerMewtwoPressureStacks;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${BG};border-radius:8px;${BORDER};display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;">
        <button class="mewtwo-normal" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${!isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${!isMega ? 'disabled' : ''}>Normal</button>
        <button class="mewtwo-mega"   style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${isMega ? '#7f8c8d' : '#27ae60'};color:white;"  ${isMega ? 'disabled' : ''}>Méga</button>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        ${icon('assets/moves/mega_mewtwo_x/pressure.png')}
        <div style="flex:1;">
          ${passiveBadge('Pressure', null, PASSIVE_ATK)}
          Stacks: <button class="stack-btn minus pressure-minus">-</button>
          <strong style="color:${C};">${stacks}</strong>/10
          <button class="stack-btn plus pressure-plus">+</button><br>
          → Atk +${stacks * 2}%
          ${isMega ? `<br>→ Méga bonus: Atk +18% | HP +10%` : ''}
        </div>
      </div>
    </div>
  `;
  line.querySelector('.mewtwo-normal').onclick  = () => { state.attackerMewtwoForm = 'normal'; updateDamages(); };
  line.querySelector('.mewtwo-mega').onclick    = () => { state.attackerMewtwoForm = 'mega';   updateDamages(); };
  line.querySelector('.pressure-minus').onclick = () => { if (state.attackerMewtwoPressureStacks > 0)  { state.attackerMewtwoPressureStacks--; updateDamages(); } };
  line.querySelector('.pressure-plus').onclick  = () => { if (state.attackerMewtwoPressureStacks < 10) { state.attackerMewtwoPressureStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── MEGA MEWTWO Y ─────────────────────────────────────────────────────────────
function applyMegaMewtwoYAttacker(atkStats, hpStats, card) {
  const isMega = state.attackerMewtwoYForm === 'mega';
  const stacks = state.attackerMewtwoYPressureStacks;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${BG};border-radius:8px;${BORDER};display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;">
        <button class="mewtwo-y-normal" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${!isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${!isMega ? 'disabled' : ''}>Normal</button>
        <button class="mewtwo-y-mega"   style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${isMega ? '#7f8c8d' : '#27ae60'};color:white;"  ${isMega ? 'disabled' : ''}>Méga</button>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        ${icon('assets/moves/mega_mewtwo_x/pressure.png')}
        <div style="flex:1;">
          ${passiveBadge('Pressure', null, PASSIVE_ATK)}
          Stacks: <button class="stack-btn minus pressure-minus">-</button>
          <strong style="color:${C};">${stacks}</strong>/10
          <button class="stack-btn plus pressure-plus">+</button><br>
          → Sp.Atk +${stacks * 1.5}%
          ${isMega ? `<br>→ Méga bonus: Sp.Atk +10% | HP +10%` : ''}
        </div>
      </div>
    </div>
  `;
  line.querySelector('.mewtwo-y-normal').onclick = () => { state.attackerMewtwoYForm = 'normal'; updateDamages(); };
  line.querySelector('.mewtwo-y-mega').onclick   = () => { state.attackerMewtwoYForm = 'mega';   updateDamages(); };
  line.querySelector('.pressure-minus').onclick  = () => { if (state.attackerMewtwoYPressureStacks > 0)  { state.attackerMewtwoYPressureStacks--; updateDamages(); } };
  line.querySelector('.pressure-plus').onclick   = () => { if (state.attackerMewtwoYPressureStacks < 10) { state.attackerMewtwoYPressureStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── MIMIKYU ───────────────────────────────────────────────────────────────────
function applyMimikyuAttacker(atkStats, defStats, card) {
  const passive = state.currentAttacker.passive;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon(passive.image)}
    <div style="flex:1;">
      ${passiveBadge(passive.name, null, PASSIVE_ATK)}
      ${passive.description}<br>
      <button class="disguise-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerMimikyuActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${state.attackerMimikyuActive ? 'Activate' : 'Deactivate'}
      </button>
    </div>
  `);
  line.querySelector('.disguise-toggle').onclick = () => { state.attackerMimikyuActive = !state.attackerMimikyuActive; updateDamages(); };
  card.appendChild(line);
}

// ── RAPIDASH ──────────────────────────────────────────────────────────────────
function applyRapidashAttacker(atkStats, defStats, card) {
  const passive = state.currentAttacker.passive;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon(passive.image)}
    <div style="flex:1;">
      ${passiveBadge(passive.name, null, PASSIVE_ATK)}
      ${passive.description}<br>
      Stacks: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${state.attackerRapidashStacks}</strong>/5
      <button class="stack-btn plus">+</button>
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.attackerRapidashStacks > 0) { state.attackerRapidashStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.attackerRapidashStacks < 6) { state.attackerRapidashStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── SIRFETCH'D ────────────────────────────────────────────────────────────────
function applySirfetchdAttacker(atkStats, defStats, card) {
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/sirfetchd/steadfast.png')}
    <div style="flex:1;">
      ${passiveBadge('Steadfast', null, PASSIVE_ATK)}
      Stacks: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${state.attackerPassiveStacks}</strong>/5
      <button class="stack-btn plus">+</button>
      <br>→ +${(state.attackerPassiveStacks * 5).toFixed(1)}% Critical-Hit Rate
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.attackerPassiveStacks < 5) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── SYLVEON ───────────────────────────────────────────────────────────────────
function applySylveonAttacker(atkStats, defStats, card) {
  const level     = state.attackerLevel;
  const isEevee   = level <= 3;
  const stacks    = state.attackerPassiveStacks;
  const maxStacks = 4;
  const passiveName = isEevee ? 'Adaptability' : 'Pixilate';
  const passiveImg  = isEevee ? 'assets/moves/sylveon/adaptability.png' : 'assets/moves/sylveon/pixilate.png';
  const spAtkPct    = isEevee ? stacks * 5 : stacks * 5;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon(passiveImg)}
    <div style="flex:1;">
      ${passiveBadge(passiveName, null, PASSIVE_ATK)}
      Stacks: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${stacks}</strong>/${maxStacks}
      <button class="stack-btn plus">+</button>
      <br>→ Sp. Atk +${spAtkPct.toFixed(isEevee ? 0 : 1)}%
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0)        { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.attackerPassiveStacks < maxStacks) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── TINKATON ──────────────────────────────────────────────────────────────────
function applyTinkatonAttacker(atkStats, defStats, card) {
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/tinkaton/mold_breaker.png')}
    <div style="flex:1;">
      ${passiveBadge('Mold Breaker', null, PASSIVE_ATK)}
      Stacks: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${state.attackerPassiveStacks}</strong>/100
      <button class="stack-btn plus">+</button>
      <br>→ +${(state.attackerPassiveStacks * 0.5).toFixed(1)}% Atk
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0)  { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.attackerPassiveStacks < 100) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── TYRANITAR ─────────────────────────────────────────────────────────────────
function applyTyranitarAttacker(atkStats, defStats, card) {
  if (state.attackerLevel > 5) return;
  const gutsActive = state.attackerTyranitarGutsActive || false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/tyranitar/guts.png')}
    <div style="flex:1;">
      ${passiveBadge('Guts', null, PASSIVE_ATK)}
      Status: <strong style="color:${gutsActive ? '#88ff88' : '#ff6666'};">${gutsActive ? 'Active' : 'Inactive'}</strong><br>
      → Atk +30%<br>
      <button class="guts-toggle" style="margin-top:8px;padding:8px 16px;background:${gutsActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${gutsActive ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  `);
  line.querySelector('.guts-toggle').onclick = () => { state.attackerTyranitarGutsActive = !gutsActive; updateDamages(); };
  card.appendChild(line);
}

// ── ZERAORA ───────────────────────────────────────────────────────────────────
function applyZeraoraAttacker(atkStats, defStats, card) {
  const damageReceived = state.attackerZeraoraDamageReceived ?? 0;
  const bonusAtk = Math.min(Math.floor(damageReceived * 0.08), 200);
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/zeraora/volt_absorb.png')}
    <div style="flex:1;">
      ${passiveBadge('Volt Absorb', null, PASSIVE_ATK)}
      <label style="font-size:0.9rem;">
        Damage received: <strong class="zeraora-display">${damageReceived}</strong> / 2500
        &nbsp;→ Atk +<strong class="zeraora-bonus">${bonusAtk}</strong>
      </label>
      <input type="range" class="zeraora-slider hp-slider" min="0" max="2500" step="1" value="${damageReceived}"
        style="width:100%;margin-top:6px;touch-action:none;">
    </div>
  `);
  const slider       = line.querySelector('.zeraora-slider');
  const display      = line.querySelector('.zeraora-display');
  const bonusDisplay = line.querySelector('.zeraora-bonus');
  slider.addEventListener('pointerdown', e => slider.setPointerCapture(e.pointerId));
  slider.addEventListener('pointermove', e => {
    if (!e.buttons) return;
    const rect  = slider.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const value = Math.round(ratio * 2500);
    slider.value = value;
    state.attackerZeraoraDamageReceived = value;
    display.textContent      = value;
    bonusDisplay.textContent = Math.min(Math.floor(value * 0.08), 200);
    updateDamages();
  });
  slider.addEventListener('pointerup', () => updateDamages());
  card.appendChild(line);
}

// ── MOLTRES ───────────────────────────────────────────────────────────────────
function applyMoltresAttacker(atkStats, defStats, card) {
  const passive     = state.currentAttacker.passive;
  const stacks      = state.attackerPassiveStacks;
  const burnPerTick = Math.floor(atkStats.sp_atk * passive.burnTickRatio / 100) + (passive.burnTickBase || 0);
  const activeTicks = stacks * 2;
  const burnTotal   = burnPerTick * activeTicks;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon(passive.image)}
    <div style="flex:1;">
      ${passiveBadge('Flame Body', null, PASSIVE_ATK)}
      Burn stacks: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${stacks}</strong>/${passive.burnMaxStacks}
      <button class="stack-btn plus">+</button><br>
      <span style="font-size:0.85rem;color:#ccc;">
        Tick (×${passive.burnTickInterval}s):
        <strong style="color:#ff9944;">${burnPerTick.toLocaleString()}</strong>
        ${stacks > 0 ? `- Total: <strong style="color:#ff9944;">${burnTotal.toLocaleString()}</strong> (${activeTicks} ticks)` : ''}
      </span>
      ${stacks > 0 ? `<br><span style="color:#ffd740;font-size:0.85rem;">+${stacks * 10}% dmg on Incinerate / Heat Wave</span>` : ''}
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0)                  { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.attackerPassiveStacks < passive.burnMaxStacks) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── TYPHLOSION ────────────────────────────────────────────────────────────────
function applyTyphlosionAttacker(atkStats, defStats, card) {
  const blazeActive = state.attackerTyphlosionBlazeActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/typhlosion/blaze.png')}
    <div style="flex:1;">
      ${passiveBadge('Blaze', null, PASSIVE_ATK)}
      <span style="font-size:0.82rem;color:#aaa;">
        14 rage → +15% Sp. Atk<br>
        Eruption launches <strong style="color:${blazeActive ? '#ff9944' : '#888'};">${blazeActive ? '4' : '3'} flames</strong>
      </span><br>
      <button class="blaze-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${blazeActive ? '#ff6f00' : '#2a1a00'};
        color:${blazeActive ? '#fff' : '#ff9944'};
        border:1px solid #ff6f00;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.85rem;
      ">${blazeActive ? '🔥 Blaze on' : 'Activate Blaze'}</button>
    </div>
  `);
  line.querySelector('.blaze-toggle').onclick = () => { state.attackerTyphlosionBlazeActive = !state.attackerTyphlosionBlazeActive; updateDamages(); };
  card.appendChild(line);
}

// ── SKELEDIRGE ────────────────────────────────────────────────────────────────
function applySkeledirgAttacker(atkStats, defStats, card) {
  const blazeActive = state.attackerSkeledirgeBlazeActive ?? false;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/skeledirge/blaze.png')}
    <div style="flex:1;">
      ${passiveBadge('Blaze', null, PASSIVE_ATK)}
      Status: <strong style="color:${blazeActive ? C : '#e74c3c'};">${blazeActive ? 'Active' : 'Inactive'}</strong><br>
      <span style="font-size:0.85rem;color:#ccc;">Next move: <strong style="color:${blazeActive ? C : '#aaa'};">35% Sp. Def Pierce</strong> (20s CD)</span><br>
      <button class="blaze-toggle" style="margin-top:8px;padding:6px 16px;background:${blazeActive ? '#ff6f00' : '#2a1a00'};color:${blazeActive ? '#fff' : '#ff9944'};border:1px solid #ff6f00;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.85rem;">
        ${blazeActive ? '🔥 Blaze on' : 'Activate Blaze'}
      </button>
    </div>
  `);
  line.querySelector('.blaze-toggle').onclick = () => {
    state.attackerSkeledirgeBlazeActive = !state.attackerSkeledirgeBlazeActive;
    updateDamages();
  };
  card.appendChild(line);
}

// ── QUAQUAVAL ─────────────────────────────────────────────────────────────────
function applyQuaquavalAttacker(atkStats, defStats, card) {
  const stacks = Math.min(3, state.attackerPassiveStacks || 0);
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/quaquaval/moxie.png')}
    <div style="flex:1;">
      ${passiveBadge('Moxie', null, PASSIVE_ATK)}
      Vibes: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${stacks}</strong>/3
      <button class="stack-btn plus">+</button><br>
      <span style="font-size:0.85rem;color:#ccc;">Attack bonus: <strong style="color:${C};">+${stacks * 5}%</strong></span><br>
      <span style="font-size:0.8rem;color:#aaa;">At max vibes, the next auto-attack becomes Spinning Edge.</span>
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.attackerPassiveStacks < 3) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

export {
  applyBuzzwoleAttacker, applyCeruledgeAttacker, applyChandelureAttacker,
  applyDarkraiAttacker, applyDecidueyeAttacker, applyZardyAttacker,
  applyAegislashAttacker, applyArmarougeAttacker, applyMegaGyaradosAttacker,
  applyMegaLucarioAttacker, applyGyaradosAttacker, applyMachampAttacker,
  applyMeowscaradaAttacker, applyMegaMewtwoAttacker, applyMegaMewtwoYAttacker,
  applyMimikyuAttacker, applyRapidashAttacker, applySirfetchdAttacker,
  applySylveonAttacker, applyTinkatonAttacker, applyTyranitarAttacker,
  applyZeraoraAttacker, applyMoltresAttacker,
  applyTyphlosionAttacker, applySkeledirgAttacker, applyQuaquavalAttacker
};