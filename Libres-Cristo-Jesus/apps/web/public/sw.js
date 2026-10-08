/*
 * Service worker — `Documentos/13` Épica 9 (Manifest, Offline, Instalación,
 * Actualizaciones).
 *
 * WHY THIS IS HAND-WRITTEN AND DELIBERATELY SMALL
 * doc13 lists the PWA capabilities but specifies no caching strategy, and a
 * generated Workbox precache manifest would bind this file to the build
 * pipeline for behaviour nobody has specified yet. So the rules here are the
 * two that are unambiguously correct, and nothing else:
 *
 *   1. Navigations are network-first with an offline page as the fallback.
 *      Never cache-first: this app shows attendance, offerings and member
 *      records, and silently serving yesterday's numbers is worse than
 *      saying "you are offline".
 *   2. Build assets under /_next/static are cache-first. Their filenames
 *      contain a content hash, so a cached one can never be stale — a new
 *      build simply requests a different URL.
 *
 * Everything else — API calls above all — goes straight to the network,
 * untouched. Offline *data* (queued attendance, background sync) is a real
 * feature with real conflict-resolution questions, not something to smuggle
 * in through a cache rule.
 */

const CACHE_NAME = 'lcj-connect-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHED_URLS = [OFFLINE_URL, '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHED_URLS);
      // Take over immediately rather than waiting for every tab to close.
      // Safe here because the worker holds no versioned app shell: a mixed
      // old-page/new-worker moment only changes which fallback page is used.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET is ever cacheable, and a POST must never be replayed from here.
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Cross-origin means the API (it runs on its own origin — see
  // NEXT_PUBLIC_API_URL). Authenticated, per-user, frequently mutated: not
  // this worker's business.
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const offlinePage = await cache.match(OFFLINE_URL);
          return offlinePage ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        const response = await fetch(request);
        if (response.ok) {
          // `clone()` because a Response body can only be read once, and the
          // browser still needs to read this one.
          await cache.put(request, response.clone());
        }
        return response;
      })(),
    );
  }
});
