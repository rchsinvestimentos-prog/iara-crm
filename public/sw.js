const CACHE_NAME = 'iara-v1';
const STATIC_ASSETS = [
    '/',
    '/dashboard',
    '/conversas',
    '/habilidades',
    '/plano',
    '/configuracoes',
];

// Install — cache static shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {
                // Some pages might not be available during install — that's ok
            });
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET and API requests
    if (request.method !== 'GET') return;
    if (request.url.includes('/api/')) return;
    if (request.url.includes('_next/')) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed — try cache
                return caches.match(request).then((cached) => {
                    if (cached) return cached;
                    // For navigation — return cached dashboard
                    if (request.mode === 'navigate') {
                        return caches.match('/dashboard');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Push notifications (future)
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const title = data.title || 'IARA';
    const options = {
        body: data.body || 'Nova mensagem da sua clínica',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/dashboard' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// Click notification → open app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/dashboard';
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            for (const client of clients) {
                if (client.url.includes(url) && 'focus' in client) return client.focus();
            }
            return self.clients.openWindow(url);
        })
    );
});
