import { state, fearlessTeamA, fearlessTeamB } from "./state.js";
import { mpState } from "./multiplayer.js";

export function updateDynamicContent() {
  document.querySelectorAll("[data-lang]").forEach(el => {
    const key = el.getAttribute("data-lang");
    if (state.langData[key]) el.textContent = state.langData[key];
  });
}

export function updateTurn() {
  const turnDisplay = document.getElementById("turn-display");
  if (!turnDisplay) return;
  if (state.currentStep >= state.currentDraftOrder.length) {
    turnDisplay.style.display = "none";
    const ind = document.getElementById("mp-turn-indicator");
    if (ind) ind.style.display = "none";
    return;
  }
  const step   = state.currentDraftOrder[state.currentStep];
  const label  = step.team === "teamA" ? "Purple Team" : "Orange Team";
  const color  = step.team === "teamA" ? "var(--violet, #9f53ec)" : "var(--orange, #ff9d00)";
  const action = step.type === "ban" ? "to Ban" : "to Pick";
  turnDisplay.innerHTML = `<span style="color:${color};">${label}</span><br>${action}`;
  turnDisplay.style.display = "block";

  if (mpState.enabled) {
    import("./draft.js").then(({ _updateMpTurnIndicator }) => _updateMpTurnIndicator());
  }

  // Sync mini-bar
  if (window._updateMiniBar) window._updateMiniBar();
}

export function highlightCurrentSlot() {
  document.querySelectorAll(".slot.current-pick, .ban-slot.current-pick")
    .forEach(s => s.classList.remove("current-pick"));
  if (state.currentStep >= state.currentDraftOrder.length) {
    updateFearlessRestrictions(); return;
  }
  const step = state.currentDraftOrder[state.currentStep];
  if (step.type === "ban") {
    const c = document.getElementById(`bans-${step.team}`);
    if (c) {
      const slot = Array.from(c.querySelectorAll(".ban-slot")).find(s => !s.querySelector("img"));
      if (slot) slot.classList.add("current-pick");
    }
  } else {
    const c = document.getElementById(`picks-${step.team}`);
    if (c) {
      const slot = Array.from(c.querySelectorAll(".slot")).find(s => !s.querySelector("img"));
      if (slot) slot.classList.add("current-pick");
    }
  }
  updateFearlessRestrictions();
}

export function updateFearlessRestrictions() {
  state.allImages.forEach(img => img.classList.remove("fearless-blocked"));
  if (!state.fearlessMode || state.currentStep >= state.currentDraftOrder.length) return;
  const step = state.currentDraftOrder[state.currentStep];
  if (step.type !== "pick") return;
  const teamSet = step.team === "teamA" ? fearlessTeamA : fearlessTeamB;
  state.allImages.forEach(img => {
    if (teamSet.has(img.dataset.file) && !img.classList.contains("used"))
      img.classList.add("fearless-blocked");
  });
}

export function resetDraftSlots() {
  ["teamA", "teamB"].forEach(teamId => {
    const col = document.getElementById(`picks-${teamId}`);
    if (col) col.querySelectorAll(".slot").forEach(s => {
      s.innerHTML = state.langData.pick || "Pick";
      s.classList.remove("current-pick");
    });
    const bans = document.getElementById(`bans-${teamId}`);
    if (bans) bans.querySelectorAll(".ban-slot").forEach(s => {
      s.innerHTML = ""; s.classList.remove("current-pick", "filled");
    });
  });
}

export function createRecapSlots(slots, isBan = false) {
  const wrap = document.createElement("div");
  wrap.className = "slots " + (isBan ? "bans" : "picks");
  wrap.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin:5px 0;";
  slots.forEach(oldSlot => {
    const newSlot = document.createElement("div");
    newSlot.className = isBan ? "ban-slot filled" : "slot";
    newSlot.style.cssText = "width:46px;height:46px;";
    const img = oldSlot.querySelector("img");
    if (img) {
      const i = img.cloneNode();
      i.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:5px;" + (isBan ? "opacity:0.5;" : "");
      newSlot.appendChild(i);
    }
    wrap.appendChild(newSlot);
  });
  return wrap;
}

export function findNextBanSlot(team) {
  const c = document.getElementById(`bans-${team}`);
  return c ? Array.from(c.querySelectorAll(".ban-slot")).find(s => !s.querySelector("img")) : null;
}
export function findNextPickSlot(team) {
  const c = document.getElementById(`picks-${team}`);
  return c ? Array.from(c.querySelectorAll(".slot")).find(s => !s.querySelector("img")) : null;
}
export function getAllBanSlots(team) {
  const c = document.getElementById(`bans-${team}`);
  return c ? Array.from(c.querySelectorAll(".ban-slot")) : [];
}
export function getAllPickSlots(team) {
  const c = document.getElementById(`picks-${team}`);
  return c ? Array.from(c.querySelectorAll(".slot")) : [];
}