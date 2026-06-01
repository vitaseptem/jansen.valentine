/* =========================================================================
   Service Worker — Jansen Valentine (PWA)
   Permite instalar a boutique como aplicação no telemóvel e funcionar
   mesmo com ligação instável (cache do "app shell").
   ========================================================================= */

const CACHE = 'jv-couture-v1';

// Recursos estáticos essenciais da aplicação (app shell)
const ASSETS = [
  './',
  './index.html',
  './logo.png',
  './favicon.png',
  './manifest.webmanifest'
];

// Instalação: pré-carregar o app shell em cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Ativação: limpar versões antigas da cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Estratégia de pedidos:
// - Mesma origem (app shell): cache-first com atualização em segundo plano.
// - Origens externas (Supabase, imagens em CDN): network-first com cache de reserva.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }).catch(() => cached || caches.match('./index.html'));
        return cached || network;
      })
    );
  } else {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Guardar imagens externas para visualização offline
          if (res && res.status === 200 && req.destination === 'image') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
