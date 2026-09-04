/* Service worker — uygulama kabuğunu çevrimdışı kullanım için önbelleğe alır */
const VERSION = 'v0.1.3';
const CACHE = `hasta-takip-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/db.js',
  './js/ui.js',
  './js/nav.js',
  './js/photos.js',
  './js/schedule.js',
  './js/forms.js',
  './js/views/patients.js',
  './js/views/patient.js',
  './js/views/calendar.js',
  './js/views/settings.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  // HTTP önbelleğini atlayıp sunucuyla doğrula (GitHub Pages 10 dk max-age gönderir)
  const fresh = new Request(req, { cache: 'no-cache' });
  // Gezinme: ağ öncelikli, çevrimdışıysa kabuk
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(fresh).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Diğer varlıklar: ağ öncelikli (her zaman güncel), çevrimdışıysa önbellek
  e.respondWith(
    fetch(fresh).then((res) => {
      if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }))
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
