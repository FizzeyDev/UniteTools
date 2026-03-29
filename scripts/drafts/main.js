import { state } from "./state.js";
import { draftOrders } from "./constants.js";
import { updateDynamicContent } from "./ui.js";
import { renderGallery, initSortSelect, initFilters, initSearch } from "./gallery.js";
import { startDraft, endFearlessSeries, softResetDraft, undoLastPick, startNextDraft, _updateMpTurnIndicator } from "./draft.js";
import { mpState, createRoom, joinRoom, disconnectRoom, isMyTurn, publishDraftStart, switchRole, publishSideSwap } from "./multiplayer.js";

// ─── Language & data ──────────────────────────────────────────────────────────

const currentLang = localStorage.getItem("lang") || "fr";
fetch(`lang/${currentLang}.json`).then(r => r.json()).then(d => { state.langData = d; updateDynamicContent(); });
fetch("data/pokemons.json").then(r => r.json()).then(d => {
  // Scyther is excluded from the draft pool
  state.monsData = d.filter(mon => !(mon.file && mon.file.toLowerCase().includes("scyther")) &&
                                   !(mon.name && mon.name.toLowerCase() === "scyther"));
  renderGallery();
});

// ─── Mode buttons ─────────────────────────────────────────────────────────────

document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.selectedMode      = btn.dataset.mode;
    state.currentDraftOrder = [...draftOrders[state.selectedMode]];
    document.getElementById("mode-title").textContent = state.langData[`mode_${state.selectedMode}`] || "";
    document.getElementById("mode-text").textContent  = state.langData[`tooltip_${state.selectedMode}`] || "";
    document.getElementById("start-draft").disabled      = false;
    document.getElementById("create-room-btn").disabled  = false;
  });
});

// ─── Map buttons ──────────────────────────────────────────────────────────────

document.querySelectorAll(".map-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".map-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.selectedMap = btn.dataset.map;
  });
});

// ─── Start draft ──────────────────────────────────────────────────────────────

document.getElementById("start-draft").addEventListener("click", async () => {
  // In MP, only the host can start the draft
  if (mpState.enabled && !mpState.isHost) return;
  startDraft();
  if (mpState.enabled && mpState.isHost) {
    const fearless = document.getElementById("fearless-checkbox").checked;
    await publishDraftStart(fearless, state.selectedMap);
  }
});

// ─── Reset draft ──────────────────────────────────────────────────────────────

document.getElementById("reset-draft").addEventListener("click", () => {
  disconnectRoom();
  softResetDraft();
  document.getElementById("mp-room-banner").style.display = "none";
});

// ─── Undo ─────────────────────────────────────────────────────────────────────

document.getElementById("backBtn").addEventListener("click", undoLastPick);

// ─── Next Draft (fearless) ────────────────────────────────────────────────────

document.getElementById("next-draft-btn").addEventListener("click", async () => {
  if (mpState.enabled) {
    // Both fearless and non-fearless MP: host launches next draft directly
    if (mpState.isHost) {
      await startNextDraft(false);
    }
    // Non-host players wait for mp:nextDraft event — do nothing here
  } else {
    // Local mode: start next draft directly
    await startNextDraft(false);
  }
});

// ─── End series ───────────────────────────────────────────────────────────────

document.getElementById("end-series-btn").addEventListener("click", () => {
  if (mpState.enabled && !state.fearlessMode) {
    // In MP non-fearless recap, this button is "Disconnect"
    disconnectRoom();
    endFearlessSeries();
    document.getElementById("mp-room-banner").style.display = "none";
    const endBtn = document.getElementById("end-series-btn");
    if (endBtn) endBtn.textContent = "✕ End Series";
  } else {
    endFearlessSeries();
  }
});

// ─── Swap sides ───────────────────────────────────────────────────────────────

document.getElementById("swap-sides-btn").addEventListener("click", async () => {
  state.sidesSwapped = !state.sidesSwapped;
  const btn = document.getElementById("swap-sides-btn");
  btn.textContent = state.sidesSwapped ? "🔄 Sides Swapped ✓" : "🔄 Swap Sides";
  btn.classList.toggle("active", state.sidesSwapped);
  // Broadcast to all players so isMyTurn() stays in sync
  if (mpState.enabled && mpState.isHost) {
    await publishSideSwap(state.sidesSwapped);
  }
});



document.getElementById("create-room-btn").addEventListener("click", async () => {
  if (!state.selectedMode) { _showMpError("Select a draft mode first."); return; }
  const btn = document.getElementById("create-room-btn");
  btn.disabled = true; btn.textContent = "Creating…";
  try {
    const roomId = await createRoom(state.selectedMode, state.selectedMap);
    _showRoomBanner(roomId, "teamA");
    _updateRoleSelectorUI();
  } catch (e) {
    _showMpError("Firebase error: " + e.message); console.error(e);
  } finally {
    btn.disabled = false; btn.textContent = "🎮 Create a room";
  }
});

// ─── Multiplayer: Join room ───────────────────────────────────────────────────

document.getElementById("join-room-btn").addEventListener("click", async () => {
  const code = document.getElementById("room-code-input").value.trim().toUpperCase();
  if (!code || code.length !== 6) { _showMpError("Enter a valid room code (6 characters)."); return; }
  const btn = document.getElementById("join-room-btn");
  btn.disabled = true; btn.textContent = "Connecting…";
  const asSpectator = document.getElementById("join-as-spectator").checked;
  try {
    const { role, data } = await joinRoom(code, asSpectator);
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === data.mode));
    state.selectedMode      = data.mode;
    state.selectedMap       = data.map;
    state.currentDraftOrder = [...draftOrders[data.mode]];
    _showRoomBanner(code, role);
    _updateRoleSelectorUI();

    // Only the host can start the draft
    document.getElementById("start-draft").disabled = true; // joiner is never host
    // Show "Waiting for host to start…" hint
    _updateStartDraftHint("teamB");

    if (data.status === "drafting") {
      _launchDraftForPlayer(data);
    }
  } catch (e) {
    _showMpError(e.message || "Could not join the room."); console.error(e);
  } finally {
    btn.disabled = false; btn.textContent = "🔗 Join";
  }
});

// ─── Role selector buttons ────────────────────────────────────────────────────

document.querySelectorAll(".mp-role-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    if (!mpState.enabled) return;
    const newRole = btn.dataset.role;
    if (newRole === mpState.playerRole) return; // already this role
    try {
      await switchRole(newRole);
      _updateRoleSelectorUI();
      _showRoomBanner(mpState.roomId, mpState.playerRole);
      // Only host can start the draft (regardless of role)
      document.getElementById("start-draft").disabled = !mpState.isHost;
      _updateStartDraftHint(mpState.isHost ? "teamA" : "teamB");
    } catch (e) {
      _showMpError(e.message);
    }
  });
});

// ─── MP event listeners ───────────────────────────────────────────────────────

window.addEventListener("mp:draftStart", (e) => {
  _launchDraftForPlayer(e.detail);
});

window.addEventListener("mp:nextDraft", (e) => {
  // Host already called startNextDraft(false) which published this event.
  // Non-host players react here with skipPublish=true.
  if (mpState.isHost) return;
  const data = e.detail;
  state.selectedMode  = data.mode;
  state.selectedMap   = data.map;
  state.fearlessMode  = data.fearlessMode || false;
  state.sidesSwapped  = data.sidesSwapped === true; // explicit boolean, never undefined
  state.currentStep   = 0;
  state.currentDraftOrder = [...draftOrders[data.mode]];
  // Sync checkbox so startNextDraft lit la bonne valeur fearless
  const cb = document.getElementById("fearless-checkbox");
  if (cb) cb.checked = state.fearlessMode;
  startNextDraft(true); // skipPublish = true, host already published
  _forceShowGallery();
});

window.addEventListener("mp:draftEnd", () => {
  // Any player who did NOT already call endDraft() locally reacts here.
  // The _draftEnding guard inside endDraft() prevents double execution
  // for the player who triggered the last pick.
  import("./draft.js").then(({ endDraft }) => endDraft());
});

window.addEventListener("mp:returnToLobby", (data) => {
  // Non-host players return to lobby when host triggers it
  softResetDraft();
  document.getElementById("mp-room-banner").style.display = "flex";
  document.getElementById("mp-toggle-btn").style.display = "flex";
  _updateRoleSelectorUI();
  // Only host can start
  document.getElementById("start-draft").disabled = !mpState.isHost;
  _updateStartDraftHint(mpState.isHost ? "teamA" : "teamB");
});

window.addEventListener("mp:roleChanged", (e) => {
  _updateRoleSelectorUI();
});

// ─── Private helpers ──────────────────────────────────────────────────────────

function _launchDraftForPlayer(data) {
  state.selectedMode      = data.mode;
  state.selectedMap       = data.map;
  state.fearlessMode      = data.fearlessMode || false;
  state.currentDraftOrder = [...draftOrders[data.mode]];
  state.currentStep       = 0;

  // Sync the checkbox so startDraft() reads the correct value
  const cb = document.getElementById("fearless-checkbox");
  if (cb) cb.checked = state.fearlessMode;

  document.querySelectorAll(".mode-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.mode === data.mode));

  startDraft();
  _forceShowGallery();
}

function _forceShowGallery() {
  const gw = document.getElementById("gallery-wrapper");
  if (gw) { gw.style.display = "flex"; gw.style.flexDirection = "column"; }
  const f = document.getElementById("filters");     if (f) f.style.display = "flex";
  const s = document.getElementById("sort-options"); if (s) s.style.display = "flex";
}

function _showRoomBanner(roomId, role) {
  document.getElementById("mp-room-code").textContent = roomId;
  const hostBadge = mpState.isHost ? " (Host)" : "";
  document.getElementById("mp-player-role").textContent =
    role === "teamA"    ? `🟣 Purple Team${hostBadge}` :
    role === "teamB"    ? `🟠 Orange Team${hostBadge}` :
    `👁 Spectator${hostBadge}`;
  document.getElementById("mp-room-banner").style.display = "flex";
  document.getElementById("mp-copy-code").onclick = () => {
    navigator.clipboard.writeText(roomId);
    document.getElementById("mp-copy-code").textContent = "✅ Copied!";
    setTimeout(() => { document.getElementById("mp-copy-code").textContent = "📋 Copy"; }, 2000);
  };
}

function _updateStartDraftHint(role) {
  const hint = document.getElementById("mp-start-hint");
  if (!hint) return;
  if (role === "teamA") {
    hint.textContent = "";
    hint.style.display = "none";
  } else {
    hint.textContent = "⏳ Waiting for host (Purple Team) to start the draft…";
    hint.style.display = "block";
  }
}

function _updateRoleSelectorUI() {
  document.querySelectorAll(".mp-role-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.role === mpState.playerRole);
  });
  // Show role selector only when in a room
  const sel = document.getElementById("mp-role-selector");
  if (sel) sel.style.display = mpState.enabled ? "flex" : "none";
}

function _showMpError(msg) {
  const el = document.getElementById("mp-error");
  if (!el) return;
  el.textContent = msg; el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 5000);
}

window._mpIsMyTurn = isMyTurn;

initSortSelect();
initFilters();
initSearch();