import { state } from "./state.js";
import { updateSpawns } from "./spawns.js";
import { updateTowers } from "./towers.js";
import { initializeAltariaLane } from "./altaria.js";

const playBtn      = document.getElementById("play-btn");
const resetBtn     = document.getElementById("reset-btn");
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");
const timeSlider   = document.getElementById("time-slider");
const mapImg       = document.getElementById("map-img");
const spawnsContainer = document.getElementById("spawns-container");
const towersContainer = document.getElementById("towers-container");
const phaseLabel   = document.getElementById("phase-label");

function updatePhaseLabel(t) {
  if (!phaseLabel) return;
  if (t > 420)      { phaseLabel.textContent = "🟢 Early Game";  phaseLabel.style.color = "var(--green)";  phaseLabel.style.borderColor = "rgba(76,175,130,0.3)"; }
  else if (t > 240) { phaseLabel.textContent = "🟡 Mid Game";    phaseLabel.style.color = "var(--yellow)"; phaseLabel.style.borderColor = "rgba(255,215,64,0.3)"; }
  else if (t > 0)   { phaseLabel.textContent = "🔴 Late Game";   phaseLabel.style.color = "var(--red)";    phaseLabel.style.borderColor = "rgba(239,83,80,0.3)"; }
  else              { phaseLabel.textContent = "⚫ Game Over";   phaseLabel.style.color = "var(--text-dim)"; phaseLabel.style.borderColor = "var(--border)"; }
}

export function updateDisplay() {
  const m = Math.floor(state.currentTime / 60).toString().padStart(2, "0");
  const s = (state.currentTime % 60).toString().padStart(2, "0");
  minutesInput.value = m;
  secondsInput.value = s;
  timeSlider.value = state.currentTime;
  updatePhaseLabel(state.currentTime);
  updateSpawns();
  updateTowers();
}

function startTimer() {
  state.timerRunning = true;
  playBtn.textContent = "⏸ Pause";
  state.timerInterval = setInterval(() => {
    if (state.currentTime > 0) { state.currentTime--; updateDisplay(); }
    else stopTimer();
  }, 1000);
}

export function stopTimer() {
  state.timerRunning = false;
  playBtn.textContent = "▶ Play";
  clearInterval(state.timerInterval);
}

export function resetAll() {
  state.totalTime   = 600;
  state.currentTime = 600;
  stopTimer();
  updateDisplay();

  spawnsContainer.innerHTML = "";
  towersContainer.innerHTML = "";

  state.spawns.forEach(p => {
    p.spawns?.forEach(s => {
      s.element = null;
      s.killed  = false;
      s.killedTime = null;
      s.permanentDelete = false;
      s._trackerId = null;
    });
  });

  state.towers.forEach(t => { t.destroyed = false; t.element = null; });

  state.midState = { nextSpawnTime: 480, active: null, pending: null };
  state.altariaState = {
    bot:    { sequenceKey: null, seqIndex: -1, pending: null, active: null },
    top:    { sequenceKey: null, seqIndex: -1, pending: null, active: null },
    center: { pending: null, active: null },
  };

  // Clear tracker on reset
  if (window.trackerClearAll) window.trackerClearAll();
}

export function loadSpawns(mapName) {
  fetch(`data/spawns_${mapName}.json`)
    .then(r => r.json())
    .then(data => {
      state.spawns = data.pokemons.map(p => ({
        ...p,
        originalName: p.name,
        originalImg: p.spawns?.[0]?.img || p.img,
        spawns: p.spawns?.map(s => ({ ...s, element: null, killed: false, killedTime: null, _trackerId: null })) || [],
      }));

      state.towers = data.towers.map(t => ({ ...t, element: null }));

      const altaria = state.spawns.find(p => p.name === "Altaria");
      if (altaria?.isSpecial) {
        ["top", "bot"].forEach(lane => initializeAltariaLane(lane, altaria));

        if (mapName === "rayquaza") {
          state.altariaState.center = { pending: { time: 480 }, active: null };
        } else {
          state.altariaState.center = { pending: null, active: null };
        }
      }

      spawnsContainer.innerHTML = "";
      towersContainer.innerHTML = "";
      updateDisplay();
    })
    .catch(err => console.error("JSON load error:", err));
}

playBtn.addEventListener("click", () =>
  state.timerRunning ? stopTimer() : startTimer()
);

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    if (state.currentMap) {
      const mapName = state.currentMap;
      // visual reset first
      resetAll();
      loadSpawns(mapName);
    }
  });
}

timeSlider.addEventListener("input", e => {
  state.currentTime = +e.target.value;
  updateDisplay();
});

function updateFromInputs() {
  let m = +minutesInput.value || 0;
  let s = +secondsInput.value || 0;
  if (s > 59) s = 59;
  if (m > 10) m = 10;
  state.currentTime = m * 60 + s;
  updateDisplay();
}
minutesInput.addEventListener("input", updateFromInputs);
secondsInput.addEventListener("input", updateFromInputs);

document.querySelectorAll(".map-switch button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".map-switch button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const map = btn.dataset.map;
    state.currentMap = map;
    mapImg.src = `assets/maps/map_${map}.webp`;
    resetAll();
    loadSpawns(map);
  });
});