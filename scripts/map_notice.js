/* Kyogre map disclaimer — shown on every page where a map can be picked.
   The Kyogre map image is not available (no usable source in the same format as Groudon's),
   so the Groudon image is used as a placeholder. Remove this file + its <script> tags once
   assets/maps/map_kyogre.webp is replaced by the real map. */
(function () {
  'use strict';
  var FB = {
    en: 'The Kyogre map image is not available yet. The Groudon map is shown instead, so terrain, grass and walls may not match the real Kyogre map.',
    fr: "L'image de la map Kyogre n'est pas encore disponible. La map Groudon est affichée à la place : le terrain, les herbes et les murs peuvent différer de la vraie map Kyogre.",
    ja: 'カイオーガのマップ画像はまだ用意できていません。代わりにグラードンのマップを表示しているため、地形や草むら、壁が実際のカイオーガのマップと異なる場合があります。'
  };
  var SEL = '.map-pill.active, .map-btn.active, .fearless-map-btn.active';
  var el = null, dismissed = false;

  function lang() { try { return localStorage.getItem('lang') || 'fr'; } catch (e) { return 'fr'; } }
  function text() {
    var l = lang(), tr = window.translations && window.translations[l];
    return (tr && tr.map_kyogre_notice) || FB[l] || FB.en;
  }
  function kyogreActive() {
    var nodes = document.querySelectorAll(SEL);
    for (var i = 0; i < nodes.length; i++) if (nodes[i].dataset.map === 'kyogre') return true;
    return false;
  }
  function css() {
    if (document.getElementById('map-notice-css')) return;
    var s = document.createElement('style');
    s.id = 'map-notice-css';
    s.textContent =
      '.map-notice{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9000;max-width:min(560px,calc(100vw - 24px));' +
      'display:flex;align-items:flex-start;gap:10px;padding:10px 12px 10px 14px;background:#101a1b;border:1px solid rgba(255,157,0,.45);' +
      'border-left:3px solid #ff9d00;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.6);color:#cfe0e2;' +
      'font:500 .95rem/1.4 "Rajdhani",sans-serif}' +
      '.map-notice__icon{flex-shrink:0;font-size:1.05rem;line-height:1.3}' +
      '.map-notice__x{flex-shrink:0;background:none;border:0;color:#8aacaf;font-size:1.1rem;line-height:1;cursor:pointer;padding:2px 4px;border-radius:4px}' +
      '.map-notice__x:hover{color:#fff;background:rgba(255,255,255,.08)}';
    document.head.appendChild(s);
  }
  function build() {
    css();
    el = document.createElement('div');
    el.className = 'map-notice';
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="map-notice__icon">⚠️</span><span class="map-notice__txt"></span>' +
                   '<button class="map-notice__x" type="button" aria-label="Close">✕</button>';
    el.querySelector('.map-notice__x').addEventListener('click', function () {
      dismissed = true; update();
    });
    document.body.appendChild(el);
  }
  function update() {
    var show = kyogreActive() && !dismissed;
    if (show && !el) build();
    if (el) {
      el.style.display = show ? 'flex' : 'none';
      if (show) el.querySelector('.map-notice__txt').textContent = text();
    }
  }
  function onSwitch() { dismissed = false; setTimeout(update, 0); }

  function init() {
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.map-pill, .map-btn, .fearless-map-btn')) onSwitch();
    });
    new MutationObserver(update).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    document.addEventListener('translationsReady', update);
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();