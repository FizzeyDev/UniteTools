/**
 * ui-planner.js — Planner panel (goal / optimizer, XP curve, rotation comparator),
 * shareable link and header menus for the XP Calculator.
 *
 * Mounts itself into <div id="xp-planner-mount">. All maths lives in
 * timeline.js (exact) and planner.js (optimizer); this file is UI only.
 */

(function () {
  'use strict';

  const D = window.XPCalcData;
  const S = window.XPCalcState;
  const P = window.XPCalcPlanner;
  const T = window.XPCalcTimeline;
  const $ = id => document.getElementById(id);

  // ─── helpers ──────────────────────────────────────────────────────────────

  function tr(key, fb, vars = {}) {
    const lang = localStorage.getItem('lang') || 'fr';
    let s = window.translations?.[lang]?.[key] ?? fb;
    Object.entries(vars).forEach(([k, v]) => { s = s.split(`{${k}}`).join(v); });
    return s;
  }
  /** Static label: translated now AND re-translated by navbar.js on language change. */
  const L = (key, fb) => `<span data-lang="${key}">${esc(tr(key, fb))}</span>`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mmss = D.secondsToTimer;
  const fmt = n => Math.round(n).toLocaleString();

  const ST = {
    tab: 'goal',
    goalLevel: 7,
    deadline: 300,          // 5:00
    travel: 12,
    kill: 8,
    allies: 0,
    keepWilds: true,
    counts: {},             // per map: { mapId: { id: n } }
    chartMode: 'xp',
    cmpA: 'current',
    cmpB: '',
    last: null,             // last plan result (for "apply")
  };

  function toast(msg) {
    let c = $('xp-toast');
    if (!c) { c = document.createElement('div'); c.id = 'xp-toast'; c.className = 'xp-toast'; document.body.appendChild(c); }
    c.textContent = msg;
    c.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => c.classList.remove('show'), 2400);
  }

  function getWindow() {
    const gi = (id, fb) => { const v = parseInt($(id)?.value); return isNaN(v) ? fb : v; };
    const startSec = gi('start-min', 10) * 60 + gi('start-sec', 0);
    const dur = gi('dur-min', 10) * 60 + gi('dur-sec', 0);
    return { startSec, endSec: Math.max(0, startSec - dur) };
  }

  function loadPresets() {
    try { return JSON.parse(localStorage.getItem('xpcalc_farm_presets') || '[]'); } catch { return []; }
  }

  const isWild = e => e.type === 'wild';
  const entrySec = e => D.timerToSeconds(e.timer);

  function counts() {
    const m = S.currentMap;
    if (!ST.counts[m]) ST.counts[m] = P.defaultCounts(m);
    return ST.counts[m];
  }

  // ─── Chart (canvas) ───────────────────────────────────────────────────────

  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;

  /**
   * Draw one or more XP series.
   * series: [{ label, color, xp:Int32Array, dash?:bool }] — all share startSec/endSec.
   */
  function drawChart(canvas, o) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 600, H = canvas.clientHeight || 260;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const m = { l: 46, r: 14, t: 12, b: 26 };
    const w = W - m.l - m.r, h = H - m.t - m.b;
    const n = Math.max(2, o.startSec - o.endSec + 1);
    const lvlMode = o.mode === 'level';
    const val = x => lvlMode ? D.getLevelFromXP(x) : x;

    let maxV = lvlMode ? 4 : 600;
    o.series.forEach(s => { for (let i = 0; i < s.xp.length; i++) maxV = Math.max(maxV, val(s.xp[i])); });
    if (o.goal) maxV = Math.max(maxV, lvlMode ? o.goal.level : o.goal.needXP);
    if (lvlMode) maxV = Math.min(15, maxV + 1);
    else maxV *= 1.05;
    const minV = lvlMode ? 1 : 0;

    const X = i => m.l + (i / (n - 1)) * w;
    const Y = v => m.t + h - ((v - minV) / (maxV - minV)) * h;

    const textC = css('--text-dim', '#5a7577'), gridC = css('--border', 'rgba(255,255,255,.07)');
    g.font = '11px Rajdhani, sans-serif';
    g.textBaseline = 'middle';

    // horizontal grid
    g.textAlign = 'right';
    if (lvlMode) {
      for (let l = 1; l <= maxV; l++) {
        g.strokeStyle = gridC; g.beginPath(); g.moveTo(m.l, Y(l)); g.lineTo(m.l + w, Y(l)); g.stroke();
        g.fillStyle = textC; g.fillText('Lv.' + l, m.l - 6, Y(l));
      }
    } else {
      for (let l = 2; l <= 15; l++) {
        const xp = D.LEVEL_XP_TABLE[l - 1];
        if (xp > maxV) break;
        g.strokeStyle = gridC; g.beginPath(); g.moveTo(m.l, Y(xp)); g.lineTo(m.l + w, Y(xp)); g.stroke();
        g.fillStyle = textC; g.fillText('Lv.' + l, m.l - 6, Y(xp));
      }
    }
    // vertical ticks every minute
    g.textAlign = 'center';
    for (let t = Math.ceil(o.endSec / 60) * 60; t <= o.startSec; t += 60) {
      const x = X(o.startSec - t);
      g.strokeStyle = gridC; g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, m.t + h); g.stroke();
      g.fillStyle = textC; g.fillText(mmss(t), x, H - 11);
    }

    // goal markers
    if (o.goal) {
      const gc = css('--green', '#4caf82');
      g.save(); g.setLineDash([5, 4]); g.strokeStyle = gc; g.lineWidth = 1.2;
      const gy = Y(lvlMode ? o.goal.level : o.goal.needXP);
      g.beginPath(); g.moveTo(m.l, gy); g.lineTo(m.l + w, gy); g.stroke();
      if (o.goal.deadline != null && o.goal.deadline >= o.endSec && o.goal.deadline <= o.startSec) {
        const gx = X(o.startSec - o.goal.deadline);
        g.beginPath(); g.moveTo(gx, m.t); g.lineTo(gx, m.t + h); g.stroke();
      }
      g.restore();
    }

    // series
    o.series.forEach(s => {
      g.save();
      g.strokeStyle = s.color; g.lineWidth = 2; g.lineJoin = 'round';
      if (s.dash) g.setLineDash([6, 4]);
      g.beginPath();
      for (let i = 0; i < s.xp.length; i++) {
        const x = X(i), y = Y(val(s.xp[i]));
        if (i === 0) g.moveTo(x, y);
        else if (lvlMode) { g.lineTo(x, Y(val(s.xp[i - 1]))); g.lineTo(x, y); }
        else g.lineTo(x, y);
      }
      g.stroke();
      g.restore();
    });

    // hover
    if (o.hover != null && o.hover >= 0 && o.hover < n) {
      const hx = X(o.hover);
      g.strokeStyle = css('--text-mid', '#8aacaf'); g.lineWidth = 1;
      g.beginPath(); g.moveTo(hx, m.t); g.lineTo(hx, m.t + h); g.stroke();
      const lines = [mmss(o.startSec - o.hover)];
      o.series.forEach(s => {
        if (o.hover < s.xp.length) {
          const xp = s.xp[o.hover];
          lines.push(`${s.label}: Lv.${D.getLevelFromXP(xp)} · ${fmt(xp)} XP`);
          g.fillStyle = s.color; g.beginPath(); g.arc(hx, Y(val(xp)), 3.5, 0, 6.3); g.fill();
        }
      });
      g.font = '12px Rajdhani, sans-serif';
      const bw = Math.max(...lines.map(l => g.measureText(l).width)) + 16, bh = lines.length * 16 + 8;
      let bx = hx + 10; if (bx + bw > W - 4) bx = hx - bw - 10;
      g.fillStyle = css('--surface-3', '#1d2e2f'); g.strokeStyle = css('--border-md', 'rgba(255,255,255,.12)');
      g.beginPath(); g.rect(bx, m.t + 4, bw, bh); g.fill(); g.stroke();
      g.fillStyle = css('--text', '#cfe0e2'); g.textAlign = 'left';
      lines.forEach((l, i) => g.fillText(l, bx + 8, m.t + 14 + i * 16));
    }

    canvas._geom = { m, w, n };
  }

  function attachHover(canvas, getOpts) {
    const redraw = hover => drawChart(canvas, { ...getOpts(), hover });
    canvas.addEventListener('mousemove', ev => {
      const r = canvas.getBoundingClientRect();
      const gm = canvas._geom; if (!gm) return;
      const x = ev.clientX - r.left - gm.m.l;
      const i = Math.round((x / gm.w) * (gm.n - 1));
      redraw(Math.max(0, Math.min(gm.n - 1, i)));
    });
    canvas.addEventListener('mouseleave', () => redraw(null));
  }

  function legendHTML(series) {
    return series.map(s =>
      `<span class="xp-legend-item"><i style="background:${s.color};${s.dash ? 'opacity:.7' : ''}"></i>${esc(s.label)}</span>`).join('');
  }

  // ─── Timeline helpers ─────────────────────────────────────────────────────

  function runTimeline(events) {
    const { startSec, endSec } = getWindow();
    const cfg = P.baseConfig(S, startSec, endSec);
    return { cfg, tl: T.run({ ...cfg, events: events.map(P.toEv) }) };
  }

  // ─── UI skeleton ──────────────────────────────────────────────────────────

  function buildUI() {
    const mount = $('xp-planner-mount');
    if (!mount) return;
    mount.innerHTML = `
    <section class="xp-planner" id="xp-planner">
      <div class="xp-pl-head">
        <span class="panel-header-title">${L('xpplan_title', '🧭 Planner')}</span>
        <nav class="xp-pl-tabs" role="tablist">
          <button class="xp-pl-tab active" data-tab="goal">${L('xpplan_tab_goal', '🎯 Goal')}</button>
          <button class="xp-pl-tab" data-tab="curve">${L('xpplan_tab_curve', '📈 Curve')}</button>
          <button class="xp-pl-tab" data-tab="compare">${L('xpplan_tab_compare', '⚖️ Compare')}</button>
        </nav>
      </div>

      <div class="xp-pl-pane" data-pane="goal">
        <div class="xp-pl-controls">
          <div class="xp-pl-field">
            <label class="cfg-label">${L('xpplan_goal_level', 'Target level')}</label>
            <select id="pl-goal-level" class="cfg-input xp-pl-select">${
              Array.from({ length: 14 }, (_, i) => `<option value="${i + 2}">Lv. ${i + 2}</option>`).join('')}</select>
          </div>
          <div class="xp-pl-field">
            <label class="cfg-label">${L('xpplan_goal_deadline', 'By game timer')}</label>
            <div class="timer-input-wrap">
              <input type="number" id="pl-dl-min" class="timer-part" min="0" max="10" value="5">
              <span class="timer-colon">:</span>
              <input type="number" id="pl-dl-sec" class="timer-part" min="0" max="59" value="0">
            </div>
          </div>
          <div class="xp-pl-actions">
            <button class="btn btn-sm btn-green" id="pl-check-btn">${L('xpplan_check_btn', '✅ Check my queue')}</button>
            <button class="btn btn-sm btn-yellow" id="pl-fast-btn">${L('xpplan_fast_btn', '⚡ Fastest rotation')}</button>
          </div>
        </div>

        <details class="xp-pl-adv">
          <summary>${L('xpplan_adv_title', '⚙️ Optimizer settings')}</summary>
          <div class="xp-pl-adv-body">
            <div class="xp-pl-field">
              <label class="cfg-label">${L('xpplan_travel', 'Travel between camps (s)')}</label>
              <input type="number" id="pl-travel" class="cfg-input mini" min="0" max="60" value="12">
            </div>
            <div class="xp-pl-field">
              <label class="cfg-label">${L('xpplan_kill', 'Kill duration (s)')}</label>
              <input type="number" id="pl-kill" class="cfg-input mini" min="1" max="60" value="8">
            </div>
            <div class="xp-pl-field">
              <label class="cfg-label">${L('xpplan_allies', 'Allies sharing camp XP')}</label>
              <select id="pl-allies" class="cfg-input xp-pl-select"><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option></select>
            </div>
            <label class="xp-pl-check"><input type="checkbox" id="pl-keep" checked> ${L('xpplan_keep', 'Keep my current camp kills (plan around them)')}</label>
            <div class="xp-pl-field wide">
              <label class="cfg-label">${L('xpplan_camps', 'Camps you can farm (click to change)')}</label>
              <div class="xp-pl-camps" id="pl-camps"></div>
              <span class="field-hint">${L('xpplan_camps_hint', 'Scores and Player KOs in your queue are always kept. Travel and kill time are estimates — the XP math itself is exact.')}</span>
            </div>
          </div>
        </details>

        <div class="xp-pl-result" id="pl-result">
          <div class="xp-pl-empty">${L('xpplan_result_empty', 'Pick a level and a timer, then check your queue or ask for the fastest rotation.')}</div>
        </div>
      </div>

      <div class="xp-pl-pane" data-pane="curve" hidden>
        <div class="xp-pl-chartbar">
          <div class="xp-pl-seg">
            <button class="active" data-cmode="xp">${L('xpplan_mode_xp', 'XP')}</button>
            <button data-cmode="level">${L('xpplan_mode_level', 'Level')}</button>
          </div>
          <div class="xp-legend" id="pl-legend"></div>
        </div>
        <canvas class="xp-canvas" id="pl-canvas"></canvas>
        <div class="xp-pl-note" id="pl-curve-note"></div>
      </div>

      <div class="xp-pl-pane" data-pane="compare" hidden>
        <div class="xp-pl-controls">
          <div class="xp-pl-field"><label class="cfg-label">${L('xpplan_cmp_a', 'Rotation A')}</label><select id="pl-cmp-a" class="cfg-input xp-pl-select"></select></div>
          <div class="xp-pl-field"><label class="cfg-label">${L('xpplan_cmp_b', 'Rotation B')}</label><select id="pl-cmp-b" class="cfg-input xp-pl-select"></select></div>
        </div>
        <div id="pl-cmp-empty" class="xp-pl-empty" hidden>${L('xpplan_cmp_empty', 'Save at least one preset (Kill Queue → Save Current) to compare it with your current queue.')}</div>
        <div id="pl-cmp-body">
          <canvas class="xp-canvas" id="pl-cmp-canvas"></canvas>
          <div class="xp-legend" id="pl-cmp-legend"></div>
          <div class="xp-pl-tables" id="pl-cmp-tables"></div>
        </div>
      </div>
    </section>`;
    if (typeof window.applyTranslations === 'function' && window.translations) window.applyTranslations();
  }

  // ─── Tabs ─────────────────────────────────────────────────────────────────

  function setTab(tab) {
    ST.tab = tab;
    document.querySelectorAll('.xp-pl-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.xp-pl-pane').forEach(p => { p.hidden = p.dataset.pane !== tab; });
    refresh();
  }

  function refresh() {
    if (ST.tab === 'goal') renderCamps();
    if (ST.tab === 'curve') renderCurve();
    if (ST.tab === 'compare') renderCompare();
  }
  let refreshTimer = null;
  const refreshSoon = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 150); };

  // ─── Goal pane ────────────────────────────────────────────────────────────

  function renderCamps() {
    const box = $('pl-camps'); if (!box) return;
    const c = counts();
    box.innerHTML = '';
    P.farmableMobs(S.currentMap).forEach(mob => {
      const b = document.createElement('button');
      b.type = 'button';
      const n = c[mob.id] != null ? c[mob.id] : 1;
      b.className = 'xp-camp-chip' + (n === 0 ? ' off' : '');
      b.title = mob.name;
      b.innerHTML = `<img src="${esc(mob.img)}" alt="" draggable="false"><span>${esc(mob.name)}</span><b>×${n}</b>`;
      b.querySelector('img').onerror = e => { e.target.style.display = 'none'; };
      b.addEventListener('click', () => { c[mob.id] = (n + 1) % 4; renderCamps(); });
      box.appendChild(b);
    });
  }

  function readGoalInputs() {
    ST.goalLevel = parseInt($('pl-goal-level').value) || 7;
    const { startSec, endSec } = getWindow();
    let dl = (parseInt($('pl-dl-min').value) || 0) * 60 + (parseInt($('pl-dl-sec').value) || 0);
    ST.deadline = Math.max(endSec, Math.min(startSec - 1, dl));
    ST.travel = Math.max(0, parseInt($('pl-travel').value) || 0);
    ST.kill = Math.max(1, parseInt($('pl-kill').value) || 8);
    ST.allies = parseInt($('pl-allies').value) || 0;
    ST.keepWilds = $('pl-keep').checked;
    return { startSec, endSec };
  }

  function setBusy(on) {
    ['pl-check-btn', 'pl-fast-btn'].forEach(id => { $(id).disabled = on; });
    if (on) $('pl-result').innerHTML = `<div class="xp-pl-empty">${L('xpplan_computing', 'Computing…')}</div>`;
  }

  function planOptions(manual) {
    const { startSec, endSec } = getWindow();
    return {
      cfg: P.baseConfig(S, startSec, endSec),
      mapId: S.currentMap, counts: counts(), allies: ST.allies,
      manual, manualWild: manual.filter(isWild),
      goalLevel: ST.goalLevel, travelSec: ST.travel, killSec: ST.kill,
    };
  }

  function killsTable(kills) {
    if (!kills.length) return '';
    const total = kills.reduce((s, k) => s + k.xp, 0);
    return `<div class="xp-kills">${kills.map(k => `
      <div class="xp-kill-row"><span class="t">${mmss(k.t)}</span>
        <img src="${esc(k.img)}" alt="" draggable="false" onerror="this.style.display='none'">
        <span class="n">${esc(k.name)}</span><span class="x">+${fmt(k.xp)}</span></div>`).join('')}
      <div class="xp-kill-total">${esc(tr('xpplan_kills_total', '{n} camps · {xp} XP from camps', { n: kills.length, xp: fmt(total) }))}</div>
    </div>`;
  }

  function groupText(kills) {
    return P.groupKills(kills).map(g => `${g.name} ×${g.n}`).join(', ');
  }

  async function onCheck() {
    const { startSec, endSec } = readGoalInputs();
    const goal = ST.goalLevel, dl = ST.deadline;
    const queue = S.killQueue;
    const base = P.baseConfig(S, startSec, endSec);
    const cur = P.evaluate(base, queue, goal, dl);
    const res = $('pl-result');

    if (cur.reach != null && cur.reach >= dl) {
      res.innerHTML = `<div class="xp-verdict ok">${esc(tr('xpplan_ok', '✅ Reachable: level {lvl} at {t} — {m}s ahead of your {dl} goal.', { lvl: goal, t: mmss(cur.reach), m: cur.reach - dl, dl: mmss(dl) }))}</div>`;
      ST.last = null;
      return;
    }

    setBusy(true);
    const r = await P.planForDeadline({ ...planOptions(queue), deadlineSec: dl });
    setBusy(false);
    // planForDeadline's kills are only the NEW ones (queue entries are fixed events)
    const newKills = r.kills;
    const entries = P.killsToEntries(newKills, ST.allies);
    const head = `<div class="xp-verdict bad">${esc(tr('xpplan_missing', '❌ Not with your queue: you are {xp} XP short of level {lvl} at {dl}.', { xp: fmt(cur.missing), lvl: goal, dl: mmss(dl) }))}</div>`;
    if (r.reached) {
      res.innerHTML = head +
        `<div class="xp-verdict info">${esc(tr('xpplan_suggest', 'Add {n} camp kill(s): {list} → level {lvl} at {t}.', { n: newKills.length, list: groupText(newKills), lvl: goal, t: mmss(r.reach) }))}</div>` +
        killsTable(newKills) + applyBar();
      ST.last = { mode: 'add', entries };
    } else {
      const bestLvl = D.getLevelFromXP(r.xp);
      res.innerHTML = head +
        `<div class="xp-verdict warn">${esc(tr('xpplan_unreachable', 'Even with every camp you selected, level {lvl} by {dl} is out of reach (best: Lv.{best}, {xp} XP).', { lvl: goal, dl: mmss(dl), best: bestLvl, xp: fmt(r.xp) }))}</div>` +
        (newKills.length ? killsTable(newKills) + applyBar() : '');
      ST.last = newKills.length ? { mode: 'add', entries } : null;
    }
    bindApply();
  }

  async function onFast() {
    const { startSec, endSec } = readGoalInputs();
    const goal = ST.goalLevel, dl = ST.deadline;
    const queue = S.killQueue;
    const manual = ST.keepWilds ? queue : queue.filter(e => !isWild(e));
    setBusy(true);
    const r = await P.planFastest(planOptions(manual));
    setBusy(false);
    const res = $('pl-result');
    const entries = P.killsToEntries(r.kills, ST.allies);
    if (!r.reached) {
      res.innerHTML = `<div class="xp-verdict warn">${esc(tr('xpplan_fast_none', 'Level {lvl} cannot be reached before {end} with these settings (best: Lv.{best}, {xp} XP).', { lvl: goal, end: mmss(endSec), best: D.getLevelFromXP(r.xp), xp: fmt(r.xp) }))}</div>` +
        killsTable(r.kills) + (r.kills.length ? applyBar() : '');
      ST.last = r.kills.length ? { mode: 'replace', entries, keep: ST.keepWilds } : null;
    } else {
      const elapsed = startSec - r.reach;
      let line = esc(tr('xpplan_fast_ok', '⚡ Fastest rotation: level {lvl} at {t} ({el} into the game).', { lvl: goal, t: mmss(r.reach), el: mmss(elapsed) }));
      const cmp = r.reach >= dl
        ? `<div class="xp-verdict ok">${esc(tr('xpplan_fast_meets', '✅ Meets your {dl} goal with {m}s to spare.', { dl: mmss(dl), m: r.reach - dl }))}</div>`
        : `<div class="xp-verdict bad">${esc(tr('xpplan_fast_late', '❌ Too late for your {dl} goal by {m}s — even the best rotation misses it.', { dl: mmss(dl), m: dl - r.reach }))}</div>`;
      res.innerHTML = `<div class="xp-verdict info">${line}</div>${cmp}${killsTable(r.kills)}${applyBar()}`;
      ST.last = { mode: 'replace', entries, keep: ST.keepWilds };
    }
    bindApply();
  }

  function applyBar() {
    return `<div class="xp-apply-bar">
      <button class="btn btn-sm btn-blue" id="pl-apply">${L('xpplan_apply', '➕ Apply to my queue')}</button>
      <button class="btn btn-sm btn-ghost" id="pl-see-curve">${L('xpplan_see_curve', '📈 See the curve')}</button>
      <span class="field-hint">${esc(tr('xpplan_estimate', 'Estimate: {tr}s travel + {k}s kill per camp.', { tr: ST.travel, k: ST.kill }))}</span>
    </div>`;
  }

  function bindApply() {
    $('pl-apply')?.addEventListener('click', () => {
      const l = ST.last; if (!l) return;
      const q = S.killQueue;
      const kept = l.mode === 'add' ? q : (l.keep ? q : q.filter(e => !isWild(e)));
      S.killQueue = kept.concat(l.entries).sort((a, b) => entrySec(b) - entrySec(a));
      window.XPCalcQueue.renderKillQueue();
      toast(tr('xpplan_applied', 'Queue updated ({n} camp kills added).', { n: l.entries.length }));
      $('pl-apply').disabled = true;
    });
    $('pl-see-curve')?.addEventListener('click', () => setTab('curve'));
  }

  // ─── Curve pane ───────────────────────────────────────────────────────────

  function curveSeries(queueEvents) {
    const { cfg, tl } = runTimeline(queueEvents);
    const series = [{ label: tr('xpplan_series_you', 'You'), color: css('--yellow', '#ffd740'), xp: tl.p }];
    if (tl.allyActive) series.push({ label: tr('xpplan_series_ally', 'Ally'), color: css('--teal', '#26c6da'), xp: tl.a });
    if (tl.enemyActive) series.push({ label: tr('xpplan_series_enemy', 'Enemy'), color: css('--red', '#ef5350'), xp: tl.e });
    return { cfg, tl, series };
  }

  function goalMarker() {
    const lvl = parseInt($('pl-goal-level')?.value) || ST.goalLevel;
    return { level: lvl, needXP: D.LEVEL_XP_TABLE[lvl - 1], deadline: ST.deadline };
  }

  function renderCurve() {
    const canvas = $('pl-canvas'); if (!canvas) return;
    const { cfg, tl, series } = curveSeries(S.killQueue);
    const opts = () => ({ series, startSec: cfg.startSec, endSec: cfg.endSec, mode: ST.chartMode, goal: goalMarker() });
    drawChart(canvas, opts());
    if (!canvas._hoverBound) { canvas._hoverBound = true; attachHover(canvas, () => canvas._opts()); }
    canvas._opts = opts;
    $('pl-legend').innerHTML = legendHTML(series);

    const finalLvl = D.getLevelFromXP(tl.p[tl.n - 1]);
    const marks = [5, 7, 9, 11, 13].map(l => {
      const r = T.reachSec(tl, l);
      return r != null ? `Lv.${l} → ${mmss(r)}` : null;
    }).filter(Boolean);
    let note = tr('xpplan_curve_note', 'Final: Lv.{lvl} ({xp} XP). {marks}',
      { lvl: finalLvl, xp: fmt(tl.p[tl.n - 1]), marks: marks.length ? marks.join(' · ') : '' });
    const stored = tl.s[tl.n - 1];
    if (stored > 0) note += ' ' + tr('xpplan_curve_stored', '📦 {xp} Stored XP is waiting (the curve stays flat on the level before an evolution until a kill converts it).', { xp: fmt(stored) });
    $('pl-curve-note').textContent = note;
  }

  // ─── Compare pane ─────────────────────────────────────────────────────────

  function sourceList() {
    const out = [{ id: 'current', name: tr('xpplan_cmp_current', 'My current queue'), queue: S.killQueue }];
    loadPresets().forEach((p, i) => out.push({ id: 'p' + i, name: '💾 ' + p.name, queue: p.queue }));
    return out;
  }

  function renderCompare() {
    const list = sourceList();
    const a = $('pl-cmp-a'), b = $('pl-cmp-b');
    if (!a) return;
    const opts = list.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    a.innerHTML = opts; b.innerHTML = opts;
    if (!list.some(s => s.id === ST.cmpA)) ST.cmpA = 'current';
    if (!list.some(s => s.id === ST.cmpB)) ST.cmpB = list[1] ? list[1].id : 'current';
    a.value = ST.cmpA; b.value = ST.cmpB;

    const empty = list.length < 2;
    $('pl-cmp-empty').hidden = !empty;
    $('pl-cmp-body').hidden = empty;
    if (empty) return;

    const A = list.find(s => s.id === ST.cmpA), B = list.find(s => s.id === ST.cmpB);
    const ra = runTimeline(A.queue), rb = runTimeline(B.queue);
    const series = [
      { label: 'A · ' + A.name, color: css('--yellow', '#ffd740'), xp: ra.tl.p },
      { label: 'B · ' + B.name, color: css('--blue', '#4fc3f7'), xp: rb.tl.p, dash: true },
    ];
    const canvas = $('pl-cmp-canvas');
    const opts2 = () => ({ series, startSec: ra.cfg.startSec, endSec: ra.cfg.endSec, mode: ST.chartMode === 'level' ? 'level' : 'xp' });
    drawChart(canvas, opts2());
    canvas._opts = opts2;
    if (!canvas._hoverBound) { canvas._hoverBound = true; attachHover(canvas, () => canvas._opts()); }
    $('pl-cmp-legend').innerHTML = legendHTML(series);

    // checkpoints table
    const { startSec, endSec } = ra.cfg;
    const cps = [480, 360, 240, 120, 0].filter(t => t < startSec && t >= endSec);
    const row = t => {
      const xa = T.xpAt(ra.tl, t), xb = T.xpAt(rb.tl, t);
      const la = D.getLevelFromXP(xa), lb = D.getLevelFromXP(xb);
      const dl = la - lb, dx = xa - xb;
      const cls = dx > 0 ? 'a' : dx < 0 ? 'b' : '';
      return `<tr><td>${mmss(t)}</td><td>Lv.${la} <small>${fmt(xa)}</small></td><td>Lv.${lb} <small>${fmt(xb)}</small></td>
        <td class="d ${cls}">${dx === 0 ? '=' : (dx > 0 ? 'A ' : 'B ') + '+' + Math.abs(dl) + ' lv · ' + fmt(Math.abs(dx)) + ' XP'}</td></tr>`;
    };
    const lvRows = [];
    for (let l = 3; l <= 15; l++) {
      const ta = T.reachSec(ra.tl, l), tb = T.reachSec(rb.tl, l);
      if (ta == null && tb == null) continue;
      const w = ta != null && tb != null ? (ta > tb ? 'a' : ta < tb ? 'b' : '') : (ta != null ? 'a' : 'b');
      lvRows.push(`<tr><td>Lv.${l}</td><td class="${w === 'a' ? 'win' : ''}">${ta != null ? mmss(ta) : '—'}</td><td class="${w === 'b' ? 'win' : ''}">${tb != null ? mmss(tb) : '—'}</td></tr>`);
    }
    $('pl-cmp-tables').innerHTML = `
      <table class="xp-cmp-table"><caption>${esc(tr('xpplan_cmp_checkpoints', 'Level at game timer'))}</caption>
        <thead><tr><th>${esc(tr('xpplan_cmp_timer', 'Timer'))}</th><th>A</th><th>B</th><th>${esc(tr('xpplan_cmp_diff', 'Difference'))}</th></tr></thead>
        <tbody>${cps.map(row).join('')}</tbody></table>
      <table class="xp-cmp-table"><caption>${esc(tr('xpplan_cmp_reach', 'Level reached at'))}</caption>
        <thead><tr><th>${esc(tr('xpplan_cmp_level', 'Level'))}</th><th>A</th><th>B</th></tr></thead>
        <tbody>${lvRows.join('')}</tbody></table>`;
  }

  // ─── Share link ───────────────────────────────────────────────────────────

  const b64 = {
    enc: s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    dec: s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))),
  };
  const slim = e => { const { img, name, ...rest } = e; return rest; };

  function findWild(id) {
    for (const m of Object.keys(D.WILD_DATA)) {
      const w = D.WILD_DATA[m].find(x => x.id === id);
      if (w) return w;
    }
    return null;
  }
  const fatten = e => {
    if (e.type !== 'wild') return e;
    const w = findWild(e.id);
    return { ...e, name: w ? w.name : e.id, img: w ? w.img : '' };
  };

  function serializeState() {
    const { startSec, endSec } = getWindow();
    const o = {
      v: 1, pk: S.selectedPokemon, sl: S.startLevel, es: S.expShareEnabled ? 1 : 0, m: S.currentMap,
      st: startSec, du: startSec - endSec, el: S.enemyHighestLevel, esl: S.enemyStartLevel, asl: S.allyStartLevel,
      q: S.killQueue.map(slim),
    };
    if (S.allyKillQueue.length) o.aq = S.allyKillQueue.map(slim);
    if (S.enemyKillQueue.length) o.eq = S.enemyKillQueue.map(slim);
    o.g = { l: ST.goalLevel, d: ST.deadline };
    return o;
  }

  function buildShareURL() {
    const u = new URL(location.href);
    u.search = ''; u.hash = '';
    u.searchParams.set('s', b64.enc(JSON.stringify(serializeState())));
    return u.toString();
  }

  function applyState(o) {
    if (!o || o.v !== 1) return false;
    S.startLevel = Math.min(15, Math.max(1, o.sl | 0 || 1));
    S.expShareEnabled = !!o.es;
    if ($('exp-share-toggle')) $('exp-share-toggle').checked = S.expShareEnabled;
    S.enemyHighestLevel = Math.min(15, Math.max(1, o.el | 0 || 1));
    S.enemyStartLevel = Math.min(15, Math.max(1, o.esl | 0 || 1));
    S.allyStartLevel = Math.min(15, Math.max(1, o.asl | 0 || 1));
    $('enemy-lvl-display').textContent = S.enemyHighestLevel;
    $('enemy-start-lvl-display').textContent = S.enemyStartLevel;
    $('ally-lvl-display').textContent = S.allyStartLevel;

    if (o.m && D.WILD_DATA[o.m]) {
      S.currentMap = o.m;
      document.querySelectorAll('.wild-panel .map-pill').forEach(b => b.classList.toggle('active', b.dataset.map === o.m));
      window.XPCalcUI.renderWildGrid(o.m);
    }
    const st = o.st != null ? o.st : 600, du = o.du != null ? o.du : 600;
    $('start-min').value = Math.floor(st / 60); $('start-sec').value = st % 60;
    $('dur-min').value = Math.floor(du / 60); $('dur-sec').value = du % 60;

    if (o.pk) {
      const poke = D.PLAYER_POKEMON.find(p => p.name === o.pk);
      if (poke) window.XPCalcUI.selectPokemon(poke);
    }
    S.killQueue = (o.q || []).map(fatten);
    S.allyKillQueue = (o.aq || []).map(fatten);
    S.enemyKillQueue = (o.eq || []).map(fatten);
    window.XPCalcUI.updateLevelDisplay();
    window.XPCalcUI.updateCatchUpDisplay();
    window.XPCalcUI.updateAllyExpShareDisplay();
    window.XPCalcQueue.renderKillQueue();

    if (o.g) {
      ST.goalLevel = o.g.l || ST.goalLevel; ST.deadline = o.g.d != null ? o.g.d : ST.deadline;
      $('pl-goal-level').value = ST.goalLevel;
      $('pl-dl-min').value = Math.floor(ST.deadline / 60); $('pl-dl-sec').value = ST.deadline % 60;
    }
    return true;
  }

  async function copyShare() {
    readGoalInputs();
    const url = buildShareURL();
    try { await navigator.clipboard.writeText(url); toast(tr('xpplan_link_copied', '🔗 Link copied — it contains your Pokémon, levels, queue and goal.')); }
    catch { window.prompt(tr('xpplan_link_prompt', 'Copy this link:'), url); }
  }

  function restoreFromURL() {
    const s = new URLSearchParams(location.search).get('s');
    if (!s) return;
    try {
      if (applyState(JSON.parse(b64.dec(s)))) toast(tr('xpplan_link_loaded', '📥 Shared setup loaded.'));
    } catch (e) { console.warn('Invalid XP calculator link', e); }
  }

  // ─── Header menus ─────────────────────────────────────────────────────────

  function bindMenus() {
    document.querySelectorAll('.tb-menu').forEach(menu => {
      const btn = menu.querySelector('.tb-menu-btn'), list = menu.querySelector('.tb-menu-list');
      if (!btn || !list) return;
      btn.addEventListener('click', e => { e.stopPropagation(); const open = list.hidden; closeMenus(); list.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
      list.addEventListener('click', () => { list.hidden = true; });
    });
    document.addEventListener('click', closeMenus);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });
  }
  function closeMenus() { document.querySelectorAll('.tb-menu-list').forEach(l => { l.hidden = true; }); }

  // ─── Wiring ───────────────────────────────────────────────────────────────

  function init() {
    buildUI();
    bindMenus();
    if ($('shareLinkBtn')) $('shareLinkBtn').addEventListener('click', copyShare);
    if ($('preset-share-btn')) $('preset-share-btn').addEventListener('click', copyShare);

    const root = $('xp-planner'); if (!root) return;
    root.querySelectorAll('.xp-pl-tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    $('pl-check-btn').addEventListener('click', onCheck);
    $('pl-fast-btn').addEventListener('click', onFast);
    $('pl-goal-level').value = ST.goalLevel;
    $('pl-goal-level').addEventListener('change', () => { readGoalInputs(); if (ST.tab === 'curve') renderCurve(); });
    ['pl-dl-min', 'pl-dl-sec'].forEach(id => $(id).addEventListener('input', () => { readGoalInputs(); if (ST.tab === 'curve') refreshSoon(); }));
    root.querySelectorAll('[data-cmode]').forEach(b => b.addEventListener('click', () => {
      ST.chartMode = b.dataset.cmode;
      root.querySelectorAll('[data-cmode]').forEach(x => x.classList.toggle('active', x === b));
      refresh();
    }));
    $('pl-cmp-a').addEventListener('change', e => { ST.cmpA = e.target.value; renderCompare(); });
    $('pl-cmp-b').addEventListener('change', e => { ST.cmpB = e.target.value; renderCompare(); });

    // Keep curve / compare / camp chips in sync with the rest of the page
    document.addEventListener('click', e => {
      if (e.target.closest('.map-pill, #exp-share-toggle, .step-btn, .preset-chip, #preset-chips, .kill-queue-panel, .modal-overlay')) refreshSoon();
    });
    document.addEventListener('input', e => { if (e.target.closest('.session-config-block, #exp-share-toggle')) refreshSoon(); });
    document.addEventListener('change', refreshSoon);
    const ql = $('kill-queue-list');
    if (ql) new MutationObserver(refreshSoon).observe(ql, { childList: true });
    window.addEventListener('resize', () => { if (ST.tab !== 'goal') refreshSoon(); });

    restoreFromURL();
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.XPCalcPlannerUI = { serializeState, applyState, buildShareURL, state: ST };
})();