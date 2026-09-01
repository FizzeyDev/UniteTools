import { state } from './state.js';
import { updateDamages } from './damageDisplay.js';
import { PASSIVE_DEF, passiveBadge } from './effectColors.js';

const { color: C, bg: BG, border: BORDER } = PASSIVE_DEF;

function wrap(content) {
  return `<div style="margin:12px 0;padding:10px;background:${BG};border-radius:8px;${BORDER};display:flex;align-items:center;gap:12px;">${content}</div>`;
}
function icon(src) {
  return `<img src="${src}" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/moves/missing.png'">`;
}

// ── AEGISLASH ─────────────────────────────────────────────────────────────────
function applyAegislashDefender(atkStats, defStats, card) {
  if (state.attackerLevel < 7) return;
  const isSword = state.defenderStance === 'sword';
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/aegislash/stance_change.png')}
    <div style="flex:1;">
      ${passiveBadge('Stance Change', null, PASSIVE_DEF)}
      Form: <strong style="color:${isSword ? '#e74c3c' : '#3498db'};">${isSword ? 'Blade' : 'Shield'}</strong><br>
      <button class="stance-toggle" style="margin-top:8px;padding:8px 16px;background:${isSword ? '#3498db' : '#e74c3c'};color:white;border:none;border-radius:6px;cursor:pointer;">
        Switch to ${isSword ? 'Shield' : 'Blade'} Forme
      </button>
    </div>
  `);
  line.querySelector('.stance-toggle').onclick = () => { state.defenderStance = isSword ? 'shield' : 'sword'; updateDamages(); };
  card.appendChild(line);
}

// ── ARMAROUGE ─────────────────────────────────────────────────────────────────
function applyArmarougeDefender(atkStats, defStats, card) {
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/armarouge/flash_fire.png')}
    <div style="flex:1;">
      ${passiveBadge('Flash Fire', null, PASSIVE_DEF)}
      Damage Reduction: <strong style="color:${state.defenderFlashFireActive ? '#88ff88' : '#ff6666'};">${state.defenderFlashFireActive ? '20%' : '0%'}</strong><br>
      <button class="flashfire-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderFlashFireActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${state.defenderFlashFireActive ? 'Deactivate' : 'Activate'} reduction
      </button>
    </div>
  `);
  line.querySelector('.flashfire-toggle').onclick = () => { state.defenderFlashFireActive = !state.defenderFlashFireActive; updateDamages(); };
  card.appendChild(line);
}

// ── ARTICUNO ──────────────────────────────────────────────────────────────────
function applyArticunoDefender(atkStats, defStats, card) {
  const snowCloakState = state.defenderSnowCloakState || 'none';
  const labels = {
    none: { label: 'Inactive',                          color: '#7f8c8d', desc: 'No reduction'      },
    low:  { label: 'Ice Shard / Ice Beam (10%)',        color: '#4fc3f7', desc: '−10% damage taken' },
    high: { label: 'Icy Wind / Blizzard / Unite (20%)', color: '#81d4fa', desc: '−20% damage taken' },
  };
  const current = labels[snowCloakState];
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/articuno/snow_cloak.png')}
    <div style="flex:1;">
      ${passiveBadge('Snow Cloak', null, PASSIVE_DEF)}
      Status: <strong style="color:${current.color};">${current.label}</strong><br>
      <span style="font-size:0.85em;color:#aaa;">${current.desc}</span><br>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
        <button class="snowcloak-btn" data-state="none"
          style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;background:${snowCloakState === 'none'  ? '#7f8c8d' : '#444'};color:white;">Off</button>
        <button class="snowcloak-btn" data-state="low"
          style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;background:${snowCloakState === 'low'   ? '#4fc3f7' : '#444'};color:white;">−10% (Move 2)</button>
        <button class="snowcloak-btn" data-state="high"
          style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;background:${snowCloakState === 'high'  ? '#81d4fa' : '#444'};color:white;">−20% (Move 1 / Unite)</button>
      </div>
    </div>
  `);
  line.querySelectorAll('.snowcloak-btn').forEach(btn => {
    btn.onclick = () => { state.defenderSnowCloakState = btn.dataset.state; updateDamages(); };
  });
  card.appendChild(line);
}

// ── CHARIZARD X ───────────────────────────────────────────────────────────────
function applyZardxDefender(atkStats, defStats, card) {
  const passive = state.currentDefender.passive;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon(passive.image)}
    <div style="flex:1;">
      ${passiveBadge(passive.name, null, PASSIVE_DEF)}
      Def +${passive.bonusPercentDef}% · SpDef +${passive.bonusPercentSpDef}%<br>
      <button class="toughclaw-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderZardToughClaw ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${state.defenderZardToughClaw ? 'Mega Evolve' : 'Normal'}
      </button>
    </div>
  `);
  line.querySelector('.toughclaw-toggle').onclick = () => { state.defenderZardToughClaw = !state.defenderZardToughClaw; updateDamages(); };
  card.appendChild(line);
}

// ── MEGA GYARADOS ─────────────────────────────────────────────────────────────
function applyMegaGyaradosDefender(atkStats, defStats, card) {
  const passive = state.currentDefender.passive;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = `
    ${wrap(`
      ${icon('assets/moves/mega_gyarados/intimidate.png')}
      <div style="flex:1;">
        ${passiveBadge('Intimidate', null, PASSIVE_DEF)}
        HP +1200, Atk +100<br>
        <button class="intimidate-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderMegaGyaradosEvolve ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.defenderMegaGyaradosEvolve ? 'Gyarados' : 'Magikarp'}
        </button>
      </div>
    `)}
    ${wrap(`
      ${icon(passive.image)}
      <div style="flex:1;">
        ${passiveBadge(passive.name, null, PASSIVE_DEF)}
        Def +${passive.bonusPercentDef}% · SpDef +${passive.bonusPercentSpDef}%<br>
        <button class="moldbreaker-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderMoldBreakerActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${state.defenderMoldBreakerActive ? 'Mega Evolve' : 'Normal'}
        </button>
      </div>
    `)}
  `;
  line.querySelector('.intimidate-toggle').onclick  = () => { state.defenderMegaGyaradosEvolve = !state.defenderMegaGyaradosEvolve; updateDamages(); };
  line.querySelector('.moldbreaker-toggle').onclick = () => { state.defenderMoldBreakerActive  = !state.defenderMoldBreakerActive;  updateDamages(); };
  card.appendChild(line);
}

// ── GYARADOS ──────────────────────────────────────────────────────────────────
function applyGyaradosDefender(atkStats, defStats, card) {
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/gyarados/moxie.png')}
    <div style="flex:1;">
      ${passiveBadge('Moxie', null, PASSIVE_DEF)}
      HP +1200, Atk +100<br>
      <button class="moxiedef-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderGyaradosEvolve ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${state.defenderGyaradosEvolve ? 'Gyarados' : 'Magikarp'}
      </button>
    </div>
  `);
  line.querySelector('.moxiedef-toggle').onclick = () => { state.defenderGyaradosEvolve = !state.defenderGyaradosEvolve; updateDamages(); };
  card.appendChild(line);
}

// ── CRUSTLE ───────────────────────────────────────────────────────────────────
function applyCrustleDefender(atkStats, defStats, card) {
  const passive          = state.currentDefender.passive;
  const missingHpPercent = 100 - state.defenderHPPercent;
  const stacks           = Math.min(passive.stack.maxStacks, Math.floor(missingHpPercent / passive.stack.missingHpPercentPerStack));
  const level            = state.defenderLevel;
  const bonusPerStack    = 2 * (level - 1) + 6;
  const totalBonus       = bonusPerStack * stacks;
  defStats.def    += totalBonus;
  defStats.sp_def += totalBonus;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon(passive.image)}
    <div style="flex:1;">
      ${passiveBadge(passive.name, null, PASSIVE_DEF)}
      ${stacks} stack(s)<br>
      Def +${totalBonus} · SpDef +${totalBonus}
    </div>
  `);
  card.appendChild(line);
}

// ── DRAGONITE ─────────────────────────────────────────────────────────────────
function applyDragoniteDefender(atkStats, defStats, card) {
  const level            = state.defenderLevel;
  const marvelActive     = state.defenderMarvelScaleActive  || false;
  const multiscaleActive = state.defenderMultiscaleActive   || false;
  let content = '';
  if (level <= 8) {
    if (marvelActive) defStats.def += 100;
    content += wrap(`
      ${icon('assets/moves/dragonite/marvel_scale.png')}
      <div style="flex:1;">
        ${passiveBadge('Marvel Scale', null, PASSIVE_DEF)}
        Status: <strong style="color:${marvelActive ? '#3498db' : '#e74c3c'};">${marvelActive ? 'Afflicted' : 'None'}</strong><br>
        Def +100<br>
        <button class="marvel-toggle" style="margin-top:8px;padding:6px 14px;background:${marvelActive ? '#3498db' : '#e74c3c'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${marvelActive ? 'Remove Status' : 'Apply Status'}
        </button>
      </div>
    `);
  }
  if (level >= 9) {
    content += wrap(`
      ${icon('assets/moves/dragonite/multiscale.png')}
      <div style="flex:1;">
        ${passiveBadge('Multiscale', null, PASSIVE_DEF)}
        Buff: <strong style="color:${multiscaleActive ? '#3498db' : '#e74c3c'};">${multiscaleActive ? 'Active' : 'Inactive'}</strong><br>
        Damage taken −30%<br>
        <button class="multiscale-toggle" style="margin-top:8px;padding:6px 14px;background:${multiscaleActive ? '#3498db' : '#e74c3c'};color:white;border:none;border-radius:6px;cursor:pointer;">
          ${multiscaleActive ? 'Disable Buff' : 'Enable Buff'}
        </button>
      </div>
    `);
  }
  if (!content) return;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = content;
  if (level <= 8) line.querySelector('.marvel-toggle')?.addEventListener('click',    () => { state.defenderMarvelScaleActive  = !marvelActive;     updateDamages(); });
  if (level >= 9) line.querySelector('.multiscale-toggle')?.addEventListener('click', () => { state.defenderMultiscaleActive = !multiscaleActive; updateDamages(); });
  card.appendChild(line);
}

// ── LAPRAS ────────────────────────────────────────────────────────────────────
function applyLaprasDefender(atkStats, defStats, card) {
  const passive = state.currentDefender.passive;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon(passive.image)}
    <div style="flex:1;">
      ${passiveBadge(passive.name, null, PASSIVE_DEF)}
      ${passive.description}
    </div>
  `);
  card.appendChild(line);
}

// ── MAMOSWINE ─────────────────────────────────────────────────────────────────
function applyMamoswineDefender(atkStats, defStats, card) {
  const passive = state.currentDefender.passive;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon(passive.image)}
    <div style="flex:1;">
      ${passiveBadge(passive.name, null, PASSIVE_DEF)}
      Stacks: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${state.defenderPassiveStacks}</strong>/3
      <button class="stack-btn plus">+</button>
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.defenderPassiveStacks > 0) { state.defenderPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.defenderPassiveStacks < 3) { state.defenderPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── MEGA MEWTWO X ─────────────────────────────────────────────────────────────
function applyMegaMewtwoDefender(atkStats, hpStats, card) {
  const isMega = state.defenderMewtwoForm === 'mega';
  const stacks = state.defenderMewtwoPressureStacks;
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
          ${passiveBadge('Pressure', null, PASSIVE_DEF)}
          Stacks: <button class="stack-btn minus pressure-minus">-</button>
          <strong style="color:${C};">${stacks}</strong>/10
          <button class="stack-btn plus pressure-plus">+</button><br>
          → Def / Sp.Def +${stacks * 2}%
          ${isMega ? `<br>→ Méga bonus: Def / Sp.Def +18% | HP +10%` : ''}
        </div>
      </div>
    </div>
  `;
  line.querySelector('.mewtwo-normal').onclick  = () => { state.defenderMewtwoForm = 'normal'; updateDamages(); };
  line.querySelector('.mewtwo-mega').onclick    = () => { state.defenderMewtwoForm = 'mega';   updateDamages(); };
  line.querySelector('.pressure-minus').onclick = () => { if (state.defenderMewtwoPressureStacks > 0)  { state.defenderMewtwoPressureStacks--; updateDamages(); } };
  line.querySelector('.pressure-plus').onclick  = () => { if (state.defenderMewtwoPressureStacks < 10) { state.defenderMewtwoPressureStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── MEGA MEWTWO Y ─────────────────────────────────────────────────────────────
function applyMegaMewtwoYDefender(atkStats, hpStats, card) {
  const isMega = state.defenderMewtwoYForm === 'mega';
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/mega_mewtwo_y/pressure.png')}
    <div style="flex:1;">
      ${passiveBadge('Pressure', null, PASSIVE_DEF)}
      Form: <strong style="color:${isMega ? '#27ae60' : '#7f8c8d'};">${isMega ? 'Mega' : 'Normal'}</strong><br>
      ${isMega ? 'HP +10%' : 'No bonus'}<br>
      <button class="mewtwoy-toggle" style="margin-top:8px;padding:8px 16px;background:${isMega ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${isMega ? 'Normal' : 'Méga Evolution'}
      </button>
    </div>
  `);
  line.querySelector('.mewtwoy-toggle').onclick = () => { state.defenderMewtwoYForm = isMega ? 'normal' : 'mega'; updateDamages(); };
  card.appendChild(line);
}

// ── MR. MIME ──────────────────────────────────────────────────────────────────
function applyMimeDefender(atkStats, defStats, card) {
  const passive = state.currentDefender.passive;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon(passive.image)}
    <div style="flex:1;">
      ${passiveBadge(passive.name, null, PASSIVE_DEF)}
      ${passive.description}<br>
      <button class="filter-toggle" style="margin-top:8px;padding:8px 16px;background:${state.defenderMimeActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${state.defenderMimeActive ? 'Activate' : 'Deactivate'}
      </button>
    </div>
  `);
  line.querySelector('.filter-toggle').onclick = () => { state.defenderMimeActive = !state.defenderMimeActive; updateDamages(); };
  card.appendChild(line);
}

// ── SYLVEON ───────────────────────────────────────────────────────────────────
function applySylveonDefender(atkStats, defStats, card) {
  if (state.defenderLevel <= 3) return;
  const stacks = state.defenderPassiveStacks;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/sylveon/pixilate.png')}
    <div style="flex:1;">
      ${passiveBadge('Pixilate', null, PASSIVE_DEF)}
      Stacks: <button class="stack-btn minus">-</button>
      <strong style="color:${C};">${stacks}</strong>/6
      <button class="stack-btn plus">+</button>
      <br>→ Sp. Def +${(stacks * 2.5).toFixed(1)}%
    </div>
  `);
  line.querySelector('.minus').onclick = () => { if (state.defenderPassiveStacks > 0) { state.defenderPassiveStacks--; updateDamages(); } };
  line.querySelector('.plus').onclick  = () => { if (state.defenderPassiveStacks < 6) { state.defenderPassiveStacks++; updateDamages(); } };
  card.appendChild(line);
}

// ── TYRANITAR ─────────────────────────────────────────────────────────────────
function applyTyranitarDefender(atkStats, defStats, card) {
  if (state.defenderLevel < 9) return;
  const sandActive = state.defenderTyranitarSandStreamActive || false;
  if (sandActive) {
    defStats.def    = Math.floor(defStats.def    * 1.65);
    defStats.sp_def = Math.floor(defStats.sp_def * 1.65);
  }
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/tyranitar/sand_stream.png')}
    <div style="flex:1;">
      ${passiveBadge('Sand Stream', null, PASSIVE_DEF)}
      Status: <strong style="color:${sandActive ? '#88ff88' : '#ff6666'};">${sandActive ? 'Active' : 'Inactive'}</strong><br>
      → Def +65% · Sp. Def +65%<br>
      <button class="sand-toggle" style="margin-top:8px;padding:8px 16px;background:${sandActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${sandActive ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  `);
  line.querySelector('.sand-toggle').onclick = () => { state.defenderTyranitarSandStreamActive = !sandActive; updateDamages(); };
  card.appendChild(line);
}

// ── UMBREON ───────────────────────────────────────────────────────────────────
function applyUmbreonDefender(atkStats, defStats, card) {
  if (state.defenderLevel < 4) return;
  const innerFocusActive = state.defenderUmbreonInnerFocusActive || false;
  if (innerFocusActive) {
    defStats.def    = Math.floor(defStats.def    * 1.30);
    defStats.sp_def = Math.floor(defStats.sp_def * 1.30);
  }
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/umbreon/inner_focus.png')}
    <div style="flex:1;">
      ${passiveBadge('Inner Focus', null, PASSIVE_DEF)}
      Status: <strong style="color:${innerFocusActive ? '#88ff88' : '#ff6666'};">${innerFocusActive ? 'Active' : 'Inactive'}</strong><br>
      → Def +30% · Sp. Def +30%<br>
      <button class="innerfocus-toggle" style="margin-top:8px;padding:8px 16px;background:${innerFocusActive ? '#27ae60' : '#7f8c8d'};color:white;border:none;border-radius:6px;cursor:pointer;">
        ${innerFocusActive ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  `);
  line.querySelector('.innerfocus-toggle').onclick = () => { state.defenderUmbreonInnerFocusActive = !innerFocusActive; updateDamages(); };
  card.appendChild(line);
}

// ── GARCHOMP ──────────────────────────────────────────────────────────────────
function applyGarchompDefender(atkStats, defStats, card) {
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/garchomp/rough_skin.png')}
    <div style="flex:1;">
      ${passiveBadge('Rough Skin', null, PASSIVE_DEF)}
      Melee hit: reflects <strong style="color:${C};">12.5%</strong> of damage received<br>
      <span style="font-size:0.85em;color:#aaa;">(Attack-based · Melee only, from nearby opposing Pokémon)</span>
    </div>
  `);
  card.appendChild(line);
}

// ── FALINKS ───────────────────────────────────────────────────────────────────
function applyFalinksDefender(atkStats, defStats, card) {
  const target   = state.defenderFalinksTarget   || 'brass';
  const multiHit = state.defenderFalinksMultiHit || false;
  if (target === 'brass')             { defStats.def = Math.floor(defStats.def / 0.90); defStats.sp_def = Math.floor(defStats.sp_def / 0.90); }
  else if (target === 'trooper_attached') { defStats.def = Math.floor(defStats.def / 0.10); defStats.sp_def = Math.floor(defStats.sp_def / 0.10); }
  const targetLabels = {
    brass:            { label: 'Brass',              color: '#e67e22', desc: '−10% damage'  },
    trooper_attached: { label: 'Trooper (attached)', color: '#27ae60', desc: '−90% damage'  },
    trooper_detached: { label: 'Trooper (detached)', color: '#e74c3c', desc: 'No reduction' },
  };
  const t = targetLabels[target];
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = `
    <div style="margin:12px 0;padding:10px;background:${BG};border-radius:8px;${BORDER};display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${icon('assets/moves/falinks/battle_armor.png')}
        <div>
          ${passiveBadge('Battle Armor', null, PASSIVE_DEF)}
          <span style="color:#ff9999;">Crit ×0.5</span>
        </div>
      </div>
      <div>
        <div style="margin-bottom:6px;color:#ccc;font-size:0.9em;">Target Hit:</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="falinks-target" data-target="brass"
            style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;background:${target === 'brass'            ? '#e67e22' : '#555'};color:white;">Brass (−10%)</button>
          <button class="falinks-target" data-target="trooper_attached"
            style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;background:${target === 'trooper_attached' ? '#27ae60' : '#555'};color:white;">Trooper attached (−90%)</button>
          <button class="falinks-target" data-target="trooper_detached"
            style="padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:0.85em;background:${target === 'trooper_detached' ? '#e74c3c' : '#555'};color:white;">Trooper detached</button>
        </div>
        <div style="margin-top:6px;font-size:0.85em;">Active Target: <strong style="color:${t.color};">${t.label}</strong> − ${t.desc}</div>
      </div>
      <div>
        <div style="margin-bottom:6px;color:#ccc;font-size:0.9em;">Multi-target move:</div>
        <button class="falinks-multihit"
          style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;background:${multiHit ? '#8e44ad' : '#555'};color:white;font-size:0.85em;">
          ${multiHit ? '⚠️ Multi-hit active (cap 110%)' : 'Single target'}
        </button>
        ${multiHit ? `<div style="margin-top:4px;font-size:0.82em;color:#cc99ff;">Total damage on Falinks is capped at 110% of the move</div>` : ''}
      </div>
    </div>
  `;
  line.querySelectorAll('.falinks-target').forEach(btn => { btn.onclick = () => { state.defenderFalinksTarget   = btn.dataset.target;              updateDamages(); }; });
  line.querySelector('.falinks-multihit').onclick =         () => { state.defenderFalinksMultiHit = !state.defenderFalinksMultiHit; updateDamages(); };
  card.appendChild(line);
}

// ── SOLGALEO — Unaware / Sturdy (30% dmg reduction, permanent) ─────────────
// "Reduces physical and special type damage by 30%. True type damage will
// bypass this." Named Unaware (Cosmog/Cosmoem) then Full Metal Body kicks in
// on evolving, but the 30% reduction itself (Sturdy at the middle stage)
// carries through all 3 stages. Defaults ON — toggle off to see raw damage.
function applySolgaleoDefender(atkStats, defStats, card) {
  const level = state.defenderLevel;
  const stageName = level >= 7 ? 'Sturdy' : level >= 5 ? 'Sturdy' : 'Unaware';
  const isActive = state.defenderSolgaleoUnawareActive ?? true;
  const line = document.createElement('div');
  line.className = 'global-bonus-line';
  line.innerHTML = wrap(`
    ${icon('assets/moves/solgaleo/unaware.png')}
    <div style="flex:1;">
      ${passiveBadge(stageName, null, PASSIVE_DEF)}
      Permanent: <strong style="color:#fff;">−30% physical & special damage taken</strong><br>
      <span style="font-size:0.8rem;color:${C}99;">True type damage bypasses this (e.g. Solgaleo's own Radiant Sun phase)${level >= 5 && level < 7 ? '. Sturdy also saves Cosmoem at 1 HP once (100s cd) — not modeled here.' : ''}</span><br>
      <button class="solgaleo-unaware-toggle" style="
        margin-top:8px;padding:6px 16px;
        background:${isActive ? C : '#0d2428'};
        color:${isActive ? '#000' : C};
        border:1px solid ${C};border-radius:6px;cursor:pointer;
        font-weight:700;font-family:'Rajdhani',sans-serif;font-size:0.85rem;letter-spacing:0.04em;
      ">${isActive ? '✓ Active' : 'Disabled'}</button>
    </div>
  `);
  line.querySelector('.solgaleo-unaware-toggle').onclick = () => {
    state.defenderSolgaleoUnawareActive = !isActive;
    updateDamages();
  };
  card.appendChild(line);
}

export {
  applyAegislashDefender, applyArmarougeDefender, applyArticunoDefender,
  applyZardxDefender, applyMegaGyaradosDefender, applyGyaradosDefender,
  applyCrustleDefender, applyDragoniteDefender, applyLaprasDefender,
  applyMamoswineDefender, applyMegaMewtwoDefender, applyMegaMewtwoYDefender,
  applyMimeDefender, applySylveonDefender, applyTyranitarDefender,
  applyUmbreonDefender, applyGarchompDefender, applyFalinksDefender,
  applySolgaleoDefender,
};