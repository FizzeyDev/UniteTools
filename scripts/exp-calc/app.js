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
  };

  const $ = id => document.getElementById(id);

  function init() {
    buildPokemonPicker();
    bindEvents();
    renderWildGrid(state.currentMap);
    renderXPTable(state.tableMap);
    updateXPProgress();
    updateCatchUpDisplay();
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

      if (poke.info) {
        const infoBtn = document.createElement('div');
        infoBtn.className = 'wild-card-info';
        infoBtn.title = poke.info;
        infoBtn.textContent = 'ℹ️';
        infoBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          showInfoPopup(poke.name, poke.info);
        });
        card.appendChild(infoBtn);
      }

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
    if (allies > 0) {
      xp = Math.floor(xp / (allies + 1) * 1.2);
    }
    $('kill-xp-preview').textContent = `${xp} XP`;
    $('kill-xp-preview').dataset.xp = xp;
  }

  // ─── Player KO Modal ─────────────────────────────────────────────────────

  function getPlayerKOStreakNumber() {
    return parseInt($('pko-streak').value) || 0;
  }

  function updatePlayerKOPreview() {
    const victimLevel = parseInt($('pko-victim-level').value) || 1;
    const streakNumber = getPlayerKOStreakNumber();
    const isAssist = $('pko-is-assist').checked;
    const applyCatchUp = $('pko-apply-catchup').checked;

    const myLevel = state.startLevel;
    const opponentHighestLevel = state.enemyHighestLevel;

    const xp = D.calculatePlayerKOXP({
      victimLevel,
      streakNumber,
      killerLevel: myLevel,
      myLevel,
      opponentHighestLevel,
      isAssist,
      applyCatchUp,
    });

    const baseXP = D.KO_BASE_XP[Math.min(victimLevel - 1, 14)];
    const streakMult = D.getStreakModifier(streakNumber);
    const levelDiffMult = D.getKOLevelDiffModifier(myLevel, victimLevel);
    const catchUpMult = applyCatchUp ? D.getCatchUpModifier(myLevel, opponentHighestLevel) : 1.0;

    let breakdownParts = [
      `Base: ${baseXP}`,
      streakMult !== 1 ? `Streak ×${streakMult.toFixed(2)}` : null,
      levelDiffMult !== 1 ? `Lvl. diff ×${levelDiffMult.toFixed(2)}` : null,
      isAssist ? `Assist ×0.50` : null,
      applyCatchUp && catchUpMult !== 1 ? `Catch-Up ×${catchUpMult.toFixed(2)}` : null,
    ].filter(Boolean);

    $('pko-xp-preview').textContent = `${xp} XP`;
    $('pko-xp-preview').dataset.xp = xp;
    $('pko-breakdown').textContent = breakdownParts.join(' · ');

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
    $('pko-is-assist').checked = false;
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
      $('pko-is-assist').checked = !!entry.isAssist;
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
          <div class="ker-name">⚔️ Player KO${entry.isAssist ? ' <span class="ker-assist-tag">ASSIST</span>' : ''}</div>
          <div class="ker-meta">⏱ ${entry.timer} · Victim Lv.${entry.victimLevel} · Streak ${entry.streakNumber >= 0 ? '+' : ''}${entry.streakNumber}</div>
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
    const el = $(id);
    if (!el) return fallback;
    const v = parseInt(el.value);
    return isNaN(v) ? fallback : v;
  }

  function buildEvents() {
    const startM = safeInt('start-min', 10);
    const startS = safeInt('start-sec', 0);

    const startSec = startM * 60 + startS;
    const endSec = 0; // always simulate to end of match

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
      total += Math.floor(rate * catchupMult);
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

  let simState = null;
  let simInterval = null;
  let simSpeed = 1;

  function showAdvancedResult() {
    const { events, startSec, endSec } = buildEvents();

    simState = {
      currentSec: startSec,
      endSec: endSec,
      totalXP: D.getStartXPForLevel(state.startLevel),
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
      addSimLog(startSec, `⚡ Catch-Up ×${initMult.toFixed(2)} active at start (enemy Lv.${state.enemyHighestLevel})`, null, false);
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
    $('sim-xp-val').textContent = xp.toLocaleString();
    $('sim-level-badge').textContent = `Lv. ${D.getLevelFromXP(xp)}`;
    $('sim-xp-bar').style.width = D.getLevelProgressPct(xp) + '%';
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
      addSimLog(simState.currentSec + 1, '✅ Simulation complete!', null, true);
      updateSimLiveIndicator();
      return;
    }

    const prevLevel = D.getLevelFromXP(simState.totalXP);
    const currentLevel = prevLevel;
    const passiveRate = D.getPassiveXPPerSec(simState.currentSec);
    const catchupMult = D.getCatchUpModifier(currentLevel, state.enemyHighestLevel);
    const passiveXP = Math.floor(passiveRate * catchupMult);
    simState.totalXP = Math.min(
      simState.totalXP + passiveXP,
      D.LEVEL_XP_TABLE[14]
    );

    if (catchupMult > 1.0 && simState.currentSec === simState._lastCatchupLogSec - 1) {
      simState._lastCatchupLogSec = simState.currentSec;
    }

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
      let finalXP = ev.xp;
      let catchupNote = null;
      if (catchupMult > 1.0 && (ev.type === 'wild' || ev.type === 'score')) {
        finalXP = Math.floor(ev.xp * catchupMult);
        const bonus = finalXP - ev.xp;
        if (bonus > 0) catchupNote = `+${ev.xp} (+${bonus})`;
      }
      simState.totalXP = Math.min(simState.totalXP + finalXP, D.LEVEL_XP_TABLE[14]);
      addSimLog(simState.currentSec, label, finalXP, false, catchupNote);
      const idx = simState.events.indexOf(ev);
      if (idx > -1) simState.events.splice(idx, 1);
    });

    const newLevel = D.getLevelFromXP(simState.totalXP);
    if (newLevel > prevLevel) {
      addSimLog(simState.currentSec, `⬆️ Level Up! Now Lv. ${newLevel}`, null, true);
      const oldMult = D.getCatchUpModifier(prevLevel, state.enemyHighestLevel);
      const newMult = D.getCatchUpModifier(newLevel, state.enemyHighestLevel);
      if (newMult !== oldMult) {
        if (newMult > 1.0) {
          addSimLog(simState.currentSec, `⚡ Catch-Up ×${newMult.toFixed(2)} active (passive XP boosted)`, null, false);
        } else if (oldMult > 1.0) {
          addSimLog(simState.currentSec, `Catch-Up modifier deactivated`, null, false);
        }
      }
    }

    updateSimDisplay();
    updateSimLiveIndicator();
  }

  function addSimLog(timerSec, msg, xp, isLevelup = false, catchupNote = null) {
    const log = $('sim-log');
    const entry = document.createElement('div');
    entry.className = 'sim-log-entry' + (isLevelup ? ' levelup' : '');

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
      xpEl.className = 'sim-log-xp';
      if (catchupNote) {
        xpEl.textContent = catchupNote;
        xpEl.title = `Catch-Up modifier active (×${D.getCatchUpModifier(D.getLevelFromXP(simState.totalXP), state.enemyHighestLevel).toFixed(2)})`;
        xpEl.style.color = 'var(--yellow)';
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
    $('pko-is-assist').addEventListener('change', updatePlayerKOPreview);
    $('pko-apply-catchup').addEventListener('change', updatePlayerKOPreview);

    $('pko-modal-confirm').addEventListener('click', () => {
      const m = parseInt($('pko-min').value) || 0;
      const s = parseInt($('pko-sec').value) || 0;
      const timer = D.secondsToTimer(m * 60 + s);
      const victimLevel = parseInt($('pko-victim-level').value) || 1;
      const streakNumber = getPlayerKOStreakNumber();
      const isAssist = $('pko-is-assist').checked;
      const applyCatchUp = $('pko-apply-catchup').checked;
      const xp = parseInt($('pko-xp-preview').dataset.xp) || 0;

      addKillToQueue({
        type: 'playerko',
        timer,
        victimLevel,
        streakNumber,
        isAssist,
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();