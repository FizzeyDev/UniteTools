/**
 * statsManager.js
 * Applique toutes les mutations de stats (atkStats / defStats) avant les calculs.
 * Appelé depuis updateDamages() dans damageDisplay.js.
 */

import { state } from './state.js';
import {
  applyGreninjaSmokescreenStatBuff,
  applyAegislashSacredSwordStatBuff,
  applyAegislashIronHeadStatBuff,
  applyAzumarillBellyBashStatBuff,
  applyBlazikenSpinningFlameKickStatBuff,
  applyBuzzwoleLungeStatBuff,
  applyDarkraiCalmMindStatBuff,
  applyDecidueyeLeafageStatBuff,
  applyDecidueyeRazorLeafStatBuff,
  applyDodrioTripleTrampleStatBuff,
  applyDragapultPhantomForceStatBuff,
  applyDuraludonRevolvingRuinStatBuff,
  applyFalinksBulkUpStatBuff,
  applyFalinksNoRetreatStatBuff,
  applyGlaceonFreezeDryStatBuff,
  applyHoohSacredFireStatBuff,
  applyHoopaRingsUnboundStatBuff,
  applyLucarioExtremeSpeedStatBuff,
  applyMachampBulkUpStatBuff,
  applyMachampDynamicPunchStatBuff,
  applyMachampBarrageBlowStatBuff,
  applyReshiramDragonDanceStatBuff,
  applyScizorSwordsDanceStatBuff,
  applyScytherSwordsDanceStatBuff,
  applySylveonCalmMindStatBuff,
  applyZacianSacredSwordStatBuff,
} from './moveEffectsAtk.js';

export function applyPokemonStatMutations(atkStats, defStats) {

  // ── Mega-Gyarados — Mold Breaker ───────────────────────────────────────────
  if (state.currentAttacker?.pokemonId === "mega-gyarados" && state.attackerMoldBreakerActive) {
    atkStats.atk = Math.floor(atkStats.atk * (1 + state.currentAttacker.passive.bonusPercentAtk / 100));
  }
  if (state.currentDefender?.pokemonId === "mega-gyarados" && state.defenderMoldBreakerActive) {
    defStats.def    = Math.floor(defStats.def    * (1 + state.currentDefender.passive.bonusPercentDef    / 100));
    defStats.sp_def = Math.floor(defStats.sp_def * (1 + state.currentDefender.passive.bonusPercentSpDef / 100));
  }

  // ── Mamoswine — Thick Fat stacks ───────────────────────────────────────────
  if (state.currentDefender?.pokemonId === "mamoswine") {
    const stacks = Math.min(state.defenderPassiveStacks, 3);
    if (stacks > 0) {
      const levelBonus = 10 * (state.defenderLevel - 1) + 20;
      defStats.def    = Math.floor(defStats.def    + stacks * levelBonus);
      defStats.sp_def = Math.floor(defStats.sp_def + stacks * levelBonus);
    }
  }

  // ── Mega-Charizard X — Tough Claws ─────────────────────────────────────────
  if (state.currentDefender?.pokemonId === "mega-charizard-x" && state.defenderZardToughClaw) {
    defStats.def    = Math.floor(defStats.def    * (1 + state.currentDefender.passive.bonusPercentDef    / 100));
    defStats.sp_def = Math.floor(defStats.sp_def * (1 + state.currentDefender.passive.bonusPercentSpDef / 100));
  }

  // ── Blastoise — Torrent low HP ─────────────────────────────────────────────
  if (state.currentAttacker?.pokemonId === "blastoise" && state.attackerHPPercent <= state.currentAttacker.passive.lowHpThreshold) {
    atkStats.atk    = Math.floor(atkStats.atk    * (1 + state.currentAttacker.passive.bonusPercentAtk    / 100));
    atkStats.sp_atk = Math.floor(atkStats.sp_atk * (1 + state.currentAttacker.passive.bonusPercentSpAtk / 100));
  }

  // ── Mega-Lucario — Justified / Adaptability ────────────────────────────────
  if (state.currentAttacker?.pokemonId === "mega-lucario") {
    if (state.attackerLucarioForm === "normal")
      atkStats.atk += Math.floor(atkStats.atk * 0.08 * state.attackerLucarioJustifiedStacks);
    if (state.attackerLucarioForm === "mega")
      atkStats.atk += Math.floor(atkStats.atk * 0.05 * state.attackerLucarioAdaptabilityStacks);
  }

  // ── Mewtwo X — Pressure + Mega ─────────────────────────────────────────────
  if (state.currentAttacker?.pokemonId === "mewtwo_x") {
    atkStats.atk = Math.floor(atkStats.atk * (1 + state.attackerMewtwoPressureStacks * 0.02 + (state.attackerMewtwoForm === "mega" ? 0.18 : 0)));
  }
  if (state.currentDefender?.pokemonId === "mewtwo_x") {
    defStats.def    = Math.floor(defStats.def    * (1 + state.defenderMewtwoPressureStacks * 0.02 + (state.defenderMewtwoForm === "mega" ? 0.18 : 0)));
    defStats.sp_def = Math.floor(defStats.sp_def * (1 + state.defenderMewtwoPressureStacks * 0.02 + (state.defenderMewtwoForm === "mega" ? 0.18 : 0)));
  }

  // ── Mewtwo Y — Pressure + Mega ─────────────────────────────────────────────
  if (state.currentAttacker?.pokemonId === "mewtwo_y") {
    atkStats.sp_atk = Math.floor(atkStats.sp_atk * (1 + state.attackerMewtwoYPressureStacks * 0.015 + (state.attackerMewtwoYForm === "mega" ? 0.10 : 0)));
  }

  // ── Sylveon — Calm Mind sp_def stacks (défenseur) ──────────────────────────
  if (state.currentDefender?.pokemonId === "sylveon" && state.defenderLevel > 3) {
    defStats.sp_def = Math.floor(defStats.sp_def * (1 + state.defenderPassiveStacks * 0.025));
  }

  // ── Machamp — Power Couple ─────────────────────────────────────────────────
  if (state.currentAttacker?.pokemonId === "machamp" && state.attackerMachampActive) {
    atkStats.atk = Math.floor(atkStats.atk * (1 + state.currentAttacker.passive.bonusPercentAtk / 100));
  }

  // ── Machamp — Cross Chop+ : +3 Atk (flat, permanent) per auto-attack stack, up to 40 (lvl 13) ──
  if (state.currentAttacker?.pokemonId === "machamp" && state.attackerLevel >= 13) {
    const ccStacks = state.attackerMachampCrossChopStacks ?? 0;
    if (ccStacks > 0) atkStats.atk += ccStacks * 3;
  }

  // ── Greninja — Torrent low HP ───────────────────────────────────────────────
  if (state.currentAttacker?.pokemonId === "greninja" && state.attackerHPPercent <= state.currentAttacker.passive.lowHpThreshold) {
    atkStats.atk = Math.floor(atkStats.atk * (1 + state.currentAttacker.passive.bonusPercentAtk / 100));
  }

  // ── Tyranitar — Guts low level ─────────────────────────────────────────────
  if (state.currentAttacker?.pokemonId === "tyranitar" && state.attackerLevel <= 5 && state.attackerTyranitarGutsActive) {
    atkStats.atk = Math.floor(atkStats.atk * 1.30);
  }

  // ── Sylveon — Fairy skin stacks (attaquant) ────────────────────────────────
  if (state.currentAttacker?.pokemonId === "sylveon") {
    const percent = state.attackerLevel <= 3 ? 0.05 : 0.025;
    atkStats.sp_atk = Math.floor(atkStats.sp_atk * (1 + percent * state.attackerPassiveStacks));
  }

  // ── Zeraora — Volt Absorb ──────────────────────────────────────────────────
  if (state.currentAttacker?.pokemonId === "zeraora") {
    atkStats.atk += Math.min(Math.floor(state.attackerZeraoraDamageReceived * 0.08), 200);
  }

  // ── Tinkaton — passive stacks ───────────────────────────────────────────────
  if (state.currentAttacker?.pokemonId === "tinkaton") {
    atkStats.atk = Math.floor(atkStats.atk * (1 + 0.005 * state.attackerPassiveStacks));
  }

  // ── Typhlosion — Blaze +15% Sp. Atk ───────────────────────────────────────
  if (state.currentAttacker?.pokemonId === "typhlosion" && state.attackerTyphlosionBlazeActive) {
    atkStats.sp_atk = Math.floor(atkStats.sp_atk * 1.15);
  }

  // ── Dragonite — Dragon Dance +10/20/30% ATK ────────────────────────────────
  if (state.currentAttacker?.pokemonId === "dragonite") {
    const ddStacks = state.attackerDragonDanceStacks ?? 0;
    if (ddStacks > 0) {
      atkStats.atk = Math.floor(atkStats.atk * (1 + ddStacks * 0.10));
    }
  }

  // ── Miraidon — Charge Beam : +10% Sp. Atk per stack (max 2 stacks) ─────────
  if (state.currentAttacker?.pokemonId === "miraidon") {
    const cbStacks = state.attackerMiraidonChargeBeamStacks ?? 0;
    if (cbStacks > 0) {
      atkStats.sp_atk = Math.floor(atkStats.sp_atk * (1 + cbStacks * 0.10));
    }
  }

  // ── Move Effect stat buffs ──────────────────────────────────────────────────
  applyGreninjaSmokescreenStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyAegislashSacredSwordStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyAegislashIronHeadStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyAzumarillBellyBashStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyBlazikenSpinningFlameKickStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyBuzzwoleLungeStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyDarkraiCalmMindStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyDecidueyeLeafageStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyDecidueyeRazorLeafStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyDodrioTripleTrampleStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyDragapultPhantomForceStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyDuraludonRevolvingRuinStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyFalinksBulkUpStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyFalinksNoRetreatStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyGlaceonFreezeDryStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyHoohSacredFireStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyHoopaRingsUnboundStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyLucarioExtremeSpeedStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyMachampBulkUpStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyMachampDynamicPunchStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyMachampBarrageBlowStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyReshiramDragonDanceStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyScizorSwordsDanceStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyScytherSwordsDanceStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applySylveonCalmMindStatBuff(state.currentAttacker, atkStats, state.attackerLevel);
  applyZacianSacredSwordStatBuff(state.currentAttacker, atkStats, state.attackerLevel);

  // ── Armarouge — Armor Cannon cooldown def debuff ───────────────────────────
  if (state.currentDefender?.pokemonId === 'armarouge' && state.defenderLevel >= 5 && state.defenderArmarougeArmorCannonDebuff) {
    defStats.def    = Math.floor(defStats.def    * 0.95);
    defStats.sp_def = Math.floor(defStats.sp_def * 0.95);
  }

  // ── Blastoise — Rapid Spin+ def buff (one occurrence, no duplicates) ────────
  if (state.currentDefender?.pokemonId === 'blastoise' && state.defenderLevel >= 13 && state.defenderBlastoiseRapidSpinDefBuff) {
    const defBonus = 17 * (state.defenderLevel - 1) + 500;
    defStats.def    += defBonus;
    defStats.sp_def += defBonus;
  }

  // ── Garchomp — Dig (Def/Sp. Def buff on emerging) ───────────────────────────
  if (state.currentDefender?.pokemonId === 'garchomp' && state.defenderLevel >= 5 && state.defenderGarchompDigDefBuff) {
    const defBonus = 25 * (state.defenderLevel - 1) + 25;
    defStats.def    += defBonus;
    defStats.sp_def += defBonus;
  }

  // ── Moltres — Sky Attack : +8% Def & Sp. Def per stack (max 5 stacks) ──────
  if (state.currentDefender?.pokemonId === 'moltres' && state.defenderLevel >= 7) {
    const saStacks = state.defenderMoltresSkyAttackStacks ?? 0;
    if (saStacks > 0) {
      defStats.def    = Math.floor(defStats.def    * (1 + saStacks * 0.08));
      defStats.sp_def = Math.floor(defStats.sp_def * (1 + saStacks * 0.08));
    }
  }

  // ── Aegislash — Sacred Sword def penetration ───────────────────────────────
  if (state.currentAttacker?.pokemonId === 'aegislash' && state.attackerLevel >= 5 && state.attackerAegislashSacredSwordDefPen) {
    defStats.def = Math.floor(defStats.def * 0.75);
  }

  // ── Feraligatr — Crunch : Destructive Fangs (−30% Def cible) ────────────────
  if (state.currentAttacker?.pokemonId === 'feraligatr' && state.attackerLevel >= 5 && state.attackerFeraligatrDestructiveFangsActive) {
    defStats.def = Math.floor(defStats.def * 0.70);
  }

  // ── Talonflame — Flame Charge+ : Defense Pierce plat (3×(Lvl-1)+60) ────────
  if (state.currentAttacker?.pokemonId === 'talonflame' && state.attackerLevel >= 11 && state.attackerTalonflameFlameChargeDefPierceActive) {
    const pierceValue = 3 * (state.attackerLevel - 1) + 60;
    defStats.def = Math.max(0, defStats.def - pierceValue);
  }

  // ── Tinkaton — Thief (debuff) : −10%/−25% Def & Sp. Def sur la cible ───────
  if (state.currentAttacker?.pokemonId === 'tinkaton' && state.attackerLevel >= 5 && state.attackerTinkatonThiefDebuffActive) {
    const percent = state.attackerLevel >= 11 ? 0.25 : 0.10;
    defStats.def    = Math.floor(defStats.def    * (1 - percent));
    defStats.sp_def = Math.floor(defStats.sp_def * (1 - percent));
  }

  // ── Scizor — Boosted Auto Attack : +40% Def per stack (additive, max 3) ────
  if (state.currentDefender?.pokemonId === 'scizor') {
    const aaStacks = state.defenderScizorAutoAttackDefStacks ?? 0;
    if (aaStacks > 0) {
      defStats.def = Math.floor(defStats.def * (1 + aaStacks * 0.40));
    }
  }

  // ── Slowbro — Amnesia : +250 Def (Lv6), +125 Sp. Def also at Lv13 ──────────
  if (state.currentDefender?.pokemonId === 'slowbro' && state.defenderLevel >= 6 && state.defenderSlowbroAmnesiaActive) {
    defStats.def += 250;
    if (state.defenderLevel >= 13) defStats.sp_def += 125;
  }

  // ── Slowbro — Oblivious : expose the manually-set blue HP value on
  // atkStats so heals using "scaling": "blue_hp" (Water Gun, Scald, Surf,
  // Amnesia, Telekinesis) can read it in healCalculator.js.
  if (state.currentAttacker?.pokemonId === 'slowbro') {
    atkStats.blueHp = state.attackerSlowbroObliviousHP ?? 0;
  }

  // ── Snorlax — Block+ : +35% Def & Sp. Def while holding the wall (Lv13) ────
  if (state.currentDefender?.pokemonId === 'snorlax' && state.defenderLevel >= 13 && state.defenderSnorlaxBlockActive) {
    defStats.def    = Math.floor(defStats.def    * 1.35);
    defStats.sp_def = Math.floor(defStats.sp_def * 1.35);
  }

  // ── Sylveon — Calm Mind : +10% Sp. Def for 3s (Lv6) ─────────────────────────
  if (state.currentDefender?.pokemonId === 'sylveon' && state.defenderLevel >= 6 && state.defenderSylveonCalmMindActive) {
    defStats.sp_def = Math.floor(defStats.sp_def * 1.10);
  }

  // ── Tinkaton — Thief (buff) : +10%/+25% Def & Sp. Def per target hit, max 5 ─
  if (state.currentDefender?.pokemonId === 'tinkaton' && state.defenderLevel >= 5) {
    const stacks = Math.min(5, state.defenderTinkatonThiefStacks ?? 0);
    if (stacks > 0) {
      const perStackPct = state.defenderLevel >= 11 ? 0.25 : 0.10;
      defStats.def    = Math.floor(defStats.def    * (1 + stacks * perStackPct));
      defStats.sp_def = Math.floor(defStats.sp_def * (1 + stacks * perStackPct));
    }
  }
}