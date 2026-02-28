import { state, fearlessTeamA, fearlessTeamB } from "./state.js";
import { highlightCurrentSlot, updateTurn, findNextBanSlot, findNextPickSlot } from "./ui.js";
import { endDraft } from "./draft.js";

let currentRole = null;
let searchTerm  = "";
const currentLang = localStorage.getItem("lang") || "fr";

function applyFiltersAndSearch() {
  const query = searchTerm.toLowerCase();
  state.allImages.forEach(img => {
    let visible = true;
    if (currentRole !== null) {
      visible = currentRole === "unknown"
        ? !["def","atk","sup","spe","all"].includes(img.dataset.role)
        : img.dataset.role === currentRole;
    }
    if (query) visible = visible && (img.alt || "").toLowerCase().includes(query);
    img.style.display = visible ? "block" : "none";
  });
}

export function renderGallery() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";
  state.allImages = [];

  const roleOrder = { def: 0, atk: 1, sup: 2, spe: 3, all: 4 };

  const sorted = [...state.monsData].sort((a, b) => {
    if (state.currentSort === "name")
      return (a[`name_${currentLang}`] || a.name).localeCompare(b[`name_${currentLang}`] || b.name);
    if (state.currentSort === "role") {
      const ra = roleOrder[a.role] ?? 99;
      const rb = roleOrder[b.role] ?? 99;
      return ra !== rb ? ra - rb : a.dex - b.dex;
    }
    return a.dex - b.dex;
  });

  sorted.forEach(mon => {
    const img = document.createElement("img");
    img.src = `assets/pokemon/${mon.file}`;
    img.alt = mon[`name_${currentLang}`] || mon.name;
    img.dataset.file = mon.file;
    img.dataset.role = mon.role;
    img.addEventListener("click", () => onPokemonClick(img));
    gallery.appendChild(img);
    state.allImages.push(img);
  });

  applyFiltersAndSearch();
}

function onPokemonClick(img) {
  const myTurn = window._mpIsMyTurn ? window._mpIsMyTurn() : true;
  if (!myTurn) { _showToast(); return; }

  if (
    state.currentStep >= state.currentDraftOrder.length ||
    img.classList.contains("used") ||
    img.classList.contains("fearless-blocked")
  ) return;

  const step = state.currentDraftOrder[state.currentStep];

  let slot;
  if (step.type === "ban") {
    slot = findNextBanSlot(step.team);
    if (slot) slot.classList.add("filled");
  } else {
    slot = findNextPickSlot(step.team);
  }
  if (!slot) return;

  slot.innerHTML = "";
  const clone = img.cloneNode(true);
  clone.style.cssText = "";
  slot.appendChild(clone);
  img.classList.add("used");

  if (state.fearlessMode && step.type === "pick") {
    (step.team === "teamA" ? fearlessTeamA : fearlessTeamB).add(img.dataset.file);
  }

  if (window._mpPublishPick) window._mpPublishPick(state.currentStep, img.dataset.file);

  state.currentStep++;
  updateTurn();
  highlightCurrentSlot();

  if (state.currentStep >= state.currentDraftOrder.length) {
    endDraft();
  } else if (document.getElementById("enable-timer").checked) {
    state.timeLeft = parseInt(document.getElementById("timer-value").value) || 20;
    document.getElementById("bubble-timer").textContent = `${state.timeLeft}s`;
  }
}

function _showToast() {
  const el = document.getElementById("not-your-turn-toast");
  if (!el) return;
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 2000);
}

export function initSortSelect() {
  const sel = document.getElementById("sort-select");
  if (sel) sel.addEventListener("change", e => { state.currentSort = e.target.value; renderGallery(); });
}

export function initFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) {
        btn.classList.remove("active"); currentRole = null;
      } else {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentRole = btn.dataset.role === "unknown" ? "unknown" : btn.dataset.role;
      }
      applyFiltersAndSearch();
    });
  });
}

export function initSearch() {
  const inp = document.getElementById("search-input");
  if (inp) inp.addEventListener("input", e => { searchTerm = e.target.value.trim(); applyFiltersAndSearch(); });
}