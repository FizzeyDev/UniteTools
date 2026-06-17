/**
 * multiplierManager.js
 * Calcule globalDamageMult et defenderDamageMult depuis l'état global.
 * Appelé depuis updateDamages() dans damageDisplay.js.
 */

import { state } from './state.js';

export function computeDefenderDamageMult() {
  let defenderDamageMult = 1.0;

  if (state.defenderEldegossBuff)           defenderDamageMult *= 0.85;
  if (state.defenderNinetailsBuff)          defenderDamageMult *= 0.65;
  if (state.defenderNinetailsPlusBuff)      defenderDamageMult *= 0.60;
  if (state.defenderUmbreonBuff)            defenderDamageMult *= 0.85;
  if (state.defenderUmbreonPlusBuff)        defenderDamageMult *= 0.75;
  if (state.defenderBlisseyRedirectionBuff) defenderDamageMult *= 0.50;
  if (state.defenderHoOhRedirectionBuff)    defenderDamageMult *= 0.40;
  if (state.defenderDhelmiseAnchorShotPlus) defenderDamageMult *= 1.50;
  if (state.currentDefender?.pokemonId === "dragonite" && state.defenderMultiscaleActive) defenderDamageMult *= 0.70;
  if (state.defenderMimeActive)             defenderDamageMult *= 0.90;

  // Snow Cloak (Articuno)
  if (state.currentDefender?.pokemonId === "articuno") {
    const snowCloakState = state.defenderSnowCloakState || "none";
    if (snowCloakState === "low")  defenderDamageMult *= 0.90;
    if (snowCloakState === "high") defenderDamageMult *= 0.80;
  }

  return defenderDamageMult;
}

export function computeGlobalDamageMult() {
  let globalDamageMult = 1.0;

  if (state.attackerGroudonBuff)       globalDamageMult *= 1.50;
  if (state.attackerRayquazaBuff)      globalDamageMult *= 1.40;
  if (state.attackerBlisseyHandBuff)   globalDamageMult *= 1.15;
  if (state.attackerMimeSwapBuff)      globalDamageMult *= 1.15;
  if (state.attackerMimeSwapPlusBuff)  globalDamageMult *= 1.20;
  if (state.attackerSkeledirgeBuff)    globalDamageMult *= 1.15;
  if (state.attackerMiraidonBuff) {
    globalDamageMult *= state.currentAttacker?.pokemonId === "miraidon" ? 1.30 : 1.10;
  }
  if (state.currentAttacker?.pokemonId === "mega-charizard-y" && state.attackerDroughtActive) globalDamageMult *= 1.10;

  if (state.debuffGoodraMuddyWater)         globalDamageMult *= 0.85;
  if (state.debuffMimePowerSwap)            globalDamageMult *= 0.85;
  if (state.debuffMimePowerSwapPlus)        globalDamageMult *= 0.80;
  if (state.debuffTrevenantWoodHammerPlus)  globalDamageMult *= 0.80;
  if (state.debuffPsyduckSurfPlus)          globalDamageMult *= 0.75;
  if (state.debuffPsyduckUnite)             globalDamageMult *= 0.70;
  if (state.debuffLatiasMistBall)           globalDamageMult *= 0.75;

  if (state.currentDefender?.pokemonId === 'armarouge' && state.defenderLevel >= 13 && state.defenderArmarougeFlameChargeDmgReduc) {
    globalDamageMult *= 0.80;
  }

  if (state.currentDefender?.pokemonId === 'blaziken' && state.defenderLevel >= 7 && state.defenderBlazikenOverheatDmgReduc) {
    globalDamageMult *= 0.75;
  }

  if (state.currentDefender?.pokemonId === 'ceruledge' && state.defenderLevel >= 9 && state.defenderCeruledgeRevenantRendBuff) {
    globalDamageMult *= 0.30;
  }

  return globalDamageMult;
}