/**
 * buildOptimizer.js
 * Build Optimizer tool — integrates into the existing app.
 * Imports from state.js and itemManager.js to access loaded data.
 */

import { state } from './state.js';
import { stackableItems, specialHeldItems } from './constants.js';

// ── État local de l'optimizer ─────────────────────────────────────────────────
const optState = {
  mode: 'damage',           // 'damage' | 'defense' | 'heal_self' | 'heal_ally'
  level: 15,
  attacker: null,
  fixedItems: [null, null, null],
  excludedItemNames: new Set(),
  enemies: [],              // [{ pokemon, level, items, stacks, activated, priority }]
  worker: null,
  running: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
export function initBuildOptimizer() {
  buildOptimizerUI();
  bindOptimizerEvents();
}

// ─────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION UI
// ─────────────────────────────────────────────────────────────────────────────
function buildOptimizerUI() {
  const container = document.getElementById('buildOptimizerContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="bopt-root">

      <!-- HEADER -->
      <div class="bopt-header">
        <div class="bopt-title">
          <span class="bopt-icon">⚡</span>
          Build Optimizer
        </div>
        <p class="bopt-subtitle">Automatically find the best 3-item build for your Pokémon</p>
      </div>

      <!-- PANNEAU CONFIG -->
      <div class="bopt-config">

        <!-- Colonne gauche : Pokémon + mode + niveau -->
        <div class="bopt-col bopt-col-left">

          <!-- Pokémon selection -->
          <div class="bopt-section">
            <div class="bopt-section-label">Pokémon to optimize</div>
            <div class="bopt-pokemon-select">
              <div class="bopt-pokemon-preview" id="boptAtkPreview">
                <div class="bopt-pokemon-placeholder">Choose a Pokémon</div>
              </div>
              <input type="text" id="boptAtkSearch" class="bopt-search" placeholder="Search...">
              <div class="bopt-pokemon-grid" id="boptAtkGrid"></div>
            </div>
          </div>

          <!-- Mode -->
          <div class="bopt-section">
            <div class="bopt-section-label">Optimization mode</div>
            <div class="bopt-mode-tabs">
              <button class="bopt-mode-btn active" data-mode="damage">⚔️ Damage</button>
              <button class="bopt-mode-btn" data-mode="defense">🛡️ Defense</button>
              <button class="bopt-mode-btn" data-mode="heal_self">💚 Heal (Self)</button>
              <button class="bopt-mode-btn" data-mode="heal_ally">🤝 Heal (Ally)</button>
            </div>
            <div class="bopt-mode-desc" id="boptModeDesc">
              Score = total damage on normal enemies × 1 + priority targets × 2
            </div>
          </div>

          <!-- Level -->
          <div class="bopt-section">
            <div class="bopt-section-label">Level <span id="boptLevelVal">15</span></div>
            <input type="range" id="boptLevelSlider" min="1" max="15" value="15" class="bopt-slider">
          </div>

          <!-- Fixed items -->
          <div class="bopt-section">
            <div class="bopt-section-label">Fixed items <span class="bopt-hint">(optional — the rest will be tested)</span></div>
            <div class="bopt-fixed-slots" id="boptFixedSlots">
              ${[0,1,2].map(i => `
                <div class="bopt-fixed-card" data-slot="${i}">
                  <img src="assets/items/none.png" class="bopt-fixed-icon" id="boptFixedIcon${i}">
                  <span class="bopt-fixed-name" id="boptFixedName${i}">Empty</span>
                  <button class="bopt-fixed-clear" data-slot="${i}" title="Remove">✕</button>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- Colonne droite : ennemis / exclusions -->
        <div class="bopt-col bopt-col-right">

          <!-- Section enemies (hidden in heal mode) -->
          <div class="bopt-section" id="boptEnemiesSection">
            <div class="bopt-section-label">
              <span id="boptEnemiesLabel">Enemies</span>
              <button class="bopt-add-enemy" id="boptAddEnemy" title="Add an enemy">+ Add</button>
            </div>
            <div class="bopt-enemies-list" id="boptEnemiesList">
              <div class="bopt-empty-enemies">No enemies — damage will be calculated on a dummy target</div>
            </div>
          </div>

          <!-- Excluded items -->
          <div class="bopt-section">
            <div class="bopt-section-label">
              Excluded items
              <button class="bopt-link-btn" id="boptClearExcluded">Re-enable all</button>
            </div>
            <div class="bopt-excluded-grid" id="boptExcludedGrid"></div>
          </div>

        </div>
      </div>

      <!-- RUN BUTTON -->
      <div class="bopt-run-row">
        <button class="bopt-run-btn" id="boptRunBtn" disabled>
          <span class="bopt-run-icon">⚡</span>
          Run Optimizer
        </button>
        <div class="bopt-combo-count" id="boptComboCount"></div>
      </div>

      <!-- PROGRESS -->
      <div class="bopt-progress-wrap" id="boptProgressWrap" style="display:none">
        <div class="bopt-progress-bar">
          <div class="bopt-progress-fill" id="boptProgressFill"></div>
        </div>
        <div class="bopt-progress-text" id="boptProgressText">Initializing...</div>
      </div>

      <!-- RÉSULTATS -->
      <div class="bopt-results" id="boptResults"></div>

    </div>

    <!-- MODAL fixed item selection -->
    <div class="bopt-modal" id="boptFixedItemModal" style="display:none">
      <div class="bopt-modal-inner">
        <div class="bopt-modal-header">
          <span>Choose a fixed item</span>
          <button class="bopt-modal-close" id="boptFixedItemClose">✕</button>
        </div>
        <input type="text" class="bopt-search" id="boptFixedItemSearch" placeholder="Search an item...">
        <div class="bopt-modal-grid" id="boptFixedItemGrid"></div>
      </div>
    </div>

    <!-- MODAL enemy selection -->
    <div class="bopt-modal" id="boptEnemyModal" style="display:none">
      <div class="bopt-modal-inner">
        <div class="bopt-modal-header">
          <span>Choose an enemy</span>
          <button class="bopt-modal-close" id="boptEnemyModalClose">✕</button>
        </div>
        <input type="text" class="bopt-search" id="boptEnemySearch" placeholder="Search a Pokémon...">
        <div class="bopt-modal-grid" id="boptEnemyGrid"></div>
      </div>
    </div>

    <!-- MODAL enemy item selection -->
    <div class="bopt-modal" id="boptEnemyItemModal" style="display:none">
      <div class="bopt-modal-inner">
        <div class="bopt-modal-header">
          <span>Choose an item for this enemy</span>
          <button class="bopt-modal-close" id="boptEnemyItemClose">✕</button>
        </div>
        <input type="text" class="bopt-search" id="boptEnemyItemSearch" placeholder="Search an item...">
        <div class="bopt-modal-grid" id="boptEnemyItemGrid"></div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────────────────
function bindOptimizerEvents() {
  // Populate attacker grid
  populateBoptAtkGrid();
  populateBoptExcludedGrid();
  populateBoptFixedItemGrid();
  populateBoptEnemyGrid();
  populateBoptEnemyItemGrid();

  // Recherche attaquant
  document.getElementById('boptAtkSearch')?.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#boptAtkGrid .bopt-poke-item').forEach(el => {
      el.style.display = el.dataset.name.includes(term) ? '' : 'none';
    });
  });

  // Mode tabs
  document.querySelectorAll('.bopt-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bopt-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      optState.mode = btn.dataset.mode;
      updateModeDesc();
      updateEnemiesSectionVisibility();
      updateComboCount();
    });
  });

  // Niveau slider
  document.getElementById('boptLevelSlider')?.addEventListener('input', e => {
    optState.level = parseInt(e.target.value);
    document.getElementById('boptLevelVal').textContent = optState.level;
    updateComboCount();
    refreshEnemyMoveLists();
  });

  // Fixed slots — click to open modal
  document.querySelectorAll('.bopt-fixed-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('bopt-fixed-clear')) return;
      openFixedItemModal(parseInt(card.dataset.slot));
    });
  });

  // Fixed clear buttons
  document.querySelectorAll('.bopt-fixed-clear').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      clearFixedItem(parseInt(btn.dataset.slot));
    });
  });

  // Fermer modals
  document.getElementById('boptFixedItemClose')?.addEventListener('click', () => {
    document.getElementById('boptFixedItemModal').style.display = 'none';
  });
  document.getElementById('boptEnemyModalClose')?.addEventListener('click', () => {
    document.getElementById('boptEnemyModal').style.display = 'none';
  });
  document.getElementById('boptEnemyItemClose')?.addEventListener('click', () => {
    document.getElementById('boptEnemyItemModal').style.display = 'none';
  });

  // Recherche dans modals
  document.getElementById('boptFixedItemSearch')?.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#boptFixedItemGrid .bopt-grid-item').forEach(el => {
      el.style.display = el.dataset.name.toLowerCase().includes(term) ? '' : 'none';
    });
  });
  document.getElementById('boptEnemySearch')?.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#boptEnemyGrid .bopt-poke-item').forEach(el => {
      el.style.display = el.dataset.name.includes(term) ? '' : 'none';
    });
  });
  document.getElementById('boptEnemyItemSearch')?.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#boptEnemyItemGrid .bopt-grid-item').forEach(el => {
      el.style.display = el.dataset.name.toLowerCase().includes(term) ? '' : 'none';
    });
  });

  // Ajouter ennemi
  document.getElementById('boptAddEnemy')?.addEventListener('click', () => {
    if (optState.enemies.length >= 5) return;
    document.getElementById('boptEnemyModal').style.display = 'flex';
  });

  // Clear exclusions
  document.getElementById('boptClearExcluded')?.addEventListener('click', () => {
    optState.excludedItemNames.clear();
    document.querySelectorAll('#boptExcludedGrid .bopt-excl-item').forEach(el => {
      el.classList.remove('excluded');
    });
    updateComboCount();
  });

  // Run
  document.getElementById('boptRunBtn')?.addEventListener('click', runOptimizer);
}

// ─────────────────────────────────────────────────────────────────────────────
// GRILLES POKÉMON
// ─────────────────────────────────────────────────────────────────────────────
function populateBoptAtkGrid() {
  const grid = document.getElementById('boptAtkGrid');
  if (!grid) return;
  grid.innerHTML = '';
  state.allPokemon
    .filter(p => p.category === 'playable')
    .forEach(poke => {
      const div = document.createElement('div');
      div.className = 'bopt-poke-item';
      div.dataset.name = poke.displayName.toLowerCase();
      div.dataset.id   = poke.pokemonId;
      div.innerHTML = `
        <img src="${poke.image}" alt="${poke.displayName}" onerror="this.src='assets/pokemon/missing.png'">
        <span>${poke.displayName}</span>
      `;
      div.addEventListener('click', () => selectBoptAttacker(poke));
      grid.appendChild(div);
    });
}

function populateBoptEnemyGrid() {
  const grid = document.getElementById('boptEnemyGrid');
  if (!grid) return;
  grid.innerHTML = '';
  state.allPokemon
    .filter(p => p.category === 'playable' || p.category === 'mob' || p.category === 'other')
    .forEach(poke => {
      const div = document.createElement('div');
      div.className = 'bopt-poke-item';
      div.dataset.name = poke.displayName.toLowerCase();
      div.innerHTML = `
        <img src="${poke.image}" alt="${poke.displayName}" onerror="this.src='assets/pokemon/missing.png'">
        <span>${poke.displayName}</span>
      `;
      div.addEventListener('click', () => {
        addEnemy(poke);
        document.getElementById('boptEnemyModal').style.display = 'none';
        document.getElementById('boptEnemySearch').value = '';
        document.querySelectorAll('#boptEnemyGrid .bopt-poke-item').forEach(el => el.style.display = '');
      });
      grid.appendChild(div);
    });
}

function populateBoptExcludedGrid() {
  const grid = document.getElementById('boptExcludedGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const excluded = Object.values(specialHeldItems || {});
  state.allItems
    .filter(item => !excluded.includes(item.name))
    .forEach(item => {
      const div = document.createElement('div');
      div.className = 'bopt-excl-item';
      div.title = item.display_name || item.name;
      div.innerHTML = `<img src="${item.image}" alt="${item.name}" onerror="this.src='assets/items/missing.png'">`;
      div.addEventListener('click', () => {
        if (optState.excludedItemNames.has(item.name)) {
          optState.excludedItemNames.delete(item.name);
          div.classList.remove('excluded');
        } else {
          optState.excludedItemNames.add(item.name);
          div.classList.add('excluded');
        }
        updateComboCount();
      });
      grid.appendChild(div);
    });
}

function populateBoptFixedItemGrid() {
  const grid = document.getElementById('boptFixedItemGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const excluded = Object.values(specialHeldItems || {});
  state.allItems
    .filter(item => !excluded.includes(item.name))
    .forEach(item => {
      const div = document.createElement('div');
      div.className = 'bopt-grid-item';
      div.dataset.name = (item.display_name || item.name).toLowerCase();
      div.innerHTML = `
        <img src="${item.image}" alt="${item.name}" onerror="this.src='assets/items/missing.png'">
        <span>${item.display_name || item.name}</span>
      `;
      div.addEventListener('click', () => {
        const slot = optState._fixedModalSlot ?? 0;
        setFixedItem(slot, item);
        document.getElementById('boptFixedItemModal').style.display = 'none';
        document.getElementById('boptFixedItemSearch').value = '';
        document.querySelectorAll('#boptFixedItemGrid .bopt-grid-item').forEach(el => el.style.display = '');
      });
      grid.appendChild(div);
    });
}

// ── Items équipés sur les ennemis ──────────────────────────────────────────
// Liste des items pouvant porter des stacks (max repris de buildOptimizerWorker.js
// pour rester cohérent avec le moteur de calcul).
const ENEMY_STACKABLE_MAX = {
  'Attack Weight':    6,
  'Sp. Atk Specs':    6,
  'Aeos Cookie':       6,
  'Drive Lens':        20,
  'Accel Bracer':      20,
  'Weakness Policy':   4,
};

function populateBoptEnemyItemGrid() {
  const grid = document.getElementById('boptEnemyItemGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const excluded = Object.values(specialHeldItems || {});
  state.allItems
    .filter(item => !excluded.includes(item.name))
    .forEach(item => {
      const div = document.createElement('div');
      div.className = 'bopt-grid-item';
      div.dataset.name = (item.display_name || item.name).toLowerCase();
      div.innerHTML = `
        <img src="${item.image}" alt="${item.name}" onerror="this.src='assets/items/missing.png'">
        <span>${item.display_name || item.name}</span>
      `;
      div.addEventListener('click', () => {
        const { idx, slot } = optState._enemyItemModalTarget || {};
        if (idx == null) return;
        setEnemyItem(idx, slot, item);
        document.getElementById('boptEnemyItemModal').style.display = 'none';
        document.getElementById('boptEnemyItemSearch').value = '';
        document.querySelectorAll('#boptEnemyItemGrid .bopt-grid-item').forEach(el => el.style.display = '');
      });
      grid.appendChild(div);
    });
}

function openEnemyItemModal(idx, slot) {
  optState._enemyItemModalTarget = { idx, slot };
  document.getElementById('boptEnemyItemModal').style.display = 'flex';
}

function setEnemyItem(idx, slot, item) {
  const enemy = optState.enemies[idx];
  if (!enemy) return;
  enemy.items[slot] = item;
  enemy.stacks[slot] = ENEMY_STACKABLE_MAX[item.name] ? Math.floor(ENEMY_STACKABLE_MAX[item.name] / 2) : 0;
  enemy.activated[slot] = item.activable ? true : false;
  renderEnemiesList();
  updateComboCount();
}

function clearEnemyItem(idx, slot) {
  const enemy = optState.enemies[idx];
  if (!enemy) return;
  enemy.items[slot] = null;
  enemy.stacks[slot] = 0;
  enemy.activated[slot] = false;
  renderEnemiesList();
  updateComboCount();
}

function changeEnemyStack(idx, slot, delta) {
  const enemy = optState.enemies[idx];
  const item = enemy?.items[slot];
  if (!item) return;
  const max = ENEMY_STACKABLE_MAX[item.name] || 0;
  if (max === 0) return;
  enemy.stacks[slot] = Math.max(0, Math.min(max, (enemy.stacks[slot] || 0) + delta));
  renderEnemiesList();
}

function toggleEnemyActivation(idx, slot) {
  const enemy = optState.enemies[idx];
  const item = enemy?.items[slot];
  if (!item || !item.activable) return;
  enemy.activated[slot] = !enemy.activated[slot];
  renderEnemiesList();
}

// ─────────────────────────────────────────────────────────────────────────────
// SÉLECTION ATTAQUANT
// ─────────────────────────────────────────────────────────────────────────────
function selectBoptAttacker(poke) {
  optState.attacker = poke;

  // Highlight
  document.querySelectorAll('#boptAtkGrid .bopt-poke-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === poke.pokemonId);
  });

  // Preview
  const preview = document.getElementById('boptAtkPreview');
  preview.innerHTML = `
    <img src="${poke.image}" alt="${poke.displayName}" onerror="this.src='assets/pokemon/missing.png'">
    <span>${poke.displayName}</span>
    ${poke.passive ? `<small>${poke.passive.name}</small>` : ''}
  `;

  document.getElementById('boptRunBtn').disabled = false;
  updateComboCount();
  refreshEnemyMoveLists();
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEMS FIXÉS
// ─────────────────────────────────────────────────────────────────────────────
let _fixedModalSlot = 0;
function openFixedItemModal(slot) {
  _fixedModalSlot = slot;
  optState._fixedModalSlot = slot;
  document.getElementById('boptFixedItemModal').style.display = 'flex';
}

function setFixedItem(slot, item) {
  optState.fixedItems[slot] = item;
  document.getElementById(`boptFixedIcon${slot}`).src = item.image || 'assets/items/none.png';
  document.getElementById(`boptFixedName${slot}`).textContent = item.display_name || item.name;
  updateComboCount();
}

function clearFixedItem(slot) {
  optState.fixedItems[slot] = null;
  document.getElementById(`boptFixedIcon${slot}`).src = 'assets/items/none.png';
  document.getElementById(`boptFixedName${slot}`).textContent = 'Empty';
  updateComboCount();
}

// ─────────────────────────────────────────────────────────────────────────────
// ENNEMIS
// ─────────────────────────────────────────────────────────────────────────────
function addEnemy(poke) {
  if (optState.enemies.length >= 5) return;

  const enemy = {
    pokemon:   poke,
    level:     optState.level,
    items:     [null, null, null],
    stacks:    [0, 0, 0],
    activated: [false, false, false],
    priority:  false,
  };
  optState.enemies.push(enemy);
  renderEnemiesList();
  updateComboCount();
}

function removeEnemy(idx) {
  optState.enemies.splice(idx, 1);
  renderEnemiesList();
  updateComboCount();
}

function renderEnemiesList() {
  const list = document.getElementById('boptEnemiesList');
  if (!list) return;

  if (optState.enemies.length === 0) {
    list.innerHTML = '<div class="bopt-empty-enemies">No enemies — using dummy target</div>';
    return;
  }

  list.innerHTML = '';
  optState.enemies.forEach((enemy, idx) => {
    const card = document.createElement('div');
    card.className = 'bopt-enemy-card';
    card.dataset.idx = idx;

    // Moves disponibles à ce niveau
    const availableMoves = (enemy.pokemon.moves || []).filter(m => {
      if (m.learnLevel != null && m.learnLevel > enemy.level) return false;
      if (m.unlearn != null && enemy.level >= m.unlearn) return false;
      return true;
    });

    card.innerHTML = `
      <div class="bopt-enemy-top">
        <img src="${enemy.pokemon.image}" alt="${enemy.pokemon.displayName}" onerror="this.src='assets/pokemon/missing.png'" class="bopt-enemy-img">
        <div class="bopt-enemy-info">
          <strong>${enemy.pokemon.displayName}</strong>
          <div class="bopt-enemy-controls">
            <label class="bopt-priority-label ${enemy.priority ? 'is-priority' : ''}">
              <input type="checkbox" class="bopt-priority-cb" data-idx="${idx}" ${enemy.priority ? 'checked' : ''}>
              ⚠ Priority
            </label>
            <span class="bopt-enemy-lvl">Lv.<span class="bopt-enemy-lvl-val">${enemy.level}</span></span>
            <input type="range" class="bopt-enemy-lvl-slider" min="1" max="15" value="${enemy.level}" data-idx="${idx}">
          </div>
        </div>
        <button class="bopt-enemy-remove" data-idx="${idx}" title="Remove">✕</button>
      </div>

      <!-- Enemy held items -->
      <div class="bopt-enemy-items">
        <div class="bopt-enemy-items-label">Held items:</div>
        <div class="bopt-enemy-items-slots">
          ${[0, 1, 2].map(slot => {
            const item = enemy.items[slot];
            const max  = item ? ENEMY_STACKABLE_MAX[item.name] : 0;
            return `
              <div class="bopt-enemy-item-slot ${item ? 'has-item' : ''}" data-idx="${idx}" data-slot="${slot}">
                <img src="${item ? item.image : 'assets/items/none.png'}" onerror="this.src='assets/items/missing.png'" class="bopt-enemy-item-icon">
                ${item ? `<button class="bopt-enemy-item-clear" data-idx="${idx}" data-slot="${slot}" title="Remove">✕</button>` : ''}
                ${item && max ? `
                  <div class="bopt-enemy-item-stacks">
                    <button class="bopt-enemy-stack-btn" data-action="minus" data-idx="${idx}" data-slot="${slot}">−</button>
                    <span class="bopt-enemy-stack-val">${enemy.stacks[slot] || 0}</span>
                    <button class="bopt-enemy-stack-btn" data-action="plus" data-idx="${idx}" data-slot="${slot}">+</button>
                  </div>
                ` : ''}
                ${item && item.activable ? `
                  <button class="bopt-enemy-item-toggle ${enemy.activated[slot] ? 'active' : ''}" data-idx="${idx}" data-slot="${slot}" title="Toggle activation effect">
                    ${enemy.activated[slot] ? '⚡ On' : '⚡ Off'}
                  </button>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Move checkboxes -->
      <div class="bopt-enemy-moves">
        <div class="bopt-enemy-moves-label">Moves included:</div>
        <div class="bopt-enemy-moves-list">
          ${availableMoves.length === 0 ? '<em>No moves available</em>' : availableMoves.map(m => `
            <label class="bopt-move-check">
              <input type="checkbox" class="bopt-move-cb" data-idx="${idx}" data-move="${m.name}" checked>
              <img src="${m.image || 'assets/moves/basic_attack.png'}" onerror="this.src='assets/moves/basic_attack.png'" class="bopt-move-icon">
              ${m.name}
            </label>
          `).join('')}
        </div>
      </div>
    `;

    // Events
    card.querySelector('.bopt-enemy-remove').addEventListener('click', () => removeEnemy(idx));

    // Item slots — click opens the item picker (unless clicking a sub-control)
    card.querySelectorAll('.bopt-enemy-item-slot').forEach(slotEl => {
      slotEl.addEventListener('click', e => {
        if (e.target.closest('.bopt-enemy-item-clear, .bopt-enemy-stack-btn, .bopt-enemy-item-toggle')) return;
        openEnemyItemModal(parseInt(slotEl.dataset.idx), parseInt(slotEl.dataset.slot));
      });
    });
    card.querySelectorAll('.bopt-enemy-item-clear').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        clearEnemyItem(parseInt(btn.dataset.idx), parseInt(btn.dataset.slot));
      });
    });
    card.querySelectorAll('.bopt-enemy-stack-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const delta = btn.dataset.action === 'plus' ? 1 : -1;
        changeEnemyStack(parseInt(btn.dataset.idx), parseInt(btn.dataset.slot), delta);
      });
    });
    card.querySelectorAll('.bopt-enemy-item-toggle').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        toggleEnemyActivation(parseInt(btn.dataset.idx), parseInt(btn.dataset.slot));
      });
    });

    card.querySelector('.bopt-priority-cb').addEventListener('change', e => {
      // Max 3 prioritaires
      const checked = document.querySelectorAll('.bopt-priority-cb:checked').length;
      if (checked > 3) { e.target.checked = false; return; }
      optState.enemies[idx].priority = e.target.checked;
      e.target.closest('label').classList.toggle('is-priority', e.target.checked);
    });

    card.querySelector('.bopt-enemy-lvl-slider').addEventListener('input', e => {
      const lvl = parseInt(e.target.value);
      optState.enemies[idx].level = lvl;
      card.querySelector('.bopt-enemy-lvl-val').textContent = lvl;
      // Re-render moves
      renderEnemiesList();
    });

    list.appendChild(card);
  });
}

function refreshEnemyMoveLists() {
  renderEnemiesList();
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE DESC
// ─────────────────────────────────────────────────────────────────────────────
const MODE_DESCS = {
  damage:    'Score = Σ damage on normal enemies × 1 + priority targets × 2',
  defense:   'Score = Σ damage received from enemies (priority only, or all if none marked)',
  heal_self: 'Score = total healing of the Pokémon (self + all targets)',
  heal_ally: 'Score = total healing targeting allies only',
};

function updateModeDesc() {
  const el = document.getElementById('boptModeDesc');
  if (el) el.textContent = MODE_DESCS[optState.mode] || '';
  updateEnemiesSectionVisibility();
}

function updateEnemiesSectionVisibility() {
  const sec = document.getElementById('boptEnemiesSection');
  if (!sec) return;
  const isHeal = optState.mode.startsWith('heal');
  sec.style.display = isHeal ? 'none' : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPTEUR COMBOS
// ─────────────────────────────────────────────────────────────────────────────
function updateComboCount() {
  const el = document.getElementById('boptComboCount');
  if (!el) return;

  const excluded = Object.values(specialHeldItems || {});
  const available = state.allItems.filter(item =>
    !excluded.includes(item.name) &&
    !optState.excludedItemNames.has(item.name) &&
    !optState.fixedItems.filter(Boolean).find(f => f.name === item.name)
  );

  const fixedCount = optState.fixedItems.filter(Boolean).length;
  const freeSlots  = 3 - fixedCount;
  const n = available.length;

  let count = 0;
  if (freeSlots === 3) count = n < 3 ? 0 : n * (n-1) * (n-2) / 6;
  else if (freeSlots === 2) count = n < 2 ? 0 : n * (n-1) / 2;
  else if (freeSlots === 1) count = n;
  else count = 1;

  el.textContent = `${count.toLocaleString()} combination${count > 1 ? 's' : ''} to test`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LANCER L'OPTIMISATION
// ─────────────────────────────────────────────────────────────────────────────
function runOptimizer() {
  if (!optState.attacker) return;
  if (optState.running) {
    if (optState.worker) { optState.worker.terminate(); optState.worker = null; }
    optState.running = false;
  }

  // Construire la liste d'items disponibles
  const excluded = Object.values(specialHeldItems || {});
  const availableItems = state.allItems.filter(item =>
    !excluded.includes(item.name) &&
    !optState.excludedItemNames.has(item.name)
  );

  // Préparer les ennemis (sérialiser sans références circulaires)
  const enemies = optState.enemies.map((en, idx) => {
    // Récupérer les moves cochés
    const checkedMoves = [...document.querySelectorAll(`.bopt-move-cb[data-idx="${idx}"]:checked`)]
      .map(cb => cb.dataset.move);
    return {
      pokemon:  serializePokemon(en.pokemon),
      level:    en.level,
      items:    en.items.map(i => i ? serializeItem(i) : null),
      stacks:   [...en.stacks],
      activated:[...en.activated],
      priority: en.priority,
    };
  });

  // enabledMovesByEnemy
  const enabledMovesByEnemy = optState.enemies.map((_, idx) => {
    return [...document.querySelectorAll(`.bopt-move-cb[data-idx="${idx}"]:checked`)]
      .map(cb => cb.dataset.move);
  });

  // In damage mode with no enemies: use a dummy target
  // In defense mode: a dummy never attacks back, so it's meaningless — require real enemies
  if (optState.mode === 'damage' && enemies.length === 0) {
    const dummy = state.allPokemon.find(p => p.pokemonId === 'substitute-doll');
    if (dummy) {
      enemies.push({
        pokemon: serializePokemon(dummy),
        level: optState.level,
        items: [null, null, null],
        stacks: [0, 0, 0],
        activated: [false, false, false],
        priority: false,
      });
      enabledMovesByEnemy.push([]);
    }
  }

  if (optState.mode === 'defense' && enemies.length === 0) {
    document.getElementById('boptResults').innerHTML =
      `<div class="bopt-error">⚠️ Defense mode requires at least one enemy. Add enemies in the right column so the optimizer can calculate damage received.</div>`;
    return;
  }

  const payload = {
    mode:        optState.mode,
    attacker:    serializePokemon(optState.attacker),
    level:       optState.level,
    availableItems: availableItems.map(serializeItem),
    fixedItems:  optState.fixedItems.map(i => i ? serializeItem(i) : null),
    enemies,
    enabledMovesByEnemy,
  };

  // UI feedback
  document.getElementById('boptProgressWrap').style.display = 'block';
  document.getElementById('boptProgressFill').style.width = '0%';
  document.getElementById('boptProgressText').textContent = 'Starting...';
  document.getElementById('boptResults').innerHTML = '';
  document.getElementById('boptRunBtn').textContent = '⏹ Stop';
  optState.running = true;

  optState.worker = new Worker('./scripts/calculator/buildOptimizerWorker.js');
  optState.worker.onmessage = handleWorkerMessage;
  optState.worker.onerror   = (err) => {
    console.error('Worker error:', err);
    finishOptimizer();
    document.getElementById('boptResults').innerHTML = `<div class="bopt-error">Error: ${err.message}</div>`;
  };
  optState.worker.postMessage(payload);
}

function handleWorkerMessage(e) {
  const { type, pct, processed, total, results } = e.data;

  if (type === 'progress') {
    document.getElementById('boptProgressFill').style.width = `${pct}%`;
    document.getElementById('boptProgressText').textContent =
      `${processed.toLocaleString()} / ${total.toLocaleString()} combinations tested...`;
  }

  if (type === 'done') {
    document.getElementById('boptProgressFill').style.width = '100%';
    document.getElementById('boptProgressText').textContent = 'Done!';
    renderResults(results);
    finishOptimizer();
  }
}

function finishOptimizer() {
  optState.running = false;
  optState.worker  = null;
  const btn = document.getElementById('boptRunBtn');
  if (btn) { btn.innerHTML = '<span class="bopt-run-icon">⚡</span> Run Optimizer'; btn.disabled = false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDU DES RÉSULTATS
// ─────────────────────────────────────────────────────────────────────────────
function renderResults(results) {
  const container = document.getElementById('boptResults');
  if (!results || results.length === 0) {
    container.innerHTML = '<div class="bopt-empty-results">No results found.</div>';
    return;
  }

  const isDefense = optState.mode === 'defense';
  const scoreLabel = isDefense ? 'Damage received (↓ lower = better)' : 'Total score';

  container.innerHTML = `
    <div class="bopt-results-header">
      <h3>Top ${results.length} builds</h3>
      <span class="bopt-results-mode">${MODE_DESCS[optState.mode]}</span>
    </div>
    ${results.map((result, rank) => {
      // Retrouver les items réels depuis state.allItems
      const buildItems = result.items.map(ri => {
        if (!ri) return null;
        return state.allItems.find(i => i.name === ri.name) || ri;
      });

      return `
        <div class="bopt-result-card ${rank === 0 ? 'bopt-result-best' : ''}">
          <div class="bopt-result-rank">${rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}</div>
          <div class="bopt-result-items">
            ${buildItems.map(item => item ? `
              <div class="bopt-result-item" title="${item.display_name || item.name}">
                <img src="${item.image || 'assets/items/none.png'}" onerror="this.src='assets/items/none.png'">
                <span>${item.display_name || item.name}</span>
              </div>
            ` : `<div class="bopt-result-item bopt-result-empty">—</div>`).join('')}
          </div>
          <div class="bopt-result-score">
            <div class="bopt-score-label">${scoreLabel}</div>
            <div class="bopt-score-val ${isDefense ? 'is-defense' : ''}">${result.score.toLocaleString()}</div>
          </div>
          ${result.details && result.details.length > 1 ? `
            <div class="bopt-result-details">
              ${result.details.map(d => `
                <span class="bopt-detail-chip ${d.priority ? 'is-priority' : ''}">
                  ${d.label}: <strong>${d.value.toLocaleString()}</strong>${d.weight > 1 ? ' ×2' : ''}
                </span>
              `).join('')}
            </div>
          ` : ''}
          <button class="bopt-apply-btn" data-rank="${rank}" title="Apply this build to the main calculator">
            ✓ Apply
          </button>
        </div>
      `;
    }).join('')}
  `;

  // Apply buttons
  container.querySelectorAll('.bopt-apply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rank = parseInt(btn.dataset.rank);
      applyBuild(results[rank]);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLIQUER UN BUILD
// ─────────────────────────────────────────────────────────────────────────────
function applyBuild(result) {
  // Retrouver les items complets depuis state.allItems
  const buildItems = result.items.map(ri => {
    if (!ri) return null;
    return state.allItems.find(i => i.name === ri.name) || null;
  });

  // Sélectionner l'attaquant dans le calculateur principal si nécessaire
  if (optState.attacker && (!state.currentAttacker || state.currentAttacker.pokemonId !== optState.attacker.pokemonId)) {
    import('./pokemonManager.js').then(({ selectAttacker }) => {
      selectAttacker(optState.attacker.pokemonId);
    }).then(() => {
      injectItems(buildItems, result.stacks);
    });
  } else {
    injectItems(buildItems, result.stacks);
  }
}

function injectItems(buildItems, stacks) {
  import('./itemManager.js').then(({ updateItemCard }) => {
    buildItems.forEach((item, slot) => {
      state.attackerItems[slot]       = item;
      state.attackerItemStacks[slot]  = stacks?.[slot] ?? 0;
      state.attackerItemActivated[slot] = item?.activable ? true : false;
      updateItemCard('attacker', slot, item);
    });

    import('./damageDisplay.js').then(({ updateDamages }) => updateDamages());

    // Feedback visuel
    const toast = document.createElement('div');
    toast.className = 'bopt-toast';
    toast.textContent = '✓ Build applied to the calculator!';
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 50);
    setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 300); }, 2500);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SÉRIALISATION (pour postMessage — doit être structurally clonable)
// ─────────────────────────────────────────────────────────────────────────────
function serializePokemon(poke) {
  if (!poke) return null;
  return {
    pokemonId:   poke.pokemonId,
    displayName: poke.displayName,
    category:    poke.category,
    style:       poke.style,
    timerBased:  poke.timerBased,
    stats:       poke.stats,
    moves:       poke.moves,
    passive:     poke.passive,
    image:       poke.image,
  };
}

function serializeItem(item) {
  if (!item) return null;
  return {
    name:             item.name,
    display_name:     item.display_name,
    image:            item.image,
    stats:            item.stats,
    level20:          item.level20,
    stack_type:       item.stack_type,
    activable:        item.activable,
    activation_effect:item.activation_effect,
  };
}