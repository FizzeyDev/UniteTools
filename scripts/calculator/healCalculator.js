/**
 * healCalculator.js
 *
 * Champs HP-based supportés (exclusifs des champs classiques) :
 *   missing_hp_percent / missing_hp_cap  — X% HP manquants du lanceur
 *   max_hp_percent     / max_hp_cap      — X% HP max du lanceur
 *   current_hp_percent / current_hp_cap  — X% HP actuels du lanceur
 *
 * Formule classique : constant + floor(relevantStat * multiplier / 100) + (level-1) * levelCoef
 */

export function calculateHeal(heal, atkStats, level, casterCurrentHP = null) {

  // % HP MANQUANTS du lanceur
  if (heal.missing_hp_percent != null && atkStats.hp != null) {
    const currentHP = casterCurrentHP ?? atkStats.hp;
    const missingHP = Math.max(0, atkStats.hp - currentHP);
    let raw = Math.floor(missingHP * heal.missing_hp_percent / 100);
    if (heal.missing_hp_cap != null) raw = Math.min(raw, heal.missing_hp_cap);
    return Math.max(0, raw);
  }

  // % HP MAX du lanceur
  if (heal.max_hp_percent != null && atkStats.hp != null) {
    let raw = Math.floor(atkStats.hp * heal.max_hp_percent / 100);
    if (heal.max_hp_cap != null) raw = Math.min(raw, heal.max_hp_cap);
    return Math.max(0, raw);
  }

  // % HP ACTUELS du lanceur
  if (heal.current_hp_percent != null && atkStats.hp != null) {
    const currentHP = casterCurrentHP ?? atkStats.hp;
    let raw = Math.floor(currentHP * heal.current_hp_percent / 100);
    if (heal.current_hp_cap != null) raw = Math.min(raw, heal.current_hp_cap);
    return Math.max(0, raw);
  }

  // Heal classique (stat-based)
  let relevantStat;
  switch (heal.scaling) {
    case "atk":    relevantStat = atkStats.atk;    break;
    case "hp":     relevantStat = atkStats.hp;     break;
    case "sp_atk":
    default:       relevantStat = atkStats.sp_atk; break;
  }

  const statPart  = Math.floor(relevantStat * (heal.multiplier || 0) / 100);
  const levelPart = (level - 1) * (heal.levelCoef || 0);
  const constant  = heal.constant || 0;

  return Math.max(0, constant + statPart + levelPart);
}

export function renderHealLine(heal, atkStats, level, bigRootMult = 1.0, rescueMult = 1.0, curseMult = 1.0, casterCurrentHP = null) {
  const base = calculateHeal(heal, atkStats, level, casterCurrentHP);
  const self = Math.floor(base * bigRootMult * curseMult);
  const ally = Math.floor(base * rescueMult  * curseMult);

  const target    = heal.target || "both";
  const forSelf   = target === "self"  || target === "both";
  const forAllies = target === "ally"  || target === "both";

  const isTick    = !!heal.is_tick;
  const tickCount = heal.tick_count || 1;

  const selfOnlyBadge = (target === "self")
    ? `<span class="dmg-target-badge dmg-target-self" title="Lanceur uniquement">🧬</span>`
    : "";
  const allyOnlyBadge = (target === "ally")
    ? `<span class="dmg-target-badge dmg-target-ally" title="Alliés uniquement">🤝</span>`
    : "";

  const allyAttr = forAllies ? `data-ally-heal="${ally}"` : `data-no-allies="true"`;

  if (isTick) {
    const selfTotal = self * tickCount;
    const allyTotal = ally * tickCount;
    const allyAttrTick = forAllies
      ? `data-ally-heal="${ally}" data-ally-heal-total="${allyTotal}"`
      : `data-no-allies="true"`;
    return `
      <span class="dmg-name">${selfOnlyBadge}${allyOnlyBadge}${heal.name}${heal.notes ? `<br><i>${heal.notes}</i>` : ""}</span>
      <div class="dmg-values" ${allyAttrTick}>
        ${forSelf ? `<span class="dmg-heal heal-tick-toggle"
              data-base="${self}" data-total="${selfTotal}" data-ticks="${tickCount}"
              title="Cliquez pour afficher le total (${tickCount} ticks)"
        >${self.toLocaleString()}<sup class="tick-badge">×${tickCount}</sup></span>` : ""}
      </div>
    `;
  }

  return `
    <span class="dmg-name">${selfOnlyBadge}${allyOnlyBadge}${heal.name}${heal.notes ? `<br><i>${heal.notes}</i>` : ""}</span>
    <div class="dmg-values" ${allyAttr}>
      ${forSelf ? `<span class="dmg-heal">${self.toLocaleString()}</span>` : ""}
    </div>
  `;
}