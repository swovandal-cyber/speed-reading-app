/* Service worker: keeps a copy of the app on the phone so it opens with no connection.

   How updates reach the phone: every time the app opens with a connection, each file is
   re-checked in the background and the saved copy is replaced if it changed. The new
   version shows on the next launch. Books and notes are stored separately (IndexedDB)
   and are never touched here. */
const CACHE = 'speed-reading-app-v1';
const FILES = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'manifest.webmanifest',
  'vendor/jszip.min.js',
  'vendor/pdf.min.js',
  'vendor/pdf.worker.min.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  /* only this app's own files; anything else goes straight to the network */
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const refresh = fetch(req, { cache: 'no-cache' })
      .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => null);
    if (cached) { event.waitUntil(refresh); return cached; }
    const res = await refresh;
    if (res) return res;
    if (req.mode === 'navigate') { const home = await cache.match('index.html'); if (home) return home; }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
