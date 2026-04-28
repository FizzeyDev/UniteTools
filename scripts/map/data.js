let POKEMON = [];
let ITEMS = [];

fetch("data/pokemons.json")
  .then(r => r.json())
  .then(data => {
    POKEMON = data.map(p => ({
      id: p.name
        .toLowerCase()
        .replace(/mega-/g,"mega_")
        .replace(/\./g,"")
        .replace(/'/g,"")
        .replace(/ /g,"_")
        .replace(/-/g,"_"),
      name: p.name,
      role: p.role,
      img: `assets/pokemon/${p.file}`
    }));
  });

Promise.all([
  fetch("data/items.json").then(r => r.json()),
  fetch("data/battle_items.json").then(r => r.json())
]).then(([heldItems, battleItems]) => {
  ITEMS = [
    ...heldItems.map(item => ({
      id: item.name
        .toLowerCase()
        .replace(/\./g,"")
        .replace(/'/g,"")
        .replace(/ /g,"_")
        .replace(/-/g,"_"),
      name: item.name,
      type: "held",
      img: `assets/items/${item.file}`
    })),

    ...battleItems.map(item => ({
      id: item.name
        .toLowerCase()
        .replace(/\./g,"")
        .replace(/'/g,"")
        .replace(/ /g,"_")
        .replace(/-/g,"_"),
      name: item.name,
      type: "battle",
      img: `assets/battle_items/${item.file}`
    }))
  ];
});

const NEUTRALS = [
  { id:"accelgor",    name:"Accelgor",    img:"assets/maps/spawn/accelgor.png" },
  { id:"altaria",     name:"Altaria",     img:"assets/maps/spawn/altaria.png" },
  { id:"baltoy",      name:"Baltoy",      img:"assets/maps/spawn/baltoy.png" },
  { id:"bunnelby",    name:"Bunnelby",    img:"assets/maps/spawn/bunnelby.png" },
  { id:"claydol",     name:"Claydol",     img:"assets/maps/spawn/claydol.png" },
  { id:"diggersby",   name:"Diggersby",   img:"assets/maps/spawn/diggersby.png" },
  { id:"escavalier",  name:"Escavalier",  img:"assets/maps/spawn/escavalier.png" },
  { id:"groudon",     name:"Groudon",     img:"assets/maps/spawn/groudon.png" },
  { id:"indeedee",    name:"Indeedee",    img:"assets/maps/spawn/indeedee.png" },
  { id:"kyogre",      name:"Kyogre",      img:"assets/maps/spawn/kyogre.png" },
  { id:"natu",        name:"Natu",        img:"assets/maps/spawn/natu.png" },
  { id:"rayquaza",    name:"Rayquaza",    img:"assets/maps/spawn/rayquaza.png" },
  { id:"regice",      name:"Regice",      img:"assets/maps/spawn/regice.png" },
  { id:"regidrago",   name:"Regidrago",   img:"assets/maps/spawn/regidrago.png" },
  { id:"regieleki",   name:"Regieleki",   img:"assets/maps/spawn/regieleki.png" },
  { id:"regirock",    name:"Regirock",    img:"assets/maps/spawn/regirock.png" },
  { id:"registeel",   name:"Registeel",   img:"assets/maps/spawn/registeel.png" },
  { id:"swablu",      name:"Swablu",      img:"assets/maps/spawn/swablu.png" },
  { id:"xatu",        name:"Xatu",        img:"assets/maps/spawn/xatu.png" }
];

const OTHER = [
  { id:"goal_purple", name:"Goal (P)", img:"assets/othermap/goal_purple.png" },
  { id:"goal_orange", name:"Goal (O)", img:"assets/othermap/goal_orange.png" },
  { id:"marker_red",  name:"Marker ●", img:"assets/othermap/marker_red.png"  },
  { id:"marker_blue", name:"Marker ●", img:"assets/othermap/marker_blue.png" },
  { id:"ward",        name:"Ward",     img:"assets/othermap/ward.png"         },
  { id:"danger_zone", name:"Danger",   img:"assets/othermap/danger_zone.png"  },
  { id:"salac",       name:"Salac Berry", img:"assets/maps/spawn/salac.png" },
  { id:"sitrus",      name:"Sitrus Berry",img:"assets/maps/spawn/sitrus.png" },
];

const MAPS = {
  groudon: 'assets/maps/map_groudon.webp',
  kyogre:  'assets/maps/map_kyogre.webp',
  rayquaza:'assets/maps/map_rayquaza.avif',
};