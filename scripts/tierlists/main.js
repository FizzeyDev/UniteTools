import state from './state.js';
import { loadData } from './dataLoader.js';
import { loadTabs, loadTierList } from './tierlist.js';
import { loadGallery } from './gallery.js';
import { setupDragDrop } from './dragdrop.js';
import { hideMoveModal, hideTierModal, onMoveSave, onTierSave, onTierDelete } from './modals.js';
import { loadFromLocalStorage, saveToLocalStorage, setupAutoSave } from './storage.js';
import { exportTierlistsAsJSON, exportCurrentTierlist, importTierlistsFromJSON, copyToClipboard } from './importexport.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();

    // Load saved tierlists from localStorage (if they exist)
    const hasLoadedData = loadFromLocalStorage();
    if (!hasLoadedData) {
        // Save initial state if no data was loaded
        saveToLocalStorage();
    }

    loadTabs();
    loadTierList(state.currentDraft);
    adaptTierHeaders();
    loadGallery('pokemon');
    setupDragDrop();
    setupStaticListeners();
    setupKeyboardShortcuts();
    setupHowToPanel();
    setupToastContainer();
    
    // Enable auto-save (save on any state change)
    setupAutoSave();

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

    // Import/Export buttons
    document.getElementById('export-all')?.addEventListener('click', () => {
        exportTierlistsAsJSON();
    });

    document.getElementById('export-current')?.addEventListener('click', () => {
        exportCurrentTierlist();
    });

    document.getElementById('import-btn')?.addEventListener('click', () => {
        importTierlistsFromJSON();
    });

    document.getElementById('copy-current')?.addEventListener('click', () => {
        copyToClipboard(state.currentDraft);
    });

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
            case 'm':
            case 'M':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    import('./actions.js').then(m => m.addTab());
                    window.triggerAutoSave?.();
                    window.showToast('New tierlist added', 'success');
                }
                break;

            // Ctrl+Shift+A = add a new tier to current tierlist
            case 'a':
            case 'A':
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    e.preventDefault();
                    import('./actions.js').then(m => m.addTier(state.currentDraft));
                    window.triggerAutoSave?.();
                    window.showToast('New tier added', 'success');
                }
                break;

            // E = export current
            case 'e':
            case 'E':
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    e.preventDefault();
                    exportCurrentTierlist();
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
                    window.triggerAutoSave?.();
                    window.showToast('Tierlist cleared', 'info');
                });
            }
        }
    });
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
            <div class="howto-row"><span class="howto-icon">🖱️</span><span>Drag a Pokémon from the gallery into a tier row</span></div>
            <div class="howto-row"><span class="howto-icon">🎯</span><span>A popup opens to configure Move Combo, Unite Move and Passif</span></div>
            <div class="howto-row"><span class="howto-icon">↔️</span><span>Drag items between tiers to re-order them</span></div>
            <div class="howto-row"><span class="howto-icon">🗑️</span><span>Drop onto the trash zone (bottom) to remove from tier</span></div>
            <div class="howto-row"><span class="howto-icon">✏️</span><span>Click the tier label to edit its name and color</span></div>
            <div class="howto-row"><span class="howto-icon">🖱️🖱️</span><span>Double-click a Pokémon in a tier to edit its moves</span></div>
        </div>

        <div class="howto-divider"></div>

        <div class="howto-section">
            <div class="howto-section-title">Keyboard Shortcuts</div>
            <div class="howto-row"><kbd>Enter</kbd><span>Confirm</span></div>
            <div class="howto-row"><kbd>F</kbd><span>Focus the search bar</span></div>
            <div class="howto-row"><kbd>Esc</kbd><span>Close modals / clear search</span></div>
            <div class="howto-row"><kbd>P</kbd><span>Show Pokémon gallery</span></div>
            <div class="howto-row"><kbd>I</kbd><span>Show Items gallery</span></div>
            <div class="howto-row"><kbd>B</kbd><span>Show Battle Items gallery</span></div>
            <div class="howto-row"><kbd>Ctrl</kbd><kbd>M</kbd><span>Add a new tierlist tab</span></div>
            <div class="howto-row"><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>A</kbd><span>Add a new tier row</span></div>
            <div class="howto-row"><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>E</kbd><span>Export current tierlist</span></div>
            <div class="howto-row"><kbd>Ctrl</kbd><kbd>Del</kbd><span>Clear current tierlist</span></div>
            <div class="howto-row"><kbd>?</kbd><span>Toggle this panel</span></div>
        </div>

        <div class="howto-divider"></div>

        <div class="howto-section">
            <div class="howto-section-title">Move Popup</div>
            <div class="howto-row"><span class="howto-icon">⚔️</span><span><strong>Move Combo</strong> — select moves for slot 1 & 2</span></div>
            <div class="howto-row"><span class="howto-icon">✨</span><span><strong>Unite Move</strong> — select the Unite Move</span></div>
            <div class="howto-row"><span class="howto-icon">🔮</span><span><strong>Passif</strong> — select the passive ability</span></div>
        </div>

        <div class="howto-divider"></div>

        <div class="howto-section">
            <div class="howto-section-title">Import/Export</div>
            <div class="howto-row"><span class="howto-icon">💾</span><span><strong>Auto-save</strong> — Your tierlists are saved automatically</span></div>
            <div class="howto-row"><span class="howto-icon">📥</span><span><strong>Import</strong> — Load tierlists from a JSON file</span></div>
            <div class="howto-row"><span class="howto-icon">📤</span><span><strong>Export</strong> — Download your tierlists as JSON</span></div>
            <div class="howto-row"><span class="howto-icon">📋</span><span><strong>Copy as text</strong> — Share tierlists as formatted text</span></div>
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