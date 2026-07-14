import axios from 'axios';

const cache = new Map();
const inflight = new Map();

const stableStringify = (value) => {
  if (!value || typeof value !== 'object') return '';
  const sorted = Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = value[key];
    return acc;
  }, {});
  return JSON.stringify(sorted);
};

const makeKey = (url, config = {}) => {
  return [
    url,
    stableStringify(config.params)
  ].join('|');
};

export const cachedGet = async (url, config = {}, options = {}) => {
  const ttl = options.ttl ?? 60 * 1000;
  const key = makeKey(url, config);
  const now = Date.now();
  const hit = cache.get(key);

  if (hit && now < hit.expires) return hit.response;
  if (inflight.has(key)) return inflight.get(key);

  const promise = axios.get(url, { ...config, withCredentials: true }).then((response) => {
    cache.set(key, { response, expires: Date.now() + ttl });
    return response;
  }).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
};

export const invalidateClientCache = (match) => {
  for (const key of cache.keys()) {
    if (!match || key.includes(match)) cache.delete(key);
  }
};

export const CACHE_TTL = {
  short: 30 * 1000,
  medium: 2 * 60 * 1000,
  long: 10 * 60 * 1000,
};
