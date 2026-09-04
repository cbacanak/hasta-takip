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
export function setTopbar({ title = '', back = null, actions = [], center = false, anchor = '.page-title' } = {}) {
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
  watchLargeTitle(anchor);
}

/*
 * Büyük başlık davranışı: sayfa içindeki başlık (anchor) görünürken üst çubuktaki
 * başlık gizlenir, kaydırılıp çubuğun altına girince belirir. Böylece aynı metin
 * alt alta iki kez görünmez. Görünümler asenkron çizildiği için anchor DOM'a
 * sonradan gelebilir; #view değişimleri izlenip gözlemci yeniden bağlanır.
 */
let io = null;
let mo = null;
function watchLargeTitle(anchor) {
  const bar = document.getElementById('topbar');
  const view = document.getElementById('view');
  if (io) { io.disconnect(); io = null; }
  if (mo) { mo.disconnect(); mo = null; }
  bar.classList.remove('large-title');
  if (!anchor || !('IntersectionObserver' in window)) return;
  // Görünüm çizilene dek başlık gizli başlar; böylece ilk karede kısa bir parlama olmaz
  bar.classList.add('large-title');

  const attach = () => {
    const el = view.querySelector(anchor);
    if (io) { io.disconnect(); io = null; }
    // Görünüm henüz boşsa karar verme (gizli kal); çizilmiş ama başlık yoksa çubuk başlığını göster
    if (!el) { if (view.childElementCount) bar.classList.remove('large-title'); return; }
    io = new IntersectionObserver(([e]) => {
      // Başlık çubuğun altındaysa (henüz kaydırılmadı) büyük başlık modundayız
      const below = e.boundingClientRect.top >= bar.getBoundingClientRect().bottom - 1;
      bar.classList.toggle('large-title', e.isIntersecting || below);
    }, { rootMargin: `-${Math.round(bar.offsetHeight)}px 0px 0px 0px`, threshold: 0 });
    io.observe(el);
  };
  attach();
  mo = new MutationObserver(attach);
  mo.observe(view, { childList: true });
}

export function setActiveNav(key) {
  document.querySelectorAll('[data-nav]').forEach((el) => el.classList.toggle('on', el.dataset.nav === key));
}
