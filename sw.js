/* 
 * Licensed under the Mozilla Public License, v. 2.0.
 * weirgo - Smart Stale-While-Revalidate Strategy
 */

const CACHE_VERSION = 'v:20260420';
const STATIC_ASSETS = [
  '/weirgo/',
  '/weirgo/index.html',
  '/weirgo/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
  console.log('[SW] New version installed, forcing skip wait...');
  return self.skipWaiting();
})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      );
    }).then(() => {
      console.log('[SW] Claiming all clients...');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin || !url.pathname.startsWith('/weirgo')) {
    return;
  }

  if (request.method === 'HEAD') {
    e.respondWith(fetch(request));
    return;
  }

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match('/weirgo/index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(cached => {
      const networked = fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => {});

      return cached || networked;
    })
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'CLIENTS_CLAIM') self.clients.claim();
});
