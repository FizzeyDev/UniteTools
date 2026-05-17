import state from './state.js';

export function getUsageMap(category) {
    return category === 'pokemon' ? state.pokemonUsage : state.itemUsage;
}

export function getMaxUsage(category) {
    if (category === 'pokemon') return 4;
    return state.itemUsageMode === 'unlimited' ? Infinity : 1;
}

export function recalcUsage(draftId) {
    state.pokemonUsage.clear();
    state.itemUsage.clear();
    const draft = state.drafts.find(d => d.id === draftId);
    if (!draft) return;
    draft.tiers.forEach(tier => {
        tier.items.forEach(item => {
            const map = getUsageMap(item.category);
            map.set(item.name, (map.get(item.name) || 0) + 1);
        });
    });
}