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

const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const username = req.body?.username || 'unknown';
  const key = `${ip}:${username}`;
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
const resetLoginAttempts = (ip, username) => {
  const key = `${ip}:${username}`;
  loginAttempts.delete(key);
};

module.exports = { loginRateLimiter, resetLoginAttempts };
