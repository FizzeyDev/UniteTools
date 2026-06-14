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

    const spacer      = document.createElement('div');
    spacer.style.flex = '1';
    modeBar.appendChild(spacer);

    const controls         = document.createElement('div');
    controls.className     = 'mode-controls';
    controls.style.cssText = 'display:flex; gap:6px; align-items:center;';

    const itemModeLabel            = document.createElement('span');
    itemModeLabel.className        = 'mode-label';
    itemModeLabel.textContent      = 'Items:';
    itemModeLabel.style.marginLeft = '8px';
    controls.appendChild(itemModeLabel);

    const itemModeOne            = document.createElement('button');
    itemModeOne.className        = `mode-btn item-mode-btn ${state.itemUsageMode === 'one' ? 'active' : ''}`;
    itemModeOne.dataset.itemMode = 'one';
    itemModeOne.title            = 'Max 1 copy per item';
    itemModeOne.textContent      = '×1';
    controls.appendChild(itemModeOne);

    const itemModeUnlim            = document.createElement('button');
    itemModeUnlim.className        = `mode-btn item-mode-btn ${state.itemUsageMode === 'unlimited' ? 'active' : ''}`;
    itemModeUnlim.dataset.itemMode = 'unlimited';
    itemModeUnlim.title            = 'Unlimited copies per item';
    itemModeUnlim.textContent      = '∞';
    controls.appendChild(itemModeUnlim);

    const sep         = document.createElement('span');
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

    const neverSet = v => v === undefined || v === null;
    const resolvedPassive    = neverSet(item.passive) ? (moveData.passive?.[0]?.name  || null) : (item.passive  || null);
    const resolvedPassiveImg = neverSet(item.passive) ? (moveData.passive?.[0]?.image || null) : (passiveImg    || null);
    const resolvedUnite      = neverSet(item.unite)   ? (moveData.unite?.[0]?.name    || null) : (item.unite    || null);
    const resolvedUniteImg   = neverSet(item.unite)   ? (moveData.unite?.[0]?.image   || null) : (uniteImg      || null);
    const resolvedMove1      = neverSet(item.move1)   ? (moveData.move1?.[0]?.name    || null) : (item.move1    || null);
    const resolvedMove1Img   = neverSet(item.move1)   ? (moveData.move1?.[0]?.image   || null) : (move1Img      || null);
    const resolvedMove2      = neverSet(item.move2)   ? (moveData.move2?.[0]?.name    || null) : (item.move2    || null);
    const resolvedMove2Img   = neverSet(item.move2)   ? (moveData.move2?.[0]?.image   || null) : (move2Img      || null);

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
function setupIntraTierDragDrop(container, draftId) {
    // dragstart: record which item we're dragging and from which index
    container.addEventListener('dragstart', e => {
        const tierItem = e.target.closest('.tier-item');
        if (!tierItem) return;
        const zone = tierItem.closest('.tier-items');
        if (!zone) return;

        const tierIndex = parseInt(zone.dataset.tierIndex);
        const itemIndex = parseInt(tierItem.dataset.itemIndex);
        const uid       = parseInt(tierItem.dataset.uid);
        if (isNaN(tierIndex) || isNaN(itemIndex) || isNaN(uid)) return;

        intraDrag = { tierIndex, fromIndex: itemIndex, uid };
        tierItem.dataset.intraDragActive = '1';
        // Note: don't stopPropagation — dragdrop.js also needs this event
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

        // Same tier → we own this event
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
        const allItems   = [...zone.querySelectorAll('.tier-item')];
        const draggedEl  = allItems.find(el => el.dataset.intraDragActive === '1');
        const otherItems = allItems.filter(el => el !== draggedEl);
        let toIndex      = after ? otherItems.indexOf(after) : otherItems.length;
        if (toIndex < 0) toIndex = otherItems.length;

        const { tierIndex, fromIndex } = intraDrag;
        intraDrag = null;

        if (!draggedEl) return;
        delete draggedEl.dataset.intraDragActive;

        const draft = state.drafts.find(d => d.id === draftId);
        if (!draft) return;
        const tier = draft.tiers[tierIndex];
        if (!tier) return;

        if (fromIndex !== toIndex) {
            // 1. Update state array
            const [moved] = tier.items.splice(fromIndex, 1);
            const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
            tier.items.splice(insertAt, 0, moved);

            // 2. Move the DOM node in-place -- NO loadTierList, so the
            //    browser fires dragend on the still-attached element.
            if (after) {
                zone.insertBefore(draggedEl, after);
            } else {
                zone.appendChild(draggedEl);
            }

            // 3. Re-sync data-item-index
            [...zone.querySelectorAll('.tier-item')].forEach((el, i) => {
                el.dataset.itemIndex = i;
            });
        }
    }, true);
}

function getDragAfterElement(container, x) {
    const items = [...container.querySelectorAll('.tier-item:not([data-intra-drag-active])')];
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