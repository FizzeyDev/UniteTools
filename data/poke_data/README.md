# data/poke_data/ — archives de patchs

Ce dossier contient les anciennes versions de `poke_data.json`, une par patch,
utilisées par l'onglet **Compare Patch** du Damage Calculator.

## Comment archiver un patch

1. Avant d'écraser `data/poke_data.json` avec les nouvelles données du patch
   qui vient de sortir, copie l'ANCIEN fichier ici, par exemple :
   ```
   data/poke_data/1-15.json
   ```
2. Ajoute une entrée correspondante dans
   `scripts/calculator/patchesConfig.js` :
   ```js
   { id: '1-15', label: 'Patch 1.15', file: 'data/poke_data/1-15.json' },
   ```
3. Remplace `data/poke_data.json` par les nouvelles données du patch.

L'onglet Compare Patch verra alors automatiquement ce patch dans son
sélecteur, et tu pourras comparer n'importe quel Pokémon entre deux patchs
archivés (ou entre un ancien patch et le patch live).