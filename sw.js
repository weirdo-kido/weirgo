/* 
 * Licensed under the Mozilla Public License, v. 2.0.
 * weirgo - Conservative Caching Strategy
 */

const C = 'v1';
const ASSETS = [
  '/weirgo/', 
  'index.html', 
  'manifest.json',
  'weirgo.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(C).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== C).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.open(C).then(cache => {
      return cache.match(e.request).then(cachedResponse => {

        const fetchPromise = fetch(e.request).then(networkResponse => {
          if (networkResponse.ok) {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
          if (e.request.mode === 'navigate') return caches.match('index.html');
          throw err;
        });

        return cachedResponse || fetchPromise;
      });
    })
  );
});
