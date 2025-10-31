import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config'; // adjust if your config path differs
import { perfMonitor } from '../utils/performance';
import { cache } from '../utils/cache';

const router = express.Router();

/**
 * GET /api/debug/headers
 * Returns request headers and tries to decode Authorization Bearer token (if present).
 * Use this to verify Authorization reaches the backend and the token can be decoded with the configured secret.
 */
router.get('/headers', (req, res) => {
  const headers = req.headers;
  const authHeader = headers.authorization || headers['authorization'];
  let decoded: any = null;
  let verifyError: any = null;

  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      decoded = jwt.verify(token, (config && (config as any).jwtSecret) || process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      verifyError = String(err);
    }
  }

  res.json({
    ok: true,
    note: 'Debug endpoint - remove in production',
    headers: {
      authorization: authHeader || null,
      host: headers.host || null,
      origin: headers.origin || null
    },
    decodedToken: decoded,
    verifyError
  });
});

/**
 * GET /api/debug/performance
 * Returns performance metrics (only in development)
 */
router.get('/performance', (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_PERF_MONITOR !== 'true') {
    return res.status(403).json({ error: 'Performance monitoring not enabled in production' });
  }

  const operation = req.query.operation as string | undefined;
  const report = req.query.report === 'true';

  if (report) {
    return res.type('text/plain').send(perfMonitor.generateReport());
  }

  const stats = operation ? perfMonitor.getStats(operation) : null;
  const operations = perfMonitor.getOperations();
  const slowOps = perfMonitor.getSlowOperations(1000);

  res.json({
    operations,
    stats,
    slowOperations: slowOps.length,
    slowOperationsSample: slowOps.slice(0, 10)
  });
});

/**
 * GET /api/debug/cache
 * Returns cache statistics
 */
router.get('/cache', (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_PERF_MONITOR !== 'true') {
    return res.status(403).json({ error: 'Cache monitoring not enabled in production' });
  }

  const stats = cache.getStats();
  
  res.json({
    cacheSize: stats.size,
    cachedKeys: stats.keys
  });
});

/**
 * POST /api/debug/cache/clear
 * Clear cache (for testing)
 */
router.post('/cache/clear', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Cache clearing not allowed in production' });
  }

  cache.clear();
  res.json({ message: 'Cache cleared successfully' });
});

export { router as debugRoutes };