/**
 * buff-visuals.js
 *
 * Upgrades the plain "Universal Buffs/Debuffs" checkbox labels into
 * small cards with the source Pokémon's portrait + color-coded values.
 */

function baseKey(id) {
  const m = id.match(/^[a-z]+/);
  return m ? m[0] : '';
}

// Non-Pokémon sources (items, etc.) mapped directly to an image + display name.
const STATIC_ICONS = {
  xattack: { image: 'assets/battle_items/x_attack.png', displayName: 'X-Attack' },
};

const PORTRAIT_RULES = [
  { test: id => /^mewtwoX/i.test(id), keywords: ['mewtwo', 'x'] },
  { test: id => /^mewtwoY/i.test(id), keywords: ['mewtwo', 'y'] },
  { test: id => id.startsWith('alolanRaichu'), keywords: ['raichu'], prefer: 'alola' },
  { test: id => id.startsWith('ninetails'), keywords: ['ninetal'], prefer: 'alola' },
  { test: id => baseKey(id) === 'mime', keywords: ['mime'] },
  { test: id => baseKey(id) === 'alcreamie', keywords: ['alcremie'] },
  { test: id => baseKey(id) === 'hooh', keywords: ['ho-oh'] },
];

function findPortrait(id, allPokemon) {
  const key = baseKey(id);
  if (STATIC_ICONS[key]) return STATIC_ICONS[key];

  if (!allPokemon || !allPokemon.length) return null;

  for (const rule of PORTRAIT_RULES) {
    if (rule.test(id)) {
      if (!rule.keywords) return null;
      const matches = allPokemon.filter(p =>
        rule.keywords.every(k => (p.displayName || '').toLowerCase().includes(k))
      );
      if (!matches.length) return null;
      if (rule.prefer) {
        const preferred = matches.find(p => p.displayName.toLowerCase().includes(rule.prefer));
        if (preferred) return preferred;
      }
      return matches[0];
    }
  }

  if (!key) return null;
  const found = allPokemon.find(p => (p.displayName || '').toLowerCase().replace(/[^a-z]/g, '').includes(key));
  return found || null;
}

function colorizeNumbers(text) {
  return text.replace(/([+\-]\d+(?:\.\d+)?%?)/g, (match) => {
    const cls = match.startsWith('-') ? 'is-negative' : 'is-positive';
    return `<span class="buff-num ${cls}">${match}</span>`;
  });
}

export function enhanceBuffLabels(allPokemon) {
  const labels = document.querySelectorAll('.buff-label');

  labels.forEach(label => {
    const checkbox = label.querySelector('input[type="checkbox"]');
    if (!checkbox) return;
    if (label.dataset.enhanced === 'true') return;

    const rawText = label.textContent.trim().replace(/\s+/g, ' ');

    const parenIndex = rawText.indexOf('(');
    let title = rawText;
    let effect = '';
    if (parenIndex !== -1) {
      title = rawText.slice(0, parenIndex).trim();
      effect = rawText.slice(parenIndex).trim();
    }

    const portrait = findPortrait(checkbox.id, allPokemon);

    let iconHtml;
    if (portrait && portrait.image) {
      iconHtml = `<img class="buff-icon" src="${portrait.image}" alt="${portrait.displayName || ''}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'buff-icon-fallback',textContent:'❔'}))">`;
    } else {
      iconHtml = `<div class="buff-icon-fallback">⭐</div>`;
    }

    const textHtml = `
      <div class="buff-text">
        <span class="buff-title">${title}</span>
        ${effect ? `<span class="buff-effect">${colorizeNumbers(effect)}</span>` : ''}
      </div>`;

    label.innerHTML = '';
    label.insertAdjacentHTML('beforeend', iconHtml);
    label.insertAdjacentHTML('beforeend', textHtml);
    label.appendChild(checkbox);

    label.dataset.enhanced = 'true';
  });
}