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

export const registeel = {
  pokemonId: "registeel-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/registeel.png",
  displayName: "Registeel",
  category: 'mob',
  stats: Array.from({length: 15}, (_, i) => ({
    level: i + 1, 
    hp: 12350,
    atk: 0,
    def: 250,
    sp_atk: 0,
    sp_def: 250
  }))
};

export const regirock = {
  pokemonId: "regirock-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/regirock.png",
  displayName: "Regirock",
  category: 'mob',
  stats: Array.from({length: 15}, (_, i) => ({
    level: i + 1, 
    hp: 12350,
    atk: 0,
    def: 250,
    sp_atk: 0,
    sp_def: 250
  }))
};

export const regice = {
  pokemonId: "regice-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/regice.png",
  displayName: "Regice",
  category: 'mob',
  stats: Array.from({length: 15}, (_, i) => ({
    level: i + 1, 
    hp: 12350,
    atk: 0,
    def: 250,
    sp_atk: 0,
    sp_def: 250
  }))
};

export const regieleki = {
  pokemonId: "regieleki-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/regieleki.png",
  displayName: "Regieleki (Neutral)",
  category: 'mob',
  stats: Array.from({length: 15}, (_, i) => ({
    level: i + 1, 
    hp: 12350,
    atk: 0,
    def: 250,
    sp_atk: 0,
    sp_def: 250
  }))
};

export const regieleki2 = {
  pokemonId: "regieleki-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/regieleki.png",
  displayName: "Regieleki (Soldier)",
  category: 'mob',
  stats: Array.from({length: 15}, (_, i) => ({
    level: i + 1, 
    hp: 14940,
    atk: 0,
    def: 250,
    sp_atk: 0,
    sp_def: 250
  }))
};

export const regidrago = {
  pokemonId: "regidrago-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/regidrago.png",
  displayName: "Regidrago",
  category: 'mob',
  stats: Array.from({length: 15}, (_, i) => ({
    level: i + 1, 
    hp: 9090,
    atk: 0,
    def: 250,
    sp_atk: 0,
    sp_def: 250
  }))
};

export const kyogre = {
  pokemonId: "kyogre-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/kyogre.png",
  displayName: "Kyogre",
  category: 'mob',
  stats: Array.from({length: 15}, (_, i) => ({
    level: i + 1, 
    hp: 33002,
    atk: 0,
    def: 250,
    sp_atk: 0,
    sp_def: 250
  }))
};

export const groudon = {
  pokemonId: "groudon-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/groudon.png",
  displayName: "Groudon",
  category: 'mob',
  stats: Array.from({length: 15}, (_, i) => ({
    level: i + 1, 
    hp: 33002,
    atk: 0,
    def: 250,
    sp_atk: 0,
    sp_def: 250
  }))
};

export const rayquaza = {
  pokemonId: "rayquaza-farm",
  role: "farm",
  style: "physical",
  image: "assets/farms/rayquaza.png",
  displayName: "Rayquaza",
  category: 'mob',
  stats: Array.from({length: 15}, (_, i) => ({
    level: i + 1, 
    hp: 33002,
    atk: 0,
    def: 250,
    sp_atk: 0,
    sp_def: 250
  }))
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