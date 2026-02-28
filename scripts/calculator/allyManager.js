/**
 * allyManager.js
 * Gère les alliés de l'attaquant (max 4).
 * Chaque allié reçoit les heals & shields affichés sur les move-cards.
 *
 * Exports :
 *  - initAllyManager()           : initialise les boutons et le modal
 *  - getAllies()                  : retourne le tableau des alliés actuels
 *  - resetAllies()               : vide la liste (appelé au changement d'attaquant)
 *  - renderAllyValuesOnCard(card, heal_self, shield_self, heal_ally_fn, shield_ally_fn)
 *                                 : injecte les badges alliés sur une damage-line
 */

import { state } from './state.js';

const MAX_ALLIES = 4;

// Tableau d'alliés : [{ pokemonId, displayName, image }, ...]
let allies = [];

// Callbacks enregistrés pour re-render quand la liste change
const onChangeCallbacks = [];

export function onAlliesChange(fn) {
  onChangeCallbacks.push(fn);
}

function notifyChange() {
  onChangeCallbacks.forEach(fn => fn(allies));
}

export function getAllies() {
  return allies;
}

export function resetAllies() {
  allies = [];
  renderAlliesRow();
  notifyChange();
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initAllyManager() {
  const addBtn = document.getElementById('allyAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', openAllyPicker);
  }

  // Fermeture modal
  const closeBtn = document.querySelector('.ally-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeAllyPicker);

  const modal = document.getElementById('allyPickerModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllyPicker();
    });
  }

  // Recherche dans le picker
  const search = document.getElementById('allyPickerSearch');
  if (search) {
    search.addEventListener('input', () => {
      const term = search.value.toLowerCase().trim();
      document.querySelectorAll('#allyPickerGrid .ally-picker-item').forEach(el => {
        const name = el.querySelector('span')?.textContent.toLowerCase() || '';
        el.style.display = name.includes(term) ? '' : 'none';
      });
    });
  }
}

// ── Modal picker ──────────────────────────────────────────────────────────────

function openAllyPicker() {
  if (allies.length >= MAX_ALLIES) return;

  const modal = document.getElementById('allyPickerModal');
  const grid  = document.getElementById('allyPickerGrid');
  const search = document.getElementById('allyPickerSearch');

  if (!modal || !grid) return;

  // Reset search
  if (search) { search.value = ''; }

  // Construire la grille
  grid.innerHTML = '';
  const currentAllyIds = new Set(allies.map(a => a.pokemonId));

  const playable = state.allPokemon.filter(p => p.category === 'playable');

  playable.forEach(p => {
    const item = document.createElement('div');
    item.className = 'ally-picker-item' + (currentAllyIds.has(p.pokemonId) ? ' already-ally' : '');
    item.innerHTML = `
      <img src="${p.image}" alt="${p.displayName}" onerror="this.src='assets/pokemon/missing.png'">
      <span>${p.displayName}</span>
    `;
    item.addEventListener('click', () => {
      addAlly(p);
      closeAllyPicker();
    });
    grid.appendChild(item);
  });

  modal.style.display = 'flex';
  if (search) setTimeout(() => search.focus(), 50);
}

function closeAllyPicker() {
  const modal = document.getElementById('allyPickerModal');
  if (modal) modal.style.display = 'none';
}

// ── Gestion des alliés ────────────────────────────────────────────────────────

function addAlly(pokemon) {
  if (allies.length >= MAX_ALLIES) return;
  if (allies.some(a => a.pokemonId === pokemon.pokemonId)) return;

  allies.push({
    pokemonId:   pokemon.pokemonId,
    displayName: pokemon.displayName,
    image:       pokemon.image,
  });

  renderAlliesRow();
  notifyChange();
}

function removeAlly(pokemonId) {
  allies = allies.filter(a => a.pokemonId !== pokemonId);
  renderAlliesRow();
  notifyChange();
}

// ── Render de la rangée d'alliés ──────────────────────────────────────────────

function renderAlliesRow() {
  const row    = document.getElementById('alliesRow');
  const addBtn = document.getElementById('allyAddBtn');
  if (!row) return;

  // Retirer les slots existants (garder le bouton +)
  row.querySelectorAll('.ally-slot').forEach(el => el.remove());

  // Insérer les slots avant le bouton +
  allies.forEach(ally => {
    const slot = document.createElement('div');
    slot.className = 'ally-slot';
    slot.dataset.allyId = ally.pokemonId;
    slot.title = ally.displayName;

    slot.innerHTML = `
      <div class="ally-slot-img-wrap">
        <img class="ally-slot-img" src="${ally.image}" alt="${ally.displayName}" onerror="this.src='assets/pokemon/missing.png'">
        <button class="ally-slot-remove" title="Remove ally">×</button>
      </div>
      <span class="ally-slot-name">${ally.displayName.split(' ')[0]}</span>
    `;

    slot.querySelector('.ally-slot-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeAlly(ally.pokemonId);
    });

    row.insertBefore(slot, addBtn);
  });

  // Masquer le bouton + si max atteint
  if (addBtn) {
    addBtn.style.display = allies.length >= MAX_ALLIES ? 'none' : 'flex';
  }
}

// ── Injection des badges alliés sur une damage-line ───────────────────────────

/**
 * Ajoute les badges alliés (heal ou shield) sur un élément .dmg-values
 * à l'intérieur d'une damage-line.
 *
 * @param {HTMLElement} valuesEl   - l'élément .dmg-values
 * @param {'heal'|'shield'} type   - type de valeur
 * @param {number} allyValue       - valeur calculée pour un allié (Rescue Hood etc.)
 */
export function appendAllyBadges(valuesEl, type, allyValue) {
  if (!allies.length) return;
  if (!allyValue || allyValue <= 0) return;

  // Wrapper pour les badges alliés
  let wrapper = valuesEl.querySelector('.dmg-ally-col');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'dmg-ally-col';
    valuesEl.appendChild(wrapper);
  }

  allies.forEach(ally => {
    const badge = document.createElement('span');
    badge.className = `dmg-ally-badge dmg-ally-${type}`;
    badge.innerHTML = `
      <img src="${ally.image}" alt="${ally.displayName}" onerror="this.src='assets/pokemon/missing.png'">
      ${allyValue.toLocaleString()}
    `;
    badge.title = `${type === 'heal' ? '❤️' : '🛡️'} ${ally.displayName}: ${allyValue.toLocaleString()}`;
    wrapper.appendChild(badge);
  });
}