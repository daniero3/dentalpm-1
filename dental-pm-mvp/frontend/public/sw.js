// ── DentalPM Service Worker — Cache Busting System ───────────────────────────
// Version manuelle : changer cette valeur force le navigateur à installer le nouveau SW.
const BUILD_TIME = '2026-07-13-api-fetch-fallback-1';
const CACHE      = `dentalpm-${BUILD_TIME}`;

const STATIC = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// ── Install : mise en cache des ressources statiques ─────────────────────────
self.addEventListener('install', e => {
  console.log(`[SW] Install — cache: ${CACHE}`);
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(STATIC.map(url => c.add(url).catch(err => {
        console.warn(`[SW] Ressource non mise en cache: ${url}`, err);
      }))))
      .then(() => self.skipWaiting()) // Activer immédiatement
  );
});

// ── Activate : supprimer TOUS les anciens caches ─────────────────────────────
self.addEventListener('activate', e => {
  console.log(`[SW] Activate — suppression anciens caches`);
  e.waitUntil(
    caches.keys()
      .then(keys => {
        const toDelete = keys.filter(k => k !== CACHE);
        if (toDelete.length > 0) {
          console.log(`[SW] Suppression: ${toDelete.join(', ')}`);
        }
        return Promise.all(toDelete.map(k => caches.delete(k)));
      })
      .then(() => self.clients.claim()) // Prendre le contrôle immédiatement
      .then(() => {
        // Notifier tous les onglets ouverts de recharger
        return self.clients.matchAll({ type: 'window' });
      })
      .then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', cache: CACHE });
        });
      })
  );
});

// ── Fetch : Network First pour tout (évite le stale cache) ───────────────────
self.addEventListener('fetch', e => {
  // Ignorer les schémas non HTTP
  if (!e.request.url.startsWith('http')) return;

  const url = new URL(e.request.url);

  // Laisser les API cross-origin parler directement au backend.
  // Sinon le SW peut fabriquer un faux 503 "Hors ligne" qui masque l'erreur réelle.
  if (url.origin !== self.location.origin) return;

  // API same-origin → toujours réseau, jamais de cache.
  // En cas d'échec réseau, ne pas retourner un faux JSON applicatif.
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify({
        error: 'Connexion au serveur impossible',
        code: 'NETWORK_ERROR'
      }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Fichiers JS/CSS avec hash Vite (ex: /assets/index-abc123.js) → Cache First
  // Ces fichiers changent de nom à chaque build → jamais stale
  const isHashedAsset = url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/static/')
    || /\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico)$/.test(url.pathname);
  if (isHashedAsset) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (!res || res.status !== 200) return res;
          try {
            caches.open(CACHE).then(c => c.put(e.request, res.clone())).catch(() => {});
          } catch(_) {}
          return res;
        }).catch(() => new Response('', {
          status: 504,
          statusText: 'Asset unavailable'
        }));
      })
    );
    return;
  }

  // HTML et autres ressources → Network First (toujours fraîche)
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        try {
          caches.open(CACHE).then(c => c.put(e.request, res.clone())).catch(() => {});
        } catch(_) {}
        return res;
      })
      .catch(() => caches.match(e.request)
        .then(cached => cached || caches.match('/index.html'))
      )
  );
});

// ── Message : forcer mise à jour ──────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') {
    console.log('[SW] Force update reçu');
    self.skipWaiting();
  }
  if (e.data === 'CHECK_UPDATE') {
    e.source?.postMessage({ type: 'CACHE_VERSION', cache: CACHE });
  }
});
