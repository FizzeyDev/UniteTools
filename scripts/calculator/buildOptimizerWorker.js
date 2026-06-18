/**
 * buildOptimizerWorker.js
 * Web Worker — moteur de recherche du Build Optimizer.
 * Fonctions pures copiées/adaptées depuis damageCalculator.js & healCalculator.js
 * SANS dépendance à `state` (tout est passé en paramètre).
 */

// ─────────────────────────────────────────────────────────────────────────────
// STACKABLE ITEMS (copié depuis constants.js)
// ─────────────────────────────────────────────────────────────────────────────
const STACKABLE_ITEMS = [
  'Attack Weight', 'Sp. Atk Specs', 'Aeos Cookie',
  'Drive Lens', 'Accel Bracer', 'Weakness Policy'
];

// ─────────────────────────────────────────────────────────────────────────────
// STATS PURES (sans state)
// ─────────────────────────────────────────────────────────────────────────────
function getBaseStats(pokemon, level) {
  if (!pokemon) return { hp: 0, atk: 0, sp_atk: 0, def: 0, sp_def: 0 };
  const statIndex = (pokemon.timerBased || pokemon.category === 'mob') ? 0 : level - 1;
  const base = pokemon.stats?.[statIndex] || {};
  return {
    hp:     base.hp     || 0,
    atk:    base.atk    || 0,
    sp_atk: base.sp_atk || 0,
    def:    base.def    || 0,
    sp_def: base.sp_def || 0
  };
}

function applyItemStatsPure(pokemon, stats, items, stacksArray, activatedArray) {
  let { hp, atk, sp_atk, def, sp_def } = stats;

  items.forEach((item, index) => {
    if (!item) return;

    if (item.name === 'Wise Glasses' && item.level20) {
      const percent = parseFloat(item.level20.replace('%', '').trim()) / 100;
      sp_atk += Math.floor(stats.sp_atk * percent);
    }

    if (STACKABLE_ITEMS.includes(item.name) && item.stack_type === 'percent' && item.level20) {
      const stacks = stacksArray[index];
      const valuePerStack = parseFloat(item.level20);
      const totalPercent = valuePerStack * stacks / 100;
      if (item.name === 'Accel Bracer' || item.name === 'Weakness Policy') atk += Math.floor(stats.atk * totalPercent);
      else if (item.name === 'Drive Lens') sp_atk += Math.floor(stats.sp_atk * totalPercent);
    }

    if (item.stats) {
      item.stats.forEach(stat => {
        if (stat.label === 'HP')          hp     += stat.value;
        else if (stat.label === 'Attack') atk    += stat.value;
        else if (stat.label === 'Sp. Attack') sp_atk += stat.value;
        else if (stat.label === 'Defense')    def    += stat.value;
        else if (stat.label === 'Sp. Defense') sp_def += stat.value;
      });
    }

    if (item.level20 && item.stack_type === 'flat') {
      const stacks = stacksArray[index];
      const bonus = parseFloat(item.level20) * stacks;
      if (item.name === 'Attack Weight')  atk    += Math.floor(bonus);
      else if (item.name === 'Sp. Atk Specs') sp_atk += Math.floor(bonus);
      else if (item.name === 'Aeos Cookie')    hp     += Math.floor(bonus);
    }

    if (item.activable && activatedArray[index] && item.activation_effect) {
      item.activation_effect.stats.forEach(stat => {
        const value = stat.value;
        if (!stat.percent) {
          if (stat.label.includes('HP') || stat.label.includes('Shield')) hp += value;
          else if (stat.label.includes('Attack')) atk += value;
        } else {
          const base = stat.label.includes('HP') ? stats.hp
            : stat.label.includes('Attack') && !stat.label.includes('Sp') ? stats.atk
            : stat.label.includes('Sp. Attack') ? stats.sp_atk
            : stat.label.includes('Defense') ? stats.def
            : stats.sp_def;
          const bonus = Math.floor(base * value / 100);
          const lbl = stat.label.toLowerCase();
          if (lbl.includes('hp') || lbl.includes('shield')) hp += bonus;
          else if (lbl.includes('attack') && !lbl.includes('sp')) atk += bonus;
          else if (lbl.includes('sp.') && lbl.includes('attack')) sp_atk += bonus;
          else if (lbl.includes('defense') && !lbl.includes('sp')) def += bonus;
          else if (lbl.includes('sp.') && lbl.includes('defense')) sp_def += bonus;
        }
      });
    }
  });

  return { hp, atk, sp_atk, def, sp_def };
}

function getModifiedStatsPure(pokemon, level, items, stacksArray, activatedArray) {
  let stats = getBaseStats(pokemon, level);
  stats = applyItemStatsPure(pokemon, stats, items, stacksArray, activatedArray);
  return {
    hp:     Math.floor(stats.hp),
    atk:    Math.floor(stats.atk),
    sp_atk: Math.floor(stats.sp_atk),
    def:    Math.floor(stats.def),
    sp_def: Math.floor(stats.sp_def)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCUL DÉGÂTS PUR (sans state)
// ─────────────────────────────────────────────────────────────────────────────
function calculateDamagePure(dmg, atkStat, defStat, level, globalDamageMult = 1.0, defenderMaxHP = null, defenderCurrentHP = null) {
  // % HP MAX
  if (dmg.max_hp_percent != null && defenderMaxHP != null) {
    let raw = Math.floor(defenderMaxHP * dmg.max_hp_percent / 100);
    if (dmg.max_hp_cap != null) raw = Math.min(raw, dmg.max_hp_cap);
    return Math.max(1, Math.floor(raw * globalDamageMult));
  }
  // % HP manquants
  if (dmg.missing_hp_percent != null && defenderMaxHP != null && defenderCurrentHP != null) {
    const missing = Math.max(0, defenderMaxHP - defenderCurrentHP);
    let raw = Math.floor(missing * dmg.missing_hp_percent / 100);
    if (dmg.missing_hp_cap != null) raw = Math.min(raw, dmg.missing_hp_cap);
    return Math.max(0, Math.floor(raw * globalDamageMult));
  }
  // % HP actuels
  if (dmg.current_hp_percent != null && defenderCurrentHP != null) {
    let raw = Math.floor(defenderCurrentHP * dmg.current_hp_percent / 100);
    if (dmg.current_hp_cap != null) raw = Math.min(raw, dmg.current_hp_cap);
    return Math.max(1, Math.floor(raw * globalDamageMult));
  }
  // Classique
  const atkScaling  = Math.floor(atkStat * (dmg.multiplier / 100));
  const levelScaling = (level - 1) * (dmg.levelCoef || 0);
  const baseDamage  = (dmg.constant || 0) + atkScaling + levelScaling;
  const defReduction = 100 / (100 + defStat * 0.165);
  const finalDamage  = Math.floor(Math.floor(baseDamage * defReduction) * globalDamageMult);
  return Math.max(1, finalDamage);
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCUL HEAL PUR
// ─────────────────────────────────────────────────────────────────────────────
function calculateHealPure(heal, atkStats, level) {
  if (heal.missing_hp_percent != null) {
    const missingHP = atkStats.hp; // On suppose HP max (cas optimizer: HP complet)
    let raw = Math.floor(missingHP * heal.missing_hp_percent / 100);
    if (heal.missing_hp_cap != null) raw = Math.min(raw, heal.missing_hp_cap);
    return Math.max(0, raw);
  }
  if (heal.max_hp_percent != null) {
    let raw = Math.floor(atkStats.hp * heal.max_hp_percent / 100);
    if (heal.max_hp_cap != null) raw = Math.min(raw, heal.max_hp_cap);
    return Math.max(0, raw);
  }
  if (heal.current_hp_percent != null) {
    let raw = Math.floor(atkStats.hp * heal.current_hp_percent / 100);
    if (heal.current_hp_cap != null) raw = Math.min(raw, heal.current_hp_cap);
    return Math.max(0, raw);
  }

  let relevantStat;
  switch (heal.scaling) {
    case 'atk':    relevantStat = atkStats.atk;    break;
    case 'hp':     relevantStat = atkStats.hp;     break;
    case 'sp_atk':
    default:       relevantStat = atkStats.sp_atk; break;
  }
  const statPart  = Math.floor(relevantStat * (heal.multiplier || 0) / 100);
  const levelPart = (level - 1) * (heal.levelCoef || 0);
  return Math.max(0, (heal.constant || 0) + statPart + levelPart);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE HEAL
// ─────────────────────────────────────────────────────────────────────────────
function scoreHeal(pokemon, level, items, stacksArray, activatedArray, mode) {
  const atkStats = getModifiedStatsPure(pokemon, level, items, stacksArray, activatedArray);
  let total = 0;

  for (const move of (pokemon.moves || [])) {
    // Vérifier que le move est disponible à ce niveau
    if (move.learnLevel != null && move.learnLevel > level) continue;
    if (move.unlearn != null && level >= move.unlearn) continue;

    for (const heal of (move.heals || [])) {
      const target = heal.target || 'both';
      const counts = mode === 'heal_ally'
        ? (target === 'ally' || target === 'both')
        : (target === 'self' || target === 'both');
      if (!counts) continue;

      const amount = calculateHealPure(heal, atkStats, level);
      const ticks = heal.is_tick ? (heal.tick_count || 1) : 1;
      total += amount * ticks;
    }

    // Heal du passif (passive.heals[])
  }

  // Passive heals
  for (const heal of (pokemon.passive?.heals || [])) {
    const target = heal.target || 'both';
    const counts = mode === 'heal_ally'
      ? (target === 'ally' || target === 'both')
      : (target === 'self' || target === 'both');
    if (!counts) continue;
    const amount = calculateHealPure(heal, atkStats, level);
    const ticks = heal.is_tick ? (heal.tick_count || 1) : 1;
    total += amount * ticks;
  }

  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE DÉGÂTS sur un ennemi
// ─────────────────────────────────────────────────────────────────────────────
function scoreDamageVsEnemy(attacker, atkLevel, atkItems, atkStacks, atkActivated,
                             enemy, defLevel, defItems, defStacks, defActivated,
                             enabledMoveNames) {
  const atkStats = getModifiedStatsPure(attacker, atkLevel, atkItems, atkStacks, atkActivated);
  const defStats = getModifiedStatsPure(enemy, defLevel, defItems, defStacks, defActivated);

  const defHP = defStats.hp;
  const defCurrentHP = defHP; // on suppose plein HP pour l'optimizer

  let total = 0;

  for (const move of (attacker.moves || [])) {
    if (move.learnLevel != null && move.learnLevel > atkLevel) continue;
    if (move.unlearn != null && atkLevel >= move.unlearn) continue;
    if (!enabledMoveNames.includes(move.name)) continue;

    for (const dmg of (move.damages || [])) {
      if (!dmg.dealDamage) continue;

      const isPhysical = attacker.style === 'physical';
      const atkStat = isPhysical ? atkStats.atk : atkStats.sp_atk;
      const defStat = isPhysical ? defStats.def  : defStats.sp_def;

      const dmgVal = calculateDamagePure(dmg, atkStat, defStat, atkLevel, 1.0, defHP, defCurrentHP);
      const ticks  = dmg.is_tick ? (dmg.tick_count || 1) : 1;
      total += dmgVal * ticks;
    }
  }

  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// STACKS PAR DÉFAUT POUR L'OPTIMIZER
// ─────────────────────────────────────────────────────────────────────────────
function defaultStacksForItem(item) {
  if (!STACKABLE_ITEMS.includes(item.name)) return 0;
  const max = item.name === 'Weakness Policy' ? 4
    : (item.name.includes('Accel') || item.name.includes('Drive')) ? 20
    : 6;
  return Math.floor(max / 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATEUR DE COMBINAISONS C(n, 3)
// ─────────────────────────────────────────────────────────────────────────────
function* combinations3(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 2; i++) {
    for (let j = i + 1; j < n - 1; j++) {
      for (let k = j + 1; k < n; k++) {
        yield [arr[i], arr[j], arr[k]];
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────────────────────
self.onmessage = function(e) {
  const { mode, attacker, level, availableItems, fixedItems, enemies, enabledMovesByEnemy } = e.data;

  // Construire la liste d'items candidats (en retirant les fixés)
  const fixedNames = new Set(fixedItems.filter(Boolean).map(i => i.name));
  const candidates = availableItems.filter(item => !fixedNames.has(item.name));

  // Nombre de slots libres
  const fixedSlots = fixedItems.filter(Boolean);
  const freeSlots  = 3 - fixedSlots.length;

  // Toutes les combinations d'items pour les slots libres
  let combosSource;
  if (freeSlots === 3) {
    combosSource = [...combinations3(candidates)];
  } else if (freeSlots === 2) {
    const pairs = [];
    for (let i = 0; i < candidates.length - 1; i++)
      for (let j = i + 1; j < candidates.length; j++)
        pairs.push([candidates[i], candidates[j]]);
    combosSource = pairs;
  } else if (freeSlots === 1) {
    combosSource = candidates.map(c => [c]);
  } else {
    combosSource = [[]];
  }

  const total = combosSource.length;
  const results = [];
  let processed = 0;
  let lastProgressPct = 0;

  for (const freeCombo of combosSource) {
    // Construire les 3 items du build
    const buildItems = [...fixedSlots, ...freeCombo];
    // Compléter à 3 avec null si besoin
    while (buildItems.length < 3) buildItems.push(null);

    // Stacks et activations
    const buildStacks    = buildItems.map(it => it ? defaultStacksForItem(it) : 0);
    const buildActivated = buildItems.map(it => it?.activable ? true : false);

    let score = 0;
    const details = [];

    if (mode === 'heal_self' || mode === 'heal_ally') {
      score = scoreHeal(attacker, level, buildItems, buildStacks, buildActivated, mode);
      details.push({ label: 'Total Heal', value: score });

    } else if (mode === 'damage') {
      for (let ei = 0; ei < enemies.length; ei++) {
        const enemy   = enemies[ei];
        const weight  = enemy.priority ? 2 : 1;
        const enabled = enabledMovesByEnemy?.[ei] ?? attacker.moves?.map(m => m.name) ?? [];
        const dmg = scoreDamageVsEnemy(
          attacker, level, buildItems, buildStacks, buildActivated,
          enemy.pokemon, enemy.level, enemy.items, enemy.stacks, enemy.activated,
          enabled
        );
        details.push({ label: enemy.pokemon.displayName, value: dmg, weight, priority: enemy.priority });
        score += dmg * weight;
      }

    } else if (mode === 'defense') {
      // Score = damage received from priority enemies (minimize).
      // Fallback: if no enemy is marked priority, use all enemies.
      const hasPriority = enemies.some(en => en.priority);
      for (let ei = 0; ei < enemies.length; ei++) {
        const enemy   = enemies[ei];
        const enabled = enabledMovesByEnemy?.[ei] ?? enemy.pokemon.moves?.map(m => m.name) ?? [];
        // Enemy attacks our Pokémon: roles reversed
        const dmg = scoreDamageVsEnemy(
          enemy.pokemon, enemy.level, enemy.items, enemy.stacks, enemy.activated,
          attacker, level, buildItems, buildStacks, buildActivated,
          enabled
        );
        details.push({ label: enemy.pokemon.displayName, value: dmg, priority: enemy.priority });
        // Count priority enemies; if none defined, count all
        if (enemy.priority || !hasPriority) score += dmg;
      }
    }

    results.push({ items: buildItems, stacks: buildStacks, score, details });

    processed++;
    const pct = Math.floor((processed / total) * 100);
    if (pct >= lastProgressPct + 5) {
      lastProgressPct = pct;
      self.postMessage({ type: 'progress', pct, processed, total });
    }
  }

  // Trier
  if (mode === 'defense') {
    results.sort((a, b) => a.score - b.score); // minimiser
  } else {
    results.sort((a, b) => b.score - a.score); // maximiser
  }

  self.postMessage({ type: 'done', results: results.slice(0, 5) });
};