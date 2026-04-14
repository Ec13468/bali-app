const CACHE_NAME = 'bali-vibe-v2'; // 改成 v2 讓瀏覽器知道有更新
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest', // 加入 Lucide
  'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js' // 加入 Alpine.js
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
