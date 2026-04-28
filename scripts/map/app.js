/* ============================================================
   app.js — Bootstrap, shared state, toolbar wiring, keyboard
   ============================================================ */

const App = {
  mapImg: null,

  currentCat:      'pokemon',
  currentRole:     'all-roles',
  currentItemType: 'all',
  searchQ:         '',
  currentTool:     'draw',
  drawColor:       '#4fc3f7',
  strokeSize:      4,
  currentTeam:     'purple',
  showNames:       false,

  drawPaths:   [],
  currentPath: null,

  placedSprites:  [],
  selectedSprite: null,

  zoom: 1,
  clientToCanvas: null,
  getZoom: null,

  renderPanel:            null,
  redrawAll:              null,
  resizeCanvas:           null,
  centreMap:              null,
  generatePlaceholderSvg: null,
  startDragFromPanel:     null,
  selectSprite:           null,
  removeSelectedSprite:   null,
  clearSprites:           null,
  setCurrentShape:        null,
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.mapImg = document.getElementById('map-img');

  /* ── Map switch ── */
  document.querySelectorAll('.map-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.map-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.mapImg.src = MAPS[btn.dataset.map];
      App.mapImg.onload = () => {
        setTimeout(() => { App.resizeCanvas(); App.centreMap(); }, 60);
      };
      App.drawPaths = [];
      App.redrawAll && App.redrawAll();
      App.clearSprites && App.clearSprites();
    });
  });

  /* ── Tool buttons ── */
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.currentTool = btn.dataset.tool;

      // Canvas cursor
      const cursors = { cursor: 'default', draw: 'crosshair', arrow: 'crosshair', eraser: 'cell', shape: 'crosshair' };
      document.getElementById('draw-canvas').style.cursor = cursors[App.currentTool] || 'crosshair';

      // Sprites layer: ALWAYS pointer-events auto so sprites are always clickable.
      // In draw/arrow/shape modes the canvas sits on top and captures events,
      // BUT we set z-index so canvas is above sprites only when drawing.
      const spritesLayer = document.getElementById('sprites-layer');
      const drawCanvas   = document.getElementById('draw-canvas');

      if (App.currentTool === 'cursor') {
        // cursor mode: sprites on top, canvas below
        spritesLayer.style.zIndex    = '20';
        spritesLayer.style.pointerEvents = 'auto';
        drawCanvas.style.zIndex      = '10';
        drawCanvas.style.pointerEvents = 'none';
      } else {
        // draw/arrow/shape/eraser: canvas on top captures drawing events,
        // sprites still respond (eraser needs to click sprites too via bubbling)
        spritesLayer.style.zIndex    = '10';
        spritesLayer.style.pointerEvents = 'none';
        drawCanvas.style.zIndex      = '20';
        drawCanvas.style.pointerEvents = 'auto';
      }

      // Show/hide shape options
      const shapeOptions = document.getElementById('shape-options');
      if (shapeOptions) {
        shapeOptions.style.display = App.currentTool === 'shape' ? 'flex' : 'none';
      }
    });
  });

  /* ── Colors ── */
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
      App.drawColor = s.dataset.color;
    });
  });

  document.getElementById('stroke-size').addEventListener('change', (e) => {
    App.strokeSize = +e.target.value;
  });

  /* ── Undo & Clear ── */
  document.getElementById('undo-btn').addEventListener('click', () => {
    if (App.drawPaths.length) { App.drawPaths.pop(); App.redrawAll(); }
  });

  document.getElementById('clear-draw-btn').addEventListener('click', () => {
    App.drawPaths = [];
    App.redrawAll();
    showToast('Canvas cleared');
  });

  /* ── Team ── */
  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.currentTeam = btn.dataset.team;
    });
  });

  /* ── Keyboard shortcuts ── */
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') return;
    switch (e.key) {
      case 'd': case 'D': document.querySelector('[data-tool="draw"]').click(); break;
      case 'e': case 'E': document.querySelector('[data-tool="eraser"]').click(); break;
      case 'Escape':      App.selectSprite && App.selectSprite(null); break;
      case 'Delete': case 'Backspace': App.removeSelectedSprite && App.removeSelectedSprite(); break;
      case 'z': case 'Z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (App.drawPaths.length) { App.drawPaths.pop(); App.redrawAll(); }
        }
        break;
    }
  });

  /* ── Toast ── */
  let toastTimeout;
  window.showToast = function (msg) {
    clearTimeout(toastTimeout);
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2000);
  };

  /* ── Init ── */
  setTimeout(() => { App.renderPanel && App.renderPanel(); }, 0);

  App.mapImg.addEventListener('load', () => {
    setTimeout(() => {
      App.resizeCanvas && App.resizeCanvas();
      App.centreMap    && App.centreMap();
    }, 80);
  });
  if (App.mapImg.complete) {
    setTimeout(() => {
      App.resizeCanvas && App.resizeCanvas();
      App.centreMap    && App.centreMap();
    }, 80);
  }
});