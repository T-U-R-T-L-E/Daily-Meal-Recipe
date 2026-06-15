// Service Worker for Daily Meal Recipe PWA installation
const CACHE_NAME = 'daily-meal-v5-force-refresh';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Exclude Firebase Auth, dynamic APIs, and background dev tools that are strictly online-only:
  // 1. Searching recipes: /api/ai/search-recipes
  // 2. Logging in or signing up (firebase auth or APIs)
  if (
    url.pathname.includes('/api/ai/search-recipes') ||
    url.host.includes('googleapis.com') ||
    url.host.includes('firebase') ||
    url.pathname.includes('__aistudio') || // AI Studio control plane
    url.pathname.includes('/api/paystack') // payment processor
  ) {
    // Let network handle directly
    return;
  }

  // Handle SPA navigation requests (e.g. reloading pages like /profile or /pantry offline)
  // Replaces the blank page with our cached index.html so react routing can render routes offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match('/index.html') || await caches.match('/');
        if (cached) return cached;
        return new Response("You are offline. Please connect to the internet to access this page.", {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      })
    );
    return;
  }

  // Handle local origin assets (Vite index/chunk JS, CSS, images, layouts, schemas, logs)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from Cache instantly, and fetch in background to sync latest (stale-while-revalidate)
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {
            // Ignore background sync failure
          });
          return cachedResponse;
        }

        // Catch request from network and save to cache for next time
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(async () => {
          // If totally offline and static request fails, try matching index.html if html is required
          const acceptHeader = event.request.headers.get('accept') || '';
          if (acceptHeader.includes('text/html')) {
            const cachedHtml = await caches.match('/index.html');
            if (cachedHtml) return cachedHtml;
          }
          return new Response("Offline resource unavailable", { status: 408 });
        });
      })
    );
    return;
  }

  // Cache trusted external UI assets (Google Fonts, avatar services) dynamically to guarantee local style preservation offline
  const isExternalAssetToCache = 
    url.host.includes('fonts.googleapis.com') ||
    url.host.includes('fonts.gstatic.com') ||
    url.host.includes('ui-avatars.com');

  if (isExternalAssetToCache) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Fail silently
        });
      })
    );
  }
});
