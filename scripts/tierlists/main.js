import state from './state.js';
import { loadData } from './dataLoader.js';
import { loadTabs, loadTierList } from './tierlist.js';
import { loadGallery } from './gallery.js';
import { setupDragDrop } from './dragdrop.js';
import { hideMoveModal, hideTierModal, onMoveSave, onTierSave, onTierDelete } from './modals.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();

    loadTabs();
    loadTierList(state.currentDraft);
    adaptTierHeaders();
    loadGallery('pokemon');
    setupDragDrop();
    setupStaticListeners();
    setupKeyboardShortcuts();
    setupHowToPanel();
    setupToastContainer();

    // Re-run after any DOM mutation that adds tier rows
    new MutationObserver(adaptTierHeaders)
        .observe(document.getElementById('tierlist-wrapper') || document.body,
                 { childList: true, subtree: true });
});

function setupStaticListeners() {
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const cat = tab.dataset.category;
            const filtersEl = document.querySelector('.pokemon-filters');
            if (filtersEl) filtersEl.style.display = cat === 'pokemon' ? 'flex' : 'none';
            loadGallery(cat);
        });
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadGallery('pokemon');
        });
    });

    const searchInput = document.getElementById('gallery-search');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            state.gallerySearchQuery = e.target.value.trim().toLowerCase();
            loadGallery(state.currentCategory);
        });
    }

    document.getElementById('move-save')  ?.addEventListener('click', onMoveSave);
    document.getElementById('move-cancel')?.addEventListener('click', hideMoveModal);

    document.getElementById('tier-save')  ?.addEventListener('click', onTierSave);
    document.getElementById('tier-delete')?.addEventListener('click', onTierDelete);
    document.getElementById('tier-cancel')?.addEventListener('click', hideTierModal);

    // Close modals on backdrop click or Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { hideMoveModal(); hideTierModal(); }
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) { hideMoveModal(); hideTierModal(); }
        });
    });
}

function setupKeyboardShortcuts() {
    const MODES = ['simple', 'moves', 'passive', 'unite'];

    document.addEventListener('keydown', e => {
        // Don't fire shortcuts when typing in inputs
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        switch (e.key) {
            // F = focus search
            case 'f':
            case 'F':
                e.preventDefault();
                document.getElementById('gallery-search')?.focus();
                break;

            // Escape already handled for modals in static listeners
            // but also clear search
            case 'Escape': {
                const search = document.getElementById('gallery-search');
                if (search && document.activeElement === search) {
                    search.value = '';
                    state.gallerySearchQuery = '';
                    loadGallery(state.currentCategory);
                    search.blur();
                }
                break;
            }

            // 1-4 switch modes
            case '1': switchMode(MODES[0]); break;
            case '2': switchMode(MODES[1]); break;
            case '3': switchMode(MODES[2]); break;
            case '4': switchMode(MODES[3]); break;

            // P = pokemon tab, I = items tab, B = battle items tab
            case 'p':
            case 'P':
                switchCategory('pokemon');
                break;
            case 'i':
            case 'I':
                switchCategory('items');
                break;
            case 'b':
            case 'B':
                switchCategory('battle_items');
                break;

            // N = new tierlist tab
            case 'n':
            case 'N':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    import('./actions.js').then(m => m.addTab());
                    window.showToast('New tierlist added', 'success');
                }
                break;

            // ? = toggle how-to panel
            case '?':
                toggleHowTo();
                break;
        }
    });

    // Ctrl+Z: clear current draft (with confirm)
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            e.preventDefault();
            if (confirm('Clear the current tierlist?')) {
                import('./actions.js').then(m => {
                    m.clearDraft(state.currentDraft);
                    window.showToast('Tierlist cleared', 'info');
                });
            }
        }
    });
}

function switchMode(modeKey) {
    state.tierlistMode = modeKey;
    loadTierList(state.currentDraft);
    window.showToast(`Mode: ${modeKey}`, 'info');
}

function switchCategory(cat) {
    document.querySelectorAll('.category-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.category === cat);
    });
    const filtersEl = document.querySelector('.pokemon-filters');
    if (filtersEl) filtersEl.style.display = cat === 'pokemon' ? 'flex' : 'none';
    loadGallery(cat);
}

function setupHowToPanel() {
    // Add toggle button
    const btn = document.createElement('button');
    btn.className = 'howto-toggle';
    btn.title = 'How to use (?)';
    btn.innerHTML = '?';
    btn.addEventListener('click', toggleHowTo);
    document.body.appendChild(btn);

    // Add panel
    const panel = document.createElement('div');
    panel.className = 'howto-panel';
    panel.id = 'howto-panel';
    panel.innerHTML = `
        <h4>📖 How to Use</h4>

        <div class="howto-section">
            <div class="howto-section-title">Basics</div>
            <div class="howto-row"><span class="howto-icon">🖱️</span><span>Drag a Pokémon or item from the gallery into a tier row</span></div>
            <div class="howto-row"><span class="howto-icon">↔️</span><span>Drag items between tiers to re-order them</span></div>
            <div class="howto-row"><span class="howto-icon">🗑️</span><span>Drop onto the trash zone (bottom) to remove from tier</span></div>
            <div class="howto-row"><span class="howto-icon">✏️</span><span>Click the tier label to edit its name and color</span></div>
            <div class="howto-row"><span class="howto-icon">🖱️🖱️</span><span>Double-click a Pokémon in a tier to edit its moves</span></div>
        </div>

        <div class="howto-divider"></div>

        <div class="howto-section">
            <div class="howto-section-title">Keyboard Shortcuts</div>
            <div class="howto-row"><kbd>F</kbd><span>Focus the search bar</span></div>
            <div class="howto-row"><kbd>Esc</kbd><span>Close modals / clear search</span></div>
            <div class="howto-row"><kbd>1</kbd><span>Switch to Simple mode</span></div>
            <div class="howto-row"><kbd>2</kbd><span>Switch to Move Combo mode</span></div>
            <div class="howto-row"><kbd>3</kbd><span>Switch to Passive mode</span></div>
            <div class="howto-row"><kbd>4</kbd><span>Switch to Unite Move mode</span></div>
            <div class="howto-row"><kbd>P</kbd><span>Show Pokémon gallery</span></div>
            <div class="howto-row"><kbd>I</kbd><span>Show Items gallery</span></div>
            <div class="howto-row"><kbd>B</kbd><span>Show Battle Items gallery</span></div>
            <div class="howto-row"><kbd>Ctrl</kbd><kbd>N</kbd><span>Add a new tierlist tab</span></div>
            <div class="howto-row"><kbd>Ctrl</kbd><kbd>Del</kbd><span>Clear current tierlist</span></div>
            <div class="howto-row"><kbd>?</kbd><span>Toggle this panel</span></div>
        </div>

        <div class="howto-divider"></div>

        <div class="howto-section">
            <div class="howto-section-title">Modes</div>
            <div class="howto-row"><span class="howto-icon">🏷️</span><span><strong>Simple</strong> — just the Pokémon, no move info</span></div>
            <div class="howto-row"><span class="howto-icon">⚔️</span><span><strong>Move Combo</strong> — show selected move slots 1 & 2</span></div>
            <div class="howto-row"><span class="howto-icon">🔮</span><span><strong>Passive</strong> — show the passive ability</span></div>
            <div class="howto-row"><span class="howto-icon">✨</span><span><strong>Unite Move</strong> — show the Unite Move</span></div>
        </div>
    `;
    document.body.appendChild(panel);

    // Close on outside click
    document.addEventListener('click', e => {
        if (!e.target.closest('#howto-panel') && !e.target.closest('.howto-toggle')) {
            panel.classList.remove('open');
        }
    });
}

function toggleHowTo() {
    const panel = document.getElementById('howto-panel');
    if (panel) panel.classList.toggle('open');
}

function adaptTierHeaders() {
    document.querySelectorAll('.tier-header__text').forEach(span => {
        const len = (span.textContent || '').length;
        span.classList.toggle('tier-header__text--long',  len >  4 && len <= 8);
        span.classList.toggle('tier-header__text--xlong', len >  8);
    });
}

function setupToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toast-container';
    document.body.appendChild(container);

    window.showToast = function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        const icons = { success: '✓', error: '✕', info: 'ℹ' };
        toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };
}