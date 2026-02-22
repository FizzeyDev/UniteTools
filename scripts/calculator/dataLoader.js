import { state } from './state.js';
import { mobIds, registeel, regirock, regice, regieleki, regieleki2, regidrago, kyogre, groudon, rayquaza, substituteDoll, customDoll } from './constants.js';

export function getPokemonCategory(id) {
  if (id === 'substitute-doll' || id === 'custom-doll') return 'other';
  if (mobIds.includes(id)) return 'mob';
  return 'playable';
}

export async function loadData() {
  try {
    const [pokeRes, itemRes, itemDataRes, monsRes] = await Promise.all([
      fetch('data/poke_data.json'),
      fetch('data/items.json'),
      fetch('data/items_data.json'),
      fetch('data/pokemons.json')
    ]);

    const pokeData = await pokeRes.json();
    const itemList = await itemRes.json();
    const itemStats = await itemDataRes.json();
    const monsData = await monsRes.json();

    const monsMap = {};
    monsData.forEach(mon => {
      let key = mon.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (mon.name.startsWith("Mega-")) {
        key = "m" + key.replace("mega-", "");
      }

      if (mon.name === "Ho-Oh") key = "hooh";
      if (mon.name === "Mr. Mime") key = "mr_mime";
      if (mon.name === "Mewtwo X") key = "mewtwo_x";
      if (mon.name === "Mewtwo Y") key = "mewtwo_y";
      if (mon.name.startsWith("Mega-Lucario")) key = "mega-lucario";
      if (mon.name.startsWith("Mega-Charizard X")) key = "mega-charizard-x";
      if (mon.name.startsWith("Mega-Charizard Y")) key = "mega-charizard-y";
      if (mon.name.startsWith("Mega-Gyarados")) key = "mega-gyarados";

      monsMap[key] = {
        image: `assets/pokemon/${mon.file}`,
        displayName: mon.name
      };
    });

    state.allPokemon = pokeData.map(poke => {
      const monInfo = monsMap[poke.pokemonId] || {
        image: 'assets/pokemon/missing.png',
        displayName: poke.pokemonId.replace(/-/g, ' ').toUpperCase()
      };
      return {
        ...poke,
        image: monInfo.image,
        displayName: monInfo.displayName,
        category: getPokemonCategory(poke.pokemonId)
      };
    });

    state.allPokemon.push(substituteDoll);
    state.allPokemon.push(customDoll);

    state.allPokemon.push(regice);
    state.allPokemon.push(regirock);
    state.allPokemon.push(registeel);
    state.allPokemon.push(regieleki);
    state.allPokemon.push(regieleki2);
    state.allPokemon.push(regidrago);

    state.allPokemon.push(kyogre);
    state.allPokemon.push(groudon);
    state.allPokemon.push(rayquaza);

    state.allPokemon.sort((a, b) => a.pokemonId.localeCompare(b.pokemonId));

    state.allItems = itemList.map(base => {
      const stats = itemStats.find(i => i.name === base.name) || {};
      return { ...base, ...stats, image: `assets/items/${base.file}` };
    });

    return true;
  } catch (err) {
    console.error("Erreur chargement données :", err);
    return false;
  }
}