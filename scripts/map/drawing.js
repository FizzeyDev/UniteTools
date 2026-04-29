/* ============================================================
   drawing.js — Freehand draw, arrow, shapes, eraser on drawCanvas
   ============================================================ */

(function () {
  function init() {
  const drawCanvas = document.getElementById('draw-canvas');
  const ctx        = drawCanvas.getContext('2d');

  let isDrawing    = false;
  let arrowStart   = null;
  let shapeStart   = null;
  let currentShape = 'circle';

  App.setCurrentShape = function (s) { currentShape = s; };

  /* ── Resize canvas to match map image exactly ── */
  function resizeCanvas() {
    const img = App.mapImg;
    const w   = img.naturalWidth  || img.offsetWidth;
    const h   = img.naturalHeight || img.offsetHeight;
    if (!w || !h) return;
    drawCanvas.width        = w;
    drawCanvas.height       = h;
    drawCanvas.style.width  = w + 'px';
    drawCanvas.style.height = h + 'px';
    img.style.width  = w + 'px';
    img.style.height = h + 'px';
    redrawAll();
  }

  App.mapImg.addEventListener('load', () => setTimeout(resizeCanvas, 60));
  if (App.mapImg.complete) setTimeout(resizeCanvas, 60);
  window.addEventListener('resize', resizeCanvas);
  App.resizeCanvas = resizeCanvas;

  function getPos(e) { return App.clientToCanvas(e.clientX, e.clientY); }

  /* ── Is space held (pan mode)? ── */
  function isPanMode() {
    return document.getElementById('canvas-area').classList.contains('pan-ready');
  }

  /* ── mousedown ── */
  drawCanvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || isPanMode()) return;
    const pos = getPos(e);

    if (App.currentTool === 'draw') {
      isDrawing = true;
      const path = { type: 'freehand', points: [pos], color: App.drawColor, size: App.strokeSize };
      App.drawPaths.push(path);
      App.currentPath = path;

    } else if (App.currentTool === 'arrow') {
      arrowStart = pos;

    } else if (App.currentTool === 'shape') {
      shapeStart = pos;

    } else if (App.currentTool === 'eraser') {
      isDrawing = true;
      eraseAt(pos);

    } else if (App.currentTool === 'cursor') {
      App.selectSprite && App.selectSprite(null);
    }
  });

  /* ── mousemove ── */
  drawCanvas.addEventListener('mousemove', (e) => {
    const pos = getPos(e);

    if (isDrawing) {
      if (App.currentTool === 'draw' && App.currentPath) {
        App.currentPath.points.push(pos);
        redrawAll();
      } else if (App.currentTool === 'eraser') {
        eraseAt(pos);
      }
    }

    // Live preview
    if (App.currentTool === 'arrow' && arrowStart) {
      redrawAll();
      drawArrow(arrowStart, pos, App.drawColor, App.strokeSize);
    }
    if (App.currentTool === 'shape' && shapeStart) {
      redrawAll();
      drawShape(currentShape, shapeStart, pos, App.drawColor, App.strokeSize);
    }
  });

  /* ── mouseup ── */
  drawCanvas.addEventListener('mouseup', (e) => {
    const pos = getPos(e);

    if (App.currentTool === 'draw') {
      isDrawing = false;
      App.currentPath = null;

    } else if (App.currentTool === 'arrow' && arrowStart) {
      App.drawPaths.push({ type: 'arrow', from: arrowStart, to: pos, color: App.drawColor, size: App.strokeSize });
      arrowStart = null;
      redrawAll();

    } else if (App.currentTool === 'shape' && shapeStart) {
      App.drawPaths.push({ type: 'shape', shape: currentShape, from: shapeStart, to: pos, color: App.drawColor, size: App.strokeSize });
      shapeStart = null;
      redrawAll();
    }
    isDrawing = false;
  });

  drawCanvas.addEventListener('mouseleave', () => { if (App.currentTool === 'draw') isDrawing = false; });

  /* ── Eraser ── */
  function eraseAt(pos) {
    const radius = 20;
    let changed  = false;
    App.drawPaths = App.drawPaths.filter(p => {
      if (p.type === 'arrow') {
        if (distToSegment(p.from, p.to, pos) < radius) { changed = true; return false; }
        return true;
      }
      if (p.type === 'shape') {
        const cx = (p.from.x + p.to.x) / 2;
        const cy = (p.from.y + p.to.y) / 2;
        const r  = Math.max(Math.abs(p.to.x - p.from.x), Math.abs(p.to.y - p.from.y)) / 2;
        if (dist({ x: cx, y: cy }, pos) < r + radius) { changed = true; return false; }
        return true;
      }
      if (p.points && p.points.some(pt => dist(pt, pos) < radius)) { changed = true; return false; }
      return true;
    });
    if (changed) redrawAll();
  }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function distToSegment(a, b, p) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return dist(a, p);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
  }

  /* ── Redraw all paths ── */
  function redrawAll() {
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    App.drawPaths.forEach(p => {
      if (p.type === 'arrow') {
        drawArrow(p.from, p.to, p.color, p.size);
      } else if (p.type === 'shape') {
        drawShape(p.shape, p.from, p.to, p.color, p.size);
      } else if (p.type === 'freehand' && p.points && p.points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = p.color;
        ctx.lineWidth   = p.size;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.moveTo(p.points[0].x, p.points[0].y);
        for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i].x, p.points[i].y);
        ctx.stroke();
      }
    });
  }

  function drawArrow(from, to, color, size) {
    const headLen = Math.max(size * 4, 12);
    const angle   = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = size;
    ctx.lineCap     = 'round';
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  function drawShape(shape, from, to, color, size) {
    const x1 = from.x, y1 = from.y, x2 = to.x, y2 = to.y;
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = size;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    if (shape === 'circle')   { ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); }
    else if (shape === 'square')   { ctx.rect(x1, y1, x2 - x1, y2 - y1); }
    else if (shape === 'triangle') { ctx.moveTo(cx, y1); ctx.lineTo(x2, y2); ctx.lineTo(x1, y2); ctx.closePath(); }
    else if (shape === 'diamond')  { ctx.moveTo(cx, y1); ctx.lineTo(x2, cy); ctx.lineTo(cx, y2); ctx.lineTo(x1, cy); ctx.closePath(); }
    else if (shape === 'line')     { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }

    ctx.stroke();
    // semi-transparent fill for closed shapes
    if (shape !== 'line') {
      ctx.fillStyle = color + '28';
      ctx.fill();
    }
  }

  App.redrawAll    = redrawAll;
  App.resizeCanvas = resizeCanvas;
  } // end init()

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();