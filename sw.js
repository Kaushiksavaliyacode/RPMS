
// Service Worker for Reliance PMS PWA
const CACHE_NAME = 'rpms-cache-v1';

// We just need a fetch listener to satisfy PWA requirements for Chrome/Android
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through strategy to avoid caching issues during development
  // In a full production app, you might want to cache specific assets
  event.respondWith(fetch(event.request));
});
