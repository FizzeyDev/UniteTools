/**
 * healCalculator.js
 * Calcule les soins (heals) des moves.
 *
 * Structure JSON attendue dans move.heals[] :
 * {
 *   "name":       "Heal",
 *   "scaling":    "sp_atk" | "atk" | "hp",   // stat de référence
 *   "multiplier": 90,                          // % de la stat
 *   "levelCoef":  0,                           // bonus flat par niveau
 *   "constant":   300,                         // bonus flat fixe
 *   "target":     "self" | "ally" | "both",    // optionnel, défaut "both"
 *                   "self"  → lanceur uniquement (pas de badge allié)
 *                   "ally"  → alliés uniquement (pas de valeur self affichée)
 *                   "both"  → lanceur + alliés (comportement par défaut)
 *   "is_tick":    true,                        // optionnel, valeur par tick
 *   "tick_count": 7,                           // nb de ticks si is_tick
 *   "notes":      "..."                        // optionnel
 * }
 *
 * Formule : constant + floor(relevantStat * multiplier / 100) + (level - 1) * levelCoef
 * → Pas de réduction de défense (c'est un soin, pas un dégât).
 */

/**
 * @param {object} heal       - entrée heal du JSON
 * @param {object} atkStats   - stats de l'attaquant { atk, sp_atk, hp, ... }
 * @param {number} level      - niveau de l'attaquant
 * @returns {number}
 */
export function calculateHeal(heal, atkStats, level) {
  let relevantStat;

  switch (heal.scaling) {
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

  const statPart    = Math.floor(relevantStat * (heal.multiplier || 0) / 100);
  const levelPart   = (level - 1) * (heal.levelCoef || 0);
  const constant    = heal.constant || 0;

  return Math.max(0, constant + statPart + levelPart);
}

/**
 * @param {object} heal         - entrée heal du JSON
 * @param {object} atkStats     - stats de l'attaquant
 * @param {number} level        - niveau de l'attaquant
 * @param {number} bigRootMult  - multiplicateur Big Root sur le caster (1.0 par défaut)
 * @param {number} rescueMult   - multiplicateur Rescue Hood sur l'allié (1.0 par défaut)
 * @param {number} curseMult    - réduction Curse Bangle/Incense (1.0 par défaut, ex: 0.70)
 * @returns {string} innerHTML
 */
export function renderHealLine(heal, atkStats, level, bigRootMult = 1.0, rescueMult = 1.0, curseMult = 1.0) {
  const base = calculateHeal(heal, atkStats, level);
  const self = Math.floor(base * bigRootMult * curseMult);
  const ally = Math.floor(base * rescueMult  * curseMult);

  // "both" par défaut si target absent, pour ne pas casser l'existant
  const target    = heal.target || "both";
  const forSelf   = target === "self"  || target === "both";
  const forAllies = target === "ally"  || target === "both";

  const isTick    = !!heal.is_tick;
  const tickCount = heal.tick_count || 1;

  // Indicateur visuel si le heal ne concerne que le lanceur
  const selfOnlyBadge = (target === "self")
    ? `<span class="dmg-target-badge dmg-target-self" title="Lanceur uniquement">🧬</span>`
    : "";
  const allyOnlyBadge = (target === "ally")
    ? `<span class="dmg-target-badge dmg-target-ally" title="Alliés uniquement">🤝</span>`
    : "";

  // data-ally-heal n'est mis que si le heal touche les alliés
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