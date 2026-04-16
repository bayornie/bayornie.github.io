const CACHE_NAME = 'teyvat-v2';
const ASSETS = [
    './',
    './index.html',
    // --- CSS Files ---
    './css/theme.css?v=2',
    './css/layout.css?v=2',
    './css/components.css?v=2',
    './css/auth.css?v=2',
    './css/special.css?v=2',
    // --- JS Files ---
    './javascript/config.js?v=2',
    './javascript/core.js?v=2',
    './javascript/mechanics.js?v=2',
    './javascript/auth.js?v=2',
    // --- Essential Images ---
    './img/primogem.png',
    './img/icon-192.png',
    './img/icon-512.png',
    './manifest.json'
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
