import { state } from './state.js';
import { loadData } from './dataLoader.js';
import { populateGrids, setupSearch, setupLevelSliders, setupHPSliders, setupModals, setupCollapsibleSections, makeHPValueEditable, makeCustomStatEditable, setupTimerSlider } from './uiManager.js';
import { populateItemGrid, setupItemSearch, setupItemSelection } from './itemManager.js';
import { selectAttacker, selectDefender } from './pokemonManager.js';
import { setupBuffListeners, setupDebuffListeners, setupStackableDebuffs } from './events.js';
import { updateDamages } from './damageDisplay.js';
import { t } from './i18n.js';
import { resetItems } from './itemManager.js';
import { initAllyManager } from './allyManager.js';
import { initHowToUse } from './howToUse.js';
import { enhanceBuffLabels } from './buff-visuals.js';
import { initBuildOptimizer } from './buildOptimizer.js';
import { initCombatLogTab } from './combatLogTab.js';
import { initComparePatchTab } from './comparePatchTab.js';

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
  initBuildOptimizer();
  setupItemSelection();
  setupItemSearch();
  setupSearch();
  setupLevelSliders();
  setupHPSliders();
  setupTimerSlider();
  setupModals();
  setupCollapsibleSections();

  setupBuffListeners();
  setupDebuffListeners();
  setupStackableDebuffs();
  enhanceBuffLabels(state.allPokemon);

  makeHPValueEditable('hpValueAttacker', 'hpSliderAttacker');
  makeHPValueEditable('hpValueDefender', 'hpSliderDefender');

  makeCustomStatEditable('defenderMaxHP', 'hp');
  makeCustomStatEditable('defenderDefCustom', 'def');
  makeCustomStatEditable('defenderSpDefCustom', 'sp_def');

  // Auto-select from URL params (e.g. ?atk=pikachu&def=lucario)
  const _p = new URLSearchParams(window.location.search);
  if (_p.get('atk')) selectAttacker(_p.get('atk'));
  else selectAttacker('absol');
  if (_p.get('def')) selectDefender(_p.get('def'));
  else selectDefender('substitute-doll');
  updateDamages();

  initCombatLogTab();
  initComparePatchTab();
  initAllyManager();
  initHowToUse();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}