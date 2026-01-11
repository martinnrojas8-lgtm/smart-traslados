// Service Worker para Smart Traslados
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
});

self.addEventListener('fetch', (event) => {
  // Permite que la app cargue recursos
  event.respondWith(fetch(event.request));
});
