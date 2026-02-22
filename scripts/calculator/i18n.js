export function t(key) {
  return window.translations?.[key] ?? key;
}