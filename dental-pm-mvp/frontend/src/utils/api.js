/**
 * DentalPM — Service API centralisé avec cache
 * Évite les requêtes redondantes et améliore les performances
 */

const BASE = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';

// Cache en mémoire simple
const cache = new Map();
const CACHE_TTL = 30 * 1000; // 30 secondes

const getHeaders = () => ({
  'Content-Type': 'application/json',
});

async function request(method, path, body = null, options = {}) {
  const url = `${BASE}${path}`;
  const cacheKey = `${method}:${url}:${JSON.stringify(body)}`;
  const { cache: useCache = method === 'GET', ttl = CACHE_TTL } = options;

  // Retourner depuis le cache si disponible
  if (useCache && cache.has(cacheKey)) {
    const { data, expires } = cache.get(cacheKey);
    if (Date.now() < expires) return data;
    cache.delete(cacheKey);
  }

  const res = await fetch(url, {
    method,
    headers: getHeaders(),
    credentials: 'include',
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
    throw Object.assign(new Error(err.error || 'Erreur'), { status: res.status, data: err });
  }

  const data = await res.json();

  // Mettre en cache les GET
  if (useCache) {
    cache.set(cacheKey, { data, expires: Date.now() + ttl });
  }

  return data;
}

// Invalider le cache pour un préfixe donné
function invalidate(pathPrefix) {
  for (const key of cache.keys()) {
    if (key.includes(pathPrefix)) cache.delete(key);
  }
}

export const api = {
  get:    (path, options) => request('GET',    path, null, options),
  post:   (path, body)    => { invalidate(path.split('?')[0]); return request('POST',   path, body, { cache: false }); },
  put:    (path, body)    => { invalidate(path.split('?')[0]); return request('PUT',    path, body, { cache: false }); },
  patch:  (path, body)    => { invalidate(path.split('?')[0]); return request('PATCH',  path, body, { cache: false }); },
  delete: (path)          => { invalidate(path.split('?')[0]); return request('DELETE', path, null, { cache: false }); },
  invalidate,
  BASE,
};

export default api;
