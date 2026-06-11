/**
 * ui-pokemon.js — Pokémon selector, level stepper, XP progress, Team Config UI
 *
 * Handles:
 *  - Pokémon picker grid with search
 *  - Player level stepper + XP progress bar
 *  - Exp. Share toggle (eligibility checked vs ally XP in simulation, ally level otherwise)
 *  - Ally level stepper + Exp. Share eligibility badge
 *  - Enemy level stepper + Catch-Up modifier badge
 *
 * Exposes: window.XPCalcUI (partially — simulation.js also adds to it)
 */

window.XPCalcUI = window.XPCalcUI || {};

(function () {
  'use strict';

  const D = window.XPCalcData;
  const state = window.XPCalcState;
  const $ = id => document.getElementById(id);

  // ─── Pokémon Picker ───────────────────────────────────────────────────────

  /**
   * Build (or rebuild) the Pokémon picker grid, optionally filtered by name.
   * @param {string} filter - substring to match against pokémon names
   */
  function buildPokemonPicker(filter = '') {
    const grid = $('pokemon-picker-grid');
    grid.innerHTML = '';
    const lower = filter.toLowerCase();
    const list = D.PLAYER_POKEMON.filter(p => p.name.toLowerCase().includes(lower));

    list.forEach(poke => {
      const card = document.createElement('div');
      card.className = 'poke-pick-card' + (state.selectedPokemon === poke.name ? ' active' : '');
      card.title = poke.name;

      const img = document.createElement('img');
      img.src = `assets/pokemon/${poke.file}`;
      img.alt = poke.name;
      img.onerror = () => { img.src = 'assets/items/none.png'; };
      img.draggable = false;

      const lbl = document.createElement('span');
      lbl.className = 'poke-pick-name';
      lbl.textContent = poke.name;

      card.appendChild(img);
      card.appendChild(lbl);
      card.addEventListener('click', () => selectPokemon(poke));
      grid.appendChild(card);
    });
  }

  /**
   * Select a Pokémon: update state, refresh avatar display and dependent UI.
   * @param {object} poke - entry from D.PLAYER_POKEMON
   */
  function selectPokemon(poke) {
    state.selectedPokemon = poke.name;
    buildPokemonPicker($('pokemon-search').value);

    const avatar = $('pokemon-avatar');
    const placeholder = $('pokemon-placeholder');
    const circle = $('pokemon-circle');

    avatar.src = `assets/pokemon/${poke.file}`;
    avatar.onerror = () => { avatar.src = 'assets/items/none.png'; };
    avatar.classList.add('visible');
    placeholder.style.display = 'none';
    circle.classList.add('selected');

    $('pokemon-name-display').textContent = poke.name;
    updateXPProgress();
    updateCatchUpDisplay();
  }

  // ─── Player level & XP progress ───────────────────────────────────────────

  /** Sync the level display and all dependent UI after a level change. */
  function updateLevelDisplay() {
    $('lvl-display').textContent = state.startLevel;
    updateXPProgress();
    updateCatchUpDisplay();
    updateAllyExpShareDisplay();
  }

  /**
   * Refresh the XP progress bar and labels in the top section
   * based on state.startLevel and the selected Pokémon's XP table.
   */
  function updateXPProgress() {
    const lvl = state.startLevel;
    const startXP = D.getStartXPForLevel(lvl);
    const pct = D.getLevelProgressPct(startXP);
    const toNext = D.getXPToNextLevel(startXP);

    $('current-xp-display').textContent = startXP;
    $('xp-prog-bar').style.width = pct + '%';
    $('xp-level-display').textContent = `Lv. ${lvl}`;
    $('xp-to-next-label').textContent = lvl >= 15
      ? 'Max level reached!'
      : `${toNext} XP to next level`;
    $('lvl-xp-fraction').textContent = lvl >= 15
      ? 'MAX'
      : `0 / ${D.LEVEL_UP_XP[lvl - 1] || '-'} XP`;
  }

  // ─── Catch-Up / Enemy ────────────────────────────────────────────────────

  /**
   * Refresh the Catch-Up modifier badge and detail text
   * based on state.startLevel vs state.enemyHighestLevel.
   */
  function updateCatchUpDisplay() {
    const myLevel = state.startLevel;
    const enemyLevel = state.enemyHighestLevel;
    const mult = D.getCatchUpModifier(myLevel, enemyLevel);
    const levelsAhead = enemyLevel - myLevel;

    const badge = $('catchup-badge');
    const detail = $('catchup-detail');
    if (!badge || !detail) return;

    if (levelsAhead >= 2) {
      badge.textContent = `+${Math.round((mult - 1) * 100)}% Catch-Up`;
      badge.className = 'catchup-badge active';
      detail.textContent = `Enemy Lv.${enemyLevel} · ${levelsAhead} levels ahead → ×${mult.toFixed(2)} on Base XP`;
    } else if (levelsAhead === 1) {
      badge.textContent = 'Catch-Up: 1 lvl (no bonus)';
      badge.className = 'catchup-badge inactive';
      detail.textContent = 'At least 2 level gap required to activate the modifier.';
    } else {
      badge.textContent = 'Catch-Up: Inactive';
      badge.className = 'catchup-badge inactive';
      detail.textContent = `Your level (${myLevel}) ≥ enemy level (${enemyLevel}) — no modifier.`;
    }
  }

  // ─── Ally & Exp. Share ────────────────────────────────────────────────────

  /**
   * Determine if the Exp. Share bonus is currently active.
   *
   * Outside of simulation: compare player level vs ally level.
   * During simulation: the simulation.js tick passes live XP values instead.
   *
   * Exp. Share (item lv 20+) = +5 XP/sec when the holder has
   * strictly fewer total XP than every ally on the team.
   *
   * @param {number} [playerXP] - override with live XP (used during simulation)
   * @param {number} [allyXP]   - override with live ally XP (used during simulation)
   * @returns {boolean}
   */
  function isExpShareActive(playerXP, allyXP) {
    if (!state.expShareEnabled) return false;

    if (playerXP !== undefined && allyXP !== undefined) {
      // Simulation mode: compare raw XP totals
      return playerXP < allyXP;
    }

    // Static mode: compare starting levels as a proxy
    return D.getStartXPForLevel(state.startLevel) < D.getStartXPForLevel(state.allyStartLevel);
  }

  /**
   * Update the Exp. Share eligibility badge in the ally block.
   * Called whenever player level, ally level, or toggle state changes.
   */
  function updateAllyExpShareDisplay() {
    const badge = $('ally-expshare-badge');
    if (!badge) return;

    if (!state.expShareEnabled) {
      badge.textContent = 'Exp. Share: Off';
      badge.className = 'ally-badge inactive';
      return;
    }

    const active = isExpShareActive();
    if (active) {
      const playerXP = D.getStartXPForLevel(state.startLevel);
      const allyXP   = D.getStartXPForLevel(state.allyStartLevel);
      badge.textContent = `+5 XP/sec active (${playerXP} < ${allyXP} XP)`;
      badge.className = 'ally-badge active';
    } else {
      const playerXP = D.getStartXPForLevel(state.startLevel);
      const allyXP   = D.getStartXPForLevel(state.allyStartLevel);
      badge.textContent = `Inactive (${playerXP} ≥ ${allyXP} XP)`;
      badge.className = 'ally-badge inactive';
    }
  }

  // ─── Wild Grid ────────────────────────────────────────────────────────────

  /**
   * Render the wild Pokémon card grid for a given map.
   * XP shown on each card is based on the current start timer.
   * @param {string} mapId
   */
  function renderWildGrid(mapId) {
    const grid = $('wild-grid');
    grid.innerHTML = '';

    // ── Player KO card (always first) ──────────────────────────────────────
    const koCard = document.createElement('div');
    koCard.className = 'wild-card playerko-card';

    const koIcon = document.createElement('div');
    koIcon.className = 'playerko-card-icon';
    koIcon.textContent = '⚔️';

    const koName = document.createElement('div');
    koName.className = 'wild-card-name';
    koName.textContent = 'Player KO';

    const koXp = document.createElement('div');
    koXp.className = 'wild-card-xp';
    koXp.textContent = 'Variable XP';

    const koBtn = document.createElement('button');
    koBtn.className = 'wild-card-add-btn';
    koBtn.textContent = '+ Add';
    koBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.XPCalcQueue.openPlayerKOModal();
    });

    koCard.appendChild(koIcon);
    koCard.appendChild(koName);
    koCard.appendChild(koXp);
    koCard.appendChild(koBtn);
    koCard.addEventListener('click', () => window.XPCalcQueue.openPlayerKOModal());
    grid.appendChild(koCard);
    // ───────────────────────────────────────────────────────────────────────

    const pokemons = D.WILD_DATA[mapId] || [];

    pokemons.forEach(poke => {
      const card = document.createElement('div');
      card.className = 'wild-card';

      const imgEl = document.createElement('img');
      imgEl.className = 'wild-card-img';
      imgEl.src = poke.img;
      imgEl.alt = poke.name;
      imgEl.onerror = () => { imgEl.src = 'assets/items/none.png'; };
      imgEl.draggable = false;

      const nameEl = document.createElement('div');
      nameEl.className = 'wild-card-name';
      nameEl.textContent = poke.name;

      const startTimer = _getStartTimerStr();
      const xp = D.getWildXP(poke.id, mapId, startTimer);
      const xpEl = document.createElement('div');
      xpEl.className = 'wild-card-xp';
      xpEl.textContent = `~${xp} XP`;

      const addBtn = document.createElement('button');
      addBtn.className = 'wild-card-add-btn';
      addBtn.textContent = '+ Add Kill';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.XPCalcQueue.openKillModal(poke, mapId);
      });

      card.appendChild(imgEl);
      card.appendChild(nameEl);
      card.appendChild(xpEl);
      card.appendChild(addBtn);
      card.addEventListener('click', () => window.XPCalcQueue.openKillModal(poke, mapId));
      grid.appendChild(card);
    });
  }

  /** Read the start timer inputs and return as "MM:SS" string. */
  function _getStartTimerStr() {
    const m = _safeInt('start-min', 10);
    const s = _safeInt('start-sec', 0);
    return D.secondsToTimer(m * 60 + s);
  }

  function _safeInt(id, fallback) {
    const v = parseInt(document.getElementById(id)?.value);
    return isNaN(v) ? fallback : v;
  }

  // ─── XP Reference Table ───────────────────────────────────────────────────

  /**
   * Render the wild Pokémon XP reference table for the given map.
   * Highlights the 2:00 row (Groudon mid-game marker).
   * @param {string} mapId
   */
  function renderXPTable(mapId) {
    const pokemons = D.WILD_DATA[mapId] || [];
    const thead = $('xp-table-head');
    const tbody = $('xp-table-body');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const timerSet = new Set();
    pokemons.forEach(p => p.data.forEach(d => timerSet.add(d.timer)));
    const timers = Array.from(timerSet).sort((a, b) => D.timerToSeconds(b) - D.timerToSeconds(a));

    // Header row
    const headerRow = document.createElement('tr');
    const timerTh = document.createElement('th');
    timerTh.className = 'col-timer';
    timerTh.textContent = 'Timer';
    headerRow.appendChild(timerTh);

    pokemons.forEach(p => {
      const th = document.createElement('th');
      th.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;min-width:80px">
          <img src="${p.img}" style="width:28px;height:28px;object-fit:contain;" onerror="this.src='assets/items/none.png'" draggable="false">
          <span>${p.name}</span>
          ${p.aeosBalls ? `<span style="color:var(--yellow);font-size:0.6rem">⚡${p.aeosBalls} balls</span>` : ''}
        </div>`;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Data rows
    timers.forEach(timer => {
      const tr = document.createElement('tr');
      if (timer === '2:00') tr.classList.add('row-highlight');

      const tdTimer = document.createElement('td');
      tdTimer.className = 'col-timer';
      const timerSec = D.timerToSeconds(timer);
      tdTimer.innerHTML = timerSec > 480
        ? `${timer}<br><span style="font-size:0.65rem;color:var(--blue);opacity:0.7">4xp/s</span>`
        : `${timer}<br><span style="font-size:0.65rem;color:var(--orange);opacity:0.7">6xp/s</span>`;
      tr.appendChild(tdTimer);

      pokemons.forEach(p => {
        const td = document.createElement('td');
        const entry = p.data.find(d => d.timer === timer);
        td.textContent = entry ? entry.xp : '-';
        if (entry) {
          const xp = entry.xp;
          if (xp >= 500)      td.style.color = 'var(--red)';
          else if (xp >= 200) td.style.color = 'var(--orange)';
          else if (xp >= 100) td.style.color = 'var(--yellow)';
          else                td.style.color = 'var(--green)';
        } else {
          td.style.color = 'var(--text-dim)';
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  // ─── Event bindings ───────────────────────────────────────────────────────

  /** Bind all Pokémon picker + Team Config DOM events. Called once from main.js. */
  function bindEvents() {
    $('pokemon-search').addEventListener('input', e => buildPokemonPicker(e.target.value));

    // Player level
    $('lvl-minus').addEventListener('click', () => {
      if (state.startLevel > 1) { state.startLevel--; updateLevelDisplay(); }
    });
    $('lvl-plus').addEventListener('click', () => {
      if (state.startLevel < 15) { state.startLevel++; updateLevelDisplay(); }
    });

    // Exp. Share toggle
    $('exp-share-toggle').addEventListener('change', e => {
      state.expShareEnabled = e.target.checked;
      updateAllyExpShareDisplay();
    });

    // Ally level stepper
    $('ally-lvl-minus').addEventListener('click', () => {
      if (state.allyStartLevel > 1) {
        state.allyStartLevel--;
        $('ally-lvl-display').textContent = state.allyStartLevel;
        updateAllyExpShareDisplay();
      }
    });
    $('ally-lvl-plus').addEventListener('click', () => {
      if (state.allyStartLevel < 15) {
        state.allyStartLevel++;
        $('ally-lvl-display').textContent = state.allyStartLevel;
        updateAllyExpShareDisplay();
      }
    });

    // Enemy level stepper
    $('enemy-lvl-minus').addEventListener('click', () => {
      if (state.enemyHighestLevel > 1) {
        state.enemyHighestLevel--;
        $('enemy-lvl-display').textContent = state.enemyHighestLevel;
        updateCatchUpDisplay();
      }
    });
    $('enemy-lvl-plus').addEventListener('click', () => {
      if (state.enemyHighestLevel < 15) {
        state.enemyHighestLevel++;
        $('enemy-lvl-display').textContent = state.enemyHighestLevel;
        updateCatchUpDisplay();
      }
    });

    // Enemy starting level stepper (for sim track)
    $('enemy-start-lvl-minus').addEventListener('click', () => {
      if (state.enemyStartLevel > 1) {
        state.enemyStartLevel--;
        $('enemy-start-lvl-display').textContent = state.enemyStartLevel;
      }
    });
    $('enemy-start-lvl-plus').addEventListener('click', () => {
      if (state.enemyStartLevel < 15) {
        state.enemyStartLevel++;
        $('enemy-start-lvl-display').textContent = state.enemyStartLevel;
      }
    });

    // Map pills (wild grid)
    document.querySelectorAll('[data-map]').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.map-pills');
        if (!group) return;
        group.querySelectorAll('.map-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const map = btn.dataset.map;
        if (btn.closest('.wild-panel') || btn.closest('.events-section')) {
          state.currentMap = map;
          renderWildGrid(map);
        }
      });
    });

    // Map pills (XP table)
    document.querySelectorAll('[data-map-table]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-map-table]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.tableMap = btn.dataset.mapTable;
        renderXPTable(state.tableMap);
      });
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  Object.assign(window.XPCalcUI, {
    buildPokemonPicker,
    selectPokemon,
    updateLevelDisplay,
    updateXPProgress,
    updateCatchUpDisplay,
    updateAllyExpShareDisplay,
    isExpShareActive,
    renderWildGrid,
    renderXPTable,
    bindEvents,
  });
})();