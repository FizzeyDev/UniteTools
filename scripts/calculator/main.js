import { loadData } from './dataLoader.js';
import { populateGrids, setupSearch, setupLevelSliders, setupHPSliders, setupModals, setupCollapsibleSections, makeHPValueEditable, makeCustomStatEditable } from './uiManager.js';
import { populateItemGrid, setupItemSearch, setupItemSelection } from './itemManager.js';
import { selectAttacker, selectDefender } from './pokemonManager.js';
import { setupBuffListeners, setupDebuffListeners, setupStackableDebuffs } from './events.js';
import { updateDamages } from './damageDisplay.js';
import { t } from './i18n.js';
import { resetItems } from './itemManager.js';

document.querySelectorAll('.reset-items-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    resetItems(btn.dataset.side)
  })
})

async function initApp() {
  const success = await loadData();
  
  if (!success) {
    const movesGrid = document.getElementById("movesGrid");
    if (movesGrid) {
      movesGrid.innerHTML = `<div class="error">${t('calc_error_loading')}</div>`;
    }
    return;
  }

  populateGrids();
  populateItemGrid();
  setupItemSelection();
  setupItemSearch();
  setupSearch();
  setupLevelSliders();
  setupHPSliders();
  setupModals();
  setupCollapsibleSections();

  setupBuffListeners();
  setupDebuffListeners();
  setupStackableDebuffs();

  makeHPValueEditable('hpValueAttacker', 'hpSliderAttacker');
  makeHPValueEditable('hpValueDefender', 'hpSliderDefender');

  makeCustomStatEditable('defenderMaxHP', 'hp');
  makeCustomStatEditable('defenderDefCustom', 'def');
  makeCustomStatEditable('defenderSpDefCustom', 'sp_def');

  selectAttacker('absol');
  selectDefender('substitute-doll');
  updateDamages();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}