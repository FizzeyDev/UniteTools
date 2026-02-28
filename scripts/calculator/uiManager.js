import { state } from './state.js';
import { selectAttacker, selectDefender } from './pokemonManager.js';
import { updateDamages } from './damageDisplay.js';
import { getModifiedStats } from './damageCalculator.js';
import { getMobHPAtTimer } from './constants.js';

const levelSliderAttacker = document.getElementById("levelSliderAttacker");
const levelSliderDefender = document.getElementById("levelSliderDefender");
const levelValueAttacker = document.getElementById("levelValueAttacker");
const levelValueDefender = document.getElementById("levelValueDefender");
const pokemonGridAttacker = document.getElementById("pokemonGridAttacker");
const pokemonGridDefender = document.getElementById("pokemonGridDefender");
const movesGrid = document.getElementById("movesGrid");

export function populateGrids() {
  [pokemonGridAttacker, pokemonGridDefender].forEach((grid, i) => {
    const isAttacker = i === 0;
    const side = isAttacker ? 'attacker' : 'defender';
    grid.innerHTML = "";

    state.allPokemon.forEach(poke => {
      if (isAttacker && (poke.category === 'mob' || poke.category === 'other')) return

      const div = document.createElement("div");
      div.className = "pokemon-grid-item";
      div.dataset.category = poke.category || 'playable';
      div.onclick = () => isAttacker ? selectAttacker(poke.pokemonId) : selectDefender(poke.pokemonId);
      div.innerHTML = `
        <img src="${poke.image}" alt="${poke.pokemonId}" onerror="this.src='assets/pokemon/missing.png'">
        <span>${poke.displayName}</span>
      `;
      grid.appendChild(div);
    });

    setupCategoryTabs(side);
    filterByCategory(side, 'playable');
  });
}

export function highlightGridSelection(grid, id) {
  grid.querySelectorAll('.pokemon-grid-item').forEach(item => {
    const isSelected = item.querySelector('img').alt === id;
    item.classList.toggle('selected', isSelected);
  });
}

function setupCategoryTabs(side) {
  const tabsContainer = document.querySelector(`.category-tabs.${side}-tabs`);
  if (!tabsContainer) return;

  tabsContainer.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      tabsContainer.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.dataset.category;
      filterByCategory(side, category);
    });
  });
}

function filterByCategory(side, category) {
  const grid = side === 'attacker' ? pokemonGridAttacker : pokemonGridDefender;

  grid.querySelectorAll('.pokemon-grid-item').forEach(item => {
    const itemCat = item.dataset.category;
    const shouldShow = (category === 'all' || itemCat === category);

    if (shouldShow) {
      item.style.display = 'block';
      delete item.dataset.hiddenBySearch;
    } else {
      item.style.display = 'none';
      item.dataset.hiddenBySearch = 'true';
    }
  });

  const outInput = document.getElementById(`search${side.charAt(0).toUpperCase() + side.slice(1)}`);
  if (outInput && outInput.value.trim() !== '') {
    outInput.dispatchEvent(new Event('input'));
  }
}

export function setupSearch() {
  const searchAttacker = document.getElementById('searchAttacker');
  const searchDefender = document.getElementById('searchDefender');

  const filterGrid = (input, grid) => {
    const term = input.value.toLowerCase().trim();

    grid.querySelectorAll('.pokemon-grid-item').forEach(item => {
      const name = item.querySelector('span').textContent.toLowerCase();
      const matches = name.includes(term);
      item.style.display = matches || term === '' ? 'block' : 'none';
    });
  };

  searchAttacker.addEventListener('input', () => filterGrid(searchAttacker, pokemonGridAttacker));
  searchDefender.addEventListener('input', () => filterGrid(searchDefender, pokemonGridDefender));
}

export function updateSliderStyle(slider, value) {
  slider.style.setProperty('--value', value);
}

export function updateHPDisplays() {
  if (!state.currentAttacker || !state.currentDefender) return;

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

  // Pour les mobs timer-based, on écrase defStats.hp avec la valeur du timer
  if (state.currentDefender?.timerBased && state.currentDefender.hpTable) {
    defStats.hp = getMobHPAtTimer(state.currentDefender.hpTable, state.defenderTimer);
  }

  if (!state.isEditingHP.attacker) {
    const currentAtkHP = Math.floor(atkStats.hp * (state.attackerHPPercent / 100));
    document.getElementById('hpValueAttacker').textContent = `${currentAtkHP.toLocaleString()} / ${atkStats.hp.toLocaleString()}`;
  }

  if (!state.isEditingHP.defender) {
    const currentDefHP = Math.floor(defStats.hp * (state.defenderHPPercent / 100));
    document.getElementById('hpValueDefender').textContent = `${currentDefHP.toLocaleString()} / ${defStats.hp.toLocaleString()}`;
  }
}

export function makeHPValueEditable(elementId, sliderId) {
  const element = document.getElementById(elementId);
  const slider = document.getElementById(sliderId);

  const side = elementId.includes('Attacker') ? 'attacker' : 'defender';

  element.addEventListener('click', (e) => {
    if (state.isEditingHP[side]) return;
    state.isEditingHP[side] = true;

    e.stopPropagation();

    const [currentVal, maxVal] = element.textContent
      .split(' / ')
      .map(v => parseInt(v.replace(/,/g, '')));

    const input = document.createElement('input');
    input.type = 'number';
    input.min = 0;
    input.max = maxVal;
    input.value = currentVal;

    input.style.width = '120px';
    input.style.padding = '0.4rem';
    input.style.fontSize = '1.1rem';
    input.style.textAlign = 'center';

    element.textContent = '';
    element.appendChild(input);
    input.focus();
    input.select();

    const save = () => {
      let val = Math.max(0, Math.min(parseInt(input.value) || 0, maxVal));
      const percent = Math.round((val / maxVal) * 100);

      if (side === 'attacker') state.attackerHPPercent = percent;
      else state.defenderHPPercent = percent;

      slider.value = percent;
      state.isEditingHP[side] = false;
      updateHPDisplays();
      updateDamages();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') save();
    });
  });
}

export function makeCustomStatEditable(elementId, property) {
  const element = document.getElementById(elementId);

  element.addEventListener('click', (e) => {
    e.stopPropagation();

    const input = document.createElement('input');
    input.type = 'number';
    input.min = 1;
    input.value = element.textContent.replace(/,/g, '');
    input.style.width = '120px';
    input.style.padding = '0.4rem';
    input.style.fontSize = '1.1rem';
    input.style.textAlign = 'center';

    element.textContent = '';
    element.appendChild(input);
    input.focus();
    input.select();

    const save = () => {
      let val = parseInt(input.value) || (property === 'hp' ? 10000 : 100);
      if (property === 'hp') val = Math.max(1000, val);

      if (state.currentDefender?.pokemonId === "custom-doll" && state.currentDefender.customStats) {
        state.currentDefender.customStats[property] = val;
      }

      element.textContent = val.toLocaleString();
      updateDamages();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') save();
    });
  });
}

export function setupLevelSliders() {
  levelSliderAttacker.oninput = (e) => {
    state.attackerLevel = parseInt(e.target.value);
    levelValueAttacker.textContent = state.attackerLevel;
    updateSliderStyle(levelSliderAttacker, state.attackerLevel);
    updateDamages();
  };

  levelSliderDefender.oninput = (e) => {
    state.defenderLevel = parseInt(e.target.value);
    levelValueDefender.textContent = state.defenderLevel;
    updateSliderStyle(levelSliderDefender, state.defenderLevel);
    updateDamages();
  };

  updateSliderStyle(levelSliderAttacker, 15);
  updateSliderStyle(levelSliderDefender, 15);
}

// ── Timer pour les mobs timer-based ──────────────────────────────────────────

/**
 * Convertit des secondes en string "M:SS"
 */
function secsToTimer(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Affiche ou cache le bloc timer/niveau selon que le défenseur est timer-based ou non.
 * Appelé à chaque changement de défenseur.
 */
export function updateDefenderSliderMode() {
  const defender = state.currentDefender;
  const isTimerBased = defender?.timerBased === true;

  const levelBlock = document.getElementById('defenderLevelBlock');
  const timerBlock = document.getElementById('defenderTimerBlock');

  if (!levelBlock || !timerBlock) return;

  if (isTimerBased) {
    levelBlock.style.display = 'none';
    timerBlock.style.display = 'block';
    // Synchro affichage
    const timerSlider = document.getElementById('timerSliderDefender');
    const timerValue  = document.getElementById('timerValueDefender');
    if (timerSlider && timerValue) {
      timerSlider.value = state.defenderTimer;
      timerValue.textContent = secsToTimer(state.defenderTimer);
      updateSliderStyle(timerSlider, 600 - state.defenderTimer); // inversé : 0s = full slider
    }
  } else {
    levelBlock.style.display = 'block';
    timerBlock.style.display = 'none';
  }
}

/**
 * Initialise le slider timer (appelé une fois au démarrage).
 */
export function setupTimerSlider() {
  const timerSlider = document.getElementById('timerSliderDefender');
  const timerValue  = document.getElementById('timerValueDefender');
  if (!timerSlider || !timerValue) return;

  timerSlider.addEventListener('input', (e) => {
    state.defenderTimer = parseInt(e.target.value);
    timerValue.textContent = secsToTimer(state.defenderTimer);
    updateSliderStyle(timerSlider, parseInt(e.target.value));
    updateHPDisplays();
    updateDamages();
  });
}

export function setupHPSliders() {
  document.getElementById('hpSliderAttacker').addEventListener('input', (e) => {
    state.attackerHPPercent = parseInt(e.target.value);
    updateHPDisplays();
    updateDamages();
  });

  document.getElementById('hpSliderDefender').addEventListener('input', (e) => {
    state.defenderHPPercent = parseInt(e.target.value);
    updateHPDisplays();
    updateDamages();
  });
}

export function setupModals() {
  const warningBtn = document.getElementById('warningBtn');
  const warningModal = document.getElementById('warningModal');
  const closeWarning = document.querySelector('.close-warning');

  if (warningBtn) {
    warningBtn.addEventListener('click', () => {
      warningModal.style.display = 'flex';
    });
  }

  if (closeWarning) {
    closeWarning.addEventListener('click', () => {
      warningModal.style.display = 'none';
    });
  }

  if (warningModal) {
    warningModal.addEventListener('click', (e) => {
      if (e.target === warningModal) {
        warningModal.style.display = 'none';
      }
    });
  }
}

export function setupCollapsibleSections() {
  document.querySelectorAll('.additional-effects h3').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      section.classList.toggle('collapsed');
    });
  });

  document.querySelectorAll('.additional-effects').forEach(section => {
    section.classList.add('collapsed');
  });
}