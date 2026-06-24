import state from './state.js';

export function getUsageMap(category) {
    return category === 'pokemon' ? state.pokemonUsage : state.itemUsage;
}

export function getMaxUsage(category) {
    if (category === 'pokemon') return Infinity;
    return Infinity;
}

export function recalcUsage(draftId) {
    // Always rebuild from ALL drafts so switching tabs doesn't zero out
    // items that are placed in other tierlists.
    state.pokemonUsage.clear();
    state.itemUsage.clear();
    state.drafts.forEach(draft => {
        draft.tiers.forEach(tier => {
            tier.items.forEach(item => {
                const map = getUsageMap(item.category);
                map.set(item.name, (map.get(item.name) || 0) + 1);
            });
        });
    });
}