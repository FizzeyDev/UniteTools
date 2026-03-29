import { state } from "./state.js";
import { draftOrders } from "./constants.js";

const DATABASE_URL = "https://unite-draft-default-rtdb.europe-west1.firebasedatabase.app";

async function dbGet(path) {
  const res = await fetch(`${DATABASE_URL}/${path}.json`);
  if (!res.ok) throw new Error(`Firebase GET failed: ${res.status}`);
  return res.json();
}
async function dbSet(path, data) {
  const res = await fetch(`${DATABASE_URL}/${path}.json`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase SET failed: ${res.status}`);
  return res.json();
}
async function dbUpdate(path, data) {
  const res = await fetch(`${DATABASE_URL}/${path}.json`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase UPDATE failed: ${res.status}`);
  return res.json();
}
async function dbPush(path, data) {
  const res = await fetch(`${DATABASE_URL}/${path}.json`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase PUSH failed: ${res.status}`);
  return (await res.json()).name;
}
function dbListen(path, callback) {
  const es = new EventSource(`${DATABASE_URL}/${path}.json`);
  es.addEventListener("put", (e) => {
    try { const p = JSON.parse(e.data); if (p.data) callback(p.data); } catch {}
  });
  es.addEventListener("patch", (e) => {
    try { dbGet(path).then(d => { if (d) callback(d); }); } catch {}
  });
  es.onerror = () => console.warn("[MP] SSE reconnecting...");
  return es;
}

export const mpState = {
  enabled: false,
  roomId: null,
  playerRole: null,     // "teamA" | "teamB" | "spectator"
  isHost: false,        // true only for the player who CREATED the room (permanent)
  sseConnection: null,
  spectatorCount: 0,
  localStatus: "idle",  // "idle" | "drafting" | "recap" | "lobby"
  spectatorKey: null,   // Firebase key for spectator cleanup
  _catchupInterval: null,
};

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─── Room creation ────────────────────────────────────────────────────────────

export async function createRoom(mode, map) {
  const roomId = generateRoomCode();
  await dbSet(`rooms/${roomId}`, {
    mode, map: map || null,
    createdAt: Date.now(),
    status: "waiting",
    currentStep: 0,
    picks: {},
    fearlessMode: false,
    draftCount: 0,
    // roles: which player occupies which slot (null = free)
    roles: { teamA: true, teamB: false },
    spectators: {},
  });
  mpState.enabled = true;
  mpState.roomId = roomId;
  mpState.playerRole = "teamA";
  mpState.isHost = true;
  mpState.localStatus = "idle";
  _subscribeToRoom(roomId);
  _registerOfflineHook(roomId, "teamA");
  return roomId;
}

// ─── Room join ────────────────────────────────────────────────────────────────

export async function joinRoom(roomId, asSpectator = false) {
  const data = await dbGet(`rooms/${roomId}`);
  if (!data) throw new Error("Room not found. Check the code.");

  let role;
  const teamBFree = !data.roles?.teamB;

  if (asSpectator || !teamBFree) {
    // Join as spectator
    const key = await dbPush(`rooms/${roomId}/spectators`, { online: true });
    mpState.spectatorKey = key;
    role = "spectator";
    mpState.playerRole = "spectator";
    window.addEventListener("beforeunload", () =>
      navigator.sendBeacon(`${DATABASE_URL}/rooms/${roomId}/spectators/${key}/online.json`, "false"));
  } else {
    // Join as teamB
    await dbUpdate(`rooms/${roomId}/roles`, { teamB: true });
    role = "teamB";
    mpState.playerRole = "teamB";
    _registerOfflineHook(roomId, "teamB");
  }

  mpState.enabled = true;
  mpState.roomId = roomId;
  mpState.isHost = false;
  mpState.localStatus = "idle";
  state.selectedMode      = data.mode;
  state.selectedMap       = data.map;
  state.currentDraftOrder = [...draftOrders[data.mode]];
  state.currentStep       = data.currentStep || 0;
  state.fearlessMode      = data.fearlessMode || false;

  _subscribeToRoom(roomId);
  return { role, data };
}

// ─── Role switching ───────────────────────────────────────────────────────────

/**
 * Switch the current player's role in the room.
 * @param {"teamA"|"teamB"|"spectator"} newRole
 */
export async function switchRole(newRole) {
  if (!mpState.enabled || !mpState.roomId) return;
  const data = await dbGet(`rooms/${mpState.roomId}`);
  if (!data) return;

  const oldRole = mpState.playerRole;

  // Validate availability
  if (newRole === "teamA" && data.roles?.teamA && oldRole !== "teamA") {
    throw new Error("Purple Team is already taken.");
  }
  if (newRole === "teamB" && data.roles?.teamB && oldRole !== "teamB") {
    throw new Error("Orange Team is already taken.");
  }
  if (newRole === "spectator") {
    const count = data.spectators ? Object.keys(data.spectators).length : 0;
    if (count >= 5 && oldRole !== "spectator") throw new Error("Spectator slots are full (max 5).");
  }

  // Free old slot
  if (oldRole === "teamA") {
    await dbUpdate(`rooms/${mpState.roomId}/roles`, { teamA: false });
  } else if (oldRole === "teamB") {
    await dbUpdate(`rooms/${mpState.roomId}/roles`, { teamB: false });
  } else if (oldRole === "spectator" && mpState.spectatorKey) {
    await fetch(`${DATABASE_URL}/rooms/${mpState.roomId}/spectators/${mpState.spectatorKey}.json`, { method: "DELETE" });
    mpState.spectatorKey = null;
  }

  // Claim new slot
  if (newRole === "teamA") {
    await dbUpdate(`rooms/${mpState.roomId}/roles`, { teamA: true });
    _registerOfflineHook(mpState.roomId, "teamA");
  } else if (newRole === "teamB") {
    await dbUpdate(`rooms/${mpState.roomId}/roles`, { teamB: true });
    _registerOfflineHook(mpState.roomId, "teamB");
  } else {
    const key = await dbPush(`rooms/${mpState.roomId}/spectators`, { online: true });
    mpState.spectatorKey = key;
    window.addEventListener("beforeunload", () =>
      navigator.sendBeacon(`${DATABASE_URL}/rooms/${mpState.roomId}/spectators/${key}/online.json`, "false"));
  }

  mpState.playerRole = newRole;
  // NOTE: mpState.isHost is permanent — it never changes after room creation.

  // Notify UI
  window.dispatchEvent(new CustomEvent("mp:roleChanged", { detail: { role: newRole } }));
}

// ─── Draft lifecycle ──────────────────────────────────────────────────────────

export async function publishPick(stepIndex, monFile) {
  if (!mpState.enabled || !mpState.roomId) return;
  const step = state.currentDraftOrder[stepIndex];
  await dbUpdate(`rooms/${mpState.roomId}`, {
    currentStep: stepIndex + 1,
    [`picks/${stepIndex}`]: { file: monFile, team: step.team, type: step.type },
  });
}

export async function publishDraftStart(fearlessMode, map) {
  if (!mpState.enabled || !mpState.roomId) return;
  mpState.localStatus = "drafting";
  await dbUpdate(`rooms/${mpState.roomId}`, {
    status: "drafting",
    fearlessMode: fearlessMode || false,
    map: map || null,
    currentStep: 0,
    picks: {},
    draftCount: 1,
  });
}

export async function publishDraftEnd() {
  if (!mpState.enabled || !mpState.roomId) return;
  // localStatus already set to "recap" by endDraft() before this call
  await dbUpdate(`rooms/${mpState.roomId}`, { status: "recap" });
}

/**
 * Broadcast the current sidesSwapped state so all players know before the next draft starts.
 */
export async function publishSideSwap(sidesSwapped) {
  if (!mpState.enabled || !mpState.roomId) return;
  await dbUpdate(`rooms/${mpState.roomId}`, { sidesSwapped: sidesSwapped });
}

/**
 * Return everyone to the lobby (waiting) screen so they can change map/role
 * before launching the next draft.
 */
export async function publishReturnToLobby() {
  if (!mpState.enabled || !mpState.roomId) return;
  mpState.localStatus = "idle";
  await dbUpdate(`rooms/${mpState.roomId}`, {
    status: "waiting",
    currentStep: 0,
    picks: {},
  });
}

export async function publishNextDraft(map, fearlessMode, sidesSwapped = false) {
  if (!mpState.enabled || !mpState.roomId) return;
  const data = await dbGet(`rooms/${mpState.roomId}`);
  const nextCount = (data?.draftCount || 1) + 1;
  mpState.localStatus = "drafting";
  await dbUpdate(`rooms/${mpState.roomId}`, {
    status: "drafting",
    currentStep: 0,
    picks: {},
    map: map || null,
    fearlessMode: fearlessMode || false,
    sidesSwapped: sidesSwapped || false,
    draftCount: nextCount,
  });
}

// ─── SSE subscription ─────────────────────────────────────────────────────────

function _subscribeToRoom(roomId) {
  if (mpState.sseConnection) mpState.sseConnection.close();
  mpState.sseConnection = dbListen(`rooms/${roomId}`, (data) => {
    if (data && typeof data === "object") _onRoomUpdate(data);
  });

  // Catchup polling every 3s during drafting
  if (mpState._catchupInterval) clearInterval(mpState._catchupInterval);
  mpState._catchupInterval = setInterval(async () => {
    if (!mpState.enabled || mpState.localStatus !== "drafting") return;
    try {
      const d = await dbGet(`rooms/${roomId}`);
      if (d && (d.currentStep || 0) > state.currentStep) _syncPicks(d, d.currentStep);
    } catch {}
  }, 3000);
}

// ─── Room update handler ──────────────────────────────────────────────────────

function _onRoomUpdate(data) {
  _updateOnlineIndicators(data);
  _updateRoleIndicators(data);

  // Spectator count
  const count = data.spectators ? Object.keys(data.spectators).length : 0;
  mpState.spectatorCount = count;
  const specEl = document.getElementById("mp-spectator-count");
  if (specEl) specEl.textContent = count > 0 ? `👁 ${count} spectator${count > 1 ? "s" : ""}` : "";

  const rs = data.status;
  const ls = mpState.localStatus;

  // ── sidesSwapped sync (recap phase, non-host mirrors host's choice) ───────────
  if (rs === "recap" && ls === "recap") {
    if (typeof data.sidesSwapped === "boolean" && data.sidesSwapped !== state.sidesSwapped) {
      state.sidesSwapped = data.sidesSwapped;
      const swapBtn = document.getElementById("swap-sides-btn");
      if (swapBtn) {
        swapBtn.textContent = state.sidesSwapped ? "🔄 Sides Swapped ✓" : "🔄 Swap Sides";
        swapBtn.classList.toggle("active", state.sidesSwapped);
      }
    }
    return; // always ignore recap→recap bounces except for sidesSwapped sync above
  }

  // ── Waiting/lobby ──────────────────────────────────────────────────────────
  if (rs === "waiting" && (ls === "drafting" || ls === "recap")) {
    mpState.localStatus = "idle";
    window.dispatchEvent(new CustomEvent("mp:returnToLobby", { detail: data }));
    return;
  }

  // ── Draft starting ─────────────────────────────────────────────────────────
  if (rs === "drafting" && (ls === "idle" || ls === "recap")) {
    mpState.localStatus = "drafting";
    state.selectedMode      = data.mode;
    state.selectedMap       = data.map;
    state.fearlessMode      = data.fearlessMode || false;
    state.sidesSwapped      = data.sidesSwapped || false;
    state.currentDraftOrder = [...draftOrders[data.mode]];
    state.currentStep       = 0;

    const isFearlessContinuation = (data.draftCount || 1) > 1;
    if (isFearlessContinuation) {
      window.dispatchEvent(new CustomEvent("mp:nextDraft", { detail: data }));
    } else {
      window.dispatchEvent(new CustomEvent("mp:draftStart", { detail: data }));
    }

    const remoteStep = data.currentStep || 0;
    if (remoteStep > 0) setTimeout(() => _syncPicks(data, remoteStep), 500);
    return;
  }

  // ── Pick sync during draft ─────────────────────────────────────────────────
  if (rs === "drafting" && ls === "drafting") {
    const remoteStep = data.currentStep || 0;
    if (remoteStep > state.currentStep && mpState.localStatus === "drafting") {
      _syncPicks(data, remoteStep);
    }
    return;
  }

  // ── Draft ending — only fire for players still in "drafting" state ─────────
  if (rs === "recap" && ls === "drafting") {
    mpState.localStatus = "recap";
    window.dispatchEvent(new CustomEvent("mp:draftEnd"));
    return;
  }
  // If ls is already "recap", ignore the bounce (host already handled it locally)
}

// ─── Pick synchronisation ─────────────────────────────────────────────────────

function _syncPicks(data, remoteStep) {
  // Ne pas sync si la draft est déjà terminée localement
  if (mpState.localStatus === "recap") return;

  const picks = data.picks || {};
  for (let i = state.currentStep; i < remoteStep; i++) {
    const pick = picks[i];
    if (!pick) continue;
    const step = state.currentDraftOrder[i];
    if (!step) continue;

    let slot;
    if (step.type === "ban") {
      const c = document.getElementById(`bans-${step.team}`);
      if (!c) continue;
      slot = Array.from(c.querySelectorAll(".ban-slot")).find(s => !s.querySelector("img"));
      if (slot) slot.classList.add("filled");
    } else {
      const c = document.getElementById(`picks-${step.team}`);
      if (!c) continue;
      slot = Array.from(c.querySelectorAll(".slot")).find(s => !s.querySelector("img"));
    }
    if (!slot) continue;

    const gImg = state.allImages.find(img => img.dataset.file === pick.file);
    if (gImg) {
      slot.innerHTML = "";
      const clone = gImg.cloneNode(true);
      clone.style.cssText = "";
      slot.appendChild(clone);
      gImg.classList.add("used");
    }
    state.currentStep = i + 1;
  }
  import("./ui.js").then(({ updateTurn, highlightCurrentSlot }) => {
    updateTurn();
    highlightCurrentSlot();
  });
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function _registerOfflineHook(roomId, role) {
  // Use a named function so we don't stack duplicate listeners
  window.addEventListener("beforeunload", () =>
    navigator.sendBeacon(`${DATABASE_URL}/rooms/${roomId}/roles/${role}.json`, JSON.stringify(false)));
}

function _updateOnlineIndicators(data) {
  const indA = document.getElementById("mp-indicator-teamA");
  const indB = document.getElementById("mp-indicator-teamB");
  if (indA) indA.className = `mp-indicator ${data.roles?.teamA ? "online" : "offline"}`;
  if (indB) indB.className = `mp-indicator ${data.roles?.teamB ? "online" : "offline"}`;
}

function _updateRoleIndicators(data) {
  // Update role selector buttons to reflect current server state
  const roles = data.roles || {};
  const btns = document.querySelectorAll(".mp-role-btn");
  btns.forEach(btn => {
    const r = btn.dataset.role;
    const isMine = r === mpState.playerRole;
    const isTaken = (r === "teamA" && roles.teamA && !isMine) ||
                    (r === "teamB" && roles.teamB && !isMine);
    btn.classList.toggle("active", isMine);
    btn.classList.toggle("taken", isTaken && !isMine);
    btn.disabled = isTaken;
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function isMyTurn() {
  if (!mpState.enabled) return true;
  if (mpState.playerRole === "spectator") return false;
  if (state.currentStep >= state.currentDraftOrder.length) return false;
  return state.currentDraftOrder[state.currentStep].team === mpState.playerRole;
}

export function disconnectRoom() {
  if (mpState.sseConnection) { mpState.sseConnection.close(); mpState.sseConnection = null; }
  if (mpState._catchupInterval) { clearInterval(mpState._catchupInterval); mpState._catchupInterval = null; }
  mpState.enabled = false;
  mpState.roomId = null;
  mpState.playerRole = null;
  mpState.isHost = false;
  mpState.localStatus = "idle";
  mpState.spectatorKey = null;
}