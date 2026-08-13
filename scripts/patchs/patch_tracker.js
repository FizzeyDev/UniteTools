const IMG_BASE = 'assets/pokemon/';

/* ── Info modal styles ───────────────────────────────────────────────────── */
(function injectInfoStyles() {
  const s = document.createElement('style');
  s.textContent = `
    .info-modal-body { color: #c0c8d8; font-size: 0.88rem; line-height: 1.6; }
    .info-header { display:flex; align-items:center; gap:12px; margin-bottom:20px;
      padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.08); }
    .info-section { margin-bottom:18px; }
    .info-section-title { font-size:0.9rem; font-weight:700; color:#e0e0e0;
      margin:0 0 8px; letter-spacing:0.03em; }
    .info-section p { margin:4px 0; }
    .info-list { margin:4px 0; padding-left:18px; }
    .info-list li { margin-bottom:4px; }
    .info-shortcuts { display:grid; grid-template-columns:auto 1fr; gap:6px 12px;
      background:rgba(0,0,0,0.2); border-radius:8px; padding:12px; }
    .shortcut-row { display:contents; }
    .shortcut-row kbd { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15);
      border-radius:4px; padding:2px 7px; font-family:monospace; font-size:0.8rem;
      color:#e0e0e0; white-space:nowrap; align-self:center; }
    .shortcut-row span { align-self:center; color:#9aabb8; font-size:0.82rem; }
    .info-legend { display:flex; flex-direction:column; gap:6px; margin-bottom:6px; }
    .info-legend span.pill { margin-right:8px; }
    .info-disclaimer { background:rgba(255,180,0,0.05); border:1px solid rgba(255,180,0,0.15);
      border-radius:8px; padding:12px; }
    .info-disclaimer h3 { color:#ffd740; }
    .info-disclaimer a { color:#4fc3f7; }
    .info-trigger:hover { border-color:rgba(255,255,255,0.3) !important;
      background:rgba(255,255,255,0.05) !important; }
  `;
  document.head.appendChild(s);
})();

function t(key, fallback = key) {
  return (window.LANG && window.LANG[key]) ? window.LANG[key] : fallback;
}

let PATCHES     = [];
let POKEMON     = [];
let PATCH_LINKS = {};
let POKEMON_MAP = {};

let view    = 'patches';
let filter  = 'all';
let search  = '';
let sortKey = 'buffs';
let sortDir = 'desc';

const ROLE_COLORS = {
  atk: { bg: 'rgba(239,83,80,0.12)',  text: '#ef5350' },
  def: { bg: 'rgba(76,175,130,0.12)', text: '#4caf82' },
  spe: { bg: 'rgba(79,195,247,0.12)', text: '#4fc3f7' },
  sup: { bg: 'rgba(255,215,64,0.10)', text: '#ffd740' },
  all: { bg: 'rgba(159,83,236,0.12)', text: '#b07ef5' },
};
// English fallback text for t(), keyed by the abbreviated role codes used in
// data/pokemons.json ('atk'/'def'/'spe'/'sup'/'all') — same convention as pokedex.js.
const ROLE_FALLBACK = {
  atk: 'Attacker', def: 'Defender', spe: 'Speedster', sup: 'Supporter', all: 'All-Rounder',
};
function rc(role) {
  return ROLE_COLORS[role] || { bg: 'rgba(255,255,255,0.05)', text: '#6a8587' };
}

// Map abbreviated role codes (as used in data/pokemons.json: atk/def/spe/sup/all)
// to the existing "patch_role_*" translation keys (full-word based, already
// present in en/fr/ja.json) so existing translations keep working.
const ROLE_KEYS = {
  atk: 'patch_role_attacker',
  def: 'patch_role_defender',
  spe: 'patch_role_speedster',
  sup: 'patch_role_supporter',
  all: 'patch_role_all_rounder',
};
function roleKey(role) {
  return ROLE_KEYS[role] || 'patch_role_unknown';
}
function roleLabel(role) {
  return t(roleKey(role), ROLE_FALLBACK[role] || role || '—');
}

function diffClass(diff) {
  if (diff === 'Novice') return 'diff-novice';
  if (diff === 'Intermédiaire') return 'diff-intermediaire';
  if (diff === 'Expert') return 'diff-expert';
  return '';
}
function diffKey(diff) {
  if (diff === 'Novice') return 'patch_diff_novice';
  if (diff === 'Intermédiaire') return 'patch_diff_intermediate';
  if (diff === 'Expert') return 'patch_diff_expert';
  return null;
}
function porteeKey(portee) {
  if (!portee) return null;
  const v = portee.toLowerCase();
  if (v.includes('mêlée') || v.includes('melee')) return 'patch_portee_melee';
  if (v.includes('distance') || v.includes('ranged')) return 'patch_portee_ranged';
  return null;
}

function spriteUrl(name) {
  const p = POKEMON_MAP[name];
  return p?.file ? IMG_BASE + p.file : null;
}

function avatar(name, role, size = 44) {
  const c        = rc(role);
  const initials = name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  const url      = spriteUrl(name);
  const isMega   = !!POKEMON_MAP[name]?.mega;
  const ring     = `border:2px solid ${c.text};box-shadow:0 0 0 3px ${c.bg};`;
  const base     = `width:${size}px;height:${size}px;${ring}`;
  const megaFlag = isMega
    ? `<span class="mega-flag${size >= 56 ? ' mega-flag-lg' : ''}" data-lang="patch_mega_flag">${t('patch_mega_flag','MEGA')}</span>`
    : '';
  if (url) {
    const fb = `this.parentNode.innerHTML='<div style=\\'${base}background:${c.bg};color:${c.text};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(size * 0.3)}px;\\'>${initials}</div>'`;
    return `<div class="poke-avatar-wrap">
      <div class="poke-avatar" style="${base}background:${c.bg};">
        <img src="${url}" alt="${name}" loading="lazy" onerror="${fb}"/>
      </div>${megaFlag}
    </div>`;
  }
  return `<div class="poke-avatar-wrap">
    <div class="poke-avatar" style="${base}background:${c.bg};color:${c.text};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.3)}px;font-weight:700;">${initials}</div>${megaFlag}
  </div>`;
}

function tagSprite(name) {
  const url = spriteUrl(name);
  if (!url) return '';
  return `<img src="${url}" alt="" loading="lazy" width="18" height="18"
    style="object-fit:contain;border-radius:50%;vertical-align:middle;"
    onerror="this.style.display='none'"/>`;
}

function fmtDate(d) {
  const locale = (window.LANG && window.LANG._locale) ? window.LANG._locale : 'fr-FR';
  return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}
function getYear(d) { return d.split('-')[0]; }

function getStats(name) {
  let buffs = 0, nerfs = 0, tweaks = 0;
  PATCHES.forEach(p => {
    if (p.buffs.includes(name))  buffs++;
    if (p.nerfs.includes(name))  nerfs++;
    if (p.tweaks.includes(name)) tweaks++;
  });
  return { buffs, nerfs, tweaks };
}

function getHistory(name) {
  return PATCHES.reduce((acc, p) => {
    const types = [];
    if (p.buffs.includes(name))  types.push('buff');
    if (p.nerfs.includes(name))  types.push('nerf');
    if (p.tweaks.includes(name)) types.push('tweak');
    if (types.length) acc.push({ version: p.version, date: p.date, patchName: p.name, types });
    return acc;
  }, []);
}

function getTrend(name) {
  let s = 0;
  PATCHES.slice(0, 5).forEach(p => {
    if (p.buffs.includes(name)) s++;
    if (p.nerfs.includes(name)) s--;
  });
  return s;
}

function renderStats() {
  let tb = 0, tn = 0;
  PATCHES.forEach(p => { tb += p.buffs.length; tn += p.nerfs.length; });

  // Most buffed / most nerfed
  const buffCount = {}, nerfCount = {};
  POKEMON.forEach(p => {
    buffCount[p.name] = 0;
    nerfCount[p.name] = 0;
  });
  PATCHES.forEach(p => {
    p.buffs.forEach(n => { if (buffCount[n] !== undefined) buffCount[n]++; });
    p.nerfs.forEach(n => { if (nerfCount[n] !== undefined) nerfCount[n]++; });
  });
  const mostBuffed = Object.entries(buffCount).sort((a,b) => b[1]-a[1])[0];
  const mostNerfed = Object.entries(nerfCount).sort((a,b) => b[1]-a[1])[0];

  document.getElementById('stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-val v-accent">${PATCHES.length}</div>
      <div class="stat-lbl" data-lang="patch_stat_patches">${t('patch_stat_patches','Patches')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-val v-buff">${tb}</div>
      <div class="stat-lbl" data-lang="patch_stat_buffs">${t('patch_stat_buffs','Total Buffs')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-val v-nerf">${tn}</div>
      <div class="stat-lbl" data-lang="patch_stat_nerfs">${t('patch_stat_nerfs','Total Nerfs')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-val v-accent">${POKEMON.length}</div>
      <div class="stat-lbl" data-lang="patch_stat_pokemon">${t('patch_stat_pokemon','Tracked Pokémon')}</div>
    </div>
    ${mostBuffed ? `<div class="stat-card" title="${mostBuffed[0]} - ${mostBuffed[1]} buffs" style="cursor:pointer;" onclick="openModal('${mostBuffed[0]}')">
      <div class="stat-val v-buff" style="font-size:0.85rem;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${tagSprite(mostBuffed[0])} ${mostBuffed[0]}</div>
      <div class="stat-lbl"><span data-lang="patch_most_buffed_label">${t('patch_most_buffed_label','▲ Most buffed')}</span> (${mostBuffed[1]})</div>
    </div>` : ''}
    ${mostNerfed ? `<div class="stat-card" title="${mostNerfed[0]} - ${mostNerfed[1]} nerfs" style="cursor:pointer;" onclick="openModal('${mostNerfed[0]}')">
      <div class="stat-val v-nerf" style="font-size:0.85rem;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${tagSprite(mostNerfed[0])} ${mostNerfed[0]}</div>
      <div class="stat-lbl"><span data-lang="patch_most_nerfed_label">${t('patch_most_nerfed_label','▼ Most nerfed')}</span> (${mostNerfed[1]})</div>
    </div>` : ''}
  `;
}

/* ── Info / How-to-use modal ─────────────────────────────────────────────── */
function openInfoModal() {
  const infoModal = document.getElementById('infoModal');
  if (infoModal) { infoModal.classList.add('open'); return; }

  // Create modal on first open
  const el = document.createElement('div');
  el.id = 'infoModal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'How to use');
  el.innerHTML = `
    <button class="modal-close" id="infoModalClose" aria-label="Close">✕</button>
    <div class="info-modal-body">
      <div class="info-header">
        <span style="font-size:1.6rem;">⚡</span>
        <div>
          <h2 style="margin:0;font-size:1.2rem;color:#e0e0e0;" data-lang="patch_htu_title">${t('patch_htu_title','Pokémon Unite - Patch Tracker')}</h2>
          <p style="margin:0;font-size:0.8rem;color:#6a8587;" data-lang="patch_htu_subtitle">${t('patch_htu_subtitle','Community tool · Unofficial')}</p>
        </div>
      </div>

      <section class="info-section">
        <h3 class="info-section-title" data-lang="patch_htu_what_title">${t('patch_htu_what_title','📋 What is this?')}</h3>
        <p data-lang="patch_htu_what_desc">${t('patch_htu_what_desc','This tool lets you browse every balance patch in Pokémon Unite history. You can see which Pokémon were buffed, nerfed or tweaked in each update, filter by role or change type, search by name or version, and view the full history of any individual Pokémon.')}</p>
      </section>

      <section class="info-section">
        <h3 class="info-section-title" data-lang="patch_htu_views_title">${t('patch_htu_views_title','🗂️ Views')}</h3>
        <ul class="info-list">
          <li data-lang="patch_htu_views_patches"><strong>${t('patch_tab_patches','Patches')}</strong> - ${t('patch_htu_views_patches_desc','chronological list of all patches, grouped by year. Click a card to expand it and see all changes.')}</li>
          <li data-lang="patch_htu_views_pokemon"><strong>${t('patch_tab_pokemon','By Pokémon')}</strong> - ${t('patch_htu_views_pokemon_desc','grid of all tracked Pokémon sorted by buff/nerf count. Click any card to see its full patch history.')}</li>
        </ul>
      </section>

      <section class="info-section">
        <h3 class="info-section-title" data-lang="patch_htu_keyboard_title">${t('patch_htu_keyboard_title','⌨️ Keyboard shortcuts')}</h3>
        <div class="info-shortcuts">
          <div class="shortcut-row"><kbd>/</kbd><span data-lang="patch_htu_kbd_search">${t('patch_htu_kbd_search','Focus the search bar')}</span></div>
          <div class="shortcut-row"><kbd>Esc</kbd><span data-lang="patch_htu_kbd_esc">${t('patch_htu_kbd_esc','Close modal / clear search')}</span></div>
          <div class="shortcut-row"><kbd>1</kbd><span data-lang="patch_htu_kbd_tab1">${t('patch_htu_kbd_tab1','Switch to Patches view')}</span></div>
          <div class="shortcut-row"><kbd>2</kbd><span data-lang="patch_htu_kbd_tab2">${t('patch_htu_kbd_tab2','Switch to By Pokémon view')}</span></div>
          <div class="shortcut-row"><kbd>↹ Tab</kbd><span data-lang="patch_htu_kbd_tabnav">${t('patch_htu_kbd_tabnav','Move focus between cards')}</span></div>
          <div class="shortcut-row"><kbd>Enter</kbd><span data-lang="patch_htu_kbd_enter">${t('patch_htu_kbd_enter','Open focused patch / Pokémon')}</span></div>
          <div class="shortcut-row"><kbd>B</kbd><span data-lang="patch_htu_kbd_buff">${t('patch_htu_kbd_buff','Filter Buffs')}</span></div>
          <div class="shortcut-row"><kbd>N</kbd><span data-lang="patch_htu_kbd_nerf">${t('patch_htu_kbd_nerf','Filter Nerfs')}</span></div>
          <div class="shortcut-row"><kbd>T</kbd><span data-lang="patch_htu_kbd_tweak">${t('patch_htu_kbd_tweak','Filter Tweaks')}</span></div>
          <div class="shortcut-row"><kbd>A</kbd><span data-lang="patch_htu_kbd_all">${t('patch_htu_kbd_all','Reset filter to All')}</span></div>
          <div class="shortcut-row"><kbd>?</kbd><span data-lang="patch_htu_kbd_help">${t('patch_htu_kbd_help','Open this help panel')}</span></div>
        </div>
      </section>

      <section class="info-section">
        <h3 class="info-section-title" data-lang="patch_htu_search_title">${t('patch_htu_search_title','🔍 Search tips')}</h3>
        <ul class="info-list">
          <li data-lang="patch_htu_search_1">${t('patch_htu_search_1','Search by <strong>Pokémon name</strong> (e.g. <em>Charizard</em>) to find all patches it appeared in.')}</li>
          <li data-lang="patch_htu_search_2">${t('patch_htu_search_2','Search by <strong>version number</strong> (e.g. <em>1.22</em>) to filter patches.')}</li>
          <li data-lang="patch_htu_search_3">${t('patch_htu_search_3','Search by <strong>patch name</strong> (e.g. <em>Balance</em>) to find seasonal patches.')}</li>
          <li data-lang="patch_htu_search_4">${t('patch_htu_search_4','Click any Pokémon tag inside a patch to open its full history modal.')}</li>
        </ul>
      </section>

      <section class="info-section">
        <h3 class="info-section-title" data-lang="patch_htu_legend_title">${t('patch_htu_legend_title','📊 Legend')}</h3>
        <div class="info-legend">
          <span class="pill pill-buff">▲ ${t('patch_badge_buff','Buff')}</span> <span data-lang="patch_htu_legend_buff">${t('patch_htu_legend_buff','The Pokémon received a positive balance change.')}</span>
          <span class="pill pill-nerf">▼ ${t('patch_badge_nerf','Nerf')}</span> <span data-lang="patch_htu_legend_nerf">${t('patch_htu_legend_nerf','The Pokémon received a negative balance change.')}</span>
          <span class="pill pill-tweak">● ${t('patch_badge_tweak','Tweak')}</span> <span data-lang="patch_htu_legend_tweak">${t('patch_htu_legend_tweak','A neutral adjustment (rework, number change with unclear impact).')}</span>
          <span class="pill pill-misc">⚙ ${t('patch_qol_label','QoL')}</span> <span data-lang="patch_htu_legend_qol">${t('patch_htu_legend_qol','Patch with no Pokémon balance changes (bug fixes, shop updates, etc).')}</span>
        </div>
        <p style="margin-top:8px;font-size:0.8rem;color:#6a8587;" data-lang="patch_htu_legend_bar">${t('patch_htu_legend_bar','The <strong>balance bar</strong> on Pokémon cards shows buff % vs nerf %. The <strong>trend arrow</strong> (↑ ↓ -) reflects the last 5 patches only.')}</p>
      </section>

      <section class="info-section info-disclaimer">
        <h3 class="info-section-title" data-lang="patch_htu_disclaimer_title">${t('patch_htu_disclaimer_title','⚠️ Disclaimer')}</h3>
        <p data-lang="patch_htu_disclaimer_1">${t('patch_htu_disclaimer_1','This tracker is <strong>community-maintained and unofficial</strong>. Some data may be incomplete, inaccurate or missing - especially for older patches. Buff/nerf/tweak categorisation is subjective and based on available information at the time of entry.')}</p>
        <p data-lang="patch_htu_disclaimer_2">${t('patch_htu_disclaimer_2','For official and authoritative patch notes, always refer to the')} <a href="https://community.pokemon.com/en-us/categories/pokemon-unite" target="_blank" rel="noopener" data-lang="patch_htu_disclaimer_link">${t('patch_htu_disclaimer_link','official Pokémon Unite community forum')}</a>.</p>
      </section>
    </div>
  `;

  el.style.cssText = `
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.95);
    background:#1a2332;border:1px solid rgba(255,255,255,0.1);border-radius:12px;
    padding:24px;width:min(600px,92vw);max-height:85vh;overflow-y:auto;
    z-index:1001;opacity:0;transition:opacity 0.2s,transform 0.2s;
  `;
  document.body.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%,-50%) scale(1)';
  });

  document.getElementById('infoModalClose').addEventListener('click', closeInfoModal);
}

function closeInfoModal() {
  const el = document.getElementById('infoModal');
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%,-50%) scale(0.95)';
    setTimeout(() => el.remove(), 200);
  }
}

function buildFilterBar() {
  const fb = document.getElementById('filterBar');

  if (view === 'patches') {
    fb.innerHTML = [
      ['all',   'patch_filter_all',   'All',    ''],
      ['buff',  'patch_filter_buff',  'Buffs',  '▲ '],
      ['nerf',  'patch_filter_nerf',  'Nerfs',  '▼ '],
      ['tweak', 'patch_filter_tweak', 'Tweaks', '● '],
      ['misc',  'patch_filter_qol',   'QoL',    '⚙ '],
    ].map(([v, lk, lf, icon]) =>
      `<button class="filter-btn ${filter === v ? 'active' : ''}" data-f="${v}" data-lang="${lk}">${icon}${t(lk, lf)}</button>`
    ).join('');

  } else {
    const roleFilters = [
      ['any', 'patch_filter_all_role',  'All'],
      ['atk', 'patch_filter_atk',       'Attacker'],
      ['def', 'patch_filter_def',       'Defender'],
      ['sup', 'patch_filter_sup',       'Supporter'],
      ['all', 'patch_filter_all_round', 'All-Rounder'],
      ['spe', 'patch_filter_spe',       'Speedster'],
    ];

    const sortOptions = [
      ['buffs',   'patch_sort_buffs',   'Sort by buffs'],
      ['nerfs',   'patch_sort_nerfs',   'Sort by nerfs'],
      ['tweaks',  'patch_sort_tweaks',  'Sort by tweaks'],
      ['total',   'patch_sort_total',   'Sort by total'],
      ['balance', 'patch_sort_balance', 'Sort by balance'],
      ['name',    'patch_sort_name',    'Sort by name'],
    ];

    const sortDirLabel = sortDir === 'desc'
      ? t('patch_sort_desc', '↓ Desc.')
      : t('patch_sort_asc',  '↑ Asc.');

    fb.innerHTML = `
      ${roleFilters.map(([v, lk, lf]) =>
        `<button class="filter-btn ${filter === v ? 'active' : ''}" data-f="${v}" data-lang="${lk}">${t(lk, lf)}</button>`
      ).join('')}
      <select class="sort-select" id="sortSel">
        ${sortOptions.map(([v, lk, lf]) =>
          `<option value="${v}" ${sortKey === v ? 'selected' : ''}>${t(lk, lf)}</option>`
        ).join('')}
      </select>
      <button class="filter-btn" id="sortDirBtn">${sortDirLabel}</button>
    `;

    document.getElementById('sortSel').addEventListener('change', e => {
      sortKey = e.target.value;
      renderPoke();
    });
    document.getElementById('sortDirBtn').addEventListener('click', () => {
      sortDir = sortDir === 'desc' ? 'asc' : 'desc';
      buildFilterBar();
      renderPoke();
    });
  }

  document.querySelectorAll('.filter-btn[data-f]').forEach(b => {
    b.addEventListener('click', () => {
      filter = b.dataset.f;
      buildFilterBar();
      view === 'patches' ? renderPatches() : renderPoke();
    });
  });
}

function renderPatches() {
  const q = search.toLowerCase();
  const list = PATCHES.filter(p => {
    const hay = [...p.buffs, ...p.nerfs, ...p.tweaks, p.version, p.name].join(' ').toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (filter === 'buff')  return p.buffs.length > 0;
    if (filter === 'nerf')  return p.nerfs.length > 0;
    if (filter === 'tweak') return p.tweaks.length > 0;
    if (filter === 'misc')  return p.buffs.length === 0 && p.nerfs.length === 0 && p.tweaks.length === 0;
    return true;
  });

  const content = document.getElementById('mainContent');
  if (!list.length) {
    content.innerHTML = `<div class="empty" data-lang="patch_empty">${t('patch_empty','No patch found.')}</div>`;
    return;
  }

  const byYear = {};
  list.forEach(p => {
    const y = getYear(p.date);
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(p);
  });
  const years = Object.keys(byYear).sort((a, b) => b - a);

  content.innerHTML = years.map(y => `
    <div class="year-label">${y}</div>
    ${byYear[y].map(patchCardHTML).join('')}
  `).join('');

  content.querySelectorAll('.patch-header').forEach(h => {
    h.addEventListener('click', () => {
      const card = h.closest('.patch-card');
      const body = card.querySelector('.patch-body');
      const open = card.classList.toggle('open');
      body.style.display = open ? 'block' : 'none';
      h.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  content.querySelectorAll('.poke-tag[data-poke]').forEach(tag => {
    tag.addEventListener('click', e => { e.stopPropagation(); openModal(tag.dataset.poke); });
  });
}

function patchCardHTML(p) {
  const hasC = p.buffs.length + p.nerfs.length + p.tweaks.length > 0;
  const url  = PATCH_LINKS[p.version];

  const pills = [
    p.buffs.length  ? `<span class="pill pill-buff">▲ ${p.buffs.length}</span>`  : '',
    p.nerfs.length  ? `<span class="pill pill-nerf">▼ ${p.nerfs.length}</span>`  : '',
    p.tweaks.length ? `<span class="pill pill-tweak">● ${p.tweaks.length}</span>` : '',
    !hasC           ? `<span class="pill pill-misc">⚙ ${t('patch_qol_label','QoL')}</span>` : '',
  ].join('');

  const makeCol = (items, cls, icon, lk, lf) => items.length ? `
    <div class="change-col col-${cls}">
      <div class="col-title" data-lang="${lk}">${icon} ${t(lk, lf)}</div>
      ${items.map(n => `<span class="poke-tag poke-tag-${cls}" data-poke="${n}" tabindex="0" role="button">${tagSprite(n)} ${n}</span>`).join('')}
    </div>` : '';

  const cols = makeCol(p.buffs,  'buff',  '▲', 'patch_buffs_label',  'Buffs')
             + makeCol(p.nerfs,  'nerf',  '▼', 'patch_nerfs_label',  'Nerfs')
             + makeCol(p.tweaks, 'tweak', '●', 'patch_tweaks_label', 'Tweaks');

  return `
  <div class="patch-card">
    <div class="patch-header" tabindex="0" role="button" aria-expanded="false" aria-label="${p.name} ${p.version}">
      <div class="patch-left">
        <span class="ver-badge">${p.version}</span>
        <div class="patch-meta">
          <span class="patch-name">${p.name}</span>
          <span class="patch-date">${fmtDate(p.date)}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="patch-pills">${pills}</div>
        <span class="expand-icon">▾</span>
      </div>
    </div>
    <div class="patch-body" style="display:none;">
      ${cols ? `<div class="change-grid">${cols}</div>` : ''}
      ${p.notes ? `<div class="patch-notes">${p.notes}</div>` : ''}
      ${url ? `
        <a class="official-link" href="${url}" target="_blank" rel="noopener noreferrer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <polyline points="15 3 21 3 21 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span data-lang="patch_official_link">${t('patch_official_link','Official notes')}</span>
        </a>` : ''}
    </div>
  </div>`;
}

function renderPoke() {
  const q = search.toLowerCase();

  const list = POKEMON
    .filter(p => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (filter !== 'any' && p.role !== filter)  return false;
      return true;
    })
    .map(p => {
      const s = getStats(p.name);
      return { ...p, ...s, total: s.buffs + s.nerfs + s.tweaks, balance: s.buffs - s.nerfs };
    })
    .sort((a, b) => {
      const v = sortKey === 'name'    ? a.name.localeCompare(b.name)
              : sortKey === 'balance' ? a.balance - b.balance
              :                        (a[sortKey] || 0) - (b[sortKey] || 0);
      return sortDir === 'desc' ? -v : v;
    });

  const content = document.getElementById('mainContent');
  if (!list.length) {
    content.innerHTML = `<div class="empty" data-lang="patch_empty_pokemon">${t('patch_empty_pokemon','No Pokémon found.')}</div>`;
    return;
  }

  content.innerHTML = `<div class="poke-grid">${list.map(pokeCardHTML).join('')}</div>`;
  content.querySelectorAll('.poke-card').forEach(c => {
    c.addEventListener('click', () => openModal(c.dataset.name));
  });
}

function pokeCardHTML(p) {
  const c       = rc(p.role);
  const trend   = getTrend(p.name);
  const trendEl = trend > 0
    ? `<span class="trend trend-up" title="${t('patch_trend_up','Trending up')}">↑</span>`
    : trend < 0
    ? `<span class="trend trend-down" title="${t('patch_trend_down','Trending down')}">↓</span>`
    : `<span class="trend trend-stable" title="${t('patch_trend_stable','Stable')}">-</span>`;

  const total    = p.buffs + p.nerfs;
  const barPct   = total > 0 ? Math.round(p.buffs / total * 100) : 50;
  const barClass = p.buffs > p.nerfs ? 'bar-buff' : p.nerfs > p.buffs ? 'bar-nerf' : 'bar-neutral';

  const dKey     = diffKey(p.difficulte);
  const diffPill = dKey ? `<span class="diff-pill ${diffClass(p.difficulte)}" data-lang="${dKey}">${t(dKey, p.difficulte)}</span>` : '';

  const pKey     = porteeKey(p.portee);
  const porteeEl = pKey ? `<span class="poke-portee" data-lang="${pKey}">${t(pKey, p.portee)}</span>` : '';

  return `
  <div class="poke-card role-${p.role || 'none'}" data-name="${p.name}" tabindex="0" role="button" aria-label="${p.name}">
    ${avatar(p.name, p.role, 64)}
    <div class="poke-info">
      <div class="poke-name">${p.name}</div>
      <div class="poke-sub">
        <span class="poke-role role-${p.role}"><span class="dot dot-${p.role}"></span><span data-lang="${roleKey(p.role)}">${roleLabel(p.role)}</span></span>
        ${porteeEl}
      </div>
      ${diffPill}
    </div>
    <div class="balance-bar"><div class="bar-fill ${barClass}" style="width:${barPct}%"></div></div>
    <div class="poke-stats-row">
      <span class="stat-chip chip-buff">▲ ${p.buffs}</span>
      <span class="stat-chip chip-nerf">▼ ${p.nerfs}</span>
      ${p.tweaks ? `<span class="stat-chip chip-tweak">● ${p.tweaks}</span>` : ''}
      ${trendEl}
    </div>
  </div>`;
}

function openModal(name) {
  const poke    = POKEMON_MAP[name] || { name, role: 'all' };
  const history = getHistory(name);
  const stats   = getStats(name);
  const balance = stats.buffs - stats.nerfs;
  const bc      = balance > 0 ? 'bs-pos' : balance < 0 ? 'bs-neg' : 'bs-neu';
  const bLabel  = balance > 0
    ? `+${balance} ${t('patch_balance_pos','Positive trend')}`
    : balance < 0
    ? `${balance} ${t('patch_balance_neg','Negative trend')}`
    : t('patch_balance_neu','Neutral');

  const histRows = history.length === 0
    ? `<div class="h-empty" data-lang="patch_history_empty">${t('patch_history_empty','No changes recorded.')}</div>`
    : history.map(h => {
        const url   = PATCH_LINKS[h.version];
        const verEl = url
          ? `<a class="h-ver" href="${url}" target="_blank" rel="noopener noreferrer">${h.version} ↗</a>`
          : `<span class="h-ver">${h.version}</span>`;
        const badges = h.types.map(tp =>
          `<span class="h-badge hb-${tp}" data-lang="patch_badge_${tp}">${t('patch_badge_'+tp, tp)}</span>`
        ).join('');
        return `
        <div class="h-entry">
          <div class="h-meta">
            ${verEl}
            <span class="h-date">${fmtDate(h.date)}</span>
            <span class="h-pname">${h.patchName}</span>
          </div>
          <div class="h-badges">${badges}</div>
        </div>`;
      }).join('');

  const pKey      = porteeKey(poke.portee);
  const porteeTxt = pKey ? ` · ${t(pKey, poke.portee)}` : '';

  document.getElementById('modalBody').innerHTML = `
    <div class="m-header role-${poke.role || 'none'}">
      ${avatar(name, poke.role, 60)}
      <div>
        <div class="m-name" id="modalPokeName">${name}</div>
        <div class="m-role role-${poke.role}" data-lang="${roleKey(poke.role)}">${roleLabel(poke.role)}${porteeTxt}</div>
        <span class="balance-score ${bc}">${bLabel}</span>
      </div>
    </div>
    <div class="m-stats">
      <div class="m-stat">
        <div class="m-stat-val buff">▲ ${stats.buffs}</div>
        <div class="m-stat-lbl" data-lang="patch_buffs_label">${t('patch_buffs_label','Buffs')}</div>
      </div>
      <div class="m-stat">
        <div class="m-stat-val nerf">▼ ${stats.nerfs}</div>
        <div class="m-stat-lbl" data-lang="patch_nerfs_label">${t('patch_nerfs_label','Nerfs')}</div>
      </div>
      <div class="m-stat">
        <div class="m-stat-val tweak">● ${stats.tweaks}</div>
        <div class="m-stat-lbl" data-lang="patch_tweaks_label">${t('patch_tweaks_label','Tweaks')}</div>
      </div>
      <div class="m-stat">
        <div class="m-stat-val">${history.length}</div>
        <div class="m-stat-lbl" data-lang="patch_modal_patches">${t('patch_modal_patches','patches')}</div>
      </div>
    </div>
    ${history.length > 0 ? buildTimelineHTML(history) : ''}
    <div class="h-list-title" data-lang="patch_history_full">${t('patch_history_full','Full history')}</div>
    ${histRows}
  `;

  document.getElementById('modal').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}

function buildTimelineHTML(history) {
  const items  = [...history].reverse();
  const COL_W  = 52, DOT_R = 11, SVG_H = 90;
  const CX = COL_W / 2, DOT_Y = 30;
  const LABEL_Y = DOT_Y + DOT_R + 10;
  const totalW  = items.length * COL_W;

  const connector = `<line x1="${CX}" y1="${DOT_Y}" x2="${totalW - CX}" y2="${DOT_Y}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;

  const colorMap = {
    buff:  { fill:'rgba(76,175,130,0.2)',  stroke:'#4caf82', text:'#4caf82', symbol:'▲' },
    nerf:  { fill:'rgba(239,83,80,0.2)',   stroke:'#ef5350', text:'#ef5350', symbol:'▼' },
    tweak: { fill:'rgba(255,215,64,0.15)', stroke:'#ffd740', text:'#ffd740', symbol:'●' },
    both:  { fill:'rgba(159,83,236,0.15)', stroke:'rgba(159,83,236,0.6)', text:'#b07ef5', symbol:'~' },
  };

  const dots = items.map((h, i) => {
    const x       = i * COL_W + CX;
    const hasBuff = h.types.includes('buff'), hasNerf = h.types.includes('nerf');
    const key     = hasBuff && hasNerf ? 'both' : hasBuff ? 'buff' : hasNerf ? 'nerf' : 'tweak';
    const c       = colorMap[key];
    const ver     = h.version.replace(/^1\./, '');
    const typeLabel = h.types.map(tp => t('patch_badge_'+tp, tp)).join(' + ');
    return `
    <g style="cursor:default;">
      <title>${h.version} - ${h.patchName} (${typeLabel})</title>
      <circle cx="${x}" cy="${DOT_Y}" r="${DOT_R}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>
      <text x="${x}" y="${DOT_Y+4}" text-anchor="middle" font-size="9" font-weight="700" fill="${c.text}" font-family="Exo 2,sans-serif">${c.symbol}</text>
      <text x="${x}" y="${LABEL_Y}" text-anchor="start" font-size="9" fill="#6a8587" font-family="Rajdhani,sans-serif"
        transform="rotate(45,${x},${LABEL_Y})">${ver}</text>
    </g>`;
  }).join('');

  const legendItems = [
    ['buff','patch_badge_buff'],['nerf','patch_badge_nerf'],['tweak','patch_badge_tweak'],['both','']
  ].map(([key, lk]) => {
    const c = colorMap[key];
    const label = key === 'both'
      ? `${t('patch_badge_buff','Buff')} + ${t('patch_badge_nerf','Nerf')}`
      : t(lk, key);
    return `<span class="tl-legend-item"><span class="tl-legend-dot" style="background:${c.stroke};"></span>${label}</span>`;
  }).join('');

  return `
  <div class="timeline-section">
    <div class="timeline-title">
      <span data-lang="patch_chart_label">${t('patch_chart_label','Patch evolution')}</span>
      <div class="timeline-legend">${legendItems}</div>
    </div>
    <div class="timeline-scroll">
      <svg width="${Math.max(totalW,100)}" height="${SVG_H}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;">
        ${connector}${dots}
      </svg>
    </div>
  </div>`;
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}
document.getElementById('overlay').addEventListener('click', closeModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('infoBtn')?.addEventListener('click', openInfoModal);

// ── Keyboard activation for focusable, non-native interactive elements ────
// (.poke-card, .patch-header and .poke-tag are divs/spans with tabindex="0",
// so Enter/Space need to be wired manually to trigger their click handler.)
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = document.activeElement;
  if (!el) return;
  if (el.classList.contains('poke-card') || el.classList.contains('patch-header') || el.classList.contains('poke-tag')) {
    e.preventDefault();
    el.click();
  }
});

document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  const modalOpen = document.getElementById('modal').classList.contains('open');
  const infoOpen  = !!document.getElementById('infoModal');

  if (e.key === 'Escape') {
    if (infoOpen)  { closeInfoModal(); return; }
    if (modalOpen) { closeModal(); return; }
    const si = document.getElementById('searchInput');
    if (document.activeElement === si) {
      si.value = ''; search = '';
      view === 'patches' ? renderPatches() : renderPoke();
    }
    return;
  }

  if (typing || modalOpen || infoOpen) return;

  switch (e.key) {
    case '/':
      e.preventDefault();
      document.getElementById('searchInput').focus();
      break;
    case '?':
      openInfoModal();
      break;
    case '1':
      if (!e.ctrlKey && !e.metaKey) activateTab('patches');
      break;
    case '2':
      if (!e.ctrlKey && !e.metaKey) activateTab('pokemon');
      break;
    case 'a': case 'A': setFilter(view === 'pokemon' ? 'any' : 'all'); break;
    case 'b': case 'B': setFilter('buff');  break;
    case 'n': case 'N': setFilter('nerf');  break;
    case 't': case 'T': setFilter('tweak'); break;
  }
});

function activateTab(tabView) {
  const btn = document.querySelector(`.tab-btn[data-view="${tabView}"]`);
  if (btn) btn.click();
}

function setFilter(f) {
  filter = f;
  buildFilterBar();
  view === 'patches' ? renderPatches() : renderPoke();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    view = btn.dataset.view; search = ''; filter = view === 'pokemon' ? 'any' : 'all';
    document.getElementById('searchInput').value = '';
    buildFilterBar();
    view === 'patches' ? renderPatches() : renderPoke();
  });
});

document.getElementById('searchInput').addEventListener('input', e => {
  search = e.target.value;
  view === 'patches' ? renderPatches() : renderPoke();
});

async function loadData() {
  try {
    const [patchesData, pokemonsData, linksData] = await Promise.all([
      fetch('data/patches.json').then(r => r.json()),
      fetch('data/pokemons.json').then(r => r.json()),
      fetch('data/patch_links.json').then(r => r.json()),
    ]);

    PATCHES = Array.isArray(patchesData) ? patchesData : patchesData.patches;
    const raw = Array.isArray(pokemonsData) ? pokemonsData : pokemonsData.pokemon;

    const seen = new Set();
    POKEMON = raw.filter(p => {
      if (p.name === 'Scyther') return false
      if (seen.has(p.name)) return false
      seen.add(p.name)
      return true
    })

    POKEMON_MAP = Object.fromEntries(POKEMON.map(p => [p.name, p]));
    PATCH_LINKS = linksData;

    renderStats();
    buildFilterBar();
    renderPatches();

  } catch (err) {
    console.error('Error loading patch data:', err);
    document.getElementById('mainContent').innerHTML =
      `<div class="empty">${t('patch_loading','Loading…')}<br><small>${err.message}</small></div>`;
  }
}

loadData();