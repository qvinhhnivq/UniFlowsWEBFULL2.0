const CACHE_NAME = 'uniflows-v2-cache';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/portal.html',
  '/admin.html',
  '/artists.html',
  '/assets/app.js',
  '/assets/portal.js',
  '/assets/admin.js',
  '/assets/supabase.js',
  '/assets/data.js',
  '/assets/styles.css',
  '/favicon.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).catch(() => caches.match('/portal.html'));
    })
  );
});
