import rateLimit from 'express-rate-limit';

// NOTE: Uses in-memory store (default). For multi-process / clustered deployments,
// replace with a shared store (e.g. rate-limit-redis) to ensure limits apply across workers.

// For login, register, forgot-password: 10 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
});

// For password reset submission: 5 attempts per hour per IP
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset attempts. Try again later.' },
});

// For device pairing: 5 attempts per 15 minutes per IP
export const pairingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many pairing attempts. Wait before retrying.' },
});

// Global limiter applied to all /api/* routes: 200 requests per minute per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Rate limit exceeded. Slow down.' },
});
