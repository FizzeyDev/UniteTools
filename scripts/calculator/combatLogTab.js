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
 * LIMITES CONNUES DE CETTE V1 (cf. réponse texte donnée à l'utilisateur) :
 * - Les multiplicateurs de move/passif "bespoke" calculés dans la grosse fonction privée
 *   `applyItemsAndGlobalEffects()` de damageDisplay.js (Slick Club, Infiltrator stacks,
 *   Skeledirge Blaze pierce, Moltres burn stacks, Ceruledge Lava Plume, Mold Breaker def-pen,
 *   Big Root/Rescue Hood sur les heals, etc.) ne sont PAS répliqués ici car cette fonction
 *   n'est pas exportée. Tout le reste (stats de base, items flat/%, buffs/debuffs globaux,
 *   def_ignore/sp_def_ignore, crit, multi-hit/tick, % HP cibles, mutations de stats par
 *   pokémon via statsManager.js) est bien recalculé via le vrai moteur.
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
// CALCUL DES OPTIONS D'UN MOVE (dans le contexte acteur/cible déjà swappé)
// ─────────────────────────────────────────────────────────────────────────────

function buildMoveOptions(move, actorSlot, targetSlot) {
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

  const currentDefHP = clState.target.hpCurrent != null
    ? clState.target.hpCurrent
    : defStats.hp;

  const options = []; // { kind:'damage'|'heal'|'shield', name, target, canCrit, isTick, tickCount, value, critValue }

  visibleDamages?.forEach(dmg => {
    if (!dmg.dealDamage) return;

    let relevantAtk = actorSlot.pokemon.style === 'special' ? atkStats.sp_atk : atkStats.atk;
    let relevantDef = actorSlot.pokemon.style === 'special' ? defStats.sp_def : defStats.def;
    if (dmg.scaling === 'physical') { relevantAtk = atkStats.atk; relevantDef = defStats.def; }
    if (dmg.scaling === 'special') { relevantAtk = atkStats.sp_atk; relevantDef = defStats.sp_def; }

    let effectiveDef = relevantDef;
    if (dmg.def_ignore != null && relevantDef === defStats.def) {
      effectiveDef = Math.floor(effectiveDef * (1 - dmg.def_ignore));
    }
    if (dmg.sp_def_ignore != null && relevantDef === defStats.sp_def) {
      effectiveDef = Math.floor(effectiveDef * (1 - dmg.sp_def_ignore));
    }

    const normal = calculateDamage(dmg, relevantAtk, effectiveDef, level, false, actorSlot.pokemon.pokemonId, 1.0, globalDamageMult, defStats.hp, currentDefHP);
    const crit = calculateDamage(dmg, relevantAtk, effectiveDef, level, true, actorSlot.pokemon.pokemonId, scopeCritBonus, globalDamageMult, defStats.hp, currentDefHP);

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

  visibleHeals?.forEach(heal => {
    const base = calculateHeal(heal, atkStats, level, null);
    const tgt = heal.target || 'both';
    const isTick = !!heal.is_tick;
    const tickCount = heal.tick_count || 1;
    if (tgt === 'self' || tgt === 'both') {
      options.push({ kind: 'heal', name: heal.name || 'Heal', target: 'self', canCrit: false, isTick, tickCount, value: base, critValue: base });
    }
    if (tgt === 'ally' || tgt === 'both') {
      options.push({ kind: 'heal', name: heal.name || 'Heal', target: 'ally', canCrit: false, isTick, tickCount, value: base, critValue: base });
    }
  });

  visibleShields?.forEach(shield => {
    const base = calculateShield(shield, atkStats, level);
    const tgt = shield.target || 'both';
    const isTick = !!shield.is_tick;
    const tickCount = shield.tick_count || 1;
    if (tgt === 'self' || tgt === 'both') {
      options.push({ kind: 'shield', name: shield.name || 'Shield', target: 'self', canCrit: false, isTick, tickCount, value: base, critValue: base });
    }
    if (tgt === 'ally' || tgt === 'both') {
      options.push({ kind: 'shield', name: shield.name || 'Shield', target: 'ally', canCrit: false, isTick, tickCount, value: base, critValue: base });
    }
  });

  // Auto-attack : ajoute dégâts normal/crit si le move est l'auto-attack basique
  if (move.name === 'Auto-attack' && (!visibleDamages || visibleDamages.length === 0)) {
    const aa = getAutoAttackResults(atkStats, defStats, currentDefHP, globalDamageMult);
    options.push({ kind: 'damage', name: 'Auto-attack', target: 'target', canCrit: true, isTick: false, tickCount: 1, value: aa.normal, critValue: aa.crit });
  }

  return { options, maxHP: defStats.hp };
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
    </div>
    <div class="clt-roster" id="cltRoster"></div>
    <div class="clt-config-panel" id="cltConfigPanel"></div>
    <div class="clt-moves-panel" id="cltMovesPanel"></div>
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

  card.addEventListener('click', () => openSlotConfig(slot.id));
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

  document.getElementById('cltConfigCloseBtn').addEventListener('click', () => {
    clState.activeSlotId = null;
    renderRoster();
    document.getElementById('cltConfigPanel').classList.remove('open');
    document.getElementById('cltMovesPanel').classList.remove('open');
  });

  document.getElementById('cltPickPokemonBtn').addEventListener('click', () => openPokemonModal(slot.id));

  document.getElementById('cltLevelSlider').addEventListener('input', e => {
    if (isWild) {
      slot.timer = parseInt(e.target.value);
      document.getElementById('cltLevelVal').textContent = secsToTimer(slot.timer);
      e.target.style.setProperty('--value', slot.timer);
      if (slot.team === 'target') {
        // PV courant suit le max si pas encore engagé dans un combo
        renderHpSection();
      }
    } else {
      slot.level = parseInt(e.target.value);
      document.getElementById('cltLevelVal').textContent = slot.level;
      e.target.style.setProperty('--value', slot.level);
    }
    renderRoster();
    renderMovesPanel();
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
  document.querySelectorAll('.clt-stack-minus').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const i = parseInt(btn.dataset.itemSlot);
    slot.stacks[i] = Math.max(0, (slot.stacks[i] || 0) - 1);
    renderConfigPanel();
  }));
  document.querySelectorAll('.clt-stack-plus').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const i = parseInt(btn.dataset.itemSlot);
    const max = maxStacksFor(slot.items[i]?.name || '');
    slot.stacks[i] = Math.min(max, (slot.stacks[i] || 0) + 1);
    renderConfigPanel();
  }));
  document.querySelectorAll('.clt-item-toggle').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const i = parseInt(btn.dataset.itemSlot);
    slot.activated[i] = !slot.activated[i];
    renderConfigPanel();
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
    <div id="cltPickerHost"></div>
  `;

  const grid = document.getElementById('cltMovesGrid');
  moves.forEach(move => {
    const card = document.createElement('div');
    card.className = 'clt-move-card';
    card.innerHTML = `<img src="${move.image || 'assets/moves/basic_attack.png'}" onerror="this.src='assets/moves/missing.png'"><span>${move.name}</span>`;
    card.addEventListener('click', () => openPicker(slot, move));
    grid.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PICKER (sélection des lignes + crit/multi-hit) — version simplifiée fidèle à l'esprit
// du picker existant (cl-crit-controls), reconstruite ici car non-exportée ailleurs
// ─────────────────────────────────────────────────────────────────────────────

function openPicker(actorSlot, move) {
  const targetSlot = clState.slots['target'];
  if (!targetSlot.pokemon) { alert('Please choose a Pokémon for the Target first.'); return; }
  ensureTargetHPInit();

  const { options } = withActorTargetContext(actorSlot, targetSlot, () => buildMoveOptions(move, actorSlot, targetSlot));

  const host = document.getElementById('cltPickerHost');
  if (!host) return;
  host.innerHTML = '';

  if (options.length === 0) {
    host.innerHTML = `<div class="clt-picker">This move has no loggable effect.</div>`;
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
    const colorClass = opt.kind === 'damage' ? 'dmg-c' : opt.kind === 'heal' ? 'heal-c' : 'shield-c';
    const targetLabel = opt.target === 'self' ? '(self)' : opt.target === 'ally' ? '(ally)' : '';

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
      if (opt.isTick && opt.tickCount > 1) {
        valSpan.textContent = `${(opt.value * rowState[idx].hitCount).toLocaleString()} (${rowState[idx].hitCount}×)`;
      } else if (opt.canCrit) {
        valSpan.textContent = (rowState[idx].isCrit ? opt.critValue : opt.value).toLocaleString();
      } else {
        valSpan.textContent = opt.value.toLocaleString();
      }
    };

    if (opt.isTick && opt.tickCount > 1) {
      const ctrl = document.createElement('span');
      ctrl.innerHTML = `<button class="clt-mini-btn" data-act="minus">−</button> <b class="clt-hitcount">${opt.tickCount}</b>/${opt.tickCount} hits <button class="clt-mini-btn" data-act="plus">+</button>`;
      ctrl.querySelector('[data-act=minus]').addEventListener('click', () => {
        rowState[idx].hitCount = Math.max(0, rowState[idx].hitCount - 1);
        ctrl.querySelector('.clt-hitcount').textContent = rowState[idx].hitCount;
        refreshVal();
      });
      ctrl.querySelector('[data-act=plus]').addEventListener('click', () => {
        rowState[idx].hitCount = Math.min(opt.tickCount, rowState[idx].hitCount + 1);
        ctrl.querySelector('.clt-hitcount').textContent = rowState[idx].hitCount;
        refreshVal();
      });
      row.appendChild(ctrl);
    } else if (opt.canCrit) {
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
  cancelBtn.addEventListener('click', () => { host.innerHTML = ''; });

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'clt-confirm-btn';
  confirmBtn.textContent = '＋ Add to log';
  confirmBtn.addEventListener('click', () => {
    const lines = options
      .map((opt, idx) => {
        if (!rowState[idx].selected) return null;
        let value;
        if (opt.isTick && opt.tickCount > 1) {
          value = opt.value * rowState[idx].hitCount;
        } else if (opt.canCrit) {
          value = rowState[idx].isCrit ? opt.critValue : opt.value;
        } else {
          value = opt.value;
        }
        return {
          kind: opt.kind, name: opt.name, target: opt.target, value, isCrit: rowState[idx].isCrit,
          canCrit: opt.canCrit, normalValue: opt.value, critValue: opt.critValue,
          isTick: opt.isTick, tickCount: opt.tickCount, hitsUsed: rowState[idx].hitCount,
        };
      })
      .filter(Boolean);

    addLogEntry(actorSlot, move, lines);
    host.innerHTML = '';
  });

  footer.appendChild(cancelBtn);
  footer.appendChild(confirmBtn);
  picker.appendChild(footer);
  host.appendChild(picker);
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
  });

  document.getElementById('cltLogClearBtn').addEventListener('click', () => {
    clState.entries = [];
    clState.expandedEntryId = null;
    clState.target.hpCurrent = null;
    renderHpSection();
    renderLogSection();
  });

  const applyManualHP = (val) => {
    const m = getTargetMaxHP();
    val = Math.max(0, Math.min(m, val));
    clState.target.startMode = 'absolute';
    clState.target.startValue = val;
    replayHPFromEntries();
    renderHpSection();
    renderLogSection();
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

    const save = () => {
      const val = parseInt(input.value) || 0;
      applyManualHP(val);
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', ev => { if (ev.key === 'Enter') save(); });
  });

  document.getElementById('cltHpSlider').addEventListener('input', (e) => {
    const p = parseFloat(e.target.value);
    e.target.style.setProperty('--value', `${p}%`);
    clState.target.startMode = 'percent';
    clState.target.startValue = p;
  });
  document.getElementById('cltHpSlider').addEventListener('change', (e) => {
    replayHPFromEntries();
    renderHpSection();
    renderLogSection();
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
    const kindIcon = l.kind === 'damage' ? '💥' : l.kind === 'heal' ? '❤️' : '🛡️';
    const tgt = l.target === 'self' ? '(self)' : l.target === 'ally' ? '(ally)' : '';
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
  ['defenderUmbreonBuff', 'Umbreon (−15% dmg taken)'],
  ['defenderUmbreonPlusBuff', 'Umbreon+ (−25% dmg taken)'],
  ['defenderBlisseyRedirectionBuff', 'Blissey Redirection (−50%)'],
  ['defenderHoOhRedirectionBuff', 'Ho-Oh Redirection (−60%)'],
];
const ATTACKER_DEBUFFS = [
  ['debuffBuzzwoleLunge', 'Buzzwole: Lunge (-30% Atk)'], ['debuffCharizardBurn', 'Charizard: Burn (-5% Atk)'],
  ['debuffCinderaceBurn', 'Cinderace: Burn (-5% Atk / Sp.Atk)'], ['debuffCramorantFeatherDance', 'Cramorant: Feather Dance (-30% Atk)'],
  ['debuffDodrioTriAttackFlame', 'Dodrio: Tri Attack Flame (-8% Atk)'], ['debuffDodrioTriAttackFlameSprint', 'Dodrio: Tri Attack Flame Sprint (-12% Atk)'],
  ['debuffGengarWillOWisp', 'Gengar: Will-o-Wisp (-10% Atk / -5% Sp.Atk)'], ['debuffSlowbroScald', 'Slowbro: Scald (-60% Atk)'],
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
    cb.addEventListener('change', () => { state[key] = cb.checked; });
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
  renderRoster();
  renderHpSection();
  renderBuffsSection();
  renderLogSection();
}