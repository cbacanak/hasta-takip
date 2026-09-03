/* Gezinme ve üst çubuk */
import { esc, icon } from './ui.js';

export function go(path) {
  location.hash = '#' + path;
}

/** Yönlendirici tetiklenmeden adres çubuğunu günceller (sekme değişimi vb.) */
export function replacePath(path) {
  history.replaceState(null, '', '#' + path);
}

export function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}

/**
 * Üst çubuğu ayarlar.
 * actions: [{ icon, label, onClick, primary }]
 */
export function setTopbar({ title = '', back = null, actions = [], center = false } = {}) {
  const bar = document.getElementById('topbar');
  bar.innerHTML = `
    <div class="topbar-inner">
      ${back !== null ? `<button class="btn-icon" type="button" data-back aria-label="Geri">${icon('back')}</button>` : ''}
      <div class="topbar-title ${center ? 'center' : ''}">${esc(title)}</div>
      <div class="topbar-actions">
        ${actions.map((a, i) => a.primary
          ? `<button class="btn btn-primary btn-sm" type="button" data-i="${i}">${a.icon ? icon(a.icon) : ''}${esc(a.label)}</button>`
          : `<button class="btn-icon" type="button" data-i="${i}" aria-label="${esc(a.label)}" title="${esc(a.label)}">${icon(a.icon)}</button>`).join('')}
      </div>
    </div>`;
  const b = bar.querySelector('[data-back]');
  if (b) b.onclick = () => { if (typeof back === 'function') back(); else go(back); };
  bar.querySelectorAll('[data-i]').forEach((el) => { el.onclick = actions[+el.dataset.i].onClick; });
}

export function setActiveNav(key) {
  document.querySelectorAll('[data-nav]').forEach((el) => el.classList.toggle('on', el.dataset.nav === key));
}
