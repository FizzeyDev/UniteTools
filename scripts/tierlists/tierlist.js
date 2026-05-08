import state from './state.js';
import { getBasePath, getPokeDetail } from './dataLoader.js';
import { recalcUsage } from './usage.js';
import { loadGallery } from './gallery.js';
import { openTierModal } from './modals.js';
import { addTier, clearDraft } from './actions.js';

const MODES = [
    { key: 'simple',  label: 'Simple'     },
    { key: 'moves',   label: 'Move Combo' },
    { key: 'passive', label: 'Passif'     },
    { key: 'unite',   label: 'Unite Move' },
];

export function loadTabs() {
    const tabList = document.querySelector('.tab-list');
    if (!tabList) return;
    tabList.innerHTML = '';

    state.drafts.forEach(d => {
        const btn = document.createElement('button');
        btn.className = `tab ${d.id === state.currentDraft ? 'active' : ''}`;
        btn.dataset.tabId = d.id;
        btn.textContent = `Tierlist ${d.id}`;
        btn.addEventListener('click', () => switchTab(Number(btn.dataset.tabId)));
        tabList.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.id = 'add-tab';
    addBtn.textContent = '+ Add';
    addBtn.title = 'Add a new tierlist (Ctrl+N)';
    addBtn.addEventListener('click', () => import('./actions.js').then(m => m.addTab()));
    tabList.appendChild(addBtn);
}

export function switchTab(tabId) {
    state.currentDraft = tabId;
    recalcUsage(tabId);
    loadTabs();
    loadTierList(tabId);
    loadGallery(state.currentCategory);
}

export function loadTierList(draftId) {
    const basePath = getBasePath();
    const draft = state.drafts.find(d => d.id === draftId);
    if (!draft) return;

    const container = document.createElement('div');
    container.className = `tierlist-container ${draftId === state.currentDraft ? 'active' : ''}`;
    container.id = `tierlist-${draftId}`;

    // Mode bar
    const modeBar = document.createElement('div');
    modeBar.className = 'mode-bar';
    const modeLabel = document.createElement('span');
    modeLabel.className = 'mode-label';
    modeLabel.textContent = 'Mode';
    modeBar.appendChild(modeLabel);

    const modeBtns = document.createElement('div');
    modeBtns.className = 'mode-btns';
    MODES.forEach(({ key, label }, idx) => {
        const btn = document.createElement('button');
        btn.className = `mode-btn ${state.tierlistMode === key ? 'active' : ''}`;
        btn.dataset.mode = key;
        btn.title = `Shortcut: ${idx + 1}`;
        btn.textContent = label;
        modeBtns.appendChild(btn);
    });
    modeBar.appendChild(modeBtns);

    // Spacer so controls sit at the right of the mode bar
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    modeBar.appendChild(spacer);

    const controls = document.createElement('div');
    controls.className = 'mode-controls';
    controls.style.cssText = 'display:flex; gap:6px; align-items:center;';
    controls.innerHTML = `
        <button class="mode-btn" id="add-tier-btn" title="Add a new row">+ Tier</button>
        <button class="mode-btn clear-draft-btn" id="clear-draft-btn" title="Clear all items (Ctrl+Delete)" style="border-color:rgba(239,83,80,0.3); color:#ef5350;">Clear</button>
    `;
    modeBar.appendChild(controls);
    container.appendChild(modeBar);

    // Tier rows
    draft.tiers.forEach((tier, index) => {
        const tierRow = document.createElement('div');
        tierRow.className = 'tier-row';
        tierRow.dataset.tierIndex = index;

        const header = document.createElement('div');
        header.className = 'tier-header';
        header.style.background = tier.color || '#4a90e2';
        header.textContent = tier.name;
        header.title = 'Click to edit tier';
        header.dataset.tierIndex = index;
        tierRow.appendChild(header);

        const itemsZone = document.createElement('div');
        itemsZone.className = 'tier-items';
        itemsZone.dataset.tierIndex = index;
        tier.items.forEach(item => itemsZone.appendChild(createTierItemElement(item, basePath)));
        tierRow.appendChild(itemsZone);

        const actions = document.createElement('div');
        actions.className = 'tier-actions';
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'settings-tier';
        settingsBtn.setAttribute('aria-label', 'Edit tier');
        settingsBtn.dataset.tierIndex = index;
        settingsBtn.title = 'Edit tier name and color';
        const settingsImg = document.createElement('img');
        settingsImg.src = `${basePath}assets/icons/settings.png`;
        settingsImg.alt = '⚙';
        settingsImg.onerror = () => { settingsImg.outerHTML = '⚙'; };
        settingsBtn.appendChild(settingsImg);
        actions.appendChild(settingsBtn);
        tierRow.appendChild(actions);

        container.appendChild(tierRow);
    });

    // Remove zone
    const removeZone = document.createElement('div');
    removeZone.className = 'remove-zone';
    removeZone.id = 'remove-zone';
    removeZone.innerHTML = '🗑 Drop here to remove';
    container.appendChild(removeZone);

    const wrapper = document.getElementById('tierlist-wrapper');
    if (!wrapper) return;
    const existing = document.getElementById(`tierlist-${draftId}`);
    if (existing) existing.replaceWith(container);
    else wrapper.appendChild(container);

    setupTierListeners(draftId);
}

export function createTierItemElement(item, basePath) {
    if (!basePath) basePath = getBasePath();

    const el = document.createElement('div');
    el.className = 'tier-item';
    el.dataset.name = item.name;
    el.dataset.category = item.category;
    el.draggable = true;
    el.title = item.name;

    const sprite = document.createElement('img');
    sprite.src = `${basePath}assets/${item.category}/${item.file}`;
    sprite.alt = item.name;
    sprite.className = 'tier-item__sprite';
    sprite.draggable = false;
    sprite.onerror = () => { sprite.style.opacity = '0.3'; };
    el.appendChild(sprite);

    const nameEl = document.createElement('div');
    nameEl.className = 'tier-item__name';
    nameEl.textContent = item.name;
    el.appendChild(nameEl);

    if (item.category !== 'pokemon') return el;

    const mode = state.tierlistMode;
    const detail = getPokeDetail(item.name);

    if (mode === 'simple') return el;

    const passiveImg  = resolvePassiveImg(item, detail);
    const uniteImg    = resolveUniteImg(item, detail);
    const move1Img    = item.move1Img  || resolveStandardMoveImg(item.move1,  detail);
    const move2Img    = item.move2Img  || resolveStandardMoveImg(item.move2,  detail);

    if (mode === 'moves') {
        if (item.move1) el.appendChild(makeBadge(item.move1, move1Img, basePath, 'badge--left',   'badge--move'));
        if (item.move2) el.appendChild(makeBadge(item.move2, move2Img, basePath, 'badge--right',  'badge--move'));

    } else if (mode === 'passive') {
        // Large card: show move image only (no pokémon sprite)
        return makeMoveCard(el, item, item.passive, passiveImg, basePath, 'move-card--passive');

    } else if (mode === 'unite') {
        // Large card: show move image only (no pokémon sprite)
        return makeMoveCard(el, item, item.unite, uniteImg, basePath, 'move-card--unite');
    }

    return el;
}

/**
 * Transforms the tier-item element into a large move card.
 * The pokémon sprite is hidden; the move image fills the card instead.
 * A small pokémon avatar is shown as a corner indicator.
 */
function makeMoveCard(el, item, moveName, moveImg, basePath, typeClass) {
    el.classList.add('tier-item--move-card', typeClass);

    // Remove the default sprite & name that were already appended
    el.innerHTML = '';

    // Small pokémon avatar (corner)
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'move-card__avatar';
    const avatarImg = document.createElement('img');
    avatarImg.src = `${basePath}assets/${item.category}/${item.file}`;
    avatarImg.alt = item.name;
    avatarImg.draggable = false;
    avatarImg.onerror = () => { avatarImg.style.opacity = '0.2'; };
    avatarWrap.appendChild(avatarImg);
    el.appendChild(avatarWrap);

    // Large move image
    const moveWrap = document.createElement('div');
    moveWrap.className = 'move-card__img-wrap';

    if (moveImg) {
        const img = document.createElement('img');
        img.src = moveImg.startsWith('assets/') ? `${basePath}${moveImg}` : moveImg;
        img.alt = moveName || item.name;
        img.className = 'move-card__img';
        img.draggable = false;
        img.onerror = () => {
            img.style.display = 'none';
            fallback.style.display = 'flex';
        };
        const fallback = document.createElement('div');
        fallback.className = 'move-card__fallback';
        fallback.textContent = (moveName || '?').slice(0, 3).toUpperCase();
        fallback.style.display = 'none';
        moveWrap.appendChild(img);
        moveWrap.appendChild(fallback);
    } else {
        // No image available — show text initials
        const fallback = document.createElement('div');
        fallback.className = 'move-card__fallback';
        fallback.textContent = moveName ? moveName.slice(0, 3).toUpperCase() : '?';
        moveWrap.appendChild(fallback);
    }

    el.appendChild(moveWrap);

    // Move name label
    const label = document.createElement('div');
    label.className = 'move-card__label';
    label.textContent = moveName || '—';
    el.appendChild(label);

    return el;
}

function resolvePassiveImg(item, detail) {
    if (item.passiveImg) return item.passiveImg;
    if (!detail) return null;
    if (detail.passive?.image) return detail.passive.image;
    const m = detail.moves?.find(m => m.name.includes('(Passive)') || m.name.toLowerCase().includes('passive'));
    return m?.image || null;
}

function resolveUniteImg(item, detail) {
    if (item.uniteImg) return item.uniteImg;
    if (!detail) return null;
    const m = detail.moves?.find(m => m.name.includes('(Unite)') || m.name.toLowerCase().includes('unite'));
    return m?.image || null;
}

function resolveStandardMoveImg(moveName, detail) {
    if (!moveName || !detail) return null;
    const m = detail.moves?.find(m => m.name === moveName);
    return m?.image || null;
}

function makeBadge(moveName, moveImg, basePath, posClass, typeClass) {
    const badge = document.createElement('div');
    badge.className = `move-badge ${posClass} ${typeClass}`;
    badge.title = moveName || '';

    if (moveImg) {
        const img = document.createElement('img');
        img.src = moveImg.startsWith('assets/') ? `${basePath}${moveImg}` : moveImg;
        img.alt = moveName || '';
        img.className = 'move-badge__img';
        img.draggable = false;
        img.onerror = () => {
            img.style.display = 'none';
            const fb = document.createElement('span');
            fb.className = 'move-badge__fallback';
            fb.textContent = (moveName || '?').slice(0, 2).toUpperCase();
            badge.appendChild(fb);
        };
        badge.appendChild(img);
    } else {
        const fb = document.createElement('span');
        fb.className = 'move-badge__fallback';
        fb.textContent = (moveName || '?').slice(0, 2).toUpperCase();
        badge.appendChild(fb);
    }

    return badge;
}

function setupTierListeners(draftId) {
    const container = document.getElementById(`tierlist-${draftId}`);
    if (!container) return;

    // Mode buttons
    container.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.tierlistMode = btn.dataset.mode;
            loadTierList(draftId);
        });
    });

    // Add / clear tier
    container.querySelector('#add-tier-btn')   ?.addEventListener('click', () => addTier(draftId));
    container.querySelector('#clear-draft-btn')?.addEventListener('click', () => {
        if (confirm('Clear all items from this tierlist?')) {
            clearDraft(draftId);
            window.showToast?.('Tierlist cleared', 'info');
        }
    });

    // Click tier header → open edit modal
    container.querySelectorAll('.tier-header').forEach(header => {
        header.addEventListener('click', () => openTierModal(draftId, parseInt(header.dataset.tierIndex)));
    });

    // Settings button (gear icon) — also opens edit modal
    container.querySelectorAll('.settings-tier').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            openTierModal(draftId, parseInt(btn.dataset.tierIndex));
        });
    });

    // Double-click tier item to edit moves
    container.addEventListener('dblclick', e => {
        const item = e.target.closest('.tier-item');
        if (!item || item.dataset.category !== 'pokemon') return;
        const tierIndex = parseInt(item.closest('.tier-row').dataset.tierIndex);
        import('./modals.js').then(m => m.showMoveModal(item.dataset.name, tierIndex, true));
    });
}