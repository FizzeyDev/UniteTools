/* ============================================================
   steps.js — Plans made of steps ("slides" of the same map),
   ghosts + auto arrows, animated player, full undo/redo,
   "My plans" library, share link, JSON / PNG export.

   A step = a snapshot of App.placedSprites + App.drawPaths with a
   timer label ("10:00", "7:00"…) and an optional note. Sprites keep a
   stable `uid` across steps, which is what lets us draw movement arrows
   and glide sprites from one step to the next.
   ============================================================ */

(function () {
  function init() {
    const $ = id => document.getElementById(id);
    const canvasArea = $('canvas-area');
    const wrapper = $('canvas-wrapper');
    const drawCanvas = $('draw-canvas');
    if (!canvasArea || !wrapper || !drawCanvas || !window.App) return;

    /* ── helpers ─────────────────────────────────────────────── */
    function tr(key, fb, vars = {}) {
      const lang = localStorage.getItem('lang') || 'fr';
      let s = window.translations?.[lang]?.[key] ?? fb;
      Object.entries(vars).forEach(([k, v]) => { s = s.split(`{${k}}`).join(v); });
      return s;
    }
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const L = (key, fb) => `<span data-lang="${key}">${esc(tr(key, fb))}</span>`;
    const uidGen = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const clone = o => JSON.parse(JSON.stringify(o));
    const currentMap = () => document.querySelector('.map-pill.active')?.dataset.map || 'groudon';
    const toast = m => (window.showToast ? window.showToast(m) : console.log(m));
    const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    const LIB_KEY = 'ut_map_plans';
    const MAX_PLANS = 50;

    /* ── plan state ──────────────────────────────────────────── */
    const P = {
      id: null,            // library id when the plan was saved/opened from "My plans"
      name: '',
      steps: [],
      cur: 0,
      dur: 3,              // seconds per step in the player
      loop: false,
      ghosts: true,
      camps: false,        // overlay of the camps present at the step's timer
      playing: false,
    };

    const newStep = (label = '10:00') => ({ id: uidGen(), label, note: '', sprites: [], paths: [] });

    function liveSprites() {
      return App.placedSprites.map(e => ({
        uid: e.uid, id: e.id, name: e.name, img: e.imgSrc, team: e.team, size: e.size,
        x: e.canvasX, y: e.canvasY,
      }));
    }
    const livePaths = () => clone(App.drawPaths);

    /** Write the live board into the current step. */
    function capture() {
      const st = P.steps[P.cur];
      if (!st) return;
      st.sprites = liveSprites();
      st.paths = livePaths();
    }

    /* ── history (per step) ──────────────────────────────────── */
    const hist = new Map();   // stepId → { stack:[json], idx }
    const snap = () => JSON.stringify({ s: liveSprites(), p: App.drawPaths });

    function histFor(stepId) {
      let h = hist.get(stepId);
      if (!h) { h = { stack: [snap()], idx: 0 }; hist.set(stepId, h); }
      return h;
    }

    function commit() {
      if (!P.steps.length || P.playing) return;
      const h = histFor(P.steps[P.cur].id);
      const s = snap();
      if (s === h.stack[h.idx]) return;
      h.stack.splice(h.idx + 1);
      h.stack.push(s);
      if (h.stack.length > 120) h.stack.shift();
      h.idx = h.stack.length - 1;
      capture();
      afterChange();
    }

    function restore(json) {
      const o = JSON.parse(json);
      const st = P.steps[P.cur];
      st.sprites = o.s; st.paths = o.p;
      applyStep(P.cur, { animate: false });
      afterChange();
    }

    App.undo = function () {
      const h = histFor(P.steps[P.cur].id);
      if (h.idx <= 0) return;
      h.idx--; restore(h.stack[h.idx]); updateButtons();
    };
    App.redo = function () {
      const h = histFor(P.steps[P.cur].id);
      if (h.idx >= h.stack.length - 1) return;
      h.idx++; restore(h.stack[h.idx]); updateButtons();
    };

    /* ── applying a step to the board ────────────────────────── */
    function removeEntry(entry) {
      if (!App.placedSprites.includes(entry)) return;
      App.selectSprite(entry);
      App.removeSelectedSprite();
    }

    function applyStep(i, { animate = false } = {}) {
      const st = P.steps[i];
      if (!st) return;
      const sprites = st.sprites || [];
      const canAnimate = animate && !reduceMotion;

      if (!canAnimate) {
        App.clearSprites();
        sprites.forEach(s => App.placeSprite({ id: s.id, name: s.name, img: s.img }, s.x, s.y, s.team, s.size, s.uid));
        App.selectSprite(null);
      } else {
        const byUid = new Map(App.placedSprites.map(e => [e.uid, e]));
        const keep = new Set();
        sprites.forEach(s => {
          const e = byUid.get(s.uid);
          if (e) {
            keep.add(s.uid);
            e.el.classList.add('animating');
            e.canvasX = s.x; e.canvasY = s.y;
            e.el.style.left = (s.x / drawCanvas.width * 100) + '%';
            e.el.style.top = (s.y / drawCanvas.height * 100) + '%';
            e.el.classList.remove('team-purple', 'team-orange', 'team-neutral');
            e.el.classList.add('team-' + s.team);
            e.team = s.team; e.size = s.size;
            e.img.style.width = e.img.style.height = s.size + 'px';
            setTimeout(() => e.el.classList.remove('animating'), 900);
          } else {
            const n = App.placeSprite({ id: s.id, name: s.name, img: s.img }, s.x, s.y, s.team, s.size, s.uid);
            n.el.classList.add('fade-in');
            setTimeout(() => n.el.classList.remove('fade-in'), 600);
          }
        });
        App.placedSprites.filter(e => !keep.has(e.uid) && !sprites.some(s => s.uid === e.uid)).forEach(e => {
          // fade a visual copy out, but drop the real entry now so the model stays exact
          const ghost = e.el.cloneNode(true);
          ghost.classList.remove('selected');
          ghost.classList.add('fade-out');
          ghost.style.pointerEvents = 'none';
          $('sprites-layer').appendChild(ghost);
          setTimeout(() => ghost.remove(), 500);
          removeEntry(e);
        });
        App.selectSprite(null);
      }
      App.drawPaths = clone(st.paths || []);
      App.redrawAll();
    }

    function goTo(i, opts = {}) {
      i = Math.max(0, Math.min(P.steps.length - 1, i));
      if (i !== P.cur) capture();
      const changed = i !== P.cur;
      P.cur = i;
      applyStep(i, { animate: opts.animate !== false && changed });
      histFor(P.steps[i].id);
      afterChange(true);
    }

    /* ── camps present at the step's timer (data/spawns_<map>.json) ──
       Read-only overlay: it is not part of the plan, so it never touches undo / redo.
       Assumes every pad is still standing (spawns tied to a pad break are left out). */
    const campLayer = document.createElement('div');
    campLayer.id = 'camp-layer';
    const campCache = {};
    const campLoading = {};

    function loadCamps(key) {
      if (key in campCache) return Promise.resolve(campCache[key]);
      if (!campLoading[key]) {
        campLoading[key] = fetch(`data/spawns_${key}.json`).then(r => r.json())
          .then(d => { campCache[key] = d; return d; })
          .catch(() => { campCache[key] = null; return null; });
      }
      return campLoading[key];
    }

    /** "7:30" → 450 (seconds left on the game clock), null when the label is not a timer. */
    function labelSeconds(label) {
      const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(label || '');
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
    }

    function campsAt(data, R, key) {
      const out = [];
      if (!data || R == null) return out;
      (data.pokemons || []).forEach(p => {
        if (p.isSpecial) return;                                   // Altaria lanes depend on pads: not drawn
        if (p.name === 'Regidrago') {                              // centre boss: 8:00 → 2:30
          const s0 = (p.spawns || [])[0];
          if (s0 && R <= 480 && R > 150) out.push({ name: p.name, img: s0.img || p.img, x: s0.xPercent, y: s0.yPercent, size: s0.size || p.size || 80, at: 480 });
          return;
        }
        (p.spawns || []).forEach(s => {
          if (s.spawnOnTowerBreak) return;
          if (!(R <= s.time)) return;
          if (s.time_dispawn && !(R > s.time_dispawn)) return;
          const evo = p.evolution && R <= p.evolution.time;
          out.push({
            name: evo ? p.evolution.name : p.name,
            img: evo ? p.evolution.img : (s.img || p.img),
            x: s.xPercent, y: s.yPercent, size: s.size || p.size || 60, at: s.time,
          });
        });
      });
      return out;
    }

    const fmtClock = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

    function campsForStep(step) {
      if (!P.camps) return [];
      const data = campCache[currentMap()];
      return campsAt(data, labelSeconds(step && step.label), currentMap());
    }

    function renderCamps() {
      campLayer.innerHTML = '';
      const W = drawCanvas.width, H = drawCanvas.height;
      if (!P.camps || !W) return;
      const key = currentMap();
      if (!(key in campCache)) { loadCamps(key).then(renderCamps); return; }
      campsForStep(P.steps[P.cur]).forEach(c => {
        const el = document.createElement('div');
        el.className = 'camp-sprite';
        el.style.left = (c.x / 100 * 100) + '%';
        el.style.top = (c.y / 100 * 100) + '%';
        el.title = `${c.name} — ${tr('mapstep_camp_from', 'spawns at')} ${fmtClock(c.at)}`;
        el.innerHTML = `<img src="${esc(c.img)}" alt="" draggable="false" style="width:${c.size}px;height:${c.size}px">`;
        campLayer.appendChild(el);
      });
    }

    /* ── ghosts (previous step, transparent) + movement arrows ── */
    const ghostLayer = document.createElement('div');
    ghostLayer.id = 'ghost-layer';
    const ghostCanvas = document.createElement('canvas');
    ghostCanvas.id = 'ghost-canvas';
    wrapper.insertBefore(campLayer, drawCanvas);
    wrapper.insertBefore(ghostCanvas, drawCanvas);
    wrapper.insertBefore(ghostLayer, drawCanvas);

    function renderGhosts() {
      ghostLayer.innerHTML = '';
      const W = drawCanvas.width, H = drawCanvas.height;
      ghostCanvas.width = W; ghostCanvas.height = H;
      ghostCanvas.style.width = drawCanvas.style.width; ghostCanvas.style.height = drawCanvas.style.height;
      const g = ghostCanvas.getContext('2d');
      g.clearRect(0, 0, W, H);
      if (!P.ghosts || P.playing || P.cur === 0 || !W) return;

      const prev = P.steps[P.cur - 1];
      const live = new Map(App.placedSprites.map(e => [e.uid, e]));
      (prev.sprites || []).forEach(s => {
        const el = document.createElement('div');
        el.className = `ghost-sprite team-${s.team}`;
        el.style.left = (s.x / W * 100) + '%';
        el.style.top = (s.y / H * 100) + '%';
        el.innerHTML = `<div class="sprite-team-ring"></div><img src="${esc(s.img)}" alt="" draggable="false" style="width:${s.size}px;height:${s.size}px">`;
        ghostLayer.appendChild(el);

        const e = live.get(s.uid);
        if (e && Math.hypot(e.canvasX - s.x, e.canvasY - s.y) > 14) {
          const col = s.team === 'purple' ? '#9f53ec' : s.team === 'orange' ? '#ff9d00' : '#8aacaf';
          arrow(g, { x: s.x, y: s.y }, { x: e.canvasX, y: e.canvasY }, col, s.size / 2 + 4, e.size / 2 + 6);
        }
      });
    }

    function arrow(g, a, b, color, padA, padB) {
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < padA + padB + 6) return;
      const from = { x: a.x + Math.cos(ang) * padA, y: a.y + Math.sin(ang) * padA };
      const to = { x: b.x - Math.cos(ang) * padB, y: b.y - Math.sin(ang) * padB };
      g.save();
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 4; g.lineCap = 'round';
      g.globalAlpha = 0.9; g.setLineDash([10, 8]);
      g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(to.x, to.y); g.stroke();
      g.setLineDash([]);
      const h = 16;
      g.beginPath();
      g.moveTo(to.x, to.y);
      g.lineTo(to.x - h * Math.cos(ang - Math.PI / 6), to.y - h * Math.sin(ang - Math.PI / 6));
      g.lineTo(to.x - h * Math.cos(ang + Math.PI / 6), to.y - h * Math.sin(ang + Math.PI / 6));
      g.closePath(); g.fill();
      g.restore();
    }

    let ghostRaf = 0;
    const ghostSoon = () => { cancelAnimationFrame(ghostRaf); ghostRaf = requestAnimationFrame(renderGhosts); };

    /* ── thumbnails / PNG rendering ──────────────────────────── */
    const imgCache = new Map();
    function getImg(src, done) {
      let im = imgCache.get(src);
      if (!im) {
        im = new Image();
        im.onload = () => { im.__ok = true; done && done(); };
        im.onerror = () => { im.__bad = true; };
        im.src = src;
        imgCache.set(src, im);
      }
      return im;
    }

    function paintPaths(ctx, paths, k) {
      paths.forEach(p => {
        ctx.save();
        ctx.strokeStyle = p.color; ctx.fillStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * k); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (p.type === 'freehand' && p.points && p.points.length > 1) {
          ctx.beginPath(); ctx.moveTo(p.points[0].x * k, p.points[0].y * k);
          p.points.forEach(pt => ctx.lineTo(pt.x * k, pt.y * k)); ctx.stroke();
        } else if (p.type === 'arrow') {
          const a = { x: p.from.x * k, y: p.from.y * k }, b = { x: p.to.x * k, y: p.to.y * k };
          const ang = Math.atan2(b.y - a.y, b.x - a.x), h = Math.max(p.size * 4 * k, 6);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - h * Math.cos(ang - Math.PI / 6), b.y - h * Math.sin(ang - Math.PI / 6));
          ctx.lineTo(b.x - h * Math.cos(ang + Math.PI / 6), b.y - h * Math.sin(ang + Math.PI / 6));
          ctx.closePath(); ctx.fill();
        } else if (p.type === 'shape') {
          const x1 = p.from.x * k, y1 = p.from.y * k, x2 = p.to.x * k, y2 = p.to.y * k;
          const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
          ctx.beginPath();
          if (p.shape === 'circle') ctx.ellipse(cx, cy, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, 6.2832);
          else if (p.shape === 'square') ctx.rect(x1, y1, x2 - x1, y2 - y1);
          else if (p.shape === 'triangle') { ctx.moveTo(cx, y1); ctx.lineTo(x2, y2); ctx.lineTo(x1, y2); ctx.closePath(); }
          else if (p.shape === 'diamond') { ctx.moveTo(cx, y1); ctx.lineTo(x2, cy); ctx.lineTo(cx, y2); ctx.lineTo(x1, cy); ctx.closePath(); }
          else { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
          ctx.stroke();
          if (p.shape !== 'line') { ctx.globalAlpha = 0.16; ctx.fill(); }
        }
        ctx.restore();
      });
    }

    /** Draw a step on `canvas` at scale k (1 = natural map size). */
    function paintStep(canvas, step, k, opts = {}) {
      const map = App.mapImg;
      const W = map.naturalWidth || 800, H = map.naturalHeight || 600;
      canvas.width = Math.round(W * k); canvas.height = Math.round(H * k);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0d1617'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      try { ctx.drawImage(map, 0, 0, canvas.width, canvas.height); } catch { /* map not decoded yet */ }
      (opts.camps || []).forEach(c => {
        const size = Math.max(5, c.size * k), x = c.x / 100 * W * k, y = c.y / 100 * H * k;
        const im = getImg(c.img, opts.onImg);
        if (im.__ok) { ctx.save(); ctx.globalAlpha = .8; ctx.drawImage(im, x - size / 2, y - size / 2, size, size); ctx.restore(); }
      });
      paintPaths(ctx, step.paths || [], k);
      (step.sprites || []).forEach(s => {
        const size = Math.max(5, s.size * k), x = s.x * k, y = s.y * k;
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, size / 2 + 2 * Math.max(k, 0.5), 0, 6.2832);
        ctx.strokeStyle = s.team === 'purple' ? '#9f53ec' : s.team === 'orange' ? '#ff9d00' : 'rgba(255,255,255,.4)';
        ctx.lineWidth = Math.max(1.5, 3 * k); ctx.stroke();
        ctx.restore();
        const im = getImg(s.img, opts.onImg);
        if (im.__ok) ctx.drawImage(im, x - size / 2, y - size / 2, size, size);
      });
      if (opts.hud) {
        const fs = Math.round(H * 0.06 * k);
        ctx.font = `900 ${fs}px "Exo 2", sans-serif`;
        ctx.textBaseline = 'top';
        const t = step.label || '';
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        const tw = ctx.measureText(t).width;
        ctx.fillRect(14 * k + 6, 14 * k + 6, tw + 24 * k, fs + 14 * k);
        ctx.fillStyle = '#ffd740'; ctx.fillText(t, 26 * k + 6, 20 * k + 6);
        ctx.font = `700 ${Math.round(fs * 0.4)}px Rajdhani, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.textAlign = 'right';
        ctx.fillText('unite-tools.com', canvas.width - 14 * k, canvas.height - Math.round(fs * 0.7));
        ctx.textAlign = 'left';
      }
    }

    function thumbFor(step) {
      const c = document.createElement('canvas');
      paintStep(c, step, 150 / (App.mapImg.naturalWidth || 800), { onImg: () => { clearTimeout(thumbTimer); thumbTimer = setTimeout(renderStrip, 120); } });
      return c;
    }

    /* ── steps strip UI ──────────────────────────────────────── */
    const mount = $('steps-mount');
    if (!mount) return;
    mount.innerHTML = `
      <div class="steps-bar" id="steps-bar">
        <div class="steps-head">
          <div class="steps-player">
            <button class="sp-btn" id="sp-first" title="${esc(tr('mapstep_t_first', 'First step'))}">⏮</button>
            <button class="sp-btn" id="sp-prev" title="${esc(tr('mapstep_t_prev', 'Previous step (←)'))}">◀</button>
            <button class="sp-btn sp-play" id="sp-play" title="${esc(tr('mapstep_t_play', 'Play / pause (P)'))}">▶</button>
            <button class="sp-btn" id="sp-next" title="${esc(tr('mapstep_t_next', 'Next step (→)'))}">▶|</button>
            <button class="sp-btn" id="sp-last" title="${esc(tr('mapstep_t_last', 'Last step'))}">⏭</button>
          </div>
          <label class="sp-dur" title="${esc(tr('mapstep_t_dur', 'Seconds per step'))}"><input type="number" id="sp-dur" min="1" max="30" value="3"><span>s</span></label>
          <button class="sp-btn sp-toggle" id="sp-loop" title="${esc(tr('mapstep_t_loop', 'Loop'))}">🔁</button>
          <button class="sp-btn sp-toggle on" id="sp-ghost" title="${esc(tr('mapstep_t_ghost', 'Ghosts of the previous step'))}">👻</button>
          <button class="sp-btn sp-toggle" id="sp-camps" title="${esc(tr('mapstep_t_camps', 'Show the camps present at this timer (pads assumed standing). Use a timer like 7:00.'))}">🌿</button>
          <button class="sp-btn" id="sp-full" title="${esc(tr('mapstep_t_full', 'Fullscreen'))}">⛶</button>
          <div class="steps-fields">
            <input type="text" id="step-label" maxlength="24" placeholder="10:00" aria-label="Timer">
            <input type="text" id="step-note" maxlength="140" placeholder="${esc(tr('mapstep_note_ph', 'Note for this step (optional)'))}" data-lang-placeholder="mapstep_note_ph">
          </div>
          <button class="sp-btn sp-collapse" id="sp-collapse" title="${esc(tr('mapstep_t_collapse', 'Hide / show the steps'))}">▾</button>
        </div>
        <div class="steps-list" id="steps-list"></div>
      </div>`;
    const hud = document.createElement('div');
    hud.id = 'step-hud';
    hud.innerHTML = '<div class="hud-label"></div><div class="hud-note"></div>';
    canvasArea.appendChild(hud);

    let thumbTimer = null;
    function renderStrip() {
      const list = $('steps-list');
      list.innerHTML = '';
      P.steps.forEach((st, i) => {
        const card = document.createElement('div');
        card.className = 'step-card' + (i === P.cur ? ' active' : '');
        card.draggable = true;
        card.dataset.i = i;
        const cv = i === P.cur ? thumbFor({ ...st, sprites: liveSprites(), paths: App.drawPaths }) : thumbFor(st);
        cv.className = 'step-thumb';
        card.appendChild(cv);
        const lab = document.createElement('div');
        lab.className = 'step-name';
        lab.textContent = st.label || `#${i + 1}`;
        card.appendChild(lab);
        const act = document.createElement('div');
        act.className = 'step-actions';
        act.innerHTML = `<button title="${esc(tr('mapstep_dup', 'Duplicate'))}" data-act="dup">⧉</button><button title="${esc(tr('mapstep_del', 'Delete'))}" data-act="del">✕</button>`;
        card.appendChild(act);
        if (st.note) card.title = st.note;

        card.addEventListener('click', e => {
          const a = e.target.closest('[data-act]');
          if (a) { e.stopPropagation(); (a.dataset.act === 'dup' ? dupStep : delStep)(i); return; }
          stopPlay(); goTo(i);
        });
        card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(i)); card.classList.add('dragging'); });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drop'); });
        card.addEventListener('dragleave', () => card.classList.remove('drop'));
        card.addEventListener('drop', e => {
          e.preventDefault();
          const from = parseInt(e.dataTransfer.getData('text/plain'));
          if (!isNaN(from) && from !== i) moveStep(from, i);
        });
        list.appendChild(card);
      });

      const add = document.createElement('div');
      add.className = 'step-add';
      add.innerHTML = `<button id="step-add-copy" title="${esc(tr('mapstep_add_copy', 'New step from this one (sprites kept, drawings cleared)'))}">＋</button>
                       <button id="step-add-empty" class="small" title="${esc(tr('mapstep_add_empty', 'New empty step'))}">∅</button>`;
      list.appendChild(add);
      $('step-add-copy').addEventListener('click', () => addStep(true));
      $('step-add-empty').addEventListener('click', () => addStep(false));
      updateFields();
    }

    function updateFields() {
      const st = P.steps[P.cur];
      if (!st) return;
      if (document.activeElement !== $('step-label')) $('step-label').value = st.label;
      if (document.activeElement !== $('step-note')) $('step-note').value = st.note;
      const showHud = P.steps.length > 1 || st.note;
      hud.classList.toggle('show', !!showHud);
      hud.querySelector('.hud-label').textContent = st.label || '';
      hud.querySelector('.hud-note').textContent = st.note || '';
      updateButtons();
    }

    function updateButtons() {
      const h = P.steps[P.cur] ? histFor(P.steps[P.cur].id) : null;
      const u = $('undo-btn'), r = $('redo-btn');
      if (u && h) u.disabled = h.idx <= 0;
      if (r && h) r.disabled = h.idx >= h.stack.length - 1;
      $('sp-play').textContent = P.playing ? '⏸' : '▶';
      $('sp-loop').classList.toggle('on', P.loop);
      $('sp-ghost').classList.toggle('on', P.ghosts);
      $('sp-camps').classList.toggle('on', P.camps);
      $('sp-prev').disabled = P.cur === 0;
      $('sp-first').disabled = P.cur === 0;
      $('sp-next').disabled = P.cur >= P.steps.length - 1;
      $('sp-last').disabled = P.cur >= P.steps.length - 1;
    }

    function afterChange(immediate) {
      renderGhosts();
      renderCamps();
      updateButtons();
      if (immediate) { renderStrip(); return; }
      clearTimeout(thumbTimer);
      thumbTimer = setTimeout(renderStrip, 180);
    }

    /* ── step operations ─────────────────────────────────────── */
    function autoLabel() {
      const m = /^(\d+):(\d{2})$/.exec(P.steps[P.cur]?.label || '');
      if (m) {
        const t = Math.max(0, parseInt(m[1]) * 60 + parseInt(m[2]) - 60);
        return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
      }
      return `#${P.steps.length + 1}`;
    }

    function addStep(copy) {
      stopPlay(); capture();
      const st = newStep(autoLabel());
      if (copy) st.sprites = clone(P.steps[P.cur].sprites);
      P.steps.splice(P.cur + 1, 0, st);
      P.cur = P.cur + 1;
      applyStep(P.cur, { animate: false });
      hist.delete(st.id);
      histFor(st.id);
      afterChange(true);
    }

    function dupStep(i) {
      stopPlay(); capture();
      const st = clone(P.steps[i]);
      st.id = uidGen();
      P.steps.splice(i + 1, 0, st);
      P.cur = i + 1;
      applyStep(P.cur, { animate: false });
      histFor(st.id);
      afterChange(true);
    }

    function delStep(i) {
      stopPlay(); capture();
      const st = P.steps[i];
      const hasContent = (st.sprites?.length || st.paths?.length);
      if (hasContent && !confirm(tr('mapstep_del_confirm', 'Delete step "{n}"?', { n: st.label || i + 1 }))) return;
      if (P.steps.length === 1) {
        P.steps[0] = newStep(st.label);
        hist.clear(); P.cur = 0;
      } else {
        P.steps.splice(i, 1);
        hist.delete(st.id);
        if (P.cur >= P.steps.length) P.cur = P.steps.length - 1;
        else if (i < P.cur) P.cur--;
      }
      applyStep(P.cur, { animate: false });
      histFor(P.steps[P.cur].id);
      afterChange(true);
    }

    function moveStep(from, to) {
      capture();
      const curId = P.steps[P.cur].id;
      const [st] = P.steps.splice(from, 1);
      P.steps.splice(to, 0, st);
      P.cur = P.steps.findIndex(s => s.id === curId);
      afterChange(true);
    }

    $('step-label').addEventListener('input', e => { P.steps[P.cur].label = e.target.value; updateFields(); renderCamps(); clearTimeout(thumbTimer); thumbTimer = setTimeout(renderStrip, 250); });
    $('step-note').addEventListener('input', e => { P.steps[P.cur].note = e.target.value; updateFields(); });

    /* ── player ──────────────────────────────────────────────── */
    let playTimer = null;
    function stopPlay() {
      if (!P.playing) return;
      P.playing = false;
      clearTimeout(playTimer);
      canvasArea.classList.remove('playing');
      updateButtons();
      renderGhosts();
    }
    function tick() {
      if (!P.playing) return;
      if (P.cur < P.steps.length - 1) {
        goTo(P.cur + 1, { animate: true });
        playTimer = setTimeout(tick, P.dur * 1000);
      } else if (P.loop) {
        goTo(0, { animate: true });
        playTimer = setTimeout(tick, P.dur * 1000);
      } else {
        stopPlay();
      }
    }
    function startPlay() {
      if (P.steps.length < 2) { toast(tr('mapstep_need_two', 'Add at least two steps to play.')); return; }
      capture();
      App.selectSprite(null);
      if (P.cur >= P.steps.length - 1) goTo(0, { animate: false });
      P.playing = true;
      canvasArea.classList.add('playing');
      updateButtons();
      renderGhosts();
      playTimer = setTimeout(tick, P.dur * 1000);
    }
    const togglePlay = () => (P.playing ? stopPlay() : startPlay());

    $('sp-play').addEventListener('click', togglePlay);
    $('sp-prev').addEventListener('click', () => { stopPlay(); goTo(P.cur - 1); });
    $('sp-next').addEventListener('click', () => { stopPlay(); goTo(P.cur + 1); });
    $('sp-first').addEventListener('click', () => { stopPlay(); goTo(0); });
    $('sp-last').addEventListener('click', () => { stopPlay(); goTo(P.steps.length - 1); });
    $('sp-dur').addEventListener('input', e => { P.dur = Math.max(1, Math.min(30, parseFloat(e.target.value) || 3)); });
    $('sp-loop').addEventListener('click', () => { P.loop = !P.loop; updateButtons(); });
    $('sp-ghost').addEventListener('click', () => { P.ghosts = !P.ghosts; updateButtons(); renderGhosts(); });
    $('sp-camps').addEventListener('click', () => { P.camps = !P.camps; updateButtons(); renderCamps(); });
    // Keep the map fitted above the strip
    const bar = $('steps-bar');
    function syncInset() {
      App.bottomInset = canvasArea.classList.contains('is-full') ? 0 : bar.offsetHeight + 20;
    }
    if (window.ResizeObserver) new ResizeObserver(syncInset).observe(bar);
    $('sp-collapse').addEventListener('click', () => {
      bar.classList.toggle('collapsed');
      $('sp-collapse').textContent = bar.classList.contains('collapsed') ? '▴' : '▾';
      setTimeout(() => { syncInset(); App.centreMap && App.centreMap(); }, 60);
    });
    setTimeout(() => { syncInset(); App.centreMap && App.centreMap(); }, 200);
    $('sp-full').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else canvasArea.requestFullscreen && canvasArea.requestFullscreen();
    });
    document.addEventListener('fullscreenchange', () => {
      canvasArea.classList.toggle('is-full', !!document.fullscreenElement);
      setTimeout(() => { syncInset(); App.centreMap && App.centreMap(); }, 120);
    });

    document.addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); stopPlay(); goTo(P.cur - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stopPlay(); goTo(P.cur + 1); }
      else if (e.key === 'p' || e.key === 'P') togglePlay();
    });
    // touching the board while playing stops the player
    drawCanvas.addEventListener('mousedown', stopPlay, true);
    $('sprites-layer').addEventListener('mousedown', stopPlay, true);

    /* ── history triggers (generic: compare snapshots) ───────── */
    const commitSoon = () => setTimeout(commit, 0);
    document.addEventListener('mouseup', commitSoon);
    document.addEventListener('click', commitSoon);
    document.addEventListener('change', commitSoon);
    document.addEventListener('keyup', e => { if (e.key === 'Delete' || e.key === 'Backspace') commitSoon(); });
    document.addEventListener('mousemove', e => { if (e.buttons & 1 && App.selectedSprite && P.cur > 0) ghostSoon(); });
    window.addEventListener('resize', () => setTimeout(() => { renderGhosts(); renderCamps(); }, 120));
    App.mapImg.addEventListener('load', () => setTimeout(() => { renderGhosts(); renderCamps(); renderStrip(); }, 150));

    /* ── map switching (called from app.js) ──────────────────── */
    function hasContent() {
      capture();
      return P.steps.some(s => (s.sprites && s.sprites.length) || (s.paths && s.paths.length)) || P.steps.length > 1;
    }
    App.hasPlanContent = hasContent;
    App.confirmMapSwitch = function () {
      if (!hasContent()) return true;
      return confirm(tr('mapstep_switch_confirm', 'Switching the map clears the current plan and all its steps. Continue?'));
    };
    App.onMapSwitched = function () {
      stopPlay();
      resetPlan();
    };

    function resetPlan() {
      P.id = null; P.name = ''; P.steps = [newStep('10:00')]; P.cur = 0;
      hist.clear();
      histFor(P.steps[0].id);
      afterChange(true);
    }

    /* ── serialisation (compact) ─────────────────────────────── */
    const r1 = n => Math.round(n);
    function packPaths(paths) {
      return (paths || []).map(p => {
        if (p.type === 'freehand') {
          const flat = [];
          // light simplification: drop points closer than 2px to the previous one
          let lx = -1e9, ly = -1e9;
          p.points.forEach((pt, i) => {
            if (i === 0 || i === p.points.length - 1 || Math.hypot(pt.x - lx, pt.y - ly) >= 2) { flat.push(r1(pt.x), r1(pt.y)); lx = pt.x; ly = pt.y; }
          });
          return { k: 'f', c: p.color, s: p.size, p: flat };
        }
        if (p.type === 'arrow') return { k: 'a', c: p.color, s: p.size, f: [r1(p.from.x), r1(p.from.y)], t: [r1(p.to.x), r1(p.to.y)] };
        return { k: 's', sh: p.shape, c: p.color, s: p.size, f: [r1(p.from.x), r1(p.from.y)], t: [r1(p.to.x), r1(p.to.y)] };
      });
    }
    function unpackPaths(arr) {
      return (arr || []).map(p => {
        if (p.k === 'f') {
          const pts = [];
          for (let i = 0; i + 1 < p.p.length; i += 2) pts.push({ x: p.p[i], y: p.p[i + 1] });
          return { type: 'freehand', points: pts, color: p.c, size: p.s };
        }
        if (p.k === 'a') return { type: 'arrow', from: { x: p.f[0], y: p.f[1] }, to: { x: p.t[0], y: p.t[1] }, color: p.c, size: p.s };
        return { type: 'shape', shape: p.sh, from: { x: p.f[0], y: p.f[1] }, to: { x: p.t[0], y: p.t[1] }, color: p.c, size: p.s };
      });
    }

    // data.js declares these with let/const (not on window), so read them by name
    const dataLists = () => [
      typeof POKEMON !== 'undefined' ? POKEMON : [],
      typeof NEUTRALS !== 'undefined' ? NEUTRALS : [],
      typeof OTHER !== 'undefined' ? OTHER : [],
      typeof ITEMS !== 'undefined' ? ITEMS : [],
    ];
    const mapSrc = key => (typeof MAPS !== 'undefined' && MAPS[key]) || null;

    function lookupItem(id) {
      for (const l of dataLists()) { const f = l.find(x => x.id === id); if (f) return f; }
      return null;
    }

    /** thin: true → omit name/img when they can be resolved from the item id (share links). */
    function exportPlan(thin) {
      capture();
      return {
        app: 'unitetools-map-plan', v: 1,
        name: P.name || '', map: currentMap(), dur: P.dur, cp: P.camps ? 1 : 0,
        steps: P.steps.map(st => ({
          l: st.label, n: st.note,
          sp: st.sprites.map(s => {
            const o = { u: s.uid, id: s.id, t: s.team, s: s.size, x: r1(s.x), y: r1(s.y) };
            if (!thin || !lookupItem(s.id)) { o.n = s.name; o.i = s.img; }
            return o;
          }),
          pa: packPaths(st.paths),
        })),
      };
    }

    async function ensureDataLoaded() {
      for (let i = 0; i < 40 && !(dataLists()[0].length && dataLists()[3].length); i++) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    async function loadPlan(o, meta = {}) {
      if (!o || o.app !== 'unitetools-map-plan' || !Array.isArray(o.steps) || !o.steps.length) throw new Error('bad plan');
      stopPlay();
      await ensureDataLoaded();
      await switchMap(o.map);
      P.id = meta.id || null;
      P.name = o.name || meta.name || '';
      P.dur = o.dur || 3; $('sp-dur').value = P.dur;
      P.camps = !!o.cp;
      P.steps = o.steps.map(s => ({
        id: uidGen(), label: s.l || '', note: s.n || '',
        sprites: (s.sp || []).map(x => {
          const it = lookupItem(x.id);
          return { uid: x.u || uidGen(), id: x.id, name: x.n || it?.name || x.id, img: x.i || it?.img || '', team: x.t || 'neutral', size: x.s || 48, x: x.x, y: x.y };
        }),
        paths: unpackPaths(s.pa),
      }));
      P.cur = 0;
      hist.clear();
      applyStep(0, { animate: false });
      histFor(P.steps[0].id);
      afterChange(true);
      setTimeout(() => { App.centreMap && App.centreMap(); }, 60);
    }

    function switchMap(key) {
      return new Promise(resolve => {
        if (!mapSrc(key)) return resolve();
        document.querySelectorAll('.map-pill').forEach(b => b.classList.toggle('active', b.dataset.map === key));
        const same = App.mapImg.getAttribute('src') === mapSrc(key);
        if (same && App.mapImg.complete && App.mapImg.naturalWidth) return resolve();
        App.mapImg.addEventListener('load', () => {
          App.resizeCanvas && App.resizeCanvas();
          setTimeout(() => { App.resizeCanvas && App.resizeCanvas(); App.centreMap && App.centreMap(); resolve(); }, 120);
        }, { once: true });
        App.mapImg.src = mapSrc(key);
      });
    }

    /* ── library ("My plans") ────────────────────────────────── */
    let memLib = [];
    let libOk = true;
    function libLoad() {
      if (!libOk) return memLib;
      try { return JSON.parse(localStorage.getItem(LIB_KEY) || '[]'); } catch { libOk = false; return memLib; }
    }
    function libSave(list) {
      memLib = list;
      if (!libOk) return;
      try { localStorage.setItem(LIB_KEY, JSON.stringify(list)); }
      catch { libOk = false; toast(tr('mapstep_lib_nostorage', 'Browser storage unavailable: plans are kept only until you reload.')); }
    }

    function savePlan(name, overwriteId) {
      const plan = exportPlan(false);
      plan.name = name;
      const list = libLoad();
      const thumb = (() => { const c = document.createElement('canvas'); paintStep(c, { ...P.steps[0] }, 220 / (App.mapImg.naturalWidth || 800)); try { return c.toDataURL('image/jpeg', 0.7); } catch { return ''; } })();
      const now = Date.now();
      if (overwriteId) {
        const i = list.findIndex(p => p.id === overwriteId);
        if (i >= 0) list[i] = { ...list[i], name, plan, thumb, updated: now };
      } else {
        if (list.length >= MAX_PLANS) { toast(tr('mapstep_lib_full', 'Library full ({n} plans). Delete one first.', { n: MAX_PLANS })); return null; }
        list.unshift({ id: uidGen(), name, plan, thumb, created: now, updated: now });
      }
      libSave(list);
      const rec = overwriteId ? list.find(p => p.id === overwriteId) : list[0];
      P.id = rec.id; P.name = name;
      return rec;
    }

    let libModal = null;
    function openLibrary() {
      if (!libModal) {
        libModal = document.createElement('div');
        libModal.className = 'mp-overlay';
        libModal.hidden = true;
        libModal.innerHTML = `
          <div class="mp-box" role="dialog" aria-modal="true">
            <div class="mp-head"><span>${L('mapstep_lib_title', '💾 My plans')}</span><button class="mp-close" id="mp-close">✕</button></div>
            <div class="mp-save">
              <input type="text" id="mp-name" maxlength="48" placeholder="${esc(tr('mapstep_lib_name_ph', 'Plan name'))}" data-lang-placeholder="mapstep_lib_name_ph">
              <button class="mp-btn primary" id="mp-save-new">${L('mapstep_lib_save_new', 'Save as new')}</button>
              <button class="mp-btn" id="mp-save-over">${L('mapstep_lib_overwrite', 'Overwrite opened plan')}</button>
            </div>
            <div class="mp-list" id="mp-list"></div>
            <div class="mp-foot">
              <button class="mp-btn" id="mp-import">${L('mapstep_lib_import', '⬇ Import')}</button>
              <button class="mp-btn" id="mp-export">${L('mapstep_lib_export', '⬆ Export all')}</button>
            </div>
          </div>`;
        document.body.appendChild(libModal);
        libModal.addEventListener('mousedown', e => { if (e.target === libModal) closeLibrary(); });
        $('mp-close').addEventListener('click', closeLibrary);
        $('mp-save-new').addEventListener('click', () => {
          const name = $('mp-name').value.trim() || tr('mapstep_untitled', 'Untitled plan');
          if (savePlan(name)) { toast(tr('mapstep_saved', '💾 Plan saved.')); renderLibrary(); }
        });
        $('mp-save-over').addEventListener('click', () => {
          if (!P.id) { toast(tr('mapstep_no_open', 'No saved plan is open — use "Save as new".')); return; }
          const name = $('mp-name').value.trim() || P.name || tr('mapstep_untitled', 'Untitled plan');
          if (savePlan(name, P.id)) { toast(tr('mapstep_saved', '💾 Plan saved.')); renderLibrary(); }
        });
        $('mp-export').addEventListener('click', () => {
          download(`unitetools-map-plans-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'unitetools-map-library', v: 1, plans: libLoad() }), 'application/json');
        });
        $('mp-import').addEventListener('click', () => pickFile(async text => {
          const o = JSON.parse(text);
          const incoming = o.app === 'unitetools-map-library' ? o.plans : (o.app === 'unitetools-map-plan' ? [{ id: uidGen(), name: o.name || 'Imported', plan: o, thumb: '', created: Date.now(), updated: Date.now() }] : null);
          if (!incoming) throw new Error('bad file');
          const list = libLoad();
          incoming.forEach(p => { if (p && p.plan && !list.some(x => x.id === p.id)) list.unshift({ ...p, id: p.id || uidGen() }); });
          libSave(list.slice(0, MAX_PLANS));
          renderLibrary();
          toast(tr('mapstep_imported', 'Imported.'));
        }));
      }
      libModal.hidden = false;
      $('mp-name').value = P.name || '';
      renderLibrary();
    }
    function closeLibrary() { if (libModal) libModal.hidden = true; }

    function renderLibrary() {
      const list = libLoad();
      const box = $('mp-list');
      if (!list.length) { box.innerHTML = `<div class="mp-empty">${esc(tr('mapstep_lib_empty', 'No saved plan yet. Build steps, name your plan and save it.'))}</div>`; return; }
      box.innerHTML = list.map(p => `
        <div class="mp-item${p.id === P.id ? ' open' : ''}" data-id="${p.id}">
          ${p.thumb ? `<img src="${p.thumb}" alt="">` : '<div class="mp-noimg">🗺</div>'}
          <div class="mp-info">
            <div class="mp-name">${esc(p.name)}</div>
            <div class="mp-meta">${esc(p.plan.map)} · ${esc(tr('mapstep_n_steps', '{n} steps', { n: p.plan.steps.length }))} · ${new Date(p.updated || p.created).toLocaleDateString()}</div>
          </div>
          <div class="mp-actions">
            <button data-a="open" class="mp-btn primary">${esc(tr('mapstep_open', 'Open'))}</button>
            <button data-a="rename" class="mp-btn" title="${esc(tr('mapstep_rename', 'Rename'))}">✎</button>
            <button data-a="dup" class="mp-btn" title="${esc(tr('mapstep_dup', 'Duplicate'))}">⧉</button>
            <button data-a="del" class="mp-btn danger" title="${esc(tr('mapstep_del', 'Delete'))}">🗑</button>
          </div>
        </div>`).join('');
      box.querySelectorAll('.mp-item').forEach(row => row.addEventListener('click', async e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const lib = libLoad(); const rec = lib.find(x => x.id === row.dataset.id); if (!rec) return;
        if (b.dataset.a === 'open') {
          if (hasContent() && !confirm(tr('mapstep_open_confirm', 'Open this plan? Your current board will be replaced.'))) return;
          try { await loadPlan(rec.plan, { id: rec.id, name: rec.name }); closeLibrary(); } catch { toast(tr('mapstep_bad', 'Invalid plan.')); }
        } else if (b.dataset.a === 'rename') {
          const n = prompt(tr('mapstep_rename_ph', 'New name'), rec.name);
          if (n && n.trim()) { rec.name = n.trim().slice(0, 48); libSave(lib); if (P.id === rec.id) P.name = rec.name; renderLibrary(); }
        } else if (b.dataset.a === 'dup') {
          lib.unshift({ ...clone(rec), id: uidGen(), name: rec.name + ' (copy)', created: Date.now(), updated: Date.now() }); libSave(lib.slice(0, MAX_PLANS)); renderLibrary();
        } else if (b.dataset.a === 'del') {
          if (confirm(tr('mapstep_lib_del_confirm', 'Delete "{n}"?', { n: rec.name }))) { libSave(lib.filter(x => x.id !== rec.id)); if (P.id === rec.id) P.id = null; renderLibrary(); }
        }
      }));
    }

    /* ── file helpers, share, export ─────────────────────────── */
    function download(name, data, type) {
      const url = data instanceof Blob ? URL.createObjectURL(data) : URL.createObjectURL(new Blob([data], { type }));
      const a = document.createElement('a'); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    function pickFile(onText) {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.addEventListener('change', async () => {
        const f = inp.files[0]; if (!f) return;
        try { await onText(await f.text()); } catch { toast(tr('mapstep_bad', 'Invalid plan.')); }
      });
      inp.click();
    }

    const b64 = {
      enc: bytes => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
      dec: str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
    };
    async function pipe(bytes, stream) {
      const s = new Blob([bytes]).stream().pipeThrough(stream);
      return new Uint8Array(await new Response(s).arrayBuffer());
    }
    async function encodePlan(o) {
      const raw = new TextEncoder().encode(JSON.stringify(o));
      if (window.CompressionStream) return 'z' + b64.enc(await pipe(raw, new CompressionStream('deflate-raw')));
      return 'j' + b64.enc(raw);
    }
    async function decodePlan(s) {
      const bytes = b64.dec(s.slice(1));
      const raw = s[0] === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
      return JSON.parse(new TextDecoder().decode(raw));
    }

    async function copyShare() {
      const o = exportPlan(true);
      const url = new URL(location.href); url.search = ''; url.hash = '';
      url.searchParams.set('p', await encodePlan(o));
      const s = url.toString();
      if (s.length > 7500) toast(tr('mapstep_link_long', 'This plan is large: the link may not work everywhere. Export it as JSON to be safe.'));
      try { await navigator.clipboard.writeText(s); toast(tr('mapstep_link_copied', '🔗 Link copied — it opens this plan with all its steps.')); }
      catch { window.prompt(tr('mapstep_link_prompt', 'Copy this link:'), s); }
    }

    async function restoreFromURL() {
      const p = new URLSearchParams(location.search).get('p');
      if (!p) return;
      try { await loadPlan(await decodePlan(p)); toast(tr('mapstep_link_loaded', '📥 Shared plan loaded.')); }
      catch (e) { console.warn('Invalid map plan link', e); }
    }

    function exportPNG() {
      capture();
      const c = document.createElement('canvas');
      paintStep(c, P.steps[P.cur], 1, { hud: true, camps: campsForStep(P.steps[P.cur]) });
      c.toBlob(b => { if (b) download(`unitetools-map-${(P.steps[P.cur].label || 'step').replace(/[^\w-]+/g, '_')}.png`, b); }, 'image/png');
    }

    /* ── File menu (fixed-position: the topbar scrolls) ──────── */
    const fbtn = $('file-menu-btn'), flist = $('file-menu-list');
    function closeMenu() { if (flist) { flist.hidden = true; fbtn.setAttribute('aria-expanded', 'false'); } }
    if (fbtn && flist) {
      fbtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = flist.hidden;
        if (open) {
          const r = fbtn.getBoundingClientRect();
          flist.style.top = (r.bottom + 6) + 'px';
          flist.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 230)) + 'px';
        }
        flist.hidden = !open;
        fbtn.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', e => { if (!e.target.closest('#file-menu-list')) closeMenu(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); closeLibrary(); } });
      flist.addEventListener('click', closeMenu);
    }
    const bind = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    bind('plans-btn', openLibrary);
    bind('plan-share-btn', copyShare);
    bind('plan-export-btn', () => download(`${(P.name || 'unitetools-map-plan').replace(/[^\w-]+/g, '_')}.json`, JSON.stringify(exportPlan(false)), 'application/json'));
    bind('plan-import-btn', () => pickFile(async t => {
      if (hasContent() && !confirm(tr('mapstep_open_confirm', 'Open this plan? Your current board will be replaced.'))) return;
      await loadPlan(JSON.parse(t));
    }));
    bind('plan-png-btn', exportPNG);
    bind('clear-draw-btn', () => setTimeout(commit, 0));

    /* ── public API (debug / tests) ──────────────────────────── */
    App.plan = { state: P, goTo, addStep, exportPlan, loadPlan, encodePlan, decodePlan, savePlan, libLoad, capture, commit };

    /* ── boot ────────────────────────────────────────────────── */
    P.steps = [newStep('10:00')];
    histFor(P.steps[0].id);
    renderStrip();
    setTimeout(restoreFromURL, 300);
    setTimeout(commit, 1200);   // baseline after a draft has placed its sprites
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();