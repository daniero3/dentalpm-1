export const STORAGE_KEYS = {
  user: 'user:v1',
  plan: 'dpm_plan:v1',
  userPlan: 'dpm_user_plan:v1',
};

const LEGACY_STORAGE_KEYS = {
  user: 'user',
  plan: 'dpm_plan',
  userPlan: 'dpm_user_plan',
};

const getKeys = (name) => {
  const key = STORAGE_KEYS[name];
  if (!key) throw new Error(`Unknown storage key: ${name}`);
  return [key, LEGACY_STORAGE_KEYS[name]].filter(Boolean);
};

export const getStoredJson = (name, fallback = null) => {
  try {
    const [versionedKey, legacyKey] = getKeys(name);
    const raw = localStorage.getItem(versionedKey) ?? localStorage.getItem(legacyKey);
    if (!raw) return fallback;

    if (legacyKey && !localStorage.getItem(versionedKey) && localStorage.getItem(legacyKey)) {
      localStorage.setItem(versionedKey, raw);
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const setStoredJson = (name, value) => {
  const [versionedKey, legacyKey] = getKeys(name);
  localStorage.setItem(versionedKey, JSON.stringify(value));
  if (legacyKey) localStorage.removeItem(legacyKey);
};

export const removeStoredValue = (name) => {
  for (const key of getKeys(name)) localStorage.removeItem(key);
};
