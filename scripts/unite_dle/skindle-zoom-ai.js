(function () {

  const CACHE_KEY = 'skindle_zoom_ai_v1';

  function seededRandom(seed) {
    let s = seed | 0;
    return function () {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  function fallbackOffset(seed) {
    const rand = seededRandom(seed * 7 + 3);
    return {
      x: 20 + Math.floor(rand() * 60),
      y: 20 + Math.floor(rand() * 60),
    };
  }

  async function imageUrlToBase64(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSide = 512;
        const ratio   = Math.min(maxSide / img.naturalWidth, maxSide / img.naturalHeight, 1);
        canvas.width  = Math.round(img.naturalWidth  * ratio);
        canvas.height = Math.round(img.naturalHeight * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = () => reject(new Error('Impossible de charger : ' + url));
      img.src = url;
    });
  }

  function readCache(dateStr, skinId) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.date === dateStr && data.skinId === skinId && data.offset) {
        return data.offset;
      }
    } catch (e) {}
    return null;
  }

  function writeCache(dateStr, skinId, offset) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ date: dateStr, skinId, offset }));
    } catch (e) {}
  }

  async function fetchPointsOfInterest(base64) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
              },
              {
                type: 'text',
                text:
                  'This is a Pokémon UNITE skin artwork. ' +
                  'Identify 4 to 6 visually distinct and interesting body parts of the main Pokémon ' +
                  '(e.g. head, tail, paw, wing, torso, hand, eye, weapon, foot). ' +
                  'Ignore logos, text overlays, and background elements. ' +
                  'For each part, give its center position as a percentage from the top-left corner of the full image. ' +
                  'Make sure the points are spread across the body (not all clustered in the center). ' +
                  'Reply ONLY with a raw JSON array, no markdown, no explanation:\n' +
                  '[{"label":"head","x":52,"y":18},{"label":"tail","x":30,"y":75},...]',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) throw new Error('API HTTP ' + response.status);

    const data  = await response.json();
    const text  = (data.content?.find(b => b.type === 'text')?.text ?? '').trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const arr   = JSON.parse(clean);

    if (!Array.isArray(arr) || arr.length === 0) throw new Error('Réponse vide ou invalide');

    return arr
      .filter(p => typeof p.x === 'number' && typeof p.y === 'number')
      .map(p => ({
        label: String(p.label ?? ''),
        x: Math.max(5, Math.min(95, Number(p.x))),
        y: Math.max(5, Math.min(95, Number(p.y))),
      }));
  }

  /**
   * @param {string} imgUrl
   * @param {number} seed
   * @param {string} dateStr
   * @param {string} skinId
   * @returns {Promise<{x: number, y: number}>}
   */
  async function detectPokemonZoomOffset(imgUrl, seed, dateStr, skinId) {
    // 1. Cache hit → pas d'appel API
    const cached = readCache(dateStr, skinId);
    if (cached) {
      console.log(`[zoom-ai] Cache → x=${cached.x}% y=${cached.y}%`);
      return cached;
    }

    try {
      const base64 = await imageUrlToBase64(imgUrl);
      const points = await fetchPointsOfInterest(base64);
      console.log('[zoom-ai] Points détectés :', points);

      const rand   = seededRandom(seed * 31 + 17);
      const chosen = points[Math.floor(rand() * points.length)];
      const offset = { x: chosen.x, y: chosen.y };

      console.log(`[zoom-ai] Point choisi : "${chosen.label}" → x=${offset.x}% y=${offset.y}%`);
      writeCache(dateStr, skinId, offset);
      return offset;

    } catch (err) {
      console.warn('[zoom-ai] Erreur, fallback seedé :', err.message);
      return fallbackOffset(seed);
    }
  }

  window.detectPokemonZoomOffset = detectPokemonZoomOffset;

})();