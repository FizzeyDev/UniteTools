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

/**
 * Robust SSE listener with exponential backoff + polling fallback.
 * Optimisation : on parse directement les données SSE au lieu de refaire un dbGet.
 */
function dbListen(path, callback) {
  let es = null;
  let pollTimer = null;
  let reconnectDelay = 1000;
  let failCount = 0;
  const POLL_INTERVAL = 5000;
  const MAX_FAIL_BEFORE_POLL = 3;

  async function poll() {
    try {
      const data = await dbGet(path);
      if (data) callback(data);
    } catch (e) {
      console.warn('[GW] poll failed', e);
    }
  }

  function startPolling() {
    if (pollTimer) return;
    console.warn('[GW] SSE unreliable, switching to polling');
    pollTimer = setInterval(poll, POLL_INTERVAL);
    poll();
  }

  function connect() {
    if (es) { try { es.close(); } catch {} }
    es = new EventSource(`${DATABASE_URL}/${path}.json`);

    es.addEventListener('put', (e) => {
      failCount = 0;
      reconnectDelay = 1000;
      try {
        const payload = JSON.parse(e.data);
        // payload.path === '/' → données complètes, sinon update partiel
        if (payload?.path === '/' && payload?.data) {
          callback(payload.data);
        } else {
          // update partiel : on refait un get mais sans attendre la réponse précédente
          dbGet(path).then(full => { if (full) callback(full); }).catch(() => {});
        }
      } catch {
        dbGet(path).then(full => { if (full) callback(full); }).catch(() => {});
      }
    });

    es.addEventListener('patch', () => {
      failCount = 0;
      dbGet(path).then(full => { if (full) callback(full); }).catch(() => {});
    });

    es.onerror = () => {
      failCount++;
      console.warn(`[GW] SSE error #${failCount}, reconnecting in ${reconnectDelay}ms…`);
      try { es.close(); } catch {}
      if (failCount >= MAX_FAIL_BEFORE_POLL) startPolling();
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    };
  }

  connect();
  return {
    close() {
      try { es?.close(); } catch {}
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }
  };
}

// ── i18n ─────────────────────────────────────────────────────────────────────
const I18N = {};
let _lang = 'fr';

async function loadI18n() {
  const browserLang = navigator.language?.startsWith('en') ? 'en' : 'fr';
  _lang = browserLang;
  try {
    const res = await fetch(`i18n/${_lang}.json`);
    const data = await res.json();
    Object.assign(I18N, data);
  } catch {
    Object.assign(I18N, {
      gw_random_pick:            '🎲 Choisir au hasard',
      gw_ready_btn:              'Je suis prêt·e !',
      gw_play_again:             'Rejouer',
      gw_play_again_waiting:     "En attente de l'adversaire…",
      gw_copy:                   '⎘ Copier',
      gw_copy_done:              '✓ Copié !',
      gw_waiting_hint_host:      'Partage ce code avec ton ami : {code}',
      gw_waiting_hint_guest:     "Connecté ! En attente du lancement par l'hôte…",
      gw_result_correct_guesser: 'Tu as trouvé {pokemon} !',
      gw_result_wrong_guesser:   "Tu as deviné {guessed}, mais c'était {secret}.",
      gw_result_opp_correct:     'L\'adversaire a trouvé ton Pokémon : {secret}.',
      gw_result_opp_wrong:       "L'adversaire s'est trompé — ton Pokémon était {secret}.",
      gw_opp_pokemon_label:      "Pokémon de l'adversaire : ",
      gw_you_win:                'Tu as gagné !',
      gw_you_lose:               'Tu as perdu !',
      gw_opponent:               'Adversaire',
      gw_you:                    'Toi',
      gw_host_ready:             'Lancer la partie !',
      gw_waiting_dots:           'En attente…',
      gw_secret_label:           'Ton Pokémon secret :',
      gw_guess_btn:              '🎯 Faire une supposition',
      gw_cancel:                 'Annuler',
      gw_confirm_guess:          'Confirmer',
      gw_modal_guess_title:      'Quel est le Pokémon de ton adversaire ?',
      gw_htp_close:              "C'est parti !",
    });
  }
  applyI18nDOM();
}

function t(key, vars = {}) {
  let str = I18N[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

function applyI18nDOM() {
  document.querySelectorAll('[data-lang]').forEach(el => {
    const key = el.dataset.lang;
    if (I18N[key]) el.textContent = I18N[key];
  });
  document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
    const key = el.dataset.langPlaceholder;
    if (I18N[key]) el.placeholder = I18N[key];
  });
}

// ── Constants ───────────────────────────────────────────────────────────────
const SPRITES_PATH   = 'assets/pokemon/';
const POKEAPI_SPRITE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

const DEFAULT_RULES = {
  pool:     'unite',
  gridSize: 24,
};

// ── State ───────────────────────────────────────────────────────────────────
const GW = {
  roomId:           null,
  myRole:           null,
  myName:           '',
  oppName:          '',
  isHost:           false,
  sseConn:          null,

  board:            [],
  mySecret:         null,
  hasSubmittedSecret: false,
  eliminated:       new Set(),
  guessSelected:    null,

  phase:            'lobby',
  firstPlayer:      null,
  allPokemon:       [],
  globalPokemon:    [],

  rules:            { ...DEFAULT_RULES },

  // FIX rejouer : verrous pour éviter les double-calls
  rematchReady:     false,
  _doingRematch:    false,
  _resultShown:     false,
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

function show(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id)  { document.getElementById(id)?.classList.add('hidden'); }
function el(id)    { return document.getElementById(id); }

function showScreen(name) {
  ['lobby', 'waiting', 'pick', 'game'].forEach(s => {
    document.getElementById(`screen-${s}`)?.classList.add('hidden');
  });
  document.getElementById(`screen-${name}`)?.classList.remove('hidden');
  GW.phase = name;
}

function spriteSrc(pokemon) {
  if (pokemon.source === 'global') return `${POKEAPI_SPRITE}${pokemon.id}.png`;
  return `${SPRITES_PATH}${pokemon.file}`;
}

// ── Rules UI ─────────────────────────────────────────────────────────────────
function initRulesPanel() {
  [
    ['rule-pool',        'pool'],
    ['rule-grid-size',   'gridSize'],
    ['rule-pool-w',      'pool'],
    ['rule-grid-size-w', 'gridSize'],
  ].forEach(([groupId, key]) => {
    const group = el(groupId);
    if (!group) return;
    group.querySelectorAll('.gw-rule-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        // FIX : seul l'host peut changer les règles
        if (!GW.isHost && GW.phase !== 'lobby') return;

        group.querySelectorAll('.gw-rule-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        let val = btn.dataset.value;
        if (key === 'gridSize') val = parseInt(val);
        GW.rules[key] = val;

        // Sync le panel miroir (lobby ↔ waiting)
        const mirror = {
          'rule-pool':        'rule-pool-w',
          'rule-pool-w':      'rule-pool',
          'rule-grid-size':   'rule-grid-size-w',
          'rule-grid-size-w': 'rule-grid-size',
        }[groupId];
        if (mirror) setActiveToggle(mirror, btn.dataset.value);

        // FIX : push les règles dans Firebase si on est en waiting (host)
        if (GW.isHost && GW.roomId && GW.phase === 'waiting') {
          dbUpdate(`guesswho/rooms/${GW.roomId}`, { rules: GW.rules }).catch(() => {});
        }
      });
    });
  });
}

// FIX : désactive les toggles pour le guest en waiting
function _setRuleToggleInteractivity() {
  const canEdit = GW.isHost;
  ['rule-pool', 'rule-grid-size', 'rule-pool-w', 'rule-grid-size-w'].forEach(groupId => {
    const group = el(groupId);
    if (!group) return;
    group.querySelectorAll('.gw-rule-toggle').forEach(btn => {
      btn.disabled = !canEdit;
      btn.style.opacity = canEdit ? '' : '0.4';
      btn.style.cursor  = canEdit ? '' : 'not-allowed';
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

function getRulesFromUI() { return { ...GW.rules }; }

function applyRulesToUI(rules) {
  if (!rules) return;
  GW.rules = { ...DEFAULT_RULES, ...rules };
  setActiveToggle('rule-pool',        GW.rules.pool);
  setActiveToggle('rule-grid-size',   String(GW.rules.gridSize));
  setActiveToggle('rule-pool-w',      GW.rules.pool);
  setActiveToggle('rule-grid-size-w', String(GW.rules.gridSize));
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
  const res  = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0`);
  const data = await res.json();
  GW.globalPokemon = data.results.map((p, i) => ({
    name:   capitalise(p.name.replace(/-/g, ' ')),
    id:     i + 1,
    source: 'global',
    file:   null,
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

// ── Board helpers ─────────────────────────────────────────────────────────────
function _buildBoard(pool, seed, gridSize) {
  return seededShuffle(pool, seed).slice(0, gridSize);
}

function _rebuildBoard(boardData) {
  if (!boardData) return [];
  const arr = Array.isArray(boardData) ? boardData : Object.values(boardData);
  return arr.map(entry => {
    if (!entry) return null;
    if (entry.source === 'global') {
      return { name: entry.name, id: entry.id, source: 'global', file: null };
    }
    return GW.allPokemon.find(p => p.name === entry.name) || { name: entry.name, file: null };
  }).filter(Boolean);
}

function _boardToData(board) {
  return board.map(p => p.source === 'global'
    ? { name: p.name, id: p.id, source: 'global' }
    : { name: p.name }
  );
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
  GW.rules    = rules;

  const pool  = await getPokemonPool();
  const seed  = roomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  GW.board    = _buildBoard(pool, seed, rules.gridSize);

  await dbSet(`guesswho/rooms/${roomId}`, {
    createdAt:   Date.now(),
    status:      'waiting',
    board:       _boardToData(GW.board),
    rules:       rules,
    p1:          { name, ready: false, secretName: null, rematch: false },
    p2:          { name: null, ready: false, secretName: null, rematch: false },
    firstPlayer: null,
    result:      null,
  });

  _subscribe(roomId);
  history.replaceState({}, '', `?room=${roomId}`);

  el('display-room-code').textContent = roomId;
  el('slot-p1-name').textContent      = name;
  showScreen('waiting');
  renderRulesTags(rules);
  show('rules-summary');
  _updateWaitingHint();
  _setRuleToggleInteractivity();

  setTimeout(() => dbSet(`guesswho/rooms/${roomId}/status`, 'expired').catch(() => {}), 4 * 3600 * 1000);
}

// ── Join room ──────────────────────────────────────────────────────────────────
async function joinRoom(code, name) {
  const roomId = code.trim().toUpperCase();
  if (!roomId || roomId.length !== 6) {
    el('join-error').textContent = t('gw_error_invalid_code');
    return;
  }

  let data;
  try { data = await dbGet(`guesswho/rooms/${roomId}`); }
  catch { el('join-error').textContent = t('gw_error_server'); return; }

  if (!data)                    { el('join-error').textContent = t('gw_error_not_found');    return; }
  if (data.status === 'expired'){ el('join-error').textContent = t('gw_error_not_found');    return; }
  if (!['waiting', 'rematch'].includes(data.status)) {
    el('join-error').textContent = t('gw_error_in_progress');
    return;
  }
  if (data.p2?.name)            { el('join-error').textContent = t('gw_error_full');         return; }

  GW.myName  = name || 'Player 2';
  GW.myRole  = 'p2';
  GW.isHost  = false;
  GW.roomId  = roomId;
  GW.rules   = { ...DEFAULT_RULES, ...(data.rules || {}) };
  GW.board   = _rebuildBoard(data.board);

  await dbUpdate(`guesswho/rooms/${roomId}/p2`, {
    name: GW.myName, ready: false, secretName: null, rematch: false,
  });

  _subscribe(roomId);
  history.replaceState({}, '', `?room=${roomId}`);

  el('display-room-code').textContent = roomId;
  el('slot-p1-name').textContent      = data.p1?.name || '—';
  el('slot-p2-name').textContent      = GW.myName;
  el('dot-p2').classList.add('online');
  showScreen('waiting');
  renderRulesTags(GW.rules);
  show('rules-summary');
  _updateWaitingHint();
  _setRuleToggleInteractivity();
}

// ── Auto-join from URL ─────────────────────────────────────────────────────────
async function tryAutoJoin() {
  const code = getRoomFromURL();
  if (!code) return false;

  let data;
  try { data = await dbGet(`guesswho/rooms/${code}`); } catch { return false; }
  if (!data || data.status === 'expired') return false;

  if (['waiting', 'rematch'].includes(data.status) && !data.p2?.name) {
    const name = prompt(t('gw_join_prompt')) || 'Player 2';
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
let _transitioning = false;

function _onRoomUpdate(data) {
  if (!data || typeof data !== 'object') return;
  if (_transitioning) return;

  const p1 = data.p1 || {};
  const p2 = data.p2 || {};

  GW.oppName = (GW.myRole === 'p1' ? p2 : p1).name || GW.oppName;

  // ── Waiting screen ──────────────────────────────────────────────────────────
  if (GW.phase === 'waiting') {
    el('slot-p1-name').textContent = p1.name || '—';
    el('slot-p2-name').textContent = p2.name || t('gw_waiting_dots');
    if (p2.name) el('dot-p2')?.classList.add('online');

    // FIX : sync rules en temps réel pour le guest (l'host pousse via dbUpdate)
    if (data.rules) {
      if (!GW.isHost) {
        applyRulesToUI(data.rules);
      }
      renderRulesTags(data.rules);
    }

    if (GW.isHost && p2.name && data.status === 'waiting') {
      show('btn-host-ready');
    }

    _syncReadyBadges(p1, p2);
  }

  // ── Pick screen ─────────────────────────────────────────────────────────────
  if (GW.phase === 'pick') {
    const mine = GW.myRole === 'p1' ? p1 : p2;
    const opp  = GW.myRole === 'p1' ? p2 : p1;
    el('pick-dot-me')?.classList.toggle('chosen', !!mine.ready);
    el('pick-dot-opp')?.classList.toggle('chosen', !!opp.ready);
    if (GW.isHost && p1.ready && p2.ready && data.status === 'pick') {
      _hostCheckBothReady();
    }
  }

  // ── Rematch waiting ─────────────────────────────────────────────────────────
  if (GW.phase === 'rematch_wait') {
    const opp = GW.myRole === 'p1' ? p2 : p1;
    // FIX : vérrou pour éviter double appel
    if (opp.rematch && GW.isHost && !GW._doingRematch) {
      _doRematch(data);
    }
  }

  // ── Status transitions ──────────────────────────────────────────────────────
  const status = data.status;

  if (status === 'pick' && GW.phase === 'waiting') {
    _transitioning = true;
    _enterPick(data);
    _transitioning = false;
    return;
  }

  if (status === 'game' && GW.phase === 'pick') {
    _transitioning = true;
    _enterGame(data);
    _transitioning = false;
    return;
  }

  // FIX rejouer : accepte 'end', 'rematch_wait' ET 'game' (cas résultat affiché)
  if (status === 'waiting' && ['rematch_wait', 'end', 'game'].includes(GW.phase)) {
    _transitioning = true;
    _enterWaitingRematch(data);
    _transitioning = false;
    return;
  }

  // FIX : n'affiche le résultat qu'une seule fois et seulement en phase 'game'
  if (data.result && GW.phase === 'game' && !GW._resultShown) {
    GW._resultShown = true;
    _showResult(data.result);
  }
}

function _syncReadyBadges(p1, p2) {
  const b1 = el('badge-p1'), b2 = el('badge-p2');
  if (!b1 || !b2) return;
  b1.textContent = p1.ready ? t('gw_ready') : '';
  b1.classList.toggle('show', !!p1.ready);
  b2.textContent = p2.ready ? t('gw_ready') : '';
  b2.classList.toggle('show', !!p2.ready);
}

// ── Host ready button ──────────────────────────────────────────────────────────
el('btn-host-ready').addEventListener('click', async () => {
  if (!GW.isHost) return;
  const btn = el('btn-host-ready');
  btn.disabled    = true;
  btn.textContent = t('gw_launching') || 'Lancement…';

  const rules = getRulesFromUI();
  GW.rules = rules;

  const pool = await getPokemonPool();
  const seed = GW.roomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) ^ Date.now();
  GW.board   = _buildBoard(pool, seed, rules.gridSize);

  await dbUpdate(`guesswho/rooms/${GW.roomId}`, {
    status:          'pick',
    board:           _boardToData(GW.board),
    rules:           rules,
    'p1/ready':      false,
    'p1/secretName': null,
    'p2/ready':      false,
    'p2/secretName': null,
  }).catch(() => {});
});

// ── Pick phase ─────────────────────────────────────────────────────────────────
function _enterPick(data) {
  if (data.board) GW.board = _rebuildBoard(data.board);
  if (data.rules) GW.rules = { ...DEFAULT_RULES, ...data.rules };

  GW.mySecret           = null;
  GW.hasSubmittedSecret = false;

  showScreen('pick');
  el('pick-me-name').textContent  = GW.myName;
  el('pick-opp-name').textContent = GW.oppName || t('gw_opponent');
  el('pick-dot-me')?.classList.remove('chosen');
  el('pick-dot-opp')?.classList.remove('chosen');
  hide('pick-confirm');

  const btnReady = el('btn-ready');
  btnReady.disabled    = false;
  btnReady.textContent = t('gw_ready_btn');

  const randomBtn = el('btn-random-pick');
  if (randomBtn) randomBtn.disabled = false;

  _renderPickGrid();
}

function _renderPickGrid() {
  const grid = el('grid-pick');
  grid.innerHTML = '';
  const count = GW.board.length;
  grid.style.gridTemplateColumns = count > 32 ? 'repeat(8, 1fr)' : count === 12 ? 'repeat(4, 1fr)' : 'repeat(6, 1fr)';

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

function _makeImg(poke) {
  const img = document.createElement('img');
  img.alt     = poke.name;
  img.loading = 'lazy';
  img.src     = poke.source === 'global' ? `${POKEAPI_SPRITE}${poke.id}.png` : spriteSrc(poke);
  return img;
}

function _selectSecret(idx, card, poke) {
  if (GW.hasSubmittedSecret) return;

  document.querySelectorAll('#grid-pick .gw-poke-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  GW.mySecret = poke;

  el('picked-img').src          = poke.source === 'global' ? `${POKEAPI_SPRITE}${poke.id}.png` : spriteSrc(poke);
  el('picked-name').textContent = poke.name;
  el('pick-confirm').classList.remove('hidden');
}

// ── Random pick button ────────────────────────────────────────────────────────
el('btn-random-pick')?.addEventListener('click', () => {
  if (GW.hasSubmittedSecret || !GW.board.length) return;

  const idx  = Math.floor(Math.random() * GW.board.length);
  const card = document.querySelectorAll('#grid-pick .gw-poke-card')[idx];
  if (!card) return;

  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('random-flash');
  setTimeout(() => {
    card.classList.remove('random-flash');
    _selectSecret(idx, card, GW.board[idx]);
  }, 600);
});

// ── Ready button ───────────────────────────────────────────────────────────────
el('btn-ready').addEventListener('click', async () => {
  if (!GW.mySecret || GW.hasSubmittedSecret) return;

  GW.hasSubmittedSecret = true;

  const btn = el('btn-ready');
  btn.disabled    = true;
  btn.textContent = t('gw_play_again_waiting');

  document.querySelectorAll('#grid-pick .gw-poke-card').forEach(card => {
    card.style.pointerEvents = 'none';
    card.style.opacity = card.classList.contains('selected') ? '1' : '0.4';
  });
  const randomBtn = el('btn-random-pick');
  if (randomBtn) randomBtn.disabled = true;

  await dbUpdate(`guesswho/rooms/${GW.roomId}/${GW.myRole}`, {
    ready: true, secretName: GW.mySecret.name,
  }).catch(() => {});

  if (GW.isHost) _hostCheckBothReady();
});

async function _hostCheckBothReady() {
  try {
    const roomData = await dbGet(`guesswho/rooms/${GW.roomId}`);
    if (roomData?.p1?.ready && roomData?.p2?.ready && roomData?.status === 'pick') {
      const first = Math.random() < 0.5 ? 'p1' : 'p2';
      await dbUpdate(`guesswho/rooms/${GW.roomId}`, { status: 'game', firstPlayer: first });
    }
  } catch (e) {
    console.warn('[GW] host ready check failed', e);
  }
}

// ── Game phase ─────────────────────────────────────────────────────────────────
function _enterGame(data) {
  GW.firstPlayer   = data.firstPlayer;
  GW.eliminated    = new Set();
  GW.guessSelected = null;
  // FIX : reset le flag résultat à chaque nouvelle partie
  GW._resultShown  = false;

  if (data.rules) GW.rules = { ...DEFAULT_RULES, ...data.rules };
  if (data.board) GW.board = _rebuildBoard(data.board);

  showScreen('game');

  el('game-me-name').textContent  = GW.myName;
  el('game-opp-name').textContent = GW.oppName;

  const secretImg = el('secret-img');
  secretImg.src = GW.mySecret.source === 'global'
    ? `${POKEAPI_SPRITE}${GW.mySecret.id}.png`
    : spriteSrc(GW.mySecret);
  el('secret-name').textContent = GW.mySecret.name;

  el('btn-open-guess').disabled = false;
  _updateTurnBanner();
  _setGridCols(el('grid-game'),  GW.board.length);
  _setGridCols(el('modal-grid'), GW.board.length);
  _renderGameGrid();
  _renderModalGrid();
}

function _setGridCols(gridEl, count) {
  if (!gridEl) return;
  gridEl.style.gridTemplateColumns = count > 32 ? 'repeat(8, 1fr)' : count === 12 ? 'repeat(4, 1fr)' : 'repeat(6, 1fr)';
}

function _updateTurnBanner() {
  const firstName = GW.firstPlayer === GW.myRole ? GW.myName : GW.oppName;
  el('turn-text').textContent = `${firstName} ${t('gw_asks_first') ? t('gw_asks_first').replace('{name}', '').trim() : 'commence'}`;
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
  el(`modal-card-${idx}`)?.classList.add('selected');
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

  // FIX : désactive immédiatement pour éviter double-submit
  el('btn-confirm-guess').disabled = true;
  hide('modal-guess');

  const guessedPoke = GW.board[GW.guessSelected];
  const oppRole     = GW.myRole === 'p1' ? 'p2' : 'p1';

  let oppSecretName;
  try {
    oppSecretName = await dbGet(`guesswho/rooms/${GW.roomId}/${oppRole}/secretName`);
  } catch {
    console.error('[GW] could not fetch opponent secret');
    return;
  }

  const correct    = guessedPoke.name === oppSecretName;
  const winner     = correct ? GW.myRole : oppRole;
  const guessEntry = { by: GW.myRole, pokemon: guessedPoke.name, correct, ts: Date.now() };

  await dbUpdate(`guesswho/rooms/${GW.roomId}`, {
    [`guesses/${Date.now()}`]: guessEntry,
    result: {
      winner,
      guesser:        GW.myRole,
      guessedPokemon: guessedPoke.name,
      correct,
    },
  }).catch(e => console.error('[GW] guess write failed', e));
});

// ── Result ─────────────────────────────────────────────────────────────────────
function _showResult(result) {
  // FIX : n'affiche que depuis la phase game (pas depuis end/rematch_wait)
  GW.phase = 'end';

  const iWon     = result.winner  === GW.myRole;
  const iGuessed = result.guesser === GW.myRole;
  const oppRole  = GW.myRole === 'p1' ? 'p2' : 'p1';

  el('result-icon').textContent  = iWon ? '🏆' : '😢';
  el('result-title').textContent = iWon ? t('gw_you_win') : t('gw_you_lose');

  const btnPA = el('btn-play-again');
  btnPA.disabled    = false;
  btnPA.textContent = t('gw_play_again');

  dbGet(`guesswho/rooms/${GW.roomId}/${oppRole}/secretName`).then(name => {
    let subText = '';
    if (iGuessed) {
      subText = result.correct
        ? t('gw_result_correct_guesser', { pokemon: name })
        : t('gw_result_wrong_guesser',   { guessed: result.guessedPokemon, secret: name });
    } else {
      subText = result.correct
        ? t('gw_result_opp_correct', { opp: GW.oppName, secret: GW.mySecret?.name })
        : t('gw_result_opp_wrong',   { opp: GW.oppName, secret: GW.mySecret?.name });
    }
    el('result-sub').textContent = subText;

    const oppPoke   = GW.board.find(p => p.name === name);
    const revealEl  = el('result-reveal');
    revealEl.innerHTML = '';
    if (oppPoke) {
      const img  = _makeImg(oppPoke);
      img.style.cssText = 'width:56px;height:56px;object-fit:contain;';
      const span   = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = oppPoke.name;
      span.textContent   = t('gw_opp_pokemon_label');
      span.appendChild(strong);
      revealEl.appendChild(img);
      revealEl.appendChild(span);
    }
  }).catch(() => {});

  show('modal-result');
}

// ── Play again (rematch dans la même salle) ────────────────────────────────────
el('btn-play-again').addEventListener('click', async () => {
  const btn = el('btn-play-again');
  btn.disabled    = true;
  btn.textContent = t('gw_play_again_waiting');
  hide('modal-result');

  GW.phase        = 'rematch_wait';
  GW.rematchReady = true;

  await dbUpdate(`guesswho/rooms/${GW.roomId}/${GW.myRole}`, { rematch: true }).catch(() => {});

  try {
    const data = await dbGet(`guesswho/rooms/${GW.roomId}`);
    if (data?.p1?.rematch && data?.p2?.rematch) {
      if (GW.isHost) _doRematch(data);
      // guest attend le SSE status:'waiting' → _enterWaitingRematch
    } else {
      // Afficher l'écran waiting en attendant l'adversaire
      el('display-room-code').textContent = GW.roomId;
      el('slot-p1-name').textContent      = data?.p1?.name || GW.myName;
      el('slot-p2-name').textContent      = data?.p2?.name || GW.oppName;
      el('dot-p2')?.classList.add('online');
      showScreen('waiting');
      el('waiting-hint').textContent = t('gw_play_again_waiting');
      hide('btn-host-ready');
      hide('rules-edit-panel');
      renderRulesTags(GW.rules);
      show('rules-summary');
    }
  } catch {}
});

// FIX : verrou _doingRematch pour éviter double-exécution
async function _doRematch(data) {
  if (!GW.isHost || GW._doingRematch) return;
  GW._doingRematch = true;

  try {
    const rules = GW.rules;
    const pool  = await getPokemonPool();
    const seed  = (GW.roomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) ^ Date.now();
    const board = _buildBoard(pool, seed, rules.gridSize);

    await dbUpdate(`guesswho/rooms/${GW.roomId}`, {
      status:          'waiting',
      board:           _boardToData(board),
      rules:           rules,
      firstPlayer:     null,
      result:          null,
      'p1/ready':      false,
      'p1/secretName': null,
      'p1/rematch':    false,
      'p2/ready':      false,
      'p2/secretName': null,
      'p2/rematch':    false,
    });
  } catch (e) {
    console.error('[GW] rematch reset failed', e);
  } finally {
    GW._doingRematch = false;
  }
}

function _enterWaitingRematch(data) {
  GW.board              = _rebuildBoard(data.board);
  GW.mySecret           = null;
  GW.hasSubmittedSecret = false;
  GW.eliminated         = new Set();
  GW.guessSelected      = null;
  GW.rematchReady       = false;
  GW._resultShown       = false;
  // FIX : fermer les modals ouverts (résultat peut encore être visible)
  hide('modal-result');
  hide('modal-guess');

  if (data.rules) GW.rules = { ...DEFAULT_RULES, ...data.rules };

  el('display-room-code').textContent = GW.roomId;
  el('slot-p1-name').textContent      = data.p1?.name || '—';
  el('slot-p2-name').textContent      = data.p2?.name || GW.oppName;
  el('dot-p2')?.classList.add('online');

  const btnHR = el('btn-host-ready');
  if (GW.isHost) {
    applyRulesToUI(GW.rules);
    show('btn-host-ready');
    btnHR.disabled    = false;
    btnHR.textContent = t('gw_host_ready');
  } else {
    hide('btn-host-ready');
  }

  showScreen('waiting');
  renderRulesTags(GW.rules);
  show('rules-summary');
  _updateWaitingHint();
  _setRuleToggleInteractivity();
}

// ── Copy code ──────────────────────────────────────────────────────────────────
el('btn-copy-code').addEventListener('click', () => {
  const code = el('display-room-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    el('btn-copy-code').textContent = t('gw_copy_done');
    setTimeout(() => { el('btn-copy-code').textContent = t('gw_copy'); }, 2000);
  });
});

// FIX : event listener dupliqué supprimé (un seul)
el('btn-copy-link')?.addEventListener('click', () => {
  const url = `${location.origin}${location.pathname}?room=${GW.roomId}`;
  navigator.clipboard.writeText(url).then(() => {
    const btn = el('btn-copy-link');
    const original = btn.textContent;
    btn.textContent = t('gw_copy_done');
    setTimeout(() => { btn.textContent = original; }, 2000);
  });
});

// ── How to play modal ──────────────────────────────────────────────────────────
el('btn-how-to-play')?.addEventListener('click',   () => show('modal-howtoplay'));
el('btn-close-howtoplay')?.addEventListener('click', () => hide('modal-howtoplay'));
el('modal-howtoplay')?.addEventListener('click', e => {
  if (e.target === el('modal-howtoplay')) hide('modal-howtoplay');
});

// ── Waiting hint ───────────────────────────────────────────────────────────────
function _updateWaitingHint() {
  const hintEl = el('waiting-hint');
  if (GW.isHost) {
    hintEl.textContent = t('gw_waiting_hint_host', { code: GW.roomId });
    show('rules-edit-hint');
    show('rules-edit-panel');
    applyRulesToUI(GW.rules);
  } else {
    hintEl.textContent = t('gw_waiting_hint_guest');
    hide('rules-edit-hint');
    hide('rules-edit-panel');
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
  } finally {
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
    el('join-error').textContent = t('gw_error_generic');
  } finally {
    el('btn-join').disabled = false;
  }
});

el('join-code').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase();
});

// ── Boot ───────────────────────────────────────────────────────────────────────
(async () => {
  await loadI18n();
  await loadPokemon();
  initRulesPanel();
  const autoJoined = await tryAutoJoin();
  if (!autoJoined) showScreen('lobby');
})();