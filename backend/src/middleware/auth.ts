import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import database from '../config/database';


const JWT_SECRET = process.env.JWT_SECRET || 'legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    isAdmin: boolean;
    is_admin: boolean;
    is_approved: boolean;
    session_token?: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Allow preflight requests through
  if (req.method === 'OPTIONS') {
    console.log('🔄 OPTIONS request allowed through');
    return next();
  }

  // Support Authorization: Bearer <token> and x-access-token header
  const header = (req.headers['authorization'] as string) || (req.headers['x-access-token'] as string);
  if (!header) {
    console.warn('[auth] Missing Authorization header');
    return res.status(401).json({ error: 'Access token required' });
  }

  const parts = header.split(' ');
  let token = header;
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    token = parts[1];
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log(`🔍 Token decoded for user ${decoded.id}`);

    // ✅ SIMPLE ONE-SESSION-PER-USER: Validate user exists, is approved, is_logged_in, and session matches
    const result = await database.query(
      'SELECT id, email, is_admin, is_approved, is_logged_in, current_session_id FROM users WHERE id = ?', 
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      console.warn(`❌ User ${decoded.id} not found in database`);
      return res.status(401).json({ error: 'User not found', sessionExpired: true });
    }

    const user = result.rows[0];
    
    if (!user.is_approved) {
      console.warn(`⛔ User ${decoded.id} not approved`);
      return res.status(403).json({ error: 'User not approved' });
    }

    // Check if user is still logged in (simple one-session enforcement)
    if (user.is_logged_in !== undefined && !user.is_logged_in) {
      console.warn(`❌ User ${decoded.id} is not logged in (logged out)`);
      return res.status(401).json({ 
        error: 'Session expired - logged out',
        sessionExpired: true,
        loggedInElsewhere: false
      });
    }

    // Check if session ID matches (ensures only one session is valid)
    if (user.current_session_id !== undefined) {
      if (user.current_session_id !== decoded.sessionId) {
        console.warn(`❌ User ${decoded.id} session mismatch (logged in elsewhere)`);
        console.warn(`   Expected: ${user.current_session_id?.substring(0, 12)}..., Got: ${decoded.sessionId?.substring(0, 12)}...`);
        return res.status(401).json({ 
          error: 'Session expired - logged in from another device',
          sessionExpired: true,
          loggedInElsewhere: true
        });
      }
      console.log(`✅ User ${decoded.id} session ID matches - authenticated`);
    } else {
      // Fallback for databases without current_session_id column
      console.log(`✅ User ${decoded.id} is_logged_in check passed (basic mode)`);
    }

    // Attach complete user info to request for downstream handlers
    req.user = {
      id: user.id,
      email: user.email,
      isAdmin: user.is_admin || false,
      is_admin: user.is_admin || false,
      is_approved: user.is_approved,
      session_token: decoded.sessionId
    };

    console.log(`✅ Authentication successful for user ${user.id} (admin: ${user.is_admin})`);
    next();

  } catch (err: any) {
    console.warn('[auth] JWT error:', err && err.name ? err.name : err);
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.', sessionExpired: true });
    }
    return res.status(401).json({ error: 'Invalid token', sessionExpired: true });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log(`🔒 Admin check for Medsaidabidi02 at 2025-09-09 15:21:41`);
  
  const user = req.user;
  if (!user) {
    console.warn('❌ No user attached to request for admin check by Medsaidabidi02');
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (user.isAdmin || user.is_admin) {
    console.log(`✅ Admin access granted for user ${user.id} for Medsaidabidi02`);
    return next();
  }

  console.warn(`⛔ Admin access denied for user ${user.id} for Medsaidabidi02`);
  return res.status(403).json({ error: 'Admin privileges required' });
};

// Optional: Middleware to check if user is approved (less strict than requireAdmin)
export const requireApprovedUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log(`📋 Approved user check for Medsaidabidi02 at 2025-09-09 15:21:41`);
  
  const user = req.user;
  if (!user) {
    console.warn('❌ No user attached to request for approval check by Medsaidabidi02');
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (user.is_approved) {
    console.log(`✅ Approved user access granted for user ${user.id} for Medsaidabidi02`);
    return next();
  }

  console.warn(`⛔ User ${user.id} not approved for Medsaidabidi02`);
  return res.status(403).json({ error: 'Account approval required' });
};

// Optional: Middleware for optional authentication (doesn't block if no token)
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = (req.headers['authorization'] as string) || (req.headers['x-access-token'] as string);
  
  if (!header) {
    console.log('ℹ️ No auth header provided - proceeding without authentication for Medsaidabidi02');
    return next();
  }

  const parts = header.split(' ');
  let token = header;
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    token = parts[1];
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Try to get user info, but don't fail if not found
    try {
      const result = await database.query('SELECT id, email, is_admin, is_approved FROM users WHERE id = ?', [decoded.id]);
      
      if (result.rows.length > 0) {
        const user = result.rows[0];
        req.user = {
          id: user.id,
          email: user.email,
          isAdmin: user.is_admin || false,
          is_admin: user.is_admin || false,
          is_approved: user.is_approved
        };
        console.log(`✅ Optional auth successful for user ${user.id} for Medsaidabidi02`);
      }
    } catch (dbErr) {
      console.warn('⚠️ Optional auth DB error for Medsaidabidi02:', dbErr);
    }
  } catch (err: any) {
    console.warn('⚠️ Optional auth JWT error for Medsaidabidi02:', err?.name || err);
  }

  next();
};

console.log('🔐 Auth middleware module loaded for Medsaidabidi02 at 2025-09-09 15:21:41');

export default { authenticateToken, requireAdmin, requireApprovedUser, optionalAuth };