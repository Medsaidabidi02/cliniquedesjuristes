import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login attempts
 * Prevents brute force attacks on login endpoint
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful logins
  skipSuccessfulRequests: true,
  // Use IP address as key
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
});

/**
 * Rate limiter for session ping endpoint
 * Prevents abuse of keep-alive mechanism
 * Allows 1 ping per 4 minutes (to accommodate the 5-minute interval with some buffer)
 */
export const sessionPingRateLimiter = rateLimit({
  windowMs: 4 * 60 * 1000, // 4 minutes
  max: 1, // 1 ping per window
  message: {
    success: false,
    message: 'Trop de requêtes de ping. Veuillez attendre.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for admin endpoints
 * Prevents abuse of admin operations
 */
export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    message: 'Trop de requêtes administratives. Veuillez ralentir.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * General API rate limiter
 * Applied to all API endpoints as a baseline
 */
export const generalApiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    message: 'Trop de requêtes. Veuillez ralentir.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for video streaming endpoints
 * Prevents abuse of video/file access while allowing normal playback
 */
export const videoStreamRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute (allows for video seeking and multiple concurrent videos)
  message: {
    success: false,
    message: 'Trop de requêtes de streaming vidéo. Veuillez ralentir.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP + video filename as key to allow multiple videos
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const filename = req.params.filename || 'unknown';
    return `${ip}-${filename}`;
  }
});
