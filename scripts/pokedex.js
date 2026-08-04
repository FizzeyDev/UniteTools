/**
 * pokedex.js
 * Page "Pokédex Unite" — liste de tous les Pokémon (data/pokemons.json)
 * avec recherche, filtres, et détail (dont les capacités depuis data/moves.json)
 * dans une modale au clic sur une carte.
 */

const state = {
  pokemons: [],
  moves: {},
  search: '',
  role: 'any',       // 'any' = pas de filtre de rôle (à ne pas confondre avec le rôle 'all' = Polyvalent)
  portee: 'all',
  difficulte: 'all',
  sort: 'annee_desc', // vue par défaut : groupée par année
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

// Traductions basées sur normalizePortee() ('melee'/'distance'), donc robustes
// même si une entrée du JSON contient une valeur mal orthographiée/en anglais.
const PORTEE_LABELS = {
  melee:    { fr: 'Mêlée',    en: 'Melee' },
  distance: { fr: 'Distance', en: 'Ranged' },
};

const STADE_LABELS = {
  'Base':      { fr: 'Base',      en: 'Base' },
  '1ère évo':  { fr: '1ère évo',  en: '1st Evo' },
  '2ème évo':  { fr: '2ème évo',  en: '2nd Evo' },
};

function porteeLabel(portee, lang) {
  const key = normalizePortee(portee);
  if (!key) return null;
  return PORTEE_LABELS[key][lang];
}

function stadeLabel(stade, lang) {
  if (!stade) return null;
  return STADE_LABELS[stade]?.[lang] || stade;
}

function diffClass(diff) {
  if (diff === 'Novice') return 'diff-novice';
  if (diff === 'Intermédiaire') return 'diff-intermediaire';
  if (diff === 'Expert') return 'diff-expert';
  return '';
}

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
  unknown_year:{ fr: 'Année inconnue', en: 'Unknown year' },
  pokemon_one: { fr: 'Pokémon', en: 'Pokémon' },
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

const MELEE_ICON  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/></svg>';
const RANGED_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.5" fill="currentColor"/></svg>';

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
// DOSSIER DES ICÔNES DE MOVES — différent du moves.json pour les Mega
// (assets/moves/mega_charizard_x/, assets/moves/mega_lucario/, etc.)
// ─────────────────────────────────────────────────────────────────────────────
function pokemonMoveImageFolder(name) {
  if (name.startsWith('Mega-')) {
    const rest = name.slice('Mega-'.length);
    const slug = rest.toLowerCase().replace(/\./g, '').replace(/'/g, '').replace(/\s+/g, '_');
    return 'mega_' + slug;
  }
  return pokemonMovesKey(name);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLUG UNITE-DB.COM — ex: "Mega-Charizard X" -> "mega-charizard-x",
// "Mr. Mime" -> "mr-mime", "Ho-Oh" -> "ho-oh" (validé sur unite-db.com/pokemon/…)
// ─────────────────────────────────────────────────────────────────────────────
function uniteDbSlug(name) {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/'/g, '')
    .replace(/\s+/g, '-');
}

function uniteDbUrl(p) {
  return `https://unite-db.com/pokemon/${uniteDbSlug(p.name)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE DE SORTIE PRÉCISE — p.date est au format "JJ/MM", combiné à p.annee
// pour un tri chronologique exact et un affichage complet dans la modale.
// ─────────────────────────────────────────────────────────────────────────────
const MONTH_LABELS = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function releaseTimestamp(p) {
  if (p.date && p.annee) {
    const [day, month] = p.date.split('/').map(Number);
    return new Date(p.annee, month - 1, day).getTime();
  }
  if (p.annee) return new Date(p.annee, 0, 1).getTime();
  return 0;
}

function fullDateLabel(p, lang) {
  if (!p.date || !p.annee) return p.annee || '—';
  const [day, month] = p.date.split('/').map(Number);
  const monthLbl = MONTH_LABELS[lang][month - 1];
  return lang === 'fr' ? `${day} ${monthLbl} ${p.annee}` : `${monthLbl} ${day}, ${p.annee}`;
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
    <button class="filter-btn ${state.role === 'any' ? 'active' : ''}" data-role="any">${lang === 'fr' ? 'Tous' : 'All'}</button>
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
    if (state.role !== 'any' && p.role !== state.role) return false;
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
    if (state.sort === 'annee_desc') return releaseTimestamp(b) - releaseTimestamp(a);
    return (a.dex || 0) - (b.dex || 0);
  });

  return list;
}

function cardHTML(p, lang) {
  const isMega = p.name.startsWith('Mega-') || !!p.mega;
  const roleLbl = p.role ? ROLE_LABELS[p.role]?.[lang] || p.role : '—';
  const porteeIcon = normalizePortee(p.portee) === 'melee' ? MELEE_ICON : RANGED_ICON;
  const diffLbl = p.difficulte ? (DIFF_LABELS[p.difficulte]?.[lang] || p.difficulte) : null;

  return `
    <div class="poke-card role-${p.role || 'none'}" data-name="${p.name}">
      <div class="poke-avatar-wrap">
        <div class="poke-avatar"><img src="assets/pokemon/${p.file}" alt="${p.name}" onerror="this.src='assets/pokemon/missing.png'"></div>
        ${isMega ? `<span class="mega-flag">Mega</span>` : ''}
      </div>
      <div class="poke-info">
        <div class="poke-name">${pokeName(p)}</div>
        <div class="poke-sub">
          <span class="poke-role role-${p.role}"><span class="dot dot-${p.role}"></span>${roleLbl}</span>
          ${p.portee ? `<span class="poke-portee">${porteeIcon}${porteeLabel(p.portee, lang)}</span>` : ''}
        </div>
        ${diffLbl ? `<div class="poke-meta"><span class="diff-pill ${diffClass(p.difficulte)}">${diffLbl}</span></div>` : ''}
      </div>
      <div class="poke-right">
        <span class="year-chip">${p.annee || '—'}</span>
      </div>
    </div>
  `;
}

function renderYearGroups(list, lang) {
  const groups = [];
  const indexByKey = new Map();

  list.forEach(p => {
    const key = p.annee ? String(p.annee) : '__unknown__';
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({ key, label: p.annee ? String(p.annee) : PAGE_TEXT.unknown_year[lang], items: [] });
    }
    groups[indexByKey.get(key)].items.push(p);
  });

  return groups.map(g => `
    <div class="year-block">
      <div class="year-divider">
        <span class="y-num">${g.label}</span>
        <span class="y-line"></span>
        <span class="y-count">${g.items.length} ${PAGE_TEXT.pokemon_one[lang]}</span>
      </div>
      <div class="year-grid">
        ${g.items.map(p => cardHTML(p, lang)).join('')}
      </div>
    </div>
  `).join('');
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

  if (state.sort === 'annee_desc') {
    grid.innerHTML = renderYearGroups(list, lang);
  } else {
    grid.innerHTML = `<div class="year-grid">${list.map(p => cardHTML(p, lang)).join('')}</div>`;
  }

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

  const isMega = p.name.startsWith('Mega-') || !!p.mega;
  const roleLbl = p.role ? ROLE_LABELS[p.role]?.[lang] || p.role : '—';
  const movesKey = pokemonMovesKey(p.name);
  const moveImageFolder = pokemonMoveImageFolder(p.name);
  const moveData = state.moves[movesKey];

  const stageLbl = p.stade || '—';
  const evoLbl = p.evo_niveaux ? `Lv. ${p.evo_niveaux}` : (lang === 'fr' ? 'Aucune' : 'None');
  const diffColor = DIFF_COLOR[p.difficulte] || 'var(--text-dim)';
  const diffLbl = p.difficulte ? (DIFF_LABELS[p.difficulte]?.[lang] || p.difficulte) : '—';
  const porteeIcon = normalizePortee(p.portee) === 'melee' ? MELEE_ICON : RANGED_ICON;

  const movesHTML = MOVE_SECTIONS.map(section => {
    const icons = moveData?.[section.key];
    return `
      <div class="moves-section">
        <div class="moves-title">${section[lang]}</div>
        ${icons && icons.length ? `
          <div class="moves-icons">
            ${icons.map(icon => `
              <div class="move-icon-wrap">
                <div class="move-icon"><img src="assets/moves/${moveImageFolder}/${icon}" alt="" onerror="this.src='assets/moves/missing.png'"></div>
                <div class="move-icon-name">${formatMoveIconName(icon)}</div>
              </div>
            `).join('')}
          </div>
        ` : `<div class="moves-empty">${lang === 'fr' ? 'Non disponible' : 'Not available'}</div>`}
      </div>
    `;
  }).join('');

  const statDefs = [
    { icon: 'hash',        val: p.dex ? '#' + p.dex : '—', lbl: 'Pokédex' },
    { icon: 'move',        val: p.portee ? `${porteeIcon}${porteeLabel(p.portee, lang)}` : '—', lbl: lang === 'fr' ? 'Portée' : 'Range' },
    { icon: 'gauge',       val: diffLbl, lbl: lang === 'fr' ? 'Difficulté' : 'Difficulty', color: diffColor },
    { icon: 'calendar',    val: fullDateLabel(p, lang), lbl: lang === 'fr' ? 'Sortie' : 'Release' },
    { icon: 'layers',      val: stageLbl, lbl: lang === 'fr' ? 'Stade' : 'Stage' },
    { icon: 'trending-up', val: evoLbl, lbl: lang === 'fr' ? 'Évolution' : 'Evolution' },
    { icon: 'zap',         val: p.unite_move_cost ?? '—', lbl: 'Unite Move' },
    { icon: 'sparkles',    val: isMega ? (lang === 'fr' ? 'Oui' : 'Yes') : (lang === 'fr' ? 'Non' : 'No'), lbl: 'Mega' },
  ];

  const statsHTML = statDefs.map(s => `
    <div class="m-stat">
      <div class="m-stat-icon"><i data-lucide="${s.icon}"></i></div>
      <div class="m-stat-val"${s.color ? ` style="color:${s.color}"` : ''}>${s.val}</div>
      <div class="m-stat-lbl">${s.lbl}</div>
    </div>
  `).join('');

  const uniteDbLabel = lang === 'fr' ? 'Fiche complète sur Unite-DB' : 'Full profile on Unite-DB';

  modal.innerHTML = `
    <div class="modal-topbar">
      <a class="unite-db-btn" href="${uniteDbUrl(p)}" target="_blank" rel="noopener noreferrer" title="${uniteDbLabel}">
        <i data-lucide="external-link"></i>
        <span>${uniteDbLabel}</span>
      </a>
      <button class="modal-close" id="modalCloseBtn">✕</button>
    </div>
    <div class="m-header role-${p.role || 'none'}">
      <div class="m-avatar-wrap">
        <div class="m-avatar"><img src="assets/pokemon/${p.file}" alt="${p.name}" onerror="this.src='assets/pokemon/missing.png'"></div>
        ${isMega ? `<span class="mega-flag mega-flag-lg">Mega</span>` : ''}
      </div>
      <div class="m-header-info">
        <div class="m-name">${pokeName(p)}</div>
        <div class="m-role-row">
          <span class="m-role role-${p.role}"><span class="dot dot-${p.role}"></span>${roleLbl}</span>
        </div>
      </div>
    </div>

    <div class="m-stats">
      ${statsHTML}
    </div>

    ${movesHTML}
  `;

  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  if (window.lucide) lucide.createIcons();

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
  const grid = document.getElementById('pokeGrid');
  if (grid) {
    const lang = getLang();
    grid.innerHTML = `<div class="loading-state">${lang === 'fr' ? 'Chargement du Pokédex…' : 'Loading Pokédex…'}</div>`;
  }

  await loadData();

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.value = state.sort;

  render();

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    state.search = searchInput.value;
    renderGrid();
  });

  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    renderGrid();
  });

  document.getElementById('overlay').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Re-render au changement de langue (boutons FR/EN de la navbar).
  // Délégation sur document : la navbar (et ses .lang-btn) est injectée de
  // façon asynchrone par navbar.js, donc un binding direct via
  // querySelectorAll+forEach au chargement pouvait s'accrocher à rien selon
  // le timing — d'où les traductions qui ne s'appliquaient "pas tout le temps".
  document.addEventListener('click', (e) => {
    if (e.target.closest('.lang-btn')) setTimeout(render, 0);
  });
}

document.addEventListener('DOMContentLoaded', initPokedex);