/**
 * shieldCalculator.js
 * Calcule les boucliers (shields) des moves.
 *
 * Structure JSON attendue dans move.shields[] :
 * {
 *   "name":       "Shield",
 *   "scaling":    "sp_atk" | "atk" | "hp",   // stat de référence
 *   "multiplier": 50,                          // % de la stat
 *   "levelCoef":  0,                           // bonus flat par niveau
 *   "constant":   100,                         // bonus flat fixe
 *   "target":     "self" | "ally" | "both",    // optionnel, défaut "both"
 *                   "self"  → lanceur uniquement (pas de badge allié)
 *                   "ally"  → alliés uniquement
 *                   "both"  → lanceur + alliés (comportement par défaut)
 *   "is_tick":    true,                        // optionnel, valeur par tick
 *   "tick_count": 6,                           // nb de ticks si is_tick
 *   "notes":      "..."                        // optionnel
 * }
 *
 * Formule : constant + floor(relevantStat * multiplier / 100) + (level - 1) * levelCoef
 * → Pas de réduction de défense (c'est un bouclier, pas un dégât).
 *
 * Si scaling === "hp", la stat de référence est les HP MAX de l'attaquant.
 */

export function calculateShield(shield, atkStats, level) {
  let relevantStat;

  switch (shield.scaling) {
    case "atk":
      relevantStat = atkStats.atk;
      break;
    case "hp":
      relevantStat = atkStats.hp;
      break;
    case "sp_atk":
    default:
      relevantStat = atkStats.sp_atk;
      break;
  }

  const statPart  = Math.floor(relevantStat * (shield.multiplier || 0) / 100);
  const levelPart = (level - 1) * (shield.levelCoef || 0);
  const constant  = shield.constant || 0;

  return Math.max(0, constant + statPart + levelPart);
}

export function renderShieldLine(shield, atkStats, level, rescueMult = 1.0) {
  const amount = calculateShield(shield, atkStats, level);
  const boosted = rescueMult > 1.0 ? Math.floor(amount * rescueMult) : amount;

  const target    = shield.target || "both";
  const forSelf   = target === "self"  || target === "both";
  const forAllies = target === "ally"  || target === "both";

  const selfOnlyBadge = (target === "self")
    ? `<span class="dmg-target-badge dmg-target-self" title="Lanceur uniquement">🧬</span>`
    : "";
  const allyOnlyBadge = (target === "ally")
    ? `<span class="dmg-target-badge dmg-target-ally" title="Alliés uniquement">🤝</span>`
    : "";

  const isTick    = !!shield.is_tick;
  const tickCount = shield.tick_count || 1;

  const allyAttr = forAllies ? `data-ally-shield="${boosted}"` : `data-no-allies="true"`;

  if (isTick) {
    const baseTotal  = amount * tickCount;
    const allyTotal  = boosted * tickCount;
    const allyAttrTick = forAllies
      ? `data-ally-shield="${boosted}" data-ally-shield-total="${allyTotal}"`
      : `data-no-allies="true"`;
    return `
      <span class="dmg-name">${selfOnlyBadge}${allyOnlyBadge}${shield.name}${shield.notes ? `<br><i>${shield.notes}</i>` : ""}</span>
      <div class="dmg-values" ${allyAttrTick}>
        ${forSelf ? `<span class="dmg-shield shield-tick-toggle"
              data-base="${amount}" data-total="${baseTotal}" data-ticks="${tickCount}"
              title="Cliquez pour afficher le total (${tickCount} ticks)"
        >${amount.toLocaleString()}<sup class="tick-badge">×${tickCount}</sup></span>` : ""}
      </div>
    `;
  }

  return `
    <span class="dmg-name">${selfOnlyBadge}${allyOnlyBadge}${shield.name}${shield.notes ? `<br><i>${shield.notes}</i>` : ""}</span>
    <div class="dmg-values" ${allyAttr}>
      ${forSelf ? `<span class="dmg-shield">${amount.toLocaleString()}</span>` : ""}
    </div>
  `;
}