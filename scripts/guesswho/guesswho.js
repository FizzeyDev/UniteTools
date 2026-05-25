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
const GW_COUNT  = 32;
const SPRITES_PATH = 'assets/pokemon/';

// ── State ───────────────────────────────────────────────────────────────────
const GW = {
  roomId: null,
  myRole: null,       // 'p1' | 'p2'
  myName: '',
  oppName: '',
  isHost: false,
  sseConn: null,

  // Game data
  board: [],          // Array of pokemon objects (the 24 on this game's board)
  mySecret: null,     // pokemon object I chose
  oppSecretName: null,// revealed at end
  eliminated: new Set(), // indices eliminated on MY grid
  guessSelected: null,   // index selected in guess modal

  phase: 'lobby',    // 'lobby'|'waiting'|'pick'|'game'|'end'
  firstPlayer: null, // 'p1'|'p2' — who asks first
  allPokemon: [],    // full list from JSON

  // i18n
  lang: 'fr',
  strings: {},
};

// ── i18n ─────────────────────────────────────────────────────────────────────
async function loadStrings() {
  const saved = localStorage.getItem('gw-lang') || navigator.language?.startsWith('en') ? 'en' : 'fr';
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
  // Update lang toggle button
  const btn = el('btn-lang');
  if (btn) btn.textContent = GW.lang === 'fr' ? 'EN' : 'FR';
}

function switchLang() {
  GW.lang = GW.lang === 'fr' ? 'en' : 'fr';
  localStorage.setItem('gw-lang', GW.lang);
  loadStrings();
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
  return `${SPRITES_PATH}${pokemon.file}`;
}

// ── Load pokemon data ────────────────────────────────────────────────────────
async function loadPokemon() {
  const res  = await fetch('data/pokemons.json');
  const data = await res.json();

  // Deduplicate by English name
  const seen = new Set();
  GW.allPokemon = data.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
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

  const roomId   = generateCode();
  GW.roomId      = roomId;

  // Pick the 24 pokémon for this game using the room code as seed
  const seed = roomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  GW.board   = seededShuffle(GW.allPokemon, seed).slice(0, GW_COUNT);

  await dbSet(`guesswho/rooms/${roomId}`, {
    createdAt: Date.now(),
    status:    'waiting',
    board:     GW.board.map(p => p.name),
    p1:        { name, ready: false, secretName: null },
    p2:        { name: null, ready: false, secretName: null },
    firstPlayer: null,
    guess:     null,
    result:    null,
  });

  // Subscribe
  _subscribe(roomId);

  // Update URL without reload
  history.replaceState({}, '', `?room=${roomId}`);

  // Show waiting
  el('display-room-code').textContent = roomId;
  el('slot-p1-name').textContent = name;
  showScreen('waiting');
  _updateWaitingHint();

  // Cleanup room after 4h
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

  // Rebuild board from the saved names
  GW.board = data.board.map(n => GW.allPokemon.find(p => p.name === n)).filter(Boolean);

  await dbUpdate(`guesswho/rooms/${roomId}/p2`, { name: GW.myName, ready: false, secretName: null });

  _subscribe(roomId);
  history.replaceState({}, '', `?room=${roomId}`);

  // Show waiting with both names
  el('display-room-code').textContent = roomId;
  el('slot-p1-name').textContent = data.p1.name;
  el('slot-p2-name').textContent = GW.myName;
  el('dot-p2').classList.add('online');
  showScreen('waiting');
  _updateWaitingHint();
}

// ── Auto-join from URL ─────────────────────────────────────────────────────────
async function tryAutoJoin() {
  const code = getRoomFromURL();
  if (!code) return false;

  let data;
  try { data = await dbGet(`guesswho/rooms/${code}`); } catch { return false; }
  if (!data || data.status === 'expired') return false;

  // If room is waiting and p2 slot free → prompt name and join as p2
  if (data.status === 'waiting' && !data.p2?.name) {
    const name = prompt(t('gw_join_prompt', 'Enter your name to join the room:')) || t('gw_default_player2', 'Player 2');
    el('join-name').value = name;
    el('join-code').value = code;
    await joinRoom(code, name);
    return true;
  }

  // Otherwise spectator / already playing — just show lobby
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

  // Update opponent name in waiting
  if (data.p1 && data.p2) {
    const opp  = GW.myRole === 'p1' ? data.p2 : data.p1;
    const mine = GW.myRole === 'p1' ? data.p1 : data.p2;
    GW.oppName = opp.name || '';

    if (GW.phase === 'waiting') {
      el('slot-p1-name').textContent = data.p1.name || '—';
      el('slot-p2-name').textContent = data.p2.name || t('gw_waiting_dots', 'Waiting…');
      if (data.p2.name) el('dot-p2').classList.add('online');

      // Both in → move to pick phase
      if (data.p1.name && data.p2.name && data.status === 'waiting') {
        // Host triggers transition
        if (GW.isHost) {
          dbUpdate(`guesswho/rooms/${GW.roomId}`, { status: 'pick' }).catch(() => {});
        }
      }
    }

    // Ready badges in waiting
    const b1 = el('badge-p1'), b2 = el('badge-p2');
    if (b1 && b2) {
      b1.textContent = data.p1.ready ? t('gw_ready', '✓ Ready') : '';
      b1.classList.toggle('show', !!data.p1.ready);
      b2.textContent = data.p2.ready ? t('gw_ready', '✓ Ready') : '';
      b2.classList.toggle('show', !!data.p2.ready);
    }

    // Pick status dots
    const dotMe  = el('pick-dot-me');
    const dotOpp = el('pick-dot-opp');
    if (dotMe && dotOpp) {
      const myReady  = mine.ready;
      const oppReady = opp.ready;
      dotMe.classList.toggle('chosen', !!myReady);
      dotOpp.classList.toggle('chosen', !!oppReady);
    }

    // ── FIX: Host watches for both players ready in pick phase ──────────────
    // This handles the case where P1 goes ready first (setTimeout already
    // fired and saw P2 not ready). Now whenever any update arrives, the host
    // re-checks. The guard `data.status === 'pick'` prevents double-firing.
    if (GW.isHost && data.status === 'pick' && GW.phase === 'pick') {
      if (data.p1?.ready && data.p2?.ready) {
        const first = Math.random() < 0.5 ? 'p1' : 'p2';
        dbUpdate(`guesswho/rooms/${GW.roomId}`, {
          status: 'game',
          firstPlayer: first,
        }).catch(() => {});
      }
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
  if (data.guess && data.guess.by !== GW.myRole && GW.phase === 'game') {
    _handleOpponentGuess(data.guess, data);
  }

  // Result
  if (data.result && GW.phase !== 'end') {
    _showResult(data.result);
  }
}

// ── Pick phase ─────────────────────────────────────────────────────────────────
function _enterPick(data) {
  // Rebuild board if needed (p2 joining mid-flow)
  if (data.board && GW.board.length === 0) {
    GW.board = data.board.map(n => GW.allPokemon.find(p => p.name === n)).filter(Boolean);
  }

  showScreen('pick');
  el('pick-me-name').textContent  = GW.myName;
  el('pick-opp-name').textContent = GW.oppName || t('gw_opponent', 'Opponent');

  _renderPickGrid();
}

function _renderPickGrid() {
  const grid = el('grid-pick');
  grid.innerHTML = '';
  GW.board.forEach((poke, i) => {
    const card = document.createElement('div');
    card.className = 'gw-poke-card';
    card.innerHTML = `<img src="${spriteSrc(poke)}" alt="${poke.name}" loading="lazy">
                      <div class="gw-poke-name">${poke.name}</div>`;
    card.addEventListener('click', () => _selectSecret(i, card, poke));
    grid.appendChild(card);
  });
}

function _selectSecret(idx, card, poke) {
  // Deselect previous
  document.querySelectorAll('#grid-pick .gw-poke-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  GW.mySecret = poke;

  // Show confirm bar
  el('picked-img').src = spriteSrc(poke);
  el('picked-name').textContent = poke.name;
  el('pick-confirm').classList.remove('hidden');
}

// Ready button
el('btn-ready').addEventListener('click', async () => {
  if (!GW.mySecret) return;
  el('btn-ready').disabled = true;
  el('btn-ready').textContent = t('gw_waiting_opp', 'Waiting for opponent…');

  // Mark ready + save secret name (for reveal at end)
  const roleData = { ready: true, secretName: GW.mySecret.name };
  await dbUpdate(`guesswho/rooms/${GW.roomId}/${GW.myRole}`, roleData).catch(() => {});

  // ── FIX: Host does an immediate check after marking self ready,
  // then the SSE listener (_onRoomUpdate) will handle the case where
  // the opponent was already ready before us.
  // The old setTimeout approach could miss the window entirely.
  if (GW.isHost) {
    try {
      const roomData = await dbGet(`guesswho/rooms/${GW.roomId}`);
      // Merge our just-written ready state since Firebase might lag
      const p1Ready = GW.myRole === 'p1' ? true : roomData?.p1?.ready;
      const p2Ready = GW.myRole === 'p2' ? true : roomData?.p2?.ready;
      if (p1Ready && p2Ready) {
        const first = Math.random() < 0.5 ? 'p1' : 'p2';
        await dbUpdate(`guesswho/rooms/${GW.roomId}`, {
          status: 'game',
          firstPlayer: first,
        });
      }
    } catch (e) {
      console.warn('[GW] host ready check failed', e);
    }
  }
});

// ── Game phase ─────────────────────────────────────────────────────────────────
function _enterGame(data) {
  GW.firstPlayer = data.firstPlayer;
  GW.eliminated  = new Set();
  showScreen('game');

  // Names
  el('game-me-name').textContent  = GW.myName;
  el('game-opp-name').textContent = GW.oppName;

  // Secret reminder
  el('secret-img').src   = spriteSrc(GW.mySecret);
  el('secret-name').textContent = GW.mySecret.name;

  // Turn banner
  _updateTurnBanner();

  // Render game grid
  _renderGameGrid();

  // Render guess modal grid
  _renderModalGrid();
}

function _updateTurnBanner() {
  const first = GW.firstPlayer;
  const firstName = first === GW.myRole ? GW.myName : GW.oppName;
  el('turn-text').textContent = t('gw_asks_first', '{name} asks first').replace('{name}', firstName);
}

function _renderGameGrid() {
  const grid = el('grid-game');
  grid.innerHTML = '';
  GW.board.forEach((poke, i) => {
    const card = document.createElement('div');
    card.className = 'gw-game-card';
    card.id = `game-card-${i}`;
    card.innerHTML = `<img src="${spriteSrc(poke)}" alt="${poke.name}" loading="lazy">
                      <div class="gw-poke-name">${poke.name}</div>`;
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
  GW.board.forEach((poke, i) => {
    const card = document.createElement('div');
    card.className = 'gw-modal-card' + (GW.eliminated.has(i) ? ' eliminated-hint' : '');
    card.id = `modal-card-${i}`;
    card.innerHTML = `<img src="${spriteSrc(poke)}" alt="${poke.name}" loading="lazy">
                      <div class="gw-poke-name">${poke.name}</div>`;
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
  // Re-render to reflect current eliminated state
  _renderModalGrid();
  show('modal-guess');
});

el('btn-cancel-guess').addEventListener('click', () => hide('modal-guess'));

el('btn-confirm-guess').addEventListener('click', async () => {
  if (GW.guessSelected === null) return;
  hide('modal-guess');

  const guessedPoke = GW.board[GW.guessSelected];
  const oppRole = GW.myRole === 'p1' ? 'p2' : 'p1';
  const correct = guessedPoke.name === (await dbGet(`guesswho/rooms/${GW.roomId}/${oppRole}/secretName`));

  await dbUpdate(`guesswho/rooms/${GW.roomId}`, {
    guess: {
      by:      GW.myRole,
      pokemon: guessedPoke.name,
    },
    result: {
      winner:         correct ? GW.myRole : oppRole,
      guesser:        GW.myRole,
      guessedPokemon: guessedPoke.name,
      correct,
    },
  });
});

// ── Handle opponent guess ──────────────────────────────────────────────────────
function _handleOpponentGuess(guess, data) {
  // Result will trigger _showResult via SSE
}

// ── Result ─────────────────────────────────────────────────────────────────────
function _showResult(result) {
  GW.phase = 'end';

  const iWon   = result.winner === GW.myRole;
  const iGuessed = result.guesser === GW.myRole;

  el('result-icon').textContent  = iWon ? '🏆' : '😢';
  el('result-title').textContent = iWon ? t('gw_you_win', 'You win!') : t('gw_you_lose', 'You lose!');

  // Reveal opponent's secret
  const oppRole = GW.myRole === 'p1' ? 'p2' : 'p1';

  dbGet(`guesswho/rooms/${GW.roomId}/${oppRole}/secretName`).then(name => {
    const oppPoke = GW.allPokemon.find(p => p.name === name);

    let subText = '';
    if (iGuessed) {
      subText = result.correct
        ? t('gw_result_correct_guess', 'You correctly guessed {name}!').replace('{name}', name)
        : t('gw_result_wrong_guess', 'You guessed {guess}, but it was {name}.').replace('{guess}', result.guessedPokemon).replace('{name}', name);
    } else {
      subText = result.correct
        ? t('gw_result_opp_correct', '{opp} correctly guessed {name}.').replace('{opp}', GW.oppName).replace('{name}', GW.mySecret?.name)
        : t('gw_result_opp_wrong', '{opp} guessed wrong — your Pokémon was {name}.').replace('{opp}', GW.oppName).replace('{name}', GW.mySecret?.name);
    }
    el('result-sub').textContent = subText;

    const revealEl = el('result-reveal');
    if (oppPoke) {
      revealEl.innerHTML = `
        <img src="${spriteSrc(oppPoke)}" alt="${oppPoke.name}">
        <span>${t('gw_opp_pokemon', "Opponent's Pokémon:")} <strong>${oppPoke.name}</strong></span>
      `;
    }
  });

  show('modal-result');
}

// Play again — go back to lobby
el('btn-play-again').addEventListener('click', () => {
  if (GW.sseConn) GW.sseConn.close();
  GW.roomId = null;
  GW.myRole = null;
  GW.mySecret = null;
  GW.board = [];
  GW.eliminated = new Set();
  GW.firstPlayer = null;
  hide('modal-result');
  history.replaceState({}, '', location.pathname);
  showScreen('lobby');
});

// ── Copy code ──────────────────────────────────────────────────────────────────
el('btn-copy-code').addEventListener('click', () => {
  const code = el('display-room-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    el('btn-copy-code').textContent = t('gw_copied', '✓ Copied!');
    setTimeout(() => { el('btn-copy-code').textContent = t('gw_copy', '⎘ Copy'); }, 2000);
  });
});

// ── Lang toggle ────────────────────────────────────────────────────────────────
el('btn-lang')?.addEventListener('click', switchLang);

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
    el('waiting-hint').textContent = t('gw_waiting_hint_host', `Share this code with your friend: ${code}`).replace('{code}', code);
  } else {
    el('waiting-hint').textContent = t('gw_waiting_hint_guest', 'Connected! Waiting for the host to start…');
  }
}

// ── Lobby button events ────────────────────────────────────────────────────────
el('btn-create').addEventListener('click', async () => {
  el('btn-create').disabled = true;
  try {
    await loadPokemon();
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

// Code input auto-uppercase
el('join-code').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase();
});

// ── Boot ───────────────────────────────────────────────────────────────────────
(async () => {
  await loadStrings();
  await loadPokemon();
  const autoJoined = await tryAutoJoin();
  if (!autoJoined) {
    showScreen('lobby');
  }
})();