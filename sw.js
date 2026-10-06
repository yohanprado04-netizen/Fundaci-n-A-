/**
 * Service Worker - Fundación A+ (https://fundacionamas.org.co/)
 * Optimización de velocidad, resiliencia y actualización instantánea sin bloqueos de caché.
 */

const CACHE_NAME = 'fundacion-aplus-v10.0-cache';
const CORE_ASSETS = [
  './logo.jpg',
  './logo.webp',
  './manifest.json'
];

// Instalación: Activar de inmediato sin esperar
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Aviso de precarga:', err);
      });
    })
  );
});

// Activación: Purgar inmediatamente todas las cachés viejas (v4.0 y anteriores)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purgando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de Fetch:
// Scripts JS, HTML y endpoints API siempre van a la RED (Network-First) para recibir cambios de inmediato.
// Sólo imágenes y fuentes pueden usar fallback de caché.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // APIs dinámicas y chat: siempre red directa
  if (req.method !== 'GET' || url.pathname.includes('/api/') || url.port === '8001') {
    return;
  }

  // HTML y scripts JS: Network-First (siempre obtiene la versión fresca del servidor)
  const esCodigo = req.url.includes('.js') || req.url.includes('.html') || req.mode === 'navigate';
  if (esCodigo) {
    event.respondWith(
      fetch(req).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        return caches.match(req);
      })
    );
    return;
  }

  // Assets estáticos (imágenes, favicons): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
