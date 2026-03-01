import { state } from "./state.js";
import { highlightCurrentSlot } from "./ui.js";
import { endDraft } from "./draft.js";

export function startTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    const bubble = document.getElementById("bubble-timer");
    const cbar   = document.getElementById("cbar-timer");
    if (bubble) bubble.textContent = `${state.timeLeft}s`;
    if (cbar)   cbar.textContent   = `⏱ ${state.timeLeft}s`;

    if (state.timeLeft <= 0) {
      state.currentStep++;
      if (state.currentStep >= state.currentDraftOrder.length) {
        endDraft();
        return;
      }
      state.timeLeft = parseInt(document.getElementById("timer-value").value) || 20;
      if (bubble) bubble.textContent = `${state.timeLeft}s`;
      if (cbar)   cbar.textContent   = `⏱ ${state.timeLeft}s`;
      highlightCurrentSlot();
    }
  }, 1000);
}

export function setupTimer() {
  const timerEnabled = document.getElementById("enable-timer").checked;
  const cbar = document.getElementById("cbar-timer");
  if (timerEnabled) {
    state.timeLeft = parseInt(document.getElementById("timer-value").value) || 20;
    document.getElementById("bubble-timer").textContent = `${state.timeLeft}s`;
    document.getElementById("bubble-timer").style.display = "block";
    if (cbar) { cbar.textContent = `⏱ ${state.timeLeft}s`; cbar.style.display = "inline"; }
    startTimer();
  } else {
    document.getElementById("bubble-timer").style.display = "none";
    if (cbar) cbar.style.display = "none";
  }
}