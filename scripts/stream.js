let POKEMON_DATA = [];

const IMG_BASE       = 'https://fizzeydev.github.io/UniteTools/assets/pokemon/';
const MAP_BASE_SPAWN = 'https://fizzeydev.github.io/UniteTools/assets/maps/spawn/';
const MAP_BASE_GIF   = 'https://fizzeydev.github.io/UniteTools/assets/maps/gifs/';
const MISSING_IMG    = './assets/pokemon/missing.png';

const LS_KEY          = 'unite_tracker_picks';
const LS_MAP_KEY      = 'unite_tracker_map';
const LS_BANS_KEY     = 'unite_tracker_bans';
const LS_BAN_MODE_KEY = 'unite_tracker_ban_mode';
// New: store ban order mode (purple_first | orange_first | free)
const LS_BAN_ORDER_KEY = 'unite_tracker_ban_order';

const MAPS = [
  { id: 'rayquaza', label: 'Rayquaza', emoji: '🌿', color: '#4caf82' },
  { id: 'groudon',  label: 'Groudon',  emoji: '🔥', color: '#ff7043' },
  { id: 'kyogre',   label: 'Kyogre',   emoji: '💧', color: '#4fc3f7' },
];

// Ban order sequence helpers
// 'purple_first' → V O V O V O  (indices: 0=purple,1=orange,2=purple,3=orange,4=purple,5=orange)
// 'orange_first' → O V O V O V
// 'free'         → first 3 bans = purple, next 3 = orange (no manual team selector needed)
const BAN_SEQUENCE = {
  purple_first: ['purple','orange','purple','orange','purple','orange'],
  orange_first: ['orange','purple','orange','purple','orange','purple'],
  free:         ['purple','purple','purple','orange','orange','orange'],
};

let picks        = [];
let activeMode   = null;   // team for fearless picks
let roleFilter   = 'any';
let selectedMap  = null;
let bans         = [];     // each entry: { file, team }
let banFirstTeam = 'purple'; // legacy compat
let banOrderMode = 'purple_first'; // 'purple_first' | 'orange_first' | 'free'
let activeTab    = 'fearless';

// ===== DRAG & DROP (pointer-based for OBS "interact" mode compatibility) =====
let dragSrcIndex = null;
let _dragGhost = null;
let _dragOffX = 0;
let _dragOffY = 0;

function _createGhost(slot) {
  const ghost = slot.cloneNode(true);
  ghost.style.cssText = `
    position:fixed;pointer-events:none;z-index:99999;
    width:${slot.offsetWidth}px;height:${slot.offsetHeight}px;
    opacity:0.75;transform:scale(1.08);
    border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.7);
    transition:none;
  `;
  document.body.appendChild(ghost);
  return ghost;
}

function _removeGhost() {
  if (_dragGhost) { _dragGhost.remove(); _dragGhost = null; }
}

function _getSlotUnderPoint(x, y, excludeEl) {
  const slots = Array.from(document.querySelectorAll('.display-slot'));
  for (const s of slots) {
    if (s === excludeEl) continue;
    const r = s.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return s;
  }
  return null;
}

function _bindPointerDrag(slot, index) {
  slot.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('remove-btn')) return;
    e.preventDefault();

    dragSrcIndex = index;
    const rect = slot.getBoundingClientRect();
    _dragOffX = e.clientX - rect.left;
    _dragOffY = e.clientY - rect.top;

    _dragGhost = _createGhost(slot);
    _dragGhost.style.left = (e.clientX - _dragOffX) + 'px';
    _dragGhost.style.top  = (e.clientY - _dragOffY) + 'px';

    slot.style.opacity = '0.3';
    slot.setPointerCapture(e.pointerId);

    function onMove(ev) {
      if (_dragGhost) {
        _dragGhost.style.left = (ev.clientX - _dragOffX) + 'px';
        _dragGhost.style.top  = (ev.clientY - _dragOffY) + 'px';
      }
      document.querySelectorAll('.display-slot').forEach(s => s.classList.remove('drag-over'));
      const over = _getSlotUnderPoint(ev.clientX, ev.clientY, slot);
      if (over) over.classList.add('drag-over');
    }

    function onUp(ev) {
      slot.removeEventListener('pointermove', onMove);
      slot.removeEventListener('pointerup', onUp);
      slot.removeEventListener('pointercancel', onUp);

      _removeGhost();
      slot.style.opacity = '';
      document.querySelectorAll('.display-slot').forEach(s => s.classList.remove('drag-over'));

      const over = _getSlotUnderPoint(ev.clientX, ev.clientY, slot);
      if (over !== null) {
        const targetIndex = parseInt(over.dataset.index);
        if (!isNaN(targetIndex) && dragSrcIndex !== targetIndex) {
          const moved = picks.splice(dragSrcIndex, 1)[0];
          picks.splice(targetIndex, 0, moved);
          saveState();
          renderDisplay();
          renderList();
          dragSrcIndex = null;
          return;
        }
      }
      dragSrcIndex = null;
    }

    slot.addEventListener('pointermove', onMove);
    slot.addEventListener('pointerup', onUp);
    slot.addEventListener('pointercancel', onUp);
  });
}

// ── Color picker popup state ──
let colorPickerFile = null;

/* ── Helper traduction ── */
function t(key, fallback) {
  try {
    const lang = window.translations && window.translations[currentLang];
    return (lang && lang[key]) ? lang[key] : fallback;
  } catch(e) { return fallback; }
}

(function removeNavbarInOverlayMode() {
  const params = new URLSearchParams(window.location.search);
  const overlayParam = params.get('overlay');
  if (overlayParam) {
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) navbarContainer.remove();
    document.body.classList.add('overlay-mode');
  }
})();

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
}

// ===== BAN ORDER MODE =====
// banOrderMode: 'purple_first' | 'orange_first' | 'free'
function setBanOrderMode(mode) {
  banOrderMode = mode;
  document.getElementById('btnBanOrderPurple').classList.toggle('active', mode === 'purple_first');
  document.getElementById('btnBanOrderOrange').classList.toggle('active', mode === 'orange_first');
  document.getElementById('btnBanOrderFree').classList.toggle('active',   mode === 'free');

  // Show/hide manual team selector: only visible when NOT in free mode
  const manualSelector = document.getElementById('banManualTeamSelector');
  if (manualSelector) {
    manualSelector.style.display = (mode === 'free') ? 'none' : 'none'; // always hidden — auto-assigned
  }

  saveState();
  renderBanDisplay();
  renderList();
}

// Get the team that should receive the NEXT ban based on current ban count + mode
function getNextBanTeam() {
  const seq = BAN_SEQUENCE[banOrderMode] || BAN_SEQUENCE['purple_first'];
  const idx = bans.length; // next ban index
  if (idx >= seq.length) return null; // max bans reached
  return seq[idx];
}

// ===== LOCALSTORAGE =====
function saveState() {
  try {
    localStorage.setItem(LS_KEY,           JSON.stringify(picks));
    localStorage.setItem(LS_MAP_KEY,       selectedMap || '');
    localStorage.setItem(LS_BANS_KEY,      JSON.stringify(bans));
    localStorage.setItem(LS_BAN_MODE_KEY,  banFirstTeam);
    localStorage.setItem(LS_BAN_ORDER_KEY, banOrderMode);
  } catch(e) {}
}

function loadState() {
  try {
    const raw       = localStorage.getItem(LS_KEY);
    const rawMap    = localStorage.getItem(LS_MAP_KEY);
    const rawBans   = localStorage.getItem(LS_BANS_KEY);
    const rawBMode  = localStorage.getItem(LS_BAN_MODE_KEY);
    const rawBOrder = localStorage.getItem(LS_BAN_ORDER_KEY);
    if (raw)       picks        = JSON.parse(raw);
    if (rawMap)    selectedMap  = rawMap || null;
    if (rawBans)   bans         = JSON.parse(rawBans);
    if (rawBMode)  banFirstTeam = rawBMode;
    if (rawBOrder) banOrderMode = rawBOrder;
  } catch(e) { picks = []; bans = []; }
}

// ===== PICK / REMOVE (fearless) =====
function onCardClick(file) {
  if (activeTab === 'bans') {
    onBanCardClick(file);
    return;
  }
  const idx = picks.findIndex(p => p.file === file);
  if (idx !== -1) {
    picks.splice(idx, 1);
    saveState();
    renderDisplay();
    renderList();
  } else {
    picks.push({ file, team: activeMode });
    saveState();
    renderDisplay();
    renderList();
  }
}

function removePick(file, e) {
  if (e) e.stopPropagation();
  picks = picks.filter(p => p.file !== file);
  saveState();
  renderDisplay();
  renderList();
}

// ===== COLOR PICKER =====
function openColorPicker(file, e) {
  e.stopPropagation();
  closeColorPicker();

  colorPickerFile = file;
  const popup = document.createElement('div');
  popup.id = 'color-picker-popup';
  popup.className = 'color-picker-popup';

  const pick = picks.find(p => p.file === file);
  const current = pick ? pick.team : null;

  popup.innerHTML = `
    <div class="color-picker-title">${t('stream_team_color_label', 'Couleur équipe')}</div>
    <div class="color-picker-options">
      <button class="cpick-btn cpick-purple ${current === 'purple' ? 'active' : ''}" onclick="setPickTeam('${file}','purple')">🟣 ${t('stream_team_purple_btn', 'Violet')}</button>
      <button class="cpick-btn cpick-orange ${current === 'orange' ? 'active' : ''}" onclick="setPickTeam('${file}','orange')">🟠 ${t('stream_team_orange_btn', 'Orange')}</button>
      <button class="cpick-btn cpick-none ${current === null ? 'active' : ''}" onclick="setPickTeam('${file}',null)">— ${t('stream_team_none', 'Aucune')}</button>
    </div>
  `;

  const rect = e.currentTarget.getBoundingClientRect();
  popup.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
  popup.style.top  = (rect.bottom + 6) + 'px';

  document.body.appendChild(popup);

  setTimeout(() => {
    document.addEventListener('click', closeColorPickerOnOutside, { once: true });
  }, 0);
}

function closeColorPickerOnOutside(e) {
  const popup = document.getElementById('color-picker-popup');
  if (popup && !popup.contains(e.target)) closeColorPicker();
}

function closeColorPicker() {
  const popup = document.getElementById('color-picker-popup');
  if (popup) popup.remove();
  colorPickerFile = null;
}

function setPickTeam(file, team) {
  const pick = picks.find(p => p.file === file);
  if (pick) {
    pick.team = team;
    saveState();
    renderDisplay();
    renderList();
  }
  closeColorPicker();
}

// ===== BAN CARD CLICK =====
function onBanCardClick(file) {
  const existingIdx = bans.findIndex(b => b.file === file);
  if (existingIdx !== -1) {
    bans.splice(existingIdx, 1);
    saveState();
    renderBanDisplay();
    renderList();
    return;
  }

  if (picks.some(p => p.file === file)) {
    showToast(t('stream_toast_already_picked', 'Ce Pokémon est déjà dans les picks !'));
    return;
  }

  if (bans.length >= 6) {
    showToast(t('stream_toast_max_bans', 'Maximum 6 bans atteint !'));
    return;
  }

  // Auto-assign team based on ban order mode + current ban count
  const team = getNextBanTeam();
  bans.push({ file, team });
  saveState();
  renderBanDisplay();
  renderList();
}

// Called from the "empty ban" card in the grid
function addEmptyBan() {
  if (bans.length >= 6) {
    showToast(t('stream_toast_max_bans', 'Maximum 6 bans atteint !'));
    return;
  }
  const team = getNextBanTeam();
  bans.push({ file: null, team });
  saveState();
  renderBanDisplay();
  renderList();
}

function removeBan(idx, e) {
  if (e) e.stopPropagation();
  bans.splice(idx, 1);
  saveState();
  renderBanDisplay();
  renderList();
}

// ===== CLEAR ACTIONS =====
function clearAll() {
  showClearModal('both');
}

function showClearModal(preselect) {
  const existing = document.getElementById('clear-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'clear-modal-overlay';
  overlay.className = 'clear-modal-overlay';
  overlay.innerHTML = `
    <div class="clear-modal-box">
      <div class="clear-modal-title">✕ ${t('stream_clear_title', 'Vider')}</div>
      <div class="clear-modal-desc">${t('stream_clear_desc', 'Que souhaitez-vous effacer ?')}</div>
      <div class="clear-modal-btns">
        <button class="clear-modal-btn fearless" onclick="doClear('fearless')">🎮 ${t('stream_clear_fearless', 'Fearless uniquement')}</button>
        <button class="clear-modal-btn bans" onclick="doClear('bans')">⛔ ${t('stream_clear_bans', 'Bans uniquement')}</button>
        <button class="clear-modal-btn both" onclick="doClear('both')">💥 ${t('stream_clear_both', 'Tout effacer')}</button>
      </div>
      <button class="clear-modal-cancel" onclick="closeClearModal()">${t('stream_clear_cancel', 'Annuler')}</button>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeClearModal();
  });
  document.body.appendChild(overlay);
}

function closeClearModal() {
  const overlay = document.getElementById('clear-modal-overlay');
  if (overlay) overlay.remove();
}

function doClear(type) {
  closeClearModal();
  if (type === 'fearless' || type === 'both') {
    picks = [];
  }
  if (type === 'bans' || type === 'both') {
    bans = [];
  }
  if (type === 'both') {
    selectedMap = null;
    renderMapButtons();
  }
  saveState();
  renderDisplay();
  renderBanDisplay();
  renderList();
}

// ===== RENDER DISPLAY (fearless picks) with drag & drop =====
function renderDisplay() {
  const grid = document.getElementById('displayGrid');
  grid.innerHTML = '';

  if (picks.length === 0) {
    grid.innerHTML = `
      <div class="empty-display" style="
        width:100%;
        height:100%;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        text-align:center;
        gap:8px;
      ">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="#cfe0e2" stroke-width="1.5"/>
          <line x1="2" y1="20" x2="38" y2="20" stroke="#cfe0e2" stroke-width="1.5"/>
          <circle cx="20" cy="20" r="5" stroke="#cfe0e2" stroke-width="1.5" fill="#090f10"/>
        </svg>
        <span>${t('stream_empty_display_1', 'Sélectionne une équipe et')}</span>
        <span>${t('stream_empty_display_2', 'clique sur un Pokémon')}</span>
      </div>
    `;
    return;
  }

  picks.forEach(({ file, team }, index) => {
    const poke = POKEMON_DATA.find(p => p.file === file);
    if (!poke) return;
    const slot = document.createElement('div');
    slot.className = 'display-slot' + (team ? ' team-' + team : '');
    slot.dataset.index = index;

    slot.innerHTML = `
      <img src="${IMG_BASE}${file}" alt="${poke.name}"
        onerror="this.onerror=null;this.src='./assets/pokemon/${file}';">
      <div class="team-ring"></div>
      <div class="remove-btn" title="Retirer">×</div>
    `;

    slot.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-btn')) return;
      openColorPicker(file, e);
    });

    slot.querySelector('.remove-btn').addEventListener('click', (e) => removePick(file, e));

    _bindPointerDrag(slot, index);

    grid.appendChild(slot);
  });
}

// ===== RENDER BAN DISPLAY =====
function renderBanDisplay() {
  const purpleBans = bans.filter(b => b.team === 'purple');
  const orangeBans = bans.filter(b => b.team === 'orange');

  ['purple', 'orange'].forEach(team => {
    const teamBans = team === 'purple' ? purpleBans : orangeBans;
    const row = document.getElementById(`banSlots_${team}`);
    if (!row) return;
    row.innerHTML = '';

    for (let i = 0; i < 3; i++) {
      const banEntry = teamBans[i];
      const banGlobalIdx = banEntry ? bans.indexOf(banEntry) : -1;

      // Determine if this empty slot is the "next" ban slot
      const nextTeam = getNextBanTeam();
      const isNextSlot = !banEntry && teamBans.length === i && nextTeam === team && bans.length < 6;

      const slot = document.createElement('div');
      slot.className = `ban-display-slot ${team}-slot${!banEntry ? ' empty-slot' : ''}${isNextSlot ? ' next-ban' : ''}`;

      if (banEntry) {
        if (banEntry.file) {
          slot.innerHTML = `
            <img class="ban-poke-img" src="${IMG_BASE}${banEntry.file}" alt="" onerror="this.style.opacity='0'">
            <img class="ban-missing-img" src="${MISSING_IMG}" alt="banned">
            <div class="remove-btn" title="Retirer">×</div>
          `;
        } else {
          slot.innerHTML = `
            <img class="ban-missing-img" src="${MISSING_IMG}" alt="banned" style="opacity:0.5">
            <div class="remove-btn" title="Retirer">×</div>
          `;
        }
        const removeBtn = slot.querySelector('.remove-btn');
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeBan(banGlobalIdx);
          });
        }
      }
      row.appendChild(slot);
    }
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

  // ── "Empty ban" special card — only shown in bans tab ──
  if (activeTab === 'bans' && bans.length < 6) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'pokemon-card ban-empty-card';
    emptyCard.title = t('stream_ban_empty_title', 'Ajouter un ban vide (Pokémon non affiché)');
    emptyCard.innerHTML = `
      <div class="ban-empty-card-inner">
        <img src="${MISSING_IMG}" alt="ban vide" style="width:60%;height:60%;object-fit:contain;opacity:0.5;">
        <div class="ban-empty-card-label">+ ${t('stream_ban_empty_label', 'Ban vide')}</div>
      </div>
    `;
    emptyCard.addEventListener('click', () => addEmptyBan());
    grid.appendChild(emptyCard);
  }

  filtered.forEach(poke => {
    const inDisplay = picks.some(p => p.file === poke.file);
    const banEntry  = bans.find(b => b.file === poke.file);

    const card = document.createElement('div');

    if (activeTab === 'fearless') {
      card.className = 'pokemon-card' + (inDisplay ? ' in-display' : '');
    } else {
      if (banEntry) {
        const teamClass = banEntry.team ? `banned-${banEntry.team}-colored` : 'banned-neutral-colored';
        card.className = `pokemon-card ${teamClass}`;
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
      <img src="${IMG_BASE}${poke.file}" alt="${poke.name}"
        onerror="this.onerror=null;this.src='./assets/pokemon/${poke.file}';">
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
  showToast(t('stream_toast_overlay_picks', 'Fenêtre overlay ouverte — ajoutez comme Browser Source dans OBS'));
}

function openBansOverlay() {
  const url = window.location.href.split('?')[0] + '?overlay=bans';
  window.open(url, '_blank', 'width=600,height=200,resizable=yes,scrollbars=no');
  showToast(t('stream_toast_overlay_bans', 'Overlay bans ouverte — ajoutez comme Browser Source dans OBS'));
}

function openMapsOverlay() {
  const url = window.location.href.split('?')[0] + '?overlay=maps';
  window.open(url, '_blank', 'width=380,height=120,resizable=yes,scrollbars=no');
  showToast(t('stream_toast_overlay_maps', 'Overlay map ouverte — ajoutez comme Browser Source dans OBS'));
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ===== MODAL =====
function openModal()  { document.getElementById('modal-overlay').classList.add('open'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

function onModalOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
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

  function getCustSettings() {
    try {
      const raw = localStorage.getItem('unite_cust_settings');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return {};
  }

  function renderOverlay(picksData) {
    const cust = getCustSettings();
    const fearlessGray   = cust.fearlessGray   != null ? cust.fearlessGray   : 35;
    const fearlessBright = cust.fearlessBright != null ? cust.fearlessBright : 65;
    const pickSize       = cust.pickSize       != null ? cust.pickSize       : 80;
    const glowPct        = cust.glowPct        != null ? cust.glowPct        : 100;

    const grayVal   = (100 - fearlessGray) / 100;
    const brightVal = fearlessBright / 100;
    const glowMul   = glowPct / 100;

    picksRow.innerHTML = '';
    (picksData || []).forEach(({ file, team }) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = `position:relative;width:${pickSize}px;height:${pickSize}px;flex-shrink:0;`;
      const img = document.createElement('img');
      img.src = IMG_BASE + file;
      img.style.cssText = `width:100%;height:100%;object-fit:cover;border-radius:8px;filter:grayscale(${grayVal}) brightness(${brightVal});`;
      const ring = document.createElement('div');
      let rs = 'position:absolute;inset:-3px;border-radius:11px;pointer-events:none;border:2.5px solid transparent;';
      if      (team === 'orange') rs += `border-color:#ff9d00;box-shadow:0 0 ${Math.round(12*glowMul)}px rgba(255,157,0,${0.7*glowMul});`;
      else if (team === 'purple') rs += `border-color:#9f53ec;box-shadow:0 0 ${Math.round(12*glowMul)}px rgba(159,83,236,${0.7*glowMul});`;
      ring.style.cssText = rs;
      wrap.appendChild(img);
      wrap.appendChild(ring);
      picksRow.appendChild(wrap);
    });
  }

  let lastRaw  = null;
  let lastCust = null;
  setInterval(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY);
      const cust = localStorage.getItem('unite_cust_settings');
      if (raw !== lastRaw || cust !== lastCust) {
        lastRaw  = raw;
        lastCust = cust;
        renderOverlay(raw ? JSON.parse(raw) : []);
      }
    } catch(e) {}
  }, 300);

  renderOverlay([]);
}

// ===== OVERLAY MODE (bans) =====
function initBansOverlay() {
  document.body.classList.add('overlay-mode');
  document.body.style.background = 'transparent';
  document.body.style.backgroundColor = 'transparent';

  const root = document.createElement('div');
  root.id = 'bans-overlay-root';
  document.body.appendChild(root);

  function getCustSettings() {
    try {
      const raw = localStorage.getItem('unite_cust_settings');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return {};
  }

  function renderBansOverlay(bansData) {
    const cust = getCustSettings();
    const bansGray   = cust.bansGray   != null ? cust.bansGray   : 40;
    const bansBright = cust.bansBright != null ? cust.bansBright : 60;
    const glowPct    = cust.glowPct    != null ? cust.glowPct    : 100;

    const grayVal   = (100 - bansGray) / 100;
    const brightVal = bansBright / 100;
    const glowMul   = glowPct / 100;

    root.innerHTML = '';

    const purpleBans = (bansData || []).filter(b => b.team === 'purple');
    const orangeBans = (bansData || []).filter(b => b.team === 'orange');

    ['purple', 'orange'].forEach(team => {
      const teamBans = team === 'purple' ? purpleBans : orangeBans;
      if (teamBans.length === 0) return;

      const row = document.createElement('div');
      row.className = 'bans-overlay-row';

      const label = document.createElement('div');
      label.className = `bans-overlay-team-label ${team}`;
      label.textContent = team === 'purple' ? 'VIOLET' : 'ORANGE';
      row.appendChild(label);

      const slotsWrap = document.createElement('div');
      slotsWrap.className = 'bans-overlay-slots';

      teamBans.forEach(banEntry => {
        const slot = document.createElement('div');
        slot.className = `bans-overlay-slot ${team} filled`;

        if (banEntry.file) {
          const pokeImg = document.createElement('img');
          pokeImg.className = 'slot-poke-img';
          pokeImg.src = IMG_BASE + banEntry.file;
          pokeImg.style.filter = `grayscale(${grayVal}) brightness(${brightVal})`;
          pokeImg.onerror = function() { this.style.display = 'none'; };
          slot.appendChild(pokeImg);
        }

        const missingImg = document.createElement('img');
        missingImg.className = 'slot-missing-img';
        missingImg.src = MISSING_IMG;
        slot.appendChild(missingImg);

        if (team === 'purple') {
          slot.style.borderColor = 'var(--violet)';
          slot.style.background = 'rgba(159,83,236,0.18)';
          slot.style.boxShadow = `0 0 ${Math.round(12*glowMul)}px rgba(159,83,236,${0.5*glowMul}), inset 0 0 0 1px rgba(239,83,80,0.3)`;
        } else {
          slot.style.borderColor = 'var(--orange)';
          slot.style.background = 'rgba(255,157,0,0.14)';
          slot.style.boxShadow = `0 0 ${Math.round(12*glowMul)}px rgba(255,157,0,${0.5*glowMul}), inset 0 0 0 1px rgba(239,83,80,0.3)`;
        }

        slotsWrap.appendChild(slot);
      });

      row.appendChild(slotsWrap);
      root.appendChild(row);
    });

    root.style.display = ((bansData && bansData.length > 0)) ? 'flex' : 'none';
  }

  let lastBans = null;
  let lastCust = null;
  setInterval(() => {
    try {
      const rawBans = localStorage.getItem(LS_BANS_KEY);
      const cust    = localStorage.getItem('unite_cust_settings');
      if (rawBans !== lastBans || cust !== lastCust) {
        lastBans = rawBans;
        lastCust = cust;
        renderBansOverlay(rawBans ? JSON.parse(rawBans) : []);
      }
    } catch(e) {}
  }, 300);

  renderBansOverlay([]);
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

    const sortedMaps = [...MAPS];
    if (mapData) {
      const activeIdx = sortedMaps.findIndex(m => m.id === mapData);
      if (activeIdx !== -1) {
        const [active] = sortedMaps.splice(activeIdx, 1);
        sortedMaps.splice(1, 0, active);
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
    const newWidth = Math.max(200, startWidth + delta);
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
fetch('data/pokemons.json')
  .then(r => r.json())
  .then(data => {
    POKEMON_DATA = data;
    loadState();
    if (!checkOverlayMode()) {
      renderDisplay();
      renderBanDisplay();
      renderList();
      renderMapButtons();
      initResizableDivider();
      setBanOrderMode(banOrderMode);
    }
  })
  .catch(err => console.error('Erreur chargement pokemons.json :', err));