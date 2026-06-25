// Bump this version on every deploy to bust the old cache
const APP_VERSION = 'v2';
const CACHE_NAME = `aptis-shell-${APP_VERSION}`;

const SHELL_FILES = [
  '/',
  '/index.html',
  '/english.html',
  '/js/engine.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache each file individually so one failure doesn't kill everything
      return Promise.allSettled(
        SHELL_FILES.map(url =>
          cache.add(url).catch(err =>
            console.warn(`[SW] Failed to cache ${url}:`, err)
          )
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for JSON data requests (/data/ or /topics/)
  if (
    url.pathname.startsWith('/data') ||
    url.pathname.startsWith('/topics') ||
    (request.destination === 'document' && url.pathname.endsWith('.json'))
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Stale-while-revalidate for HTML/JS shell — serve cached immediately,
  // then fetch fresh version in background for next visit
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    SHELL_FILES.includes(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(networkResp => {
            if (networkResp && networkResp.ok) {
              cache.put(request, networkResp.clone());
            }
            return networkResp;
          });
          // Return cached immediately, or wait for network if no cache yet
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Cache-first for everything else (images, fonts, CSS, etc.)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(resp => {
        if (resp && resp.ok && resp.type === 'basic') {
          caches
            .open(CACHE_NAME)
            .then(cache => cache.put(request, resp.clone()));
        }
        return resp;
      });
    })
  );
});