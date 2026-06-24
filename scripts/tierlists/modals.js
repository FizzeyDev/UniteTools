import state from './state.js';
import { getMovesForPokemon } from './dataLoader.js';
import { loadTierList } from './tierlist.js';
import { loadGallery } from './gallery.js';

export function showMoveModal(pokemonName, tierIndex, isEdit, uid = null) {
    const modal      = document.getElementById('move-modal');
    const optionsDiv = document.getElementById('move-options');
    if (!modal || !optionsDiv) return;

    const title = modal.querySelector('h3');
    if (title) title.textContent = isEdit
        ? `Edit moves : ${pokemonName}`
        : `Choose moves : ${pokemonName}`;

    let placedItem = null;
    if (isEdit) {
        const draft = state.drafts.find(d => d.id === state.currentDraft);
        for (const t of draft?.tiers || []) {
            const found = uid != null
                ? t.items.find(i => i.uid === uid)
                : t.items.find(i => i.name === pokemonName && i.category === 'pokemon');
            if (found) { placedItem = found; break; }
        }
    }

    const moveData = getMovesForPokemon(pokemonName);
    optionsDiv.innerHTML = '';

    const hasNoMoves = !moveData.move1.length && !moveData.move2.length
                    && !moveData.passive?.length && !moveData.unite?.length;

    if (hasNoMoves) {
        optionsDiv.innerHTML = '<p class="modal-note">Aucune donnée de move disponible pour ce Pokémon.</p>';
    } else {
        buildMoveModalBody(optionsDiv, moveData, placedItem);
    }

    modal.dataset.pokemon   = pokemonName;
    modal.dataset.tierIndex = tierIndex;
    modal.dataset.isEdit    = isEdit;
    modal.dataset.uid       = uid ?? '';
    modal.style.display     = 'flex';

    // Enter key → save (only while this modal is open)
    const onKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onMoveSave();
        }
    };
    document.addEventListener('keydown', onKeyDown);
    // Clean up listener when the modal closes
    modal._removeEnterListener = () => document.removeEventListener('keydown', onKeyDown);
}

function buildMoveModalBody(container, moveData, placedItem) {
    // Always show all 3 sections, each in a collapsible tab
    const sections = [
        {
            key:     'moves',
            label:   '⚔️ Move Combo',
            slots: [
                { label: 'Move Slot 1', moves: moveData.move1,           inputName: 'move1',   currentValue: placedItem?.move1   ?? '', currentImg: placedItem?.move1Img   ?? '' },
                { label: 'Move Slot 2', moves: moveData.move2,           inputName: 'move2',   currentValue: placedItem?.move2   ?? '', currentImg: placedItem?.move2Img   ?? '' },
            ],
        },
        {
            key:     'unite',
            label:   '✨ Unite Move',
            slots: [
                { label: 'Unite Move', moves: moveData.unite || [],      inputName: 'unite',   currentValue: placedItem?.unite   ?? '', currentImg: placedItem?.uniteImg   ?? '' },
            ],
        },
        {
            key:     'passive',
            label:   '🔮 Passif',
            slots: [
                { label: 'Passif',     moves: moveData.passive || [],    inputName: 'passive', currentValue: placedItem?.passive ?? '', currentImg: placedItem?.passiveImg ?? '' },
            ],
        },
    ];

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'move-tabbar';

    const panelsWrap = document.createElement('div');
    panelsWrap.className = 'move-panels';

    sections.forEach(({ key, label, slots }, i) => {
        const tabBtn = document.createElement('button');
        tabBtn.type = 'button';
        tabBtn.className = 'move-tabbar__btn' + (i === 0 ? ' active' : '');
        tabBtn.dataset.tab = key;
        tabBtn.textContent = label;
        tabBar.appendChild(tabBtn);

        const panel = document.createElement('div');
        panel.className = 'move-panel' + (i === 0 ? ' active' : '');
        panel.dataset.tab = key;

        slots.forEach(({ label: slotLabel, moves, inputName, currentValue, currentImg }) => {
            panel.appendChild(buildSlotSection(slotLabel, moves, inputName, currentValue, currentImg));
        });

        panelsWrap.appendChild(panel);
    });

    tabBar.addEventListener('click', e => {
        const btn = e.target.closest('.move-tabbar__btn');
        if (!btn) return;
        const key = btn.dataset.tab;
        tabBar.querySelectorAll('.move-tabbar__btn').forEach(b => b.classList.toggle('active', b === btn));
        panelsWrap.querySelectorAll('.move-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === key));
    });

    container.appendChild(tabBar);
    container.appendChild(panelsWrap);
}

/**
 * Build a slot section with radio buttons for each move.
 * Also adds a "No move" option at the top (selecting it clears the slot).
 * currentImg is passed to pre-check the right radio even after a mode switch.
 */
function buildSlotSection(label, moves, inputName, currentValue, currentImg = '') {
    const section = document.createElement('div');
    section.className = 'move-section';

    const h = document.createElement('h3');
    h.textContent = label;
    section.appendChild(h);

    if (!moves || !moves.length) {
        const note = document.createElement('p');
        note.className = 'modal-note';
        note.textContent = 'Aucun move pour ce slot.';
        section.appendChild(note);
        return section;
    }

    // ── "No move" option ──────────────────────────────────────────────────
    {
        const id      = `${inputName}-none`;
        const checked = currentValue === '' || currentValue === null || currentValue === undefined;
        const wrapper = document.createElement('label');
        wrapper.className = `move-option move-option--none ${checked ? 'selected' : ''}`;
        wrapper.htmlFor   = id;

        const radio   = document.createElement('input');
        radio.type    = 'radio';
        radio.id      = id;
        radio.name    = inputName;
        radio.value   = '';
        radio.checked = checked;

        radio.addEventListener('change', () => {
            section.querySelectorAll('.move-option').forEach(l => l.classList.remove('selected'));
            wrapper.classList.add('selected');
        });

        const span       = document.createElement('span');
        span.className   = 'move-name';
        span.textContent = '— No move —';

        wrapper.appendChild(radio);
        wrapper.appendChild(span);
        section.appendChild(wrapper);
    }

    // ── Move options ──────────────────────────────────────────────────────
    moves.forEach((mv, idx) => {
        const id = `${inputName}-${idx}`;

        // Pre-select by name match; if no currentValue, default to first real move
        let checked;
        if (currentValue) {
            checked = currentValue === mv.name;
        } else {
            checked = false; // "No move" is already checked above when no value
        }

        const wrapper     = document.createElement('label');
        wrapper.className = `move-option ${checked ? 'selected' : ''}`;
        wrapper.htmlFor   = id;

        const radio   = document.createElement('input');
        radio.type    = 'radio';
        radio.id      = id;
        radio.name    = inputName;
        radio.value   = mv.name;
        if (mv.image) radio.dataset.image = mv.image;
        radio.checked = checked;

        radio.addEventListener('change', () => {
            section.querySelectorAll('.move-option').forEach(l => l.classList.remove('selected'));
            wrapper.classList.add('selected');
        });

        if (mv.image) {
            const moveImg     = document.createElement('img');
            moveImg.src       = mv.image;
            moveImg.alt       = mv.name;
            moveImg.className = 'move-option__img';
            moveImg.onerror   = () => { moveImg.style.display = 'none'; };
            wrapper.appendChild(moveImg);
        }

        const span       = document.createElement('span');
        span.className   = 'move-name';
        span.textContent = mv.name;

        wrapper.appendChild(radio);
        wrapper.appendChild(span);
        section.appendChild(wrapper);
    });

    return section;
}

export function hideMoveModal() {
    const modal = document.getElementById('move-modal');
    if (modal) {
        modal.style.display = 'none';
        modal._removeEnterListener?.();
        modal._removeEnterListener = null;
    }
    state.pendingAdd = null;
}

export function onMoveSave() {
    const modal = document.getElementById('move-modal');
    if (!modal) return;

    const pokemonName = modal.dataset.pokemon;
    const tierIndex   = parseInt(modal.dataset.tierIndex);
    const isEdit      = modal.dataset.isEdit === 'true';
    const uidAttr     = modal.dataset.uid;
    const uid         = uidAttr !== '' ? parseInt(uidAttr) : null;
    const optionsDiv  = document.getElementById('move-options');

    const getField = (name) => {
        const el = optionsDiv?.querySelector(`input[name="${name}"]:checked`);
        return { val: el?.value || '', img: el?.dataset.image || '' };
    };

    const m1 = getField('move1');
    const m2 = getField('move2');
    const pa = getField('passive');
    const un = getField('unite');

    const draft = state.drafts.find(d => d.id === state.currentDraft);

    if (isEdit) {
        for (const tier of draft.tiers) {
            const it = uid != null
                ? tier.items.find(i => i.uid === uid)
                : tier.items.find(i => i.name === pokemonName && i.category === 'pokemon');
            if (it) {
                // Always overwrite (even with empty string — user chose "No move")
                it.move1      = m1.val;  it.move1Img   = m1.img;
                it.move2      = m2.val;  it.move2Img   = m2.img;
                it.passive    = pa.val;  it.passiveImg  = pa.img;
                it.unite      = un.val;  it.uniteImg    = un.img;
                it._configured = true; // mark as explicitly configured by the user
                break;
            }
        }
    } else {
        if (!state.pendingAdd || state.pendingAdd.name !== pokemonName) { hideMoveModal(); return; }

        const count = state.pokemonUsage.get(pokemonName) || 0;
        if (count >= 100) { hideMoveModal(); return; }

        state.pokemonUsage.set(pokemonName, count + 1);
        const file = state.pokemonData.find(p => p.name === pokemonName)?.file;
        draft.tiers[tierIndex].items.push({
            uid:        state.nextUid(),
            name:       pokemonName,
            category:   'pokemon',
            file,
            _configured: true, // explicitly set by user via modal
            move1:      m1.val, move1Img:   m1.img,
            move2:      m2.val, move2Img:   m2.img,
            passive:    pa.val, passiveImg: pa.img,
            unite:      un.val, uniteImg:   un.img,
        });
        state.pendingAdd = null;
    }

    hideMoveModal();
    loadTierList(state.currentDraft);
    loadGallery(state.currentCategory);
}

// ─── Tier modal ───────────────────────────────────────────────────────────────

export function openTierModal(draftId, tierIndex) {
    const draft = state.drafts.find(d => d.id === draftId);
    if (!draft) return;

    const tier  = draft.tiers[tierIndex];
    const modal = document.getElementById('tier-modal');
    if (!modal) return;

    document.getElementById('tier-name').value  = tier.name;
    document.getElementById('tier-color').value = tier.color || '#4a90e2';

    // Render color presets + history
    renderColorPresets(modal, draftId, tierIndex);

    modal.dataset.draftId   = draftId;
    modal.dataset.tierIndex = tierIndex;
    modal.style.display     = 'flex';
}

const COLOR_PRESETS = [
    '#e74c3c', '#ff6b9d', '#e91e63', '#9c27b0', '#673ab7',
    '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50',
    '#cddc39', '#ffc107', '#ff5722', '#795548', '#607d8b',
];

function renderColorPresets(modal, draftId, tierIndex) {
    // Remove existing preset row if any
    modal.querySelector('.color-presets-row')?.remove();

    const colorInput = document.getElementById('tier-color');
    const draft = state.drafts.find(d => d.id === draftId);
    const currentColor = draft?.tiers[tierIndex]?.color || '#4a90e2';

    const row = document.createElement('div');
    row.className = 'color-presets-row';

    // Section: presets
    const presetsLabel = document.createElement('div');
    presetsLabel.className = 'color-presets-label';
    presetsLabel.textContent = 'Presets';
    row.appendChild(presetsLabel);

    const presetsWrap = document.createElement('div');
    presetsWrap.className = 'color-swatches';
    COLOR_PRESETS.forEach(color => {
        const swatch = createSwatch(color, colorInput, currentColor);
        presetsWrap.appendChild(swatch);
    });
    row.appendChild(presetsWrap);

    // Section: history
    if (state.colorHistory.length > 0) {
        const histLabel = document.createElement('div');
        histLabel.className = 'color-presets-label';
        histLabel.textContent = 'Recent';
        row.appendChild(histLabel);

        const histWrap = document.createElement('div');
        histWrap.className = 'color-swatches';
        state.colorHistory.forEach(color => {
            const swatch = createSwatch(color, colorInput, currentColor);
            histWrap.appendChild(swatch);
        });
        row.appendChild(histWrap);
    }

    // Insert before modal-actions
    const actions = modal.querySelector('.modal-actions');
    modal.querySelector('.modal-content').insertBefore(row, actions);
}

function createSwatch(color, colorInput, currentColor) {
    const swatch = document.createElement('button');
    swatch.type            = 'button';
    swatch.className       = 'color-swatch' + (color === currentColor ? ' color-swatch--active' : '');
    swatch.style.background = color;
    swatch.title           = color;
    swatch.addEventListener('click', () => {
        colorInput.value = color;
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('color-swatch--active'));
        swatch.classList.add('color-swatch--active');
    });
    return swatch;
}

export function hideTierModal() {
    const modal = document.getElementById('tier-modal');
    if (modal) modal.style.display = 'none';
}

export function onTierSave() {
    const modal = document.getElementById('tier-modal');
    if (!modal) return;
    const draftId   = parseInt(modal.dataset.draftId);
    const tierIndex = parseInt(modal.dataset.tierIndex);
    const draft     = state.drafts.find(d => d.id === draftId);
    if (!draft) return;

    const newColor = document.getElementById('tier-color').value || draft.tiers[tierIndex].color;

    // Save to color history (deduplicate, max 10)
    if (newColor && !state.colorHistory.includes(newColor)) {
        state.colorHistory.unshift(newColor);
        if (state.colorHistory.length > 10) state.colorHistory.pop();
    }

    draft.tiers[tierIndex].name  = document.getElementById('tier-name').value.trim() || `Tier ${tierIndex + 1}`;
    draft.tiers[tierIndex].color = newColor;
    hideTierModal();
    loadTierList(draftId);
}

export function onTierDelete() {
    const modal = document.getElementById('tier-modal');
    if (!modal) return;
    import('./actions.js').then(m => m.deleteTier(parseInt(modal.dataset.draftId), parseInt(modal.dataset.tierIndex)));
    hideTierModal();
}