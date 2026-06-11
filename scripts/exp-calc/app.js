(function() {
  'use strict';

  const D = window.XPCalcData;

  const state = {
    selectedPokemon: null,
    startLevel: 1,
    currentMap: 'groudon',
    tableMap: 'groudon',
    killQueue: [],
    simulation: null,
    // Enemy main config (for catch-up modifier)
    enemyHighestLevel: 1,
    // Ally config (for Exp. Share)
    allyLevel: 1,
    expShareEnabled: false,
  };

  const $ = id => document.getElementById(id);

  function init() {
    buildPokemonPicker();
    bindEvents();
    renderWildGrid(state.currentMap);
    renderXPTable(state.tableMap);
    updateXPProgress();
    updateCatchUpDisplay();
    updateAllyExpShareDisplay();
    renderPresetChips();
  }

  // ─── Pokemon Picker ────────────────────────────────────────────────────────

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

  function updateLevelDisplay() {
    $('lvl-display').textContent = state.startLevel;
    updateXPProgress();
    updateCatchUpDisplay();
    updateAllyExpShareDisplay();
  }

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

  // ─── Catch-Up / Enemy Config ───────────────────────────────────────────────

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
      detail.textContent = `At least 2 level gap required to activate the modifier.`;
    } else {
      badge.textContent = 'Catch-Up: Inactive';
      badge.className = 'catchup-badge inactive';
      detail.textContent = `Your level (${myLevel}) ≥ enemy level (${enemyLevel}) - no modifier.`;
    }
  }

  // ─── Ally / Exp. Share ────────────────────────────────────────────────────

  /**
   * Exp. Share: +5 XP/sec (item level 20+, fixed at max tier)
   * Condition: the holder must be the LOWEST level on the team.
   * We compare state.startLevel (player) vs state.allyLevel.
   */
  function isExpShareActive() {
    if (!state.expShareEnabled) return false;
    // Exp. Share holder = this Pokémon (state.startLevel)
    // It gains 5 XP/sec when it is the lowest level on the team.
    return state.startLevel <= state.allyLevel;
  }

  function updateAllyExpShareDisplay() {
    const badge = $('ally-expshare-badge');
    if (!badge) return;

    if (!state.expShareEnabled) {
      badge.textContent = 'Exp. Share: Off';
      badge.className = 'ally-badge inactive';
      return;
    }

    if (isExpShareActive()) {
      badge.textContent = `+5 XP/sec active (Lv.${state.startLevel} ≤ ally Lv.${state.allyLevel})`;
      badge.className = 'ally-badge active';
    } else {
      badge.textContent = `Inactive (Lv.${state.startLevel} > ally Lv.${state.allyLevel})`;
      badge.className = 'ally-badge inactive';
    }
  }

  // ─── Farm Rota Presets ────────────────────────────────────────────────────

  const PRESETS_KEY = 'xpcalc_farm_presets';

  function loadPresets() {
    try {
      return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]');
    } catch { return []; }
  }

  function savePresets(presets) {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  }

  function renderPresetChips() {
    const container = $('preset-chips');
    const emptyHint = $('preset-empty-hint');
    if (!container) return;
    const presets = loadPresets();

    // Clear old chips (keep empty hint)
    Array.from(container.querySelectorAll('.preset-chip')).forEach(c => c.remove());

    if (presets.length === 0) {
      if (emptyHint) emptyHint.style.display = '';
      return;
    }
    if (emptyHint) emptyHint.style.display = 'none';

    presets.forEach((preset, idx) => {
      const chip = document.createElement('div');
      chip.className = 'preset-chip';

      const nameBtn = document.createElement('button');
      nameBtn.className = 'preset-chip-name';
      nameBtn.textContent = preset.name;
      nameBtn.title = `Load "${preset.name}" (${preset.queue.length} events)`;
      nameBtn.addEventListener('click', () => loadPreset(idx));

      const delBtn = document.createElement('button');
      delBtn.className = 'preset-chip-del';
      delBtn.textContent = '✕';
      delBtn.title = `Delete "${preset.name}"`;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deletePreset(idx);
      });

      chip.appendChild(nameBtn);
      chip.appendChild(delBtn);
      container.appendChild(chip);
    });
  }

  function loadPreset(idx) {
    const presets = loadPresets();
    if (!presets[idx]) return;
    state.killQueue = presets[idx].queue.map(e => ({ ...e }));
    renderKillQueue();
  }

  function deletePreset(idx) {
    const presets = loadPresets();
    presets.splice(idx, 1);
    savePresets(presets);
    renderPresetChips();
  }

  function openPresetSaveModal() {
    const input = $('preset-name-input');
    if (input) input.value = '';

    const summary = $('preset-save-summary');
    if (summary) {
      const n = state.killQueue.length;
      summary.innerHTML = n === 0
        ? '<span style="color:var(--text-dim);font-size:0.85rem;">⚠️ Your Kill Queue is empty — nothing to save.</span>'
        : `<span style="color:var(--text-dim);font-size:0.85rem;">Saving <strong style="color:var(--text)">${n} event${n > 1 ? 's' : ''}</strong> from the current Kill Queue.</span>`;
    }

    $('preset-save-modal').style.display = 'flex';
    if (input) setTimeout(() => input.focus(), 50);
  }

  function confirmSavePreset() {
    const input = $('preset-name-input');
    const name = (input ? input.value.trim() : '') || 'Unnamed';
    if (state.killQueue.length === 0) {
      $('preset-save-modal').style.display = 'none';
      return;
    }
    const presets = loadPresets();
    presets.push({ name, queue: state.killQueue.map(e => ({ ...e })) });
    savePresets(presets);
    renderPresetChips();
    $('preset-save-modal').style.display = 'none';
  }

  function showInfoPopup(name, info) {
    const existing = document.getElementById('info-popup-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'info-popup-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';

    const box = document.createElement('div');
    box.className = 'modal-box wide';
    box.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">ℹ️ ${name}</span>
        <button class="modal-close" id="info-popup-close">✕</button>
      </div>
      <div class="modal-body" style="white-space:pre-wrap;line-height:1.7;color:var(--text);">${info}</div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    box.querySelector('#info-popup-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  }

  // ─── Wild Grid ────────────────────────────────────────────────────────────

  function renderWildGrid(mapId) {
    const grid = $('wild-grid');
    grid.innerHTML = '';
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

      const startTimer = getStartTimerStr();
      const xp = D.getWildXP(poke.id, mapId, startTimer);
      const xpEl = document.createElement('div');
      xpEl.className = 'wild-card-xp';
      xpEl.textContent = `~${xp} XP`;

      const addBtn = document.createElement('button');
      addBtn.className = 'wild-card-add-btn';
      addBtn.textContent = '+ Add Kill';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openKillModal(poke, mapId);
      });

      card.appendChild(imgEl);
      card.appendChild(nameEl);
      card.appendChild(xpEl);
      card.appendChild(addBtn);

      card.addEventListener('click', () => openKillModal(poke, mapId));
      grid.appendChild(card);
    });
  }

  function getStartTimerStr() {
    const m = safeInt('start-min', 10);
    const s = safeInt('start-sec', 0);
    return D.secondsToTimer(m * 60 + s);
  }

  // ─── Wild Kill Modal ──────────────────────────────────────────────────────

  let killModalTarget = null;
  let killModalMap = null;

  function openKillModal(poke, mapId) {
    killModalTarget = poke;
    killModalMap = mapId;

    $('kill-modal-title').textContent = `Add Kill - ${poke.name}`;
    $('kill-modal-img').src = poke.img;
    $('kill-modal-name').textContent = poke.name;

    // Si une simulation est active, pré-remplir avec le timer courant de la sim
    if (simState && $('result-advanced').style.display !== 'none') {
      const curM = Math.floor(simState.currentSec / 60);
      const curS = simState.currentSec % 60;
      $('kill-min').value = curM;
      $('kill-sec').value = curS;
    } else {
      const startM = safeInt('start-min', 10);
      const startS = safeInt('start-sec', 0);
      $('kill-min').value = startM;
      $('kill-sec').value = startS;
    }

    $('allies-count').textContent = '0';

    // Hide allies field for fixedXP mobs (Regi/bosses)
    const alliesFieldGroup = document.getElementById('allies-count').closest('.field-group');
    if (alliesFieldGroup) alliesFieldGroup.style.display = killModalTarget.fixedXP ? 'none' : '';

    // Fixed-XP notice
    let fxn = document.getElementById('kill-modal-fixed-xp-notice');
    if (!fxn) {
      fxn = document.createElement('div');
      fxn.id = 'kill-modal-fixed-xp-notice';
      fxn.className = 'fixed-xp-notice';
      fxn.textContent = '✔ XP is shared equally — everyone on the team always receives 60% of the base value regardless of last hit.';
      const footer = document.getElementById('kill-modal').querySelector('.modal-footer');
      footer.parentNode.insertBefore(fxn, footer);
    }
    fxn.style.display = killModalTarget.fixedXP ? '' : 'none';

    updateKillModalXP();
    $('kill-modal').style.display = 'flex';
  }

  function updateKillModalXP() {
    if (!killModalTarget) return;
    const m = parseInt($('kill-min').value) || 0;
    const s = parseInt($('kill-sec').value) || 0;
    const timer = D.secondsToTimer(m * 60 + s);
    const allies = parseInt($('allies-count').textContent) || 0;
    let xp = D.getWildXP(killModalTarget.id, killModalMap, timer);
    // fixedXP mobs (Regi/bosses) always give 60% - allies sharing doesn't apply
    if (!killModalTarget.fixedXP && allies > 0) {
      xp = Math.floor(xp / (allies + 1) * 1.2);
    }
    $('kill-xp-preview').textContent = `${xp} XP`;
    $('kill-xp-preview').dataset.xp = xp;
  }

  // ─── Player KO Modal ─────────────────────────────────────────────────────

  function getPlayerKOStreakNumber() {
    return parseInt($('pko-streak').value) || 0;
  }

  function getPlayerKOAlliesNearby() {
    return parseInt($('pko-allies-count').textContent) || 0;
  }

  function isPlayerKOer() {
    const r = document.querySelector('input[name="pko-role"]:checked');
    return !r || r.value === 'koer';
  }

  function updatePlayerKOPreview() {
    const victimLevel = parseInt($('pko-victim-level').value) || 1;
    const streakNumber = getPlayerKOStreakNumber();
    const isKoer = isPlayerKOer();
    const alliesNearby = getPlayerKOAlliesNearby();
    const applyCatchUp = $('pko-apply-catchup').checked;

    const myLevel = state.startLevel;
    const opponentHighestLevel = state.enemyHighestLevel;

    const xp = D.calculatePlayerKOXP({
      victimLevel,
      streakNumber,
      killerLevel: myLevel,
      myLevel,
      opponentHighestLevel,
      isKoer,
      alliesNearby,
      applyCatchUp,
    });

    const baseXP = D.KO_BASE_XP[Math.min(victimLevel - 1, 14)];
    const streakMult = D.getStreakModifier(streakNumber);
    const levelDiffMult = D.getKOLevelDiffModifier(myLevel, victimLevel);
    const catchUpMult = applyCatchUp ? D.getCatchUpModifier(myLevel, opponentHighestLevel) : 1.0;
    const proximityMult = D.getProximityXPMultiplier(isKoer, alliesNearby);

    let breakdownParts = [
      `Base: ${baseXP}`,
      streakMult !== 1 ? `Streak ×${streakMult.toFixed(2)}` : null,
      levelDiffMult !== 1 ? `Lvl. diff ×${levelDiffMult.toFixed(2)}` : null,
      !isKoer ? `Proximity ×${proximityMult.toFixed(4).replace(/\.?0+$/, '')}` : null,
      applyCatchUp && catchUpMult !== 1 ? `Catch-Up ×${catchUpMult.toFixed(2)}` : null,
    ].filter(Boolean);

    $('pko-xp-preview').textContent = `${xp} XP`;
    $('pko-xp-preview').dataset.xp = xp;
    $('pko-breakdown').textContent = breakdownParts.join(' · ');

    // Update ally pct label
    const allyPct = $('pko-ally-pct');
    if (allyPct) {
      if (alliesNearby === 0) {
        allyPct.textContent = '—';
      } else {
        const pct = D.PROXIMITY_XP_SHARE[Math.min(alliesNearby, 4)];
        allyPct.textContent = `${Math.round(pct * 10000) / 100}% XP`;
      }
    }

    // Update allies hint
    const hint = $('pko-allies-hint');
    if (hint) {
      if (alliesNearby === 0) hint.textContent = '0 = solo KO';
      else hint.textContent = `${alliesNearby} ally${alliesNearby > 1 ? 'ies' : ''} nearby`;
    }

    const catchUpWarn = $('pko-catchup-warn');
    if (catchUpWarn) {
      catchUpWarn.style.display = applyCatchUp ? 'flex' : 'none';
    }
  }

  function openPlayerKOModal() {
    // Si une simulation est active, pré-remplir avec le timer courant de la sim
    if (simState && $('result-advanced').style.display !== 'none') {
      const curM = Math.floor(simState.currentSec / 60);
      const curS = simState.currentSec % 60;
      $('pko-min').value = curM;
      $('pko-sec').value = curS;
    } else {
      const startM = safeInt('start-min', 10);
      const startS = safeInt('start-sec', 0);
      $('pko-min').value = startM;
      $('pko-sec').value = startS;
    }

    $('pko-victim-level').value = Math.min(state.startLevel + 1, 15);
    $('pko-streak').value = 0;
    $('pko-allies-count').textContent = '0';
    const koerRadio = document.getElementById('pko-role-koer');
    if (koerRadio) koerRadio.checked = true;
    $('pko-apply-catchup').checked = false;

    updatePlayerKOPreview();
    $('player-ko-modal').style.display = 'flex';
  }

  // ─── Kill Queue ───────────────────────────────────────────────────────────

  let editingIdx = null;

  function addKillToQueue(entry) {
    if (editingIdx !== null) {
      state.killQueue[editingIdx] = entry;
      editingIdx = null;
    } else {
      state.killQueue.push(entry);
    }
    renderKillQueue();

    // ── Injection live dans la simulation avancée ──
    if (simState && $('result-advanced').style.display !== 'none') {
      const enriched = { ...entry, timerSec: D.timerToSeconds(entry.timer) };

      if (enriched.timerSec <= simState.currentSec) {
        // Le timer n'est pas encore passé dans la sim → on l'injecte
        simState.events.push(enriched);
        const label = entry.name || (entry.type === 'playerko' ? 'Player KO' : 'Score');
        addSimLog(
          simState.currentSec,
          `➕ Added : ${label} @ ${entry.timer}`,
          null,
          false
        );
      } else {
        // Le timer est déjà passé → on prévient
        const label = entry.name || (entry.type === 'playerko' ? 'Player KO' : 'Score');
        addSimLog(
          simState.currentSec,
          `⚠️ ${label} @ ${entry.timer} — timer déjà passé, non pris en compte`,
          null,
          false
        );
      }
    }
  }

  function removeFromQueue(idx) {
    state.killQueue.splice(idx, 1);
    renderKillQueue();
  }

  function duplicateQueueEntry(idx) {
    const clone = { ...state.killQueue[idx] };
    state.killQueue.splice(idx + 1, 0, clone);
    renderKillQueue();
  }

  function editQueueEntry(idx) {
    const entry = state.killQueue[idx];
    editingIdx = idx;

    if (entry.type === 'wild') {
      const mapData = D.WILD_DATA[state.currentMap] || [];
      let poke = mapData.find(p => p.id === entry.id);
      if (!poke) poke = { id: entry.id, name: entry.name, img: entry.img };
      killModalTarget = poke;
      killModalMap = state.currentMap;

      $('kill-modal-title').textContent = `Edit Kill - ${poke.name}`;
      $('kill-modal-img').src = poke.img;
      $('kill-modal-name').textContent = poke.name;

      const timerSec = D.timerToSeconds(entry.timer);
      $('kill-min').value = Math.floor(timerSec / 60);
      $('kill-sec').value = timerSec % 60;
      $('allies-count').textContent = String(entry.allies || 0);

      $('kill-modal-confirm').textContent = '✎ Save Changes';
      updateKillModalXP();
      $('kill-modal').style.display = 'flex';

    } else if (entry.type === 'playerko') {
      const timerSec = D.timerToSeconds(entry.timer);
      $('pko-min').value = Math.floor(timerSec / 60);
      $('pko-sec').value = timerSec % 60;
      $('pko-victim-level').value = entry.victimLevel;
      $('pko-streak').value = entry.streakNumber;
      $('pko-allies-count').textContent = String(entry.alliesNearby || 0);
      const roleRadio = document.getElementById(entry.isKoer === false ? 'pko-role-ally' : 'pko-role-koer');
      if (roleRadio) roleRadio.checked = true;
      $('pko-apply-catchup').checked = !!entry.applyCatchUp;

      $('pko-modal-confirm').textContent = '✎ Save Changes';
      updatePlayerKOPreview();
      $('player-ko-modal').style.display = 'flex';

    } else if (entry.type === 'score') {
      const timerSec = D.timerToSeconds(entry.timer);
      $('score-min').value = Math.floor(timerSec / 60);
      $('score-sec').value = timerSec % 60;
      $('score-pts').value = entry.points;
      editingIdx = null;
      state.killQueue[idx] = {
        ...entry,
        timer: D.secondsToTimer(timerSec),
        xp: D.getScoringXP(entry.points),
      };
      state.killQueue.splice(idx, 1);
      editingIdx = idx;
      renderKillQueue();
    }
  }

  function makeKerBtn(text, title, cls, onClick) {
    const btn = document.createElement('button');
    btn.className = `ker-remove ${cls}`;
    btn.textContent = text;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderKillQueue() {
    const list = $('kill-queue-list');
    list.innerHTML = '';

    if (state.killQueue.length === 0) {
      list.innerHTML = '<div class="empty-queue-hint">Add wild Pokémon kills, player KOs or scoring events below.</div>';
      return;
    }

    state.killQueue.forEach((entry, idx) => {
      const row = document.createElement('div');
      const isEditing = editingIdx === idx;
      if (isEditing) row.style.outline = '1px solid var(--blue)';

      const actions = document.createElement('div');
      actions.className = 'ker-actions';
      actions.appendChild(makeKerBtn('✎', 'Edit', 'ker-edit', () => editQueueEntry(idx)));
      actions.appendChild(makeKerBtn('⧉', 'Duplicate', 'ker-dupe', () => duplicateQueueEntry(idx)));
      actions.appendChild(makeKerBtn('✕', 'Remove', '', () => removeFromQueue(idx)));

      if (entry.type === 'playerko') {
        row.className = 'kill-event-row playerko-row';
        const info = document.createElement('div');
        info.className = 'ker-info';
        info.innerHTML = `
          <div class="ker-name">⚔️ Player KO${entry.isKoer === false ? ' <span class="ker-assist-tag">ALLY</span>' : ''}</div>
          <div class="ker-meta">⏱ ${entry.timer} · Victim Lv.${entry.victimLevel} · Streak ${entry.streakNumber >= 0 ? '+' : ''}${entry.streakNumber}${entry.alliesNearby > 0 ? ` · ${entry.alliesNearby} ally${entry.alliesNearby > 1 ? 'ies' : ''} nearby` : ''}</div>
        `;
        const xpEl = document.createElement('div');
        xpEl.className = 'ker-xp';
        xpEl.textContent = `+${entry.xp}`;
        row.appendChild(info);
        row.appendChild(xpEl);
        row.appendChild(actions);

      } else if (entry.type === 'wild') {
        row.className = 'kill-event-row';
        const img = document.createElement('img');
        img.className = 'ker-img';
        img.src = entry.img;
        img.onerror = () => { img.src = 'assets/items/none.png'; };
        img.draggable = false;
        const info = document.createElement('div');
        info.className = 'ker-info';
        info.innerHTML = `
          <div class="ker-name">${entry.name}</div>
          <div class="ker-meta">⏱ ${entry.timer}${entry.allies > 0 ? ` · ${entry.allies + 1} players` : ''}</div>
        `;
        const xpEl = document.createElement('div');
        xpEl.className = 'ker-xp';
        xpEl.textContent = `+${entry.xp}`;
        row.appendChild(img);
        row.appendChild(info);
        row.appendChild(xpEl);
        row.appendChild(actions);

      } else if (entry.type === 'score') {
        row.className = 'kill-event-row score-row';
        const info = document.createElement('div');
        info.className = 'ker-info';
        info.innerHTML = `
          <div class="ker-name">🏆 Scoring</div>
          <div class="ker-meta">⏱ ${entry.timer} · ${entry.points} pts</div>
        `;
        const xpEl = document.createElement('div');
        xpEl.className = 'ker-xp';
        xpEl.textContent = `+${entry.xp}`;
        row.appendChild(info);
        row.appendChild(xpEl);
        row.appendChild(actions);
      }

      list.appendChild(row);
    });
  }

  // ─── Calculation ──────────────────────────────────────────────────────────

  function safeInt(id, fallback) {
    const v = parseInt($(id).value);
    return isNaN(v) ? fallback : v;
  }

  function buildEvents() {
    const startM = safeInt('start-min', 10);
    const startS = safeInt('start-sec', 0);
    const durM   = safeInt('dur-min', 10);
    const durS   = safeInt('dur-sec', 0);

    const startSec = startM * 60 + startS;
    const durationSec = durM * 60 + durS;
    const endSec = Math.max(0, startSec - durationSec);

    const events = state.killQueue.map(e => ({
      ...e,
      timerSec: D.timerToSeconds(e.timer),
    })).filter(e => e.timerSec <= startSec && e.timerSec >= endSec);

    events.sort((a, b) => b.timerSec - a.timerSec);

    return { events, startSec, endSec };
  }

  function calculatePassiveXP(startSec, endSec, getLevel) {
    const boundary = 8 * 60;
    let total = 0;

    for (let t = startSec - 1; t >= endSec; t--) {
      const rate = t >= boundary ? 4 : 6;
      const level = getLevel(t);
      const catchupMult = D.getCatchUpModifier(level, state.enemyHighestLevel);
      let tickXP = Math.floor(rate * catchupMult);
      // Exp. Share: +5 XP/sec when holder is lowest level (compare against ally level snapshot)
      if (state.expShareEnabled && level <= state.allyLevel) {
        tickXP += 5;
      }
      total += tickXP;
    }

    return total;
  }

  function calculateClassic() {
    const { events, startSec, endSec } = buildEvents();

    const startXPVal = D.getStartXPForLevel(state.startLevel);
    const sortedEvents = [...events].sort((a, b) => b.timerSec - a.timerSec);

    const levelAtSec = (sec) => {
      let xp = startXPVal;
      for (const ev of sortedEvents) {
        if (ev.timerSec > sec) xp = Math.min(xp + ev.xp, D.LEVEL_XP_TABLE[14]);
      }
      return D.getLevelFromXP(xp);
    };

    const passiveTotal = calculatePassiveXP(startSec, endSec, levelAtSec);

    let totalXP = startXPVal;
    let eventXP = 0;
    events.forEach(e => { eventXP += e.xp; });

    totalXP += passiveTotal + eventXP;
    totalXP = Math.min(totalXP, D.LEVEL_XP_TABLE[14]);

    return { totalXP, passiveTotal, eventXP, events, startSec, endSec };
  }

  function showClassicResult() {
    const { totalXP, passiveTotal, eventXP, events, startSec, endSec } = calculateClassic();
    const startXP = D.getStartXPForLevel(state.startLevel);
    const gained = totalXP - startXP;
    const finalLevel = D.getLevelFromXP(totalXP);
    const remaining = D.getXPToNextLevel(totalXP);

    $('res-total-xp').textContent = gained.toLocaleString();
    $('res-final-level').textContent = finalLevel;
    $('res-remaining-xp').textContent = finalLevel >= 15 ? 'MAX' : remaining.toLocaleString();

    const breakdown = $('result-breakdown');
    breakdown.innerHTML = '';

    const durationSec = startSec - endSec;
    const boundary = 8 * 60;
    const catchupMult = D.getCatchUpModifier(state.startLevel, state.enemyHighestLevel);
    const catchupNote = catchupMult > 1.0 ? ` · Catch-Up ×${catchupMult.toFixed(2)}` : '';
    let passiveDesc = '';
    if (startSec > boundary && endSec < boundary) {
      passiveDesc = `(4/sec → 6/sec, mixed${catchupNote})`;
    } else if (endSec >= boundary) {
      passiveDesc = `(4 XP/sec × ${durationSec}s${catchupNote})`;
    } else {
      passiveDesc = `(6 XP/sec × ${durationSec}s${catchupNote})`;
    }
    if (state.expShareEnabled && state.startLevel <= state.allyLevel) {
      passiveDesc += ' · +5/sec Exp. Share';
    }
    addBreakdownRow(breakdown, '⏱', null, 'Passive XP', passiveDesc, passiveTotal);

    events.forEach(ev => {
      let label, meta;
      if (ev.type === 'score') {
        label = `🏆 Score (${ev.points} pts)`;
        meta = `@ ${ev.timer}`;
      } else if (ev.type === 'playerko') {
        label = `⚔️ Player KO${ev.isAssist ? ' (Assist)' : ''}`;
        meta = `@ ${ev.timer} · Victim Lv.${ev.victimLevel}`;
      } else {
        label = ev.name;
        meta = `@ ${ev.timer}`;
      }
      addBreakdownRow(breakdown, null, ev.img || null, label, meta, ev.xp);
    });

    $('result-mode-label').textContent = 'Classic Result';
    $('result-classic').style.display = '';
    $('result-advanced').style.display = 'none';
    $('result-panel').style.display = '';
    $('result-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function addBreakdownRow(container, emoji, imgSrc, name, meta, xp) {
    const row = document.createElement('div');
    row.className = 'breakdown-row';

    const left = document.createElement('div');
    left.className = 'bd-left';

    if (imgSrc) {
      const img = document.createElement('img');
      img.className = 'bd-icon';
      img.src = imgSrc;
      img.onerror = () => { img.src = 'assets/items/none.png'; };
      img.draggable = false;
      left.appendChild(img);
    } else if (emoji) {
      const span = document.createElement('span');
      span.style.fontSize = '18px';
      span.textContent = emoji;
      left.appendChild(span);
    }

    const textWrap = document.createElement('div');
    textWrap.innerHTML = `<div class="bd-name">${name}</div><div class="bd-meta">${meta}</div>`;
    left.appendChild(textWrap);

    const xpEl = document.createElement('div');
    xpEl.className = 'bd-xp';
    xpEl.textContent = `+${xp.toLocaleString()}`;

    row.appendChild(left);
    row.appendChild(xpEl);
    container.appendChild(row);
  }

  // ─── Advanced Simulation ──────────────────────────────────────────────────

  /**
   * Returns the evolutionLevels array for the currently selected Pokémon, or null.
   */
  function getSelectedEvolutionLevels() {
    if (!state.selectedPokemon) return null;
    const poke = D.PLAYER_POKEMON.find(p => p.name === state.selectedPokemon);
    return poke ? poke.evolutionLevels : null;
  }

  /**
   * Returns true if the given level is a "Stored XP level" —
   * i.e. one level BEFORE an evolution (evoLevel - 1).
   */
  function isStoredXPLevel(level) {
    const evos = getSelectedEvolutionLevels();
    if (!evos) return false;
    return evos.some(evo => evo - 1 === level);
  }

  let simState = null;
  let simInterval = null;
  let simSpeed = 1;

  function showAdvancedResult() {
    const { events, startSec, endSec } = buildEvents();

    simState = {
      currentSec: startSec,
      endSec: endSec,
      totalXP: D.getStartXPForLevel(state.startLevel),
      storedXP: 0,
      events: [...events],
      paused: true,
      _lastCatchupLogSec: startSec,
    };

    simSpeed = 1;
    $('sim-speed-btn').dataset.speed = '1';
    $('sim-speed-btn').textContent = '1x';
    $('sim-play-pause').textContent = '▶ Play';
    $('sim-log').innerHTML = '';

    updateSimDisplay();
    updateSimLiveIndicator();

    const initMult = D.getCatchUpModifier(state.startLevel, state.enemyHighestLevel);
    if (initMult > 1.0) {
      addSimLog(startSec, `⚡ Catch-Up ×${initMult.toFixed(2)} active at start (enemy Lv.${state.enemyHighestLevel})`, null, null);
    }

    if (state.expShareEnabled) {
      if (state.startLevel <= state.allyLevel) {
        addSimLog(startSec, `🔗 Exp. Share active — +5 XP/sec (Lv.${state.startLevel} ≤ ally Lv.${state.allyLevel})`, null, null);
      } else {
        addSimLog(startSec, `🔗 Exp. Share equipped but inactive — Lv.${state.startLevel} > ally Lv.${state.allyLevel}`, null, null);
      }
    }

    if (isStoredXPLevel(state.startLevel)) {
      const evos = D.PLAYER_POKEMON.find(p => p.name === state.selectedPokemon)?.evolutionLevels || [];
      const nextEvo = evos.find(e => e === state.startLevel + 1);
      addSimLog(startSec, `📦 Stored XP active from start (Lv.${state.startLevel}, evolves at Lv.${nextEvo})`, null, 'stored-info');
    }

    $('result-mode-label').textContent = 'Advanced Simulation';
    $('result-classic').style.display = 'none';
    $('result-advanced').style.display = '';
    $('result-panel').style.display = '';
    $('result-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function updateSimDisplay() {
    if (!simState) return;
    const timerStr = D.secondsToTimer(simState.currentSec);
    $('sim-timer-val').textContent = timerStr;

    const xp = simState.totalXP;
    const level = D.getLevelFromXP(xp);
    const stored = simState.storedXP || 0;
    const hasStored = stored > 0;
    const isStoredLevel = isStoredXPLevel(level);

    // Stats
    $('sim-xp-val').textContent = xp.toLocaleString();
    $('sim-xp-to-next').textContent = level >= 15 ? 'MAX' : D.getXPToNextLevel(xp).toLocaleString();

    // Level badge — show "(Stored)" indicator if on a stored-XP level
    const storedLevelText = isStoredLevel
      ? `Lv. ${level} · 📦 Stored`
      : `Lv. ${level}`;
    $('sim-level-badge').textContent = storedLevelText;

    // XP progress bar (blue)
    $('sim-xp-bar').style.width = D.getLevelProgressPct(xp) + '%';

    // Stored XP — show/hide elements
    const storedStat = $('sim-stored-stat');
    const storedBarWrap = $('sim-stored-bar-wrap');
    const storedBadge = $('sim-stored-badge');

    if (hasStored || isStoredLevel) {
      storedStat.style.display = '';
      $('sim-stored-val').textContent = stored.toLocaleString();
      storedBarWrap.style.display = '';
      // Stored bar shows stored XP as % of XP needed for next level (just for visual scale)
      const toNext = level >= 15 ? 1 : D.getXPToNextLevel(D.getStartXPForLevel(level));
      const storedPct = toNext > 0 ? Math.min(100, Math.round((stored / toNext) * 100)) : 0;
      $('sim-stored-bar').style.width = storedPct + '%';
      storedBadge.style.display = isStoredLevel ? '' : 'none';
    } else {
      storedStat.style.display = 'none';
      storedBarWrap.style.display = 'none';
      storedBadge.style.display = 'none';
    }
  }

  // ─── Indicateur live dans la sim ─────────────────────────────────────────

  function updateSimLiveIndicator() {
    const indicator = $('sim-live-indicator');
    if (!indicator || !simState) return;

    const pending = simState.events.filter(e => e.timerSec <= simState.currentSec).length;
    indicator.textContent = pending > 0
      ? `${pending} événement(s) en attente`
      : 'Aucun événement en attente';
  }

  function simStep() {
    if (!simState || simState.paused) return;

    simState.currentSec--;

    if (simState.currentSec < simState.endSec) {
      clearInterval(simInterval);
      simInterval = null;
      simState.paused = true;
      $('sim-play-pause').textContent = '▶ Play';
      addSimLog(simState.currentSec + 1, '✅ Simulation complete!', null, 'levelup');
      updateSimLiveIndicator();
      return;
    }

    const prevLevel = D.getLevelFromXP(simState.totalXP);
    const catchupMult = D.getCatchUpModifier(prevLevel, state.enemyHighestLevel);
    const passiveRate = D.getPassiveXPPerSec(simState.currentSec);
    const rawPassive = passiveRate; // base before catch-up
    let passiveXPWithCatchup = Math.floor(rawPassive * catchupMult);

    // Exp. Share: +5 XP/sec when holder is lowest level on team
    const expShareBonus = (state.expShareEnabled && prevLevel <= state.allyLevel) ? 5 : 0;
    passiveXPWithCatchup += expShareBonus;

    // ── Passive XP: goes to Stored if on a stored-XP level, otherwise normal ──
    if (isStoredXPLevel(prevLevel)) {
      simState.storedXP = (simState.storedXP || 0) + passiveXPWithCatchup;
    } else {
      simState.totalXP = Math.min(simState.totalXP + passiveXPWithCatchup, D.LEVEL_XP_TABLE[14]);
    }

    // ── Active XP events ──
    const events = simState.events.filter(e => e.timerSec === simState.currentSec);
    events.forEach(ev => {
      let label;
      if (ev.type === 'score') {
        label = `🏆 Score (${ev.points} pts)`;
      } else if (ev.type === 'playerko') {
        label = `⚔️ Player KO${ev.isAssist ? ' (Assist)' : ''} Lv.${ev.victimLevel}`;
      } else {
        label = `⚔️ ${ev.name}`;
      }

      // Base active XP (before catch-up)
      const baseXP = ev.xp;

      // Catch-up applies only to the base active XP, not to stored conversion
      let activeXPWithCatchup = baseXP;
      let catchupBonus = 0;
      if (catchupMult > 1.0) {
        activeXPWithCatchup = Math.floor(baseXP * catchupMult);
        catchupBonus = activeXPWithCatchup - baseXP;
      }

      // Stored XP conversion: convert up to baseXP from stored (catch-up does NOT apply to conversion)
      const stored = simState.storedXP || 0;
      const converted = Math.min(stored, baseXP);
      simState.storedXP = stored - converted;

      const totalGain = activeXPWithCatchup + converted;
      simState.totalXP = Math.min(simState.totalXP + totalGain, D.LEVEL_XP_TABLE[14]);

      // Build log note
      let catchupNote = null;
      if (catchupBonus > 0 && converted > 0) {
        catchupNote = `+${baseXP} +${converted} stored (+${catchupBonus} catch-up) = +${totalGain}`;
      } else if (catchupBonus > 0) {
        catchupNote = `+${baseXP} (+${catchupBonus} catch-up) = +${totalGain}`;
      } else if (converted > 0) {
        catchupNote = `+${baseXP} +${converted} stored = +${totalGain}`;
      }

      addSimLog(simState.currentSec, label, totalGain, converted > 0 ? 'stored' : null, catchupNote);

      // Log stored conversion separately if significant
      if (converted > 0) {
        addSimLog(simState.currentSec, `📦 Stored converted: ${converted} XP (${simState.storedXP} remaining)`, null, 'stored-info');
      }

      const idx = simState.events.indexOf(ev);
      if (idx > -1) simState.events.splice(idx, 1);
    });

    // ── Level up checks ──
    const newLevel = D.getLevelFromXP(simState.totalXP);
    if (newLevel > prevLevel) {
      addSimLog(simState.currentSec, `⬆️ Level Up! Now Lv. ${newLevel}`, null, 'levelup');

      // Log if stored XP becomes active or deactivates at new level
      const wasStored = isStoredXPLevel(prevLevel);
      const nowStored = isStoredXPLevel(newLevel);
      if (!wasStored && nowStored) {
        const evos = D.PLAYER_POKEMON.find(p => p.name === state.selectedPokemon)?.evolutionLevels || [];
        const nextEvo = evos.find(e => e === newLevel + 1);
        addSimLog(simState.currentSec, `📦 Stored XP activated (evolves at Lv.${nextEvo}) — Passive XP now saved`, null, 'stored-info');
      } else if (wasStored && !nowStored) {
        addSimLog(simState.currentSec, `📦 Stored XP deactivated — back to normal passive gain`, null, 'stored-info');
      }

      // Catch-up modifier change
      const oldMult = D.getCatchUpModifier(prevLevel, state.enemyHighestLevel);
      const newMult = D.getCatchUpModifier(newLevel, state.enemyHighestLevel);
      if (newMult !== oldMult) {
        if (newMult > 1.0) {
          addSimLog(simState.currentSec, `⚡ Catch-Up ×${newMult.toFixed(2)} active (passive XP boosted)`, null, null);
        } else if (oldMult > 1.0) {
          addSimLog(simState.currentSec, `Catch-Up modifier deactivated`, null, null);
        }
      }
    }

    updateSimDisplay();
    updateSimLiveIndicator();
  }

  function addSimLog(timerSec, msg, xp, style = null, note = null) {
    const log = $('sim-log');
    const entry = document.createElement('div');

    let cls = 'sim-log-entry';
    if (style === 'levelup') cls += ' levelup';
    else if (style === 'stored' || style === 'stored-info') cls += ' stored-convert';
    entry.className = cls;

    const timeEl = document.createElement('span');
    timeEl.className = 'sim-log-time';
    timeEl.textContent = D.secondsToTimer(timerSec);

    const msgEl = document.createElement('span');
    msgEl.className = 'sim-log-msg';
    msgEl.textContent = msg;

    entry.appendChild(timeEl);
    entry.appendChild(msgEl);

    if (xp !== null && xp !== undefined) {
      const xpEl = document.createElement('span');
      xpEl.className = 'sim-log-xp' + (style === 'stored' ? ' stored-xp' : '');
      if (note) {
        xpEl.textContent = note;
        if (style !== 'stored') xpEl.style.color = 'var(--yellow)';
      } else {
        xpEl.textContent = `+${xp}`;
      }
      entry.appendChild(xpEl);
    }

    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

  // ─── XP Reference Table ───────────────────────────────────────────────────

  function renderXPTable(mapId) {
    const pokemons = D.WILD_DATA[mapId] || [];
    const thead = $('xp-table-head');
    const tbody = $('xp-table-body');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const timerSet = new Set();
    pokemons.forEach(p => p.data.forEach(d => timerSet.add(d.timer)));
    const timers = Array.from(timerSet).sort((a, b) => D.timerToSeconds(b) - D.timerToSeconds(a));

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

    timers.forEach(timer => {
      const tr = document.createElement('tr');
      if (timer === '2:00') tr.classList.add('row-highlight');

      const tdTimer = document.createElement('td');
      tdTimer.className = 'col-timer';
      tdTimer.textContent = timer;

      const timerSec = D.timerToSeconds(timer);
      if (timerSec > 480) {
        tdTimer.innerHTML = `${timer}<br><span style="font-size:0.65rem;color:var(--blue);opacity:0.7">4xp/s</span>`;
      } else {
        tdTimer.innerHTML = `${timer}<br><span style="font-size:0.65rem;color:var(--orange);opacity:0.7">6xp/s</span>`;
      }

      tr.appendChild(tdTimer);

      pokemons.forEach(p => {
        const td = document.createElement('td');
        const entry = p.data.find(d => d.timer === timer);
        td.textContent = entry ? entry.xp : '-';
        if (entry) {
          const xp = entry.xp;
          if (xp >= 500) td.style.color = 'var(--red)';
          else if (xp >= 200) td.style.color = 'var(--orange)';
          else if (xp >= 100) td.style.color = 'var(--yellow)';
          else td.style.color = 'var(--green)';
        } else {
          td.style.color = 'var(--text-dim)';
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  // ─── Event Bindings ───────────────────────────────────────────────────────

  function bindEvents() {
    $('pokemon-search').addEventListener('input', e => {
      buildPokemonPicker(e.target.value);
    });

    $('lvl-minus').addEventListener('click', () => {
      if (state.startLevel > 1) { state.startLevel--; updateLevelDisplay(); }
    });
    $('lvl-plus').addEventListener('click', () => {
      if (state.startLevel < 15) { state.startLevel++; updateLevelDisplay(); }
    });

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

    document.querySelectorAll('[data-map-table]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-map-table]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.tableMap = btn.dataset.mapTable;
        renderXPTable(state.tableMap);
      });
    });

    // Wild kill modal controls
    ['kill-min', 'kill-sec'].forEach(id => {
      $(id).addEventListener('input', updateKillModalXP);
    });

    $('allies-minus').addEventListener('click', () => {
      const val = parseInt($('allies-count').textContent) || 0;
      if (val > 0) { $('allies-count').textContent = val - 1; updateKillModalXP(); }
    });
    $('allies-plus').addEventListener('click', () => {
      const val = parseInt($('allies-count').textContent) || 0;
      if (val < 4) { $('allies-count').textContent = val + 1; updateKillModalXP(); }
    });

    $('kill-modal-confirm').addEventListener('click', () => {
      if (!killModalTarget) return;
      const m = parseInt($('kill-min').value) || 0;
      const s = parseInt($('kill-sec').value) || 0;
      const timer = D.secondsToTimer(m * 60 + s);
      const allies = parseInt($('allies-count').textContent) || 0;
      const xp = parseInt($('kill-xp-preview').dataset.xp) || 0;

      addKillToQueue({
        type: 'wild',
        id: killModalTarget.id,
        name: killModalTarget.name,
        img: killModalTarget.img,
        timer,
        allies,
        xp,
      });
      $('kill-modal-confirm').textContent = '+ Add to Queue';
      $('kill-modal').style.display = 'none';
      killModalTarget = null;
    });

    function closeKillModal() {
      editingIdx = null;
      killModalTarget = null;
      $('kill-modal-confirm').textContent = '+ Add to Queue';
      $('kill-modal').style.display = 'none';
    }

    $('kill-modal-cancel').addEventListener('click', closeKillModal);
    $('kill-modal-close').addEventListener('click', closeKillModal);
    $('kill-modal').addEventListener('click', e => {
      if (e.target === $('kill-modal')) closeKillModal();
    });

    // Player KO button
    $('add-player-ko-btn').addEventListener('click', openPlayerKOModal);

    // Player KO modal controls
    ['pko-victim-level', 'pko-streak', 'pko-min', 'pko-sec'].forEach(id => {
      $(id).addEventListener('input', updatePlayerKOPreview);
    });
    document.querySelectorAll('input[name="pko-role"]').forEach(r => {
      r.addEventListener('change', updatePlayerKOPreview);
    });
    $('pko-allies-minus').addEventListener('click', () => {
      const val = parseInt($('pko-allies-count').textContent) || 0;
      if (val > 0) { $('pko-allies-count').textContent = val - 1; updatePlayerKOPreview(); }
    });
    $('pko-allies-plus').addEventListener('click', () => {
      const val = parseInt($('pko-allies-count').textContent) || 0;
      if (val < 4) { $('pko-allies-count').textContent = val + 1; updatePlayerKOPreview(); }
    });
    $('pko-apply-catchup').addEventListener('change', updatePlayerKOPreview);

    $('pko-modal-confirm').addEventListener('click', () => {
      const m = parseInt($('pko-min').value) || 0;
      const s = parseInt($('pko-sec').value) || 0;
      const timer = D.secondsToTimer(m * 60 + s);
      const victimLevel = parseInt($('pko-victim-level').value) || 1;
      const streakNumber = getPlayerKOStreakNumber();
      const isKoer = isPlayerKOer();
      const alliesNearby = getPlayerKOAlliesNearby();
      const applyCatchUp = $('pko-apply-catchup').checked;
      const xp = parseInt($('pko-xp-preview').dataset.xp) || 0;

      addKillToQueue({
        type: 'playerko',
        timer,
        victimLevel,
        streakNumber,
        isKoer,
        alliesNearby,
        applyCatchUp,
        xp,
      });
      $('pko-modal-confirm').textContent = '+ Add to Queue';
      $('player-ko-modal').style.display = 'none';
    });

    function closePKOModal() {
      editingIdx = null;
      $('pko-modal-confirm').textContent = '+ Add to Queue';
      $('player-ko-modal').style.display = 'none';
    }

    $('pko-modal-cancel').addEventListener('click', closePKOModal);
    $('pko-modal-close').addEventListener('click', closePKOModal);
    $('player-ko-modal').addEventListener('click', e => {
      if (e.target === $('player-ko-modal')) closePKOModal();
    });

    // Scoring
    $('add-score-btn').addEventListener('click', () => {
      const m = parseInt($('score-min').value) || 0;
      const s = parseInt($('score-sec').value) || 0;
      const pts = parseInt($('score-pts').value) || 10;
      const timer = D.secondsToTimer(m * 60 + s);
      const xp = D.getScoringXP(pts);

      addKillToQueue({
        type: 'score',
        timer,
        points: pts,
        xp,
      });
    });

    $('clear-queue-btn').addEventListener('click', () => {
      state.killQueue = [];
      renderKillQueue();
    });

    $('calc-classic-btn').addEventListener('click', showClassicResult);
    $('calc-advanced-btn').addEventListener('click', showAdvancedResult);

    $('result-close-btn').addEventListener('click', () => {
      $('result-panel').style.display = 'none';
      if (simInterval) { clearInterval(simInterval); simInterval = null; }
    });

    $('sim-play-pause').addEventListener('click', () => {
      if (!simState) return;
      simState.paused = !simState.paused;
      $('sim-play-pause').textContent = simState.paused ? '▶ Play' : '⏸ Pause';
      if (!simState.paused) {
        simInterval = setInterval(simStep, Math.floor(1000 / simSpeed));
      } else {
        clearInterval(simInterval);
        simInterval = null;
      }
    });

    $('sim-speed-btn').addEventListener('click', () => {
      const speeds = [1, 2, 4];
      const cur = speeds.indexOf(simSpeed);
      simSpeed = speeds[(cur + 1) % speeds.length];
      $('sim-speed-btn').textContent = `${simSpeed}x`;
      $('sim-speed-btn').dataset.speed = simSpeed;
      if (simInterval) {
        clearInterval(simInterval);
        simInterval = setInterval(simStep, Math.floor(1000 / simSpeed));
      }
    });

    $('sim-restart-btn').addEventListener('click', () => {
      clearInterval(simInterval);
      simInterval = null;
      showAdvancedResult();
    });

    // ── Bouton "Ajouter un événement" dans la sim ──
    // Ce bouton scrolle vers la section d'ajout d'événements
    const simAddBtn = $('sim-add-event-btn');
    if (simAddBtn) {
      simAddBtn.addEventListener('click', () => {
        // Pause la sim si elle tourne pour que le timer soit lisible
        const wasPaused = simState ? simState.paused : true;
        if (simState && !simState.paused) {
          simState.paused = true;
          clearInterval(simInterval);
          simInterval = null;
          $('sim-play-pause').textContent = '▶ Play';
          addSimLog(simState.currentSec, '⏸ Simulation pausée pour ajout d\'événement', null, false);
        }

        // Scroll vers la section d'ajout
        const evSection = document.querySelector('.events-section') || document.querySelector('.wild-panel');
        if (evSection) {
          evSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // ── Bouton "Player KO live" dans la sim ──
    const simPKOBtn = $('sim-add-pko-btn');
    if (simPKOBtn) {
      simPKOBtn.addEventListener('click', () => {
        // Pause si nécessaire
        if (simState && !simState.paused) {
          simState.paused = true;
          clearInterval(simInterval);
          simInterval = null;
          $('sim-play-pause').textContent = '▶ Play';
        }
        openPlayerKOModal();
      });
    }

    $('howToUseBtn').addEventListener('click', () => {
      $('howto-modal').style.display = 'flex';
    });
    $('howto-close').addEventListener('click', () => {
      $('howto-modal').style.display = 'none';
    });
    $('howto-modal').addEventListener('click', e => {
      if (e.target === $('howto-modal')) $('howto-modal').style.display = 'none';
    });

    $('disclaimerBtn').addEventListener('click', () => {
      $('disclaimer-modal').style.display = 'flex';
    });
    $('disclaimer-close').addEventListener('click', () => {
      $('disclaimer-modal').style.display = 'none';
    });
    $('disclaimer-modal').addEventListener('click', e => {
      if (e.target === $('disclaimer-modal')) $('disclaimer-modal').style.display = 'none';
    });

    // ── Ally level ──
    $('ally-lvl-minus').addEventListener('click', () => {
      if (state.allyLevel > 1) {
        state.allyLevel--;
        $('ally-lvl-display').textContent = state.allyLevel;
        updateAllyExpShareDisplay();
      }
    });
    $('ally-lvl-plus').addEventListener('click', () => {
      if (state.allyLevel < 15) {
        state.allyLevel++;
        $('ally-lvl-display').textContent = state.allyLevel;
        updateAllyExpShareDisplay();
      }
    });

    // ── Exp. Share toggle ──
    $('exp-share-toggle').addEventListener('change', e => {
      state.expShareEnabled = e.target.checked;
      updateAllyExpShareDisplay();
    });

    // ── Farm Presets ──
    $('preset-save-btn').addEventListener('click', openPresetSaveModal);
    $('preset-save-close').addEventListener('click', () => { $('preset-save-modal').style.display = 'none'; });
    $('preset-save-cancel').addEventListener('click', () => { $('preset-save-modal').style.display = 'none'; });
    $('preset-save-confirm').addEventListener('click', confirmSavePreset);
    $('preset-save-modal').addEventListener('click', e => {
      if (e.target === $('preset-save-modal')) $('preset-save-modal').style.display = 'none';
    });
    $('preset-name-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmSavePreset();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();