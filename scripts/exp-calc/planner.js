/**
 * planner.js — Level goals + rotation optimizer (DOM-free)
 *
 * What is EXACT here:  the XP math (passive, Catch-Up, Exp. Share, Stored XP,
 *                      wild XP by kill time) — everything goes through timeline.js.
 * What is ESTIMATED:   how long a player needs to walk to a camp and kill it.
 *                      The game data has no travel/kill durations, so they are
 *                      two adjustable parameters (travelSec, killSec).
 *
 * Camp model (from data/spawns_*.json): each camp has a first spawn timer and
 * either respawns `respawn` seconds after being killed, never respawns, or
 * appears in fixed waves (Altaria). A kill at game-time t gives the XP of the
 * WILD_DATA step function at t (D.getWildXP). `counts[id]` = how many identical
 * camps you can farm (assumed to be yours alone — adjustable in the UI).
 *
 * Team objectives (Regi*, Regidrago, legendary) are not planned: add them to the
 * queue manually, they are kept as fixed events.
 *
 * Exposes: window.XPCalcPlanner
 */

window.XPCalcPlanner = (function () {
  'use strict';

  const D = window.XPCalcData;
  const T = window.XPCalcTimeline;

  /**
   * Camp definitions, keyed by WILD_DATA id.
   *   respawn camps : { first, respawn }          (first = timer in seconds)
   *   one-shot camps: { first, respawn: 0 }
   *   wave camps    : { waves:[...], len }        (fixed spawn timers, `len` s up each)
   *   copies        : default number of camps you can farm
   */
  const CAMPS = {
    bunnelby_start: { first: 600, respawn: 0,  copies: 3 },
    xatu:           { first: 599, respawn: 0,  copies: 1 },
    natu:           { first: 560, respawn: 60, copies: 1 },
    bunnelby:       { first: 575, respawn: 60, copies: 2 },
    baltoy_jungle:  { first: 585, respawn: 60, copies: 2 },
    baltoy_center:  { first: 550, respawn: 60, copies: 2 },
    baltoy_lane:    { first: 580, respawn: 60, copies: 1 },
    indeedee:       { first: 570, respawn: 60, copies: 2 },
    escavalier:     { first: 585, respawn: 60, copies: 1 },
    accelgor:       { first: 585, respawn: 60, copies: 1 },
    altaria:        { waves: [530, 440, 350, 260, 170, 80], len: 90, copies: 1 },
  };

  function defaultCounts(mapId) {
    const out = {};
    (D.WILD_DATA[mapId] || []).forEach(m => {
      if (CAMPS[m.id]) out[m.id] = CAMPS[m.id].copies;
    });
    return out;
  }

  /** The farmable mobs of a map, in display order. */
  function farmableMobs(mapId) {
    return (D.WILD_DATA[mapId] || []).filter(m => CAMPS[m.id]);
  }

  /**
   * Instantiate camp "items": one per physical camp copy (respawn/one-shot) or
   * per wave (wave camps). Each item has `avail` (the game timer at/below which
   * it can be killed), `until` (kills must be strictly above it) and `respawn`.
   */
  function buildItems(mapId, counts) {
    const items = [];
    farmableMobs(mapId).forEach(m => {
      const def = CAMPS[m.id];
      const n = counts && counts[m.id] != null ? counts[m.id] : def.copies;
      for (let c = 0; c < n; c++) {
        if (def.waves) {
          def.waves.forEach(w => items.push({ id: m.id, name: m.name, img: m.img, avail: w, until: w - def.len, respawn: 0, copy: c }));
        } else {
          items.push({ id: m.id, name: m.name, img: m.img, avail: def.first, until: -1, respawn: def.respawn, copy: c });
        }
      }
    });
    return items;
  }

  /** XP for killing camp `id` at game-second `sec`, with ally splitting. */
  function wildXP(mapId, id, sec, allies) {
    let xp = D.getWildXP(id, mapId, D.secondsToTimer(sec));
    if (allies > 0) xp = Math.floor(xp / (allies + 1) * 1.2);
    return xp;
  }

  /** Build the cfg object timeline.run() expects from the live app state. */
  function baseConfig(state, startSec, endSec) {
    const poke = state.selectedPokemon
      ? D.PLAYER_POKEMON.find(p => p.name === state.selectedPokemon) : null;
    return {
      startSec, endSec,
      startLevel: state.startLevel,
      expShare: !!state.expShareEnabled,
      evolutionLevels: poke ? poke.evolutionLevels : null,
      enemyHighestLevel: state.enemyHighestLevel,
      allyStartLevel: state.allyStartLevel,
      allyEvents: state.allyKillQueue,
      enemyStartLevel: state.enemyStartLevel,
      enemyEvents: state.enemyKillQueue,
    };
  }

  const toEv = e => ({ timerSec: D.timerToSeconds(e.timer), xp: e.xp });

  /**
   * Evaluate a queue against a level goal.
   * @returns {{reach:number|null, xpAtDeadline:number, needXP:number, missing:number, tl:object}}
   */
  function evaluate(cfg, events, goalLevel, deadlineSec) {
    const tl = T.run({ ...cfg, events: events.map(toEv) });
    const needXP = D.LEVEL_XP_TABLE[goalLevel - 1] || 0;
    const reach = T.reachSec(tl, goalLevel);
    const dl = Math.max(cfg.endSec, deadlineSec);
    const xpAtDeadline = T.xpAt(tl, dl);
    // Stored XP (one level before an evolution) is real XP waiting for a kill to convert it
    const stored = tl.s[Math.min(tl.n - 1, Math.max(0, tl.startSec - dl))];
    return { reach, xpAtDeadline, stored, needXP, missing: Math.max(0, needXP - xpAtDeadline - stored), tl };
  }

  /**
   * Beam search: the rotation that maximizes the player's XP at `deadlineSec`
   * (or reaches `goalLevel` by then).
   *
   * @param {object} o
   *   cfg          base timeline config (see baseConfig); cfg.endSec is overridden
   *   mapId, counts, allies   camp availability (counts[id] = identical camps you can farm)
   *   manual       events kept as-is (all queue entries you want to keep)
   *   manualWild   subset of `manual` that are camp kills (they consume camps)
   *   goalLevel, deadlineSec
   *   travelSec    walking time between two camps (default 12)
   *   killSec      time to kill a camp (default 8)
   *   beam         beam width (default 28)
   * @returns {Promise<{reached:boolean, reach:number|null, xp:number, kills:object[], evaluated:number}>}
   *   kills: [{ item, id, name, img, t (game-second), xp }] sorted chronologically
   */
  async function planForDeadline(o) {
    const goal = o.goalLevel;
    const needXP = D.LEVEL_XP_TABLE[goal - 1] || 0;
    const deadline = Math.max(0, o.deadlineSec);
    const cfg = { ...o.cfg, endSec: deadline };
    const travel = o.travelSec != null ? o.travelSec : 12;
    const kill = o.killSec != null ? o.killSec : 8;
    const allies = o.allies || 0;
    const BEAM = o.beam || 28;
    const BRANCH = 7;
    const GONE = -9999;
    const manual = (o.manual || []).map(toEv);
    const items = buildItems(o.mapId, o.counts);

    // Camps already consumed by manual camp kills (processed chronologically)
    const avail0 = Int16Array.from(items.map(it => it.avail));
    (o.manualWild || []).slice()
      .sort((a, b) => D.timerToSeconds(b.timer) - D.timerToSeconds(a.timer))
      .forEach(m => {
        const sec = D.timerToSeconds(m.timer);
        let idx = -1;
        items.forEach((it, i) => {
          if (it.id !== m.id || avail0[i] === GONE || sec > avail0[i] || sec <= it.until) return;
          if (idx < 0 || avail0[i] < avail0[idx]) idx = i;
        });
        if (idx >= 0) avail0[idx] = items[idx].respawn > 0 ? sec - items[idx].respawn : GONE;
      });

    const xpCache = new Map();
    const xpFor = (id, sec) => {
      const k = id + '@' + sec;
      let v = xpCache.get(k);
      if (v === undefined) { v = wildXP(o.mapId, id, sec, allies); xpCache.set(k, v); }
      return v;
    };

    let evaluated = 0;
    const evalState = (kills) => {
      evaluated++;
      const evs = manual.concat(kills.map(k => ({ timerSec: k.t, xp: k.xp })));
      const tl = T.run({ ...cfg, events: evs, stopAtXP: needXP });
      return { reach: T.reachSec(tl, goal), xp: tl.p[tl.n - 1] };
    };

    // Estimated XP/s still to be earned from the remaining time (ranking heuristic only)
    let rate = 8;
    const root = { t: cfg.startSec, avail: avail0, kills: [] };
    Object.assign(root, evalState([]));
    const score = st => st.xp + Math.max(0, st.t - deadline) * rate;

    let layer = [root];
    let best = root;
    let stale = 0;

    for (let depth = 0; depth < 45 && layer.length; depth++) {
      const next = new Map();
      for (const st of layer) {
        const cands = [];
        for (let i = 0; i < items.length; i++) {
          const av = st.avail[i];
          if (av === GONE) continue;
          const it = items[i];
          const tk = Math.min(st.t - travel, av) - kill;
          if (tk <= it.until || tk < deadline || tk >= st.t) continue;
          const xp = xpFor(it.id, tk);
          cands.push({ i, it, tk, xp, eff: xp / (st.t - tk) });
        }
        cands.sort((a, b) => b.eff - a.eff);
        if (depth === 0 && st === root && cands.length) {
          rate = 0.6 * cands.slice(0, 5).reduce((s, c) => s + c.eff, 0) / Math.min(5, cands.length);
        }
        const picks = cands.slice(0, BRANCH);
        cands.slice().sort((a, b) => b.xp - a.xp).slice(0, 2).forEach(c => { if (!picks.includes(c)) picks.push(c); });

        for (const c of picks) {
          const avail = st.avail.slice();
          avail[c.i] = c.it.respawn > 0 ? c.tk - c.it.respawn : GONE;
          const kills = st.kills.concat([{ item: c.i, id: c.it.id, name: c.it.name, img: c.it.img, t: c.tk, xp: c.xp }]);
          const key = avail.join(',');
          const prev = next.get(key);
          if (prev && prev.t >= c.tk) continue;
          const ns = { t: c.tk, avail, kills };
          Object.assign(ns, evalState(kills));
          next.set(key, ns);
        }
      }
      const arr = Array.from(next.values());
      if (!arr.length) break;
      arr.sort((a, b) => score(b) - score(a));
      layer = arr.slice(0, BEAM);

      for (const st of layer) {
        if (st.xp > best.xp || (st.reach != null && best.reach == null)) { best = st; stale = 0; }
      }
      stale++;
      if (stale >= 4) break;
      await new Promise(r => setTimeout(r, 0));
    }

    let kills = best.kills.slice().sort((a, b) => b.t - a.t);
    let reach = best.reach;
    if (reach != null) {
      // Keep only the kills that are really needed: try dropping the weakest ones first
      const reachedWith = ks => {
        const evs = manual.concat(ks.map(k => ({ timerSec: k.t, xp: k.xp })));
        const tl = T.run({ ...cfg, events: evs, stopAtXP: needXP });
        return T.reachSec(tl, goal);
      };
      const order = kills.slice().sort((a, b) => a.xp - b.xp);
      for (const k of order) {
        const without = kills.filter(x => x !== k);
        if (reachedWith(without) != null) kills = without;
      }
      reach = reachedWith(kills);
    }
    return { reached: reach != null, reach, xp: best.xp, kills, evaluated };
  }

  /**
   * Fastest rotation reaching `goalLevel`: binary-searches the earliest deadline
   * for which planForDeadline() still reaches the goal.
   * @returns {Promise<{reached:boolean, reach:number|null, kills:object[], xp:number, evaluated:number}>}
   *   When the goal can't be reached before the end, `reached` is false and `kills`
   *   is the best-XP rotation for the whole window.
   */
  async function planFastest(o) {
    const endSec = o.cfg.endSec;
    let evaluated = 0;
    const full = await planForDeadline({ ...o, deadlineSec: endSec });
    evaluated += full.evaluated;
    if (!full.reached) return { ...full, evaluated };

    // lo = smallest timer (latest) known reachable; hi = timer (earlier) known unreachable
    let reachable = full;                  // reached at some deadline ≥ endSec
    let lo = endSec;                       // reachable at this deadline
    let hi = o.cfg.startSec - 1;           // largest deadline we might still reach
    // we search the LARGEST deadline value (= earliest in game) still reachable
    let bestD = lo;
    let low = lo, high = hi;
    let steps = 0;
    while (low < high && steps < 12) {
      const mid = Math.ceil((low + high) / 2);
      const r = await planForDeadline({ ...o, deadlineSec: mid });
      evaluated += r.evaluated;
      steps++;
      if (o.onProgress) o.onProgress(Math.min(0.98, steps / 10));
      if (r.reached) { low = mid; bestD = mid; reachable = r; }
      else high = mid - 1;
    }
    return { ...reachable, evaluated };
  }

  /** Convert planner kills to Kill Queue entries. */
  function killsToEntries(kills, allies) {
    return kills.map(k => ({
      type: 'wild', id: k.id, name: k.name, img: k.img,
      timer: D.secondsToTimer(k.t), allies: allies || 0, xp: k.xp,
    }));
  }

  /** "Bunnelby ×2, Xatu ×1" style grouping. */
  function groupKills(kills) {
    const m = new Map();
    kills.forEach(k => m.set(k.name, (m.get(k.name) || 0) + 1));
    return Array.from(m, ([name, n]) => ({ name, n }));
  }

  return { CAMPS, farmableMobs, buildItems, wildXP, defaultCounts, baseConfig, evaluate, planForDeadline, planFastest, killsToEntries, groupKills, toEv };
})();