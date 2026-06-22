/**
 * howToUse.js
 * Modal "How to Use" + raccourcis clavier globaux
 */

// ── Tab 1: Damage Calculator ──────────────────────────────────────────────────
const DAMAGE_CALC_SECTIONS = [
  {
    icon: '⚔️',
    title: 'Attacker & Defender',
    color: '#9f53ec',
    items: [
      'Select any Pokémon in the left grid (attacker) and right grid (defender).',
      'Use the <kbd>search bar</kbd> to filter Pokémon by name.',
      'Use the <kbd>category tabs</kbd> (Playable / Wild / Other) to switch between playable Pokémon, wild mobs, and special targets.',
      'The <strong>Substitute Doll</strong> and <strong>Custom Doll</strong> are special targets - Custom Doll lets you set HP, DEF and Sp.Def manually by clicking the values.',
    ]
  },
  {
    icon: '🎒',
    title: 'Items',
    color: '#4fc3f7',
    items: [
      'Click an item slot to open the item picker. All items are at <strong>level 40</strong> (tournament format).',
      'Stackable items (Attack Weight, Drive Lens…) show a counter - adjust stacks to see the bonus.',
      'Some items have an <strong>Activate</strong> button to toggle their effect on/off (e.g. X-Attack, Slick Spoon).',
      'Click <strong>Reset Items</strong> to clear all slots at once.',
    ]
  },
  {
    icon: '📊',
    title: 'Levels & HP',
    color: '#4caf82',
    items: [
      'Use the <strong>Level slider</strong> to set the attacker or defender level (1–15).',
      'Use the <strong>HP slider</strong> to simulate current HP (affects % HP scaling moves).',
      '<strong>Click the HP value</strong> directly to type an exact HP number.',
      'For wild mobs with a timer (Regieleki, etc.), use the <strong>Timer slider</strong> instead of a level.',
    ]
  },
  {
    icon: '💥',
    title: 'Damage Cards',
    color: '#ff9d00',
    items: [
      'Each move card shows all its damage lines, heals and shields calculated in real time.',
      'For multi-hit moves, click the <strong>×N</strong> badge to expand hit count controls.',
      '<strong>Hover a damage line name</strong> to see its raw formula (base + stat scaling + level coeff).',
      'Values in <span style="color:#ef5350;">red parentheses</span> are crit damage. Values in <span style="color:#4caf82;">green</span> are heals. <span style="color:#ffd740;">Yellow</span> are shields.',
      '<strong>Click a move card</strong> to add it to the Combat Log.',
    ]
  },
  {
    icon: '⚡',
    title: 'Buffs & Debuffs',
    color: '#ffd740',
    items: [
      'Expand the <strong>Universal Offensive Buffs/Debuffs</strong> sections (click the header) to toggle ally buffs and enemy debuffs on the attacker.',
      'Expand the <strong>Defensive Buffs/Debuffs</strong> sections on the defender side similarly.',
      'Some debuffs are stackable - a counter appears when you check the box.',
      'Passive effects and Move Effects are shown as colored blocks under the Pokémon stats card.',
    ]
  },
  {
    icon: '🤝',
    title: 'Allies',
    color: '#4fc3f7',
    items: [
      'Click the <strong>＋</strong> button in the Allies section to add up to 4 ally Pokémon.',
      'When allies are set, heal and shield values will show separate columns per ally with their portrait.',
      'Click an ally\'s portrait to remove them.',
    ]
  },
];

// ── Tab 2: Build Optimizer ────────────────────────────────────────────────────
const BUILD_OPTIMIZER_SECTIONS = [
  {
    icon: '🧩',
    title: 'What it does',
    color: '#9f53ec',
    items: [
      'The Build Optimizer automatically tests combinations of held items to find the <strong>best 3-item build</strong> for a chosen Pokémon.',
      'Pick the Pokémon to optimize, then let it search through item combinations and rank them by score.',
      'You can lock one or more item slots if you already know part of the build, and the optimizer will only search the remaining slots.',
      'Use <strong>Exclude items</strong> to remove specific items from the search (e.g. items you don\'t own or never want to use).',
    ]
  },
  {
    icon: '🎯',
    title: 'Optimization modes',
    color: '#ff9d00',
    items: [
      '<strong>⚔️ Damage</strong> - scores builds by total damage dealt to the enemies you configure.',
      '<strong>🛡️ Defense</strong> - scores builds by how much damage the attacker survives/mitigates instead of dealing.',
      '<strong>💚 Heal (Self)</strong> - scores builds by self-healing output (lifesteal, recovery moves, etc.).',
      '<strong>🤝 Heal (Ally)</strong> - scores builds for support Pokémon by healing/shielding provided to an ally.',
    ]
  },
  {
    icon: '👥',
    title: 'Enemies & priority targets',
    color: '#4caf82',
    items: [
      'Add one or more enemy Pokémon with their own level and items to simulate a real matchup.',
      'Mark an enemy as a <strong>priority target</strong> to weigh it more heavily in the score (e.g. 2× points compared to normal enemies).',
      'The optimizer re-runs the simulation for every tested build against all configured enemies.',
    ]
  },
  {
    icon: '🚀',
    title: 'Running the search',
    color: '#4fc3f7',
    items: [
      'Click <strong>Run</strong> to start the optimization - it runs in the background (Web Worker) so the rest of the app stays responsive.',
      'The result list shows the top builds ranked by score, with the breakdown of damage/heal/shield per build.',
      'This feature is marked <strong>[BETA]</strong> - results are a strong baseline but may not capture every bespoke passive interaction.',
    ]
  },
];

// ── Tab 3: Combat Log ─────────────────────────────────────────────────────────
const COMBAT_LOG_SECTIONS = [
  {
    icon: '📋',
    title: 'What it does',
    color: '#9f53ec',
    items: [
      'The Combat Log lets you build a full <strong>5v5 + 1 target</strong> scenario instead of a single attacker vs. defender.',
      'Fill the purple team and orange team slots with up to 5 Pokémon each, plus one shared Target to attack.',
      'Each slot keeps its own level, items, and stacks - just like the main Calculator.',
    ]
  },
  {
    icon: '🖱️',
    title: 'Logging moves',
    color: '#ff9d00',
    items: [
      'Click any move card on a slot to open a line picker, then choose which damage/heal/shield lines to log.',
      'For crittable lines, toggle between <strong>Normal</strong> and <strong>Crit</strong> before confirming.',
      'Logged entries accumulate in the Combat Log so you can reconstruct combos and trades between multiple Pokémon.',
    ]
  },
  {
    icon: '🎯',
    title: 'Target HP tracking',
    color: '#4caf82',
    items: [
      'The shared <strong>Target</strong> slot tracks HP in real time as you log damage against it.',
      'Use this to check whether a combo from one or several attackers is enough to secure a kill.',
      'Click <strong>Clear</strong> to reset the log and the Target\'s HP.',
    ]
  }
];

const SHORTCUTS = [
  { keys: ['?'],        desc: 'Open / close this help modal' },
  { keys: ['Escape'],   desc: 'Close any open modal' },
  { keys: ['A'],        desc: 'Focus the attacker search bar' },
  { keys: ['D'],        desc: 'Focus the defender search bar' },
  { keys: ['R'],        desc: 'Reset attacker items' },
  { keys: ['Shift','R'],desc: 'Reset defender items' },
  { keys: ['L'],        desc: 'Clear the Combat Log' },
  { keys: ['←'],        desc: 'Decrease attacker level by 1' },
  { keys: ['→'],        desc: 'Increase attacker level by 1' },
  { keys: ['↓'],        desc: 'Decrease attacker HP by 10%' },
  { keys: ['↑'],        desc: 'Increase attacker HP by 10%' },
];

// ── DOM ────────────────────────────────────────────────────────────────────────
function buildModal() {
  const overlay = document.createElement('div');
  overlay.id = 'howToUseModal';
  overlay.className = 'htu-overlay';
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('role', 'dialog');

  overlay.innerHTML = `
    <div class="htu-modal">
      <button class="htu-close" title="Close (Esc)">×</button>

      <div class="htu-header">
        <span class="htu-logo">📖</span>
        <h2 class="htu-title">How to Use</h2>
        <p class="htu-subtitle">Pokémon UNITE Damage Calculator</p>
      </div>

      <div class="htu-tabs">
        <button class="htu-tab active" data-tab="damage-calculator">Damage Calculator</button>
        <button class="htu-tab" data-tab="build-optimizer">Build Optimizer</button>
        <button class="htu-tab" data-tab="combat-log">Combat Log</button>
        <button class="htu-tab" data-tab="shortcuts">Keyboard Shortcuts</button>
      </div>

      <div class="htu-body">

        <!-- DAMAGE CALCULATOR TAB -->
        <div class="htu-pane active" id="htu-pane-damage-calculator">
          ${DAMAGE_CALC_SECTIONS.map(s => `
            <div class="htu-section">
              <div class="htu-section-header" style="--sec-color:${s.color}">
                <span class="htu-section-icon">${s.icon}</span>
                <span class="htu-section-title">${s.title}</span>
              </div>
              <ul class="htu-list">
                ${s.items.map(i => `<li>${i}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>

        <!-- BUILD OPTIMIZER TAB -->
        <div class="htu-pane" id="htu-pane-build-optimizer">
          ${BUILD_OPTIMIZER_SECTIONS.map(s => `
            <div class="htu-section">
              <div class="htu-section-header" style="--sec-color:${s.color}">
                <span class="htu-section-icon">${s.icon}</span>
                <span class="htu-section-title">${s.title}</span>
              </div>
              <ul class="htu-list">
                ${s.items.map(i => `<li>${i}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>

        <!-- COMBAT LOG TAB -->
        <div class="htu-pane" id="htu-pane-combat-log">
          ${COMBAT_LOG_SECTIONS.map(s => `
            <div class="htu-section">
              <div class="htu-section-header" style="--sec-color:${s.color}">
                <span class="htu-section-icon">${s.icon}</span>
                <span class="htu-section-title">${s.title}</span>
              </div>
              <ul class="htu-list">
                ${s.items.map(i => `<li>${i}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>

        <!-- SHORTCUTS TAB -->
        <div class="htu-pane" id="htu-pane-shortcuts">
          <p class="htu-shortcuts-note">Shortcuts are disabled when typing in a search field.</p>
          <div class="htu-shortcuts-grid">
            ${SHORTCUTS.map(s => `
              <div class="htu-shortcut-row">
                <div class="htu-keys">
                  ${s.keys.map(k => `<kbd>${k}</kbd>`).join('<span class="htu-plus">+</span>')}
                </div>
                <span class="htu-shortcut-desc">${s.desc}</span>
              </div>
            `).join('')}
          </div>
          <div class="htu-shortcuts-note" style="margin-top:1.2rem;">
            💡 Arrow keys only work when no input or slider is focused.
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Tab switching
  overlay.querySelectorAll('.htu-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('.htu-tab').forEach(t => t.classList.remove('active'));
      overlay.querySelectorAll('.htu-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      overlay.querySelector(`#htu-pane-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Close
  overlay.querySelector('.htu-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  return overlay;
}

function openModal() {
  let overlay = document.getElementById('howToUseModal');
  if (!overlay) overlay = buildModal();
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('howToUseModal');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ── Bouton How To Use ──────────────────────────────────────────────────────────
function createHowToUseButton() {
  const btn = document.getElementById('howToUseBtn');
  if (!btn) return;
  btn.addEventListener('click', openModal);
}

// ── Raccourcis clavier ─────────────────────────────────────────────────────────
function isTyping() {
  const el = document.activeElement;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // Toujours : Escape ferme n'importe quelle modal ouverte
    if (e.key === 'Escape') {
      closeModal();
      // Ferme aussi item modal / warning
      const itemModal = document.getElementById('itemSelectorModal');
      if (itemModal) itemModal.style.display = 'none';
      const warningModal = document.getElementById('warningModal');
      if (warningModal) warningModal.style.display = 'none';
      const allyModal = document.getElementById('allyPickerModal');
      if (allyModal) allyModal.style.display = 'none';
      return;
    }

    // Ouvre la modal help (même depuis un input)
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const overlay = document.getElementById('howToUseModal');
      if (overlay?.classList.contains('open')) closeModal();
      else openModal();
      return;
    }

    // Les autres shortcuts ignorés si on tape
    if (isTyping()) return;

    switch (e.key) {
      case 'a':
      case 'A': {
        e.preventDefault();
        const sa = document.getElementById('searchAttacker');
        if (sa) { sa.focus(); sa.select(); }
        break;
      }
      case 'd':
      case 'D': {
        e.preventDefault();
        const sd = document.getElementById('searchDefender');
        if (sd) { sd.focus(); sd.select(); }
        break;
      }
      case 'r':
      case 'R': {
        e.preventDefault();
        if (e.shiftKey) {
          document.querySelector('.reset-items-btn[data-side="defender"]')?.click();
        } else {
          document.querySelector('.reset-items-btn[data-side="attacker"]')?.click();
        }
        break;
      }
      case 'l':
      case 'L': {
        e.preventDefault();
        document.getElementById('clClearBtn')?.click();
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const slider = document.getElementById('levelSliderAttacker');
        if (slider) {
          slider.value = Math.max(1, parseInt(slider.value) - 1);
          slider.dispatchEvent(new Event('input'));
        }
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        const slider = document.getElementById('levelSliderAttacker');
        if (slider) {
          slider.value = Math.min(15, parseInt(slider.value) + 1);
          slider.dispatchEvent(new Event('input'));
        }
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        const hpSlider = document.getElementById('hpSliderAttacker');
        if (hpSlider) {
          hpSlider.value = Math.max(0, parseInt(hpSlider.value) - 10);
          hpSlider.dispatchEvent(new Event('input'));
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const hpSlider = document.getElementById('hpSliderAttacker');
        if (hpSlider) {
          hpSlider.value = Math.min(100, parseInt(hpSlider.value) + 10);
          hpSlider.dispatchEvent(new Event('input'));
        }
        break;
      }
    }
  });
}

// ── Init ───────────────────────────────────────────────────────────────────────
export function initHowToUse() {
  createHowToUseButton();
  setupKeyboardShortcuts();
}