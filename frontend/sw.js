const CACHE_NAME = 'bufalos-mojados-v11';
const ASSETS = [
    './',
    './index.html',
    './login.html',
    './registro.html',
    './src/css/styles.css',
    './src/css/auth.css',
    './src/js/api.js',
    './src/js/ui.js',
    './src/js/live.js',
    './src/js/jornadas.js',
    './src/js/app.js',
    './src/js/install.js',
    './src/js/update.js',
    './manifest.json',
    './icons/icon.svg',
    './icons/logo.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    // NO llamamos skipWaiting() aquí: el SW nuevo queda "en espera"
    // hasta que el usuario confirme la actualización desde el banner.
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Cuando la página pide activar la versión nueva (usuario tocó "Actualizar")
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // No cachear llamadas a la API (siempre red)
    if (req.url.includes('/api/')) {
        event.respondWith(
            fetch(req).catch(() =>
                new Response(JSON.stringify({ error: 'Sin conexión' }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );
        return;
    }

    if (req.method !== 'GET') return;

    // Documentos y assets propios (html/css/js) → network-first
    // Así, cuando hay conexión, siempre se sirve la versión más reciente
    // y se guarda en caché para uso offline.
    const esAppShell =
        req.destination === 'document' ||
        req.destination === 'script' ||
        req.destination === 'style' ||
        req.url.endsWith('.html') ||
        req.url.endsWith('.js') ||
        req.url.endsWith('.css');

    if (esAppShell) {
        event.respondWith(
            fetch(req)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
                    return response;
                })
                .catch(() =>
                    caches.match(req).then(cached =>
                        cached || (req.destination === 'document' ? caches.match('./index.html') : undefined)
                    )
                )
        );
        return;
    }

    // Resto (imágenes, iconos, manifest) → cache-first
    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
                return response;
            });
        })
    );
});
