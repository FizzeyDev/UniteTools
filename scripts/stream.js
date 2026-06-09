/**
 * stream.js — UNITE Draft Tracker
 *
 * Main controller for the Pokémon UNITE draft overlay tool.
 * Handles fearless pick selection, ban management, map selection,
 * drag-and-drop reordering, localStorage persistence, and OBS overlay modes.
 *
 * Overlay modes (via ?overlay= URL param):
 *   ?overlay=true  → picks bar
 *   ?overlay=bans  → bans display
 *   ?overlay=maps  → map selector
 */

// ─── Constants ───────────────────────────────────────────────────────────────

let POKEMON_DATA = [];

const IMG_BASE       = 'https://fizzeydev.github.io/UniteTools/assets/pokemon/';
const MAP_BASE_SPAWN = 'https://fizzeydev.github.io/UniteTools/assets/maps/spawn/';
const MAP_BASE_GIF   = 'https://fizzeydev.github.io/UniteTools/assets/maps/gifs/';
const MISSING_IMG    = './assets/pokemon/missing.png';

const LS_KEY           = 'unite_tracker_picks';
const LS_MAP_KEY       = 'unite_tracker_map';
const LS_BANS_KEY      = 'unite_tracker_bans';
const LS_BAN_MODE_KEY  = 'unite_tracker_ban_mode';
const LS_BAN_ORDER_KEY = 'unite_tracker_ban_order';

const MAPS = [
  { id: 'rayquaza', label: 'Rayquaza', emoji: '🌿' },
  { id: 'groudon',  label: 'Groudon',  emoji: '🔥' },
  { id: 'kyogre',   label: 'Kyogre',   emoji: '💧' },
];

// Ban assignment sequence per order mode
const BAN_SEQUENCE = {
  purple_first: ['purple','orange','purple','orange','purple','orange'],
  orange_first: ['orange','purple','orange','purple','orange','purple'],
  free:         ['purple','purple','purple','orange','orange','orange'],
};

// ─── State ────────────────────────────────────────────────────────────────────

let picks        = [];
let bans         = [];
let activeMode   = null;
let roleFilter   = 'any';
let selectedMap  = null;
let banFirstTeam = 'purple';
let banOrderMode = 'purple_first';
let activeTab    = 'fearless';

// ─── Drag & Drop (pointer-based, OBS interact mode compatible) ───────────────

let dragSrcIndex = null;
let _dragGhost   = null;
let _dragOffX    = 0;
let _dragOffY    = 0;

function _createGhost(slot) {
  const ghost = slot.cloneNode(true);
  ghost.style.cssText = `
    position:fixed;pointer-events:none;z-index:99999;
    width:${slot.offsetWidth}px;height:${slot.offsetHeight}px;
    opacity:0.75;transform:scale(1.08);
    border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.7);transition:none;
  `;
  document.body.appendChild(ghost);
  return ghost;
}

function _removeGhost() {
  _dragGhost?.remove();
  _dragGhost = null;
}

function _getSlotUnderPoint(x, y, exclude) {
  for (const s of document.querySelectorAll('.display-slot')) {
    if (s === exclude) continue;
    const r = s.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return s;
  }
  return null;
}

// Attaches pointer-based drag events to a display slot
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

    const onMove = (ev) => {
      if (_dragGhost) {
        _dragGhost.style.left = (ev.clientX - _dragOffX) + 'px';
        _dragGhost.style.top  = (ev.clientY - _dragOffY) + 'px';
      }
      document.querySelectorAll('.display-slot').forEach(s => s.classList.remove('drag-over'));
      _getSlotUnderPoint(ev.clientX, ev.clientY, slot)?.classList.add('drag-over');
    };

    const onUp = (ev) => {
      slot.removeEventListener('pointermove', onMove);
      slot.removeEventListener('pointerup', onUp);
      slot.removeEventListener('pointercancel', onUp);

      _removeGhost();
      slot.style.opacity = '';
      document.querySelectorAll('.display-slot').forEach(s => s.classList.remove('drag-over'));

      const over = _getSlotUnderPoint(ev.clientX, ev.clientY, slot);
      if (over) {
        const targetIndex = parseInt(over.dataset.index);
        if (!isNaN(targetIndex) && dragSrcIndex !== targetIndex) {
          picks.splice(targetIndex, 0, picks.splice(dragSrcIndex, 1)[0]);
          saveState();
          renderDisplay();
          renderList();
        }
      }
      dragSrcIndex = null;
    };

    slot.addEventListener('pointermove', onMove);
    slot.addEventListener('pointerup', onUp);
    slot.addEventListener('pointercancel', onUp);
  });
}

// ─── Overlay mode detection ───────────────────────────────────────────────────

// Removes the navbar when running as an OBS browser source
(function removeNavbarInOverlayMode() {
  if (new URLSearchParams(window.location.search).get('overlay')) {
    document.getElementById('navbar-container')?.remove();
    document.body.classList.add('overlay-mode');
  }
})();

// ─── i18n helper ─────────────────────────────────────────────────────────────

function t(key, fallback) {
  return window.translations?.[currentLang]?.[key] ?? fallback;
}

// ─── Map ──────────────────────────────────────────────────────────────────────

function setMap(mapId) {
  selectedMap = selectedMap === mapId ? null : mapId;
  saveState();
  renderMapButtons();
}

function renderMapButtons() {
  MAPS.forEach(({ id }) => {
    const btnId = 'mapBtn' + id.charAt(0).toUpperCase() + id.slice(1);
    document.getElementById(btnId)?.classList.toggle('active', selectedMap === id);
  });
}

// ─── Team selection (fearless) ────────────────────────────────────────────────

function setMode(mode) {
  activeMode = mode;
  document.getElementById('btnOrange').classList.toggle('active', mode === 'orange');
  document.getElementById('btnPurple').classList.toggle('active', mode === 'purple');
  document.getElementById('btnNone').classList.toggle('active',   mode === null);
}

// ─── Tabs (Fearless / Bans) ───────────────────────────────────────────────────

function setTab(tab) {
  activeTab = tab;
  const isFearless = tab === 'fearless';
  document.getElementById('tabFearless').classList.toggle('active', isFearless);
  document.getElementById('tabBans').classList.toggle('active', !isFearless);
  document.getElementById('fearlessControls').style.display = isFearless ? '' : 'none';
  document.getElementById('bansControls').style.display     = isFearless ? 'none' : '';
  document.getElementById('roleTabs').classList.toggle('ban-mode-active', !isFearless);
  renderList();
  renderBanDisplay();
}

// ─── Ban order ────────────────────────────────────────────────────────────────

function setBanOrderMode(mode) {
  banOrderMode = mode;
  document.getElementById('btnBanOrderPurple').classList.toggle('active', mode === 'purple_first');
  document.getElementById('btnBanOrderOrange').classList.toggle('active', mode === 'orange_first');
  document.getElementById('btnBanOrderFree').classList.toggle('active',   mode === 'free');
  saveState();
  renderBanDisplay();
  renderList();
}

// Returns which team bans next based on current sequence position
function getNextBanTeam() {
  const seq = BAN_SEQUENCE[banOrderMode] ?? BAN_SEQUENCE.purple_first;
  return bans.length < seq.length ? seq[bans.length] : null;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem(LS_KEY,           JSON.stringify(picks));
    localStorage.setItem(LS_MAP_KEY,       selectedMap || '');
    localStorage.setItem(LS_BANS_KEY,      JSON.stringify(bans));
    localStorage.setItem(LS_BAN_MODE_KEY,  banFirstTeam);
    localStorage.setItem(LS_BAN_ORDER_KEY, banOrderMode);
  } catch {}
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
  } catch { picks = []; bans = []; }
}

// ─── Picks ────────────────────────────────────────────────────────────────────

function onCardClick(file) {
  if (activeTab === 'bans') { onBanCardClick(file); return; }
  const idx = picks.findIndex(p => p.file === file);
  idx !== -1 ? picks.splice(idx, 1) : picks.push({ file, team: activeMode });
  saveState();
  renderDisplay();
  renderList();
}

function removePick(file, e) {
  e?.stopPropagation();
  picks = picks.filter(p => p.file !== file);
  saveState();
  renderDisplay();
  renderList();
}

// ─── Color picker popup (team reassignment on a pick) ────────────────────────

let colorPickerFile = null;

function openColorPicker(file, e) {
  e.stopPropagation();
  closeColorPicker();
  colorPickerFile = file;
  const current = picks.find(p => p.file === file)?.team ?? null;

  const popup = document.createElement('div');
  popup.id        = 'color-picker-popup';
  popup.className = 'color-picker-popup';
  popup.innerHTML = `
    <div class="color-picker-title">${t('stream_team_color_label', 'Team color')}</div>
    <div class="color-picker-options">
      <button class="cpick-btn cpick-purple ${current === 'purple' ? 'active' : ''}" onclick="setPickTeam('${file}','purple')">🟣 ${t('stream_team_purple_btn', 'Purple')}</button>
      <button class="cpick-btn cpick-orange ${current === 'orange' ? 'active' : ''}" onclick="setPickTeam('${file}','orange')">🟠 ${t('stream_team_orange_btn', 'Orange')}</button>
      <button class="cpick-btn cpick-none ${current === null ? 'active' : ''}" onclick="setPickTeam('${file}',null)">— ${t('stream_team_none', 'None')}</button>
    </div>
  `;

  const rect = e.currentTarget.getBoundingClientRect();
  popup.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
  popup.style.top  = (rect.bottom + 6) + 'px';
  document.body.appendChild(popup);
  setTimeout(() => document.addEventListener('click', closeColorPickerOnOutside, { once: true }), 0);
}

function closeColorPickerOnOutside(e) {
  if (!document.getElementById('color-picker-popup')?.contains(e.target)) closeColorPicker();
}

function closeColorPicker() {
  document.getElementById('color-picker-popup')?.remove();
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

// ─── Bans ─────────────────────────────────────────────────────────────────────

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
    showToast(t('stream_toast_already_picked', 'This Pokémon is already in picks!'));
    return;
  }
  if (bans.length >= 6) {
    showToast(t('stream_toast_max_bans', 'Max 6 bans reached!'));
    return;
  }

  bans.push({ file, team: getNextBanTeam() });
  saveState();
  renderBanDisplay();
  renderList();
}

// Adds an empty ban slot (no Pokémon shown) for the next team in sequence
function addEmptyBan() {
  if (bans.length >= 6) {
    showToast(t('stream_toast_max_bans', 'Max 6 bans reached!'));
    return;
  }
  bans.push({ file: null, team: getNextBanTeam() });
  saveState();
  renderBanDisplay();
  renderList();
}

function removeBan(idx, e) {
  e?.stopPropagation();
  bans.splice(idx, 1);
  saveState();
  renderBanDisplay();
  renderList();
}

// ─── Clear modal ──────────────────────────────────────────────────────────────

function clearAll() { showClearModal(); }

function showClearModal() {
  document.getElementById('clear-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id        = 'clear-modal-overlay';
  overlay.className = 'clear-modal-overlay';
  overlay.innerHTML = `
    <div class="clear-modal-box">
      <div class="clear-modal-title">✕ ${t('stream_clear_title', 'Clear')}</div>
      <div class="clear-modal-desc">${t('stream_clear_desc', 'What do you want to erase?')}</div>
      <div class="clear-modal-btns">
        <button class="clear-modal-btn fearless" onclick="doClear('fearless')">🎮 ${t('stream_clear_fearless', 'Fearless only')}</button>
        <button class="clear-modal-btn bans"     onclick="doClear('bans')">⛔ ${t('stream_clear_bans', 'Bans only')}</button>
        <button class="clear-modal-btn both"     onclick="doClear('both')">💥 ${t('stream_clear_both', 'Clear all')}</button>
      </div>
      <button class="clear-modal-cancel" onclick="closeClearModal()">${t('stream_clear_cancel', 'Cancel')}</button>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeClearModal(); });
  document.body.appendChild(overlay);
}

function closeClearModal() {
  document.getElementById('clear-modal-overlay')?.remove();
}

function doClear(type) {
  closeClearModal();
  if (type === 'fearless' || type === 'both') picks = [];
  if (type === 'bans'     || type === 'both') bans  = [];
  if (type === 'both') { selectedMap = null; renderMapButtons(); }
  saveState();
  renderDisplay();
  renderBanDisplay();
  renderList();
}

// ─── Render: picks display (left panel) ──────────────────────────────────────

function renderDisplay() {
  const grid = document.getElementById('displayGrid');
  grid.innerHTML = '';

  if (!picks.length) {
    grid.innerHTML = `
      <div class="empty-display">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="#cfe0e2" stroke-width="1.5"/>
          <line x1="2" y1="20" x2="38" y2="20" stroke="#cfe0e2" stroke-width="1.5"/>
          <circle cx="20" cy="20" r="5" stroke="#cfe0e2" stroke-width="1.5" fill="#090f10"/>
        </svg>
        <span>${t('stream_empty_display_1', 'Select a team and')}</span>
        <span>${t('stream_empty_display_2', 'click a Pokémon')}</span>
      </div>
    `;
    return;
  }

  picks.forEach(({ file, team }, index) => {
    const poke = POKEMON_DATA.find(p => p.file === file);
    if (!poke) return;

    const slot = document.createElement('div');
    slot.className     = `display-slot${team ? ' team-' + team : ''}`;
    slot.dataset.index = index;
    slot.innerHTML     = `
      <img src="${IMG_BASE}${file}" alt="${poke.name}" onerror="this.onerror=null;this.src='./assets/pokemon/${file}';">
      <div class="team-ring"></div>
      <div class="remove-btn" title="Remove">×</div>
    `;

    slot.addEventListener('click', e => {
      if (!e.target.classList.contains('remove-btn')) openColorPicker(file, e);
    });
    slot.querySelector('.remove-btn').addEventListener('click', e => removePick(file, e));
    _bindPointerDrag(slot, index);
    grid.appendChild(slot);
  });
}

// ─── Render: bans display (left panel) ───────────────────────────────────────

function renderBanDisplay() {
  const purpleBans = bans.filter(b => b.team === 'purple');
  const orangeBans = bans.filter(b => b.team === 'orange');

  ['purple', 'orange'].forEach(team => {
    const teamBans = team === 'purple' ? purpleBans : orangeBans;
    const row      = document.getElementById(`banSlots_${team}`);
    if (!row) return;
    row.innerHTML = '';

    for (let i = 0; i < 3; i++) {
      const banEntry    = teamBans[i];
      const banGlobalIdx = banEntry ? bans.indexOf(banEntry) : -1;
      const isNextSlot  = !banEntry && teamBans.length === i && getNextBanTeam() === team && bans.length < 6;

      const slot = document.createElement('div');
      slot.className = `ban-display-slot ${team}-slot${!banEntry ? ' empty-slot' : ''}${isNextSlot ? ' next-ban' : ''}`;

      if (banEntry) {
        slot.innerHTML = banEntry.file
          ? `<img class="ban-poke-img" src="${IMG_BASE}${banEntry.file}" alt="" onerror="this.style.opacity='0'">
             <img class="ban-missing-img" src="${MISSING_IMG}" alt="banned">
             <div class="remove-btn" title="Remove">×</div>`
          : `<img class="ban-missing-img" src="${MISSING_IMG}" alt="banned" style="opacity:0.5">
             <div class="remove-btn" title="Remove">×</div>`;

        slot.querySelector('.remove-btn')?.addEventListener('click', e => {
          e.stopPropagation();
          removeBan(banGlobalIdx);
        });
      }
      row.appendChild(slot);
    }
  });
}

// ─── Render: Pokémon list (right panel) ──────────────────────────────────────

function renderList() {
  const grid   = document.getElementById('pokemonGrid');
  const search = document.getElementById('searchInput').value.toLowerCase();

  const filtered = POKEMON_DATA
    .filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search) || p.name_fr.toLowerCase().includes(search);
      return matchSearch && (roleFilter === 'any' || p.role === roleFilter);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  document.getElementById('countBadge').textContent = filtered.length;
  grid.innerHTML = '';

  // Empty ban card shown at the top of the list in bans tab
  if (activeTab === 'bans' && bans.length < 6) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'pokemon-card ban-empty-card';
    emptyCard.title     = t('stream_ban_empty_title', 'Add an empty ban (no Pokémon shown)');
    emptyCard.innerHTML = `
      <div class="ban-empty-card-inner">
        <img src="${MISSING_IMG}" alt="" style="width:60%;height:60%;object-fit:contain;opacity:0.5;">
        <div class="ban-empty-card-label">+ ${t('stream_ban_empty_label', 'Empty ban')}</div>
      </div>
    `;
    emptyCard.addEventListener('click', addEmptyBan);
    grid.appendChild(emptyCard);
  }

  filtered.forEach(poke => {
    const inDisplay = picks.some(p => p.file === poke.file);
    const banEntry  = bans.find(b => b.file === poke.file);

    const card = document.createElement('div');

    if (activeTab === 'fearless') {
      card.className = `pokemon-card${inDisplay ? ' in-display' : ''}`;
    } else {
      card.className = banEntry
        ? `pokemon-card ${banEntry.team ? `banned-${banEntry.team}-colored` : 'banned-neutral-colored'}`
        : `pokemon-card${inDisplay ? ' in-picks-ban-mode' : ''}`;
    }

    card.innerHTML = `
      <div class="role-dot ${poke.role}"></div>
      <img src="${IMG_BASE}${poke.file}" alt="${poke.name}" onerror="this.onerror=null;this.src='./assets/pokemon/${poke.file}';">
      <div class="card-name">${poke.name}</div>
      ${activeTab === 'bans' && banEntry ? `<div class="banned-overlay"><img src="${MISSING_IMG}" alt="banned"></div>` : ''}
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

// ─── OBS overlay windows ──────────────────────────────────────────────────────

function openOverlay() {
  window.open(`${location.pathname}?overlay=true`, '_blank', 'width=750,height=220,resizable=yes,scrollbars=no');
  showToast(t('stream_toast_overlay_picks', 'Overlay open — add as Browser Source in OBS'));
}

function openBansOverlay() {
  window.open(`${location.pathname}?overlay=bans`, '_blank', 'width=600,height=200,resizable=yes,scrollbars=no');
  showToast(t('stream_toast_overlay_bans', 'Bans overlay open — add as Browser Source in OBS'));
}

function openMapsOverlay() {
  window.open(`${location.pathname}?overlay=maps`, '_blank', 'width=380,height=120,resizable=yes,scrollbars=no');
  showToast(t('stream_toast_overlay_maps', 'Map overlay open — add as Browser Source in OBS'));
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal()  { document.getElementById('modal-overlay').classList.add('open'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
function onModalOverlayClick(e) { if (e.target === document.getElementById('modal-overlay')) closeModal(); }

// ─── Overlay: picks (?overlay=true) ──────────────────────────────────────────

function initPicksOverlay() {
  document.body.classList.add('overlay-mode');
  document.body.style.background = 'transparent';

  const picksRow = document.createElement('div');
  picksRow.id = 'overlay-picks-row';

  const root = document.createElement('div');
  root.id = 'overlay-root';
  root.appendChild(picksRow);
  document.body.appendChild(root);

  function getCust() {
    try { return JSON.parse(localStorage.getItem('unite_cust_settings')) ?? {}; } catch { return {}; }
  }

  function render(picksData) {
    const c = getCust();
    const grayVal   = (100 - (c.fearlessGray   ?? 35)) / 100;
    const brightVal = (c.fearlessBright ?? 65) / 100;
    const pickSize  = c.pickSize  ?? 80;
    const glowMul   = (c.glowPct  ?? 100) / 100;

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

  // Poll localStorage to sync with the controller window
  let lastRaw = null, lastCust = null;
  setInterval(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY);
      const cust = localStorage.getItem('unite_cust_settings');
      if (raw !== lastRaw || cust !== lastCust) {
        lastRaw = raw; lastCust = cust;
        render(raw ? JSON.parse(raw) : []);
      }
    } catch {}
  }, 300);

  render([]);
}

// ─── Overlay: bans (?overlay=bans) ────────────────────────────────────────────

function initBansOverlay() {
  document.body.classList.add('overlay-mode');
  document.body.style.background = 'transparent';

  const root = document.createElement('div');
  root.id = 'bans-overlay-root';
  document.body.appendChild(root);

  function getCust() {
    try { return JSON.parse(localStorage.getItem('unite_cust_settings')) ?? {}; } catch { return {}; }
  }

  function render(bansData) {
    const c = getCust();
    const grayVal   = (100 - (c.bansGray   ?? 40)) / 100;
    const brightVal = (c.bansBright ?? 60) / 100;
    const glowMul   = (c.glowPct   ?? 100) / 100;

    root.innerHTML = '';

    ['purple', 'orange'].forEach(team => {
      const teamBans = (bansData || []).filter(b => b.team === team);
      if (!teamBans.length) return;

      const row = document.createElement('div');
      row.className = 'bans-overlay-row';

      const label = document.createElement('div');
      label.className   = `bans-overlay-team-label ${team}`;
      label.textContent = team === 'purple' ? 'PURPLE' : 'ORANGE';
      row.appendChild(label);

      const slotsWrap = document.createElement('div');
      slotsWrap.className = 'bans-overlay-slots';

      teamBans.forEach(ban => {
        const slot = document.createElement('div');
        slot.className = `bans-overlay-slot ${team} filled`;

        if (ban.file) {
          const img = document.createElement('img');
          img.className = 'slot-poke-img';
          img.src       = IMG_BASE + ban.file;
          img.style.filter = `grayscale(${grayVal}) brightness(${brightVal})`;
          img.onerror = function() { this.style.display = 'none'; };
          slot.appendChild(img);
        }

        const missingImg = document.createElement('img');
        missingImg.className = 'slot-missing-img';
        missingImg.src = MISSING_IMG;
        slot.appendChild(missingImg);

        const isPurple = team === 'purple';
        slot.style.borderColor = isPurple ? 'var(--violet)' : 'var(--orange)';
        slot.style.background  = isPurple ? 'rgba(159,83,236,0.18)' : 'rgba(255,157,0,0.14)';
        slot.style.boxShadow   = isPurple
          ? `0 0 ${Math.round(12*glowMul)}px rgba(159,83,236,${0.5*glowMul}), inset 0 0 0 1px rgba(239,83,80,0.3)`
          : `0 0 ${Math.round(12*glowMul)}px rgba(255,157,0,${0.5*glowMul}), inset 0 0 0 1px rgba(239,83,80,0.3)`;

        slotsWrap.appendChild(slot);
      });

      row.appendChild(slotsWrap);
      root.appendChild(row);
    });

    root.style.display = bansData?.length ? 'flex' : 'none';
  }

  // Poll localStorage to sync with the controller window
  let lastBans = null, lastCust = null;
  setInterval(() => {
    try {
      const rawBans = localStorage.getItem(LS_BANS_KEY);
      const cust    = localStorage.getItem('unite_cust_settings');
      if (rawBans !== lastBans || cust !== lastCust) {
        lastBans = rawBans; lastCust = cust;
        render(rawBans ? JSON.parse(rawBans) : []);
      }
    } catch {}
  }, 300);

  render([]);
}

// ─── Overlay: map (?overlay=maps) ────────────────────────────────────────────

function initMapsOverlay() {
  document.body.classList.add('overlay-mode');
  document.body.style.background = 'transparent';

  const mapBar = document.createElement('div');
  mapBar.id = 'overlay-map-bar';

  const root = document.createElement('div');
  root.id = 'map-overlay-root';
  root.appendChild(mapBar);
  document.body.appendChild(root);

  function render(mapData) {
    mapBar.innerHTML = '';

    // Active map is placed in the center (index 1)
    const sorted = [...MAPS];
    if (mapData) {
      const idx = sorted.findIndex(m => m.id === mapData);
      if (idx !== -1) sorted.splice(1, 0, sorted.splice(idx, 1)[0]);
    }

    sorted.forEach(m => {
      const isActive = mapData === m.id;
      const item     = document.createElement('div');
      item.className = `overlay-map-item ${m.id}${isActive ? ' active' : ''}`;

      const img = document.createElement('img');
      img.className = 'overlay-map-img';
      img.src = (isActive ? MAP_BASE_GIF : MAP_BASE_SPAWN) + m.id + (isActive ? '.gif' : '.png');
      img.alt = m.label;
      img.onerror = function() {
        if (isActive && this.src.includes('.gif')) {
          this.src = MAP_BASE_SPAWN + m.id + '.png';
        } else {
          this.style.display = 'none';
          const ph = document.createElement('div');
          ph.className   = 'overlay-map-placeholder';
          ph.textContent = m.emoji;
          item.insertBefore(ph, item.firstChild);
        }
      };

      const badge = document.createElement('div');
      badge.className   = 'overlay-map-badge';
      badge.textContent = 'SELECTED';

      const name = document.createElement('div');
      name.className   = 'overlay-map-name';
      name.textContent = m.label.toUpperCase();

      item.append(img, badge, name);
      mapBar.appendChild(item);
    });

    mapBar.style.display = mapData ? 'flex' : 'none';
  }

  // Poll localStorage to sync with the controller window
  let lastMap = null;
  setInterval(() => {
    try {
      const rawMap = localStorage.getItem(LS_MAP_KEY) || '';
      if (rawMap !== lastMap) { lastMap = rawMap; render(rawMap || null); }
    } catch {}
  }, 500);

  render(null);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

// Checks URL param to decide whether to boot an overlay or the main controller
function checkOverlayMode() {
  const param = new URLSearchParams(window.location.search).get('overlay');
  if (param === 'true') { initPicksOverlay(); return true; }
  if (param === 'bans') { initBansOverlay();  return true; }
  if (param === 'maps') { initMapsOverlay();  return true; }
  return false;
}

// ─── Resizable divider ────────────────────────────────────────────────────────

function initResizableDivider() {
  const divider      = document.getElementById('panel-divider');
  const displayPanel = document.getElementById('display-panel');
  if (!divider || !displayPanel) return;

  let isDragging = false, startX = 0, startWidth = 0;

  divider.addEventListener('mousedown', e => {
    isDragging  = true;
    startX      = e.clientX;
    startWidth  = displayPanel.offsetWidth;
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    displayPanel.style.flex  = 'none';
    displayPanel.style.width = Math.max(200, startWidth + (e.clientX - startX)) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

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
  .catch(err => console.error('Failed to load pokemons.json:', err));