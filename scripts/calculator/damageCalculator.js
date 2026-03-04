import { state } from './state.js';
import { stackableItems } from './constants.js';

function getBaseStats(pokemon, level) {
  if (pokemon?.pokemonId === "custom-doll" && pokemon.customStats) {
    return {
      hp: pokemon.customStats.hp,
      atk: 0,
      sp_atk: 0,
      def: pokemon.customStats.def,
      sp_def: pokemon.customStats.sp_def
    };
  }
  // Mobs (timerBased or category==='mob') only have stats[0] — don't index by level
  const statIndex = (pokemon?.timerBased || pokemon?.category === 'mob') ? 0 : level - 1;
  const base = pokemon?.stats?.[statIndex] || {};
  return {
    hp: base.hp || 0,
    atk: base.atk || 0,
    sp_atk: base.sp_atk || 0,
    def: base.def || 0,
    sp_def: base.sp_def || 0
  };
}

function applyItemStats(pokemon, stats, items, stacksArray, activatedArray) {
  let { hp, atk, sp_atk, def, sp_def } = stats;

  items.forEach((item, index) => {
    if (!item) return;

    if (item.name === "Wise Glasses" && item.level20) {
      const percent = parseFloat(item.level20.replace('%','').trim())/100;
      sp_atk += Math.floor(stats.sp_atk * percent);
    }

    if (stackableItems.includes(item.name) && item.stack_type === "percent" && item.level20) {
      const stacks = stacksArray[index];
      const valuePerStack = parseFloat(item.level20);
      const totalPercent = valuePerStack * stacks / 100;

      if (item.name === "Accel Bracer" || item.name === "Weakness Policy") atk += Math.floor(stats.atk * totalPercent);
      else if (item.name === "Drive Lens") sp_atk += Math.floor(stats.sp_atk * totalPercent);
    }

    if (item.stats) {
      item.stats.forEach(stat => {
        if (stat.label === "HP") hp += stat.value;
        else if (stat.label === "Attack") atk += stat.value;
        else if (stat.label === "Sp. Attack") sp_atk += stat.value;
        else if (stat.label === "Defense") def += stat.value;
        else if (stat.label === "Sp. Defense") sp_def += stat.value;
      });
    }

    if (item.level20 && item.stack_type === "flat") {
      const stacks = stacksArray[index];
      const bonus = parseFloat(item.level20) * stacks;
      if (item.name === "Attack Weight") atk += Math.floor(bonus);
      else if (item.name === "Sp. Atk Specs") sp_atk += Math.floor(bonus);
      else if (item.name === "Aeos Cookie") hp += Math.floor(bonus);
    }

    if (item.activable && activatedArray[index] && item.activation_effect) {
      item.activation_effect.stats.forEach(stat => {
        const value = stat.value;
        if (!stat.percent) {
          if (stat.label.includes("HP") || stat.label.includes("Shield")) hp += value;
          else if (stat.label.includes("Attack")) atk += value;
        } else {
          const base = stat.label.includes("HP") ? stats.hp :
                       stat.label.includes("Attack") && !stat.label.includes("Sp") ? stats.atk :
                       stat.label.includes("Sp. Attack") ? stats.sp_atk :
                       stat.label.includes("Defense") ? stats.def :
                       stats.sp_def;
          const bonus = Math.floor(base * value/100);
          if (stat.label.toLowerCase().includes("hp") || stat.label.toLowerCase().includes("shield")) hp += bonus;
          else if (stat.label.toLowerCase().includes("attack") && !stat.label.toLowerCase().includes("sp")) atk += bonus;
          else if (stat.label.toLowerCase().includes("sp.") && stat.label.toLowerCase().includes("attack")) sp_atk += bonus;
          else if (stat.label.toLowerCase().includes("defense")) def += bonus;
          else if (stat.label.toLowerCase().includes("sp.") && stat.label.toLowerCase().includes("defense")) sp_def += bonus;
        }
      });
    }
  });

  return { hp, atk, sp_atk, def, sp_def };
}

function applyPokemonBuffs(pokemon, stats) {
  let { hp, atk, sp_atk, def, sp_def } = stats;

  // Buffs spécifiques à l'attaquant
  if (pokemon === state.currentAttacker) {
    if (state.attackerRegisteelBuff) { atk += Math.floor(stats.atk*0.15); sp_atk += Math.floor(stats.sp_atk*0.15); }
    if (state.attackerXAttackBuff) { atk += Math.floor(stats.atk*0.20); sp_atk += Math.floor(stats.sp_atk*0.20); }
    if (state.attackerBlisseyUltBuff) { atk += Math.floor(stats.atk*0.20); sp_atk += Math.floor(stats.sp_atk*0.20); }
    if (state.attackerAlcreamieBuff) {
      if (pokemon.style==="physical") atk += 40;
      else if (pokemon.style==="special") sp_atk += 25;
    }
    if (pokemon?.pokemonId === "gyarados" && state.attackerGyaradosEvolve) { atk += 100; hp += 1200; }
    if (pokemon?.pokemonId === "mega-gyarados" && state.attackerMegaGyaradosEvolve) { atk += 100; hp += 1200; }
    if (pokemon?.pokemonId === "mewtwo_x" && state.attackerMewtwoForm === "mega") { hp = Math.floor(hp * 1.10); }
    if (pokemon?.pokemonId === "mewtwo_y" && state.attackerMewtwoYForm === "mega") { hp = Math.floor(hp * 1.10); }
  }

  // Buffs spécifiques au défenseur
  if (pokemon === state.currentDefender) {
    if (state.defenderRegirockBuff) { def += Math.floor(stats.def*0.30); sp_def += Math.floor(stats.sp_def*0.25); }
    if (pokemon?.pokemonId === "gyarados" && state.defenderGyaradosEvolve) hp += 1200;
    if (pokemon?.pokemonId === "mega-gyarados" && state.defenderMegaGyaradosEvolve) hp += 1200;
    if (pokemon?.pokemonId === "mewtwo_x" && state.defenderMewtwoForm === "mega") { hp = Math.floor(hp * 1.10); }
    if (pokemon?.pokemonId === "mewtwo_y" && state.defenderMewtwoYForm === "mega") { hp = Math.floor(hp * 1.10); }
  }

  // Cas Aegislash
  if (pokemon?.pokemonId === "aegislash") {
    const isAttacker = pokemon === state.currentAttacker;
    const level = isAttacker ? state.attackerLevel : state.defenderLevel;
    const levelMinusOne = level - 1;
    const stance = isAttacker ? state.attackerStance : state.defenderStance;
    if (stance === "sword") atk += 15 * levelMinusOne + 40;
    else { def += 25 * levelMinusOne + 80; sp_def += 20 * levelMinusOne + 40; }
  }

  // Charizard Y
  if (pokemon?.pokemonId==="mega-charizard-y" && pokemon===state.currentAttacker && state.attackerBlazeActive) {
    atk += Math.floor(stats.atk*0.20);
  }

  return { hp, atk, sp_atk, def, sp_def };
}

function applyDebuffs(pokemon, stats) {
  let { hp, atk, sp_atk, def, sp_def } = stats;

  // Débuffs des attaquants
  if (pokemon===state.currentAttacker) {
    let atkMult=1.0, spMult=1.0;

    const atkDebuffs = [
      { flag: state.debuffBuzzwoleLunge, atk:0.70 }, { flag: state.debuffCharizardBurn, atk:0.95 },
      { flag: state.debuffCinderaceBurn, atk:0.95, sp:0.95 }, { flag: state.debuffCramorantFeatherDance, atk:0.70 },
      { flag: state.debuffDodrioTriAttackFlame, atk:0.92 }, { flag: state.debuffDodrioTriAttackFlameSprint, atk:0.88 },
      { flag: state.debuffGengarWillOWisp, atk:0.90, sp:0.95 },
      { flag: state.debuffSlowbroScald, atk:0.40 }, { flag: state.debuffSylveonBabyDollEyes, atk:0.85 },
      { flag: state.debuffTrevenantWillOWisp, atk:0.90, sp:0.95 }, { flag: state.debuffTsareenaTropKick, atk:0.75 },
      { flag: state.debuffInteleonTearfulLook, atk:0.80, sp:0.80 }, { flag: state.debuffHoohFlamethrower, atk:0.80, sp:0.80 },
      { flag: state.debuffHoohSacredFire, atk:0.90 }, { flag: state.debuffHoohSacredFirePlus, atk:0.80 },
      { flag: state.debuffTinkatonIceHammer, atk:0.70, sp:0.85 }, { flag: state.debuffTinkatonIceHammerPlus, atk:0.50, sp:0.70 },
      { flag: state.debuffUmbreonSnarlFinalHit, atk:0.85, sp:0.85 }
    ];

    atkDebuffs.forEach(d => { if(d.flag){ atkMult*=d.atk; if(d.sp) spMult*=d.sp;} });

    if(state.debuffUmbreonSnarl) { atkMult*=Math.pow(0.97,state.umbreonSnarlStacks); spMult*=Math.pow(0.97,state.umbreonSnarlStacks); }
    if(state.debuffSylveonMysticalFire) spMult*=Math.pow(0.85,state.sylveonMysticalFireStacks);

    atk = Math.floor(atk*atkMult);
    sp_atk = Math.floor(sp_atk*spMult);

    if(state.debuffAlcremieCharm){ atk-=30; sp_atk-=20; }

    atk = Math.max(1, atk);
    sp_atk = Math.max(1, sp_atk);
  }

  // Débuffs des défenseurs
  if (pokemon===state.currentDefender) {
    const level = state.defenderLevel;
    let defMult = 1.0;
    let spDefMult = 1.0;
    let defFlat = 0;
    let spDefFlat = 0;

    if (state.defenderAbsolBoosted) defMult *= 0.85;
    if (state.defenderCramorantBoostedGulpMissile) { defMult *= 0.80; spDefMult *= 0.95; }
    if (state.defenderDecidueyeShadowSneak) defMult *= 0.40;
    if (state.defenderDecidueyeShadowSneakPlus) defMult *= 0.20;
    if (state.defenderGlaceonTailWhip) { defMult *= 0.70; spDefMult *= 0.70; }
    if (state.defenderTsareenaBoosted) defMult *= 0.80;
    if (state.defenderUrshifuLiquidation) defMult *= 0.70;
    if (state.defenderWigglytuffSing) { defMult *= 0.75; spDefMult *= 0.75; }
    if (state.defenderUmbreonFakeTears) { defMult *= 0.80; spDefMult *= 0.80; }
    if (state.defenderMewtwoXUnite) defMult *= 0.80;
    if (state.defenderTinkatonThief) { defMult *= 0.90; spDefMult *= 0.90; }
    if (state.defenderTinkatonThiefPlus) { defMult *= 0.75; spDefMult *= 0.75; }

    if (state.defenderGardevoirBoosted) spDefMult *= 0.90;
    if (state.defenderGardevoirPsychic) spDefMult *= Math.pow(0.73, Math.min(state.gardevoirPsychicStacks || 3, 3));
    if (state.defenderHoopaShadowBall) spDefMult *= 0.70;
    if (state.defenderMimePsychic) spDefMult *= Math.pow(0.95, Math.min(state.mimePsychicStacks, 8));
    if (state.defenderSlowbroOblivious) spDefMult *= Math.pow(0.96, Math.min(state.slowbroObliviousStacks, 5));
    if (state.defenderSylveonHyperVoice) spDefMult *= Math.pow(0.80, Math.min(state.sylveonHypervoiceStacks, 4));
    if (state.defenderVenusaurSludgeBomb) spDefMult *= 0.60;
    if (state.defenderMewtwoYUnite) spDefMult *= 0.85;
    if (state.defenderPsyduckTailWhip) spDefMult *= 0.80;
    if (state.defenderPsyduckTailWhipMysterious) spDefMult *= 0.70;
    if (state.defenderPsyduckPsychicPlus) spDefMult *= 0.75;
    if (state.defenderAlolanRaichuStoredPowerPlus) spDefMult *= Math.pow(0.95, Math.min(state.raichuStoredpowerStacks, 3));
    if (state.defenderLatiasDragonBreath) spDefMult *= 0.70;
    if (state.defenderEmpoleonAquaJetTorrent) spDefMult *= 0.40;

    if (state.defenderCeruledgePsychoCut) defFlat += 10 + 2 * (level - 1);
    if (state.defenderCeruledgePsychoCutPlus) defFlat += 15 + 3 * (level - 1);
    if (state.defenderGengarShadowBall) spDefFlat += 80 + 5 * (level - 1);

    def = Math.max(0, Math.floor(def * defMult) - defFlat);
    sp_def = Math.max(0, Math.floor(sp_def * spDefMult) - spDefFlat);
  }

  return { hp, atk, sp_atk, def, sp_def };
}

export function getModifiedStats(pokemon, level, items, stacksArray, activatedArray) {
  let stats = getBaseStats(pokemon, level);
  stats = applyItemStats(pokemon, stats, items, stacksArray, activatedArray);
  stats = applyPokemonBuffs(pokemon, stats);
  stats = applyDebuffs(pokemon, stats);

  return {
    hp: Math.floor(stats.hp),
    atk: Math.floor(stats.atk),
    sp_atk: Math.floor(stats.sp_atk),
    def: Math.floor(stats.def),
    sp_def: Math.floor(stats.sp_def)
  };
}

function applyDefenderDamagePassives(damage, defenderId, defenderMaxHP) {
  if (defenderId === "lapras" && defenderMaxHP !== null) {
    const threshold = defenderMaxHP * 0.10;
    if (damage > threshold) return Math.floor(damage * 0.8);
  }
  return damage;
}

/**
 * Calcule les dégâts d'un move.
 *
 * Champs HP-based supportés dans `dmg` (exclusifs des champs classiques) :
 *
 *   dmg.max_hp_percent      {number}  — X% des HP MAX du défenseur (ignore la défense)
 *   dmg.max_hp_cap          {number}  — plafond optionnel
 *
 *   dmg.missing_hp_percent  {number}  — X% des HP MANQUANTS du défenseur (execute)
 *   dmg.missing_hp_cap      {number}  — plafond optionnel (ex: 1000)
 *
 *   dmg.current_hp_percent  {number}  — X% des HP ACTUELS du défenseur
 *   dmg.current_hp_cap      {number}  — plafond optionnel
 *
 * Exemples JSON :
 *   { "max_hp_percent": 3, "dealDamage": true, "is_tick": true, "tick_count": 21 }
 *   { "missing_hp_percent": 12, "missing_hp_cap": 1000, "dealDamage": true }
 *   { "current_hp_percent": 10, "current_hp_cap": 500, "dealDamage": true }
 *
 * @param {object}  dmg               - entrée damage du JSON
 * @param {number}  atkStat           - stat d'attaque de l'attaquant
 * @param {number}  defStat           - stat de défense du défenseur
 * @param {number}  level             - niveau de l'attaquant
 * @param {boolean} crit              - coup critique ?
 * @param {string}  pokemonId         - id de l'attaquant
 * @param {number}  extraCritMult     - multiplicateur crit additionnel (Scope Lens…)
 * @param {number}  globalDamageMult  - multiplicateur global (buffs, debuffs…)
 * @param {number}  defenderMaxHP     - HP MAX du défenseur
 * @param {number}  defenderCurrentHP - HP ACTUELS du défenseur (après slider %)
 */
export function calculateDamage(
  dmg,
  atkStat,
  defStat,
  level,
  crit = false,
  pokemonId = null,
  extraCritMult = 1.0,
  globalDamageMult = 1.0,
  defenderMaxHP = null,
  defenderCurrentHP = null
) {

  // ── Helper crit mutualisé ───────────────────────────────────────────────────
  const applyCrit = (value) => {
    if (!crit) return value;
    let baseCritMult = 2.0;
    if (pokemonId === "azumarill") baseCritMult = 1.7;
    else if (pokemonId === "sirfetchd") baseCritMult = 1.6;
    else if (pokemonId === "inteleon") baseCritMult = 2.5;
    if (state.currentDefender?.pokemonId === "falinks") baseCritMult *= 0.5;
    return Math.floor(value * baseCritMult * extraCritMult);
  };

  // ── % HP MAX du défenseur ───────────────────────────────────────────────────
  if (dmg.max_hp_percent != null && defenderMaxHP != null) {
    let raw = Math.floor(defenderMaxHP * dmg.max_hp_percent / 100);
    if (dmg.max_hp_cap != null) raw = Math.min(raw, dmg.max_hp_cap);
    let final = Math.floor(raw * globalDamageMult);
    final = applyCrit(final);
    return Math.max(1, final);
  }

  // ── % HP MANQUANTS du défenseur (execute) ───────────────────────────────────
  if (dmg.missing_hp_percent != null && defenderMaxHP != null && defenderCurrentHP != null) {
    const missingHP = Math.max(0, defenderMaxHP - defenderCurrentHP);
    let raw = Math.floor(missingHP * dmg.missing_hp_percent / 100);
    if (dmg.missing_hp_cap != null) raw = Math.min(raw, dmg.missing_hp_cap);
    let final = Math.floor(raw * globalDamageMult);
    final = applyCrit(final);
    // 0 est valide : défenseur à 100% HP = 0 dégât execute
    return Math.max(0, final);
  }

  // ── % HP ACTUELS du défenseur ───────────────────────────────────────────────
  if (dmg.current_hp_percent != null && defenderCurrentHP != null) {
    let raw = Math.floor(defenderCurrentHP * dmg.current_hp_percent / 100);
    if (dmg.current_hp_cap != null) raw = Math.min(raw, dmg.current_hp_cap);
    let final = Math.floor(raw * globalDamageMult);
    final = applyCrit(final);
    return Math.max(1, final);
  }

  // ── Dégâts classiques (stat-based) ─────────────────────────────────────────
  const atkScaling = Math.floor(atkStat * (dmg.multiplier / 100));
  const levelScaling = (level - 1) * dmg.levelCoef;
  let baseDamage = dmg.constant + atkScaling + levelScaling;

  let effectiveDef = defStat;

  if (state.currentDefender?.pokemonId === "armarouge" && state.defenderFlashFireActive) {
    effectiveDef = Math.floor(effectiveDef / (1 - 0.20));
  }

  const defReduction = 100 / (100 + effectiveDef * 0.165);
  let finalDamage = Math.floor(baseDamage * defReduction);

  finalDamage = applyCrit(finalDamage);
  finalDamage = Math.floor(finalDamage * globalDamageMult);

  finalDamage = applyDefenderDamagePassives(
    finalDamage,
    state.currentDefender?.pokemonId,
    defenderMaxHP
  );

  return Math.max(1, finalDamage);
}

export function getAutoAttackResults(atkStats, defStats, currentDefHP, globalDamageMult = 1.0) {
  const results = {
    normal: 0,
    crit: 0,
    muscleExtra: 0,
    muscleTotalNormal: 0,
    muscleTotalCrit: 0,
    scopeExtra: 0,
    totalCritWithScope: 0,
    scopePercent: 0,
    hasMuscle: false,
    hasScope: false
  };

  results.normal = calculateDamage(
    { constant: 0, multiplier: 100, levelCoef: 0 },
    atkStats.atk,
    defStats.def,
    state.attackerLevel,
    false,
    state.currentAttacker.pokemonId,
    1.0,
    globalDamageMult,
    defStats.hp,
    currentDefHP
  );

  let scopeCritBonus = 1.0;
  state.attackerItems.forEach(item => {
    if (item && item.name === "Scope Lens" && item.stats) {
      const critStat = item.stats.find(s => s.label === "Critical-Hit Damage");
      if (critStat && critStat.value) {
        scopeCritBonus = critStat.value;
        results.hasScope = true;
      }
    }
  });

  results.crit = calculateDamage(
    { constant: 0, multiplier: 100, levelCoef: 0 },
    atkStats.atk,
    defStats.def,
    state.attackerLevel,
    true,
    state.currentAttacker.pokemonId,
    scopeCritBonus,
    globalDamageMult,
    defStats.hp,
    currentDefHP
  );

  state.attackerItems.forEach(item => {
    if (item && item.name === "Muscle Band" && item.level20) {
      results.hasMuscle = true;
      const percent = parseFloat(item.level20.replace('%', '') / 100);
      const rawExtra = Math.floor(currentDefHP * percent);

      let muscleExtraUncapped = calculateDamage(
        { constant: rawExtra, multiplier: 0, levelCoef: 0 },
        atkStats.atk,
        defStats.def,
        state.attackerLevel,
        false,
        null,
        1.0,
        globalDamageMult,
        defStats.hp,
        currentDefHP
      );

      const isEnemy = state.currentDefender?.category !== "mob";
      if (isEnemy) {
        muscleExtraUncapped = Math.min(muscleExtraUncapped, 360);
      }

      results.muscleExtra = muscleExtraUncapped;
      results.muscleTotalNormal = results.normal + results.muscleExtra;
      results.muscleTotalCrit = results.crit + results.muscleExtra;
    }

    if (item && item.name === "Scope Lens") {
      results.hasScope = true;
      let percent = 45;
      if (item.level20 === "75%") percent = 75;
      else if (item.level20) percent = parseInt(item.level20.replace('%', '')) || 45;

      results.scopePercent = percent;
      const extraBase = Math.floor(atkStats.atk * (percent / 100));

      results.scopeExtra = calculateDamage(
        { constant: extraBase, multiplier: 0, levelCoef: 0 },
        atkStats.atk,
        defStats.def,
        state.attackerLevel,
        false,
        null,
        1.0,
        globalDamageMult,
        defStats.hp,
        currentDefHP
      );

      results.totalCritWithScope = results.crit + results.scopeExtra;
    }
  });

  return results;
}