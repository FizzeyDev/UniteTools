import state from './state.js';

export function getBasePath() {
    return window.location.pathname.includes('PokemonUniteDraft') ? '/PokemonUniteDraft/' : './';
}

export async function loadData() {
    try {
        const [pResp, iResp, bResp, dResp, mResp] = await Promise.all([
            fetch('data/pokemons.json'),
            fetch('data/items.json'),
            fetch('data/battle_items.json'),
            fetch('data/poke_data/poke_data.json'),
            fetch('data/moves.json').catch(() => null),   // optional – may not exist yet
        ]);

        if (!pResp.ok || !iResp.ok || !bResp.ok || !dResp.ok)
            throw new Error('Failed to fetch one or more data files');

        state.pokemonData    = await pResp.json();
        state.itemData       = await iResp.json();
        state.battleItemData = await bResp.json();

        const pokeDetailArray = await dResp.json();
        state.pokeDetailMap.clear();
        pokeDetailArray.forEach(p => {
            if (p.pokemonId) state.pokeDetailMap.set(p.pokemonId, p);
        });

        // moves.json: keyed by lowercase pokemon name
        // Schema (WIP): { "absol": { move1: [{name, image}], move2: [{name, image}], passive: {name,image}, unite: {name,image} } }
        if (mResp && mResp.ok) {
            state.movesData = await mResp.json();
        } else {
            state.movesData = {};
        }

    } catch (err) {
        console.error('Error loading JSON data:', err);
        const g = document.getElementById('gallery');
        if (g) g.innerHTML = '<p class="gallery-empty">Erreur : impossible de charger les données.</p>';
    }
}

/**
 * Maps a Pokémon display name to the key used in moves.json.
 * Handles mega evolutions and forme variants whose display name
 * differs from their moves.json key.
 *
 * Display name (lowercased + hyphenated) → moves.json key
 * e.g. "Mega Charizard X" → "mega-charizard-x" → "charizard-x"
 */
const KEY_OVERRIDES = {
    // Possible display-name variants → moves.json key
    'mega-charizard-x': 'charizard-x',
    'charizard-mega-x': 'charizard-x',
    'mega-charizard-y': 'charizard-y',
    'charizard-mega-y': 'charizard-y',
    'mega-gyarados':    'gyarados-mega',
    'mega-lucario':     'lucario-mega',
    'mega-mewtwo-x':    'mewtwo-x',
    'mewtwo-mega-x':    'mewtwo-x',
    'mega-mewtwo-y':    'mewtwo-y',
    'mewtwo-mega-y':    'mewtwo-y',
};

/**
 * Returns move data for a Pokémon, preferring moves.json over poke_data.json.
 * Always returns a normalized object:
 *   { move1: [{name, image}], move2: [{name, image}], passive: [{name,image}], unite: [{name,image}] }
 *
 * passive and unite are now arrays to support multiple choices.
 * Images are resolved to: assets/moves/<pokemonKey>/<filename>
 */
export function getMovesForPokemon(pokemonName) {
    const rawKey = pokemonName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const key    = KEY_OVERRIDES[rawKey] ?? rawKey;

    // ── Prefer moves.json (new source) ──
    if (state.movesData && state.movesData[key]) {
        const raw = state.movesData[key];
        const norm = (arr) => (arr || []).map(m => normalizeMoveWithPath(m, key));
        return {
            move1:   norm(raw.move1),
            move2:   norm(raw.move2),
            passive: norm(raw.passive),
            unite:   norm(raw.unite),
        };
    }

    // ── Fallback: poke_data.json (old source) ──
    const entry = state.pokemonData.find(d => d.name === pokemonName);
    const id    = entry?.pokemonId || key;
    const detail = state.pokeDetailMap.get(id);
    if (!detail) return { move1: [], move2: [], passive: [], unite: [] };

    const moves = detail.moves || [];
    const autoAttack = moves.find(m => m.name === 'Auto-attack');

    const passiveRaw = detail.passive
        ? { name: detail.passive.name, image: detail.passive.image }
        : moves.find(m => m.name.includes('(Passive)') || m.name.toLowerCase().includes('passive')) || null;

    const uniteRaw = moves.find(m =>
        m.name.includes('(Unite)') || m.name.toLowerCase().includes('unite')
    ) || null;

    const standards = moves.filter(m =>
        m !== autoAttack &&
        m.name !== passiveRaw?.name &&
        m !== uniteRaw
    );

    const half = Math.ceil(standards.length / 2);
    return {
        move1:   standards.slice(0, half).map(m => normalizeMove(m)),
        move2:   standards.slice(half).map(m => normalizeMove(m)),
        passive: passiveRaw ? [normalizeMove(passiveRaw)] : [],
        unite:   uniteRaw   ? [normalizeMove(uniteRaw)]   : [],
    };
}

/**
 * Maps a moves.json key to the actual assets/moves/ folder name.
 * Handles mega evolutions and forme variants.
 *
 * JSON key      → folder name
 * charizard-x   → mega_charizard_x
 * charizard-y   → mega_charizard_y
 * gyarados-mega → mega_gyarados
 * lucario-mega  → mega_lucario
 * mewtwo-x      → mega_mewtwo_x
 * mewtwo-y      → mega_mewtwo_y
 */
const FOLDER_OVERRIDES = {
    'mr-mime':       'mr_mime',
    'charizard-x':   'mega_charizard_x',
    'charizard-y':   'mega_charizard_y',
    'gyarados-mega': 'mega_gyarados',
    'lucario-mega':  'mega_lucario',
    'mewtwo-x':      'mega_mewtwo_x',
    'mewtwo-y':      'mega_mewtwo_y',
    'ho-oh': 'hooh'
};

function keyToFolder(pokemonKey) {
    return FOLDER_OVERRIDES[pokemonKey] ?? pokemonKey;
}

/**
 * Normalize a move entry from moves.json.
 * Entries are plain filenames like "feint.png" or objects {name, image}.
 * The image path is built as: assets/moves/<folder>/<filename>
 * The move name is derived by stripping the extension and replacing _ with spaces.
 *
 * Handles missing .png extension gracefully.
 */
function normalizeMoveWithPath(m, pokemonKey) {
    const folder = keyToFolder(pokemonKey);
    if (typeof m === 'string') {
        // Ensure the filename always ends with .png
        const filename = m.endsWith('.png') ? m : `${m}.png`;
        const name = filenameToMoveName(filename);
        return { name, image: `assets/moves/${folder}/${filename}` };
    }
    // Object form: may already have an image path, or just a filename in image
    const name = m.name || filenameToMoveName(m.image || '');
    let imageFile = m.image || null;
    if (imageFile) {
        // Ensure .png extension
        if (!imageFile.endsWith('.png')) imageFile = `${imageFile}.png`;
        // Build full path if not already absolute
        if (!imageFile.startsWith('assets/')) {
            imageFile = `assets/moves/${folder}/${imageFile}`;
        }
    }
    return { name, image: imageFile };
}

function filenameToMoveName(filename) {
    return filename
        .replace(/\.png$/i, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeMove(m) {
    if (typeof m === 'string') return { name: m, image: null };
    return { name: m.name || '', image: m.image || null };
}

// Legacy helper kept for backward compatibility
export function getPokeDetail(pokemonName) {
    const entry = state.pokemonData.find(d => d.name === pokemonName);
    const id = entry?.pokemonId || pokemonName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return state.pokeDetailMap.get(id) || null;
}