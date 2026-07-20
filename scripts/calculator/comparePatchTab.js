/**
 * comparePatchTab.js
 * ─────────────────────────────────────────────────────────────────────────
 * Onglet "📊 Compare Patch" — montre les dégâts RÉELS des moves d'un
 * Pokémon (avant / après), calculés avec le même moteur que le Calculator
 * classique (getModifiedStats / calculateDamage), pour deux patchs
 * archivés (cf. patchesConfig.js).
 *
 * Contrairement à l'ancienne version, cet onglet ne montre plus les champs
 * bruts du JSON (multiplier / constant) : il affiche exactement ce que le
 * joueur verrait dans l'onglet Calculator — les dégâts de chaque move,
 * avant vs après — avec possibilité d'équiper des objets sur l'attaquant
 * et de régler son niveau, face à une "cible" dont on peut fixer
 * HP / DEF / SP.DEF (comme le Substitute/Custom Doll du Calculator).
 *
 * Limite volontaire (pour rester fiable) : les buffs/passifs spécifiques à
 * certains Pokémon qui dépendent de cases à cocher du Calculator (ex :
 * Mold Breaker, Dragon Dance...) ne sont pas reproduits ici. Seuls les
 * stats de base + objets équipés + niveau sont pris en compte. Un rappel
 * discret le mentionne dans l'UI.
 */

import { buildMonsMap, mapPokeDataWithMons } from './dataLoader.js';
import { patches, getPatchById } from './patchesConfig.js';
import { getModifiedStats, calculateDamage } from './damageCalculator.js';
import { stackableItems } from './constants.js';
import { state } from './state.js';

// ─────────────────────────────────────────────────────────────────────────
// ÉTAT LOCAL DE L'ONGLET (100% indépendant du Calculator principal)
// ─────────────────────────────────────────────────────────────────────────

const cptState = {
  patchA: patches[0],
  patchB: patches[1] || patches[0],
  selectedPokemonId: null,
  searchTerm: '',
  onlyChanged: true,
  onlyChangedPokemon: false,

  attackerLevel: 15,
  attackerItems: [null, null, null],
  attackerItemStacks: [0, 0, 0],
  attackerItemActivated: [false, false, false],

  target: { hp: 100000, def: 0, sp_def: 0, hpPercent: 100 },

  itemPopoverSlot: null,

  // Universal (non Pokémon-specific) buffs/debuffs — battle items & ally
  // Unite moves that any attacker/target can receive regardless of kit.
  universalAttackerBuffs: {
    xAttack: false,
    allyIronDefense: false,
    allyBlisseyUlt: false,
    allyGroudon: false,
    allyRayquaza: false,
    allyBlisseyHand: false,
    allyMimeSwap: false,
    allyMimeSwapPlus: false,
    allySkeledirge: false,
  },
  universalAttackerDebuffs: {
    goodraMuddyWater: false,
    mimePowerSwap: false,
    mimePowerSwapPlus: false,
    trevenantWoodHammerPlus: false,
    psyduckSurfPlus: false,
    psyduckUnite: false,
    latiasMistBall: false,
  },
  universalTargetBuffs: {
    eldegoss: false,
    ninetails: false,
    ninetailsPlus: false,
    umbreon: false,
    umbreonPlus: false,
    blisseyRedirection: false,
    hoohRedirection: false,
  },
  universalTargetDebuffs: {
    dhelmiseAnchorShotPlus: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────
// DÉFINITIONS DES BUFFS/DEBUFFS UNIVERSELS (indépendants du Pokémon choisi)
// ─────────────────────────────────────────────────────────────────────────

const UNIVERSAL_ATK_BUFFS = [
  { key: 'xAttack',          icon: '⚔️', title: 'X Attack',                    effect: '+20% Atk / Sp. Atk' },
  { key: 'allyIronDefense',  icon: '🛡️', title: 'Registeel Unite (ally)',      effect: '+15% Atk / Sp. Atk' },
  { key: 'allyBlisseyUlt',   icon: '🎀', title: 'Blissey Unite (ally)',        effect: '+20% Atk / Sp. Atk' },
  { key: 'allyGroudon',      icon: '🌋', title: 'Groudon Unite (ally)',        effect: '×1.50 damage dealt' },
  { key: 'allyRayquaza',     icon: '🐉', title: 'Rayquaza Unite (ally)',       effect: '×1.40 damage dealt' },
  { key: 'allyBlisseyHand',  icon: '🖐️', title: 'Helping Hand (ally Blissey)', effect: '×1.15 damage dealt' },
  { key: 'allyMimeSwap',     icon: '🔄', title: 'Role Swap (ally Mr. Mime)',   effect: '×1.15 damage dealt' },
  { key: 'allyMimeSwapPlus', icon: '🔄', title: 'Role Swap+ (ally Mr. Mime)',  effect: '×1.20 damage dealt' },
  { key: 'allySkeledirge',   icon: '🔥', title: 'Skeledirge Unite (ally)',     effect: '×1.15 damage dealt' },
];

const UNIVERSAL_ATK_DEBUFFS = [
  { key: 'goodraMuddyWater',        icon: '💧', title: 'Muddy Water (Goodra)',        effect: '×0.85 damage dealt' },
  { key: 'mimePowerSwap',           icon: '🌀', title: 'Power Swap (Mr. Mime)',       effect: '×0.85 damage dealt' },
  { key: 'mimePowerSwapPlus',       icon: '🌀', title: 'Power Swap+ (Mr. Mime)',      effect: '×0.80 damage dealt' },
  { key: 'trevenantWoodHammerPlus', icon: '🌲', title: 'Wood Hammer+ (Trevenant)',    effect: '×0.80 damage dealt' },
  { key: 'psyduckSurfPlus',         icon: '🌊', title: 'Surf+ (Psyduck)',             effect: '×0.75 damage dealt' },
  { key: 'psyduckUnite',            icon: '💫', title: 'Psyduck Unite Move',          effect: '×0.70 damage dealt' },
  { key: 'latiasMistBall',          icon: '☁️', title: 'Mist Ball (Latias)',          effect: '×0.75 damage dealt' },
];

const UNIVERSAL_TARGET_BUFFS = [
  { key: 'eldegoss',           icon: '🌼', title: 'Cotton Guard (ally Eldegoss)', effect: '×0.80 damage taken' },
  { key: 'ninetails',          icon: '❄️', title: 'Aurora Veil (Ninetails)',      effect: '×0.65 damage taken' },
  { key: 'ninetailsPlus',      icon: '❄️', title: 'Aurora Veil+ (Ninetails)',     effect: '×0.60 damage taken' },
  { key: 'umbreon',            icon: '🌙', title: 'Yawn Wall (Umbreon)',          effect: '×0.80 damage taken' },
  { key: 'umbreonPlus',        icon: '🌙', title: 'Yawn Wall+ (Umbreon)',         effect: '×0.70 damage taken' },
  { key: 'blisseyRedirection', icon: '🎀', title: 'Redirection (ally Blissey)',  effect: '×0.50 damage taken' },
  { key: 'hoohRedirection',    icon: '🔥', title: 'Redirection (ally Ho-Oh)',    effect: '×0.40 damage taken' },
];

const UNIVERSAL_TARGET_DEBUFFS = [
  { key: 'dhelmiseAnchorShotPlus', icon: '⚓', title: 'Anchor Shot+ (Dhelmise)', effect: '×1.50 damage taken' },
];

function computeUniversalAtkStatBonus(atkStats) {
  const b = cptState.universalAttackerBuffs;
  let { atk, sp_atk } = atkStats;
  if (b.xAttack)         { atk += Math.floor(atkStats.atk * 0.20);    sp_atk += Math.floor(atkStats.sp_atk * 0.20); }
  if (b.allyIronDefense) { atk += Math.floor(atkStats.atk * 0.15);    sp_atk += Math.floor(atkStats.sp_atk * 0.15); }
  if (b.allyBlisseyUlt)  { atk += Math.floor(atkStats.atk * 0.20);    sp_atk += Math.floor(atkStats.sp_atk * 0.20); }
  return { ...atkStats, atk, sp_atk };
}

function computeUniversalGlobalMult() {
  const b = cptState.universalAttackerBuffs;
  const d = cptState.universalAttackerDebuffs;
  let mult = 1.0;
  if (b.allyGroudon)               mult *= 1.50;
  if (b.allyRayquaza)              mult *= 1.40;
  if (b.allyBlisseyHand)           mult *= 1.15;
  if (b.allyMimeSwap)              mult *= 1.15;
  if (b.allyMimeSwapPlus)          mult *= 1.20;
  if (b.allySkeledirge)            mult *= 1.15;
  if (d.goodraMuddyWater)          mult *= 0.85;
  if (d.mimePowerSwap)             mult *= 0.85;
  if (d.mimePowerSwapPlus)         mult *= 0.80;
  if (d.trevenantWoodHammerPlus)   mult *= 0.80;
  if (d.psyduckSurfPlus)           mult *= 0.75;
  if (d.psyduckUnite)              mult *= 0.70;
  if (d.latiasMistBall)            mult *= 0.75;
  return mult;
}

function computeUniversalDefenderMult() {
  const b = cptState.universalTargetBuffs;
  const d = cptState.universalTargetDebuffs;
  let mult = 1.0;
  if (b.eldegoss)             mult *= 0.80;
  if (b.ninetails)            mult *= 0.65;
  if (b.ninetailsPlus)        mult *= 0.60;
  if (b.umbreon)              mult *= 0.80;
  if (b.umbreonPlus)          mult *= 0.70;
  if (b.blisseyRedirection)   mult *= 0.50;
  if (b.hoohRedirection)      mult *= 0.40;
  if (d.dhelmiseAnchorShotPlus) mult *= 1.50;
  return mult;
}

// ─────────────────────────────────────────────────────────────────────────
// CHARGEMENT + CACHE DES DONNÉES DE PATCH
// ─────────────────────────────────────────────────────────────────────────

let monsMapPromise = null;
function getMonsMap() {
  if (!monsMapPromise) {
    monsMapPromise = fetch('data/pokemons.json').then(r => r.json()).then(buildMonsMap);
  }
  return monsMapPromise;
}

const patchDataCache = new Map();

function loadPatchMap(patch) {
  if (patchDataCache.has(patch.id)) return patchDataCache.get(patch.id);

  const promise = (async () => {
    const [pokeRes, monsMap] = await Promise.all([
      fetch(patch.file).then(r => {
        if (!r.ok) throw new Error(`${patch.file} → HTTP ${r.status}`);
        return r.json();
      }),
      getMonsMap()
    ]);

    const mapped = mapPokeDataWithMons(pokeRes, monsMap);
    const byId = new Map();
    mapped.forEach(p => byId.set(p.pokemonId, p));
    return byId;
  })();

  patchDataCache.set(patch.id, promise);
  return promise;
}

// ─────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isMoveVisible(move, level) {
  if (move.learnLevel == null) return true;
  if (move.learnLevel > level) return false;
  if (move.unlearn != null && level >= move.unlearn) return false;
  return true;
}

function isMoveUpgraded(move, level) {
  return move.upgradeLevel != null && level >= move.upgradeLevel;
}

function filterDamagesByUpgrade(damages, upgraded) {
  if (!damages?.length) return damages || [];
  const hasUpgradedEntries = damages.some(d => d.upgraded === true);
  if (!hasUpgradedEntries) return damages;
  return upgraded ? damages.filter(d => d.upgraded === true) : damages.filter(d => !d.upgraded);
}

function isDamageLikeEntry(dmg) {
  if (!dmg) return false;
  return typeof dmg.constant === 'number' || typeof dmg.multiplier === 'number' ||
         dmg.max_hp_percent != null || dmg.missing_hp_percent != null || dmg.current_hp_percent != null;
}

function normalizeDmg(dmg) {
  return {
    ...dmg,
    constant: dmg.constant ?? 0,
    multiplier: dmg.multiplier ?? 0,
    levelCoef: dmg.levelCoef ?? 0,
  };
}

function computeHitDamage(dmgEntry, record, atkStats, defStats, level, globalMult = 1.0, defenderMult = 1.0) {
  if (!isDamageLikeEntry(dmgEntry)) return null;
  const dmg = normalizeDmg(dmgEntry);
  const scaling = dmg.scaling || record.style;
  const atkStat = scaling === 'special' ? atkStats.sp_atk : atkStats.atk;
  const defStat = scaling === 'special' ? defStats.sp_def : defStats.def;

  const normal = Math.floor(calculateDamage(dmg, atkStat, defStat, level, false, record.pokemonId, 1.0, globalMult, defStats.hp, defStats.currentHp) * defenderMult);
  const crit   = Math.floor(calculateDamage(dmg, atkStat, defStat, level, true,  record.pokemonId, 1.0, globalMult, defStats.hp, defStats.currentHp) * defenderMult);
  return { normal, crit };
}

function getVisibleMoves(record, level) {
  return (record.moves || []).filter(m => isMoveVisible(m, level));
}

// ─────────────────────────────────────────────────────────────────────────
// DIFF : un Pokémon a-t-il changé entre les deux patchs ?
// ─────────────────────────────────────────────────────────────────────────

function statsRowsEqual(rowA, rowB) {
  if (!rowA || !rowB) return rowA === rowB;
  return rowA.hp === rowB.hp && rowA.atk === rowB.atk && rowA.sp_atk === rowB.sp_atk &&
         rowA.def === rowB.def && rowA.sp_def === rowB.sp_def;
}

function statsEqual(a, b) {
  const arrA = a?.stats || [];
  const arrB = b?.stats || [];
  if (arrA.length !== arrB.length) return false;
  return arrA.every((row, i) => statsRowsEqual(row, arrB[i]));
}

function movesEqual(a, b) {
  const movesA = a?.moves || [];
  const movesB = b?.moves || [];
  const mapA = new Map(movesA.map(m => [m.name, m]));
  const mapB = new Map(movesB.map(m => [m.name, m]));
  if (mapA.size !== mapB.size) return false;
  for (const [name, mA] of mapA) {
    const mB = mapB.get(name);
    if (!mB) return false;
    if (mA.learnLevel !== mB.learnLevel || mA.upgradeLevel !== mB.upgradeLevel || mA.unlearn !== mB.unlearn) return false;
    if (JSON.stringify(mA.damages || []) !== JSON.stringify(mB.damages || [])) return false;
  }
  return true;
}

// Retourne true si le Pokémon a une différence de stats OU de moves entre
// les deux patchs (ou n'existe que dans l'un des deux).
function pokemonHasDiff(a, b) {
  if (!a || !b) return true;
  if (!statsEqual(a, b)) return true;
  if (!movesEqual(a, b)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────
// RENDU : sélecteurs de patch (dropdowns natifs — plus intuitif)
// ─────────────────────────────────────────────────────────────────────────

function renderPatchOptions(selectEl, activeId) {
  selectEl.innerHTML = patches.map(p =>
    `<option value="${p.id}" ${p.id === activeId ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
  ).join('');
}

function setupPatchSelectors() {
  const selA = document.getElementById('cptSelectA');
  const selB = document.getElementById('cptSelectB');
  if (!selA || !selB) return;

  renderPatchOptions(selA, cptState.patchA.id);
  renderPatchOptions(selB, cptState.patchB.id);

  selA.addEventListener('change', () => {
    cptState.patchA = getPatchById(selA.value) || cptState.patchA;
    renderGrid();
    renderResult();
  });
  selB.addEventListener('change', () => {
    cptState.patchB = getPatchById(selB.value) || cptState.patchB;
    renderGrid();
    renderResult();
  });

  const swapBtn = document.getElementById('cptSwapBtn');
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      [cptState.patchA, cptState.patchB] = [cptState.patchB, cptState.patchA];
      renderPatchOptions(selA, cptState.patchA.id);
      renderPatchOptions(selB, cptState.patchB.id);
      renderGrid();
      renderResult();
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// RENDU : grille de sélection de l'attaquant
// ─────────────────────────────────────────────────────────────────────────

async function renderGrid() {
  const grid = document.getElementById('cptGrid');
  if (!grid) return;

  if (patches.length < 2) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = '<div class="cpt-loading">Loading rosters…</div>';

  try {
    const [mapA, mapB] = await Promise.all([loadPatchMap(cptState.patchA), loadPatchMap(cptState.patchB)]);

    const ids = new Set([...mapA.keys(), ...mapB.keys()]);
    const list = [];
    let changedCount = 0;
    ids.forEach(id => {
      const a = mapA.get(id);
      const b = mapB.get(id);
      const ref = a || b;
      if (ref.category !== 'playable') return;
      const hasDiff = pokemonHasDiff(a, b);
      if (hasDiff) changedCount++;
      list.push({ id, displayName: ref.displayName, image: ref.image, inA: !!a, inB: !!b, hasDiff });
    });
    list.sort((x, y) => x.displayName.localeCompare(y.displayName));

    const countEl = document.getElementById('cptChangedCount');
    if (countEl) countEl.textContent = `${changedCount} of ${list.length} Pokémon changed`;

    grid.innerHTML = '';
    list.forEach(item => {
      if (cptState.searchTerm && !item.displayName.toLowerCase().includes(cptState.searchTerm)) return;
      if (cptState.onlyChangedPokemon && !item.hasDiff) return;

      const div = document.createElement('div');
      div.className = 'pokemon-grid-item cpt-grid-item';
      if (item.id === cptState.selectedPokemonId) div.classList.add('selected');
      if (item.hasDiff) div.classList.add('cpt-grid-item-changed');

      let badge = '';
      if (!item.inA) badge = '<span class="cpt-badge cpt-badge-onlyB">B only</span>';
      else if (!item.inB) badge = '<span class="cpt-badge cpt-badge-onlyA">A only</span>';

      div.innerHTML = `
        <img src="${item.image}" alt="${item.id}" onerror="this.src='assets/pokemon/missing.png'">
        <span>${escapeHtml(item.displayName)}</span>
        ${badge}
        ${item.hasDiff && item.inA && item.inB ? '<span class="cpt-diff-dot" title="Changed between patches"></span>' : ''}
      `;
      div.addEventListener('click', () => {
        cptState.selectedPokemonId = item.id;
        renderGrid();
        renderAttackerControls();
        renderResult();
      });
      grid.appendChild(div);
    });

    if (!grid.children.length) {
      grid.innerHTML = cptState.onlyChangedPokemon
        ? '<div class="cpt-empty-state">No Pokémon differ between these two patches.</div>'
        : '<div class="cpt-empty-state">No Pokémon match your search.</div>';
    }
  } catch (err) {
    grid.innerHTML = `<div class="cpt-error">Error loading rosters: ${escapeHtml(err.message)}</div>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// RENDU : contrôles attaquant (niveau + objets)
// ─────────────────────────────────────────────────────────────────────────

function renderAttackerControls() {
  const wrap = document.getElementById('cptAtkControls');
  if (!wrap) return;

  if (!cptState.selectedPokemonId) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'flex';

  const levelInput = document.getElementById('cptLevelValue');
  const levelSlider = document.getElementById('cptLevelSlider');
  if (levelInput) levelInput.textContent = cptState.attackerLevel;
  if (levelSlider) {
    levelSlider.value = cptState.attackerLevel;
    levelSlider.style.setProperty('--value', cptState.attackerLevel);
  }

  renderItemSlots();
}

function renderItemSlots() {
  const row = document.getElementById('cptItemRow');
  if (!row) return;
  row.innerHTML = cptState.attackerItems.map((item, slot) => {
    if (!item) {
      return `
        <div class="cpt-item-slot cpt-item-empty" data-slot="${slot}">
          <span class="cpt-item-plus">+</span>
          <span class="cpt-item-empty-label">Empty</span>
        </div>`;
    }

    const isStackable = stackableItems.includes(item.name);
    const stack = cptState.attackerItemStacks[slot];
    const maxStacks = item.name === "Weakness Policy" ? 4 : (item.name.includes("Accel") || item.name.includes("Drive") ? 20 : 6);
    const isActivable = !!item.activable;
    const activated = cptState.attackerItemActivated[slot];

    return `
      <div class="cpt-item-slot cpt-item-filled" data-slot="${slot}">
        <button type="button" class="cpt-item-remove" data-slot="${slot}" title="Remove item">✕</button>
        <img src="${item.image}" alt="${escapeHtml(item.name)}" onerror="this.src='assets/items/missing.png'">
        <span class="cpt-item-name">${escapeHtml(item.display_name || item.name)}</span>
        ${isStackable ? `
          <div class="cpt-item-stacks">
            <button type="button" class="cpt-stack-btn cpt-stack-minus" data-slot="${slot}">−</button>
            <span class="cpt-stack-value">${stack}</span><span class="cpt-stack-max">/${maxStacks}</span>
            <button type="button" class="cpt-stack-btn cpt-stack-plus" data-slot="${slot}">+</button>
          </div>` : ''}
        ${isActivable ? `
          <button type="button" class="cpt-item-toggle ${activated ? 'active' : ''}" data-slot="${slot}">
            ${activated ? 'Activated' : 'Activate'}
          </button>` : ''}
      </div>`;
  }).join('');

  row.querySelectorAll('.cpt-item-empty').forEach(el => {
    el.addEventListener('click', () => openItemPopover(parseInt(el.dataset.slot, 10)));
  });
  row.querySelectorAll('.cpt-item-remove').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const slot = parseInt(el.dataset.slot, 10);
      cptState.attackerItems[slot] = null;
      cptState.attackerItemStacks[slot] = 0;
      cptState.attackerItemActivated[slot] = false;
      renderItemSlots();
      renderResult();
    });
  });
  row.querySelectorAll('.cpt-stack-minus').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const slot = parseInt(el.dataset.slot, 10);
      if (cptState.attackerItemStacks[slot] > 0) { cptState.attackerItemStacks[slot]--; renderItemSlots(); renderResult(); }
    });
  });
  row.querySelectorAll('.cpt-stack-plus').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const slot = parseInt(el.dataset.slot, 10);
      const item = cptState.attackerItems[slot];
      const max = item.name === "Weakness Policy" ? 4 : (item.name.includes("Accel") || item.name.includes("Drive") ? 20 : 6);
      if (cptState.attackerItemStacks[slot] < max) { cptState.attackerItemStacks[slot]++; renderItemSlots(); renderResult(); }
    });
  });
  row.querySelectorAll('.cpt-item-toggle').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const slot = parseInt(el.dataset.slot, 10);
      cptState.attackerItemActivated[slot] = !cptState.attackerItemActivated[slot];
      renderItemSlots();
      renderResult();
    });
  });
}

function closeItemPopover() {
  const pop = document.getElementById('cptItemPopover');
  if (pop) pop.style.display = 'none';
  cptState.itemPopoverSlot = null;
}

function openItemPopover(slot) {
  const pop = document.getElementById('cptItemPopover');
  if (!pop) return;

  if (cptState.itemPopoverSlot === slot) { closeItemPopover(); return; }
  cptState.itemPopoverSlot = slot;

  const equippedNames = new Set(cptState.attackerItems.filter(Boolean).map(i => i.name));
  const items = (state.allItems || []).filter(i => !equippedNames.has(i.name));

  pop.innerHTML = `
    <input type="text" class="cpt-item-search" placeholder="Search an item...">
    <div class="cpt-item-popover-grid">
      ${items.map(item => `
        <div class="cpt-item-popover-option" data-name="${escapeHtml(item.name)}">
          <img src="${item.image}" alt="" onerror="this.src='assets/items/missing.png'">
          <span>${escapeHtml(item.display_name || item.name)}</span>
        </div>`).join('')}
    </div>
  `;
  pop.style.display = 'block';

  const search = pop.querySelector('.cpt-item-search');
  search.addEventListener('input', () => {
    const term = search.value.toLowerCase();
    pop.querySelectorAll('.cpt-item-popover-option').forEach(el => {
      el.style.display = el.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  });

  pop.querySelectorAll('.cpt-item-popover-option').forEach(el => {
    el.addEventListener('click', () => {
      const item = state.allItems.find(i => i.name === el.dataset.name);
      if (!item) return;
      cptState.attackerItems[slot] = item;
      cptState.attackerItemStacks[slot] = 0;
      cptState.attackerItemActivated[slot] = false;
      closeItemPopover();
      renderItemSlots();
      renderResult();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// RENDU : panneau cible (target dummy — HP / DEF / SP.DEF)
// ─────────────────────────────────────────────────────────────────────────

function setupTargetControls() {
  const hpInput = document.getElementById('cptTargetHp');
  const defInput = document.getElementById('cptTargetDef');
  const spDefInput = document.getElementById('cptTargetSpDef');
  const hpSlider = document.getElementById('cptTargetHpPercent');
  const hpPercentValue = document.getElementById('cptTargetHpPercentValue');

  if (hpInput) {
    hpInput.value = cptState.target.hp;
    hpInput.addEventListener('input', () => {
      cptState.target.hp = Math.max(1, parseInt(hpInput.value, 10) || 1);
      renderResult();
    });
  }
  if (defInput) {
    defInput.value = cptState.target.def;
    defInput.addEventListener('input', () => {
      cptState.target.def = Math.max(0, parseInt(defInput.value, 10) || 0);
      renderResult();
    });
  }
  if (spDefInput) {
    spDefInput.value = cptState.target.sp_def;
    spDefInput.addEventListener('input', () => {
      cptState.target.sp_def = Math.max(0, parseInt(spDefInput.value, 10) || 0);
      renderResult();
    });
  }
  if (hpSlider) {
    hpSlider.value = cptState.target.hpPercent;
    hpSlider.style.setProperty('--value', cptState.target.hpPercent);
    hpSlider.addEventListener('input', () => {
      cptState.target.hpPercent = parseInt(hpSlider.value, 10);
      hpSlider.style.setProperty('--value', cptState.target.hpPercent);
      if (hpPercentValue) hpPercentValue.textContent = `${cptState.target.hpPercent}%`;
      renderResult();
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// RENDU : résultat (moves + dégâts avant / après)
// ─────────────────────────────────────────────────────────────────────────

function formatDmg(hit) {
  if (!hit) return '<span class="cpt-missing">—</span>';
  return `${hit.normal.toLocaleString()} <span class="cpt-crit">(${hit.crit.toLocaleString()})</span>`;
}

function renderHitRow(label, hitA, hitB) {
  if (!hitA && !hitB) return '';

  const changed = !hitA || !hitB || hitA.normal !== hitB.normal || hitA.crit !== hitB.crit;
  if (!changed && cptState.onlyChanged) return '';

  let deltaHtml = '<span class="cpt-hit-delta cpt-neutral">No change</span>';
  let cls = 'cpt-neutral';
  let pct = 0;
  if (hitA && hitB && hitA.normal !== hitB.normal) {
    const delta = hitB.normal - hitA.normal;
    pct = hitA.normal ? (delta / hitA.normal * 100) : 0;
    cls = delta > 0 ? 'cpt-buff' : 'cpt-nerf';
    const sign = delta > 0 ? '+' : '';
    deltaHtml = `<span class="cpt-hit-delta ${cls}">${sign}${Math.round(delta).toLocaleString()} (${sign}${pct.toFixed(1)}%)</span>`;
  } else if (!hitA || !hitB) {
    cls = hitA ? 'cpt-nerf' : 'cpt-buff';
    pct = hitA ? -100 : 100;
    deltaHtml = `<span class="cpt-hit-delta ${cls}">${hitA ? 'Removed' : 'Added'}</span>`;
  }

  const barWidth = Math.max(4, Math.min(100, Math.abs(pct)));
  const barHtml = cls !== 'cpt-neutral'
    ? `<div class="cpt-hit-bar-track"><div class="cpt-hit-bar-fill ${cls}" style="width:${barWidth}%"></div></div>`
    : '';

  return `
    <div class="cpt-hit-row ${changed ? 'cpt-hit-changed' : ''}">
      <div class="cpt-hit-label">${escapeHtml(label)}</div>
      <div class="cpt-hit-compare">
        <span class="cpt-hit-val cpt-hit-before">${formatDmg(hitA)}</span>
        <span class="cpt-hit-arrow">→</span>
        <span class="cpt-hit-val cpt-hit-after ${hitB ? cls : ''}">${formatDmg(hitB)}</span>
        ${barHtml}
        ${deltaHtml}
      </div>
    </div>`;
}

function renderMoveCard(name, moveA, moveB, level, ctx) {
  const damagesA = moveA ? filterDamagesByUpgrade(moveA.damages, isMoveUpgraded(moveA, level)) : [];
  const damagesB = moveB ? filterDamagesByUpgrade(moveB.damages, isMoveUpgraded(moveB, level)) : [];

  const hitCount = Math.max(damagesA.length, damagesB.length);
  if (hitCount === 0) return '';

  const rowsHtml = [];
  for (let i = 0; i < hitCount; i++) {
    const dA = damagesA[i];
    const dB = damagesB[i];
    const label = dA?.name || dB?.name || `Hit ${i + 1}`;
    const hitA = dA ? computeHitDamage(dA, ctx.recordA, ctx.atkStatsA, ctx.defStats, level, ctx.globalMult, ctx.defenderMult) : null;
    const hitB = dB ? computeHitDamage(dB, ctx.recordB, ctx.atkStatsB, ctx.defStats, level, ctx.globalMult, ctx.defenderMult) : null;
    rowsHtml.push(renderHitRow(label, hitA, hitB));
  }

  const visibleRows = rowsHtml.filter(Boolean);
  if (!visibleRows.length) return '';

  let statusBadge = '';
  if (!moveA) statusBadge = '<span class="cpt-move-badge cpt-move-badge-new">New in Patch B</span>';
  else if (!moveB) statusBadge = '<span class="cpt-move-badge cpt-move-badge-removed">Removed in Patch B</span>';

  // Résumé global du move : moyenne des variations de dégâts normaux sur
  // tous les hits comparables (présents dans A ET B).
  let summaryHtml = '';
  if (moveA && moveB) {
    const deltas = [];
    for (let i = 0; i < hitCount; i++) {
      const dA = damagesA[i], dB = damagesB[i];
      if (!dA || !dB) continue;
      const hitA = computeHitDamage(dA, ctx.recordA, ctx.atkStatsA, ctx.defStats, level, ctx.globalMult, ctx.defenderMult);
      const hitB = computeHitDamage(dB, ctx.recordB, ctx.atkStatsB, ctx.defStats, level, ctx.globalMult, ctx.defenderMult);
      if (hitA && hitB && hitA.normal) deltas.push((hitB.normal - hitA.normal) / hitA.normal * 100);
    }
    if (deltas.length) {
      const avgPct = deltas.reduce((s, v) => s + v, 0) / deltas.length;
      const summaryCls = Math.abs(avgPct) < 0.05 ? 'cpt-neutral' : (avgPct > 0 ? 'cpt-buff' : 'cpt-nerf');
      const sign = avgPct > 0 ? '+' : '';
      summaryHtml = `<span class="cpt-move-summary ${summaryCls}">${summaryCls === 'cpt-neutral' ? 'No change' : `${sign}${avgPct.toFixed(1)}% overall`}</span>`;
    }
  }

  return `
    <div class="cpt-move-card">
      <div class="cpt-move-name">${escapeHtml(name)} ${statusBadge}${summaryHtml}</div>
      ${visibleRows.join('')}
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────
// RENDU : drawers de buffs/debuffs universels (attaquant + cible)
// ─────────────────────────────────────────────────────────────────────────

function renderUniversalDrawer(drawerId, accentClass, title, list, stateObj) {
  const activeCount = Object.values(stateObj).filter(Boolean).length;
  return `
    <div class="buffs-drawer cpt-universal-drawer ${accentClass}" id="${drawerId}">
      <div class="buffs-drawer-header">
        <span class="buffs-drawer-title">${title}</span>
        <span class="buff-active-count ${activeCount ? 'visible' : ''}">${activeCount}</span>
        <span class="buffs-drawer-chevron">▾</span>
      </div>
      <div class="buffs-drawer-body">
        <div class="buffs-drawer-inner">
          <div class="buff-checkboxes">
            ${list.map(b => `
              <label class="buff-label">
                <span class="buff-icon-fallback">${b.icon}</span>
                <span class="buff-text">
                  <span class="buff-title">${escapeHtml(b.title)}</span>
                  <span class="buff-effect">${escapeHtml(b.effect)}</span>
                </span>
                <input type="checkbox" data-key="${b.key}" ${stateObj[b.key] ? 'checked' : ''}>
              </label>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function wireUniversalDrawer(drawerId, stateObj) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;

  const header = drawer.querySelector('.buffs-drawer-header');
  header?.addEventListener('click', () => drawer.classList.toggle('open'));

  drawer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('click', (e) => e.stopPropagation());
    cb.addEventListener('change', () => {
      stateObj[cb.dataset.key] = cb.checked;
      const count = drawer.querySelector('.buff-active-count');
      const activeCount = Object.values(stateObj).filter(Boolean).length;
      if (count) {
        count.textContent = activeCount;
        count.classList.toggle('visible', activeCount > 0);
      }
      renderResult();
    });
  });
}

function renderUniversalDrawers() {
  const atkWrap = document.getElementById('cptAtkUniversalDrawers');
  if (atkWrap) {
    atkWrap.innerHTML =
      renderUniversalDrawer('cptAtkBuffsDrawer', 'cpt-drawer-buff', '✅ Universal Buffs', UNIVERSAL_ATK_BUFFS, cptState.universalAttackerBuffs) +
      renderUniversalDrawer('cptAtkDebuffsDrawer', 'cpt-drawer-debuff', '⛔ Universal Debuffs', UNIVERSAL_ATK_DEBUFFS, cptState.universalAttackerDebuffs);
    wireUniversalDrawer('cptAtkBuffsDrawer', cptState.universalAttackerBuffs);
    wireUniversalDrawer('cptAtkDebuffsDrawer', cptState.universalAttackerDebuffs);
  }

  const targetWrap = document.getElementById('cptTargetUniversalDrawers');
  if (targetWrap) {
    targetWrap.innerHTML =
      renderUniversalDrawer('cptTargetBuffsDrawer', 'cpt-drawer-buff', '✅ Universal Buffs (received)', UNIVERSAL_TARGET_BUFFS, cptState.universalTargetBuffs) +
      renderUniversalDrawer('cptTargetDebuffsDrawer', 'cpt-drawer-debuff', '⛔ Universal Debuffs (received)', UNIVERSAL_TARGET_DEBUFFS, cptState.universalTargetDebuffs);
    wireUniversalDrawer('cptTargetBuffsDrawer', cptState.universalTargetBuffs);
    wireUniversalDrawer('cptTargetDebuffsDrawer', cptState.universalTargetDebuffs);
  }
}

function renderNotEnoughPatches() {
  const result = document.getElementById('cptResult');
  if (!result) return;
  result.innerHTML = `
    <div class="cpt-empty-state cpt-setup-hint">
      ⚠️ Only one patch is configured right now.<br>
      Add previous patches to <code>scripts/calculator/patchesConfig.js</code>
      (and archive their JSON files under <code>data/poke_data/</code>) to unlock comparisons.
    </div>`;
}

async function renderResult() {
  const result = document.getElementById('cptResult');
  if (!result) return;

  if (patches.length < 2) { renderNotEnoughPatches(); return; }

  if (!cptState.selectedPokemonId) {
    result.innerHTML = '<div class="cpt-empty-state">Select an attacker above to compare its move damage between the two patches.</div>';
    return;
  }

  result.innerHTML = '<div class="cpt-loading">Loading data…</div>';

  const [mapA, mapB] = await Promise.all([loadPatchMap(cptState.patchA), loadPatchMap(cptState.patchB)]);
  const dataA = mapA.get(cptState.selectedPokemonId);
  const dataB = mapB.get(cptState.selectedPokemonId);

  if (!dataA && !dataB) {
    result.innerHTML = '<div class="cpt-empty-state">No data found for this Pokémon in either patch.</div>';
    return;
  }
  if (!dataA || !dataB) {
    const present = dataA || dataB;
    const missingPatch = dataA ? cptState.patchB : cptState.patchA;
    result.innerHTML = `
      <div class="cpt-onesided">
        <img src="${present.image}" alt="">
        <div>
          <div class="cpt-onesided-name">${escapeHtml(present.displayName)}</div>
          <div class="cpt-onesided-msg">This Pokémon doesn't exist in <b>${escapeHtml(missingPatch.label)}</b> — nothing to compare.</div>
        </div>
      </div>`;
    return;
  }

  const level = cptState.attackerLevel;
  let atkStatsA = getModifiedStats(dataA, level, cptState.attackerItems, cptState.attackerItemStacks, cptState.attackerItemActivated);
  let atkStatsB = getModifiedStats(dataB, level, cptState.attackerItems, cptState.attackerItemStacks, cptState.attackerItemActivated);
  atkStatsA = computeUniversalAtkStatBonus(atkStatsA);
  atkStatsB = computeUniversalAtkStatBonus(atkStatsB);

  const defStats = {
    hp: cptState.target.hp,
    def: cptState.target.def,
    sp_def: cptState.target.sp_def,
    currentHp: Math.floor(cptState.target.hp * cptState.target.hpPercent / 100),
  };

  const globalMult = computeUniversalGlobalMult();
  const defenderMult = computeUniversalDefenderMult();

  const ctx = { recordA: dataA, recordB: dataB, atkStatsA, atkStatsB, defStats, globalMult, defenderMult };

  const movesA = getVisibleMoves(dataA, level);
  const movesB = getVisibleMoves(dataB, level);

  const orderedNames = [];
  const seen = new Set();
  movesA.forEach(m => { if (!seen.has(m.name)) { seen.add(m.name); orderedNames.push(m.name); } });
  movesB.forEach(m => { if (!seen.has(m.name)) { seen.add(m.name); orderedNames.push(m.name); } });

  const cardsHtml = orderedNames.map(name => {
    const moveA = movesA.find(m => m.name === name) || null;
    const moveB = movesB.find(m => m.name === name) || null;
    return renderMoveCard(name, moveA, moveB, level, ctx);
  }).filter(Boolean);

  result.innerHTML = `
    <div class="cpt-result-header">
      <img src="${dataA.image}" alt="">
      <div class="cpt-result-headtext">
        <div class="cpt-result-name">${escapeHtml(dataA.displayName)}</div>
        <div class="cpt-result-summary">Lv.${level} — ${escapeHtml(cptState.patchA.label)} <span class="cpt-vs-inline">vs</span> ${escapeHtml(cptState.patchB.label)}</div>
      </div>
      <label class="cpt-toggle">
        <input type="checkbox" id="cptOnlyChanged" ${cptState.onlyChanged ? 'checked' : ''}>
        Show only changed moves
      </label>
    </div>
    <div class="cpt-moves-list">
      ${cardsHtml.length ? cardsHtml.join('') : '<div class="cpt-empty-state">No differences to show for this Pokémon at this level.</div>'}
    </div>
  `;

  const onlyChangedCheckbox = document.getElementById('cptOnlyChanged');
  if (onlyChangedCheckbox) {
    onlyChangedCheckbox.addEventListener('change', (e) => {
      cptState.onlyChanged = e.target.checked;
      renderResult();
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// CONSTRUCTION DE L'ONGLET
// ─────────────────────────────────────────────────────────────────────────

function buildTabAndPanel() {
  const tabs = document.querySelector('.main-tabs');
  const panels = document.querySelectorAll('.main-tab-panel');
  const lastPanel = panels[panels.length - 1];
  if (!tabs || !lastPanel || document.getElementById('tab-comparepatch')) return;

  const btn = document.createElement('button');
  btn.className = 'main-tab-btn';
  btn.dataset.tab = 'comparepatch';
  btn.textContent = '📊 Compare Patch';
  tabs.appendChild(btn);

  const panel = document.createElement('div');
  panel.id = 'tab-comparepatch';
  panel.className = 'main-tab-panel cpt-panel';
  panel.innerHTML = `
    <div class="cpt-header">
      <div class="cpt-title"><span class="cpt-icon">📊</span> Compare Patch</div>
      <p class="cpt-subtitle">See exactly how a Pokémon's move damage changed between two patches</p>
    </div>

    <div class="cpt-patch-selectors-v2">
      <div class="cpt-patch-select-group cpt-patch-a">
        <span class="cpt-patch-slot-label">Patch A</span>
        <select id="cptSelectA" class="cpt-patch-select"></select>
      </div>
      <button type="button" id="cptSwapBtn" class="cpt-swap-btn" title="Swap patches">⇄</button>
      <div class="cpt-patch-select-group cpt-patch-b">
        <span class="cpt-patch-slot-label">Patch B</span>
        <select id="cptSelectB" class="cpt-patch-select"></select>
      </div>
    </div>

    <div class="cpt-note">ℹ️ Item stats/stacks and universal buffs & debuffs (battle items, ally Unite moves) apply to the calculation. Pokémon-specific ability toggles from the main Calculator (e.g. Mold Breaker, Dragon Dance...) aren't reproduced here — only base stats, level, equipped items and universal effects.</div>

    <div class="cpt-main-grid">
      <div class="cpt-attacker-col">
        <div class="cpt-col-title">⚔️ Attacker</div>
        <input type="text" class="pokemon-search cpt-search" id="cptSearch" placeholder="Search a Pokémon...">
        <div class="cpt-grid-filter-row">
          <label class="cpt-toggle cpt-toggle-small">
            <input type="checkbox" id="cptOnlyChangedPokemon">
            Only show changed Pokémon
          </label>
          <span class="cpt-changed-count" id="cptChangedCount"></span>
        </div>
        <div class="pokemon-grid-wrapper cpt-grid-wrapper">
          <div class="pokemon-grid cpt-grid" id="cptGrid"></div>
        </div>
        <div class="cpt-attacker-controls" id="cptAtkControls" style="display:none;">
          <div class="cpt-level-row">
            <span class="cpt-level-label">Level</span>
            <input type="range" id="cptLevelSlider" min="1" max="15" value="15">
            <span class="cpt-level-value" id="cptLevelValue">15</span>
          </div>
          <div class="cpt-item-row" id="cptItemRow"></div>
          <div class="cpt-item-popover" id="cptItemPopover" style="display:none;"></div>
          <div class="cpt-universal-drawers" id="cptAtkUniversalDrawers"></div>
        </div>
      </div>

      <div class="cpt-target-col">
        <div class="cpt-col-title">🛡️ Target Dummy</div>
        <div class="cpt-target-field">
          <label>Max HP</label>
          <input type="number" id="cptTargetHp" min="1" step="100">
        </div>
        <div class="cpt-target-field-row">
          <div class="cpt-target-field">
            <label>DEF</label>
            <input type="number" id="cptTargetDef" min="0" step="10">
          </div>
          <div class="cpt-target-field">
            <label>SP.DEF</label>
            <input type="number" id="cptTargetSpDef" min="0" step="10">
          </div>
        </div>
        <div class="cpt-target-field">
          <label>Current HP <span id="cptTargetHpPercentValue">100%</span></label>
          <input type="range" id="cptTargetHpPercent" class="cpt-hp-slider" min="1" max="100" value="100">
        </div>
        <div class="cpt-universal-drawers" id="cptTargetUniversalDrawers"></div>
      </div>
    </div>

    <div class="cpt-result" id="cptResult"></div>
  `;
  lastPanel.insertAdjacentElement('afterend', panel);

  btn.addEventListener('click', () => {
    document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.main-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    panel.classList.add('active');
  });

  document.getElementById('cptSearch').addEventListener('input', (e) => {
    cptState.searchTerm = e.target.value.toLowerCase().trim();
    renderGrid();
  });

  document.getElementById('cptOnlyChangedPokemon').addEventListener('change', (e) => {
    cptState.onlyChangedPokemon = e.target.checked;
    renderGrid();
  });

  document.getElementById('cptLevelSlider').addEventListener('input', (e) => {
    cptState.attackerLevel = parseInt(e.target.value, 10);
    document.getElementById('cptLevelValue').textContent = cptState.attackerLevel;
    e.target.style.setProperty('--value', cptState.attackerLevel);
    renderResult();
  });

  document.addEventListener('click', (e) => {
    if (cptState.itemPopoverSlot !== null && !e.target.closest('.cpt-item-row') && !e.target.closest('#cptItemPopover')) {
      closeItemPopover();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────

export function initComparePatchTab() {
  buildTabAndPanel();
  setupPatchSelectors();
  setupTargetControls();
  renderUniversalDrawers();
  renderGrid();
  renderAttackerControls();
  renderResult();
}