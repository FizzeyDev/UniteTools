window.POKEMONS_READY = (function () {
  const isLocal = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
  const basePath = isLocal ? "./" : "/";

  const ROLE_MAP = {
    en: { atk: "Attacker",   def: "Defender", all: "All-Rounder", spe: "Speedster", sup: "Supporter" },
    fr: { atk: "Attaquant",  def: "Défenseur", all: "Polyvalent", spe: "Rapide",   sup: "Soutien" }
  };

  return fetch(`${basePath}data/pokemons.json`)
    .then(r => {
      if (!r.ok) throw new Error(`pokemons.json introuvable (${r.status})`);
      return r.json();
    })
    .then(list => {
      window.UNITE_POKEMON = list
        .filter(entry => entry.role && entry.portee && entry.difficulte)
        .map(entry => {
          const roleCode = String(entry.role).toLowerCase().trim();

          return {
            name:       entry.name,
            name_en:    entry.name_en    || entry.name,
            name_fr:    entry.name_fr    || entry.name,

            file:       entry.file,
            dex:        entry.dex,
            img:        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.dex}.png`,

            role:       roleCode,
            roleDisplay: {
              en: ROLE_MAP.en[roleCode] || roleCode,
              fr: ROLE_MAP.fr[roleCode] || roleCode,
            },

            portee:     entry.portee,
            difficulte: entry.difficulte,
            annee:      entry.annee,
            stade:      entry.stade,
            evo_niveaux: entry.evo_niveaux ?? null,
            mega:       !!entry.mega,
            unite_move_cost: entry.unite_move_cost,
          };
        });

      console.log(`✅ ${window.UNITE_POKEMON.length} Pokémon chargés`);
    })
    .catch(err => console.error("❌ Erreur chargement pokemons.json :", err));
})();