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
const MISSING_IMG    = './assets/pokemon/missing.png';

const LS_KEY          = 'unite_tracker_picks';
const LS_MAP_KEY      = 'unite_tracker_map';
const LS_BANS_KEY     = 'unite_tracker_bans';
const LS_BAN_MODE_KEY = 'unite_tracker_ban_mode';

const MAPS = [
  { id: 'rayquaza', label: 'Rayquaza', emoji: '🌿', color: '#4caf82' },
  { id: 'groudon',  label: 'Groudon',  emoji: '🔥', color: '#ff7043' },
  { id: 'kyogre',   label: 'Kyogre',   emoji: '💧', color: '#4fc3f7' },
];

const BAN_SEQUENCE_TEMPLATE = ['purple','orange','purple','orange','purple','orange'];

let picks        = [];
let activeMode   = null;
let roleFilter   = 'any';
let selectedMap  = null;
let bans         = [];
let banFirstTeam = 'purple';
let activeTab    = 'fearless';

// ===== BAN ORDER HELPERS =====
function getBanSequence() {
  return BAN_SEQUENCE_TEMPLATE.map((t) =>
    banFirstTeam === 'purple' ? t : (t === 'purple' ? 'orange' : 'purple')
  );
}

function getNextBanTeam() {
  const seq = getBanSequence();
  if (bans.length >= 6) return null;
  return seq[bans.length];
}

// ===== LOCALSTORAGE =====
function saveState() {
  try {
    localStorage.setItem(LS_KEY,          JSON.stringify(picks));
    localStorage.setItem(LS_MAP_KEY,      selectedMap || '');
    localStorage.setItem(LS_BANS_KEY,     JSON.stringify(bans));
    localStorage.setItem(LS_BAN_MODE_KEY, banFirstTeam);
  } catch(e) {}
}

function loadState() {
  try {
    const raw      = localStorage.getItem(LS_KEY);
    const rawMap   = localStorage.getItem(LS_MAP_KEY);
    const rawBans  = localStorage.getItem(LS_BANS_KEY);
    const rawBMode = localStorage.getItem(LS_BAN_MODE_KEY);
    if (raw)      picks        = JSON.parse(raw);
    if (rawMap)   selectedMap  = rawMap || null;
    if (rawBans)  bans         = JSON.parse(rawBans);
    if (rawBMode) banFirstTeam = rawBMode;
  } catch(e) { picks = []; bans = []; }
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

// ===== TEAM MODE (fearless picks) =====
function setMode(mode) {
  activeMode = mode;
  document.getElementById('btnOrange').classList.toggle('active', mode === 'orange');
  document.getElementById('btnPurple').classList.toggle('active', mode === 'purple');
  document.getElementById('btnNone').classList.toggle('active',   mode === null);
}

// ===== TAB SWITCHING =====
function setTab(tab) {
  activeTab = tab;
  document.getElementById('tabFearless').classList.toggle('active', tab === 'fearless');
  document.getElementById('tabBans').classList.toggle('active',     tab === 'bans');

  const fearlessControls = document.getElementById('fearlessControls');
  const bansControls     = document.getElementById('bansControls');
  const roleTabsEl       = document.getElementById('roleTabs');

  fearlessControls.style.display = tab === 'fearless' ? '' : 'none';
  bansControls.style.display     = tab === 'bans'     ? '' : 'none';

  if (tab === 'bans') {
    roleTabsEl.classList.add('ban-mode-active');
  } else {
    roleTabsEl.classList.remove('ban-mode-active');
  }

  renderList();
  renderBanDisplay();
  renderNextBanIndicator();
}

// ===== BAN MODE (first team) =====
function setBanFirstTeam(team) {
  banFirstTeam = team;
  document.getElementById('btnBanPurpleFirst').classList.toggle('active', team === 'purple');
  document.getElementById('btnBanOrangeFirst').classList.toggle('active', team === 'orange');
  saveState();
  renderBanDisplay();
  renderNextBanIndicator();
  renderList();
}

// ===== PICK / REMOVE (fearless) =====
function onCardClick(file) {
  if (activeTab === 'bans') {
    onBanCardClick(file);
    return;
  }
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

// ===== BAN CARD CLICK =====
function onBanCardClick(file) {
  const existingIdx = bans.findIndex(b => b.file === file);
  if (existingIdx !== -1) {
    bans.splice(existingIdx, 1);
    saveState();
    renderBanDisplay();
    renderNextBanIndicator();
    renderList();
    return;
  }

  if (picks.some(p => p.file === file)) {
    showToast('Ce Pokémon est déjà dans les picks !');
    return;
  }

  if (bans.length >= 6) {
    showToast('Maximum 6 bans atteint !');
    return;
  }

  const nextTeam = getNextBanTeam();
  bans.push({ file, team: nextTeam });
  saveState();
  renderBanDisplay();
  renderNextBanIndicator();
  renderList();
}

function removeBan(file) {
  const idx = bans.findIndex(b => b.file === file);
  if (idx !== -1) {
    bans.splice(idx, 1);
    saveState();
    renderBanDisplay();
    renderNextBanIndicator();
    renderList();
  }
}

function clearAll() {
  picks       = [];
  bans        = [];
  selectedMap = null;
  saveState();
  renderDisplay();
  renderBanDisplay();
  renderNextBanIndicator();
  renderList();
  renderMapButtons();
}

// ===== RENDER DISPLAY (fearless picks) =====
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
      <img src="${IMG_BASE}${file}" alt="${poke.name}" onerror="this.style.opacity='0.2'">
      <div class="team-ring"></div>
      <div class="remove-btn" onclick="removePick('${file}')">×</div>
    `;
    grid.appendChild(slot);
  });
}

// ===== RENDER BAN DISPLAY (left panel ban slots) =====
function renderBanDisplay() {
  const purpleBans = bans.filter(b => b.team === 'purple');
  const orangeBans = bans.filter(b => b.team === 'orange');
  const nextTeam   = getNextBanTeam();

  ['purple', 'orange'].forEach(team => {
    const teamBans = team === 'purple' ? purpleBans : orangeBans;
    const row = document.getElementById(`banSlots_${team}`);
    if (!row) return;
    row.innerHTML = '';

    for (let i = 0; i < 3; i++) {
      const banEntry = teamBans[i];
      const slot = document.createElement('div');

      const teamBanIndex = teamBans.length;
      const isNextForThisTeam = (nextTeam === team && i === teamBanIndex);

      slot.className = `ban-display-slot ${team}-slot${!banEntry ? ' empty-slot' : ''}${isNextForThisTeam ? ' next-ban' : ''}`;

      if (banEntry) {
        slot.innerHTML = `
          <img class="ban-poke-img" src="${IMG_BASE}${banEntry.file}" alt="" onerror="this.style.opacity='0'">
          <img class="ban-missing-img" src="${MISSING_IMG}" alt="banned">
          <div class="remove-btn" onclick="removeBan('${banEntry.file}')">×</div>
        `;
      }
      row.appendChild(slot);
    }
  });
}

// ===== NEXT BAN INDICATOR =====
function renderNextBanIndicator() {
  const el = document.getElementById('nextBanIndicator');
  if (!el) return;
  const next = getNextBanTeam();
  if (!next) {
    el.innerHTML = `<div class="next-ban-dot done"></div><span class="next-ban-text done">Bans terminés</span>`;
  } else {
    const teamLabel = next === 'purple' ? '🟣 Violette' : '🟠 Orange';
    el.innerHTML = `<div class="next-ban-dot ${next}"></div><span class="next-ban-text ${next}">Prochain ban : ${teamLabel} (${bans.length + 1}/6)</span>`;
  }
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
    const banEntry  = bans.find(b => b.file === poke.file);

    const card = document.createElement('div');

    if (activeTab === 'fearless') {
      card.className = 'pokemon-card' + (inDisplay ? ' in-display' : '');
    } else {
      if (banEntry) {
        // MODIF: colored ban cards instead of greyed
        card.className = `pokemon-card banned-${banEntry.team}-colored`;
      } else if (inDisplay) {
        card.className = 'pokemon-card in-picks-ban-mode';
      } else {
        card.className = 'pokemon-card';
      }
    }

    let extraHTML = '';
    if (activeTab === 'bans' && banEntry) {
      extraHTML = `<div class="banned-overlay"><img src="${MISSING_IMG}" alt="banned"></div>`;
    }

    card.innerHTML = `
      <div class="role-dot ${poke.role}"></div>
      <img src="${IMG_BASE}${poke.file}" alt="${poke.name}" onerror="this.style.background='#152122';this.style.minHeight='60px'">
      <div class="card-name">${poke.name}</div>
      ${extraHTML}
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

function openBansOverlay() {
  const url = window.location.href.split('?')[0] + '?overlay=bans';
  window.open(url, '_blank', 'width=600,height=200,resizable=yes,scrollbars=no');
  showToast('Overlay bans ouverte — ajoutez comme Browser Source dans OBS');
}

function openMapsOverlay() {
  const url = window.location.href.split('?')[0] + '?overlay=maps';
  window.open(url, '_blank', 'width=380,height=120,resizable=yes,scrollbars=no');
  showToast('Overlay map ouverte — ajoutez comme Browser Source dans OBS');
}

function copyOverlayURL() {
  const url = window.location.href.split('?')[0] + '?overlay=true';
  navigator.clipboard.writeText(url).then(() => showToast('URL copiée ! Collez dans OBS > Browser Source'));
}

function copyBansOverlayURL() {
  const url = window.location.href.split('?')[0] + '?overlay=bans';
  navigator.clipboard.writeText(url).then(() => showToast('URL bans copiée ! Collez dans OBS > Browser Source'));
}

function copyMapsOverlayURL() {
  const url = window.location.href.split('?')[0] + '?overlay=maps';
  navigator.clipboard.writeText(url).then(() => showToast('URL map copiée ! Collez dans OBS > Browser Source'));
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

// ===== OVERLAY MODE (picks) =====
function initPicksOverlay() {
  document.body.classList.add('overlay-mode');
  document.body.style.background = 'transparent';

  const root = document.createElement('div');
  root.id = 'overlay-root';
  document.body.appendChild(root);

  const picksRow = document.createElement('div');
  picksRow.id = 'overlay-picks-row';
  root.appendChild(picksRow);

  function renderOverlay(picksData) {
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
  }

  let lastRaw = null;
  setInterval(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw !== lastRaw) {
        lastRaw = raw;
        renderOverlay(raw ? JSON.parse(raw) : []);
      }
    } catch(e) {}
  }, 500);

  renderOverlay([]);
}

// ===== OVERLAY MODE (bans) =====
function initBansOverlay() {
  document.body.classList.add('overlay-mode');
  document.body.style.background = 'transparent';

  const root = document.createElement('div');
  root.id = 'bans-overlay-root';
  document.body.appendChild(root);

  function renderBansOverlay(bansData, banMode) {
    root.innerHTML = '';

    const seq = BAN_SEQUENCE_TEMPLATE.map((t) =>
      banMode === 'purple' ? t : (t === 'purple' ? 'orange' : 'purple')
    );

    ['purple', 'orange'].forEach(team => {
      const row = document.createElement('div');
      row.className = 'bans-overlay-row';

      const label = document.createElement('div');
      label.className = `bans-overlay-team-label ${team}`;
      label.textContent = team === 'purple' ? 'VIOLET' : 'ORANGE';
      row.appendChild(label);

      const slotsWrap = document.createElement('div');
      slotsWrap.className = 'bans-overlay-slots';

      const teamBans = (bansData || []).filter(b => b.team === team);
      const totalBans = (bansData || []).length;
      const nextTeam = totalBans < 6 ? seq[totalBans] : null;

      for (let i = 0; i < 3; i++) {
        const banEntry = teamBans[i];
        const slot = document.createElement('div');
        const isNext = (nextTeam === team && i === teamBans.length);
        slot.className = `bans-overlay-slot ${team}${isNext ? ' next' : ''}`;

        if (banEntry) {
          const pokeImg = document.createElement('img');
          pokeImg.className = 'slot-poke-img';
          pokeImg.src = IMG_BASE + banEntry.file;
          pokeImg.onerror = function() { this.style.display = 'none'; };

          const missingImg = document.createElement('img');
          missingImg.className = 'slot-missing-img';
          missingImg.src = MISSING_IMG;

          slot.appendChild(pokeImg);
          slot.appendChild(missingImg);
        }

        slotsWrap.appendChild(slot);
      }

      row.appendChild(slotsWrap);
      root.appendChild(row);
    });

    root.style.display = ((bansData && bansData.length > 0)) ? 'flex' : 'none';
  }

  let lastBans = null;
  let lastMode = null;
  setInterval(() => {
    try {
      const rawBans = localStorage.getItem(LS_BANS_KEY);
      const rawMode = localStorage.getItem(LS_BAN_MODE_KEY) || 'purple';
      if (rawBans !== lastBans || rawMode !== lastMode) {
        lastBans = rawBans;
        lastMode = rawMode;
        renderBansOverlay(rawBans ? JSON.parse(rawBans) : [], rawMode);
      }
    } catch(e) {}
  }, 500);

  renderBansOverlay([], 'purple');
}

// ===== OVERLAY MODE (maps only) =====
function initMapsOverlay() {
  document.body.classList.add('overlay-mode');
  document.body.style.background = 'transparent';

  const root = document.createElement('div');
  root.id = 'map-overlay-root';
  document.body.appendChild(root);

  const mapBar = document.createElement('div');
  mapBar.id = 'overlay-map-bar';
  root.appendChild(mapBar);

  function renderMapOverlay(mapData) {
    mapBar.innerHTML = '';

    // MODIF: always show selected map centered, others greyed but visible
    // Sort: active map in center position (index 1 of 3)
    const sortedMaps = [...MAPS];
    if (mapData) {
      const activeIdx = sortedMaps.findIndex(m => m.id === mapData);
      if (activeIdx !== -1) {
        const [active] = sortedMaps.splice(activeIdx, 1);
        sortedMaps.splice(1, 0, active); // insert at center
      }
    }

    sortedMaps.forEach((m) => {
      const isActive = mapData === m.id;
      const item = document.createElement('div');
      item.className = 'overlay-map-item ' + m.id + (isActive ? ' active' : '');

      const imgSrc = isActive ? MAP_BASE_GIF + m.id + '.gif' : MAP_BASE_SPAWN + m.id + '.png';
      const img = document.createElement('img');
      img.className = 'overlay-map-img';
      img.src = imgSrc;
      img.alt = m.label;
      img.onerror = function() {
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

      const badge = document.createElement('div');
      badge.className = 'overlay-map-badge';
      badge.textContent = 'SELECTED';

      const name = document.createElement('div');
      name.className = 'overlay-map-name';
      name.textContent = m.label.toUpperCase();

      item.appendChild(img);
      item.appendChild(badge);
      item.appendChild(name);
      mapBar.appendChild(item);
    });

    // Hide if no map selected
    mapBar.style.display = mapData ? 'flex' : 'none';
  }

  let lastMap = null;
  setInterval(() => {
    try {
      const rawMap = localStorage.getItem(LS_MAP_KEY) || '';
      if (rawMap !== lastMap) {
        lastMap = rawMap;
        renderMapOverlay(rawMap || null);
      }
    } catch(e) {}
  }, 500);

  renderMapOverlay(null);
}

// ===== CHECK OVERLAY MODE =====
function checkOverlayMode() {
  const param = new URLSearchParams(window.location.search).get('overlay');
  if (param === 'true') { initPicksOverlay(); return true; }
  if (param === 'bans') { initBansOverlay();  return true; }
  if (param === 'maps') { initMapsOverlay();  return true; }
  return false;
}

// ===== RESIZABLE PANEL DIVIDER =====
function initResizableDivider() {
  const divider = document.getElementById('panel-divider');
  const displayPanel = document.getElementById('display-panel');
  if (!divider || !displayPanel) return;

  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  divider.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startWidth = displayPanel.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const delta = e.clientX - startX;
    const newWidth = Math.max(200, startWidth + delta); // no min cap on max
    displayPanel.style.flex = 'none';
    displayPanel.style.width = newWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// ===== INIT =====
loadState();
if (!checkOverlayMode()) {
  renderDisplay();
  renderBanDisplay();
  renderNextBanIndicator();
  renderList();
  renderMapButtons();
  document.getElementById('btnBanPurpleFirst').classList.toggle('active', banFirstTeam === 'purple');
  document.getElementById('btnBanOrangeFirst').classList.toggle('active', banFirstTeam === 'orange');
  initResizableDivider();
}