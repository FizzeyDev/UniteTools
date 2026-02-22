import { state } from './state.js';
import { getModifiedStats, calculateDamage, getAutoAttackResults } from './damageCalculator.js';
import { updateHPDisplays } from './uiManager.js';
import { t } from './i18n.js';
import { stackableItems } from './constants.js';

import {
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
  applyZeraoraAttacker
} from './passiveEffectsAtk.js';

import {
  applyAegislashDefender,
  applyArmarougeDefender,
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
} from './passiveEffectsDef.js';


const movesGrid = document.getElementById("movesGrid");

export function updateDamages() {
  if (!state.currentAttacker?.moves?.length) {
    movesGrid.innerHTML = `<div class="loading">${t('calc_js_select_attacker')}</div>`;
    return;
  }

  const atkStats = getModifiedStats(
    state.currentAttacker,
    state.attackerLevel,
    state.attackerItems,
    state.attackerItemStacks,
    state.attackerItemActivated
  );

  const defStats = getModifiedStats(
    state.currentDefender,
    state.defenderLevel,
    state.defenderItems,
    state.defenderItemStacks,
    state.defenderItemActivated
  );

  if (
    state.currentAttacker?.pokemonId === "mega-gyarados" &&
    state.attackerMoldBreakerActive
  ) {
    atkStats.atk = Math.floor(
      atkStats.atk * (1 + state.currentAttacker.passive.bonusPercentAtk / 100)
    );
  }

  if (state.currentDefender?.pokemonId === "mega-gyarados") {
    if (state.defenderMoldBreakerActive) {
      defStats.def = Math.floor(
        defStats.def * (1 + state.currentDefender.passive.bonusPercentDef / 100)
      );
      defStats.sp_def = Math.floor(
        defStats.sp_def * (1 + state.currentDefender.passive.bonusPercentSpDef / 100)
      );
    }
  }

  if (state.currentDefender?.pokemonId === "mamoswine") {
    const stacks = Math.min(state.defenderPassiveStacks, 3); 
    if (stacks > 0) {
      const levelBonus = 10 * (state.defenderLevel - 1) + 20;
      defStats.def = Math.floor(defStats.def + stacks * levelBonus);
      defStats.sp_def = Math.floor(defStats.sp_def + stacks * levelBonus);
    }
  }

  if (
    state.currentDefender?.pokemonId === "mega-charizard-x" &&
    state.defenderZardToughClaw
  ) {
    defStats.def = Math.floor(
      defStats.def * (1 + state.currentDefender.passive.bonusPercentDef / 100)
    );
    defStats.sp_def = Math.floor(
      defStats.sp_def * (1 + state.currentDefender.passive.bonusPercentSpDef / 100)
    );
  }

  if (
    state.currentAttacker?.pokemonId === "blastoise" &&
    state.attackerHPPercent <= state.currentAttacker.passive.lowHpThreshold
  ) {
    atkStats.atk = Math.floor(
      atkStats.atk * (1 + state.currentAttacker.passive.bonusPercentAtk / 100)
    );

    atkStats.sp_atk = Math.floor(
      atkStats.sp_atk * (1 + state.currentAttacker.passive.bonusPercentSpAtk / 100)
    );
  }

  if (state.currentAttacker?.pokemonId === "mega-lucario") {
    if (state.attackerLucarioForm === "normal") {
      atkStats.atk += Math.floor(
        atkStats.atk * 0.08 * state.attackerLucarioJustifiedStacks
      )
    }

    if (state.attackerLucarioForm === "mega") {
      atkStats.atk += Math.floor(
        atkStats.atk * 0.05 * state.attackerLucarioAdaptabilityStacks
      )
    }
  }

  if (state.currentAttacker?.pokemonId === "mewtwo_x") {
    atkStats.atk = Math.floor(
      atkStats.atk *
      (1 +
        state.attackerMewtwoPressureStacks * 0.02 +
        (state.attackerMewtwoForm === "mega" ? 0.18 : 0))
    )
  }

  if (state.currentDefender?.pokemonId === "mewtwo_x") {
    defStats.def = Math.floor(
      defStats.def *
      (1 +
        state.defenderMewtwoPressureStacks * 0.02 +
        (state.defenderMewtwoForm === "mega" ? 0.18 : 0))
    )

    defStats.sp_def = Math.floor(
      defStats.sp_def *
      (1 +
        state.defenderMewtwoPressureStacks * 0.02 +
        (state.defenderMewtwoForm === "mega" ? 0.18 : 0))
    )
  }

  if (state.currentAttacker?.pokemonId === "mewtwo_y") {
    atkStats.sp_atk = Math.floor(
      atkStats.sp_atk *
      (1 +
        state.attackerMewtwoYPressureStacks * 0.015 +
        (state.attackerMewtwoYForm === "mega" ? 0.10 : 0))
    )
  }

  if (state.currentDefender?.pokemonId === "sylveon") {
    const isEevee = state.defenderLevel <= 3;
    if (!isEevee) {
      defStats.sp_def = Math.floor(
        defStats.sp_def * (1 + state.defenderPassiveStacks * 0.025)
      );
    }
  }

  if (state.currentAttacker?.pokemonId === "machamp" && state.attackerMachampActive) {
    atkStats.atk = Math.floor(
      atkStats.atk * (1 + state.currentAttacker.passive.bonusPercentAtk / 100)
    );
  }

  if (
    state.currentAttacker?.pokemonId === "greninja" &&
    state.attackerHPPercent <= state.currentAttacker.passive.lowHpThreshold
  ) {
    atkStats.atk = Math.floor(
      atkStats.atk * (1 + state.currentAttacker.passive.bonusPercentAtk / 100)
    );
  }

  if (state.currentAttacker?.pokemonId === "tyranitar") {
    if (state.attackerLevel <= 5 && state.attackerTyranitarGutsActive) {
      atkStats.atk = Math.floor(atkStats.atk * 1.30);
    }
  }

  if (state.currentAttacker?.pokemonId === "sylveon") {
    const isEevee = state.attackerLevel <= 3;
    const percent = isEevee ? 0.05 : 0.025;
    atkStats.sp_atk = Math.floor(atkStats.sp_atk * (1 + percent * state.attackerPassiveStacks));
  }

  if (state.currentAttacker?.pokemonId === "zeraora") {
    const bonusAtk = Math.min(Math.floor(state.attackerZeraoraDamageReceived * 0.08), 200);
    atkStats.atk += bonusAtk;
  }

  if (state.currentAttacker?.pokemonId === "tinkaton") {
    atkStats.atk = Math.floor(atkStats.atk * (1 + 0.005 * state.attackerPassiveStacks));
  }

  const currentDefHP = Math.floor(defStats.hp * (state.defenderHPPercent / 100));

  document.getElementById('resultsAttackerName').textContent = state.currentAttacker.displayName;
  document.getElementById('resultsDefenderName').textContent = state.currentDefender?.displayName || 'Aucun';
  document.getElementById('attackerAtk').textContent = atkStats.atk.toLocaleString();
  document.getElementById('attackerSpAtk').textContent = atkStats.sp_atk.toLocaleString();

  const isCustom = state.currentDefender?.pokemonId === "custom-doll";

  if (isCustom) {
    document.getElementById('defenderMaxHP').textContent = defStats.hp.toLocaleString();
    document.getElementById('defenderDefCustom').textContent = defStats.def.toLocaleString();
    document.getElementById('defenderSpDefCustom').textContent = defStats.sp_def.toLocaleString();
  } else {
    document.getElementById('defenderDef').textContent = defStats.def.toLocaleString();
    document.getElementById('defenderSpDef').textContent = defStats.sp_def.toLocaleString();
  }

  let baseCritChance = 0;
  if (state.currentAttacker && state.currentAttacker.stats) {
    const levelIndex = state.attackerLevel - 1;
    baseCritChance = state.currentAttacker.stats[levelIndex]?.crit || 0;
  }

  let totalCritChance = baseCritChance;
  state.attackerItems.forEach(item => {
    if (item && item.stats) {
      const critStat = item.stats.find(s => s.label === "Critical-Hit Rate");
      if (critStat && critStat.percent && critStat.value) {
        totalCritChance += critStat.value;
      }
    }
  });

  totalCritChance = Math.min(100, totalCritChance);

  if (
    ["charizard", "cinderace"].includes(state.currentAttacker?.pokemonId) &&
    state.attackerHPPercent <= state.currentAttacker.passive.lowHpThreshold
  ) {
    totalCritChance += state.currentAttacker.passive.bonusCrit;
  }

  if (["sirfetchd"].includes(state.currentAttacker?.pokemonId)) {
    totalCritChance += state.attackerPassiveStacks * 5;
  }

  document.getElementById('attackerCritChance').textContent = `${totalCritChance}%`;

  document.querySelectorAll('.global-bonus-line').forEach(el => el.remove());

  const itemEffects = applyItemsAndGlobalEffects(atkStats, defStats);
  applyPassiveEffects(atkStats, defStats);
  updateDefenderStatsUI(defStats);

  let defenderDamageMult = 1.0;
  if (state.defenderEldegossBuff) defenderDamageMult *= 0.85;
  if (state.defenderNinetailsBuff) defenderDamageMult *= 0.65;
  if (state.defenderNinetailsPlusBuff) defenderDamageMult *= 0.60;
  if (state.defenderUmbreonBuff) defenderDamageMult *= 0.85;
  if (state.defenderUmbreonPlusBuff) defenderDamageMult *= 0.75;
  if (state.defenderBlisseyRedirectionBuff) defenderDamageMult *= 0.50;
  if (state.defenderHoOhRedirectionBuff) defenderDamageMult *= 0.40;
  if (state.defenderDhelmiseAnchorShotPlus) defenderDamageMult *= 1.50;

  if (state.currentDefender?.pokemonId === "dragonite" && state.defenderMultiscaleActive) defenderDamageMult *= 0.70;
  if (state.defenderMimeActive) defenderDamageMult *= 0.90;

  const finalEffects = {
    ...itemEffects,
    infiltratorIgnore:
      state.currentAttacker?.pokemonId === "chandelure"
        ? Math.min(state.attackerPassiveStacks * 0.025, 0.20)
        : 0,
    defenderFlashFireReduction:
      state.currentDefender?.pokemonId === "armarouge" &&
      state.defenderFlashFireActive
        ? 0.20
        : 0,
    moldBreakerDefPen:
      state.currentAttacker?.pokemonId === "mega-gyarados" &&
      state.attackerMoldBreakerActive
        ? state.currentAttacker.passive.bonusDefPen / 100
        : 0,
    defenderDamageMult
  };

  if (state.currentDefender?.pokemonId === "garchomp") {
    const aaPreview = getAutoAttackResults(atkStats, defStats, currentDefHP, 1.0);
    const reflectDamage = Math.floor(aaPreview.normal * 0.30);

    const defenderCard = document.querySelector('.defender-stats');
    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:8px 12px;background:#2a1f0f;border-radius:8px;border-left:4px solid #ff9d00;font-size:0.9rem;">
        <strong style="color:#ff9d00;">${t('calc_js_rough_skin')}</strong> — ${t('calc_js_rough_skin_desc')}<strong>${reflectDamage.toLocaleString()}</strong> dmg on AA contact
      </div>
    `;
    defenderCard.appendChild(line);
  }

  displayMoves(atkStats, defStats, finalEffects, currentDefHP);
  updateHPDisplays();
}

function updateDefenderStatsUI(defStats) {
  const isCustom = state.currentDefender?.pokemonId === "custom-doll";

  if (isCustom) {
    document.getElementById('defenderDefCustom').textContent = defStats.def.toLocaleString();
    document.getElementById('defenderSpDefCustom').textContent = defStats.sp_def.toLocaleString();
  } else {
    document.getElementById('defenderDef').textContent = defStats.def.toLocaleString();
    document.getElementById('defenderSpDef').textContent = defStats.sp_def.toLocaleString();
  }
}

function applyItemsAndGlobalEffects(atkStats, defStats) {
  const attackerCard = document.querySelector('.attacker-stats');
  const defenderCard = document.querySelector('.defender-stats');

  let choiceSpecsBonus = 0;
  let hasChoiceSpecs = false;
  let slickIgnore = 0;
  let scopeCritBonus = 1.0;
  let globalDamageMult = 1.0;

  if (state.attackerGroudonBuff) globalDamageMult *= 1.50;
  if (state.attackerRayquazaBuff) globalDamageMult *= 1.40;
  if (state.attackerBlisseyHandBuff) globalDamageMult *= 1.15;
  if (state.attackerMimeSwapBuff) globalDamageMult *= 1.15;
  if (state.attackerMimeSwapPlusBuff) globalDamageMult *= 1.20;
  if (state.attackerMiraidonBuff) {
    if (state.currentAttacker?.pokemonId === "miraidon") {
      globalDamageMult *= 1.30;
    } else {
      globalDamageMult *= 1.10;
    }
  }
  if (
    state.currentAttacker?.pokemonId === "mega-charizard-y" &&
    state.attackerDroughtActive
  ) {
    globalDamageMult *= 1.10;
  }
  if (state.debuffGoodraMuddyWater) globalDamageMult *= 0.85;
  if (state.debuffMimePowerSwap) globalDamageMult *= 0.85;
  if (state.debuffMimePowerSwapPlus) globalDamageMult *= 0.80;
  if (state.debuffTrevenantWoodHammerPlus) globalDamageMult *= 0.80;
  if (state.debuffPsyduckSurfPlus) globalDamageMult *= 0.75;
  if (state.debuffPsyduckUnite) globalDamageMult *= 0.70;
  if (state.debuffLatiasMistBall) globalDamageMult *= 0.75;

  state.attackerItems.forEach((item, i) => {
    if (!item) return;

    if (item.name === "Choice Specs") {
      hasChoiceSpecs = true;
      const percent = parseFloat(item.level20.replace('%', '').trim()) / 100;
      choiceSpecsBonus = Math.floor(atkStats.sp_atk * percent);
    }

    if (item.name === "Slick Spoon" && state.attackerItemActivated[i]) {
      slickIgnore = parseFloat(item.level20.replace('%', '').trim()) / 100 || 0;
    }

    if (item.name === "Scope Lens" && item.stats) {
      const critStat = item.stats.find(s => s.label === "Critical-Hit Damage");
      if (critStat?.value) scopeCritBonus = critStat.value;
    }

    if (item.activable && state.attackerItemActivated[i] && item.activation_effect) {
      item.activation_effect.stats.forEach(s => {
        if (s.label === "Damage" && s.percent) globalDamageMult *= (1 + s.value / 100);
      });
    }
  });

  const chargingIdx = state.attackerItems.findIndex(i => i?.name === "Charging Charm");
  if (chargingIdx !== -1 && state.attackerItemActivated[chargingIdx]) {
    const item = state.attackerItems[chargingIdx];
    const percent = parseFloat(item.level20.replace('%', '')) / 100;
    const exampleDef = state.currentAttacker.style === "special" ? defStats.sp_def : defStats.def;
    const chargingBase = 40 + Math.floor(atkStats.atk * percent);
    const chargingExtra = calculateDamage({ constant: chargingBase, multiplier: 0, levelCoef: 0 }, atkStats.atk, exampleDef, state.attackerLevel, false, null, 1.0, globalDamageMult);

    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:8px;background:#2a2a3a;border-radius:8px;font-size:0.95rem;">
        <strong>${t('calc_js_charging_charm')}</strong> (${t('calc_js_charging_charm_sub')})<br>
        <span style="color:#a0d8ff;">+${chargingExtra.toLocaleString()} additional damages</span>
      </div>
    `;
    attackerCard.appendChild(line);
  }

  const rockyIdx = state.defenderItems.findIndex(i => i?.name === "Rocky Helmet");
  if (rockyIdx !== -1) {
    const item = state.defenderItems[rockyIdx];
    const percent = parseFloat(item.level20.replace('%', '')) / 100;
    const rockyDamage = Math.floor(defStats.hp * percent);
    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:10px;background:#3a2a2a;border-radius:8px;border-left:4px solid #ff6b6b;font-size:0.95rem;">
        <strong>${t('calc_js_rocky_helmet')}</strong><br>
        <span style="color:#ff9999;">Deal ${rockyDamage.toLocaleString()} damage when hit</span>
      </div>
    `;
    defenderCard.appendChild(line);
  }

  return { choiceSpecsBonus, hasChoiceSpecs, slickIgnore, scopeCritBonus, globalDamageMult };
}

function applyAttackerPassive(pokemonId, atkStats, defStats, card) {
  const handlers = {
    buzzwole: applyBuzzwoleAttacker,
    ceruledge: applyCeruledgeAttacker,
    chandelure: applyChandelureAttacker,
    darkrai: applyDarkraiAttacker,
    decidueye: applyDecidueyeAttacker,
    "mega-charizard-y": applyZardyAttacker,
    aegislash: applyAegislashAttacker,
    armarouge: applyArmarougeAttacker,
    gyarados: applyGyaradosAttacker,
    machamp: applyMachampAttacker,
    "mega-gyarados": applyMegaGyaradosAttacker,
    "mega-lucario": applyMegaLucarioAttacker,
    meowscarada: applyMeowscaradaAttacker,
    "mewtwo_x": applyMegaMewtwoAttacker,
    "mewtwo_y": applyMegaMewtwoYAttacker,
    mimikyu: applyMimikyuAttacker,
    rapidash: applyRapidashAttacker,
    sirfetchd: applySirfetchdAttacker,
    sylveon: applySylveonAttacker,
    tinkaton: applyTinkatonAttacker,
    tyranitar: applyTyranitarAttacker,
    zeraora: applyZeraoraAttacker
  };

  handlers[pokemonId]?.(atkStats, defStats, card);
}

function applyDefenderPassive(pokemonId, atkStats, defStats, card) {
  const handlers = {
    aegislash: applyAegislashDefender,
    armarouge: applyArmarougeDefender,
    "mega-charizard-x": applyZardxDefender,
    "mega-gyarados": applyMegaGyaradosDefender,
    gyarados: applyGyaradosDefender,
    crustle: applyCrustleDefender,
    dragonite: applyDragoniteDefender,
    lapras: applyLaprasDefender,
    mamoswine: applyMamoswineDefender,
    "mewtwo_x": applyMegaMewtwoDefender,
    "mewtwo_y": applyMegaMewtwoYDefender,
    "mr_mime": applyMimeDefender,
    sylveon: applySylveonDefender,
    tyranitar: applyTyranitarDefender,
    umbreon: applyUmbreonDefender,
    garchomp: applyGarchompDefender,
    falinks: applyFalinksDefender

  };

  handlers[pokemonId]?.(atkStats, defStats, card);
}

function applyPassiveEffects(atkStats, defStats) {
  const attackerCard = document.querySelector('.attacker-stats');
  const defenderCard = document.querySelector('.defender-stats');

  if (state.currentAttacker) {
    applyAttackerPassive(state.currentAttacker.pokemonId, atkStats, defStats, attackerCard);
  }

  if (state.currentDefender) {
    applyDefenderPassive(state.currentDefender.pokemonId, atkStats, defStats, defenderCard);
  }
}

function getAttackerWoundMultiplier(attackerHp) {
  let mult = 1;

  const attacker = state.currentAttacker;
  if (!attacker) return 1;

  switch (attacker.pokemonId) {
    case "ceruledge":
      if (state.attackerPassiveStacks >= 6) mult *= 1.15;
      break;

    case "darkrai":
      if (state.attackerDarkraiSleep) mult *= 1.10;
      break;

    case "decidueye":
      if (state.attackerDecidueyeDistant) mult *= 1.20;
      break;

    case "meowscarada":
      if (state.attackerMeowscaradaActive) mult *= 1.15;
      break;

    case "mimikyu":
      if (state.attackerMimikyuActive) mult *= 1.10;
      break;

    case "venusaur":
      if (state.attackerHPPercent <= 30) mult *= 1.20;
      break;
    
    case "rapidash":
      if (state.attackerRapidashStacks >= 5) mult *= 1.60;
      else if (state.attackerRapidashStacks === 4) mult *= 1.50;
      else if (state.attackerRapidashStacks === 3) mult *= 1.35;
      else if (state.attackerRapidashStacks === 2) mult *= 1.20;
      else if (state.attackerRapidashStacks === 1) mult *= 1.05;
      break;
  }

  return mult;
}


function getCeruledgeWeakArmorDamage(atkStats, defStats, globalDamageMult) {
  if (state.currentAttacker?.pokemonId !== "ceruledge") return null;

  const stacks = state.attackerPassiveStacks;
  if (stacks <= 0) return null;

  const base = calculateDamage(
    { multiplier: 35, levelCoef: 0, constant: 40 },
    atkStats.atk,
    defStats.def,
    state.attackerLevel,
    false,
    "ceruledge",
    1.0,
    globalDamageMult,
    defStats.hp
  );

  let totalMult = 1;
  if (stacks > 1) totalMult += (stacks - 1) * 0.5;

  const ticks = 6;
  const total = Math.floor(base * totalMult * ticks);

  return {
    perTick: Math.floor((base * totalMult)),
    total
  };
}

function getBuzzwoleMuscleMultiplier(moveName, damageName) {
  if (state.currentAttacker?.pokemonId !== "buzzwole") return 1;

  const stacks = state.attackerPassiveStacks;
  if (stacks <= 0) return 1;

  if (moveName === "Fell Stinger") {
    return 1 + 0.125 * stacks;
  }

  if (moveName === "Superpower") {
    return 1 + 0.125 * stacks;
  }

  if (moveName === "Leech Life" && damageName.includes("per Tick")) {
    return 1 + 0.015 * stacks;
  }

  return 1;
}

function displayMoves(atkStats, defStats, effects, currentDefHP) {
  const { choiceSpecsBonus, hasChoiceSpecs, slickIgnore, scopeCritBonus, globalDamageMult, infiltratorIgnore, defenderFlashFireReduction, defenderDamageMult } = effects;

  const aaResults = getAutoAttackResults(atkStats, defStats, currentDefHP, globalDamageMult);

  movesGrid.innerHTML = "";
  let firstHit = true;

  state.currentAttacker.moves.forEach(move => {
    const card = document.createElement("div");
    card.className = "move-card";

    const header = document.createElement("div");
    header.className = "move-title";
    header.innerHTML = `<img src="${move.image}" alt="${move.name}" onerror="this.src='assets/moves/missing.png'"> <strong>${move.name}</strong>`;
    card.appendChild(header);

    if (!move.damages || move.damages.length === 0 || move.damages.every(d => !d.dealDamage)) {
      const line = document.createElement("div");
      line.className = "damage-line";
      line.innerHTML = `<span class="dmg-name" style="color:#888;">${t('calc_js_utility')}</span>`;
      card.appendChild(line);
      movesGrid.appendChild(card);
      return;
    }

    move.damages.forEach(dmg => {
      if (!dmg.dealDamage) return;

      let relevantAtk = state.currentAttacker.style === "special" ? atkStats.sp_atk : atkStats.atk;
      let relevantDef = state.currentAttacker.style === "special" ? defStats.sp_def : defStats.def;

      if (dmg.scaling === "physical") { relevantAtk = atkStats.atk; relevantDef = defStats.def; }
      if (dmg.scaling === "special") { relevantAtk = atkStats.sp_atk; relevantDef = defStats.sp_def; }

      let effectiveDef = relevantDef;
      if (slickIgnore > 0) effectiveDef = Math.floor(effectiveDef * (1 - slickIgnore));
      if (infiltratorIgnore > 0) effectiveDef = Math.floor(effectiveDef * (1 - infiltratorIgnore));
      if (defenderFlashFireReduction > 0) effectiveDef = Math.floor(effectiveDef / (1 - defenderFlashFireReduction));

      let normal = calculateDamage(dmg, relevantAtk, effectiveDef, state.attackerLevel, false, state.currentAttacker.pokemonId, 1.0, globalDamageMult, defStats.hp);
      let crit = calculateDamage(dmg, relevantAtk, effectiveDef, state.attackerLevel, true, state.currentAttacker.pokemonId, scopeCritBonus, globalDamageMult, defStats.hp);

      const muscleMult = getBuzzwoleMuscleMultiplier(move.name, dmg.name);
      normal = Math.floor(normal * muscleMult);
      crit = Math.floor(crit * muscleMult);

      const woundMult = getAttackerWoundMultiplier();
      normal = Math.floor(normal * woundMult);
      crit = Math.floor(crit * woundMult);

      if (move.name === "Auto-attack" && state.attackerFlashFireActive && state.currentAttacker.pokemonId === "armarouge") {
        const passive = state.currentAttacker.passive || { extraAutoMultiplier: 60, extraAutoConstant: 120 };
        const bonus = calculateDamage({ multiplier: passive.extraAutoMultiplier, levelCoef: 0, constant: passive.extraAutoConstant }, relevantAtk, effectiveDef, state.attackerLevel);
        normal += bonus;
        crit += bonus;
      }

      normal = Math.floor(normal * defenderDamageMult);
      crit = Math.floor(crit * defenderDamageMult);

      let displayedNormal = normal;
      let displayedCrit = crit;

      if (hasChoiceSpecs && firstHit && (dmg.scaling === "special" || state.currentAttacker.style === "special")) {
        displayedNormal += choiceSpecsBonus;
        displayedCrit += choiceSpecsBonus;
        displayedNormal = Math.floor(displayedNormal * defenderDamageMult);
        displayedCrit = Math.floor(displayedCrit * defenderDamageMult);
      }

      const line = document.createElement("div");
      line.className = "damage-line";

      const canCrit = move.can_crit === "true" || move.can_crit === true;

      if (canCrit) {
        line.innerHTML = `
          <span class="dmg-name">${dmg.name}${dmg.notes ? `<br><i>${dmg.notes}</i>` : ""}</span>
          <div class="dmg-values">
            <span class="dmg-normal">${displayedNormal.toLocaleString()}</span>
            <span class="dmg-crit">(${displayedCrit.toLocaleString()})</span>
          </div>
        `;
      } else {
        line.innerHTML = `
          <span class="dmg-name">${dmg.name}${dmg.notes ? `<br><i>${dmg.notes}</i>` : ""}</span>
          <div class="dmg-values">
            <span class="dmg-normal">${displayedNormal.toLocaleString()}</span>
          </div>
        `;
      }

      card.appendChild(line);

      if (
        state.currentDefender?.pokemonId === "falinks" &&
        state.defenderFalinksMultiHit
      ) {
        const capValue = Math.floor(displayedNormal * 1.10);
        const capLine = document.createElement("div");
        capLine.className = "damage-line";
        capLine.innerHTML = `
          <span class="dmg-name" style="color:#cc99ff;font-size:0.85em;">⚠️ Cap multi-hit Falinks (110%)</span>
          <div class="dmg-values">
            <span class="dmg-normal" style="color:#cc99ff;">${capValue.toLocaleString()}</span>
          </div>
        `;
        card.appendChild(capLine);
      }

      firstHit = false;
    });

    if (move.name === "Auto-attack") {
      if (aaResults.hasMuscle) {
        let muscleExtra = Math.floor(aaResults.muscleExtra * defenderDamageMult);
        const line = document.createElement("div");
        line.className = "damage-line";
        line.innerHTML = `<span class="dmg-name">${t('calc_js_muscle_band')}</span><div class="dmg-values"><span class="dmg-crit">+ ${muscleExtra.toLocaleString()}</span></div>`;
        card.appendChild(line);
      }

      if (aaResults.hasScope) {
        let scopeExtra = Math.floor(aaResults.scopeExtra * defenderDamageMult);
        const line = document.createElement("div");
        line.className = "damage-line";
        line.innerHTML = `<span class="dmg-name">${t('calc_js_scope_lens')}</span><div class="dmg-values"><span class="dmg-crit">+ ${scopeExtra.toLocaleString()}</span></div>`;
        card.appendChild(line);
      }

      let hasRazorClaw = false;
      let razorBonusPercent = 0;
      state.attackerItems.forEach(item => {
        if (item?.name === "Razor Claw" && item.level20) {
          hasRazorClaw = true;
          razorBonusPercent = parseFloat(item.level20.replace('%', '')) / 100;
        }
      });

      if (hasRazorClaw && razorBonusPercent > 0) {
        const razorExtraBase = Math.floor(atkStats.atk * razorBonusPercent) + 20;
        let razorExtra = calculateDamage({ constant: razorExtraBase, multiplier: 0, levelCoef: 0 }, atkStats.atk, defStats.def, state.attackerLevel, false, null, 1.0, globalDamageMult, defStats.hp);
        razorExtra = Math.floor(razorExtra * defenderDamageMult);
        const line = document.createElement("div");
        line.className = "damage-line";
        line.innerHTML = `<span class="dmg-name">${t('calc_js_razor_claw')}</span><div class="dmg-values"><span class="dmg-crit">+ ${razorExtra.toLocaleString()}</span></div>`;
        card.appendChild(line);
      }
    }

    if (move.name === "Weak Armor (Passive)") {
      const weakArmor = getCeruledgeWeakArmorDamage(atkStats, defStats, globalDamageMult);
      if (weakArmor) {
        const line = document.createElement("div");
        line.className = "damage-line";
        line.innerHTML = `
          <span class="dmg-name">Weak Armor DoT (${state.attackerPassiveStacks} stacks)</span>
          <div class="dmg-values">
            <span class="dmg-normal">
              ${weakArmor.perTick.toLocaleString()} × 6
              <span style="opacity:.7">(${weakArmor.total.toLocaleString()})</span>
            </span>
          </div>
        `;
        card.appendChild(line);
      }
    }

    movesGrid.appendChild(card);
  });
}