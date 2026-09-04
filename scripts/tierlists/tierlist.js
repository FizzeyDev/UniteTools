import state from './state.js';
import { getBasePath, getMovesForPokemon } from './dataLoader.js';
import { recalcUsage } from './usage.js';
import { loadGallery } from './gallery.js';
import { openTierModal, showMoveModal } from './modals.js';
import { addTier, clearDraft, removeItemByUid, duplicateTier, duplicateDraft, renameDraft } from './actions.js';


// ─── Intra-tier item reorder state ───────────────────────────────────────────
let intraDrag = null; // { tierIndex, fromIndex, uid }

export function loadTabs() {
    const tabList = document.querySelector('.tab-list');
    if (!tabList) return;
    tabList.innerHTML = '';

    state.drafts.forEach(d => {
        const btn         = document.createElement('div');
        btn.className     = `tab ${d.id === state.currentDraft ? 'active' : ''}`;
        btn.dataset.tabId = d.id;
        btn.role          = 'button';
        btn.tabIndex      = 0;

        const labelSpan       = document.createElement('span');
        labelSpan.className   = 'tab-label';
        labelSpan.textContent = d.label || `Tierlist ${d.id}`;
        btn.appendChild(labelSpan);

        const actionsWrap     = document.createElement('span');
        actionsWrap.className = 'tab-actions';

        const renameBtn       = document.createElement('button');
        renameBtn.className   = 'tab-btn tab-btn--rename';
        renameBtn.title       = 'Rename';
        renameBtn.textContent = '\u270e';
        renameBtn.addEventListener('click', e => {
            e.stopPropagation();
            startInlineRename(btn, labelSpan, d.id);
        });
        actionsWrap.appendChild(renameBtn);

        const dupBtn       = document.createElement('button');
        dupBtn.className   = 'tab-btn tab-btn--dup';
        dupBtn.title       = 'Duplicate tierlist';
        dupBtn.textContent = '\u29c9';
        dupBtn.addEventListener('click', e => {
            e.stopPropagation();
            duplicateDraft(d.id);
            window.showToast?.('Tierlist duplicated', 'success');
        });
        actionsWrap.appendChild(dupBtn);

        if (state.drafts.length > 1) {
            const delBtn       = document.createElement('button');
            delBtn.className   = 'tab-btn tab-btn--del';
            delBtn.title       = 'Delete tierlist';
            delBtn.textContent = '\u00d7';
            delBtn.addEventListener('click', e => {
                e.stopPropagation();
                if (!confirm(`Delete "${d.label || `Tierlist ${d.id}`}"?`)) return;
                deleteDraft(d.id);
            });
            actionsWrap.appendChild(delBtn);
        }

        btn.appendChild(actionsWrap);

        btn.addEventListener('click', () => switchTab(Number(btn.dataset.tabId)));
        btn.addEventListener('dblclick', e => {
            e.preventDefault();
            e.stopPropagation();
            startInlineRename(btn, labelSpan, d.id);
        });
        btn.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') switchTab(Number(btn.dataset.tabId));
        });

        tabList.appendChild(btn);
    });

    const addBtn       = document.createElement('button');
    addBtn.id          = 'add-tab';
    addBtn.textContent = '+ Add';
    addBtn.title       = 'Add a new tierlist (Ctrl+N)';
    addBtn.addEventListener('click', () => import('./actions.js').then(m => m.addTab()));
    tabList.appendChild(addBtn);
}

function startInlineRename(btn, labelSpan, draftId) {
    if (btn.querySelector('.tab-rename-input')) return;
    const input       = document.createElement('input');
    input.className   = 'tab-rename-input';
    input.value       = labelSpan.textContent;
    input.style.width = Math.max(80, labelSpan.offsetWidth + 16) + 'px';
    labelSpan.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
        renameDraft(draftId, input.value.trim() || labelSpan.textContent);
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', ev => {
        ev.stopPropagation();
        if (ev.key === 'Enter')  { input.blur(); }
        if (ev.key === 'Escape') { loadTabs(); }
    });
}

function deleteDraft(draftId) {
    const idx = state.drafts.findIndex(d => d.id === draftId);
    if (idx === -1) return;
    state.drafts.splice(idx, 1);
    if (state.currentDraft === draftId) {
        const next = state.drafts[Math.min(idx, state.drafts.length - 1)];
        if (next) {
            state.currentDraft = next.id;
            recalcUsage(next.id);
            loadTierList(next.id);
        }
    }
    loadTabs();
    loadGallery(state.currentCategory);
    window.triggerAutoSave?.();
    window.showToast?.('Tierlist deleted', 'info');
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

    const container     = document.createElement('div');
    container.className = `tierlist-container ${draftId === state.currentDraft ? 'active' : ''}`;
    container.id        = `tierlist-${draftId}`;

    // ── Controls bar ──────────────────────────────────────────────────────
    const modeBar     = document.createElement('div');
    modeBar.className = 'mode-bar';

    const addTierBtn       = document.createElement('button');
    addTierBtn.className   = 'mode-bar__action-btn mode-bar__action-btn--add';
    addTierBtn.id          = 'add-tier-btn';
    addTierBtn.title       = 'Add a new tier row';
    addTierBtn.innerHTML   = '<span>＋</span> Add Tier';
    modeBar.appendChild(addTierBtn);

    const spacer      = document.createElement('div');
    spacer.style.flex = '1';
    modeBar.appendChild(spacer);

    const movesToggleBtn     = document.createElement('button');
    movesToggleBtn.type      = 'button';
    movesToggleBtn.className = `ctrl-btn ctrl-btn--moves-toggle${state.askMovesOnAdd ? ' is-active' : ''}`;
    movesToggleBtn.id        = 'moves-toggle-btn';
    movesToggleBtn.title     = 'When enabled, placing a Pokémon opens a popup to choose its moves. Disable to place it instantly with default moves.';
    movesToggleBtn.setAttribute('aria-pressed', state.askMovesOnAdd ? 'true' : 'false');
    movesToggleBtn.innerHTML = '<span class="ctrl-icon">⚔️</span><span class="ctrl-label">Ask Moves</span>';
    modeBar.appendChild(movesToggleBtn);

    const clearBtn       = document.createElement('button');
    clearBtn.className   = 'mode-bar__action-btn mode-bar__action-btn--clear';
    clearBtn.id          = 'clear-draft-btn';
    clearBtn.title       = 'Clear all items (Ctrl+Delete)';
    clearBtn.innerHTML   = '<span>✕</span> Clear';
    modeBar.appendChild(clearBtn);

    const resetBtn       = document.createElement('button');
    resetBtn.className   = 'mode-bar__action-btn mode-bar__action-btn--reset';
    resetBtn.id          = 'reset-all-btn';
    resetBtn.title       = 'Reset everything to factory defaults';
    resetBtn.innerHTML   = '<span>🗑️</span> Reset All';

    modeBar.appendChild(resetBtn);

    container.appendChild(modeBar);

    // ── Tier rows ─────────────────────────────────────────────────────────
    draft.tiers.forEach((tier, index) => {
        const tierRow             = document.createElement('div');
        tierRow.className         = 'tier-row';
        tierRow.dataset.tierIndex = index;

        const header                 = document.createElement('div');
        header.className             = 'tier-header';
        header.style.background      = tier.color || '#4a90e2';
        header.title                 = 'Click to edit tier';
        header.dataset.tierIndex     = index;

        const headerSpan             = document.createElement('span');
        headerSpan.className         = 'tier-header__text';
        headerSpan.textContent       = tier.name;
        header.appendChild(headerSpan);
        tierRow.appendChild(header);

        const itemsZone              = document.createElement('div');
        itemsZone.className          = 'tier-items';
        itemsZone.dataset.tierIndex  = index;

        tier.items.forEach((item, itemIndex) => {
            const el = createTierItemElement(item, basePath, draftId);
            el.dataset.itemIndex = itemIndex;
            itemsZone.appendChild(el);
        });
        tierRow.appendChild(itemsZone);

        const actions        = document.createElement('div');
        actions.className    = 'tier-actions';

        const dragHandle             = document.createElement('div');
        dragHandle.className         = 'tier-drag-handle';
        dragHandle.title             = 'Drag to reorder tier';
        dragHandle.setAttribute('aria-label', 'Drag to reorder');
        dragHandle.dataset.tierIndex = index;
        dragHandle.draggable         = true;
        dragHandle.innerHTML         = `<span class="drag-handle-dots">⠿</span>`;
        actions.appendChild(dragHandle);

        const dupTierBtn       = document.createElement('button');
        dupTierBtn.className   = 'tier-dup-btn';
        dupTierBtn.title       = 'Duplicate tier (empty)';
        dupTierBtn.textContent = '⧉';
        dupTierBtn.addEventListener('click', () => {
            duplicateTier(draftId, index);
            window.showToast?.(`Tier "${tier.name}" duplicated`, 'success');
        });
        actions.appendChild(dupTierBtn);

        tierRow.appendChild(actions);
        container.appendChild(tierRow);
    });

    // ── Remove zone ───────────────────────────────────────────────────────
    const removeZone     = document.createElement('div');
    removeZone.className = 'remove-zone';
    removeZone.id        = 'remove-zone';
    removeZone.innerHTML = '🗑 Drop here to remove';
    container.appendChild(removeZone);

    const wrapper = document.getElementById('tierlist-wrapper');
    if (!wrapper) return;
    wrapper.querySelectorAll('.tierlist-container').forEach(c => c.classList.remove('active'));
    const existing = document.getElementById(`tierlist-${draftId}`);
    if (existing) existing.replaceWith(container);
    else wrapper.appendChild(container);

    setupTierListeners(draftId);
    setupIntraTierDragDrop(container, draftId);
}

export function createTierItemElement(item, basePath, draftId) {
    if (!basePath) basePath = getBasePath();
    if (item.uid == null) item.uid = state.nextUid();

    const el            = document.createElement('div');
    el.className        = 'tier-item';
    el.dataset.name     = item.name;
    el.dataset.category = item.category;
    el.dataset.uid      = item.uid;
    el.draggable        = true;
    el.title            = item.name;

    const sprite        = document.createElement('img');
    sprite.src          = `${basePath}assets/${item.category}/${item.file}`;
    sprite.alt          = item.name;
    sprite.className    = 'tier-item__sprite';
    sprite.draggable    = false;
    sprite.onerror      = () => { sprite.style.opacity = '0.3'; };
    el.appendChild(sprite);

    const nameEl        = document.createElement('div');
    nameEl.className    = 'tier-item__name';
    nameEl.textContent  = item.name;
    el.appendChild(nameEl);

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

    const moveData = getMovesForPokemon(item.name);

    const passiveImg = item.passiveImg || findMoveImg(item.passive, moveData.passive) || null;
    const uniteImg   = item.uniteImg   || findMoveImg(item.unite,   moveData.unite)   || null;
    const move1Img   = item.move1Img   || findMoveImg(item.move1,   moveData.move1);
    const move2Img   = item.move2Img   || findMoveImg(item.move2,   moveData.move2);

    // neverSet: true only when the field was never explicitly configured by the user.
    // An empty string '' means "user chose No move" — do NOT auto-fill in that case.
    // We use a sentinel key '_configured' saved alongside move fields to detect this.
    const neverSet = v => v === undefined || v === null;
    const wasConfigured = item._configured === true;

    // If the item has been through the move modal (wasConfigured) or any move field is
    // explicitly an empty string, treat every field as intentionally set.
    const hasExplicitEmpty = item.move1 === '' || item.move2 === '' ||
                             item.passive === '' || item.unite === '';
    const autoFill = !wasConfigured && !hasExplicitEmpty;

    const resolvedPassive    = (autoFill && neverSet(item.passive)) ? (moveData.passive?.[0]?.name  || null) : (item.passive  || null);
    const resolvedPassiveImg = (autoFill && neverSet(item.passive)) ? (moveData.passive?.[0]?.image || null) : (passiveImg    || null);
    const resolvedUnite      = (autoFill && neverSet(item.unite))   ? (moveData.unite?.[0]?.name    || null) : (item.unite    || null);
    const resolvedUniteImg   = (autoFill && neverSet(item.unite))   ? (moveData.unite?.[0]?.image   || null) : (uniteImg      || null);
    const resolvedMove1      = (autoFill && neverSet(item.move1))   ? (moveData.move1?.[0]?.name    || null) : (item.move1    || null);
    const resolvedMove1Img   = (autoFill && neverSet(item.move1))   ? (moveData.move1?.[0]?.image   || null) : (move1Img      || null);
    const resolvedMove2      = (autoFill && neverSet(item.move2))   ? (moveData.move2?.[0]?.name    || null) : (item.move2    || null);
    const resolvedMove2Img   = (autoFill && neverSet(item.move2))   ? (moveData.move2?.[0]?.image   || null) : (move2Img      || null);

    const hasPassive = resolvedPassive !== null;
    const hasUnite   = resolvedUnite   !== null;
    const hasMove1   = resolvedMove1   !== null;
    const hasMove2   = resolvedMove2   !== null;

    // If no move data at all, return simple card
    if (!hasPassive && !hasUnite && !hasMove1 && !hasMove2) return el;

    // Wrap in a group
    const group = document.createElement('div');
    group.className        = 'tier-item-group';
    group.dataset.uid      = item.uid;
    group.dataset.name     = item.name;
    group.dataset.category = item.category;
    group.draggable        = true;

    // Move combo card (sprite + badges) only if moves are set
    if (hasMove1 || hasMove2) {
        if (hasMove1) el.appendChild(makeBadge(resolvedMove1, resolvedMove1Img, basePath, 'badge--left',  'badge--move'));
        if (hasMove2) el.appendChild(makeBadge(resolvedMove2, resolvedMove2Img, basePath, 'badge--right', 'badge--move'));
        group.appendChild(el);
    } else if (!hasPassive && !hasUnite) {
        // No moves at all, just the sprite
        group.appendChild(el);
    }

    if (hasPassive) group.appendChild(buildMoveCard(item, resolvedPassive, resolvedPassiveImg, basePath, draftId, 'move-card--passive'));
    if (hasUnite)   group.appendChild(buildMoveCard(item, resolvedUnite,   resolvedUniteImg,   basePath, draftId, 'move-card--unite'));

    return group;
}

/**
 * Build a standalone move card (passive or unite) linked to the same item uid.
 * Clicking the remove button on any card removes the whole item.
 */
function buildMoveCard(item, moveName, moveImg, basePath, draftId, typeClass) {
    const card = document.createElement('div');
    card.className = `tier-item tier-item--move-card ${typeClass}`;
    card.dataset.name     = item.name;
    card.dataset.category = item.category;
    card.dataset.uid      = item.uid;
    card.draggable        = true;

    const avatarWrap     = document.createElement('div');
    avatarWrap.className = 'move-card__avatar';
    const avatarImg      = document.createElement('img');
    avatarImg.src        = `${basePath}assets/${item.category}/${item.file}`;
    avatarImg.alt        = item.name;
    avatarImg.draggable  = false;
    avatarImg.onerror    = () => { avatarImg.style.opacity = '0.2'; };
    avatarWrap.appendChild(avatarImg);
    card.appendChild(avatarWrap);

    const moveWrap     = document.createElement('div');
    moveWrap.className = 'move-card__img-wrap';

    if (moveImg) {
        const img      = document.createElement('img');
        img.src        = moveImg.startsWith('assets/') ? `${basePath}${moveImg}` : moveImg;
        img.alt        = moveName || item.name;
        img.className  = 'move-card__img';
        img.draggable  = false;
        const fallback = document.createElement('div');
        fallback.className   = 'move-card__fallback';
        fallback.textContent = moveName ? moveName.slice(0, 3).toUpperCase() : '—';
        fallback.style.display = 'none';
        img.onerror    = () => { img.style.display = 'none'; fallback.style.display = 'flex'; };
        moveWrap.appendChild(img);
        moveWrap.appendChild(fallback);
    } else {
        const fallback       = document.createElement('div');
        fallback.className   = 'move-card__fallback';
        fallback.textContent = moveName ? moveName.slice(0, 3).toUpperCase() : '—';
        moveWrap.appendChild(fallback);
    }
    card.appendChild(moveWrap);

    const label       = document.createElement('div');
    label.className   = 'move-card__label';
    label.textContent = moveName || '—';
    card.appendChild(label);

    if (draftId != null) {
        const removeBtn       = document.createElement('button');
        removeBtn.className   = 'tier-item__remove';
        removeBtn.textContent = '×';
        removeBtn.title       = 'Remove';
        removeBtn.addEventListener('click', e => {
            e.stopPropagation();
            removeItemByUid(draftId, item.uid);
        });
        card.appendChild(removeBtn);
    }

    return card;
}


function findMoveImg(moveName, moves = []) {
    if (!moveName) return null;
    return moves.find(m => m.name === moveName)?.image || null;
}


function makeBadge(moveName, moveImg, basePath, posClass, typeClass) {
    const badge     = document.createElement('div');
    badge.className = `move-badge ${posClass} ${typeClass}`;
    badge.title     = moveName || 'No move';

    if (moveImg && moveName) {
        const img     = document.createElement('img');
        img.src       = moveImg.startsWith('assets/') ? `${basePath}${moveImg}` : moveImg;
        img.alt       = moveName;
        img.className = 'move-badge__img';
        img.draggable = false;
        img.onerror   = () => {
            img.style.display = 'none';
            const fb          = document.createElement('span');
            fb.className      = 'move-badge__fallback';
            fb.textContent    = moveName.slice(0, 2).toUpperCase();
            badge.appendChild(fb);
        };
        badge.appendChild(img);
    } else {
        const fb          = document.createElement('span');
        fb.className      = 'move-badge__fallback move-badge__fallback--empty';
        fb.textContent    = moveName ? moveName.slice(0, 2).toUpperCase() : '—';
        badge.appendChild(fb);
    }

    return badge;
}

// ─── Intra-tier item drag & drop (reorder within a tier) ─────────────────────

/** Returns the direct draggable unit inside a .tier-items zone for a given element.
 *  That unit is either a .tier-item-group or a .tier-item (when no group wraps it). */
function getDragUnit(el) {
    // Walk up until we find a .tier-item-group or a .tier-item whose parent is .tier-items
    let cur = el;
    while (cur) {
        if (cur.classList?.contains('tier-item-group')) return cur;
        if (cur.classList?.contains('tier-item') && cur.parentElement?.classList?.contains('tier-items')) return cur;
        cur = cur.parentElement;
    }
    return null;
}

function setupIntraTierDragDrop(container, draftId) {
    container.addEventListener('dragstart', e => {
        const unit = getDragUnit(e.target);
        if (!unit) return;
        const zone = unit.closest('.tier-items');
        if (!zone) return;

        const tierIndex = parseInt(zone.dataset.tierIndex);
        const itemIndex = parseInt(unit.dataset.itemIndex);
        const uid       = parseInt(unit.dataset.uid);
        if (isNaN(tierIndex) || isNaN(itemIndex) || isNaN(uid)) return;

        intraDrag = { tierIndex, fromIndex: itemIndex, uid };
        unit.dataset.intraDragActive = '1';
    }, true);

    container.addEventListener('dragend', () => {
        intraDrag = null;
        container.querySelectorAll('[data-intra-drag-active]').forEach(el => delete el.dataset.intraDragActive);
        container.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    });

    container.addEventListener('dragover', e => {
        if (!intraDrag) return;
        const zone = e.target.closest('.tier-items');
        if (!zone) return;
        if (parseInt(zone.dataset.tierIndex) !== intraDrag.tierIndex) return;

        e.preventDefault();
        e.stopPropagation();

        let indicator = zone.querySelector('.drop-indicator');
        if (!indicator) {
            indicator           = document.createElement('div');
            indicator.className = 'drop-indicator';
        }

        const after = getDragAfterElement(zone, e.clientX);
        if (after) zone.insertBefore(indicator, after);
        else zone.appendChild(indicator);
    }, true);

    container.addEventListener('drop', e => {
        if (!intraDrag) return;
        const zone = e.target.closest('.tier-items')
                  ?? e.target.closest('.drop-indicator')?.closest('.tier-items');
        if (!zone) return;
        if (parseInt(zone.dataset.tierIndex) !== intraDrag.tierIndex) return;

        e.preventDefault();
        e.stopPropagation();

        zone.querySelectorAll('.drop-indicator').forEach(el => el.remove());

        const after      = getDragAfterElement(zone, e.clientX);
        // Direct children that are drag units (groups or solo tier-items)
        const allUnits   = [...zone.children].filter(el => el.classList.contains('tier-item-group') || el.classList.contains('tier-item'));
        const draggedEl  = allUnits.find(el => el.dataset.intraDragActive === '1');
        const otherUnits = allUnits.filter(el => el !== draggedEl);
        let toIndex      = after ? otherUnits.indexOf(after) : otherUnits.length;
        if (toIndex < 0) toIndex = otherUnits.length;

        const { tierIndex, fromIndex } = intraDrag;
        intraDrag = null;

        if (!draggedEl) return;
        delete draggedEl.dataset.intraDragActive;

        const draft = state.drafts.find(d => d.id === draftId);
        if (!draft) return;
        const tier = draft.tiers[tierIndex];
        if (!tier) return;

        if (fromIndex !== toIndex) {
            const [moved] = tier.items.splice(fromIndex, 1);
            const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
            tier.items.splice(insertAt, 0, moved);

            if (after) zone.insertBefore(draggedEl, after);
            else zone.appendChild(draggedEl);

            // Re-sync data-item-index on all direct units
            [...zone.children]
                .filter(el => el.classList.contains('tier-item-group') || el.classList.contains('tier-item'))
                .forEach((el, i) => { el.dataset.itemIndex = i; });

            window.triggerAutoSave?.();
        }
    }, true);
}

function getDragAfterElement(container, x) {
    // Direct children units only (groups or solo items)
    const items = [...container.children].filter(el =>
        (el.classList.contains('tier-item-group') || el.classList.contains('tier-item'))
        && !el.dataset.intraDragActive
    );
    return items.reduce((closest, child) => {
        const box    = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ─── Existing tier listeners ──────────────────────────────────────────────────
function setupTierListeners(draftId) {
    const container = document.getElementById(`tierlist-${draftId}`);
    if (!container) return;

    container.querySelector('#add-tier-btn')   ?.addEventListener('click', () => addTier(draftId));
    container.querySelector('#clear-draft-btn')?.addEventListener('click', () => {
        if (confirm('Clear all items from this tierlist?')) {
            clearDraft(draftId);
            window.showToast?.('Tierlist cleared', 'info');
        }
    });

    container.querySelectorAll('.tier-header').forEach(header => {
        header.addEventListener('click', () => openTierModal(draftId, parseInt(header.dataset.tierIndex)));
    });

    let dragSrcIndex = null;

    container.querySelectorAll('.tier-drag-handle').forEach(handle => {
        const tierRow = handle.closest('.tier-row');
        handle.addEventListener('dragstart', e => {
            dragSrcIndex = parseInt(handle.dataset.tierIndex);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', `tier-reorder:${dragSrcIndex}`);
            e.stopPropagation();
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
            if (dragSrcIndex === null) return;
            e.preventDefault();
            e.stopPropagation();
            container.querySelectorAll('.tier-row').forEach(r => r.classList.remove('tier-row--drag-over'));
            row.classList.add('tier-row--drag-over');
        });
        row.addEventListener('dragleave', e => {
            if (!row.contains(e.relatedTarget)) row.classList.remove('tier-row--drag-over');
        });
        row.addEventListener('drop', e => {
            if (dragSrcIndex === null) return;
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
            window.triggerAutoSave?.();
        });
    });

    container.addEventListener('dblclick', e => {
        const item = e.target.closest('.tier-item');
        if (!item || item.dataset.category !== 'pokemon') return;
        const uid       = item.dataset.uid ? parseInt(item.dataset.uid) : null;
        const tierIndex = parseInt(item.closest('.tier-row').dataset.tierIndex);
        showMoveModal(item.dataset.name, tierIndex, true, uid);
    });
}