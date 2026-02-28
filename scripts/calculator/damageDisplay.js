import { state } from './state.js';
import { getModifiedStats, calculateDamage, getAutoAttackResults } from './damageCalculator.js';
import { renderHealLine } from './healCalculator.js';
import { renderShieldLine } from './shieldCalculator.js';
import { updateHPDisplays } from './uiManager.js';
import { t } from './i18n.js';
import { stackableItems } from './constants.js';
import { getMobHPAtTimer } from './constants.js';
import { addMoveToLog } from './combatLog.js';
import { getAllies, appendAllyBadges, onAlliesChange } from './allyManager.js';

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

onAlliesChange(() => updateDamages());

// ── Helpers niveau ────────────────────────────────────────────────────────────

/**
 * Un move est visible si :
 * - pas de learnLevel (Auto-attack, Unite) → toujours visible
 * - learnLevel <= niveau actuel
 * - unlearn null OU niveau actuel < unlearn
 */
function isMoveVisible(move, level) {
  if (move.learnLevel == null) return true;
  if (move.learnLevel > level) return false;
  if (move.unlearn != null && level >= move.unlearn) return false;
  return true;
}

/**
 * Un move est en version upgradée si upgradeLevel est défini et atteint.
 */
function isMoveUpgraded(move, level) {
  return move.upgradeLevel != null && level >= move.upgradeLevel;
}

/**
 * Filtre les damages/heals/shields selon la version.
 * - upgradé  → uniquement les entrées avec upgraded: true
 * - normal   → uniquement les entrées sans upgraded: true (ou sans le champ)
 * - si aucune entrée n'a le champ upgraded → on retourne tout (rétrocompatibilité)
 */
function filterByUpgrade(items, upgraded) {
  if (!items?.length) return items || [];
  const hasUpgradedEntries = items.some(i => i.upgraded === true);
  if (!hasUpgradedEntries) return items; // pas de versioning → tout afficher
  if (upgraded) return items.filter(i => i.upgraded === true);
  return items.filter(i => !i.upgraded);
}

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

  if (state.currentDefender?.timerBased && state.currentDefender.hpTable) {
    defStats.hp = getMobHPAtTimer(state.currentDefender.hpTable, state.defenderTimer);
  }

  if (state.currentAttacker?.pokemonId === "mega-gyarados" && state.attackerMoldBreakerActive) {
    atkStats.atk = Math.floor(atkStats.atk * (1 + state.currentAttacker.passive.bonusPercentAtk / 100));
  }

  if (state.currentDefender?.pokemonId === "mega-gyarados" && state.defenderMoldBreakerActive) {
    defStats.def    = Math.floor(defStats.def    * (1 + state.currentDefender.passive.bonusPercentDef    / 100));
    defStats.sp_def = Math.floor(defStats.sp_def * (1 + state.currentDefender.passive.bonusPercentSpDef / 100));
  }

  if (state.currentDefender?.pokemonId === "mamoswine") {
    const stacks = Math.min(state.defenderPassiveStacks, 3);
    if (stacks > 0) {
      const levelBonus = 10 * (state.defenderLevel - 1) + 20;
      defStats.def    = Math.floor(defStats.def    + stacks * levelBonus);
      defStats.sp_def = Math.floor(defStats.sp_def + stacks * levelBonus);
    }
  }

  if (state.currentDefender?.pokemonId === "mega-charizard-x" && state.defenderZardToughClaw) {
    defStats.def    = Math.floor(defStats.def    * (1 + state.currentDefender.passive.bonusPercentDef    / 100));
    defStats.sp_def = Math.floor(defStats.sp_def * (1 + state.currentDefender.passive.bonusPercentSpDef / 100));
  }

  if (state.currentAttacker?.pokemonId === "blastoise" && state.attackerHPPercent <= state.currentAttacker.passive.lowHpThreshold) {
    atkStats.atk    = Math.floor(atkStats.atk    * (1 + state.currentAttacker.passive.bonusPercentAtk    / 100));
    atkStats.sp_atk = Math.floor(atkStats.sp_atk * (1 + state.currentAttacker.passive.bonusPercentSpAtk / 100));
  }

  if (state.currentAttacker?.pokemonId === "mega-lucario") {
    if (state.attackerLucarioForm === "normal")
      atkStats.atk += Math.floor(atkStats.atk * 0.08 * state.attackerLucarioJustifiedStacks);
    if (state.attackerLucarioForm === "mega")
      atkStats.atk += Math.floor(atkStats.atk * 0.05 * state.attackerLucarioAdaptabilityStacks);
  }

  if (state.currentAttacker?.pokemonId === "mewtwo_x") {
    atkStats.atk = Math.floor(atkStats.atk * (1 + state.attackerMewtwoPressureStacks * 0.02 + (state.attackerMewtwoForm === "mega" ? 0.18 : 0)));
  }

  if (state.currentDefender?.pokemonId === "mewtwo_x") {
    defStats.def    = Math.floor(defStats.def    * (1 + state.defenderMewtwoPressureStacks * 0.02 + (state.defenderMewtwoForm === "mega" ? 0.18 : 0)));
    defStats.sp_def = Math.floor(defStats.sp_def * (1 + state.defenderMewtwoPressureStacks * 0.02 + (state.defenderMewtwoForm === "mega" ? 0.18 : 0)));
  }

  if (state.currentAttacker?.pokemonId === "mewtwo_y") {
    atkStats.sp_atk = Math.floor(atkStats.sp_atk * (1 + state.attackerMewtwoYPressureStacks * 0.015 + (state.attackerMewtwoYForm === "mega" ? 0.10 : 0)));
  }

  if (state.currentDefender?.pokemonId === "sylveon" && state.defenderLevel > 3) {
    defStats.sp_def = Math.floor(defStats.sp_def * (1 + state.defenderPassiveStacks * 0.025));
  }

  if (state.currentAttacker?.pokemonId === "machamp" && state.attackerMachampActive) {
    atkStats.atk = Math.floor(atkStats.atk * (1 + state.currentAttacker.passive.bonusPercentAtk / 100));
  }

  if (state.currentAttacker?.pokemonId === "greninja" && state.attackerHPPercent <= state.currentAttacker.passive.lowHpThreshold) {
    atkStats.atk = Math.floor(atkStats.atk * (1 + state.currentAttacker.passive.bonusPercentAtk / 100));
  }

  if (state.currentAttacker?.pokemonId === "tyranitar" && state.attackerLevel <= 5 && state.attackerTyranitarGutsActive) {
    atkStats.atk = Math.floor(atkStats.atk * 1.30);
  }

  if (state.currentAttacker?.pokemonId === "sylveon") {
    const percent = state.attackerLevel <= 3 ? 0.05 : 0.025;
    atkStats.sp_atk = Math.floor(atkStats.sp_atk * (1 + percent * state.attackerPassiveStacks));
  }

  if (state.currentAttacker?.pokemonId === "zeraora") {
    atkStats.atk += Math.min(Math.floor(state.attackerZeraoraDamageReceived * 0.08), 200);
  }

  if (state.currentAttacker?.pokemonId === "tinkaton") {
    atkStats.atk = Math.floor(atkStats.atk * (1 + 0.005 * state.attackerPassiveStacks));
  }

  const currentDefHP = Math.floor(defStats.hp * (state.defenderHPPercent / 100));

  document.getElementById('resultsAttackerName').textContent = state.currentAttacker.displayName;
  document.getElementById('resultsDefenderName').textContent = state.currentDefender?.displayName || 'Aucun';
  document.getElementById('attackerAtk').textContent    = atkStats.atk.toLocaleString();
  document.getElementById('attackerSpAtk').textContent  = atkStats.sp_atk.toLocaleString();

  const isCustom = state.currentDefender?.pokemonId === "custom-doll";
  if (isCustom) {
    document.getElementById('defenderMaxHP').textContent      = defStats.hp.toLocaleString();
    document.getElementById('defenderDefCustom').textContent  = defStats.def.toLocaleString();
    document.getElementById('defenderSpDefCustom').textContent = defStats.sp_def.toLocaleString();
  } else {
    document.getElementById('defenderDef').textContent    = defStats.def.toLocaleString();
    document.getElementById('defenderSpDef').textContent  = defStats.sp_def.toLocaleString();
  }

  let baseCritChance = 0;
  if (state.currentAttacker?.stats) {
    baseCritChance = state.currentAttacker.stats[state.attackerLevel - 1]?.crit || 0;
  }

  let totalCritChance = baseCritChance;
  state.attackerItems.forEach(item => {
    if (item?.stats) {
      const critStat = item.stats.find(s => s.label === "Critical-Hit Rate");
      if (critStat?.percent && critStat.value) totalCritChance += critStat.value;
    }
  });
  totalCritChance = Math.min(100, totalCritChance);

  if (["charizard", "cinderace"].includes(state.currentAttacker?.pokemonId) &&
      state.attackerHPPercent <= state.currentAttacker.passive.lowHpThreshold) {
    totalCritChance += state.currentAttacker.passive.bonusCrit;
  }
  if (state.currentAttacker?.pokemonId === "sirfetchd") {
    totalCritChance += state.attackerPassiveStacks * 5;
  }

  document.getElementById('attackerCritChance').textContent = `${totalCritChance}%`;

  document.querySelectorAll('.global-bonus-line').forEach(el => el.remove());

  const itemEffects = applyItemsAndGlobalEffects(atkStats, defStats);
  applyPassiveEffects(atkStats, defStats);
  updateDefenderStatsUI(defStats);

  let defenderDamageMult = 1.0;
  if (state.defenderEldegossBuff)          defenderDamageMult *= 0.85;
  if (state.defenderNinetailsBuff)         defenderDamageMult *= 0.65;
  if (state.defenderNinetailsPlusBuff)     defenderDamageMult *= 0.60;
  if (state.defenderUmbreonBuff)           defenderDamageMult *= 0.85;
  if (state.defenderUmbreonPlusBuff)       defenderDamageMult *= 0.75;
  if (state.defenderBlisseyRedirectionBuff) defenderDamageMult *= 0.50;
  if (state.defenderHoOhRedirectionBuff)   defenderDamageMult *= 0.40;
  if (state.defenderDhelmiseAnchorShotPlus) defenderDamageMult *= 1.50;
  if (state.currentDefender?.pokemonId === "dragonite" && state.defenderMultiscaleActive) defenderDamageMult *= 0.70;
  if (state.defenderMimeActive)            defenderDamageMult *= 0.90;

  const finalEffects = {
    ...itemEffects,
    infiltratorIgnore: state.currentAttacker?.pokemonId === "chandelure"
      ? Math.min(state.attackerPassiveStacks * 0.025, 0.20) : 0,
    defenderFlashFireReduction: state.currentDefender?.pokemonId === "armarouge" && state.defenderFlashFireActive
      ? 0.20 : 0,
    moldBreakerDefPen: state.currentAttacker?.pokemonId === "mega-gyarados" && state.attackerMoldBreakerActive
      ? state.currentAttacker.passive.bonusDefPen / 100 : 0,
    defenderDamageMult
  };

  if (state.currentDefender?.pokemonId === "garchomp") {
    const aaPreview     = getAutoAttackResults(atkStats, defStats, currentDefHP, 1.0);
    const reflectDamage = Math.floor(aaPreview.normal * 0.30);
    const defenderCard  = document.querySelector('.defender-stats');
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
    document.getElementById('defenderDefCustom').textContent   = defStats.def.toLocaleString();
    document.getElementById('defenderSpDefCustom').textContent = defStats.sp_def.toLocaleString();
  } else {
    document.getElementById('defenderDef').textContent    = defStats.def.toLocaleString();
    document.getElementById('defenderSpDef').textContent  = defStats.sp_def.toLocaleString();
  }
}

function applyItemsAndGlobalEffects(atkStats, defStats) {
  const attackerCard = document.querySelector('.attacker-stats');
  const defenderCard = document.querySelector('.defender-stats');

  let choiceSpecsBonus = 0;
  let hasChoiceSpecs   = false;
  let slickIgnore      = 0;
  let scopeCritBonus   = 1.0;
  let globalDamageMult = 1.0;

  if (state.attackerGroudonBuff)      globalDamageMult *= 1.50;
  if (state.attackerRayquazaBuff)     globalDamageMult *= 1.40;
  if (state.attackerBlisseyHandBuff)  globalDamageMult *= 1.15;
  if (state.attackerMimeSwapBuff)     globalDamageMult *= 1.15;
  if (state.attackerMimeSwapPlusBuff) globalDamageMult *= 1.20;
  if (state.attackerMiraidonBuff) {
    globalDamageMult *= state.currentAttacker?.pokemonId === "miraidon" ? 1.30 : 1.10;
  }
  if (state.currentAttacker?.pokemonId === "mega-charizard-y" && state.attackerDroughtActive) globalDamageMult *= 1.10;
  if (state.debuffGoodraMuddyWater)        globalDamageMult *= 0.85;
  if (state.debuffMimePowerSwap)           globalDamageMult *= 0.85;
  if (state.debuffMimePowerSwapPlus)       globalDamageMult *= 0.80;
  if (state.debuffTrevenantWoodHammerPlus) globalDamageMult *= 0.80;
  if (state.debuffPsyduckSurfPlus)         globalDamageMult *= 0.75;
  if (state.debuffPsyduckUnite)            globalDamageMult *= 0.70;
  if (state.debuffLatiasMistBall)          globalDamageMult *= 0.75;

  state.attackerItems.forEach((item, i) => {
    if (!item) return;

    if (item.name === "Choice Specs") {
      hasChoiceSpecs = true;
      choiceSpecsBonus = Math.floor(atkStats.sp_atk * parseFloat(item.level20.replace('%', '').trim()) / 100);
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
    const item        = state.attackerItems[chargingIdx];
    const percent     = parseFloat(item.level20.replace('%', '')) / 100;
    const exampleDef  = state.currentAttacker.style === "special" ? defStats.sp_def : defStats.def;
    const chargingBase  = 40 + Math.floor(atkStats.atk * percent);
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
    const item       = state.defenderItems[rockyIdx];
    const rockyDamage = Math.floor(defStats.hp * parseFloat(item.level20.replace('%', '')) / 100);
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

  // ── RESONANT GUARD ─────────────────────────────────────────────────────
  ['attacker', 'defender'].forEach(side => {
    const items = side === 'attacker' ? state.attackerItems : state.defenderItems;
    const stats = side === 'attacker' ? atkStats : defStats;
    const card  = side === 'attacker' ? attackerCard : defenderCard;
    const idx   = items.findIndex(i => i?.name === "Resonant Guard");
    if (idx === -1) return;
    const shieldAmt = Math.floor(stats.hp * parseFloat(items[idx].level20.replace('%', '')) / 100);
    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:10px;background:#1a2a2b;border-radius:8px;border-left:4px solid #64b5f6;display:flex;align-items:center;gap:12px;">
        <img src="assets/items/resonant_guard.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/items/missing.png'">
        <div style="flex:1;">
          <strong style="color:#64b5f6;">Resonant Guard</strong><br>
          <span style="font-size:0.85rem;color:#a0c4d8;">Shield on hit (holder + lowest HP ally)</span><br>
          <span style="color:#64b5f6;font-family:'Exo 2',sans-serif;font-size:1.4rem;font-weight:900;">${shieldAmt.toLocaleString()}</span>
        </div>
      </div>
    `;
    card.appendChild(line);
  });

  // ── DRAIN CROWN ────────────────────────────────────────────────────────
  ['attacker', 'defender'].forEach(side => {
    const items = side === 'attacker' ? state.attackerItems : state.defenderItems;
    const card  = side === 'attacker' ? attackerCard : defenderCard;
    const idx   = items.findIndex(i => i?.name === "Drain Crown");
    if (idx === -1) return;
    const percent = parseFloat(items[idx].level20.replace('%', ''));
    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:10px;background:#1a2d1a;border-radius:8px;border-left:4px solid #4caf82;display:flex;align-items:center;gap:12px;">
        <img src="assets/items/drain_crown.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/items/missing.png'">
        <div style="flex:1;">
          <strong style="color:#4caf82;">Drain Crown</strong><br>
          <span style="font-size:0.85rem;color:#a0c8a0;">Heals ${percent}% of AA physical damage dealt</span><br>
          <span style="font-size:0.8rem;color:#6a9a6a;">(shown in green next to each AA damage value)</span>
        </div>
      </div>
    `;
    card.appendChild(line);
  });

  // ── ASSAULT VEST ───────────────────────────────────────────────────────
  ['attacker', 'defender'].forEach(side => {
    const items = side === 'attacker' ? state.attackerItems : state.defenderItems;
    const stats = side === 'attacker' ? atkStats : defStats;
    const card  = side === 'attacker' ? attackerCard : defenderCard;
    const idx   = items.findIndex(i => i?.name === "Assault Vest");
    if (idx === -1) return;
    const shieldAmt = Math.floor(stats.hp * parseFloat(items[idx].level20.replace('%', '')) / 100);
    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:10px;background:#1a2a2b;border-radius:8px;border-left:4px solid #64b5f6;display:flex;align-items:center;gap:12px;">
        <img src="assets/items/assault_vest.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/items/missing.png'">
        <div style="flex:1;">
          <strong style="color:#64b5f6;">Assault Vest</strong><br>
          <span style="font-size:0.85rem;color:#a0c4d8;">Shield vs Sp. Attack (15s no Sp. dmg)</span><br>
          <span style="color:#64b5f6;font-family:'Exo 2',sans-serif;font-size:1.4rem;font-weight:900;">${shieldAmt.toLocaleString()}</span>
        </div>
      </div>
    `;
    card.appendChild(line);
  });

  // ── FOCUS BAND ─────────────────────────────────────────────────────────
  ['attacker', 'defender'].forEach(side => {
    const items  = side === 'attacker' ? state.attackerItems : state.defenderItems;
    const stats  = side === 'attacker' ? atkStats : defStats;
    const hpPct  = side === 'attacker' ? state.attackerHPPercent : state.defenderHPPercent;
    const card   = side === 'attacker' ? attackerCard : defenderCard;
    const idx    = items.findIndex(i => i?.name === "Focus Band");
    if (idx === -1) return;

    const percent    = parseFloat(items[idx].level20.replace('%', '')) / 100;
    const missingHP  = stats.hp - Math.floor(stats.hp * (hpPct / 100));
    const healTotal  = Math.floor(missingHP * percent);
    const healPerSec = Math.floor(healTotal / 3);

    const oppItems     = side === 'attacker' ? state.defenderItems : state.attackerItems;
    const oppActivated = side === 'attacker' ? state.defenderItemActivated : state.attackerItemActivated;
    let curseMult = 1.0;
    ['Curse Bangle', 'Curse Incense'].forEach(name => {
      const ci = oppItems.findIndex(i => i?.name === name);
      if (ci !== -1 && oppActivated[ci])
        curseMult *= 1 - parseFloat(oppItems[ci].level20.replace('%', '')) / 100;
    });

    let bigRootMult = 1.0;
    if (side === 'attacker') {
      const bri = items.findIndex(i => i?.name === "Big Root");
      if (bri !== -1) bigRootMult = 1 + parseFloat(items[bri].level20.replace('%', '')) / 100;
    }

    const selfHeal   = Math.floor(healTotal  * bigRootMult * curseMult);
    const selfPerSec = Math.floor(healPerSec * bigRootMult * curseMult);

    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:10px;background:#1a2d1a;border-radius:8px;border-left:4px solid #4caf82;display:flex;align-items:center;gap:12px;">
        <img src="assets/items/focus_band.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/items/missing.png'">
        <div style="flex:1;">
          <strong style="color:#4caf82;">Focus Band</strong><br>
          <span style="font-size:0.85rem;color:#a0c8a0;">When below 25% HP: heals ${(percent * 100).toFixed(0)}% missing HP over 3s</span><br>
          <span style="color:#4caf82;font-family:'Exo 2',sans-serif;font-size:1.4rem;font-weight:900;">${selfHeal.toLocaleString()}</span>
          <span style="color:#4caf82;font-size:0.9rem;opacity:0.8;"> (${selfPerSec.toLocaleString()}/s)</span>
        </div>
      </div>
    `;
    card.appendChild(line);
  });

  // ── CURSE BANGLE / CURSE INCENSE ──────────────────────────────────────
  [
    { name: "Curse Bangle",  img: "curse_bangle",  label: "Curse Bangle",  sub: "Weakens HP recovery on Atk-based hit" },
    { name: "Curse Incense", img: "curse_incense", label: "Curse Incense", sub: "Weakens HP recovery on Sp. Atk-based hit" }
  ].forEach(({ name, img, label, sub }) => {
    ['attacker', 'defender'].forEach(side => {
      const items     = side === 'attacker' ? state.attackerItems : state.defenderItems;
      const activated = side === 'attacker' ? state.attackerItemActivated : state.defenderItemActivated;
      const card      = side === 'attacker' ? attackerCard : defenderCard;
      const idx       = items.findIndex(i => i?.name === name);
      if (idx === -1) return;
      const percent  = parseFloat(items[idx].level20.replace('%', ''));
      const isActive = activated[idx];
      const line = document.createElement("div");
      line.className = "global-bonus-line";
      line.innerHTML = `
        <div style="margin:12px 0;padding:10px;background:#2a1a1a;border-radius:8px;border-left:4px solid #ef5350;display:flex;align-items:center;gap:12px;">
          <img src="assets/items/${img}.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/items/missing.png'">
          <div style="flex:1;">
            <strong style="color:#ef5350;">${label}</strong><br>
            <span style="font-size:0.85rem;color:#c8a0a0;">${sub}</span><br>
            <span style="color:${isActive ? '#ef5350' : '#6a8587'};font-weight:bold;">
              ${isActive ? `-${percent}% enemy heals` : 'Inactive'}
            </span>
          </div>
        </div>
      `;
      card.appendChild(line);
    });
  });

  // ── SCORE SHIELD ───────────────────────────────────────────────────────
  ['attacker', 'defender'].forEach(side => {
    const items = side === 'attacker' ? state.attackerItems : state.defenderItems;
    const stats = side === 'attacker' ? atkStats : defStats;
    const card  = side === 'attacker' ? attackerCard : defenderCard;
    const idx   = items.findIndex(i => i?.name === "Score Shield");
    if (idx === -1) return;
    const shieldAmt  = Math.floor(stats.hp * parseFloat(items[idx].level20.replace('%', '')) / 100);
    const rescueIdx  = items.findIndex(i => i?.name === "Rescue Hood");
    const rescueMult = rescueIdx !== -1 ? 1 + parseFloat(items[rescueIdx].level20.replace('%', '')) / 100 : 1.0;
    const boosted    = rescueMult > 1.0 ? Math.floor(shieldAmt * rescueMult) : null;
    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:10px;background:#1a2a2b;border-radius:8px;border-left:4px solid #64b5f6;display:flex;align-items:center;gap:12px;">
        <img src="assets/items/score_shield.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/items/missing.png'">
        <div style="flex:1;">
          <strong style="color:#64b5f6;">Score Shield</strong><br>
          <span style="font-size:0.85rem;color:#a0c4d8;">Shield while scoring</span><br>
          <span style="color:#64b5f6;font-family:'Exo 2',sans-serif;font-size:1.4rem;font-weight:900;">${shieldAmt.toLocaleString()}${boosted ? ` <span style="opacity:0.75;font-size:1.1rem;">/ ${boosted.toLocaleString()}</span>` : ""}</span>
        </div>
      </div>
    `;
    card.appendChild(line);
  });

  // ── SHELL BELL ─────────────────────────────────────────────────────────
  ['attacker', 'defender'].forEach(side => {
    const items = side === 'attacker' ? state.attackerItems : state.defenderItems;
    const stats = side === 'attacker' ? atkStats : defStats;
    const card  = side === 'attacker' ? attackerCard : defenderCard;
    const idx   = items.findIndex(i => i?.name === "Shell Bell");
    if (idx === -1) return;
    const item       = items[idx];
    const constant   = parseFloat(item.level20) || 0;
    const multiplier = item.level20_multiplier ? parseFloat(item.level20_multiplier.replace('%', '')) / 100 : 0;
    const healAmt    = constant + Math.floor(stats.sp_atk * multiplier);

    const bigRootIdx  = items.findIndex(i => i?.name === "Big Root");
    const bigRootMult = bigRootIdx !== -1 ? 1 + parseFloat(items[bigRootIdx].level20.replace('%', '')) / 100 : 1.0;

    const oppItems     = side === 'attacker' ? state.defenderItems : state.attackerItems;
    const oppActivated = side === 'attacker' ? state.defenderItemActivated : state.attackerItemActivated;
    let curseMult = 1.0;
    ['Curse Bangle', 'Curse Incense'].forEach(name => {
      const ci = oppItems.findIndex(i => i?.name === name);
      if (ci !== -1 && oppActivated[ci])
        curseMult *= 1 - parseFloat(oppItems[ci].level20.replace('%', '')) / 100;
    });

    const selfHeal = Math.floor(healAmt * bigRootMult * curseMult);
    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:10px;background:#1a2d1a;border-radius:8px;border-left:4px solid #4caf82;display:flex;align-items:center;gap:12px;">
        <img src="assets/items/shell_bell.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/items/missing.png'">
        <div style="flex:1;">
          <strong style="color:#4caf82;">Shell Bell</strong><br>
          <span style="font-size:0.85rem;color:#a0c8a0;">Heal on move hit (8s CD)</span><br>
          <span style="color:#4caf82;font-family:'Exo 2',sans-serif;font-size:1.4rem;font-weight:900;">${selfHeal.toLocaleString()}</span>
        </div>
      </div>
    `;
    card.appendChild(line);
  });

  // ── VANGUARD BELL ──────────────────────────────────────────────────────
  ['attacker', 'defender'].forEach(side => {
    const items = side === 'attacker' ? state.attackerItems : state.defenderItems;
    const stats = side === 'attacker' ? atkStats : defStats;
    const card  = side === 'attacker' ? attackerCard : defenderCard;
    const idx   = items.findIndex(i => i?.name === "Vanguard Bell");
    if (idx === -1) return;
    const healAmt = Math.floor(stats.hp * parseFloat(items[idx].level20.replace('%', '')) / 100);

    const bigRootIdx  = items.findIndex(i => i?.name === "Big Root");
    const bigRootMult = bigRootIdx !== -1 ? 1 + parseFloat(items[bigRootIdx].level20.replace('%', '')) / 100 : 1.0;

    const oppItems     = side === 'attacker' ? state.defenderItems : state.attackerItems;
    const oppActivated = side === 'attacker' ? state.defenderItemActivated : state.attackerItemActivated;
    let curseMult = 1.0;
    ['Curse Bangle', 'Curse Incense'].forEach(name => {
      const ci = oppItems.findIndex(i => i?.name === name);
      if (ci !== -1 && oppActivated[ci])
        curseMult *= 1 - parseFloat(oppItems[ci].level20.replace('%', '')) / 100;
    });

    const selfHeal = Math.floor(healAmt * bigRootMult * curseMult);
    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:10px;background:#1a2d1a;border-radius:8px;border-left:4px solid #4caf82;display:flex;align-items:center;gap:12px;">
        <img src="assets/items/vanguard_bell.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/items/missing.png'">
        <div style="flex:1;">
          <strong style="color:#4caf82;">Vanguard Bell</strong><br>
          <span style="font-size:0.85rem;color:#a0c8a0;">Heal on hindrance inflicted (5s CD)</span><br>
          <span style="color:#4caf82;font-family:'Exo 2',sans-serif;font-size:1.4rem;font-weight:900;">${selfHeal.toLocaleString()}</span>
        </div>
      </div>
    `;
    card.appendChild(line);
  });

  // ── BIG ROOT ───────────────────────────────────────────────────────────
  ['attacker', 'defender'].forEach(side => {
    const items = side === 'attacker' ? state.attackerItems : state.defenderItems;
    const card  = side === 'attacker' ? attackerCard : defenderCard;
    const idx   = items.findIndex(i => i?.name === "Big Root");
    if (idx === -1) return;
    const percent = parseFloat(items[idx].level20.replace('%', '')) / 100;
    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:10px;background:#1a2d1a;border-radius:8px;border-left:4px solid #4caf82;display:flex;align-items:center;gap:12px;">
        <img src="assets/items/big_root.png" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/items/missing.png'">
        <div style="flex:1;">
          <strong style="color:#4caf82;">Big Root</strong><br>
          <span style="font-size:0.85rem;color:#a0c8a0;">Self-heals boosted by +${(percent * 100).toFixed(0)}%</span><br>
          <span style="font-size:0.8rem;color:#6a9a6a;">(shown between parentheses on heal values)</span>
        </div>
      </div>
    `;
    card.appendChild(line);
  });

  return { choiceSpecsBonus, hasChoiceSpecs, slickIgnore, scopeCritBonus, globalDamageMult };
}

function applyAttackerPassive(pokemonId, atkStats, defStats, card) {
  const handlers = {
    buzzwole: applyBuzzwoleAttacker, ceruledge: applyCeruledgeAttacker,
    chandelure: applyChandelureAttacker, darkrai: applyDarkraiAttacker,
    decidueye: applyDecidueyeAttacker, "mega-charizard-y": applyZardyAttacker,
    aegislash: applyAegislashAttacker, armarouge: applyArmarougeAttacker,
    gyarados: applyGyaradosAttacker, machamp: applyMachampAttacker,
    "mega-gyarados": applyMegaGyaradosAttacker, "mega-lucario": applyMegaLucarioAttacker,
    meowscarada: applyMeowscaradaAttacker, "mewtwo_x": applyMegaMewtwoAttacker,
    "mewtwo_y": applyMegaMewtwoYAttacker, mimikyu: applyMimikyuAttacker,
    rapidash: applyRapidashAttacker, sirfetchd: applySirfetchdAttacker,
    sylveon: applySylveonAttacker, tinkaton: applyTinkatonAttacker,
    tyranitar: applyTyranitarAttacker, zeraora: applyZeraoraAttacker
  };
  handlers[pokemonId]?.(atkStats, defStats, card);
}

function applyDefenderPassive(pokemonId, atkStats, defStats, card) {
  const handlers = {
    aegislash: applyAegislashDefender, armarouge: applyArmarougeDefender,
    "mega-charizard-x": applyZardxDefender, "mega-gyarados": applyMegaGyaradosDefender,
    gyarados: applyGyaradosDefender, crustle: applyCrustleDefender,
    dragonite: applyDragoniteDefender, lapras: applyLaprasDefender,
    mamoswine: applyMamoswineDefender, "mewtwo_x": applyMegaMewtwoDefender,
    "mewtwo_y": applyMegaMewtwoYDefender, "mr_mime": applyMimeDefender,
    sylveon: applySylveonDefender, tyranitar: applyTyranitarDefender,
    umbreon: applyUmbreonDefender, garchomp: applyGarchompDefender,
    falinks: applyFalinksDefender
  };
  handlers[pokemonId]?.(atkStats, defStats, card);
}

function applyPassiveEffects(atkStats, defStats) {
  const attackerCard = document.querySelector('.attacker-stats');
  const defenderCard = document.querySelector('.defender-stats');
  if (state.currentAttacker) applyAttackerPassive(state.currentAttacker.pokemonId, atkStats, defStats, attackerCard);
  if (state.currentDefender) applyDefenderPassive(state.currentDefender.pokemonId, atkStats, defStats, defenderCard);
}

function getAttackerWoundMultiplier() {
  let mult = 1;
  const attacker = state.currentAttacker;
  if (!attacker) return 1;
  switch (attacker.pokemonId) {
    case "ceruledge":    if (state.attackerPassiveStacks >= 6) mult *= 1.15; break;
    case "darkrai":      if (state.attackerDarkraiSleep) mult *= 1.10; break;
    case "decidueye":    if (state.attackerDecidueyeDistant) mult *= 1.20; break;
    case "meowscarada":  if (state.attackerMeowscaradaActive) mult *= 1.15; break;
    case "mimikyu":      if (state.attackerMimikyuActive) mult *= 1.10; break;
    case "venusaur":     if (state.attackerHPPercent <= 30) mult *= 1.20; break;
    case "rapidash":
      if      (state.attackerRapidashStacks >= 5) mult *= 1.60;
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
    atkStats.atk, defStats.def, state.attackerLevel, false, "ceruledge", 1.0, globalDamageMult, defStats.hp
  );
  let totalMult = 1;
  if (stacks > 1) totalMult += (stacks - 1) * 0.5;
  const total = Math.floor(base * totalMult * 6);
  return { perTick: Math.floor(base * totalMult), total };
}

function getBuzzwoleMuscleMultiplier(moveName, damageName) {
  if (state.currentAttacker?.pokemonId !== "buzzwole") return 1;
  const stacks = state.attackerPassiveStacks;
  if (stacks <= 0) return 1;
  if (moveName === "Fell Stinger" || moveName === "Superpower") return 1 + 0.125 * stacks;
  if (moveName === "Leech Life" && damageName.includes("per Tick")) return 1 + 0.015 * stacks;
  return 1;
}

function displayMoves(atkStats, defStats, effects, currentDefHP) {
  const { choiceSpecsBonus, hasChoiceSpecs, slickIgnore, scopeCritBonus, globalDamageMult, infiltratorIgnore, defenderFlashFireReduction, defenderDamageMult } = effects;
  const aaResults = getAutoAttackResults(atkStats, defStats, currentDefHP, globalDamageMult);
  const level = state.attackerLevel;

  movesGrid.innerHTML = "";
  let firstHit = true;

  state.currentAttacker.moves.forEach(move => {

    // ── Filtrage par niveau ───────────────────────────────────────────────
    if (!isMoveVisible(move, level)) return;

    const upgraded = isMoveUpgraded(move, level);

    // Filtrer damages/heals/shields selon version
    const visibleDamages = filterByUpgrade(move.damages, upgraded);
    const visibleHeals   = filterByUpgrade(move.heals,   upgraded);
    const visibleShields = filterByUpgrade(move.shields, upgraded);

    const card = document.createElement("div");
    card.className = "move-card";

    // ── Badge "Upgraded" ──────────────────────────────────────────────────
    if (upgraded) {
      const badge = document.createElement("div");
      badge.style.cssText = `
        display:inline-flex;align-items:center;gap:5px;margin-bottom:6px;
        padding:3px 10px;background:rgba(255,215,64,0.12);
        border:1px solid rgba(255,215,64,0.4);border-radius:20px;
        font-size:0.72rem;color:#ffd740;font-family:'Exo 2',sans-serif;
        font-weight:700;letter-spacing:0.04em;
      `;
      badge.textContent = `⬆️ Upgraded (lvl ${move.upgradeLevel})`;
      card.appendChild(badge);
    }

    const header = document.createElement("div");
    header.className = "move-title";
    header.innerHTML = `<img src="${move.image}" alt="${move.name}" onerror="this.src='assets/moves/missing.png'"> <strong>${move.name}</strong>`;
    card.appendChild(header);

    const hasDamages = visibleDamages?.some(d => d.dealDamage);
    const hasHeals   = visibleHeals?.length > 0;
    const hasShields = visibleShields?.length > 0;

    if (!hasDamages && !hasHeals && !hasShields) {
      const line = document.createElement("div");
      line.className = "damage-line";
      line.innerHTML = `<span class="dmg-name" style="color:#888;">${t('calc_js_utility')}</span>`;
      card.appendChild(line);
      movesGrid.appendChild(card);
      return;
    }

    visibleDamages?.forEach(dmg => {
      if (!dmg.dealDamage) return;

      let relevantAtk = state.currentAttacker.style === "special" ? atkStats.sp_atk : atkStats.atk;
      let relevantDef = state.currentAttacker.style === "special" ? defStats.sp_def  : defStats.def;
      if (dmg.scaling === "physical") { relevantAtk = atkStats.atk;    relevantDef = defStats.def;    }
      if (dmg.scaling === "special")  { relevantAtk = atkStats.sp_atk; relevantDef = defStats.sp_def; }

      let effectiveDef = relevantDef;
      if (slickIgnore > 0)                effectiveDef = Math.floor(effectiveDef * (1 - slickIgnore));
      if (infiltratorIgnore > 0)          effectiveDef = Math.floor(effectiveDef * (1 - infiltratorIgnore));
      if (defenderFlashFireReduction > 0) effectiveDef = Math.floor(effectiveDef / (1 - defenderFlashFireReduction));

      let normal = calculateDamage(dmg, relevantAtk, effectiveDef, state.attackerLevel, false, state.currentAttacker.pokemonId, 1.0,           globalDamageMult, defStats.hp);
      let crit   = calculateDamage(dmg, relevantAtk, effectiveDef, state.attackerLevel, true,  state.currentAttacker.pokemonId, scopeCritBonus, globalDamageMult, defStats.hp);

      const muscleMult = getBuzzwoleMuscleMultiplier(move.name, dmg.name);
      normal = Math.floor(normal * muscleMult);
      crit   = Math.floor(crit   * muscleMult);

      const woundMult = getAttackerWoundMultiplier();
      normal = Math.floor(normal * woundMult);
      crit   = Math.floor(crit   * woundMult);

      if (move.name === "Auto-attack" && state.attackerFlashFireActive && state.currentAttacker.pokemonId === "armarouge") {
        const passive = state.currentAttacker.passive || { extraAutoMultiplier: 60, extraAutoConstant: 120 };
        const bonus   = calculateDamage({ multiplier: passive.extraAutoMultiplier, levelCoef: 0, constant: passive.extraAutoConstant }, relevantAtk, effectiveDef, state.attackerLevel);
        normal += bonus; crit += bonus;
      }

      normal = Math.floor(normal * defenderDamageMult);
      crit   = Math.floor(crit   * defenderDamageMult);

      let displayedNormal = normal;
      let displayedCrit   = crit;

      if (hasChoiceSpecs && firstHit && (dmg.scaling === "special" || state.currentAttacker.style === "special")) {
        displayedNormal = Math.floor((displayedNormal + choiceSpecsBonus) * defenderDamageMult);
        displayedCrit   = Math.floor((displayedCrit   + choiceSpecsBonus) * defenderDamageMult);
      }

      const line      = document.createElement("div");
      line.className  = "damage-line";
      const canCrit   = move.can_crit === "true" || move.can_crit === true;
      const isTick    = !!dmg.is_tick;
      const tickCount = dmg.tick_count || 1;

      if (isTick) {
        const normalTotal = displayedNormal * tickCount;
        const critTotal   = displayedCrit   * tickCount;
        if (canCrit) {
          line.innerHTML = `
            <span class="dmg-name">${dmg.name}${dmg.notes ? `<br><i>${dmg.notes}</i>` : ""}</span>
            <div class="dmg-values">
              <span class="dmg-normal dmg-tick-toggle" data-base="${displayedNormal}" data-total="${normalTotal}" data-ticks="${tickCount}" title="Cliquez pour afficher le total (${tickCount} ticks)">${displayedNormal.toLocaleString()}<sup class="tick-badge">×${tickCount}</sup></span>
              <span class="dmg-crit dmg-tick-toggle"   data-base="${displayedCrit}"   data-total="${critTotal}"   data-ticks="${tickCount}" title="Cliquez pour afficher le total crit (${tickCount} ticks)">(${displayedCrit.toLocaleString()}<sup class="tick-badge">×${tickCount}</sup>)</span>
            </div>
          `;
        } else {
          line.innerHTML = `
            <span class="dmg-name">${dmg.name}${dmg.notes ? `<br><i>${dmg.notes}</i>` : ""}</span>
            <div class="dmg-values">
              <span class="dmg-normal dmg-tick-toggle" data-base="${displayedNormal}" data-total="${normalTotal}" data-ticks="${tickCount}" title="Cliquez pour afficher le total (${tickCount} ticks)">${displayedNormal.toLocaleString()}<sup class="tick-badge">×${tickCount}</sup></span>
            </div>
          `;
        }
      } else if (canCrit) {
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

      if (state.currentDefender?.pokemonId === "falinks" && state.defenderFalinksMultiHit) {
        const capLine = document.createElement("div");
        capLine.className = "damage-line";
        capLine.innerHTML = `
          <span class="dmg-name" style="color:#cc99ff;font-size:0.85em;">⚠️ Cap multi-hit Falinks (110%)</span>
          <div class="dmg-values"><span class="dmg-normal" style="color:#cc99ff;">${Math.floor(displayedNormal * 1.10).toLocaleString()}</span></div>
        `;
        card.appendChild(capLine);
      }

      firstHit = false;
    });

    // ── HEALS ──────────────────────────────────────────────────────────────
    if (visibleHeals?.length > 0) {
      const bigRootIdx  = state.attackerItems.findIndex(i => i?.name === "Big Root");
      const bigRootMult = bigRootIdx !== -1 ? 1 + parseFloat(state.attackerItems[bigRootIdx].level20.replace('%', '')) / 100 : 1.0;
      const rescueIdx   = state.attackerItems.findIndex(i => i?.name === "Rescue Hood");
      const rescueMult  = rescueIdx  !== -1 ? 1 + parseFloat(state.attackerItems[rescueIdx].level20.replace('%', ''))  / 100 : 1.0;

      let curseMult = 1.0;
      const cbdi = state.defenderItems.findIndex(i => i?.name === "Curse Bangle");
      const cidi = state.defenderItems.findIndex(i => i?.name === "Curse Incense");
      if (cbdi !== -1 && state.defenderItemActivated[cbdi]) curseMult *= 1 - parseFloat(state.defenderItems[cbdi].level20.replace('%', '')) / 100;
      if (cidi !== -1 && state.defenderItemActivated[cidi]) curseMult *= 1 - parseFloat(state.defenderItems[cidi].level20.replace('%', '')) / 100;

      visibleHeals.forEach(heal => {
        const line = document.createElement("div");
        line.className = "damage-line";
        line.innerHTML = renderHealLine(heal, atkStats, state.attackerLevel, bigRootMult, rescueMult, curseMult);
        card.appendChild(line);

        const currentAllies = getAllies();
        if (currentAllies.length > 0) {
          const valuesEl = line.querySelector('.dmg-values');
          if (valuesEl && !valuesEl.dataset.noAllies) {
            const allyVal = parseInt(valuesEl.dataset.allyHeal, 10);
            if (!isNaN(allyVal) && allyVal > 0) appendAllyBadges(valuesEl, 'heal', allyVal);
          }
        }
      });
    }

    // ── SHIELDS ────────────────────────────────────────────────────────────
    if (visibleShields?.length > 0) {
      const rescueIdx  = state.attackerItems.findIndex(i => i?.name === "Rescue Hood");
      const rescueMult = rescueIdx !== -1 ? 1 + parseFloat(state.attackerItems[rescueIdx].level20.replace('%', '')) / 100 : 1.0;

      visibleShields.forEach(shield => {
        const mult = shield.target === "ally" ? rescueMult : 1.0;
        const line = document.createElement("div");
        line.className = "damage-line";
        line.innerHTML = renderShieldLine(shield, atkStats, state.attackerLevel, mult);
        card.appendChild(line);

        const currentAllies = getAllies();
        if (currentAllies.length > 0) {
          const valuesEl = line.querySelector('.dmg-values');
          if (valuesEl && !valuesEl.dataset.noAllies) {
            const allyVal = parseInt(valuesEl.dataset.allyShield, 10);
            if (!isNaN(allyVal) && allyVal > 0) appendAllyBadges(valuesEl, 'shield', allyVal);
          }
        }
      });
    }

    // ── BUDDY BARRIER ──────────────────────────────────────────────────────
    if (move.name.includes("(Unite)")) {
      const buddyIdx = state.attackerItems.findIndex(i => i?.name === "Buddy Barrier");
      if (buddyIdx !== -1) {
        const item         = state.attackerItems[buddyIdx];
        const shieldAmount = Math.floor(atkStats.hp * parseFloat(item.level20.replace('%', '')) / 100);
        const rescueIdx    = state.attackerItems.findIndex(i => i?.name === "Rescue Hood");
        const rescueMult   = rescueIdx !== -1 ? 1 + parseFloat(state.attackerItems[rescueIdx].level20.replace('%', '')) / 100 : 1.0;
        const allyShield   = rescueMult > 1.0 ? Math.floor(shieldAmount * rescueMult) : shieldAmount;
        const line = document.createElement("div");
        line.className = "damage-line";
        line.innerHTML = `
          <span class="dmg-name">Buddy Barrier<br><i>Shield on Unite (holder + lowest HP ally)</i></span>
          <div class="dmg-values" data-ally-shield="${allyShield}">
            <span class="dmg-shield">${shieldAmount.toLocaleString()}</span>
          </div>
        `;
        card.appendChild(line);
        const buddyAllies = getAllies();
        if (buddyAllies.length > 0) {
          const valuesEl = line.querySelector('.dmg-values');
          if (valuesEl) appendAllyBadges(valuesEl, 'shield', allyShield);
        }
      }
    }

    // ── AUTO-ATTACK extras ─────────────────────────────────────────────────
    if (move.name === "Auto-attack") {
      if (aaResults.hasMuscle) {
        const line = document.createElement("div");
        line.className = "damage-line";
        line.innerHTML = `<span class="dmg-name">${t('calc_js_muscle_band')}</span><div class="dmg-values"><span class="dmg-crit">+ ${Math.floor(aaResults.muscleExtra * defenderDamageMult).toLocaleString()}</span></div>`;
        card.appendChild(line);
      }
      if (aaResults.hasScope) {
        const line = document.createElement("div");
        line.className = "damage-line";
        line.innerHTML = `<span class="dmg-name">${t('calc_js_scope_lens')}</span><div class="dmg-values"><span class="dmg-crit">+ ${Math.floor(aaResults.scopeExtra * defenderDamageMult).toLocaleString()}</span></div>`;
        card.appendChild(line);
      }

      let razorBonusPercent = 0;
      state.attackerItems.forEach(item => {
        if (item?.name === "Razor Claw" && item.level20)
          razorBonusPercent = parseFloat(item.level20.replace('%', '')) / 100;
      });
      if (razorBonusPercent > 0) {
        const razorExtraBase = Math.floor(atkStats.atk * razorBonusPercent) + 20;
        const razorExtra     = Math.floor(calculateDamage({ constant: razorExtraBase, multiplier: 0, levelCoef: 0 }, atkStats.atk, defStats.def, state.attackerLevel, false, null, 1.0, globalDamageMult, defStats.hp) * defenderDamageMult);
        const line = document.createElement("div");
        line.className = "damage-line";
        line.innerHTML = `<span class="dmg-name">${t('calc_js_razor_claw')}</span><div class="dmg-values"><span class="dmg-crit">+ ${razorExtra.toLocaleString()}</span></div>`;
        card.appendChild(line);
      }

      // ── DRAIN CROWN ─────────────────────────────────────────────────────
      const drainCrownIdx = state.attackerItems.findIndex(i => i?.name === "Drain Crown");
      if (drainCrownIdx !== -1) {
        const drainPercent = parseFloat(state.attackerItems[drainCrownIdx].level20.replace('%', '')) / 100;
        const bigRootIdx   = state.attackerItems.findIndex(i => i?.name === "Big Root");
        const bigRootMult  = bigRootIdx !== -1 ? 1 + parseFloat(state.attackerItems[bigRootIdx].level20.replace('%', '')) / 100 : 1.0;

        let curseMult = 1.0;
        const cbIdx = state.defenderItems.findIndex(i => i?.name === "Curse Bangle");
        const ciIdx = state.defenderItems.findIndex(i => i?.name === "Curse Incense");
        if (cbIdx !== -1 && state.defenderItemActivated[cbIdx]) curseMult *= 1 - parseFloat(state.defenderItems[cbIdx].level20.replace('%', '')) / 100;
        if (ciIdx !== -1 && state.defenderItemActivated[ciIdx]) curseMult *= 1 - parseFloat(state.defenderItems[ciIdx].level20.replace('%', '')) / 100;

        state.currentAttacker.moves.find(m => m.name === "Auto-attack")?.damages?.forEach(dmg => {
          if (!dmg.dealDamage) return;
          let relevantAtk = state.currentAttacker.style === "special" ? atkStats.sp_atk : atkStats.atk;
          let relevantDef = state.currentAttacker.style === "special" ? defStats.sp_def  : defStats.def;
          if (dmg.scaling === "physical") { relevantAtk = atkStats.atk;    relevantDef = defStats.def;    }
          if (dmg.scaling === "special")  { relevantAtk = atkStats.sp_atk; relevantDef = defStats.sp_def; }
          let effectiveDef = relevantDef;
          if (slickIgnore > 0)                effectiveDef = Math.floor(effectiveDef * (1 - slickIgnore));
          if (infiltratorIgnore > 0)          effectiveDef = Math.floor(effectiveDef * (1 - infiltratorIgnore));
          if (defenderFlashFireReduction > 0) effectiveDef = Math.floor(effectiveDef / (1 - defenderFlashFireReduction));

          const drainHeal = Math.floor(
            Math.floor(calculateDamage(dmg, relevantAtk, effectiveDef, state.attackerLevel, false, state.currentAttacker.pokemonId, 1.0, globalDamageMult, defStats.hp) * defenderDamageMult)
            * drainPercent * bigRootMult * curseMult
          );

          card.querySelectorAll('.damage-line').forEach(dl => {
            const nameEl = dl.querySelector('.dmg-name');
            if (nameEl && nameEl.textContent.trim().startsWith(dmg.name)) {
              const valuesEl = dl.querySelector('.dmg-values');
              if (valuesEl) {
                const healSpan = document.createElement('span');
                healSpan.className = 'dmg-heal';
                healSpan.style.cssText = 'margin-left:6px;font-size:0.95em;';
                healSpan.textContent = `(+${drainHeal.toLocaleString()})`;
                valuesEl.appendChild(healSpan);
              }
            }
          });
        });
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
            <span class="dmg-normal">${weakArmor.perTick.toLocaleString()} × 6 <span style="opacity:.7">(${weakArmor.total.toLocaleString()})</span></span>
          </div>
        `;
        card.appendChild(line);
      }
    }

    attachMoveCardClickHandler(card, move);
    movesGrid.appendChild(card);
  });
}

// ── Combat Log ───────────────────────────────────────────────────────────────

function attachMoveCardClickHandler(card, move) {

  // ── Tick toggles avec contrôles +/- ──────────────────────────────────────
  card.querySelectorAll('.heal-tick-toggle, .shield-tick-toggle, .dmg-tick-toggle').forEach(el => {
    const base     = parseInt(el.dataset.base,  10);
    const maxTicks = parseInt(el.dataset.ticks, 10);
    const isCrit   = el.classList.contains('dmg-crit');
    const isHeal   = el.classList.contains('heal-tick-toggle');
    const isShield = el.classList.contains('shield-tick-toggle');
    let currentTicks = maxTicks;
    let expanded = false;

    const wrap = (val) => isCrit ? `(${val})` : val;
    const activeColor = isHeal ? '#4caf82' : isShield ? '#ffd740' : isCrit ? '#ef5350' : '#4fc3f7';

    const renderExpanded = () => {
      const total = base * currentTicks;
      const atMax = currentTicks === maxTicks;
      el.innerHTML = `
        ${wrap(total.toLocaleString())}
        <sup class="tick-badge" style="display:inline-flex;align-items:center;gap:2px;vertical-align:super;font-size:0.6em;line-height:1;">
          <button class="tick-ctrl tick-minus" style="width:15px;height:15px;border-radius:3px;border:none;background:#333;color:#ccc;cursor:pointer;font-size:11px;line-height:1;padding:0;flex-shrink:0;font-weight:bold;">−</button>
          <span style="min-width:18px;text-align:center;font-weight:900;color:${atMax ? activeColor : '#aaa'};">×${currentTicks}</span>
          <button class="tick-ctrl tick-plus" style="width:15px;height:15px;border-radius:3px;border:none;background:#333;color:#ccc;cursor:pointer;font-size:11px;line-height:1;padding:0;flex-shrink:0;font-weight:bold;">+</button>
        </sup>
      `;
      el.style.color = atMax ? activeColor : '';
      el.title = `Par tick : ${base.toLocaleString()} — Max : ${maxTicks} ticks`;
      el.querySelector('.tick-minus').addEventListener('click', (e) => { e.stopPropagation(); if (currentTicks > 1)        { currentTicks--; renderExpanded(); } });
      el.querySelector('.tick-plus' ).addEventListener('click', (e) => { e.stopPropagation(); if (currentTicks < maxTicks) { currentTicks++; renderExpanded(); } });
    };

    const renderCollapsed = () => {
      el.innerHTML = `${wrap(base.toLocaleString())}<sup class="tick-badge">×${maxTicks}</sup>`;
      el.style.color = '';
      el.title = `Cliquez pour afficher le total (${maxTicks} ticks)`;
    };

    renderCollapsed();
    el.addEventListener('click', (e) => {
      if (e.target.closest('.tick-ctrl')) return;
      e.stopPropagation();
      expanded = !expanded;
      expanded ? (currentTicks = maxTicks, renderExpanded()) : renderCollapsed();
    });
  });

  // ── Clic gauche = ajouter au log ──────────────────────────────────────────
  card.addEventListener('click', (e) => {
    if (e.target.closest('.heal-tick-toggle, .shield-tick-toggle, .dmg-tick-toggle, .tick-ctrl')) return;

    const damages = [], heals = [], shields = [];

    card.querySelectorAll('.damage-line').forEach(line => {
      const nameEl = line.querySelector('.dmg-name');
      if (!nameEl) return;
      const name = Array.from(nameEl.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE || n.nodeName === 'BR')
        .map(n => n.textContent).join('').trim() || nameEl.textContent.split('\n')[0].trim();

      const dmgNormal = line.querySelector('.dmg-normal');
      if (dmgNormal) {
        const val = parseInt(dmgNormal.textContent.replace(/[^\d]/g, ''), 10);
        if (!isNaN(val) && val > 0) damages.push({ name, value: val });
      }

      const healEls = line.querySelectorAll('.dmg-heal');
      if (healEls.length > 0) {
        const selfEl = healEls[0], allyEl = healEls[1];
        const isTick    = selfEl.classList.contains('heal-tick-toggle');
        const tickCount = isTick ? parseInt(selfEl.dataset.ticks, 10) : 1;
        const selfRaw   = isTick
          ? parseInt(selfEl.dataset.base, 10) * parseInt(selfEl.querySelector('span')?.textContent?.replace('×','') || selfEl.dataset.ticks, 10)
          : parseInt(selfEl.textContent.replace(/[^\d]/g, ''), 10);
        const allyRaw = allyEl ? parseInt(allyEl.textContent.replace(/[^\d]/g, ''), 10) : selfRaw;
        if (selfRaw > 0) heals.push({ name, selfValue: selfRaw, allyValue: allyRaw || selfRaw, isTick, tickCount });
      }

      const shieldEls = line.querySelectorAll('.dmg-shield');
      if (shieldEls.length > 0) {
        const selfEl = shieldEls[0], allyEl = shieldEls[1];
        const isTick    = selfEl.classList.contains('shield-tick-toggle');
        const tickCount = isTick ? parseInt(selfEl.dataset.ticks, 10) : 1;
        const selfRaw   = isTick
          ? parseInt(selfEl.dataset.base, 10) * parseInt(selfEl.querySelector('span')?.textContent?.replace('×','') || selfEl.dataset.ticks, 10)
          : parseInt(selfEl.textContent.replace(/[^\d]/g, ''), 10);
        const allyRaw = allyEl ? parseInt(allyEl.textContent.replace(/[^\d]/g, ''), 10) : selfRaw;
        if (selfRaw > 0) shields.push({ name, selfValue: selfRaw, allyValue: allyRaw || selfRaw, isTick, tickCount });
      }
    });

    addMoveToLog({ moveName: move.name, moveImage: move.image, damages, heals, shields });
    card.classList.remove('cl-added-flash');
    void card.offsetWidth;
    card.classList.add('cl-added-flash');
    setTimeout(() => card.classList.remove('cl-added-flash'), 500);
  });
}