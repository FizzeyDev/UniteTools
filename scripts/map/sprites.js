/* ============================================================
   sprites.js — Drag from panel, place on map, move, select
   ============================================================ */

(function() {
  const spritesLayer = document.getElementById('sprites-layer');
  const canvasArea   = document.getElementById('canvas-area');
  const rightPanel   = document.getElementById('right-panel');
  const dragGhost    = document.getElementById('drag-ghost');
  const dragGhostImg = document.getElementById('drag-ghost-img');

  let draggingItem = null;
  let movingEntry  = null;
  let moveOffset   = { x: 0, y: 0 };

  /* ──────────── Drag from panel ──────────── */
  App.startDragFromPanel = function(e, item) {
    draggingItem        = item;
    dragGhostImg.src    = item.img;
    dragGhostImg.onerror = () => { dragGhostImg.src = App.generatePlaceholderSvg(item.name); };
    dragGhost.style.display = 'block';
    dragGhost.style.left    = e.clientX + 'px';
    dragGhost.style.top     = e.clientY + 'px';
    e.preventDefault();
  };

  document.addEventListener('mousemove', (e) => {
    if (!draggingItem) return;
    dragGhost.style.left = e.clientX + 'px';
    dragGhost.style.top  = e.clientY + 'px';

    // Highlight canvas area when hovering
    const rect = canvasArea.getBoundingClientRect();
    const over = e.clientX >= rect.left && e.clientX <= rect.right &&
                 e.clientY >= rect.top  && e.clientY <= rect.bottom;
    canvasArea.classList.toggle('drag-over', over);
  });

  document.addEventListener('mouseup', (e) => {
    if (!draggingItem) return;
    const rect = canvasArea.getBoundingClientRect();
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

    // Position as % of canvas size so it scales with the wrapper
    spriteEl.style.left = (canvasX / canvas.width  * 100) + '%';
    spriteEl.style.top  = (canvasY / canvas.height * 100) + '%';

    const ring = document.createElement('div');
    ring.className = 'sprite-team-ring';

    const img = document.createElement('img');
    img.src    = item.img;
    img.alt    = item.name;
    img.style.width  = size + 'px';
    img.style.height = size + 'px';
    img.onerror = () => { img.src = App.generatePlaceholderSvg(item.name); };

    const badge = document.createElement('span');
    badge.className   = 'sprite-name-badge';
    badge.textContent = item.name;
    badge.style.display = App.showNames ? 'block' : 'none';

    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'sprite-delete';
    deleteBtn.textContent = '×';

    spriteEl.appendChild(ring);
    spriteEl.appendChild(img);
    spriteEl.appendChild(badge);
    spriteEl.appendChild(deleteBtn);
    spritesLayer.appendChild(spriteEl);

    const entry = {
      el: spriteEl, id: item.id, name: item.name, imgSrc: item.img,
      team, size, img, badge,
      canvasX, canvasY,
    };
    App.placedSprites.push(entry);

    deleteBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      removeSprite(spriteEl, entry);
    });

    spriteEl.addEventListener('mousedown', (ev) => {
      if (ev.button !== 0) return;
      ev.stopPropagation();
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

  App.removeSelectedSprite = function() {
    if (!App.selectedSprite) return;
    removeSprite(App.selectedSprite.el, App.selectedSprite);
  };

  /* ──────────── Select ──────────── */
  App.selectSprite = function(entry) {
    if (App.selectedSprite) App.selectedSprite.el.classList.remove('selected');
    App.selectedSprite = entry;
    if (entry) {
      entry.el.classList.add('selected');
      rightPanel.classList.add('open');
      document.getElementById('rp-img').src       = entry.imgSrc;
      document.getElementById('rp-name').textContent = entry.name;
      document.getElementById('rp-size').value     = entry.size;
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
    movingEntry  = entry;
    // offset between cursor and sprite centre in client px
    const el     = entry.el;
    const elRect = el.getBoundingClientRect();
    moveOffset.x = e.clientX - (elRect.left + elRect.width  / 2);
    moveOffset.y = e.clientY - (elRect.top  + elRect.height / 2);
    el.style.transition = 'none';
  }

  document.addEventListener('mousemove', (e) => {
    if (!movingEntry) return;
    // Convert the desired client position (without offset) back to canvas coords
    const pos = App.clientToCanvas(
      e.clientX - moveOffset.x,
      e.clientY - moveOffset.y
    );
    const canvas = document.getElementById('draw-canvas');
    movingEntry.el.style.left = (pos.x / canvas.width  * 100) + '%';
    movingEntry.el.style.top  = (pos.y / canvas.height * 100) + '%';
    movingEntry.canvasX = pos.x;
    movingEntry.canvasY = pos.y;
  });

  document.addEventListener('mouseup', () => {
    if (movingEntry) {
      movingEntry.el.style.transition = '';
      movingEntry = null;
    }
  });

  /* ──────────── Right panel controls ──────────── */
  document.querySelectorAll('.rp-team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!App.selectedSprite) return;
      const team = btn.dataset.rpTeam;
      App.selectedSprite.el.classList.remove('team-purple','team-orange','team-neutral');
      App.selectedSprite.el.classList.add(`team-${team}`);
      App.selectedSprite.team = team;
      document.querySelectorAll('.rp-team-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  document.getElementById('rp-size').addEventListener('input', (e) => {
    if (!App.selectedSprite) return;
    const sz = +e.target.value;
    App.selectedSprite.size = sz;
    App.selectedSprite.img.style.width  = sz + 'px';
    App.selectedSprite.img.style.height = sz + 'px';
    document.getElementById('rp-size-val').textContent = sz;
  });

  document.getElementById('rp-delete').addEventListener('click', () => {
    if (!App.selectedSprite) return;
    removeSprite(App.selectedSprite.el, App.selectedSprite);
  });

  /* ──────────── Clear all sprites ──────────── */
  App.clearSprites = function() {
    App.placedSprites.forEach(e => e.el.remove());
    App.placedSprites = [];
    App.selectSprite(null);
  };
})();
