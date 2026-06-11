/**
 * ui-queue.js — Kill Queue rendering, modals, and event injection
 *
 * Handles:
 *  - Wild kill modal (with timer, allies, XP preview)
 *  - Player KO modal (victim level, streak, proximity, catch-up)
 *  - Kill Queue render + edit/duplicate/remove actions
 *  - Live event injection into the running Advanced Simulation
 *
 * Exposes: window.XPCalcQueue
 */

window.XPCalcQueue = (function () {
  'use strict';

  const D = window.XPCalcData;
  const state = window.XPCalcState;
  const $ = id => document.getElementById(id);

  /** Currently open kill modal target (wild Pokémon object). */
  let killModalTarget = null;
  let killModalMap = null;

  /** Index of the queue entry being edited (null = adding new). */
  let editingIdx = null;

  // ─── Wild Kill Modal ──────────────────────────────────────────────────────

  /**
   * Open the wild Pokémon kill modal for the given wild Pokémon.
   * If an Advanced Simulation is running, pre-fills the timer with the current sim second.
   * @param {object} poke  - wild Pokémon entry from D.WILD_DATA
   * @param {string} mapId
   */
  function openKillModal(poke, mapId) {
    killModalTarget = poke;
    killModalMap = mapId;

    $('kill-modal-title').textContent = `Add Kill - ${poke.name}`;
    $('kill-modal-img').src = poke.img;
    $('kill-modal-name').textContent = poke.name;

    // Pre-fill timer from live sim if running, else from start-timer inputs
    const sim = window.XPCalcSim && window.XPCalcSim.getSimState();
    if (sim && $('result-advanced').style.display !== 'none') {
      $('kill-min').value = Math.floor(sim.currentSec / 60);
      $('kill-sec').value = sim.currentSec % 60;
    } else {
      $('kill-min').value = _safeInt('start-min', 10);
      $('kill-sec').value = _safeInt('start-sec', 0);
    }

    $('allies-count').textContent = '0';

    // Hide ally count for fixed-XP bosses (Regi etc.)
    const alliesFieldGroup = $('allies-count').closest('.field-group');
    if (alliesFieldGroup) alliesFieldGroup.style.display = poke.fixedXP ? 'none' : '';

    // Show/hide fixed-XP notice
    let fxn = $('kill-modal-fixed-xp-notice');
    if (!fxn) {
      fxn = document.createElement('div');
      fxn.id = 'kill-modal-fixed-xp-notice';
      fxn.className = 'fixed-xp-notice';
      fxn.textContent = '✔ XP is shared equally — everyone on the team always receives 60% of the base value regardless of last hit.';
      const footer = $('kill-modal').querySelector('.modal-footer');
      footer.parentNode.insertBefore(fxn, footer);
    }
    fxn.style.display = poke.fixedXP ? '' : 'none';

    updateKillModalXP();
    $('kill-modal').style.display = 'flex';
  }

  /**
   * Recompute the XP preview in the wild kill modal.
   * Accounts for ally XP-splitting (non-boss mobs).
   */
  function updateKillModalXP() {
    if (!killModalTarget) return;
    const m = parseInt($('kill-min').value) || 0;
    const s = parseInt($('kill-sec').value) || 0;
    const timer = D.secondsToTimer(m * 60 + s);
    const allies = parseInt($('allies-count').textContent) || 0;
    let xp = D.getWildXP(killModalTarget.id, killModalMap, timer);
    // Fixed-XP mobs (Regi/bosses) always grant 60% regardless of last hit — no split
    if (!killModalTarget.fixedXP && allies > 0) {
      xp = Math.floor(xp / (allies + 1) * 1.2);
    }
    $('kill-xp-preview').textContent = `${xp} XP`;
    $('kill-xp-preview').dataset.xp = xp;
  }

  // ─── Player KO Modal ─────────────────────────────────────────────────────

  function _getPlayerKOStreakNumber() { return parseInt($('pko-streak').value) || 0; }
  function _getPlayerKOAlliesNearby() { return parseInt($('pko-allies-count').textContent) || 0; }
  function _isPlayerKOer() {
    const r = document.querySelector('input[name="pko-role"]:checked');
    return !r || r.value === 'koer';
  }

  /** Recompute and display the XP preview in the Player KO modal. */
  function updatePlayerKOPreview() {
    const victimLevel  = parseInt($('pko-victim-level').value) || 1;
    const streakNumber = _getPlayerKOStreakNumber();
    const isKoer       = _isPlayerKOer();
    const alliesNearby = _getPlayerKOAlliesNearby();
    const applyCatchUp = $('pko-apply-catchup').checked;
    const myLevel      = state.startLevel;
    const opponentHighestLevel = state.enemyHighestLevel;

    const xp = D.calculatePlayerKOXP({
      victimLevel, streakNumber,
      killerLevel: myLevel, myLevel,
      opponentHighestLevel, isKoer, alliesNearby, applyCatchUp,
    });

    const baseXP        = D.KO_BASE_XP[Math.min(victimLevel - 1, 14)];
    const streakMult    = D.getStreakModifier(streakNumber);
    const levelDiffMult = D.getKOLevelDiffModifier(myLevel, victimLevel);
    const catchUpMult   = applyCatchUp ? D.getCatchUpModifier(myLevel, opponentHighestLevel) : 1.0;
    const proximityMult = D.getProximityXPMultiplier(isKoer, alliesNearby);

    const parts = [
      `Base: ${baseXP}`,
      streakMult    !== 1 ? `Streak ×${streakMult.toFixed(2)}`                               : null,
      levelDiffMult !== 1 ? `Lvl. diff ×${levelDiffMult.toFixed(2)}`                         : null,
      !isKoer             ? `Proximity ×${proximityMult.toFixed(4).replace(/\.?0+$/, '')}`   : null,
      applyCatchUp && catchUpMult !== 1 ? `Catch-Up ×${catchUpMult.toFixed(2)}`              : null,
    ].filter(Boolean);

    $('pko-xp-preview').textContent = `${xp} XP`;
    $('pko-xp-preview').dataset.xp  = xp;
    $('pko-breakdown').textContent   = parts.join(' · ');

    const allyPct = $('pko-ally-pct');
    if (allyPct) {
      allyPct.textContent = alliesNearby === 0
        ? '—'
        : `${Math.round(D.PROXIMITY_XP_SHARE[Math.min(alliesNearby, 4)] * 10000) / 100}% XP`;
    }

    const hint = $('pko-allies-hint');
    if (hint) hint.textContent = alliesNearby === 0 ? '0 = solo KO' : `${alliesNearby} ally${alliesNearby > 1 ? 'ies' : ''} nearby`;

    const catchUpWarn = $('pko-catchup-warn');
    if (catchUpWarn) catchUpWarn.style.display = applyCatchUp ? 'flex' : 'none';
  }

  /**
   * Open the Player KO modal.
   * Pre-fills with current sim timer if running, else start-timer.
   */
  function openPlayerKOModal() {
    const sim = window.XPCalcSim && window.XPCalcSim.getSimState();
    if (sim && $('result-advanced').style.display !== 'none') {
      $('pko-min').value = Math.floor(sim.currentSec / 60);
      $('pko-sec').value = sim.currentSec % 60;
    } else {
      $('pko-min').value = _safeInt('start-min', 10);
      $('pko-sec').value = _safeInt('start-sec', 0);
    }

    $('pko-victim-level').value = Math.min(state.startLevel + 1, 15);
    $('pko-streak').value = 0;
    $('pko-allies-count').textContent = '0';
    const koerRadio = $('pko-role-koer');
    if (koerRadio) koerRadio.checked = true;
    $('pko-apply-catchup').checked = false;

    updatePlayerKOPreview();
    $('player-ko-modal').style.display = 'flex';
  }

  // ─── Kill Queue ───────────────────────────────────────────────────────────

  /**
   * Add an entry to the Kill Queue (or save an edit if editingIdx is set).
   * Also injects the event into a live Advanced Simulation if one is running
   * and the event's timer is still ahead of the current sim second.
   * @param {object} entry - kill queue entry
   */
  function addKillToQueue(entry) {
    if (editingIdx !== null) {
      state.killQueue[editingIdx] = entry;
      editingIdx = null;
    } else {
      state.killQueue.push(entry);
    }
    renderKillQueue();

    // Live injection into Advanced Simulation
    const sim = window.XPCalcSim && window.XPCalcSim.getSimState();
    if (sim && $('result-advanced').style.display !== 'none') {
      const enriched = { ...entry, timerSec: D.timerToSeconds(entry.timer) };
      const label = entry.name || (entry.type === 'playerko' ? 'Player KO' : 'Score');

      if (enriched.timerSec <= sim.currentSec) {
        // Timer is still ahead in the sim — inject it
        window.XPCalcSim.injectEvent(enriched);
        window.XPCalcSim.addLog(sim.currentSec, `➕ Added: ${label} @ ${entry.timer}`, null, null);
      } else {
        window.XPCalcSim.addLog(sim.currentSec, `⚠️ ${label} @ ${entry.timer} — timer already past`, null, null);
      }
    }
  }

  /** Remove queue entry at the given index. */
  function removeFromQueue(idx) {
    state.killQueue.splice(idx, 1);
    renderKillQueue();
  }

  /** Duplicate queue entry at the given index, inserting the copy right after. */
  function duplicateQueueEntry(idx) {
    const clone = { ...state.killQueue[idx] };
    state.killQueue.splice(idx + 1, 0, clone);
    renderKillQueue();
  }

  /**
   * Open the appropriate modal to edit queue entry at index.
   * Score entries are edited inline (no modal needed).
   */
  function editQueueEntry(idx) {
    const entry = state.killQueue[idx];
    editingIdx = idx;

    if (entry.type === 'wild') {
      const mapData = D.WILD_DATA[state.currentMap] || [];
      let poke = mapData.find(p => p.id === entry.id);
      if (!poke) poke = { id: entry.id, name: entry.name, img: entry.img };
      killModalTarget = poke;
      killModalMap    = state.currentMap;

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
      const roleRadio = $(entry.isKoer === false ? 'pko-role-ally' : 'pko-role-koer');
      if (roleRadio) roleRadio.checked = true;
      $('pko-apply-catchup').checked = !!entry.applyCatchUp;
      $('pko-modal-confirm').textContent = '✎ Save Changes';
      updatePlayerKOPreview();
      $('player-ko-modal').style.display = 'flex';

    } else if (entry.type === 'score') {
      // Score: populate the quick-add fields and remove the old entry
      const timerSec = D.timerToSeconds(entry.timer);
      $('score-min').value = Math.floor(timerSec / 60);
      $('score-sec').value = timerSec % 60;
      $('score-pts').value = entry.points;
      editingIdx = null;
      state.killQueue.splice(idx, 1);
      editingIdx = idx;
      renderKillQueue();
    }
  }

  /**
   * Render the full Kill Queue list in the DOM.
   * Shows an empty-state hint when the queue is empty.
   */
  function renderKillQueue() {
    const list = $('kill-queue-list');
    list.innerHTML = '';

    if (state.killQueue.length === 0) {
      list.innerHTML = '<div class="empty-queue-hint">Add wild Pokémon kills, player KOs or scoring events below.</div>';
      return;
    }

    state.killQueue.forEach((entry, idx) => {
      const row = document.createElement('div');
      if (editingIdx === idx) row.style.outline = '1px solid var(--blue)';

      const actions = document.createElement('div');
      actions.className = 'ker-actions';
      actions.appendChild(_makeKerBtn('✎', 'Edit',      'ker-edit', () => editQueueEntry(idx)));
      actions.appendChild(_makeKerBtn('⧉', 'Duplicate', 'ker-dupe', () => duplicateQueueEntry(idx)));
      actions.appendChild(_makeKerBtn('✕', 'Remove',    '',         () => removeFromQueue(idx)));

      if (entry.type === 'playerko') {
        row.className = 'kill-event-row playerko-row';
        const info = document.createElement('div');
        info.className = 'ker-info';
        info.innerHTML = `
          <div class="ker-name">⚔️ Player KO${entry.isKoer === false ? ' <span class="ker-assist-tag">ALLY</span>' : ''}</div>
          <div class="ker-meta">⏱ ${entry.timer} · Victim Lv.${entry.victimLevel} · Streak ${entry.streakNumber >= 0 ? '+' : ''}${entry.streakNumber}${entry.alliesNearby > 0 ? ` · ${entry.alliesNearby} ally${entry.alliesNearby > 1 ? 'ies' : ''} nearby` : ''}</div>`;
        const xpEl = document.createElement('div');
        xpEl.className = 'ker-xp';
        xpEl.textContent = `+${entry.xp}`;
        row.append(info, xpEl, actions);

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
          <div class="ker-meta">⏱ ${entry.timer}${entry.allies > 0 ? ` · ${entry.allies + 1} players` : ''}</div>`;
        const xpEl = document.createElement('div');
        xpEl.className = 'ker-xp';
        xpEl.textContent = `+${entry.xp}`;
        row.append(img, info, xpEl, actions);

      } else if (entry.type === 'score') {
        row.className = 'kill-event-row score-row';
        const info = document.createElement('div');
        info.className = 'ker-info';
        info.innerHTML = `
          <div class="ker-name">🏆 Scoring</div>
          <div class="ker-meta">⏱ ${entry.timer} · ${entry.points} pts</div>`;
        const xpEl = document.createElement('div');
        xpEl.className = 'ker-xp';
        xpEl.textContent = `+${entry.xp}`;
        row.append(info, xpEl, actions);
      }

      list.appendChild(row);
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function _makeKerBtn(text, title, cls, onClick) {
    const btn = document.createElement('button');
    btn.className = `ker-remove ${cls}`;
    btn.textContent = text;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function _safeInt(id, fallback) {
    const v = parseInt(document.getElementById(id)?.value);
    return isNaN(v) ? fallback : v;
  }

  // ─── Event bindings ───────────────────────────────────────────────────────

  /** Bind all Kill Queue + modal DOM events. Called once from main.js. */
  function bindEvents() {
    // Wild kill modal
    ['kill-min', 'kill-sec'].forEach(id => $(id).addEventListener('input', updateKillModalXP));

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
      addKillToQueue({
        type: 'wild',
        id: killModalTarget.id,
        name: killModalTarget.name,
        img: killModalTarget.img,
        timer: D.secondsToTimer(m * 60 + s),
        allies: parseInt($('allies-count').textContent) || 0,
        xp: parseInt($('kill-xp-preview').dataset.xp) || 0,
      });
      $('kill-modal-confirm').textContent = '+ Add to Queue';
      $('kill-modal').style.display = 'none';
      killModalTarget = null;
    });

    const closeKillModal = () => {
      editingIdx = null;
      killModalTarget = null;
      $('kill-modal-confirm').textContent = '+ Add to Queue';
      $('kill-modal').style.display = 'none';
    };
    $('kill-modal-cancel').addEventListener('click', closeKillModal);
    $('kill-modal-close').addEventListener('click', closeKillModal);
    $('kill-modal').addEventListener('click', e => { if (e.target === $('kill-modal')) closeKillModal(); });

    // Player KO modal
    $('add-player-ko-btn').addEventListener('click', openPlayerKOModal);
    ['pko-victim-level', 'pko-streak', 'pko-min', 'pko-sec'].forEach(id => $(id).addEventListener('input', updatePlayerKOPreview));
    document.querySelectorAll('input[name="pko-role"]').forEach(r => r.addEventListener('change', updatePlayerKOPreview));

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
      addKillToQueue({
        type: 'playerko',
        timer: D.secondsToTimer(m * 60 + s),
        victimLevel: parseInt($('pko-victim-level').value) || 1,
        streakNumber: _getPlayerKOStreakNumber(),
        isKoer: _isPlayerKOer(),
        alliesNearby: _getPlayerKOAlliesNearby(),
        applyCatchUp: $('pko-apply-catchup').checked,
        xp: parseInt($('pko-xp-preview').dataset.xp) || 0,
      });
      $('pko-modal-confirm').textContent = '+ Add to Queue';
      $('player-ko-modal').style.display = 'none';
    });

    const closePKOModal = () => {
      editingIdx = null;
      $('pko-modal-confirm').textContent = '+ Add to Queue';
      $('player-ko-modal').style.display = 'none';
    };
    $('pko-modal-cancel').addEventListener('click', closePKOModal);
    $('pko-modal-close').addEventListener('click', closePKOModal);
    $('player-ko-modal').addEventListener('click', e => { if (e.target === $('player-ko-modal')) closePKOModal(); });

    // Scoring
    $('add-score-btn').addEventListener('click', () => {
      const m = parseInt($('score-min').value) || 0;
      const s = parseInt($('score-sec').value) || 0;
      const pts = parseInt($('score-pts').value) || 10;
      addKillToQueue({ type: 'score', timer: D.secondsToTimer(m * 60 + s), points: pts, xp: D.getScoringXP(pts) });
    });

    $('clear-queue-btn').addEventListener('click', () => {
      state.killQueue = [];
      renderKillQueue();
    });
  }

  return {
    openKillModal,
    updateKillModalXP,
    openPlayerKOModal,
    updatePlayerKOPreview,
    addKillToQueue,
    removeFromQueue,
    duplicateQueueEntry,
    editQueueEntry,
    renderKillQueue,
    bindEvents,
  };
})();
