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
 *   "notes":      "..."                        // optionnel
 * }
 *
 * Formule : constant + floor(relevantStat * multiplier / 100) + (level - 1) * levelCoef
 * → Pas de réduction de défense (c'est un bouclier, pas un dégât).
 *
 * Si scaling === "hp", la stat de référence est les HP MAX de l'attaquant.
 */

/**
 * @param {object} shield     - entrée shield du JSON
 * @param {object} atkStats   - stats de l'attaquant { atk, sp_atk, hp, ... }
 * @param {number} level      - niveau de l'attaquant
 * @returns {number}
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

/**
 * Renvoie le HTML d'une ligne de shield à injecter dans une move-card.
 * @param {object} shield     - entrée shield du JSON
 * @param {object} atkStats
 * @param {number} level
 * @param {number} rescueMult - multiplicateur Rescue Hood (ex: 1.17), 1.0 par défaut
 * @returns {string} innerHTML
 */
export function renderShieldLine(shield, atkStats, level, rescueMult = 1.0) {
  const amount = calculateShield(shield, atkStats, level);
  const boosted = rescueMult > 1.0 ? Math.floor(amount * rescueMult) : null;

  return `
    <span class="dmg-name">${shield.name}${shield.notes ? `<br><i>${shield.notes}</i>` : ""}</span>
    <div class="dmg-values">
      <span class="dmg-shield">${amount.toLocaleString()}</span>
      ${boosted ? `<span class="dmg-shield" style="opacity:0.75;font-size:1.1rem;">(${boosted.toLocaleString()})</span>` : ""}
    </div>
  `;
}