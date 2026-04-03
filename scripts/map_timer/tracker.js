/**
 * tracker.js — Kill & tower event tracker
 * Exposes: addMobKill(name, img, killedTime, respawnTime), addTowerKill(name, img, killedTime)
 *          removeMobEntry(id), respawnedMobEntry(id)
 *          window.trackerClearAll()
 */

const mobsList    = document.getElementById("tracker-mobs-list");
const towersList  = document.getElementById("tracker-towers-list");
const mobsEmpty   = document.getElementById("tracker-mobs-empty");
const towersEmpty = document.getElementById("tracker-towers-empty");
const mobsCount   = document.getElementById("mobs-count");
const towersCount = document.getElementById("towers-count");
const badge       = document.getElementById("tracker-badge");

let mobEntries   = [];  // { id, name, img, killedTime, respawnTime, element }
let towerEntries = [];  // { id, name, img, killedTime, element }
let _id = 0;

function fmt(sec) {
  if (sec == null || sec < 0) return "--:--";
  const m = Math.floor(sec / 60).toString().padStart(2,"0");
  const s = (sec % 60).toString().padStart(2,"0");
  return `${m}:${s}`;
}

function updateBadge() {
  const total = mobEntries.length + towerEntries.length;
  if (total > 0) {
    badge.textContent = total;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
  mobsCount.textContent   = mobEntries.length;
  towersCount.textContent = towerEntries.length;
  mobsEmpty.style.display   = mobEntries.length   ? "none" : "";
  towersEmpty.style.display = towerEntries.length ? "none" : "";
}

function makeTrackerItem({ id, name, img, killedTime, respawnTime, isTower = false }) {
  const div = document.createElement("div");
  div.className = "tracker-item" + (isTower ? " tower-item" : "");
  div.dataset.id = id;

  const iconEl = img
    ? `<div class="tracker-item-icon"><img src="${img}" alt="${name}"></div>`
    : `<div class="tracker-item-icon">${isTower ? "🗼" : "💀"}</div>`;

  const respawnHTML = isTower
    ? `<div class="tracker-item-respawn no-respawn"><span>🚫</span> <span>Destroyed permanently</span></div>`
    : respawnTime != null && respawnTime > 0
      ? `<div class="tracker-item-respawn"><span>🔄</span> <span>Respawn: <span class="t-val" data-respawn="${id}">${fmt(respawnTime)}</span></span></div>`
      : `<div class="tracker-item-respawn no-respawn"><span>🚫</span> <span>Does not respawn</span></div>`;

  div.innerHTML = `
    ${iconEl}
    <div class="tracker-item-info">
      <div class="tracker-item-name">${name}</div>
      <div class="tracker-item-times">
        <div class="tracker-item-killed">💀 <span>Killed at: <span class="t-val">${fmt(killedTime)}</span></span></div>
        ${respawnHTML}
      </div>
    </div>
    <button class="tracker-item-remove" title="Remove entry">✕</button>
  `;

  div.querySelector(".tracker-item-remove").addEventListener("click", () => {
    isTower ? removeTowerEntry(id) : removeMobEntry(id);
  });

  return div;
}

export function addMobKill(name, img, killedTime, respawnTime) {
  const id = ++_id;
  const el = makeTrackerItem({ id, name, img, killedTime, respawnTime });
  mobsList.appendChild(el);
  mobEntries.push({ id, name, img, killedTime, respawnTime, element: el });
  updateBadge();
  return id;
}

export function addTowerKill(name, img, killedTime) {
  const id = ++_id;
  const el = makeTrackerItem({ id, name, img, killedTime, isTower: true });
  towersList.appendChild(el);
  towerEntries.push({ id, name, img, killedTime, element: el });
  updateBadge();
  return id;
}

export function removeMobEntry(id) {
  const idx = mobEntries.findIndex(e => e.id === id);
  if (idx === -1) return;
  mobEntries[idx].element?.remove();
  mobEntries.splice(idx, 1);
  updateBadge();
}

export function removeTowerEntry(id) {
  const idx = towerEntries.findIndex(e => e.id === id);
  if (idx === -1) return;
  towerEntries[idx].element?.remove();
  towerEntries.splice(idx, 1);
  updateBadge();
}

/** Mark a mob as respawned — highlight the row green then remove it after a moment */
export function markMobRespawned(id) {
  const entry = mobEntries.find(e => e.id === id);
  if (!entry) return;
  entry.element?.classList.add("respawned");
  setTimeout(() => removeMobEntry(id), 2500);
}

/** Update a respawn countdown cell (called every second from timer.js) */
export function updateRespawnDisplay(id, newTime) {
  const el = document.querySelector(`.t-val[data-respawn="${id}"]`);
  if (el) el.textContent = fmt(newTime);
}

// Clear all
window.trackerClearAll = function () {
  mobEntries.forEach(e => e.element?.remove());
  mobEntries = [];
  towerEntries.forEach(e => e.element?.remove());
  towerEntries = [];
  updateBadge();
};

updateBadge();