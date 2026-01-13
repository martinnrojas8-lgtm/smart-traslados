const CACHE_NAME = 'smart-traslados-v2'; // Cambiamos a v2 para forzar la actualización
const ASSETS = [
  './login.html',
  './manifest.json',
  './file_000000008fd0720eb71af76359ccb359.png'
];

// Instalación: Guarda los archivos en la memoria del celular
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Fuerza a que la nueva versión se active al instante
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Smart Traslados: Guardando recursos en caché...');
      return cache.addAll(ASSETS);
    })
  );
});

// Activación: Limpia versiones viejas de la app
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  return self.clients.claim(); // Toma el control de la app inmediatamente
});

// Estrategia de carga: Intenta internet, si falla usa el cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
