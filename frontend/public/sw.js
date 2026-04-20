const CACHE = 'dentalpm-v3';
const STATIC = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Installation — mettre en cache les ressources statiques
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

// Activation — nettoyer les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch — stratégie Network First pour API, Cache First pour assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API → toujours réseau (données en temps réel)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('railway.app')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'Hors ligne — vérifiez votre connexion' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Assets statiques → Cache First avec fallback réseau
  // Ignorer chrome-extension et autres schémas non supportés
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        try {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        } catch(e) {}
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Message — forcer mise à jour
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
