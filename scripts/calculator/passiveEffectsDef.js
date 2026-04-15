import { state } from './state.js';
import { updateDamages } from './damageDisplay.js';

const DEF_COLOR = '#ff9d00';
const DEF_BG = '#2a1f0f';
const DEF_BORDER = `border-left:4px solid ${DEF_COLOR}`;

function applyAegislashDefender(atkStats, defStats, card) {
  if (state.attackerLevel < 7) return;

  const isSword = state.defenderStance === 'sword';
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/aegislash/stance_change.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">Stance Change</strong><br>
        Forme: <strong style="color:${isSword ? '#e74c3c' : '#3498db'};">${isSword ? 'Blade' : 'Shield'}</strong><br>
        <button class="stance-toggle" style="margin-top:8px;padding:8px 16px;background:${isSword ? '#3498db' : '#e74c3c'};color:white;border:none;border-radius:6px;cursor:pointer;">
          Switch to ${isSword ? 'Shield' : 'Blade'} Forme
        </button>
      </div>
    </div>
  `;
  line.querySelector('.stance-toggle').onclick = () => { state.defenderStance = isSword ? 'shield' : 'sword'; updateDamages(); };
  card.appendChild(line);
}

function applyArmarougeDefender(atkStats, defStats, card) {
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/armarouge/flash_fire.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">Flash Fire</strong><br>
        Damage Reduction: <strong style="color:${state.defenderFlashFireActive ? '#88ff88' : '#ff6666'};">${state.defenderFlashFireActive ? '20%' : '0%'}</strong><br>
        <button class="flashfire-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderFlashFireActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.defenderFlashFireActive ? 'Deactivate' : 'Activate'} reduction
        </button>
      </div>
    </div>
  `;
  line.querySelector('.flashfire-toggle').onclick = () => { state.defenderFlashFireActive = !state.defenderFlashFireActive; updateDamages(); };
  card.appendChild(line);
}

function applyArticunoDefender(atkStats, defStats, card) {
  const snowCloakState = state.defenderSnowCloakState || "none"; // "none" | "low" | "high"

  // La réduction de dégâts est appliquée via defenderDamageMult dans damageDisplay.js
  // On n'impacte plus defStats.def / defStats.sp_def ici

  const labels = {
    none: { label: "Inactive",                          color: "#7f8c8d", desc: "No reduction"      },
    low:  { label: "Ice Shard / Ice Beam (10%)",        color: "#4fc3f7", desc: "−10% damage taken" },
    high: { label: "Icy Wind / Blizzard / Unite (20%)", color: "#81d4fa", desc: "−20% damage taken" },
  };
  const current = labels[snowCloakState];

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/articuno/snow_cloak.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">Snow Cloak</strong><br>
        Status: <strong style="color:${current.color};">${current.label}</strong><br>
        <span style="font-size:0.85em;color:#aaa;">${current.desc}</span><br>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          <button class="snowcloak-btn" data-state="none"
            style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;
            background:${snowCloakState === 'none' ? '#7f8c8d' : '#444'};color:white;">
            Off
          </button>
          <button class="snowcloak-btn" data-state="low"
            style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;
            background:${snowCloakState === 'low' ? '#4fc3f7' : '#444'};color:white;">
            −10% (Move 2)
          </button>
          <button class="snowcloak-btn" data-state="high"
            style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;
            background:${snowCloakState === 'high' ? '#81d4fa' : '#444'};color:white;">
            −20% (Move 1 / Unite)
          </button>
        </div>
      </div>
    </div>
  `;

  line.querySelectorAll('.snowcloak-btn').forEach(btn => {
    btn.onclick = () => { state.defenderSnowCloakState = btn.dataset.state; updateDamages(); };
  });

  card.appendChild(line);
}

function applyZardxDefender(atkStats, defStats, card) {
  const passive = state.currentDefender.passive;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">${passive.name}</strong><br>
        Def +${passive.bonusPercentDef}% · SpDef +${passive.bonusPercentSpDef}%<br>
        <button class="toughclaw-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderZardToughClaw ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.defenderZardToughClaw ? 'Mega Evolve' : 'Normal'}
        </button>
      </div>
    </div>
  `;
  line.querySelector('.toughclaw-toggle').onclick = () => { state.defenderZardToughClaw = !state.defenderZardToughClaw; updateDamages(); };
  card.appendChild(line);
}

function applyMegaGyaradosDefender(atkStats, defStats, card) {
  const passive = state.currentDefender.passive;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/mega_gyarados/intimidate.png" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">Intimidate</strong><br>
        HP +1200, Atk +100<br>
        <button class="intimidate-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderMegaGyaradosEvolve ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.defenderMegaGyaradosEvolve ? 'Gyarados' : 'Magikarp'}
        </button>
      </div>
    </div>
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">${passive.name}</strong><br>
        Def +${passive.bonusPercentDef}% · SpDef +${passive.bonusPercentSpDef}%<br>
        <button class="moldbreaker-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderMoldBreakerActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.defenderMoldBreakerActive ? 'Mega Evolve' : 'Normal'}
        </button>
      </div>
    </div>
  `;
  line.querySelector('.intimidate-toggle').onclick = () => { state.defenderMegaGyaradosEvolve = !state.defenderMegaGyaradosEvolve; updateDamages(); };
  line.querySelector('.moldbreaker-toggle').onclick = () => { state.defenderMoldBreakerActive = !state.defenderMoldBreakerActive; updateDamages(); };
  card.appendChild(line);
}

function applyGyaradosDefender(atkStats, defStats, card) {
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/gyarados/moxie.png" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">Moxie</strong><br>
        HP +1200, Atk +100<br>
        <button class="moxiedef-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderGyaradosEvolve ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.defenderGyaradosEvolve ? 'Gyarados' : 'Magikarp'}
        </button>
      </div>
    </div>
  `;
  line.querySelector('.moxiedef-toggle').onclick = () => { state.defenderGyaradosEvolve = !state.defenderGyaradosEvolve; updateDamages(); };
  card.appendChild(line);
}

function applyCrustleDefender(atkStats, defStats, card) {
  const passive = state.currentDefender.passive;
  const missingHpPercent = 100 - state.defenderHPPercent;
  const stacks = Math.min(passive.stack.maxStacks, Math.floor(missingHpPercent / passive.stack.missingHpPercentPerStack));
  const level = state.defenderLevel;
  const bonusPerStack = 2 * (level - 1) + 6;
  const totalBonus = bonusPerStack * stacks;

  defStats.def += totalBonus;
  defStats.sp_def += totalBonus;

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">${passive.name}</strong><br>
        ${stacks} stack(s)<br>
        Def +${totalBonus} · SpDef +${totalBonus}
      </div>
    </div>
  `;
  card.appendChild(line);
}

function applyDragoniteDefender(atkStats, defStats, card) {
  const level = state.defenderLevel;
  const marvelActive = state.defenderMarvelScaleActive || false;
  const multiscaleActive = state.defenderMultiscaleActive || false;

  let content = "";

  if (level <= 8) {
    if (marvelActive) defStats.def += 100;
    content += `
      <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
        <img src="assets/moves/dragonite/marvel_scale.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
        <div style="flex:1;">
          <strong style="color:${DEF_COLOR};">Marvel Scale</strong><br>
          Status condition: <strong style="color:${marvelActive ? '#3498db' : '#e74c3c'};">${marvelActive ? 'Afflicted' : 'None'}</strong><br>
          Def +100<br>
          <button class="marvel-toggle" style="margin-top:8px;padding:6px 14px;background:${marvelActive ? '#3498db' : '#e74c3c'};color:white;border:none;border-radius:6px;cursor:pointer;">
            ${marvelActive ? 'Remove Status' : 'Apply Status'}
          </button>
        </div>
      </div>
    `;
  }

  if (level >= 9) {
    content += `
      <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
        <img src="assets/moves/dragonite/multiscale.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
        <div style="flex:1;">
          <strong style="color:${DEF_COLOR};">Multiscale</strong><br>
          Buff: <strong style="color:${multiscaleActive ? '#3498db' : '#e74c3c'};">${multiscaleActive ? 'Active' : 'Inactive'}</strong><br>
          Damage taken −30%<br>
          <button class="multiscale-toggle" style="margin-top:8px;padding:6px 14px;background:${multiscaleActive ? '#3498db' : '#e74c3c'};color:white;border:none;border-radius:6px;cursor:pointer;">
            ${multiscaleActive ? 'Disable Buff' : 'Enable Buff'}
          </button>
        </div>
      </div>
    `;
  }

  if (!content) return;

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = content;

  if (level <= 8) {
    line.querySelector('.marvel-toggle')?.addEventListener('click', () => { state.defenderMarvelScaleActive = !marvelActive; updateDamages(); });
  }
  if (level >= 9) {
    line.querySelector('.multiscale-toggle')?.addEventListener('click', () => { state.defenderMultiscaleActive = !multiscaleActive; updateDamages(); });
  }

  card.appendChild(line);
}

function applyLaprasDefender(atkStats, defStats, card) {
  const passive = state.currentDefender.passive;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">${passive.name}</strong><br>
        ${passive.description}
      </div>
    </div>
  `;
  card.appendChild(line);
}

function applyMamoswineDefender(atkStats, defStats, card) {
  const passive = state.currentDefender.passive;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">${passive.name}</strong><br>
        Stacks: <button class="stack-btn minus">-</button> <strong style="color:${DEF_COLOR};">${state.defenderPassiveStacks}</strong>/3 <button class="stack-btn plus">+</button>
      </div>
    </div>
  `;
  line.querySelector('.minus').onclick = () => { if (state.defenderPassiveStacks > 0) { state.defenderPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick = () => { if (state.defenderPassiveStacks < 3) { state.defenderPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

function applyMegaMewtwoDefender(atkStats, hpStats, card) {
  const isMega = state.defenderMewtwoForm === "mega";
  const stacks = state.defenderMewtwoPressureStacks;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;">
        <button class="mewtwo-normal" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${!isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${!isMega ? 'disabled' : ''}>Normal</button>
        <button class="mewtwo-mega" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${isMega ? '#7f8c8d' : '#27ae60'};color:white;" ${isMega ? 'disabled' : ''}>Méga</button>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="assets/moves/mega_mewtwo_x/pressure.png" style="width:40px;height:40px;border-radius:6px;">
        <div style="flex:1;">
          <strong style="color:${DEF_COLOR};">Pressure</strong><br>
          Stacks: <button class="stack-btn minus pressure-minus">-</button> <strong style="color:${DEF_COLOR};">${stacks}</strong>/10 <button class="stack-btn plus pressure-plus">+</button><br>
          → Def / Sp.Def +${stacks * 2}%
          ${isMega ? `<br>→ Méga bonus: Def / Sp.Def +18% | HP +10%` : ""}
        </div>
      </div>
    </div>
  `;
  line.querySelector(".mewtwo-normal").onclick = () => { state.defenderMewtwoForm = "normal"; updateDamages(); };
  line.querySelector(".mewtwo-mega").onclick = () => { state.defenderMewtwoForm = "mega"; updateDamages(); };
  line.querySelector(".pressure-minus").onclick = () => { if (state.defenderMewtwoPressureStacks > 0) { state.defenderMewtwoPressureStacks--; updateDamages(); } };
  line.querySelector(".pressure-plus").onclick = () => { if (state.defenderMewtwoPressureStacks < 10) { state.defenderMewtwoPressureStacks++; updateDamages(); } };
  card.appendChild(line);
}

function applyMegaMewtwoYDefender(atkStats, hpStats, card) {
  const isMega = state.defenderMewtwoYForm === "mega";
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/mega_mewtwo_y/pressure.png" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">Pressure</strong><br>
        Forme: <strong style="color:${isMega ? '#27ae60' : '#7f8c8d'};">${isMega ? 'Mega' : 'Normal'}</strong><br>
        ${isMega ? 'HP +10%' : 'No bonus'}<br>
        <button class="mewtwoy-toggle" style="margin-top:8px;padding:8px 16px;background:${isMega ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${isMega ? 'Normal' : 'Méga Evolution'}
        </button>
      </div>
    </div>
  `;
  line.querySelector(".mewtwoy-toggle").onclick = () => { state.defenderMewtwoYForm = isMega ? "normal" : "mega"; updateDamages(); };
  card.appendChild(line);
}

function applyMimeDefender(atkStats, defStats, card) {
  const passive = state.currentDefender.passive;
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passive.image}" style="width:40px;height:40px;border-radius:6px;">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">${passive.name}</strong><br>
        ${passive.description}<br>
        <button class="filter-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderMimeActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.defenderMimeActive ? 'Activate' : 'Deactivate'}
        </button>
      </div>
    </div>
  `;
  line.querySelector('.filter-toggle').onclick = () => { state.defenderMimeActive = !state.defenderMimeActive; updateDamages(); };
  card.appendChild(line);
}

function applySylveonDefender(atkStats, defStats, card) {
  const level = state.defenderLevel;
  const isEevee = level <= 3;

  if (isEevee) return;

  const stacks = state.defenderPassiveStacks;
  const maxStacks = 6;
  const passiveName = "Pixilate";
  const passiveImg = "assets/moves/sylveon/pixilate.png";

  const spAtkPercent = isEevee ? stacks * 5 : stacks * 2.5;
  const bonusLine = `→ Sp. Def +${spAtkPercent.toFixed(1)}%`;

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="${passiveImg}" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">${passiveName}</strong><br>
        Stacks: <button class="stack-btn minus">-</button> <strong style="color:${DEF_COLOR};">${stacks}</strong>/${maxStacks} <button class="stack-btn plus">+</button>
        <br>${bonusLine}
      </div>
    </div>
  `;

  line.querySelector('.minus').onclick = () => {
    if (state.defenderPassiveStacks > 0) {
      state.defenderPassiveStacks--;
      updateDamages();
    }
  };
  line.querySelector('.plus').onclick = () => {
    if (state.defenderPassiveStacks < maxStacks) {
      state.defenderPassiveStacks++;
      updateDamages();
    }
  };

  card.appendChild(line);
}

function applyTyranitarDefender(atkStats, defStats, card) {
  const level = state.defenderLevel;
  const isTyranitar = level >= 9;

  if (!isTyranitar) return;

  const sandActive = state.defenderTyranitarSandStreamActive || false;

  if (sandActive) {
    defStats.def = Math.floor(defStats.def * 1.65);
    defStats.sp_def = Math.floor(defStats.sp_def * 1.65);
  }

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/tyranitar/sand_stream.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">Sand Stream</strong><br>
        Status: <strong style="color:${sandActive ? '#88ff88' : '#ff6666'};">${sandActive ? 'Active' : 'Inactive'}</strong><br>
        → Def +65% · Sp. Def +65%<br>
        <button class="sand-toggle" style="margin-top:8px;padding:8px 16px;background:${sandActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${sandActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  `;

  line.querySelector('.sand-toggle').onclick = () => {
    state.defenderTyranitarSandStreamActive = !sandActive;
    updateDamages();
  };

  card.appendChild(line);
}

function applyUmbreonDefender(atkStats, defStats, card) {
  const level = state.defenderLevel;
  const isUmbreon = level >= 4;

  if (!isUmbreon) return;

  const innerFocusActive = state.defenderUmbreonInnerFocusActive || false;

  if (innerFocusActive) {
    defStats.def = Math.floor(defStats.def * 1.30);
    defStats.sp_def = Math.floor(defStats.sp_def * 1.30);
  }

  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/umbreon/inner_focus.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">Inner Focus</strong><br>
        Status: <strong style="color:${innerFocusActive ? '#88ff88' : '#ff6666'};">${innerFocusActive ? 'Active' : 'Inactive'}</strong><br>
        → Def +30% · Sp. Def +30%<br>
        <button class="innerfocus-toggle" style="margin-top:8px;padding:8px 16px;background:${innerFocusActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${innerFocusActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  `;

  line.querySelector('.innerfocus-toggle').onclick = () => {
    state.defenderUmbreonInnerFocusActive = !innerFocusActive;
    updateDamages();
  };

  card.appendChild(line);
}

function applyGarchompDefender(atkStats, defStats, card) {
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;align-items:center;gap:12px;">
      <img src="assets/moves/garchomp/rough_skin.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
      <div style="flex:1;">
        <strong style="color:${DEF_COLOR};">Rough Skin</strong><br>
        Melee hit: reflects <strong style="color:#ff9d00;">30%</strong> of damage received<br>
        <span style="font-size:0.85em;color:#aaa;">(Attack-based · 2s CD · Melee only)</span>
      </div>
    </div>
  `;
  card.appendChild(line);
}

function applyFalinksDefender(atkStats, defStats, card) {
  const target = state.defenderFalinksTarget || "brass";
  const multiHit = state.defenderFalinksMultiHit || false;

  if (target === "brass") {
    defStats.def = Math.floor(defStats.def / 0.90);
    defStats.sp_def = Math.floor(defStats.sp_def / 0.90);
  } else if (target === "trooper_attached") {
    defStats.def = Math.floor(defStats.def / 0.10);
    defStats.sp_def = Math.floor(defStats.sp_def / 0.10);
  }

  const targetLabels = {
    brass: { label: "Brass", color: "#e67e22", desc: "-10% damage" },
    trooper_attached: { label: "Trooper (attaché)", color: "#27ae60", desc: "-90% damage" },
    trooper_detached: { label: "Trooper (détaché)", color: "#e74c3c", desc: "No reduction" }
  };
  const t = targetLabels[target];
  const line = document.createElement("div");
  line.className = "global-bonus-line";
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${DEF_BG};border-radius:8px;${DEF_BORDER};display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="assets/moves/falinks/battle_armor.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">
        <div>
          <strong style="color:${DEF_COLOR};">Battle Armor</strong><br>
          <span style="color:#ff9999;">Crit x0.5</span>
        </div>
      </div>

      <div>
        <div style="margin-bottom:6px;color:#ccc;font-size:0.9em;">Target Hit :</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="falinks-target" data-target="brass"
            style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;
            background:${target === 'brass' ? '#e67e22' : '#555'};color:white;">
            Brass (-10%)
          </button>
          <button class="falinks-target" data-target="trooper_attached"
            style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;
            background:${target === 'trooper_attached' ? '#27ae60' : '#555'};color:white;">
            Trooper attached (-90%)
          </button>
          <button class="falinks-target" data-target="trooper_detached"
            style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;
            background:${target === 'trooper_detached' ? '#e74c3c' : '#555'};color:white;">
            Trooper detached
          </button>
        </div>
        <div style="margin-top:6px;font-size:0.85em;">
          Active Target : <strong style="color:${t.color};">${t.label}</strong> - ${t.desc}
        </div>
      </div>

      <div>
        <div style="margin-bottom:6px;color:#ccc;font-size:0.9em;">Move multi-target :</div>
        <button class="falinks-multihit"
          style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;
          background:${multiHit ? '#8e44ad' : '#555'};color:white;font-size:0.85em;">
          ${multiHit ? '⚠️ Multi-hit active (cap 110%)' : 'Single target'}
        </button>
        ${multiHit ? `<div style="margin-top:4px;font-size:0.82em;color:#cc99ff;">Les dégâts totaux sur Falinks sont cappés à 110% du move</div>` : ''}
      </div>
    </div>
  `;

  line.querySelectorAll('.falinks-target').forEach(btn => {
    btn.onclick = () => { state.defenderFalinksTarget = btn.dataset.target; updateDamages(); };
  });
  line.querySelector('.falinks-multihit').onclick = () => {
    state.defenderFalinksMultiHit = !state.defenderFalinksMultiHit;
    updateDamages();
  };

  card.appendChild(line);
}

export {
  applyAegislashDefender,
  applyArmarougeDefender,
  applyArticunoDefender,
  applyZardxDefender,
  applyMegaGyaradosDefender,
  applyGyaradosDefender,
  applyCrustleDefender,
  applyDragoniteDefender,
  applyLaprasDefender,
  applyMamoswineDefender,
  applyMegaMewtwoDefender,
  applyMegaMewtwoYDefender,
  applyMimeDefender,
  applySylveonDefender,
  applyTyranitarDefender,
  applyUmbreonDefender,
  applyGarchompDefender,
  applyFalinksDefender
};