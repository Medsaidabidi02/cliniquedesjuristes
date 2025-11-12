import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config'; // adjust if your config path differs

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

export { router as debugRoutes };