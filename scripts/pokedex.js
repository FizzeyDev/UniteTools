/**
 * pokedex.js
 * Page "Informations" — liste de tous les Pokémon (data/pokemons.json)
 * avec recherche, filtres, et détail (dont les capacités depuis data/moves.json)
 * dans une modale au clic sur une carte.
 */

const state = {
  pokemons: [],
  moves: {},
  search: '',
  role: 'all',
  portee: 'all',
  difficulte: 'all',
  sort: 'dex',
};

const ROLE_LABELS = {
  atk: { fr: 'Attaquant',  en: 'Attacker' },
  def: { fr: 'Défenseur',  en: 'Defender' },
  spe: { fr: 'Rapide',     en: 'Speedster' },
  sup: { fr: 'Soutien',    en: 'Supporter' },
  all: { fr: 'Polyvalent', en: 'All-Rounder' },
};
const ROLE_ORDER = ['atk', 'def', 'spe', 'sup', 'all'];

const DIFF_COLOR = {
  'Novice':        'var(--green)',
  'Intermédiaire': 'var(--yellow)',
  'Expert':        'var(--red)',
};

const DIFF_LABELS = {
  'Novice':        { fr: 'Novice',        en: 'Novice' },
  'Intermédiaire': { fr: 'Intermédiaire', en: 'Intermediate' },
  'Expert':        { fr: 'Expert',        en: 'Expert' },
};

// Textes statiques de la page (titre, header, recherche, tri, état vide...)
// Repris des clés fr.json / en.json "pokedex_*" pour rester cohérent avec le
// reste du site si un script de traduction global vient aussi les appliquer.
const PAGE_TEXT = {
  page_title:  { fr: 'Pokédex Unite | Unite Tools', en: 'Pokédex Unite | Unite Tools' },
  hdr_title:   { fr: 'Pokédex Unite', en: 'Pokédex Unite' },
  hdr_desc:    { fr: 'Retrouve tous les Pokémon jouables, leurs infos et leurs capacités.', en: 'Find all playable Pokémon, their info and their moves.' },
  search_ph:   { fr: 'Rechercher un Pokémon...', en: 'Search a Pokémon...' },
  sort_dex:    { fr: 'N° Pokédex', en: 'Pokédex #' },
  sort_name:   { fr: 'Nom (A-Z)', en: 'Name (A-Z)' },
  sort_year:   { fr: 'Année (récent)', en: 'Year (recent)' },
  empty:       { fr: 'Aucun Pokémon ne correspond à ta recherche.', en: 'No Pokémon matches your search.' },
};

function applyStaticTranslations() {
  const lang = getLang();

  document.title = PAGE_TEXT.page_title[lang];

  const hdrTitle = document.querySelector('.hdr-text h1');
  if (hdrTitle) hdrTitle.textContent = PAGE_TEXT.hdr_title[lang];

  const hdrDesc = document.querySelector('.hdr-text p');
  if (hdrDesc) hdrDesc.textContent = PAGE_TEXT.hdr_desc[lang];

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.placeholder = PAGE_TEXT.search_ph[lang];

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    const opts = sortSelect.querySelectorAll('option');
    if (opts[0]) opts[0].textContent = PAGE_TEXT.sort_dex[lang];
    if (opts[1]) opts[1].textContent = PAGE_TEXT.sort_name[lang];
    if (opts[2]) opts[2].textContent = PAGE_TEXT.sort_year[lang];
  }

  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.textContent = PAGE_TEXT.empty[lang];
}

const MOVE_SECTIONS = [
  { key: 'move1',   fr: 'Capacité 1',        en: 'Move 1' },
  { key: 'move2',   fr: 'Capacité 2',        en: 'Move 2' },
  { key: 'passive', fr: 'Passif',            en: 'Passive' },
  { key: 'unite',   fr: 'Capacité Unite',    en: 'Unite Move' },
];

// ─────────────────────────────────────────────────────────────────────────────
// LANGUE (léger, basé sur les boutons existants de la navbar)
// ─────────────────────────────────────────────────────────────────────────────
function getLang() {
  const activeBtn = document.querySelector('.lang-switch .lang-btn.active, .sidebar-mini-footer .lang-btn.active');
  return activeBtn?.dataset.lang === 'en' ? 'en' : 'fr';
}

function pokeName(p) {
  return getLang() === 'fr' ? (p.name_fr || p.name) : p.name;
}

// ─────────────────────────────────────────────────────────────────────────────
// ID MOVES.JSON — reconstruit depuis le nom (validé sur les 97 entrées actuelles)
// ─────────────────────────────────────────────────────────────────────────────
function pokemonMovesKey(name) {
  if (name.startsWith('Mega-')) {
    const rest = name.slice('Mega-'.length);
    if (/ [XY]$/.test(rest)) {
      return rest.toLowerCase().replace(/\s+/g, '-');
    }
    return rest.toLowerCase().replace(/\s+/g, '-') + '-mega';
  }
  return name.toLowerCase().replace(/\./g, '').replace(/'/g, '').replace(/\s+/g, '-');
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARGEMENT DES DONNÉES
// ─────────────────────────────────────────────────────────────────────────────
async function loadData() {
  const [pokemonsRes, movesRes] = await Promise.all([
    fetch('data/pokemons.json'),
    fetch('data/moves.json'),
  ]);
  state.pokemons = await pokemonsRes.json();
  state.moves = await movesRes.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS BANNER
// ─────────────────────────────────────────────────────────────────────────────
function renderStats() {
  const host = document.getElementById('statsBanner');
  if (!host) return;
  const lang = getLang();
  const total = state.pokemons.length;

  const cards = [
    { val: total, lbl: lang === 'fr' ? 'Total' : 'Total' },
    ...ROLE_ORDER.map(r => ({
      val: state.pokemons.filter(p => p.role === r).length,
      lbl: ROLE_LABELS[r][lang],
      cls: `role-${r}`,
    })),
  ];

  host.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-val ${c.cls || ''}">${c.val}</div>
      <div class="stat-lbl">${c.lbl}</div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTRES
// ─────────────────────────────────────────────────────────────────────────────
function normalizePortee(portee) {
  if (!portee) return null;
  return portee === 'Mêlée' ? 'melee' : 'distance';
}

function renderFilters() {
  const lang = getLang();

  const roleHost = document.getElementById('roleFilters');
  roleHost.innerHTML = `
    <span class="filter-group-lbl">${lang === 'fr' ? 'Rôle' : 'Role'}</span>
    <button class="filter-btn ${state.role === 'all' ? 'active' : ''}" data-role="all">${lang === 'fr' ? 'Tous' : 'All'}</button>
    ${ROLE_ORDER.map(r => `
      <button class="filter-btn ${state.role === r ? 'active' : ''}" data-role="${r}">
        <span class="dot dot-${r}"></span>${ROLE_LABELS[r][lang]}
      </button>
    `).join('')}
  `;
  roleHost.querySelectorAll('[data-role]').forEach(btn => {
    btn.addEventListener('click', () => { state.role = btn.dataset.role; render(); });
  });

  const porteeHost = document.getElementById('porteeFilters');
  porteeHost.innerHTML = `
    <span class="filter-group-lbl">${lang === 'fr' ? 'Portée' : 'Range'}</span>
    <button class="filter-btn ${state.portee === 'all' ? 'active' : ''}" data-portee="all">${lang === 'fr' ? 'Toutes' : 'All'}</button>
    <button class="filter-btn ${state.portee === 'melee' ? 'active' : ''}" data-portee="melee">${lang === 'fr' ? 'Mêlée' : 'Melee'}</button>
    <button class="filter-btn ${state.portee === 'distance' ? 'active' : ''}" data-portee="distance">${lang === 'fr' ? 'Distance' : 'Ranged'}</button>
  `;
  porteeHost.querySelectorAll('[data-portee]').forEach(btn => {
    btn.addEventListener('click', () => { state.portee = btn.dataset.portee; render(); });
  });

  const diffHost = document.getElementById('difficulteFilters');
  const diffs = ['Novice', 'Intermédiaire', 'Expert'];
  diffHost.innerHTML = `
    <span class="filter-group-lbl">${lang === 'fr' ? 'Difficulté' : 'Difficulty'}</span>
    <button class="filter-btn ${state.difficulte === 'all' ? 'active' : ''}" data-diff="all">${lang === 'fr' ? 'Toutes' : 'All'}</button>
    ${diffs.map(d => `<button class="filter-btn ${state.difficulte === d ? 'active' : ''}" data-diff="${d}">${DIFF_LABELS[d]?.[lang] || d}</button>`).join('')}
  `;
  diffHost.querySelectorAll('[data-diff]').forEach(btn => {
    btn.addEventListener('click', () => { state.difficulte = btn.dataset.diff; render(); });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GRILLE
// ─────────────────────────────────────────────────────────────────────────────
function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getFilteredSorted() {
  const term = stripDiacritics(state.search.trim().toLowerCase());

  let list = state.pokemons.filter(p => {
    if (state.role !== 'all' && p.role !== state.role) return false;
    if (state.portee !== 'all' && normalizePortee(p.portee) !== state.portee) return false;
    if (state.difficulte !== 'all' && p.difficulte !== state.difficulte) return false;
    if (term) {
      const haystack = stripDiacritics(`${p.name} ${p.name_fr || ''}`.toLowerCase());
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  list = list.slice().sort((a, b) => {
    if (state.sort === 'name') return pokeName(a).localeCompare(pokeName(b));
    if (state.sort === 'annee_desc') return (b.annee || 0) - (a.annee || 0);
    return (a.dex || 0) - (b.dex || 0);
  });

  return list;
}

function renderGrid() {
  const grid = document.getElementById('pokeGrid');
  const empty = document.getElementById('emptyState');
  const lang = getLang();
  const list = getFilteredSorted();

  if (list.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = list.map(p => {
    const isMega = p.name.startsWith('Mega-');
    const roleLbl = p.role ? ROLE_LABELS[p.role]?.[lang] || p.role : '—';
    const porteeIcon = normalizePortee(p.portee) === 'melee'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.5" fill="currentColor"/></svg>';

    return `
      <div class="poke-card" data-name="${p.name}">
        <div class="poke-avatar"><img src="assets/pokemon/${p.file}" alt="${p.name}" onerror="this.src='assets/pokemon/missing.png'"></div>
        <div class="poke-info">
          <div class="poke-name">${pokeName(p)}</div>
          <div class="poke-sub">
            <span class="poke-role role-${p.role}">${roleLbl}</span>
            ${p.portee ? `<span class="poke-portee">${porteeIcon} ${p.portee}</span>` : ''}
          </div>
        </div>
        <div class="poke-right">
          ${p.dex ? `<span class="dex-chip">#${String(p.dex).padStart(3, '0')}</span>` : ''}
          ${isMega ? `<span class="mega-badge">Mega</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.poke-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.name));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MODALE DÉTAIL
// ─────────────────────────────────────────────────────────────────────────────
function formatMoveIconName(file) {
  return file
    .replace(/\.(png|webp|jpg|jpeg)$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function openModal(name) {
  const p = state.pokemons.find(x => x.name === name);
  if (!p) return;
  const lang = getLang();

  const overlay = document.getElementById('overlay');
  const modal = document.getElementById('modal');

  const roleLbl = p.role ? ROLE_LABELS[p.role]?.[lang] || p.role : '—';
  const movesKey = pokemonMovesKey(p.name);
  const moveData = state.moves[movesKey];

  const stageLbl = p.stade || '—';
  const evoLbl = p.evo_niveaux ? `Lv. ${p.evo_niveaux}` : (lang === 'fr' ? 'Aucune' : 'None');
  const diffColor = DIFF_COLOR[p.difficulte] || 'var(--text-dim)';

  const movesHTML = MOVE_SECTIONS.map(section => {
    const icons = moveData?.[section.key];
    return `
      <div class="moves-section">
        <div class="moves-title">${section[lang]}</div>
        ${icons && icons.length ? `
          <div class="moves-icons">
            ${icons.map(icon => `
              <div class="move-icon-wrap">
                <div class="move-icon"><img src="assets/moves/${movesKey}/${icon}" alt="" onerror="this.src='assets/moves/missing.png'"></div>
                <div class="move-icon-name">${formatMoveIconName(icon)}</div>
              </div>
            `).join('')}
          </div>
        ` : `<div class="moves-empty">${lang === 'fr' ? 'Non disponible' : 'Not available'}</div>`}
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <button class="modal-close" id="modalCloseBtn">✕</button>
    <div class="m-header">
      <div class="m-avatar"><img src="assets/pokemon/${p.file}" alt="${p.name}" onerror="this.src='assets/pokemon/missing.png'"></div>
      <div>
        <div class="m-name">${pokeName(p)}</div>
        <div class="m-role role-${p.role}">${roleLbl}${p.name.startsWith('Mega-') ? ' · Mega' : ''}</div>
      </div>
    </div>

    <div class="m-stats">
      <div class="m-stat"><div class="m-stat-val">${p.dex ? '#' + p.dex : '—'}</div><div class="m-stat-lbl">${lang === 'fr' ? 'Pokédex' : 'Pokédex'}</div></div>
      <div class="m-stat"><div class="m-stat-val">${p.portee || '—'}</div><div class="m-stat-lbl">${lang === 'fr' ? 'Portée' : 'Range'}</div></div>
      <div class="m-stat"><div class="m-stat-val" style="color:${diffColor}">${p.difficulte ? (DIFF_LABELS[p.difficulte]?.[lang] || p.difficulte) : '—'}</div><div class="m-stat-lbl">${lang === 'fr' ? 'Difficulté' : 'Difficulty'}</div></div>
      <div class="m-stat"><div class="m-stat-val">${p.annee || '—'}</div><div class="m-stat-lbl">${lang === 'fr' ? 'Année' : 'Year'}</div></div>
      <div class="m-stat"><div class="m-stat-val">${stageLbl}</div><div class="m-stat-lbl">${lang === 'fr' ? 'Stade' : 'Stage'}</div></div>
      <div class="m-stat"><div class="m-stat-val">${evoLbl}</div><div class="m-stat-lbl">${lang === 'fr' ? 'Évolution' : 'Evolution'}</div></div>
      <div class="m-stat"><div class="m-stat-val">${p.unite_move_cost ?? '—'}</div><div class="m-stat-lbl">Unite Move</div></div>
      <div class="m-stat"><div class="m-stat-val">${p.name.startsWith('Mega-') || p.mega ? 'Oui' : 'Non'}</div><div class="m-stat-lbl">Mega</div></div>
    </div>

    ${movesHTML}
  `;

  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);

  overlay.classList.add('open');
  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('modal').classList.remove('open');
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER GLOBAL
// ─────────────────────────────────────────────────────────────────────────────
function render() {
  applyStaticTranslations();
  renderStats();
  renderFilters();
  renderGrid();
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
async function initPokedex() {
  await loadData();
  render();

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    state.search = searchInput.value;
    renderGrid();
  });

  const sortSelect = document.getElementById('sortSelect');
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    renderGrid();
  });

  document.getElementById('overlay').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Re-render au changement de langue (boutons FR/EN de la navbar)
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(render, 0));
  });
}

document.addEventListener('DOMContentLoaded', initPokedex);