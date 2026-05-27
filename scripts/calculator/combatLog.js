/**
 * combatLog.js
 * Gère le journal de combat : accumulation des dégâts / soins / shields en cliquant sur les moves.
 * - Clic gauche sur une move-card = ajouter au log
 * - Clic droit sur l'image de l'attaquant = ajouter un allié (pour mieux visualiser les heals/shields alliés)
 * - Les valeurs "is_tick" permettent de cliquer dessus pour afficher le total
 */

import { state } from './state.js';
import { getMobHPAtTimer } from './constants.js';

export const combatLog = {
  entries: [],
  allyName: null,
  allyImage: null,
};

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

export function addMoveToLog(moveData) {
  combatLog.entries.push({
    ...moveData,
    timestamp: Date.now()
  });
  renderLog();
}

function removeEntry(index) {
  combatLog.entries.splice(index, 1);
  renderLog();
}

export function renderLog() {
  if (!panelEl) return;

  const seq = document.getElementById('clSequence');
  const totals = document.getElementById('clTotals');

  seq.innerHTML = '';

  if (combatLog.entries.length === 0) {
    seq.innerHTML = '<span class="cl-empty">Click on a move to add hit to the combo...</span>';
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

  const { totalDmg, totalHealSelf, totalHealAlly, totalShieldSelf, totalShieldAlly } = getLogTotals();

  const defender = state.currentDefender;
  let defMaxHP = 0;

  if (defender) {
    if (defender.timerBased && defender.hpTable) {
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

export function resetCombatLog() {
  combatLog.entries = [];
  renderLog();
}

// ── collectLineItems ──────────────────────────────────────────────────────────

function collectLineItems(card) {
  const items = [];

  card.querySelectorAll('.damage-line').forEach(line => {
    const nameEl = line.querySelector('.dmg-name');
    if (!nameEl) return;
    const name = Array.from(nameEl.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE || n.nodeName === 'BR')
      .map(n => n.textContent).join('').trim() || nameEl.textContent.split('\n')[0].trim();

    const dmgNormal = line.querySelector('.dmg-normal');
    if (dmgNormal) {
      const dmgCrit = line.querySelector('.dmg-crit');

      const isTick    = dmgNormal.classList.contains('dmg-tick-toggle');
      const tickCount = isTick ? (parseInt(dmgNormal.dataset.ticks, 10) || 1) : 1;

      const normalBase = isTick
        ? parseInt(dmgNormal.dataset.base, 10)
        : parseInt(dmgNormal.textContent.replace(/[^\d]/g, ''), 10);

      const val = isTick ? normalBase * tickCount : normalBase;
      if (isNaN(val) || val <= 0) return;

      const canCrit = !!dmgCrit;
      let critBase = null;
      if (canCrit) {
        critBase = isTick
          ? parseInt(dmgCrit.dataset.base, 10)
          : parseInt(dmgCrit.textContent.replace(/[^\d()]/g, ''), 10);
      }
      const critVal = canCrit ? (isTick ? critBase * tickCount : critBase) : null;

      const tickScalingRaw = isTick ? dmgNormal.dataset.tickScaling : null;
      const tickScaling    = tickScalingRaw ? JSON.parse(tickScalingRaw) : null;

      items.push({
        type: 'damage', name, value: val,
        canCrit,
        critValue: critVal,
        normalPerTick: isTick ? normalBase : null,
        critPerTick:   (isTick && canCrit) ? critBase : null,
        isTick,
        tickCount,
        tickScaling,
      });
    }

    const healEls = line.querySelectorAll('.dmg-heal');
    if (healEls.length > 0) {
      const selfEl = healEls[0], allyEl = healEls[1];
      const isTick    = selfEl.classList.contains('heal-tick-toggle');
      const tickCount = isTick ? parseInt(selfEl.dataset.ticks, 10) : 1;
      const selfRaw   = isTick
        ? parseInt(selfEl.dataset.base, 10) * parseInt(selfEl.querySelector('span')?.textContent?.replace('×','') || selfEl.dataset.ticks, 10)
        : parseInt(selfEl.textContent.replace(/[^\d]/g, ''), 10);
      const allyRaw = allyEl ? parseInt(allyEl.textContent.replace(/[^\d]/g, ''), 10) : selfRaw;
      if (selfRaw > 0) items.push({ type: 'heal', name, selfValue: selfRaw, allyValue: allyRaw || selfRaw, isTick, tickCount });
    }

    const shieldEls = line.querySelectorAll('.dmg-shield');
    if (shieldEls.length > 0) {
      const selfEl = shieldEls[0], allyEl = shieldEls[1];
      const isTick    = selfEl.classList.contains('shield-tick-toggle');
      const tickCount = isTick ? parseInt(selfEl.dataset.ticks, 10) : 1;
      const selfRaw   = isTick
        ? parseInt(selfEl.dataset.base, 10) * parseInt(selfEl.querySelector('span')?.textContent?.replace('×','') || selfEl.dataset.ticks, 10)
        : parseInt(selfEl.textContent.replace(/[^\d]/g, ''), 10);
      const allyRaw = allyEl ? parseInt(allyEl.textContent.replace(/[^\d]/g, ''), 10) : selfRaw;
      if (selfRaw > 0) items.push({ type: 'shield', name, selfValue: selfRaw, allyValue: allyRaw || selfRaw, isTick, tickCount });
    }
  });

  return items;
}

function itemsToLogEntry(items) {
  const damages = [], heals = [], shields = [];
  items.forEach(item => {
    if (item.type === 'damage') {
      const finalValue = item.selectedValue !== undefined ? item.selectedValue : item.value;
      const label = item.critLabel ? `${item.name} ${item.critLabel}` : item.name;
      damages.push({ name: label, value: finalValue });
    } else if (item.type === 'heal') {
      heals.push({ name: item.name, selfValue: item.selfValue, allyValue: item.allyValue, isTick: item.isTick, tickCount: item.tickCount });
    } else if (item.type === 'shield') {
      shields.push({ name: item.name, selfValue: item.selfValue, allyValue: item.allyValue, isTick: item.isTick, tickCount: item.tickCount });
    }
  });
  return { damages, heals, shields };
}

let activePicker = null;

function closeActivePicker() {
  if (activePicker) {
    activePicker.remove();
    activePicker = null;
  }
}

function flashCard(card) {
  card.classList.remove('cl-added-flash');
  void card.offsetWidth;
  card.classList.add('cl-added-flash');
  setTimeout(() => card.classList.remove('cl-added-flash'), 500);
}

// ── openLinePicker ────────────────────────────────────────────────────────────

function openLinePicker(card, move, allItems) {
  closeActivePicker();

  const picker = document.createElement('div');
  picker.className = 'cl-line-picker';
  activePicker = picker;

  const header = document.createElement('div');
  header.className = 'cl-picker-header';
  header.innerHTML = `
    <img src="${move.image}" alt="${move.name}" onerror="this.src='assets/moves/missing.png'">
    <span>${move.name}</span>
    <button class="cl-picker-close" title="Fermer">×</button>
  `;
  picker.appendChild(header);

  header.querySelector('.cl-picker-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeActivePicker();
  });

  const list = document.createElement('div');
  list.className = 'cl-picker-list';
  const checkboxes = [];

  const critStates = allItems.map(item => ({
    isCrit: false,
    hitCount:  item.isTick ? item.tickCount : 1,
    critCount: 0,
    _resolvedValue: null,  // initialisé explicitement, rempli par updateVal()
  }));

  // ── Helper : calcule le total d'un item tick avec les critStates actuels ──
  const computeTickTotal = (item, idx) => {
    const hc = critStates[idx].hitCount;
    const cc = Math.min(critStates[idx].critCount, hc);

    if (!item.canCrit) {
      const perTick = item.normalPerTick ?? Math.round(item.value / item.tickCount);
      if (item.tickScaling) {
        let total = 0;
        for (let i = 0; i < hc; i++) {
          const scale = item.tickScaling[i] ?? item.tickScaling[item.tickScaling.length - 1];
          total += Math.floor(perTick * scale);
        }
        return total;
      }
      return perTick * hc;
    }

    // Avec crits possibles
    if (item.tickScaling) {
      let total = 0;
      for (let i = 0; i < hc; i++) {
        const scale = item.tickScaling[i] ?? item.tickScaling[item.tickScaling.length - 1];
        // Les cc premiers ticks sont critiques
        const base = i < cc ? item.critPerTick : item.normalPerTick;
        total += Math.floor(base * scale);
      }
      return total;
    }

    const nc = hc - cc;
    return nc * item.normalPerTick + cc * item.critPerTick;
  };

  // ── Helper : tooltip détaillé hit par hit (si tick_scaling présent) ───────
  const buildTickDetailTooltip = (item, idx) => {
    if (!item.tickScaling) return null;
    const hc = critStates[idx].hitCount;
    const cc = Math.min(critStates[idx].critCount, hc);
    const lines = [];
    for (let i = 0; i < hc; i++) {
      const scale = item.tickScaling[i] ?? item.tickScaling[item.tickScaling.length - 1];
      const isCritTick = i < cc;
      const base = isCritTick ? item.critPerTick : item.normalPerTick;
      const val = Math.floor(base * scale);
      const scalePct = scale !== 1 ? ` (×${scale})` : '';
      const critMark = isCritTick ? ' ⚡' : '';
      lines.push(`Hit ${i + 1}: ${val.toLocaleString()}${scalePct}${critMark}`);
    }
    return lines.join('\n');
  };

  const typeOrder = ['damage', 'heal', 'shield'];
  const typeLabels = { damage: '💥 Damage', heal: '❤️ Heal', shield: '🛡️ Shield' };
  let lastType = null;

  const sortedItems = [...allItems].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
  const sortedIdxMap = sortedItems.map(si => allItems.indexOf(si));

  sortedItems.forEach((item, sortedIdx) => {
    const idx = sortedIdxMap[sortedIdx];

    if (item.type !== lastType) {
      lastType = item.type;
      const sep = document.createElement('div');
      sep.className = 'cl-picker-section-sep';
      sep.textContent = typeLabels[item.type];
      list.appendChild(sep);
    }

    const row = document.createElement('div');
    row.className = 'cl-picker-row';

    const typeClass = item.type === 'damage' ? 'cl-picker-dmg' : item.type === 'heal' ? 'cl-picker-heal' : 'cl-picker-shield';
    const typeIcon  = item.type === 'damage' ? '💥' : item.type === 'heal' ? '❤️' : '🛡️';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    checkboxes[idx] = cb;
    cb.addEventListener('click', (e) => e.stopPropagation());

    const valSpan = document.createElement('span');
    valSpan.className = `cl-picker-val ${typeClass}`;

    const nameSpan = document.createElement('span');
    nameSpan.className = `cl-picker-name ${typeClass}`;
    nameSpan.textContent = item.name;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'cl-picker-icon';
    iconSpan.textContent = typeIcon;

    row.appendChild(cb);
    row.appendChild(iconSpan);
    row.appendChild(nameSpan);
    row.appendChild(valSpan);

    row.addEventListener('click', (e) => {
      if (e.target === cb || e.target.closest('.cl-crit-controls')) return;
      e.stopPropagation();
      cb.checked = !cb.checked;
    });

    // ── updateVal : recalcule et affiche la valeur dans le picker ─────────
    const updateVal = () => {
      if (item.type !== 'damage') {
        valSpan.textContent = item.selfValue.toLocaleString();
        return;
      }

      if (item.isTick && item.tickCount > 1) {
        const total = computeTickTotal(item, idx);
        critStates[idx]._resolvedValue = total;

        // Tooltip hit-par-hit si tick_scaling présent
        const tooltip = buildTickDetailTooltip(item, idx);
        if (tooltip) {
          valSpan.title = tooltip;
          valSpan.style.cursor = 'help';
        }

        const hc = critStates[idx].hitCount;
        valSpan.textContent = `${total.toLocaleString()} (${hc}×)`;
      } else {
        if (!item.canCrit) {
          critStates[idx]._resolvedValue = item.value;
          valSpan.textContent = item.value.toLocaleString();
          return;
        }
        const v = critStates[idx].isCrit ? item.critValue : item.value;
        critStates[idx]._resolvedValue = v;
        valSpan.textContent = v.toLocaleString();
      }
    };

    // ── Contrôles pour les multi-hits (is_tick) ───────────────────────────
    if (item.isTick && item.tickCount > 1) {
      const critCtrl = document.createElement('div');
      critCtrl.className = 'cl-crit-controls';

      const maxHits = item.tickCount;
      critStates[idx].hitCount  = maxHits;
      critStates[idx].critCount = 0;

      const showCritRow = item.type === 'damage' && item.canCrit;

      // Ligne de scaling info (ex: H1:×1 H2:×0.8 H3:×0.6)
      let scalingInfoHtml = '';
      if (item.tickScaling) {
        const scalingDesc = item.tickScaling
          .map((s, i) => `<span style="opacity:${s === 1 ? '1' : '0.75'};color:${s < 1 ? '#ff9d00' : '#aaa'}">H${i+1}:×${s}</span>`)
          .join(' ');
        scalingInfoHtml = `<div class="cl-tick-scaling-info">${scalingDesc}</div>`;
      }

      critCtrl.innerHTML = `
        ${scalingInfoHtml}
        <div class="cl-counter-row">
          <span class="cl-crit-label">Hits :</span>
          <button class="cl-crit-btn cl-hit-minus">−</button>
          <span class="cl-hit-count">${maxHits}</span>/<span class="cl-crit-max">${maxHits}</span>
          <button class="cl-crit-btn cl-hit-plus">+</button>
        </div>
        ${showCritRow ? `
        <div class="cl-counter-row">
          <span class="cl-crit-label">💥Crits :</span>
          <button class="cl-crit-btn cl-crit-minus">−</button>
          <span class="cl-crit-count">0</span>/<span class="cl-hit-max-ref">${maxHits}</span>
          <button class="cl-crit-btn cl-crit-plus">+</button>
        </div>` : ''}
      `;

      const hitCountEl  = critCtrl.querySelector('.cl-hit-count');
      const critCountEl = showCritRow ? critCtrl.querySelector('.cl-crit-count') : null;
      const critMaxRef  = showCritRow ? critCtrl.querySelector('.cl-hit-max-ref') : null;

      const refreshColors = () => {
        hitCountEl.style.color  = critStates[idx].hitCount  < maxHits ? '#ff9d00' : '#aaa';
        if (critCountEl) critCountEl.style.color = critStates[idx].critCount > 0 ? '#ef5350' : '#aaa';
      };

      critCtrl.querySelector('.cl-hit-minus').addEventListener('click', (e) => {
        e.stopPropagation();
        if (critStates[idx].hitCount > 0) {
          critStates[idx].hitCount--;
          if (showCritRow && critStates[idx].critCount > critStates[idx].hitCount) {
            critStates[idx].critCount = critStates[idx].hitCount;
            if (critCountEl) critCountEl.textContent = critStates[idx].critCount;
          }
          hitCountEl.textContent = critStates[idx].hitCount;
          if (critMaxRef) critMaxRef.textContent = critStates[idx].hitCount;
          refreshColors();
          updateVal();
        }
      });

      critCtrl.querySelector('.cl-hit-plus').addEventListener('click', (e) => {
        e.stopPropagation();
        if (critStates[idx].hitCount < maxHits) {
          critStates[idx].hitCount++;
          hitCountEl.textContent = critStates[idx].hitCount;
          if (critMaxRef) critMaxRef.textContent = critStates[idx].hitCount;
          refreshColors();
          updateVal();
        }
      });

      if (showCritRow) {
        critCtrl.querySelector('.cl-crit-minus').addEventListener('click', (e) => {
          e.stopPropagation();
          if (critStates[idx].critCount > 0) {
            critStates[idx].critCount--;
            if (critCountEl) critCountEl.textContent = critStates[idx].critCount;
            refreshColors();
            updateVal();
          }
        });

        critCtrl.querySelector('.cl-crit-plus').addEventListener('click', (e) => {
          e.stopPropagation();
          if (critStates[idx].critCount < critStates[idx].hitCount) {
            critStates[idx].critCount++;
            if (critCountEl) critCountEl.textContent = critStates[idx].critCount;
            refreshColors();
            updateVal();
          }
        });
      }

      row.appendChild(critCtrl);

    } else if (item.type === 'damage' && item.canCrit) {
      // ── Single hit avec toggle Normal / Crit ──────────────────────────────
      const critCtrl = document.createElement('div');
      critCtrl.className = 'cl-crit-controls';

      critCtrl.innerHTML = `
        <button class="cl-crit-toggle" data-mode="normal">Normal</button>
        <button class="cl-crit-toggle cl-crit-toggle-crit" data-mode="crit">Crit</button>
      `;
      const btns = critCtrl.querySelectorAll('.cl-crit-toggle');
      btns[0].classList.add('active');
      btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const mode = btn.dataset.mode;
          critStates[idx].isCrit = mode === 'crit';
          btns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
          updateVal();
        });
      });

      row.appendChild(critCtrl);
    }

    // ── Appel initial de updateVal après ajout de critCtrl au row ──────────
    updateVal();
    list.appendChild(row);
  });

  picker.appendChild(list);

  const footer = document.createElement('div');
  footer.className = 'cl-picker-footer';

  const selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'cl-picker-btn cl-picker-all';
  selectAllBtn.textContent = 'Tout';
  selectAllBtn.addEventListener('click', (e) => { e.stopPropagation(); Object.values(checkboxes).forEach(cb => cb.checked = true); });

  const selectNoneBtn = document.createElement('button');
  selectNoneBtn.className = 'cl-picker-btn cl-picker-none';
  selectNoneBtn.textContent = 'Aucun';
  selectNoneBtn.addEventListener('click', (e) => { e.stopPropagation(); Object.values(checkboxes).forEach(cb => cb.checked = false); });

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'cl-picker-btn cl-picker-confirm';
  confirmBtn.textContent = '＋ Ajouter';
  confirmBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    const selected = sortedItems
      .map((item, sortedIdx) => {
        const idx = sortedIdxMap[sortedIdx];
        if (!checkboxes[idx] || !checkboxes[idx].checked) return null;

        if (item.isTick && item.tickCount > 1) {
          const hc = critStates[idx].hitCount;
          const cc = Math.min(critStates[idx].critCount, hc);

          if (item.type === 'damage') {
            // Toujours recalculer via computeTickTotal pour garantir la cohérence,
            // même si l'utilisateur n'a pas touché aux compteurs
            const selectedValue = computeTickTotal(item, idx);

            const hitLabel = hc < item.tickCount ? `${hc}/${item.tickCount} hits` : `${item.tickCount} hits`;
            const critPart = cc > 0 ? ` · ${cc}💥` : '';
            const critLabel = `(${hitLabel}${critPart})`;

            return { ...item, selectedValue, critLabel };
          } else {
            // Heal / Shield — proratise par nb de hits sélectionné
            const ratio = hc / item.tickCount;
            return {
              ...item,
              selfValue:  Math.round(item.selfValue  * ratio),
              allyValue:  Math.round((item.allyValue ?? item.selfValue) * ratio),
            };
          }
        }

        if (item.type === 'damage' && item.canCrit) {
          const selectedValue = critStates[idx].isCrit ? item.critValue : item.value;
          const critLabel = critStates[idx].isCrit ? '⚡Crit' : '';
          return { ...item, selectedValue, critLabel };
        }

        return item;
      })
      .filter(Boolean);

    if (selected.length === 0) { closeActivePicker(); return; }
    const { damages, heals, shields } = itemsToLogEntry(selected);
    addMoveToLog({ moveName: move.name, moveImage: move.image, damages, heals, shields });
    closeActivePicker();
    flashCard(card);
  });

  footer.appendChild(selectAllBtn);
  footer.appendChild(selectNoneBtn);
  footer.appendChild(confirmBtn);
  picker.appendChild(footer);

  picker.addEventListener('click', (e) => e.stopPropagation());

  document.body.appendChild(picker);

  // ── Positionnement ────────────────────────────────────────────────────────
  const cardRect = card.getBoundingClientRect();
  const pickerH  = picker.offsetHeight;
  const pickerW  = picker.offsetWidth;
  let top  = cardRect.top - pickerH - 8;
  let left = cardRect.left;
  if (top < 8) top = cardRect.bottom + 8;
  if (left + pickerW > window.innerWidth - 8) left = window.innerWidth - pickerW - 8;
  if (left < 8) left = 8;
  picker.style.top  = `${top}px`;
  picker.style.left = `${left}px`;

  requestAnimationFrame(() => {
    const outsideHandler = (e) => {
      if (!picker.contains(e.target)) {
        closeActivePicker();
        document.removeEventListener('click', outsideHandler);
      }
    };
    document.addEventListener('click', outsideHandler);
  });
}

// ── attachMoveCardClickHandler ────────────────────────────────────────────────

function attachMoveCardClickHandler(card, move) {

  card.querySelectorAll('.heal-tick-toggle, .shield-tick-toggle, .dmg-tick-toggle').forEach(el => {
    const base     = parseInt(el.dataset.base,  10);
    const maxTicks = parseInt(el.dataset.ticks, 10);
    const isCrit   = el.classList.contains('dmg-crit');
    const isHeal   = el.classList.contains('heal-tick-toggle');
    const isShield = el.classList.contains('shield-tick-toggle');
    let currentTicks = 1;

    const tickScalingRaw = el.dataset.tickScaling;
    const tickScaling    = tickScalingRaw ? JSON.parse(tickScalingRaw) : null;
    const hasTickScaling = !!tickScaling;

    const wrap = (val) => isCrit ? `(${val})` : val;
    const activeColor = isHeal ? '#4caf82' : isShield ? '#ffd740' : isCrit ? '#ef5350' : '#4fc3f7';

    const isStealthRock = (move.name === "Stealth Rock" || move.name === "Stealth Rock+") && !isCrit;
    const maxStackBonus = maxTicks === 10 ? 1.35 : 1.05;

    const getScaledTotal = (n) => {
      if (hasTickScaling) {
        let sum = 0;
        for (let i = 0; i < n; i++) {
          sum += Math.floor(base * (tickScaling[i] ?? tickScaling[tickScaling.length - 1]));
        }
        return sum;
      }
      if (isStealthRock) {
        let sum = 0;
        for (let i = 1; i <= n; i++) {
          sum += Math.floor(base * (1 + Math.min((i - 1) * 0.15, maxStackBonus)));
        }
        return sum;
      }
      return base * n;
    };

    const renderExpanded = () => {
      const atMax = currentTicks === maxTicks;
      let displayTotal, titleHint;

      if (hasTickScaling) {
        displayTotal = getScaledTotal(currentTicks);
        const scalePct = tickScaling[currentTicks - 1] ?? tickScaling[tickScaling.length - 1];
        const waveVal  = Math.floor(base * scalePct);
        titleHint = `Wave ${currentTicks}: ${waveVal.toLocaleString()} (×${scalePct}) - Total: ${displayTotal.toLocaleString()}`;
      } else if (isStealthRock) {
        displayTotal = getScaledTotal(currentTicks);
        const pct = Math.min((currentTicks - 1) * 0.15, maxStackBonus);
        titleHint = `Hit ${currentTicks}: ${Math.ceil(base * (1 + pct)).toLocaleString()} (+${Math.round(pct * 100)}%) - Total: ${displayTotal.toLocaleString()}`;
      } else {
        displayTotal = base * currentTicks;
        titleHint = `Par tick : ${base.toLocaleString()} - Max : ${maxTicks} ticks`;
      }

      el.innerHTML = `
        ${wrap(displayTotal.toLocaleString())}
        <sup class="tick-badge" style="display:inline-flex;align-items:center;gap:2px;vertical-align:super;font-size:0.6em;line-height:1;">
          <button class="tick-ctrl tick-minus" style="width:15px;height:15px;border-radius:3px;border:none;background:#333;color:#ccc;cursor:pointer;font-size:11px;line-height:1;padding:0;flex-shrink:0;font-weight:bold;">−</button>
          <span style="min-width:18px;text-align:center;font-weight:900;color:${atMax ? activeColor : '#aaa'};">×${currentTicks}</span>
          <button class="tick-ctrl tick-plus" style="width:15px;height:15px;border-radius:3px;border:none;background:#333;color:#ccc;cursor:pointer;font-size:11px;line-height:1;padding:0;flex-shrink:0;font-weight:bold;">+</button>
        </sup>
      `;
      el.style.color = atMax ? activeColor : '';
      el.title = titleHint;
      el.querySelector('.tick-minus').addEventListener('click', (e) => { e.stopPropagation(); if (currentTicks > 1)        { currentTicks--; renderExpanded(); } });
      el.querySelector('.tick-plus' ).addEventListener('click', (e) => { e.stopPropagation(); if (currentTicks < maxTicks) { currentTicks++; renderExpanded(); } });
    };

    renderExpanded();
  });

  card.addEventListener('click', (e) => {
    if (e.target.closest('.heal-tick-toggle, .shield-tick-toggle, .dmg-tick-toggle, .tick-ctrl')) return;

    if (activePicker && activePicker._sourceCard === card) {
      closeActivePicker();
      return;
    }

    const allItems = collectLineItems(card);
    if (allItems.length === 0) return;

    // Ouvre toujours le picker s'il y a des multi-hits, même pour un seul item sans crit
    const hasMultiHit = allItems.some(i => i.isTick && i.tickCount > 1);

    if (!hasMultiHit && allItems.length === 1 && !allItems[0].canCrit) {
      const { damages, heals, shields } = itemsToLogEntry(allItems);
      addMoveToLog({ moveName: move.name, moveImage: move.image, damages, heals, shields });
      flashCard(card);
      return;
    }

    openLinePicker(card, move, allItems);
    if (activePicker) activePicker._sourceCard = card;
  });
}

// ── injectCombatLogStyles ─────────────────────────────────────────────────────

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

    .dmg-wild-cap {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      margin-left: 6px;
      padding: 1px 6px;
      background: rgba(255, 152, 0, 0.12);
      border: 1px solid rgba(255, 152, 0, 0.4);
      border-radius: 10px;
      font-size: 0.72rem;
      font-weight: 700;
      color: #ff9800;
      vertical-align: middle;
      white-space: nowrap;
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

    /* ── Line picker ─────────────────────────────────────────────────────── */
    .cl-line-picker {
      position: fixed;
      z-index: 9999;
      background: #1a1a2e;
      border: 1px solid #444;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.75);
      font-family: 'Exo 2', sans-serif;
      font-size: 0.82rem;
      min-width: 260px;
      max-width: 340px;
      overflow: hidden;
      animation: pickerFadeIn 0.12s ease-out;
    }

    @keyframes pickerFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .cl-picker-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      background: #12122a;
      border-bottom: 1px solid #2a2a44;
    }

    .cl-picker-header img {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .cl-picker-header span {
      flex: 1;
      color: #d0c8ff;
      font-weight: 700;
      font-size: 0.88rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cl-picker-close {
      background: none;
      border: none;
      color: #666;
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      transition: color 0.15s;
      flex-shrink: 0;
    }
    .cl-picker-close:hover { color: #f44; }

    .cl-picker-list {
      padding: 6px 4px;
      max-height: 300px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .cl-picker-section-sep {
      padding: 4px 10px 2px;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #555;
      border-top: 1px solid #252540;
      margin-top: 2px;
    }
    .cl-picker-section-sep:first-child {
      border-top: none;
      margin-top: 0;
    }

    .cl-picker-row {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 5px 10px;
      border-radius: 7px;
      cursor: pointer;
      transition: background 0.12s;
      user-select: none;
      flex-wrap: wrap;
    }
    .cl-picker-row:hover { background: #252545; }

    .cl-picker-row input[type="checkbox"] {
      width: 14px;
      height: 14px;
      accent-color: #c8b8ff;
      cursor: pointer;
      flex-shrink: 0;
    }

    .cl-picker-icon {
      font-size: 0.88rem;
      flex-shrink: 0;
    }

    .cl-picker-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cl-picker-val {
      font-weight: 700;
      font-size: 0.9rem;
      flex-shrink: 0;
    }

    .cl-picker-dmg   { color: #ff9999; }
    .cl-picker-heal  { color: #4caf82; }
    .cl-picker-shield { color: #64b5f6; }

    .cl-picker-footer {
      display: flex;
      gap: 6px;
      padding: 8px 10px;
      background: #12122a;
      border-top: 1px solid #2a2a44;
    }

    .cl-picker-btn {
      border: none;
      border-radius: 7px;
      padding: 5px 10px;
      font-size: 0.78rem;
      font-family: 'Exo 2', sans-serif;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .cl-picker-all {
      background: #2a2a44;
      color: #aaa;
    }
    .cl-picker-all:hover { background: #3a3a5a; color: #fff; }

    .cl-picker-none {
      background: #2a2a44;
      color: #aaa;
    }
    .cl-picker-none:hover { background: #3a3a5a; color: #fff; }

    .cl-picker-confirm {
      flex: 1;
      background: linear-gradient(135deg, #4a3a8a, #6a4aaa);
      color: #fff;
      font-size: 0.85rem;
    }
    .cl-picker-confirm:hover { background: linear-gradient(135deg, #5a4a9a, #7a5aba); }

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

    /* ── Crit controls in line picker ── */
    .cl-crit-controls {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
      margin-left: auto;
      flex-shrink: 0;
    }

    .cl-counter-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .cl-crit-label {
      font-size: 0.72rem;
      color: #888;
      white-space: nowrap;
    }

    /* Normal / Crit toggle buttons */
    .cl-crit-toggle {
      border: 1px solid #444;
      border-radius: 5px;
      background: #1e1e35;
      color: #888;
      font-size: 0.7rem;
      font-family: 'Exo 2', sans-serif;
      font-weight: 700;
      padding: 2px 7px;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .cl-crit-toggle:hover { background: #2a2a4a; color: #ccc; }
    .cl-crit-toggle.active {
      background: #2a2a4a;
      border-color: #6a5aaa;
      color: #c8b8ff;
    }
    .cl-crit-toggle-crit.active {
      background: rgba(239,83,80,0.15);
      border-color: #ef5350;
      color: #ef5350;
    }

    /* Multi-hit counter */
    .cl-crit-btn {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1px solid #444;
      background: #1e1e35;
      color: #aaa;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.12s;
      flex-shrink: 0;
    }
    .cl-crit-btn:hover { background: #2a2a4a; color: #fff; }

    .cl-hit-count, .cl-crit-count {
      font-size: 0.85rem;
      font-weight: 700;
      color: #aaa;
      min-width: 14px;
      text-align: center;
    }
    .cl-crit-max, .cl-hit-max-ref {
      font-size: 0.72rem;
      color: #555;
    }

    /* Ligne de scaling info (H1:×1 H2:×0.8 H3:×0.6) */
    .cl-tick-scaling-info {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      padding: 3px 0 4px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      border-bottom: 1px solid #252545;
      margin-bottom: 4px;
      width: 100%;
    }

    /* Valeur avec tooltip dispo */
    .cl-picker-val[title] {
      text-decoration: underline dashed;
      text-underline-offset: 3px;
      cursor: help;
    }

    .dmg-tick-toggle, .heal-tick-toggle, .shield-tick-toggle {
      cursor: default;
      transition: opacity 0.15s;
    }
    .dmg-tick-toggle:hover, .heal-tick-toggle:hover, .shield-tick-toggle:hover {
      opacity: 0.85;
    }
    .tick-badge {
      font-size: 0.85em;
      opacity: 0.85;
      margin-left: 3px;
      vertical-align: super;
    }

    #attackerImage {
      cursor: context-menu;
    }
  `;

  document.head.appendChild(style);
}

// ── Export attachMoveCardClickHandler (utilisé dans calculator.js) ────────────
export { attachMoveCardClickHandler };