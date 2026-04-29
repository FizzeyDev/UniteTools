/* ============================================================
   viewport.js — Zoom & Pan for the map canvas area
   ============================================================ */

(function () {
  function init() {
  const canvasArea = document.getElementById('canvas-area');
  const viewport   = document.getElementById('viewport');
  const zoomLabel  = document.getElementById('zoom-label');

  let zoom = 1;
  let panX = 0;
  let panY = 0;

  let isPanning  = false;
  let panStartX  = 0;
  let panStartY  = 0;
  let panOriginX = 0;
  let panOriginY = 0;
  let spaceHeld  = false;

  /* ── Apply CSS transform ── */
  function applyTransform() {
    viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    zoomLabel.textContent    = Math.round(zoom * 100) + '%';
    App.zoom = zoom;
  }

  /* ── Centre map ── */
  function centreMap() {
    App.resizeCanvas && App.resizeCanvas();

    const areaRect = canvasArea.getBoundingClientRect();
    const img  = App.mapImg;
    const imgW = img.naturalWidth  || img.offsetWidth  || 800;
    const imgH = img.naturalHeight || img.offsetHeight || 600;

    const fitZoom = Math.min(
      (areaRect.width  * 0.92) / imgW,
      (areaRect.height * 0.92) / imgH,
      1
    );
    zoom = fitZoom;
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
  document.getElementById('zoom-reset').addEventListener('click', centreMap);

  /* ── Wheel zoom ── */
  canvasArea.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvasArea.getBoundingClientRect();
    zoomAround(e.clientX - rect.left, e.clientY - rect.top, e.deltaY > 0 ? -0.1 : 0.1);
  }, { passive: false });

  function zoomAround(cx, cy, delta) {
    const newZoom = Math.max(0.15, Math.min(4, zoom + delta));
    const ratio   = newZoom / zoom;
    panX = cx - ratio * (cx - panX);
    panY = cy - ratio * (cy - panY);
    zoom = newZoom;
    applyTransform();
  }

  /* ── Space / middle-mouse pan ── */
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
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      startPan(e);
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = panOriginX + (e.clientX - panStartX);
    panY = panOriginY + (e.clientY - panStartY);
    applyTransform();
  });
  document.addEventListener('mouseup', (e) => {
    if (isPanning && (e.button === 1 || e.button === 0)) endPan();
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

  /* ── COORDINATE CONVERSION ──────────────────────────────────
     Use getBoundingClientRect() on draw-canvas directly.
     This is the only reliable method: it accounts for every
     transform (pan, zoom, navbar offset, flex layout, etc.).
     scaleX/Y compensate if CSS size ≠ logical canvas resolution.
  ── */
  App.clientToCanvas = function (clientX, clientY) {
    const canvas = document.getElementById('draw-canvas');
    const rect   = canvas.getBoundingClientRect();
    // canvas.width / rect.width == 1/zoom when the map is scaled,
    // but getBoundingClientRect already gives us the screen rect,
    // so we just need to map screen-px → canvas-px.
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  };

  App.getZoom = () => zoom;

  /* ── Init ── */
  App.zoom = zoom;
  applyTransform();
  } // end init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();