// Installability only: no caching, every request goes to the network so the page never serves stale data.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', e => { e.respondWith(fetch(e.request, { cache: 'no-store' })) })
