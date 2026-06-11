/**
 * simulation.js — Classic and Advanced simulation engine
 *
 * Classic: instant XP total calculation with breakdown.
 * Advanced: tick-by-tick simulation at 1/2/4x speed with:
 *   - Player track (main Kill Queue)
 *   - Ally track  (parallel preset, for Exp. Share XP comparison)
 *   - Enemy track (parallel preset, for live Catch-Up modifier)
 *
 * Exp. Share rule (item lv 20+, fixed at max tier):
 *   +5 XP/sec when the holder's total XP is strictly less than the ally's total XP.
 *   Checked every tick in Advanced mode using live XP values.
 *   In Classic mode, uses starting XP as a proxy.
 *
 * Exposes: window.XPCalcSim
 */

window.XPCalcSim = (function () {
  'use strict';

  const D = window.XPCalcData;
  const state = window.XPCalcState;
  const $ = id => document.getElementById(id);

  // ─── Simulation state ─────────────────────────────────────────────────────

  /** Live simulation state. Null when no sim is running. */
  let simState = null;

  /** setInterval handle for the tick loop. */
  let simInterval = null;

  /** Current playback speed multiplier (1 | 2 | 4). */
  let simSpeed = 1;

  // ─── Event building ───────────────────────────────────────────────────────

  /**
   * Build the sorted event list from a kill queue, filtered to the sim window.
   *
   * @param {object[]} killQueue - array of kill queue entries
   * @param {number}   startSec  - game timer seconds at simulation start
   * @param {number}   endSec    - game timer seconds at simulation end
   * @returns {object[]} events sorted descending by timerSec (earliest in game first)
   */
  function _buildTrackEvents(killQueue, startSec, endSec) {
    return killQueue
      .map(e => ({ ...e, timerSec: D.timerToSeconds(e.timer) }))
      .filter(e => e.timerSec <= startSec && e.timerSec >= endSec)
      .sort((a, b) => b.timerSec - a.timerSec);
  }

  /**
   * Read the start-timer and duration inputs, returning startSec and endSec.
   */
  function _getTimingWindow() {
    const startM = _safeInt('start-min', 10);
    const startS = _safeInt('start-sec', 0);
    const durM   = _safeInt('dur-min', 10);
    const durS   = _safeInt('dur-sec', 0);
    const startSec   = startM * 60 + startS;
    const durationSec = durM * 60 + durS;
    const endSec = Math.max(0, startSec - durationSec);
    return { startSec, endSec };
  }

  // ─── Passive XP helpers ───────────────────────────────────────────────────

  /**
   * Calculate total passive XP for a single track over a time window.
   *
   * Passive rate: 4 XP/sec before 8:00, 6 XP/sec after.
   * Catch-Up modifier is applied per-tick using the track's level at that second.
   * Exp. Share bonus (+5/s) is applied when playerXP < allyXP at that second —
   * only relevant for the player track (allyXPAtSec can be null for other tracks).
   *
   * @param {number}   startSec        - sim start (counts down)
   * @param {number}   endSec          - sim end
   * @param {Function} getLevelAtSec   - (sec) => level (for catch-up)
   * @param {Function} [getPlayerXPAtSec] - (sec) => player total XP (exp share check)
   * @param {Function} [getAllyXPAtSec]   - (sec) => ally total XP (exp share check)
   * @returns {number}
   */
  function _calculatePassiveXP(startSec, endSec, getLevelAtSec, getPlayerXPAtSec, getAllyXPAtSec) {
    const BOUNDARY = 8 * 60;
    let total = 0;

    for (let t = startSec - 1; t >= endSec; t--) {
      const rate  = t >= BOUNDARY ? 4 : 6;
      const level = getLevelAtSec(t);
      const catchupMult = D.getCatchUpModifier(level, state.enemyHighestLevel);
      let tick = Math.floor(rate * catchupMult);

      // Exp. Share: +5/sec when this track's XP < ally track's XP
      if (state.expShareEnabled && getPlayerXPAtSec && getAllyXPAtSec) {
        if (getPlayerXPAtSec(t) < getAllyXPAtSec(t)) {
          tick += 5;
        }
      }

      total += tick;
    }
    return total;
  }

  // ─── Classic calculation ──────────────────────────────────────────────────

  /**
   * Instant (non-animated) full XP calculation for the player track.
   * Returns a breakdown suitable for rendering in the Classic result panel.
   */
  function calculateClassic() {
    const { startSec, endSec } = _getTimingWindow();
    const startXPVal  = D.getStartXPForLevel(state.startLevel);
    const allyStartXP = D.getStartXPForLevel(state.allyStartLevel);

    const playerEvents = _buildTrackEvents(state.killQueue, startSec, endSec);
    const allyEvents   = _buildTrackEvents(state.allyKillQueue, startSec, endSec);

    // Estimate level at a given second for catch-up (event XP added cumulatively)
    const levelAtSec = (sec) => {
      let xp = startXPVal;
      for (const ev of playerEvents) {
        if (ev.timerSec > sec) xp = Math.min(xp + ev.xp, D.LEVEL_XP_TABLE[14]);
      }
      return D.getLevelFromXP(xp);
    };

    // Estimate ally XP at a given second (for Exp. Share comparison)
    const allyXPAtSec = (sec) => {
      let xp = allyStartXP;
      for (const ev of allyEvents) {
        if (ev.timerSec > sec) xp = Math.min(xp + ev.xp, D.LEVEL_XP_TABLE[14]);
      }
      return xp;
    };

    // Player XP at a given second (passive only, events added above)
    let runningPlayerXP = startXPVal;
    const playerXPAtSec = (sec) => runningPlayerXP; // rough proxy: use start XP

    const passiveTotal = _calculatePassiveXP(
      startSec, endSec, levelAtSec,
      state.expShareEnabled ? playerXPAtSec : null,
      state.expShareEnabled ? allyXPAtSec   : null
    );

    let eventXP = 0;
    playerEvents.forEach(e => { eventXP += e.xp; });

    let totalXP = Math.min(startXPVal + passiveTotal + eventXP, D.LEVEL_XP_TABLE[14]);
    return { totalXP, passiveTotal, eventXP, events: playerEvents, startSec, endSec };
  }

  /**
   * Render the Classic result panel using calculateClassic().
   */
  function showClassicResult() {
    const { totalXP, passiveTotal, eventXP, events, startSec, endSec } = calculateClassic();
    const startXP    = D.getStartXPForLevel(state.startLevel);
    const gained     = totalXP - startXP;
    const finalLevel = D.getLevelFromXP(totalXP);
    const remaining  = D.getXPToNextLevel(totalXP);

    $('res-total-xp').textContent    = gained.toLocaleString();
    $('res-final-level').textContent  = finalLevel;
    $('res-remaining-xp').textContent = finalLevel >= 15 ? 'MAX' : remaining.toLocaleString();

    const breakdown = $('result-breakdown');
    breakdown.innerHTML = '';

    // Passive XP row
    const durationSec = startSec - endSec;
    const BOUNDARY    = 8 * 60;
    const catchupMult = D.getCatchUpModifier(state.startLevel, state.enemyHighestLevel);
    const catchupNote = catchupMult > 1.0 ? ` · Catch-Up ×${catchupMult.toFixed(2)}` : '';
    let passiveDesc   = '';
    if      (startSec > BOUNDARY && endSec < BOUNDARY) passiveDesc = `(4/sec → 6/sec, mixed${catchupNote})`;
    else if (endSec >= BOUNDARY)                        passiveDesc = `(4 XP/sec × ${durationSec}s${catchupNote})`;
    else                                                passiveDesc = `(6 XP/sec × ${durationSec}s${catchupNote})`;

    if (state.expShareEnabled) {
      const pXP = D.getStartXPForLevel(state.startLevel);
      const aXP = D.getStartXPForLevel(state.allyStartLevel);
      if (pXP < aXP) passiveDesc += ' · +5/sec Exp. Share';
    }
    _addBreakdownRow(breakdown, '⏱', null, 'Passive XP', passiveDesc, passiveTotal);

    // Event rows
    events.forEach(ev => {
      let label, meta;
      if      (ev.type === 'score')    { label = `🏆 Score (${ev.points} pts)`;          meta = `@ ${ev.timer}`; }
      else if (ev.type === 'playerko') { label = `⚔️ Player KO${ev.isAssist ? ' (Assist)' : ''}`; meta = `@ ${ev.timer} · Victim Lv.${ev.victimLevel}`; }
      else                             { label = ev.name;                                 meta = `@ ${ev.timer}`; }
      _addBreakdownRow(breakdown, null, ev.img || null, label, meta, ev.xp);
    });

    $('result-mode-label').textContent = 'Classic Result';
    $('result-classic').style.display   = '';
    $('result-advanced').style.display  = 'none';
    $('result-panel').style.display     = '';
    $('result-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** Render one row in the Classic breakdown table. */
  function _addBreakdownRow(container, emoji, imgSrc, name, meta, xp) {
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
   * Returns the evolution levels for the currently selected Pokémon, or null.
   * Used to detect "stored XP" levels (one level before an evolution).
   */
  function _getSelectedEvolutionLevels() {
    if (!state.selectedPokemon) return null;
    const poke = D.PLAYER_POKEMON.find(p => p.name === state.selectedPokemon);
    return poke ? poke.evolutionLevels : null;
  }

  /**
   * Returns true if `level` is a "stored XP" level for the selected Pokémon,
   * i.e. it is one level before an evolution threshold.
   */
  function _isStoredXPLevel(level) {
    const evos = _getSelectedEvolutionLevels();
    if (!evos) return false;
    return evos.some(evo => evo - 1 === level);
  }

  /**
   * Initialize and start the Advanced Simulation.
   *
   * Three parallel tracks are run simultaneously:
   *   - player : the main Pokémon (state.killQueue, state.startLevel)
   *   - ally   : the ally Pokémon  (state.allyKillQueue, state.allyStartLevel) — optional
   *   - enemy  : the enemy Pokémon (state.enemyKillQueue, state.enemyStartLevel) — optional
   *
   * The enemy track's live level is used for the Catch-Up modifier.
   * The ally track's live XP is used for the Exp. Share condition.
   */
  function showAdvancedResult() {
    const { startSec, endSec } = _getTimingWindow();

    simState = {
      currentSec: startSec,
      endSec,

      // ── Player track ──
      player: {
        totalXP:   D.getStartXPForLevel(state.startLevel),
        storedXP:  0,
        events:    _buildTrackEvents(state.killQueue, startSec, endSec),
      },

      // ── Ally track (may have no events if no preset assigned) ──
      ally: {
        totalXP:  D.getStartXPForLevel(state.allyStartLevel),
        storedXP: 0,
        events:   _buildTrackEvents(state.allyKillQueue, startSec, endSec),
        active:   state.allyKillQueue.length > 0 || state.expShareEnabled,
      },

      // ── Enemy track ──
      enemy: {
        totalXP:  D.getStartXPForLevel(state.enemyStartLevel),
        storedXP: 0,
        events:   _buildTrackEvents(state.enemyKillQueue, startSec, endSec),
        active:   state.enemyKillQueue.length > 0,
      },

      paused: true,
    };

    simSpeed = 1;
    $('sim-speed-btn').dataset.speed = '1';
    $('sim-speed-btn').textContent   = '1x';
    $('sim-play-pause').textContent  = '▶ Play';
    $('sim-log').innerHTML           = '';

    _updateSimDisplay();
    _updateSimLiveIndicator();
    _renderSimTracksHeader();

    // Initial log messages
    const initMult = D.getCatchUpModifier(state.startLevel, state.enemyHighestLevel);
    if (initMult > 1.0) addLog(startSec, `⚡ Catch-Up ×${initMult.toFixed(2)} (enemy Lv.${state.enemyHighestLevel})`, null, null);

    if (state.expShareEnabled) {
      const pXP = simState.player.totalXP;
      const aXP = simState.ally.totalXP;
      const active = pXP < aXP;
      addLog(startSec, active
        ? `🔗 Exp. Share active — +5 XP/sec (${pXP} < ${aXP} XP)`
        : `🔗 Exp. Share equipped but inactive (${pXP} ≥ ${aXP} XP)`, null, null);
    }

    if (_isStoredXPLevel(state.startLevel)) {
      const evos   = D.PLAYER_POKEMON.find(p => p.name === state.selectedPokemon)?.evolutionLevels || [];
      const nextEvo = evos.find(e => e === state.startLevel + 1);
      addLog(startSec, `📦 Stored XP active from start (Lv.${state.startLevel}, evolves at Lv.${nextEvo})`, null, 'stored-info');
    }

    if (simState.ally.active) addLog(startSec, `🤝 Ally track active (Lv.${state.allyStartLevel})`, null, null);
    if (simState.enemy.active) addLog(startSec, `🎯 Enemy track active (Lv.${state.enemyStartLevel})`, null, null);

    $('result-mode-label').textContent = 'Advanced Simulation';
    $('result-classic').style.display  = 'none';
    $('result-advanced').style.display = '';
    $('result-panel').style.display    = '';
    $('result-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Render the live track header (player / ally / enemy level badges).
   * Only shows ally and enemy badges when their tracks are active.
   */
  function _renderSimTracksHeader() {
    const container = $('sim-tracks-header');
    if (!container) return;
    container.innerHTML = '';

    // Player badge — always shown
    const playerBadge = document.createElement('div');
    playerBadge.className = 'sim-track-badge player-track';
    playerBadge.innerHTML = `<span class="sim-track-label">YOU</span><span class="sim-track-level" id="sim-track-player-level">Lv.${state.startLevel}</span>`;
    container.appendChild(playerBadge);

    // Ally badge — shown when a preset or Exp. Share is active
    if (simState.ally.active) {
      const allyBadge = document.createElement('div');
      allyBadge.className = 'sim-track-badge ally-track';
      allyBadge.innerHTML = `<span class="sim-track-label">ALLY</span><span class="sim-track-level" id="sim-track-ally-level">Lv.${state.allyStartLevel}</span><span class="sim-track-xp" id="sim-track-ally-xp">${D.getStartXPForLevel(state.allyStartLevel).toLocaleString()} XP</span>`;
      container.appendChild(allyBadge);

      const expBadge = document.createElement('div');
      expBadge.className = 'sim-expshare-badge' + (state.expShareEnabled ? '' : ' hidden');
      expBadge.id = 'sim-expshare-live-badge';
      expBadge.textContent = '🔗 Exp. Share';
      container.appendChild(expBadge);
    }

    // Enemy badge — shown when a preset is active
    if (simState.enemy.active) {
      const enemyBadge = document.createElement('div');
      enemyBadge.className = 'sim-track-badge enemy-track';
      enemyBadge.innerHTML = `<span class="sim-track-label">ENEMY</span><span class="sim-track-level" id="sim-track-enemy-level">Lv.${state.enemyStartLevel}</span><span class="sim-track-xp" id="sim-track-enemy-xp">${D.getStartXPForLevel(state.enemyStartLevel).toLocaleString()} XP</span>`;
      container.appendChild(enemyBadge);
    }
  }

  // ─── Simulation tick ─────────────────────────────────────────────────────

  /**
   * Advance the simulation by one second.
   * Runs on setInterval at (1000 / simSpeed)ms.
   *
   * Per tick:
   *  1. Advance all tracks (player, ally, enemy) with passive XP
   *  2. Fire active events for each track
   *  3. Check and log level-ups, stored XP transitions, Catch-Up changes, Exp. Share changes
   *  4. Update the display
   */
  function _simStep() {
    if (!simState || simState.paused) return;

    simState.currentSec--;

    // Simulation complete
    if (simState.currentSec < simState.endSec) {
      clearInterval(simInterval);
      simInterval = null;
      simState.paused = true;
      $('sim-play-pause').textContent = '▶ Play';
      addLog(simState.currentSec + 1, '✅ Simulation complete!', null, 'levelup');
      _updateSimDisplay();
      _updateSimLiveIndicator();
      return;
    }

    const t = simState.currentSec;
    const BOUNDARY = 8 * 60;
    const passiveRate = t >= BOUNDARY ? 4 : 6;

    // ── Enemy track (advance first so catch-up uses updated enemy level) ──
    if (simState.enemy.active) {
      _advanceTrack(simState.enemy, passiveRate, 1.0, false, null, null, 'enemy');
    }

    // Live enemy level for Catch-Up modifier on the player track this tick
    const liveEnemyLevel = D.getLevelFromXP(simState.enemy.active
      ? simState.enemy.totalXP
      : D.getStartXPForLevel(state.enemyHighestLevel));

    const playerLevel    = D.getLevelFromXP(simState.player.totalXP);
    const catchupMult    = D.getCatchUpModifier(playerLevel, liveEnemyLevel);

    // ── Ally track ──
    if (simState.ally.active) {
      _advanceTrack(simState.ally, passiveRate, 1.0, false, null, null, 'ally');
    }

    // ── Player track (with Exp. Share comparison vs live ally XP) ──
    const playerXP  = simState.player.totalXP;
    const allyXP    = simState.ally.active ? simState.ally.totalXP : Infinity;
    const expShareOn = state.expShareEnabled && playerXP < allyXP;

    _advanceTrack(simState.player, passiveRate, catchupMult, expShareOn, playerXP, allyXP, 'player');

    _updateSimDisplay();
    _updateSimLiveIndicator();
  }

  /**
   * Advance a single simulation track by one second.
   *
   * @param {object}  track        - one of simState.player / .ally / .enemy
   * @param {number}  passiveRate  - base passive XP this tick (4 or 6)
   * @param {number}  catchupMult  - catch-up multiplier (1.0 = inactive)
   * @param {boolean} expShareOn   - whether +5 Exp. Share bonus applies this tick
   * @param {number}  playerXP     - current player XP (for logging Exp. Share status changes)
   * @param {number}  allyXP       - current ally XP (for logging)
   * @param {string}  trackName    - 'player' | 'ally' | 'enemy' (for log prefixes)
   */
  function _advanceTrack(track, passiveRate, catchupMult, expShareOn, playerXP, allyXP, trackName) {
    const t = simState.currentSec;
    const prevLevel = D.getLevelFromXP(track.totalXP);
    const isPlayer  = trackName === 'player';

    // ── Passive XP ──
    let passiveTick = Math.floor(passiveRate * catchupMult);
    if (expShareOn) passiveTick += 5;

    if (isPlayer && _isStoredXPLevel(prevLevel)) {
      track.storedXP = (track.storedXP || 0) + passiveTick;
    } else {
      track.totalXP = Math.min(track.totalXP + passiveTick, D.LEVEL_XP_TABLE[14]);
    }

    // ── Active events ──
    const events = track.events.filter(e => e.timerSec === t);
    events.forEach(ev => {
      let label = '';
      if      (ev.type === 'score')    label = `🏆 Score (${ev.points} pts)`;
      else if (ev.type === 'playerko') label = `⚔️ Player KO${ev.isAssist ? ' (Assist)' : ''} Lv.${ev.victimLevel}`;
      else                             label = `⚔️ ${ev.name}`;

      if (trackName !== 'player') label = `[${trackName.toUpperCase()}] ${label}`;

      const baseXP = ev.xp;
      let activeXP = baseXP;
      let catchupBonus = 0;

      if (catchupMult > 1.0 && isPlayer) {
        activeXP = Math.floor(baseXP * catchupMult);
        catchupBonus = activeXP - baseXP;
      }

      // Stored XP conversion (player only)
      let converted = 0;
      if (isPlayer) {
        const stored = track.storedXP || 0;
        converted = Math.min(stored, baseXP);
        track.storedXP = stored - converted;
      }

      const totalGain = activeXP + converted;
      track.totalXP = Math.min(track.totalXP + totalGain, D.LEVEL_XP_TABLE[14]);

      // Log with detail note
      let note = null;
      if (catchupBonus > 0 && converted > 0)    note = `+${baseXP} +${converted} stored (+${catchupBonus} catch-up) = +${totalGain}`;
      else if (catchupBonus > 0)                  note = `+${baseXP} (+${catchupBonus} catch-up) = +${totalGain}`;
      else if (converted > 0)                     note = `+${baseXP} +${converted} stored = +${totalGain}`;

      addLog(t, label, totalGain, converted > 0 ? 'stored' : null, note);

      if (converted > 0) {
        addLog(t, `📦 Stored converted: ${converted} XP (${track.storedXP} remaining)`, null, 'stored-info');
      }

      track.events.splice(track.events.indexOf(ev), 1);
    });

    // ── Level-up log ──
    const newLevel = D.getLevelFromXP(track.totalXP);
    if (newLevel > prevLevel) {
      const prefix = isPlayer ? '' : `[${trackName.toUpperCase()}] `;
      addLog(t, `${prefix}⬆️ Level Up! Now Lv. ${newLevel}`, null, 'levelup');

      if (isPlayer) {
        // Stored XP transition
        const wasStored = _isStoredXPLevel(prevLevel);
        const nowStored = _isStoredXPLevel(newLevel);
        if (!wasStored && nowStored) {
          const evos    = D.PLAYER_POKEMON.find(p => p.name === state.selectedPokemon)?.evolutionLevels || [];
          const nextEvo = evos.find(e => e === newLevel + 1);
          addLog(t, `📦 Stored XP activated (evolves at Lv.${nextEvo})`, null, 'stored-info');
        } else if (wasStored && !nowStored) {
          addLog(t, '📦 Stored XP deactivated — back to normal passive', null, 'stored-info');
        }

        // Catch-Up change
        const oldMult = D.getCatchUpModifier(prevLevel, D.getLevelFromXP(
          simState.enemy.active ? simState.enemy.totalXP : D.getStartXPForLevel(state.enemyHighestLevel)
        ));
        const newMult = D.getCatchUpModifier(newLevel, D.getLevelFromXP(
          simState.enemy.active ? simState.enemy.totalXP : D.getStartXPForLevel(state.enemyHighestLevel)
        ));
        if (newMult !== oldMult) {
          if (newMult > 1.0) addLog(t, `⚡ Catch-Up ×${newMult.toFixed(2)} now active`, null, null);
          else if (oldMult > 1.0) addLog(t, 'Catch-Up modifier deactivated', null, null);
        }

        // Exp. Share change
        if (state.expShareEnabled && simState.ally.active) {
          const wasOn = playerXP < allyXP;
          const nowOn = track.totalXP < simState.ally.totalXP;
          if (!wasOn && nowOn) addLog(t, `🔗 Exp. Share activated (+5 XP/sec)`, null, null);
          else if (wasOn && !nowOn) addLog(t, `🔗 Exp. Share deactivated (XP ≥ ally)`, null, null);
        }
      }
    }

    // Update live level badges
    if (trackName === 'player') {
      const el = $('sim-track-player-level');
      if (el) el.textContent = `Lv.${newLevel}`;
    } else if (trackName === 'ally') {
      const el = $('sim-track-ally-level');
      if (el) el.textContent = `Lv.${newLevel}`;
      const xpEl = $('sim-track-ally-xp');
      if (xpEl) xpEl.textContent = `${track.totalXP.toLocaleString()} XP`;
    } else if (trackName === 'enemy') {
      const el = $('sim-track-enemy-level');
      if (el) el.textContent = `Lv.${newLevel}`;
      const xpEl = $('sim-track-enemy-xp');
      if (xpEl) xpEl.textContent = `${track.totalXP.toLocaleString()} XP`;
    }
  }

  // ─── Display update ───────────────────────────────────────────────────────

  /** Refresh all display elements from the current simState. */
  function _updateSimDisplay() {
    if (!simState) return;

    $('sim-timer-val').textContent = D.secondsToTimer(simState.currentSec);

    const xp    = simState.player.totalXP;
    const level = D.getLevelFromXP(xp);
    const stored = simState.player.storedXP || 0;
    const isStoredLevel = _isStoredXPLevel(level);

    $('sim-xp-val').textContent    = xp.toLocaleString();
    $('sim-xp-to-next').textContent = level >= 15 ? 'MAX' : D.getXPToNextLevel(xp).toLocaleString();
    $('sim-level-badge').textContent = isStoredLevel ? `Lv. ${level} · 📦 Stored` : `Lv. ${level}`;
    $('sim-xp-bar').style.width = D.getLevelProgressPct(xp) + '%';

    const storedStat   = $('sim-stored-stat');
    const storedBarWrap = $('sim-stored-bar-wrap');
    const storedBadge  = $('sim-stored-badge');

    if (stored > 0 || isStoredLevel) {
      storedStat.style.display    = '';
      $('sim-stored-val').textContent = stored.toLocaleString();
      storedBarWrap.style.display = '';
      const toNext = level >= 15 ? 1 : D.getXPToNextLevel(D.getStartXPForLevel(level));
      $('sim-stored-bar').style.width = `${toNext > 0 ? Math.min(100, Math.round((stored / toNext) * 100)) : 0}%`;
      storedBadge.style.display = isStoredLevel ? '' : 'none';
    } else {
      storedStat.style.display    = 'none';
      storedBarWrap.style.display = 'none';
      storedBadge.style.display   = 'none';
    }

    // Update Exp. Share live badge
    if (simState.ally.active && state.expShareEnabled) {
      const badge = $('sim-expshare-live-badge');
      if (badge) {
        const on = simState.player.totalXP < simState.ally.totalXP;
        badge.className = 'sim-expshare-badge' + (on ? ' active' : '');
        badge.textContent = on ? '🔗 +5 XP/s' : '🔗 Off';
      }
    }
  }

  /** Update the "pending events" indicator above the sim log. */
  function _updateSimLiveIndicator() {
    const indicator = $('sim-live-indicator');
    if (!indicator || !simState) return;
    const pending = simState.player.events.filter(e => e.timerSec <= simState.currentSec).length;
    indicator.textContent = pending > 0
      ? `${pending} event(s) pending`
      : 'No events pending';
  }

  // ─── Log ─────────────────────────────────────────────────────────────────

  /**
   * Append a line to the simulation log.
   *
   * @param {number}      timerSec - game time of the event
   * @param {string}      msg      - main message text
   * @param {number|null} xp       - XP gain to display, or null
   * @param {string|null} style    - 'levelup' | 'stored' | 'stored-info' | null
   * @param {string|null} note     - extra note shown in the XP column
   */
  function addLog(timerSec, msg, xp, style, note) {
    const log   = $('sim-log');
    const entry = document.createElement('div');

    let cls = 'sim-log-entry';
    if      (style === 'levelup')                     cls += ' levelup';
    else if (style === 'stored' || style === 'stored-info') cls += ' stored-convert';
    entry.className = cls;

    const timeEl = document.createElement('span');
    timeEl.className   = 'sim-log-time';
    timeEl.textContent = D.secondsToTimer(timerSec);

    const msgEl = document.createElement('span');
    msgEl.className   = 'sim-log-msg';
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

  // ─── Public: playback controls ────────────────────────────────────────────

  /** Inject an event into the live simulation (used by queue's live-inject logic). */
  function injectEvent(enrichedEntry) {
    if (!simState) return;
    simState.player.events.push(enrichedEntry);
  }

  /** Return the current simState (read-only reference). */
  function getSimState() { return simState; }

  // ─── Event bindings ───────────────────────────────────────────────────────

  /** Bind all simulation control DOM events. Called once from main.js. */
  function bindEvents() {
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
        simInterval = setInterval(_simStep, Math.floor(1000 / simSpeed));
      } else {
        clearInterval(simInterval);
        simInterval = null;
      }
    });

    $('sim-speed-btn').addEventListener('click', () => {
      const speeds = [1, 2, 4];
      simSpeed = speeds[(speeds.indexOf(simSpeed) + 1) % speeds.length];
      $('sim-speed-btn').textContent    = `${simSpeed}x`;
      $('sim-speed-btn').dataset.speed  = simSpeed;
      if (simInterval) {
        clearInterval(simInterval);
        simInterval = setInterval(_simStep, Math.floor(1000 / simSpeed));
      }
    });

    $('sim-restart-btn').addEventListener('click', () => {
      clearInterval(simInterval);
      simInterval = null;
      showAdvancedResult();
    });

    // "Add event" button: pause and scroll to events section
    const simAddBtn = $('sim-add-event-btn');
    if (simAddBtn) {
      simAddBtn.addEventListener('click', () => {
        if (simState && !simState.paused) {
          simState.paused = true;
          clearInterval(simInterval);
          simInterval = null;
          $('sim-play-pause').textContent = '▶ Play';
          addLog(simState.currentSec, '⏸ Paused to add event', null, null);
        }
        const evSection = document.querySelector('.events-section') || document.querySelector('.wild-panel');
        if (evSection) evSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // "Player KO live" button: pause and open KO modal
    const simPKOBtn = $('sim-add-pko-btn');
    if (simPKOBtn) {
      simPKOBtn.addEventListener('click', () => {
        if (simState && !simState.paused) {
          simState.paused = true;
          clearInterval(simInterval);
          simInterval = null;
          $('sim-play-pause').textContent = '▶ Play';
        }
        window.XPCalcQueue.openPlayerKOModal();
      });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function _safeInt(id, fallback) {
    const v = parseInt(document.getElementById(id)?.value);
    return isNaN(v) ? fallback : v;
  }

  return {
    calculateClassic,
    showClassicResult,
    showAdvancedResult,
    getSimState,
    injectEvent,
    addLog,
    bindEvents,
  };
})();