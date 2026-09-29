/**
 * nextSpawns.js - "Next spawns" banner above the map
 *
 * Lists the next 3 spawns with a countdown. Nothing is hardcoded: it reads the
 * exact same runtime state the map uses (state.spawns, state.towers,
 * state.altariaState, state.midState), so it follows kills, respawns and goals
 * clicked on the map, and it matches what will actually appear.
 *
 * The clock counts DOWN: a spawn at time T happens when currentTime reaches T,
 * so the countdown to it is (currentTime - T) seconds of game time.
 *
 * Upcoming spawns come from:
 *   1. Spawns that have not appeared yet (spawn.time < now)
 *   2. Respawns of killed mobs (killedTime - time_before_respawn)
 *   3. Altaria lanes (altariaState.top/bot.pending) and the center cycle
 *      (midState / altariaState.center)
 * Goal-triggered spawns (spawnOnTowerBreak) have no time: they are not listed.
 */

import { state } from "./state.js";
import { isRemovedByTower, isSpawnedByTower } from "./spawns.js";
import { translate } from "./i18n.js";

const bar = document.getElementById("next-spawns");
const list = document.getElementById("next-spawns-list");

const MAX_ITEMS = 3;
const SOON_SECONDS = 10;

const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function tr(key, fallback, vars = {}) {
  let s = translate(key, fallback);
  Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, v); });
  return s;
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

// ── Collect upcoming events ─────────────────────────────────────────────────

function collectEvents() {
  const now = state.currentTime;
  const events = [];
  const push = (name, img, time) => { if (time != null && time >= 0 && time < now) events.push({ name, img, time }); };

  state.spawns.forEach(p => {
    if (p.name === "Altaria" && p.isSpecial) return;     // handled below
    if (p.name === "Sitrus") { collectSitrus(p, push, now); return; }

    const img = p.originalImg || p.img;
    const name = p.originalName || p.name;

    p.spawns?.forEach(s => {
      if (s.spawnOnTowerBreak) return;                   // triggered by a goal, no clock time
      if (isRemovedByTower(s)) return;

      if (!s.killed && !s.element) {
        // Not on the map yet: first spawn (respecting the despawn window)
        if (s.time < now && (!s.time_dispawn || s.time > s.time_dispawn)) push(name, img, s.time);
      } else if (s.killed && s.killedTime != null && s.time_before_respawn > 0) {
        const r = s.killedTime - s.time_before_respawn;
        if (r < now && (!s.time_dispawn || r > s.time_dispawn)) push(name, img, r);
      }
    });
  });

  collectAltaria(push, now);
  return events;
}

/** Sitrus never comes back after 5:00 and disappears with its goal. */
function collectSitrus(p, push, now) {
  const img = p.originalImg || p.img;
  p.spawns?.forEach(s => {
    if (isRemovedByTower(s) || !isSpawnedByTower(s) || s.permanentDelete) return;
    if (!s.killed && !s.element) {
      if (s.time < now) push("Sitrus", img, s.time);
    } else if (s.killed && s.killedTime != null && s.time_before_respawn > 0) {
      const r = s.killedTime - s.time_before_respawn;
      if (r < now && r > 300) push("Sitrus", img, r);
    }
  });
}

function collectAltaria(push, now) {
  const altaria = state.spawns.find(p => p.name === "Altaria" && p.isSpecial);
  const regidrago = state.spawns.find(p => p.name === "Regidrago");
  const laneName = l => `Altaria (${tr(`mt_guide_lane_${l}`, l === "top" ? "Top" : "Bot")})`;

  if (altaria) {
    ["top", "bot"].forEach(lane => {
      const st = state.altariaState[lane];
      if (st?.pending && (!st.active || st.active.killed)) push(laneName(lane), altaria.img, st.pending.time);
    });

    // Center: Rayquaza map uses altariaState.center, the others use the midState cycle
    const cs = state.altariaState.center;
    if (cs?.pending && !cs.active) push(`Altaria (${tr("mt_next_center", "Center")})`, altaria.img, cs.pending.time);
  }

  const mid = state.midState;
  if (mid.pending) {
    const who = state.spawns.find(p => p.name === mid.pending.pokemonName);
    if (who) push(`${who.name} (${tr("mt_next_center", "Center")})`, who.originalImg || who.img, mid.pending.time);
  } else if (!mid.active && regidrago && now > mid.nextSpawnTime) {
    push(`Regidrago (${tr("mt_next_center", "Center")})`, regidrago.originalImg || regidrago.img, mid.nextSpawnTime);
  }
}

/** Same name + same time → one entry with a quantity (e.g. Baltoy ×4). */
function groupAndPick(events) {
  const groups = new Map();
  events.forEach(e => {
    const key = `${e.name}|${e.time}`;
    if (!groups.has(key)) groups.set(key, { ...e, count: 0 });
    groups.get(key).count++;
  });
  // Soonest first = highest clock value that is still below the current time
  return [...groups.values()].sort((a, b) => b.time - a.time).slice(0, MAX_ITEMS);
}

// ── Render ──────────────────────────────────────────────────────────────────

export function updateNextSpawns() {
  if (!bar || !list) return;
  if (!state.spawns.length) { list.innerHTML = ""; return; }

  const items = groupAndPick(collectEvents());
  if (!items.length) {
    list.innerHTML = `<span class="ns-empty">${esc(tr("mt_next_none", "No more timed spawns."))}</span>`;
    return;
  }

  const now = state.currentTime;
  list.innerHTML = items.map(e => {
    const remaining = now - e.time;
    const soon = remaining <= SOON_SECONDS;
    return `<div class="ns-item${soon ? " soon" : ""}">
      <img src="${esc(e.img)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="ns-text">
        <span class="ns-name">${esc(e.name)}${e.count > 1 ? ` ×${e.count}` : ""}</span>
        <span class="ns-time">${fmt(e.time)}</span>
      </div>
      <span class="ns-count">${esc(tr("mt_next_in", "in {t}", { t: fmt(remaining) }))}</span>
    </div>`;
  }).join("");
}

document.addEventListener("mapTimerTick", updateNextSpawns);
document.addEventListener("mapTimerDataLoaded", updateNextSpawns);
document.addEventListener("mapTimerLangChanged", updateNextSpawns);
