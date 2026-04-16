/* 
 * Licensed under the Mozilla Public License, v. 2.0.
 * weirgo SW - Conservative Caching Strategy
 */

const C = 'v1';
const ASSETS = [
  '/weirgo/', 
  'index.html', 
  'manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(C).then(c => c.addAll(ASSETS))
    .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => {
        if (k !== C) return caches.delete(k);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(r => {
      return r || fetch(e.request).then(res => {
        /*
        if (res.status === 200) {
          let resClone = res.clone();
          caches.open(C).then(c => c.put(e.request, resClone));
        }
        */
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('index.html');
        }
      });
    })
  );
});
