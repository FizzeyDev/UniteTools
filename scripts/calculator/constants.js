export const specialHeldItems = {
  "mega-charizard-x": "Charizardite X",
  "mega-charizard-y": "Charizardite Y",
  "mega-lucario": "Lucarionite",
  "mega-gyarados": "Gyaradosite",
  "mewtwo_x": "Mewtwonite X",
  "mewtwo_y": "Mewtwonite Y",
  "zacian": "Rusted Sword"
};

export const mobIds = [
  'regice', 'registeel', 'regirock', 'regieleki', 'regidrago',
  'kyogre', 'groudon', 'rayquaza'
];

export const stackableItems = [
  "Attack Weight", "Sp. Atk Specs", "Aeos Cookie",
  "Accel Bracer", "Drive Lens", "Weakness Policy"
];

// HP communs à Regice / Regirock / Registeel
const HP_REGI_TRIO = [
  { time: "10:00", seconds: 600, hp:  5150 },
  { time:  "9:40", seconds: 580, hp:  6350 },
  { time:  "9:10", seconds: 550, hp:  7550 },
  { time:  "8:40", seconds: 520, hp:  8750 },
  { time:  "8:10", seconds: 490, hp:  9950 },
  { time:  "7:40", seconds: 460, hp: 11150 },
  { time:  "7:10", seconds: 430, hp: 12350 },
  { time:  "6:40", seconds: 400, hp: 13550 },
  { time:  "6:10", seconds: 370, hp: 14750 },
  { time:  "5:40", seconds: 340, hp: 15950 },
  { time:  "5:10", seconds: 310, hp: 17150 },
  { time:  "4:40", seconds: 280, hp: 18350 },
  { time:  "4:10", seconds: 250, hp: 19550 },
  { time:  "3:40", seconds: 220, hp: 20750 },
  { time:  "3:10", seconds: 190, hp: 21950 },
  { time:  "2:40", seconds: 160, hp: 23150 },
  { time:  "2:10", seconds: 130, hp: 24350 },
  { time:  "2:00", seconds: 120, hp: 25550 },
  { time:  "1:40", seconds: 100, hp: 26750 },
  { time:  "1:10", seconds:  70, hp: 27950 },
  { time:  "0:40", seconds:  40, hp: 29150 },
  { time:  "0:10", seconds:  10, hp: 30350 },
];

// Regieleki (Neutral)
const HP_REGIELEKI_NEUTRAL = [
  { time: "10:00", seconds: 600, hp:  5150 },
  { time:  "9:40", seconds: 580, hp:  6350 },
  { time:  "9:10", seconds: 550, hp:  7550 },
  { time:  "8:40", seconds: 520, hp:  8750 },
  { time:  "8:10", seconds: 490, hp:  9950 },
  { time:  "7:40", seconds: 460, hp: 11150 },
  { time:  "7:10", seconds: 430, hp: 12350 },
  { time:  "6:40", seconds: 400, hp: 13550 },
  { time:  "6:10", seconds: 370, hp: 14750 },
  { time:  "5:40", seconds: 340, hp: 15950 },
  { time:  "5:10", seconds: 310, hp: 17150 },
  { time:  "4:40", seconds: 280, hp: 18350 },
  { time:  "4:10", seconds: 250, hp: 19550 },
  { time:  "3:40", seconds: 220, hp: 20750 },
  { time:  "3:10", seconds: 190, hp: 21950 },
  { time:  "2:40", seconds: 160, hp: 23150 },
  { time:  "2:10", seconds: 130, hp: 24350 },
  { time:  "2:00", seconds: 120, hp: 25550 },
  { time:  "1:40", seconds: 100, hp: 26750 },
  { time:  "1:10", seconds:  70, hp: 27950 },
  { time:  "0:40", seconds:  40, hp: 29150 },
  { time:  "0:10", seconds:  10, hp: 30350 },
];

// Regieleki (Soldier / Ally or Enemy)
const HP_REGIELEKI_SOLDIER = [
  { time: "10:00", seconds: 600, hp:  7500 },
  { time:  "9:40", seconds: 580, hp:  8740 },
  { time:  "9:10", seconds: 550, hp:  9980 },
  { time:  "8:40", seconds: 520, hp: 11220 },
  { time:  "8:10", seconds: 490, hp: 12460 },
  { time:  "7:40", seconds: 460, hp: 13700 },
  { time:  "7:10", seconds: 430, hp: 14940 },
  { time:  "6:40", seconds: 400, hp: 16180 },
  { time:  "6:10", seconds: 370, hp: 17420 },
  { time:  "5:40", seconds: 340, hp: 18660 },
  { time:  "5:10", seconds: 310, hp: 19900 },
  { time:  "4:40", seconds: 280, hp: 21140 },
  { time:  "4:10", seconds: 250, hp: 22380 },
  { time:  "3:40", seconds: 220, hp: 23620 },
  { time:  "3:10", seconds: 190, hp: 24860 },
  { time:  "2:40", seconds: 160, hp: 26100 },
  { time:  "2:10", seconds: 130, hp: 27340 },
  { time:  "2:00", seconds: 120, hp: 28580 },
  { time:  "1:40", seconds: 100, hp: 29820 },
  { time:  "1:10", seconds:  70, hp: 31060 },
  { time:  "0:40", seconds:  40, hp: 32300 },
  { time:  "0:10", seconds:  10, hp: 33540 },
];

// Regidrago
const HP_REGIDRAGO = [
  { time: "10:00", seconds: 600, hp:  4290 },
  { time:  "9:40", seconds: 580, hp:  5490 },
  { time:  "9:10", seconds: 550, hp:  6690 },
  { time:  "8:40", seconds: 520, hp:  7890 },
  { time:  "8:10", seconds: 490, hp:  9090 },
  { time:  "7:40", seconds: 460, hp: 10290 },
  { time:  "7:10", seconds: 430, hp: 11490 },
  { time:  "6:40", seconds: 400, hp: 12690 },
  { time:  "6:10", seconds: 370, hp: 13890 },
  { time:  "5:40", seconds: 340, hp: 15090 },
  { time:  "5:10", seconds: 310, hp: 16290 },
  { time:  "4:40", seconds: 280, hp: 17490 },
  { time:  "4:10", seconds: 250, hp: 18690 },
  { time:  "3:40", seconds: 220, hp: 19890 },
  { time:  "3:10", seconds: 190, hp: 21090 },
  { time:  "2:40", seconds: 160, hp: 22290 },
  { time:  "2:10", seconds: 130, hp: 23490 },
  { time:  "2:00", seconds: 120, hp: 23490 },
  { time:  "1:40", seconds: 100, hp: 24690 },
  { time:  "1:10", seconds:  70, hp: 25890 },
  { time:  "0:40", seconds:  40, hp: 27090 },
  { time:  "0:10", seconds:  10, hp: 28290 },
];

// Groudon / Kyogre / Rayquaza (HP identiques)
const HP_LEGENDARIES = [
  { time: "10:00", seconds: 600, hp:  8490 },
  { time:  "9:40", seconds: 580, hp: 10022 },
  { time:  "9:10", seconds: 550, hp: 11554 },
  { time:  "8:40", seconds: 520, hp: 13086 },
  { time:  "8:10", seconds: 490, hp: 14618 },
  { time:  "7:40", seconds: 460, hp: 16150 },
  { time:  "7:10", seconds: 430, hp: 17682 },
  { time:  "6:40", seconds: 400, hp: 19214 },
  { time:  "6:10", seconds: 370, hp: 20746 },
  { time:  "5:40", seconds: 340, hp: 22278 },
  { time:  "5:10", seconds: 310, hp: 23810 },
  { time:  "4:40", seconds: 280, hp: 25342 },
  { time:  "4:10", seconds: 250, hp: 26874 },
  { time:  "3:40", seconds: 220, hp: 28406 },
  { time:  "3:10", seconds: 190, hp: 29938 },
  { time:  "2:40", seconds: 160, hp: 31470 },
  { time:  "2:10", seconds: 130, hp: 33002 },
  { time:  "2:00", seconds: 120, hp: 33002 },
  { time:  "1:40", seconds: 100, hp: 34534 },
  { time:  "1:10", seconds:  70, hp: 36066 },
  { time:  "0:40", seconds:  40, hp: 37598 },
  { time:  "0:10", seconds:  10, hp: 39130 },
];

/**
 * Retourne les HP fixes pour un mob timer-based donné un temps restant en secondes.
 * Les HP sont fixes par palier — pas d'interpolation.
 * @param {Array} table  - table HP du mob
 * @param {number} secs  - secondes restantes (0-600)
 */
export function getMobHPAtTimer(table, secs) {
  const s = Math.max(0, Math.min(600, secs));

  // La table est triée décroissante (600 → 10).
  // On parcourt à l'envers pour trouver le premier palier dont seconds >= s
  // (le palier le plus bas qui est encore >= au timer actuel).
  // Ex: à 7:00 (420s) → palier 7:10 (430s), pas 6:40 (400s).
  for (let i = table.length - 1; i >= 0; i--) {
    if (table[i].seconds >= s) {
      return table[i].hp;
    }
  }

  return table[0].hp;
}

// ─── Mob stats builder ───────────────────────────────────────────

function makeMobStats(def = 250, sp_def = 250) {
  return [{ level: 1, hp: 0, atk: 0, def, sp_atk: 0, sp_def }];
}

export const registeel = {
  pokemonId: "registeel-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/registeel.png",
  displayName: "Registeel",
  category: 'mob',
  timerBased: true,
  hpTable: HP_REGI_TRIO,
  stats: makeMobStats(250, 250),
};

export const regirock = {
  pokemonId: "regirock-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/regirock.png",
  displayName: "Regirock",
  category: 'mob',
  timerBased: true,
  hpTable: HP_REGI_TRIO,
  stats: makeMobStats(250, 250),
};

export const regice = {
  pokemonId: "regice-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/regice.png",
  displayName: "Regice",
  category: 'mob',
  timerBased: true,
  hpTable: HP_REGI_TRIO,
  stats: makeMobStats(250, 250),
};

export const regieleki = {
  pokemonId: "regieleki-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/regieleki.png",
  displayName: "Regieleki (Neutral)",
  category: 'mob',
  timerBased: true,
  hpTable: HP_REGIELEKI_NEUTRAL,
  stats: makeMobStats(250, 250),
};

export const regieleki2 = {
  pokemonId: "regieleki2-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/regieleki.png",
  displayName: "Regieleki (Soldier)",
  category: 'mob',
  timerBased: true,
  hpTable: HP_REGIELEKI_SOLDIER,
  stats: makeMobStats(250, 250),
};

export const regidrago = {
  pokemonId: "regidrago-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/regidrago.png",
  displayName: "Regidrago",
  category: 'mob',
  timerBased: true,
  hpTable: HP_REGIDRAGO,
  stats: makeMobStats(250, 250),
};

export const kyogre = {
  pokemonId: "kyogre-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/kyogre.png",
  displayName: "Kyogre",
  category: 'mob',
  timerBased: true,
  hpTable: HP_LEGENDARIES,
  stats: makeMobStats(250, 250),
};

export const groudon = {
  pokemonId: "groudon-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/groudon.png",
  displayName: "Groudon",
  category: 'mob',
  timerBased: true,
  hpTable: HP_LEGENDARIES,
  stats: makeMobStats(250, 250),
};

export const rayquaza = {
  pokemonId: "rayquaza-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/rayquaza.png",
  displayName: "Rayquaza",
  category: 'mob',
  timerBased: true,
  hpTable: HP_LEGENDARIES,
  stats: makeMobStats(250, 250),
};

export const substituteDoll = {
  pokemonId: "substitute-doll",
  role: "dummy",
  style: "physical",
  image: "assets/pokemon/substitute.png",
  displayName: "Substitute Doll",
  category: 'other',
  stats: Array.from({length: 15}, (_, i) => ({
    level: i + 1,
    hp: 100000,
    atk: 0,
    def: 0,
    sp_atk: 0,
    sp_def: 0
  }))
};

export const customDoll = {
  pokemonId: "custom-doll",
  role: "dummy",
  style: "physical",
  image: "assets/pokemon/clefDoll.png",
  displayName: "Custom Doll",
  category: 'other',
  customStats: {
    hp: 10000,
    def: 100,
    sp_def: 100
  },
  stats: Array.from({length: 15}, (_, i) => ({
    level: i + 1,
    hp: 10000,
    atk: 0,
    def: 100,
    sp_atk: 0,
    sp_def: 100,
    crit: 0
  }))
};