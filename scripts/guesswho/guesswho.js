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
  pool:     'unite', // 'unite' | 'global'
  gridSize: 24,      // 12 | 24 | 32 | 48
};

// ── State ───────────────────────────────────────────────────────────────────
const GW = {
  roomId: null,
  myRole: null,       // 'p1' | 'p2'
  myName: '',
  oppName: '',
  isHost: false,
  sseConn: null,

  board: [],
  mySecret: null,
  hasSubmittedSecret: false, 
  eliminated: new Set(),
  guessSelected: null,

  phase: 'lobby',
  firstPlayer: null,
  allPokemon: [],
  globalPokemon: [],

  rules: { ...DEFAULT_RULES },
};

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
  if (pokemon.source === 'global') return `${POKEAPI_SPRITE}${pokemon.id}.png`;
  return `${SPRITES_PATH}${pokemon.file}`;
}

// ── Rules UI ─────────────────────────────────────────────────────────────────
function initRulesPanel() {
  const groups   = ['rule-pool', 'rule-grid-size'];
  const ruleKeys = ['pool', 'gridSize'];

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
}

function renderRulesTags(rules) {
  const tagsEl = el('rules-tags');
  if (!tagsEl) return;
  const r = { ...DEFAULT_RULES, ...rules };
  const poolLabel = r.pool === 'global' ? '🌍 Global' : '⚡ Unite';
  const poolClass = r.pool === 'global' ? 'tag-violet' : 'tag-blue';
  tagsEl.innerHTML = `
    <span class="gw-rule-tag ${poolClass}">${poolLabel}</span>
    <span class="gw-rule-tag tag-blue">${r.gridSize} pokémons</span>
  `;
}

// ── Load pokemon data ────────────────────────────────────────────────────────
async function loadPokemon() {
  if (GW.allPokemon.length > 0) return;
  const res  = await fetch('data/pokemons.json');
  const data = await res.json();
  const seen = new Set();
  GW.allPokemon = data.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
}

async function loadGlobalPokemon() {
  if (GW.globalPokemon.length > 0) return;
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
  const name = el('create-name').value.trim() || 'Player 1';
  GW.myName  = name;
  GW.myRole  = 'p1';
  GW.isHost  = true;

  const roomId = generateCode();
  GW.roomId   = roomId;

  const rules = getRulesFromUI();
  GW.rules = rules;

  const pool = await getPokemonPool();
  const seed = roomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  GW.board   = seededShuffle(pool, seed).slice(0, rules.gridSize);

  const boardData = GW.board.map(p => p.source === 'global'
    ? { name: p.name, id: p.id, source: 'global' }
    : { name: p.name }
  );

  await dbSet(`guesswho/rooms/${roomId}`, {
    createdAt: Date.now(),
    status:    'waiting',
    board:     boardData,
    rules:     rules,
    p1:        { name, ready: false, secretName: null },
    p2:        { name: null, ready: false, secretName: null },
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
    el('join-error').textContent = 'Entre un code à 6 caractères valide.';
    return;
  }

  let data;
  try {
    data = await dbGet(`guesswho/rooms/${roomId}`);
  } catch {
    el('join-error').textContent = 'Impossible de contacter le serveur.';
    return;
  }

  if (!data) {
    el('join-error').textContent = 'Salle introuvable.';
    return;
  }
  if (data.status !== 'waiting') {
    el('join-error').textContent = 'Cette salle est déjà en cours.';
    return;
  }
  if (data.p2?.name) {
    el('join-error').textContent = 'La salle est pleine.';
    return;
  }

  GW.myName  = name || 'Player 2';
  GW.myRole  = 'p2';
  GW.isHost  = false;
  GW.roomId  = roomId;
  GW.rules   = { ...DEFAULT_RULES, ...(data.rules || {}) };

  GW.board = _rebuildBoard(data.board);

  await dbUpdate(`guesswho/rooms/${roomId}/p2`, { name: GW.myName, ready: false, secretName: null });

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
    const name = prompt('Entre ton pseudo pour rejoindre la salle :') || 'Player 2';
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
    GW.oppName = (GW.myRole === 'p1' ? data.p2 : data.p1).name || '';

    if (GW.phase === 'waiting') {
      el('slot-p1-name').textContent = data.p1.name || '—';
      el('slot-p2-name').textContent = data.p2.name || 'En attente…';
      if (data.p2.name) el('dot-p2').classList.add('online');

      if (data.rules) {
        renderRulesTags(data.rules);
        if (!GW.isHost) GW.rules = { ...DEFAULT_RULES, ...data.rules };
      }

      if (GW.isHost && data.p2.name && data.status === 'waiting') {
        show('btn-host-ready');
      }
    }

    // Ready badges
    const b1 = el('badge-p1'), b2 = el('badge-p2');
    if (b1 && b2) {
      b1.textContent = data.p1.ready ? '✓ Prêt' : '';
      b1.classList.toggle('show', !!data.p1.ready);
      b2.textContent = data.p2.ready ? '✓ Prêt' : '';
      b2.classList.toggle('show', !!data.p2.ready);
    }

    // Pick dots
    const dotMe  = el('pick-dot-me');
    const dotOpp = el('pick-dot-opp');
    if (dotMe && dotOpp) {
      const mine = GW.myRole === 'p1' ? data.p1 : data.p2;
      const opp  = GW.myRole === 'p1' ? data.p2 : data.p1;
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
  }

  if (data.status === 'pick' && GW.phase === 'waiting') _enterPick(data);
  if (data.status === 'game' && GW.phase === 'pick')    _enterGame(data);
  if (data.result && GW.phase !== 'end')                _showResult(data.result);
}

// ── Host ready button ──────────────────────────────────────────────────────────
el('btn-host-ready').addEventListener('click', async () => {
  if (!GW.isHost) return;
  el('btn-host-ready').disabled = true;
  el('btn-host-ready').textContent = 'Lancement…';

  const rules = getRulesFromUI();
  GW.rules = rules;

  const pool = await getPokemonPool();
  const seed = GW.roomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  GW.board   = seededShuffle(pool, seed).slice(0, rules.gridSize);

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
  if (data.board && GW.board.length === 0) GW.board = _rebuildBoard(data.board);
  if (data.rules) GW.rules = { ...DEFAULT_RULES, ...data.rules };

  showScreen('pick');
  el('pick-me-name').textContent  = GW.myName;
  el('pick-opp-name').textContent = GW.oppName || 'Adversaire';
  _renderPickGrid();
}

function _renderPickGrid() {
  const grid = el('grid-pick');
  grid.innerHTML = '';
  const count = GW.board.length;
  grid.style.gridTemplateColumns = count > 32
    ? 'repeat(8, 1fr)'
    : count === 12
    ? 'repeat(4, 1fr)'
    : 'repeat(6, 1fr)';

  GW.board.forEach((poke, i) => {
    const card = document.createElement('div');
    card.className = 'gw-poke-card';
    card.appendChild(_makeImg(poke));
    const nameEl = document.createElement('div');
    nameEl.className = 'gw-poke-name';
    nameEl.textContent = poke.name;
    card.appendChild(nameEl);
    card.addEventListener('click', () => _selectSecret(i, card, poke));
    grid.appendChild(card);
  });
}

function _pickRandom() {
  if (GW.hasSubmittedSecret) return;
  const idx = Math.floor(Math.random() * GW.board.length);
  const card = document.querySelector(`#grid-pick .gw-poke-card:nth-child(${idx + 1})`);
  if (card) {
    // Scroll vers la carte
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Petite animation "highlight" avant sélection
    card.classList.add('random-flash');
    setTimeout(() => {
      card.classList.remove('random-flash');
      _selectSecret(idx, card, GW.board[idx]);
    }, 600);
  }
}

el('btn-random-pick').addEventListener('click', _pickRandom);

function _makeImg(poke) {
  const img = document.createElement('img');
  img.alt = poke.name;
  img.loading = 'lazy';
  img.src = poke.source === 'global' ? `${POKEAPI_SPRITE}${poke.id}.png` : spriteSrc(poke);
  return img;
}

function _selectSecret(idx, card, poke) {
  if (GW.hasSubmittedSecret) return;

  document.querySelectorAll('#grid-pick .gw-poke-card').forEach(c => 
    c.classList.remove('selected')
  );
  
  card.classList.add('selected');
  GW.mySecret = poke;

  el('picked-img').src = poke.source === 'global' 
    ? `${POKEAPI_SPRITE}${poke.id}.png` 
    : spriteSrc(poke);
  
  el('picked-name').textContent = poke.name;
  el('pick-confirm').classList.remove('hidden');
}

// Ready button (pick screen)
el('btn-ready').addEventListener('click', async () => {
  if (!GW.mySecret || GW.hasSubmittedSecret) return;

  GW.hasSubmittedSecret = true;                    // ← IMPORTANT

  el('btn-ready').disabled = true;
  el('btn-ready').textContent = 'En attente…';

  // Désactiver visuellement toutes les cartes
  document.querySelectorAll('#grid-pick .gw-poke-card').forEach(card => {
    card.style.pointerEvents = 'none';
    card.style.opacity = '0.7';
  });

  await dbUpdate(`guesswho/rooms/${GW.roomId}/${GW.myRole}`, {
    ready: true, 
    secretName: GW.mySecret.name,
  }).catch(() => {});

  // ... reste du code
});

// ── Game phase ─────────────────────────────────────────────────────────────────
function _enterGame(data) {
  GW.firstPlayer = data.firstPlayer;
  GW.eliminated  = new Set();
  GW.guessSelected = null;

  if (data.rules) GW.rules = { ...DEFAULT_RULES, ...data.rules };
  if (data.board && GW.board.length === 0) GW.board = _rebuildBoard(data.board);

  showScreen('game');

  el('game-me-name').textContent  = GW.myName;
  el('game-opp-name').textContent = GW.oppName;

  const secretImg = el('secret-img');
  secretImg.src = GW.mySecret.source === 'global'
    ? `${POKEAPI_SPRITE}${GW.mySecret.id}.png`
    : spriteSrc(GW.mySecret);
  el('secret-name').textContent = GW.mySecret.name;

  _updateTurnBanner();
  _setGridCols(el('grid-game'), GW.board.length);
  _setGridCols(el('modal-grid'), GW.board.length);
  _renderGameGrid();
  _renderModalGrid();
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
  el('turn-text').textContent = `${firstName} commence`;
}

function _renderGameGrid() {
  const grid = el('grid-game');
  grid.innerHTML = '';
  GW.board.forEach((poke, i) => {
    const card = document.createElement('div');
    card.className = 'gw-game-card';
    card.id = `game-card-${i}`;
    card.appendChild(_makeImg(poke));
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
  } else {
    GW.eliminated.add(idx);
    card.classList.add('eliminated');
  }
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
    card.appendChild(_makeImg(poke));
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
  GW.guessSelected = null;
  el('btn-confirm-guess').disabled = true;
  _renderModalGrid();
  show('modal-guess');
});

el('btn-cancel-guess').addEventListener('click', () => hide('modal-guess'));

el('btn-confirm-guess').addEventListener('click', async () => {
  if (GW.guessSelected === null) return;
  hide('modal-guess');

  const guessedPoke  = GW.board[GW.guessSelected];
  const oppRole      = GW.myRole === 'p1' ? 'p2' : 'p1';
  const oppSecretName = await dbGet(`guesswho/rooms/${GW.roomId}/${oppRole}/secretName`);
  const correct      = guessedPoke.name === oppSecretName;

  const guessEntry = { by: GW.myRole, pokemon: guessedPoke.name, correct, ts: Date.now() };

  if (correct) {
    await dbUpdate(`guesswho/rooms/${GW.roomId}`, {
      [`guesses/${Date.now()}`]: guessEntry,
      result: {
        winner: GW.myRole,
        guesser: GW.myRole,
        guessedPokemon: guessedPoke.name,
        correct: true,
      },
    });
  } else {
    await dbUpdate(`guesswho/rooms/${GW.roomId}`, {
      [`guesses/${Date.now()}`]: guessEntry,
      result: {
        winner: oppRole,
        guesser: GW.myRole,
        guessedPokemon: guessedPoke.name,
        correct: false,
      },
    });
  }
});

// ── Result ─────────────────────────────────────────────────────────────────────
function _showResult(result) {
  GW.phase = 'end';

  const iWon    = result.winner === GW.myRole;
  const iGuessed = result.guesser === GW.myRole;

  el('result-icon').textContent  = iWon ? '🏆' : '😢';
  el('result-title').textContent = iWon ? 'Tu as gagné !' : 'Tu as perdu !';

  const oppRole = GW.myRole === 'p1' ? 'p2' : 'p1';

  dbGet(`guesswho/rooms/${GW.roomId}/${oppRole}/secretName`).then(name => {
    const oppPoke = GW.board.find(p => p.name === name);

    let subText = '';
    if (iGuessed) {
      subText = result.correct
        ? `Tu as trouvé ${name} !`
        : `Tu as deviné ${result.guessedPokemon}, mais c'était ${name}.`;
    } else {
      subText = result.correct
        ? `${GW.oppName} a trouvé ton Pokémon : ${GW.mySecret?.name}.`
        : `${GW.oppName} s'est trompé — ton Pokémon était ${GW.mySecret?.name}.`;
    }
    el('result-sub').textContent = subText;

    const revealEl = el('result-reveal');
    if (oppPoke) {
      const img = _makeImg(oppPoke);
      img.style.cssText = 'width:56px;height:56px;object-fit:contain;';
      const span = document.createElement('span');
      span.innerHTML = `Pokémon de l'adversaire : <strong>${oppPoke.name}</strong>`;
      revealEl.innerHTML = '';
      revealEl.appendChild(img);
      revealEl.appendChild(span);
    }
  });

  show('modal-result');
}

// ── Play again ─────────────────────────────────────────────────────────────────
el('btn-play-again').addEventListener('click', () => {
  if (GW.sseConn) GW.sseConn.close();
  GW.roomId = null;
  GW.myRole = null;
  GW.mySecret = null;
  GW.board = [];
  GW.eliminated = new Set();
  GW.firstPlayer = null;
  GW.hasSubmittedSecret = false;
  hide('modal-result');
  hide('btn-host-ready');
  history.replaceState({}, '', location.pathname);
  showScreen('lobby');
});

// ── Copy code ──────────────────────────────────────────────────────────────────
el('btn-copy-code').addEventListener('click', () => {
  const code = el('display-room-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    el('btn-copy-code').textContent = '✓ Copié !';
    setTimeout(() => { el('btn-copy-code').textContent = '⎘ Copier'; }, 2000);
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
    el('waiting-hint').textContent = `Partage ce code avec ton ami : ${code}`;
    show('rules-edit-hint');
  } else {
    el('waiting-hint').textContent = "Connecté ! En attente du lancement par l'hôte…";
  }
}

// ── Lobby buttons ──────────────────────────────────────────────────────────────
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
    const name = el('join-name').value.trim() || 'Player 2';
    const code = el('join-code').value.trim().toUpperCase();
    await joinRoom(code, name);
  } catch (e) {
    console.error(e);
    el('join-error').textContent = 'Une erreur est survenue.';
  } finally {
    el('btn-join').disabled = false;
  }
});

el('join-code').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase();
});

// ── Boot ───────────────────────────────────────────────────────────────────────
(async () => {
  await loadPokemon();
  initRulesPanel();
  const autoJoined = await tryAutoJoin();
  if (!autoJoined) showScreen('lobby');
})();