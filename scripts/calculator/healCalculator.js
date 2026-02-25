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
 * Renvoie le HTML d'une ligne de soin à injecter dans une move-card.
 * @param {object} heal       - entrée heal du JSON
 * @param {object} atkStats
 * @param {number} level
 * @returns {string} innerHTML
 */
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

  return `
    <span class="dmg-name">${heal.name}${heal.notes ? `<br><i>${heal.notes}</i>` : ""}</span>
    <div class="dmg-values">
      <span class="dmg-heal">${self.toLocaleString()}</span>
      <span class="dmg-heal" style="opacity:0.75;font-size:1.1rem;">/ ${ally.toLocaleString()}</span>
    </div>
  `;
}