import { state } from './state.js';
import { specialHeldItems, stackableItems } from './constants.js';
import { updateDamages } from './damageDisplay.js';
import { t } from './i18n.js';

const STACK_GROUPS = {
  scoring: ['Attack Weight', 'Sp. Atk Specs', 'Aeos Cookie'],
  kill:    ['Drive Lens', 'Accel Bracer'],
};

function getStackGroup(itemName) {
  for (const [group, items] of Object.entries(STACK_GROUPS)) {
    if (items.includes(itemName)) return group;
  }
  return null;
}

function syncLinkedStacks(side, changedSlot, newValue) {
  const itemsArray  = side === 'attacker' ? state.attackerItems : state.defenderItems;
  const stacksArray = side === 'attacker' ? state.attackerItemStacks : state.defenderItemStacks;

  const changedItem = itemsArray[changedSlot];
  if (!changedItem) return;

  const group = getStackGroup(changedItem.name);
  if (!group) return;

  const groupItems = STACK_GROUPS[group];

  itemsArray.forEach((item, slot) => {
    if (slot === changedSlot) return;
    if (item && groupItems.includes(item.name)) {
      stacksArray[slot] = newValue;
      const grid = side === 'attacker' ? document.getElementById('itemsEquippedAttacker') : document.getElementById('itemsEquippedDefender');
      const card = grid.querySelector(`[data-slot="${slot}"]`);
      if (card) {
        const valueSpan = card.querySelector('.stack-value');
        if (valueSpan) valueSpan.textContent = newValue;
      }
    }
  });
}

export function populateItemGrid() {
  const grid = document.getElementById("itemGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const excludedItems = Object.values(specialHeldItems);

  state.allItems.forEach(item => {
    if (excludedItems.includes(item.name)) return;

    const div = document.createElement("div");
    div.className = "item-grid-item";
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" onerror="this.src='assets/items/missing.png'">
      <span>${item.display_name || item.name}</span>
    `;
    div.onclick = () => selectItemForSlot(item);
    grid.appendChild(div);
  });
}

export function setupItemSearch() {
  const search = document.getElementById('itemSearch');
  if (!search) return;

  search.addEventListener('input', () => {
    const term = search.value.toLowerCase();
    document.querySelectorAll('#itemGrid .item-grid-item').forEach(el => {
      if (el.classList.contains('equipped-elsewhere')) return;
      const name = (el.querySelector('span')?.textContent || '').toLowerCase();
      el.style.display = name.includes(term) ? '' : 'none';
    });
  });
}

export function setupItemSelection() {
  document.querySelectorAll('#itemsEquippedAttacker .item-equipped-card, #itemsEquippedDefender .item-equipped-card').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('.item-equipped-stacks') || e.target.closest('.item-equipped-toggle')) return;
      const side = card.closest('#itemsEquippedAttacker') ? 'attacker' : 'defender';
      openItemSelector(side, parseInt(card.dataset.slot));
    };
  });

  const closeBtn = document.querySelector('.close-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('itemSelectorModal').style.display = 'none';
    });
  }
}

function openItemSelector(side, slot) {
  state.currentSlotTarget = { side, slot };
  document.getElementById('itemSelectorModal').style.display = 'flex';
  filterItemGridForSide(side);
}

function filterItemGridForSide(side) {
  const itemsArray = side === 'attacker' ? state.attackerItems : state.defenderItems;
  const equippedNames = new Set(
    itemsArray.filter(Boolean).map(i => i.name)
  );

  document.querySelectorAll('#itemGrid .item-grid-item').forEach(el => {
    const spanText = el.querySelector('span')?.textContent;
    const item = state.allItems.find(i =>
      (i.display_name || i.name) === spanText || i.name === spanText
    );
    const isEquipped = !!(item && equippedNames.has(item.name));
    el.classList.toggle('equipped-elsewhere', isEquipped);
    if (!isEquipped) {
      el.style.display = '';
    }
  });
}

export function updateItemCard(side, slot, item = null) {
  const grid = side === 'attacker' ? document.getElementById('itemsEquippedAttacker') : document.getElementById('itemsEquippedDefender');
  const card = grid.querySelector(`[data-slot="${slot}"]`);
  const icon = card.querySelector('.item-equipped-icon img');
  const nameEl = card.querySelector('.item-equipped-name');
  const statsEl = card.querySelector('.item-equipped-stats');
  const stacksEl = card.querySelector('.item-equipped-stacks');
  const toggleEl = card.querySelector('.item-equipped-toggle');
  const valueSpan = stacksEl?.querySelector('.stack-value');
  const maxSpan = stacksEl?.querySelector('.stack-max');

  if (toggleEl) toggleEl.remove();

  const specsIndicator = card.querySelector('.choice-specs-indicator');
  if (specsIndicator) specsIndicator.remove();

  if (!item) {
    icon.src = 'assets/items/none.png';
    nameEl.textContent = window.translations?.calc_item_empty ?? 'Empty';
    statsEl.innerHTML = '';
    if (stacksEl) stacksEl.style.display = 'none';
    card.classList.remove('has-item');
    return;
  }

  icon.src = item.image || 'assets/items/none.png';
  nameEl.textContent = item.display_name || item.name;
  card.classList.add('has-item');

  let statsText = '';
  if (item.bonus1) statsText += `${item.bonus1}<br>`;
  if (item.bonus2) statsText += `${item.bonus2}<br>`;

  if (stackableItems.includes(item.name) && item.level20) {
    const perStack = parseFloat(item.level20);
    const maxStacks = item.name === "Weakness Policy" ? 4 : (item.name.includes("Accel") || item.name.includes("Drive") ? 20 : 6);
    const totalBonus = (perStack * maxStacks).toFixed(0);
    const isPercent = item.stack_type !== "flat";
    const statName = item.name === "Attack Weight" ? "Attack" :
                     item.name === "Sp. Atk Specs" ? "Sp. Atk" :
                     item.name === "Drive Lens" ? "Sp. Atk" :
                     item.name === "Accel Bracer" ? "Attack" :
                     item.name === "Aeos Cookie" ? "HP" :
                     item.description3 || '';

    statsText += `<br><span style="color:var(--green);font-weight:bold;">+${totalBonus}${isPercent ? '%' : ''} ${statName} (max)</span>`;
  } else if (item.name === "Muscle Band" && item.level20) {
    statsText += `<br><span style="color:var(--green);font-weight:bold;">+${item.level20} remaining HP on AA (max)</span>`;
  } else if (item.name === "Scope Lens" && item.level20) {
    statsText += `<br><span style="color:var(--green);font-weight:bold;">Extra crit AA: +${item.level20} Atk (max)</span>`;
  } else if (item.name === "Razor Claw" && item.level20) {
    statsText += `<br><span style="color:var(--green);font-weight:bold;">Next AA after move: +${item.level20}+20 Atk (max)</span>`;
  } else if (item.name === "Charging Charm" && item.level20) {
    statsText += `<br><span style="color:var(--green);font-weight:bold;">Proc (full energy): +40 + ${item.level20} Atk dmg</span>`;
  }

  statsEl.innerHTML = statsText || `<span style="color:#666">${t('calc_item_no_bonus')}</span>`;

  if (stackableItems.includes(item.name)) {
    const maxStacks = item.name === "Weakness Policy" ? 4 : (item.name.includes("Accel") || item.name.includes("Drive") ? 20 : 6);
    stacksEl.style.display = 'flex';
    maxSpan.textContent = `/${maxStacks}`;
    const stacksArray = side === 'attacker' ? state.attackerItemStacks : state.defenderItemStacks;
    valueSpan.textContent = stacksArray[slot];
  } else {
    stacksEl.style.display = 'none';
  }

  if (item.activable && item.name !== "Choice Specs") {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'item-equipped-toggle';
    const activatedArray = side === 'attacker' ? state.attackerItemActivated : state.defenderItemActivated;
    toggleBtn.classList.toggle('active', activatedArray[slot]);
    toggleBtn.textContent = activatedArray[slot] ? t('calc_item_deactivate_btn') : t('calc_item_activate_btn');
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      activatedArray[slot] = !activatedArray[slot];
      toggleBtn.classList.toggle('active', activatedArray[slot]);
      toggleBtn.textContent = activatedArray[slot] ? t('calc_item_deactivate_btn') : t('calc_item_activate_btn');
      updateDamages();
    };
    card.appendChild(toggleBtn);
  }

  if (item.name === "Choice Specs") {
    const indicator = document.createElement('div');
    indicator.className = 'choice-specs-indicator';
    indicator.style.cssText = 'margin-top:8px; font-size:0.85rem; color:var(--green); font-weight:bold;';
    indicator.textContent = t('calc_item_always_active');
    card.appendChild(indicator);
  }

  attachStackButtons(side, slot);
}

function selectItemForSlot(item) {
  if (!state.currentSlotTarget) return;

  const { side, slot } = state.currentSlotTarget;
  const itemsArray = side === 'attacker' ? state.attackerItems : state.defenderItems;

  const alreadyEquipped = itemsArray.some((equippedItem, index) => {
    return index !== slot && equippedItem && equippedItem.name === item.name;
  });

  if (alreadyEquipped) {
    alert(`You can't equip ${item.display_name || item.name} more than one time on the same Pokemon !`);
    document.getElementById('itemSelectorModal').style.display = 'none';
    return;
  }

  const stacksArray = side === 'attacker' ? state.attackerItemStacks : state.defenderItemStacks;
  const activatedArray = side === 'attacker' ? state.attackerItemActivated : state.defenderItemActivated;

  itemsArray[slot] = item;
  stacksArray[slot] = 0;
  activatedArray[slot] = false;

  updateItemCard(side, slot, item);

  const itemSearch = document.getElementById('itemSearch');
  if (itemSearch) {
    itemSearch.value = '';
    itemSearch.dispatchEvent(new Event('input'));
  }

  document.getElementById('itemSelectorModal').style.display = 'none';
  updateDamages();
}

function attachStackButtons(side, slot) {
  const grid = side === 'attacker' ? document.getElementById('itemsEquippedAttacker') : document.getElementById('itemsEquippedDefender');
  const card = grid.querySelector(`[data-slot="${slot}"]`);
  const minus = card.querySelector('.stack-btn.minus');
  const plus = card.querySelector('.stack-btn.plus');
  const valueSpan = card.querySelector('.stack-value');

  const item = (side === 'attacker' ? state.attackerItems : state.defenderItems)[slot];
  if (!item || !stackableItems.includes(item.name)) return;

  const max = parseInt(card.querySelector('.stack-max').textContent.slice(1));
  const stacksArray = side === 'attacker' ? state.attackerItemStacks : state.defenderItemStacks;

  minus.onclick = (e) => {
    e.stopPropagation();
    if (stacksArray[slot] > 0) {
      stacksArray[slot]--;
      valueSpan.textContent = stacksArray[slot];
      syncLinkedStacks(side, slot, stacksArray[slot]);
      updateDamages();
    }
  };

  plus.onclick = (e) => {
    e.stopPropagation();
    if (stacksArray[slot] < max) {
      stacksArray[slot]++;
      valueSpan.textContent = stacksArray[slot];
      syncLinkedStacks(side, slot, stacksArray[slot]);
      updateDamages();
    }
  };
}

export function resetItems(side) {
  console.log("zizi");
  const itemsArray = side === 'attacker' ? state.attackerItems : state.defenderItems;
  const stacksArray = side === 'attacker' ? state.attackerItemStacks : state.defenderItemStacks;
  const activatedArray = side === 'attacker' ? state.attackerItemActivated : state.defenderItemActivated;

  itemsArray.fill(null);
  stacksArray.fill(0);
  activatedArray.fill(false);

  for (let i = 0; i < 3; i++) {
    updateItemCard(side, i);

    const card = document.querySelector(`#itemsEquipped${side.charAt(0).toUpperCase() + side.slice(1)} [data-slot="${i}"]`);
    if (card) {
      card.style.opacity = "";
      card.style.pointerEvents = "";
      card.title = "";
    }
  }
  updateDamages();
}

export function autoEquipSpecialItem(side, pokemonId) {
  const specialItemName = specialHeldItems[pokemonId];
  if (!specialItemName) return;

  const item = state.allItems.find(i => i.name === specialItemName);
  if (!item) return;

  const itemsArray = side === 'attacker' ? state.attackerItems : state.defenderItems;
  const stacksArray = side === 'attacker' ? state.attackerItemStacks : state.defenderItemStacks;
  const activatedArray = side === 'attacker' ? state.attackerItemActivated : state.defenderItemActivated;

  itemsArray[0] = item;
  stacksArray[0] = 0;
  activatedArray[0] = false;

  updateItemCard(side, 0, item);

  const card = document.querySelector(`#itemsEquipped${side.charAt(0).toUpperCase() + side.slice(1)} [data-slot="0"]`);
  if (card) {
    card.style.opacity = "0.7";
    card.style.pointerEvents = "none";
    card.title = t('calc_item_mandatory');
  }
}

export function disableItemSlots(side) {
  const grid = side === 'attacker' ? 'Attacker' : 'Defender';
  const cards = document.querySelectorAll(`#itemsEquipped${grid} .item-equipped-card`);

  cards.forEach(card => {
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';
    card.title = t('calc_item_disabled');
  });
}

export function enableItemSlots(side) {
  const grid = side === 'attacker' ? 'Attacker' : 'Defender';
  const cards = document.querySelectorAll(`#itemsEquipped${grid} .item-equipped-card`);

  cards.forEach(card => {
    card.style.opacity = '';
    card.style.pointerEvents = '';
    card.title = '';
  });
}