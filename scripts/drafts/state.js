export const state = {
  langData: {},
  selectedMode: null,
  selectedMap: null,
  fearlessMode: false,
  allStarMode: false,
  currentStep: 0,
  currentDraftOrder: [],
  allImages: [],
  timerInterval: null,
  timeLeft: 20,
  draftCount: 0,
  monsData: [],
  currentSort: "dex",
  currentFilter: "all",
  currentSearch: "",
};

export const fearlessTeamA = new Set();
export const fearlessTeamB = new Set();
// All-Star: tracks picks from BOTH teams across drafts (shared pool)
export const allStarPicked = new Set();