/**
 * combatLog.js
 * Gère le journal de combat : accumulation des dégâts / soins / shields en cliquant sur les moves.
 * - Clic gauche sur une move-card = ajouter au log
 * - Clic droit sur l'image de l'attaquant = ajouter un allié (pour mieux visualiser les heals/shields alliés)
 * - Les valeurs "is_tick" permettent de cliquer dessus pour afficher le total
 */

import { state } from './state.js';
import { getMobHPAtTimer } from './constants.js';

// ── État du log ──────────────────────────────────────────────────────────────

export const combatLog = {
  entries: [],       // { moveName, moveImage, damages, heals, shields, timestamp }
  allyName: null,    // null = pas d'allié affiché
  allyImage: null,
};

// ── Accumulateur ─────────────────────────────────────────────────────────────

export function getLogTotals() {
  let totalDmg = 0;
  let totalHealSelf = 0;
  let totalHealAlly = 0;
  let totalShieldSelf = 0;
  let totalShieldAlly = 0;

  combatLog.entries.forEach(entry => {
    entry.damages.forEach(d => { totalDmg += d.value; });
    entry.heals.forEach(h => {
      totalHealSelf += h.selfValue;
      totalHealAlly += h.allyValue;
    });
    entry.shields.forEach(s => {
      totalShieldSelf += s.selfValue;
      totalShieldAlly += s.allyValue;
    });
  });

  return { totalDmg, totalHealSelf, totalHealAlly, totalShieldSelf, totalShieldAlly };
}

// ── Rendu UI du panneau ───────────────────────────────────────────────────────

let panelEl = null;

export function initCombatLog() {
  if (panelEl) return;

  panelEl = document.createElement('div');
  panelEl.id = 'combatLogPanel';
  panelEl.innerHTML = `
    <div class="cl-header">
      <span class="cl-title">⚔️ Combo Log</span>
      <div class="cl-header-btns">
        <button class="cl-clear-btn" title="Vider le log">🗑️</button>
        <button class="cl-toggle-btn" title="Réduire">▲</button>
      </div>
    </div>
    <div class="cl-body">
      <div class="cl-sequence" id="clSequence"></div>
      <div class="cl-totals" id="clTotals"></div>
    </div>
  `;

  document.body.appendChild(panelEl);

  panelEl.querySelector('.cl-clear-btn').addEventListener('click', () => {
    combatLog.entries = [];
    renderLog();
  });

  panelEl.querySelector('.cl-toggle-btn').addEventListener('click', () => {
    const body = panelEl.querySelector('.cl-body');
    const btn = panelEl.querySelector('.cl-toggle-btn');
    const isCollapsed = body.style.display === 'none';
    body.style.display = isCollapsed ? '' : 'none';
    btn.textContent = isCollapsed ? '▲' : '▼';
  });

  injectCombatLogStyles();
}

// ── Ajout d'une entrée depuis une move-card ────────────────────────────────────

export function addMoveToLog(moveData) {
  combatLog.entries.push({
    ...moveData,
    timestamp: Date.now()
  });
  renderLog();
}

// ── Suppression d'une entrée ──────────────────────────────────────────────────

function removeEntry(index) {
  combatLog.entries.splice(index, 1);
  renderLog();
}

// ── Rendu principal ────────────────────────────────────────────────────────────

export function renderLog() {
  if (!panelEl) return;

  const seq = document.getElementById('clSequence');
  const totals = document.getElementById('clTotals');

  // ── Séquence ──
  seq.innerHTML = '';

  if (combatLog.entries.length === 0) {
    seq.innerHTML = '<span class="cl-empty">Cliquez sur un move pour l\'ajouter au combo...</span>';
  } else {
    combatLog.entries.forEach((entry, index) => {
      const chip = document.createElement('div');
      chip.className = 'cl-chip';
      chip.title = buildChipTooltip(entry);

      const badge = document.createElement('span');
      badge.className = 'cl-chip-order';
      badge.textContent = index + 1;

      const img = document.createElement('img');
      img.src = entry.moveImage;
      img.alt = entry.moveName;
      img.onerror = () => { img.src = 'assets/moves/missing.png'; };

      const label = document.createElement('span');
      label.className = 'cl-chip-label';
      label.textContent = entry.moveName;

      const mini = document.createElement('span');
      mini.className = 'cl-chip-mini';
      const totalDmgEntry = entry.damages.reduce((s, d) => s + d.value, 0);
      const totalHealEntry = entry.heals.reduce((s, h) => s + h.selfValue, 0);
      const totalShieldEntry = entry.shields.reduce((s, sh) => s + sh.selfValue, 0);

      const parts = [];
      if (totalDmgEntry > 0) parts.push(`<span class="cl-mini-dmg">-${totalDmgEntry.toLocaleString()}</span>`);
      if (totalHealEntry > 0) parts.push(`<span class="cl-mini-heal">+${totalHealEntry.toLocaleString()}</span>`);
      if (totalShieldEntry > 0) parts.push(`<span class="cl-mini-shield">🛡${totalShieldEntry.toLocaleString()}</span>`);
      mini.innerHTML = parts.join(' ');

      const removeBtn = document.createElement('button');
      removeBtn.className = 'cl-chip-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Retirer ce move';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeEntry(index);
      });

      chip.appendChild(badge);
      chip.appendChild(img);
      chip.appendChild(label);
      chip.appendChild(mini);
      chip.appendChild(removeBtn);
      seq.appendChild(chip);

      if (index < combatLog.entries.length - 1) {
        const arrow = document.createElement('span');
        arrow.className = 'cl-arrow';
        arrow.textContent = '→';
        seq.appendChild(arrow);
      }
    });
  }

  // ── Totaux ──
  const { totalDmg, totalHealSelf, totalHealAlly, totalShieldSelf, totalShieldAlly } = getLogTotals();

  const defender = state.currentDefender;
  let defMaxHP = 0;

  if (defender) {
    if (defender.timerBased && defender.hpTable) {
      // Mob timer-based : HP calculé depuis le timer courant
      defMaxHP = getMobHPAtTimer(defender.hpTable, state.defenderTimer);
    } else if (defender.pokemonId === 'custom-doll' && defender.customStats) {
      defMaxHP = defender.customStats.hp;
    } else if (defender.stats) {
      defMaxHP = defender.stats[state.defenderLevel - 1]?.hp || 0;
    }
  }

  const dmgPct = defMaxHP > 0 ? ((totalDmg / defMaxHP) * 100).toFixed(1) : null;
  const hasAlly = combatLog.allyName !== null;
  const hasAny = totalDmg > 0 || totalHealSelf > 0 || totalShieldSelf > 0 || totalHealAlly > 0 || totalShieldAlly > 0;

  if (!hasAny) {
    totals.innerHTML = '';
    return;
  }

  let html = '<div class="cl-totals-grid">';

  if (totalDmg > 0) {
    html += `
      <div class="cl-total-block cl-total-dmg">
        <span class="cl-total-label">💥 Dégâts totaux</span>
        <span class="cl-total-value">${totalDmg.toLocaleString()}</span>
        ${dmgPct !== null ? `<span class="cl-total-pct">${dmgPct}% PV max</span>` : ''}
        ${defMaxHP > 0 ? renderHPBar(totalDmg, defMaxHP) : ''}
      </div>
    `;
  }

  if (totalHealSelf > 0 || totalShieldSelf > 0) {
    html += `<div class="cl-total-block cl-total-self">`;
    html += `<span class="cl-total-label">${hasAlly ? `🧬 ${state.currentAttacker?.displayName || 'Lanceur'}` : '🧬 Lanceur'}</span>`;
    if (totalHealSelf > 0) html += `<span class="cl-total-heal">❤️ +${totalHealSelf.toLocaleString()} soins</span>`;
    if (totalShieldSelf > 0) html += `<span class="cl-total-shield">🛡️ ${totalShieldSelf.toLocaleString()} bouclier</span>`;
    html += `</div>`;
  }

  if (hasAlly && (totalHealAlly > 0 || totalShieldAlly > 0)) {
    html += `<div class="cl-total-block cl-total-ally">`;
    html += `<span class="cl-total-label">
      ${combatLog.allyImage ? `<img src="${combatLog.allyImage}" class="cl-ally-img-small" alt="">` : ''}
      🤝 ${combatLog.allyName}
    </span>`;
    if (totalHealAlly > 0) html += `<span class="cl-total-heal">❤️ +${totalHealAlly.toLocaleString()} soins</span>`;
    if (totalShieldAlly > 0) html += `<span class="cl-total-shield">🛡️ ${totalShieldAlly.toLocaleString()} bouclier</span>`;
    html += `</div>`;
  }

  html += '</div>';

  html += '<details class="cl-detail"><summary>Détail par move</summary><div class="cl-detail-list">';
  combatLog.entries.forEach((entry, i) => {
    html += `<div class="cl-detail-entry">
      <strong>${i + 1}. <img src="${entry.moveImage}" style="width:18px;height:18px;vertical-align:middle;border-radius:3px"> ${entry.moveName}</strong>`;

    entry.damages.forEach(d => {
      html += `<div class="cl-detail-line cl-detail-dmg">💥 ${d.name}: <strong>${d.value.toLocaleString()}</strong></div>`;
    });
    entry.heals.forEach(h => {
      const tickInfo = h.isTick && h.tickCount ? ` (${h.tickCount} ticks)` : '';
      html += `<div class="cl-detail-line cl-detail-heal">❤️ ${h.name}${tickInfo}: <strong>+${h.selfValue.toLocaleString()}</strong>`;
      if (hasAlly && h.allyValue !== h.selfValue) html += ` / allié: <strong>+${h.allyValue.toLocaleString()}</strong>`;
      html += `</div>`;
    });
    entry.shields.forEach(s => {
      const tickInfo = s.isTick && s.tickCount ? ` (${s.tickCount} ticks)` : '';
      html += `<div class="cl-detail-line cl-detail-shield">🛡️ ${s.name}${tickInfo}: <strong>${s.selfValue.toLocaleString()}</strong>`;
      if (hasAlly && s.allyValue !== s.selfValue) html += ` / allié: <strong>${s.allyValue.toLocaleString()}</strong>`;
      html += `</div>`;
    });

    html += `</div>`;
  });
  html += '</div></details>';

  totals.innerHTML = html;
}

function renderHPBar(damage, maxHP) {
  const pct = Math.min(100, (damage / maxHP) * 100);
  const remaining = Math.max(0, 100 - pct);
  return `
    <div class="cl-hp-bar">
      <div class="cl-hp-remaining" style="width:${remaining}%"></div>
      <div class="cl-hp-lost" style="width:${pct}%"></div>
    </div>
  `;
}

function buildChipTooltip(entry) {
  const parts = [];
  entry.damages.forEach(d => parts.push(`💥 ${d.name}: ${d.value.toLocaleString()}`));
  entry.heals.forEach(h => parts.push(`❤️ ${h.name}: +${h.selfValue.toLocaleString()}`));
  entry.shields.forEach(s => parts.push(`🛡️ ${s.name}: ${s.selfValue.toLocaleString()}`));
  return parts.join('\n') || entry.moveName;
}

// ── Gestion de l'allié ────────────────────────────────────────────────────────

let allyModal = null;

export function initAllySelector() {
  const attackerImageDiv = document.getElementById('attackerImage');
  if (!attackerImageDiv) return;

  attackerImageDiv.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openAllyModal(e.clientX, e.clientY);
  });

  const resultsImg = document.getElementById('resultsAttackerImg');
  if (resultsImg) {
    resultsImg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openAllyModal(e.clientX, e.clientY);
    });
  }
}

function openAllyModal(x, y) {
  closeAllyModal();

  allyModal = document.createElement('div');
  allyModal.id = 'allyContextMenu';
  allyModal.style.cssText = `
    position: fixed;
    left: ${Math.min(x, window.innerWidth - 280)}px;
    top: ${Math.min(y, window.innerHeight - 300)}px;
    z-index: 9999;
    background: #1e1e2e;
    border: 1px solid #444;
    border-radius: 10px;
    padding: 12px;
    width: 260px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    font-family: 'Exo 2', sans-serif;
  `;

  const currentAllyText = combatLog.allyName
    ? `Allié actuel: <strong style="color:#4caf82">${combatLog.allyName}</strong>`
    : `<em style="color:#888">Aucun allié sélectionné</em>`;

  allyModal.innerHTML = `
    <div style="font-size:0.9rem;color:#ccc;margin-bottom:8px;">🤝 Allié du lanceur</div>
    <div style="font-size:0.8rem;margin-bottom:10px;">${currentAllyText}</div>
    <div style="max-height:200px;overflow-y:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;" id="allyGrid"></div>
    <div style="margin-top:8px;display:flex;gap:6px;">
      <button id="allyNoneBtn" style="flex:1;padding:4px 6px;background:#444;color:#ccc;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;">Aucun allié</button>
    </div>
  `;

  document.body.appendChild(allyModal);

  const grid = document.getElementById('allyGrid');
  const playable = state.allPokemon.filter(p => p.category === 'playable');
  playable.forEach(p => {
    const item = document.createElement('div');
    item.title = p.displayName;
    item.style.cssText = 'cursor:pointer;padding:3px;border-radius:6px;text-align:center;background:#2a2a3a;transition:background 0.15s;';
    item.innerHTML = `<img src="${p.image}" alt="${p.displayName}" style="width:36px;height:36px;object-fit:contain;" onerror="this.src='assets/pokemon/missing.png'">`;
    item.addEventListener('mouseenter', () => { item.style.background = '#3a3a5a'; });
    item.addEventListener('mouseleave', () => { item.style.background = '#2a2a3a'; });
    item.addEventListener('click', () => {
      combatLog.allyName = p.displayName;
      combatLog.allyImage = p.image;
      closeAllyModal();
      renderLog();
    });
    grid.appendChild(item);
  });

  document.getElementById('allyNoneBtn').addEventListener('click', () => {
    combatLog.allyName = null;
    combatLog.allyImage = null;
    closeAllyModal();
    renderLog();
  });

  setTimeout(() => {
    document.addEventListener('click', closeAllyModal, { once: true });
    document.addEventListener('contextmenu', closeAllyModal, { once: true });
  }, 50);
}

function closeAllyModal() {
  if (allyModal) {
    allyModal.remove();
    allyModal = null;
  }
}

// ── Réinitialiser le log quand on change d'attaquant ──────────────────────────

export function resetCombatLog() {
  combatLog.entries = [];
  renderLog();
}

// ── CSS injecté dynamiquement ─────────────────────────────────────────────────

function injectCombatLogStyles() {
  if (document.getElementById('combatLogStyles')) return;

  const style = document.createElement('style');
  style.id = 'combatLogStyles';
  style.textContent = `
    #combatLogPanel {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      width: min(96vw, 900px);
      background: #12121e;
      border: 1px solid #333;
      border-radius: 14px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.8);
      z-index: 900;
      font-family: 'Exo 2', sans-serif;
      overflow: hidden;
      transition: box-shadow 0.2s;
    }

    .cl-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      background: #1a1a2e;
      border-bottom: 1px solid #2a2a40;
      cursor: default;
    }

    .cl-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #c8b8ff;
      letter-spacing: 0.04em;
    }

    .cl-header-btns {
      display: flex;
      gap: 6px;
    }

    .cl-clear-btn, .cl-toggle-btn {
      background: #2a2a44;
      border: none;
      color: #aaa;
      border-radius: 6px;
      padding: 3px 8px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background 0.15s, color 0.15s;
    }
    .cl-clear-btn:hover { background: #8b2222; color: #fff; }
    .cl-toggle-btn:hover { background: #3a3a5a; color: #fff; }

    .cl-body {
      padding: 10px 12px 12px;
    }

    .cl-sequence {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      min-height: 44px;
      margin-bottom: 10px;
    }

    .cl-empty {
      color: #555;
      font-size: 0.85rem;
      font-style: italic;
    }

    .cl-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      background: #1e1e35;
      border: 1px solid #3a3a5a;
      border-radius: 20px;
      padding: 4px 8px 4px 4px;
      font-size: 0.78rem;
      cursor: default;
      position: relative;
      transition: border-color 0.15s, background 0.15s;
    }
    .cl-chip:hover {
      border-color: #7a7aaa;
      background: #252540;
    }

    .cl-chip-order {
      background: #3a3a6a;
      color: #aaa;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .cl-chip img {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .cl-chip-label {
      color: #ccc;
      max-width: 90px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cl-chip-mini {
      display: flex;
      gap: 3px;
      flex-wrap: wrap;
    }

    .cl-mini-dmg { color: #ff6b6b; font-weight: 600; }
    .cl-mini-heal { color: #4caf82; font-weight: 600; }
    .cl-mini-shield { color: #64b5f6; font-weight: 600; }

    .cl-chip-remove {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      padding: 0;
      margin-left: 2px;
      transition: color 0.15s;
    }
    .cl-chip-remove:hover { color: #f44; }

    .cl-arrow {
      color: #555;
      font-size: 1.1rem;
    }

    .cl-totals-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 8px;
    }

    .cl-total-block {
      flex: 1;
      min-width: 140px;
      padding: 10px 14px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cl-total-dmg {
      background: linear-gradient(135deg, #2a1010, #1e0808);
      border: 1px solid #662222;
    }
    .cl-total-self {
      background: linear-gradient(135deg, #0e2318, #0b1a12);
      border: 1px solid #2a6a44;
    }
    .cl-total-ally {
      background: linear-gradient(135deg, #101a2a, #080e1a);
      border: 1px solid #224466;
    }

    .cl-total-label {
      font-size: 0.78rem;
      color: #aaa;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .cl-total-value {
      font-size: 1.6rem;
      font-weight: 900;
      color: #ff6b6b;
      font-family: 'Exo 2', sans-serif;
      line-height: 1;
    }

    .cl-total-pct {
      font-size: 0.85rem;
      color: #ff9999;
      font-weight: 600;
    }

    .cl-total-heal {
      font-size: 1rem;
      font-weight: 700;
      color: #4caf82;
    }

    .cl-total-shield {
      font-size: 1rem;
      font-weight: 700;
      color: #64b5f6;
    }

    .cl-hp-bar {
      display: flex;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
      background: #333;
    }
    .cl-hp-remaining { background: #4caf82; transition: width 0.4s; }
    .cl-hp-lost { background: #ff6b6b; transition: width 0.4s; }

    .cl-detail {
      margin-top: 6px;
    }
    .cl-detail summary {
      cursor: pointer;
      font-size: 0.78rem;
      color: #666;
      user-select: none;
      padding: 2px 0;
    }
    .cl-detail summary:hover { color: #999; }

    .cl-detail-list {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .cl-detail-entry {
      background: #1a1a2a;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 0.78rem;
      color: #bbb;
    }

    .cl-detail-line { margin-top: 2px; }
    .cl-detail-dmg { color: #ff9999; }
    .cl-detail-heal { color: #80dfb0; }
    .cl-detail-shield { color: #90caf9; }

    .cl-ally-img-small {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      object-fit: contain;
      vertical-align: middle;
    }

    .move-card {
      position: relative;
      cursor: pointer;
      transition: border-color 0.2s, transform 0.1s, box-shadow 0.2s;
      user-select: none;
    }

    .move-card::after {
      content: '＋ Combo';
      position: absolute;
      top: 6px;
      right: 8px;
      font-size: 0.65rem;
      color: #555;
      font-weight: 600;
      letter-spacing: 0.04em;
      transition: color 0.2s;
    }

    .move-card:hover::after {
      color: #c8b8ff;
    }

    .move-card:hover {
      border-color: #5a5a9a !important;
      box-shadow: 0 0 12px rgba(150, 130, 255, 0.25);
      transform: translateY(-1px);
    }

    .move-card:active {
      transform: translateY(0px) scale(0.99);
    }

    .move-card.cl-added-flash {
      animation: clFlash 0.4s ease-out;
    }

    @keyframes clFlash {
      0%   { box-shadow: 0 0 0px rgba(200, 184, 255, 0); border-color: #5a5a9a; }
      40%  { box-shadow: 0 0 20px rgba(200, 184, 255, 0.7); border-color: #c8b8ff; }
      100% { box-shadow: 0 0 0px rgba(200, 184, 255, 0); }
    }

    .dmg-tick-toggle, .heal-tick-toggle, .shield-tick-toggle {
      cursor: pointer;
      border-bottom: 1px dashed currentColor;
      transition: opacity 0.15s;
    }
    .dmg-tick-toggle:hover, .heal-tick-toggle:hover, .shield-tick-toggle:hover {
      opacity: 0.75;
    }
    .tick-badge {
      font-size: 0.7rem;
      opacity: 0.7;
      margin-left: 3px;
    }

    #attackerImage {
      cursor: context-menu;
    }
  `;

  document.head.appendChild(style);
}