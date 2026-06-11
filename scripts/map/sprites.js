/* ============================================================
   sprites.js — Drag from panel, place on map, move, select
   ============================================================ */

(function () {
  function init() {
  const spritesLayer = document.getElementById('sprites-layer');
  const canvasArea   = document.getElementById('canvas-area');
  const rightPanel   = document.getElementById('right-panel');
  const dragGhost    = document.getElementById('drag-ghost');
  const dragGhostImg = document.getElementById('drag-ghost-img');

  let draggingItem = null;
  let movingEntry  = null;
  let moveOffsetX  = 0;
  let moveOffsetY  = 0;

  // ── Duel mode ──────────────────────────────────────────────────────────────
  let dueling   = false;
  let duelPicks = [];

  const duelOverlay = document.createElement('div');
  duelOverlay.id = 'duel-overlay';
  duelOverlay.innerHTML = `
    <span id="duel-overlay-text" style="
      color:var(--blue);
      font-family:'Rajdhani',sans-serif;
      font-size:0.85rem;
      font-weight:700;
    ">Click a first Pokémon…</span>
    <button id="duel-cancel-btn" style="
      font-family:'Rajdhani',sans-serif;font-weight:700;font-size:0.75rem;
      padding:4px 10px;border-radius:var(--radius-sm);cursor:pointer;
      border:1px solid rgba(239,83,80,0.3);background:var(--red-dim);
      color:var(--red);text-transform:uppercase;letter-spacing:0.05em;
      transition:all 0.18s;
    ">✕ Cancel</button>
  `;
  Object.assign(duelOverlay.style, {
    display:      'none',
    position:     'fixed',
    bottom:       '20px',
    left:         '50%',
    transform:    'translateX(-50%)',
    zIndex:       '9999',
    background:   'var(--surface-3)',
    border:       '1px solid rgba(79,195,247,0.25)',
    borderRadius: 'var(--radius-sm)',
    padding:      '8px 16px',
    alignItems:   'center',
    gap:          '12px',
    boxShadow:    'var(--shadow-md)',
    whiteSpace:   'nowrap',
  });
  document.body.appendChild(duelOverlay);

  document.getElementById('duel-cancel-btn').addEventListener('click', stopDuel);

  function startDuel() {
    dueling   = true;
    duelPicks = [];
    App.selectSprite(null);
    duelOverlay.style.display = 'flex';
    document.getElementById('duel-overlay-text').textContent = 'Click a first Pokémon…';
    document.querySelectorAll('.placed-sprite').forEach(el => el.classList.add('duel-pick'));
  }

  function stopDuel() {
    dueling   = false;
    duelPicks = [];
    duelOverlay.style.display = 'none';
    document.querySelectorAll('.placed-sprite').forEach(el => {
      el.classList.remove('duel-pick', 'duel-selected');
    });
  }

  function onDuelPick(entry) {
    if (duelPicks.includes(entry)) {
      duelPicks = duelPicks.filter(e => e !== entry);
      entry.el.classList.remove('duel-selected');
      document.getElementById('duel-overlay-text').textContent =
        duelPicks.length === 0 ? 'Click a first Pokémon…' : 'Click a second Pokémon…';
      return;
    }
    if (duelPicks.length >= 2) return;

    duelPicks.push(entry);
    entry.el.classList.add('duel-selected');

    if (duelPicks.length === 1) {
      document.getElementById('duel-overlay-text').textContent = 'Click a second Pokémon…';
      return;
    }

    const [a, b] = duelPicks;
    let atk = a, def = b;
    if (b.team === 'purple') { atk = b; def = a; }
    else if (a.team === 'orange') { atk = b; def = a; }

    window.open(`damage-calc.html?atk=${encodeURIComponent(atk.id)}&def=${encodeURIComponent(def.id)}`, '_blank');
    stopDuel();
  }

  App.startDuel = startDuel;
  // ── Fin duel mode ──────────────────────────────────────────────────────────

  /* ──────────── Drag from panel → canvas ──────────── */
  App.startDragFromPanel = function (e, item) {
    draggingItem           = item;
    dragGhostImg.src       = item.img;
    dragGhostImg.onerror   = () => { dragGhostImg.src = App.generatePlaceholderSvg(item.name); };
    dragGhost.style.display = 'block';
    dragGhost.style.left    = e.clientX + 'px';
    dragGhost.style.top     = e.clientY + 'px';
    e.preventDefault();
  };

  document.addEventListener('mousemove', (e) => {
    if (!draggingItem) return;
    dragGhost.style.left = e.clientX + 'px';
    dragGhost.style.top  = e.clientY + 'px';
    const rect = canvasArea.getBoundingClientRect();
    const over = e.clientX >= rect.left && e.clientX <= rect.right &&
                 e.clientY >= rect.top  && e.clientY <= rect.bottom;
    canvasArea.classList.toggle('drag-over', over);
  });

  document.addEventListener('mouseup', (e) => {
    if (!draggingItem) return;
    const rect     = canvasArea.getBoundingClientRect();
    const inCanvas = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top  && e.clientY <= rect.bottom;
    if (inCanvas) {
      const pos = App.clientToCanvas(e.clientX, e.clientY);
      placeSprite(draggingItem, pos.x, pos.y);
    }
    draggingItem = null;
    dragGhost.style.display = 'none';
    canvasArea.classList.remove('drag-over');
  });

  /* ──────────── Place sprite ──────────── */
  function placeSprite(item, canvasX, canvasY, team = App.currentTeam, size = 48) {
    const canvas = document.getElementById('draw-canvas');

    if (canvas.width <= 300) {
      App.resizeCanvas && App.resizeCanvas();
    }

    const spriteEl = document.createElement('div');
    spriteEl.className = `placed-sprite team-${team}`;
    spriteEl.style.left = (canvasX / canvas.width  * 100) + '%';
    spriteEl.style.top  = (canvasY / canvas.height * 100) + '%';

    const ring = document.createElement('div');
    ring.className = 'sprite-team-ring';

    const img = document.createElement('img');
    img.src       = item.img;
    img.alt       = item.name;
    img.draggable = false;
    img.style.width  = size + 'px';
    img.style.height = size + 'px';
    img.onerror = () => { img.src = App.generatePlaceholderSvg(item.name); };

    const badge = document.createElement('span');
    badge.className   = 'sprite-name-badge';
    badge.textContent = item.name;
    badge.style.display = App.showNames ? 'block' : 'none';

    const deleteBtn = document.createElement('div');
    deleteBtn.className   = 'sprite-delete';
    deleteBtn.textContent = '×';

    spriteEl.appendChild(ring);
    spriteEl.appendChild(img);
    spriteEl.appendChild(badge);
    spriteEl.appendChild(deleteBtn);
    spritesLayer.appendChild(spriteEl);

    if (dueling) spriteEl.classList.add('duel-pick');

    const entry = { el: spriteEl, id: item.id, name: item.name, imgSrc: item.img, team, size, img, badge, canvasX, canvasY };
    App.placedSprites.push(entry);

    deleteBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      removeSprite(spriteEl, entry);
    });

    spriteEl.addEventListener('mousedown', (ev) => {
      if (ev.button !== 0) return;
      ev.stopPropagation();
      ev.preventDefault();

      if (dueling) { onDuelPick(entry); return; }

      if (App.currentTool === 'eraser') { removeSprite(spriteEl, entry); return; }
      App.selectSprite(entry);
      if (App.currentTool === 'cursor') startMoveSprite(ev, entry);
    });

    App.selectSprite(entry);
    return entry;
  }

  App.placeSprite = placeSprite;

  function removeSprite(el, entry) {
    el.remove();
    App.placedSprites = App.placedSprites.filter(e => e !== entry);
    if (App.selectedSprite === entry) App.selectSprite(null);
    if (duelPicks.includes(entry)) {
      duelPicks = duelPicks.filter(e => e !== entry);
      document.getElementById('duel-overlay-text').textContent =
        duelPicks.length === 0 ? 'Click a first Pokémon…' : 'Click a second Pokémon…';
    }
  }

  App.removeSelectedSprite = function () {
    if (!App.selectedSprite) return;
    removeSprite(App.selectedSprite.el, App.selectedSprite);
  };

  /* ──────────── Select ──────────── */
  App.selectSprite = function (entry) {
    if (App.selectedSprite) App.selectedSprite.el.classList.remove('selected');
    App.selectedSprite = entry;
    if (entry) {
      entry.el.classList.add('selected');
      rightPanel.classList.add('open');
      document.getElementById('rp-img').src              = entry.imgSrc;
      document.getElementById('rp-name').textContent     = entry.name;
      document.getElementById('rp-size').value           = entry.size;
      document.getElementById('rp-size-val').textContent = entry.size;
      document.querySelectorAll('.rp-team-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.rpTeam === entry.team);
      });
    } else {
      rightPanel.classList.remove('open');
    }
  };

  /* ──────────── Move sprite ──────────── */
  function startMoveSprite(e, entry) {
    movingEntry = entry;
    const cursorCanvas = App.clientToCanvas(e.clientX, e.clientY);
    moveOffsetX = cursorCanvas.x - entry.canvasX;
    moveOffsetY = cursorCanvas.y - entry.canvasY;
    entry.el.style.transition = 'none';
  }

  document.addEventListener('mousemove', (e) => {
    if (!movingEntry) return;
    const canvas       = document.getElementById('draw-canvas');
    const cursorCanvas = App.clientToCanvas(e.clientX, e.clientY);
    const newX = cursorCanvas.x - moveOffsetX;
    const newY = cursorCanvas.y - moveOffsetY;
    movingEntry.canvasX        = newX;
    movingEntry.canvasY        = newY;
    movingEntry.el.style.left  = (newX / canvas.width  * 100) + '%';
    movingEntry.el.style.top   = (newY / canvas.height * 100) + '%';
  });

  document.addEventListener('mouseup', () => {
    if (movingEntry) {
      movingEntry.el.style.transition = '';
      movingEntry = null;
    }
  });

  /* ──────────── Right-panel controls ──────────── */
  document.querySelectorAll('.rp-team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!App.selectedSprite) return;
      const team = btn.dataset.rpTeam;
      App.selectedSprite.el.classList.remove('team-purple', 'team-orange', 'team-neutral');
      App.selectedSprite.el.classList.add(`team-${team}`);
      App.selectedSprite.team = team;
      document.querySelectorAll('.rp-team-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  document.getElementById('rp-size').addEventListener('input', (e) => {
    if (!App.selectedSprite) return;
    const sz = +e.target.value;
    App.selectedSprite.size                 = sz;
    App.selectedSprite.img.style.width      = sz + 'px';
    App.selectedSprite.img.style.height     = sz + 'px';
    document.getElementById('rp-size-val').textContent = sz;
  });

  document.getElementById('rp-delete').addEventListener('click', () => {
    if (!App.selectedSprite) return;
    removeSprite(App.selectedSprite.el, App.selectedSprite);
  });

  /* ──────────── Clear all ──────────── */
  App.clearSprites = function () {
    App.placedSprites.forEach(e => e.el.remove());
    App.placedSprites = [];
    if (dueling) stopDuel();
    App.selectSprite(null);
  };
  } // end init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();