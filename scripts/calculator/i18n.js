export function t(key) {
  const lang = localStorage.getItem('lang') || 'fr';
  return window.translations?.[lang]?.[key] ?? key;
}