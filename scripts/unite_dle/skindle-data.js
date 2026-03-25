/**
 * skindle-data.js
 *
 * Liste des skins Pokémon UNITE disponibles.
 * Format du fichier image : ./assets/skins/pokemon_nom_du_skin.png
 * (Le suffixe "Style" n'est PAS inclus dans le nom de fichier)
 *
 * Pour ajouter un skin :
 *   { pokemon: "Absol", skinName: "Dark Suit", file: "absol_dark_suit.png" }
 *
 * skinName : nom exact affiché dans le jeu (sans "Style" à la fin)
 */
window.UNITE_SKINS = [
  // ── Absol ──
  { pokemon: "Absol",              skinName: "Dark Suit",          file: "absol_dark_suit.jpg" },

  // ── Armarouge ──
  { pokemon: "Armarouge",          skinName: "Fiesta",             file: "armarouge_fiesta.jpg" },

  // ── Blastoise ──
  { pokemon: "Blastoise",          skinName: "New Year Festival",  file: "blastoise_new_year_festival.jpg" },

  // ── Blaziken ──
  { pokemon: "Blaziken",           skinName: "Champion",           file: "blaziken_champion.jpg" },

  // ── Ceruledge ──
  { pokemon: "Ceruledge",          skinName: "Neo Street",         file: "ceruledge_neo_street.jpg" },

  // ── Charizard ──
  { pokemon: "Charizard",          skinName: "Super Suit",         file: "charizard_super_suit.jpg" },

  // ── Cinderace ──
  { pokemon: "Cinderace",          skinName: "Bedtime",            file: "cinderace_bedtime.jpg" },

  // ── Darkrai ──
  { pokemon: "Darkrai",            skinName: "Neo Street",         file: "darkrai_neo_street.jpg" },

  // ── Dodrio ──
  { pokemon: "Dodrio",             skinName: "Pokebuki",           file: "dodrio_pokebuki.jpg" },

  // ── Dragapult ──
  { pokemon: "Dragapult",          skinName: "Performer",          file: "dragapult_performer.jpg" },

  // ── Galarian Rapidash ──
  { pokemon: "Galarian Rapidash",  skinName: "Fairy-Tale",         file: "galarian-rapidash_fairy-tale.jpg" },

  // ── Gengar ──
  { pokemon: "Gengar",             skinName: "Neo Street",         file: "gengar_neo_street.jpg" },

  // ── Greninja ──
  { pokemon: "Greninja",           skinName: "Fairy-Tale",         file: "greninja_fairy-tale.jpg" },

  // ── Gyarados ──
  { pokemon: "Gyarados",           skinName: "Darkness",           file: "gyarados_darkness.jpg" },

  // ── Lucario ──
  { pokemon: "Lucario",            skinName: "Neo Street",         file: "lucario_neo_street.jpg" },

  // ── Mewtwo ──
  { pokemon: "Mewtwo",             skinName: "Fairy-Tale",         file: "mewtwo_fairy-tale.jpg" },

  // ── Mimikyu ──
  { pokemon: "Mimikyu",            skinName: "Concert",            file: "mimikyu_concert.jpg" },

  // ── Pikachu ──
  { pokemon: "Pikachu",            skinName: "Stage",              file: "pikachu_stage.jpg" },

  // ── Psyduck ──
  { pokemon: "Psyduck",            skinName: "Super Suit",         file: "psyduck_super_suit.jpg" },

  // ── Slowbro ──
  { pokemon: "Slowbro",            skinName: "Champion",           file: "slowbro_champion.jpg" },
  { pokemon: "Slowbro",            skinName: "Champion Style",     file: "slowbro_champion_gold.jpg" },

  // ── Snorlax ──
  { pokemon: "Snorlax",            skinName: "Space",              file: "snorlax_space.jpg" },

  // ── Suicune ──
  { pokemon: "Suicune",            skinName: "Pokekubi",           file: "suicune_pokekubi.jpg" },

  // ── Sylveon ──
  { pokemon: "Sylveon",            skinName: "Elegant",            file: "sylveon_elegant.jpg" },

  // ── Urshifu ──
  { pokemon: "Urshifu",            skinName: "Dark Suit",          file: "urshifu_dark_suit.jpg" },
  { pokemon: "Urshifu",            skinName: "Guardian",           file: "urshifu_guardian.jpg" },
];

// Build full image path
window.UNITE_SKINS.forEach(s => {
  s.img = `./assets/skins/${s.file}`; 
  s.id  = `${s.pokemon.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${s.skinName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
});