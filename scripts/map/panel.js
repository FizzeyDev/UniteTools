/* ============================================================
   panel.js — Entity panel rendering, search, filters
   ============================================================ */

(function() {
  /* ── Panel render ── */
  function getData() {
    if (App.currentCat === 'pokemon')  return POKEMON;
    if (App.currentCat === 'neutrals') return NEUTRALS;
    if (App.currentCat === 'items')    return ITEMS;
    if (App.currentCat === 'other')    return OTHER;
    return [];
  }

  function renderPanel() {
    const data = getData();
    const q = App.searchQ.toLowerCase();
    let filtered = data.filter(d => d.name.toLowerCase().includes(q));

    // Pokémon role filter
    if (App.currentCat === 'pokemon' && App.currentRole !== 'all-roles') {
      filtered = filtered.filter(d => d.role === App.currentRole);
    }

    // Items type filter
    if (App.currentCat === 'items' && App.currentItemType !== 'all') {
      filtered = filtered.filter(d => d.type === App.currentItemType);
    }

    const roleLabels = { atk:'Attackers', def:'Defenders', spe:'Speedsters', sup:'Supporters', all:'All-Rounders' };
    const container = document.getElementById('sprite-grid-container');
    container.innerHTML = '';

    if (App.currentCat === 'pokemon' && App.currentRole === 'all-roles') {
      const groups = {};
      filtered.forEach(d => { (groups[d.role] = groups[d.role] || []).push(d); });
      ['atk','def','spe','sup','all'].forEach(role => {
        if (!groups[role]) return;
        const label = document.createElement('div');
        label.className = 'panel-section-label';
        label.textContent = roleLabels[role];
        container.appendChild(label);
        container.appendChild(buildGrid(groups[role]));
      });

    } else if (App.currentCat === 'items' && App.currentItemType === 'all') {
      // Show both sections
      const held   = filtered.filter(d => d.type === 'held');
      const battle = filtered.filter(d => d.type === 'battle');
      if (held.length) {
        const label = document.createElement('div');
        label.className = 'panel-section-label';
        label.textContent = 'Held Items';
        container.appendChild(label);
        container.appendChild(buildGrid(held));
      }
      if (battle.length) {
        const label = document.createElement('div');
        label.className = 'panel-section-label';
        label.textContent = 'Battle Items';
        container.appendChild(label);
        container.appendChild(buildGrid(battle));
      }
      if (!held.length && !battle.length) {
        container.innerHTML = '<div style="color:var(--text-dim);font-size:0.8rem;padding:20px;text-align:center;">No results</div>';
      }

    } else {
      if (filtered.length === 0) {
        container.innerHTML = '<div style="color:var(--text-dim);font-size:0.8rem;padding:20px;text-align:center;">No results</div>';
        return;
      }
      container.appendChild(buildGrid(filtered));
    }
  }

  function buildGrid(items) {
    const grid = document.createElement('div');
    grid.className = 'sprite-grid';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'sprite-item';
      el.dataset.id   = item.id;
      el.dataset.name = item.name;
      el.dataset.img  = item.img;

      const img = document.createElement('img');
      img.src = item.img;
      img.alt = item.name;
      img.onerror = () => { img.src = generatePlaceholderSvg(item.name); };

      const lbl = document.createElement('span');
      lbl.className = 'sprite-label';
      lbl.textContent = item.name;

      el.appendChild(img);
      el.appendChild(lbl);
      grid.appendChild(el);

      el.addEventListener('mousedown', (e) => App.startDragFromPanel(e, item));
    });
    return grid;
  }

  /* ── Search & filters ── */
  document.getElementById('panel-search').addEventListener('input', (e) => {
    App.searchQ = e.target.value;
    renderPanel();
  });

  document.querySelectorAll('.role-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.currentRole = btn.dataset.role;
      renderPanel();
    });
  });

  document.querySelectorAll('.sidebar-cat-btn[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-cat-btn[data-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.currentCat = btn.dataset.cat;
      document.getElementById('role-filters').style.display  = App.currentCat === 'pokemon' ? 'flex' : 'none';
      document.getElementById('item-filters').style.display  = App.currentCat === 'items'   ? 'flex' : 'none';
      renderPanel();
    });
  });

  /* ── Item type filters ── */
  document.querySelectorAll('.item-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.item-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.currentItemType = btn.dataset.itemType;
      renderPanel();
    });
  });

  /* ── Names toggle ── */
  document.getElementById('show-names-btn').addEventListener('click', () => {
    App.showNames = !App.showNames;
    document.querySelectorAll('.sprite-name-badge').forEach(el => {
      el.style.display = App.showNames ? 'block' : 'none';
    });
  });

  /* ── Expose ── */
  App.renderPanel = renderPanel;
  App.generatePlaceholderSvg = generatePlaceholderSvg;

  function generatePlaceholderSvg(name) {
    const letter = name.charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect width="64" height="64" rx="8" fill="#243536"/>
      <text x="32" y="40" font-family="Arial" font-size="24" font-weight="bold"
        fill="#6a8587" text-anchor="middle">${letter}</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }
})();