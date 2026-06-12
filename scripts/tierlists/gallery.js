import state from './state.js';
import { getBasePath } from './dataLoader.js';
import { getUsageMap, getMaxUsage } from './usage.js';

export function loadGallery(category) {
    state.currentCategory = category;
    const basePath = getBasePath();
    const gallery = document.getElementById('gallery');
    if (!gallery) return;
    gallery.innerHTML = '';

    const dataMap = {
        pokemon: state.pokemonData,
        items: state.itemData,
        battle_items: state.battleItemData,
    };
    const data = dataMap[category] || [];

    const activeRole = document.querySelector('.filter-btn.active')?.dataset.role;

    // Filter by role and search only (NOT by usage — we show all, just gray the placed ones)
    const filtered = data.filter(item => {
        if (category === 'pokemon' && activeRole && activeRole !== 'unknown' && item.role !== activeRole)
            return false;
        if (state.gallerySearchQuery && !item.name.toLowerCase().includes(state.gallerySearchQuery))
            return false;
        return true;
    });

    if (filtered.length === 0) {
        gallery.innerHTML = `<p class="gallery-empty">Aucun résultat${state.gallerySearchQuery ? ` pour « ${state.gallerySearchQuery} »` : ''}.</p>`;
        return;
    }

    filtered.forEach(item => {
        const usageMap  = getUsageMap(category);
        const usageCount = usageMap.get(item.name) || 0;
        const maxUsage   = getMaxUsage(category);
        const isMaxed    = usageCount >= maxUsage;
        const isPlaced   = usageCount > 0;

        const img = document.createElement('img');
        img.src = `${basePath}assets/${category}/${item.file}`;
        img.alt = item.name;
        img.title = isPlaced
            ? `${item.name} (placed ${usageCount}×${isMaxed ? ' — max' : ''})`
            : item.name;
        img.dataset.name     = item.name;
        img.dataset.category = category;
        img.draggable        = true;
        img.className        = 'gallery-item'
            + (isMaxed  ? ' gallery-item--placed gallery-item--maxed' : '')
            + (!isMaxed && isPlaced ? ' gallery-item--placed-once' : '');

        gallery.appendChild(img);
    });
}