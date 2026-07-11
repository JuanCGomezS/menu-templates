const CACHE_NAME = 'menu-templates-static-v1';
const BASE_PATH = '/menu-templates/';
const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}icon.png`,
  `${BASE_PATH}logo.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();

        if (response.ok && new URL(request.url).origin === self.location.origin) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }

        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match(BASE_PATH)))
  );
});
