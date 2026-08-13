import state from './state.js';
import { loadData } from './dataLoader.js';
import { loadTabs, loadTierList } from './tierlist.js';
import { loadGallery } from './gallery.js';
import { setupDragDrop } from './dragdrop.js';
import { hideMoveModal, hideTierModal, onMoveSave, onTierSave, onTierDelete } from './modals.js';
import { loadFromLocalStorage, saveToLocalStorage, setupAutoSave } from './storage.js';
import { exportTierlistsAsJSON, exportCurrentTierlist, showImportModal, hideImportModal, setupImportModal, copyToClipboard } from './importexport.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();

    // Restore from localStorage AFTER loadData (usage map rebuild needs pokemonData etc.)
    const wasRestored = loadFromLocalStorage();

    // Enable auto-save before any UI call so mutations during init are captured
    setupAutoSave();

    loadTabs();
    loadTierList(state.currentDraft);
    adaptTierHeaders();
    loadGallery('pokemon');
    setupDragDrop();
    setupStaticListeners();
    setupKeyboardShortcuts();
    setupHowToUseModal();
    setupToastContainer();

    if (wasRestored) {
        // showToast is defined by setupToastContainer above, so delay one tick
        setTimeout(() => window.showToast?.('Tierlist restored ✓', 'success'), 50);
    }

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
    document.getElementById('export-all')    ?.addEventListener('click', () => exportTierlistsAsJSON());
    document.getElementById('export-current')?.addEventListener('click', () => exportCurrentTierlist());
    document.getElementById('import-btn')    ?.addEventListener('click', () => showImportModal());
    setupImportModal();
    document.getElementById('copy-current')  ?.addEventListener('click', () => copyToClipboard(state.currentDraft));

    // Delegated listener: the reset button lives inside the tierlist container,
    // which is re-rendered (new DOM node) every time loadTierList() runs
    // (tab switch, add/remove tier, etc). Binding directly via getElementById
    // only attaches to the node that existed at page load, so the listener
    // gets silently lost after the first re-render. Delegating from document
    // keeps it working no matter how many times the button gets recreated.
    document.addEventListener('click', e => {
        if (!e.target.closest('#reset-all-btn')) return;
        if (!confirm('Reset everything? This will delete ALL tierlists and cannot be undone.')) return;
        import('./storage.js').then(m => {
            m.clearLocalStorage();
            window.showToast?.('All data cleared — reloading…', 'info');
            setTimeout(() => location.reload(), 800);
        });
    });

    // Close modals on backdrop click or Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { hideMoveModal(); hideTierModal(); hideImportModal(); closeHowTo(); }
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) { hideMoveModal(); hideTierModal(); hideImportModal(); }
        });
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        switch (e.key) {
            case 'f': case 'F':
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

            case 'p': case 'P': switchCategory('pokemon');      break;
            case 'i': case 'I': switchCategory('items');        break;
            case 'b': case 'B': switchCategory('battle_items'); break;

            case 'm': case 'M':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    import('./actions.js').then(m => m.addTab());
                    window.showToast?.('New tierlist added', 'success');
                }
                break;

            case 'a': case 'A':
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    e.preventDefault();
                    import('./actions.js').then(m => m.addTier(state.currentDraft));
                    window.showToast?.('New tier added', 'success');
                }
                break;

            case 'e': case 'E':
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    e.preventDefault();
                    exportCurrentTierlist();
                }
                break;

            case '?':
                toggleHowTo();
                break;
        }
    });

    // Ctrl+Delete: clear current draft
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            e.preventDefault();
            if (confirm('Clear the current tierlist?')) {
                import('./actions.js').then(m => {
                    m.clearDraft(state.currentDraft);
                    window.showToast?.('Tierlist cleared', 'info');
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

function setupHowToUseModal() {
    const modal = document.getElementById('how-to-use-modal');
    const btn   = document.getElementById('how-to-use-btn');
    const close = document.getElementById('htu-close-btn');
    if (!modal) return;

    modal.addEventListener('click', e => { if (e.target === modal) closeHowTo(); });
    btn?.addEventListener('click', toggleHowTo);
    close?.addEventListener('click', closeHowTo);

    document.addEventListener('keydown', e => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.key === 'h' || e.key === 'H') toggleHowTo();
    });
}

function toggleHowTo() {
    const modal = document.getElementById('how-to-use-modal');
    if (!modal) return;
    const isOpen = modal.classList.toggle('open');
    modal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function closeHowTo() {
    const modal = document.getElementById('how-to-use-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
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