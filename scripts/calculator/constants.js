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
  'kyogre', 'groudon', 'rayquaza',
  'natu', 'bunnelby',
  'baltoy-jungle', 'baltoy-center', 'baltoy-lane',
  'indeedee',
  'swablu', 'altaria',
  'escavalier', 'accelgor'
];

export const stackableItems = [
  "Attack Weight", "Sp. Atk Specs", "Aeos Cookie",
  "Accel Bracer", "Drive Lens", "Weakness Policy"
];

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

export function getMobHPAtTimer(table, secs) {
  const s = Math.max(0, Math.min(600, secs));

  for (let i = table.length - 1; i >= 0; i--) {
    if (table[i].seconds >= s) {
      return table[i].hp;
    }
  }

  return table[0].hp;
}

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
// ── Passive Mobs ─────────────────────────────────────────────────────────────

const HP_NATU = [
  { time: "10:00", seconds: 600, hp:  1110 },
  { time:  "9:40", seconds: 580, hp:  1290 },
  { time:  "9:10", seconds: 550, hp:  1470 },
  { time:  "8:40", seconds: 520, hp:  1650 },
  { time:  "8:10", seconds: 490, hp:  1800 },
  { time:  "7:40", seconds: 460, hp:  1980 },
  { time:  "7:10", seconds: 430, hp:  2160 },
  { time:  "6:40", seconds: 400, hp:  2310 },
  { time:  "6:10", seconds: 370, hp:  2490 },
  { time:  "5:40", seconds: 340, hp:  2670 },
  { time:  "5:10", seconds: 310, hp:  2850 },
  { time:  "4:40", seconds: 280, hp:  3000 },
  { time:  "4:10", seconds: 250, hp:  3180 },
  { time:  "3:40", seconds: 220, hp:  3360 },
  { time:  "3:10", seconds: 190, hp:  3510 },
  { time:  "2:40", seconds: 160, hp:  3690 },
  { time:  "2:10", seconds: 130, hp:  3870 },
  { time:  "2:00", seconds: 120, hp:  3870 },
  { time:  "1:40", seconds: 100, hp:  4050 },
  { time:  "1:10", seconds:  70, hp:  4200 },
  { time:  "0:40", seconds:  40, hp:  4380 },
  { time:  "0:10", seconds:  10, hp:  4530 },
];

const HP_BUNNELBY = [
  { time: "10:00", seconds: 600, hp:  1720 },
  { time:  "9:40", seconds: 580, hp:  1820 },
  { time:  "9:10", seconds: 550, hp:  1930 },
  { time:  "8:40", seconds: 520, hp:  2030 },
  { time:  "8:10", seconds: 490, hp:  2130 },
  { time:  "7:40", seconds: 460, hp:  2240 },
  { time:  "7:10", seconds: 430, hp:  2340 },
  { time:  "6:40", seconds: 400, hp:  2440 },
  { time:  "6:10", seconds: 370, hp:  2550 },
  { time:  "5:40", seconds: 340, hp:  2650 },
  { time:  "5:10", seconds: 310, hp:  2750 },
  { time:  "4:40", seconds: 280, hp:  2860 },
  { time:  "4:10", seconds: 250, hp:  2960 },
  { time:  "3:40", seconds: 220, hp:  3060 },
  { time:  "3:10", seconds: 190, hp:  3170 },
  { time:  "2:40", seconds: 160, hp:  3270 },
  { time:  "2:10", seconds: 130, hp:  3370 },
  { time:  "2:00", seconds: 120, hp:  3370 },
  { time:  "1:40", seconds: 100, hp:  3480 },
  { time:  "1:10", seconds:  70, hp:  3580 },
  { time:  "0:40", seconds:  40, hp:  3680 },
  { time:  "0:10", seconds:  10, hp:  3790 },
];

const HP_BALTOY_JUNGLE = [
  { time: "10:00", seconds: 600, hp:  1380 },
  { time:  "9:40", seconds: 580, hp:  1460 },
  { time:  "9:10", seconds: 550, hp:  1540 },
  { time:  "8:40", seconds: 520, hp:  1630 },
  { time:  "8:10", seconds: 490, hp:  1710 },
  { time:  "7:40", seconds: 460, hp:  1790 },
  { time:  "7:10", seconds: 430, hp:  1870 },
  { time:  "6:40", seconds: 400, hp:  1960 },
  { time:  "6:10", seconds: 370, hp:  2040 },
  { time:  "5:40", seconds: 340, hp:  2120 },
  { time:  "5:10", seconds: 310, hp:  2200 },
  { time:  "4:40", seconds: 280, hp:  2290 },
  { time:  "4:10", seconds: 250, hp:  2370 },
  { time:  "3:40", seconds: 220, hp:  2450 },
  { time:  "3:10", seconds: 190, hp:  2530 },
  { time:  "2:40", seconds: 160, hp:  2620 },
  { time:  "2:10", seconds: 130, hp:  2700 },
  { time:  "2:00", seconds: 120, hp:  2700 },
  { time:  "1:40", seconds: 100, hp:  2780 },
  { time:  "1:10", seconds:  70, hp:  2870 },
  { time:  "0:40", seconds:  40, hp:  2950 },
  { time:  "0:10", seconds:  10, hp:  3030 },
];

const HP_BALTOY_CENTER = [
  { time: "10:00", seconds: 600, hp:  1720 },
  { time:  "9:40", seconds: 580, hp:  1800 },
  { time:  "9:10", seconds: 550, hp:  1880 },
  { time:  "8:40", seconds: 520, hp:  1970 },
  { time:  "8:10", seconds: 490, hp:  2050 },
  { time:  "7:40", seconds: 460, hp:  2130 },
  { time:  "7:10", seconds: 430, hp:  2210 },
  { time:  "6:40", seconds: 400, hp:  2300 },
  { time:  "6:10", seconds: 370, hp:  2380 },
  { time:  "5:40", seconds: 340, hp:  2460 },
  { time:  "5:10", seconds: 310, hp:  2540 },
  { time:  "4:40", seconds: 280, hp:  2630 },
  { time:  "4:10", seconds: 250, hp:  2710 },
  { time:  "3:40", seconds: 220, hp:  2790 },
  { time:  "3:10", seconds: 190, hp:  2870 },
  { time:  "2:40", seconds: 160, hp:  2960 },
  { time:  "2:10", seconds: 130, hp:  3040 },
  { time:  "2:00", seconds: 120, hp:  3040 },
  { time:  "1:40", seconds: 100, hp:  3120 },
  { time:  "1:10", seconds:  70, hp:  3210 },
  { time:  "0:40", seconds:  40, hp:  3290 },
  { time:  "0:10", seconds:  10, hp:  3370 },
];

const HP_BALTOY_LANE = [
  { time: "10:00", seconds: 600, hp:  1380 },
  { time:  "9:40", seconds: 580, hp:  1460 },
  { time:  "9:10", seconds: 550, hp:  1540 },
  { time:  "8:40", seconds: 520, hp:  1630 },
  { time:  "8:10", seconds: 490, hp:  1710 },
  { time:  "7:40", seconds: 460, hp:  1790 },
  { time:  "7:10", seconds: 430, hp:  1870 },
  { time:  "6:40", seconds: 400, hp:  1960 },
  { time:  "6:10", seconds: 370, hp:  2040 },
  { time:  "5:40", seconds: 340, hp:  2120 },
  { time:  "5:10", seconds: 310, hp:  2200 },
  { time:  "4:40", seconds: 280, hp:  2290 },
  { time:  "4:10", seconds: 250, hp:  2370 },
  { time:  "3:40", seconds: 220, hp:  2450 },
  { time:  "3:10", seconds: 190, hp:  2530 },
  { time:  "2:40", seconds: 160, hp:  2620 },
  { time:  "2:10", seconds: 130, hp:  2700 },
  { time:  "2:00", seconds: 120, hp:  2700 },
  { time:  "1:40", seconds: 100, hp:  2780 },
  { time:  "1:10", seconds:  70, hp:  2870 },
  { time:  "0:40", seconds:  40, hp:  2950 },
  { time:  "0:10", seconds:  10, hp:  3030 },
];

const HP_INDEEDEE = [
  { time: "10:00", seconds: 600, hp:  2360 },
  { time:  "9:40", seconds: 580, hp:  2460 },
  { time:  "9:10", seconds: 550, hp:  2570 },
  { time:  "8:40", seconds: 520, hp:  2670 },
  { time:  "8:10", seconds: 490, hp:  2770 },
  { time:  "7:40", seconds: 460, hp:  2880 },
  { time:  "7:10", seconds: 430, hp:  2980 },
  { time:  "6:40", seconds: 400, hp:  3080 },
  { time:  "6:10", seconds: 370, hp:  3190 },
  { time:  "5:40", seconds: 340, hp:  3290 },
  { time:  "5:10", seconds: 310, hp:  3390 },
  { time:  "4:40", seconds: 280, hp:  3500 },
  { time:  "4:10", seconds: 250, hp:  3600 },
  { time:  "3:40", seconds: 220, hp:  3700 },
  { time:  "3:10", seconds: 190, hp:  3810 },
  { time:  "2:40", seconds: 160, hp:  3910 },
  { time:  "2:10", seconds: 130, hp:  4010 },
  { time:  "2:00", seconds: 120, hp:  4010 },
  { time:  "1:40", seconds: 100, hp:  4120 },
  { time:  "1:10", seconds:  70, hp:  4220 },
  { time:  "0:40", seconds:  40, hp:  4320 },
  { time:  "0:10", seconds:  10, hp:  4430 },
];

const HP_SWABLU = [
  { time: "10:00", seconds: 600, hp:  1470 },
  { time:  "9:40", seconds: 580, hp:  1470 },
  { time:  "9:10", seconds: 550, hp:  1470 },
  { time:  "8:40", seconds: 520, hp:  1650 },
  { time:  "8:10", seconds: 490, hp:  1800 },
  { time:  "7:40", seconds: 460, hp:  1980 },
  { time:  "7:10", seconds: 430, hp:  2160 },
  { time:  "6:40", seconds: 400, hp:  2310 },
  { time:  "6:10", seconds: 370, hp:  2490 },
  { time:  "5:40", seconds: 340, hp:  2670 },
  { time:  "5:10", seconds: 310, hp:  2850 },
  { time:  "4:40", seconds: 280, hp:  3000 },
  { time:  "4:10", seconds: 250, hp:  3180 },
  { time:  "3:40", seconds: 220, hp:  3360 },
  { time:  "3:10", seconds: 190, hp:  3510 },
  { time:  "2:40", seconds: 160, hp:  3690 },
  { time:  "2:10", seconds: 130, hp:  3870 },
  { time:  "2:00", seconds: 120, hp:  3870 },
  { time:  "1:40", seconds: 100, hp:  4050 },
  { time:  "1:10", seconds:  70, hp:  4200 },
  { time:  "0:40", seconds:  40, hp:  4380 },
  { time:  "0:10", seconds:  10, hp:  4530 },
];

const HP_ALTARIA = [
  { time: "10:00", seconds: 600, hp:  3580 },
  { time:  "9:40", seconds: 580, hp:  3580 },
  { time:  "9:10", seconds: 550, hp:  3580 },
  { time:  "8:40", seconds: 520, hp:  3980 },
  { time:  "8:10", seconds: 490, hp:  4410 },
  { time:  "7:40", seconds: 460, hp:  4810 },
  { time:  "7:10", seconds: 430, hp:  5240 },
  { time:  "6:40", seconds: 400, hp:  5640 },
  { time:  "6:10", seconds: 370, hp:  6070 },
  { time:  "5:40", seconds: 340, hp:  6470 },
  { time:  "5:10", seconds: 310, hp:  6900 },
  { time:  "4:40", seconds: 280, hp:  7300 },
  { time:  "4:10", seconds: 250, hp:  7730 },
  { time:  "3:40", seconds: 220, hp:  8130 },
  { time:  "3:10", seconds: 190, hp:  8560 },
  { time:  "2:40", seconds: 160, hp:  8960 },
  { time:  "2:10", seconds: 130, hp:  9390 },
  { time:  "2:00", seconds: 120, hp:  9390 },
  { time:  "1:40", seconds: 100, hp:  9820 },
  { time:  "1:10", seconds:  70, hp: 10220 },
  { time:  "0:40", seconds:  40, hp: 10650 },
  { time:  "0:10", seconds:  10, hp: 11050 },
];

const HP_ESCAVALIER = [
  { time: "10:00", seconds: 600, hp:  2400 },
  { time:  "9:40", seconds: 580, hp:  2630 },
  { time:  "9:10", seconds: 550, hp:  2840 },
  { time:  "8:40", seconds: 520, hp:  3070 },
  { time:  "8:10", seconds: 490, hp:  3280 },
  { time:  "7:40", seconds: 460, hp:  3510 },
  { time:  "7:10", seconds: 430, hp:  3720 },
  { time:  "6:40", seconds: 400, hp:  3950 },
  { time:  "6:10", seconds: 370, hp:  4160 },
  { time:  "5:40", seconds: 340, hp:  4390 },
  { time:  "5:10", seconds: 310, hp:  4600 },
  { time:  "4:40", seconds: 280, hp:  4810 },
  { time:  "4:10", seconds: 250, hp:  5040 },
  { time:  "3:40", seconds: 220, hp:  5250 },
  { time:  "3:10", seconds: 190, hp:  5480 },
  { time:  "2:40", seconds: 160, hp:  5690 },
  { time:  "2:10", seconds: 130, hp:  5920 },
  { time:  "2:00", seconds: 120, hp:  5920 },
  { time:  "1:40", seconds: 100, hp:  6130 },
  { time:  "1:10", seconds:  70, hp:  6360 },
  { time:  "0:40", seconds:  40, hp:  6570 },
  { time:  "0:10", seconds:  10, hp:  6800 },
];

const HP_ACCELGOR = [
  { time: "10:00", seconds: 600, hp:  2400 },
  { time:  "9:40", seconds: 580, hp:  2630 },
  { time:  "9:10", seconds: 550, hp:  2840 },
  { time:  "8:40", seconds: 520, hp:  3070 },
  { time:  "8:10", seconds: 490, hp:  3280 },
  { time:  "7:40", seconds: 460, hp:  3510 },
  { time:  "7:10", seconds: 430, hp:  3720 },
  { time:  "6:40", seconds: 400, hp:  3950 },
  { time:  "6:10", seconds: 370, hp:  4160 },
  { time:  "5:40", seconds: 340, hp:  4390 },
  { time:  "5:10", seconds: 310, hp:  4600 },
  { time:  "4:40", seconds: 280, hp:  4810 },
  { time:  "4:10", seconds: 250, hp:  5040 },
  { time:  "3:40", seconds: 220, hp:  5250 },
  { time:  "3:10", seconds: 190, hp:  5480 },
  { time:  "2:40", seconds: 160, hp:  5690 },
  { time:  "2:10", seconds: 130, hp:  5920 },
  { time:  "2:00", seconds: 120, hp:  5920 },
  { time:  "1:40", seconds: 100, hp:  6130 },
  { time:  "1:10", seconds:  70, hp:  6360 },
  { time:  "0:40", seconds:  40, hp:  6570 },
  { time:  "0:10", seconds:  10, hp:  6800 },
];

export const natu = {
  pokemonId: "natu-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/natu.png",
  displayName: "Natu",
  category: 'mob',
  timerBased: true,
  hpTable: HP_NATU,
  stats: makeMobStats(250, 250),
};

export const bunnelby = {
  pokemonId: "bunnelby-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/bunnelby.png",
  displayName: "Bunnelby",
  category: 'mob',
  timerBased: true,
  hpTable: HP_BUNNELBY,
  stats: makeMobStats(250, 250),
};

export const baltoyJungle = {
  pokemonId: "baltoy-jungle-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/baltoy.png",
  displayName: "Baltoy (Jungle)",
  category: 'mob',
  timerBased: true,
  hpTable: HP_BALTOY_JUNGLE,
  stats: makeMobStats(250, 250),
};

export const baltoyCenter = {
  pokemonId: "baltoy-center-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/baltoy.png",
  displayName: "Baltoy (Center)",
  category: 'mob',
  timerBased: true,
  hpTable: HP_BALTOY_CENTER,
  stats: makeMobStats(250, 250),
};

export const baltoyLane = {
  pokemonId: "baltoy-lane-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/baltoy.png",
  displayName: "Baltoy (Lane)",
  category: 'mob',
  timerBased: true,
  hpTable: HP_BALTOY_LANE,
  stats: makeMobStats(250, 250),
};

export const indeedee = {
  pokemonId: "indeedee-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/indeedee.png",
  displayName: "Indeedee",
  category: 'mob',
  timerBased: true,
  hpTable: HP_INDEEDEE,
  stats: makeMobStats(250, 250),
};

export const swablu = {
  pokemonId: "swablu-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/swablu.png",
  displayName: "Swablu",
  category: 'mob',
  timerBased: true,
  hpTable: HP_SWABLU,
  stats: makeMobStats(250, 250),
};

export const altaria = {
  pokemonId: "altaria-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/altaria.png",
  displayName: "Altaria",
  category: 'mob',
  timerBased: true,
  hpTable: HP_ALTARIA,
  stats: makeMobStats(250, 250),
};

export const escavalier = {
  pokemonId: "escavalier-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/escavalier.png",
  displayName: "Escavalier",
  category: 'mob',
  timerBased: true,
  hpTable: HP_ESCAVALIER,
  stats: makeMobStats(250, 250),
};

export const accelgor = {
  pokemonId: "accelgor-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/accelgor.png",
  displayName: "Accelgor",
  category: 'mob',
  timerBased: true,
  hpTable: HP_ACCELGOR,
  stats: makeMobStats(250, 250),
};