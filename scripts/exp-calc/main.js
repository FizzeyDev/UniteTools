/**
 * main.js — Application entry point
 *
 * Initializes all modules in dependency order and wires DOM events.
 * Load order in HTML must be:
 *   data.js → state.js → presets.js → ui-pokemon.js → ui-queue.js → simulation.js → main.js
 *
 * This file only orchestrates — no logic lives here.
 */

(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  /**
   * Boot sequence: initialize all modules, bind events, render initial state.
   */
  function init() {
    // Pokémon picker + team config
    window.XPCalcUI.buildPokemonPicker();
    window.XPCalcUI.bindEvents();
    window.XPCalcUI.renderWildGrid(window.XPCalcState.currentMap);
    window.XPCalcUI.renderXPTable(window.XPCalcState.tableMap);
    window.XPCalcUI.updateXPProgress();
    window.XPCalcUI.updateCatchUpDisplay();
    window.XPCalcUI.updateAllyExpShareDisplay();

    // Kill Queue
    window.XPCalcQueue.bindEvents();
    window.XPCalcQueue.renderKillQueue();

    // Presets
    window.XPCalcPresets.bindEvents();
    window.XPCalcPresets.renderPlayerChips();
    window.XPCalcPresets.renderAllySelector();
    window.XPCalcPresets.renderEnemySelector();

    // Simulation controls
    window.XPCalcSim.bindEvents();

    // Misc modals
    _bindMiscModals();
  }

  /**
   * Bind how-to, disclaimer, and info-popup modals.
   */
  function _bindMiscModals() {
    $('howToUseBtn').addEventListener('click', () => { $('howto-modal').style.display = 'flex'; });
    $('howto-close').addEventListener('click',  () => { $('howto-modal').style.display = 'none'; });
    $('howto-modal').addEventListener('click', e => { if (e.target === $('howto-modal')) $('howto-modal').style.display = 'none'; });

    $('disclaimerBtn').addEventListener('click',   () => { $('disclaimer-modal').style.display = 'flex'; });
    $('disclaimer-close').addEventListener('click', () => { $('disclaimer-modal').style.display = 'none'; });
    $('disclaimer-modal').addEventListener('click', e => { if (e.target === $('disclaimer-modal')) $('disclaimer-modal').style.display = 'none'; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
