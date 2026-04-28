/* ============================================================
   sprites.js — Drag from panel, place on map, move, select
   ============================================================ */

(function () {
  const spritesLayer = document.getElementById('sprites-layer');
  const canvasArea   = document.getElementById('canvas-area');
  const rightPanel   = document.getElementById('right-panel');
  const dragGhost    = document.getElementById('drag-ghost');
  const dragGhostImg = document.getElementById('drag-ghost-img');

  let draggingItem = null;
  let movingEntry  = null;
  // Offset in canvas-pixel space between cursor and sprite centre at drag-start
  let moveOffsetX  = 0;
  let moveOffsetY  = 0;

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

    const spriteEl = document.createElement('div');
    spriteEl.className = `placed-sprite team-${team}`;

    // Position stored as absolute canvas pixels, rendered as % so it follows zoom/pan
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
      if (App.currentTool === 'eraser') { removeSprite(spriteEl, entry); return; }
      App.selectSprite(entry);
      if (App.currentTool === 'cursor') startMoveSprite(ev, entry);
    });

    App.selectSprite(entry);
    return entry;
  }

  function removeSprite(el, entry) {
    el.remove();
    App.placedSprites = App.placedSprites.filter(e => e !== entry);
    if (App.selectedSprite === entry) App.selectSprite(null);
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
    // Compute cursor position in canvas-pixel space and remember offset from sprite centre
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
    App.selectSprite(null);
  };
})();