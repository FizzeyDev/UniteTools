/* ============================================================
   howto.js — "How to Use" modal of the Interactive Map
   Same look as the Damage Calculator one (.htu-* classes).
   Texts come from lang/*.json (maphtu_* keys); English fallbacks below.
   ============================================================ */
(function () {
  'use strict';

  const FB = {
    "maphtu_btn_title": "How to use",
    "maphtu_menu": "❓ How to use",
    "maphtu_title": "How to Use",
    "maphtu_subtitle": "Pokémon UNITE Interactive Map",
    "maphtu_close": "Close (Esc)",
    "maphtu_tab_overview": "Overview",
    "maphtu_tab_board": "The board",
    "maphtu_tab_steps": "Steps & Player",
    "maphtu_tab_share": "Save & Share",
    "maphtu_tab_keys": "Shortcuts",
    "maphtu_s_what": "What is it for?",
    "maphtu_s_what_1": "Plan a game on the official map: place Pokémon, wild Pokémon and items, draw routes and objectives, then share it.",
    "maphtu_s_what_2": "Made for <strong>coaching, drafts, scrims and tournaments</strong>: show where each player should be, and when.",
    "maphtu_s_what_3": "Nothing to install and no account: everything runs in your browser.",
    "maphtu_s_quick": "Quick start",
    "maphtu_s_quick_1": "<strong>Pick a map</strong> in the top bar (Groudon, Kyogre or Rayquaza).",
    "maphtu_s_quick_2": "<strong>Drag Pokémon</strong> from the left panel onto the map. Choose Purple or Orange before dropping to set the team.",
    "maphtu_s_quick_3": "Click <strong>＋</strong> under the map to add the next step, then move your Pokémon. The previous positions stay visible as ghosts with an arrow.",
    "maphtu_s_quick_4": "Press <strong>▶</strong> to watch the rotation, then <strong>📁 File → Share link</strong> to send it.",
    "maphtu_s_why": "Why steps?",
    "maphtu_s_why_1": "A single screenshot cannot show a rotation. Steps work like <strong>slides of the same map</strong>: \"10:00\", \"7:00\", \"2:00\"…",
    "maphtu_s_why_2": "Ghosts and arrows draw the movement for you: no need to draw every arrow by hand.",
    "maphtu_s_why_3": "The 🌿 camps overlay shows what is on the map at each timer, so you can plan around what can actually be farmed.",
    "maphtu_s_place": "Placing & moving",
    "maphtu_s_place_1": "Use the left panel (<strong>Pokémon, Wilds, Items, Other</strong>) and its search bar and filters. <strong>Drag</strong> an entry onto the map.",
    "maphtu_s_place_2": "<strong>Click</strong> a placed sprite to select it, then drag it to move it.",
    "maphtu_s_place_3": "The right panel changes its <strong>team</strong> (purple, orange, neutral) and <strong>size</strong>, or removes it (<kbd>Delete</kbd>).",
    "maphtu_s_place_4": "<strong>🏷 Names</strong> shows or hides the labels under each sprite.",
    "maphtu_s_draw": "Drawing",
    "maphtu_s_draw_1": "Tools: <strong>Select</strong>, <strong>Freehand</strong> (<kbd>D</kbd>), <strong>Arrow</strong>, <strong>Shapes</strong> (circle, rectangle, triangle, diamond, line) and <strong>Eraser</strong> (<kbd>E</kbd>).",
    "maphtu_s_draw_2": "Pick a <strong>colour</strong> and a <strong>stroke</strong> thickness in the top bar.",
    "maphtu_s_draw_3": "Drawings belong to the <strong>current step</strong>: each step has its own.",
    "maphtu_s_view": "View & 1v1",
    "maphtu_s_view_1": "<strong>Mouse wheel</strong> zooms, <kbd>Space</kbd> + drag pans, <strong>FIT</strong> recentres the map.",
    "maphtu_s_view_2": "<strong>⚔ 1v1</strong>: click it, then pick two Pokémon on the map to open them in the Damage Calculator.",
    "maphtu_s_strip": "The steps strip",
    "maphtu_s_strip_1": "Each card is a step with its own Pokémon, drawings, <strong>timer label</strong> (\"7:00\") and <strong>note</strong>. Click a card to open it.",
    "maphtu_s_strip_2": "<strong>＋</strong> adds a step that keeps your Pokémon (drawings are cleared), <strong>∅</strong> adds an empty one. The timer label goes down one minute automatically.",
    "maphtu_s_strip_3": "On a card: <strong>⧉</strong> duplicates everything, <strong>✕</strong> deletes. <strong>Drag cards</strong> to reorder them.",
    "maphtu_s_player": "Player",
    "maphtu_s_player_1": "<strong>⏮ ◀ ▶ ▶| ⏭</strong> move through the steps. <strong>▶ / ⏸</strong> plays them in order.",
    "maphtu_s_player_2": "Set the <strong>seconds per step</strong>, turn on <strong>🔁 loop</strong> or go <strong>⛶ fullscreen</strong> to present.",
    "maphtu_s_player_3": "Pokémon <strong>glide</strong> from one position to the next and the timer is shown on the map. Touching the board stops the playback.",
    "maphtu_s_aids": "Ghosts, camps & undo",
    "maphtu_s_aids_1": "<strong>👻 Ghosts</strong>: the previous position of each Pokémon is shown faded, with a dashed arrow when it moved. Toggle it off if it gets busy.",
    "maphtu_s_aids_2": "<strong>🌿 Camps</strong>: shows the camps present at the timer of the step (use a label like <em>7:00</em>). Pads are assumed standing and Altaria is not drawn.",
    "maphtu_s_aids_3": "<strong>↩ ↪ Undo / Redo</strong> work for every action, <strong>separately for each step</strong>.",
    "maphtu_s_file": "The File menu",
    "maphtu_s_file_1": "<strong>💾 My plans</strong>: save the plan in your personal library, then open, rename, duplicate or delete it. You can also import or export the whole library.",
    "maphtu_s_file_2": "<strong>🔗 Share link</strong>: copies a link that restores the whole plan (map, steps, Pokémon, drawings, notes). Nothing is uploaded: the plan is inside the link.",
    "maphtu_s_file_3": "<strong>⬆ / ⬇ JSON</strong>: export or import a plan as a file, handy as a backup.",
    "maphtu_s_file_4": "<strong>📷 Image</strong>: downloads the current step as a PNG with its timer label (and the camps if shown).",
    "maphtu_s_good": "Good to know",
    "maphtu_s_good_1": "Your plans are stored <strong>in this browser only</strong>. Clearing the site data erases them: export a JSON now and then.",
    "maphtu_s_good_2": "Changing the map clears the plan (you are asked to confirm first).",
    "maphtu_keys_note": "Shortcuts are disabled when typing in a text field.",
    "maphtu_k_zoom": "Zoom the map",
    "maphtu_k_pan": "Pan the map",
    "maphtu_k_draw": "Freehand tool",
    "maphtu_k_erase": "Eraser tool",
    "maphtu_k_del": "Remove the selected sprite",
    "maphtu_k_esc": "Deselect / close menus",
    "maphtu_k_undo": "Undo (current step)",
    "maphtu_k_redo": "Redo",
    "maphtu_k_steps": "Previous / next step",
    "maphtu_k_play": "Play / pause",
    "maphtu_k_help": "Open this help",
    "maphtu_keys_tip": "💡 ← and → only change step when no text field is focused."
};

  const lang = () => { try { return localStorage.getItem('lang') || 'fr'; } catch (e) { return 'fr'; } };
  function tr(key) {
    const d = window.translations && window.translations[lang()];
    return (d && d[key]) || FB[key] || key;
  }

  const TABS = [
    { id: 'overview', sections: [
      { icon: '🎯', color: '#9f53ec', id: 'what',  n: 3 },
      { icon: '🚀', color: '#4fc3f7', id: 'quick', n: 4 },
      { icon: '💡', color: '#ffd740', id: 'why',   n: 3 },
    ] },
    { id: 'board', sections: [
      { icon: '🎮', color: '#4caf82', id: 'place', n: 4 },
      { icon: '✏️', color: '#ff9d00', id: 'draw',  n: 3 },
      { icon: '🔍', color: '#4fc3f7', id: 'view',  n: 2 },
    ] },
    { id: 'steps', sections: [
      { icon: '🎞️', color: '#9f53ec', id: 'strip',  n: 3 },
      { icon: '▶️', color: '#4caf82', id: 'player', n: 3 },
      { icon: '👻', color: '#4fc3f7', id: 'aids',   n: 3 },
    ] },
    { id: 'share', sections: [
      { icon: '📁', color: '#ff9d00', id: 'file', n: 4 },
      { icon: 'ℹ️', color: '#ffd740', id: 'good', n: 2 },
    ] },
  ];

  const SHORTCUTS = [
    { keys: ['Wheel'],        d: 'zoom' },
    { keys: ['Space', 'Drag'], d: 'pan' },
    { keys: ['D'],            d: 'draw' },
    { keys: ['E'],            d: 'erase' },
    { keys: ['Del'],          d: 'del' },
    { keys: ['Esc'],          d: 'esc' },
    { keys: ['Ctrl', 'Z'],    d: 'undo' },
    { keys: ['Ctrl', 'Y'],    d: 'redo' },
    { keys: ['←', '→'],       d: 'steps' },
    { keys: ['P'],            d: 'play' },
    { keys: ['?'],            d: 'help' },
  ];

  function buildModal() {
    const overlay = document.createElement('div');
    overlay.className = 'htu-overlay';
    overlay.id = 'mapHowToUseModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const tabsBtns = TABS.map((t, i) =>
      `<button class="htu-tab ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${tr('maphtu_tab_' + t.id)}</button>`).join('')
      + `<button class="htu-tab" data-tab="keys">${tr('maphtu_tab_keys')}</button>`;

    const panes = TABS.map((t, i) => `
      <div class="htu-pane ${i === 0 ? 'active' : ''}" id="map-htu-pane-${t.id}">
        ${t.sections.map(s => `
          <div class="htu-section">
            <div class="htu-section-header" style="--sec-color:${s.color}">
              <span class="htu-section-icon">${s.icon}</span>
              <span class="htu-section-title">${tr('maphtu_s_' + s.id)}</span>
            </div>
            <ul class="htu-list">
              ${Array.from({ length: s.n }, (_, k) => `<li>${tr(`maphtu_s_${s.id}_${k + 1}`)}</li>`).join('')}
            </ul>
          </div>`).join('')}
      </div>`).join('');

    const keysPane = `
      <div class="htu-pane" id="map-htu-pane-keys">
        <p class="htu-shortcuts-note">${tr('maphtu_keys_note')}</p>
        <div class="htu-shortcuts-grid">
          ${SHORTCUTS.map(s => `
            <div class="htu-shortcut-row">
              <div class="htu-keys">${s.keys.map(k => `<kbd>${k}</kbd>`).join('<span class="htu-plus">+</span>')}</div>
              <span class="htu-shortcut-desc">${tr('maphtu_k_' + s.d)}</span>
            </div>`).join('')}
        </div>
        <div class="htu-shortcuts-note" style="margin-top:1.2rem;">${tr('maphtu_keys_tip')}</div>
      </div>`;

    overlay.innerHTML = `
      <div class="htu-modal">
        <button class="htu-close" title="${tr('maphtu_close')}" aria-label="${tr('maphtu_close')}">×</button>
        <div class="htu-header">
          <span class="htu-logo">🗺️</span>
          <h2 class="htu-title">${tr('maphtu_title')}</h2>
          <p class="htu-subtitle">${tr('maphtu_subtitle')}</p>
        </div>
        <div class="htu-tabs">${tabsBtns}</div>
        <div class="htu-body">${panes}${keysPane}</div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.dataset.lang = lang();

    overlay.querySelectorAll('.htu-tab').forEach(tab => tab.addEventListener('click', () => {
      overlay.querySelectorAll('.htu-tab').forEach(x => x.classList.remove('active'));
      overlay.querySelectorAll('.htu-pane').forEach(x => x.classList.remove('active'));
      tab.classList.add('active');
      overlay.querySelector('#map-htu-pane-' + tab.dataset.tab).classList.add('active');
      overlay.querySelector('.htu-body').scrollTop = 0;
    }));
    overlay.querySelector('.htu-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    return overlay;
  }

  function open() {
    let o = document.getElementById('mapHowToUseModal');
    if (o && o.dataset.lang !== lang()) { o.remove(); o = null; }   // language changed since last time
    if (!o) o = buildModal();
    o.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    const o = document.getElementById('mapHowToUseModal');
    if (o) o.classList.remove('open');
    document.body.style.overflow = '';
  }
  const isOpen = () => !!document.getElementById('mapHowToUseModal')?.classList.contains('open');

  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('#map-htu-btn, #map-htu-menu-item')) {
      e.preventDefault();
      document.getElementById('file-menu-list') && (document.getElementById('file-menu-list').hidden = true);
      open();
    }
  });

  document.addEventListener('keydown', e => {
    const tag = document.activeElement && document.activeElement.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (document.activeElement && document.activeElement.isContentEditable);
    if (e.key === 'Escape' && isOpen()) { close(); return; }
    if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      isOpen() ? close() : open();
    }
  });

  if (typeof App !== 'undefined') App.openHowToUse = open;
})();