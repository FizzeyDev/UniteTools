/* ============================================================
   drawing.js — Freehand draw, arrow, eraser on drawCanvas
   ============================================================ */

(function() {
  const drawCanvas = document.getElementById('draw-canvas');
  const ctx        = drawCanvas.getContext('2d');

  let isDrawing  = false;
  let arrowStart = null;

  /* ── Resize canvas to match map image ── */
  function resizeCanvas() {
    const img = App.mapImg;
    const w   = img.offsetWidth;
    const h   = img.offsetHeight;
    if (!w || !h) return;
    if (drawCanvas.width === w && drawCanvas.height === h) return;
    drawCanvas.width          = w;
    drawCanvas.height         = h;
    drawCanvas.style.width    = w + 'px';
    drawCanvas.style.height   = h + 'px';
    redrawAll();
  }

  App.mapImg.addEventListener('load', () => setTimeout(resizeCanvas, 60));
  if (App.mapImg.complete) setTimeout(resizeCanvas, 60);
  window.addEventListener('resize', resizeCanvas);
  App.resizeCanvas = resizeCanvas;

  /* ── Get canvas-space position from mouse event ── */
  function getPos(e) {
    // clientToCanvas accounts for pan + zoom
    return App.clientToCanvas(e.clientX, e.clientY);
  }

  /* ── Mouse events on draw-canvas ── */
  drawCanvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;

    // If space is held → pan, don't draw
    if (e.getModifierState && document.querySelector('.canvas-area.pan-ready')) return;

    const pos = getPos(e);

    if (App.currentTool === 'draw') {
      isDrawing = true;
      const path = { points: [pos], color: App.drawColor, size: App.strokeSize };
      App.drawPaths.push(path);
      App.currentPath = path;

    } else if (App.currentTool === 'arrow') {
      arrowStart = pos;

    } else if (App.currentTool === 'eraser') {
      isDrawing = true;
      eraseAt(pos);

    } else if (App.currentTool === 'cursor') {
      App.selectSprite(null);
    }
  });

  drawCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);

    if (App.currentTool === 'draw' && App.currentPath) {
      App.currentPath.points.push(pos);
      redrawAll();
    } else if (App.currentTool === 'eraser') {
      eraseAt(pos);
    }
  });

  drawCanvas.addEventListener('mouseup', (e) => {
    const pos = getPos(e);
    if (App.currentTool === 'draw') {
      isDrawing = false;
      App.currentPath = null;
    } else if (App.currentTool === 'arrow' && arrowStart) {
      App.drawPaths.push({ type:'arrow', from: arrowStart, to: pos, color: App.drawColor, size: App.strokeSize });
      arrowStart = null;
      redrawAll();
    }
    isDrawing = false;
  });

  drawCanvas.addEventListener('mouseleave', () => { isDrawing = false; });

  /* ── Arrow preview while dragging ── */
  drawCanvas.addEventListener('mousemove', (e) => {
    if (App.currentTool !== 'arrow' || !arrowStart) return;
    const pos = getPos(e);
    redrawAll();
    drawArrow(arrowStart, pos, App.drawColor, App.strokeSize);
  });

  /* ── Eraser ── */
  function eraseAt(pos) {
    const radius = 20;
    let changed  = false;
    App.drawPaths = App.drawPaths.filter(p => {
      if (p.type === 'arrow') {
        if (distToSegment(p.from, p.to, pos) < radius) { changed = true; return false; }
        return true;
      }
      if (p.points && p.points.some(pt => dist(pt, pos) < radius)) { changed = true; return false; }
      return true;
    });
    if (changed) redrawAll();
  }

  function dist(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2); }
  function distToSegment(a, b, p) {
    const dx = b.x-a.x, dy = b.y-a.y;
    const lenSq = dx*dx + dy*dy;
    if (lenSq === 0) return dist(a, p);
    let t = ((p.x-a.x)*dx + (p.y-a.y)*dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return dist(p, { x: a.x+t*dx, y: a.y+t*dy });
  }

  /* ── Draw all paths ── */
  function redrawAll() {
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    App.drawPaths.forEach(p => {
      if (p.type === 'arrow') {
        drawArrow(p.from, p.to, p.color, p.size);
      } else if (p.points && p.points.length > 1) {
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
    const headLen = size * 4;
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
    ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI/6), to.y - headLen * Math.sin(angle - Math.PI/6));
    ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI/6), to.y - headLen * Math.sin(angle + Math.PI/6));
    ctx.closePath();
    ctx.fill();
  }

  App.redrawAll   = redrawAll;
  App.resizeCanvas = resizeCanvas;
})();
