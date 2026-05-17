import state from './state.js';
import { getBasePath, getMovesForPokemon } from './dataLoader.js';
import { recalcUsage } from './usage.js';
import { loadGallery } from './gallery.js';
import { openTierModal, showMoveModal } from './modals.js';
import { addTier, clearDraft, removeItemByUid } from './actions.js';

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
        const btn           = document.createElement('button');
        btn.className       = `tab ${d.id === state.currentDraft ? 'active' : ''}`;
        btn.dataset.tabId   = d.id;
        btn.textContent     = `Tierlist ${d.id}`;
        btn.addEventListener('click', () => switchTab(Number(btn.dataset.tabId)));
        tabList.appendChild(btn);
    });

    const addBtn   = document.createElement('button');
    addBtn.id      = 'add-tab';
    addBtn.textContent = '+ Add';
    addBtn.title   = 'Add a new tierlist (Ctrl+N)';
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
    const draft    = state.drafts.find(d => d.id === draftId);
    if (!draft) return;

    const container   = document.createElement('div');
    container.className = `tierlist-container ${draftId === state.currentDraft ? 'active' : ''}`;
    container.id      = `tierlist-${draftId}`;

    // ── Mode bar ──────────────────────────────────────────────────────────
    const modeBar   = document.createElement('div');
    modeBar.className = 'mode-bar';

    const modeLabel       = document.createElement('span');
    modeLabel.className   = 'mode-label';
    modeLabel.textContent = 'Mode';
    modeBar.appendChild(modeLabel);

    const modeBtns   = document.createElement('div');
    modeBtns.className = 'mode-btns';
    MODES.forEach(({ key, label }, idx) => {
        const btn       = document.createElement('button');
        btn.className   = `mode-btn ${state.tierlistMode === key ? 'active' : ''}`;
        btn.dataset.mode = key;
        btn.title       = `Shortcut: ${idx + 1}`;
        btn.textContent = label;
        modeBtns.appendChild(btn);
    });
    modeBar.appendChild(modeBtns);

    const spacer       = document.createElement('div');
    spacer.style.flex  = '1';
    modeBar.appendChild(spacer);

    const controls   = document.createElement('div');
    controls.className = 'mode-controls';
    controls.style.cssText = 'display:flex; gap:6px; align-items:center;';

    // Item usage mode toggle
    const itemModeLabel       = document.createElement('span');
    itemModeLabel.className   = 'mode-label';
    itemModeLabel.textContent = 'Items:';
    itemModeLabel.style.marginLeft = '8px';
    controls.appendChild(itemModeLabel);

    const itemModeOne   = document.createElement('button');
    itemModeOne.className   = `mode-btn item-mode-btn ${state.itemUsageMode === 'one' ? 'active' : ''}`;
    itemModeOne.dataset.itemMode = 'one';
    itemModeOne.title   = 'Max 1 copy per item';
    itemModeOne.textContent = '×1';
    controls.appendChild(itemModeOne);

    const itemModeUnlim   = document.createElement('button');
    itemModeUnlim.className   = `mode-btn item-mode-btn ${state.itemUsageMode === 'unlimited' ? 'active' : ''}`;
    itemModeUnlim.dataset.itemMode = 'unlimited';
    itemModeUnlim.title   = 'Unlimited copies per item';
    itemModeUnlim.textContent = '∞';
    controls.appendChild(itemModeUnlim);

    const sep = document.createElement('span');
    sep.style.cssText = 'width:1px;height:18px;background:rgba(255,255,255,0.1);margin:0 2px;';
    controls.appendChild(sep);

    controls.innerHTML += `
        <button class="mode-btn" id="add-tier-btn" title="Add a new row">+ Tier</button>
        <button class="mode-btn clear-draft-btn" id="clear-draft-btn" title="Clear all items (Ctrl+Delete)" style="border-color:rgba(239,83,80,0.3); color:#ef5350;">Clear</button>
    `;
    modeBar.appendChild(controls);
    container.appendChild(modeBar);

    // ── Tier rows ─────────────────────────────────────────────────────────
    draft.tiers.forEach((tier, index) => {
        const tierRow       = document.createElement('div');
        tierRow.className   = 'tier-row';
        tierRow.dataset.tierIndex = index;

        // Header — clamp text to fit the fixed-width box
        const header       = document.createElement('div');
        header.className   = 'tier-header';
        header.style.background = tier.color || '#4a90e2';
        header.title       = 'Click to edit tier';
        header.dataset.tierIndex = index;

        const headerSpan       = document.createElement('span');
        headerSpan.className   = 'tier-header__text';
        headerSpan.textContent = tier.name;
        header.appendChild(headerSpan);
        tierRow.appendChild(header);

        const itemsZone       = document.createElement('div');
        itemsZone.className   = 'tier-items';
        itemsZone.dataset.tierIndex = index;

        tier.items.forEach(item => {
            itemsZone.appendChild(createTierItemElement(item, basePath, draftId));
        });
        tierRow.appendChild(itemsZone);

        const actions       = document.createElement('div');
        actions.className   = 'tier-actions';
        const dragHandle    = document.createElement('div');
        dragHandle.className = 'tier-drag-handle';
        dragHandle.title    = 'Drag to reorder tier';
        dragHandle.setAttribute('aria-label', 'Drag to reorder');
        dragHandle.dataset.tierIndex = index;
        dragHandle.draggable = true;
        dragHandle.innerHTML = `<span class="drag-handle-dots">⠿</span>`;
        actions.appendChild(dragHandle);
        tierRow.appendChild(actions);

        container.appendChild(tierRow);
    });

    // ── Remove zone ───────────────────────────────────────────────────────
    const removeZone     = document.createElement('div');
    removeZone.className = 'remove-zone';
    removeZone.id        = 'remove-zone';
    removeZone.innerHTML = '🗑 Drop here to remove';
    container.appendChild(removeZone);

    const wrapper  = document.getElementById('tierlist-wrapper');
    if (!wrapper) return;
    wrapper.querySelectorAll('.tierlist-container').forEach(c => c.classList.remove('active'));
    const existing = document.getElementById(`tierlist-${draftId}`);
    if (existing) existing.replaceWith(container);
    else wrapper.appendChild(container);

    setupTierListeners(draftId);
}

export function createTierItemElement(item, basePath, draftId) {
    if (!basePath) basePath = getBasePath();

    // Ensure every item has a uid (migration for old items without one)
    if (item.uid == null) item.uid = state.nextUid();

    const el         = document.createElement('div');
    el.className     = 'tier-item';
    el.dataset.name  = item.name;
    el.dataset.category = item.category;
    el.dataset.uid   = item.uid;
    el.draggable     = true;
    el.title         = item.name;

    const sprite       = document.createElement('img');
    sprite.src         = `${basePath}assets/${item.category}/${item.file}`;
    sprite.alt         = item.name;
    sprite.className   = 'tier-item__sprite';
    sprite.draggable   = false;
    sprite.onerror     = () => { sprite.style.opacity = '0.3'; };
    el.appendChild(sprite);

    const nameEl       = document.createElement('div');
    nameEl.className   = 'tier-item__name';
    nameEl.textContent = item.name;
    el.appendChild(nameEl);

    // ── Quick-remove button (×) ───────────────────────────────────────────
    if (draftId != null) {
        const removeBtn       = document.createElement('button');
        removeBtn.className   = 'tier-item__remove';
        removeBtn.textContent = '×';
        removeBtn.title       = 'Remove';
        removeBtn.addEventListener('click', e => {
            e.stopPropagation();
            removeItemByUid(draftId, item.uid);
        });
        el.appendChild(removeBtn);
    }

    if (item.category !== 'pokemon') return el;

    const mode    = state.tierlistMode;
    const moveData = getMovesForPokemon(item.name);

    if (mode === 'simple') return el;

    const passiveImg = item.passiveImg || findMoveImg(item.passive, moveData.passive) || null;
    const uniteImg   = item.uniteImg   || findMoveImg(item.unite,   moveData.unite)   || null;
    const move1Img   = item.move1Img   || findMoveImg(item.move1,   moveData.move1);
    const move2Img   = item.move2Img   || findMoveImg(item.move2,   moveData.move2);

    if (mode === 'moves') {
        if (item.move1) el.appendChild(makeBadge(item.move1, move1Img, basePath, 'badge--left',  'badge--move'));
        if (item.move2) el.appendChild(makeBadge(item.move2, move2Img, basePath, 'badge--right', 'badge--move'));
    } else if (mode === 'passive') {
        return makeMoveCard(el, item, item.passive, passiveImg, basePath, 'move-card--passive');
    } else if (mode === 'unite') {
        return makeMoveCard(el, item, item.unite, uniteImg, basePath, 'move-card--unite');
    }

    return el;
}

function findMoveImg(moveName, moves = []) {
    if (!moveName) return null;
    return moves.find(m => m.name === moveName)?.image || null;
}

function makeMoveCard(el, item, moveName, moveImg, basePath, typeClass) {
    el.classList.add('tier-item--move-card', typeClass);
    el.innerHTML = '';

    // Preserve data attributes and draggable
    el.dataset.name     = item.name;
    el.dataset.category = item.category;
    el.dataset.uid      = item.uid;
    el.draggable        = true;

    const avatarWrap   = document.createElement('div');
    avatarWrap.className = 'move-card__avatar';
    const avatarImg    = document.createElement('img');
    avatarImg.src      = `${basePath}assets/${item.category}/${item.file}`;
    avatarImg.alt      = item.name;
    avatarImg.draggable = false;
    avatarImg.onerror  = () => { avatarImg.style.opacity = '0.2'; };
    avatarWrap.appendChild(avatarImg);
    el.appendChild(avatarWrap);

    const moveWrap     = document.createElement('div');
    moveWrap.className = 'move-card__img-wrap';

    if (moveImg) {
        const img      = document.createElement('img');
        // moveImg may be a full relative path like "assets/moves/absol/feint.png"
        img.src        = moveImg.startsWith('assets/') ? `${basePath}${moveImg}` : moveImg;
        img.alt        = moveName || item.name;
        img.className  = 'move-card__img';
        img.draggable  = false;
        const fallback = document.createElement('div');
        fallback.className  = 'move-card__fallback';
        fallback.textContent = (moveName || '?').slice(0, 3).toUpperCase();
        fallback.style.display = 'none';
        img.onerror    = () => { img.style.display = 'none'; fallback.style.display = 'flex'; };
        moveWrap.appendChild(img);
        moveWrap.appendChild(fallback);
    } else {
        const fallback       = document.createElement('div');
        fallback.className   = 'move-card__fallback';
        fallback.textContent = moveName ? moveName.slice(0, 3).toUpperCase() : '?';
        moveWrap.appendChild(fallback);
    }

    el.appendChild(moveWrap);

    const label       = document.createElement('div');
    label.className   = 'move-card__label';
    label.textContent = moveName || '—';
    el.appendChild(label);

    return el;
}

function makeBadge(moveName, moveImg, basePath, posClass, typeClass) {
    const badge   = document.createElement('div');
    badge.className = `move-badge ${posClass} ${typeClass}`;
    badge.title   = moveName || '';

    if (moveImg) {
        const img      = document.createElement('img');
        img.src        = moveImg.startsWith('assets/') ? `${basePath}${moveImg}` : moveImg;
        img.alt        = moveName || '';
        img.className  = 'move-badge__img';
        img.draggable  = false;
        img.onerror    = () => {
            img.style.display = 'none';
            const fb = document.createElement('span');
            fb.className  = 'move-badge__fallback';
            fb.textContent = (moveName || '?').slice(0, 2).toUpperCase();
            badge.appendChild(fb);
        };
        badge.appendChild(img);
    } else {
        const fb       = document.createElement('span');
        fb.className   = 'move-badge__fallback';
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

    // Item usage mode buttons
    container.querySelectorAll('.item-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.itemUsageMode = btn.dataset.itemMode;
            import('./usage.js').then(({ recalcUsage }) => {
                recalcUsage(draftId);
                loadTierList(draftId);
                import('./gallery.js').then(({ loadGallery }) => loadGallery(state.currentCategory));
            });
        });
    });

    // Add / clear
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

    // ── Tier row drag-to-reorder via drag handle ───────────────────────────
    let dragSrcIndex = null;

    container.querySelectorAll('.tier-drag-handle').forEach(handle => {
        const tierRow = handle.closest('.tier-row');
        handle.addEventListener('dragstart', e => {
            dragSrcIndex = parseInt(handle.dataset.tierIndex);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', `tier-reorder:${dragSrcIndex}`);
            e.stopPropagation(); // don't let dragdrop.js interpret this as an item drag
            setTimeout(() => tierRow.classList.add('tier-row--dragging'), 0);
        });
        handle.addEventListener('dragend', () => {
            container.querySelectorAll('.tier-row').forEach(r =>
                r.classList.remove('tier-row--dragging', 'tier-row--drag-over'));
            dragSrcIndex = null;
        });
    });

    container.querySelectorAll('.tier-row').forEach(row => {
        row.addEventListener('dragover', e => {
            if (dragSrcIndex === null) return; // not a reorder drag — don't touch it
            e.preventDefault();
            e.stopPropagation();
            container.querySelectorAll('.tier-row').forEach(r => r.classList.remove('tier-row--drag-over'));
            row.classList.add('tier-row--drag-over');
        });
        row.addEventListener('dragleave', e => {
            if (!row.contains(e.relatedTarget)) row.classList.remove('tier-row--drag-over');
        });
        row.addEventListener('drop', e => {
            if (dragSrcIndex === null) return; // not a reorder drag — let it bubble
            const targetIndex = parseInt(row.dataset.tierIndex);
            if (targetIndex === dragSrcIndex) { dragSrcIndex = null; return; }
            e.preventDefault();
            e.stopPropagation();
            const draft = state.drafts.find(d => d.id === draftId);
            if (draft) {
                const [moved] = draft.tiers.splice(dragSrcIndex, 1);
                draft.tiers.splice(targetIndex, 0, moved);
            }
            dragSrcIndex = null;
            loadTierList(draftId);
        });
    });

    // Double-click tier item to edit moves
    container.addEventListener('dblclick', e => {
        const item = e.target.closest('.tier-item');
        if (!item || item.dataset.category !== 'pokemon') return;
        const uid       = item.dataset.uid ? parseInt(item.dataset.uid) : null;
        const tierIndex = parseInt(item.closest('.tier-row').dataset.tierIndex);
        showMoveModal(item.dataset.name, tierIndex, true, uid);
    });
}