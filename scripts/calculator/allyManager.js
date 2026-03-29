/**
 * allyManager.js
 * Gère les alliés de l'attaquant (max 4).
 *
 * Chaque allié a maintenant :
 *   - level         (1-15)
 *   - hpPercent     (0-100)
 *   - items         [null, null, null]
 *   - itemStacks    [0, 0, 0]
 *   - itemActivated [false, false, false]
 *
 * Exports :
 *  - initAllyManager()
 *  - getAllies()
 *  - getAllyStats(ally)
 *  - resetAllies()
 *  - appendAllyBadges(valuesEl, type, allyValue)
 */

import { state } from './state.js';
import { getModifiedStats } from './damageCalculator.js';
import { stackableItems, specialHeldItems } from './constants.js';

const MAX_ALLIES = 4;

let allies = [];
let activeAllyPanel = null;
let allyItemPickerEl = null;

const onChangeCallbacks = [];

export function onAlliesChange(fn) {
  onChangeCallbacks.push(fn);
}

function notifyChange() {
  onChangeCallbacks.forEach(fn => fn(allies));
}

export function getAllies() {
  return allies;
}

export function getAllyStats(ally) {
  const poke = state.allPokemon.find(p => p.pokemonId === ally.pokemonId);
  if (!poke) return null;
  return getModifiedStats(poke, ally.level, ally.items, ally.itemStacks, ally.itemActivated);
}

export function resetAllies() {
  allies = [];
  closeAllyPanel();
  renderAlliesRow();
  notifyChange();
}

// ── Création d'un allié ───────────────────────────────────────────────────────

function makeAlly(pokemon) {
  return {
    pokemonId:     pokemon.pokemonId,
    displayName:   pokemon.displayName,
    image:         pokemon.image,
    level:         15,
    hpPercent:     100,
    items:         [null, null, null],
    itemStacks:    [0, 0, 0],
    itemActivated: [false, false, false],
  };
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initAllyManager() {
  const addBtn = document.getElementById('allyAddBtn');
  if (addBtn) addBtn.addEventListener('click', openAllyPicker);

  const closeBtn = document.querySelector('.ally-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeAllyPicker);

  const modal = document.getElementById('allyPickerModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllyPicker();
    });
  }

  const search = document.getElementById('allyPickerSearch');
  if (search) {
    search.addEventListener('input', () => {
      const term = search.value.toLowerCase().trim();
      document.querySelectorAll('#allyPickerGrid .ally-picker-item').forEach(el => {
        const name = el.querySelector('span')?.textContent.toLowerCase() || '';
        el.style.display = name.includes(term) ? '' : 'none';
      });
    });
  }

  injectAllyPanelStyles();
}

// ── Picker Pokémon ────────────────────────────────────────────────────────────

function openAllyPicker() {
  if (allies.length >= MAX_ALLIES) return;
  const modal  = document.getElementById('allyPickerModal');
  const grid   = document.getElementById('allyPickerGrid');
  const search = document.getElementById('allyPickerSearch');
  if (!modal || !grid) return;

  if (search) search.value = '';
  grid.innerHTML = '';

  const currentIds = new Set(allies.map(a => a.pokemonId));
  state.allPokemon.filter(p => p.category === 'playable').forEach(p => {
    const item = document.createElement('div');
    item.className = 'ally-picker-item' + (currentIds.has(p.pokemonId) ? ' already-ally' : '');
    item.innerHTML = `<img src="${p.image}" alt="${p.displayName}" onerror="this.src='assets/pokemon/missing.png'"><span>${p.displayName}</span>`;
    item.addEventListener('click', () => { addAlly(p); closeAllyPicker(); });
    grid.appendChild(item);
  });

  modal.style.display = 'flex';
  if (search) setTimeout(() => search.focus(), 50);
}

function closeAllyPicker() {
  const modal = document.getElementById('allyPickerModal');
  if (modal) modal.style.display = 'none';
}

// ── Add / Remove ──────────────────────────────────────────────────────────────

function addAlly(pokemon) {
  if (allies.length >= MAX_ALLIES) return;
  if (allies.some(a => a.pokemonId === pokemon.pokemonId)) return;
  allies.push(makeAlly(pokemon));
  renderAlliesRow();
  notifyChange();
}

function removeAlly(pokemonId) {
  if (activeAllyPanel && activeAllyPanel.dataset.allyId === pokemonId) closeAllyPanel();
  allies = allies.filter(a => a.pokemonId !== pokemonId);
  renderAlliesRow();
  notifyChange();
}

// ── Rangée d'alliés ───────────────────────────────────────────────────────────

function renderAlliesRow() {
  const row    = document.getElementById('alliesRow');
  const addBtn = document.getElementById('allyAddBtn');
  if (!row) return;

  row.querySelectorAll('.ally-slot').forEach(el => el.remove());

  allies.forEach(ally => {
    const slot = document.createElement('div');
    slot.className = 'ally-slot';
    slot.dataset.allyId = ally.pokemonId;
    slot.title = ally.displayName;

    slot.innerHTML = `
      <div class="ally-slot-img-wrap">
        <img class="ally-slot-img" src="${ally.image}" alt="${ally.displayName}" onerror="this.src='assets/pokemon/missing.png'">
        <button class="ally-slot-remove" title="Remove ally">×</button>
      </div>
      <button class="ally-slot-config" title="Configure ally">⚙</button>
      <span class="ally-slot-name">${ally.displayName.split(' ')[0]}</span>
    `;

    slot.querySelector('.ally-slot-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeAlly(ally.pokemonId);
    });

    slot.querySelector('.ally-slot-config').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAllyPanel(ally, slot);
    });

    row.insertBefore(slot, addBtn);
  });

  if (addBtn) addBtn.style.display = allies.length >= MAX_ALLIES ? 'none' : 'flex';
}

// ── Panel de configuration ────────────────────────────────────────────────────

function toggleAllyPanel(ally, anchorEl) {
  if (activeAllyPanel && activeAllyPanel.dataset.allyId === ally.pokemonId) {
    closeAllyPanel();
    return;
  }
  closeAllyPanel();
  openAllyPanel(ally, anchorEl);
}

function closeAllyPanel() {
  if (activeAllyPanel) { activeAllyPanel.remove(); activeAllyPanel = null; }
  closeAllyItemPicker();
}

function openAllyPanel(ally, anchorEl) {
  const panel = document.createElement('div');
  panel.className = 'ally-config-panel';
  panel.dataset.allyId = ally.pokemonId;
  activeAllyPanel = panel;

  renderAllyPanelContent(panel, ally);
  document.body.appendChild(panel);
  positionPanel(panel, anchorEl);

  requestAnimationFrame(() => {
    const outside = (e) => {
      if (!panel.contains(e.target)
          && !e.target.closest('.ally-slot-config')
          && !e.target.closest('.ally-item-picker')) {
        closeAllyPanel();
        document.removeEventListener('click', outside);
      }
    };
    document.addEventListener('click', outside);
  });
}

function positionPanel(panel, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const panelW = 300;
  let left = rect.left + window.scrollX;
  let top  = rect.bottom + 8 + window.scrollY;
  if (left + panelW > window.innerWidth - 8) left = window.innerWidth - panelW - 8;
  if (left < 8) left = 8;
  panel.style.left = `${left}px`;
  panel.style.top  = `${top}px`;
}

function renderAllyPanelContent(panel, ally) {
  panel.innerHTML = '';

  const poke = state.allPokemon.find(p => p.pokemonId === ally.pokemonId);
  if (!poke) return;

  // En-tête
  const header = document.createElement('div');
  header.className = 'acp-header';
  header.innerHTML = `
    <img src="${ally.image}" alt="${ally.displayName}" onerror="this.src='assets/pokemon/missing.png'">
    <span class="acp-name">${ally.displayName}</span>
    <span class="acp-lv-badge">Lv.${ally.level}</span>
    <button class="acp-close">×</button>
  `;
  header.querySelector('.acp-close').addEventListener('click', closeAllyPanel);
  panel.appendChild(header);

  // Niveau
  const levelRow = document.createElement('div');
  levelRow.className = 'acp-row';
  levelRow.innerHTML = `
    <label class="acp-label">Level</label>
    <div class="acp-slider-wrap">
      <input type="range" class="acp-slider" min="1" max="15" value="${ally.level}" style="--value:${ally.level}">
      <span class="acp-slider-val">${ally.level}</span>
    </div>
  `;
  const levelSlider = levelRow.querySelector('input');
  const levelValEl  = levelRow.querySelector('.acp-slider-val');
  const lvBadge     = header.querySelector('.acp-lv-badge');
  levelSlider.addEventListener('input', () => {
    ally.level = parseInt(levelSlider.value);
    levelValEl.textContent = ally.level;
    levelSlider.style.setProperty('--value', ally.level);
    lvBadge.textContent = `Lv.${ally.level}`;
    refreshStats();
    notifyChange();
  });
  panel.appendChild(levelRow);

  // HP
  const stats0 = getAllyStats(ally);
  const hpRow = document.createElement('div');
  hpRow.className = 'acp-row';
  hpRow.innerHTML = `
    <label class="acp-label">HP</label>
    <div class="acp-slider-wrap">
      <input type="range" class="acp-slider acp-hp-slider" min="0" max="100" value="${ally.hpPercent}" style="--value:${ally.hpPercent}">
      <span class="acp-slider-val acp-hp-val">${Math.floor(stats0.hp * ally.hpPercent / 100).toLocaleString()} / ${stats0.hp.toLocaleString()}</span>
    </div>
  `;
  const hpSlider = hpRow.querySelector('input');
  const hpValEl  = hpRow.querySelector('.acp-hp-val');
  hpSlider.addEventListener('input', () => {
    ally.hpPercent = parseInt(hpSlider.value);
    hpSlider.style.setProperty('--value', ally.hpPercent);
    const s = getAllyStats(ally);
    hpValEl.textContent = `${Math.floor(s.hp * ally.hpPercent / 100).toLocaleString()} / ${s.hp.toLocaleString()}`;
    notifyChange();
  });
  panel.appendChild(hpRow);

  // Stats
  const statsRow = document.createElement('div');
  statsRow.className = 'acp-stats';
  panel.appendChild(statsRow);

  function refreshStats() {
    const s = getAllyStats(ally);
    statsRow.innerHTML = `
      <div class="acp-stat"><span class="acp-stat-label">HP</span><span class="acp-stat-val">${s.hp.toLocaleString()}</span></div>
      <div class="acp-stat"><span class="acp-stat-label">ATK</span><span class="acp-stat-val">${s.atk.toLocaleString()}</span></div>
      <div class="acp-stat"><span class="acp-stat-label">Sp.Atk</span><span class="acp-stat-val">${s.sp_atk.toLocaleString()}</span></div>
      <div class="acp-stat"><span class="acp-stat-label">DEF</span><span class="acp-stat-val">${s.def.toLocaleString()}</span></div>
      <div class="acp-stat"><span class="acp-stat-label">Sp.Def</span><span class="acp-stat-val">${s.sp_def.toLocaleString()}</span></div>
    `;
    hpValEl.textContent = `${Math.floor(s.hp * ally.hpPercent / 100).toLocaleString()} / ${s.hp.toLocaleString()}`;
  }
  refreshStats();

  // Items — titre
  const itemsTitle = document.createElement('div');
  itemsTitle.className = 'acp-section-title';
  itemsTitle.textContent = 'Items';
  panel.appendChild(itemsTitle);

  // Items — grille
  const itemsGrid = document.createElement('div');
  itemsGrid.className = 'acp-items-grid';
  panel.appendChild(itemsGrid);

  for (let i = 0; i < 3; i++) {
    itemsGrid.appendChild(buildAllyItemCard(ally, i, panel, refreshStats));
  }
}

// ── Carte item allié ──────────────────────────────────────────────────────────

function buildAllyItemCard(ally, slot, panel, refreshStatsFn) {
  const item = ally.items[slot];
  const card = document.createElement('div');
  card.className = 'acp-item-card' + (item ? ' has-item' : '');
  card.dataset.slot = slot;

  const img = document.createElement('img');
  img.src = item ? item.image : 'assets/items/none.png';
  img.alt = item ? (item.display_name || item.name) : 'Empty';
  img.onerror = () => { img.src = 'assets/items/none.png'; };
  card.appendChild(img);

  const nameEl = document.createElement('span');
  nameEl.className = 'acp-item-name';
  nameEl.textContent = item ? (item.display_name || item.name) : 'Empty';
  card.appendChild(nameEl);

  // Stacks si stackable
  if (item && stackableItems.includes(item.name)) {
    const maxStacks = item.name === 'Weakness Policy' ? 4
      : (item.name.includes('Accel') || item.name.includes('Drive') ? 20 : 6);
    const sw = document.createElement('div');
    sw.className = 'acp-stacks';
    sw.innerHTML = `
      <button class="acp-stack-btn">−</button>
      <span class="acp-stack-val">${ally.itemStacks[slot]}</span>
      <span class="acp-stack-max">/${maxStacks}</span>
      <button class="acp-stack-btn">+</button>
    `;
    const [minus, plus] = sw.querySelectorAll('.acp-stack-btn');
    const valEl = sw.querySelector('.acp-stack-val');
    minus.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ally.itemStacks[slot] > 0) {
        ally.itemStacks[slot]--;
        valEl.textContent = ally.itemStacks[slot];
        refreshStatsFn(); notifyChange();
      }
    });
    plus.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ally.itemStacks[slot] < maxStacks) {
        ally.itemStacks[slot]++;
        valEl.textContent = ally.itemStacks[slot];
        refreshStatsFn(); notifyChange();
      }
    });
    card.appendChild(sw);
  }

  // Bouton remove
  if (item) {
    const rb = document.createElement('button');
    rb.className = 'acp-item-remove';
    rb.textContent = '×';
    rb.title = 'Remove item';
    rb.addEventListener('click', (e) => {
      e.stopPropagation();
      ally.items[slot] = null;
      ally.itemStacks[slot] = 0;
      ally.itemActivated[slot] = false;
      renderAllyPanelContent(panel, ally);
      refreshStatsFn(); notifyChange();
    });
    card.appendChild(rb);
  }

  card.addEventListener('click', (e) => {
    if (e.target.closest('.acp-stacks') || e.target.closest('.acp-item-remove')) return;
    openAllyItemPicker(ally, slot, card, panel, refreshStatsFn);
  });

  return card;
}

// ── Picker d'items pour allié ─────────────────────────────────────────────────

function closeAllyItemPicker() {
  if (allyItemPickerEl) { allyItemPickerEl.remove(); allyItemPickerEl = null; }
}

function openAllyItemPicker(ally, slot, anchorCard, panel, refreshStatsFn) {
  closeAllyItemPicker();

  const excluded    = new Set(Object.values(specialHeldItems));
  const equippedNames = new Set(ally.items.filter(Boolean).map(i => i.name));

  const picker = document.createElement('div');
  picker.className = 'ally-item-picker';
  allyItemPickerEl = picker;

  const searchEl = document.createElement('input');
  searchEl.type = 'text';
  searchEl.placeholder = 'Search item...';
  searchEl.className = 'ally-item-search';
  picker.appendChild(searchEl);

  const grid = document.createElement('div');
  grid.className = 'ally-item-grid';
  picker.appendChild(grid);

  const renderItems = (term = '') => {
    grid.innerHTML = '';
    state.allItems
      .filter(it => !excluded.has(it.name))
      .filter(it => !term || (it.display_name || it.name).toLowerCase().includes(term))
      .forEach(it => {
        const alreadyOtherSlot = equippedNames.has(it.name) && ally.items[slot]?.name !== it.name;
        const cell = document.createElement('div');
        cell.className = 'ally-item-cell' + (alreadyOtherSlot ? ' disabled' : '');
        cell.title = it.display_name || it.name;
        cell.innerHTML = `<img src="${it.image}" alt="${it.name}" onerror="this.src='assets/items/none.png'"><span>${it.display_name || it.name}</span>`;
        cell.addEventListener('click', () => {
          if (alreadyOtherSlot) return;
          ally.items[slot] = it;
          ally.itemStacks[slot] = 0;
          ally.itemActivated[slot] = false;
          closeAllyItemPicker();
          renderAllyPanelContent(panel, ally);
          refreshStatsFn(); notifyChange();
        });
        grid.appendChild(cell);
      });
  };

  searchEl.addEventListener('input', () => renderItems(searchEl.value.toLowerCase().trim()));
  renderItems();

  document.body.appendChild(picker);

  const rect = anchorCard.getBoundingClientRect();
  let left = rect.left + window.scrollX;
  let top  = rect.bottom + 4 + window.scrollY;
  if (left + 260 > window.innerWidth - 8) left = window.innerWidth - 260 - 8;
  picker.style.left = `${left}px`;
  picker.style.top  = `${top}px`;

  setTimeout(() => searchEl.focus(), 30);

  requestAnimationFrame(() => {
    const outside = (e) => {
      if (!picker.contains(e.target) && !anchorCard.contains(e.target)) {
        closeAllyItemPicker();
        document.removeEventListener('click', outside);
      }
    };
    document.addEventListener('click', outside);
  });
}

// ── Badges alliés sur move-cards ──────────────────────────────────────────────

export function appendAllyBadges(valuesEl, type, allyValue) {
  if (!allies.length) return;
  if (!allyValue || allyValue <= 0) return;

  let wrapper = valuesEl.querySelector('.dmg-ally-col');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'dmg-ally-col';
    valuesEl.appendChild(wrapper);
  }

  allies.forEach(ally => {
    const badge = document.createElement('span');
    badge.className = `dmg-ally-badge dmg-ally-${type}`;
    badge.innerHTML = `
      <img src="${ally.image}" alt="${ally.displayName}" onerror="this.src='assets/pokemon/missing.png'">
      ${allyValue.toLocaleString()}
    `;
    badge.title = `${type === 'heal' ? '❤️' : '🛡️'} ${ally.displayName}: ${allyValue.toLocaleString()}`;
    wrapper.appendChild(badge);
  });
}

// ── Styles injectés ───────────────────────────────────────────────────────────

function injectAllyPanelStyles() {
  if (document.getElementById('allyPanelStyles')) return;
  const s = document.createElement('style');
  s.id = 'allyPanelStyles';
  s.textContent = `
    .ally-slot-config {
      display: block;
      width: 100%;
      margin: 2px 0 0;
      padding: 0;
      background: none;
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 4px;
      color: rgba(255,255,255,0.4);
      font-size: 0.68rem;
      cursor: pointer;
      line-height: 1.7;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .ally-slot-config:hover {
      background: rgba(159,83,236,0.18);
      border-color: rgba(159,83,236,0.5);
      color: #c8b8ff;
    }

    .ally-config-panel {
      position: absolute;
      z-index: 8000;
      width: 300px;
      background: #161626;
      border: 1px solid #3a3a5a;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.8);
      font-family: 'Exo 2', sans-serif;
      overflow: hidden;
      animation: acpFadeIn 0.12s ease-out;
    }
    @keyframes acpFadeIn {
      from { opacity:0; transform:translateY(4px); }
      to   { opacity:1; transform:translateY(0); }
    }

    .acp-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: #1e1e35;
      border-bottom: 1px solid #2a2a44;
    }
    .acp-header img { width:32px; height:32px; border-radius:50%; object-fit:contain; background:#252540; flex-shrink:0; }
    .acp-name { flex:1; font-size:0.88rem; font-weight:700; color:#d0c8ff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .acp-lv-badge {
      font-size:0.7rem; font-weight:900; padding:2px 7px;
      background:linear-gradient(135deg,#9f53ec,#7b3dbf);
      border:1px solid rgba(255,255,255,0.12); border-radius:20px;
      color:#fff; flex-shrink:0;
    }
    .acp-close { background:none; border:none; color:#666; font-size:1.2rem; cursor:pointer; padding:0; line-height:1; transition:color 0.15s; }
    .acp-close:hover { color:#f44; }

    .acp-row { padding:8px 12px 4px; }
    .acp-label { display:block; font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#555; margin-bottom:4px; }
    .acp-slider-wrap { display:flex; align-items:center; gap:8px; }

    .acp-slider {
      flex:1; -webkit-appearance:none; appearance:none;
      height:12px; border-radius:3px; background:transparent;
      border:2px solid rgba(0,0,0,0.6); outline:none; cursor:pointer;
    }
    .acp-slider::-webkit-slider-runnable-track {
      height:8px; border-radius:2px;
      background:linear-gradient(to right,
        #9f53ec 0%, #9f53ec calc((var(--value,15) - 1) / 14 * 100%),
        #000 calc((var(--value,15) - 1) / 14 * 100%), #000 100%);
    }
    .acp-slider::-moz-range-track {
      height:8px; border-radius:2px;
      background:linear-gradient(to right,
        #9f53ec 0%, #9f53ec calc((var(--value,15) - 1) / 14 * 100%),
        #000 calc((var(--value,15) - 1) / 14 * 100%), #000 100%);
    }
    .acp-slider::-webkit-slider-thumb {
      -webkit-appearance:none; width:6px; height:16px; border-radius:3px;
      background:#fff; border:1px solid rgba(0,0,0,0.4);
      box-shadow:0 0 0 2px rgba(159,83,236,0.6); cursor:pointer; margin-top:-4px;
    }
    .acp-slider::-moz-range-thumb {
      width:6px; height:16px; border-radius:3px; background:#fff;
      border:1px solid rgba(0,0,0,0.4); box-shadow:0 0 0 2px rgba(159,83,236,0.6); cursor:pointer;
    }
    .acp-hp-slider::-webkit-slider-runnable-track {
      background:linear-gradient(to right,
        #6ae0ff 0%, #3fb8f0 calc(var(--value,100) * 1%),
        #000 calc(var(--value,100) * 1%), #000 100%) !important;
    }
    .acp-hp-slider::-moz-range-track {
      background:linear-gradient(to right,
        #6ae0ff 0%, #3fb8f0 calc(var(--value,100) * 1%),
        #000 calc(var(--value,100) * 1%), #000 100%) !important;
    }
    .acp-hp-slider::-webkit-slider-thumb { box-shadow:0 0 0 2px rgba(106,224,255,0.6) !important; }
    .acp-hp-slider::-moz-range-thumb     { box-shadow:0 0 0 2px rgba(106,224,255,0.6) !important; }

    .acp-slider-val { font-size:0.82rem; font-weight:700; color:#c8c8e8; min-width:28px; text-align:right; white-space:nowrap; }
    .acp-hp-val { min-width:110px; font-size:0.74rem; }

    .acp-stats {
      display:grid; grid-template-columns:repeat(5,1fr); gap:4px;
      padding:6px 12px 8px;
    }
    .acp-stat { background:#1e1e35; border-radius:6px; padding:4px 3px; text-align:center; }
    .acp-stat-label { display:block; font-size:0.58rem; font-weight:700; text-transform:uppercase; color:#555; margin-bottom:2px; }
    .acp-stat-val   { display:block; font-size:0.76rem; font-weight:700; color:#a0c8e8; }

    .acp-section-title {
      font-size:0.68rem; font-weight:700; text-transform:uppercase;
      letter-spacing:0.06em; color:#444; padding:0 12px 4px;
      border-top:1px solid #1e1e35; margin-top:2px; padding-top:8px;
    }

    .acp-items-grid { display:flex; justify-content:center; gap:6px; padding:0 12px 12px; }
    .acp-item-card {
      background:#1e1e35; border:1px solid #2a2a44; border-radius:8px;
      padding:6px; width:82px; text-align:center; cursor:pointer;
      position:relative; transition:border-color 0.15s, background 0.15s; flex-shrink:0;
    }
    .acp-item-card:hover { border-color:#5a5aaa; background:#252545; }
    .acp-item-card.has-item { border-color:rgba(255,215,64,0.35); }
    .acp-item-card img { width:36px; height:36px; object-fit:contain; border-radius:6px; margin:0 auto 3px; display:block; }
    .acp-item-name { display:block; font-size:0.58rem; font-weight:600; color:#777; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .acp-item-remove {
      position:absolute; top:-5px; right:-5px; width:16px; height:16px;
      border-radius:50%; background:#c0392b; color:#fff; border:none;
      font-size:0.7rem; line-height:16px; text-align:center; cursor:pointer;
      padding:0; opacity:0; transition:opacity 0.15s;
    }
    .acp-item-card:hover .acp-item-remove { opacity:1; }

    .acp-stacks { display:flex; align-items:center; justify-content:center; gap:3px; margin-top:3px; }
    .acp-stack-btn {
      width:16px; height:16px; border-radius:3px; border:1px solid #444;
      background:#252540; color:#aaa; font-size:0.75rem; cursor:pointer;
      line-height:1; padding:0; display:flex; align-items:center; justify-content:center;
    }
    .acp-stack-btn:hover { background:#3a3a5a; }
    .acp-stack-val { font-size:0.72rem; font-weight:700; color:#ffd740; min-width:12px; text-align:center; }
    .acp-stack-max { font-size:0.6rem; color:#444; }

    .ally-item-picker {
      position:absolute; z-index:9000; width:260px;
      background:#161626; border:1px solid #3a3a5a; border-radius:10px;
      box-shadow:0 8px 32px rgba(0,0,0,0.8); padding:8px;
      font-family:'Exo 2',sans-serif;
    }
    .ally-item-search {
      width:100%; padding:5px 10px; background:#1e1e35; border:1px solid #3a3a5a;
      border-radius:6px; color:#ccc; font-size:0.8rem; font-family:'Exo 2',sans-serif;
      outline:none; margin-bottom:6px; box-sizing:border-box;
    }
    .ally-item-grid {
      display:grid; grid-template-columns:repeat(4,1fr); gap:4px;
      max-height:200px; overflow-y:auto;
    }
    .ally-item-cell {
      text-align:center; cursor:pointer; padding:4px 2px; border-radius:6px;
      border:1px solid transparent; transition:background 0.12s, border-color 0.12s;
    }
    .ally-item-cell:hover { background:#252545; border-color:#5a5aaa; }
    .ally-item-cell.disabled { opacity:0.3; pointer-events:none; }
    .ally-item-cell img { width:36px; height:36px; object-fit:contain; display:block; margin:0 auto; }
    .ally-item-cell span { display:block; font-size:0.55rem; color:#777; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px; }
  `;
  document.head.appendChild(s);
}