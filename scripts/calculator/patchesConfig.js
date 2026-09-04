/**
 * patchesConfig.js
 * ─────────────────────────────────────────────────────────────────────────
 * Liste manuelle de tous les patchs archivés, utilisée par le nouvel onglet
 * "📊 Compare Patch". Le Calculator classique (dataLoader.js) continue lui
 * de lire uniquement data/poke_data.json — le patch "live" / en cours.
 *
 * ── COMMENT AJOUTER UN NOUVEAU PATCH (à faire à la main à chaque MAJ) ────
 *   1. AVANT d'écraser data/poke_data.json avec les nouvelles données du
 *      patch, copie l'ANCIEN fichier vers :
 *          data/poke_data/<un-nom-de-ton-choix>.json
 *      (ex: data/poke_data/1-15.json)
 *
 *   2. Ajoute une ligne dans le tableau `patches` ci-dessous qui pointe
 *      vers ce fichier fraîchement archivé :
 *          { id: '1-15', label: 'Patch 1.15', file: 'data/poke_data/1-15.json' }
 *
 *   3. Remplace data/poke_data.json par les nouvelles données du patch qui
 *      vient de sortir (comme tu le fais déjà aujourd'hui).
 *
 *   4. C'est tout : l'onglet Compare Patch verra automatiquement le nouveau
 *      patch dans son sélecteur, et l'ancien restera comparable pour
 *      toujours puisqu'il est maintenant archivé dans data/poke_data/.
 *
 * ── RÈGLE IMPORTANTE ──────────────────────────────────────────────────────
 * L'entrée avec id: 'live' DOIT toujours rester en premier et pointer vers
 * data/poke_data.json : c'est elle qui représente "le patch actuel".
 * Tu peux juste changer son `label` (ex: "Patch 1.16") si tu veux que ça
 * s'affiche plus précisément dans le sélecteur.
 */

export const patches = [
  { id: 'live', label: 'Drive to Victory (Current)', file: 'data/poke_data/poke_data.json' },

  { id: '1', label: 'Aeos Summer Rush', file: 'data/poke_data/poke_data_06-08.json' },
  { id: '2', label: 'Palkia Emergency Buff', file: 'data/poke_data/poke_data_20-07.json' },
  { id: '3', label: 'Enduring Formation Part 2', file: 'data/poke_data/poke_data_16-07.json' },
  { id: '4', label: 'Enduring Formation Part 1', file: 'data/poke_data/poke_data_17-06.json' },
  { id: '5', label: 'Revival Stars Part 2', file: 'data/poke_data/poke_data_13-05.json' },


  // ── Historique — à compléter à la main à chaque nouveau patch ─────────
  // { id: '1-15', label: 'Patch 1.15', file: 'data/poke_data/1-15.json' },
  // { id: '1-14', label: 'Patch 1.14', file: 'data/poke_data/1-14.json' },
];

// Toujours le premier de la liste : le patch "courant" utilisé par défaut.
export const currentPatch = patches[0];

export function getPatchById(id) {
  return patches.find(p => p.id === id) || null;
}