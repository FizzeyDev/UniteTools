/**
 * state.js — Shared application state
 *
 * Single source of truth for the XP Calculator.
 * All modules read/write through window.XPCalcState.
 * Nothing here touches the DOM.
 */

window.XPCalcState = (function () {
  'use strict';

  /**
   * Main application state.
   *
   * player      — the Pokémon the user is calculating for
   * ally        — a second Pokémon running a parallel preset (for Exp. Share tracking)
   * enemy       — the opposing team reference (for Catch-Up modifier)
   * killQueue   — list of events (wild kills, player KOs, scores) for the player
   * expShare    — whether the Exp. Share item is equipped on the player
   * currentMap  — which map is currently selected in the wild grid
   * tableMap    — which map is selected in the XP reference table
   */
  const state = {
    // ── Player ──
    selectedPokemon: null,
    startLevel: 1,
    expShareEnabled: false,

    // ── Ally (parallel simulation) ──
    allyPresetIdx: null,   // index into localStorage presets, or null
    allyStartLevel: 1,
    allyKillQueue: [],     // events for the ally's simulation track

    // ── Enemy ──
    enemyHighestLevel: 1,
    enemyPresetIdx: null,  // index into localStorage presets, or null
    enemyStartLevel: 1,
    enemyKillQueue: [],    // events for the enemy's simulation track

    // ── Player Kill Queue ──
    killQueue: [],

    // ── UI state ──
    currentMap: 'groudon',
    tableMap: 'groudon',
  };

  return state;
})();
