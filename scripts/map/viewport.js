/* ============================================================
   viewport.js — Zoom & Pan for the map canvas area
   Uses a single CSS transform on #viewport (translateX/Y + scale)
   so panning works at all zoom levels.
   ============================================================ */

(function() {
  const canvasArea  = document.getElementById('canvas-area');
  const viewport    = document.getElementById('viewport');
  const zoomLabel   = document.getElementById('zoom-label');

  // State
  let zoom   = 1;
  let panX   = 0;   // translation in px
  let panY   = 0;

  // Pan interaction
  let isPanning    = false;
  let panStartX    = 0;
  let panStartY    = 0;
  let panOriginX   = 0;
  let panOriginY   = 0;

  /* ── Apply transform ── */
  function applyTransform() {
    viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    zoomLabel.textContent = Math.round(zoom * 100) + '%';
    App.zoom = zoom;
  }

  /* ── Centre map initially ── */
  function centreMap() {
    const areaRect = canvasArea.getBoundingClientRect();
    const wrapper  = document.querySelector('.canvas-wrapper');
    const imgW = App.mapImg.naturalWidth  || App.mapImg.offsetWidth  || 800;
    const imgH = App.mapImg.naturalHeight || App.mapImg.offsetHeight || 600;

    // Fit zoom so map fills ~90% of area
    const fitZoom = Math.min(
      (areaRect.width  * 0.9) / imgW,
      (areaRect.height * 0.9) / imgH,
      1
    );
    zoom = fitZoom;

    // Centre: with transform-origin 0,0 we shift by half area minus half scaled map
    panX = (areaRect.width  - imgW * zoom) / 2;
    panY = (areaRect.height - imgH * zoom) / 2;

    applyTransform();
  }

  App.centreMap = centreMap;

  /* ── Zoom buttons ── */
  document.getElementById('zoom-in').addEventListener('click', () => {
    zoomAround(canvasArea.clientWidth / 2, canvasArea.clientHeight / 2, 0.15);
  });
  document.getElementById('zoom-out').addEventListener('click', () => {
    zoomAround(canvasArea.clientWidth / 2, canvasArea.clientHeight / 2, -0.15);
  });
  document.getElementById('zoom-reset').addEventListener('click', () => {
    centreMap();
  });

  /* ── Mouse wheel zoom (around cursor) ── */
  canvasArea.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect  = canvasArea.getBoundingClientRect();
    const cx    = e.clientX - rect.left;
    const cy    = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomAround(cx, cy, delta);
  }, { passive: false });

  function zoomAround(cx, cy, delta) {
    const newZoom = Math.max(0.15, Math.min(4, zoom + delta));
    const ratio   = newZoom / zoom;
    // Keep the point (cx, cy) in canvas-area fixed
    panX = cx - ratio * (cx - panX);
    panY = cy - ratio * (cy - panY);
    zoom = newZoom;
    applyTransform();
  }

  /* ── Pan with middle-mouse or Space+drag ── */
  let spaceHeld = false;

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      spaceHeld = true;
      canvasArea.classList.add('pan-ready');
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spaceHeld = false;
      canvasArea.classList.remove('pan-ready');
    }
  });

  canvasArea.addEventListener('mousedown', (e) => {
    // Middle mouse or Space+left mouse → pan
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      startPan(e);
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    panX = panOriginX + dx;
    panY = panOriginY + dy;
    applyTransform();
  });

  document.addEventListener('mouseup', (e) => {
    if (isPanning && (e.button === 1 || e.button === 0)) {
      endPan();
    }
  });

  function startPan(e) {
    isPanning  = true;
    panStartX  = e.clientX;
    panStartY  = e.clientY;
    panOriginX = panX;
    panOriginY = panY;
    canvasArea.classList.add('panning');
  }
  function endPan() {
    isPanning = false;
    canvasArea.classList.remove('panning');
    if (!spaceHeld) canvasArea.classList.remove('pan-ready');
  }

  /* ── Expose helpers ── */
  /**
   * Convert a point in canvas-area client space → canvas/sprite-layer pixel coords.
   * Used by drawing and sprite-drop logic.
   */
  App.clientToCanvas = function(clientX, clientY) {
    const areaRect = canvasArea.getBoundingClientRect();
    // Remove area offset, remove pan, remove zoom
    return {
      x: (clientX - areaRect.left - panX) / zoom,
      y: (clientY - areaRect.top  - panY) / zoom,
    };
  };

  App.getZoom = () => zoom;

  /* ── Init ── */
  App.zoom = zoom;
  applyTransform();
})();
