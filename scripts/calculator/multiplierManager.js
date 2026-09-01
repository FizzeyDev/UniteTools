/**
 * multiplierManager.js
 * Calcule globalDamageMult et defenderDamageMult depuis l'état global.
 * Appelé depuis updateDamages() dans damageDisplay.js.
 */

import { state } from './state.js';

export function computeDefenderDamageMult() {
  let defenderDamageMult = 1.0;

  // ── Solgaleo — Shining Meteor Crush (Unite) : Radiant Sun phase ────────────
  // "Solgaleo's auto attacks and moves deal True type damage" while Radiant
  // Sun is active. True damage bypasses all flat % damage-reduction effects
  // (Unaware, Eldegoss, Ninetales, Umbreon, Mimikyu, etc.) — short-circuit
  // the whole function so nothing below applies to the defender.
  if (state.currentAttacker?.pokemonId === "solgaleo" && state.attackerSolgaleoRadiantSunActive) {
    return 1.0;
  }

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

  // Mewtwo X — Psystrike: -15% damage received while channeling
  if (state.currentDefender?.pokemonId === "mewtwo_x" && state.defenderMewtwoXPsystrikeChanneling) {
    defenderDamageMult *= 0.85;
  }

  // Mewtwo Y — Psystrike: -15% damage received while channeling
  if (state.currentDefender?.pokemonId === "mewtwo_y" && state.defenderMewtwoYPsystrikeChanneling) {
    defenderDamageMult *= 0.85;
  }

  // Mimikyu — Trick Room: -50% dmg taken from attackers outside the Trick Room
  if (state.currentDefender?.pokemonId === "mimikyu" && state.defenderMimikyuTrickRoomActive) {
    defenderDamageMult *= 0.50;
  }

  // Snow Cloak (Articuno)
  if (state.currentDefender?.pokemonId === "articuno") {
    const snowCloakState = state.defenderSnowCloakState || "none";
    if (snowCloakState === "low")  defenderDamageMult *= 0.90;
    if (snowCloakState === "high") defenderDamageMult *= 0.80;
  }

  // ── Solgaleo — Unaware / Sturdy : -30% physical & special dmg taken (permanent). ──
  // True type damage bypasses this — already handled by the early-return
  // above when Solgaleo is the attacker in Radiant Sun, but this also covers
  // Solgaleo taking true damage from another attacker (e.g. Tyranitar Rampage).
  if (state.currentDefender?.pokemonId === "solgaleo" && (state.defenderSolgaleoUnawareActive ?? true)) {
    defenderDamageMult *= 0.70;
  }

  // ── Solgaleo — Psyshock : -30% dmg taken while charging (first 2s) ─────────
  if (state.currentDefender?.pokemonId === "solgaleo" && state.defenderSolgaleoPsyshockChargingActive) {
    defenderDamageMult *= 0.70;
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

  if (state.currentAttacker?.pokemonId === "tyranitar" && state.attackerTyranitarRockPolishActive) globalDamageMult *= 1.15;
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

  // ── MEWTWO X — Future Sight: +10%/+20% dmg vs locked-on target ─────────────
  if (state.currentAttacker?.pokemonId === "mewtwo_x" && state.attackerMewtwoXFutureSightMarkActive) {
    globalDamageMult *= state.attackerLevel >= 11 ? 1.20 : 1.10;
  }

  // ── MEWTWO X — Teleport: +10%/+20% dmg dealt for 5s after teleporting ──────
  if (state.currentAttacker?.pokemonId === "mewtwo_x" && state.attackerMewtwoXTeleportActive) {
    globalDamageMult *= state.attackerLevel >= 13 ? 1.20 : 1.10;
  }

  // ── MEWTWO Y — Future Sight: +10%/+20% dmg vs locked-on target ─────────────
  if (state.currentAttacker?.pokemonId === "mewtwo_y" && state.attackerMewtwoYFutureSightMarkActive) {
    globalDamageMult *= state.attackerLevel >= 11 ? 1.20 : 1.10;
  }

  // ── MEWTWO Y — Teleport: +10%/+20% dmg dealt for 5s after teleporting ──────
  if (state.currentAttacker?.pokemonId === "mewtwo_y" && state.attackerMewtwoYTeleportActive) {
    globalDamageMult *= state.attackerLevel >= 13 ? 1.20 : 1.10;
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

  if (state.currentDefender?.pokemonId === 'sableye' && state.defenderLevel >= 4 && state.defenderSableyeKnockOffActive) {
    globalDamageMult *= 0.60;
  }

  if (state.currentDefender?.pokemonId === 'scizor' && state.defenderLevel >= 13 && state.defenderScizorSwordsDanceDashActive) {
    globalDamageMult *= 0.50;
  }

  if (state.currentDefender?.pokemonId === 'scyther' && state.defenderLevel >= 13 && state.defenderScytherSwordsDanceDashActive) {
    globalDamageMult *= 0.50;
  }

  if (state.currentDefender?.pokemonId === 'sirfetchd' && state.defenderLevel >= 7 && state.defenderSirfetchdDetectActive) {
    globalDamageMult *= 0.70;
  }

  if (state.currentDefender?.pokemonId === 'skeledirge' && state.defenderLevel >= 7 && state.defenderSkeledirgeSnarlActive) {
    globalDamageMult *= state.defenderLevel >= 13 ? 0.70 : 0.80;
  }

  if (state.currentDefender?.pokemonId === 'talonflame' && state.defenderLevel >= 13) {
    const bbStacks = Math.min(3, state.defenderTalonflameBraveBirdStacks ?? 0);
    if (bbStacks > 0) globalDamageMult *= (1 - bbStacks * 0.25);
  }

  if (state.currentDefender?.pokemonId === 'talonflame' && state.defenderLevel >= 9 && state.defenderTalonflameFlameSweepActive) {
    globalDamageMult *= 0.50;
  }

  // ── Trevenant — Pain Split : mitigation par palier de HP (30/40/50%) ───────
  if (state.currentDefender?.pokemonId === 'trevenant' && state.defenderLevel >= 7) {
    const band = state.defenderTrevenantPainSplitBand || 'none';
    const mult = { none: 1.0, high: 0.70, mid: 0.60, low: 0.50 }[band] ?? 1.0;
    globalDamageMult *= mult;
  }

  if (state.currentDefender?.pokemonId === 'tyranitar' && state.defenderLevel >= 9 && state.defenderTyranitarSandTombDustActive) {
    globalDamageMult *= 0.85;
  }

  if (state.currentDefender?.pokemonId === 'urshifu' && state.defenderLevel >= 1 && state.defenderUrshifuRockSmashActive) {
    globalDamageMult *= 0.80;
  }

  if (state.currentDefender?.pokemonId === 'urshifu' && state.defenderLevel >= 5 && state.defenderUrshifuWickedBlowActive) {
    globalDamageMult *= state.defenderLevel >= 11 ? 0.60 : 0.80;
  }

  if (state.currentDefender?.pokemonId === 'urshifu' && state.defenderLevel >= 11 && state.defenderUrshifuSurgingStrikesActive) {
    globalDamageMult *= 0.70;
  }

  if (state.currentDefender?.pokemonId === 'urshifu' && state.defenderLevel >= 9 && state.defenderUrshifuFlowingFistsActive) {
    globalDamageMult *= 0.70;
  }

  if (state.currentDefender?.pokemonId === 'vaporeon' && state.defenderLevel >= 6 && state.defenderVaporeonFlipTurnActive) {
    globalDamageMult *= state.defenderLevel >= 12 ? 0.70 : 0.85;
  }

  if (state.currentDefender?.pokemonId === 'venusaur' && state.defenderLevel >= 5 && state.defenderVenusaurGigaDrainActive) {
    globalDamageMult *= 0.60;
  }

  if (state.currentDefender?.pokemonId === 'zacian' && state.defenderLevel >= 5 && state.defenderZacianSacredSwordActive) {
    globalDamageMult *= 0.70;
  }

  if (state.currentDefender?.pokemonId === 'zacian' && state.defenderLevel >= 7 && state.defenderZacianPlayRoughActive) {
    globalDamageMult *= 0.75;
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