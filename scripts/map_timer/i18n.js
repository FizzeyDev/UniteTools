/**
 * i18n.js - Lightweight translation helper for the Map Timer scripts.
 * Reads the site-wide translations already loaded by navbar.js (window.translations)
 * and the current language (persisted in localStorage as "lang" by navbar.js).
 *
 * Any module that needs to display JS-generated text (button labels, dynamic
 * strings, tracker entries, etc.) should import `translate` from here instead
 * of hardcoding English text, and listen to the "mapTimerLangChanged" event to
 * refresh already-rendered content when the user switches language.
 */

let currentLang = localStorage.getItem("lang") || "fr";

document.addEventListener("translationsReady", (e) => {
  currentLang = e.detail?.lang || currentLang;
  document.dispatchEvent(new CustomEvent("mapTimerLangChanged"));
});

export function translate(key, fallback = "") {
  return window.translations?.[currentLang]?.[key] ?? fallback;
}

export function getLang() {
  return currentLang;
}