/**
 * Rate Limiter Middleware - In-memory simple implementation
 * Protection contre brute force sur /api/auth/login
 */

const loginAttempts = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes block

const cleanupOldEntries = () => {
  const now = Date.now();
  for (const [key, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > WINDOW_MS + BLOCK_DURATION_MS) {
      loginAttempts.delete(key);
    }
  }
};

// Cleanup every 5 minutes
setInterval(cleanupOldEntries, 5 * 60 * 1000);

// Get real IP behind proxy (X-Forwarded-For)
const getRealIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

const loginRateLimiter = (req, res, next) => {
  // Use username as primary key (more reliable than IP behind proxy)
  const username = req.body?.username || req.body?.email || '';
  const ip = getRealIp(req);
  
  // Key = username if provided, otherwise IP
  const key = username ? `user:${username.toLowerCase()}` : `ip:${ip}`;
  const now = Date.now();

  const data = loginAttempts.get(key);

  if (data) {
    // Check if blocked
    if (data.blocked && now - data.blockedAt < BLOCK_DURATION_MS) {
      const remainingSeconds = Math.ceil((BLOCK_DURATION_MS - (now - data.blockedAt)) / 1000);
      return res.status(429).json({
        error: 'Trop de tentatives de connexion',
        message: `Compte temporairement bloqué. Réessayez dans ${remainingSeconds} secondes.`,
        retry_after: remainingSeconds
      });
    }

    // Reset if window expired
    if (now - data.firstAttempt > WINDOW_MS) {
      loginAttempts.set(key, { attempts: 1, firstAttempt: now, blocked: false });
    } else {
      data.attempts++;
      
      if (data.attempts > MAX_ATTEMPTS) {
        data.blocked = true;
        data.blockedAt = now;
        loginAttempts.set(key, data);
        
        return res.status(429).json({
          error: 'Trop de tentatives de connexion',
          message: 'Compte temporairement bloqué pour 15 minutes.',
          retry_after: BLOCK_DURATION_MS / 1000
        });
      }
      
      loginAttempts.set(key, data);
    }
  } else {
    loginAttempts.set(key, { attempts: 1, firstAttempt: now, blocked: false });
  }

  next();
};

// Reset attempts on successful login
const resetLoginAttempts = (req, username) => {
  const ip = getRealIp(req);
  // Reset both username and IP keys
  loginAttempts.delete(`user:${username.toLowerCase()}`);
  loginAttempts.delete(`ip:${ip}`);
};

module.exports = { loginRateLimiter, resetLoginAttempts };
