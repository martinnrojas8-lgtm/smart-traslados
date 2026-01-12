const CACHE_NAME = 'smart-traslados-v1';
const ASSETS = [
  'login.html',
  'manifest.json',
  'file_000000008fd0720eb71af76359ccb359.png',
  // Agrega aquí otros archivos si tienes (ej: chofer/index.html, pasajero/index.html)
];

// Instalación: Guarda los archivos en la memoria del celular
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache abierto y guardando recursos');
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
});

// Estrategia de carga: Intenta internet, si falla usa el cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
