// Versión simplificada que minimiza interferencia con inputs
const CACHE_NAME = 'tarpu-yachay-cache-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './css/styles.css',
  './js/main.js',
  './manifest.json'
];

// Instalación básica
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Activación simple
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Fetch con cache-first para mejor rendimiento offline
self.addEventListener('fetch', event => {
  // Permitir cualquier origen (importante para ngrok)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => cachedResponse || fetch(event.request))
  );
});
