const CACHE_NAME = 'teyvat-idle-v2.1';
const ASSETS = [
    '/Teyvat%20Idle%20Clicker%20Mobile/',
    '/Teyvat%20Idle%20Clicker%20Mobile/index.html',
    // --- CSS Files ---
    '/Teyvat%20Idle%20Clicker%20Mobile/css/theme.css',
    '/Teyvat%20Idle%20Clicker%20Mobile/css/layout.css',
    '/Teyvat%20Idle%20Clicker%20Mobile/css/components.css',
    '/Teyvat%20Idle%20Clicker%20Mobile/css/auth.css',
    '/Teyvat%20Idle%20Clicker%20Mobile/css/special.css',
    // --- JS Files ---
    '/Teyvat%20Idle%20Clicker%20Mobile/javascript/config.js',
    '/Teyvat%20Idle%20Clicker%20Mobile/javascript/core.js',
    '/Teyvat%20Idle%20Clicker%20Mobile/javascript/mechanics.js',
    '/Teyvat%20Idle%20Clicker%20Mobile/javascript/auth.js',
    // --- Essential Images ---
    '/Teyvat%20Idle%20Clicker%20Mobile/img/primogem.png',
    '/Teyvat%20Idle%20Clicker%20Mobile/img/PWA/icon-192.png',
    '/Teyvat%20Idle%20Clicker%20Mobile/img/PWA/icon-512.png',
    '/Teyvat%20Idle%20Clicker%20Mobile/manifest.json'
];

// 1. Install Event: Saves the App Shell for offline use
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// 2. Activate Event: Clears out old versions when you update CACHE_NAME
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('Service Worker: Clearing Old Cache');
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// 3. Fetch Event: Intercepts network requests to serve files from cache
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request);
        })
    );
});
