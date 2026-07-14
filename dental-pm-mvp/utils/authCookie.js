const AUTH_COOKIE_NAME = 'dpm_auth';

const parseMaxAgeMs = (value) => {
  const text = String(value || '24h').trim();
  const match = text.match(/^(\d+)\s*([smhd])?$/i);
  if (!match) return 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return amount * multipliers[unit];
};

const getCookieValue = (req, name) => {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rawValue.join('='));
  }
  return null;
};

const getBearerToken = (req) => {
  const value = req.headers?.authorization || '';
  const [scheme, token] = value.split(' ');
  if (!/^Bearer$/i.test(scheme)) return null;
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
};

const getAuthToken = (req) => getBearerToken(req) || getCookieValue(req, AUTH_COOKIE_NAME);

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.AUTH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  sameSite: process.env.AUTH_COOKIE_SAMESITE || 'lax',
  path: '/',
});

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: parseMaxAgeMs(process.env.JWT_EXPIRES_IN || '24h'),
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
};

module.exports = {
  AUTH_COOKIE_NAME,
  getAuthToken,
  setAuthCookie,
  clearAuthCookie,
};
