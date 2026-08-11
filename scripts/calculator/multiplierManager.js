/**
 * multiplierManager.js
 * Calcule globalDamageMult et defenderDamageMult depuis l'état global.
 * Appelé depuis updateDamages() dans damageDisplay.js.
 */

import { state } from './state.js';

export function computeDefenderDamageMult() {
  let defenderDamageMult = 1.0;

  if (state.defenderEldegossBuff)           defenderDamageMult *= 0.80;
  if (state.defenderNinetailsBuff)          defenderDamageMult *= 0.65;
  if (state.defenderNinetailsPlusBuff)      defenderDamageMult *= 0.60;
  if (state.defenderUmbreonBuff)            defenderDamageMult *= 0.80;
  if (state.defenderUmbreonPlusBuff)        defenderDamageMult *= 0.70;
  if (state.defenderBlisseyRedirectionBuff) defenderDamageMult *= 0.50;
  if (state.defenderHoOhRedirectionBuff)    defenderDamageMult *= 0.40;
  if (state.defenderDhelmiseAnchorShotPlus) defenderDamageMult *= 1.50;
  if (state.currentDefender?.pokemonId === "dragonite" && state.defenderMultiscaleActive) defenderDamageMult *= 0.70;
  if (state.defenderMimeActive)             defenderDamageMult *= 0.90;
  if (state.currentDefender?.pokemonId === "dodrio" && state.defenderDodrioDrillPeckDash) defenderDamageMult *= 0.80;
  if (state.currentDefender?.pokemonId === "dragonite" && state.defenderDragoniteHyperBeamCharging) defenderDamageMult *= 0.50;
  if (state.currentDefender?.pokemonId === "duraludon" && state.defenderDuraludonLaserFocusActive) defenderDamageMult *= 0.80;

  // Metagross — Zen Headbutt+ (post-hit) & Magnet Rise+ (levitating)
  if (state.currentDefender?.pokemonId === "metagross" && state.defenderMetagrossZenHeadbuttActive) defenderDamageMult *= 0.80;
  if (state.currentDefender?.pokemonId === "metagross" && state.defenderMetagrossMagnetRiseActive)  defenderDamageMult *= 0.70;

  // Mew — Light Screen (moving wall) : -25% dmg from attacks passing through
  if (state.currentDefender?.pokemonId === "mew" && state.defenderMewLightScreenWallActive) defenderDamageMult *= 0.75;

  if (state.currentDefender?.pokemonId === "garchomp" && state.defenderGarchompDragonRushDmgReduc)   defenderDamageMult *= 0.55;
  if (state.currentDefender?.pokemonId === "garchomp" && state.defenderGarchompLividOutrageActive)   defenderDamageMult *= 0.70;

  if (state.currentDefender?.pokemonId === "hooh" && state.defenderHoohSafeguardActive)  defenderDamageMult *= 0.50;
  if (state.currentDefender?.pokemonId === "hooh" && state.defenderHoohSkyAttackActive)  defenderDamageMult *= 0.70;

  // Lucario / Mega-Lucario — Power-Up Punch charging : -30% damage received
  if (["lucario", "mega-lucario"].includes(state.currentDefender?.pokemonId) && state.defenderLucarioPowerUpPunchCharging) {
    defenderDamageMult *= 0.70;
  }

  // Mewtwo Y — Psystrike: -15% damage received while channeling
  if (state.currentDefender?.pokemonId === "mewtwo_y" && state.defenderMewtwoYPsystrikeChanneling) {
    defenderDamageMult *= 0.85;
  }

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

  if (state.currentAttacker?.pokemonId === "inteleon" && state.attackerInteleonLiquidationStacked) globalDamageMult *= 1.20;

  // ── MEOWSCARADA — Flower Trick: Increased Explosion (bomb re-hit before detonation) ──
  if (state.currentAttacker?.pokemonId === "meowscarada" && state.attackerMeowscaradaFlowerTrickIncreased) globalDamageMult *= 1.60;

  // ── LATIOS — Luster Purge mark : +20% dmg vs marked target (benefits allied Latias too) ──
  if (state.attackerLatiosLusterPurgeMarkActive && ["latios", "latias"].includes(state.currentAttacker?.pokemonId)) {
    globalDamageMult *= 1.20;
  }

  // ── YVELTAL — Dark Aura: +3% dmg per Mark of Destruction (max 5, vs marked target) ──
  if (state.currentAttacker?.pokemonId === "yveltal") {
    const marks = Math.min(5, state.attackerPassiveStacks || 0);
    if (marks > 0) globalDamageMult *= (1 + marks * 0.03);
  }

  // ── MEWTWO Y — Future Sight: +10%/+15% dmg vs locked-on target ─────────────
  if (state.currentAttacker?.pokemonId === "mewtwo_y" && state.attackerMewtwoYFutureSightMarkActive) {
    globalDamageMult *= state.attackerLevel >= 11 ? 1.15 : 1.10;
  }

  // ── MEWTWO Y — Teleport: +20%/+30% dmg dealt for 2s after teleporting ──────
  if (state.currentAttacker?.pokemonId === "mewtwo_y" && state.attackerMewtwoYTeleportActive) {
    globalDamageMult *= state.attackerLevel >= 13 ? 1.30 : 1.20;
  }

  if (state.debuffGoodraMuddyWater)         globalDamageMult *= 0.85;
  if (state.debuffMimePowerSwap)            globalDamageMult *= 0.85;
  if (state.debuffMimePowerSwapPlus)        globalDamageMult *= 0.80;
  if (state.debuffTrevenantWoodHammerPlus)  globalDamageMult *= 0.80;
  if (state.debuffPsyduckSurfPlus)          globalDamageMult *= 0.75;
  if (state.debuffPsyduckUnite)             globalDamageMult *= 0.70;
  if (state.debuffLatiasMistBall)           globalDamageMult *= 0.75;
  if (state.debuffMeganiumSynthesis)        globalDamageMult *= 0.85;
  if (state.debuffMeganiumFullBloomAroma)   globalDamageMult *= 0.90;

  if (state.currentDefender?.pokemonId === 'armarouge' && state.defenderLevel >= 13 && state.defenderArmarougeFlameChargeDmgReduc) {
    globalDamageMult *= 0.80;
  }

  if (state.currentDefender?.pokemonId === 'blaziken' && state.defenderLevel >= 7 && state.defenderBlazikenOverheatDmgReduc) {
    globalDamageMult *= 0.75;
  }

  if (state.currentDefender?.pokemonId === 'ceruledge' && state.defenderLevel >= 9 && state.defenderCeruledgeRevenantRendBuff) {
    globalDamageMult *= 0.30;
  }

  if (state.currentDefender?.pokemonId === 'leafeon' && state.defenderLevel >= 10 && state.defenderLeafeonSolarBladeDmgReduc) {
    globalDamageMult *= 0.50;
  }

  return globalDamageMult;
}

export function computeHealReductionMult() {
  let healReductionMult = 1.0;

  if (state.currentDefender?.pokemonId === 'delphox' && state.defenderLevel >= 9 && state.defenderDelphoxFancifulFireworksAntiHeal) {
    healReductionMult *= 0.50;
  }

  return healReductionMult;
}