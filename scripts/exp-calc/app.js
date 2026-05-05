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
  };

  const $ = id => document.getElementById(id);

  function init() {
    buildPokemonPicker();
    bindEvents();
    renderWildGrid(state.currentMap);
    renderXPTable(state.tableMap);
    updateXPProgress();
  }

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
  }

  function updateLevelDisplay() {
    $('lvl-display').textContent = state.startLevel;
    updateXPProgress();
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
      : `0 / ${D.LEVEL_UP_XP[lvl - 1] || '—'} XP`;
  }

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
    const m = parseInt($('start-min').value) || 10;
    const s = parseInt($('start-sec').value) || 0;
    return D.secondsToTimer(m * 60 + s);
  }

  let killModalTarget = null;
  let killModalMap = null;

  function openKillModal(poke, mapId) {
    killModalTarget = poke;
    killModalMap = mapId;

    $('kill-modal-title').textContent = `Add Kill — ${poke.name}`;
    $('kill-modal-img').src = poke.img;
    $('kill-modal-name').textContent = poke.name;

    const startM = parseInt($('start-min').value) || 10;
    const startS = parseInt($('start-sec').value) || 0;
    $('kill-min').value = startM;
    $('kill-sec').value = startS;
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

  function addKillToQueue(entry) {
    state.killQueue.push(entry);
    renderKillQueue();
  }

  function removeFromQueue(idx) {
    state.killQueue.splice(idx, 1);
    renderKillQueue();
  }

  function renderKillQueue() {
    const list = $('kill-queue-list');
    list.innerHTML = '';

    if (state.killQueue.length === 0) {
      list.innerHTML = '<div class="empty-queue-hint">Add wild Pokémon kills, scoring events below.</div>';
      return;
    }

    state.killQueue.forEach((entry, idx) => {
      const row = document.createElement('div');
      row.className = 'kill-event-row' + (entry.type === 'score' ? ' score-row' : '');

      if (entry.type === 'wild') {
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

        const rem = document.createElement('button');
        rem.className = 'ker-remove';
        rem.textContent = '✕';
        rem.title = 'Remove';
        rem.addEventListener('click', () => removeFromQueue(idx));

        row.appendChild(img);
        row.appendChild(info);
        row.appendChild(xpEl);
        row.appendChild(rem);

      } else if (entry.type === 'score') {
        const info = document.createElement('div');
        info.className = 'ker-info';
        info.innerHTML = `
          <div class="ker-name">🏆 Scoring</div>
          <div class="ker-meta">⏱ ${entry.timer} · ${entry.points} pts</div>
        `;

        const xpEl = document.createElement('div');
        xpEl.className = 'ker-xp';
        xpEl.textContent = `+${entry.xp}`;

        const rem = document.createElement('button');
        rem.className = 'ker-remove';
        rem.textContent = '✕';
        rem.title = 'Remove';
        rem.addEventListener('click', () => removeFromQueue(idx));

        row.appendChild(info);
        row.appendChild(xpEl);
        row.appendChild(rem);
      }

      list.appendChild(row);
    });
  }

  function buildEvents() {
    const startM = parseInt($('start-min').value) || 10;
    const startS = parseInt($('start-sec').value) || 0;
    const durM = parseInt($('dur-min').value) || 10;
    const durS = parseInt($('dur-sec').value) || 0;

    const startSec = startM * 60 + startS;
    const endSec = Math.max(0, startSec - (durM * 60 + durS));

    const events = state.killQueue.map(e => ({
      ...e,
      timerSec: D.timerToSeconds(e.timer),
    })).filter(e => e.timerSec <= startSec && e.timerSec >= endSec);

    events.sort((a, b) => b.timerSec - a.timerSec);

    return { events, startSec, endSec };
  }

  function calculatePassiveXP(startSec, endSec) {
    const boundary = 8 * 60;
    let total = 0;

    if (startSec > boundary) {
      const highEnd = startSec;
      const highStart = Math.max(endSec, boundary);
      total += (highEnd - highStart) * 4;
    }

    if (endSec < boundary) {
      const lowEnd = Math.min(startSec, boundary);
      const lowStart = endSec;
      total += (lowEnd - lowStart) * 6;
    }

    return total;
  }

  function calculateClassic() {
    const { events, startSec, endSec } = buildEvents();

    let totalXP = D.getStartXPForLevel(state.startLevel);
    const passiveTotal = calculatePassiveXP(startSec, endSec);

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
    let passiveDesc = '';
    if (startSec > boundary && endSec < boundary) {
      passiveDesc = `(4/sec → 6/sec, mixed)`;
    } else if (endSec >= boundary) {
      passiveDesc = `(4 XP/sec × ${durationSec}s)`;
    } else {
      passiveDesc = `(6 XP/sec × ${durationSec}s)`;
    }
    addBreakdownRow(breakdown, '⏱', null, 'Passive XP', passiveDesc, passiveTotal);

    events.forEach(ev => {
      const label = ev.type === 'score' ? `🏆 Score (${ev.points} pts)` : ev.name;
      addBreakdownRow(breakdown, null, ev.img || null, label, `@ ${ev.timer}`, ev.xp);
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
    };

    simSpeed = 1;
    $('sim-speed-btn').dataset.speed = '1';
    $('sim-speed-btn').textContent = '1x';
    $('sim-play-pause').textContent = '▶ Play';
    $('sim-log').innerHTML = '';

    updateSimDisplay();

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

  function simStep() {
    if (!simState || simState.paused) return;

    simState.currentSec--;

    if (simState.currentSec < simState.endSec) {
      clearInterval(simInterval);
      simInterval = null;
      simState.paused = true;
      $('sim-play-pause').textContent = '▶ Play';
      addSimLog(simState.currentSec + 1, '✅ Simulation complete!', null, true);
      return;
    }

    const prevLevel = D.getLevelFromXP(simState.totalXP);
    const passiveXP = D.getPassiveXPPerSec(simState.currentSec);
    simState.totalXP = Math.min(
      simState.totalXP + passiveXP,
      D.LEVEL_XP_TABLE[14]
    );

    const events = simState.events.filter(e => e.timerSec === simState.currentSec);
    events.forEach(ev => {
      simState.totalXP = Math.min(simState.totalXP + ev.xp, D.LEVEL_XP_TABLE[14]);
      const label = ev.type === 'score' ? `🏆 Score (${ev.points} pts)` : `⚔️ ${ev.name}`;
      addSimLog(simState.currentSec, label, ev.xp);
      const idx = simState.events.indexOf(ev);
      if (idx > -1) simState.events.splice(idx, 1);
    });

    const newLevel = D.getLevelFromXP(simState.totalXP);
    if (newLevel > prevLevel) {
      addSimLog(simState.currentSec, `⬆️ Level Up! Now Lv. ${newLevel}`, null, true);
    }

    updateSimDisplay();
  }

  function addSimLog(timerSec, msg, xp, isLevelup = false) {
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
      xpEl.textContent = `+${xp}`;
      entry.appendChild(xpEl);
    }

    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

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
        td.textContent = entry ? entry.xp : '—';
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
      $('kill-modal').style.display = 'none';
      killModalTarget = null;
    });

    $('kill-modal-cancel').addEventListener('click', () => {
      $('kill-modal').style.display = 'none';
      killModalTarget = null;
    });
    $('kill-modal-close').addEventListener('click', () => {
      $('kill-modal').style.display = 'none';
      killModalTarget = null;
    });
    $('kill-modal').addEventListener('click', e => {
      if (e.target === $('kill-modal')) {
        $('kill-modal').style.display = 'none';
        killModalTarget = null;
      }
    });

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

    $('howToUseBtn').addEventListener('click', () => {
      $('howto-modal').style.display = 'flex';
    });
    $('howto-close').addEventListener('click', () => {
      $('howto-modal').style.display = 'none';
    });
    $('howto-modal').addEventListener('click', e => {
      if (e.target === $('howto-modal')) $('howto-modal').style.display = 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();

})();