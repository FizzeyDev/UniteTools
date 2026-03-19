import { state } from './state.js';
import { calculateDamage } from './damageCalculator.js';
import { updateDamages } from './damageDisplay.js';

const ATK_COLOR = '#bb86fc';
const ATK_BG = '#2a2a3a';
const ATK_BORDER = `border-left:4px solid ${ATK_COLOR}`;

function applyBuzzwoleAttacker(atkStats, defStats, card) {
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/buzzwole/beast_boost.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Beast Boost</strong><br>
        Stacks: <button class="stack-btn minus">-</button> <strong style="color:${ATK_COLOR};">${state.attackerPassiveStacks}</strong>/6 <button class="stack-btn plus">+</button>
      </div>
    </div>
  `;
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick = () => { if (state.attackerPassiveStacks < 6) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

function applyCeruledgeAttacker(atkStats, defStats, card) {
  if (state.attackerLevel < 5) return;

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/ceruledge/weak_armor.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Weak Armor</strong><br>
        Stacks: <button class="stack-btn minus">-</button> <strong style="color:${ATK_COLOR};">${state.attackerPassiveStacks}</strong>/6 <button class="stack-btn plus">+</button>
      </div>
    </div>
  `;
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick = () => { if (state.attackerPassiveStacks < 6) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

function applyChandelureAttacker(atkStats, defStats, card) {
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/chandelure/infiltrator.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Infiltrator</strong><br>
        Stacks: <button class="stack-btn minus">-</button> <strong style="color:${ATK_COLOR};">${state.attackerPassiveStacks}</strong>/6 <button class="stack-btn plus">+</button>
        <br>→ Ignore ${(state.attackerPassiveStacks * 5).toFixed(1)}% Sp. Def
      </div>
    </div>
  `;
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick = () => { if (state.attackerPassiveStacks < 6) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

function applyDarkraiAttacker(atkStats, defStats, card) {
  const asleep = state.attackerDarkraiSleep || false;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/darkrai/bad_dreams.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Bad Dreams</strong><br>
        Status: <strong style="color:${asleep ? '#3498db' : '#e74c3c'};">${asleep ? 'Active' : 'Inactive'}</strong><br>
        <button class="sleep-toggle" style="margin-top:8px;padding:6px 14px;background:${asleep ? '#3498db' : '#e74c3c'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${asleep ? 'Asleep' : 'Awake'}
        </button>
      </div>
    </div>
  `;
  line.querySelector('.sleep-toggle').onclick = () => {
    state.attackerDarkraiSleep = !asleep;
    updateDamages();
  };
  card.appendChild(line);
}

function applyDecidueyeAttacker(atkStats, defStats, card) {
  const distant = state.attackerDecidueyeDistant || false;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/decidueye/long_reach.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Long Reach</strong><br>
        Target: <strong style="color:${distant ? ATK_COLOR : '#e67e22'};">${distant ? 'Distant' : 'Close'}</strong><br>
        Damage bonus: <strong>+20%</strong><br>
        <button class="distance-toggle" style="margin-top:8px;padding:6px 14px;background:${distant ? ATK_COLOR : '#e67e22'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${distant ? 'Distant' : 'Close'}
        </button>
      </div>
    </div>
  `;
  line.querySelector('.distance-toggle').onclick = () => {
    state.attackerDecidueyeDistant = !distant;
    updateDamages();
  };
  card.appendChild(line);
}

function applyZardyAttacker(atkStats, defStats, card) {
  const isMega = state.attackerZardyForm === "mega";
  const blazeActive = state.attackerBlazeActive ?? false;
  const droughtActive = state.attackerDroughtActive ?? false;

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;">
        <button class="zardy-normal" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${!isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${!isMega ? 'disabled' : ''}>Normal</button>
        <button class="zardy-mega" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${isMega ? 'disabled' : ''}>Méga</button>
      </div>
      ${!isMega ? `
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="assets/moves/mega_charizard_y/blaze.png" style="width:40px;height:40px;border-radius:6px;">
          <div style="flex:1;">
            <strong style="color:${ATK_COLOR};">Blaze</strong><br>
            Status: <strong style="color:${blazeActive ? '#3498db' : '#e74c3c'};">${blazeActive ? 'Active' : 'Inactive'}</strong><br>
            <button class="blaze-toggle" style="margin-top:8px;padding:8px 16px;background:${blazeActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
              ${blazeActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      ` : `
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="assets/moves/mega_charizard_y/drought.png" style="width:40px;height:40px;border-radius:6px;">
          <div style="flex:1;">
            <strong style="color:${ATK_COLOR};">Drought</strong><br>
            Sunny Area: <strong style="color:${droughtActive ? '#3498db' : '#e74c3c'};">${droughtActive ? 'Active' : 'Inactive'}</strong><br>
            <button class="drought-toggle" style="margin-top:8px;padding:8px 16px;background:${droughtActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
              ${droughtActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      `}
    </div>
  `;
  line.querySelector(".zardy-normal").onclick = () => { state.attackerZardyForm = "normal"; state.attackerDroughtActive = false; updateDamages(); };
  line.querySelector(".zardy-mega").onclick = () => { state.attackerZardyForm = "mega"; state.attackerBlazeActive = false; updateDamages(); };
  if (!isMega) {
    line.querySelector(".blaze-toggle").onclick = () => { state.attackerBlazeActive = !state.attackerBlazeActive; updateDamages(); };
  } else {
    line.querySelector(".drought-toggle").onclick = () => { state.attackerDroughtActive = !state.attackerDroughtActive; updateDamages(); };
  }
  card.appendChild(line);
}

function applyAegislashAttacker(atkStats, defStats, card) {
  if (state.attackerLevel < 7) return;

  const isSword = state.attackerStance === 'sword';
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/aegislash/stance_change.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Stance Change</strong><br>
        Forme: <strong style="color:${isSword ? '#e74c3c' : '#3498db'};">${isSword ? 'Blade' : 'Shield'}</strong><br>
        <button class="stance-toggle" style="margin-top:8px;padding:8px 16px;background:${isSword ? '#3498db' : '#e74c3c'};color:white;border:none;border-radius:6px;cursor:pointer;">
          Switch to ${isSword ? 'Shield' : 'Blade'} Forme
        </button>
      </div>
    </div>
  `;
  line.querySelector('.stance-toggle').onclick = () => { state.attackerStance = isSword ? 'shield' : 'sword'; updateDamages(); };
  card.appendChild(line);
}

function applyArmarougeAttacker(atkStats, defStats, card) {
  const exampleDef = state.currentAttacker.style === "special" ? defStats.sp_def : defStats.def;
  const passive = state.currentAttacker.passive || { extraAutoMultiplier: 60, extraAutoConstant: 120 };
  const flashBonus = calculateDamage(
    { multiplier: passive.extraAutoMultiplier, levelCoef: 0, constant: passive.extraAutoConstant },
    atkStats.sp_atk, exampleDef, state.attackerLevel, false
  );
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/armarouge/flash_fire.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Flash Fire</strong><br>
        Next AA: <strong style="color:${state.attackerFlashFireActive ? '#88ff88' : '#ff6666'};">${state.attackerFlashFireActive ? 'Active' : 'Inactive'}</strong> (+${flashBonus.toLocaleString()} dmg)<br>
        <button class="flashfire-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerFlashFireActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.attackerFlashFireActive ? 'Deactivate' : 'Activate'} proc
        </button>
      </div>
    </div>
  `;
  line.querySelector('.flashfire-toggle').onclick = () => { state.attackerFlashFireActive = !state.attackerFlashFireActive; updateDamages(); };
  card.appendChild(line);
}

function applyMegaGyaradosAttacker(atkStats, defStats, card) {
  const passive = state.currentAttacker.passive;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/mega_gyarados/intimidate.png" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Intimidate</strong><br>
        HP +1200, Atk +100<br>
        <button class="intimidate-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerMegaGyaradosEvolve ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.attackerMegaGyaradosEvolve ? 'Gyarados' : 'Magikarp'}
        </button>
      </div>
    </div>
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">${passive.name}</strong><br>
        Atk +${passive.bonusPercentAtk}% · Def Pen +${passive.bonusDefPen}%<br>
        <button class="moldbreaker-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerMoldBreakerActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.attackerMoldBreakerActive ? 'Mega Evolve' : 'Normal'}
        </button>
      </div>
    </div>
  `;
  line.querySelector('.intimidate-toggle').onclick = () => { state.attackerMegaGyaradosEvolve = !state.attackerMegaGyaradosEvolve; updateDamages(); };
  line.querySelector('.moldbreaker-toggle').onclick = () => { state.attackerMoldBreakerActive = !state.attackerMoldBreakerActive; updateDamages(); };
  card.appendChild(line);
}

function applyMegaLucarioAttacker(atkStats, defStats, card) {
  const isMega = state.attackerLucarioForm === "mega";
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;">
        <button class="lucario-normal" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${!isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${!isMega ? 'disabled' : ''}>Normal</button>
        <button class="lucario-mega" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${isMega ? 'disabled' : ''}>Méga</button>
      </div>
      ${!isMega ? `
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="assets/moves/mega_lucario/justified.png" style="width:40px;height:40px;border-radius:6px;">
          <div style="flex:1;">
            <strong style="color:${ATK_COLOR};">Justified</strong><br>
            Stacks: <button class="stack-btn minus just-minus">-</button> <strong style="color:${ATK_COLOR};">${state.attackerLucarioJustifiedStacks}</strong>/4 <button class="stack-btn plus just-plus">+</button>
            <br>→ Atk +${state.attackerLucarioJustifiedStacks * 8}%
          </div>
        </div>
      ` : `
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="assets/moves/mega_lucario/adaptability.png" style="width:40px;height:40px;border-radius:6px;">
          <div style="flex:1;">
            <strong style="color:${ATK_COLOR};">Adaptability</strong><br>
            Stacks: <button class="stack-btn minus adapt-minus">-</button> <strong style="color:${ATK_COLOR};">${state.attackerLucarioAdaptabilityStacks}</strong>/10 <button class="stack-btn plus adapt-plus">+</button>
            <br>→ Atk +${state.attackerLucarioAdaptabilityStacks * 5}%
          </div>
        </div>
      `}
    </div>
  `;
  line.querySelector(".lucario-normal").onclick = () => { state.attackerLucarioForm = "normal"; state.attackerLucarioAdaptabilityStacks = 0; updateDamages(); };
  line.querySelector(".lucario-mega").onclick = () => { state.attackerLucarioForm = "mega"; state.attackerLucarioJustifiedStacks = 0; updateDamages(); };
  if (!isMega) {
    line.querySelector(".just-minus").onclick = () => { if (state.attackerLucarioJustifiedStacks > 0) { state.attackerLucarioJustifiedStacks--; updateDamages(); } };
    line.querySelector(".just-plus").onclick = () => { if (state.attackerLucarioJustifiedStacks < 4) { state.attackerLucarioJustifiedStacks++; updateDamages(); } };
  } else {
    line.querySelector(".adapt-minus").onclick = () => { if (state.attackerLucarioAdaptabilityStacks > 0) { state.attackerLucarioAdaptabilityStacks--; updateDamages(); } };
    line.querySelector(".adapt-plus").onclick = () => { if (state.attackerLucarioAdaptabilityStacks < 10) { state.attackerLucarioAdaptabilityStacks++; updateDamages(); } };
  }
  card.appendChild(line);
}

function applyGyaradosAttacker(atkStats, defStats, card) {
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/gyarados/moxie.png" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Moxie</strong><br>
        HP +1200, Atk +100<br>
        <button class="moxie-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerGyaradosEvolve ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.attackerGyaradosEvolve ? 'Gyarados' : 'Magikarp'}
        </button>
      </div>
    </div>
  `;
  line.querySelector('.moxie-toggle').onclick = () => { state.attackerGyaradosEvolve = !state.attackerGyaradosEvolve; updateDamages(); };
  card.appendChild(line);
}

function applyMachampAttacker(atkStats, defStats, card) {
  const passive = state.currentAttacker.passive;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">${passive.name}</strong><br>
        ${passive.description}<br>
        <button class="guts-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerMachampActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.attackerMachampActive ? 'Debuff' : 'Not debuff'}
        </button>
      </div>
    </div>
  `;
  line.querySelector('.guts-toggle').onclick = () => { state.attackerMachampActive = !state.attackerMachampActive; updateDamages(); };
  card.appendChild(line);
}

function applyMeowscaradaAttacker(atkStats, defStats, card) {
  const passive = state.currentAttacker.passive;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">${passive.name}</strong><br>
        ${passive.description}<br>
        <button class="overgrow-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerMeowscaradaActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.attackerMeowscaradaActive ? 'Activate' : 'Deactivate'}
        </button>
      </div>
    </div>
  `;
  line.querySelector('.overgrow-toggle').onclick = () => { state.attackerMeowscaradaActive = !state.attackerMeowscaradaActive; updateDamages(); };
  card.appendChild(line);
}

function applyMegaMewtwoAttacker(atkStats, hpStats, card) {
  const isMega = state.attackerMewtwoForm === "mega";
  const stacks = state.attackerMewtwoPressureStacks;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;">
        <button class="mewtwo-normal" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${!isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${!isMega ? 'disabled' : ''}>Normal</button>
        <button class="mewtwo-mega" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${isMega ? 'disabled' : ''}>Méga</button>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="assets/moves/mega_mewtwo_x/pressure.png" style="width:40px;height:40px;border-radius:6px;">
        <div style="flex:1;">
          <strong style="color:${ATK_COLOR};">Pressure</strong><br>
          Stacks: <button class="stack-btn minus pressure-minus">-</button> <strong style="color:${ATK_COLOR};">${stacks}</strong>/10 <button class="stack-btn plus pressure-plus">+</button><br>
          → Atk +${stacks * 2}%
          ${isMega ? `<br>→ Méga bonus: Atk +18% | HP +10%` : ""}
        </div>
      </div>
    </div>
  `;
  line.querySelector(".mewtwo-normal").onclick = () => { state.attackerMewtwoForm = "normal"; updateDamages(); };
  line.querySelector(".mewtwo-mega").onclick = () => { state.attackerMewtwoForm = "mega"; updateDamages(); };
  line.querySelector(".pressure-minus").onclick = () => { if (state.attackerMewtwoPressureStacks > 0) { state.attackerMewtwoPressureStacks--; updateDamages(); } };
  line.querySelector(".pressure-plus").onclick = () => { if (state.attackerMewtwoPressureStacks < 10) { state.attackerMewtwoPressureStacks++; updateDamages(); } };
  card.appendChild(line);
}

function applyMegaMewtwoYAttacker(atkStats, hpStats, card) {
  const isMega = state.attackerMewtwoYForm === "mega";
  const stacks = state.attackerMewtwoYPressureStacks;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;">
        <button class="mewtwo-y-normal" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${!isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${!isMega ? 'disabled' : ''}>Normal</button>
        <button class="mewtwo-y-mega" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${isMega ? 'disabled' : ''}>Méga</button>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="assets/moves/mega_mewtwo_x/pressure.png" style="width:40px;height:40px;border-radius:6px;">
        <div style="flex:1;">
          <strong style="color:${ATK_COLOR};">Pressure</strong><br>
          Stacks: <button class="stack-btn minus pressure-minus">-</button> <strong style="color:${ATK_COLOR};">${stacks}</strong>/10 <button class="stack-btn plus pressure-plus">+</button><br>
          → Sp.Atk +${stacks * 1.5}%
          ${isMega ? `<br>→ Méga bonus: Sp.Atk +10% | HP +10%` : ""}
        </div>
      </div>
    </div>
  `;
  line.querySelector(".mewtwo-y-normal").onclick = () => { state.attackerMewtwoYForm = "normal"; updateDamages(); };
  line.querySelector(".mewtwo-y-mega").onclick = () => { state.attackerMewtwoYForm = "mega"; updateDamages(); };
  line.querySelector(".pressure-minus").onclick = () => { if (state.attackerMewtwoYPressureStacks > 0) { state.attackerMewtwoYPressureStacks--; updateDamages(); } };
  line.querySelector(".pressure-plus").onclick = () => { if (state.attackerMewtwoYPressureStacks < 10) { state.attackerMewtwoYPressureStacks++; updateDamages(); } };
  card.appendChild(line);
}

function applyMimikyuAttacker(atkStats, defStats, card) {
  const passive = state.currentAttacker.passive;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">${passive.name}</strong><br>
        ${passive.description}<br>
        <button class="disguise-toggle" style="margin-top:8px;padding:8px 16px;background:${state.attackerMimikyuActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.attackerMimikyuActive ? 'Activate' : 'Deactivate'}
        </button>
      </div>
    </div>
  `;
  line.querySelector('.disguise-toggle').onclick = () => { state.attackerMimikyuActive = !state.attackerMimikyuActive; updateDamages(); };
  card.appendChild(line);
}

function applyRapidashAttacker(atkStats, defStats, card) {
  const passive = state.currentAttacker.passive;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">${passive.name}</strong><br>
        ${passive.description}<br>
        Stacks: <button class="stack-btn minus">-</button> <strong style="color:${ATK_COLOR};">${state.attackerRapidashStacks}</strong>/5 <button class="stack-btn plus">+</button>
      </div>
    </div>
  `;
  line.querySelector('.minus').onclick = () => { if (state.attackerRapidashStacks > 0) { state.attackerRapidashStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick = () => { if (state.attackerRapidashStacks < 6) { state.attackerRapidashStacks++; updateDamages(); } };
  card.appendChild(line);
}

function applySirfetchdAttacker(atkStats, defStats, card) {
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/sirfetchd/steadfast.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Steadfast</strong><br>
        Stacks: <button class="stack-btn minus">-</button> <strong style="color:${ATK_COLOR};">${state.attackerPassiveStacks}</strong>/5 <button class="stack-btn plus">+</button>
        <br>→ +${(state.attackerPassiveStacks * 5).toFixed(1)}% Critical-Hit Rate
      </div>
    </div>
  `;
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick = () => { if (state.attackerPassiveStacks < 5) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

function applySylveonAttacker(atkStats, defStats, card) {
  const level = state.attackerLevel;
  const isEevee = level <= 3;

  const stacks = state.attackerPassiveStacks;
  const maxStacks = isEevee ? 4 : 6;
  const passiveName = isEevee ? "Adaptability" : "Pixilate";
  const passiveImg = isEevee
    ? "assets/moves/sylveon/adaptability.png"
    : "assets/moves/sylveon/pixilate.png";

  const spAtkPercent = isEevee ? stacks * 5 : stacks * 2.5;
  const bonusLine = isEevee
    ? `→ Sp. Atk +${spAtkPercent.toFixed(0)}%`
    : `→ Sp. Atk +${spAtkPercent.toFixed(1)}%`;

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passiveImg}" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">${passiveName}</strong><br>
        Stacks: <button class="stack-btn minus">-</button> <strong style="color:${ATK_COLOR};">${stacks}</strong>/${maxStacks} <button class="stack-btn plus">+</button>
        <br>${bonusLine}
      </div>
    </div>
  `;

  line.querySelector('.minus').onclick = () => {
    if (state.attackerPassiveStacks > 0) {
      state.attackerPassiveStacks--;
      updateDamages();
    }
  };
  line.querySelector('.plus').onclick = () => {
    if (state.attackerPassiveStacks < maxStacks) {
      state.attackerPassiveStacks++;
      updateDamages();
    }
  };

  card.appendChild(line);
}

function applyTinkatonAttacker(atkStats, defStats, card) {
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/tinkaton/mold_breaker.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Mold Breaker</strong><br>
        Stacks: <button class="stack-btn minus">-</button> <strong style="color:${ATK_COLOR};">${state.attackerPassiveStacks}</strong>/60 <button class="stack-btn plus">+</button>
        <br>→ +${(state.attackerPassiveStacks * 0.5).toFixed(1)}% Atk
    </div>
  `;
  line.querySelector('.minus').onclick = () => { if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick = () => { if (state.attackerPassiveStacks < 60) { state.attackerPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

function applyTyranitarAttacker(atkStats, defStats, card) {
  const level = state.attackerLevel;
  const isLarvitar = level <= 5;

  if (!isLarvitar) return;

  const gutsActive = state.attackerTyranitarGutsActive || false;

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/tyranitar/guts.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Guts</strong><br>
        Status: <strong style="color:${gutsActive ? '#88ff88' : '#ff6666'};">${gutsActive ? 'Active' : 'Inactive'}</strong><br>
        → Atk +30%<br>
        <button class="guts-toggle" style="margin-top:8px;padding:8px 16px;background:${gutsActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${gutsActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  `;

  line.querySelector('.guts-toggle').onclick = () => {
    state.attackerTyranitarGutsActive = !gutsActive;
    updateDamages();
  };

  card.appendChild(line);
}

function applyZeraoraAttacker(atkStats, defStats, card) {
  const damageReceived = state.attackerZeraoraDamageReceived ?? 0;
  const bonusAtk = Math.min(Math.floor(damageReceived * 0.08), 200);

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/zeraora/volt_absorb.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Volt Absorb</strong><br>
        <label style="font-size:0.9rem;">
          Damage received: <strong class="zeraora-display">${damageReceived}</strong> / 2500
          &nbsp;→ Atk +<strong class="zeraora-bonus">${bonusAtk}</strong>
        </label>
        <input type="range" class="zeraora-slider hp-slider" min="0" max="2500" step="1" value="${damageReceived}"
          style="width:100%;margin-top:6px;touch-action:none;">
      </div>
    </div>
  `;

  const slider = line.querySelector('.zeraora-slider');
  const display = line.querySelector('.zeraora-display');
  const bonusDisplay = line.querySelector('.zeraora-bonus');

  slider.addEventListener('pointerdown', (e) => {
    slider.setPointerCapture(e.pointerId);
  });

  slider.addEventListener('pointermove', (e) => {
    if (!e.buttons) return;
    const rect = slider.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const value = Math.round(ratio * 2500);
    slider.value = value;
    state.attackerZeraoraDamageReceived = value;
    const bonus = Math.min(Math.floor(value * 0.08), 200);
    display.textContent = value;
    bonusDisplay.textContent = bonus;
    updateDamages();
  });

  slider.addEventListener('pointerup', () => {
    updateDamages();
  });

  card.appendChild(line);
}

function applyCrustleAttacker(atkStats, defStats, card) {
  const level = state.attackerLevel;

  const passive = state.currentAttacker.passive;
  const missingHpPercent = 100 - state.attackerHPPercent;
  const stacks = Math.min(passive.stack.maxStacks, Math.floor(missingHpPercent / passive.stack.missingHpPercentPerStack));
  const bonusPerStack = 2 * (level - 1) + 6;
  const totalBonus = bonusPerStack * stacks;

  const baseStats = state.currentAttacker.stats[level - 1];
  const conversionRate = state.attackerShellSmashUpgraded ? 0.50 : 0.40;
  const atkBonus   = Math.floor(baseStats.def    * conversionRate);
  const spAtkBonus = Math.floor(baseStats.sp_def * conversionRate);

  if (state.attackerShellSmashActive) {
    atkStats.atk    += atkBonus;
    atkStats.sp_atk += spAtkBonus;
  }

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/crustle/shell_smash.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Shell Smash</strong>
        ${level >= 11 ? `<span style="font-size:0.75rem;color:#ffd740;margin-left:6px;">⬆️ Upgraded (50%)</span>` : `<span style="font-size:0.75rem;color:#aaa;margin-left:6px;">(40% · upgrades at lvl 11)</span>`}<br>
        <span style="font-size:0.85rem;color:#ccc;">Def/SpDef → 0 · Atk +${atkBonus} · SpAtk +${spAtkBonus}</span><br>
        <button class="shell-smash-toggle" style="
          margin-top:6px;padding:4px 14px;border-radius:6px;border:none;cursor:pointer;font-weight:bold;font-size:0.85rem;
          background:${state.attackerShellSmashActive ? '#bb86fc' : '#444'};
          color:${state.attackerShellSmashActive ? '#000' : '#ccc'};
        ">${state.attackerShellSmashActive ? '✓ Active' : 'Activate'}</button>
        ${stacks > 0 ? `<br><span style="font-size:0.8rem;color:#64b5f6;">Sturdy: ${stacks} stack(s) · Def/SpDef +${totalBonus} (as defender)</span>` : ''}
      </div>
    </div>
  `;

  line.querySelector('.shell-smash-toggle').onclick = () => {
    state.attackerShellSmashActive = !state.attackerShellSmashActive;
    updateDamages();
  };

  card.appendChild(line);
}

// ── MOLTRES ───────────────────────────────────────────────────────────────────

function applyMoltresAttacker(atkStats, defStats, card) {
  const passive = state.currentAttacker.passive;
  const stacks  = state.attackerPassiveStacks; // 0–5

  // Calcul d'un tick de brûlure : sp_atk * ratio% + base
  const burnPerTick = Math.floor(atkStats.sp_atk * passive.burnTickRatio / 100) + (passive.burnTickBase || 0);
  // Les ticks actifs = stacks × 2 (1 tick toutes les 0.5s pendant 4s → 8 max, mais plafonné par les stacks)
  const activeTicks = stacks * 2;
  const burnTotal   = burnPerTick * activeTicks;

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${ATK_BG};border-radius:8px;${ATK_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${ATK_COLOR};">Flame Body</strong><br>
        Burn stacks: <button class="stack-btn minus">-</button>
        <strong style="color:${ATK_COLOR};">${stacks}</strong>/${passive.burnMaxStacks}
        <button class="stack-btn plus">+</button><br>
        <span style="font-size:0.85rem;color:#ccc;">
          Tick (×${passive.burnTickInterval}s) :
          <strong style="color:#ff9944;">${burnPerTick.toLocaleString()}</strong>
          ${stacks > 0 ? `— Total : <strong style="color:#ff9944;">${burnTotal.toLocaleString()}</strong> (${activeTicks} ticks)` : ''}
        </span>
        ${stacks > 0 ? `<br><span style="color:#ffd740;font-size:0.85rem;">+${stacks * 10}% dmg on Incinerate / Heat Wave</span>` : ''}
      </div>
    </div>
  `;

  line.querySelector('.minus').onclick = () => {
    if (state.attackerPassiveStacks > 0) { state.attackerPassiveStacks--; updateDamages(); }
  };
  line.querySelector('.plus').onclick = () => {
    if (state.attackerPassiveStacks < passive.burnMaxStacks) { state.attackerPassiveStacks++; updateDamages(); }
  };

  card.appendChild(line);
}

export {
  applyBuzzwoleAttacker,
  applyCeruledgeAttacker,
  applyChandelureAttacker,
  applyDarkraiAttacker,
  applyDecidueyeAttacker,
  applyZardyAttacker,
  applyAegislashAttacker,
  applyArmarougeAttacker,
  applyMegaGyaradosAttacker,
  applyMegaLucarioAttacker,
  applyGyaradosAttacker,
  applyMachampAttacker,
  applyMeowscaradaAttacker,
  applyMegaMewtwoAttacker,
  applyMegaMewtwoYAttacker,
  applyMimikyuAttacker,
  applyRapidashAttacker,
  applySirfetchdAttacker,
  applySylveonAttacker,
  applyTinkatonAttacker,
  applyTyranitarAttacker,
  applyZeraoraAttacker,
  applyCrustleAttacker,
  applyMoltresAttacker
};