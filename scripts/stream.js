const POKEMON_DATA = [
  {"name":"Absol","name_fr":"Absol","file":"absol_spe.png","role":"spe"},
  {"name":"Aegislash","name_fr":"Exagide","file":"aegislash_all.png","role":"all"},
  {"name":"Alcremie","name_fr":"Charmilly","file":"alcreamie_sup.png","role":"sup"},
  {"name":"Armarouge","name_fr":"Carmadura","file":"armarouge_atk.png","role":"atk"},
  {"name":"Articuno","name_fr":"Artikodin","file":"articuno_def.png","role":"def"},
  {"name":"Azumarill","name_fr":"Azumarill","file":"azumarill_all.png","role":"all"},
  {"name":"Blaziken","name_fr":"Braségali","file":"blaziken_all.png","role":"all"},
  {"name":"Blastoise","name_fr":"Tortank","file":"blastoise_def.png","role":"def"},
  {"name":"Blissey","name_fr":"Leuphorie","file":"blissey_sup.png","role":"sup"},
  {"name":"Buzzwole","name_fr":"Mouscoto","file":"buzzwole_all.png","role":"all"},
  {"name":"Ceruledge","name_fr":"Malvalame","file":"ceruledge_all.png","role":"all"},
  {"name":"Chandelure","name_fr":"Lugulabre","file":"chandelure_atk.png","role":"atk"},
  {"name":"Charizard","name_fr":"Dracaufeu","file":"charizard_all.png","role":"all"},
  {"name":"Mega-Charizard X","name_fr":"Méga-Dracaufeu X","file":"mXcharizard_all.png","role":"all"},
  {"name":"Mega-Charizard Y","name_fr":"Méga-Dracaufeu Y","file":"mYcharizard_all.png","role":"all"},
  {"name":"Cinderace","name_fr":"Pyrobut","file":"cinderace_atk.png","role":"atk"},
  {"name":"Clefable","name_fr":"Mélodelfe","file":"clefable_sup.png","role":"sup"},
  {"name":"Comfey","name_fr":"Guérilande","file":"comfey_sup.png","role":"sup"},
  {"name":"Cramorant","name_fr":"Nigosier","file":"cramorant_atk.png","role":"atk"},
  {"name":"Crustle","name_fr":"Crabaraque","file":"crustle_def.png","role":"def"},
  {"name":"Darkrai","name_fr":"Darkrai","file":"darkrai_spe.png","role":"spe"},
  {"name":"Decidueye","name_fr":"Archéduc","file":"decidueye_atk.png","role":"atk"},
  {"name":"Delphox","name_fr":"Goupelin","file":"delphox_atk.png","role":"atk"},
  {"name":"Dhelmise","name_fr":"Sinistrail","file":"dhelmise_all.png","role":"all"},
  {"name":"Dodrio","name_fr":"Dodrio","file":"dodrio_spe.png","role":"spe"},
  {"name":"Dragapult","name_fr":"Lanssorien","file":"dragapult_atk.png","role":"atk"},
  {"name":"Dragonite","name_fr":"Dracolosse","file":"dragonite_all.png","role":"all"},
  {"name":"Duraludon","name_fr":"Duralugon","file":"duraludon_atk.png","role":"atk"},
  {"name":"Eldegoss","name_fr":"Blancoton","file":"eldegoss_sup.png","role":"sup"},
  {"name":"Empoleon","name_fr":"Pingoléon","file":"empoleon_all.png","role":"all"},
  {"name":"Espeon","name_fr":"Mentali","file":"espeon_atk.png","role":"atk"},
  {"name":"Falinks","name_fr":"Hexadron","file":"falinks_all.png","role":"all"},
  {"name":"Garchomp","name_fr":"Carchacrok","file":"garchomp_all.png","role":"all"},
  {"name":"Gardevoir","name_fr":"Gardevoir","file":"gardevoir_atk.png","role":"atk"},
  {"name":"Gengar","name_fr":"Ectoplasma","file":"gengar_spe.png","role":"spe"},
  {"name":"Glaceon","name_fr":"Givrali","file":"glaceon_atk.png","role":"atk"},
  {"name":"Goodra","name_fr":"Muplodocus","file":"goodra_def.png","role":"def"},
  {"name":"Greedent","name_fr":"Rongrigou","file":"greedent_def.png","role":"def"},
  {"name":"Greninja","name_fr":"Amphinobi","file":"greninja_atk.png","role":"atk"},
  {"name":"Gyarados","name_fr":"Léviator","file":"gyarados_all.png","role":"all"},
  {"name":"Mega-Gyarados","name_fr":"Méga-Léviator","file":"mgyarados_all.png","role":"all"},
  {"name":"Ho-Oh","name_fr":"Ho-Oh","file":"ho-oh_def.png","role":"def"},
  {"name":"Hoopa","name_fr":"Hoopa","file":"hoopa_sup.png","role":"sup"},
  {"name":"Inteleon","name_fr":"Lézargus","file":"inteleon_atk.png","role":"atk"},
  {"name":"Lapras","name_fr":"Lokhlass","file":"lapras_def.png","role":"def"},
  {"name":"Latias","name_fr":"Latias","file":"latias_sup.png","role":"sup"},
  {"name":"Latios","name_fr":"Latios","file":"latios_atk.png","role":"atk"},
  {"name":"Leafeon","name_fr":"Phyllali","file":"leafeon_spe.png","role":"spe"},
  {"name":"Lucario","name_fr":"Lucario","file":"lucario_all.png","role":"all"},
  {"name":"Mega-Lucario","name_fr":"Méga-Lucario","file":"mlucario_all.png","role":"all"},
  {"name":"Machamp","name_fr":"Mackogneur","file":"machamp_all.png","role":"all"},
  {"name":"Mamoswine","name_fr":"Mammochon","file":"mamoswine_def.png","role":"def"},
  {"name":"Meowscarada","name_fr":"Miascarade","file":"meowscarada_spe.png","role":"spe"},
  {"name":"Meowth","name_fr":"Miaouss","file":"meowth_spe.png","role":"spe"},
  {"name":"Metagross","name_fr":"Métalosse","file":"metagross_all.png","role":"all"},
  {"name":"Mewtwo X","name_fr":"Méga-Mewtwo X","file":"mewtwoX_all.png","role":"all"},
  {"name":"Mewtwo Y","name_fr":"Méga-Mewtwo Y","file":"mewtwoY_atk.png","role":"atk"},
  {"name":"Mew","name_fr":"Mew","file":"mew_atk.png","role":"atk"},
  {"name":"Mimikyu","name_fr":"Mimiqui","file":"mimikyu_all.png","role":"all"},
  {"name":"Miraidon","name_fr":"Miraidon","file":"miraidon_atk.png","role":"atk"},
  {"name":"Moltres","name_fr":"Sulfura","file":"moltres_all.png","role":"all"},
  {"name":"Mr. Mime","name_fr":"M. Mime","file":"mr.mime_sup.png","role":"sup"},
  {"name":"Ninetales","name_fr":"Feunard","file":"ninetales_atk.png","role":"atk"},
  {"name":"Pawmot","name_fr":"Pawmot","file":"pawmot_all.png","role":"all"},
  {"name":"Pikachu","name_fr":"Pikachu","file":"pikachu_atk.png","role":"atk"},
  {"name":"Psyduck","name_fr":"Psykokwak","file":"psyduck_sup.png","role":"sup"},
  {"name":"Raichu","name_fr":"Raichu","file":"raichu_atk.png","role":"atk"},
  {"name":"Rapidash","name_fr":"Galopa","file":"rapidash_spe.png","role":"spe"},
  {"name":"Sableye","name_fr":"Ténéfix","file":"sableye_sup.png","role":"sup"},
  {"name":"Scizor","name_fr":"Cizayox","file":"scizor_all.png","role":"all"},
  {"name":"Scyther","name_fr":"Insécateur","file":"scyther_spe.png","role":"all"},
  {"name":"Sirfetchd","name_fr":"Palarticho","file":"sirfetchd_all.png","role":"all"},
  {"name":"Slowbro","name_fr":"Flagadoss","file":"slowbro_def.png","role":"def"},
  {"name":"Snorlax","name_fr":"Ronflex","file":"snorlax_def.png","role":"def"},
  {"name":"Suicune","name_fr":"Suicune","file":"suicune_all.png","role":"all"},
  {"name":"Sylveon","name_fr":"Nymphali","file":"sylveon_atk.png","role":"atk"},
  {"name":"Talonflame","name_fr":"Flambusard","file":"talonflame_spe.png","role":"spe"},
  {"name":"Tinkaton","name_fr":"Forgelina","file":"tinkaton_all.png","role":"all"},
  {"name":"Trevenant","name_fr":"Desséliande","file":"trevenant_def.png","role":"def"},
  {"name":"Tsareena","name_fr":"Sucreine","file":"tsaarena_all.png","role":"all"},
  {"name":"Typhlosion","name_fr":"Typhlosion","file":"typhlosion_atk.png","role":"atk"},
  {"name":"Tyranitar","name_fr":"Tyranocif","file":"tyranitar_all.png","role":"all"},
  {"name":"Umbreon","name_fr":"Noctali","file":"umbreon_def.png","role":"def"},
  {"name":"Urshifu","name_fr":"Shifours","file":"urshifu_all.png","role":"all"},
  {"name":"Vaporeon","name_fr":"Aquali","file":"vaporeon_def.png","role":"def"},
  {"name":"Venusaur","name_fr":"Florizarre","file":"venusaur_atk.png","role":"atk"},
  {"name":"Wigglytuff","name_fr":"Grodoudou","file":"wigglytuff_sup.png","role":"sup"},
  {"name":"Zacian","name_fr":"Zacian","file":"zacian_all.png","role":"all"},
  {"name":"Zapdos","name_fr":"Électhor","file":"zapdos_atk.png","role":"atk"},
  {"name":"Zeraora","name_fr":"Zeraora","file":"zeraora_spe.png","role":"spe"},
  {"name":"Zoroark","name_fr":"Zoroark","file":"zoroark_spe.png","role":"spe"}
];

const IMG_BASE       = 'https://fizzeydev.github.io/UniteTools/assets/pokemon/';
const MAP_BASE_SPAWN = 'https://fizzeydev.github.io/UniteTools/assets/maps/spawn/';
const MAP_BASE_GIF   = 'https://fizzeydev.github.io/UniteTools/assets/maps/gifs/';
const LS_KEY         = 'unite_tracker_picks';
const LS_MAP_KEY     = 'unite_tracker_map';

const MAPS = [
  { id: 'rayquaza', label: 'Rayquaza', emoji: '🌿', color: '#4caf82' },
  { id: 'groudon',  label: 'Groudon',  emoji: '🔥', color: '#ff7043' },
  { id: 'kyogre',   label: 'Kyogre',   emoji: '💧', color: '#4fc3f7' },
];

let picks       = [];
let activeMode  = null;
let roleFilter  = 'any';
let selectedMap = null;

// ===== LOCALSTORAGE =====
function saveState() {
  try {
    localStorage.setItem(LS_KEY,     JSON.stringify(picks));
    localStorage.setItem(LS_MAP_KEY, selectedMap || '');
  } catch(e) {}
}

function loadState() {
  try {
    const raw    = localStorage.getItem(LS_KEY);
    const rawMap = localStorage.getItem(LS_MAP_KEY);
    if (raw)    picks       = JSON.parse(raw);
    if (rawMap) selectedMap = rawMap || null;
  } catch(e) { picks = []; }
}

// ===== MAP =====
function setMap(mapId) {
  selectedMap = (selectedMap === mapId) ? null : mapId;
  saveState();
  renderMapButtons();
}

function renderMapButtons() {
  MAPS.forEach(m => {
    const id  = 'mapBtn' + m.id.charAt(0).toUpperCase() + m.id.slice(1);
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', selectedMap === m.id);
  });
}

// ===== TEAM MODE =====
function setMode(mode) {
  activeMode = mode;
  document.getElementById('btnOrange').classList.toggle('active', mode === 'orange');
  document.getElementById('btnPurple').classList.toggle('active', mode === 'purple');
  document.getElementById('btnNone').classList.toggle('active',   mode === null);
}

// ===== PICK / REMOVE =====
function onCardClick(file) {
  const idx = picks.findIndex(p => p.file === file);
  if (idx !== -1) picks.splice(idx, 1);
  else picks.push({ file, team: activeMode });
  saveState();
  renderDisplay();
  renderList();
}

function removePick(file) {
  picks = picks.filter(p => p.file !== file);
  saveState();
  renderDisplay();
  renderList();
}

function clearAll() {
  picks       = [];
  selectedMap = null;
  saveState();
  renderDisplay();
  renderList();
  renderMapButtons();
}

// ===== RENDER DISPLAY =====
function renderDisplay() {
  const grid = document.getElementById('displayGrid');
  grid.innerHTML = '';

  if (picks.length === 0) {
    grid.innerHTML = `<div class="empty-display">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke="#cfe0e2" stroke-width="1.5"/>
        <line x1="2" y1="20" x2="38" y2="20" stroke="#cfe0e2" stroke-width="1.5"/>
        <circle cx="20" cy="20" r="5" stroke="#cfe0e2" stroke-width="1.5" fill="#090f10"/>
      </svg>
      <span>Sélectionnez une team puis</span>
      <span>cliquez sur un Pokémon</span>
    </div>`;
    return;
  }

  picks.forEach(({ file, team }) => {
    const poke = POKEMON_DATA.find(p => p.file === file);
    if (!poke) return;
    const slot = document.createElement('div');
    slot.className = 'display-slot' + (team ? ' team-' + team : '');
    slot.innerHTML = `
      <img src="${IMG_BASE}${file}" alt="${poke.name}" onerror="this.style.background='#152122'">
      <div class="team-ring"></div>
      <div class="remove-btn" onclick="removePick('${file}')">×</div>
    `;
    grid.appendChild(slot);
  });
}

// ===== RENDER LIST =====
function renderList() {
  const grid   = document.getElementById('pokemonGrid');
  const search = document.getElementById('searchInput').value.toLowerCase();

  const filtered = POKEMON_DATA.filter(p => {
    const ms = !search || p.name.toLowerCase().includes(search) || p.name_fr.toLowerCase().includes(search);
    return ms && (roleFilter === 'any' || p.role === roleFilter);
  }).sort((a, b) => a.name.localeCompare(b.name));

  document.getElementById('countBadge').textContent = filtered.length;
  grid.innerHTML = '';

  filtered.forEach(poke => {
    const inDisplay = picks.some(p => p.file === poke.file);
    const card = document.createElement('div');
    card.className = 'pokemon-card' + (inDisplay ? ' in-display' : '');
    card.innerHTML = `
      <div class="role-dot ${poke.role}"></div>
      <img src="${IMG_BASE}${poke.file}" alt="${poke.name}" onerror="this.style.background='#152122';this.style.minHeight='60px'">
      <div class="card-name">${poke.name}</div>
    `;
    card.addEventListener('click', () => onCardClick(poke.file));
    grid.appendChild(card);
  });
}

function setRole(el, role) {
  roleFilter = role;
  document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderList();
}

// ===== OBS =====
function openOverlay() {
  const url = window.location.href.split('?')[0] + '?overlay=true';
  window.open(url, '_blank', 'width=750,height=220,resizable=yes,scrollbars=no');
  showToast('Fenêtre overlay ouverte — ajoutez comme Browser Source dans OBS');
}

function copyOverlayURL() {
  const url = window.location.href.split('?')[0] + '?overlay=true';
  navigator.clipboard.writeText(url).then(() => showToast('URL copiée ! Collez dans OBS > Browser Source'));
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ===== MODAL =====
function openModal()  { document.getElementById('modal-overlay').classList.add('open'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

function onModalOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function setLang(lang, el) {
  document.querySelectorAll('.modal-lang-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.modal-section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + lang).classList.add('active');
}

// ===== OVERLAY MODE =====
function checkOverlayMode() {
  if (new URLSearchParams(window.location.search).get('overlay') !== 'true') return;

  document.body.classList.add('overlay-mode');
  document.body.style.background = 'transparent';

  const root = document.createElement('div');
  root.id = 'overlay-root';
  document.body.appendChild(root);

  const picksRow = document.createElement('div');
  picksRow.id = 'overlay-picks-row';
  root.appendChild(picksRow);

  const mapBar = document.createElement('div');
  mapBar.id = 'overlay-map-bar';
  root.appendChild(mapBar);

  function renderOverlay(picksData, mapData) {
    // --- Picks row ---
    picksRow.innerHTML = '';
    (picksData || []).forEach(({ file, team }) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:80px;height:80px;flex-shrink:0;';
      const img = document.createElement('img');
      img.src = IMG_BASE + file;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;filter:grayscale(1) brightness(0.45);';
      const ring = document.createElement('div');
      let rs = 'position:absolute;inset:-3px;border-radius:11px;pointer-events:none;border:2.5px solid transparent;';
      if      (team === 'orange') rs += 'border-color:#ff9d00;box-shadow:0 0 12px rgba(255,157,0,0.7);';
      else if (team === 'purple') rs += 'border-color:#9f53ec;box-shadow:0 0 12px rgba(159,83,236,0.7);';
      ring.style.cssText = rs;
      wrap.appendChild(img);
      wrap.appendChild(ring);
      picksRow.appendChild(wrap);
    });

    // --- UNITE-style map bar ---
    mapBar.innerHTML = '';

    MAPS.forEach((m) => {
      const isActive = mapData === m.id;

      const item = document.createElement('div');
      item.className = 'overlay-map-item ' + m.id + (isActive ? ' active' : '');

      // Background image (GIF when active, static PNG otherwise)
      const imgSrc = isActive ? MAP_BASE_GIF + m.id + '.gif' : MAP_BASE_SPAWN + m.id + '.png';
      const img = document.createElement('img');
      img.className = 'overlay-map-img';
      img.src = imgSrc;
      img.alt = m.label;
      img.onerror = function() {
        // GIF fallback → static
        if (isActive && this.src.includes('.gif')) {
          this.src = MAP_BASE_SPAWN + m.id + '.png';
        } else {
          this.style.display = 'none';
          const ph = document.createElement('div');
          ph.className = 'overlay-map-placeholder';
          ph.textContent = m.emoji;
          item.insertBefore(ph, item.firstChild);
        }
      };

      // "SELECTED" badge (only visible on active, via CSS)
      const badge = document.createElement('div');
      badge.className = 'overlay-map-badge';
      badge.textContent = 'SELECTED';

      // Map name label
      const name = document.createElement('div');
      name.className = 'overlay-map-name';
      name.textContent = m.label.toUpperCase();

      item.appendChild(img);
      item.appendChild(badge);
      item.appendChild(name);
      mapBar.appendChild(item);
    });

    // Only show map bar if there's something to display
    mapBar.style.display = (mapData || (picksData && picksData.length > 0)) ? 'flex' : 'none';
  }

  let lastRaw = null;
  let lastMap = null;
  setInterval(() => {
    try {
      const raw    = localStorage.getItem(LS_KEY);
      const rawMap = localStorage.getItem(LS_MAP_KEY) || '';
      if (raw !== lastRaw || rawMap !== lastMap) {
        lastRaw = raw;
        lastMap = rawMap;
        renderOverlay(raw ? JSON.parse(raw) : [], rawMap || null);
      }
    } catch(e) {}
  }, 500);

  renderOverlay([], null);
}

// ===== INIT =====
loadState();
checkOverlayMode();
renderDisplay();
renderList();
renderMapButtons();