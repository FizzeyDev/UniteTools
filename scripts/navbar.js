let translations = {};
let currentLang = localStorage.getItem('lang') || 'fr';

if (localStorage.getItem("sidebarHidden") === null) {
  localStorage.setItem("sidebarHidden", "false");
}

document.addEventListener("DOMContentLoaded", () => {
  const isLocal = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
  const basePath = isLocal ? "./" : "/";

  fetch(`${basePath}components/navbar.html`)
    .then(res => {
      if (!res.ok) throw new Error("Erreur chargement navbar");
      return res.text();
    })
    .then(data => {
      document.getElementById("navbar-container").innerHTML = data;

      if (window.lucide) {
        lucide.createIcons();
      }

      initNavbar(basePath);
    })
    .catch(err => console.error("Erreur navbar:", err));
});

function initNavbar(basePath) {
  const sidebar    = document.getElementById("sidebar");
  const toggle     = document.getElementById("toggle-sidebar");
  const header     = document.querySelector(".sidebar-header");
  const hideBtn    = document.getElementById("hide-sidebar-btn");
  const showBtn    = document.getElementById("show-sidebar-btn");

  if (!sidebar) return;

  /* ── Normalise un href en pathname sans trailing slash ── */
  function normalizePath(url) {
    try {
      const path = new URL(url, window.location.origin).pathname;
      return path.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
    } catch {
      return "/";
    }
  }

  /* ── Met à jour l'icône active dans la mini sidebar ── */
  function updateMiniActive() {
    const cur = normalizePath(window.location.href);
    sidebar.querySelectorAll(".sidebar-mini-icon").forEach(icon => {
      icon.classList.toggle("active", normalizePath(icon.href) === cur);
    });
  }

  /* ── Applique l'état ouvert/mini ── */
  function syncSidebarState(hidden) {
    sidebar.classList.toggle("hidden", hidden);

    // Décaler le contenu uniquement sur desktop
    if (window.innerWidth > 768) {
      document.body.classList.toggle("sidebar-hidden", hidden);
    }

    localStorage.setItem("sidebarHidden", String(hidden));
    updateMiniActive();
  }

  /* ── Restaurer l'état sauvegardé ── */
  const startHidden = localStorage.getItem("sidebarHidden") === "true";

  if (window.innerWidth <= 768) {
    // Mobile : toujours fermé au démarrage
    sidebar.classList.remove("hidden", "active");
    document.body.classList.remove("sidebar-hidden");
  } else {
    syncSidebarState(startHidden);
  }

  /* ── Bouton ◀ → passer en mini ── */
  if (hideBtn) {
    hideBtn.addEventListener("click", () => syncSidebarState(true));
  }

  /* ── Bouton ▶ dans la mini → rouvrir ── */
  if (showBtn) {
    showBtn.addEventListener("click", () => syncSidebarState(false));
  }

  /* ── Bouton ☰ mobile ── */
  if (toggle) {
    toggle.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove("hidden");
        sidebar.classList.toggle("active");
      } else {
        syncSidebarState(false);
      }
    });
  }

  /* ── Clic en dehors : fermer sur mobile ── */
  document.addEventListener("click", e => {
    if (window.innerWidth <= 768) {
      if (sidebar.classList.contains("active") &&
          !sidebar.contains(e.target) &&
          e.target !== toggle) {
        sidebar.classList.remove("active");
      }
    }
  });

  /* ── Resize : recalculer le margin-left ── */
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 768) {
      document.body.classList.remove("sidebar-hidden");
    } else {
      document.body.classList.toggle("sidebar-hidden", sidebar.classList.contains("hidden"));
    }
  });

  /* ── Header → accueil ── */
  if (header) {
    header.addEventListener("click", () => {
      window.location.href = basePath;
    });
  }

  /* ── Corriger les href relatifs ── */
  sidebar.querySelectorAll("a").forEach(link => {
    const href = link.getAttribute("href");
    if (href && (href.startsWith("/") || href.startsWith("../"))) {
      link.href = basePath + href.replace(/^\/?UniteTools\/?/, "");
    }
  });

  /* ── Corriger les src d'images ── */
  sidebar.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src");
    if (src && src.startsWith("/UniteTools")) {
      img.src = basePath + src.replace(/^\/?UniteTools\/?/, "");
    }
  });

  /* ── Active link sidebar normale ── */
  const cur = normalizePath(window.location.href);
  sidebar.querySelectorAll(".sidebar-content a").forEach(link => {
    if (normalizePath(link.href) === cur) link.classList.add("active");
  });

  /* ── Traductions ── */
  loadAllTranslations(basePath);

  /* ── Switch langue (sidebar normale + mini footer) ── */
  sidebar.addEventListener("click", e => {
    const btn = e.target.closest(".lang-btn");
    if (btn && btn.dataset.lang && btn.dataset.lang !== currentLang) {
      currentLang = btn.dataset.lang;
      localStorage.setItem("lang", currentLang);
      applyTranslations();
    }
  });
}

function loadAllTranslations(basePath) {
  Promise.all([
    fetch(`${basePath}lang/fr.json`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    fetch(`${basePath}lang/en.json`).then(r => { if (!r.ok) throw new Error(); return r.json(); })
  ])
  .then(([fr, en]) => {
    translations = { fr, en };
    window.translations = translations;
    applyTranslations();
  })
  .catch(err => console.error("Erreur traductions:", err));
}

function applyTranslations() {
  const lang = translations[currentLang];
  if (!lang) return;

  document.querySelectorAll('[data-lang]').forEach(el => {
    const key = el.dataset.lang;
    if (lang[key]) el.innerHTML = lang[key];
  });

  document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
    const key = el.dataset.langPlaceholder;
    if (lang[key]) el.placeholder = lang[key];
  });

  if (lang.page_title) document.title = lang.page_title;

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });

  document.dispatchEvent(new CustomEvent('translationsReady', { detail: { lang: currentLang } }));
}