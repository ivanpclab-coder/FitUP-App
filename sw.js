// FitUP Service Worker v1.0.1
const CACHE_NAME = 'fitup-cache-v1';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './fitUP.png',
  './gotalegre.png',
  './boteazul.png',
  './boteroja.png',
  './botenegra.png',
  './engranaje.png',
  './youtube.png',
  './instagram.png',
  './facebook.png',
  './tiktok.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
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
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});