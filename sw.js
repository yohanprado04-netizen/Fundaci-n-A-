/**
 * Service Worker - Fundación A+ (https://fundacionamas.org.co/)
 * Optimización de velocidad, almacenamiento en caché y resiliencia offline.
 */

const CACHE_NAME = 'fundacion-aplus-v4.0';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css?v=20260927-v17',
  './logo.jpg',
  './logo.webp',
  './manifest.json'
];

// Instalación: Precarga de recursos estáticos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Aviso de precarga en instalación:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación: Limpieza defensiva de cachés antiguas
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

// Estrategia de Fetch:
// 1. APIs dinámicas (/api/) y métodos no-GET: Directo a la red (Network-Only).
// 2. Recursos estáticos (imágenes, fuentes, estilos): Stale-While-Revalidate para carga instantánea (<50ms).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // No interceptar peticiones no GET ni llamadas a endpoints de backend/API o chat
  if (req.method !== 'GET' || url.pathname.includes('/api/') || url.port === '8001') {
    return;
  }

  // Para navegación y assets estáticos: Stale-While-Revalidate
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
      }).catch(() => {
        // En caso de fallo total de red, retornar recurso en caché si existe
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
