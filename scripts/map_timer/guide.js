/**
 * guide.js - Spawn Guide (tables + explanations shown under the Map Timer)
 *
 * Everything is generated from data/spawns_<map>.json (the same file the map
 * uses), so the guide can never drift from the timer: edit the JSON and both
 * update. Times are shown on the in-game clock (counting down from 10:00),
 * exactly like the timer above.
 *
 * Sections:
 *   1. Altaria  - lane timelines for each goal state (0..4 goals broken in the lane)
 *   2. Center   - Regidrago / center Altaria cycle
 *   3. Spawns   - every other spawn (first spawn, respawn, despawn, goal rules)
 *   4. Goals    - what each goal does to the spawns when it breaks
 *
 * The Altaria table and the goals table are also "live": they follow the
 * timer and the goals clicked on the map (past spawns dimmed, next spawn
 * highlighted, current lane state flagged).
 */

import { state } from "./state.js";
import { translate } from "./i18n.js";
import { getLaneTeamState, getSequenceKey } from "./altaria.js";

const root = document.getElementById("spawn-guide-content");

let guideData = null;   // raw JSON of the current map
let guideMap  = null;

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

const strip = html => (html || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .replace(/\s+([.,!?;:])/g, "$1")
  .trim();

function tr(key, fallback, vars = {}) {
  let s = translate(key, fallback);
  Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, v); });
  return s;
}

// ── Goals (towers) ──────────────────────────────────────────────────────────
// Tower names in the data look like "Purple First Bot Pad" / "Orange Second Top Pad".

function parseGoal(t) {
  const name = t.name || t.id || "";
  return {
    breakid: t.breakid,
    team: /purple/i.test(name) ? "purple" : "orange",
    tier: /second/i.test(name) ? 2 : 1,
    lane: /top/i.test(name) ? "top" : "bot",
    points: (strip(t.info).match(/Need\s+(\d+)\s+Points/i) || [])[1] || "—",
    requires: t.requiresTowerBreak ?? null,
  };
}

function goalName(g) {
  const team = tr(`mt_guide_team_${g.team}`, g.team === "purple" ? "Purple" : "Orange");
  const lane = tr(`mt_guide_lane_${g.lane}`, g.lane === "top" ? "Top" : "Bot");
  return `${team} ${lane} T${g.tier}`;
}

/** "Purple Top T1" for one goal, "either Top T1" for the two mirrored goals of a lane. */
function goalsLabel(ids, goals) {
  const list = (Array.isArray(ids) ? ids : [ids]).map(id => goals.find(g => g.breakid === id)).filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return goalName(list[0]);
  const lane = tr(`mt_guide_lane_${list[0].lane}`, list[0].lane === "top" ? "Top" : "Bot");
  return `${tr("mt_guide_either", "either")} ${lane} T${list[0].tier}`;
}

// ── 1. Altaria lane timelines ───────────────────────────────────────────────

const ALTARIA_STATES = [0, 1, 2];

const STATE_FALLBACK = {
  0: ["No goal broken", "Centered in the lane."],
  1: ["Goals of one team only (1 or 2), or 3 goals in total", "25 s earlier, off-center, toward the side that lost goals."],
  2: ["One goal on each side, or all 4 goals", "10 s earlier, back in the middle."],
};

function renderAltaria(data) {
  const altaria = data.pokemons.find(p => p.name === "Altaria");
  if (!altaria?.spawnLists) return "";

  const maxCols = Math.max(...ALTARIA_STATES.map(k => (altaria.spawnLists[k] || []).length));
  const head = Array.from({ length: maxCols }, (_, i) => `<th>#${i + 1}</th>`).join("");

  const rows = ALTARIA_STATES.map(k => {
    const list = altaria.spawnLists[k] || [];
    const cells = Array.from({ length: maxCols }, (_, i) =>
      list[i] != null ? `<td class="gt" data-t="${list[i]}">${fmt(list[i])}</td>` : `<td class="gt empty">—</td>`
    ).join("");
    return `<tr data-state="${k}">
      <th scope="row" class="gs">
        <span class="gs-label">${esc(tr(`mt_guide_state_${k}`, STATE_FALLBACK[k][0]))}</span>
        <span class="gs-chips"></span>
      </th>
      ${cells}
      <td class="gp">${esc(tr(`mt_guide_pos_${k}`, STATE_FALLBACK[k][1]))}</td>
    </tr>`;
  }).join("");

  const centerText = state.currentMap === "rayquaza"
    ? tr("mt_guide_center_body_rayquaza", "There is no Regidrago on this map. A center Altaria spawns at 8:00, then respawns 1:30 after each KO, and does not despawn at 2:30.")
    : tr("mt_guide_center_body", "Regidrago spawns in the middle at 8:00. 1:30 after it is KO'd, an Altaria spawns there; 1:30 after that Altaria is KO'd, the next one is randomly Altaria or Regidrago, and so on. Nothing spawns in the center after 2:30.");

  return `
    <article class="guide-card">
      <h3>${esc(tr("mt_guide_alt_title", "Altaria — lane timers by goal state"))}</h3>
      <div class="guide-explain">${tr("mt_guide_alt_intro", "")}</div>
      <div class="guide-scroll">
        <table class="guide-table altaria-table">
          <thead><tr>
            <th>${esc(tr("mt_guide_alt_col_state", "Goals broken in the lane"))}</th>
            ${head}
            <th>${esc(tr("mt_guide_alt_col_pos", "Where it spawns"))}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="guide-note">${esc(tr("mt_guide_alt_live", "Live: the chips show the state each lane is in right now (from the goals you click on the map), past spawns are dimmed and the next spawn is highlighted."))}</p>
      <h4>${esc(tr("mt_guide_center_title", "Center: Regidrago / Altaria cycle"))}</h4>
      <p class="guide-explain">${esc(centerText)}</p>
    </article>`;
}

// ── 2. All other spawns ─────────────────────────────────────────────────────

function groupSpawns(pokemon) {
  const groups = new Map();
  (pokemon.spawns || []).forEach(s => {
    const key = JSON.stringify([
      s.time, s.time_before_respawn || 0, s.time_dispawn || 0, !!s.delete,
      s.spawnOnTowerBreak || null, s.removeOnTowerBreak || null, strip(s.info),
    ]);
    if (!groups.has(key)) groups.set(key, { spawn: s, count: 0 });
    groups.get(key).count++;
  });
  return [...groups.values()];
}

function renderSpawns(data, goals) {
  const rows = [];

  data.pokemons.filter(p => p.name !== "Altaria").forEach(p => {
    const img = p.spawns?.[0]?.img || p.img;
    groupSpawns(p).forEach(({ spawn: s, count }) => {
      const onBreak = !!s.spawnOnTowerBreak;
      const isStart = !onBreak && s.time >= 600;

      const first = onBreak
        ? tr("mt_guide_on_break", "On goal break")
        : (isStart ? `${fmt(s.time)} (${tr("mt_guide_start", "game start")})` : fmt(s.time));

      const respawn = s.time_before_respawn > 0
        ? `${fmt(s.time_before_respawn)} ${tr("mt_guide_after_ko", "after KO")}`
        : tr("mt_guide_no_respawn", "No respawn");

      const leaves = s.time_dispawn > 0 ? `${tr("mt_guide_at", "at")} ${fmt(s.time_dispawn)}` : "—";

      const rules = [];
      if (s.spawnOnTowerBreak) rules.push(tr("mt_guide_spawns_when", "Spawns when {g} breaks", { g: goalsLabel(s.spawnOnTowerBreak, goals) }));
      if (s.removeOnTowerBreak) rules.push(tr("mt_guide_gone_when", "Disappears when {g} breaks", { g: goalsLabel(s.removeOnTowerBreak, goals) }));
      if (p.evolution) rules.push(tr("mt_guide_evolves", "Evolves into {n} at {t}", { n: p.evolution.name, t: fmt(p.evolution.time) }));

      rows.push({
        sort: onBreak ? -1 : s.time,
        html: `<tr>
          <th scope="row" class="gn"><img src="${esc(img)}" alt="" loading="lazy" onerror="this.style.display='none'"><span>${esc(p.name)}</span></th>
          <td class="gq">×${count}</td>
          <td class="gt">${esc(first)}</td>
          <td class="gc">${esc(respawn)}</td>
          <td class="gc">${esc(leaves)}</td>
          <td class="gr">${rules.map(esc).join("<br>") || "—"}</td>
          <td class="gd">${esc(strip(s.info))}</td>
        </tr>`,
      });
    });
  });

  // Chronological on the clock (10:00 first … 2:00 last), goal-triggered spawns at the end
  rows.sort((a, b) => (a.sort === -1) - (b.sort === -1) || b.sort - a.sort);

  return `
    <article class="guide-card">
      <h3>${esc(tr("mt_guide_all_title", "All spawns"))}</h3>
      <p class="guide-explain">${esc(tr("mt_guide_all_intro", "Sorted by first spawn on the game clock. Altaria has its own tables above. Sitrus Berries never come back after 5:00."))}</p>
      <div class="guide-scroll">
        <table class="guide-table spawns-table">
          <thead><tr>
            <th>${esc(tr("mt_guide_col_pokemon", "Pokémon"))}</th>
            <th>${esc(tr("mt_guide_col_qty", "Qty"))}</th>
            <th>${esc(tr("mt_guide_col_first", "First spawn"))}</th>
            <th>${esc(tr("mt_guide_col_respawn", "Respawn"))}</th>
            <th>${esc(tr("mt_guide_col_leaves", "Leaves"))}</th>
            <th>${esc(tr("mt_guide_col_rules", "Goal rule"))}</th>
            <th>${esc(tr("mt_guide_col_details", "Details"))}</th>
          </tr></thead>
          <tbody>${rows.map(r => r.html).join("")}</tbody>
        </table>
      </div>
    </article>`;
}

// ── 3. Goals ────────────────────────────────────────────────────────────────

function countByName(pokemons, ruleKey, id) {
  const out = [];
  pokemons.forEach(p => {
    const n = (p.spawns || []).filter(s => s[ruleKey]?.includes(id)).length;
    if (n) out.push(`${p.name} ×${n}`);
  });
  return out;
}

function renderGoals(data, goals) {
  const rows = goals.map(g => {
    const removes = countByName(data.pokemons, "removeOnTowerBreak", g.breakid);
    const spawns  = countByName(data.pokemons, "spawnOnTowerBreak", g.breakid);
    const req = g.requires != null ? goalsLabel(g.requires, goals) : "—";
    return `<tr data-goal="${g.breakid}">
      <th scope="row" class="gn"><span>${esc(goalName(g))}</span><span class="gs-chips goal-chip"></span></th>
      <td>${esc(g.points)}</td>
      <td>${esc(req)}</td>
      <td class="gr">${esc(removes.join(", ") || "—")}</td>
      <td class="gr">${esc(spawns.join(", ") || "—")}</td>
      <td>${esc(tr("mt_guide_altaria_shift", "Altaria timer of the lane shifts"))}</td>
    </tr>`;
  }).join("");

  return `
    <article class="guide-card">
      <h3>${esc(tr("mt_guide_goals_title", "Goals — what changes when one breaks"))}</h3>
      <div class="guide-scroll">
        <table class="guide-table goals-table">
          <thead><tr>
            <th>${esc(tr("mt_guide_col_goal", "Goal"))}</th>
            <th>${esc(tr("mt_guide_col_points", "Points to break"))}</th>
            <th>${esc(tr("mt_guide_col_requires", "Needs first"))}</th>
            <th>${esc(tr("mt_guide_col_removes", "Despawns"))}</th>
            <th>${esc(tr("mt_guide_col_spawns", "Spawns"))}</th>
            <th>${esc(tr("mt_guide_col_other", "Other"))}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </article>`;
}

// ── Render + live sync ──────────────────────────────────────────────────────

export function renderGuide() {
  if (!root || !guideData) return;
  const goals = guideData.towers.map(parseGoal);
  root.innerHTML = renderAltaria(guideData) + renderSpawns(guideData, goals) + renderGoals(guideData, goals);
  updateLive();
}

export function updateLive() {
  if (!root || !guideData) return;
  const now = state.currentTime;

  // Altaria rows: lane chips + dim past spawns + highlight the next one
  const lanes = ["top", "bot"].map(l => ({ lane: l, k: +getSequenceKey(getLaneTeamState(l)) }));
  root.querySelectorAll(".altaria-table tbody tr").forEach(row => {
    const k = +row.dataset.state;
    const here = lanes.filter(l => l.k === k);
    row.classList.toggle("is-current", here.length > 0);
    row.querySelector(".gs-chips").innerHTML = here
      .map(l => `<span class="chip">${esc(tr(`mt_guide_lane_${l.lane}`, l.lane))}</span>`).join("");

    let nextMarked = false;
    row.querySelectorAll("td.gt[data-t]").forEach(td => {
      const t = +td.dataset.t;
      const past = now < t;               // clock already went below the spawn time
      td.classList.toggle("past", past);
      const isNext = !past && !nextMarked && here.length > 0;
      td.classList.toggle("next", isNext);
      if (isNext) nextMarked = true;
    });
  });

  // Goals rows: mark broken goals
  root.querySelectorAll(".goals-table tbody tr").forEach(row => {
    const t = state.towers.find(x => x.breakid === +row.dataset.goal);
    const broken = !!t?.destroyed;
    row.classList.toggle("is-broken", broken);
    row.querySelector(".goal-chip").innerHTML = broken
      ? `<span class="chip chip-broken">${esc(tr("mt_guide_broken", "broken"))}</span>` : "";
  });
}

// ── Wiring ──────────────────────────────────────────────────────────────────

document.addEventListener("mapTimerDataLoaded", e => {
  guideData = e.detail.data;
  guideMap  = e.detail.map;
  renderGuide();
});
document.addEventListener("mapTimerTick", updateLive);
document.addEventListener("mapTimerLangChanged", renderGuide);

// ── View switch: Visual (map + guide below) / Table (guide only) ────────────

const VIEW_KEY = "mt_view";
function setView(view) {
  const v = view === "table" ? "table" : "visual";
  document.body.classList.toggle("mt-view-table", v === "table");
  document.querySelectorAll(".mt-view-btn").forEach(b => {
    const on = b.dataset.view === v;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable */ }
}

document.querySelectorAll(".mt-view-btn").forEach(b =>
  b.addEventListener("click", () => setView(b.dataset.view))
);
let saved = "visual";
try { saved = localStorage.getItem(VIEW_KEY) || "visual"; } catch { /* ignore */ }
setView(saved);