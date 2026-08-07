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
};

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

function computeHitDamage(dmgEntry, record, atkStats, defStats, level) {
  if (!isDamageLikeEntry(dmgEntry)) return null;
  const dmg = normalizeDmg(dmgEntry);
  const scaling = dmg.scaling || record.style;
  const atkStat = scaling === 'special' ? atkStats.sp_atk : atkStats.atk;
  const defStat = scaling === 'special' ? defStats.sp_def : defStats.def;

  const normal = Math.floor(calculateDamage(dmg, atkStat, defStat, level, false, record.pokemonId, 1.0, 1.0, defStats.hp, defStats.currentHp));
  const crit   = Math.floor(calculateDamage(dmg, atkStat, defStat, level, true,  record.pokemonId, 1.0, 1.0, defStats.hp, defStats.currentHp));
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

// ─────────────────────────────────────────────────────────────────────────
// RENDU : carte de comparaison des stats de base (HP/Atk/Def/SpAtk/SpDef)
// ─────────────────────────────────────────────────────────────────────────

const STAT_FIELDS = [
  ['hp',     'HP'],
  ['atk',    'Atk'],
  ['def',    'Def'],
  ['sp_atk', 'Sp. Atk'],
  ['sp_def', 'Sp. Def'],
];

function getStatsRowAtLevel(record, level) {
  if (!record?.stats?.length) return null;
  return record.stats.find(s => s.level === level) || null;
}

function renderStatRow(label, valA, valB) {
  const changed = valA !== valB;
  if (!changed && cptState.onlyChanged) return '';

  let deltaHtml = '<span class="cpt-hit-delta cpt-neutral">No change</span>';
  let cls = 'cpt-neutral';
  let pct = 0;

  if (valA != null && valB != null && valA !== valB) {
    const delta = valB - valA;
    pct = valA ? (delta / valA * 100) : 0;
    cls = delta > 0 ? 'cpt-buff' : 'cpt-nerf';
    const sign = delta > 0 ? '+' : '';
    deltaHtml = `<span class="cpt-hit-delta ${cls}">${sign}${delta.toLocaleString()} (${sign}${pct.toFixed(1)}%)</span>`;
  } else if (valA == null || valB == null) {
    cls = valA == null ? 'cpt-buff' : 'cpt-nerf';
    pct = valA == null ? 100 : -100;
    deltaHtml = `<span class="cpt-hit-delta ${cls}">${valA == null ? 'Added' : 'Removed'}</span>`;
  }

  const barWidth = Math.max(4, Math.min(100, Math.abs(pct)));
  const barHtml = cls !== 'cpt-neutral'
    ? `<div class="cpt-hit-bar-track"><div class="cpt-hit-bar-fill ${cls}" style="width:${barWidth}%"></div></div>`
    : '';

  return `
    <div class="cpt-hit-row ${changed ? 'cpt-hit-changed' : ''}">
      <div class="cpt-hit-label">${label}</div>
      <div class="cpt-hit-compare">
        <span class="cpt-hit-val cpt-hit-before">${valA != null ? valA.toLocaleString() : '—'}</span>
        <span class="cpt-hit-arrow">→</span>
        <span class="cpt-hit-val cpt-hit-after ${valB != null ? cls : ''}">${valB != null ? valB.toLocaleString() : '—'}</span>
        ${barHtml}
        ${deltaHtml}
      </div>
    </div>`;
}

// Carte "Base Stats" : compare les stats brutes du JSON pour le niveau
// sélectionné entre Patch A et Patch B. Retourne '' si rien à montrer.
function renderStatsCard(dataA, dataB, level) {
  const rowA = getStatsRowAtLevel(dataA, level);
  const rowB = getStatsRowAtLevel(dataB, level);
  if (!rowA && !rowB) return '';

  const rowsHtml = STAT_FIELDS
    .map(([key, label]) => renderStatRow(label, rowA ? rowA[key] : null, rowB ? rowB[key] : null))
    .filter(Boolean);
  if (!rowsHtml.length) return '';

  return `
    <div class="cpt-move-card cpt-stats-card">
      <div class="cpt-move-name">📈 Base Stats (Lv.${level})</div>
      ${rowsHtml.join('')}
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────
// RENDU : comparaison des heals / shields (pas de défense, pas de crit)
// ─────────────────────────────────────────────────────────────────────────

// Même formule que les dégâts stat-based (constant + %stat + levelCoef par
// niveau au-dessus de 1), mais SANS réduction de défense ni crit — un heal
// ou un shield n'est jamais réduit par la DEF de la cible.
function computeHealShieldValue(entry, casterStats, level) {
  if (!entry) return null;
  const scaling = entry.scaling || 'sp_atk';
  const statValue = casterStats?.[scaling] ?? 0;
  const statScaling = Math.floor(statValue * ((entry.multiplier || 0) / 100));
  const levelScaling = (level - 1) * (entry.levelCoef || 0);
  const perInstance = Math.max(0, Math.floor((entry.constant || 0) + statScaling + levelScaling));
  const tickCount = entry.is_tick ? Math.max(1, entry.tick_count || 1) : 1;
  const total = perInstance * tickCount;
  return { perInstance, total, tickCount, isTick: !!entry.is_tick };
}

function formatHealShield(res) {
  if (!res) return '<span class="cpt-missing">—</span>';
  if (res.isTick && res.tickCount > 1) {
    return `${res.total.toLocaleString()} <span class="cpt-crit">(${res.perInstance.toLocaleString()}/tick × ${res.tickCount})</span>`;
  }
  return res.total.toLocaleString();
}

function renderHealShieldRow(label, resA, resB) {
  if (!resA && !resB) return '';

  const changed = !resA || !resB || resA.total !== resB.total;
  if (!changed && cptState.onlyChanged) return '';

  let deltaHtml = '<span class="cpt-hit-delta cpt-neutral">No change</span>';
  let cls = 'cpt-neutral';
  let pct = 0;
  if (resA && resB && resA.total !== resB.total) {
    const delta = resB.total - resA.total;
    pct = resA.total ? (delta / resA.total * 100) : 0;
    cls = delta > 0 ? 'cpt-buff' : 'cpt-nerf';
    const sign = delta > 0 ? '+' : '';
    deltaHtml = `<span class="cpt-hit-delta ${cls}">${sign}${Math.round(delta).toLocaleString()} (${sign}${pct.toFixed(1)}%)</span>`;
  } else if (!resA || !resB) {
    cls = resA ? 'cpt-nerf' : 'cpt-buff';
    pct = resA ? -100 : 100;
    deltaHtml = `<span class="cpt-hit-delta ${cls}">${resA ? 'Removed' : 'Added'}</span>`;
  }

  const barWidth = Math.max(4, Math.min(100, Math.abs(pct)));
  const barHtml = cls !== 'cpt-neutral'
    ? `<div class="cpt-hit-bar-track"><div class="cpt-hit-bar-fill ${cls}" style="width:${barWidth}%"></div></div>`
    : '';

  return `
    <div class="cpt-hit-row ${changed ? 'cpt-hit-changed' : ''}">
      <div class="cpt-hit-label">${escapeHtml(label)}</div>
      <div class="cpt-hit-compare">
        <span class="cpt-hit-val cpt-hit-before">${formatHealShield(resA)}</span>
        <span class="cpt-hit-arrow">→</span>
        <span class="cpt-hit-val cpt-hit-after ${resB ? cls : ''}">${formatHealShield(resB)}</span>
        ${barHtml}
        ${deltaHtml}
      </div>
    </div>`;
}

// Heals/shields sont appariés par `name` (contrairement aux dégâts, qui le
// sont par position/index) car leur ordre dans le JSON n'est pas garanti
// stable entre deux patchs.
function buildOrderedEntryNames(listA, listB) {
  const names = [];
  const seen = new Set();
  (listA || []).forEach(e => { if (!seen.has(e.name)) { seen.add(e.name); names.push(e.name); } });
  (listB || []).forEach(e => { if (!seen.has(e.name)) { seen.add(e.name); names.push(e.name); } });
  return names;
}

function renderMoveCard(name, moveA, moveB, level, ctx) {
  const damagesA = moveA ? filterDamagesByUpgrade(moveA.damages, isMoveUpgraded(moveA, level)) : [];
  const damagesB = moveB ? filterDamagesByUpgrade(moveB.damages, isMoveUpgraded(moveB, level)) : [];
  const healsA = moveA ? filterDamagesByUpgrade(moveA.heals, isMoveUpgraded(moveA, level)) : [];
  const healsB = moveB ? filterDamagesByUpgrade(moveB.heals, isMoveUpgraded(moveB, level)) : [];
  const shieldsA = moveA ? filterDamagesByUpgrade(moveA.shields, isMoveUpgraded(moveA, level)) : [];
  const shieldsB = moveB ? filterDamagesByUpgrade(moveB.shields, isMoveUpgraded(moveB, level)) : [];

  // ── Dégâts (appariés par position, comme avant) ──────────────────────────
  const hitCount = Math.max(damagesA.length, damagesB.length);
  const damageRows = [];
  for (let i = 0; i < hitCount; i++) {
    const dA = damagesA[i];
    const dB = damagesB[i];
    const label = dA?.name || dB?.name || `Hit ${i + 1}`;
    const hitA = dA ? computeHitDamage(dA, ctx.recordA, ctx.atkStatsA, ctx.defStats, level) : null;
    const hitB = dB ? computeHitDamage(dB, ctx.recordB, ctx.atkStatsB, ctx.defStats, level) : null;
    damageRows.push(renderHitRow(label, hitA, hitB));
  }

  // ── Heals (appariés par nom) ──────────────────────────────────────────────
  const healNames = buildOrderedEntryNames(healsA, healsB);
  const healRows = healNames.map(n => {
    const eA = healsA.find(e => e.name === n) || null;
    const eB = healsB.find(e => e.name === n) || null;
    const resA = eA ? computeHealShieldValue(eA, ctx.atkStatsA, level) : null;
    const resB = eB ? computeHealShieldValue(eB, ctx.atkStatsB, level) : null;
    return renderHealShieldRow(n, resA, resB);
  });

  // ── Shields (appariés par nom) ────────────────────────────────────────────
  const shieldNames = buildOrderedEntryNames(shieldsA, shieldsB);
  const shieldRows = shieldNames.map(n => {
    const eA = shieldsA.find(e => e.name === n) || null;
    const eB = shieldsB.find(e => e.name === n) || null;
    const resA = eA ? computeHealShieldValue(eA, ctx.atkStatsA, level) : null;
    const resB = eB ? computeHealShieldValue(eB, ctx.atkStatsB, level) : null;
    return renderHealShieldRow(n, resA, resB);
  });

  const visibleDamageRows = damageRows.filter(Boolean);
  const visibleHealRows = healRows.filter(Boolean);
  const visibleShieldRows = shieldRows.filter(Boolean);

  if (!visibleDamageRows.length && !visibleHealRows.length && !visibleShieldRows.length) return '';

  let statusBadge = '';
  if (!moveA) statusBadge = '<span class="cpt-move-badge cpt-move-badge-new">New in Patch B</span>';
  else if (!moveB) statusBadge = '<span class="cpt-move-badge cpt-move-badge-removed">Removed in Patch B</span>';

  // Résumé global du move : moyenne des variations sur tous les hits/heals/
  // shields comparables (présents dans A ET B).
  let summaryHtml = '';
  if (moveA && moveB) {
    const deltas = [];
    for (let i = 0; i < hitCount; i++) {
      const dA = damagesA[i], dB = damagesB[i];
      if (!dA || !dB) continue;
      const hitA = computeHitDamage(dA, ctx.recordA, ctx.atkStatsA, ctx.defStats, level);
      const hitB = computeHitDamage(dB, ctx.recordB, ctx.atkStatsB, ctx.defStats, level);
      if (hitA && hitB && hitA.normal) deltas.push((hitB.normal - hitA.normal) / hitA.normal * 100);
    }
    healNames.forEach(n => {
      const eA = healsA.find(e => e.name === n), eB = healsB.find(e => e.name === n);
      if (!eA || !eB) return;
      const resA = computeHealShieldValue(eA, ctx.atkStatsA, level);
      const resB = computeHealShieldValue(eB, ctx.atkStatsB, level);
      if (resA?.total) deltas.push((resB.total - resA.total) / resA.total * 100);
    });
    shieldNames.forEach(n => {
      const eA = shieldsA.find(e => e.name === n), eB = shieldsB.find(e => e.name === n);
      if (!eA || !eB) return;
      const resA = computeHealShieldValue(eA, ctx.atkStatsA, level);
      const resB = computeHealShieldValue(eB, ctx.atkStatsB, level);
      if (resA?.total) deltas.push((resB.total - resA.total) / resA.total * 100);
    });
    if (deltas.length) {
      const avgPct = deltas.reduce((s, v) => s + v, 0) / deltas.length;
      const summaryCls = Math.abs(avgPct) < 0.05 ? 'cpt-neutral' : (avgPct > 0 ? 'cpt-buff' : 'cpt-nerf');
      const sign = avgPct > 0 ? '+' : '';
      summaryHtml = `<span class="cpt-move-summary ${summaryCls}">${summaryCls === 'cpt-neutral' ? 'No change' : `${sign}${avgPct.toFixed(1)}% overall`}</span>`;
    }
  }

  // N'affiche les sous-titres de section (⚔️/❤️/🛡️) que si le move mélange
  // plusieurs types de valeurs — un move 100% dégâts garde son look d'origine.
  const groupCount = [visibleDamageRows.length, visibleHealRows.length, visibleShieldRows.length].filter(n => n > 0).length;
  const section = (icon, label, rows) => {
    if (!rows.length) return '';
    const header = groupCount > 1 ? `<div class="cpt-entry-section-title">${icon} ${label}</div>` : '';
    return `<div class="cpt-entry-section">${header}${rows.join('')}</div>`;
  };

  const sectionsHtml = [
    section('⚔️', 'Damage', visibleDamageRows),
    section('❤️', 'Healing', visibleHealRows),
    section('🛡️', 'Shield', visibleShieldRows),
  ].join('');

  return `
    <div class="cpt-move-card">
      <div class="cpt-move-name">${escapeHtml(name)} ${statusBadge}${summaryHtml}</div>
      ${sectionsHtml}
    </div>`;
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
  const atkStatsA = getModifiedStats(dataA, level, cptState.attackerItems, cptState.attackerItemStacks, cptState.attackerItemActivated);
  const atkStatsB = getModifiedStats(dataB, level, cptState.attackerItems, cptState.attackerItemStacks, cptState.attackerItemActivated);

  const defStats = {
    hp: cptState.target.hp,
    def: cptState.target.def,
    sp_def: cptState.target.sp_def,
    currentHp: Math.floor(cptState.target.hp * cptState.target.hpPercent / 100),
  };

  const ctx = { recordA: dataA, recordB: dataB, atkStatsA, atkStatsB, defStats };

  const movesA = getVisibleMoves(dataA, level);
  const movesB = getVisibleMoves(dataB, level);

  const orderedNames = [];
  const seen = new Set();
  movesA.forEach(m => { if (!seen.has(m.name)) { seen.add(m.name); orderedNames.push(m.name); } });
  movesB.forEach(m => { if (!seen.has(m.name)) { seen.add(m.name); orderedNames.push(m.name); } });

  const statsCardHtml = renderStatsCard(dataA, dataB, level);

  const cardsHtml = orderedNames.map(name => {
    const moveA = movesA.find(m => m.name === name) || null;
    const moveB = movesB.find(m => m.name === name) || null;
    return renderMoveCard(name, moveA, moveB, level, ctx);
  }).filter(Boolean);

  const hasAnyCard = !!statsCardHtml || cardsHtml.length > 0;

  result.innerHTML = `
    <div class="cpt-result-header">
      <img src="${dataA.image}" alt="">
      <div class="cpt-result-headtext">
        <div class="cpt-result-name">${escapeHtml(dataA.displayName)}</div>
        <div class="cpt-result-summary">Lv.${level} — ${escapeHtml(cptState.patchA.label)} <span class="cpt-vs-inline">vs</span> ${escapeHtml(cptState.patchB.label)}</div>
      </div>
      <label class="cpt-toggle">
        <input type="checkbox" id="cptOnlyChanged" ${cptState.onlyChanged ? 'checked' : ''}>
        Show only changes
      </label>
    </div>
    <div class="cpt-moves-list">
      ${hasAnyCard ? `${statsCardHtml}${cardsHtml.join('')}` : '<div class="cpt-empty-state">No differences to show for this Pokémon at this level.</div>'}
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

    <div class="cpt-note">ℹ️ Item stats/stacks apply to the calculation. Pokémon-specific ability toggles and universal buffs/debuffs from the main Calculator (e.g. Mold Breaker, Dragon Dance, X Attack, ally Unite moves...) aren't reproduced here — only base stats, level and equipped items.</div>

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
  renderGrid();
  renderAttackerControls();
  renderResult();
}