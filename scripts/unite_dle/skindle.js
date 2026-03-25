(function () {
  'use strict';

  /* ═══════════════════════════════════════════
     CONFIGURATION
  ═══════════════════════════════════════════ */

  const ZOOM_LEVELS = [
    { scale: 5.0, labelKey: 'skindle_zoom_5'   },
    { scale: 3.5, labelKey: 'skindle_zoom_3_5' },
    { scale: 2.5, labelKey: 'skindle_zoom_2_5' },
    { scale: 1.8, labelKey: 'skindle_zoom_1_8' },
    { scale: 1.2, labelKey: 'skindle_zoom_1_2' },
    { scale: 1.0, labelKey: 'skindle_zoom_full' },
  ];

  const MAX_POKE_TRIES = ZOOM_LEVELS.length - 1;
  const MAX_SKIN_TRIES = 6;

  const STORAGE_KEY = 'skindle_v1';

  /* ═══════════════════════════════════════════
     i18n
  ═══════════════════════════════════════════ */

  function currentLang() {
    return localStorage.getItem('lang') || 'fr';
  }

  function t(key) {
    const lang = currentLang();
    const dict = (window.translations || {})[lang]
              || (window.translations || {})['fr']
              || {};
    return dict[key] || (window.translations?.fr?.[key]) || key;
  }

  /* ═══════════════════════════════════════════
     UTILS
  ═══════════════════════════════════════════ */

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

  function normalizeName(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function seededRandom(seed) {
    let s = seed | 0;
    return function () {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  /* ═══════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════ */

  let secret      = null;
  let todayStr    = '';
  let todaySeed   = 0;
  let zoomStep    = 0;
  let zoomOffset  = { x: 50, y: 50 };

  let pokeGuesses   = [];
  let pokeGameOver  = false;

  let skinGuesses   = [];
  let skinGameOver  = false;
  let skinPhaseOpen = false;

  let countdown = null;

  /* ═══════════════════════════════════════════
     DOM
  ═══════════════════════════════════════════ */

  const imgEl          = document.getElementById('skindle-img');
  const zoomContainer  = document.getElementById('skindle-zoom-container');
  const zoomStepsEl    = document.getElementById('skindle-zoom-steps');

  const inputPokeEl    = document.getElementById('skindle-input-poke');
  const suggPokeEl     = document.getElementById('skindle-suggestions-poke');
  const guessesPokeEl  = document.getElementById('skindle-guesses-poke');
  const triesPokeEl    = document.getElementById('skindle-tries-poke');

  const phasePoke      = document.getElementById('skindle-phase-poke');
  const phaseSkin      = document.getElementById('skindle-phase-skin');

  const inputSkinEl    = document.getElementById('skindle-input-skin');
  const suggSkinEl     = document.getElementById('skindle-suggestions-skin');
  const guessessSkinEl = document.getElementById('skindle-guesses-skin');
  const triesSkinEl    = document.getElementById('skindle-tries-skin');
  const skinCounter    = document.getElementById('skindle-skin-counter');

  const foundPokeEl    = document.getElementById('skindle-found-poke');
  const endmsgEl       = document.getElementById('skindle-endmsg');
  const endInnerEl     = document.getElementById('skindle-endmsg-inner');

  // Static translated elements
  const backBtnEl         = document.getElementById('skindle-back-btn');
  const subtitleEl        = document.getElementById('skindle-subtitle');
  const triesPokeLabel    = document.getElementById('skindle-tries-poke-label');
  const triesSkinLabel    = document.getElementById('skindle-tries-skin-label');
  const phase1NumEl       = document.getElementById('skindle-phase1-num');
  const phase1TitleEl     = document.getElementById('skindle-phase1-title');
  const phase2NumEl       = document.getElementById('skindle-phase2-num');
  const phase2TitleEl     = document.getElementById('skindle-phase2-title');
  const legendCorrectEl   = document.getElementById('skindle-legend-correct');
  const legendWrongEl     = document.getElementById('skindle-legend-wrong');
  const legendArrowsEl    = document.getElementById('skindle-legend-arrows');

  /* ═══════════════════════════════════════════
     APPLY STATIC TRANSLATIONS
  ═══════════════════════════════════════════ */

  function applyStaticTranslations() {
    if (backBtnEl)       backBtnEl.textContent       = t('skindle_back_btn');
    if (subtitleEl)      subtitleEl.textContent      = t('skindle_subtitle');
    if (triesPokeLabel)  triesPokeLabel.textContent  = t('skindle_tries_poke_label');
    if (triesSkinLabel)  triesSkinLabel.textContent  = t('skindle_tries_skin_label');
    if (phase1NumEl)     phase1NumEl.textContent     = t('skindle_phase1_num');
    if (phase1TitleEl)   phase1TitleEl.innerHTML     = t('skindle_phase1_title');
    if (phase2NumEl)     phase2NumEl.textContent     = t('skindle_phase2_num');
    if (phase2TitleEl)   phase2TitleEl.innerHTML     = t('skindle_phase2_title');
    if (legendCorrectEl) legendCorrectEl.textContent = t('skindle_legend_correct');
    if (legendWrongEl)   legendWrongEl.textContent   = t('skindle_legend_wrong');
    if (legendArrowsEl)  legendArrowsEl.textContent  = t('skindle_legend_arrows');

    // Placeholders
    if (inputPokeEl) inputPokeEl.placeholder = t('skindle_input_poke_placeholder');
    if (inputSkinEl) inputSkinEl.placeholder = t('skindle_input_skin_placeholder');
  }

  /* ═══════════════════════════════════════════
     PERSISTENCE
  ═══════════════════════════════════════════ */

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        date:         todayStr,
        secretId:     secret.id,
        zoomStep,
        zoomOffset,
        pokeGuesses:  pokeGuesses.map(p => p.name),
        pokeGameOver,
        skinGuesses:  skinGuesses.slice(),
        skinGameOver,
        skinPhaseOpen,
      }));
    } catch(e) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return (data.date === todayStr && data.secretId === secret.id) ? data : null;
    } catch(e) { return null; }
  }

  /* ═══════════════════════════════════════════
     ZOOM
  ═══════════════════════════════════════════ */

  function applyZoom(animate = true) {
    const level = ZOOM_LEVELS[zoomStep];
    if (!animate) imgEl.style.transition = 'none';
    imgEl.style.transform      = `scale(${level.scale})`;
    imgEl.style.objectPosition = `${zoomOffset.x}% ${zoomOffset.y}%`;
    if (!animate) {
      void imgEl.offsetHeight;
      imgEl.style.transition = '';
    }
    renderZoomSteps();
  }

  function renderZoomSteps() {
    zoomStepsEl.innerHTML = '';
    for (let i = 0; i < ZOOM_LEVELS.length; i++) {
      const dot = document.createElement('div');
      dot.className = 'skindle-zoom-step';
      if      (i === zoomStep) dot.classList.add('active');
      else if (i <  zoomStep)  dot.classList.add('done');
      zoomStepsEl.appendChild(dot);
    }
    const lbl = document.createElement('div');
    lbl.className = 'skindle-zoom-label';
    lbl.innerHTML = `<span>${t(ZOOM_LEVELS[zoomStep].labelKey)}</span>`;
    zoomStepsEl.appendChild(lbl);
  }

  function dezoomOne() {
    if (zoomStep < ZOOM_LEVELS.length - 1) {
      zoomStep++;
      applyZoom(true);
    }
  }

  /* ═══════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════ */

  function init() {
    if (countdown) { clearInterval(countdown); countdown = null; }

    applyStaticTranslations();

    const { seed, dateStr } = getParisSeed();
    todayStr  = dateStr;
    todaySeed = seed;

    const skins = window.UNITE_SKINS;
    secret = skins[seed % skins.length];

    const rand = seededRandom(seed * 7 + 3);
    zoomOffset = {
      x: 20 + Math.floor(rand() * 60),
      y: 20 + Math.floor(rand() * 60),
    };

    imgEl.src = secret.img;
    imgEl.onerror = function () {
      this.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
      zoomContainer.style.background = 'var(--surface-3)';
    };

    zoomStep      = 0;
    pokeGuesses   = [];
    skinGuesses   = [];
    pokeGameOver  = false;
    skinGameOver  = false;
    skinPhaseOpen = false;

    triesPokeEl.textContent   = '0';
    triesSkinEl.textContent   = '0';
    guessesPokeEl.innerHTML   = '';
    guessessSkinEl.innerHTML  = '';
    foundPokeEl.innerHTML     = '';
    endmsgEl.style.display    = 'none';
    skinCounter.style.display = 'none';

    phasePoke.style.display = 'block';
    phaseSkin.style.display = 'none';

    inputPokeEl.disabled = false;
    inputPokeEl.value    = '';
    inputSkinEl.disabled = false;
    inputSkinEl.value    = '';

    applyZoom(false);

    const saved = loadState();
    if (saved) {
      restoreState(saved);
      return;
    }

    if (typeof window.detectPokemonZoomOffset === 'function') {
      window.detectPokemonZoomOffset(secret.img, seed, dateStr, secret.id)
        .then(offset => {
          zoomOffset = offset;
          applyZoom(false);
        })
        .catch(() => {});
    }
  }

  /* ═══════════════════════════════════════════
     RESTORE STATE
  ═══════════════════════════════════════════ */

  function restoreState(saved) {
    zoomStep   = saved.zoomStep;
    zoomOffset = saved.zoomOffset || zoomOffset;
    applyZoom(false);

    saved.pokeGuesses.forEach(name => {
      const poke = window.UNITE_POKEMON.find(p => p.name === name);
      if (poke) {
        pokeGuesses.push(poke);
        addPokeRow(poke, poke.name === secret.pokemon, true);
      }
    });
    triesPokeEl.textContent = pokeGuesses.length;

    if (saved.pokeGameOver) {
      pokeGameOver = true;
      inputPokeEl.disabled = true;
    }

    if (saved.skinPhaseOpen) {
      skinPhaseOpen = true;
      openSkinPhase(true);

      saved.skinGuesses.forEach(name => {
        const isCorrect = normalizeName(name) === normalizeName(secret.skinName);
        skinGuesses.push(name);
        addSkinRow(name, isCorrect, true);
      });
      triesSkinEl.textContent = skinGuesses.length;

      if (saved.skinGameOver) {
        skinGameOver = true;
        inputSkinEl.disabled = true;
        const last = saved.skinGuesses[saved.skinGuesses.length - 1];
        if (last && normalizeName(last) === normalizeName(secret.skinName)) {
          showWin();
        }
      }
    }
  }

  /* ═══════════════════════════════════════════
     PHASE 1 — GUESS POKEMON
  ═══════════════════════════════════════════ */

  function makePokeGuess(poke) {
    if (pokeGameOver) return;
    if (pokeGuesses.find(g => g.name === poke.name)) {
      shakeInput(inputPokeEl);
      inputPokeEl.value = '';
      closeSugg(suggPokeEl);
      return;
    }

    pokeGuesses.push(poke);
    triesPokeEl.textContent = pokeGuesses.length;

    const isCorrect = poke.name === secret.pokemon;
    addPokeRow(poke, isCorrect, false);

    if (isCorrect) {
      pokeGameOver = true;
      inputPokeEl.disabled = true;
      saveState();
      setTimeout(() => {
        skinPhaseOpen = true;
        saveState();
        openSkinPhase(false);
      }, 600);
    } else {
      dezoomOne();
      saveState();
      if (pokeGuesses.length >= MAX_POKE_TRIES) {
        pokeGameOver = true;
        inputPokeEl.disabled = true;
        saveState();
        setTimeout(() => {
          skinPhaseOpen = true;
          saveState();
          openSkinPhase(false);
        }, 800);
      }
    }

    inputPokeEl.value = '';
    closeSugg(suggPokeEl);
  }

  function addPokeRow(poke, isCorrect, silent) {
    const row = document.createElement('div');
    row.className = `skindle-guess-row-poke${isCorrect ? '' : ' wrong-poke'}`;

    const pokeData = window.UNITE_POKEMON.find(p => p.name === poke.name);
    const imgSrc   = pokeData ? pokeData.img : '';

    row.innerHTML = `
      <img src="${imgSrc}" alt="${poke.name}" onerror="this.style.display='none'">
      <span class="skindle-guess-poke-name">${poke.name}</span>
      <span class="skindle-guess-poke-result ${isCorrect ? 'correct' : 'wrong'}">
        ${isCorrect ? t('skindle_guess_correct') : t('skindle_guess_wrong_poke')}
      </span>
    `;

    if (!silent) row.style.animation = 'udle-fadein 0.3s ease';
    guessesPokeEl.insertBefore(row, guessesPokeEl.firstChild);
  }

  /* ═══════════════════════════════════════════
     PHASE 2 — OPEN SKIN PHASE
  ═══════════════════════════════════════════ */

  function openSkinPhase(silent) {
    phaseSkin.style.display   = 'block';
    skinCounter.style.display = 'inline-flex';

    const pokeData = window.UNITE_POKEMON.find(p => p.name === secret.pokemon);
    foundPokeEl.innerHTML = `
      ${pokeData ? `<img src="${pokeData.img}" alt="${secret.pokemon}" onerror="this.style.display='none'">` : ''}
      <div class="skindle-found-poke-info">
        <div class="skindle-found-poke-label">${t('skindle_found_poke_label')}</div>
        <div class="skindle-found-poke-name">${secret.pokemon}</div>
      </div>
    `;

    if (!silent) {
      phaseSkin.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ═══════════════════════════════════════════
     PHASE 2 — GUESS SKIN
  ═══════════════════════════════════════════ */

  function makeSkinGuess(name) {
    name = name.trim();
    if (!name || skinGameOver) return;

    if (skinGuesses.find(g => normalizeName(g) === normalizeName(name))) {
      shakeInput(inputSkinEl);
      inputSkinEl.value = '';
      closeSugg(suggSkinEl);
      return;
    }

    skinGuesses.push(name);
    triesSkinEl.textContent = skinGuesses.length;

    const isCorrect = normalizeName(name) === normalizeName(secret.skinName);
    addSkinRow(name, isCorrect, false);

    if (isCorrect) {
      skinGameOver = true;
      inputSkinEl.disabled = true;
      saveState();
      zoomStep = ZOOM_LEVELS.length - 1;
      applyZoom(true);
      setTimeout(() => showWin(), 900);
    } else {
      dezoomOne();
      saveState();
      if (skinGuesses.length >= MAX_SKIN_TRIES) {
        skinGameOver = true;
        inputSkinEl.disabled = true;
        saveState();
        zoomStep = ZOOM_LEVELS.length - 1;
        applyZoom(true);
        setTimeout(() => showLose(), 900);
      }
    }

    inputSkinEl.value = '';
    closeSugg(suggSkinEl);
  }

  function addSkinRow(name, isCorrect, silent) {
    const row = document.createElement('div');
    row.className = `skindle-guess-row-skin${isCorrect ? '' : ' wrong-skin'}`;
    row.innerHTML = `
      <span class="skindle-guess-skin-name">${name}</span>
      <span class="skindle-guess-skin-result ${isCorrect ? 'correct' : 'wrong'}">
        ${isCorrect ? t('skindle_guess_correct') : t('skindle_guess_wrong_skin')}
      </span>
    `;
    if (!silent) row.style.animation = 'udle-fadein 0.3s ease';
    guessessSkinEl.insertBefore(row, guessessSkinEl.firstChild);
  }

  /* ═══════════════════════════════════════════
     END GAME
  ═══════════════════════════════════════════ */

  function scoreEmoji(totalTries) {
    if (totalTries <= 2) return '🥇';
    if (totalTries <= 4) return '🥈';
    return '🥉';
  }

  function buildEndHTML(title, bodyLine, isWin) {
    const total = pokeGuesses.length + skinGuesses.length;
    return `
      <h2>${isWin ? scoreEmoji(total) : '😔'} ${title}</h2>
      <div class="skindle-end-skin-reveal">
        <img class="skindle-end-skin-img" src="${secret.img}" alt="${secret.skinName}"
             onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
        <div class="skindle-end-skin-info">
          <div class="skindle-end-skin-poke">${secret.pokemon}</div>
          <div class="skindle-end-skin-name">${secret.skinName} Style</div>
        </div>
      </div>
      <p>${bodyLine}</p>
      <p class="udle-next-label">${t('skindle_next_label')}</p>
      <div class="udle-countdown" id="skindle-countdown">—</div>
    `;
  }

  function showWin() {
    endmsgEl.style.display = 'block';
    endInnerEl.className   = 'udle-endmsg-inner win';
    const total = pokeGuesses.length + skinGuesses.length;
    const bodyLine = t('skindle_win_body')
      .replace('{poke}',  String(pokeGuesses.length))
      .replace('{skin}',  String(skinGuesses.length))
      .replace('{total}', String(total));
    endInnerEl.innerHTML = buildEndHTML(t('skindle_win_title'), bodyLine, true);
    startCountdown();
    endmsgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showLose() {
    endmsgEl.style.display = 'block';
    endInnerEl.className   = 'udle-endmsg-inner lose';
    const bodyLine = t('skindle_lose_body')
      .replace('{skin}',    secret.skinName)
      .replace('{pokemon}', secret.pokemon);
    endInnerEl.innerHTML = buildEndHTML(t('skindle_lose_title'), bodyLine, false);
    startCountdown();
    endmsgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function startCountdown() {
    function tick() {
      const ms = msUntilMidnightParis();
      const el = document.getElementById('skindle-countdown');
      if (!el) return;
      if (ms <= 0) { clearInterval(countdown); init(); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    tick();
    countdown = setInterval(tick, 1000);
  }

  /* ═══════════════════════════════════════════
     SUGGESTIONS
  ═══════════════════════════════════════════ */

  function openPokeSugg(q) {
    q = q.trim().toLowerCase();
    if (!q) { closeSugg(suggPokeEl); return; }

    const done = new Set(pokeGuesses.map(g => g.name));
    const res  = window.UNITE_POKEMON
      .filter(p => p.name.toLowerCase().includes(q) && !done.has(p.name))
      .slice(0, 8);

    if (!res.length) { closeSugg(suggPokeEl); return; }

    const ROLE_CLASSES = {
      'Attaquant':   'role-attaquant',
      'Défenseur':   'role-défenseur',
      'All-Rounder': 'role-all-rounder',
      'Rapide':      'role-rapide',
      'Soutien':     'role-soutien',
    };

    suggPokeEl.innerHTML = res.map(p => `
      <li class="udle-sugg-item" data-name="${p.name}">
        <img src="${p.img}" alt="${p.name}" onerror="this.style.display='none'">
        <span>${p.name}</span>
        <span class="udle-sugg-role ${ROLE_CLASSES[p.role] || ''}">${p.role}</span>
      </li>`).join('');

    suggPokeEl.querySelectorAll('.udle-sugg-item').forEach(li => {
      li.addEventListener('mousedown', e => {
        e.preventDefault();
        const poke = window.UNITE_POKEMON.find(p => p.name === li.dataset.name);
        if (poke) makePokeGuess(poke);
      });
    });
    suggPokeEl.classList.add('open');
  }

  function openSkinSugg(q) {
    q = q.trim().toLowerCase();
    if (!q) { closeSugg(suggSkinEl); return; }

    const done = new Set(skinGuesses.map(normalizeName));
    const res  = window.UNITE_SKINS
      .filter(s =>
        s.pokemon === secret.pokemon &&
        normalizeName(s.skinName).includes(normalizeName(q)) &&
        !done.has(normalizeName(s.skinName))
      )
      .slice(0, 8);

    if (!res.length) {
      suggSkinEl.innerHTML = `
        <li class="udle-sugg-item" data-name="${q}">
          <span>🎨</span>
          <span>${q}</span>
        </li>`;
    } else {
      suggSkinEl.innerHTML = res.map(s => `
        <li class="udle-sugg-item" data-name="${s.skinName}">
          <span>✨</span>
          <span>${s.skinName}</span>
        </li>`).join('');
    }

    suggSkinEl.querySelectorAll('.udle-sugg-item').forEach(li => {
      li.addEventListener('mousedown', e => {
        e.preventDefault();
        makeSkinGuess(li.dataset.name);
      });
    });
    suggSkinEl.classList.add('open');
  }

  function closeSugg(el) {
    el.classList.remove('open');
    el.innerHTML = '';
  }

  /* ═══════════════════════════════════════════
     MISC UTILS
  ═══════════════════════════════════════════ */

  function shakeInput(inputEl) {
    inputEl.classList.add('skindle-shake');
    setTimeout(() => inputEl.classList.remove('skindle-shake'), 400);
    inputEl.style.borderColor = 'var(--red)';
    setTimeout(() => { inputEl.style.borderColor = ''; }, 600);
    inputEl.value = '';
  }

  /* ═══════════════════════════════════════════
     EVENT LISTENERS
  ═══════════════════════════════════════════ */

  inputPokeEl.addEventListener('input',   () => openPokeSugg(inputPokeEl.value));
  inputPokeEl.addEventListener('focus',   () => openPokeSugg(inputPokeEl.value));
  inputPokeEl.addEventListener('blur',    () => setTimeout(() => closeSugg(suggPokeEl), 150));
  inputPokeEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = suggPokeEl.querySelector('.udle-sugg-item');
      if (first) {
        const poke = window.UNITE_POKEMON.find(p => p.name === first.dataset.name);
        if (poke) makePokeGuess(poke);
      }
    }
    if (e.key === 'Escape') closeSugg(suggPokeEl);
  });

  inputSkinEl.addEventListener('input',   () => openSkinSugg(inputSkinEl.value));
  inputSkinEl.addEventListener('focus',   () => openSkinSugg(inputSkinEl.value));
  inputSkinEl.addEventListener('blur',    () => setTimeout(() => closeSugg(suggSkinEl), 150));
  inputSkinEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = suggSkinEl.querySelector('.udle-sugg-item');
      if (first) makeSkinGuess(first.dataset.name);
      else if (inputSkinEl.value.trim()) makeSkinGuess(inputSkinEl.value.trim());
    }
    if (e.key === 'Escape') closeSugg(suggSkinEl);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.udle-search-box')) {
      closeSugg(suggPokeEl);
      closeSugg(suggSkinEl);
    }
  });

  // Re-apply translations when language changes
  document.addEventListener('translationsReady', () => {
    applyStaticTranslations();
    renderZoomSteps();
  });

  /* ═══════════════════════════════════════════
     BOOTSTRAP
  ═══════════════════════════════════════════ */

  function waitAndInit() {
    if (window.UNITE_SKINS && window.UNITE_POKEMON) {
      if (window.translations && window.translations['fr']) {
        init();
      } else {
        document.addEventListener('translationsReady', function onFirst() {
          document.removeEventListener('translationsReady', onFirst);
          init();
        });
        setTimeout(() => { if (!secret) init(); }, 800);
      }
    } else {
      setTimeout(waitAndInit, 50);
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', waitAndInit)
    : waitAndInit();

})();