/* scripts/wordsearch/wordsearch-grid.js
   Pure grid-generation utilities — no DOM dependencies.
*/

const WS_SIZE = 15;
const WS_COUNT = 10;
const WS_DIRS = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

function wsSeedFromDate() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function wsRng32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wsShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wsNorm(s) {
  return s.toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

function wsCanPlace(grid, word, r, c, dr, dc) {
  for (let i = 0; i < word.length; i++) {
    const nr = r + dr * i, nc = c + dc * i;
    if (nr < 0 || nr >= WS_SIZE || nc < 0 || nc >= WS_SIZE) return false;
    if (grid[nr][nc] && grid[nr][nc] !== word[i]) return false;
  }
  return true;
}

function wsPlace(grid, word, r, c, dr, dc) {
  const cells = [];
  for (let i = 0; i < word.length; i++) {
    grid[r + dr * i][c + dc * i] = word[i];
    cells.push([r + dr * i, c + dc * i]);
  }
  return cells;
}

function wsBuildGrid(words, rng) {
  const grid = Array.from({ length: WS_SIZE }, () => Array(WS_SIZE).fill(''));
  const placed = [];

  for (const word of words) {
    let ok = false;
    const dirs = wsShuffle(WS_DIRS, rng);
    for (let a = 0; a < 300 && !ok; a++) {
      const dr = dirs[a % dirs.length][0];
      const dc = dirs[a % dirs.length][1];
      const r = Math.floor(rng() * WS_SIZE);
      const c = Math.floor(rng() * WS_SIZE);
      if (wsCanPlace(grid, word, r, c, dr, dc)) {
        placed.push({ word, cells: wsPlace(grid, word, r, c, dr, dc) });
        ok = true;
      }
    }
    if (!ok) return null;
  }

  const AL = 'ABCDEFGHIJKLMNOPRSTUVWXYZ';
  for (let r = 0; r < WS_SIZE; r++)
    for (let c = 0; c < WS_SIZE; c++)
      if (!grid[r][c]) grid[r][c] = AL[Math.floor(rng() * AL.length)];

  return { grid, placed };
}