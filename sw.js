/* 
 * Licensed under the Mozilla Public License, v. 2.0.
 * weirgo - Smart Stale-While-Revalidate Strategy
 */

const CACHE_VERSION = 'v:20260420';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = ['/weirgo/', '/weirgo/index.html', '/weirgo/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => ![STATIC_CACHE, DYNAMIC_CACHE].includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;

  if (request.method !== 'GET') return;

  const isStatic = request.url.includes('weirgo.png') || 
                   request.url.includes('manifest.json');
  
  if (isStatic) {
    e.respondWith(
      caches.match(request)
        .then(cached => cached || fetch(request).then(res => {
          caches.open(DYNAMIC_CACHE).then(c => c.put(request, res.clone()));
          return res;
        }))
        .catch(() => caches.match('/weirgo/index.html'))
    );
  } else {

    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(DYNAMIC_CACHE).then(c => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request) || 
               caches.match('/weirgo/index.html'))
    );
  }
});
