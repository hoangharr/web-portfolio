const CACHE_NAME = 'aptis-shell-v1';
const SHELL_FILES = [
  '/',
  '/index.html',
  '/js/engine.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Network-first for JSON data requests (/data/ or /topics/), cache-first for shell
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/data') || url.pathname.startsWith('/topics') || request.destination === 'document' && url.pathname.endsWith('.json')) {
    // network-first
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // cache-first for app shell
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(resp => {
      if (resp && resp.ok) {
        caches.open(CACHE_NAME).then(cache => cache.put(request, resp.clone()));
      }
      return resp;
    })).catch(() => caches.match('/index.html'))
  );
});
