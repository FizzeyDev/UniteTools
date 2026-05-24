/* scripts/wordsearch/wordsearch.js
   Depends on: wordsearch-data.js (fires wsDataReady), wordsearch-grid.js
*/

// ── State ──────────────────────────────────────────────────────────────────
const WS = {
  grid: [], placed: [], words: [],
  selecting: false, startCell: null, currentCells: [],
  foundWords: new Set(), foundCells: new Set(),
  lang: 'fr',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function wsGetCellPx() {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 38;
}
function wsGetGapPx() {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 3;
}

// ── Countdown ──────────────────────────────────────────────────────────────
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

  // Restore saved progress
  try {
    const saved = JSON.parse(localStorage.getItem(`ws_${seed}_${WS.lang}`) || '{}');
    if (saved.foundWords) saved.foundWords.forEach(w => WS.foundWords.add(w));
    if (saved.foundCells) saved.foundCells.forEach(k => WS.foundCells.add(k));
  } catch (e) { /* ignore */ }

  wsRenderGrid();
  wsRenderWords();
  wsUpdateProgress();
  wsAttachEvents();

  const d = new Date();
  document.getElementById('ws-date-label').textContent =
    d.toLocaleDateString(WS.lang === 'fr' ? 'fr-FR' : 'en-GB',
      { day: '2-digit', month: 'long', year: 'numeric' });

  // Already finished? show win immediately
  if (WS.foundWords.size === WS.words.length) {
    document.getElementById('ws-win').classList.add('show');
    wsStartCountdown();
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
  if (found === total) {
    document.getElementById('ws-win').classList.add('show');
    wsStartCountdown();
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
    JSON.stringify({ foundWords: [...WS.foundWords], foundCells: [...WS.foundCells] })
  );
}

// ── Events ─────────────────────────────────────────────────────────────────
let _wsEventsAttached = false;

function wsAttachEvents() {
  if (_wsEventsAttached) return;
  _wsEventsAttached = true;

  const grid = document.getElementById('ws-grid');

  const start = e => {
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
}

// ── Boot — wait for data, then for possible lang change ───────────────────
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