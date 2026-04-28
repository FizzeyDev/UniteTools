/* ============================================================
   app.js — Bootstrap, shared state, toolbar wiring, keyboard
   Must be loaded FIRST (defines the App namespace).
   ============================================================ */

// ── Global shared state ──────────────────────────────────────
const App = {
  // DOM refs (filled below)
  mapImg: null,

  // UI state
  currentCat:  'pokemon',
  currentRole: 'all-roles',
  currentItemType: 'all',
  searchQ:     '',
  currentTool: 'draw',
  drawColor:   '#4fc3f7',
  strokeSize:  4,
  currentTeam: 'purple',
  showNames:   false,

  // Drawing state
  drawPaths:   [],
  currentPath: null,

  // Sprite state
  placedSprites:  [],
  selectedSprite: null,

  // Viewport (set by viewport.js)
  zoom: 1,
  clientToCanvas: null,  // function(clientX, clientY) → {x, y}
  getZoom: null,

  // Methods filled by other modules
  renderPanel:            null,
  redrawAll:              null,
  resizeCanvas:           null,
  centreMap:              null,
  generatePlaceholderSvg: null,
  startDragFromPanel:     null,
  selectSprite:           null,
  removeSelectedSprite:   null,
  clearSprites:           null,
};

window.App = App;

/* ── Wait for DOM ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  App.mapImg = document.getElementById('map-img');

  /* ── Map switch ── */
  document.querySelectorAll('.map-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.map-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.mapImg.src = MAPS[btn.dataset.map];
      App.mapImg.onload = () => {
        setTimeout(() => {
          App.resizeCanvas();
          App.centreMap();
        }, 60);
      };
      // Clear everything when switching maps
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

      const cursors = { cursor:'default', draw:'crosshair', arrow:'crosshair', eraser:'cell' };
      document.getElementById('draw-canvas').style.cursor = cursors[App.currentTool] || 'crosshair';

      // In cursor mode sprites can be moved; otherwise they still receive clicks for select/delete
      const spritesLayer = document.getElementById('sprites-layer');
      spritesLayer.style.pointerEvents = App.currentTool === 'cursor' ? 'auto' : 'none';
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

  /* ── Team toggle ── */
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
    if (e.code === 'Space') return; // handled by viewport.js

    switch (e.key) {
      case 'd': case 'D':
        document.querySelector('[data-tool="draw"]').click(); break;
      case 'e': case 'E':
        document.querySelector('[data-tool="eraser"]').click(); break;
      case 'Escape':
        App.selectSprite(null); break;
      case 'Delete': case 'Backspace':
        App.removeSelectedSprite(); break;
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
  window.showToast = function(msg) {
    clearTimeout(toastTimeout);
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2000);
  };

  /* ── Init: render panel & centre map ── */
  setTimeout(() => {
    App.renderPanel && App.renderPanel();
  }, 0);

  // Centre map once image is loaded
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