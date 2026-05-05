const LEVEL_XP_TABLE = [
  0,
  100,
  200,
  600,
  1100,
  1750,
  2400,
  3150,
  4020,
  5100,
  6390,
  7940,
  9800,
  12030,
  14700,
];

const LEVEL_UP_XP = [
  100,
  100,
  400,
  500,
  650,
  650,
  750,
  870,
  1080,
  1290,
  1550,
  1860,
  2230,
  2670,
  Infinity,
];

// Base XP granted per level when KO-ing an enemy player (level 1–15)
const KO_BASE_XP = [20, 60, 100, 140, 180, 220, 260, 300, 360, 420, 480, 540, 600, 700, 800];

// ─── Catch-Up Modifier ───────────────────────────────────────────────────────
// Applied when the opposing team's highest-level Pokémon is higher than yours.
// levelsAhead = opponentMaxLevel - yourLevel
// Does NOT affect Stored Exp conversion — only Base Exp received.
const CATCH_UP_TABLE = [
  // { levelsAhead, multiplier }
  { levelsAhead: 2, multiplier: 1.20 },
  { levelsAhead: 3, multiplier: 1.30 },
  { levelsAhead: 4, multiplier: 1.50 },
  { levelsAhead: 5, multiplier: 1.60 },
  { levelsAhead: 6, multiplier: 1.60 },
  { levelsAhead: 7, multiplier: 1.80 },
];

/**
 * Returns the Catch-Up multiplier (e.g. 1.2) for a given level difference.
 * Returns 1.0 if no modifier applies (levelsAhead <= 1).
 * @param {number} myLevel
 * @param {number} opponentHighestLevel
 */
function getCatchUpModifier(myLevel, opponentHighestLevel) {
  const levelsAhead = opponentHighestLevel - myLevel;
  if (levelsAhead <= 1) return 1.0;
  const capped = Math.min(levelsAhead, 7);
  const entry = CATCH_UP_TABLE.find(e => e.levelsAhead === capped);
  return entry ? entry.multiplier : 1.80; // cap at 7+
}

// ─── Streak Modifier ─────────────────────────────────────────────────────────
// Applied to base kill XP granted when a player is KO'd.
// streakNumber: negative = death streak, positive = kill streak
// Reset to 0 when streak breaks, then incremented/decremented.
const STREAK_TABLE = [
  { streak: -3, multiplier: 0.60 },
  { streak: -2, multiplier: 0.80 },
  { streak: -1, multiplier: 0.90 },
  { streak:  0, multiplier: 1.00 },
  { streak:  1, multiplier: 1.10 },
  { streak:  2, multiplier: 1.30 },
  { streak:  3, multiplier: 1.50 },
];

/**
 * Returns the streak multiplier for a given streak number.
 * Clamped between -3 and +3.
 * @param {number} streakNumber
 */
function getStreakModifier(streakNumber) {
  const clamped = Math.max(-3, Math.min(3, streakNumber));
  const entry = STREAK_TABLE.find(e => e.streak === clamped);
  return entry ? entry.multiplier : 1.0;
}

// ─── KO Level Difference Modifier ────────────────────────────────────────────
// Applied when the KO'd player is higher level than you.
// levelsAbove = victimLevel - killerLevel
/**
 * Returns the level-difference multiplier for a player KO.
 * @param {number} killerLevel
 * @param {number} victimLevel
 */
function getKOLevelDiffModifier(killerLevel, victimLevel) {
  const diff = victimLevel - killerLevel;
  if (diff >= 2) return 1.50;
  if (diff === 1) return 1.20;
  return 1.00;
}

/**
 * Calculates the full XP gained from KO-ing an enemy player.
 *
 * Formula: Math.floor(KO_BASE_XP[victimLevel-1] * streakMult * levelDiffMult)
 * Then apply catchUpMult to the result if applicable.
 *
 * Note: Whether Catch-Up modifier applies to Player KO XP is unconfirmed.
 * This function accepts a `applyCatchUp` boolean flag (default false).
 *
 * @param {number} victimLevel        - Level of the KO'd player (1–15)
 * @param {number} streakNumber       - Streak number of the KO'd player
 * @param {number} killerLevel        - Level of the killer (for level diff)
 * @param {number} myLevel            - Your level (for catch-up)
 * @param {number} opponentHighestLevel - Opponent team's highest level
 * @param {boolean} isAssist          - If true, XP is split (assist = 50%)
 * @param {boolean} applyCatchUp      - Whether to apply catch-up modifier (unconfirmed)
 */
function calculatePlayerKOXP({
  victimLevel,
  streakNumber,
  killerLevel,
  myLevel,
  opponentHighestLevel,
  isAssist = false,
  applyCatchUp = false,
}) {
  const baseXP = KO_BASE_XP[Math.min(victimLevel - 1, 14)];
  const streakMult = getStreakModifier(streakNumber);
  const levelDiffMult = getKOLevelDiffModifier(killerLevel, victimLevel);

  let xp = Math.floor(baseXP * streakMult * levelDiffMult);

  if (isAssist) {
    // Assists receive a portion; typically treated as ~50% share (unconfirmed exact split)
    xp = Math.floor(xp * 0.5);
  }

  if (applyCatchUp) {
    const catchUpMult = getCatchUpModifier(myLevel, opponentHighestLevel);
    xp = Math.floor(xp * catchUpMult);
  }

  return xp;
}

const WILD_DATA = {
  groudon: [
    {
      id: "bunnelby_start",
      name: "Bunnelby (Start)",
      img: "assets/farms/bunnelby.png",
      aeosBalls: 2,
      data: [
        { timer: "10:00", xp: 70 }, { timer: "9:40", xp: 70 }, { timer: "9:10", xp: 70 },
        { timer: "8:40", xp: 70 }, { timer: "8:10", xp: 70 }, { timer: "7:40", xp: 70 },
        { timer: "7:10", xp: 70 }, { timer: "6:40", xp: 70 }, { timer: "6:10", xp: 70 },
        { timer: "5:40", xp: 70 }, { timer: "5:10", xp: 70 }, { timer: "4:40", xp: 70 },
        { timer: "4:10", xp: 70 }, { timer: "3:40", xp: 70 }, { timer: "3:10", xp: 70 },
        { timer: "2:40", xp: 70 }, { timer: "2:10", xp: 70 }, { timer: "2:00", xp: 70 },
        { timer: "1:40", xp: 70 }, { timer: "1:10", xp: 70 }, { timer: "0:40", xp: 70 },
        { timer: "0:10", xp: 70 },
      ]
    },
    {
      id: "xatu",
      name: "Xatu",
      img: "assets/farms/xatu.png",
      aeosBalls: 2,
      data: [
        { timer: "10:00", xp: 250 }, { timer: "9:40", xp: 250 }, { timer: "9:10", xp: 250 },
        { timer: "8:40", xp: 250 }, { timer: "8:10", xp: 250 }, { timer: "7:40", xp: 250 },
        { timer: "7:10", xp: 250 }, { timer: "6:40", xp: 250 }, { timer: "6:10", xp: 250 },
        { timer: "5:40", xp: 250 }, { timer: "5:10", xp: 250 }, { timer: "4:40", xp: 250 },
        { timer: "4:10", xp: 250 }, { timer: "3:40", xp: 250 }, { timer: "3:10", xp: 250 },
        { timer: "2:40", xp: 250 }, { timer: "2:10", xp: 250 }, { timer: "2:00", xp: 250 },
        { timer: "1:40", xp: 250 }, { timer: "1:10", xp: 250 }, { timer: "0:40", xp: 250 },
        { timer: "0:10", xp: 250 },
      ]
    },
    {
      id: "natu",
      name: "Natu",
      img: "assets/farms/natu.png",
      aeosBalls: 0,
      data: [
        { timer: "10:00", xp: 60 }, { timer: "9:40", xp: 60 }, { timer: "9:10", xp: 60 },
        { timer: "8:40", xp: 67 }, { timer: "8:10", xp: 67 }, { timer: "7:40", xp: 74 },
        { timer: "7:10", xp: 74 }, { timer: "6:40", xp: 74 }, { timer: "6:10", xp: 81 },
        { timer: "5:40", xp: 81 }, { timer: "5:10", xp: 81 }, { timer: "4:40", xp: 88 },
        { timer: "4:10", xp: 88 }, { timer: "3:40", xp: 95 }, { timer: "3:10", xp: 102 },
        { timer: "2:40", xp: 109 }, { timer: "2:10", xp: 116 }, { timer: "2:00", xp: 116 },
        { timer: "1:40", xp: 123 }, { timer: "1:10", xp: 130 }, { timer: "0:40", xp: 137 },
        { timer: "0:10", xp: 137 },
      ]
    },
    {
      id: "bunnelby",
      name: "Bunnelby",
      img: "assets/farms/bunnelby.png",
      aeosBalls: 7,
      data: [
        { timer: "10:00", xp: 120 }, { timer: "9:40", xp: 120 }, { timer: "9:10", xp: 130 },
        { timer: "8:40", xp: 140 }, { timer: "8:10", xp: 150 }, { timer: "7:40", xp: 160 },
        { timer: "7:10", xp: 160 }, { timer: "6:40", xp: 170 }, { timer: "6:10", xp: 180 },
        { timer: "5:40", xp: 190 }, { timer: "5:10", xp: 200 }, { timer: "4:40", xp: 200 },
        { timer: "4:10", xp: 210 }, { timer: "3:40", xp: 220 }, { timer: "3:10", xp: 240 },
        { timer: "2:40", xp: 260 }, { timer: "2:10", xp: 280 }, { timer: "2:00", xp: 280 },
        { timer: "1:40", xp: 310 }, { timer: "1:10", xp: 330 }, { timer: "0:40", xp: 340 },
        { timer: "0:10", xp: 350 },
      ]
    },
    {
      id: "baltoy_jungle",
      name: "Baltoy (Jungle)",
      img: "assets/farms/baltoy.png",
      aeosBalls: 2,
      data: [
        { timer: "10:00", xp: 160 }, { timer: "9:40", xp: 160 }, { timer: "9:10", xp: 170 },
        { timer: "8:40", xp: 170 }, { timer: "8:10", xp: 180 }, { timer: "7:40", xp: 190 },
        { timer: "7:10", xp: 190 }, { timer: "6:40", xp: 200 }, { timer: "6:10", xp: 200 },
        { timer: "5:40", xp: 210 }, { timer: "5:10", xp: 220 }, { timer: "4:40", xp: 220 },
        { timer: "4:10", xp: 230 }, { timer: "3:40", xp: 230 }, { timer: "3:10", xp: 250 },
        { timer: "2:40", xp: 270 }, { timer: "2:10", xp: 280 }, { timer: "2:00", xp: 280 },
        { timer: "1:40", xp: 300 }, { timer: "1:10", xp: 320 }, { timer: "0:40", xp: 330 },
        { timer: "0:10", xp: 330 },
      ]
    },
    {
      id: "baltoy_center",
      name: "Baltoy (Center)",
      img: "assets/farms/baltoy.png",
      aeosBalls: 2,
      data: [
        { timer: "10:00", xp: 60 }, { timer: "9:40", xp: 60 }, { timer: "9:10", xp: 70 },
        { timer: "8:40", xp: 70 }, { timer: "8:10", xp: 80 }, { timer: "7:40", xp: 90 },
        { timer: "7:10", xp: 90 }, { timer: "6:40", xp: 100 }, { timer: "6:10", xp: 100 },
        { timer: "5:40", xp: 110 }, { timer: "5:10", xp: 120 }, { timer: "4:40", xp: 120 },
        { timer: "4:10", xp: 130 }, { timer: "3:40", xp: 130 }, { timer: "3:10", xp: 150 },
        { timer: "2:40", xp: 170 }, { timer: "2:10", xp: 180 }, { timer: "2:00", xp: 180 },
        { timer: "1:40", xp: 200 }, { timer: "1:10", xp: 220 }, { timer: "0:40", xp: 230 },
        { timer: "0:10", xp: 230 },
      ]
    },
    {
      id: "baltoy_lane",
      name: "Baltoy (Lane)",
      img: "assets/farms/baltoy.png",
      aeosBalls: 2,
      data: [
        { timer: "10:00", xp: 60 }, { timer: "9:40", xp: 60 }, { timer: "9:10", xp: 70 },
        { timer: "8:40", xp: 70 }, { timer: "8:10", xp: 80 }, { timer: "7:40", xp: 90 },
        { timer: "7:10", xp: 90 }, { timer: "6:40", xp: 100 }, { timer: "6:10", xp: 100 },
        { timer: "5:40", xp: 110 }, { timer: "5:10", xp: 120 }, { timer: "4:40", xp: 120 },
        { timer: "4:10", xp: 130 }, { timer: "3:40", xp: 130 }, { timer: "3:10", xp: 150 },
        { timer: "2:40", xp: 170 }, { timer: "2:10", xp: 180 }, { timer: "2:00", xp: 180 },
        { timer: "1:40", xp: 200 }, { timer: "1:10", xp: 220 }, { timer: "0:40", xp: 230 },
        { timer: "0:10", xp: 230 },
      ]
    },
    {
      id: "indeedee",
      name: "Indeedee",
      img: "assets/farms/indeedee.png",
      aeosBalls: 0,
      data: [
        { timer: "10:00", xp: 160 }, { timer: "9:40", xp: 160 }, { timer: "9:10", xp: 170 },
        { timer: "8:40", xp: 180 }, { timer: "8:10", xp: 190 }, { timer: "7:40", xp: 200 },
        { timer: "7:10", xp: 200 }, { timer: "6:40", xp: 210 }, { timer: "6:10", xp: 220 },
        { timer: "5:40", xp: 230 }, { timer: "5:10", xp: 230 }, { timer: "4:40", xp: 240 },
        { timer: "4:10", xp: 250 }, { timer: "3:40", xp: 260 }, { timer: "3:10", xp: 280 },
        { timer: "2:40", xp: 300 }, { timer: "2:10", xp: 320 }, { timer: "2:00", xp: 320 },
        { timer: "1:40", xp: 350 }, { timer: "1:10", xp: 370 }, { timer: "0:40", xp: 380 },
        { timer: "0:10", xp: 390 },
      ]
    },
    {
      id: "swablu",
      name: "Swablu",
      img: "assets/farms/swablu.png",
      aeosBalls: 3,
      data: [
        { timer: "10:00", xp: 80 }, { timer: "9:40", xp: 80 }, { timer: "9:10", xp: 80 },
        { timer: "8:40", xp: 87 }, { timer: "8:10", xp: 87 }, { timer: "7:40", xp: 94 },
        { timer: "7:10", xp: 94 }, { timer: "6:40", xp: 94 }, { timer: "6:10", xp: 101 },
        { timer: "5:40", xp: 101 }, { timer: "5:10", xp: 101 }, { timer: "4:40", xp: 108 },
        { timer: "4:10", xp: 108 }, { timer: "3:40", xp: 115 }, { timer: "3:10", xp: 122 },
        { timer: "2:40", xp: 129 }, { timer: "2:10", xp: 136 }, { timer: "2:00", xp: 136 },
        { timer: "1:40", xp: 143 }, { timer: "1:10", xp: 150 }, { timer: "0:40", xp: 157 },
        { timer: "0:10", xp: 157 },
      ]
    },
    {
      id: "altaria",
      name: "Altaria",
      img: "assets/farms/altaria.png",
      aeosBalls: 6,
      data: [
        { timer: "10:00", xp: 190 }, { timer: "9:40", xp: 200 }, { timer: "9:10", xp: 210 },
        { timer: "8:40", xp: 220 }, { timer: "8:10", xp: 230 }, { timer: "7:40", xp: 230 },
        { timer: "7:10", xp: 240 }, { timer: "6:40", xp: 250 }, { timer: "6:10", xp: 260 },
        { timer: "5:40", xp: 270 }, { timer: "5:10", xp: 280 }, { timer: "4:40", xp: 290 },
        { timer: "4:10", xp: 300 }, { timer: "3:40", xp: 310 }, { timer: "3:10", xp: 340 },
        { timer: "2:40", xp: 360 }, { timer: "2:10", xp: 390 }, { timer: "2:00", xp: 390 },
        { timer: "1:40", xp: 420 }, { timer: "1:10", xp: 450 }, { timer: "0:40", xp: 460 },
        { timer: "0:10", xp: 470 },
      ]
    },
    {
      id: "escavalier",
      name: "Escavalier",
      img: "assets/farms/escavalier.png",
      aeosBalls: 7,
      data: [
        { timer: "10:00", xp: 190 }, { timer: "9:40", xp: 200 }, { timer: "9:10", xp: 210 },
        { timer: "8:40", xp: 220 }, { timer: "8:10", xp: 230 }, { timer: "7:40", xp: 240 },
        { timer: "7:10", xp: 250 }, { timer: "6:40", xp: 260 }, { timer: "6:10", xp: 270 },
        { timer: "5:40", xp: 280 }, { timer: "5:10", xp: 300 }, { timer: "4:40", xp: 300 },
        { timer: "4:10", xp: 310 }, { timer: "3:40", xp: 320 }, { timer: "3:10", xp: 330 },
        { timer: "2:40", xp: 340 }, { timer: "2:10", xp: 350 }, { timer: "2:00", xp: 350 },
        { timer: "1:40", xp: 360 }, { timer: "1:10", xp: 370 }, { timer: "0:40", xp: 380 },
        { timer: "0:10", xp: 390 },
      ]
    },
    {
      id: "accelgor",
      name: "Accelgor",
      img: "assets/farms/accelgor.png",
      aeosBalls: 7,
      data: [
        { timer: "10:00", xp: 190 }, { timer: "9:40", xp: 200 }, { timer: "9:10", xp: 210 },
        { timer: "8:40", xp: 220 }, { timer: "8:10", xp: 230 }, { timer: "7:40", xp: 240 },
        { timer: "7:10", xp: 250 }, { timer: "6:40", xp: 260 }, { timer: "6:10", xp: 270 },
        { timer: "5:40", xp: 280 }, { timer: "5:10", xp: 290 }, { timer: "4:40", xp: 300 },
        { timer: "4:10", xp: 310 }, { timer: "3:40", xp: 320 }, { timer: "3:10", xp: 330 },
        { timer: "2:40", xp: 340 }, { timer: "2:10", xp: 350 }, { timer: "2:00", xp: 350 },
        { timer: "1:40", xp: 360 }, { timer: "1:10", xp: 370 }, { timer: "0:40", xp: 380 },
        { timer: "0:10", xp: 390 },
      ]
    },
    {
      id: "regieleki",
      name: "Regieleki",
      img: "assets/farms/regieleki.png",
      aeosBalls: 20,
      info: "Spawns at 7:00 in top lane. Respawns 2 min after KO. On KO: spawns a Soldier Regieleki allied to your team. Auto Attack does 200% Atk with 2s cooldown (ranged). Move 1: 300% Atk 8s CD · Move 2: 250% Atk 8s CD.",
      data: [
        { timer: "7:00", xp: 240 }, { timer: "6:40", xp: 330 }, { timer: "6:10", xp: 340 },
        { timer: "5:40", xp: 350 }, { timer: "5:10", xp: 370 }, { timer: "4:40", xp: 380 },
        { timer: "4:10", xp: 390 }, { timer: "3:40", xp: 400 }, { timer: "3:10", xp: 440 },
        { timer: "2:40", xp: 470 }, { timer: "2:10", xp: 510 }, { timer: "2:00", xp: 510 },
        { timer: "1:40", xp: 540 }, { timer: "1:10", xp: 580 }, { timer: "0:40", xp: 600 },
        { timer: "0:10", xp: 610 },
      ]
    },
    {
      id: "regidrago",
      name: "Regidrago",
      img: "assets/farms/regidrago.png",
      aeosBalls: 20,
      data: [
        { timer: "8:00", xp: 96 }, { timer: "7:40", xp: 108 }, { timer: "7:10", xp: 114 },
        { timer: "6:40", xp: 120 }, { timer: "6:10", xp: 126 }, { timer: "5:40", xp: 132 },
        { timer: "5:10", xp: 138 }, { timer: "4:40", xp: 144 }, { timer: "4:10", xp: 150 },
        { timer: "3:40", xp: 162 }, { timer: "3:10", xp: 174 }, { timer: "2:40", xp: 186 },
        { timer: "2:10", xp: 198 }, { timer: "2:00", xp: 198 }, { timer: "1:40", xp: 210 },
        { timer: "1:10", xp: 222 }, { timer: "0:40", xp: 234 }, { timer: "0:10", xp: 246 },
      ]
    },
    {
      id: "groudon_boss",
      name: "Groudon",
      img: "assets/farms/groudon.png",
      aeosBalls: 30,
      info: "Spawns at 2:00 in center. Does NOT respawn. On Last Hit: grants a powerful buff to your team. Shares XP to whole team (last hitter gets normal amount, others get 60%). Auto Attack does 200% Atk with 2s cooldown.",
      data: [
        { timer: "2:00", xp: 1092 }, { timer: "1:40", xp: 1170 }, { timer: "1:10", xp: 1254 },
        { timer: "0:40", xp: 1284 }, { timer: "0:10", xp: 1320 },
      ]
    },
    {
      id: "regice",
      name: "Regice / Regirock / Registeel",
      img: "assets/farms/regice.png",
      aeosBalls: 20,
      info: "Spawns at 7:00 in bot lane. Respawns 2 min after KO. On Last Hit — Regirock: +30% DEF & +25% SPDEF. Registeel: +15% ATK & +15% SPATK. Regice: 5% max HP heal every 3s + 8% HP shield 30s. Shares XP to whole team (last hitter gets normal amount, others get 60%). Auto Attack does 100% Atk with 2s cooldown.",
      data: [
        { timer: "7:00", xp: 240 }, { timer: "6:40", xp: 330 }, { timer: "6:10", xp: 340 },
        { timer: "5:40", xp: 350 }, { timer: "5:10", xp: 370 }, { timer: "4:40", xp: 380 },
        { timer: "4:10", xp: 390 }, { timer: "3:40", xp: 400 }, { timer: "3:10", xp: 440 },
        { timer: "2:40", xp: 470 }, { timer: "2:10", xp: 510 }, { timer: "2:00", xp: 510 },
        { timer: "1:40", xp: 540 }, { timer: "1:10", xp: 580 }, { timer: "0:40", xp: 600 },
        { timer: "0:10", xp: 610 },
      ]
    },
  ],

  kyogre: [
    {
      id: "bunnelby",
      name: "Bunnelby",
      img: "assets/farms/bunnelby.png",
      aeosBalls: 7,
      data: [
        { timer: "10:00", xp: 120 }, { timer: "9:40", xp: 120 }, { timer: "9:10", xp: 130 },
        { timer: "8:40", xp: 140 }, { timer: "8:10", xp: 150 }, { timer: "7:40", xp: 160 },
        { timer: "7:10", xp: 160 }, { timer: "6:40", xp: 170 }, { timer: "6:10", xp: 180 },
        { timer: "5:40", xp: 190 }, { timer: "5:10", xp: 200 }, { timer: "4:40", xp: 200 },
        { timer: "4:10", xp: 210 }, { timer: "3:40", xp: 220 }, { timer: "3:10", xp: 240 },
        { timer: "2:40", xp: 260 }, { timer: "2:10", xp: 280 }, { timer: "2:00", xp: 280 },
        { timer: "1:40", xp: 310 }, { timer: "1:10", xp: 330 }, { timer: "0:40", xp: 340 },
        { timer: "0:10", xp: 350 },
      ]
    },
    {
      id: "natu",
      name: "Natu",
      img: "assets/farms/natu.png",
      aeosBalls: 0,
      data: [
        { timer: "10:00", xp: 60 }, { timer: "9:40", xp: 60 }, { timer: "9:10", xp: 60 },
        { timer: "8:40", xp: 67 }, { timer: "8:10", xp: 67 }, { timer: "7:40", xp: 74 },
        { timer: "7:10", xp: 74 }, { timer: "6:40", xp: 74 }, { timer: "6:10", xp: 81 },
        { timer: "5:40", xp: 81 }, { timer: "5:10", xp: 81 }, { timer: "4:40", xp: 88 },
        { timer: "4:10", xp: 88 }, { timer: "3:40", xp: 95 }, { timer: "3:10", xp: 102 },
        { timer: "2:40", xp: 109 }, { timer: "2:10", xp: 116 }, { timer: "2:00", xp: 116 },
        { timer: "1:40", xp: 123 }, { timer: "1:10", xp: 130 }, { timer: "0:40", xp: 137 },
        { timer: "0:10", xp: 137 },
      ]
    },
    {
      id: "xatu",
      name: "Xatu",
      img: "assets/farms/xatu.png",
      aeosBalls: 2,
      data: [
        { timer: "10:00", xp: 250 }, { timer: "9:40", xp: 250 }, { timer: "9:10", xp: 250 },
        { timer: "8:40", xp: 250 }, { timer: "8:10", xp: 250 }, { timer: "7:40", xp: 250 },
        { timer: "7:10", xp: 250 }, { timer: "6:40", xp: 250 }, { timer: "6:10", xp: 250 },
        { timer: "5:40", xp: 250 }, { timer: "5:10", xp: 250 }, { timer: "4:40", xp: 250 },
        { timer: "4:10", xp: 250 }, { timer: "3:40", xp: 250 }, { timer: "3:10", xp: 250 },
        { timer: "2:40", xp: 250 }, { timer: "2:10", xp: 250 }, { timer: "2:00", xp: 250 },
        { timer: "1:40", xp: 250 }, { timer: "1:10", xp: 250 }, { timer: "0:40", xp: 250 },
        { timer: "0:10", xp: 250 },
      ]
    },
    {
      id: "kyogre_boss",
      name: "Kyogre",
      img: "assets/farms/kyogre.png",
      aeosBalls: 30,
      info: "Spawns at 2:00 in center. Does NOT respawn. On Last Hit: grants a powerful buff to your team. Same XP as Groudon. Shares XP to whole team (last hitter gets normal amount, others get 60%).",
      data: [
        { timer: "2:00", xp: 1092 }, { timer: "1:40", xp: 1170 }, { timer: "1:10", xp: 1254 },
        { timer: "0:40", xp: 1284 }, { timer: "0:10", xp: 1320 },
      ]
    },
    {
      id: "regieleki",
      name: "Regieleki",
      img: "assets/farms/regieleki.png",
      aeosBalls: 20,
      data: [
        { timer: "7:00", xp: 240 }, { timer: "6:40", xp: 330 }, { timer: "6:10", xp: 340 },
        { timer: "5:40", xp: 350 }, { timer: "5:10", xp: 370 }, { timer: "4:40", xp: 380 },
        { timer: "4:10", xp: 390 }, { timer: "3:40", xp: 400 }, { timer: "3:10", xp: 440 },
        { timer: "2:40", xp: 470 }, { timer: "2:10", xp: 510 }, { timer: "2:00", xp: 510 },
        { timer: "1:40", xp: 540 }, { timer: "1:10", xp: 580 }, { timer: "0:40", xp: 600 },
        { timer: "0:10", xp: 610 },
      ]
    },
  ],

  rayquaza: [
    {
      id: "bunnelby",
      name: "Bunnelby",
      img: "assets/farms/bunnelby.png",
      aeosBalls: 7,
      data: [
        { timer: "10:00", xp: 120 }, { timer: "9:40", xp: 120 }, { timer: "9:10", xp: 130 },
        { timer: "8:40", xp: 140 }, { timer: "8:10", xp: 150 }, { timer: "7:40", xp: 160 },
        { timer: "7:10", xp: 160 }, { timer: "6:40", xp: 170 }, { timer: "6:10", xp: 180 },
        { timer: "5:40", xp: 190 }, { timer: "5:10", xp: 200 }, { timer: "4:40", xp: 200 },
        { timer: "4:10", xp: 210 }, { timer: "3:40", xp: 220 }, { timer: "3:10", xp: 240 },
        { timer: "2:40", xp: 260 }, { timer: "2:10", xp: 280 }, { timer: "2:00", xp: 280 },
        { timer: "1:40", xp: 310 }, { timer: "1:10", xp: 330 }, { timer: "0:40", xp: 340 },
        { timer: "0:10", xp: 350 },
      ]
    },
    {
      id: "natu",
      name: "Natu",
      img: "assets/farms/natu.png",
      aeosBalls: 0,
      data: [
        { timer: "10:00", xp: 60 }, { timer: "9:40", xp: 60 }, { timer: "9:10", xp: 60 },
        { timer: "8:40", xp: 67 }, { timer: "8:10", xp: 67 }, { timer: "7:40", xp: 74 },
        { timer: "7:10", xp: 74 }, { timer: "6:40", xp: 74 }, { timer: "6:10", xp: 81 },
        { timer: "5:40", xp: 81 }, { timer: "5:10", xp: 81 }, { timer: "4:40", xp: 88 },
        { timer: "4:10", xp: 88 }, { timer: "3:40", xp: 95 }, { timer: "3:10", xp: 102 },
        { timer: "2:40", xp: 109 }, { timer: "2:10", xp: 116 }, { timer: "2:00", xp: 116 },
        { timer: "1:40", xp: 123 }, { timer: "1:10", xp: 130 }, { timer: "0:40", xp: 137 },
        { timer: "0:10", xp: 137 },
      ]
    },
    {
      id: "regieleki_rq",
      name: "Regieleki",
      img: "assets/farms/regieleki.png",
      aeosBalls: 20,
      info: "Spawns at 7:00 in top lane. Respawns 2 min after KO. On KO: spawns a Soldier Regieleki allied to your team. Auto Attack does 200% Atk with 2s cooldown (ranged). Move 1: 300% Atk 8s CD · Move 2: 250% Atk 8s CD.",
      data: [
        { timer: "7:00", xp: 240 }, { timer: "6:40", xp: 260 }, { timer: "6:10", xp: 270 },
        { timer: "5:40", xp: 280 }, { timer: "5:10", xp: 290 }, { timer: "4:40", xp: 300 },
        { timer: "4:10", xp: 310 }, { timer: "3:40", xp: 320 }, { timer: "3:10", xp: 340 },
        { timer: "2:40", xp: 370 }, { timer: "2:10", xp: 390 }, { timer: "2:00", xp: 390 },
        { timer: "1:40", xp: 420 }, { timer: "1:10", xp: 450 }, { timer: "0:40", xp: 460 },
        { timer: "0:10", xp: 470 },
      ]
    },
    {
      id: "regice_rq",
      name: "Regice/Regirock/Registeel",
      img: "assets/farms/regice.png",
      aeosBalls: 20,
      info: "Spawns at 7:00 in bot lane. Respawns 2 min after KO. On Last Hit — Regirock: +30% DEF & +25% SPDEF. Registeel: +15% ATK & +15% SPATK. Regice: 5% max HP heal every 3s + 8% HP shield 30s. Shares XP to whole team (last hitter gets normal amount, others get 60%). Auto Attack does 100% Atk with 2s cooldown.",
      data: [
        { timer: "7:00", xp: 240 }, { timer: "6:40", xp: 260 }, { timer: "6:10", xp: 270 },
        { timer: "5:40", xp: 280 }, { timer: "5:10", xp: 290 }, { timer: "4:40", xp: 300 },
        { timer: "4:10", xp: 310 }, { timer: "3:40", xp: 320 }, { timer: "3:10", xp: 340 },
        { timer: "2:40", xp: 370 }, { timer: "2:10", xp: 390 }, { timer: "2:00", xp: 390 },
        { timer: "1:40", xp: 420 }, { timer: "1:10", xp: 450 }, { timer: "0:40", xp: 460 },
        { timer: "0:10", xp: 470 },
      ]
    },
    {
      id: "rayquaza_boss",
      name: "Rayquaza",
      img: "assets/farms/rayquaza.png",
      aeosBalls: 30,
      info: "Spawns at 2:00 in center. Does NOT respawn. On Last Hit: shields living teammates, triples goal-scoring speed and scoring uninterruptible while shield active (Strength: 30% HP +3000). Boosts all damage from auto attacks and move 1 vs enemy players by 40% while shield active. Grants 15 Aeos Energy to every ally (last hitter gains 30). Shares XP to whole team (60% to non-last-hitters). Auto Attack does 200% Atk with 1.5s cooldown.",
      data: [
        { timer: "2:00", xp: 1092 }, { timer: "1:40", xp: 1170 }, { timer: "1:10", xp: 1254 },
        { timer: "0:40", xp: 1284 }, { timer: "0:10", xp: 1320 },
      ]
    },
  ],
};

const PLAYER_POKEMON = [
  { name: "Absol", file: "absol_spe.png" },
  { name: "Aegislash", file: "aegislash_all.png" },
  { name: "Alcremie", file: "alcreamie_sup.png" },
  { name: "Armarouge", file: "armarouge_atk.png" },
  { name: "Azumarill", file: "azumarill_all.png" },
  { name: "Blaziken", file: "blaziken_all.png" },
  { name: "Blastoise", file: "blastoise_def.png" },
  { name: "Blissey", file: "blissey_sup.png" },
  { name: "Buzzwole", file: "buzzwole_all.png" },
  { name: "Ceruledge", file: "ceruledge_all.png" },
  { name: "Chandelure", file: "chandelure_atk.png" },
  { name: "Charizard", file: "charizard_all.png" },
  { name: "Cinderace", file: "cinderace_atk.png" },
  { name: "Clefable", file: "clefable_sup.png" },
  { name: "Comfey", file: "comfey_sup.png" },
  { name: "Cramorant", file: "cramorant_atk.png" },
  { name: "Crustle", file: "crustle_def.png" },
  { name: "Darkrai", file: "darkrai_spe.png" },
  { name: "Decidueye", file: "decidueye_atk.png" },
  { name: "Delphox", file: "delphox_atk.png" },
  { name: "Dhelmise", file: "dhelmise_all.png" },
  { name: "Dodrio", file: "dodrio_spe.png" },
  { name: "Dragapult", file: "dragapult_atk.png" },
  { name: "Dragonite", file: "dragonite_all.png" },
  { name: "Duraludon", file: "duraludon_atk.png" },
  { name: "Eldegoss", file: "eldegoss_sup.png" },
  { name: "Empoleon", file: "empoleon_all.png" },
  { name: "Espeon", file: "espeon_atk.png" },
  { name: "Falinks", file: "falinks_all.png" },
  { name: "Garchomp", file: "garchomp_all.png" },
  { name: "Gardevoir", file: "gardevoir_atk.png" },
  { name: "Gengar", file: "gengar_spe.png" },
  { name: "Glaceon", file: "glaceon_atk.png" },
  { name: "Goodra", file: "goodra_def.png" },
  { name: "Greedent", file: "greedent_def.png" },
  { name: "Greninja", file: "greninja_atk.png" },
  { name: "Gyarados", file: "gyarados_all.png" },
  { name: "Ho-Oh", file: "ho-oh_def.png" },
  { name: "Hoopa", file: "hoopa_sup.png" },
  { name: "Inteleon", file: "inteleon_atk.png" },
  { name: "Lapras", file: "lapras_def.png" },
  { name: "Latias", file: "latias_sup.png" },
  { name: "Latios", file: "latios_atk.png" },
  { name: "Leafeon", file: "leafeon_spe.png" },
  { name: "Lucario", file: "lucario_all.png" },
  { name: "Machamp", file: "machamp_all.png" },
  { name: "Mamoswine", file: "mamoswine_def.png" },
  { name: "Mega-Charizard X", file: "mXcharizard_all.png" },
  { name: "Mega-Charizard Y", file: "mYcharizard_all.png" },
  { name: "Mega-Gyarados", file: "mgyarados_all.png" },
  { name: "Mega-Lucario", file: "mlucario_all.png" },
  { name: "Meowscarada", file: "meowscarada_spe.png" },
  { name: "Meowth", file: "meowth_spe.png" },
  { name: "Metagross", file: "metagross_all.png" },
  { name: "Mew", file: "mew_atk.png" },
  { name: "Mewtwo X", file: "mewtwoX_all.png" },
  { name: "Mewtwo Y", file: "mewtwoY_atk.png" },
  { name: "Mimikyu", file: "mimikyu_all.png" },
  { name: "Miraidon", file: "miraidon_atk.png" },
  { name: "Mr. Mime", file: "mr.mime_sup.png" },
  { name: "Moltres", file: "moltres_all.png" },
  { name: "Ninetales", file: "ninetales_atk.png" },
  { name: "Pawmot", file: "pawmot_all.png" },
  { name: "Pikachu", file: "pikachu_atk.png" },
  { name: "Psyduck", file: "psyduck_sup.png" },
  { name: "Raichu", file: "raichu_atk.png" },
  { name: "Rapidash", file: "rapidash_spe.png" },
  { name: "Sableye", file: "sableye_sup.png" },
  { name: "Scizor", file: "scizor_all.png" },
  { name: "Scyther", file: "scyther_spe.png" },
  { name: "Sirfetch'd", file: "sirfetchd_all.png" },
  { name: "Slowbro", file: "slowbro_def.png" },
  { name: "Snorlax", file: "snorlax_def.png" },
  { name: "Suicune", file: "suicune_all.png" },
  { name: "Sylveon", file: "sylveon_atk.png" },
  { name: "Talonflame", file: "talonflame_spe.png" },
  { name: "Tinkaton", file: "tinkaton_all.png" },
  { name: "Trevenant", file: "trevenant_def.png" },
  { name: "Tsareena", file: "tsaarena_all.png" },
  { name: "Typhlosion", file: "typhlosion_atk.png" },
  { name: "Tyranitar", file: "tyranitar_all.png" },
  { name: "Umbreon", file: "umbreon_def.png" },
  { name: "Urshifu", file: "urshifu_all.png" },
  { name: "Vaporeon", file: "vaporeon_def.png" },
  { name: "Venusaur", file: "venusaur_atk.png" },
  { name: "Wigglytuff", file: "wigglytuff_sup.png" },
  { name: "Zapdos", file: "zapdos_atk.png" },
  { name: "Articuno", file: "articuno_def.png" },
  { name: "Zacian", file: "zacian_all.png" },
  { name: "Zeraora", file: "zeraora_spe.png" },
  { name: "Zoroark", file: "zoroark_spe.png" },
];

function getScoringXP(points) {
  if (points <= 1) return 0;
  if (points === 2) return 50;
  return 10 * points + 40;
}

function getPassiveXPPerSec(timerSeconds) {
  return timerSeconds > 480 ? 4 : 6;
}

function getWildXP(wildId, mapId, timerStr) {
  const mapData = WILD_DATA[mapId] || WILD_DATA.groudon;
  const pokemon = mapData.find(p => p.id === wildId);
  if (!pokemon) return 0;

  const exact = pokemon.data.find(d => d.timer === timerStr);
  if (exact) return exact.xp;

  const timerSec = timerToSeconds(timerStr);
  let closest = null;
  let closestDiff = Infinity;
  for (const entry of pokemon.data) {
    const diff = Math.abs(timerToSeconds(entry.timer) - timerSec);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = entry;
    }
  }
  return closest ? closest.xp : 0;
}

function timerToSeconds(str) {
  const [m, s] = str.split(':').map(Number);
  return m * 60 + (s || 0);
}

function secondsToTimer(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getLevelFromXP(totalXP) {
  let level = 1;
  for (let i = 1; i < LEVEL_XP_TABLE.length; i++) {
    if (totalXP >= LEVEL_XP_TABLE[i]) level = i + 1;
    else break;
  }
  return Math.min(level, 15);
}

function getXPInLevel(totalXP) {
  const level = getLevelFromXP(totalXP);
  const levelStartXP = LEVEL_XP_TABLE[level - 1] || 0;
  return totalXP - levelStartXP;
}

function getXPToNextLevel(totalXP) {
  const level = getLevelFromXP(totalXP);
  if (level >= 15) return 0;
  const nextLevelXP = LEVEL_XP_TABLE[level];
  return nextLevelXP - totalXP;
}

function getLevelProgressPct(totalXP) {
  const level = getLevelFromXP(totalXP);
  if (level >= 15) return 100;
  const levelStartXP = LEVEL_XP_TABLE[level - 1] || 0;
  const nextLevelXP = LEVEL_XP_TABLE[level];
  const range = nextLevelXP - levelStartXP;
  const progress = totalXP - levelStartXP;
  return Math.min(100, Math.round((progress / range) * 100));
}

function getStartXPForLevel(level) {
  return LEVEL_XP_TABLE[Math.max(0, level - 1)] || 0;
}

window.XPCalcData = {
  LEVEL_XP_TABLE,
  LEVEL_UP_XP,
  KO_BASE_XP,
  CATCH_UP_TABLE,
  STREAK_TABLE,
  WILD_DATA,
  PLAYER_POKEMON,
  getScoringXP,
  getPassiveXPPerSec,
  getWildXP,
  getCatchUpModifier,
  getStreakModifier,
  getKOLevelDiffModifier,
  calculatePlayerKOXP,
  timerToSeconds,
  secondsToTimer,
  getLevelFromXP,
  getXPInLevel,
  getXPToNextLevel,
  getLevelProgressPct,
  getStartXPForLevel,
};