/* Uygulama girişi: yönlendirici, servis çalışanı */
import { openDB, migratePhotoBlobs } from './db.js';
import { currentPath, setActiveNav } from './nav.js';
import { requestPersist, renderNotice } from './storage.js';
import { initLock } from './lock.js';
import { toast, emptyState } from './ui.js';

const routes = [
  { re: /^\/?$/, nav: 'patients', load: () => import('./views/patients.js'), params: () => ({}) },
  { re: /^\/patients$/, nav: 'patients', load: () => import('./views/patients.js'), params: () => ({}) },
  { re: /^\/patient\/([^/]+)(?:\/([a-z]+))?$/, nav: 'patients', load: () => import('./views/patient.js'), params: (m) => ({ id: m[1], tab: m[2] }) },
  { re: /^\/calendar$/, nav: 'calendar', load: () => import('./views/calendar.js'), params: () => ({}) },
  { re: /^\/settings$/, nav: 'settings', load: () => import('./views/settings.js'), params: () => ({}) },
];

let cleanup = null;
let renderToken = 0;

async function route() {
  const path = currentPath();
  const root = document.getElementById('view');
  const token = ++renderToken;
  if (cleanup) { try { cleanup(); } catch { /* yok say */ } cleanup = null; }
  document.getElementById('layer').querySelectorAll('.sheet-backdrop, .viewer').forEach((e) => e.remove());

  for (const r of routes) {
    const m = path.match(r.re);
    if (!m) continue;
    setActiveNav(r.nav);
    window.scrollTo(0, 0);
    root.classList.remove('has-hero');
    // Yükleme sırasında iskelet (spinner yok)
    root.innerHTML = r.nav === 'patients' && m[1]
      ? ''
      : '<div class="skeleton"><div class="sk title"></div><div class="sk line"></div><div class="sk block" style="margin-top:8px"></div><div class="sk row"></div><div class="sk row"></div><div class="sk row"></div></div>';
    try {
      const mod = await r.load();
      if (token !== renderToken) return;
      const result = await mod.render(root, r.params(m));
      if (typeof result === 'function') cleanup = result;
    } catch (err) {
      console.error(err);
      root.innerHTML = emptyState({ title: 'Bir hata oluştu', text: err.message || String(err), action: '<a class="btn btn-primary" href="#/">Ana sayfaya dön</a>' });
    }
    return;
  }
  location.hash = '#/';
}

async function start() {
  try {
    await openDB();
  } catch (err) {
    document.getElementById('view').innerHTML = emptyState({ title: 'Veritabanı açılamadı', text: err.message });
    return;
  }
  // PIN varsa önce kilit ekranı; açılana kadar hiçbir görünüm çizilmez
  await initLock();
  window.addEventListener('hashchange', route);
  route();
  migratePhotoBlobs().catch(() => { /* en iyi çaba; bir sonraki açılışta yeniden denenir */ });
  // Verilerin tarayıcı tarafından yer açmak için silinmemesini iste; riskli ortamda uyar
  requestPersist();
  renderNotice(document.getElementById('notice'));

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Yeni sürüm hazır, sayfayı yenileyin');
        });
      });
    }).catch(() => { /* çevrimdışı destek isteğe bağlı */ });
  }
}

start();
