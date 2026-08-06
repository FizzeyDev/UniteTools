import { state } from './state.js';
import { getModifiedStats, calculateDamage, getAutoAttackResults } from './damageCalculator.js';
import { renderHealLine } from './healCalculator.js';
import { renderShieldLine } from './shieldCalculator.js';
import { updateHPDisplays } from './uiManager.js';
import { t } from './i18n.js';
import { stackableItems } from './constants.js';
import { getMobHPAtTimer } from './constants.js';
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
  applyZeraoraAttacker,
  applyMoltresAttacker,
  applyTyphlosionAttacker,
  applySkeledirgAttacker, 
  applyQuaquavalAttacker,
  applyYveltalAttacker,
  applyPalkiaAttacker,
} from './passiveEffectsAtk.js';

import {
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
} from './passiveEffectsDef.js';

import {
  applyAttackerMoveEffects,
  applyGreninjaSmokescreenStatBuff,
  applyAegislashSacredSwordStatBuff,
  applyAegislashIronHeadStatBuff,
  applyAzumarillBellyBashStatBuff,
  getEonPowerProjectileCount,
  getEonPowerProjectileScaling,
  getLatiasDragonBreathMultiplier,
  getDracoMeteorCometCount,
  getDracoMeteorCometScaling
} from './moveEffectsAtk.js';

import { applyDefenderMoveEffects } from './moveEffectsDef.js';
import { applyPokemonStatMutations } from './statsManager.js';
import { computeGlobalDamageMult, computeDefenderDamageMult, computeHealReductionMult } from './multiplierManager.js';


const movesGrid = document.getElementById("movesGrid");

onAlliesChange(() => updateDamages());

// ── Helpers niveau ────────────────────────────────────────────────────────────
function isMoveVisible(move, level) {
  if (move.learnLevel == null) return true;
  if (move.learnLevel > level) return false;
  if (move.unlearn != null && level >= move.unlearn) return false;
  return true;
}

function isMoveUpgraded(move, level) {
  return move.upgradeLevel != null && level >= move.upgradeLevel;
}

// ── filterByUpgrade — gère aussi blaze_only (Typhlosion) ─────────────────────
// upgraded      : REMPLACE les entrées normales par celles-ci une fois le move upgradé
//                 (ex: Typhlosion Blaze — la formule change entièrement).
// upgrade_bonus : S'AJOUTE aux entrées déjà affichées une fois le move upgradé,
//                 sans rien retirer (ex: Glaceon Icy Wind/Icicle Spear — le dégât
//                 de base reste, un dégât "% HP restants" vient s'ajouter en plus).
function filterByUpgrade(items, upgraded) {
  if (!items?.length) return items || [];

  const blazeActive = state.attackerTyphlosionBlazeActive ?? false;

  // Entrées "bonus" : à part, jamais concernées par le filtre remplace/blaze ci-dessous
  const bonusUpgradeItems = items.filter(i => i.upgrade_bonus === true);
  const baseItems         = items.filter(i => i.upgrade_bonus !== true);

  const hasUpgradedEntries = baseItems.some(i => i.upgraded === true);
  const normalItems = baseItems.filter(i => !i.blaze_only);
  const blazeItems  = baseItems.filter(i =>  i.blaze_only);

  // Filtrer les normales selon upgrade
  let filtered;
  if (!hasUpgradedEntries) {
    filtered = normalItems;
  } else if (upgraded) {
    filtered = normalItems.filter(i => i.upgraded === true);
  } else {
    filtered = normalItems.filter(i => !i.upgraded);
  }

  // Si Blaze actif : remplacer les normales par les blaze_only (même filtre upgrade)
  if (blazeActive && blazeItems.length > 0) {
    filtered = upgraded
      ? blazeItems.filter(i => i.upgraded === true)
      : blazeItems.filter(i => !i.upgraded);
  }

  // Ajouter les entrées "bonus" uniquement si le move est upgradé (sans rien retirer)
  if (upgraded && bonusUpgradeItems.length > 0) {
    filtered = [...filtered, ...bonusUpgradeItems];
  }

  return filtered;
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

  // ── Toutes les mutations de stats Pokémon ─────────────────────────────────
  applyPokemonStatMutations(atkStats, defStats);

  document.getElementById('resultsAttackerName').textContent = state.currentAttacker.displayName;
  document.getElementById('resultsDefenderName').textContent = state.currentDefender?.displayName || 'Aucun';

  const currentDefHP = state.defenderHPAbsolute != null
    ? Math.min(state.defenderHPAbsolute, defStats.hp)
    : Math.floor(defStats.hp * (state.defenderHPPercent / 100));

  if (state.currentAttacker?.pokemonId === "crustle" && state.attackerShellSmashActive) {
    const level = state.attackerLevel;
    const baseStats = state.currentAttacker.stats[level - 1];
    const rate = level >= 11 ? 0.50 : 0.40;
    const atkBonus   = Math.floor(baseStats.def    * rate);
    const spAtkBonus = Math.floor(baseStats.sp_def * rate);
    const totalAtk   = atkStats.atk    + atkBonus;
    const totalSpAtk = atkStats.sp_atk + spAtkBonus;
    document.getElementById('attackerAtk').innerHTML =
      `${totalAtk.toLocaleString()} <span style="color:#bb86fc;font-size:0.85em;">(+${atkBonus})</span>`;
    document.getElementById('attackerSpAtk').innerHTML =
      `${totalSpAtk.toLocaleString()} <span style="color:#bb86fc;font-size:0.85em;">(+${spAtkBonus})</span>`;
  } else {
    document.getElementById('attackerAtk').textContent   = atkStats.atk.toLocaleString();
    document.getElementById('attackerSpAtk').textContent = atkStats.sp_atk.toLocaleString();
  }

  const isCustom = state.currentDefender?.pokemonId === "custom-doll";
  document.getElementById('defenderMaxHP').textContent = defStats.hp.toLocaleString();
  if (isCustom) {
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
  if (state.currentAttacker?.pokemonId === "inteleon" && state.attackerInteleonAzureSpyVisionActive) {
    totalCritChance *= 2;
  }
  if (state.currentAttacker?.pokemonId === "meowscarada" && state.attackerMeowscaradaNightSlashMarkActive) {
    totalCritChance += state.attackerLevel >= 11 ? 65 : 50;
  }
  totalCritChance = Math.min(100, totalCritChance);

  document.getElementById('attackerCritChance').textContent = `${totalCritChance}%`;

  let totalLifesteal = 0;
  if (state.currentAttacker?.stats) {
    totalLifesteal = state.currentAttacker.stats[state.attackerLevel - 1]?.lifesteal || 0;
  }
  state.attackerItems.forEach(item => {
    if (item?.stats) {
      const lsStat = item.stats.find(s => s.label === "Lifesteal" || s.label === "Life Steal");
      if (lsStat?.percent && lsStat.value) totalLifesteal += lsStat.value;
    }
  });
  document.getElementById('attackerLifesteal').textContent = `${totalLifesteal}%`;

  document.querySelectorAll('.global-bonus-line').forEach(el => el.remove());

  const itemEffects = applyItemsAndGlobalEffects(atkStats, defStats);
  applyPassiveEffects(atkStats, defStats);

  // ── Move Effects UI (blocs dans la card attaquant, après passives) ──────────
  const attackerCardForMoves = document.querySelector('.attacker-stats');
  if (attackerCardForMoves && state.currentAttacker) {
    applyAttackerMoveEffects(state.currentAttacker.pokemonId, atkStats, defStats, attackerCardForMoves);
  }

  // ── Move Effects UI (blocs dans la card défenseur, après passives) ──────────
  const defenderCardForMoves = document.querySelector('.defender-stats');
  if (defenderCardForMoves && state.currentDefender) {
    applyDefenderMoveEffects(state.currentDefender.pokemonId, atkStats, defStats, defenderCardForMoves);
  }

  updateDefenderStatsUI(defStats);

  const defenderDamageMult = computeDefenderDamageMult();

  // ── CLEFABLE — Block (Unite) : −25% dégâts reçus pendant le mur ───────────
  const clefableBlockReduc = (
    state.currentDefender?.pokemonId === "clefable" &&
    (state.defenderClefableBlockDmgReduc ?? false)
  ) ? 0.25 : 0;
  const finalDefenderDamageMult = defenderDamageMult * (1 - clefableBlockReduc);

  // ── SKELEDIRGE — Blaze : 35% Sp. Def Pierce sur le prochain move ─────────
  const skeledirgeBlazeIgnore = (
    state.currentAttacker?.pokemonId === "skeledirge" &&
    (state.attackerSkeledirgeBlazeActive ?? false)
  ) ? 0.35 : 0;

  const finalEffects = {
    ...itemEffects,
    infiltratorIgnore: state.currentAttacker?.pokemonId === "chandelure"
      ? Math.min(state.attackerPassiveStacks * 0.025, 0.20) : 0,
    defenderFlashFireReduction: state.currentDefender?.pokemonId === "armarouge" && state.defenderFlashFireActive
      ? 0.20 : 0,
    moldBreakerDefPen: state.currentAttacker?.pokemonId === "mega-gyarados" && state.attackerMoldBreakerActive
      ? state.currentAttacker.passive.bonusDefPen / 100 : 0,
    skeledirgeBlazeIgnore,   // ← SKELEDIRGE
    defenderDamageMult: finalDefenderDamageMult   // ← includes CLEFABLE Block −25%
  };

  if (state.currentDefender?.pokemonId === "garchomp") {
    const aaPreview     = getAutoAttackResults(atkStats, defStats, currentDefHP, 1.0);
    const reflectDamage = Math.floor(aaPreview.normal * 0.30);
    const defenderCard  = document.querySelector('.defender-stats');
    const line = document.createElement("div");
    line.className = "global-bonus-line";
    line.innerHTML = `
      <div style="margin:12px 0;padding:8px 12px;background:#2a1f0f;border-radius:8px;border-left:4px solid #ff9d00;font-size:0.9rem;">
        <strong style="color:#ff9d00;">${t('calc_js_rough_skin')}</strong> - ${t('calc_js_rough_skin_desc')}<strong>${reflectDamage.toLocaleString()}</strong> dmg on AA contact
      </div>
    `;
    defenderCard.appendChild(line);
  }

  displayMoves(atkStats, defStats, finalEffects, currentDefHP);
  updateHPDisplays();
}

function updateDefenderStatsUI(defStats) {
  const isCustom = state.currentDefender?.pokemonId === "custom-doll";
  document.getElementById('defenderMaxHP').textContent = defStats.hp.toLocaleString();
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

  let slickIgnore      = 0;
  let scopeCritBonus   = 1.0;
  let globalDamageMult = computeGlobalDamageMult();

  state.attackerItems.forEach((item, i) => {
    if (!item) return;

    if (item.name === "Choice Specs") {
      // handled in sidebar block below
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

  // ── CHOICE SPECS ───────────────────────────────────────────────────────
  {
    const idx = state.attackerItems.findIndex(i => i?.name === "Choice Specs");
    if (idx !== -1) {
      const item         = state.attackerItems[idx];
      const csConstant   = parseFloat(item.level20) || 0;
      const csMultiplier = item.level20_multiplier
        ? parseFloat(item.level20_multiplier.replace('%', '').trim()) / 100
        : 0;
      const specsBonus = csConstant + Math.floor(atkStats.sp_atk * csMultiplier);
      const line = document.createElement("div");
      line.className = "global-bonus-line";
      line.innerHTML = `
        <div style="margin:12px 0;padding:10px;background:#1a2030;border-radius:8px;border-left:4px solid #4fc3f7;display:flex;align-items:center;gap:12px;">
          <img src="${item.image}" style="width:40px;height:40px;border-radius:6px;" onerror="this.src='assets/items/missing.png'">
          <div style="flex:1;">
            <strong style="color:#4fc3f7;">Choice Specs</strong><br>
            <span style="font-size:0.85rem;color:#a0c4d8;">Additional damage on move hit (8s CD)</span><br>
            <span style="color:#4fc3f7;font-family:'Exo 2',sans-serif;font-size:1.4rem;font-weight:900;">+${specsBonus.toLocaleString()}</span>
          </div>
        </div>
      `;
      attackerCard.appendChild(line);
    }
  }

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

  return { slickIgnore, scopeCritBonus, globalDamageMult };
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
    tyranitar: applyTyranitarAttacker, zeraora: applyZeraoraAttacker,
    
    moltres: applyMoltresAttacker,
    typhlosion: applyTyphlosionAttacker,
    skeledirge: applySkeledirgAttacker,   // ← SKELEDIRGE
    quaquaval: applyQuaquavalAttacker,    // ← QUAQUAVAL
    yveltal: applyYveltalAttacker,        // ← YVELTAL
    palkia: applyPalkiaAttacker,           // ← PALKIA
  };
  handlers[pokemonId]?.(atkStats, defStats, card);
}

function applyDefenderPassive(pokemonId, atkStats, defStats, card) {
  const handlers = {
    aegislash: applyAegislashDefender, armarouge: applyArmarougeDefender,
    articuno: applyArticunoDefender,
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

function addFormulaTooltip(lineEl, dmg, relevantAtk, attacker, level) {
  const nameEl = lineEl.querySelector('.dmg-name');
  if (!nameEl) return;

  const statLabel = dmg.scaling === 'physical' ? 'ATK'
                  : dmg.scaling === 'special'  ? 'Sp.ATK'
                  : attacker?.style === 'special' ? 'Sp.ATK' : 'ATK';

  const parts = [];
  if (dmg.constant)   parts.push(`${dmg.constant}`);
  if (dmg.multiplier) parts.push(`⌊${statLabel}(${relevantAtk}) × ${dmg.multiplier}%⌋`);
  if (dmg.levelCoef)  parts.push(`(lvl-1)×${dmg.levelCoef}`);

  const formula = parts.length ? parts.join(' + ') : '-';

  const notes = [];
  if (dmg.wild_cap)      notes.push(`🔒 Wild cap : ${dmg.wild_cap.toLocaleString()}`);
  if (dmg.def_ignore)    notes.push(`🛡 Def ignore : ${Math.round(dmg.def_ignore * 100)}%`);
  if (dmg.sp_def_ignore) notes.push(`🛡 Sp.Def ignore : ${Math.round(dmg.sp_def_ignore * 100)}%`);
  if (dmg.notes)         notes.push(`ℹ️ ${dmg.notes}`);

  const tooltip = document.createElement('div');
  tooltip.className = 'formula-tooltip';
  tooltip.innerHTML = `
    <div class="formula-tooltip-inner">
      <div class="formula-title">Formule</div>
      <code>${formula}</code>
      ${notes.map(n => `<div class="formula-note">${n}</div>`).join('')}
    </div>
  `;

  nameEl.style.position = 'relative';
  nameEl.style.cursor = 'help';
  nameEl.appendChild(tooltip);
}

function displayMoves(atkStats, defStats, effects, currentDefHP) {
  const {
    slickIgnore, scopeCritBonus, globalDamageMult,
    infiltratorIgnore, defenderFlashFireReduction,
    skeledirgeBlazeIgnore,   // ← SKELEDIRGE
    defenderDamageMult
  } = effects;
  const aaResults = getAutoAttackResults(atkStats, defStats, currentDefHP, globalDamageMult);
  const level = state.attackerLevel;

  movesGrid.innerHTML = "";

  state.currentAttacker.moves.forEach(move => {

    if (!isMoveVisible(move, level)) return;

    const upgraded = isMoveUpgraded(move, level);

    const visibleDamages = filterByUpgrade(move.damages, upgraded);
    const visibleHeals   = filterByUpgrade(move.heals,   upgraded);
    const visibleShields = filterByUpgrade(move.shields, upgraded);

    const card = document.createElement("div");
    card.className = "move-card";

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

      // ── Skip placeholder entries gérées inline (HP% dynamique) ────────────
      // Decidueye : Enhanced+ Additional (Razor Leaf) et Large Quill Bonus (Nock Nock)
      // ont multiplier=0/constant=0 — calculés et affichés séparément ci-dessous.
      if (
        state.currentAttacker?.pokemonId === "decidueye" &&
        dmg.multiplier === 0 && (dmg.constant === 0 || dmg.constant == null) &&
        dmg.max_hp_percent == null && dmg.current_hp_percent == null && dmg.missing_hp_percent == null
      ) return;
      let relevantAtk = state.currentAttacker.style === "special" ? atkStats.sp_atk : atkStats.atk;
      let relevantDef = state.currentAttacker.style === "special" ? defStats.sp_def : defStats.def;
      if (dmg.scaling === "physical") { relevantAtk = atkStats.atk;    relevantDef = defStats.def;    }
      if (dmg.scaling === "special")  { relevantAtk = atkStats.sp_atk; relevantDef = defStats.sp_def; }

      let effectiveDef = relevantDef;
      if (slickIgnore > 0)                effectiveDef = Math.floor(effectiveDef * (1 - slickIgnore));
      if (infiltratorIgnore > 0)          effectiveDef = Math.floor(effectiveDef * (1 - infiltratorIgnore));
      if (defenderFlashFireReduction > 0) effectiveDef = Math.floor(effectiveDef / (1 - defenderFlashFireReduction));

      if (dmg.def_ignore != null && relevantDef === defStats.def) {
        effectiveDef = Math.floor(effectiveDef * (1 - dmg.def_ignore));
      }
      if (dmg.sp_def_ignore != null && relevantDef === defStats.sp_def) {
        effectiveDef = Math.floor(effectiveDef * (1 - dmg.sp_def_ignore));
      }

      // ── SKELEDIRGE — Blaze : 35% Sp. Def Pierce sur le move suivant ──────
      // S'applique uniquement sur la Sp. Def (moves special ou style special)
      if (skeledirgeBlazeIgnore > 0 && relevantDef === defStats.sp_def) {
        effectiveDef = Math.floor(effectiveDef * (1 - skeledirgeBlazeIgnore));
      }

      // ── Moltres : bonus Flame Body sur Incinerate / Heat Wave ────────────
      let moltresBurnMult = 1.0;
      if (state.currentAttacker?.pokemonId === "moltres" && state.attackerPassiveStacks > 0) {
        const burnMoves = ["Incinerate", "Heat Wave"];
        if (burnMoves.includes(move.name)) {
          moltresBurnMult = 1 + 0.10 * state.attackerPassiveStacks;
        }
      }

      // ── Ceruledge : Lava Plume → +15% sur le prochain Auto-attack ────────
      let lavaPlumeMult = 1.0;
      if (state.currentAttacker?.pokemonId === "ceruledge" && state.attackerLavaPlumeActive && move.name === "Auto-attack") {
        lavaPlumeMult = 1.15;
      }

      // ── Lucario : Aura Cannon (Unite) → +20% sur le prochain Power-Up Punch ──
      let auraCannonPUPMult = 1.0;
      if (state.currentAttacker?.pokemonId === "lucario" && state.attackerLucarioAuraCannonPUPActive && move.name === "Power-Up Punch") {
        auraCannonPUPMult = 1.20;
      }

      // ── Machamp : Close Combat+ → +25% dmg si la cible a un statut (lvl 13) ──
      let machampCloseCombatMult = 1.0;
      if (state.currentAttacker?.pokemonId === "machamp" && state.attackerMachampCloseCombatStatusActive && move.name === "Close Combat") {
        machampCloseCombatMult = 1.25;
      }

      // ── Chandelure : Flamethrower+ → +20% sur tous les dégâts (lvl 11+) ──
      let flamethrowerPlusMult = 1.0;
      if (state.currentAttacker?.pokemonId === "chandelure" && state.attackerFlamethrowerPlusActive) {
        flamethrowerPlusMult = 1.20;
      }

      // ── Delphox : Fire Spin+ → +15% sur tous les dégâts (lvl 13+) ──────────
      let fireSpinPlusMult = 1.0;
      if (state.currentAttacker?.pokemonId === "delphox" && state.attackerDelphoxFireSpinPlusActive) {
        fireSpinPlusMult = 1.15;
      }

      // ── Dragapult : Dragon Dance → -10% sur les auto attacks pendant le vol ──
      let dragonDanceFlightMult = 1.0;
      if (state.currentAttacker?.pokemonId === "dragapult" && move.name === "Dragon Dance" && dmg.name?.includes("during flight")) {
        dragonDanceFlightMult = 0.90;
      }

      const effectiveGlobalMult = globalDamageMult * moltresBurnMult * lavaPlumeMult * flamethrowerPlusMult * fireSpinPlusMult * dragonDanceFlightMult * auraCannonPUPMult * machampCloseCombatMult;

      let normal = calculateDamage(dmg, relevantAtk, effectiveDef, state.attackerLevel, false, state.currentAttacker.pokemonId, 1.0,           effectiveGlobalMult, defStats.hp, currentDefHP);
      let crit   = calculateDamage(dmg, relevantAtk, effectiveDef, state.attackerLevel, true,  state.currentAttacker.pokemonId, scopeCritBonus, effectiveGlobalMult, defStats.hp, currentDefHP);

      // ── LATIAS — Dragon Breath : +0.5% dmg / Eon power au-delà de 60 (cap 1059) ──
      // Actif uniquement si le mode Eon Power sélectionné est "dragonBreath"
      // (jamais cumulé avec Dragon Pulse — voir applyLatiasEonPower).
      if (
        state.currentAttacker?.pokemonId === "latias" &&
        move.name === "Dragon Breath" &&
        dmg.name === "Damage" &&
        state.attackerLatiasEonPowerMove === "dragonBreath"
      ) {
        const eonMult = getLatiasDragonBreathMultiplier(state.attackerLatiasEonPower || 0);
        normal = Math.floor(normal * eonMult);
        crit   = Math.floor(crit   * eonMult);
      }

      // ── CRUSTLE — Fury Cutter : +20%/marque (max 40%), arrondi vers le haut ──
      if (state.currentAttacker?.pokemonId === "crustle" && move.name === "Fury Cutter" && dmg.name === "Damage") {
        const fcStacks = state.attackerCrustleFuryCutterStacks ?? 0;
        const fcPct    = Math.min(fcStacks * 0.20, 0.40);
        if (fcPct > 0) {
          normal = Math.ceil(normal * (1 + fcPct));
          crit   = Math.ceil(crit   * (1 + fcPct));
        }
      }

      // ── DECIDUEYE — Spirit Shackle+ (lvl 11) : +15% si cible < 50% HP ──────
      if (
        state.currentAttacker?.pokemonId === "decidueye" &&
        upgraded &&
        move.name === "Spirit Shackle" &&
        dmg.name !== "Enhanced+ Bonus" &&
        currentDefHP != null && defStats.hp > 0 &&
        currentDefHP / defStats.hp < 0.50
      ) {
        normal = Math.floor(normal * 1.15);
        crit   = Math.floor(crit   * 1.15);
      }

      // ── DECIDUEYE — Nock Nock (Unite) : +30% sur Large Quill si < 50% HP ───
      if (
        state.currentAttacker?.pokemonId === "decidueye" &&
        move.name === "Nock Nock (Unite)" &&
        dmg.name === "Damage - Large Quill" &&
        currentDefHP != null && defStats.hp > 0 &&
        currentDefHP / defStats.hp < 0.50
      ) {
        normal = Math.floor(normal * 1.30);
        crit   = Math.floor(crit   * 1.30);
      }

      // ── ESPEON — Future Sight+ (lvl 12) : +15% dmg sur cible verrouillée ────
      if (
        state.currentAttacker?.pokemonId === "espeon" &&
        upgraded &&
        move.name === "Future Sight"
      ) {
        normal = Math.floor(normal * 1.15);
        crit   = Math.floor(crit   * 1.15);
      }

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

      const isWild = state.currentDefender?.category === 'mob';
      const wildCapActive = isWild && dmg.wild_cap != null && normal >= dmg.wild_cap;
      const wildCapBadge = wildCapActive
        ? `<span class="dmg-wild-cap" title="Capped against wild Pokémon">🔒 ${dmg.wild_cap.toLocaleString()}</span>`
        : '';

      let displayedNormal = normal;
      let displayedCrit   = crit;

      const line      = document.createElement("div");
      line.className  = "damage-line";
      const moveCrit  = move.can_crit === "true" || move.can_crit === true;
      const canCrit   = dmg.can_crit !== undefined
        ? (dmg.can_crit === "true" || dmg.can_crit === true)
        : moveCrit;
      const isTick    = !!dmg.is_tick;
      let tickCount   = dmg.tick_count || 1;

      // ── BUZZWOLE — Leech Life+ (lvl 11) : +5% additif par tick successif ──
      let effectiveTickScaling = dmg.tick_scaling;
      if (
        state.currentAttacker?.pokemonId === "buzzwole" &&
        move.name === "Leech Life" &&
        dmg.name.includes("per Tick") &&
        state.attackerLevel >= 11 &&
        !effectiveTickScaling
      ) {
        effectiveTickScaling = Array.from({ length: tickCount }, (_, i) => 1 + 0.05 * i);
      }

      // ── LATIAS / LATIOS — Dragon Pulse : nombre de projectiles + dégâts par
      // projectile (et bonus % HP manquants pour Latios lvl 11+) dépendent de
      // l'Eon Power accumulé (25/50/75/100 → 2/3/4/6 projectiles, -15%/projectile
      // successif cap -75%, +0.5%/point au-delà de 100). Actif uniquement si le
      // mode Eon Power sélectionné pour ce mon est "dragonPulse" (jamais cumulé
      // avec Dragon Breath chez Latias ou Draco Meteor chez Latios).
      if (
        ["latias", "latios"].includes(state.currentAttacker?.pokemonId) &&
        move.name === "Dragon Pulse" &&
        (dmg.name.startsWith("Damage - Projectile") || dmg.name === "Damage - Additional +") &&
        isTick
      ) {
        const isLatias  = state.currentAttacker.pokemonId === "latias";
        const modeKey   = isLatias ? state.attackerLatiasEonPowerMove : state.attackerLatiosEonPowerMove;
        const eonStored = isLatias ? state.attackerLatiasEonPower     : state.attackerLatiosEonPower;
        const eonPower  = modeKey === "dragonPulse" ? (eonStored || 0) : 0;
        tickCount = getEonPowerProjectileCount(eonPower);
        effectiveTickScaling = getEonPowerProjectileScaling(eonPower);
      }

      // ── LATIOS — Draco Meteor : nombre de comètes + dégâts par comète
      // dépendent de l'Eon Power accumulé (+1 comète / 25 Eon power, cap 6 à
      // 100 ; 1ère comète 100%, suivantes -50% flat ; +0.5%/point au-delà de
      // 100). Actif uniquement si le mode Eon Power sélectionné est
      // "dracoMeteor" (jamais cumulé avec Dragon Pulse — voir applyLatiosEonPower).
      if (
        state.currentAttacker?.pokemonId === "latios" &&
        move.name === "Draco Meteor" &&
        (dmg.name === "Damage per Comet" || dmg.name === "Damage - Additional +") &&
        isTick
      ) {
        const eonPower = state.attackerLatiosEonPowerMove === "dracoMeteor"
          ? (state.attackerLatiosEonPower || 0)
          : 0;
        tickCount = getDracoMeteorCometCount(eonPower);
        effectiveTickScaling = getDracoMeteorCometScaling(eonPower);
      }

      const tickScalingAttr = effectiveTickScaling
        ? `data-tick-scaling='${JSON.stringify(effectiveTickScaling)}'`
        : '';

      if (isTick) {
        const computeScaledTotal = (base, scaling, n) => {
          let sum = 0;
          for (let i = 0; i < n; i++) {
            sum += Math.floor(base * (scaling[i] ?? scaling[scaling.length - 1]));
          }
          return sum;
        };

        const normalTotal = effectiveTickScaling
          ? computeScaledTotal(displayedNormal, effectiveTickScaling, tickCount)
          : displayedNormal * tickCount;
        const critTotal = effectiveTickScaling
          ? computeScaledTotal(displayedCrit, effectiveTickScaling, tickCount)
          : displayedCrit * tickCount;

        if (canCrit) {
          line.innerHTML = `
            <span class="dmg-name">${dmg.name}${dmg.notes ? `<br><i>${dmg.notes}</i>` : ""}${wildCapBadge}</span>
            <div class="dmg-values">
              <span class="dmg-normal dmg-tick-toggle" data-base="${displayedNormal}" data-total="${normalTotal}" data-ticks="${tickCount}" ${tickScalingAttr} title="Cliquez pour afficher le total (${tickCount} ticks)">${normalTotal.toLocaleString()}<sup class="tick-badge">×${tickCount}</sup></span>
              <span class="dmg-crit dmg-tick-toggle"   data-base="${displayedCrit}"   data-total="${critTotal}"   data-ticks="${tickCount}" ${tickScalingAttr} title="Cliquez pour afficher le total crit (${tickCount} ticks)">(${critTotal.toLocaleString()}<sup class="tick-badge">×${tickCount}</sup>)</span>
            </div>
          `;
        } else {
          line.innerHTML = `
            <span class="dmg-name">${dmg.name}${dmg.notes ? `<br><i>${dmg.notes}</i>` : ""}${wildCapBadge}</span>
            <div class="dmg-values">
              <span class="dmg-normal dmg-tick-toggle" data-base="${displayedNormal}" data-total="${normalTotal}" data-ticks="${tickCount}" ${tickScalingAttr} title="Cliquez pour afficher le total (${tickCount} ticks)">${normalTotal.toLocaleString()}<sup class="tick-badge">×${tickCount}</sup></span>
            </div>
          `;
        }
      } else if (canCrit) {
        line.innerHTML = `
          <span class="dmg-name">${dmg.name}${dmg.notes ? `<br><i>${dmg.notes}</i>` : ""}${wildCapBadge}</span>
          <div class="dmg-values">
            <span class="dmg-normal">${displayedNormal.toLocaleString()}</span>
            <span class="dmg-crit">(${displayedCrit.toLocaleString()})</span>
          </div>
        `;
      } else {
        line.innerHTML = `
          <span class="dmg-name">${dmg.name}${dmg.notes ? `<br><i>${dmg.notes}</i>` : ""}${wildCapBadge}</span>
          <div class="dmg-values">
            <span class="dmg-normal">${displayedNormal.toLocaleString()}</span>
          </div>
        `;
      }

      card.appendChild(line);

      addFormulaTooltip(line, dmg, relevantAtk, state.currentAttacker, level);

      // ── DECIDUEYE — Razor Leaf Enhanced+ (lvl 11) : 2%/1% HP restants ──────
      if (
        state.currentAttacker?.pokemonId === "decidueye" &&
        upgraded &&
        move.name === "Razor Leaf" &&
        (dmg.name === "Basic - Main Target" || dmg.name === "Basic - Secondary Target") &&
        currentDefHP != null
      ) {
        const isMain      = dmg.name === "Basic - Main Target";
        const hpPct       = isMain ? 2 : 1;
        const cap         = isMain ? 240 : 120;
        const cappedHpDmg = Math.min(Math.floor(currentDefHP * hpPct / 100), cap);
        const hpLine      = document.createElement("div");
        hpLine.className  = "damage-line";
        hpLine.innerHTML  = `
          <span class="dmg-name">${isMain ? 'Enhanced+ Additional (Main)' : 'Enhanced+ Additional (Secondary)'}
            <br><i style="font-size:0.8em;color:#aaa;">${hpPct}% remaining HP — cap ${cap.toLocaleString()}</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-normal">${cappedHpDmg.toLocaleString()}</span>
          </div>
        `;
        card.appendChild(hpLine);
      }

      // ── GARCHOMP — Boosted Auto-attack : +10% HP restants (cap 350 vs sauvage) ──
      if (
        state.currentAttacker?.pokemonId === "garchomp" &&
        move.name === "Auto-attack" &&
        dmg.name === "Boosted" &&
        (state.attackerPassiveStacks || 0) >= 5 &&
        currentDefHP != null
      ) {
        const isWildGarchomp = state.currentDefender?.category === 'mob';
        let hpDmg = Math.floor(currentDefHP * 0.10);
        if (isWildGarchomp) hpDmg = Math.min(hpDmg, 350);
        const hpLine = document.createElement("div");
        hpLine.className = "damage-line";
        hpLine.innerHTML = `
          <span class="dmg-name">Boosted Additional
            <br><i style="font-size:0.8em;color:#aaa;">10% remaining HP${isWildGarchomp ? ' — cap 350 vs wild' : ''}</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-normal">${hpDmg.toLocaleString()}</span>
          </div>
        `;
        card.appendChild(hpLine);
      }

      // ── EMPOLEON — Whirlpool : heal proportionnel aux dégâts infligés ────────────────────
      if (
        state.currentAttacker?.pokemonId === "empoleon" &&
        move.name === "Whirlpool" &&
        dmg.dealDamage
      ) {
        // Reconstruit le total (incluant les ticks) de cette entrée de dégâts,
        // même logique que le bloc d'affichage isTick ci-dessus.
        const computeWhirlpoolTotal = (base, scaling, n) => {
          if (!isTick) return base;
          if (!scaling) return base * n;
          let sum = 0;
          for (let i = 0; i < n; i++) sum += Math.floor(base * (scaling[i] ?? scaling[scaling.length - 1]));
          return sum;
        };
        const whirlpoolDmgTotal = computeWhirlpoolTotal(displayedNormal, effectiveTickScaling, tickCount);

        // 50% des dégâts infligés (60% à partir du niveau 13 / upgrade), moitié contre les Pokémon sauvages
        const whirlpoolHealPct = upgraded ? 0.60 : 0.50;
        const isWildWhirlpool  = state.currentDefender?.category === 'mob';
        const whirlpoolHeal = isWildWhirlpool
          ? Math.floor(whirlpoolDmgTotal * whirlpoolHealPct * 0.5)
          : Math.floor(whirlpoolDmgTotal * whirlpoolHealPct);

        const whirlpoolHealLine = document.createElement("div");
        whirlpoolHealLine.className = "damage-line";
        whirlpoolHealLine.innerHTML = `
          <span class="dmg-name" style="color:#4caf82;">
            Heal
            <br><i style="font-size:0.8em;color:#4caf8299;">${Math.round(whirlpoolHealPct * 100)}% of damage dealt${isWildWhirlpool ? " (half vs wild)" : ""}</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-heal">${whirlpoolHeal.toLocaleString()}</span>
          </div>
        `;
        card.appendChild(whirlpoolHealLine);
      }

      // Stat "lifesteal" du JSON, par entrée de damages[] sauf {"lifesteal": false}.
      // Applique lifesteal si: dmg.lifesteal === true OU (Auto-attack ET dmg.lifesteal !== false)
      const shouldApplyLifesteal = dmg.lifesteal === true || (move.name === "Auto-attack" && dmg.lifesteal !== false);
      if (shouldApplyLifesteal) {
        let lifestealPct = (state.currentAttacker?.stats?.[state.attackerLevel - 1]?.lifesteal ?? 0) / 100;
        // Garchomp — boosted auto attack (5 stacks) grants an additional +30% lifesteal
        if (state.currentAttacker?.pokemonId === "garchomp" && dmg.name === "Boosted" && (state.attackerPassiveStacks || 0) >= 5) {
          lifestealPct += 0.30;
        }
        if (lifestealPct > 0) {
          const lsComputeTotal = (base, scaling, n) => {
            if (!scaling) return base * n;
            let sum = 0;
            for (let i = 0; i < n; i++) sum += Math.floor(base * (scaling[i] ?? scaling[scaling.length - 1]));
            return sum;
          };
          const lsNormalTotal = isTick ? lsComputeTotal(displayedNormal, effectiveTickScaling, tickCount) : displayedNormal;
          const lsCritTotal   = isTick ? lsComputeTotal(displayedCrit,   effectiveTickScaling, tickCount) : displayedCrit;

          const healReductionMult = computeHealReductionMult();
          const lsHealNormal = Math.floor(lsNormalTotal * lifestealPct * healReductionMult);
          const lsHealCrit   = Math.floor(lsCritTotal   * lifestealPct * healReductionMult);

          const lsLine = document.createElement("div");
          lsLine.className = "damage-line";
          lsLine.innerHTML = `
            <span class="dmg-name" style="color:#4caf82;font-size:0.85em;">
              Lifesteal (${dmg.name})
              <br><i style="font-size:0.85em;color:#4caf8299;">${Math.round(lifestealPct * 100)}% of damage dealt</i>
            </span>
            <div class="dmg-values">
              <span class="dmg-heal">${lsHealNormal.toLocaleString()}</span>
              ${canCrit ? `<span class="dmg-heal" style="opacity:0.75;">(${lsHealCrit.toLocaleString()})</span>` : ""}
            </div>
          `;
          card.appendChild(lsLine);
        }
      }

      // ── YVELTAL — Oblivion Wing : heal = 21% of damage dealt (7% vs wild) ──
      if (state.currentAttacker?.pokemonId === "yveltal" && move.name === "Oblivion Wing") {
        const isWildTarget = state.currentDefender?.category === 'mob';
        const healPct = isWildTarget ? 0.07 : 0.21;
        const healReductionMult = computeHealReductionMult();
        const owHealNormal = Math.floor(displayedNormal * healPct * healReductionMult);
        const owHealCrit   = Math.floor(displayedCrit   * healPct * healReductionMult);

        const owHealLine = document.createElement("div");
        owHealLine.className = "damage-line";
        owHealLine.innerHTML = `
          <span class="dmg-name" style="color:#4caf82;font-size:0.85em;">
            Heal (Oblivion Wing)
            <br><i style="font-size:0.85em;color:#4caf8299;">${Math.round(healPct * 100)}% of damage dealt${isWildTarget ? ' (vs wild Pokémon)' : ''} — overheal above Max HP → 2s shield at 50% (stacks ×10, refreshes duration, capacity = latest application)</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-heal">${owHealNormal.toLocaleString()}</span>
            ${canCrit ? `<span class="dmg-heal" style="opacity:0.75;">(${owHealCrit.toLocaleString()})</span>` : ""}
          </div>
        `;
        card.appendChild(owHealLine);
      }

      // ── PALKIA — Pressure : consumed by the next Auto-attack ──────────────
      if (
        state.currentAttacker?.pokemonId === "palkia" &&
        move.name === "Auto-attack" &&
        dmg.dealDamage &&
        Math.min(3, state.attackerPassiveStacks || 0) > 0
      ) {
        const stacks = Math.min(3, state.attackerPassiveStacks || 0);
        const pressureDmg  = stacks * (Math.floor(atkStats.sp_atk * 0.24) + 72);
        const pressureHeal = stacks * (Math.floor(atkStats.sp_atk * 0.35) + 105);

        const pressureLine = document.createElement("div");
        pressureLine.className = "damage-line";
        pressureLine.innerHTML = `
          <span class="dmg-name" style="color:#fff;font-size:0.85em;">
            Pressure — consumed (${stacks} stack${stacks > 1 ? "s" : ""})
            <br><i style="font-size:0.85em;color:#ffffff99;">24% Sp. Atk + 72 dmg & 35% Sp. Atk + 105 heal, per stack</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-normal">${pressureDmg.toLocaleString()}</span>
            <span class="dmg-heal" style="margin-left:8px;color:#4caf82;">+${pressureHeal.toLocaleString()} heal</span>
          </div>
        `;
        card.appendChild(pressureLine);
      }

      // ── PALKIA — Aura Sphere mark : bonus damage + heal, consumes the mark ──
      if (
        state.currentAttacker?.pokemonId === "palkia" &&
        (state.attackerPalkiaAuraSphereMarked ?? false) &&
        dmg.dealDamage
      ) {
        const markDmg  = Math.floor(atkStats.sp_atk * 0.64) + 192;
        const markHeal = Math.floor(atkStats.sp_atk * 0.65) + 195;

        const markLine = document.createElement("div");
        markLine.className = "damage-line";
        markLine.innerHTML = `
          <span class="dmg-name" style="color:#e0b0ff;font-size:0.85em;">
            Aura Sphere — Mark consumed
            <br><i style="font-size:0.85em;color:#e0b0ff99;">64% Sp. Atk + 192 bonus damage & 65% Sp. Atk + 195 heal</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-normal" style="color:#e0b0ff;">${markDmg.toLocaleString()}</span>
            <span class="dmg-heal" style="margin-left:8px;color:#4caf82;">+${markHeal.toLocaleString()} heal</span>
          </div>
        `;
        card.appendChild(markLine);
      }

      // ── YVELTAL — Dark Aura Execute : true dmg + heal on KO (moves & boosted attacks only) ──
      if (
        state.currentAttacker?.pokemonId === "yveltal" &&
        Math.min(5, state.attackerPassiveStacks || 0) === 5 &&
        (state.attackerYveltalExecuteReady ?? false) &&
        !(move.name === "Auto-attack" && dmg.name === "Basic")
      ) {
        const marks       = 5;
        const trueDamage  = defStats?.hp != null ? Math.floor(defStats.hp * 0.40 * (1 + marks * 0.03)) : null;
        const healOnKO    = Math.floor(atkStats.sp_atk * 1.40) + 420;

        const execLine = document.createElement("div");
        execLine.className = "damage-line";
        execLine.innerHTML = `
          <span class="dmg-name" style="color:#e74c3c;font-size:0.85em;">
            Dark Aura — Execute
            <br><i style="font-size:0.85em;color:#e74c3c99;">5 marks + target ≤10% Max HP → +46% Max HP true damage</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-normal" style="color:#e74c3c;">${trueDamage !== null ? trueDamage.toLocaleString() : '—'}</span>
          </div>
        `;
        card.appendChild(execLine);

        const healLine = document.createElement("div");
        healLine.className = "damage-line";
        healLine.innerHTML = `
          <span class="dmg-name" style="color:#4caf82;font-size:0.85em;">
            Heal on KO (Dark Aura)
            <br><i style="font-size:0.85em;color:#4caf8299;">140% Sp. Atk + 420 — overheal above Max HP → 3s shield at 50% conversion</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-heal">${healOnKO.toLocaleString()}</span>
          </div>
        `;
        card.appendChild(healLine);
      }

      // ── CHARIZARD — Seismic Slam (Unite) : heal 60% sur le Basic hit only ──
      if (
        ["charizard", "mega-charizard-x", "mega-charizard-y"].includes(state.currentAttacker?.pokemonId) &&
        state.attackerSeismicSlamActive &&
        move.name === "Auto-attack" &&
        dmg.name === "Basic (per hit x4)"
      ) {
        const computeTotal = (base, scaling, n) => {
          if (!scaling) return base * n;
          let sum = 0;
          for (let i = 0; i < n; i++) sum += Math.floor(base * (scaling[i] ?? scaling[scaling.length - 1]));
          return sum;
        };
        const basicNormalTotal = computeTotal(displayedNormal, effectiveTickScaling, tickCount);
        const basicCritTotal   = computeTotal(displayedCrit,   effectiveTickScaling, tickCount);

        const healPct  = 0.60;
        const healNormal = Math.floor(basicNormalTotal * healPct);
        const healCrit   = Math.floor(basicCritTotal   * healPct);

        const healLine = document.createElement("div");
        healLine.className = "damage-line";
        healLine.innerHTML = `
          <span class="dmg-name" style="color:#4caf82;">
            Heal (Seismic Slam)
            <br><i style="font-size:0.8em;color:#4caf8299;">60% of Basic hit damage · excludes burns & additional damage</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-heal">${healNormal.toLocaleString()}</span>
            <span class="dmg-heal" style="opacity:0.75;">(${healCrit.toLocaleString()})</span>
          </div>
        `;
        card.appendChild(healLine);
      }

      // ── CINDERACE — Feint+ (lvl 13) : heal 30% sur le Basic hit, no crit ───
      if (
        state.currentAttacker?.pokemonId === "cinderace" &&
        state.attackerCinderaceFeintHealActive &&
        move.name === "Auto-attack" &&
        dmg.name === "Basic"
      ) {
        const healPct    = 0.30;
        const healNormal = Math.floor(displayedNormal * healPct);

        const healLine = document.createElement("div");
        healLine.className = "damage-line";
        healLine.innerHTML = `
          <span class="dmg-name" style="color:#4caf82;">
            Heal (Feint+)
            <br><i style="font-size:0.8em;color:#4caf8299;">30% of Basic hit damage · next 3 auto attacks, cannot crit</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-heal">${healNormal.toLocaleString()}</span>
          </div>
        `;
        card.appendChild(healLine);
      }

      // ── DRAGAPULT — Dragon Dance+ (lvl 11) : heal 25% sur les hits pendant le vol ──
      if (
        state.currentAttacker?.pokemonId === "dragapult" &&
        state.attackerLevel >= 11 &&
        state.attackerDragapultDragonDanceHealActive &&
        move.name === "Dragon Dance" &&
        dmg.name?.includes("during flight")
      ) {
        const healPct    = 0.25;
        const healNormal = Math.floor(displayedNormal * healPct);
        const healCrit    = Math.floor(displayedCrit   * healPct);

        const healLine = document.createElement("div");
        healLine.className = "damage-line";
        healLine.innerHTML = `
          <span class="dmg-name" style="color:#4caf82;">
            Heal (Dragon Dance+)
            <br><i style="font-size:0.8em;color:#4caf8299;">25% of damage dealt while flying</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-heal">${healNormal.toLocaleString()}</span>
            ${canCrit ? `<span class="dmg-heal" style="opacity:0.75;">(${healCrit.toLocaleString()})</span>` : ""}
          </div>
        `;
        card.appendChild(healLine);
      }

      if (state.currentDefender?.pokemonId === "falinks" && state.defenderFalinksMultiHit) {
        const capLine = document.createElement("div");
        capLine.className = "damage-line";
        capLine.innerHTML = `
          <span class="dmg-name" style="color:#cc99ff;font-size:0.85em;">⚠️ Cap multi-hit Falinks (110%)</span>
          <div class="dmg-values"><span class="dmg-normal" style="color:#cc99ff;">${Math.floor(displayedNormal * 1.10).toLocaleString()}</span></div>
        `;
        card.appendChild(capLine);
      }

    });

    // ── ABSOL — Night Slash+ (lvl 11) ───────────
    if (
      state.currentAttacker?.pokemonId === "absol" &&
      move.name === "Night Slash" &&
      upgraded
    ) {
      const secondHitDmg = move.damages?.find(d => d.name === "Second Hit");
      if (secondHitDmg) {
        const relevantAtk = atkStats.atk;
        let effectiveDef  = defStats.def;
        if (slickIgnore > 0)       effectiveDef = Math.floor(effectiveDef * (1 - slickIgnore));
        if (infiltratorIgnore > 0) effectiveDef = Math.floor(effectiveDef * (1 - infiltratorIgnore));

        const secondHitNormal = Math.floor(
          calculateDamage(secondHitDmg, relevantAtk, effectiveDef, state.attackerLevel, false,
            state.currentAttacker.pokemonId, 1.0, globalDamageMult, defStats.hp, currentDefHP)
          * defenderDamageMult
        );
        const secondHitCrit = Math.floor(
          calculateDamage(secondHitDmg, relevantAtk, effectiveDef, state.attackerLevel, true,
            state.currentAttacker.pokemonId, scopeCritBonus, globalDamageMult, defStats.hp, currentDefHP)
          * defenderDamageMult
        );

        const bigRootIdx  = state.attackerItems.findIndex(i => i?.name === "Big Root");
        const bigRootMult = bigRootIdx !== -1 ? 1 + parseFloat(state.attackerItems[bigRootIdx].level20.replace('%', '')) / 100 : 1.0;
        let curseMult = 1.0;
        const cbdi = state.defenderItems.findIndex(i => i?.name === "Curse Bangle");
        const cidi = state.defenderItems.findIndex(i => i?.name === "Curse Incense");
        if (cbdi !== -1 && state.defenderItemActivated[cbdi]) curseMult *= 1 - parseFloat(state.defenderItems[cbdi].level20.replace('%', '')) / 100;
        if (cidi !== -1 && state.defenderItemActivated[cidi]) curseMult *= 1 - parseFloat(state.defenderItems[cidi].level20.replace('%', '')) / 100;

        const healNormal = Math.floor(secondHitNormal * 0.50 * bigRootMult * curseMult);
        const healCrit   = Math.floor(secondHitCrit   * 0.50 * bigRootMult * curseMult);

        const healLine = document.createElement("div");
        healLine.className = "damage-line";
        healLine.innerHTML = `
          <span class="dmg-name" style="color:#4caf82;">
            Heal (2nd hit)
            <br><i style="font-size:0.8em;color:#4caf8299;">50% of damage dealt</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-heal">${healNormal.toLocaleString()}</span>
            <span class="dmg-heal" style="opacity:0.75;">(${healCrit.toLocaleString()})</span>
          </div>
        `;
        card.appendChild(healLine);
      }
    }

    // ── CERULEDGE — Bitter Blade (heal proportionnel aux dégâts) ──────────
    if (
      state.currentAttacker?.pokemonId === "ceruledge" &&
      move.name === "Bitter Blade"
    ) {
      const mainDmg = move.damages?.find(d => d.dealDamage);
      if (mainDmg) {
        const relevantAtk = atkStats.atk;
        let effectiveDef  = defStats.def;
        if (slickIgnore > 0)       effectiveDef = Math.floor(effectiveDef * (1 - slickIgnore));
        if (infiltratorIgnore > 0) effectiveDef = Math.floor(effectiveDef * (1 - infiltratorIgnore));

        const mainNormal = Math.floor(
          calculateDamage(mainDmg, relevantAtk, effectiveDef, state.attackerLevel, false,
            state.currentAttacker.pokemonId, 1.0, globalDamageMult, defStats.hp, currentDefHP)
          * defenderDamageMult
        );
        const mainCrit = Math.floor(
          calculateDamage(mainDmg, relevantAtk, effectiveDef, state.attackerLevel, true,
            state.currentAttacker.pokemonId, scopeCritBonus, globalDamageMult, defStats.hp, currentDefHP)
          * defenderDamageMult
        );

        // 50% avant niveau 11, 70% à partir du niveau 11 (upgradeLevel)
        const healPct = upgraded ? 0.70 : 0.50;

        const isWild = state.currentDefender?.category === 'mob';
        const healNormal = isWild ? Math.floor(mainNormal * healPct * 0.5) : Math.floor(mainNormal * healPct);
        const healCrit   = isWild ? Math.floor(mainCrit   * healPct * 0.5) : Math.floor(mainCrit   * healPct);

        const healLine = document.createElement("div");
        healLine.className = "damage-line";
        healLine.innerHTML = `
          <span class="dmg-name" style="color:#4caf82;">
            Heal
            <br><i style="font-size:0.8em;color:#4caf8299;">${Math.round(healPct * 100)}% of damage dealt${isWild ? " (half vs wild)" : ""}</i>
          </span>
          <div class="dmg-values">
            <span class="dmg-heal">${healNormal.toLocaleString()}</span>
            <span class="dmg-heal" style="opacity:0.75;">(${healCrit.toLocaleString()})</span>
          </div>
        `;
        card.appendChild(healLine);
      }
    }

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

      // ── DELPHOX — Fanciful Fireworks (Unite) : −50% HP recovery on attacker ─
      if (state.currentDefender?.pokemonId === "delphox" && state.defenderLevel >= 9 && state.defenderDelphoxFancifulFireworksAntiHeal) {
        curseMult *= 0.50;
      }

      // ── Meganium — Overgrow : +10% heal vers une cible (soi ou allié) à ≤30% PV ──
      const isMeganiumOvergrow = state.currentAttacker?.pokemonId === "meganium";
      const overgrowThreshold  = isMeganiumOvergrow ? (state.currentAttacker.passive?.lowHpThreshold ?? 30) : null;
      const overgrowBonusPct   = isMeganiumOvergrow ? (state.currentAttacker.passive?.bonusHealPercent ?? 10) : 0;

      visibleHeals.forEach(heal => {
        const line = document.createElement("div");
        line.className = "damage-line";
        const casterCurrentHP = state.attackerHPAbsolute != null
          ? Math.min(state.attackerHPAbsolute, atkStats.hp)
          : Math.floor(atkStats.hp * (state.attackerHPPercent / 100));

        const casterHPPercent = atkStats.hp > 0 ? (casterCurrentHP / atkStats.hp) * 100 : 100;
        const overgrowSelfMult = (isMeganiumOvergrow && casterHPPercent <= overgrowThreshold)
          ? 1 + overgrowBonusPct / 100
          : 1.0;

        line.innerHTML = renderHealLine(heal, atkStats, state.attackerLevel, bigRootMult, rescueMult, curseMult, casterCurrentHP, overgrowSelfMult);
        card.appendChild(line);

        const currentAllies = getAllies();
        if (currentAllies.length > 0) {
          const valuesEl = line.querySelector('.dmg-values');
          if (valuesEl && !valuesEl.dataset.noAllies) {
            const allyVal = parseInt(valuesEl.dataset.allyHeal, 10);
            const overgrowAllyMult = isMeganiumOvergrow
              ? (ally => (ally.hpPercent <= overgrowThreshold ? 1 + overgrowBonusPct / 100 : 1))
              : null;
            if (!isNaN(allyVal) && allyVal > 0) appendAllyBadges(valuesEl, 'heal', allyVal, overgrowAllyMult);
          }
        }
      });
    }

    // ── SHIELDS ────────────────────────────────────────────────────────────
    if (visibleShields?.length > 0) {
      const rescueIdx = state.attackerItems.findIndex(i => i?.name === "Rescue Hood");
      const rescueMult = rescueIdx !== -1 ? 1 + parseFloat(state.attackerItems[rescueIdx].level20.replace('%', '')) / 100 : 1.0;

      visibleShields.forEach(shield => {
        // Si target vaut "ally", "both" ou est absent/non défini, on applique rescueMult
        const target = shield.target || "both";
        const mult = (target === "ally" || target === "both") ? rescueMult : 1.0;

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


function attachMoveCardClickHandler(card, move) {

  card.querySelectorAll('.heal-tick-toggle, .shield-tick-toggle, .dmg-tick-toggle').forEach(el => {
    const base     = parseInt(el.dataset.base,  10);
    const maxTicks = parseInt(el.dataset.ticks, 10);
    const isCrit   = el.classList.contains('dmg-crit');
    const isHeal   = el.classList.contains('heal-tick-toggle');
    const isShield = el.classList.contains('shield-tick-toggle');
    let currentTicks = maxTicks;

    const tickScalingRaw = el.dataset.tickScaling;
    const tickScaling    = tickScalingRaw ? JSON.parse(tickScalingRaw) : null;
    const hasTickScaling = !!tickScaling;

    const wrap = (val) => isCrit ? `(${val})` : val;
    const activeColor = isHeal ? '#4caf82' : isShield ? '#ffd740' : isCrit ? '#ef5350' : '#4fc3f7';

    const isStealthRock = (move.name === "Stealth Rock" || move.name === "Stealth Rock+") && !isCrit;
    const maxStackBonus = maxTicks === 10 ? 1.35 : 1.05;

    const getScaledTotal = (n) => {
      if (hasTickScaling) {
        let sum = 0;
        for (let i = 0; i < n; i++) {
          sum += Math.floor(base * (tickScaling[i] ?? tickScaling[tickScaling.length - 1]));
        }
        return sum;
      }
      if (isStealthRock) {
        let sum = 0;
        for (let i = 1; i <= n; i++) {
          sum += Math.floor(base * (1 + Math.min((i - 1) * 0.15, maxStackBonus)));
        }
        return sum;
      }
      return base * n;
    };

    const renderExpanded = () => {
      const atMax = currentTicks === maxTicks;
      let displayTotal, titleHint;

      if (hasTickScaling) {
        displayTotal = getScaledTotal(currentTicks);
        const scalePct = tickScaling[currentTicks - 1] ?? tickScaling[tickScaling.length - 1];
        const waveVal  = Math.floor(base * scalePct);
        titleHint = `Wave ${currentTicks}: ${waveVal.toLocaleString()} (×${scalePct}) - Total: ${displayTotal.toLocaleString()}`;
      } else if (isStealthRock) {
        displayTotal = getScaledTotal(currentTicks);
        const pct = Math.min((currentTicks - 1) * 0.15, maxStackBonus);
        titleHint = `Hit ${currentTicks}: ${Math.ceil(base * (1 + pct)).toLocaleString()} (+${Math.round(pct * 100)}%) - Total: ${displayTotal.toLocaleString()}`;
      } else {
        displayTotal = base * currentTicks;
        titleHint = `Par tick : ${base.toLocaleString()} - Max : ${maxTicks} ticks`;
      }

      el.innerHTML = `
        ${wrap(displayTotal.toLocaleString())}
        <sup class="tick-badge" style="display:inline-flex;align-items:center;gap:2px;vertical-align:super;font-size:0.6em;line-height:1;">
          <button class="tick-ctrl tick-minus" style="width:15px;height:15px;border-radius:3px;border:none;background:#333;color:#ccc;cursor:pointer;font-size:11px;line-height:1;padding:0;flex-shrink:0;font-weight:bold;">−</button>
          <span style="min-width:18px;text-align:center;font-weight:900;color:${atMax ? activeColor : '#aaa'};">×${currentTicks}</span>
          <button class="tick-ctrl tick-plus" style="width:15px;height:15px;border-radius:3px;border:none;background:#333;color:#ccc;cursor:pointer;font-size:11px;line-height:1;padding:0;flex-shrink:0;font-weight:bold;">+</button>
        </sup>
      `;
      el.style.color = atMax ? activeColor : '';
      el.title = titleHint;
      el.querySelector('.tick-minus').addEventListener('click', (e) => { e.stopPropagation(); if (currentTicks > 1)        { currentTicks--; renderExpanded(); } });
      el.querySelector('.tick-plus' ).addEventListener('click', (e) => { e.stopPropagation(); if (currentTicks < maxTicks) { currentTicks++; renderExpanded(); } });
    };

    renderExpanded();
  });
}