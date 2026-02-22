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
  const base = pokemon?.stats?.[level - 1] || {};
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

    // --- Réductions % de DEF ---
    // Absol: Boosted (-15% Def)
    if (state.defenderAbsolBoosted) defMult *= 0.85;
    // Cramorant: Boosted/Gulp Missile (-20% Def / -5% Sp.Def)
    if (state.defenderCramorantBoostedGulpMissile) { defMult *= 0.80; spDefMult *= 0.95; }
    // Decidueye: Shadow Sneak (-60% Def)
    if (state.defenderDecidueyeShadowSneak) defMult *= 0.40;
    // Decidueye: Shadow Sneak + (-80% Def)
    if (state.defenderDecidueyeShadowSneakPlus) defMult *= 0.20;
    // Glaceon: Tail Whip (-30% Def / Sp.Def)
    if (state.defenderGlaceonTailWhip) { defMult *= 0.70; spDefMult *= 0.70; }
    // Tsareena: Boosted (-20% Def)
    if (state.defenderTsareenaBoosted) defMult *= 0.80;
    // Urshifu: Liquidation (-30% Def)
    if (state.defenderUrshifuLiquidation) defMult *= 0.70;
    // Wigglytuff: Sing (-25% Def / Sp.Def)
    if (state.defenderWigglytuffSing) { defMult *= 0.75; spDefMult *= 0.75; }
    // Umbreon: Fake Tears (-20% Def / Sp.Def)
    if (state.defenderUmbreonFakeTears) { defMult *= 0.80; spDefMult *= 0.80; }
    // Mewtwo X: Unite (-20% Def)
    if (state.defenderMewtwoXUnite) defMult *= 0.80;
    // Tinkaton: Thief (-10% Def / Sp.Def)
    if (state.defenderTinkatonThief) { defMult *= 0.90; spDefMult *= 0.90; }
    // Tinkaton: Thief + (-25% Def / Sp.Def)
    if (state.defenderTinkatonThiefPlus) { defMult *= 0.75; spDefMult *= 0.75; }

    // --- Réductions % de Sp.Def ---
    // Gardevoir: Boosted (-10% Sp.Def)
    if (state.defenderGardevoirBoosted) spDefMult *= 0.90;
    // Gardevoir: Psychic (-27% Sp.Def x3 stacks, auto-max si pas de stacks définis)
    if (state.defenderGardevoirPsychic) spDefMult *= Math.pow(0.73, Math.min(state.gardevoirPsychicStacks || 3, 3));
    // Hoopa: Shadow Ball (-30% Sp.Def)
    if (state.defenderHoopaShadowBall) spDefMult *= 0.70;
    // Mr. Mime: Psychic (-5% Sp.Def x8 stacks)
    if (state.defenderMimePsychic) spDefMult *= Math.pow(0.95, Math.min(state.mimePsychicStacks, 8));
    // Slowbro: Oblivious (-4% Sp.Def x5 stacks)
    if (state.defenderSlowbroOblivious) spDefMult *= Math.pow(0.96, Math.min(state.slowbroObliviousStacks, 5));
    // Sylveon: Hyper Voice (-20% Sp.Def x4 stacks)
    if (state.defenderSylveonHyperVoice) spDefMult *= Math.pow(0.80, Math.min(state.sylveonHypervoiceStacks, 4));
    // Venusaur: Sludge Bomb (-40% Sp.Def)
    if (state.defenderVenusaurSludgeBomb) spDefMult *= 0.60;
    // Mewtwo Y: Unite (-15% Sp.Def)
    if (state.defenderMewtwoYUnite) spDefMult *= 0.85;
    // Psyduck: Tail Whip (-20% Sp.Def)
    if (state.defenderPsyduckTailWhip) spDefMult *= 0.80;
    // Psyduck: Tail Whip Mysterious (-30% Sp.Def)
    if (state.defenderPsyduckTailWhipMysterious) spDefMult *= 0.70;
    // Psyduck: Psychic + (-25% Sp.Def)
    if (state.defenderPsyduckPsychicPlus) spDefMult *= 0.75;
    // Alolan Raichu: Stored Power + (-5% Sp.Def x3 stacks)
    if (state.defenderAlolanRaichuStoredPowerPlus) spDefMult *= Math.pow(0.95, Math.min(state.raichuStoredpowerStacks, 3));
    // Latias: Dragon Breath (-30% Sp.Def)
    if (state.defenderLatiasDragonBreath) spDefMult *= 0.70;
    // Empoleon: Aqua Jet Torrent (-60% Sp.Def)
    if (state.defenderEmpoleonAquaJetTorrent) spDefMult *= 0.40;

    // --- Réductions flat de DEF ---
    // Ceruledge: Psycho Cut (-10-(2*(Lv-1)) Def)
    if (state.defenderCeruledgePsychoCut) defFlat += 10 + 2 * (level - 1);
    // Ceruledge: Psycho Cut + (-15-(3*(Lv-1)) Def)
    if (state.defenderCeruledgePsychoCutPlus) defFlat += 15 + 3 * (level - 1);

    // --- Réductions flat de Sp.Def ---
    // Gengar: Shadow Ball (-80-(5*(Lv-1)) Sp.Def)
    if (state.defenderGengarShadowBall) spDefFlat += 80 + 5 * (level - 1);

    // Application
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

export function calculateDamage(dmg, atkStat, defStat, level, crit = false, pokemonId = null, extraCritMult = 1.0, globalDamageMult = 1.0, defenderMaxHP = null) {
  const atkScaling = Math.floor(atkStat * (dmg.multiplier / 100));
  const levelScaling = (level - 1) * dmg.levelCoef;
  let baseDamage = dmg.constant + atkScaling + levelScaling;

  let effectiveDef = defStat;

  if (state.currentDefender?.pokemonId === "armarouge" && state.defenderFlashFireActive) {
    effectiveDef = Math.floor(effectiveDef / (1 - 0.20));
  }

  const defReduction = 100 / (100 + effectiveDef * 0.165);
  let finalDamage = Math.floor(baseDamage * defReduction);

  if (crit) {
    let baseCritMult = 2.0;
    if (pokemonId === "azumarill") baseCritMult = 1.7;
    else if (pokemonId === "sirfetchd") baseCritMult = 1.6;
    else if (pokemonId === "inteleon") baseCritMult = 2.5;

    if (state.currentDefender?.pokemonId === "falinks") {
      baseCritMult *= 0.5;
    }

    finalDamage = Math.floor(finalDamage * baseCritMult * extraCritMult);
  }

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
    defStats.hp
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
    defStats.hp
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
        defStats.hp
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
        defStats.hp
      );

      results.totalCritWithScope = results.crit + results.scopeExtra;
    }
  });

  return results;
}