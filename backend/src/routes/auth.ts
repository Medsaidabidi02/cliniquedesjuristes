import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import database from '../config/database';

const router = express.Router();

console.log('🔐 FIXED Auth API loaded for Medsaidabidi02 - 2025-09-09 15:17:20');

const JWT_SECRET: string = process.env.JWT_SECRET || 'legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version';
// Make token lifetime configurable; longer in development for convenience
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || (process.env.NODE_ENV === 'production' ? '1h' : '7d');

// Rate limiter for session status endpoint
const sessionStatusLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute (more than enough for 30s polling)
  message: 'Trop de requêtes, veuillez réessayer dans quelques instants',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: 'Trop de tentatives de connexion, veuillez réessayer plus tard',
  standardHeaders: true,
  legacyHeaders: false,
});

// Login route with single-session enforcement and progressive cooldown
router.post('/login', loginLimiter, async (req, res) => {
  try {
    let { email, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    console.log('🔐 Login attempt received:', { email, ipAddress, userAgent: userAgent.substring(0, 50) });
    
    // Normalize input
    email = typeof email === 'string' ? email.trim().toLowerCase() : email;

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Get user from database
    const userResult = await database.query(
      'SELECT id, name, email, password, is_admin, is_approved, created_at FROM users WHERE LOWER(TRIM(email)) = ?',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    const user = userResult.rows[0];
    console.log('👤 Found user:', { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin, is_approved: user.is_approved });

    // Block login if account not approved (except for admins)
    if (!user.is_approved && !user.is_admin) {
      console.log('⛔ Account not approved:', user.id);
      return res.status(403).json({
        success: false,
        message: 'Compte non approuvé. Veuillez demander l\'approbation à un administrateur.'
      });
    }

    // Check password
    let isPasswordValid = false;
    if (user.password) {
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (err) {
        console.error('❌ Password compare error:', err);
      }
    }

    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', user.id);
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // ✅ ADMIN BYPASS: Admins can login without session restrictions
    if (user.is_admin) {
      console.log(`👑 Admin user ${user.id} - bypassing session restrictions`);
      // Invalidate any existing sessions for admin (allow fresh login)
      try {
        const result = await database.query(
          'UPDATE sessions SET valid = FALSE WHERE user_id = ?',
          [user.id]
        );
        console.log(`✅ Invalidated old admin sessions for user ${user.id}`);
      } catch (err: any) {
        // Gracefully handle if sessions table doesn't exist yet
        console.warn('⚠️ Could not invalidate old admin sessions (table may not exist):', err.code || err.message);
      }
      // Skip session enforcement for admins - continue to create new session below
    } else {
      // ✅ NEW: Check for active sessions (single session enforcement for non-admin users)
      try {
        const activeSessionResult = await database.query(
          'SELECT id, ip_address, user_agent, created_at, last_activity FROM sessions WHERE user_id = ? AND valid = TRUE',
          [user.id]
        );
        
        if (activeSessionResult.rows.length > 0) {
          const activeSession = activeSessionResult.rows[0];
          console.log(`⚠️ User ${user.id} already has an active session from ${activeSession.ip_address}`);
          
          // Check if session is stale (inactive for more than 24 hours or no last_activity)
          const lastActivity = activeSession.last_activity ? new Date(activeSession.last_activity) : new Date(activeSession.created_at);
          const hoursSinceActivity = (new Date().getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
          const isStaleSession = hoursSinceActivity > 24;
          
          // Check if this is the same device (same IP + user agent)
          const isSameDevice = activeSession.ip_address === ipAddress && 
                              activeSession.user_agent === userAgent;
          
          if (isSameDevice || isStaleSession) {
            if (isStaleSession) {
              console.log(`✅ Stale session detected (${hoursSinceActivity.toFixed(1)}h old), allowing login and invalidating old session`);
            } else {
              console.log(`✅ Same device detected, allowing login and refreshing session`);
            }
            // Invalidate old session and continue with new login
            await database.query(
              'UPDATE sessions SET valid = FALSE WHERE id = ?',
              [activeSession.id]
            );
          } else {
          // Different device - implement progressive cooldown
          console.log(`🚫 Different device detected - checking cooldown status`);
          
          // Check login attempts
          let attemptRecord = await database.query(
            'SELECT id, attempt_count, cooldown_until FROM login_attempts WHERE user_id = ?',
            [user.id]
          );
          
          let attemptCount = 0;
          let cooldownUntil = null;
          
          if (attemptRecord.rows.length > 0) {
            attemptCount = attemptRecord.rows[0].attempt_count || 0;
            cooldownUntil = attemptRecord.rows[0].cooldown_until;
            
            // Check if cooldown is active
            if (cooldownUntil && new Date(cooldownUntil) > new Date()) {
              const remainingMinutes = Math.ceil((new Date(cooldownUntil).getTime() - new Date().getTime()) / 60000);
              console.log(`⏳ User ${user.id} is in cooldown for ${remainingMinutes} more minute(s)`);
              
              return res.status(403).json({
                success: false,
                message: `Votre compte est déjà actif dans une autre session. Cooldown actif: réessayez dans ${remainingMinutes} minute(s).`,
                sessionActive: true,
                cooldownMinutes: remainingMinutes
              });
            }
          }
          
          // Increment attempt count
          attemptCount += 1;
          
          // Calculate cooldown if attempts exceed threshold
          let newCooldownUntil = null;
          if (attemptCount > 5) {
            // Progressive cooldown: 15 min, 30 min, 1h, 2h, 4h, etc.
            const cooldownMultiplier = Math.pow(2, attemptCount - 6);
            const cooldownMinutes = Math.min(15 * cooldownMultiplier, 240); // Max 4 hours
            newCooldownUntil = new Date(Date.now() + cooldownMinutes * 60000);
            
            console.log(`⏳ Setting cooldown for user ${user.id}: ${cooldownMinutes} minutes (attempt ${attemptCount})`);
          }
          
          // Update or insert attempt record
          if (attemptRecord.rows.length > 0) {
            await database.query(
              'UPDATE login_attempts SET attempt_count = ?, cooldown_until = ?, last_attempt_at = NOW() WHERE user_id = ?',
              [attemptCount, newCooldownUntil, user.id]
            );
          } else {
            await database.query(
              'INSERT INTO login_attempts (user_id, attempt_count, cooldown_until) VALUES (?, ?, ?)',
              [user.id, attemptCount, newCooldownUntil]
            );
          }
          
          // Block login with session-active message
          const message = attemptCount > 5 && newCooldownUntil
            ? `Votre compte est déjà actif dans une autre session. Trop de tentatives: cooldown de ${Math.ceil((new Date(newCooldownUntil).getTime() - new Date().getTime()) / 60000)} minute(s) appliqué.`
            : `Votre compte est déjà actif dans une autre session. Veuillez vous déconnecter d'abord. (Tentative ${attemptCount}/5)`;
          
          return res.status(403).json({
            success: false,
            message: message,
            sessionActive: true,
            attemptsRemaining: Math.max(0, 5 - attemptCount),
            cooldownMinutes: newCooldownUntil ? Math.ceil((new Date(newCooldownUntil).getTime() - new Date().getTime()) / 60000) : 0
          });
        }
      }
      
      // Reset attempt count on successful login (non-admin users)
      await database.query(
        'DELETE FROM login_attempts WHERE user_id = ?',
        [user.id]
      );
      
      } catch (sessionError: any) {
        // Gracefully handle if tables don't exist
        console.warn('⚠️ Could not check sessions (table may not exist):', sessionError.code || sessionError.message);
      }
    } // End of non-admin session enforcement

    // ✅ Create new session in sessions table
    const sessionId = crypto.randomUUID();
    try {
      await database.query(
        'INSERT INTO sessions (id, user_id, valid, ip_address, user_agent, last_activity) VALUES (?, ?, TRUE, ?, ?, NOW())',
        [sessionId, user.id, ipAddress, userAgent]
      );
      console.log(`✅ Created new session ${sessionId.substring(0, 12)}... for user ${user.id}`);
    } catch (sessionError: any) {
      // Gracefully handle if sessions table doesn't exist
      console.warn('⚠️ Could not create session (table may not exist):', sessionError.code || sessionError.message);
    }

    // Generate JWT token with session ID embedded
    const token = jwt.sign(
      {  
        id: user.id,
        email: user.email,
        isAdmin: user.is_admin,
        sessionId: sessionId
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );
    
    console.log(`🎫 JWT created with sessionId: ${sessionId.substring(0, 12)}...`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.is_admin || false,
        is_admin: user.is_admin || false
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Check session status endpoint (for session-active page)
router.get('/session-status', sessionStatusLimiter, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Token d\'accès requis' });
    }

    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
    }

    // Check if session is still valid
    const sessionResult = await database.query(
      'SELECT id, valid, ip_address, user_agent, created_at, last_activity FROM sessions WHERE id = ? AND user_id = ?',
      [decoded.sessionId, decoded.id]
    );

    if (sessionResult.rows.length === 0 || !sessionResult.rows[0].valid) {
      return res.json({
        success: true,
        sessionValid: false,
        message: 'Session invalidée - connecté ailleurs'
      });
    }

    // Check for cooldown
    const attemptResult = await database.query(
      'SELECT attempt_count, cooldown_until FROM login_attempts WHERE user_id = ?',
      [decoded.id]
    );

    let cooldownMinutes = 0;
    if (attemptResult.rows.length > 0 && attemptResult.rows[0].cooldown_until) {
      const cooldownUntil = new Date(attemptResult.rows[0].cooldown_until);
      if (cooldownUntil > new Date()) {
        cooldownMinutes = Math.ceil((cooldownUntil.getTime() - new Date().getTime()) / 60000);
      }
    }

    res.json({
      success: true,
      sessionValid: true,
      cooldownMinutes: cooldownMinutes
    });

  } catch (error) {
    console.error('❌ Error checking session status:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Register route - REMOVED per requirements (only keep login)
// Registration should be handled manually by admins

// Admin helper: reset password for any user (POST /api/auth/reset-password-admin)
router.post('/reset-password-admin', async (req, res) => {
  try {
    let { email, newPassword } = req.body;
    console.log('🔧 Password reset attempt for admin by Medsaidabidi02 at 2025-09-09 15:17:20');
    console.log('📧 Target email:', email);

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email est requis' });
    }

    email = String(email).trim().toLowerCase();
    newPassword = newPassword && String(newPassword).trim() !== '' 
      ? String(newPassword) 
      : (Math.random().toString(36).slice(-8) + 'A!');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await database.query('UPDATE users SET password = ?, updated_at = NOW() WHERE LOWER(TRIM(email)) = ?', [hashedPassword, email]);

    // Get updated user
    const result = await database.query('SELECT id, name, email, is_admin, is_approved FROM users WHERE LOWER(TRIM(email)) = ?', [email]);

    if (result.rows.length === 0) {
      console.log('❌ Reset password: user not found for email', email, 'by Medsaidabidi02');
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    console.log('🔧 Password reset for user by Medsaidabidi02:', result.rows[0]);
    res.json({
      success: true,
      message: 'Mot de passe mis à jour',
      user: result.rows[0],
      credentials: {
        email,
        password: newPassword
      }
    });
  } catch (error) {
    console.error('❌ Error resetting password (admin) for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Change password (for authenticated users)
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    console.log('🔑 Password change attempt for Medsaidabidi02 at 2025-09-09 15:17:20');

    // Extract user from token (you'll need to implement token verification middleware)
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Token d\'accès requis' });
    }

    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    // Get user from database
    const userResult = await database.query('SELECT id, password FROM users WHERE id = ?', [decoded.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      console.log('❌ Invalid current password for user:', decoded.id, 'by Medsaidabidi02');
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }

    // Hash and update new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await database.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedNewPassword, decoded.id]);

    console.log('✅ Password changed successfully for user:', decoded.id, 'by Medsaidabidi02');
    res.json({
      success: true,
      message: 'Mot de passe mis à jour avec succès'
    });

  } catch (error) {
    console.error('❌ Error changing password for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Token d\'accès requis' });
    }

    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
    }

    // Get fresh user data from database
    const userResult = await database.query(
      'SELECT id, name, email, is_admin, is_approved FROM users WHERE id = ?',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    // Check if user is still approved
    if (!user.is_approved) {
      return res.status(403).json({ success: false, message: 'Compte non approuvé' });
    }

    console.log('✅ Token verified successfully for user:', user.id, 'by Medsaidabidi02');
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.is_admin || false,
        is_admin: user.is_admin || false
      }
    });

  } catch (error) {
    console.error('❌ Error verifying token for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Debug route: list all users (keeps existing behavior)
router.get('/debug-users', async (req, res) => {
  try {
    console.log('🔍 Listing users (debug) for Medsaidabidi02 at 2025-09-09 15:17:20');
    const result = await database.query('SELECT id, name, email, is_admin, is_approved, created_at FROM users ORDER BY id');
    console.log('📊 Users for Medsaidabidi02:', result.rows);
    res.json({ success: true, users: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('❌ Error listing users for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Error checking users' });
  }
});

// Logout endpoint - invalidate session and reset attempt count
router.post('/logout', async (req, res) => {
  try {
    console.log('👋 Logout request received');
    
    // Extract user from token
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      let token = authHeader;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.id;
        const sessionId = decoded.sessionId;
        
        console.log(`🔐 Logout for user ${userId}, session ${sessionId?.substring(0, 12)}...`);
        
        // Invalidate session in sessions table
        try {
          await database.query(
            'UPDATE sessions SET valid = FALSE WHERE id = ? AND user_id = ?',
            [sessionId, userId]
          );
          console.log(`✅ Session ${sessionId?.substring(0, 12)}... invalidated`);
        } catch (sessionError: any) {
          console.warn('⚠️ Could not invalidate session (table may not exist):', sessionError.code || sessionError.message);
        }
        
        // ✅ NEW: Reset attempt count on logout (allows immediate re-login)
        try {
          await database.query(
            'DELETE FROM login_attempts WHERE user_id = ?',
            [userId]
          );
          console.log(`✅ Login attempts reset for user ${userId}`);
        } catch (attemptError: any) {
          console.warn('⚠️ Could not reset attempts (table may not exist):', attemptError.code || attemptError.message);
        }
        
      } catch (error) {
        console.warn('⚠️ Could not decode token for logout:', error);
      }
    }
    
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
  }
});

console.log('🔐 Auth routes module loaded for Medsaidabidi02 at 2025-09-09 15:17:20');

export { router as authRoutes };
export default router;