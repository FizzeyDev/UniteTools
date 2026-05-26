// ── Firebase ────────────────────────────────────────────────────────────────
const DATABASE_URL = 'https://unite-draft-default-rtdb.europe-west1.firebasedatabase.app';

async function dbGet(path) {
  const res = await fetch(`${DATABASE_URL}/${path}.json`);
  if (!res.ok) throw new Error(`GET failed: ${res.status}`);
  return res.json();
}
async function dbSet(path, data) {
  const res = await fetch(`${DATABASE_URL}/${path}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`SET failed: ${res.status}`);
  return res.json();
}
async function dbUpdate(path, data) {
  const res = await fetch(`${DATABASE_URL}/${path}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`UPDATE failed: ${res.status}`);
  return res.json();
}
function dbListen(path, callback) {
  const es = new EventSource(`${DATABASE_URL}/${path}.json`);
  es.addEventListener('put', e => {
    try { const p = JSON.parse(e.data); if (p.data) callback(p.data); } catch {}
  });
  es.addEventListener('patch', e => {
    try { dbGet(path).then(d => { if (d) callback(d); }); } catch {}
  });
  es.onerror = () => console.warn('[GW] SSE reconnecting…');
  return es;
}

// ── Constants ───────────────────────────────────────────────────────────────
const SPRITES_PATH = 'assets/pokemon/';
const POKEAPI_SPRITE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

// ── Default rules ────────────────────────────────────────────────────────────
const DEFAULT_RULES = {
  pool:       'unite',   // 'unite' | 'global'
  gridSize:   24,        // 12 | 24 | 32 | 48
  gameMode:   'classic', // 'classic' | 'blitz' | 'hardcore'
  guesses:    '1',       // '1' | '3' | 'unlimited'
  visibility: 'private', // 'private' | 'shared'
};

// ── State ───────────────────────────────────────────────────────────────────
const GW = {
  roomId: null,
  myRole: null,       // 'p1' | 'p2'
  myName: '',
  oppName: '',
  isHost: false,
  sseConn: null,

  // Game data
  board: [],
  mySecret: null,
  eliminated: new Set(),
  sharedEliminated: new Set(), // opponent's eliminations if visibility=shared
  guessSelected: null,
  guessesUsed: 0,

  phase: 'lobby',
  firstPlayer: null,
  allPokemon: [],    // full list from local JSON (Unite)
  globalPokemon: [], // loaded from PokeAPI when needed

  rules: { ...DEFAULT_RULES },

  lang: 'fr',
  strings: {},
};

// ── i18n ─────────────────────────────────────────────────────────────────────
async function loadStrings() {
  const saved = localStorage.getItem('gw-lang') || (navigator.language?.startsWith('en') ? 'en' : 'fr');
  GW.lang = saved || 'fr';
  try {
    const res = await fetch(`data/lang/${GW.lang}.json`);
    GW.strings = await res.json();
  } catch {
    GW.strings = {};
  }
  applyStrings();
}

function t(key, fallback = '') {
  return GW.strings[key] || fallback;
}

function applyStrings() {
  document.querySelectorAll('[data-lang]').forEach(el => {
    const key = el.getAttribute('data-lang');
    const val = t(key);
    if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
    const key = el.getAttribute('data-lang-placeholder');
    const val = t(key);
    if (val) el.placeholder = val;
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function show(id)  { document.getElementById(id).classList.remove('hidden'); }
function hide(id)  { document.getElementById(id).classList.add('hidden'); }
function el(id)    { return document.getElementById(id); }

function showScreen(name) {
  ['lobby', 'waiting', 'pick', 'game'].forEach(s => {
    const elem = document.getElementById(`screen-${s}`);
    if (elem) elem.classList.add('hidden');
  });
  document.getElementById(`screen-${name}`).classList.remove('hidden');
  GW.phase = name;
}

function spriteSrc(pokemon) {
  if (pokemon.source === 'global') {
    return `${POKEAPI_SPRITE}${pokemon.id}.png`;
  }
  return `${SPRITES_PATH}${pokemon.file}`;
}

// ── Rules UI ─────────────────────────────────────────────────────────────────
function initRulesPanel() {
  const groups = ['rule-pool', 'rule-grid-size', 'rule-game-mode', 'rule-guesses', 'rule-visibility'];
  const ruleKeys = ['pool', 'gridSize', 'gameMode', 'guesses', 'visibility'];

  groups.forEach((groupId, i) => {
    const group = el(groupId);
    if (!group) return;
    group.querySelectorAll('.gw-rule-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.gw-rule-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const key = ruleKeys[i];
        let val = btn.dataset.value;
        if (key === 'gridSize') val = parseInt(val);
        GW.rules[key] = val;

        // Blitz forces gridSize ≤ 8
        if (key === 'gameMode' && val === 'blitz') {
          GW.rules.gridSize = 8;
          setActiveToggle('rule-grid-size', '8');
          // Make sure 8 option exists; if not, use 12
          const btn8 = el('rule-grid-size')?.querySelector('[data-value="8"]');
          if (!btn8) {
            GW.rules.gridSize = 12;
            setActiveToggle('rule-grid-size', '12');
          }
        }
      });
    });
  });
}

function setActiveToggle(groupId, value) {
  const group = el(groupId);
  if (!group) return;
  group.querySelectorAll('.gw-rule-toggle').forEach(b => {
    b.classList.toggle('active', b.dataset.value === String(value));
  });
}

function getRulesFromUI() {
  return { ...GW.rules };
}

function applyRulesToUI(rules) {
  if (!rules) return;
  GW.rules = { ...DEFAULT_RULES, ...rules };
  setActiveToggle('rule-pool', GW.rules.pool);
  setActiveToggle('rule-grid-size', String(GW.rules.gridSize));
  setActiveToggle('rule-game-mode', GW.rules.gameMode);
  setActiveToggle('rule-guesses', GW.rules.guesses);
  setActiveToggle('rule-visibility', GW.rules.visibility);
}

function renderRulesTags(rules) {
  const tagsEl = el('rules-tags');
  if (!tagsEl) return;
  const r = { ...DEFAULT_RULES, ...rules };

  const poolLabel = r.pool === 'global' ? '🌍 Global' : '⚡ Unite';
  const poolClass = r.pool === 'global' ? 'tag-violet' : 'tag-blue';

  const modeLabel = { classic: 'Classique', blitz: '⚡ Blitz', hardcore: '💀 Hardcore' }[r.gameMode] || r.gameMode;
  const modeClass = { classic: '', blitz: 'tag-yellow', hardcore: 'tag-red' }[r.gameMode] || '';

  const guessLabel = r.guesses === 'unlimited' ? '∞ tentatives' : `${r.guesses} tentative${r.guesses > 1 ? 's' : ''}`;

  const visLabel = r.visibility === 'shared' ? '👁 Elim. partagées' : '🔒 Privé';
  const visClass = r.visibility === 'shared' ? 'tag-green' : '';

  tagsEl.innerHTML = `
    <span class="gw-rule-tag ${poolClass}">${poolLabel}</span>
    <span class="gw-rule-tag tag-blue">${r.gridSize} pokémons</span>
    <span class="gw-rule-tag ${modeClass}">${modeLabel}</span>
    <span class="gw-rule-tag tag-yellow">${guessLabel}</span>
    <span class="gw-rule-tag ${visClass}">${visLabel}</span>
  `;
}

// ── Load pokemon data ────────────────────────────────────────────────────────
async function loadPokemon() {
  if (GW.allPokemon.length > 0) return; // already loaded
  const res  = await fetch('data/pokemons.json');
  const data = await res.json();
  const seen = new Set();
  GW.allPokemon = data.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
}

// ── Load global Pokémon from PokéAPI ─────────────────────────────────────────
async function loadGlobalPokemon() {
  if (GW.globalPokemon.length > 0) return;

  // Fetch first 898 Pokémon (Gen 1–8, broad enough, no forms)
  // We use the species list to avoid duplicates from forms
  const count = 898;
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${count}&offset=0`);
  const data = await res.json();

  GW.globalPokemon = data.results.map((p, i) => ({
    name: capitalise(p.name.replace(/-/g, ' ')),
    id: i + 1,
    source: 'global',
    file: null,
  }));
}

function capitalise(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

async function getPokemonPool() {
  if (GW.rules.pool === 'global') {
    await loadGlobalPokemon();
    return GW.globalPokemon;
  }
  return GW.allPokemon;
}

// ── Room code from URL ────────────────────────────────────────────────────────
function getRoomFromURL() {
  return new URLSearchParams(location.search).get('room');
}

// ── Create room ───────────────────────────────────────────────────────────────
async function createRoom() {
  const name = el('create-name').value.trim() || t('gw_default_player1', 'Player 1');
  GW.myName  = name;
  GW.myRole  = 'p1';
  GW.isHost  = true;

  const roomId = generateCode();
  GW.roomId   = roomId;

  const rules = getRulesFromUI();
  GW.rules = rules;

  const pool   = await getPokemonPool();
  const count  = rules.gameMode === 'blitz' ? Math.min(rules.gridSize, 8) : rules.gridSize;
  const seed   = roomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  GW.board     = seededShuffle(pool, seed).slice(0, count);

  // Serialize board: for global mode store id, for unite store name
  const boardData = GW.board.map(p => p.source === 'global'
    ? { name: p.name, id: p.id, source: 'global' }
    : { name: p.name }
  );

  await dbSet(`guesswho/rooms/${roomId}`, {
    createdAt: Date.now(),
    status:    'waiting',
    board:     boardData,
    rules:     rules,
    p1:        { name, ready: false, secretName: null, guessesUsed: 0, eliminations: [] },
    p2:        { name: null, ready: false, secretName: null, guessesUsed: 0, eliminations: [] },
    firstPlayer: null,
    guesses:   [],
    result:    null,
  });

  _subscribe(roomId);
  history.replaceState({}, '', `?room=${roomId}`);

  el('display-room-code').textContent = roomId;
  el('slot-p1-name').textContent = name;
  showScreen('waiting');
  renderRulesTags(rules);
  show('rules-summary');
  _updateWaitingHint();

  setTimeout(() => dbSet(`guesswho/rooms/${roomId}/status`, 'expired').catch(() => {}), 4 * 3600 * 1000);
}

// ── Join room ──────────────────────────────────────────────────────────────────
async function joinRoom(code, name) {
  const roomId = code.trim().toUpperCase();
  if (!roomId || roomId.length !== 6) {
    el('join-error').textContent = t('gw_error_invalid_code', 'Enter a valid 6-character code.');
    return;
  }

  let data;
  try {
    data = await dbGet(`guesswho/rooms/${roomId}`);
  } catch {
    el('join-error').textContent = t('gw_error_server', 'Unable to reach server.');
    return;
  }

  if (!data) {
    el('join-error').textContent = t('gw_error_not_found', 'Room not found.');
    return;
  }
  if (data.status !== 'waiting') {
    el('join-error').textContent = t('gw_error_in_progress', 'This room is already in progress.');
    return;
  }
  if (data.p2?.name) {
    el('join-error').textContent = t('gw_error_full', 'Room is full.');
    return;
  }

  GW.myName  = name || t('gw_default_player2', 'Player 2');
  GW.myRole  = 'p2';
  GW.isHost  = false;
  GW.roomId  = roomId;
  GW.rules   = { ...DEFAULT_RULES, ...(data.rules || {}) };

  // Rebuild board
  GW.board = _rebuildBoard(data.board);

  await dbUpdate(`guesswho/rooms/${roomId}/p2`, { name: GW.myName, ready: false, secretName: null, guessesUsed: 0, eliminations: [] });

  _subscribe(roomId);
  history.replaceState({}, '', `?room=${roomId}`);

  el('display-room-code').textContent = roomId;
  el('slot-p1-name').textContent = data.p1.name;
  el('slot-p2-name').textContent = GW.myName;
  el('dot-p2').classList.add('online');
  showScreen('waiting');
  renderRulesTags(GW.rules);
  show('rules-summary');
  _updateWaitingHint();
}

function _rebuildBoard(boardData) {
  if (!boardData) return [];
  return boardData.map(entry => {
    if (entry.source === 'global') {
      return { name: entry.name, id: entry.id, source: 'global', file: null };
    }
    return GW.allPokemon.find(p => p.name === entry.name) || { name: entry.name };
  }).filter(Boolean);
}

// ── Auto-join from URL ─────────────────────────────────────────────────────────
async function tryAutoJoin() {
  const code = getRoomFromURL();
  if (!code) return false;

  let data;
  try { data = await dbGet(`guesswho/rooms/${code}`); } catch { return false; }
  if (!data || data.status === 'expired') return false;

  if (data.status === 'waiting' && !data.p2?.name) {
    const name = prompt(t('gw_join_prompt', 'Enter your name to join the room:')) || t('gw_default_player2', 'Player 2');
    el('join-name').value = name;
    el('join-code').value = code;
    await joinRoom(code, name);
    return true;
  }

  return false;
}

// ── SSE subscription ───────────────────────────────────────────────────────────
function _subscribe(roomId) {
  if (GW.sseConn) GW.sseConn.close();
  GW.sseConn = dbListen(`guesswho/rooms/${roomId}`, _onRoomUpdate);
}

// ── Room update handler ────────────────────────────────────────────────────────
function _onRoomUpdate(data) {
  if (!data || typeof data !== 'object') return;

  if (data.p1 && data.p2) {
    const opp  = GW.myRole === 'p1' ? data.p2 : data.p1;
    const mine = GW.myRole === 'p1' ? data.p1 : data.p2;
    GW.oppName = opp.name || '';

    if (GW.phase === 'waiting') {
      el('slot-p1-name').textContent = data.p1.name || '—';
      el('slot-p2-name').textContent = data.p2.name || t('gw_waiting_dots', 'En attente…');
      if (data.p2.name) el('dot-p2').classList.add('online');

      // Update rules display when host updates them (p2 sees changes live)
      if (data.rules) {
        renderRulesTags(data.rules);
        if (!GW.isHost) GW.rules = { ...DEFAULT_RULES, ...data.rules };
      }

      // Show host-ready button once p2 joined (host only, waiting phase)
      if (GW.isHost && data.p2.name && data.status === 'waiting') {
        show('btn-host-ready');
      }
    }

    // Ready badges
    const b1 = el('badge-p1'), b2 = el('badge-p2');
    if (b1 && b2) {
      b1.textContent = data.p1.ready ? t('gw_ready', '✓ Ready') : '';
      b1.classList.toggle('show', !!data.p1.ready);
      b2.textContent = data.p2.ready ? t('gw_ready', '✓ Ready') : '';
      b2.classList.toggle('show', !!data.p2.ready);
    }

    // Pick dots
    const dotMe  = el('pick-dot-me');
    const dotOpp = el('pick-dot-opp');
    if (dotMe && dotOpp) {
      dotMe.classList.toggle('chosen', !!mine.ready);
      dotOpp.classList.toggle('chosen', !!opp.ready);
    }

    // Host: both ready in pick → start game
    if (GW.isHost && data.status === 'pick' && GW.phase === 'pick') {
      if (data.p1?.ready && data.p2?.ready) {
        const first = Math.random() < 0.5 ? 'p1' : 'p2';
        dbUpdate(`guesswho/rooms/${GW.roomId}`, { status: 'game', firstPlayer: first }).catch(() => {});
      }
    }

    // Shared eliminations: sync opponent's grid
    if (GW.phase === 'game' && GW.rules.visibility === 'shared') {
      const oppElims = opp.eliminations || [];
      GW.sharedEliminated = new Set(oppElims);
      _applySharedEliminations();
    }
  }

  // Status transitions
  if (data.status === 'pick' && GW.phase === 'waiting') {
    _enterPick(data);
  }

  if (data.status === 'game' && GW.phase === 'pick') {
    _enterGame(data);
  }

  // Guess event
  if (data.guesses && GW.phase === 'game') {
    const guesses = Array.isArray(data.guesses) ? data.guesses : Object.values(data.guesses);
    const myGuesses = guesses.filter(g => g.by === GW.myRole);
    GW.guessesUsed = myGuesses.length;
    _updateGuessCounter();
  }

  // Result
  if (data.result && GW.phase !== 'end') {
    _showResult(data.result);
  }
}

// ── Host ready button (in waiting screen) ─────────────────────────────────────
el('btn-host-ready').addEventListener('click', async () => {
  if (!GW.isHost) return;
  el('btn-host-ready').disabled = true;
  el('btn-host-ready').textContent = t('gw_launching', 'Lancement…');

  // Push latest rules before launching
  const rules = getRulesFromUI();
  GW.rules = rules;

  // Rebuild board with latest rules (in case host changed them after waiting)
  const pool  = await getPokemonPool();
  const count = rules.gameMode === 'blitz' ? Math.min(rules.gridSize, 8) : rules.gridSize;
  const seed  = GW.roomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  GW.board    = seededShuffle(pool, seed).slice(0, count);

  const boardData = GW.board.map(p => p.source === 'global'
    ? { name: p.name, id: p.id, source: 'global' }
    : { name: p.name }
  );

  await dbUpdate(`guesswho/rooms/${GW.roomId}`, {
    status: 'pick',
    board: boardData,
    rules: rules,
  }).catch(() => {});
});

// ── Pick phase ─────────────────────────────────────────────────────────────────
function _enterPick(data) {
  if (data.board && GW.board.length === 0) {
    GW.board = _rebuildBoard(data.board);
  }
  if (data.rules) GW.rules = { ...DEFAULT_RULES, ...data.rules };

  showScreen('pick');
  el('pick-me-name').textContent  = GW.myName;
  el('pick-opp-name').textContent = GW.oppName || t('gw_opponent', 'Opponent');
  _renderPickGrid();
}

function _renderPickGrid() {
  const grid = el('grid-pick');
  grid.innerHTML = '';

  // Dynamic columns for large grids
  const count = GW.board.length;
  grid.style.gridTemplateColumns = count > 32
    ? 'repeat(8, 1fr)'
    : count > 24
    ? 'repeat(6, 1fr)'
    : count === 12
    ? 'repeat(4, 1fr)'
    : 'repeat(6, 1fr)';

  GW.board.forEach((poke, i) => {
    const card = document.createElement('div');
    card.className = 'gw-poke-card';
    const img = _makeImg(poke);
    card.appendChild(img);
    const nameEl = document.createElement('div');
    nameEl.className = 'gw-poke-name';
    nameEl.textContent = poke.name;
    card.appendChild(nameEl);
    card.addEventListener('click', () => _selectSecret(i, card, poke));
    grid.appendChild(card);
  });
}

function _makeImg(poke) {
  const img = document.createElement('img');
  img.alt = poke.name;
  img.loading = 'lazy';
  if (poke.source === 'global') {
    img.src = `${POKEAPI_SPRITE}${poke.id}.png`;
  } else {
    img.src = spriteSrc(poke);
  }
  return img;
}

function _selectSecret(idx, card, poke) {
  document.querySelectorAll('#grid-pick .gw-poke-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  GW.mySecret = poke;
  el('picked-img').src = poke.source === 'global' ? `${POKEAPI_SPRITE}${poke.id}.png` : spriteSrc(poke);
  el('picked-name').textContent = poke.name;
  el('pick-confirm').classList.remove('hidden');
}

// Ready button (pick screen)
el('btn-ready').addEventListener('click', async () => {
  if (!GW.mySecret) return;
  el('btn-ready').disabled = true;
  el('btn-ready').textContent = t('gw_waiting_opp', 'En attente…');

  const roleData = { ready: true, secretName: GW.mySecret.name, guessesUsed: 0, eliminations: [] };
  await dbUpdate(`guesswho/rooms/${GW.roomId}/${GW.myRole}`, roleData).catch(() => {});

  if (GW.isHost) {
    try {
      const roomData = await dbGet(`guesswho/rooms/${GW.roomId}`);
      const p1Ready = GW.myRole === 'p1' ? true : roomData?.p1?.ready;
      const p2Ready = GW.myRole === 'p2' ? true : roomData?.p2?.ready;
      if (p1Ready && p2Ready) {
        const first = Math.random() < 0.5 ? 'p1' : 'p2';
        await dbUpdate(`guesswho/rooms/${GW.roomId}`, { status: 'game', firstPlayer: first });
      }
    } catch (e) {
      console.warn('[GW] host ready check failed', e);
    }
  }
});

// ── Game phase ─────────────────────────────────────────────────────────────────
function _enterGame(data) {
  GW.firstPlayer  = data.firstPlayer;
  GW.eliminated   = new Set();
  GW.sharedEliminated = new Set();
  GW.guessesUsed  = 0;

  if (data.rules) GW.rules = { ...DEFAULT_RULES, ...data.rules };
  if (data.board && GW.board.length === 0) GW.board = _rebuildBoard(data.board);

  showScreen('game');

  el('game-me-name').textContent  = GW.myName;
  el('game-opp-name').textContent = GW.oppName;

  // Secret
  const secretImg = el('secret-img');
  secretImg.src = GW.mySecret.source === 'global'
    ? `${POKEAPI_SPRITE}${GW.mySecret.id}.png`
    : spriteSrc(GW.mySecret);
  el('secret-name').textContent = GW.mySecret.name;

  // Guess counter
  _updateGuessCounter();
  _updateTurnBanner();

  // Grid columns based on size
  _setGridCols(el('grid-game'), GW.board.length);
  _setGridCols(el('modal-grid'), GW.board.length);

  _renderGameGrid();
  _renderModalGrid();

  // Disable guess btn if out of guesses
  _checkGuessButtonState();
}

function _setGridCols(gridEl, count) {
  if (!gridEl) return;
  gridEl.style.gridTemplateColumns = count > 32
    ? 'repeat(8, 1fr)'
    : count === 12
    ? 'repeat(4, 1fr)'
    : 'repeat(6, 1fr)';
}

function _updateTurnBanner() {
  const firstName = GW.firstPlayer === GW.myRole ? GW.myName : GW.oppName;
  el('turn-text').textContent = t('gw_asks_first', '{name} asks first').replace('{name}', firstName);
}

function _updateGuessCounter() {
  const counterEl = el('guess-counter');
  if (!counterEl) return;
  const maxGuesses = GW.rules.guesses;
  if (maxGuesses === 'unlimited') {
    counterEl.classList.add('hidden');
    return;
  }
  const max = parseInt(maxGuesses);
  const remaining = max - GW.guessesUsed;
  counterEl.textContent = `${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`;
  counterEl.classList.remove('hidden');
  if (remaining <= 0) counterEl.style.color = 'var(--red)';
}

function _checkGuessButtonState() {
  const btn = el('btn-open-guess');
  if (!btn) return;
  if (GW.rules.guesses !== 'unlimited') {
    const max = parseInt(GW.rules.guesses);
    btn.disabled = GW.guessesUsed >= max;
  } else {
    btn.disabled = false;
  }
}

function _renderGameGrid() {
  const grid = el('grid-game');
  grid.innerHTML = '';
  GW.board.forEach((poke, i) => {
    const card = document.createElement('div');
    card.className = 'gw-game-card';
    card.id = `game-card-${i}`;
    const img = _makeImg(poke);
    card.appendChild(img);
    const nameEl = document.createElement('div');
    nameEl.className = 'gw-poke-name';
    nameEl.textContent = poke.name;
    card.appendChild(nameEl);
    card.addEventListener('click', () => _toggleEliminate(i));
    grid.appendChild(card);
  });
}

function _toggleEliminate(idx) {
  const card = el(`game-card-${idx}`);
  if (!card) return;
  if (GW.eliminated.has(idx)) {
    GW.eliminated.delete(idx);
    card.classList.remove('eliminated');
    if (GW.rules.gameMode === 'hardcore') card.classList.remove('hardcore-hide');
  } else {
    GW.eliminated.add(idx);
    card.classList.add('eliminated');
    if (GW.rules.gameMode === 'hardcore') card.classList.add('hardcore-hide');
  }

  // Push eliminations to Firebase if visibility is shared
  if (GW.rules.visibility === 'shared') {
    const elimArr = [...GW.eliminated];
    dbUpdate(`guesswho/rooms/${GW.roomId}/${GW.myRole}`, { eliminations: elimArr }).catch(() => {});
  }
}

function _applySharedEliminations() {
  GW.board.forEach((_, i) => {
    const card = el(`game-card-${i}`);
    if (!card) return;
    if (GW.sharedEliminated.has(i) && !GW.eliminated.has(i)) {
      card.classList.add('elim-shared');
    } else {
      card.classList.remove('elim-shared');
    }
  });
}

// ── Guess modal ────────────────────────────────────────────────────────────────
function _renderModalGrid() {
  const grid = el('modal-grid');
  grid.innerHTML = '';
  _setGridCols(grid, GW.board.length);
  GW.board.forEach((poke, i) => {
    const card = document.createElement('div');
    card.className = 'gw-modal-card' + (GW.eliminated.has(i) ? ' eliminated-hint' : '');
    card.id = `modal-card-${i}`;
    const img = _makeImg(poke);
    card.appendChild(img);
    const nameEl = document.createElement('div');
    nameEl.className = 'gw-poke-name';
    nameEl.textContent = poke.name;
    card.appendChild(nameEl);
    card.addEventListener('click', () => _selectGuess(i));
    grid.appendChild(card);
  });
}

function _selectGuess(idx) {
  document.querySelectorAll('#modal-grid .gw-modal-card').forEach(c => c.classList.remove('selected'));
  GW.guessSelected = idx;
  el(`modal-card-${idx}`).classList.add('selected');
  el('btn-confirm-guess').disabled = false;
}

el('btn-open-guess').addEventListener('click', () => {
  if (el('btn-open-guess').disabled) return;
  GW.guessSelected = null;
  el('btn-confirm-guess').disabled = true;
  _renderModalGrid();
  show('modal-guess');
});

el('btn-cancel-guess').addEventListener('click', () => hide('modal-guess'));

el('btn-confirm-guess').addEventListener('click', async () => {
  if (GW.guessSelected === null) return;
  hide('modal-guess');

  const guessedPoke = GW.board[GW.guessSelected];
  const oppRole = GW.myRole === 'p1' ? 'p2' : 'p1';
  const oppSecretName = await dbGet(`guesswho/rooms/${GW.roomId}/${oppRole}/secretName`);
  const correct = guessedPoke.name === oppSecretName;

  GW.guessesUsed++;
  _updateGuessCounter();
  _checkGuessButtonState();

  // Update my guess count
  await dbUpdate(`guesswho/rooms/${GW.roomId}/${GW.myRole}`, { guessesUsed: GW.guessesUsed }).catch(() => {});

  // Push guess to list
  const guessEntry = {
    by: GW.myRole,
    pokemon: guessedPoke.name,
    correct,
    ts: Date.now(),
  };

  // Check if this ends the game
  const maxGuesses = GW.rules.guesses;
  const isLastGuess = maxGuesses !== 'unlimited' && GW.guessesUsed >= parseInt(maxGuesses);

  if (correct || isLastGuess) {
    // Determine result
    const winner = correct ? GW.myRole : oppRole;
    await dbUpdate(`guesswho/rooms/${GW.roomId}`, {
      [`guesses/${Date.now()}`]: guessEntry,
      result: {
        winner,
        guesser: GW.myRole,
        guessedPokemon: guessedPoke.name,
        correct,
        guessesUsed: GW.guessesUsed,
      },
    });
  } else {
    // Wrong guess but still has attempts left
    await dbUpdate(`guesswho/rooms/${GW.roomId}`, {
      [`guesses/${Date.now()}`]: guessEntry,
    });
    // Show wrong guess toast
    _showWrongGuessToast(guessedPoke.name, GW.rules.guesses === 'unlimited' ? null : parseInt(GW.rules.guesses) - GW.guessesUsed);
  }
});

function _showWrongGuessToast(name, remaining) {
  const existing = document.querySelector('.gw-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'gw-toast';
  const remStr = remaining !== null ? ` — ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}` : '';
  toast.textContent = `❌ ${name} n'est pas le bon Pokémon${remStr}`;
  toast.style.cssText = `
    position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
    background: var(--surface-3); border: 1px solid var(--red);
    color: var(--red); font-family: 'Exo 2', sans-serif;
    font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em;
    padding: 10px 20px; border-radius: 8px; z-index: 999;
    animation: gw-fadein 0.2s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Result ─────────────────────────────────────────────────────────────────────
function _showResult(result) {
  GW.phase = 'end';

  const iWon    = result.winner === GW.myRole;
  const iGuessed = result.guesser === GW.myRole;

  el('result-icon').textContent  = iWon ? '🏆' : '😢';
  el('result-title').textContent = iWon ? t('gw_you_win', 'Tu as gagné !') : t('gw_you_lose', 'Tu as perdu !');

  const oppRole = GW.myRole === 'p1' ? 'p2' : 'p1';

  dbGet(`guesswho/rooms/${GW.roomId}/${oppRole}/secretName`).then(name => {
    const oppPoke = GW.board.find(p => p.name === name);

    let subText = '';
    if (iGuessed) {
      subText = result.correct
        ? t('gw_result_correct_guess', 'Tu as trouvé {name} !').replace('{name}', name)
        : t('gw_result_wrong_guess', 'Tu as deviné {guess}, mais c\'était {name}.').replace('{guess}', result.guessedPokemon).replace('{name}', name);
    } else {
      subText = result.correct
        ? t('gw_result_opp_correct', '{opp} a trouvé ton Pokémon : {name}.').replace('{opp}', GW.oppName).replace('{name}', GW.mySecret?.name)
        : t('gw_result_opp_wrong', '{opp} s\'est trompé — ton Pokémon était {name}.').replace('{opp}', GW.oppName).replace('{name}', GW.mySecret?.name);
    }
    el('result-sub').textContent = subText;

    const revealEl = el('result-reveal');
    if (oppPoke) {
      const img = _makeImg(oppPoke);
      img.style.cssText = 'width:56px;height:56px;object-fit:contain;';
      const span = document.createElement('span');
      span.innerHTML = `${t('gw_opp_pokemon', "Pokémon de l'adversaire :")} <strong>${oppPoke.name}</strong>`;
      revealEl.innerHTML = '';
      revealEl.appendChild(img);
      revealEl.appendChild(span);
    }
  });

  show('modal-result');
}

// Play again
el('btn-play-again').addEventListener('click', () => {
  if (GW.sseConn) GW.sseConn.close();
  GW.roomId = null;
  GW.myRole = null;
  GW.mySecret = null;
  GW.board = [];
  GW.eliminated = new Set();
  GW.sharedEliminated = new Set();
  GW.firstPlayer = null;
  GW.guessesUsed = 0;
  hide('modal-result');
  hide('btn-host-ready');
  history.replaceState({}, '', location.pathname);
  showScreen('lobby');
});

// ── Copy code ──────────────────────────────────────────────────────────────────
el('btn-copy-code').addEventListener('click', () => {
  const code = el('display-room-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    el('btn-copy-code').textContent = t('gw_copied', '✓ Copié !');
    setTimeout(() => { el('btn-copy-code').textContent = t('gw_copy', '⎘ Copier'); }, 2000);
  });
});

// ── How to play modal ──────────────────────────────────────────────────────────
el('btn-how-to-play')?.addEventListener('click', () => show('modal-howtoplay'));
el('btn-close-howtoplay')?.addEventListener('click', () => hide('modal-howtoplay'));
el('modal-howtoplay')?.addEventListener('click', e => {
  if (e.target === el('modal-howtoplay')) hide('modal-howtoplay');
});

// ── Waiting hint ───────────────────────────────────────────────────────────────
function _updateWaitingHint() {
  const code = GW.roomId;
  if (GW.isHost) {
    el('waiting-hint').textContent = t('gw_waiting_hint_host', `Partage ce code avec ton ami : ${code}`).replace('{code}', code);
    show('rules-edit-hint');
  } else {
    el('waiting-hint').textContent = t('gw_waiting_hint_guest', 'Connecté ! En attente du lancement par l\'hôte…');
  }
}

// ── Navbar fix: load via fetch if script injection fails ──────────────────────
function _initNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return;

  // If navbar.js already populated the container, do nothing
  if (container.innerHTML.trim()) return;

  // Try fetching the navbar HTML snippet if it exists
  fetch('components/navbar.html')
    .then(r => r.ok ? r.text() : null)
    .then(html => {
      if (html) container.innerHTML = html;
    })
    .catch(() => {});
}

// ── Lobby button events ────────────────────────────────────────────────────────
el('btn-create').addEventListener('click', async () => {
  el('btn-create').disabled = true;
  try {
    await loadPokemon();
    if (GW.rules.pool === 'global') await loadGlobalPokemon();
    await createRoom();
  } catch (e) {
    console.error(e);
    el('btn-create').disabled = false;
  }
});

el('btn-join').addEventListener('click', async () => {
  el('btn-join').disabled = true;
  el('join-error').textContent = '';
  try {
    await loadPokemon();
    const name = el('join-name').value.trim() || t('gw_default_player2', 'Player 2');
    const code = el('join-code').value.trim().toUpperCase();
    await joinRoom(code, name);
  } catch (e) {
    console.error(e);
    el('join-error').textContent = t('gw_error_generic', 'Something went wrong.');
  } finally {
    el('btn-join').disabled = false;
  }
});

el('join-code').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase();
});

// ── Boot ───────────────────────────────────────────────────────────────────────
(async () => {
  await loadStrings();
  await loadPokemon();
  initRulesPanel();
  _initNavbar();
  const autoJoined = await tryAutoJoin();
  if (!autoJoined) {
    showScreen('lobby');
  }
})();