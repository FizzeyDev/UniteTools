/**
 * altaria.js — Altaria spawn logic (FIX position après kill)
 */

import { state } from "./state.js";
import { attachTooltip, hideTooltip } from "./tooltip.js";
import { scaledSize } from "./scale.js";
import { addMobKill } from "./tracker.js";

const spawnsContainer = document.getElementById("spawns-container");

// ── Helper: tower state ─────────────────────────────────────────────────────

const LANE_BREAKIDS = {
  bot: { left: [1, 6], right: [2] },
  top: { left: [3, 5], right: [4, 7] },
};

export function getLaneTeamState(lane) {
  const ids = LANE_BREAKIDS[lane];
  const leftBroken  = state.towers.filter(t => ids.left.includes(t.breakid)  && t.destroyed).length;
  const rightBroken = state.towers.filter(t => ids.right.includes(t.breakid) && t.destroyed).length;
  return { left: leftBroken, right: rightBroken, total: leftBroken + rightBroken };
}

// ── Position & Sequence ─────────────────────────────────────────────────────

function getAltariaPosition(altaria, lane, ts) {
  const { left, right, total } = ts;
  if (total === 0) return altaria.lanes[lane];

  if (left === 0 || right === 0) {
    const side   = left > 0 ? "left" : "right";
    const broken = left > 0 ? left : right;
    if (broken === 1) return altaria.t1Positions?.[lane]?.[side] || altaria.lanes[lane];
    if (broken >= 2) return altaria.t2Positions?.[lane]?.[side] || altaria.lanes[lane];
  }

  if (left === right) return altaria.lanes[lane];

  const losingSide = left < right ? "left" : "right";
  return altaria.t1Positions?.[lane]?.[losingSide] || altaria.lanes[lane];
}

function getSequenceKey(ts) {
  const { left, right, total } = ts;
  if (total === 0) return "0";
  if (total === 4) return "2";
  if (total === 3) return "1";
  if (left === 0 || right === 0) return "1";
  return "2";
}

// ── Initialize ──────────────────────────────────────────────────────────────

export function initializeAltariaLane(lane, altaria) {
  const ts = getLaneTeamState(lane);
  const sequenceKey = getSequenceKey(ts);
  const list = altaria.spawnLists[sequenceKey] || altaria.spawnLists["0"] || [];

  state.altariaState[lane] = state.altariaState[lane] || {};
  state.altariaState[lane].sequenceKey = sequenceKey;
  state.altariaState[lane].lastSpawnTime = null;
  state.altariaState[lane].frozenTs = ts;           // ← important
  state.altariaState[lane].pending = { 
    time: list[0], 
    index: 0, 
    sequenceKey, 
    ts 
  };
  state.altariaState[lane].active = null;
}

// ── Spawn Lane ──────────────────────────────────────────────────────────────

export function spawnAltaria(lane) {
  const altaria = state.spawns.find(p => p.name === "Altaria");
  if (!altaria) return false;

  const st = state.altariaState[lane];
  if (!st?.pending || (st.active && !st.active.killed)) return false;

  // On utilise le frozenTs (état au moment du kill précédent)
  const ts = st.frozenTs || getLaneTeamState(lane);
  const sequenceKey = st.pending.sequenceKey;
  const pos = getAltariaPosition(altaria, lane, ts);

  const { time, index } = st.pending;
  const baseSize = altaria.size || 70;

  const img = document.createElement("img");
  img.src = altaria.img;
  img.classList.add("spawn", "altaria");
  img.style.left = `${pos.x}%`;
  img.style.top  = `${pos.y}%`;
  img.dataset.baseSize = baseSize;
  const sz = scaledSize(baseSize);
  img.style.width  = `${sz}px`;
  img.style.height = `${sz}px`;

  const infoHtml = altaria.spawnInfos?.[sequenceKey]?.[index] || altaria.spawnInfos?.["0"]?.[0] || "";

  attachTooltip(img, {
    name: "Altaria",
    gif: altaria.gif || altaria.img,
    html: infoHtml,
  });

  img.addEventListener("click", () => {
    const s = state.altariaState[lane].active;
    if (s && !s.killed) {
      s.killed = true;
      s.killedTime = state.currentTime;

      // On freeze l'état des tours AU MOMENT DE LA MORT
      const killTs = getLaneTeamState(lane);
      state.altariaState[lane].frozenTs = killTs;

      const killKey = getSequenceKey(killTs);
      const killList = altaria.spawnLists[killKey] || altaria.spawnLists["0"] || [];
      const nextT = killList.find(t => t < s.time);

      const tid = addMobKill("Altaria (" + lane + ")", altaria.gif || altaria.img, state.currentTime, nextT || null);
      s._trackerId = tid;

      if (s.element && spawnsContainer.contains(s.element)) spawnsContainer.removeChild(s.element);

      state.altariaState[lane].active = null;
      hideTooltip();
    }
  });

  spawnsContainer.appendChild(img);

  st.lastSpawnTime = time;
  st.active = { time, element: img, killed: false, killedTime: null, _trackerId: null };
  st.pending = null;
  return true;
}

// ── Center Altaria (inchangé) ───────────────────────────────────────────────

export function scheduleAltariaCenterFromRegidrago() {
  const altaria = state.spawns.find(p => p.name === "Altaria");
  if (!altaria?.isSpecial) return;
  const spawnTime = state.currentTime - 90;
  if (spawnTime <= 0) return;

  state.altariaState.center = { pending: { time: spawnTime }, active: null };
}

function spawnAltariaCenter() { /* ... même code qu'avant ... */ 
  // (je garde le même que la version précédente pour ne pas alourdir)
  const altaria = state.spawns.find(p => p.name === "Altaria");
  if (!altaria) return;
  const pos = altaria.centerPosition || { x: 50, y: 50 };
  const baseSize = altaria.size || 70;

  const img = document.createElement("img");
  img.src = altaria.img;
  img.classList.add("spawn", "altaria", "altaria-center");
  img.style.left = `${pos.x}%`;
  img.style.top  = `${pos.y}%`;
  img.dataset.baseSize = baseSize;
  const sz = scaledSize(baseSize);
  img.style.width  = `${sz}px`;
  img.style.height = `${sz}px`;

  attachTooltip(img, {
    name: "Altaria (Center)",
    gif: altaria.gif || altaria.img,
    html: altaria.centerInfo || "<p>Spawns 90 seconds after Regidrago is KO'd.</p>",
  });

  img.addEventListener("click", () => {
    const cs = state.altariaState.center;
    if (cs?.active && !cs.active.killed) {
      cs.active.killed = true;
      const nextT = state.currentTime - 90;
      const tid = addMobKill("Altaria (Center)", altaria.gif || altaria.img, state.currentTime, nextT > 150 ? nextT : null);
      cs.active._trackerId = tid;

      if (cs.active.element && spawnsContainer.contains(cs.active.element)) {
        spawnsContainer.removeChild(cs.active.element);
      }
      cs.active.element = null;
      hideTooltip();
      scheduleAltariaCenterFromRegidrago();
    }
  });

  spawnsContainer.appendChild(img);
  if (!state.altariaState.center) state.altariaState.center = { pending: null, active: null };
  state.altariaState.center.active  = { element: img, killed: false, _trackerId: null };
  state.altariaState.center.pending = null;
}

function updateAltariaCenter() { /* même code qu'avant */ 
  const cs = state.altariaState.center;
  if (!cs) return;
  const isRayquaza = state.currentMap === "rayquaza";

  if (isRayquaza && !cs.active && !cs.pending) {
    if (state.currentTime <= 480 && state.currentTime > 150) {
      state.altariaState.center = { pending: { time: 480 }, active: null };
      return;
    }
  }

  if (cs.pending && state.currentTime <= cs.pending.time && !cs.active) {
    spawnAltariaCenter();
    return;
  }

  if (cs.active && cs.active.element) {
    const shouldDespawn = !isRayquaza && state.currentTime <= 150;
    if (shouldDespawn) {
      if (spawnsContainer.contains(cs.active.element)) spawnsContainer.removeChild(cs.active.element);
      cs.active.element = null;
      cs.active.killed  = true;
    }
  }
}

// ── Main Update ─────────────────────────────────────────────────────────────

export function updateAltariaSpawns() {
  const altaria = state.spawns.find(p => p.name === "Altaria");
  if (!altaria?.isSpecial) return;

  ["top", "bot"].forEach(lane => {
    const st = state.altariaState[lane];
    if (!st) return;
    if (st.active && !st.active.killed) return;   // encore en vie → on attend

    const ts = getLaneTeamState(lane);
    const currentKey = getSequenceKey(ts);
    const list = altaria.spawnLists[currentKey] || altaria.spawnLists["0"] || [];

    const refTime = st.lastSpawnTime ?? Infinity;
    const nextTime = list.find(t => t < refTime);

    if (nextTime != null && nextTime > state.currentTime) {
      st.pending = {
        time: nextTime,
        index: list.indexOf(nextTime),
        sequenceKey: currentKey,
        ts: st.frozenTs || ts   // on privilégie le frozen
      };
    }

    if (st.pending && state.currentTime <= st.pending.time) {
      spawnAltaria(lane);
    }

    if (st.active?.killed && st.active.element) {
      if (spawnsContainer.contains(st.active.element)) spawnsContainer.removeChild(st.active.element);
      st.active.element = null;
    }
  });

  updateAltariaCenter();
}