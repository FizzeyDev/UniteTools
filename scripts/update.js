/**
 * update.js — changelog page
 *
 * The HTML of update.html stays the way you write it (one .update-entry per version,
 * optional .change-section blocks, <li class="change-item"> with a .change-category badge).
 * This script only ENHANCES it:
 *   - search + filters by tool and by type (New / Update / Fix …)
 *   - one tab per tool inside each version, so a big release is not one long list
 *   - tool chips, counters and a one-line teaser on every version header
 *   - month separators, "Expand all", deep links (update.html#v4.0.0)
 * Nothing to change in the HTML to add a new version.
 */

/* ── Tools: matched from the section titles ─────────────────────────────── */
const TOOLS = [
  { id: 'calc',   label: 'Damage Calculator',     icon: '🧮', color: '#4fc3f7' },
  { id: 'exp',    label: 'Experience Calculator', icon: '📈', color: '#4caf82' },
  { id: 'tier',   label: 'Tier List',             icon: '🏆', color: '#ffd740' },
  { id: 'draft',  label: 'Draft Simulator',       icon: '⚔️', color: '#9f53ec' },
  { id: 'map',    label: 'Interactive Map',       icon: '🗺️', color: '#ff9d00' },
  { id: 'timer',  label: 'Map Timer',             icon: '⏱️', color: '#ef5350' },
  { id: 'patch',  label: 'Patch Tracker',         icon: '⚡', color: '#b07ef5' },
  { id: 'dex',    label: 'Pokédex',               icon: '📖', color: '#4dd0e1' },
  { id: 'games',  label: 'Unite Games',           icon: '🎮', color: '#f06292' },
  { id: 'stream', label: 'Stream Overlay',        icon: '📺', color: '#7986cb' },
  { id: 'site',   label: 'Site & Navigation',     icon: '🌐', color: '#8aacaf' },
  { id: 'other',  label: 'Other',                 icon: '•',  color: '#8aacaf' },
];
const TOOL_BY_ID = Object.fromEntries(TOOLS.map(t => [t.id, t]));

const CATS = [
  { id: 'new',    cls: 'cat-new',    label: 'New' },
  { id: 'update', cls: 'cat-update', label: 'Update' },
  { id: 'fix',    cls: 'cat-fix',    label: 'Fix' },
  { id: 'design', cls: 'cat-design', label: 'Design' },
  { id: 'wip',    cls: 'cat-wip',    label: 'WIP' },
];

/** Section title -> { tool, sub }  ("Unite Tools - Damage Calculator - Compare Patch" -> calc / "Compare Patch") */
function classify(rawTitle) {
  const clean = rawTitle
    .replace(/^\s*\[NEW\]\s*[-—]\s*/i, '')
    .replace(/^\s*(Unite Tools|Pokemon Unite|Unite Games|Unite Other)\s*[-—]\s*/i, '')
    .trim();
  const l = clean.toLowerCase();
  const m = (re) => re.test(l);
  let tool = 'other', sub = '';

  if (m(/damage calc|build optimizer|combat log|compare (patch|tab)/)) {
    tool = 'calc';
    const x = /^damage calculator\s*[-—]\s*(.+)$/i.exec(clean);
    if (x) sub = x[1];
    else if (!m(/^damage calc/)) sub = clean.replace(/\s*\(damage calculator\)\s*/i, '');
  }
  else if (m(/draft/))                                    tool = 'draft';
  else if (m(/tier ?list/))                               tool = 'tier';
  else if (m(/patch tracker/))                            tool = 'patch';
  else if (m(/interactive map/))                          tool = 'map';
  else if (m(/map timer/))                                tool = 'timer';
  else if (m(/experience/))                               tool = 'exp';
  else if (m(/pok[eé]dex/))                               tool = 'dex';
  else if (m(/skin-?dle|pok[eé]dle|unite-?dle|pok[eé]who|pok[eé]search|wordsearch|games/)) { tool = 'games'; sub = clean; }
  else if (m(/stream/))                                   tool = 'stream';
  else if (m(/global|general|navigation|home|about|important/)) { tool = 'site'; sub = clean; }
  else sub = clean;

  return { tool, sub, clean };
}

function sectionLabel(info) {
  if (info.tool === 'site' || info.tool === 'other') return info.clean.replace(/&amp;/g, '&');
  if (info.tool === 'games') return /^unite games/i.test(info.sub) ? info.sub : `Unite Games — ${info.sub}`;
  return info.sub ? `${TOOL_BY_ID[info.tool].label} — ${info.sub}` : TOOL_BY_ID[info.tool].label;
}

const catOf = li => {
  for (const c of CATS) if (li.querySelector('.' + c.cls)) return c.id;
  return 'update';
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── Parse the page ─────────────────────────────────────────────────────── */
const timeline = document.querySelector('.timeline');
const entries = [];

function parseEntries() {
  [...timeline.querySelectorAll(':scope > .update-entry')].forEach((el, idx) => {
    const header  = el.querySelector('.update-card-header');
    const body    = el.querySelector('.update-card-body');
    const content = el.querySelector('.update-card-content');
    const chevron = el.querySelector('.update-chevron');
    const version = el.querySelector('.update-version')?.textContent.trim() || '';
    const dateTxt = el.querySelector('.update-date')?.textContent.trim() || '';

    // Old entries have a bare list: wrap it in a "General" section
    if (!content.querySelector(':scope > .change-section')) {
      const sec = document.createElement('div');
      sec.className = 'change-section';
      sec.innerHTML = '<div class="change-section-title">General</div>';
      content.querySelectorAll(':scope > ul.change-list').forEach(ul => sec.appendChild(ul));
      content.appendChild(sec);
    }
    content.querySelectorAll(':scope > br').forEach(b => b.remove());

    const sections = [...content.querySelectorAll(':scope > .change-section')].map(sec => {
      const titleEl = sec.querySelector('.change-section-title');
      const info = classify(titleEl.textContent);
      sec.dataset.tool = info.tool;
      titleEl.innerHTML = `<span class="cs-dot" style="background:${TOOL_BY_ID[info.tool].color}"></span>${esc(sectionLabel(info))}`;
      const items = [...sec.querySelectorAll('.change-item')].map(li => {
        const text = li.textContent.replace(/\s+/g, ' ').trim();
        return { li, cat: catOf(li), text };
      });
      return { el: sec, tool: info.tool, items };
    });

    const d = new Date(dateTxt);
    entries.push({
      el, header, body, content, chevron, version, dateTxt, sections,
      id: 'v' + version.replace(/^v/i, '').replace(/\./g, '-'),
      month: isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      tab: 'all', open: false, latest: idx === 0,
    });
  });
}

/* ── Entry decoration: header chips, counters, teaser, tabs ─────────────── */
function decorateEntry(e) {
  e.el.id = e.id;
  e.el.classList.toggle('is-latest', e.latest);

  const tools = [...new Set(e.sections.map(s => s.tool))];
  const counts = {};
  e.sections.forEach(s => s.items.forEach(i => { counts[i.cat] = (counts[i.cat] || 0) + 1; }));

  // Header: chips + counters between the version and the date
  const meta = document.createElement('div');
  meta.className = 'uc-meta';
  const MAX = 2;
  meta.innerHTML =
    (e.latest ? '<span class="update-badge-latest">Latest</span>' : '') +
    '<span class="uc-tools">' +
    tools.slice(0, MAX).map(id => `<span class="uc-chip" style="--c:${TOOL_BY_ID[id].color}" title="${esc(TOOL_BY_ID[id].label)}"><i>${TOOL_BY_ID[id].icon}</i><b>${esc(TOOL_BY_ID[id].label)}</b></span>`).join('') +
    (tools.length > MAX ? `<span class="uc-chip uc-more" title="${esc(tools.slice(MAX).map(id => TOOL_BY_ID[id].label).join(', '))}">+${tools.length - MAX}</span>` : '') +
    '</span>' +
    '<span class="uc-counts">' +
    CATS.filter(c => counts[c.id]).map(c => `<span class="uc-count ${c.cls}" title="${c.label}">${counts[c.id]}</span>`).join('') +
    '</span>';
  e.header.insertBefore(meta, e.header.querySelector('.update-date'));

  // Teaser line while collapsed: first "New" item (else first item)
  const all = e.sections.flatMap(s => s.items);
  const pick = all.find(i => i.cat === 'new') || all[0];
  if (pick) {
    const t = document.createElement('div');
    t.className = 'uc-teaser';
    const txt = pick.text.replace(/^(New|Update|Fix|Design|WIP)\s*/i, '');
    t.textContent = txt.length > 140 ? txt.slice(0, 137).trimEnd() + '…' : txt;
    e.header.parentNode.insertBefore(t, e.body);
    e.teaser = t;
  }

  // Tabs when the version touches several tools
  if (tools.length > 1) {
    const bar = document.createElement('div');
    bar.className = 'uc-tabs';
    bar.setAttribute('role', 'tablist');
    e.content.insertBefore(bar, e.content.firstChild);
    e.tabsEl = bar;
    bar.addEventListener('click', ev => {
      const b = ev.target.closest('.uc-tab');
      if (!b) return;
      e.tab = b.dataset.tab;
      renderEntry(e);
    });
  }
  e.tools = tools;
}

/* ── Filtering ──────────────────────────────────────────────────────────── */
const state = { q: '', tools: new Set(), cats: new Set() };
const filtersOn = () => !!state.q || state.tools.size > 0 || state.cats.size > 0;

function matches(sectionTool, item) {
  if (state.tools.size && !state.tools.has(sectionTool)) return false;
  if (state.cats.size && !state.cats.has(item.cat)) return false;
  if (state.q && !item.text.toLowerCase().includes(state.q)) return false;
  return true;
}

function highlight(item) {
  const q = state.q;
  const textSpan = item.li.lastElementChild;           // the <span> that wraps badge + text
  if (!textSpan) return;
  textSpan.innerHTML = item.htmlInner;
  if (!q) return;
  const walker = document.createTreeWalker(textSpan, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => {
    const low = n.nodeValue.toLowerCase();
    let at = low.indexOf(q);
    if (at < 0) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    while (at >= 0) {
      frag.appendChild(document.createTextNode(n.nodeValue.slice(last, at)));
      const mk = document.createElement('mark');
      mk.textContent = n.nodeValue.slice(at, at + q.length);
      frag.appendChild(mk);
      last = at + q.length;
      at = low.indexOf(q, last);
    }
    frag.appendChild(document.createTextNode(n.nodeValue.slice(last)));
    n.parentNode.replaceChild(frag, n);
  });
}

/** Re-render one entry: item visibility, tab counts, which sections show. */
function renderEntry(e) {
  const perTool = {};
  let total = 0;
  e.sections.forEach(s => {
    let shown = 0;
    s.items.forEach(i => {
      const ok = matches(s.tool, i);
      i.li.hidden = !ok;
      if (ok) shown++;
    });
    s.shown = shown;
    perTool[s.tool] = (perTool[s.tool] || 0) + shown;
    total += shown;
  });
  e.total = total;

  if (e.tab !== 'all' && !perTool[e.tab]) e.tab = 'all';

  e.sections.forEach(s => {
    s.el.hidden = !s.shown || (e.tab !== 'all' && s.tool !== e.tab);
  });

  if (e.tabsEl) {
    const tabs = [{ id: 'all', label: 'All', icon: '', n: total }]
      .concat(e.tools.filter(id => perTool[id]).map(id => ({ id, label: TOOL_BY_ID[id].label, icon: TOOL_BY_ID[id].icon, n: perTool[id] })));
    e.tabsEl.innerHTML = tabs.map(t =>
      `<button type="button" role="tab" class="uc-tab ${e.tab === t.id ? 'active' : ''}" data-tab="${t.id}" aria-selected="${e.tab === t.id}"` +
      (t.id !== 'all' ? ` style="--c:${TOOL_BY_ID[t.id].color}"` : '') + `>${t.icon ? `<i>${t.icon}</i>` : ''}${esc(t.label)}<span>${t.n}</span></button>`).join('');
    e.tabsEl.hidden = tabs.length <= 2 && !e.tabsEl.dataset.keep;   // a single tool left: no need for tabs
  }
  e.el.hidden = total === 0;
}

function applyFilters() {
  entries.forEach(e => {
    // keep the original markup of each item so <mark> can be removed again
    e.sections.forEach(s => s.items.forEach(i => {
      if (i.htmlInner === undefined) i.htmlInner = i.li.lastElementChild ? i.li.lastElementChild.innerHTML : '';
    }));
    renderEntry(e);
    e.sections.forEach(s => s.items.forEach(i => { if (!i.li.hidden) highlight(i); }));
    if (filtersOn()) { if (!e.el.hidden) setOpen(e, true, true); }
  });
  if (!filtersOn()) entries.forEach(e => setOpen(e, e.latest, true));

  // month separators
  let monthEl = null, any = false;
  [...timeline.children].forEach(node => {
    if (node.classList.contains('tl-month')) {
      if (monthEl) monthEl.hidden = !any;
      monthEl = node; any = false;
    } else if (!node.hidden) any = true;
  });
  if (monthEl) monthEl.hidden = !any;

  const vis = entries.filter(e => !e.el.hidden);
  const changes = vis.reduce((n, e) => n + e.total, 0);
  const cnt = document.getElementById('ufCount');
  if (cnt) cnt.textContent = filtersOn() ? `${changes} change${changes === 1 ? '' : 's'} in ${vis.length} version${vis.length === 1 ? '' : 's'}` : '';
  document.getElementById('ufReset').hidden = !filtersOn();
  document.getElementById('ufEmpty').hidden = vis.length > 0;
  document.querySelectorAll('#ufTools .uf-chip').forEach(b => b.classList.toggle('active', state.tools.has(b.dataset.id)));
  document.querySelectorAll('#ufCats .uf-chip').forEach(b => b.classList.toggle('active', state.cats.has(b.dataset.id)));
}

/* ── Open / close with a height that never clips ────────────────────────── */
function setOpen(e, open, instant = false) {
  if (e.open === open && e.initialised) return;
  e.open = open; e.initialised = true;
  const body = e.body;
  body.classList.toggle('open', open);
  e.chevron.classList.toggle('open', open);
  e.el.classList.toggle('is-open', open);
  e.header.setAttribute('aria-expanded', open ? 'true' : 'false');
  body.onTransitionEnd && body.removeEventListener('transitionend', body.onTransitionEnd);

  if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    body.style.maxHeight = open ? 'none' : '0px';
    return;
  }
  if (open) {
    body.style.maxHeight = body.scrollHeight + 'px';
    body.onTransitionEnd = () => { if (e.open) body.style.maxHeight = 'none'; body.removeEventListener('transitionend', body.onTransitionEnd); };
    body.addEventListener('transitionend', body.onTransitionEnd);
  } else {
    body.style.maxHeight = body.scrollHeight + 'px';
    void body.offsetHeight;                      // force a reflow so the transition runs from the real height
    body.style.maxHeight = '0px';
  }
}

// The HTML calls toggleCard(this) from each header
window.toggleCard = function (header) {
  const e = entries.find(x => x.header === header);
  if (!e) return;
  setOpen(e, !e.open);
  if (e.open && history.replaceState) history.replaceState(null, '', '#' + e.id);
};

/* ── Toolbar + month separators ─────────────────────────────────────────── */
function buildToolbar() {
  const toolCount = {}, catCount = {};
  entries.forEach(e => e.sections.forEach(s => s.items.forEach(i => {
    toolCount[s.tool] = (toolCount[s.tool] || 0) + 1;
    catCount[i.cat] = (catCount[i.cat] || 0) + 1;
  })));

  const bar = document.createElement('div');
  bar.className = 'uf-bar';
  bar.innerHTML = `
    <div class="uf-row">
      <label class="uf-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m16.5 16.5 3.5 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="ufSearch" type="search" placeholder="Search the changelog…  ( / )" autocomplete="off" aria-label="Search the changelog">
      </label>
      <button type="button" class="uf-btn" id="ufToggleAll">Expand all</button>
    </div>
    <div class="uf-row uf-chips" id="ufTools" role="group" aria-label="Filter by tool">
      ${TOOLS.filter(t => toolCount[t.id]).map(t => `<button type="button" class="uf-chip" data-id="${t.id}" style="--c:${t.color}"><i>${t.icon}</i>${esc(t.label)}<span>${toolCount[t.id]}</span></button>`).join('')}
    </div>
    <div class="uf-row">
      <div class="uf-chips" id="ufCats" role="group" aria-label="Filter by type">
        ${CATS.filter(c => catCount[c.id]).map(c => `<button type="button" class="uf-chip uf-cat ${c.cls}" data-id="${c.id}">${c.label}<span>${catCount[c.id]}</span></button>`).join('')}
      </div>
      <span class="uf-count" id="ufCount" aria-live="polite"></span>
      <button type="button" class="uf-btn uf-reset" id="ufReset" hidden>✕ Reset</button>
    </div>`;
  timeline.parentNode.insertBefore(bar, timeline);

  const empty = document.createElement('div');
  empty.className = 'uf-empty';
  empty.id = 'ufEmpty';
  empty.hidden = true;
  empty.innerHTML = 'No update matches your filters. <button type="button" class="uf-btn" id="ufEmptyReset">Reset filters</button>';
  timeline.parentNode.insertBefore(empty, timeline.nextSibling);

  const search = document.getElementById('ufSearch');
  let timer = null;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = search.value.trim().toLowerCase(); applyFilters(); }, 120);
  });
  document.getElementById('ufTools').addEventListener('click', ev => {
    const b = ev.target.closest('.uf-chip'); if (!b) return;
    state.tools.has(b.dataset.id) ? state.tools.delete(b.dataset.id) : state.tools.add(b.dataset.id);
    applyFilters();
  });
  document.getElementById('ufCats').addEventListener('click', ev => {
    const b = ev.target.closest('.uf-chip'); if (!b) return;
    state.cats.has(b.dataset.id) ? state.cats.delete(b.dataset.id) : state.cats.add(b.dataset.id);
    applyFilters();
  });
  const reset = () => { state.q = ''; state.tools.clear(); state.cats.clear(); search.value = ''; applyFilters(); };
  document.getElementById('ufReset').addEventListener('click', reset);
  document.getElementById('ufEmptyReset').addEventListener('click', reset);

  const toggleAll = document.getElementById('ufToggleAll');
  toggleAll.addEventListener('click', () => {
    const expand = toggleAll.dataset.state !== 'open';
    entries.filter(e => !e.el.hidden).forEach(e => setOpen(e, expand, true));
    toggleAll.dataset.state = expand ? 'open' : '';
    toggleAll.textContent = expand ? 'Collapse all' : 'Expand all';
  });

  document.addEventListener('keydown', ev => {
    const tag = document.activeElement?.tagName;
    if (ev.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { ev.preventDefault(); search.focus(); }
    else if (ev.key === 'Escape' && document.activeElement === search) { search.value = ''; state.q = ''; applyFilters(); search.blur(); }
  });
}

function addMonthSeparators() {
  let last = '';
  entries.forEach(e => {
    if (e.month && e.month !== last) {
      const m = document.createElement('div');
      m.className = 'tl-month';
      m.textContent = e.month;
      timeline.insertBefore(m, e.el);
      last = e.month;
    }
  });
}

/* ── Boot ───────────────────────────────────────────────────────────────── */
function init() {
  if (!timeline) return;
  parseEntries();
  if (!entries.length) return;
  entries.forEach(decorateEntry);
  addMonthSeparators();
  buildToolbar();
  entries.forEach(e => { e.header.setAttribute('role', 'button'); e.header.tabIndex = 0; });
  timeline.addEventListener('keydown', ev => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList.contains('update-card-header')) {
      ev.preventDefault(); window.toggleCard(ev.target);
    }
  });
  applyFilters();

  // Deep link: update.html#v3-9-0 (or #v3.9.0)
  const h = decodeURIComponent(location.hash.slice(1)).replace(/\./g, '-');
  const target = h && entries.find(e => e.id === h);
  if (target) {
    setOpen(target, true, true);
    setTimeout(() => target.el.scrollIntoView({ block: 'start' }), 60);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();