const IMG_BASE = 'assets/pokemon/';

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
  'Attacker':    { bg: 'rgba(79,195,247,0.12)',  text: '#4fc3f7' },
  'Defender':    { bg: 'rgba(76,175,130,0.12)',  text: '#4caf82' },
  'Supporter':   { bg: 'rgba(159,83,236,0.12)',  text: '#b07ef5' },
  'All-Rounder': { bg: 'rgba(255,157,0,0.12)',   text: '#ff9d00' },
  'Speedster':   { bg: 'rgba(255,215,64,0.10)',  text: '#ffd740' },
};
function rc(role) {
  return ROLE_COLORS[role] || { bg: 'rgba(255,255,255,0.05)', text: '#6a8587' };
}

function roleKey(role) {
  return 'patch_role_' + role.toLowerCase().replace(/-/g, '_');
}

function spriteUrl(name) {
  const p = POKEMON_MAP[name];
  return p?.file ? IMG_BASE + p.file : null;
}

function avatar(name, role, size = 44) {
  const c        = rc(role);
  const initials = name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  const url      = spriteUrl(name);
  const base     = `width:${size}px;height:${size}px;`;
  if (url) {
    const fb = `this.parentNode.innerHTML='<div style=\\'${base}background:${c.bg};color:${c.text};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(size * 0.3)}px;\\'>${initials}</div>'`;
    return `<div class="poke-avatar" style="${base}background:${c.bg};">
      <img src="${url}" alt="${name}" loading="lazy" onerror="${fb}"/>
    </div>`;
  }
  return `<div class="poke-avatar" style="${base}background:${c.bg};color:${c.text};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.3)}px;font-weight:700;">${initials}</div>`;
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
  `;
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
      ['all',          'patch_filter_all_role',  'All'],
      ['Attacker',     'patch_filter_atk',       'Attacker'],
      ['Defender',     'patch_filter_def',       'Defender'],
      ['Supporter',    'patch_filter_sup',       'Supporter'],
      ['All-Rounder',  'patch_filter_all_round', 'All-Rounder'],
      ['Speedster',    'patch_filter_spe',       'Speedster'],
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
      ${items.map(n => `<span class="poke-tag poke-tag-${cls}" data-poke="${n}">${tagSprite(n)} ${n}</span>`).join('')}
    </div>` : '';

  const cols = makeCol(p.buffs,  'buff',  '▲', 'patch_buffs_label',  'Buffs')
             + makeCol(p.nerfs,  'nerf',  '▼', 'patch_nerfs_label',  'Nerfs')
             + makeCol(p.tweaks, 'tweak', '●', 'patch_tweaks_label', 'Tweaks');

  return `
  <div class="patch-card">
    <div class="patch-header">
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
      if (filter !== 'all' && p.role !== filter)  return false;
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
    ? `<span class="trend trend-up">↑</span>`
    : trend < 0
    ? `<span class="trend trend-down">↓</span>`
    : `<span class="trend trend-stable">—</span>`;

  const total    = p.buffs + p.nerfs;
  const barPct   = total > 0 ? Math.round(p.buffs / total * 100) : 50;
  const barClass = p.buffs > p.nerfs ? 'bar-buff' : p.nerfs > p.buffs ? 'bar-nerf' : 'bar-neutral';

  return `
  <div class="poke-card" data-name="${p.name}">
    ${avatar(p.name, p.role, 44)}
    <div class="poke-info">
      <div class="poke-name">${p.name}</div>
      <div class="poke-role" style="color:${c.text};" data-lang="${roleKey(p.role)}">${t(roleKey(p.role), p.role)}</div>
      <div class="balance-bar"><div class="bar-fill ${barClass}" style="width:${barPct}%"></div></div>
    </div>
    <div class="poke-right">
      <span class="stat-chip chip-buff">▲ ${p.buffs}</span>
      <span class="stat-chip chip-nerf">▼ ${p.nerfs}</span>
      ${trendEl}
    </div>
  </div>`;
}

function openModal(name) {
  const poke    = POKEMON_MAP[name] || { name, role: 'All-Rounder', type: 'melee' };
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

  document.getElementById('modalBody').innerHTML = `
    <div class="m-header">
      ${avatar(name, poke.role, 60)}
      <div>
        <div class="m-name" id="modalPokeName">${name}</div>
        <div class="m-role" data-lang="${roleKey(poke.role)}">${t(roleKey(poke.role), poke.role)}${poke.type ? ' · ' + poke.type : ''}</div>
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
      <title>${h.version} — ${h.patchName} (${typeLabel})</title>
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
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    view = btn.dataset.view; search = ''; filter = 'all';
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