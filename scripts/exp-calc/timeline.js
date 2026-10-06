/**
 * timeline.js — DOM-free, second-by-second XP timeline engine
 *
 * Mirrors the tick logic of the Advanced Simulation (simulation.js → _simStep)
 * but runs instantly and returns the whole curve, so it can be used for:
 *   - level goals ("level 9 by 4:00")
 *   - the rotation optimizer
 *   - the XP / level curve chart
 *   - the two-rotation comparator
 *
 * Tick order (identical to the live simulation), for each second t from
 * startSec-1 down to endSec:
 *   1. enemy track  : passive (4/s before 8:00, 6/s after) + its events
 *   2. live enemy level → Catch-Up multiplier for the player
 *   3. ally track   : passive + its events
 *   4. player track : passive × Catch-Up (+5 Exp. Share if XP < ally XP),
 *                     or stored XP at "one level before evolution" levels,
 *                     then events firing at timerSec === t
 *                     (× Catch-Up, with Stored XP conversion)
 *
 * Exposes: window.XPCalcTimeline
 */

window.XPCalcTimeline = (function () {
  'use strict';

  const D = window.XPCalcData;
  const MAX_XP = D.LEVEL_XP_TABLE[14];

  /** Group events by second → Map<sec, number[]> (base XP values). */
  function _bucket(events) {
    const m = new Map();
    for (const e of events || []) {
      const sec = e.timerSec != null ? e.timerSec : D.timerToSeconds(e.timer);
      if (!m.has(sec)) m.set(sec, []);
      m.get(sec).push(e.xp);
    }
    return m;
  }

  function _isStoredLevel(level, evoLevels) {
    return !!evoLevels && evoLevels.some(evo => evo - 1 === level);
  }

  /**
   * Run the timeline.
   *
   * @param {object} cfg
   * @param {number} cfg.startSec            game timer (s) at start
   * @param {number} cfg.endSec              game timer (s) at end
   * @param {number} cfg.startLevel          player start level
   * @param {object[]} cfg.events            player events ({timer|timerSec, xp})
   * @param {boolean} cfg.expShare           Exp. Share equipped
   * @param {number[]|null} cfg.evolutionLevels
   * @param {number} cfg.enemyHighestLevel   Catch-Up reference when no enemy track
   * @param {number} [cfg.allyStartLevel]
   * @param {object[]} [cfg.allyEvents]
   * @param {number} [cfg.enemyStartLevel]
   * @param {object[]} [cfg.enemyEvents]
   * @param {number} [cfg.stopAtXP]          stop as soon as the player's XP reaches this value
   * @returns {{startSec,endSec,n,p:Int32Array,a:Int32Array,e:Int32Array,s:Int32Array,
   *            allyActive:boolean, enemyActive:boolean}}
   *   Arrays are indexed by i = startSec - t  (i = 0 is the initial state).
   */
  function run(cfg) {
    const { startSec, endSec } = cfg;
    const n = Math.max(0, startSec - endSec) + 1;
    const evo = cfg.evolutionLevels || null;

    const pEv = _bucket(cfg.events);
    const aEv = _bucket(cfg.allyEvents);
    const eEv = _bucket(cfg.enemyEvents);
    const allyActive  = (cfg.allyEvents && cfg.allyEvents.length > 0) || !!cfg.expShare;
    const enemyActive = !!(cfg.enemyEvents && cfg.enemyEvents.length > 0);

    let pXP = D.getStartXPForLevel(cfg.startLevel);
    let aXP = D.getStartXPForLevel(cfg.allyStartLevel || 1);
    let eXP = D.getStartXPForLevel(cfg.enemyStartLevel || 1);
    let stored = 0;
    const enemyRefXP = D.getStartXPForLevel(cfg.enemyHighestLevel || 1);

    const P = new Int32Array(n), A = new Int32Array(n), E = new Int32Array(n), S = new Int32Array(n);
    P[0] = pXP; A[0] = aXP; E[0] = eXP; S[0] = 0;
    const stopAt = cfg.stopAtXP != null ? cfg.stopAtXP : Infinity;

    for (let i = 1; i < n; i++) {
      const t = startSec - i;
      const rate = t >= 480 ? 4 : 6;

      // 1. enemy
      if (enemyActive) {
        eXP = Math.min(eXP + rate, MAX_XP);
        const evs = eEv.get(t);
        if (evs) for (const x of evs) eXP = Math.min(eXP + x, MAX_XP);
      }
      const liveEnemyLvl = D.getLevelFromXP(enemyActive ? eXP : enemyRefXP);

      // 2. catch-up from the player's level BEFORE this tick
      const prevLvl = D.getLevelFromXP(pXP);
      const mult = D.getCatchUpModifier(prevLvl, liveEnemyLvl);

      // 3. ally
      if (allyActive) {
        aXP = Math.min(aXP + rate, MAX_XP);
        const evs = aEv.get(t);
        if (evs) for (const x of evs) aXP = Math.min(aXP + x, MAX_XP);
      }

      // 4. player
      const allyRef = allyActive ? aXP : Infinity;
      const expOn = !!cfg.expShare && pXP < allyRef;
      let tick = Math.floor(rate * mult);
      if (expOn) tick += 5;
      if (_isStoredLevel(prevLvl, evo)) stored += tick;
      else pXP = Math.min(pXP + tick, MAX_XP);

      const evs = pEv.get(t);
      if (evs) {
        for (const base of evs) {
          const active = mult > 1.0 ? Math.floor(base * mult) : base;
          const conv = Math.min(stored, base);
          stored -= conv;
          pXP = Math.min(pXP + active + conv, MAX_XP);
        }
      }

      P[i] = pXP; A[i] = aXP; E[i] = eXP; S[i] = stored;

      if (stopAt !== Infinity && pXP >= stopAt) {
        return { startSec, endSec, n: i + 1, p: P.subarray(0, i + 1), a: A.subarray(0, i + 1),
                 e: E.subarray(0, i + 1), s: S.subarray(0, i + 1), allyActive, enemyActive };
      }
    }

    return { startSec, endSec, n, p: P, a: A, e: E, s: S, allyActive, enemyActive };
  }

  /** First game-second at which the player's level ≥ `level`, or null. */
  function reachSec(tl, level) {
    const target = D.LEVEL_XP_TABLE[level - 1] || 0;
    for (let i = 0; i < tl.n; i++) {
      if (tl.p[i] >= target) return tl.startSec - i;
    }
    return null;
  }

  /** Player XP at game-second `sec` (clamped to the window). */
  function xpAt(tl, sec) {
    const i = Math.min(tl.n - 1, Math.max(0, tl.startSec - sec));
    return tl.p[i];
  }

  /** Same helpers for the other tracks. */
  function levelAt(tl, sec, track = 'p') {
    const i = Math.min(tl.n - 1, Math.max(0, tl.startSec - sec));
    return D.getLevelFromXP(tl[track][i]);
  }

  return { run, reachSec, xpAt, levelAt };
})();