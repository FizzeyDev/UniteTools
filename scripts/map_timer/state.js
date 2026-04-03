export const state = {
  currentMap: "groudon",
  totalTime: 600,
  currentTime: 600,
  timerRunning: false,
  timerInterval: null,
  spawns: [],
  towers: [],

  mapScale: 1,

  midState: {
    nextSpawnTime: 480,
    active: null,
    pending: null,
  },

  altariaState: {
    bot: { sequenceKey: null, seqIndex: -1, pending: null, active: null },
    top: { sequenceKey: null, seqIndex: -1, pending: null, active: null },
    center: { pending: null, active: null },
  },
};