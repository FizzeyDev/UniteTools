/* scripts/wordsearch/wordsearch.js
   Depends on: wordsearch-data.js (fires wsDataReady), wordsearch-grid.js
*/

// ── Config ─────────────────────────────────────────────────────────────────
const WS_API_BASE = 'https://unite-tools-api.vercel.app/api';

// ── State ──────────────────────────────────────────────────────────────────
const WS = {
  grid: [], placed: [], words: [],
  selecting: false, startCell: null, currentCells: [],
  foundWords: new Set(), foundCells: new Set(),
  lang: 'fr',

  startTimestamp: null,
  timerInterval: null,
  elapsedSeconds: 0,
  finished: false,
};

// ── Helpers ────────────────────────────────────────────────────────────────
function wsGetCellPx() {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 38;
}
function wsGetGapPx() {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 3;
}
function wsFormatTime(s) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

// ── Countdown (next puzzle) ────────────────────────────────────────────────
let _wsCountdownTimer = null;

function wsStartCountdown() {
  if (_wsCountdownTimer) clearInterval(_wsCountdownTimer);
  const el = document.getElementById('ws-countdown');
  if (!el) return;

  function tick() {
    const now  = new Date();
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    const diff = next - now;
    if (diff <= 0) { el.textContent = '00:00:00'; return; }
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
  }
  tick();
  _wsCountdownTimer = setInterval(tick, 1000);
}

// ── Timer (game) ───────────────────────────────────────────────────────────
function wsGetElapsed() {
  if (!WS.startTimestamp) return 0;
  return Math.floor((Date.now() - WS.startTimestamp) / 1000);
}

function wsStartTimer() {
  if (WS.startTimestamp || WS.finished) return;
  WS.startTimestamp = Date.now();
  wsSaveTimer();

  const el = document.getElementById('ws-timer');
  WS.timerInterval = setInterval(() => {
    if (WS.finished) return;
    const s = wsGetElapsed();
    if (el) el.textContent = wsFormatTime(s);
  }, 1000);
}

function wsStopTimer() {
  // FIX : guard anti-double-call — évite que elapsedSeconds soit écrasé
  if (WS.finished) return;
  WS.elapsedSeconds = wsGetElapsed();
  WS.finished = true;
  clearInterval(WS.timerInterval);
  WS.timerInterval = null;
  const el = document.getElementById('ws-timer');
  if (el) el.textContent = wsFormatTime(WS.elapsedSeconds);
}

function wsSaveTimer() {
  const seed = wsSeedFromDate();
  const raw = JSON.parse(localStorage.getItem(`ws_${seed}_${WS.lang}`) || '{}');
  raw.startTimestamp = WS.startTimestamp;
  localStorage.setItem(`ws_${seed}_${WS.lang}`, JSON.stringify(raw));
}

// ── Start overlay ──────────────────────────────────────────────────────────
function wsShowStartOverlay() {
  if (WS.finished || WS.startTimestamp || WS.foundWords.size > 0) return;

  const wrap = document.querySelector('.ws-grid-wrap');
  if (!wrap) return;

  const overlay = document.createElement('div');
  overlay.className = 'ws-start-overlay';
  overlay.id = 'ws-start-overlay';

  const label = document.createElement('div');
  label.className = 'ws-start-label';
  label.textContent = 'Ready to play?';

  const btn = document.createElement('button');
  btn.className = 'ws-start-btn';
  btn.textContent = 'Start';

  btn.addEventListener('click', () => {
    wrap.classList.add('revealed');
    overlay.classList.add('hiding');
    wsStartTimer();
    setTimeout(() => overlay.remove(), 380);
  });

  overlay.appendChild(label);
  overlay.appendChild(btn);
  wrap.appendChild(overlay);
}

// ── Init ───────────────────────────────────────────────────────────────────
function wsInit(lang) {
  WS.lang = lang || localStorage.getItem('lang') || 'fr';
  const seed = wsSeedFromDate();
  const picked = wsShuffle(WS_POKEMON, wsRng32(seed)).slice(0, WS_COUNT);
  WS.words = picked.map(p => ({
    display: WS.lang === 'fr' ? p.fr : p.en,
    key: wsNorm(WS.lang === 'fr' ? p.fr : p.en),
  }));

  let result = null;
  for (let t = 0; t < 10 && !result; t++)
    result = wsBuildGrid(WS.words.map(w => w.key), wsRng32(seed + t));
  if (!result) { console.error('WS grid generation failed'); return; }

  WS.grid = result.grid;
  WS.placed = result.placed;
  WS.foundWords = new Set();
  WS.foundCells = new Set();

  WS.startTimestamp = null;
  WS.finished = false;
  WS.elapsedSeconds = 0;
  clearInterval(WS.timerInterval);
  WS.timerInterval = null;

  // Restore saved progress
  const saveKey = `ws_${seed}_${WS.lang}`;
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(saveKey) || '{}');
    if (saved.foundWords) saved.foundWords.forEach(w => WS.foundWords.add(w));
    if (saved.foundCells) saved.foundCells.forEach(k => WS.foundCells.add(k));
    if (saved.startTimestamp) WS.startTimestamp = saved.startTimestamp;
    // FIX : != null au lieu de if (saved.elapsedSeconds) qui rate la valeur 0
    if (saved.elapsedSeconds != null) WS.elapsedSeconds = saved.elapsedSeconds;
  } catch (e) { /* ignore */ }

  // FIX : détecter la partie finie AVANT d'afficher le timer, pour ne jamais
  //       afficher wsGetElapsed() (= temps depuis startTimestamp jusqu'à maintenant)
  //       sur une partie déjà terminée.
  const alreadyFinished = WS.foundWords.size === WS.words.length;

  if (alreadyFinished) {
    // Poser finished=true et tuer tout interval résiduel avant le display
    WS.finished = true;
    clearInterval(WS.timerInterval);
    WS.timerInterval = null;
  }

  // Update timer display
  const timerEl = document.getElementById('ws-timer');
  if (timerEl) {
    if (alreadyFinished) {
      // Toujours le temps figé, jamais wsGetElapsed()
      timerEl.textContent = wsFormatTime(WS.elapsedSeconds);
    } else if (WS.startTimestamp) {
      timerEl.textContent = wsFormatTime(wsGetElapsed());
    } else {
      timerEl.textContent = '00:00';
    }
  }

  wsRenderGrid();
  wsRenderWords();
  wsUpdateProgress();
  wsAttachEvents();
  wsLoadLeaderboard();

  const d = new Date();
  document.getElementById('ws-date-label').textContent =
    d.toLocaleDateString(WS.lang === 'fr' ? 'fr-FR' : 'en-GB',
      { day: '2-digit', month: 'long', year: 'numeric' });

  if (alreadyFinished) {
    // Révéler la grille immédiatement, pas d'overlay, pas de setInterval
    const wrap = document.querySelector('.ws-grid-wrap');
    if (wrap) wrap.classList.add('revealed');
    document.getElementById('ws-win').classList.add('show');
    // FIX : forcer le display une deuxième fois après wsUpdateProgress()
    //       qui pourrait l'avoir touché
    if (timerEl) timerEl.textContent = wsFormatTime(WS.elapsedSeconds);
    wsStartCountdown();
  } else if (WS.startTimestamp) {
    // Partie en cours — révéler la grille et reprendre le timer
    const wrap = document.querySelector('.ws-grid-wrap');
    if (wrap) wrap.classList.add('revealed');
    WS.timerInterval = setInterval(() => {
      if (WS.finished) return;
      const el = document.getElementById('ws-timer');
      if (el) el.textContent = wsFormatTime(wsGetElapsed());
    }, 1000);
  } else {
    // Nouvelle partie — overlay (grille floutée par CSS)
    wsShowStartOverlay();
  }
}

// ── Render grid ────────────────────────────────────────────────────────────
function wsRenderGrid() {
  const el = document.getElementById('ws-grid');
  el.style.gridTemplateColumns = `repeat(${WS_SIZE}, var(--cell))`;
  el.innerHTML = '';
  for (let r = 0; r < WS_SIZE; r++) {
    for (let c = 0; c < WS_SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'ws-cell' + (WS.foundCells.has(`${r},${c}`) ? ' found' : '');
      cell.setAttribute('translate', 'no');   // FIX : empêche le système i18n de remplacer les lettres (ex: "A" -> "HAS")
      cell.textContent = WS.grid[r][c];
      cell.dataset.r = r;
      cell.dataset.c = c;
      el.appendChild(cell);
    }
  }
  wsResizeCanvas();
  wsDrawLines();
}

function wsResizeCanvas() {
  const total = wsGetCellPx() * WS_SIZE + wsGetGapPx() * (WS_SIZE - 1);
  const cv = document.getElementById('ws-canvas');
  cv.width = total; cv.height = total;
  cv.style.width = `${total}px`; cv.style.height = `${total}px`;
  document.querySelector('.ws-grid-wrap').style.width = `${total}px`;
}

// ── Render word list ───────────────────────────────────────────────────────
function wsRenderWords() {
  const list = document.getElementById('ws-word-list');
  list.innerHTML = '';
  WS.words.forEach(w => {
    const item = document.createElement('div');
    item.className = 'ws-word-item' + (WS.foundWords.has(w.key) ? ' found' : '');
    item.dataset.key = w.key;
    const dot = document.createElement('span');
    dot.className = 'ws-word-dot';
    item.appendChild(dot);
    item.appendChild(document.createTextNode(w.display));
    list.appendChild(item);
  });
  document.getElementById('ws-total').textContent = WS.words.length;
}

// ── Progress ───────────────────────────────────────────────────────────────
function wsUpdateProgress() {
  const found = WS.foundWords.size;
  const total = WS.words.length;
  document.getElementById('ws-found').textContent = found;
  document.getElementById('ws-bar').style.width = `${(found / total) * 100}%`;
  if (found === total && !WS.finished) {
    wsStopTimer(); // pose WS.finished = true et fige elapsedSeconds
    wsSave();
    setTimeout(() => {
      document.getElementById('ws-win').classList.add('show');
      const finalEl = document.getElementById('ws-final-time');
      if (finalEl) finalEl.textContent = wsFormatTime(WS.elapsedSeconds);
      wsStartCountdown();
      wsShowSubmitForm();
    }, 300);
  }
}

// ── Canvas drawing ─────────────────────────────────────────────────────────
function wsDrawLines() {
  const cv  = document.getElementById('ws-canvas');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  const step = wsGetCellPx() + wsGetGapPx();
  const half = wsGetCellPx() / 2;
  const center = (r, c) => [c * step + half, r * step + half];

  WS.placed.forEach(p => {
    if (!WS.foundWords.has(p.word) || p.cells.length < 2) return;
    const [x1, y1] = center(...p.cells[0]);
    const [x2, y2] = center(...p.cells[p.cells.length - 1]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(76,175,130,0.45)';
    ctx.lineWidth   = wsGetCellPx() * 0.72;
    ctx.lineCap     = 'round';
    ctx.stroke();
  });

  if (WS.currentCells.length >= 2) {
    const [x1, y1] = center(...WS.currentCells[0]);
    const [x2, y2] = center(...WS.currentCells[WS.currentCells.length - 1]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255,215,64,0.35)';
    ctx.lineWidth   = wsGetCellPx() * 0.72;
    ctx.lineCap     = 'round';
    ctx.stroke();
  }
}

// ── Selection helpers ──────────────────────────────────────────────────────
function wsGetCellEl(e) {
  const t = e.touches ? e.touches[0] : e;
  const el = document.elementFromPoint(t.clientX, t.clientY);
  return el && el.classList.contains('ws-cell') ? el : null;
}

function wsPos(el) {
  return [parseInt(el.dataset.r), parseInt(el.dataset.c)];
}

function wsCellsBetween(r1, c1, r2, c2) {
  const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
  if (dr === 0 && dc === 0) return [[r1, c1]];
  const rd = Math.abs(r2 - r1), cd = Math.abs(c2 - c1);
  if (rd !== cd && rd !== 0 && cd !== 0)
    return rd > cd ? wsCellsBetween(r1, c1, r2, c1) : wsCellsBetween(r1, c1, r1, c2);
  const len = Math.max(rd, cd), cells = [];
  for (let i = 0; i <= len; i++) cells.push([r1 + dr * i, c1 + dc * i]);
  return cells;
}

function wsHighlightSel(cells) {
  document.querySelectorAll('.ws-cell.selecting')
    .forEach(el => el.classList.remove('selecting'));
  cells.forEach(([r, c]) => {
    const el = document.querySelector(`[data-r="${r}"][data-c="${c}"]`);
    if (el && !el.classList.contains('found')) el.classList.add('selecting');
  });
}

// ── Check selection ────────────────────────────────────────────────────────
function wsCheckSel() {
  const word  = WS.currentCells.map(([r, c]) => WS.grid[r][c]).join('');
  const wordR = [...word].reverse().join('');

  WS.placed.forEach(p => {
    if (WS.foundWords.has(p.word)) return;
    if (p.word !== word && p.word !== wordR) return;

    WS.foundWords.add(p.word);
    p.cells.forEach(([r, c]) => {
      WS.foundCells.add(`${r},${c}`);
      const el = document.querySelector(`[data-r="${r}"][data-c="${c}"]`);
      if (el) { el.classList.remove('selecting'); el.classList.add('found'); }
    });
    const item = document.querySelector(`[data-key="${p.word}"]`);
    if (item) item.classList.add('found');
    wsUpdateProgress();
    wsSave();
    wsDrawLines();
  });
}

// ── Persist ────────────────────────────────────────────────────────────────
function wsSave() {
  localStorage.setItem(
    `ws_${wsSeedFromDate()}_${WS.lang}`,
    JSON.stringify({
      foundWords: [...WS.foundWords],
      foundCells: [...WS.foundCells],
      startTimestamp: WS.startTimestamp,
      elapsedSeconds: WS.elapsedSeconds,
    })
  );
}

// ── Leaderboard ────────────────────────────────────────────────────────────
async function wsLoadLeaderboard() {
  const container = document.getElementById('ws-leaderboard-entries');
  if (!container) return;
  const loadingText = window.__translations && window.__translations['wordsearch_loading'] || 'Loading…';
  container.innerHTML = `<div class="ws-lb-loading">${loadingText}</div>`;

  try {
    const res = await fetch(`${WS_API_BASE}/leaderboard`);
    const { entries } = await res.json();
    wsRenderLeaderboard(entries);
  } catch (e) {
    const unavailText = window.__translations && window.__translations['wordsearch_unavailable'] || 'Unavailable';
    container.innerHTML = `<div class="ws-lb-loading">${unavailText}</div>`;
  }
}

function wsRenderLeaderboard(entries) {
  const container = document.getElementById('ws-leaderboard-entries');
  if (!container) return;

  if (!entries || entries.length === 0) {
    const firstText = window.__translations && window.__translations['wordsearch_be_first'] || 'Be the first!';
    container.innerHTML = `<div class="ws-lb-loading">${firstText}</div>`;
    return;
  }

  container.innerHTML = '';
  entries.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'ws-lb-row';

    const medals = ['🥇', '🥈', '🥉'];
    const rank = document.createElement('span');
    rank.className = 'ws-lb-rank';
    rank.textContent = medals[i] || `#${i + 1}`;

    const name = document.createElement('span');
    name.className = 'ws-lb-name';
    name.textContent = e.pseudo;

    const time = document.createElement('span');
    time.className = 'ws-lb-time';
    time.textContent = wsFormatTime(e.time);

    row.appendChild(rank);
    row.appendChild(name);
    row.appendChild(time);
    container.appendChild(row);
  });
}

function wsShowSubmitForm() {
  const saveKey = `ws_submitted_${wsSeedFromDate()}`;
  if (localStorage.getItem(saveKey)) {
    wsLoadLeaderboard();
    return;
  }
  const form = document.getElementById('ws-submit-form');
  if (form) form.classList.add('show');
}

async function wsSubmitScore(pseudo) {
  const saveKey = `ws_submitted_${wsSeedFromDate()}`;

  try {
    const res = await fetch(`${WS_API_BASE}/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, time: WS.elapsedSeconds }),
    });
    if (res.ok) {
      localStorage.setItem(saveKey, '1');
      const form = document.getElementById('ws-submit-form');
      if (form) form.classList.remove('show');
      wsLoadLeaderboard();
    }
  } catch (e) {
    console.error('Score submit failed', e);
  }
}

// ── Sidebar toggle ─────────────────────────────────────────────────────────
function wsToggleSidebar() {
  const sidebar = document.getElementById('ws-sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

// ── Events ─────────────────────────────────────────────────────────────────
let _wsEventsAttached = false;

function wsAttachEvents() {
  if (_wsEventsAttached) return;
  _wsEventsAttached = true;

  const grid = document.getElementById('ws-grid');

  const start = e => {
    if (!WS.startTimestamp || WS.finished) return;
    e.preventDefault();
    const el = wsGetCellEl(e);
    if (!el) return;
    WS.selecting    = true;
    WS.startCell    = wsPos(el);
    WS.currentCells = [WS.startCell];
    wsHighlightSel(WS.currentCells);
    wsDrawLines();
  };

  const move = e => {
    if (!WS.selecting) return;
    e.preventDefault();
    const el = wsGetCellEl(e);
    if (!el) return;
    const [r, c]   = wsPos(el);
    const [r0, c0] = WS.startCell;
    WS.currentCells = wsCellsBetween(r0, c0, r, c);
    wsHighlightSel(WS.currentCells);
    wsDrawLines();
  };

  const end = e => {
    if (!WS.selecting) return;
    e.preventDefault();
    WS.selecting = false;
    wsCheckSel();
    WS.currentCells = [];
    wsHighlightSel([]);
    wsDrawLines();
  };

  grid.addEventListener('mousedown',  start);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup',   end);
  grid.addEventListener('touchstart',  start, { passive: false });
  window.addEventListener('touchmove', move,  { passive: false });
  window.addEventListener('touchend',  end,   { passive: false });
  window.addEventListener('resize', () => { wsResizeCanvas(); wsDrawLines(); });

  const toggleBtn = document.getElementById('ws-sidebar-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', wsToggleSidebar);

  document.addEventListener('click', e => {
    const sidebar = document.getElementById('ws-sidebar');
    const toggle  = document.getElementById('ws-sidebar-toggle');
    if (sidebar && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });

  const submitBtn   = document.getElementById('ws-submit-btn');
  const pseudoInput = document.getElementById('ws-pseudo-input');
  if (submitBtn && pseudoInput) {
    submitBtn.addEventListener('click', () => {
      const pseudo = pseudoInput.value.trim();
      if (pseudo.length < 2) {
        pseudoInput.classList.add('error');
        return;
      }
      pseudoInput.classList.remove('error');
      localStorage.setItem('ws_pseudo', pseudo);
      wsSubmitScore(pseudo);
    });
    pseudoInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitBtn.click();
    });
    const saved = localStorage.getItem('ws_pseudo');
    if (saved) pseudoInput.value = saved;
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────
document.addEventListener('wsDataReady', () => {
  wsInit(localStorage.getItem('lang') || 'fr');
});

document.addEventListener('translationsReady', e => {
  const l = e.detail && e.detail.lang;
  if (l && l !== WS.lang) {
    _wsEventsAttached = false;
    wsInit(l);
  }
});