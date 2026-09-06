/* Tema: Açık / Koyu / Sistem — TASARIM.md §2.1
 * Seçim localStorage'da tutulur ve index.html'deki satır içi betik CSS yüklenmeden önce uygular (yanıp sönme olmaz). */
const KEY = 'hasta-takip:theme';
export const THEMES = [['light', 'Açık'], ['dark', 'Koyu'], ['system', 'Sistem']];

export function getTheme() {
  try { const t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; }
}

export function applyTheme(mode) {
  const el = document.documentElement;
  if (mode === 'light' || mode === 'dark') el.setAttribute('data-theme', mode); else el.removeAttribute('data-theme');
  try { if (mode === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch { /* yok say */ }
}

/** Etkin görünüm ('light' | 'dark'), sistem tercihi çözülmüş hâliyle */
export function effectiveTheme() {
  const t = getTheme();
  if (t !== 'system') return t;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
