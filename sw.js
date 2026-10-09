'use strict';

const CACHE_NAME = 'enso-soundscapes-v12';
const APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'saved-patches.json',
  'fonts/InterVariable.woff2',
  'fonts/GoogleSansCode.ttf',
  'fonts/GoogleSymbols.ttf',
  'css/tokens.css',
  'css/styles.css',
  'css/aurora.css',
  'css/mixer-dials.css',
  'css/phrases.css',
  'css/button-styles.css',
  'css/slider-styles.css',
  'css/patch-storage.css',
  'js/presets.js',
  'js/audio-engine.js',
  'js/piano-sampler.js',
  'js/probability-engine.js',
  'js/phrase-engine.js',
  'js/octave-and-motion.js',
  'js/aurora.js',
  'js/visualizer.js',
  'js/voice-cards.js',
  'js/app.js',
  'js/slider-styles.js',
  'js/patch-storage.js',
  'js/mixer-dials.js',
  'js/pwa-media.js',
  'js/auto-cycler.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
      fetch(event.request, {cache: 'no-store'})
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(
              () => caches.match(event.request, {ignoreSearch: true})
                        .then((cached) => cached || caches.match('./'))));
});
