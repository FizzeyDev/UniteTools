import { state, fearlessTeamA, fearlessTeamB } from "./state.js";
import { mapImages, draftOrders, swapDraftOrder } from "./constants.js";
import { updateTurn, highlightCurrentSlot, resetDraftSlots, createRecapSlots, getAllBanSlots, getAllPickSlots } from "./ui.js";
import { setupTimer } from "./timer.js";
import { publishPick, publishDraftEnd, publishReturnToLobby, publishNextDraft, mpState } from "./multiplayer.js";

window._mpPublishPick = async (stepIndex, monFile) => {
  if (mpState.enabled) await publishPick(stepIndex, monFile);
};

// ─── Start Draft ──────────────────────────────────────────────────────────────

export function startDraft() {
  if (!state.selectedMode) return;

  if (!state.selectedMap) {
    const maps = ["groudon", "kyogre", "rayquaza"];
    state.selectedMap = maps[Math.floor(Math.random() * maps.length)];
  }

  // Toujours lire la checkbox — en MP, publishDraftStart va broadcaster la valeur
  state.fearlessMode = document.getElementById("fearless-checkbox").checked;

  state.currentDraftOrder = [...draftOrders[state.selectedMode]];
  state.currentStep = 0;

  document.getElementById("map-display").innerHTML =
    `<img src="${mapImages[state.selectedMap]}" alt="${state.selectedMap}">`;
  document.getElementById("map-display").style.display = "block";
  document.getElementById("map-selection").style.display = "none";

  // Mettre à jour la barre collapse
  _updateCollapseBar();

  document.getElementById("start-draft").style.display = "none";
  document.getElementById("reset-draft").style.display = "inline-block";
  // Undo is disabled in MP (desyncs would break the room)
  document.getElementById("backBtn").style.display = mpState.enabled ? "none" : "inline-block";

  _showGallery();
  _hideRecap();

  document.querySelectorAll(".mode-btn").forEach(b => b.classList.add("disabled"));
  document.getElementById("mp-controls").classList.remove("open");
  document.getElementById("mp-toggle-btn").style.display = "none";

  setupTimer();
  resetDraftSlots();
  state.allImages.forEach(img => img.classList.remove("used", "fearless-blocked"));
  updateTurn();
  highlightCurrentSlot();
  if (mpState.enabled) _updateMpTurnIndicator();
}

// ─── End Draft ────────────────────────────────────────────────────────────────

let _draftEnding = false; // guard against double-call (host fires + receives own SSE)

export async function endDraft() {
  if (_draftEnding) return;
  _draftEnding = true;

  clearInterval(state.timerInterval);
  document.querySelectorAll(".slot.current-pick, .ban-slot.current-pick")
    .forEach(s => s.classList.remove("current-pick"));
  document.getElementById("backBtn").style.display = "none";
  updateTurn();

  // Hide gallery first so it never flashes over the recap
  _hideGallery();

  // Set localStatus immediately so any SSE bounce doesn't re-trigger
  if (mpState.enabled) mpState.localStatus = "recap";

  // Show recap
  if (state.fearlessMode) {
    _showFearlessRecap();
  } else {
    _showFinalRecap();
  }

  // Publish to Firebase — whoever triggers endDraft locally publishes the status change.
  // The _draftEnding guard (set above) prevents re-entry when the SSE bounces back.
  // Non-triggering players receive mp:draftEnd via SSE and call endDraft() themselves.
  if (mpState.enabled) {
    await publishDraftEnd();
  }

  // Reset guard after delay so the next draft can end properly
  setTimeout(() => { _draftEnding = false; }, 3000);
}

// ─── Recap builders ───────────────────────────────────────────────────────────

function _showFinalRecap() {
  state.draftCount++;
  _buildCenterRecap("Draft Result");
  document.getElementById("fearless-controls").style.display = "none";

  if (mpState.enabled) {
    // In MP mode: same flow as fearless — host picks map/sides then launches directly
    document.getElementById("reset-draft").style.display    = "none";
    document.getElementById("mp-toggle-btn").style.display  = "none";
    document.getElementById("fearless-controls").style.display = "flex";
    document.getElementById("fearless-series").style.display   = "block";
    document.getElementById("fearless-map-reselect").style.display = "block";
    // Pre-select current map
    document.querySelectorAll(".fearless-map-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.map === state.selectedMap);
    });
    const nextBtn = document.getElementById("next-draft-btn");
    nextBtn.textContent = "\u25b6 Next Draft";
    nextBtn.style.display = mpState.isHost ? "inline-block" : "none";
    const swapBtn = document.getElementById("swap-sides-btn");
    if (swapBtn) swapBtn.style.display = mpState.isHost ? "inline-block" : "none";
    const endBtn = document.getElementById("end-series-btn");
    endBtn.textContent = "\u2715 Disconnect";
    endBtn.style.display = mpState.isHost ? "inline-block" : "none";
    const waitMsg = document.getElementById("mp-recap-wait-msg");
    if (waitMsg) waitMsg.style.display = mpState.isHost ? "none" : "block";
  } else {
    document.getElementById("reset-draft").style.display    = "inline-block";
    document.getElementById("mp-toggle-btn").style.display  = "flex";
    // Show swap-sides button and next-draft in solo mode too
    const swapBtn = document.getElementById("swap-sides-btn");
    if (swapBtn) swapBtn.style.display = "inline-block";
    const nextBtn = document.getElementById("next-draft-btn");
    nextBtn.textContent = "▶ New Draft";
    nextBtn.style.display = "inline-block";
    document.getElementById("fearless-controls").style.display = "flex";
    document.getElementById("fearless-map-reselect").style.display = "block";
    document.getElementById("end-series-btn").style.display = "none";
  }
}

function _showFearlessRecap() {
  state.draftCount++;
  _updateCollapseBar();
  _buildCenterRecap(`Draft ${state.draftCount} Recap`);
  _appendToSeriesHistory(`Draft ${state.draftCount}`);
  document.getElementById("fearless-controls").style.display = "flex";
  document.getElementById("fearless-series").style.display   = "block";
  document.querySelectorAll(".fearless-map-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.map === state.selectedMap);
  });

  // In MP mode: show "Next Draft" for host only, waiting msg for others
  if (mpState.enabled) {
    document.getElementById("mp-toggle-btn").style.display = "none";
    const nextBtn = document.getElementById("next-draft-btn");
    const endBtn  = document.getElementById("end-series-btn");
    const swapBtn = document.getElementById("swap-sides-btn");
    const waitMsg = document.getElementById("mp-recap-wait-msg");
    nextBtn.textContent = "▶ Next Draft";

    nextBtn.style.display = mpState.isHost ? "inline-block" : "none";
    endBtn.style.display  = mpState.isHost ? "inline-block" : "none";
    if (swapBtn) swapBtn.style.display = mpState.isHost ? "inline-block" : "none";
    if (waitMsg) waitMsg.style.display = mpState.isHost ? "none" : "block";
  } else {
    // Solo fearless: always show swap button
    const swapBtn = document.getElementById("swap-sides-btn");
    if (swapBtn) swapBtn.style.display = "inline-block";
  }
}

function _buildCenterRecap(title) {
  document.getElementById("center-recap-map").innerHTML = state.selectedMap
    ? `<img src="${mapImages[state.selectedMap]}" alt="${state.selectedMap}">` : "";
  document.getElementById("center-recap-title").textContent = title;

  const teamsEl = document.getElementById("center-recap-teams");
  teamsEl.innerHTML = "";
  ["teamA", "teamB"].forEach(teamId => teamsEl.appendChild(_buildRecapTeam(teamId)));

  document.getElementById("center-recap").style.display = "flex";
}

function _buildRecapTeam(teamId) {
  const wrap = document.createElement("div");
  wrap.className = `recap-team ${teamId}`;

  const title = document.createElement("div");
  title.className = "recap-team-title";
  title.textContent = teamId === "teamA" ? "🟣 Purple Team" : "🟠 Orange Team";
  wrap.appendChild(title);

  const bansLabel = document.createElement("div");
  bansLabel.className = "recap-section-label";
  bansLabel.textContent = "Bans";
  wrap.appendChild(bansLabel);
  const bansRow = document.createElement("div");
  bansRow.className = "recap-slots";
  getAllBanSlots(teamId).forEach(slot => {
    const rs = document.createElement("div");
    rs.className = "recap-slot ban-recap";
    const img = slot.querySelector("img");
    if (img) {
      const i = img.cloneNode();
      i.style.cssText = "width:100%;height:100%;object-fit:cover;opacity:0.5;";
      rs.appendChild(i);
    } else rs.classList.add("empty");
    bansRow.appendChild(rs);
  });
  wrap.appendChild(bansRow);

  const picksLabel = document.createElement("div");
  picksLabel.className = "recap-section-label";
  picksLabel.textContent = "Picks";
  wrap.appendChild(picksLabel);
  const picksRow = document.createElement("div");
  picksRow.className = "recap-slots";
  getAllPickSlots(teamId).forEach(slot => {
    const rs = document.createElement("div");
    rs.className = "recap-slot";
    const img = slot.querySelector("img");
    if (img) {
      const i = img.cloneNode();
      i.style.cssText = "width:100%;height:100%;object-fit:cover;";
      rs.appendChild(i);
    } else rs.classList.add("empty");
    picksRow.appendChild(rs);
  });
  wrap.appendChild(picksRow);
  return wrap;
}

function _appendToSeriesHistory(title) {
  const recapDiv = document.createElement("div");
  recapDiv.style.cssText = "margin-bottom:20px;padding:14px;background:var(--surface-2);border-radius:12px;border:1px solid var(--border);";
  const h = document.createElement("h4");
  h.textContent = title;
  h.style.cssText = "font-family:'Exo 2',sans-serif;font-size:0.85rem;margin-bottom:10px;color:#fff;letter-spacing:0.06em;text-transform:uppercase;";
  recapDiv.appendChild(h);
  const teamsDiv = document.createElement("div");
  teamsDiv.style.cssText = "display:flex;justify-content:space-around;flex-wrap:wrap;gap:14px;";
  ["teamA", "teamB"].forEach(teamId => {
    const container = document.createElement("div");
    container.style.textAlign = "center";
    const th = document.createElement("div");
    th.style.cssText = `font-size:0.75rem;font-weight:700;margin-bottom:6px;color:${teamId === "teamA" ? "var(--violet)" : "var(--orange)"};`;
    th.textContent = teamId === "teamA" ? "🟣 Purple" : "🟠 Orange";
    container.appendChild(th);
    container.appendChild(createRecapSlots(getAllBanSlots(teamId), true));
    container.appendChild(createRecapSlots(getAllPickSlots(teamId), false));
    teamsDiv.appendChild(container);
  });
  recapDiv.appendChild(teamsDiv);
  document.getElementById("series-recaps").prepend(recapDiv);
}

// ─── Undo ─────────────────────────────────────────────────────────────────────

export function undoLastPick() {
  if (mpState.enabled || state.currentStep <= 0) return;
  const lastIndex = state.currentStep - 1;
  const step = state.currentDraftOrder[lastIndex];

  if (step.type === "ban") {
    const slots = getAllBanSlots(step.team);
    const last = [...slots].reverse().find(s => s.querySelector("img"));
    if (!last) return;
    const monFile = last.querySelector("img")?.dataset?.file;
    if (monFile) { const g = state.allImages.find(i => i.dataset.file === monFile); if (g) g.classList.remove("used"); }
    last.innerHTML = "";
    last.classList.remove("filled");
  } else {
    const slots = getAllPickSlots(step.team);
    const last = [...slots].reverse().find(s => s.querySelector("img"));
    if (!last) return;
    const monFile = last.querySelector("img")?.dataset?.file;
    if (monFile) {
      const g = state.allImages.find(i => i.dataset.file === monFile);
      if (g) g.classList.remove("used");
      if (state.fearlessMode) {
        (step.team === "teamA" ? fearlessTeamA : fearlessTeamB).delete(monFile);
      }
    }
    last.innerHTML = state.langData.pick || "Pick";
  }
  state.currentStep = lastIndex;
  updateTurn();
  highlightCurrentSlot();
}

// ─── Reset / Soft reset ───────────────────────────────────────────────────────

export function softResetDraft() {
  clearInterval(state.timerInterval);
  state.currentStep  = 0;
  state.selectedMode = null;
  state.selectedMap  = null;
  state.sidesSwapped = false;

  document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active", "disabled"));
  document.querySelectorAll(".map-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("start-draft").style.display    = "inline-block";
  document.getElementById("start-draft").disabled         = true;
  document.getElementById("reset-draft").style.display    = "none";
  document.getElementById("backBtn").style.display        = "none";
  document.getElementById("final-draft").style.display    = "none";
  document.getElementById("fearless-series").style.display = "none";
  document.getElementById("fearless-controls").style.display = "none";
  document.getElementById("map-selection").style.display  = "block";
  document.getElementById("map-display").style.display    = "none";
  document.getElementById("turn-display").style.display   = "none";
  document.getElementById("bubble-timer").style.display   = "none";
  document.getElementById("mp-toggle-btn").style.display  = "flex";
  const mpInd = document.getElementById("mp-turn-indicator");
  if (mpInd) mpInd.style.display = "none";
  const swapBtn = document.getElementById("swap-sides-btn");
  if (swapBtn) { swapBtn.style.display = "none"; swapBtn.classList.remove("active"); swapBtn.textContent = "🔄 Swap Sides"; }

  _hideGallery();
  _hideRecap();
  resetDraftSlots();
  state.allImages.forEach(img => img.classList.remove("used", "fearless-blocked"));
}

/**
 * Return to lobby: keep the room alive but go back to the preparation screen.
 * Called when "Next Draft" is clicked in MP mode (non-fearless or between fearless drafts).
 */
export async function returnToLobby() {
  softResetDraft();

  // Reset the next-draft-btn text in case it was repurposed
  const ndBtn = document.getElementById("next-draft-btn");
  if (ndBtn) ndBtn.textContent = "▶ Next Draft";

  // Restore fearless map reselect visibility for next time
  const fmr = document.getElementById("fearless-map-reselect");
  if (fmr) fmr.style.display = "block";

  // Re-enable mode buttons since we're back in lobby
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("disabled"));

  // Re-show the multiplayer panel so players can change roles / map
  document.getElementById("mp-toggle-btn").style.display = "flex";
  document.getElementById("mp-room-banner").style.display = "flex";

  // Re-enable start button if mode is already selected
  if (state.selectedMode) {
    document.getElementById("start-draft").disabled = false;
  }

  if (mpState.enabled && mpState.isHost) {
    await publishReturnToLobby();
  }
}

// ─── Fearless series next draft ───────────────────────────────────────────────

export async function startNextDraft(skipPublish = false) {
  const selectedMapBtn = document.querySelector(".fearless-map-btn.active");
  if (selectedMapBtn) state.selectedMap = selectedMapBtn.dataset.map;

  // Apply side swap if requested
  if (state.sidesSwapped) {
    state.currentDraftOrder = swapDraftOrder([...draftOrders[state.selectedMode]]);
  } else {
    state.currentDraftOrder = [...draftOrders[state.selectedMode]];
  }

  // NE PAS vider fearlessTeamA/B ici — en fearless, les picks s'accumulent
  // entre les drafts. Les sets sont clearés uniquement dans endFearlessSeries().

  resetDraftSlots();
  state.allImages.forEach(img => img.classList.remove("used", "fearless-blocked"));
  state.currentStep = 0;

  document.getElementById("map-display").innerHTML =
    `<img src="${mapImages[state.selectedMap]}" alt="${state.selectedMap}">`;
  document.getElementById("map-display").style.display = "block";

  _updateCollapseBar();

  _hideRecap();
  _showGallery();
  document.getElementById("fearless-controls").style.display = "none";
  document.getElementById("backBtn").style.display = mpState.enabled ? "none" : "inline-block";
  // Reset end-series-btn text in case it was relabelled
  const endBtn = document.getElementById("end-series-btn");
  if (endBtn) endBtn.textContent = "✕ End Series";
  // Capture sidesSwapped BEFORE resetting — we still need to publish it
  const sidesSwappedToPublish = state.sidesSwapped;
  // Reset swap-sides button (swap was applied, now reset for next round)
  state.sidesSwapped = false;
  const swapBtn = document.getElementById("swap-sides-btn");
  if (swapBtn) { swapBtn.style.display = "none"; swapBtn.classList.remove("active"); swapBtn.textContent = "🔄 Swap Sides"; }
  const waitMsg = document.getElementById("mp-recap-wait-msg");
  if (waitMsg) waitMsg.style.display = "none";

  setupTimer();
  updateTurn();
  highlightCurrentSlot();
  if (mpState.enabled) _updateMpTurnIndicator();

  if (mpState.enabled && !skipPublish && mpState.isHost) {
    const fearless = document.getElementById("fearless-checkbox")?.checked ?? state.fearlessMode;
    await publishNextDraft(state.selectedMap, fearless, sidesSwappedToPublish);
  }
}

// ─── End fearless series ──────────────────────────────────────────────────────

export function endFearlessSeries() {
  softResetDraft();
  fearlessTeamA.clear();
  fearlessTeamB.clear();
  state.draftCount = 0;
  document.getElementById("series-recaps").innerHTML = "";
  document.getElementById("fearless-series").style.display = "none";
}

// ─── MP turn indicator ────────────────────────────────────────────────────────

export function _updateMpTurnIndicator() {
  if (!mpState.enabled) return;
  const indicator = document.getElementById("mp-turn-indicator");
  if (!indicator) return;
  const mine = window._mpIsMyTurn ? window._mpIsMyTurn() : true;
  if (mpState.playerRole === "spectator") {
    indicator.textContent = "👁 Spectator";
    indicator.className = "mp-turn-indicator spectator";
  } else if (mine) {
    indicator.textContent = "✅ Your turn!";
    indicator.className = "mp-turn-indicator your-turn";
  } else {
    indicator.textContent = "⏳ Waiting for opponent…";
    indicator.className = "mp-turn-indicator waiting";
  }
  indicator.style.display = "block";
}

// ─── Collapse bar updater ─────────────────────────────────────────────────────

export function updateCollapseBar() {
  const mapBadge = document.getElementById("cbar-map");
  const modeEl   = document.getElementById("cbar-mode");
  if (!mapBadge || !modeEl) return;

  // Map badge
  const map = state.selectedMap || "";
  if (map) {
    mapBadge.textContent = map.charAt(0).toUpperCase() + map.slice(1);
    mapBadge.className   = `cbar-map map-${map}`;
  }

  // Mode / fearless label
  const modeLabels = {
    classic:    "Tournament 3 Bans",
    tournament: "Tournament 2 Bans",
    swap:       "Swap Ban",
    reban:      "Reban",
  };
  if (state.fearlessMode && state.draftCount > 0) {
    modeEl.textContent = `⚡ Fearless — Draft #${state.draftCount + 1}`;
    modeEl.style.color = "var(--violet)";
  } else if (state.fearlessMode) {
    modeEl.textContent = `⚡ Fearless — ${modeLabels[state.selectedMode] || state.selectedMode || ""}`;
    modeEl.style.color = "var(--violet)";
  } else {
    modeEl.textContent = modeLabels[state.selectedMode] || state.selectedMode || "";
    modeEl.style.color = "";
  }
}

// Alias interne
function _updateCollapseBar() { updateCollapseBar(); }

// ─── Private helpers ──────────────────────────────────────────────────────────

function _showGallery() {
  const gw = document.getElementById("gallery-wrapper");
  if (gw) { gw.style.display = "flex"; gw.style.flexDirection = "column"; }
  const f = document.getElementById("filters");   if (f) f.style.display = "flex";
  const s = document.getElementById("sort-options"); if (s) s.style.display = "flex";
}

function _hideGallery() {
  const gw = document.getElementById("gallery-wrapper"); if (gw) gw.style.display = "none";
  const f = document.getElementById("filters");          if (f) f.style.display = "none";
  const s = document.getElementById("sort-options");     if (s) s.style.display = "none";
}

function _hideRecap() {
  const r = document.getElementById("center-recap");
  if (r) r.style.display = "none";
}