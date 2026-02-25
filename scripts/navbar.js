let translations = {};
let currentLang = localStorage.getItem('lang') || 'fr';

document.addEventListener("DOMContentLoaded", () => {
  const isLocal = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
  const basePath = isLocal ? "./" : "/";

  const navbarPath = `${basePath}components/navbar.html`;

  fetch(navbarPath)
    .then(response => {
      if (!response.ok) throw new Error("Erreur de chargement de la navbar");
      return response.text();
    })
    .then(data => {
      document.getElementById("navbar-container").innerHTML = data;
      initNavbar(basePath);
    })
    .catch(err => console.error("Erreur navbar:", err));
});

function initNavbar(basePath) {
  const toggle  = document.getElementById("toggle-sidebar");
  const sidebar = document.getElementById("sidebar");
  const header  = document.querySelector(".sidebar-header");
  const hideBtn = document.getElementById("hide-sidebar-btn");

  function syncSidebarState(hidden) {
    sidebar.classList.toggle("hidden", hidden);
    document.body.classList.toggle("sidebar-collapsed", hidden);
    if (toggle)  toggle.classList.toggle("sidebar-hidden", hidden);
    if (hideBtn) hideBtn.textContent = hidden ? "▶" : "◀";
    localStorage.setItem("sidebarHidden", hidden);
  }

  const isHidden = localStorage.getItem("sidebarHidden") === "true";
  syncSidebarState(isHidden);

  if (hideBtn && sidebar) {
    hideBtn.addEventListener("click", () => {
      const nowHidden = !sidebar.classList.contains("hidden");
      syncSidebarState(nowHidden);
    });
  }

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        sidebar.classList.toggle("active");
      } else {
        syncSidebarState(false);
      }
    });
  }

  if (header) {
    header.style.cursor = "pointer";
    header.addEventListener("click", () => {
      window.location.href = basePath;
    });
  }

  document.querySelectorAll("#sidebar a").forEach(link => {
    const href = link.getAttribute("href");
    if (href && (href.startsWith("/") || href.startsWith("../"))) {
      const cleanPath = href.replace(/^\/?UniteTools\/?/, "");
      link.href = basePath + cleanPath;
    }
  });

  document.querySelectorAll("#sidebar img").forEach(img => {
    const src = img.getAttribute("src");
    if (src && src.startsWith("/UniteTools")) {
      img.src = basePath + src.replace(/^\/?UniteTools\/?/, "");
    }
  });

  loadAllTranslations(basePath);

  document.body.addEventListener("click", e => {
    const btn = e.target.closest(".lang-btn");
    if (btn && btn.dataset.lang) {
      const newLang = btn.dataset.lang;
      if (newLang !== currentLang) {
        currentLang = newLang;
        localStorage.setItem("lang", currentLang);
        applyTranslations();
      }
    }
  });

  function normalizePath(url) {
    try {
      const path = new URL(url, window.location.origin).pathname;
      return path.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
    } catch {
      return "/";
    }
  }

  const currentNormalized = normalizePath(window.location.href);
  document.querySelectorAll("#sidebar a").forEach(link => {
    if (normalizePath(link.href) === currentNormalized) {
      link.classList.add("active");
    }
  });
}

function loadAllTranslations(basePath) {
  const frPath = `${basePath}lang/fr.json`;
  const enPath = `${basePath}lang/en.json`;

  Promise.all([
    fetch(frPath).then(res => { if (!res.ok) throw new Error("FR non trouvé"); return res.json(); }),
    fetch(enPath).then(res => { if (!res.ok) throw new Error("EN non trouvé"); return res.json(); })
  ])
  .then(([fr, en]) => {
    translations.fr = fr;
    translations.en = en;
    // Expose sur window pour les scripts externes (ex: feedback.js)
    window.translations = translations;
    applyTranslations();
  })
  .catch(err => console.error("Erreur chargement traductions:", err));
}

function applyTranslations() {
  const lang = translations[currentLang];
  if (!lang) return;

  // Textes
  document.querySelectorAll('[data-lang]').forEach(el => {
    const key = el.dataset.lang;
    if (lang[key]) el.innerHTML = lang[key];
  });

  // Placeholders
  document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
    const key = el.dataset.langPlaceholder;
    if (lang[key]) el.placeholder = lang[key];
  });

  // Titre de la page
  if (lang.page_title) document.title = lang.page_title;

  // Boutons de langue actifs
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });

  // Notifie les autres scripts que les traductions sont prêtes
  document.dispatchEvent(new CustomEvent('translationsReady', { detail: { lang: currentLang } }));
}