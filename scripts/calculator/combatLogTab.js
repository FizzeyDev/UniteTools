/**
 * combatLogTab.js
 * Nouvel onglet "⚔️ Combat Log" — multi-acteurs (5v5 + 1 Cible).
 *
 * Stratégie de réutilisation du moteur existant (cf. spec §6) :
 * Le moteur de calcul (damageCalculator.js / healCalculator.js / shieldCalculator.js /
 * statsManager.js / multiplierManager.js) lit/écrit l'objet singleton `state` (state.currentAttacker,
 * state.attackerLevel, state.attackerItems, ...). Il n'existe qu'UN SEUL contexte attaquant/défenseur
 * actif à la fois dans tout le projet (y compris dans le Calculator existant).
 *
 * Pour consommer ce moteur sans le dupliquer, ce module utilise une technique de
 * "state swap" : avant de calculer les effets d'un move pour un acteur donné de notre
 * roster, on bascule temporairement state.currentAttacker/currentDefender/niveaux/items
 * sur la config de l'acteur cliqué + la Cible, on appelle les fonctions pures déjà
 * exportées par le moteur, puis on restaure l'état d'origine du Calculator.
 * Cela correspond exactement à la contrainte UX de la spec (§1.3) : "un seul panneau
 * de moves actif à la fois" — il n'y a donc jamais besoin de deux contextes simultanés.
 *
 * MOVE EFFECTS / PASSIVE EFFECTS — désormais répliqués (cf. §"EFFETS D'HABILITÉ
 * PAR POKÉMON" plus bas) :
 *   • Les cartes toggle/stacks de moveEffectsAtk.js / moveEffectsDef.js et
 *     passiveEffectsAtk.js / passiveEffectsDef.js s'affichent maintenant dans
 *     le panneau du picker (mêmes boutons que le Calculator classique), pour
 *     l'attaquant sélectionné ET la Cible. Cliquer dessus modifie le même
 *     `state` global (partagé avec le Calculator) puis rafraîchit le picker.
 *   • Les multiplicateurs "bespoke" qui en découlent (Latias Dragon Breath
 *     Eon Power, Decidueye Spirit Shackle+/Nock Nock, Espeon Future Sight+,
 *     Buzzwole Muscle stacks, multiplicateur d'état "wound" — Ceruledge/
 *     Darkrai/Decidueye/Meowscarada/Mimikyu/Venusaur/Rapidash —, Lucario Aura
 *     Cannon PUP, Machamp Close Combat+, bonus Auto-attack Armarouge/Flash
 *     Fire) sont maintenant appliqués dans buildMoveOptions(), dans le même
 *     ordre que displayMoves().
 *
 * TOUJOURS PAS RÉPLIQUÉ — restant hors scope de cette passe car ce sont de
 * vraies "lignes bonus" séparées (pas de simples multiplicateurs sur le hit
 * déjà loggé), donc porter ça veut dire dupliquer chaque bloc, pas juste
 * une formule :
 *   • Lifesteal affiché en ligne dédiée sous chaque dégât
 *   • Yveltal — Oblivion Wing (heal), Dark Aura Execute (true dmg + heal on KO)
 *   • Charizard/Mega-X/Mega-Y — heal Seismic Slam (Unite)
 *   • Cinderace — heal Feint+
 *   • Dragapult — heal Dragon Dance+ (vol)
 *   • Palkia — Pressure (bonus prochaine AA)
 *   • Absol — second hit Night Slash+
 *   • Falinks — cap multi-hit (110%)
 *   • Decidueye — Razor Leaf Enhanced+ (bonus % HP cible, distinct du bonus
 *     Spirit Shackle+/Nock Nock ci-dessus qui, eux, sont répliqués)
 *   • Latios — Draco Meteor (nombre de comètes variable ; changerait la
 *     structure du move, pas juste sa valeur — pas juste un multiplicateur)
 *   • Armarouge — bonus ATK/SpAtk Crustle Shell Smash : PAS un manque du
 *     Combat Log, bug préexistant du Calculator classique (le bonus n'est
 *     affiché que dans le libellé UI, jamais réellement injecté dans
 *     atkStats avant calcul — même limite que Mold Breaker ci-dessous)
 * → à traiter dans une prochaine passe dédiée si besoin, ce n'est plus un "petit ajout".
 * - Mold Breaker def-pen (Mega-Gyarados attaquant) : PAS un manque du Combat Log, bug
 *   préexistant du Calculator classique (calculé dans damageDisplay.js mais jamais consommé).
 * - Tout le reste (stats de base, items flat/%, buffs/debuffs globaux, def_ignore/sp_def_ignore,
 *   crit, multi-hit/tick, % HP cibles, mutations de stats par pokémon via statsManager.js) est
 *   bien recalculé via le vrai moteur.
 * - Les toggles d'habilité très spécifiques à un pokémon (Mold Breaker, Lucario forms,
 *   Aegislash stance, etc.) sont GLOBAUX et partagés entre les 11 slots (pas un jeu de
 *   toggles par slot), idem pour les buffs/debuffs universels — cohérent avec le point
 *   ouvert §8.1 de la spec, à affiner plus tard si besoin.
 * - Le PV "temps réel" n'est suivi que pour la Cible (§3), pas pour les 10 attaquants
 *   (point ouvert §8.2 de la spec) → state.attackerHPPercent reste fixé à 100% lors des calculs.
 */

import { state } from './state.js';
import { getModifiedStats, calculateDamage, getAutoAttackResults } from './damageCalculator.js';
import { calculateHeal } from './healCalculator.js';
import { calculateShield } from './shieldCalculator.js';
import { applyPokemonStatMutations } from './statsManager.js';
import { computeGlobalDamageMult, computeDefenderDamageMult } from './multiplierManager.js';
import { stackableItems, specialHeldItems, getMobHPAtTimer } from './constants.js';
import { enhanceBuffLabels } from './buff-visuals.js';
import { applyAttackerMoveEffects, getLatiasDragonBreathMultiplier } from './moveEffectsAtk.js';
import { applyDefenderMoveEffects } from './moveEffectsDef.js';
import {
  applyBuzzwoleAttacker, applyCeruledgeAttacker, applyChandelureAttacker,
  applyDarkraiAttacker, applyDecidueyeAttacker, applyZardyAttacker,
  applyAegislashAttacker, applyArmarougeAttacker, applyMegaGyaradosAttacker,
  applyMegaLucarioAttacker, applyGyaradosAttacker, applyMachampAttacker,
  applyMeowscaradaAttacker, applyMegaMewtwoAttacker, applyMegaMewtwoYAttacker,
  applyMimikyuAttacker, applyRapidashAttacker, applySirfetchdAttacker,
  applySylveonAttacker, applyTinkatonAttacker, applyTyranitarAttacker,
  applyZeraoraAttacker, applyMoltresAttacker, applyTyphlosionAttacker,
  applySkeledirgAttacker, applyQuaquavalAttacker, applyYveltalAttacker, applyPalkiaAttacker,
} from './passiveEffectsAtk.js';
import {
  applyAegislashDefender, applyArmarougeDefender, applyArticunoDefender,
  applyZardxDefender, applyMegaGyaradosDefender, applyGyaradosDefender,
  applyCrustleDefender, applyDragoniteDefender, applyLaprasDefender,
  applyMamoswineDefender, applyMegaMewtwoDefender, applyMegaMewtwoYDefender,
  applyMimeDefender, applySylveonDefender, applyTyranitarDefender,
  applyUmbreonDefender, applyGarchompDefender, applyFalinksDefender,
} from './passiveEffectsDef.js';

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCH DES PASSIFS PAR POKÉMON (repris à l'identique de applyAttackerPassive
// / applyDefenderPassive dans damageDisplay.js — ces deux fonctions n'y sont pas
// exportées, donc dupliquées ici. Contrairement aux Move Effects, les Passive
// Effects n'ont pas de dispatcher unique exporté par passiveEffectsAtk/Def.js.)
// ─────────────────────────────────────────────────────────────────────────────
const ATTACKER_PASSIVE_HANDLERS = {
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
  moltres: applyMoltresAttacker, typhlosion: applyTyphlosionAttacker,
  skeledirge: applySkeledirgAttacker, quaquaval: applyQuaquavalAttacker,
  yveltal: applyYveltalAttacker, palkia: applyPalkiaAttacker,
};
const DEFENDER_PASSIVE_HANDLERS = {
  aegislash: applyAegislashDefender, armarouge: applyArmarougeDefender,
  articuno: applyArticunoDefender,
  "mega-charizard-x": applyZardxDefender, "mega-gyarados": applyMegaGyaradosDefender,
  gyarados: applyGyaradosDefender, crustle: applyCrustleDefender,
  dragonite: applyDragoniteDefender, lapras: applyLaprasDefender,
  mamoswine: applyMamoswineDefender, "mewtwo_x": applyMegaMewtwoDefender,
  "mewtwo_y": applyMegaMewtwoYDefender, "mr_mime": applyMimeDefender,
  sylveon: applySylveonDefender, tyranitar: applyTyranitarDefender,
  umbreon: applyUmbreonDefender, garchomp: applyGarchompDefender,
  falinks: applyFalinksDefender,
};

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAT LOCAL DE L'ONGLET
// ─────────────────────────────────────────────────────────────────────────────

const TEAM_SLOTS = [
  ...['p1', 'p2', 'p3', 'p4', 'p5'].map(id => ({ id, team: 'purple' })),
  ...['o1', 'o2', 'o3', 'o4', 'o5'].map(id => ({ id, team: 'orange' })),
  { id: 'target', team: 'target' },
];

function freshSlot(id, team) {
  return {
    id, team,
    pokemon: null,
    level: 15,
    timer: 130,
    items: [null, null, null],
    stacks: [0, 0, 0],
    activated: [false, false, false],
  };
}

function secsToTimer(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const clState = {
  slots: {},          // id -> slot config
  activeSlotId: null,  // slot dont le panneau de moves est ouvert
  itemModalTarget: null, // { slotId, itemSlot }
  pokemonModalTarget: null, // slotId
  entries: [],         // log figé
  entrySeq: 1,
  expandedEntryId: null, // id de l'entrée dont le détail est ouvert dans la séquence
  activePicker: null,  // { actorSlotId, move } — picker actuellement affiché (persiste même si on change de slot actif)
  target: {
    hpCurrent: null,    // PV courants (absolu), null = pas encore initialisé
    startMode: 'percent', // 'percent' | 'absolute'
    startValue: 100,
  },
  targetCategoryFilter: 'playable', // 'playable' | 'mob' | 'other' — filtre du picker de la Target
};

TEAM_SLOTS.forEach(s => { clState.slots[s.id] = freshSlot(s.id, s.team); });

// ─────────────────────────────────────────────────────────────────────────────
// SNAPSHOT / SWAP DE L'ÉTAT GLOBAL
// ─────────────────────────────────────────────────────────────────────────────

function withActorTargetContext(actorSlot, targetSlot, fn) {
  const snap = { ...state };

  Object.assign(state, {
    currentAttacker: actorSlot.pokemon,
    attackerLevel: actorSlot.level,
    attackerItems: actorSlot.items,
    attackerItemStacks: actorSlot.stacks,
    attackerItemActivated: actorSlot.activated,
    attackerHPPercent: 100,
    attackerHPAbsolute: null,

    currentDefender: targetSlot.pokemon,
    defenderLevel: targetSlot.level,
    defenderItems: targetSlot.items,
    defenderItemStacks: targetSlot.stacks,
    defenderItemActivated: targetSlot.activated,
    defenderHPPercent: 100,
    defenderHPAbsolute: clState.target.hpCurrent,
  });

  try {
    return fn();
  } finally {
    Object.assign(state, snap);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS MOVE (repris de damageDisplay.js — non exportés là-bas, dupliqués ici à l'identique)
// ─────────────────────────────────────────────────────────────────────────────

function isMoveVisible(move, level) {
  if (move.learnLevel == null) return true;
  if (move.learnLevel > level) return false;
  if (move.unlearn != null && level >= move.unlearn) return false;
  return true;
}
function isMoveUpgraded(move, level) {
  return move.upgradeLevel != null && level >= move.upgradeLevel;
}
function filterByUpgrade(items, upgraded) {
  if (!items?.length) return items || [];
  const hasUpgradedEntries = items.some(i => i.upgraded === true);
  const normalItems = items.filter(i => !i.blaze_only);
  if (!hasUpgradedEntries) return normalItems;
  return upgraded ? normalItems.filter(i => i.upgraded === true) : normalItems.filter(i => !i.upgraded);
}

function getScopeCritBonus(items) {
  let bonus = 1.0;
  (items || []).forEach(item => {
    if (item && item.name === 'Scope Lens' && item.stats) {
      const critStat = item.stats.find(s => s.label === 'Critical-Hit Damage');
      if (critStat && critStat.value) {
        bonus = critStat.value > 10 ? 1 + critStat.value / 100 : critStat.value;
      }
    }
  });
  return bonus;
}

// ─────────────────────────────────────────────────────────────────────────────
// EFFETS GLOBAUX "bespoke" (repris de applyItemsAndGlobalEffects() / displayMoves()
// dans damageDisplay.js — cette fonction n'y est pas exportée, donc on ré-implémente
// ici uniquement la partie qui influe réellement sur les valeurs de dégâts affichées :
// Slick Spoon (attaquant), Infiltrator (Chandelure), Flash Fire (Armarouge défenseur),
// Blaze Sp.Def pierce (Skeledirge). Les blocs UI "info card" de applyItemsAndGlobalEffects
// (Rocky Helmet, Assault Vest, Shell Bell, etc.) sont purement informatifs et n'affectent
// pas les dégâts des moves eux-mêmes, donc ils ne sont pas nécessaires ici.
//
// NB : moldBreakerDefPen (Mega-Gyarados attaquant) est calculé dans damageDisplay.js
// mais n'y est jamais consommé (mort dans le code source d'origine) — non répliqué ici
// pour rester cohérent avec le comportement réel du Calculator.
// ─────────────────────────────────────────────────────────────────────────────
function getGlobalIgnoreEffects(actorSlot) {
  let slickIgnore = 0;
  (actorSlot.items || []).forEach((item, i) => {
    if (item && item.name === 'Slick Spoon' && actorSlot.activated[i]) {
      slickIgnore = parseFloat(item.level20.replace('%', '').trim()) / 100 || 0;
    }
  });

  const infiltratorIgnore = actorSlot.pokemon?.pokemonId === 'chandelure'
    ? Math.min((state.attackerPassiveStacks || 0) * 0.025, 0.20)
    : 0;

  const skeledirgeBlazeIgnore = actorSlot.pokemon?.pokemonId === 'skeledirge' &&
    (state.attackerSkeledirgeBlazeActive ?? false)
    ? 0.35
    : 0;

  return { slickIgnore, infiltratorIgnore, skeledirgeBlazeIgnore };
}

function getDefenderFlashFireReduction(targetSlot) {
  return targetSlot.pokemon?.pokemonId === 'armarouge' && (state.defenderFlashFireActive ?? false)
    ? 0.20
    : 0;
}

// ── Repris à l'identique de damageDisplay.js (non exportées là-bas) ──────────
function getBuzzwoleMuscleMultiplier(moveName, damageName) {
  if (state.currentAttacker?.pokemonId !== 'buzzwole') return 1;
  const stacks = state.attackerPassiveStacks;
  if (stacks <= 0) return 1;
  if (moveName === 'Fell Stinger' || moveName === 'Superpower') return 1 + 0.125 * stacks;
  if (moveName === 'Leech Life' && (damageName || '').includes('per Tick')) return 1 + 0.015 * stacks;
  return 1;
}

function getAttackerWoundMultiplier() {
  let mult = 1;
  const attacker = state.currentAttacker;
  if (!attacker) return 1;
  switch (attacker.pokemonId) {
    case 'ceruledge':    if (state.attackerPassiveStacks >= 6) mult *= 1.15; break;
    case 'darkrai':      if (state.attackerDarkraiSleep) mult *= 1.10; break;
    case 'decidueye':    if (state.attackerDecidueyeDistant) mult *= 1.20; break;
    case 'meowscarada':  if (state.attackerMeowscaradaActive) mult *= 1.15; break;
    case 'mimikyu':      if (state.attackerMimikyuActive) mult *= 1.10; break;
    case 'venusaur':     if (state.attackerHPPercent <= 30) mult *= 1.20; break;
    case 'rapidash':
      if      (state.attackerRapidashStacks >= 5) mult *= 1.60;
      else if (state.attackerRapidashStacks === 4) mult *= 1.50;
      else if (state.attackerRapidashStacks === 3) mult *= 1.35;
      else if (state.attackerRapidashStacks === 2) mult *= 1.20;
      else if (state.attackerRapidashStacks === 1) mult *= 1.05;
      break;
  }
  return mult;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCUL DES OPTIONS D'UN MOVE (dans le contexte acteur/cible déjà swappé)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// EFFETS D'ITEMS LOGGABLES EN CARTE (comme un move) — §"Rocky Helmet"
// Contrairement aux effets bespoke ci-dessus (qui modifient le calcul d'un move
// existant), ceci ajoute une carte indépendante dans le panneau de moves, tant
// que l'item est équipé. Le montant est basé sur les PV max du PORTEUR (pas de
// la Cible), donc on utilise les stats de actorSlot lui-même. Comme ce n'est
// pas un dégât qui touche la Cible, on utilise kind:'reflect' (et non 'damage')
// pour NE PAS l'inclure dans le total de dégâts / la barre de PV de la Cible —
// c'est purement une ligne informative dans le log.
// ─────────────────────────────────────────────────────────────────────────────
const ITEM_EFFECT_DEFS = {
  rockyHelmet: { itemName: 'Rocky Helmet', label: 'Rocky Helmet' },
};

function getItemEffectPseudoMoves(slot) {
  const list = [];
  Object.entries(ITEM_EFFECT_DEFS).forEach(([key, def]) => {
    const item = (slot.items || []).find(i => i?.name === def.itemName);
    if (item) list.push({ name: def.label, image: item.image, __itemEffect: key });
  });
  return list;
}

function buildRockyHelmetOptions(actorSlot) {
  const item = actorSlot.items.find(i => i?.name === 'Rocky Helmet');
  const stats = getModifiedStats(actorSlot.pokemon, actorSlot.level, actorSlot.items, actorSlot.stacks, actorSlot.activated);
  const pct = parseFloat((item?.level20 || '0').replace('%', '').trim()) / 100 || 0;
  const value = Math.floor(stats.hp * pct);
  return {
    options: [{
      kind: 'reflect', name: 'Rocky Helmet', target: 'attacker',
      canCrit: false, isTick: false, tickCount: 1, value, critValue: value,
    }],
    maxHP: stats.hp,
  };
}

function buildMoveOptions(move, actorSlot, targetSlot) {
  if (move.__itemEffect === 'rockyHelmet') {
    return buildRockyHelmetOptions(actorSlot);
  }
  const level = actorSlot.level;
  const upgraded = isMoveUpgraded(move, level);
  const visibleDamages = filterByUpgrade(move.damages, upgraded);
  const visibleHeals = filterByUpgrade(move.heals, upgraded);
  const visibleShields = filterByUpgrade(move.shields, upgraded);

  const atkStats = getModifiedStats(actorSlot.pokemon, actorSlot.level, actorSlot.items, actorSlot.stacks, actorSlot.activated);
  const defStats = getModifiedStats(targetSlot.pokemon, targetSlot.level, targetSlot.items, targetSlot.stacks, targetSlot.activated);
  if (targetSlot.pokemon.timerBased && targetSlot.pokemon.hpTable) {
    defStats.hp = getMobHPAtTimer(targetSlot.pokemon.hpTable, targetSlot.timer);
  }
  applyPokemonStatMutations(atkStats, defStats);

  const globalDamageMult = computeGlobalDamageMult();
  const defenderDamageMult = computeDefenderDamageMult();
  const scopeCritBonus = getScopeCritBonus(actorSlot.items);
  const { slickIgnore, infiltratorIgnore, skeledirgeBlazeIgnore } = getGlobalIgnoreEffects(actorSlot);
  const defenderFlashFireReduction = getDefenderFlashFireReduction(targetSlot);

  const currentDefHP = clState.target.hpCurrent != null
    ? clState.target.hpCurrent
    : defStats.hp;

  const options = []; // { kind:'damage'|'heal'|'shield', name, target, canCrit, isTick, tickCount, value, critValue }

  // ── Multiplicateurs par-move (repris de displayMoves() dans damageDisplay.js) ──
  // Note : les toggles (attackerLavaPlumeActive, attackerFlamethrowerPlusActive, etc.)
  // sont GLOBAUX (cf. §8.1) — pas un jeu de toggles par slot.
  let moltresBurnMult = 1.0;
  if (actorSlot.pokemon?.pokemonId === 'moltres' && (state.attackerPassiveStacks || 0) > 0) {
    if (['Incinerate', 'Heat Wave'].includes(move.name)) {
      moltresBurnMult = 1 + 0.10 * state.attackerPassiveStacks;
    }
  }
  let lavaPlumeMult = 1.0;
  if (actorSlot.pokemon?.pokemonId === 'ceruledge' && (state.attackerLavaPlumeActive ?? false) && move.name === 'Auto-attack') {
    lavaPlumeMult = 1.15;
  }
  let flamethrowerPlusMult = 1.0;
  if (actorSlot.pokemon?.pokemonId === 'chandelure' && (state.attackerFlamethrowerPlusActive ?? false)) {
    flamethrowerPlusMult = 1.20;
  }
  let fireSpinPlusMult = 1.0;
  if (actorSlot.pokemon?.pokemonId === 'delphox' && (state.attackerDelphoxFireSpinPlusActive ?? false)) {
    fireSpinPlusMult = 1.15;
  }
  let auraCannonPUPMult = 1.0;
  if (actorSlot.pokemon?.pokemonId === 'lucario' && (state.attackerLucarioAuraCannonPUPActive ?? false) && move.name === 'Power-Up Punch') {
    auraCannonPUPMult = 1.20;
  }
  let machampCloseCombatMult = 1.0;
  if (actorSlot.pokemon?.pokemonId === 'machamp' && (state.attackerMachampCloseCombatStatusActive ?? false) && move.name === 'Close Combat') {
    machampCloseCombatMult = 1.25;
  }
  const bespokeMoveMult = moltresBurnMult * lavaPlumeMult * flamethrowerPlusMult * fireSpinPlusMult * auraCannonPUPMult * machampCloseCombatMult;

  visibleDamages?.forEach(dmg => {
    if (!dmg.dealDamage) return;

    let relevantAtk = actorSlot.pokemon.style === 'special' ? atkStats.sp_atk : atkStats.atk;
    let relevantDef = actorSlot.pokemon.style === 'special' ? defStats.sp_def : defStats.def;
    if (dmg.scaling === 'physical') { relevantAtk = atkStats.atk; relevantDef = defStats.def; }
    if (dmg.scaling === 'special') { relevantAtk = atkStats.sp_atk; relevantDef = defStats.sp_def; }

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

    // ── SKELEDIRGE — Blaze : 35% Sp. Def Pierce sur le move suivant ──────────
    if (skeledirgeBlazeIgnore > 0 && relevantDef === defStats.sp_def) {
      effectiveDef = Math.floor(effectiveDef * (1 - skeledirgeBlazeIgnore));
    }

    // ── DRAGAPULT — Dragon Dance → -10% sur les auto attacks pendant le vol ──
    let dragonDanceFlightMult = 1.0;
    if (actorSlot.pokemon?.pokemonId === 'dragapult' && move.name === 'Dragon Dance' && dmg.name?.includes('during flight')) {
      dragonDanceFlightMult = 0.90;
    }

    const effectiveGlobalMult = globalDamageMult * bespokeMoveMult * dragonDanceFlightMult;

    let normal = calculateDamage(dmg, relevantAtk, effectiveDef, level, false, actorSlot.pokemon.pokemonId, 1.0, effectiveGlobalMult, defStats.hp, currentDefHP);
    let crit = calculateDamage(dmg, relevantAtk, effectiveDef, level, true, actorSlot.pokemon.pokemonId, scopeCritBonus, effectiveGlobalMult, defStats.hp, currentDefHP);

    // ── CRUSTLE — Fury Cutter : +20%/marque (max 40%), arrondi vers le haut ──
    if (actorSlot.pokemon?.pokemonId === 'crustle' && move.name === 'Fury Cutter' && dmg.name === 'Damage') {
      const fcStacks = state.attackerCrustleFuryCutterStacks ?? 0;
      const fcPct = Math.min(fcStacks * 0.20, 0.40);
      if (fcPct > 0) {
        normal = Math.ceil(normal * (1 + fcPct));
        crit = Math.ceil(crit * (1 + fcPct));
      }
    }

    // ── LATIAS — Dragon Breath : bonus Eon Power (mode "dragonBreath" uniquement) ──
    if (
      actorSlot.pokemon?.pokemonId === 'latias' &&
      move.name === 'Dragon Breath' &&
      dmg.name === 'Damage' &&
      state.attackerLatiasEonPowerMove === 'dragonBreath'
    ) {
      const eonMult = getLatiasDragonBreathMultiplier(state.attackerLatiasEonPower || 0);
      normal = Math.floor(normal * eonMult);
      crit   = Math.floor(crit   * eonMult);
    }

    // ── DECIDUEYE — Spirit Shackle+ (lvl 11) : +15% si cible < 50% HP ─────────
    if (
      actorSlot.pokemon?.pokemonId === 'decidueye' &&
      upgraded &&
      move.name === 'Spirit Shackle' &&
      dmg.name !== 'Enhanced+ Bonus' &&
      currentDefHP != null && defStats.hp > 0 &&
      currentDefHP / defStats.hp < 0.50
    ) {
      normal = Math.floor(normal * 1.15);
      crit   = Math.floor(crit   * 1.15);
    }

    // ── DECIDUEYE — Nock Nock (Unite) : +30% sur Large Quill si cible < 50% HP ──
    if (
      actorSlot.pokemon?.pokemonId === 'decidueye' &&
      move.name === 'Nock Nock (Unite)' &&
      dmg.name === 'Damage - Large Quill' &&
      currentDefHP != null && defStats.hp > 0 &&
      currentDefHP / defStats.hp < 0.50
    ) {
      normal = Math.floor(normal * 1.30);
      crit   = Math.floor(crit   * 1.30);
    }

    // ── ESPEON — Future Sight+ (lvl 12) : +15% sur cible verrouillée ──────────
    if (actorSlot.pokemon?.pokemonId === 'espeon' && upgraded && move.name === 'Future Sight') {
      normal = Math.floor(normal * 1.15);
      crit   = Math.floor(crit   * 1.15);
    }

    // ── BUZZWOLE — Muscle stacks (Fell Stinger / Superpower / Leech Life tick) ──
    const muscleMult = getBuzzwoleMuscleMultiplier(move.name, dmg.name);
    normal = Math.floor(normal * muscleMult);
    crit   = Math.floor(crit   * muscleMult);

    // ── Multiplicateur d'état "wound" (Ceruledge/Darkrai/Decidueye/Meowscarada/
    // Mimikyu/Venusaur/Rapidash) — cf. getAttackerWoundMultiplier() ────────────
    const woundMult = getAttackerWoundMultiplier();
    normal = Math.floor(normal * woundMult);
    crit   = Math.floor(crit   * woundMult);

    // ── ARMAROUGE — bonus Auto-attack fixe pendant Flash Fire (attaquant) ─────
    if (move.name === 'Auto-attack' && (state.attackerFlashFireActive ?? false) && actorSlot.pokemon?.pokemonId === 'armarouge') {
      const passive = actorSlot.pokemon.passive || { extraAutoMultiplier: 60, extraAutoConstant: 120 };
      const bonus = calculateDamage({ multiplier: passive.extraAutoMultiplier, levelCoef: 0, constant: passive.extraAutoConstant }, relevantAtk, effectiveDef, level);
      normal += bonus;
      crit += bonus;
    }

    const finalNormal = Math.floor(normal * defenderDamageMult);
    const finalCrit = Math.floor(crit * defenderDamageMult);

    const moveCanCrit = move.can_crit === 'true' || move.can_crit === true;
    const canCrit = dmg.can_crit !== undefined ? (dmg.can_crit === 'true' || dmg.can_crit === true) : moveCanCrit;
    const isTick = !!dmg.is_tick;
    const tickCount = dmg.tick_count || 1;

    options.push({
      kind: 'damage', name: dmg.name || move.name, target: 'target',
      canCrit, isTick, tickCount, value: finalNormal, critValue: finalCrit,
    });
  });

  // ── Big Root / Rescue Hood / Curse Bangle-Incense sur les heals de move ────
  // (repris du bloc HEALS de displayMoves() dans damageDisplay.js)
  const bigRootIdx = actorSlot.items.findIndex(i => i?.name === 'Big Root');
  const bigRootMult = bigRootIdx !== -1 ? 1 + parseFloat(actorSlot.items[bigRootIdx].level20.replace('%', '')) / 100 : 1.0;
  const rescueIdx = actorSlot.items.findIndex(i => i?.name === 'Rescue Hood');
  const rescueMult = rescueIdx !== -1 ? 1 + parseFloat(actorSlot.items[rescueIdx].level20.replace('%', '')) / 100 : 1.0;

  let curseMult = 1.0;
  const cbdi = targetSlot.items.findIndex(i => i?.name === 'Curse Bangle');
  const cidi = targetSlot.items.findIndex(i => i?.name === 'Curse Incense');
  if (cbdi !== -1 && targetSlot.activated[cbdi]) curseMult *= 1 - parseFloat(targetSlot.items[cbdi].level20.replace('%', '')) / 100;
  if (cidi !== -1 && targetSlot.activated[cidi]) curseMult *= 1 - parseFloat(targetSlot.items[cidi].level20.replace('%', '')) / 100;

  // ── DELPHOX — Fanciful Fireworks (Unite) : −50% HP recovery on attacker ────
  // (toggle global défenseur, cf §8.1)
  if (targetSlot.pokemon?.pokemonId === 'delphox' && targetSlot.level >= 9 && (state.defenderDelphoxFancifulFireworksAntiHeal ?? false)) {
    curseMult *= 0.50;
  }

  visibleHeals?.forEach(heal => {
    const base = calculateHeal(heal, atkStats, level, null);
    const tgt = heal.target || 'both';
    const isTick = !!heal.is_tick;
    const tickCount = heal.tick_count || 1;
    if (tgt === 'self' || tgt === 'both') {
      const selfVal = Math.floor(base * bigRootMult * curseMult);
      options.push({ kind: 'heal', name: heal.name || 'Heal', target: 'self', canCrit: false, isTick, tickCount, value: selfVal, critValue: selfVal });
    }
    if (tgt === 'ally' || tgt === 'both') {
      const allyVal = Math.floor(base * rescueMult * curseMult);
      options.push({ kind: 'heal', name: heal.name || 'Heal', target: 'ally', canCrit: false, isTick, tickCount, value: allyVal, critValue: allyVal });
    }
  });

  // ── Rescue Hood sur les shields de move (que sur la part "ally") ───────────
  visibleShields?.forEach(shield => {
    const base = calculateShield(shield, atkStats, level);
    const tgt = shield.target || 'both';
    const isTick = !!shield.is_tick;
    const tickCount = shield.tick_count || 1;
    if (tgt === 'self' || tgt === 'both') {
      options.push({ kind: 'shield', name: shield.name || 'Shield', target: 'self', canCrit: false, isTick, tickCount, value: base, critValue: base });
    }
    if (tgt === 'ally' || tgt === 'both') {
      const allyVal = Math.floor(base * rescueMult);
      options.push({ kind: 'shield', name: shield.name || 'Shield', target: 'ally', canCrit: false, isTick, tickCount, value: allyVal, critValue: allyVal });
    }
  });

  // Auto-attack : ajoute dégâts normal/crit si le move est l'auto-attack basique
  if (move.name === 'Auto-attack' && (!visibleDamages || visibleDamages.length === 0)) {
    const aa = getAutoAttackResults(atkStats, defStats, currentDefHP, globalDamageMult);
    options.push({ kind: 'damage', name: 'Auto-attack', target: 'target', canCrit: true, isTick: false, tickCount: 1, value: aa.normal, critValue: aa.crit });
  }

  // ── CHOICE SPECS — Bonus damage on move hit (8s CD) ────────────────────────
  // (repris du bloc sidebar "CHOICE SPECS" de applyItemsAndGlobalEffects() dans damageDisplay.js)
  // Ne s'affiche que si le move inflige effectivement des dégâts (auto-attack inclus),
  // pour laisser l'utilisateur cocher/décocher selon si le CD de 8s était up ou non.
  if (options.some(o => o.kind === 'damage')) {
    const csIdx = actorSlot.items.findIndex(i => i?.name === 'Choice Specs');
    if (csIdx !== -1) {
      const item = actorSlot.items[csIdx];
      const csConstant = parseFloat(item.level20) || 0;
      const csMultiplier = item.level20_multiplier
        ? parseFloat(item.level20_multiplier.replace('%', '').trim()) / 100
        : 0;
      const specsBonus = csConstant + Math.floor(atkStats.sp_atk * csMultiplier);
      options.push({
        kind: 'damage', name: 'Choice Specs', target: 'target',
        canCrit: false, isTick: false, tickCount: 1, value: specsBonus, critValue: specsBonus,
      });
    }
  }

  return { options, maxHP: defStats.hp };
}

// ─────────────────────────────────────────────────────────────────────────────
// EFFETS D'HABILITÉ PAR POKÉMON (Move Effects + Passive Effects) — §ask
// Réutilise TEL QUEL les cartes toggle/stacks du Calculator classique
// (moveEffectsAtk.js / moveEffectsDef.js / passiveEffectsAtk.js / passiveEffectsDef.js) :
// mêmes fonctions, mêmes boutons, même `state` global. Elles sont rendues ici
// dans le panneau du picker (dans le contexte acteur/cible déjà swappé par
// withActorTargetContext), pour l'attaquant sélectionné ET la Cible.
//
// Ces fonctions appellent en interne updateDamages() (du Calculator classique)
// sur clic — c'est inoffensif ici (early-return si aucun attaquant n'y est
// sélectionné) mais ne rafraîchit pas NOTRE picker. On ajoute donc un listener
// de clic en bulle sur le conteneur qui appelle refreshPickerIfOpen() APRÈS le
// handler natif du bouton (le state global venant d'être muté correctement).
// ─────────────────────────────────────────────────────────────────────────────

function renderMoveAndPassiveEffectsPanel(actorSlot, targetSlot) {
  const host = document.getElementById('cltEffectsPanel');
  if (!host) return;
  host.innerHTML = '';

  if (!actorSlot?.pokemon || !targetSlot?.pokemon) return;

  const atkStats = getModifiedStats(actorSlot.pokemon, actorSlot.level, actorSlot.items, actorSlot.stacks, actorSlot.activated);
  const defStats = getModifiedStats(targetSlot.pokemon, targetSlot.level, targetSlot.items, targetSlot.stacks, targetSlot.activated);
  if (targetSlot.pokemon.timerBased && targetSlot.pokemon.hpTable) {
    defStats.hp = getMobHPAtTimer(targetSlot.pokemon.hpTable, targetSlot.timer);
  }
  applyPokemonStatMutations(atkStats, defStats);

  const attackerCard = document.createElement('div');
  attackerCard.className = 'clt-effects-col';
  ATTACKER_PASSIVE_HANDLERS[actorSlot.pokemon.pokemonId]?.(atkStats, defStats, attackerCard);
  applyAttackerMoveEffects(actorSlot.pokemon.pokemonId, atkStats, defStats, attackerCard);

  const defenderCard = document.createElement('div');
  defenderCard.className = 'clt-effects-col';
  DEFENDER_PASSIVE_HANDLERS[targetSlot.pokemon.pokemonId]?.(atkStats, defStats, defenderCard);
  applyDefenderMoveEffects(targetSlot.pokemon.pokemonId, atkStats, defStats, defenderCard);

  const hasAtk = attackerCard.children.length > 0;
  const hasDef = defenderCard.children.length > 0;
  if (!hasAtk && !hasDef) return;

  host.classList.add('open');

  if (hasAtk) {
    const wrap = document.createElement('div');
    wrap.className = 'clt-effects-group';
    wrap.innerHTML = `<h5>⚔️ ${escapeHtml(actorSlot.pokemon.displayName)} — Move &amp; Passive Effects</h5>`;
    wrap.appendChild(attackerCard);
    host.appendChild(wrap);
  }
  if (hasDef) {
    const wrap = document.createElement('div');
    wrap.className = 'clt-effects-group';
    wrap.innerHTML = `<h5>🛡️ ${escapeHtml(targetSlot.pokemon.displayName)} — Move &amp; Passive Effects</h5>`;
    wrap.appendChild(defenderCard);
    host.appendChild(wrap);
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Styles now live in combatLog.css — imported via <link> in damage-calc.html

// ─────────────────────────────────────────────────────────────────────────────
// SCAFFOLD HTML
// ─────────────────────────────────────────────────────────────────────────────

function teamLabel(team) {
  return team === 'purple' ? 'Purple Team' : team === 'orange' ? 'Orange Team' : 'Target';
}

function buildTabAndPanel() {
  const tabs = document.querySelector('.main-tabs');
  const optimizerPanel = document.getElementById('tab-optimizer');
  if (!tabs || !optimizerPanel || document.getElementById('tab-combatlog')) return;

  const btn = document.createElement('button');
  btn.className = 'main-tab-btn';
  btn.dataset.tab = 'combatlog';
  btn.textContent = '⚔️ Combat Log';
  tabs.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'tab-combatlog';
  panel.className = 'main-tab-panel';
  panel.innerHTML = `
    <div class="clt-header">
      <div class="clt-title"><span class="clt-icon">⚔️</span> Combat Log</div>
      <p class="clt-subtitle">Simulate multi-actor fights against a target</p>
      <div class="clt-howto">
        <span><b>1.</b> Pick a Pokémon for each slot &amp; the Target</span>
        <span class="clt-howto-sep">→</span>
        <span><b>2.</b> Click a move to preview it</span>
        <span class="clt-howto-sep">→</span>
        <span><b>3.</b> Add it to the log</span>
      </div>
    </div>
    <div class="clt-roster" id="cltRoster"></div>
    <div class="clt-config-panel" id="cltConfigPanel"></div>
    <div class="clt-moves-panel" id="cltMovesPanel"></div>
    <div class="clt-picker-panel" id="cltPickerPanel"></div>
    <div class="clt-effects-panel" id="cltEffectsPanel"></div>
    <div class="clt-hp-section" id="cltHpSection"></div>
    <div class="clt-buffs-section" id="cltBuffsSection">
      <div class="clt-buffs-header" id="cltBuffsToggle">
        <span class="clt-buffs-header-title">🪄 Universal Buffs / Debuffs</span>
        <button class="clt-buffs-toggle" type="button" title="Collapse / expand">▼</button>
      </div>
      <div class="clt-buffs-body" id="cltBuffsBody">
        <div class="clt-buffs" id="cltBuffs"></div>
      </div>
    </div>
    <div class="clt-log-section" id="cltLogSection"></div>

    <div class="clt-modal" id="cltPokemonModal">
      <div class="clt-modal-inner">
        <button class="clt-modal-close" id="cltPokemonModalClose">✕ Close</button>
        <div class="clt-modal-filters" id="cltPokemonModalFilters" style="display:none;"></div>
        <input type="text" class="clt-modal-search" id="cltPokemonModalSearch" placeholder="Search a Pokémon...">
        <div class="clt-modal-grid" id="cltPokemonModalGrid"></div>
      </div>
    </div>
    <div class="clt-modal" id="cltItemModal">
      <div class="clt-modal-inner">
        <button class="clt-modal-close" id="cltItemModalClose">✕ Close</button>
        <input type="text" class="clt-modal-search" id="cltItemModalSearch" placeholder="Search an item...">
        <div class="clt-modal-grid" id="cltItemModalGrid"></div>
      </div>
    </div>
  `;
  optimizerPanel.insertAdjacentElement('afterend', panel);

  btn.addEventListener('click', () => {
    document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.main-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    panel.classList.add('active');
  });

  document.getElementById('cltPokemonModalClose').addEventListener('click', () => {
    document.getElementById('cltPokemonModal').classList.remove('open');
  });
  document.getElementById('cltItemModalClose').addEventListener('click', () => {
    document.getElementById('cltItemModal').classList.remove('open');
  });

  document.getElementById('cltBuffsToggle').addEventListener('click', () => {
    document.getElementById('cltBuffsSection').classList.toggle('collapsed');
  });

  // Les cartes Move/Passive Effects rendues dans #cltEffectsPanel viennent de
  // moveEffectsAtk.js / moveEffectsDef.js / passiveEffectsAtk.js / passiveEffectsDef.js
  // et gèrent elles-mêmes la mutation de `state` sur clic (bouton .onclick).
  // On rafraîchit notre picker APRÈS coup (l'écouteur en bulle se déclenche
  // après le .onclick du bouton cible, une fois le state déjà à jour).
  document.getElementById('cltEffectsPanel').addEventListener('click', () => {
    refreshPickerIfOpen();
  });

  clearPickerPanel();
}

// ─────────────────────────────────────────────────────────────────────────────
// ROSTER (11 slots)
// ─────────────────────────────────────────────────────────────────────────────

function buildTeamWrap(team) {
  const wrap = document.createElement('div');
  wrap.className = `clt-team ${team}`;
  wrap.innerHTML = `<div class="clt-team-title">${teamLabel(team)}</div><div class="clt-team-grid" id="cltGrid-${team}"></div>`;
  return wrap;
}

function buildTargetWrap() {
  const targetWrap = document.createElement('div');
  targetWrap.className = 'clt-target-wrap';
  const cats = [
    ['playable', '🎮 Playable'],
    ['mob', '🌿 Wild'],
    ['other', '🎯 Dummy'],
  ];
  targetWrap.innerHTML = `
    <div class="clt-team-title">🎯 Target</div>
    <div class="clt-target-filters">
      ${cats.map(([cat, label]) => `
        <button type="button" class="clt-target-filter-btn${cat === clState.targetCategoryFilter ? ' active' : ''}" data-cat="${cat}">${label}</button>
      `).join('')}
    </div>
  `;
  targetWrap.querySelectorAll('.clt-target-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      clState.targetCategoryFilter = btn.dataset.cat;
      targetWrap.querySelectorAll('.clt-target-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  return targetWrap;
}

function renderRoster() {
  const root = document.getElementById('cltRoster');
  if (!root) return;
  root.innerHTML = '';

  // Centre la Target entre les deux équipes : Violet (gauche) — Target (centre) — Orange (droite)
  const purpleWrap = buildTeamWrap('purple');
  const targetWrap = buildTargetWrap();
  const orangeWrap = buildTeamWrap('orange');
  root.appendChild(purpleWrap);
  root.appendChild(targetWrap);
  root.appendChild(orangeWrap);

  TEAM_SLOTS.forEach(s => {
    const slot = clState.slots[s.id];
    const card = renderSlotCard(slot);
    if (s.team === 'target') targetWrap.appendChild(card);
    else document.getElementById(`cltGrid-${s.team}`).appendChild(card);
  });
}

function renderSlotCard(slot) {
  const card = document.createElement('div');
  card.className = 'clt-slot-card' + (!slot.pokemon ? ' empty' : '') + (clState.activeSlotId === slot.id ? ' active' : '');
  card.dataset.slotId = slot.id;

  const img = slot.pokemon ? slot.pokemon.image : 'assets/items/none.png';
  const name = slot.pokemon ? slot.pokemon.displayName : 'Empty';

  card.innerHTML = `
    <img class="clt-slot-img" src="${img}" onerror="this.src='assets/pokemon/missing.png'">
    <span class="clt-slot-name">${name}</span>
    ${slot.pokemon ? `<span class="clt-slot-lvl">${slot.pokemon.timerBased ? secsToTimer(slot.timer) : `Lv.${slot.level}`}</span>
      <div class="clt-slot-items">${slot.items.map(it => it ? `<img src="${it.image}" onerror="this.src='assets/items/missing.png'">` : '').join('')}</div>` : ''}
  `;

  card.addEventListener('click', () => {
    if (clState.activeSlotId === slot.id) closeSlotConfig();
    else openSlotConfig(slot.id);
  });
  return card;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG PANEL (sélection pokémon / niveau / items) — pattern repris du Build Optimizer (§6)
// ─────────────────────────────────────────────────────────────────────────────

function openSlotConfig(slotId) {
  clState.activeSlotId = slotId;
  renderRoster();
  renderConfigPanel();
  renderMovesPanel();
  document.getElementById('cltConfigPanel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeSlotConfig() {
  clState.activeSlotId = null;
  renderRoster();
  document.getElementById('cltConfigPanel')?.classList.remove('open');
  document.getElementById('cltMovesPanel')?.classList.remove('open');
}

function renderConfigPanel() {
  const panel = document.getElementById('cltConfigPanel');
  const slot = clState.slots[clState.activeSlotId];
  if (!slot) { panel.classList.remove('open'); return; }
  panel.classList.add('open');

  const isWild = !!slot.pokemon?.timerBased;
  const canHoldItems = slot.pokemon?.category === 'playable';

  panel.innerHTML = `
    <div class="clt-config-header">
      <h4>${teamLabel(slot.team)} — slot ${slot.id}</h4>
      <button class="clt-close-btn" id="cltConfigCloseBtn">✕</button>
    </div>
    <div class="clt-config-row">
      <button class="clt-pick-pokemon-btn" id="cltPickPokemonBtn">
        <img src="${slot.pokemon ? slot.pokemon.image : 'assets/items/none.png'}" onerror="this.src='assets/pokemon/missing.png'">
        <span>${slot.pokemon ? slot.pokemon.displayName : 'Choose a Pokémon'}</span>
      </button>
      ${isWild ? `
      <div class="clt-level-block">
        <label>Timer <span id="cltLevelVal">${secsToTimer(slot.timer)}</span></label>
        <input type="range" id="cltLevelSlider" min="0" max="600" value="${slot.timer}" style="--value:${slot.timer}">
      </div>` : `
      <div class="clt-level-block">
        <label>Level <span id="cltLevelVal">${slot.level}</span></label>
        <input type="range" id="cltLevelSlider" min="1" max="15" value="${slot.level}" style="--value:${slot.level}">
      </div>`}
      ${canHoldItems ? `
      <div class="clt-item-slots" id="cltItemSlots">
        ${[0, 1, 2].map(i => renderItemCardHTML(slot, i)).join('')}
      </div>` : ''}
    </div>
  `;

  document.getElementById('cltConfigCloseBtn').addEventListener('click', closeSlotConfig);

  document.getElementById('cltPickPokemonBtn').addEventListener('click', () => openPokemonModal(slot.id));

  document.getElementById('cltLevelSlider').addEventListener('input', e => {
    if (isWild) {
      slot.timer = parseInt(e.target.value);
      document.getElementById('cltLevelVal').textContent = secsToTimer(slot.timer);
      e.target.style.setProperty('--value', slot.timer);
    } else {
      slot.level = parseInt(e.target.value);
      document.getElementById('cltLevelVal').textContent = slot.level;
      e.target.style.setProperty('--value', slot.level);
    }
    if (slot.team === 'target') {
      // Le niveau/timer change les PV max -> il faut recalculer les PV courants
      // (et rejouer le log pour garder les hpAfter cohérents avec le nouveau max)
      replayHPFromEntries();
      renderHpSection();
      renderLogSection();
    }
    renderRoster();
    renderMovesPanel();
    refreshPickerIfOpen();
  });

  bindItemSlotEvents(slot);
}

function renderItemCardHTML(slot, i) {
  const item = slot.items[i];
  const max = item ? maxStacksFor(item.name) : 0;
  return `
    <div class="clt-item-card" data-item-slot="${i}">
      <img src="${item ? item.image : 'assets/items/none.png'}" onerror="this.src='assets/items/missing.png'">
      ${item && max ? `<div class="clt-item-stack-ctrl">
        <button class="clt-stack-minus" data-item-slot="${i}">−</button>
        <span>${slot.stacks[i] || 0}</span>
        <button class="clt-stack-plus" data-item-slot="${i}">+</button>
      </div>` : ''}
      ${item && item.activable ? `<button class="clt-item-toggle ${slot.activated[i] ? 'active' : ''}" data-item-slot="${i}" title="Toggle on/off">⚡</button>` : ''}
    </div>
  `;
}

function maxStacksFor(name) {
  if (name === 'Weakness Policy') return 4;
  if (name.includes('Accel') || name.includes('Drive')) return 20;
  if (['Attack Weight', 'Sp. Atk Specs', 'Aeos Cookie'].includes(name)) return 6;
  return 0;
}

function bindItemSlotEvents(slot) {
  document.querySelectorAll('#cltItemSlots .clt-item-card').forEach(card => {
    const i = parseInt(card.dataset.itemSlot);
    card.addEventListener('click', e => {
      if (e.target.closest('.clt-stack-minus, .clt-stack-plus, .clt-item-toggle')) return;
      openItemModal(slot.id, i);
    });
  });
  document.querySelectorAll('#cltItemSlots .clt-stack-minus').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const i = parseInt(btn.dataset.itemSlot);
    slot.stacks[i] = Math.max(0, (slot.stacks[i] || 0) - 1);
    if (slot.team === 'target') { replayHPFromEntries(); renderLogSection(); }
    renderConfigPanel();
    if (slot.team === 'target') renderHpSection();
    refreshPickerIfOpen();
  }));
  document.querySelectorAll('#cltItemSlots .clt-stack-plus').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const i = parseInt(btn.dataset.itemSlot);
    const max = maxStacksFor(slot.items[i]?.name || '');
    slot.stacks[i] = Math.min(max, (slot.stacks[i] || 0) + 1);
    if (slot.team === 'target') { replayHPFromEntries(); renderLogSection(); }
    renderConfigPanel();
    if (slot.team === 'target') renderHpSection();
    refreshPickerIfOpen();
  }));
  document.querySelectorAll('#cltItemSlots .clt-item-toggle').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const i = parseInt(btn.dataset.itemSlot);
    slot.activated[i] = !slot.activated[i];
    if (slot.team === 'target') { replayHPFromEntries(); renderLogSection(); }
    renderConfigPanel();
    if (slot.team === 'target') renderHpSection();
    refreshPickerIfOpen();
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL POKÉMON
// ─────────────────────────────────────────────────────────────────────────────

function openPokemonModal(slotId) {
  clState.pokemonModalTarget = slotId;
  const slotTeam = clState.slots[slotId]?.team;
  const modal = document.getElementById('cltPokemonModal');
  modal.classList.add('open');
  const grid = document.getElementById('cltPokemonModalGrid');

  const populate = () => {
    grid.innerHTML = '';
    const cat = slotTeam === 'target' ? clState.targetCategoryFilter : 'playable';
    const list = state.allPokemon.filter(p => p.category === cat);
    list.forEach(poke => {
      const div = document.createElement('div');
      div.className = 'clt-modal-item';
      div.dataset.name = (poke.displayName || '').toLowerCase();
      div.innerHTML = `<img src="${poke.image}" onerror="this.src='assets/pokemon/missing.png'"><span>${poke.displayName}</span>`;
      div.addEventListener('click', () => {
        const slot = clState.slots[slotId];
        slot.pokemon = poke;
        slot.items = [null, null, null];
        slot.stacks = [0, 0, 0];
        slot.activated = [false, false, false];
        if (poke.timerBased) slot.timer = 130;
        const specialName = specialHeldItems[poke.pokemonId];
        if (specialName) {
          const it = state.allItems.find(i => i.name === specialName);
          if (it) slot.items[0] = it;
        }
        if (slotId === 'target') {
          clState.target.hpCurrent = null;
          clState.target.startMode = 'percent';
          clState.target.startValue = 100;
        }
        modal.classList.remove('open');
        renderRoster();
        renderConfigPanel();
        renderMovesPanel();
        renderHpSection();
        refreshPickerIfOpen();
      });
      grid.appendChild(div);
    });
    const search = document.getElementById('cltPokemonModalSearch');
    const term = (search.value || '').toLowerCase();
    grid.querySelectorAll('.clt-modal-item').forEach(el => {
      el.style.display = el.dataset.name.includes(term) ? '' : 'none';
    });
  };

  const filtersHost = document.getElementById('cltPokemonModalFilters');
  if (slotTeam === 'target') {
    const cats = [
      ['playable', '🎮 Playable'],
      ['mob', '🌿 Wild'],
      ['other', '🎯 Dummy'],
    ];
    filtersHost.style.display = 'flex';
    filtersHost.innerHTML = cats.map(([val, label]) =>
      `<button class="clt-modal-filter-btn${clState.targetCategoryFilter === val ? ' active' : ''}" data-cat="${val}">${label}</button>`
    ).join('');
    filtersHost.querySelectorAll('.clt-modal-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        clState.targetCategoryFilter = btn.dataset.cat;
        filtersHost.querySelectorAll('.clt-modal-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
        populate();
      });
    });
  } else {
    filtersHost.style.display = 'none';
    filtersHost.innerHTML = '';
  }

  populate();

  const search = document.getElementById('cltPokemonModalSearch');
  search.value = '';
  search.oninput = () => {
    const term = search.value.toLowerCase();
    grid.querySelectorAll('.clt-modal-item').forEach(el => {
      el.style.display = el.dataset.name.includes(term) ? '' : 'none';
    });
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL ITEM
// ─────────────────────────────────────────────────────────────────────────────

function openItemModal(slotId, itemSlot) {
  const targetSlot = clState.slots[slotId];
  if (targetSlot?.pokemon?.category !== 'playable') return; // les wilds/dummies ne portent pas d'items
  clState.itemModalTarget = { slotId, itemSlot };
  const modal = document.getElementById('cltItemModal');
  modal.classList.add('open');
  const grid = document.getElementById('cltItemModalGrid');
  grid.innerHTML = '';

  const excluded = Object.values(specialHeldItems || {});
  state.allItems.forEach(item => {
    if (excluded.includes(item.name)) return;
    const div = document.createElement('div');
    div.className = 'clt-modal-item';
    div.dataset.name = (item.display_name || item.name).toLowerCase();
    div.innerHTML = `<img src="${item.image}" onerror="this.src='assets/items/missing.png'"><span>${item.display_name || item.name}</span>`;
    div.addEventListener('click', () => {
      const slot = clState.slots[slotId];
      const already = slot.items.some((it, idx) => idx !== itemSlot && it && it.name === item.name);
      if (already) { alert(`${item.display_name || item.name} is already equipped on this Pokémon.`); return; }
      slot.items[itemSlot] = item;
      slot.stacks[itemSlot] = stackableItems.includes(item.name) ? Math.floor(maxStacksFor(item.name) / 2) : 0;
      slot.activated[itemSlot] = false;
      modal.classList.remove('open');
      renderRoster();
      renderConfigPanel();
      renderMovesPanel();
      if (slotId === 'target') {
        replayHPFromEntries();
        renderHpSection();
        renderLogSection();
      }
      refreshPickerIfOpen();
    });
    grid.appendChild(div);
  });

  const search = document.getElementById('cltItemModalSearch');
  search.value = '';
  search.oninput = () => {
    const term = search.value.toLowerCase();
    grid.querySelectorAll('.clt-modal-item').forEach(el => {
      el.style.display = el.dataset.name.includes(term) ? '' : 'none';
    });
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PANNEAU DE MOVES (un seul actif à la fois — §1.3)
// ─────────────────────────────────────────────────────────────────────────────

function renderMovesPanel() {
  const panel = document.getElementById('cltMovesPanel');
  const slot = clState.slots[clState.activeSlotId];

  if (!slot || slot.team === 'target' || !slot.pokemon) {
    panel.classList.remove('open');
    panel.innerHTML = '';
    return;
  }
  panel.classList.add('open');

  const moves = (slot.pokemon.moves || []).filter(m => isMoveVisible(m, slot.level));

  panel.innerHTML = `
    <h4 style="margin:0;color:var(--text-bright);font-family:'Rajdhani',sans-serif;">${slot.pokemon.displayName}'s Moves</h4>
    <div class="clt-moves-grid" id="cltMovesGrid"></div>
  `;

  const grid = document.getElementById('cltMovesGrid');
  moves.forEach(move => {
    const card = document.createElement('div');
    const isActivePicker = clState.activePicker?.actorSlotId === slot.id && clState.activePicker?.move === move;
    card.className = 'clt-move-card' + (isActivePicker ? ' active' : '');
    card.innerHTML = `<img src="${move.image || 'assets/moves/basic_attack.png'}" onerror="this.src='assets/moves/missing.png'"><span>${move.name}</span>`;
    card.addEventListener('click', () => openPicker(slot, move));
    grid.appendChild(card);
  });

  getItemEffectPseudoMoves(slot).forEach(pseudoMove => {
    const card = document.createElement('div');
    const isActivePicker = clState.activePicker?.actorSlotId === slot.id && clState.activePicker?.move === pseudoMove;
    card.className = 'clt-move-card clt-item-effect-card' + (isActivePicker ? ' active' : '');
    card.innerHTML = `<img src="${pseudoMove.image}" onerror="this.src='assets/items/missing.png'"><span>${pseudoMove.name}</span>`;
    card.addEventListener('click', () => openPicker(slot, pseudoMove));
    grid.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PICKER (sélection des lignes + crit/multi-hit) — version simplifiée fidèle à l'esprit
// du picker existant (cl-crit-controls), reconstruite ici car non-exportée ailleurs
// ─────────────────────────────────────────────────────────────────────────────

function clearPickerPanel() {
  clState.activePicker = null;
  const host = document.getElementById('cltPickerPanel');
  if (host) {
    host.innerHTML = `<div class="clt-picker-placeholder">Click a Pokémon's move above to preview its damage / heal / shield here.</div>`;
  }
  const effectsHost = document.getElementById('cltEffectsPanel');
  if (effectsHost) {
    effectsHost.innerHTML = '';
    effectsHost.classList.remove('open');
  }
}

// Recalcule et ré-affiche le picker actuellement ouvert (si il y en a un) — appelé
// après toute mutation d'état susceptible de changer ses valeurs (items, niveau,
// buffs/debuffs, PV de la Cible, changement de Pokémon...). C'est ce qui corrige
// le bug "les chiffres du picker ne se mettent pas à jour au bon moment".
function refreshPickerIfOpen() {
  const ap = clState.activePicker;
  if (!ap) return;
  const actorSlot = clState.slots[ap.actorSlotId];
  const targetSlot = clState.slots['target'];
  const stillValid = actorSlot?.pokemon && targetSlot?.pokemon && (
    ap.move.__itemEffect
      ? getItemEffectPseudoMoves(actorSlot).some(m => m.__itemEffect === ap.move.__itemEffect)
      : (actorSlot.pokemon.moves || []).includes(ap.move) && isMoveVisible(ap.move, actorSlot.level)
  );
  if (!stillValid) { clearPickerPanel(); return; }
  openPicker(actorSlot, ap.move);
}

function openPicker(actorSlot, move) {
  const targetSlot = clState.slots['target'];
  if (!targetSlot.pokemon) { alert('Please choose a Pokémon for the Target first.'); return; }
  ensureTargetHPInit();

  clState.activePicker = { actorSlotId: actorSlot.id, move };

  const { options } = withActorTargetContext(actorSlot, targetSlot, () => {
    renderMoveAndPassiveEffectsPanel(actorSlot, targetSlot);
    return buildMoveOptions(move, actorSlot, targetSlot);
  });

  const host = document.getElementById('cltPickerPanel');
  if (!host) return;
  host.innerHTML = '';

  const titleRow = document.createElement('div');
  titleRow.className = 'clt-picker-title';
  titleRow.innerHTML = `
    <img src="${actorSlot.pokemon.image}" onerror="this.src='assets/pokemon/missing.png'">
    <span>${actorSlot.pokemon.displayName} <i>(Lv.${actorSlot.pokemon.timerBased ? secsToTimer(actorSlot.timer) : actorSlot.level})</i></span>
    <span class="clt-picker-title-move">${move.name}</span>
  `;
  host.appendChild(titleRow);

  if (options.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'clt-picker';
    empty.textContent = 'This move has no loggable effect.';
    host.appendChild(empty);
    renderMovesPanel();
    return;
  }

  const picker = document.createElement('div');
  picker.className = 'clt-picker';

  const rowState = options.map(opt => ({
    selected: true,
    isCrit: false,
    hitCount: opt.tickCount,
  }));

  options.forEach((opt, idx) => {
    const row = document.createElement('div');
    row.className = 'clt-picker-row';
    const colorClass = opt.kind === 'damage' ? 'dmg-c' : opt.kind === 'heal' ? 'heal-c' : opt.kind === 'reflect' ? 'reflect-c' : 'shield-c';
    const targetLabel = opt.target === 'self' ? '(self)' : opt.target === 'ally' ? '(ally)' : opt.target === 'attacker' ? '(to attacker, not tracked in Target HP)' : '';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.addEventListener('change', () => { rowState[idx].selected = cb.checked; });

    const label = document.createElement('span');
    label.className = colorClass;
    label.textContent = `${opt.name} ${targetLabel}`;

    row.appendChild(cb);
    row.appendChild(label);

    const valSpan = document.createElement('span');
    valSpan.className = 'clt-picker-val ' + colorClass;

    const refreshVal = () => {
      const perHit = opt.canCrit ? (rowState[idx].isCrit ? opt.critValue : opt.value) : opt.value;
      if (opt.isTick && opt.tickCount > 1) {
        valSpan.textContent = `${(perHit * rowState[idx].hitCount).toLocaleString()} (${rowState[idx].hitCount}×)`;
      } else {
        valSpan.textContent = perHit.toLocaleString();
      }
    };

    if (opt.isTick && opt.tickCount > 1) {
      const ctrl = document.createElement('span');
      ctrl.innerHTML = `<button class="clt-mini-btn" data-act="minus">−</button> <b class="clt-hitcount">${opt.tickCount}</b>/${opt.tickCount} hits <button class="clt-mini-btn" data-act="plus">+</button>`;
      const minusBtn = ctrl.querySelector('[data-act=minus]');
      const plusBtn = ctrl.querySelector('[data-act=plus]');
      const updateBounds = () => {
        minusBtn.disabled = rowState[idx].hitCount <= 0;
        plusBtn.disabled = rowState[idx].hitCount >= opt.tickCount;
      };
      minusBtn.addEventListener('click', () => {
        rowState[idx].hitCount = Math.max(0, rowState[idx].hitCount - 1);
        ctrl.querySelector('.clt-hitcount').textContent = rowState[idx].hitCount;
        updateBounds();
        refreshVal();
      });
      plusBtn.addEventListener('click', () => {
        rowState[idx].hitCount = Math.min(opt.tickCount, rowState[idx].hitCount + 1);
        ctrl.querySelector('.clt-hitcount').textContent = rowState[idx].hitCount;
        updateBounds();
        refreshVal();
      });
      updateBounds();
      row.appendChild(ctrl);
    }
    if (opt.canCrit) {
      const normalBtn = document.createElement('button');
      normalBtn.className = 'clt-mini-btn active';
      normalBtn.textContent = 'Normal';
      const critBtn = document.createElement('button');
      critBtn.className = 'clt-mini-btn';
      critBtn.textContent = 'Crit';
      normalBtn.addEventListener('click', () => { rowState[idx].isCrit = false; normalBtn.classList.add('active'); critBtn.classList.remove('active'); refreshVal(); });
      critBtn.addEventListener('click', () => { rowState[idx].isCrit = true; critBtn.classList.add('active'); normalBtn.classList.remove('active'); refreshVal(); });
      row.appendChild(normalBtn);
      row.appendChild(critBtn);
    }

    row.appendChild(valSpan);
    refreshVal();
    picker.appendChild(row);
  });

  const footer = document.createElement('div');
  footer.className = 'clt-picker-footer';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'clt-cancel-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => { clearPickerPanel(); renderMovesPanel(); });

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'clt-confirm-btn';
  confirmBtn.textContent = '＋ Add to log';
  confirmBtn.addEventListener('click', () => {
    const lines = options
      .map((opt, idx) => {
        if (!rowState[idx].selected) return null;
        let value = opt.canCrit ? (rowState[idx].isCrit ? opt.critValue : opt.value) : opt.value;
        if (opt.isTick && opt.tickCount > 1) {
          value = value * rowState[idx].hitCount;
        }
        return {
          kind: opt.kind, name: opt.name, target: opt.target, value, isCrit: rowState[idx].isCrit,
          canCrit: opt.canCrit, normalValue: opt.value, critValue: opt.critValue,
          isTick: opt.isTick, tickCount: opt.tickCount, hitsUsed: rowState[idx].hitCount,
        };
      })
      .filter(Boolean);

    addLogEntry(actorSlot, move, lines);
    clearPickerPanel();
    renderMovesPanel();
  });

  footer.appendChild(cancelBtn);
  footer.appendChild(confirmBtn);
  picker.appendChild(footer);
  host.appendChild(picker);
  renderMovesPanel();

  // Petit flash visuel pour confirmer que le picker vient d'être (re)calculé
  host.classList.remove('clt-flash');
  void host.offsetWidth; // force reflow pour redémarrer l'animation
  host.classList.add('clt-flash');
}

// ─────────────────────────────────────────────────────────────────────────────
// SUIVI PV CIBLE (§3)
// ─────────────────────────────────────────────────────────────────────────────

function getTargetMaxHP() {
  const slot = clState.slots['target'];
  if (!slot.pokemon) return 0;
  if (slot.pokemon.timerBased && slot.pokemon.hpTable) {
    return getMobHPAtTimer(slot.pokemon.hpTable, slot.timer);
  }
  const stats = getModifiedStats(slot.pokemon, slot.level, slot.items, slot.stacks, slot.activated);
  return stats.hp;
}

function ensureTargetHPInit() {
  if (clState.target.hpCurrent != null) return;
  const max = getTargetMaxHP();
  clState.target.hpCurrent = clState.target.startMode === 'absolute'
    ? Math.min(clState.target.startValue, max)
    : Math.floor(max * (clState.target.startValue / 100));
}

function applyEntryToHP(lines) {
  let dmgTotal = 0, healSelfTotal = 0;
  lines.forEach(l => {
    if (l.kind === 'damage') dmgTotal += l.value;
    if (l.kind === 'heal' && l.target === 'self') healSelfTotal += l.value;
  });
  const max = getTargetMaxHP();
  clState.target.hpCurrent = Math.max(0, Math.min(max, clState.target.hpCurrent - dmgTotal + healSelfTotal));
}

function replayHPFromEntries() {
  const max = getTargetMaxHP();
  let hp = clState.target.startMode === 'absolute'
    ? Math.min(clState.target.startValue, max)
    : Math.floor(max * (clState.target.startValue / 100));
  clState.entries.forEach(entry => {
    let dmgTotal = 0, healSelfTotal = 0;
    entry.lines.forEach(l => {
      if (l.kind === 'damage') dmgTotal += l.value;
      if (l.kind === 'heal' && l.target === 'self') healSelfTotal += l.value;
    });
    hp = Math.max(0, Math.min(max, hp - dmgTotal + healSelfTotal));
    entry.hpAfter = hp;
  });
  clState.target.hpCurrent = hp;
}

function renderHpSection() {
  const root = document.getElementById('cltHpSection');
  if (!root) return;
  const slot = clState.slots['target'];
  if (!slot.pokemon) {
    root.innerHTML = `<em style="color:var(--text-dim);">Choose a Pokémon for the Target to track its HP.</em>`;
    return;
  }
  ensureTargetHPInit();
  const max = getTargetMaxHP();
  const cur = clState.target.hpCurrent;
  const pct = max > 0 ? (cur / max * 100) : 0;

  root.innerHTML = `
    <div class="clt-hp-top">
      <div class="clt-hp-values">
        <span id="cltHpEditable" title="Click to edit current HP">${cur.toLocaleString()}</span> / ${max.toLocaleString()}
        <span class="clt-hp-percent">${pct.toFixed(1)}%</span>
      </div>
      <div style="display:flex;gap:0.5rem;">
        <button class="clt-reset-btn" id="cltHpResetBtn">↺ Reset to Max</button>
        <button class="clt-clear-btn" id="cltLogClearBtn">🗑️ Clear log</button>
      </div>
    </div>
    <input type="range" class="clt-hp-slider" id="cltHpSlider" min="0" max="100" step="0.1" value="${pct}" style="--value:${Math.max(0,Math.min(100,pct))}%;">
  `;

  document.getElementById('cltHpResetBtn').addEventListener('click', () => {
    clState.target.startMode = 'percent';
    clState.target.startValue = 100;
    replayHPFromEntries();
    renderHpSection();
    renderLogSection();
    refreshPickerIfOpen();
  });

  document.getElementById('cltLogClearBtn').addEventListener('click', () => {
    clState.entries = [];
    clState.expandedEntryId = null;
    clState.target.hpCurrent = null;
    renderHpSection();
    renderLogSection();
    refreshPickerIfOpen();
  });

  const applyManualHP = (val) => {
    const m = getTargetMaxHP();
    val = Math.max(0, Math.min(m, val));
    clState.target.startMode = 'absolute';
    clState.target.startValue = val;
    replayHPFromEntries();
    renderHpSection();
    renderLogSection();
    refreshPickerIfOpen();
  };

  document.getElementById('cltHpEditable').addEventListener('click', (e) => {
    const span = e.currentTarget;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 0;
    input.max = max;
    input.value = cur;
    input.style.width = '90px';
    input.style.padding = '0.2rem';
    input.style.fontSize = '1rem';
    input.style.textAlign = 'center';
    span.replaceWith(input);
    input.focus();
    input.select();

    let saved = false;
    const save = () => {
      if (saved) return; // évite le double-déclenchement Enter (keydown) + blur
      saved = true;
      const val = parseInt(input.value) || 0;
      applyManualHP(val);
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); save(); }
    });
  });

  document.getElementById('cltHpSlider').addEventListener('input', (e) => {
    const p = parseFloat(e.target.value);
    e.target.style.setProperty('--value', `${p}%`);
    clState.target.startMode = 'percent';
    clState.target.startValue = p;

    // Met à jour l'affichage numérique EN DIRECT pendant le drag (au lieu d'attendre le relâchement)
    const liveVal = Math.floor(max * (p / 100));
    const hpValEl = document.getElementById('cltHpEditable');
    if (hpValEl) hpValEl.textContent = liveVal.toLocaleString();
    const pctEl = root.querySelector('.clt-hp-percent');
    if (pctEl) pctEl.textContent = `${p.toFixed(1)}%`;
  });
  document.getElementById('cltHpSlider').addEventListener('change', (e) => {
    replayHPFromEntries();
    renderHpSection();
    renderLogSection();
    refreshPickerIfOpen();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG / CHIPS (§2)
// ─────────────────────────────────────────────────────────────────────────────

function getActiveBuffsSnapshot() {
  const all = [
    ...(typeof ATTACKER_BUFFS !== 'undefined' ? ATTACKER_BUFFS : []),
    ...(typeof DEFENDER_BUFFS !== 'undefined' ? DEFENDER_BUFFS : []),
    ...(typeof ATTACKER_DEBUFFS !== 'undefined' ? ATTACKER_DEBUFFS : []),
    ...(typeof DEFENDER_DEBUFFS !== 'undefined' ? DEFENDER_DEBUFFS : []),
  ];
  return all.filter(([key]) => !!state[key]).map(([, label]) => label);
}

function addLogEntry(actorSlot, move, lines) {
  applyEntryToHP(lines);
  clState.entries.push({
    id: clState.entrySeq++,
    actorId: actorSlot.id,
    actorName: actorSlot.pokemon.displayName,
    actorImage: actorSlot.pokemon.image,
    actorLevel: actorSlot.level,
    moveName: move.name,
    moveImage: move.image,
    lines,
    hpAfter: clState.target.hpCurrent,
    buffsSnapshot: getActiveBuffsSnapshot(),
  });
  renderHpSection();
  renderLogSection();
}

function removeLogEntry(entryId) {
  clState.entries = clState.entries.filter(e => e.id !== entryId);
  if (clState.expandedEntryId === entryId) clState.expandedEntryId = null;
  replayHPFromEntries();
  renderHpSection();
  renderLogSection();
}

function buildChipTooltip(entry) {
  return entry.lines.map(l => `${l.name}${l.isCrit ? ' (crit)' : ''}: ${l.value.toLocaleString()}`).join('\n');
}

function buildEntryDetailHTML(entry) {
  const lineRows = entry.lines.map(l => {
    const kindIcon = l.kind === 'damage' ? '💥' : l.kind === 'heal' ? '❤️' : l.kind === 'reflect' ? '🪨' : '🛡️';
    const tgt = l.target === 'self' ? '(self)' : l.target === 'ally' ? '(ally)' : l.target === 'attacker' ? '(to attacker)' : '';
    let breakdown = '';
    if (l.canCrit) {
      breakdown = `Normal: <b>${l.normalValue?.toLocaleString() ?? '—'}</b> · Crit: <b>${l.critValue?.toLocaleString() ?? '—'}</b> → used: <b class="${l.isCrit ? 'clt-detail-crit' : ''}">${l.isCrit ? 'CRIT' : 'Normal'}</b>`;
    } else if (l.isTick && l.tickCount > 1) {
      breakdown = `Per-hit: <b>${(l.normalValue ?? l.value / Math.max(l.hitsUsed || 1, 1)).toLocaleString()}</b> × ${l.hitsUsed ?? l.tickCount} hits (of ${l.tickCount})`;
    }
    return `
      <div class="clt-detail-line">
        <span>${kindIcon} ${l.name} ${tgt}</span>
        <span class="clt-detail-line-val">${l.value.toLocaleString()}</span>
        ${breakdown ? `<div class="clt-detail-line-sub">${breakdown}</div>` : ''}
      </div>`;
  }).join('');

  const buffsHTML = entry.buffsSnapshot && entry.buffsSnapshot.length
    ? `<div class="clt-detail-buffs"><strong>Active buffs/debuffs:</strong> ${entry.buffsSnapshot.join(', ')}</div>`
    : `<div class="clt-detail-buffs clt-detail-buffs-empty">No global buff/debuff active for this hit.</div>`;

  return `
    <div class="clt-detail-header">${entry.actorName} (Lv.${entry.actorLevel ?? '?'}) — ${entry.moveName}</div>
    ${lineRows}
    ${buffsHTML}
    <div class="clt-detail-footer">Target HP after this entry: <b>${entry.hpAfter != null ? entry.hpAfter.toLocaleString() : '—'}</b></div>
  `;
}

function renderLogSection() {
  const root = document.getElementById('cltLogSection');
  if (!root) return;

  let totalDmg = 0, totalHealSelf = 0, totalHealAlly = 0, totalShieldSelf = 0, totalShieldAlly = 0;
  clState.entries.forEach(e => e.lines.forEach(l => {
    if (l.kind === 'damage') totalDmg += l.value;
    if (l.kind === 'heal' && l.target === 'self') totalHealSelf += l.value;
    if (l.kind === 'heal' && l.target === 'ally') totalHealAlly += l.value;
    if (l.kind === 'shield' && l.target === 'self') totalShieldSelf += l.value;
    if (l.kind === 'shield' && l.target === 'ally') totalShieldAlly += l.value;
  }));

  root.innerHTML = `
    <div class="clt-log-header"><strong style="color:var(--text-bright);">Sequence</strong> <span style="color:var(--text-dim);font-size:0.78rem;">(click a step to see details)</span></div>
    <div class="clt-chips" id="cltChips"></div>
    <div class="clt-entry-detail-host" id="cltEntryDetailHost"></div>
    <div class="clt-totals">
      <span>💥 Total Damage: <b>${totalDmg.toLocaleString()}</b></span>
      <span>❤️ Heal (self): <b>${totalHealSelf.toLocaleString()}</b></span>
      <span>❤️ Heal (ally): <b>${totalHealAlly.toLocaleString()}</b></span>
      <span>🛡️ Shield (self): <b>${totalShieldSelf.toLocaleString()}</b></span>
      <span>🛡️ Shield (ally): <b>${totalShieldAlly.toLocaleString()}</b></span>
    </div>
  `;

  const chipsHost = document.getElementById('cltChips');
  const detailHost = document.getElementById('cltEntryDetailHost');
  if (clState.entries.length === 0) {
    chipsHost.innerHTML = `<span style="color:var(--text-dim);font-size:0.85rem;">Click a Pokémon's move to add it to the combo...</span>`;
    return;
  }

  clState.entries.forEach((entry, idx) => {
    if (idx > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'clt-chip-arrow';
      arrow.textContent = '→';
      chipsHost.appendChild(arrow);
    }
    const chip = document.createElement('div');
    chip.className = 'clt-chip' + (clState.expandedEntryId === entry.id ? ' active' : '');
    chip.title = buildChipTooltip(entry);
    chip.innerHTML = `
      <img src="${entry.actorImage}" onerror="this.src='assets/pokemon/missing.png'">
      <span>${entry.actorName}</span>
      <img src="${entry.moveImage}" onerror="this.src='assets/moves/missing.png'">
      <span>${entry.moveName}</span>
      <button class="clt-chip-x" data-entry-id="${entry.id}">×</button>
    `;
    chip.addEventListener('click', (e) => {
      if (e.target.closest('.clt-chip-x')) return;
      clState.expandedEntryId = clState.expandedEntryId === entry.id ? null : entry.id;
      renderLogSection();
    });
    chip.querySelector('.clt-chip-x').addEventListener('click', () => removeLogEntry(entry.id));
    chipsHost.appendChild(chip);
  });

  if (clState.expandedEntryId != null) {
    const entry = clState.entries.find(e => e.id === clState.expandedEntryId);
    if (entry) {
      detailHost.innerHTML = buildEntryDetailHTML(entry);
    } else {
      clState.expandedEntryId = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUFFS / DEBUFFS UNIVERSELS (non rétroactifs — §4)
// Repris des mêmes ids/clés que events.js, en checkboxes indépendantes liées au
// même `state` global (donc déjà compatibles avec le moteur, et appliquées au
// moment du clic sur un move comme dans le Calculator existant).
// ─────────────────────────────────────────────────────────────────────────────

const ATTACKER_BUFFS = [
  ['attackerRegisteelBuff', 'Registeel Buff (+15% Atk/SpAtk)'],
  ['attackerGroudonBuff', 'Groudon Buff (+50% Dmg)'],
  ['attackerRayquazaBuff', 'Rayquaza Buff (+40% Dmg)'],
  ['attackerXAttackBuff', 'X Attack (+20% Atk/SpAtk)'],
  ['attackerBlisseyUltBuff', 'Blissey Unite (+20% Atk/SpAtk)'],
  ['attackerBlisseyHandBuff', 'Blissey Helping Hand+ (+15% Dmg)'],
  ['attackerMimeSwapBuff', 'Mr. Mime Power Swap (+15% Dmg)'],
  ['attackerMimeSwapPlusBuff', 'Mr. Mime Power Swap+ (+20% Dmg)'],
  ['attackerAlcreamieBuff', 'Alcremie Buff'],
  ['attackerMiraidonBuff', 'Miraidon Buff'],
  ['attackerSkeledirgeBuff', 'Skeledirge Buff'],
];
const DEFENDER_BUFFS = [
  ['defenderRegirockBuff', 'Regirock Buff (+30%/+25% Def)'],
  ['defenderEldegossBuff', 'Eldegoss (−20% dmg taken)'],
  ['defenderNinetailsBuff', 'Ninetails (−35% dmg taken)'],
  ['defenderNinetailsPlusBuff', 'Ninetails+ (−40% dmg taken)'],
  ['defenderUmbreonBuff', 'Umbreon (−20% dmg taken)'],
  ['defenderUmbreonPlusBuff', 'Umbreon+ (−30% dmg taken)'],
  ['defenderBlisseyRedirectionBuff', 'Blissey Redirection (−50%)'],
  ['defenderHoOhRedirectionBuff', 'Ho-Oh Redirection (−60%)'],
];
const ATTACKER_DEBUFFS = [
  ['debuffBuzzwoleLunge', 'Buzzwole: Lunge (-30% Atk)'], ['debuffCharizardBurn', 'Charizard: Burn (-5% Atk)'],
  ['debuffCinderaceBurn', 'Cinderace: Burn (-5% Atk / Sp.Atk)'], ['debuffCramorantFeatherDance', 'Cramorant: Feather Dance (-30% Atk)'],
  ['debuffDodrioTriAttackFlame', 'Dodrio: Tri Attack Flame (-8% Atk)'], ['debuffDodrioTriAttackFlameSprint', 'Dodrio: Tri Attack Flame Sprint (-12% Atk)'],
  ['debuffGengarWillOWisp', 'Gengar: Will-o-Wisp (-10% Atk / Sp.Atk)'], ['debuffSlowbroScald', 'Slowbro: Scald (-60% Atk)'],
  ['debuffSylveonBabyDollEyes', 'Sylveon: Baby-Doll Eyes (-15% Atk)'], ['debuffTrevenantWillOWisp', 'Trevenant: Will-o-Wisp (-10% Atk / -5% Sp.Atk)'],
  ['debuffTsareenaTropKick', 'Tsareena: Trop Kick (-25% Atk)'], ['debuffGoodraMuddyWater', 'Goodra: Muddy Water (-15% Damage)'],
  ['debuffMimePowerSwap', 'Mr. Mime: Power Swap (-15% Damage)'], ['debuffMimePowerSwapPlus', 'Mr. Mime: Power Swap + (-20% Damage)'],
  ['debuffTrevenantWoodHammerPlus', 'Trevenant: Wood Hammer + (-20% Damage)'], ['debuffInteleonTearfulLook', 'Inteleon: Tearful Look (-20% Atk / Sp.Atk)'],
  ['debuffHoohFlamethrower', 'Ho-Oh: Flamethrower (-20% Atk / Sp.Atk)'], ['debuffHoohSacredFire', 'Ho-Oh: Sacred Fire (-10% Atk)'],
  ['debuffHoohSacredFirePlus', 'Ho-Oh: Sacred Fire + (-20% Atk)'], ['debuffPsyduckSurfPlus', 'Psyduck: Surf + (-25% Damage)'],
  ['debuffPsyduckUnite', 'Psyduck: Full Power Psy-Ay-Ay! (Unite Move) (-30% Damage)'], ['debuffTinkatonIceHammer', 'Tinkaton: Ice Hammer (-30% Atk / -15% Sp.Atk)'],
  ['debuffTinkatonIceHammerPlus', 'Tinkaton: Ice Hammer + (-50% Atk / -30% Sp.Atk)'], ['debuffAlcremieCharm', 'Alcremie: Charm (-30 Atk / -20 Sp.Atk)'],
  ['debuffLatiasMistBall', 'Latias: Mist Ball (-25% Damage)'],
];
const DEFENDER_DEBUFFS = [
  ['defenderAbsolBoosted', 'Absol: Boosted (-15% Def)'], ['defenderCramorantBoostedGulpMissile', 'Cramorant: Boosted/Gulp Missile (-20% Def / -5% Sp.Def)'],
  ['defenderDecidueyeShadowSneak', 'Decidueye: Shadow Sneak (-40% Def)'], ['defenderDecidueyeShadowSneakPlus', 'Decidueye: Shadow Sneak + (-60% Def)'],
  ['defenderGardevoirBoosted', 'Gardevoir: Boosted (-10% Sp.Def)'], ['defenderGengarShadowBall', 'Gengar: Shadow Ball (-80-(5×(Lv-1)) Sp.Def)'],
  ['defenderGlaceonTailWhip', 'Glaceon: Tail Whip (-30% Def / Sp.Def)'], ['defenderHoopaShadowBall', 'Hoopa: Shadow Ball (-30% Sp.Def)'],
  ['defenderSlowbroOblivious', 'Slowbro: Oblivious (-4% Sp.Def x5 (-20% Sp.Def))'], ['defenderTsareenaBoosted', 'Tsareena: Boosted (-20% Def)'],
  ['defenderUrshifuLiquidation', 'Urshifu: Liquidation (-30% Def)'], ['defenderVenusaurSludgeBomb', 'Venusaur: Sludge Bomb (-40% Sp.Def)'],
  ['defenderWigglytuffSing', 'Wigglytuff: Sing (-25% Def / Sp.Def)'], ['defenderUmbreonFakeTears', 'Umbreon: Fake Tears (-20% Def / Sp.Def)'],
  ['defenderMewtwoXUnite', 'Mewtwo X: Infinite Psyburn (Unite Move) (-20% Def)'], ['defenderMewtwoYUnite', 'Mewtwo Y: Infinite Psyburn (Unite Move) (-15% Sp.Def)'],
  ['defenderCeruledgePsychoCut', 'Ceruledge: Psycho Cut (-10-(2×(Lv-1)) Def)'], ['defenderCeruledgePsychoCutPlus', 'Ceruledge: Psycho Cut + (-15-(3×(Lv-1)) Def)'],
  ['defenderTinkatonThief', 'Tinkaton: Thief (-10% Def / Sp.Def)'], ['defenderTinkatonThiefPlus', 'Tinkaton: Thief + (-25% Def / Sp.Def)'],
  ['defenderLatiasDragonBreath', 'Latias: Dragon Breath (-30% Sp.Def)'], ['defenderEmpoleonAquaJetTorrent', 'Empoleon: Aqua Jet (Torrent) (-60% Sp.Def)'],
  ['defenderDhelmiseAnchorShotPlus', 'Dhelmise: Anchor Shot + (+50% Damage Received)'],
];

// ── Mapping clé d'état -> id de checkbox "reconnaissable" par buff-visuals.js ──
// (buff-visuals.js déduit le portrait Pokémon à partir du PRÉFIXE de l'id du
// checkbox ; ces 2 cas particuliers ne suivent pas le pattern automatique).
const ICON_ID_OVERRIDES = {
  attackerXAttackBuff: 'xattack',
  defenderHoOhRedirectionBuff: 'hoohRedirection',
};

function deriveIconId(stateKey, tag) {
  const base = ICON_ID_OVERRIDES[stateKey] || stateKey
    .replace(/^(attacker|defender|debuff)/, '')
    .replace(/(Buff|Debuff)$/, '');
  const lowered = base.charAt(0).toLowerCase() + base.slice(1);
  return `${lowered}CL${tag}`;
}

function buildBuffColumn(title, list, tag, extraClass) {
  const col = document.createElement('div');
  col.className = `clt-buff-col ${extraClass}`;
  col.innerHTML = `
    <h5>${title}</h5>
    <input type="text" class="buff-search" placeholder="Filter...">
    <div class="buff-checkboxes"></div>
  `;

  const listEl = col.querySelector('.buff-checkboxes');
  list.forEach(([key, label]) => {
    const lbl = document.createElement('label');
    lbl.className = 'buff-label';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = deriveIconId(key, tag);
    cb.checked = !!state[key];
    cb.addEventListener('change', () => { state[key] = cb.checked; refreshPickerIfOpen(); });
    lbl.appendChild(cb);
    lbl.append(label);
    listEl.appendChild(lbl);
  });

  const searchInput = col.querySelector('.buff-search');
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    listEl.querySelectorAll('.buff-label').forEach(lbl => {
      const match = lbl.textContent.toLowerCase().includes(q);
      lbl.style.display = match ? '' : 'none';
    });
  });

  return col;
}

function renderBuffsSection() {
  const root = document.getElementById('cltBuffs');
  if (!root || root.dataset.built) return; // construit une seule fois, lit le state au moment du clic
  root.dataset.built = '1';
  root.appendChild(buildBuffColumn('Attacker Buffs (global)', ATTACKER_BUFFS, 'AtkBuff', 'clt-buff-col-atk'));
  root.appendChild(buildBuffColumn('Attacker Debuffs (global)', ATTACKER_DEBUFFS, 'AtkDebuff', 'clt-buff-col-atk-debuff'));
  root.appendChild(buildBuffColumn('Target Buffs (global)', DEFENDER_BUFFS, 'DefBuff', 'clt-buff-col-def'));
  root.appendChild(buildBuffColumn('Target Debuffs (global)', DEFENDER_DEBUFFS, 'DefDebuff', 'clt-buff-col-def-debuff'));
  enhanceBuffLabels(state.allPokemon);
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

export function initCombatLogTab() {
  buildTabAndPanel();
  renderBuffsSection();
  renderRoster();
  renderHpSection();
  renderLogSection();
}