// Bus Navigator — Service Worker
// Bump CACHE_VERSION whenever you change any cached file so old caches get replaced.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `bus-navigator-${CACHE_VERSION}`;

// Core "app shell" files needed for the app to load instantly, even offline.
// Add any other local pages you create (e.g. gopasirris.html) to this list.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './gopasirris.html',
  './transfer.html',
  './gotamp.html'
];

// --- INSTALL: pre-cache the app shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // addAll fails entirely if one file 404s, so add tolerantly instead.
        return Promise.allSettled(
          PRECACHE_URLS.map((url) => cache.add(url).catch(() => null))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// --- ACTIVATE: clean up old cache versions ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('bus-navigator-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// --- FETCH: cache-first for same-origin app shell, network-first (with cache fallback) for everything else ---
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // App shell: cache-first, so the icon/link launches instantly even with a flaky connection.
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            return response;
          })
          .catch(() => caches.match('./index.html'));
      })
    );
  } else {
    // External resources (e.g. Google Fonts, busrouter.sg): try network first,
    // fall back to cache if offline, so styling still loads without internet.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
