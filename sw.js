/* 
 * Licensed under the Mozilla Public License, v. 2.0.
 * weirgo - Smart Stale-While-Revalidate Strategy
 */

const CACHE_VERSION = 'v:20260420';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/weirgo/',
  '/weirgo/index.html',
  '/weirgo/manifest.json',
  '/weirgo/weirgo.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log(' Pre-caching Core Assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
            .map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin || !url.pathname.startsWith('/weirgo')) return;

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => updateCache(STATIC_CACHE, request, res))
        .catch(() => caches.match('/weirgo/index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(cached => {
      const networked = fetch(request)
        .then(res => {
          if (res.ok) return updateCache(DYNAMIC_CACHE, request, res);
          return res;
        })
        .catch(() => null);

      return cached || networked;
    })
  );
});

async function updateCache(cacheName, request, response) {
  const clone = response.clone();
  const cache = await caches.open(cacheName);
  cache.put(request, clone);
  return response;
}
