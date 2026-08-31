const CACHE_NAME = 'bufalos-mojados-v4';
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
    './src/js/app.js',
    './manifest.json',
    './icons/icon.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // No cachear llamadas a la API
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(JSON.stringify({ error: 'Sin conexión' }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            if (event.request.destination === 'document') {
                return caches.match('./index.html');
            }
        })
    );
});
