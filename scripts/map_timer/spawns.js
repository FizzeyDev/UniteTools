import { state } from "./state.js";
import { attachTooltip, hideTooltip } from "./tooltip.js";
import { updateAltariaSpawns } from "./altaria.js";
import { scaledSize } from "./scale.js";
import { addMobKill, removeMobEntry, markMobRespawned } from "./tracker.js";

const spawnsContainer = document.getElementById("spawns-container");

function isRemovedByTower(spawn) {
  if (!spawn.removeOnTowerBreak) return false;
  return state.towers.some(t => spawn.removeOnTowerBreak.includes(t.breakid) && t.destroyed);
}

function isSpawnedByTower(spawn) {
  if (!spawn.spawnOnTowerBreak) return true;
  return state.towers.some(t => spawn.spawnOnTowerBreak.includes(t.breakid) && t.destroyed);
}

function makeSpawnImg(src, xPct, yPct, baseSize, extraClass = "") {
  const img = document.createElement("img");
  img.src = src;
  img.classList.add("spawn");
  if (extraClass) img.classList.add(extraClass);
  img.style.left   = `${xPct}%`;
  img.style.top    = `${yPct}%`;
  img.dataset.baseSize = baseSize;
  const sz = scaledSize(baseSize);
  img.style.width  = `${sz}px`;
  img.style.height = `${sz}px`;
  return img;
}

export function updateSitrusSpawn(pokemon) {
  pokemon.spawns.forEach(spawn => {
    const before5 = state.currentTime > 300;
    const isSpawnTime = state.currentTime <= spawn.time;
    const towerOk = isSpawnedByTower(spawn) && !isRemovedByTower(spawn);

    if (isSpawnTime && towerOk && !spawn.element && !spawn.killed) {
      const img = makeSpawnImg(spawn.img, spawn.xPercent, spawn.yPercent, spawn.size || 40, "sitrus");

      attachTooltip(img, {
        name: "Sitrus Berry",
        gif: "assets/maps/spawn/sitrus.png",
        html: `<p>Restore <strong>1500</strong> HP.</p><p>Sitrus Berry can't respawn after 5:00 and disappears when the corresponding tower is broken.</p><p>When consumed, <strong>respawn after 1 minute</strong>.</p>`,
      });

      img.addEventListener("click", () => {
        if (!spawn.killed) {
          spawn.killed = true;
          spawn.killedTime = state.currentTime;
          if (!before5) spawn.permanentDelete = true;

          const respawnTime = before5 && !spawn.permanentDelete
            ? state.currentTime - (spawn.time_before_respawn || 60)
            : null;
          const tid = addMobKill("Sitrus Berry", spawn.img, state.currentTime, respawnTime);
          spawn._trackerId = tid;

          if (spawn.element && spawnsContainer.contains(spawn.element)) spawnsContainer.removeChild(spawn.element);
          spawn.element = null;
          hideTooltip();
        }
      });

      spawnsContainer.appendChild(img);
      spawn.element = img;
    } else if (spawn.element && (!isSpawnTime || !towerOk || spawn.killed)) {
      if (spawnsContainer.contains(spawn.element)) spawnsContainer.removeChild(spawn.element);
      spawn.element = null;
    }

    if (
      before5 && spawn.killed && !spawn.permanentDelete &&
      spawn.killedTime && spawn.time_before_respawn > 0 &&
      state.currentTime <= spawn.killedTime - spawn.time_before_respawn
    ) {
      spawn.killed = false;
      spawn.killedTime = null;
      if (spawn._trackerId) { markMobRespawned(spawn._trackerId); spawn._trackerId = null; }

      const img = makeSpawnImg(spawn.img, spawn.xPercent, spawn.yPercent, spawn.size || 40, "sitrus");

      attachTooltip(img, {
        name: "Sitrus Berry",
        gif: "assets/maps/gifs/sitrus.gif",
        html: `<p>Restore <strong>1500</strong> HP.</p><p>Sitrus Berry can't respawn after 5:00 and disappears when the corresponding tower is broken.</p>`,
      });

      img.addEventListener("click", () => {
        if (!spawn.killed) {
          spawn.killed = true;
          spawn.killedTime = state.currentTime;
          const tid = addMobKill("Sitrus Berry", spawn.img, state.currentTime, null);
          spawn._trackerId = tid;
          if (spawn.element && spawnsContainer.contains(spawn.element)) spawnsContainer.removeChild(spawn.element);
          spawn.element = null;
          hideTooltip();
        }
      });

      spawnsContainer.appendChild(img);
      spawn.element = img;
    }
  });
}

export function updateGeneralSpawn(pokemon) {
  pokemon.spawns.forEach(spawn => {
    const shouldEvolve = pokemon.evolution && state.currentTime <= pokemon.evolution.time && !spawn.killed;

    if (shouldEvolve && spawn.element) {
      spawn.element.src = pokemon.evolution.img;
      pokemon.name = pokemon.evolution.name;
    } else if (!shouldEvolve && spawn.element && pokemon.evolution) {
      spawn.element.src = pokemon.originalImg;
      pokemon.name = pokemon.originalName;
    }

    const isSpawnTime  = state.currentTime <= spawn.time;
    const isBeforeDisp = spawn.time_dispawn === 0 || state.currentTime > spawn.time_dispawn;
    const isRespawned  = spawn.killedTime
      ? state.currentTime <= spawn.killedTime - (spawn.time_before_respawn || 0)
      : true;
    const towerOk = isSpawnedByTower(spawn) && !isRemovedByTower(spawn);

    if (isSpawnTime && isBeforeDisp && isRespawned && towerOk && !spawn.element && !spawn.killed) {
      const src = shouldEvolve ? pokemon.evolution.img : pokemon.originalImg;
      const img = makeSpawnImg(src, spawn.xPercent, spawn.yPercent, spawn.size || 90);

      const displayName = shouldEvolve ? pokemon.evolution.name : pokemon.originalName;
      const html = shouldEvolve
        ? (pokemon.evolution?.info || `<p><strong>${displayName}</strong> (evolved)</p>`)
        : (spawn.info || `<p><strong>${displayName}</strong></p><p>No specific information.</p>`);

      attachTooltip(img, {
        name: displayName,
        gif: pokemon.gif || pokemon.originalImg,
        html,
      });

      img.addEventListener("click", () => {
        if (!spawn.killed) {
          spawn.killed = true;
          spawn.killedTime = state.currentTime;

          // Calculate respawn time for tracker
          const respawnAt = spawn.time_before_respawn > 0
            ? state.currentTime - spawn.time_before_respawn
            : null;
          const tid = addMobKill(
            displayName,
            pokemon.gif || pokemon.originalImg,
            state.currentTime,
            respawnAt
          );
          spawn._trackerId = tid;

          if (spawn.delete) {
            if (spawn.element && spawnsContainer.contains(spawn.element)) spawnsContainer.removeChild(spawn.element);
            spawn.element = null;
          } else {
            spawn.element.style.opacity = 0.45;
            spawn.element.style.filter  = "grayscale(100%)";
            spawn.element.style.pointerEvents = "none";
          }
          hideTooltip();
        }
      });

      spawnsContainer.appendChild(img);
      spawn.element = img;
    } else if (spawn.element && (!isSpawnTime || !isBeforeDisp || !isRespawned || !towerOk || spawn.killed)) {
      if (spawnsContainer.contains(spawn.element)) spawnsContainer.removeChild(spawn.element);
      spawn.element = null;
    }

    if (spawn.killed && spawn.killedTime && spawn.time_before_respawn > 0 &&
        state.currentTime <= spawn.killedTime - spawn.time_before_respawn) {
      spawn.killed = false;
      spawn.killedTime = null;
      if (spawn._trackerId) { markMobRespawned(spawn._trackerId); spawn._trackerId = null; }
      if (spawn.element) {
        spawn.element.style.opacity = 1;
        spawn.element.style.filter  = "none";
        spawn.element.style.pointerEvents = "auto";
      }
    }
  });
}

export function spawnMid(pokemonName) {
  const pokemon = state.spawns.find(p => p.name === pokemonName);
  if (!pokemon) return;
  if (state.currentTime <= 150) return;

  const img = makeSpawnImg(
    pokemon.spawns?.[0]?.img || pokemon.img,
    50, 52, pokemon.size || 90, "mid"
  );

  attachTooltip(img, {
    name: pokemon.name,
    gif: pokemon.gif || pokemon.img,
    html: pokemon.spawns?.[0]?.info || "<p>No info.</p>",
  });

  img.addEventListener("click", () => {
    if (!state.midState.active) return;
    state.midState.active.killed = true;
    state.midState.active.killedTime = state.currentTime;

    // Track it
    const respawnAt = state.currentTime - 90;
    const tid = addMobKill(
      pokemonName,
      pokemon.gif || pokemon.img,
      state.currentTime,
      respawnAt > 150 ? respawnAt : null
    );
    state.midState.active._trackerId = tid;

    if (spawnsContainer.contains(state.midState.active.element)) {
      spawnsContainer.removeChild(state.midState.active.element);
    }
    scheduleNextMidSpawn(state.midState.active.name);
    state.midState.active = null;
    hideTooltip();
  });

  spawnsContainer.appendChild(img);
  state.midState.active = { name: pokemonName, element: img, killed: false, killedTime: null, _trackerId: null };
}

export function scheduleNextMidSpawn(prevPokemon) {
  const nextTime = state.currentTime - 90;
  if (nextTime <= 150) return;
  if (prevPokemon === "Regidrago") {
    state.midState.pending = { pokemonName: "Altaria", time: nextTime };
  } else if (prevPokemon === "Altaria") {
    const choice = Math.random() < 0.5 ? "Altaria" : "Regidrago";
    state.midState.pending = { pokemonName: choice, time: nextTime };
  }
}

export function updateSpawns() {
  state.spawns.forEach(pokemon => {
    if (pokemon.name === "Sitrus")               { updateSitrusSpawn(pokemon); return; }
    if (pokemon.name === "Altaria" && pokemon.isSpecial) { updateAltariaSpawns(); return; }
    updateGeneralSpawn(pokemon);
  });

  if (state.currentTime <= state.midState.nextSpawnTime && !state.midState.active && !state.midState.pending) {
    spawnMid("Regidrago");
  }
  if (state.midState.pending && state.currentTime === state.midState.pending.time) {
    spawnMid(state.midState.pending.pokemonName);
    state.midState.pending = null;
  }
  if (state.currentTime <= 150 && state.midState.active) {
    const el = state.midState.active.element;
    if (el && spawnsContainer.contains(el)) spawnsContainer.removeChild(el);
    state.midState.active = null;
    state.midState.pending = null;
  }
}