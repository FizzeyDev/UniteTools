(function () {
  'use strict';

  const FLIP_STAGGER_MS = 650;
  const FLIP_DUR_MS     = 400;
  const STORAGE_KEY     = 'uniteDle_v1';

  const DIFF_LEVELS  = ['Novice', 'Intermédiaire', 'Expert'];
  const STADE_LEVELS = ['Base', '1ère évo', '2ème évo'];

  const ROLE_CLASSES = {
    'Attaquant':   'role-attaquant',
    'Défenseur':   'role-défenseur',
    'All-Rounder': 'role-all-rounder',
    'Rapide':      'role-rapide',
    'Soutien':     'role-soutien',
  };

  function t(key) {
    const lang = currentLang();
    const dict = (window.translations || {})[lang]
              || (window.translations || {})['fr']
              || {};
    return dict[key] || (window.translations?.fr?.[key]) || key;
  }

  function tv(category, value) {
    const lang = currentLang();
    if (lang === 'fr') return value;
    const catMap = ((window.UNITE_TRANSLATIONS || {})[lang] || {})[category] || {};
    return catMap[value] || value;
  }

  function currentLang() {
    return localStorage.getItem('lang') || 'fr';
  }

  function scoreEmoji(n) {
    if (n <= 3) return '🥇';
    if (n <= 5) return '🥈';
    return '🥉';
  }

  function getParisSeed() {
    const now = new Date();
    const off = getParisTZOffset(now);
    const pd  = new Date(now.getTime() + (now.getTimezoneOffset() + off) * 60000);
    const y = pd.getFullYear(), m = pd.getMonth() + 1, d = pd.getDate();
    return {
      seed:    y * 10000 + m * 100 + d,
      dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
    };
  }

  function getParisTZOffset(date) {
    const y = date.getUTCFullYear();
    return (date.getTime() >= lastSundayOf(y,2,2) && date.getTime() < lastSundayOf(y,9,1)) ? 120 : 60;
  }

  function lastSundayOf(year, month, hour) {
    const d = new Date(Date.UTC(year, month + 1, 0, hour));
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d.getTime();
  }

  function msUntilMidnightParis() {
    const now = new Date();
    const off = getParisTZOffset(now);
    const pd  = new Date(now.getTime() + (now.getTimezoneOffset() + off) * 60000);
    const next = new Date(pd);
    next.setHours(24, 0, 0, 0);
    return next.getTime() - pd.getTime();
  }

  let secret    = null;
  let guesses   = [];
  let gameOver  = false;
  let todayStr  = '';
  let countdown = null;

  const inputEl    = document.getElementById('udle-input');
  const suggestEl  = document.getElementById('udle-suggestions');
  const guessesEl  = document.getElementById('udle-guesses');
  const triesEl    = document.getElementById('udle-tries');
  const totalEl    = document.getElementById('udle-total');
  const emptyEl    = document.getElementById('udle-empty');
  const endmsgEl   = document.getElementById('udle-endmsg');
  const endInnerEl = document.getElementById('udle-endmsg-inner');
  const colLabels  = document.getElementById('udle-col-labels');

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        date:     todayStr,
        secret:   secret.name,
        guesses:  guesses.map(g => g.name),
        gameOver,
        won: gameOver && guesses[guesses.length - 1]?.name === secret.name,
      }));
    } catch(e) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data.date === todayStr ? data : null;
    } catch(e) { return null; }
  }

  function init() {
    if (countdown) { clearInterval(countdown); countdown = null; }

    const { seed, dateStr } = getParisSeed();
    todayStr = dateStr;
    secret   = UNITE_POKEMON[seed % UNITE_POKEMON.length];
    totalEl.textContent = UNITE_POKEMON.length;

    guessesEl.innerHTML     = '';
    endmsgEl.style.display  = 'none';
    colLabels.style.display = 'none';
    inputEl.disabled        = false;
    inputEl.value           = '';
    triesEl.textContent     = '0';
    emptyEl.style.display   = 'block';
    guesses  = [];
    gameOver = false;

    const saved = loadState();
    if (saved) {
      saved.guesses.forEach(name => {
        const poke = UNITE_POKEMON.find(p => p.name === name);
        if (poke) { guesses.push(poke); addRow(poke, true); }
      });
      triesEl.textContent = guesses.length;

      if (saved.gameOver) {
        gameOver = true;
        inputEl.disabled = true;
        if (saved.won) showAlreadyWon();
        return;
      }
    }
  }

  function evoStr(poke) {
    return poke.evo_niveaux ? `Lvl ${poke.evo_niveaux}` : t('udle_no_evo');
  }

  function megaSuffixStr(poke) {
    if (!poke.mega) return '';
    return currentLang() === 'en' ? ' · Mega ✔' : ' · Méga ✔';
  }

  function triesLabel(n) {
    return n > 1 ? t('udle_win_tries') : t('udle_win_try');
  }

  function buildEndHTML(title, bodyLine) {
    return `
      <h2>${title}</h2>
      <div class="udle-answer-reveal">
        <img src="${secret.img}" alt="${secret.name}">
        <span class="udle-answer-name">${secret.name}</span>
      </div>
      <p>${bodyLine}</p>
      <p class="udle-next-label">${t('udle_next_label')}</p>
      <div class="udle-countdown" id="udle-countdown">—</div>
    `;
  }

  function showAlreadyWon() {
    endmsgEl.style.display = 'block';
    endInnerEl.className   = 'udle-endmsg-inner win';
    endInnerEl.innerHTML   = buildEndHTML(
      `${scoreEmoji(guesses.length)} ${t('udle_already_won_title')}`,
      `${t('udle_already_won_text')} <b>${guesses.length}</b> ${triesLabel(guesses.length)} !
       &nbsp;·&nbsp; ${tv('role', secret.role)} &nbsp;·&nbsp; ${evoStr(secret)}${megaSuffixStr(secret)}`
    );
    startCountdown();
  }

  function endGame(won) {
    endmsgEl.style.display = 'block';
    endInnerEl.className   = 'udle-endmsg-inner win';
    endInnerEl.innerHTML   = buildEndHTML(
      `${scoreEmoji(guesses.length)} ${t('udle_win_title')}`,
      `${t('udle_win_found_in')} <b>${guesses.length}</b> ${triesLabel(guesses.length)} !
       &nbsp;·&nbsp; ${tv('role', secret.role)} &nbsp;·&nbsp; ${evoStr(secret)}${megaSuffixStr(secret)}`
    );
    startCountdown();
    endmsgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function startCountdown() {
    function tick() {
      const ms = msUntilMidnightParis();
      const el = document.getElementById('udle-countdown');
      if (!el) return;
      if (ms <= 0) { clearInterval(countdown); init(); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000)   / 1000);
      el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    tick();
    countdown = setInterval(tick, 1000);
  }

  function compareEvo(g, s) {
    if (g === null && s === null) return { status: 'correct', arrow: '' };
    if (g === null || s === null) return { status: 'wrong',   arrow: '' };
    if (g === s)                  return { status: 'correct', arrow: '' };
    const gF = parseInt(g.split('/')[0]), sF = parseInt(s.split('/')[0]);
    if (gF < sF) return { status: 'wrong', arrow: '🔼' };
    if (gF > sF) return { status: 'wrong', arrow: '🔽' };
    const gP = g.split('/'), sP = s.split('/');
    if (gP.length > 1 && sP.length > 1) {
      const g2 = parseInt(gP[1]), s2 = parseInt(sP[1]);
      if (g2 < s2) return { status: 'wrong', arrow: '🔼' };
      if (g2 > s2) return { status: 'wrong', arrow: '🔽' };
    }
    return { status: 'partial', arrow: '' };
  }

  function compareOrdered(gVal, sVal, levels) {
    if (gVal === sVal) return { status: 'correct', arrow: '' };
    const gi = levels.indexOf(gVal), si = levels.indexOf(sVal);
    return gi < si ? { status: 'wrong', arrow: '🔼' } : { status: 'wrong', arrow: '🔽' };
  }

  function compareNum(g, s) {
    if (g === s) return { status: 'correct', arrow: '' };
    return g < s ? { status: 'wrong', arrow: '🔼' } : { status: 'wrong', arrow: '🔽' };
  }

  function compareUniteCost(g, s) {
    if (g === null && s === null) return { status: 'correct', arrow: '' };
    if (g === null || s === null) return { status: 'wrong',   arrow: '' };
    return compareNum(g, s);
  }

  function compareGuess(g) {
    const s = secret;
    return {
      role:        { status: g.role   === s.role   ? 'correct' : 'wrong', arrow: '' },
      portee:      { status: g.portee === s.portee ? 'correct' : 'wrong', arrow: '' },
      diff:        compareOrdered(g.difficulte, s.difficulte, DIFF_LEVELS),
      annee:       compareNum(g.annee, s.annee),
      stade:       compareOrdered(g.stade, s.stade, STADE_LEVELS),
      evo:         compareEvo(g.evo_niveaux, s.evo_niveaux),
      mega:        { status: g.mega === s.mega ? 'correct' : 'wrong', arrow: '' },
      unite_cost:  compareUniteCost(g.unite_move_cost, s.unite_move_cost),
    };
  }

  function makeFlipCard(label, value, result, index, silent) {
    const wrap  = document.createElement('div');
    wrap.className = 'udle-flip';
    const inner = document.createElement('div');
    inner.className = 'udle-flip-inner';
    const back  = document.createElement('div');
    back.className = 'udle-flip-back';
    const front = document.createElement('div');
    front.className = `udle-flip-front ${result.status}`;
    front.innerHTML = `
      <span class="card-label">${label}</span>
      <span class="card-value">${value}</span>
      ${result.arrow ? `<span class="card-arrow">${result.arrow}</span>` : ''}
    `;
    inner.appendChild(back);
    inner.appendChild(front);
    wrap.appendChild(inner);
    silent
      ? wrap.classList.add('flipped')
      : setTimeout(() => wrap.classList.add('flipped'), index * FLIP_STAGGER_MS + 60);
    return wrap;
  }

  function uniteCostLabel(cost) {
    if (cost === null) return '?';
    return cost.toLocaleString();
  }

  function buildRow(g, silent) {
    const c   = compareGuess(g);
    const row = document.createElement('div');
    row.className        = 'udle-guess-row';
    row.dataset.pokename = g.name;

    const pokeId = document.createElement('div');
    pokeId.className = 'udle-poke-id';
    pokeId.innerHTML = `
      <img src="${g.img}" alt="${g.name}" loading="lazy"
           onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
      <span class="udle-poke-id-name">${g.name}</span>
    `;
    row.appendChild(pokeId);

    const cards = document.createElement('div');
    cards.className = 'udle-cards';

    const evoLabel  = g.evo_niveaux ? `Lvl ${g.evo_niveaux}` : '—';
    const megaLabel = g.mega ? t('udle_mega_yes') : t('udle_mega_no');

    const defs    = [
      { labelKey: 'udle_card_role',        value: tv('role',       g.role)       },
      { labelKey: 'udle_card_portee',      value: tv('portee',     g.portee)     },
      { labelKey: 'udle_card_diff',        value: tv('difficulte', g.difficulte) },
      { labelKey: 'udle_card_annee',       value: String(g.annee)                },
      { labelKey: 'udle_card_stade',       value: tv('stade',      g.stade)      },
      { labelKey: 'udle_card_evo',         value: evoLabel                       },
      { labelKey: 'udle_card_mega',        value: megaLabel                      },
      { labelKey: 'udle_card_unite_cost',  value: uniteCostLabel(g.unite_move_cost) },
    ];
    const results = [c.role, c.portee, c.diff, c.annee, c.stade, c.evo, c.mega, c.unite_cost];

    defs.forEach((d, i) => cards.appendChild(
      makeFlipCard(t(d.labelKey), d.value, results[i], i, silent)
    ));

    row.appendChild(cards);
    return row;
  }

  function addRow(g, silent = false) {
    colLabels.style.display = 'flex';
    emptyEl.style.display   = 'none';
    guessesEl.insertBefore(buildRow(g, silent), guessesEl.firstChild);
    return (8 - 1) * FLIP_STAGGER_MS + FLIP_DUR_MS + 60;
  }

  function rerenderRows() {
    const pokeNames = [...guessesEl.querySelectorAll('.udle-guess-row')]
      .map(r => r.dataset.pokename)
      .reverse();

    guessesEl.innerHTML = '';
    pokeNames.forEach(name => {
      const poke = UNITE_POKEMON.find(p => p.name === name);
      if (poke) guessesEl.insertBefore(buildRow(poke, true), guessesEl.firstChild);
    });

    if (gameOver && endmsgEl.style.display !== 'none') {
      if (countdown) { clearInterval(countdown); countdown = null; }
      if (endInnerEl.classList.contains('win')) showAlreadyWon();
    }
  }

  function makeGuess(poke) {
    if (gameOver) return;
    if (guesses.find(g => g.name === poke.name)) {
      inputEl.style.borderColor = 'var(--red)';
      setTimeout(() => { inputEl.style.borderColor = ''; }, 600);
      inputEl.value = '';
      closeSugg();
      return;
    }

    guesses.push(poke);
    triesEl.textContent = guesses.length;
    const flipTime = addRow(poke, false);

    if (poke.name === secret.name) {
      gameOver = true;
      inputEl.disabled = true;
      saveState();
      setTimeout(() => endGame(true), flipTime + 100);
    } else {
      saveState();
    }

    inputEl.value = '';
    closeSugg();
  }

  function openSugg(q) {
    q = q.trim().toLowerCase();
    if (!q) { closeSugg(); return; }
    const done = new Set(guesses.map(g => g.name));
    const res  = UNITE_POKEMON
      .filter(p => p.name.toLowerCase().includes(q) && !done.has(p.name))
      .slice(0, 8);
    if (!res.length) { closeSugg(); return; }

    suggestEl.innerHTML = res.map(p => `
      <li class="udle-sugg-item" data-name="${p.name}">
        <img src="${p.img}" alt="${p.name}" onerror="this.style.display='none'">
        <span>${p.name}</span>
        <span class="udle-sugg-role ${ROLE_CLASSES[p.role] || ''}">${tv('role', p.role)}</span>
      </li>`).join('');

    suggestEl.querySelectorAll('.udle-sugg-item').forEach(li => {
      li.addEventListener('mousedown', e => {
        e.preventDefault();
        const poke = UNITE_POKEMON.find(p => p.name === li.dataset.name);
        if (poke) makeGuess(poke);
      });
    });
    suggestEl.classList.add('open');
  }

  function closeSugg() {
    suggestEl.classList.remove('open');
    suggestEl.innerHTML = '';
  }

  inputEl.addEventListener('input',   () => openSugg(inputEl.value));
  inputEl.addEventListener('focus',   () => openSugg(inputEl.value));
  inputEl.addEventListener('blur',    () => setTimeout(closeSugg, 150));
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = suggestEl.querySelector('.udle-sugg-item');
      if (first) {
        const poke = UNITE_POKEMON.find(p => p.name === first.dataset.name);
        if (poke) makeGuess(poke);
      }
    }
    if (e.key === 'Escape') closeSugg();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.udle-search-box')) closeSugg();
  });

  let initialized = false;

  function doInit() {
    init();
    initialized = true;
  }

  function waitForTranslationsAndInit() {
    if (window.translations && window.translations['fr']) {
      doInit();
    } else {
      document.addEventListener('translationsReady', function onFirst() {
        document.removeEventListener('translationsReady', onFirst);
        doInit();
      });
      setTimeout(() => { if (!initialized) doInit(); }, 800);
    }
  }

  document.addEventListener('translationsReady', () => {
    if (initialized) rerenderRows();
  });

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', waitForTranslationsAndInit)
    : waitForTranslationsAndInit();

})();