import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import database from '../config/database';

const router = express.Router();

console.log('🔐 FIXED Auth API loaded for Medsaidabidi02 - 2025-09-09 15:17:20');

const JWT_SECRET: string = process.env.JWT_SECRET || 'legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version';
// Make token lifetime configurable; longer in development for convenience
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || (process.env.NODE_ENV === 'production' ? '1h' : '7d');

// Login route with full session-based anti-sharing enforcement
router.post('/login', async (req, res) => {
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
    console.log('👤 Found user:', { id: user.id, email: user.email, name: user.name });

    // Block login if account not approved
    if (!user.is_approved) {
      console.log('⛔ Account not approved:', user.id);
      return res.status(403).json({
        success: false,
        message: 'Compte non approuvé. Veuillez demander l\'approbation à un administrateur.'
      });
    }

    // ✅ NEW: Check if user is banned from logging in
    try {
      const banResult = await database.query(
        'SELECT id, banned_until FROM login_bans WHERE user_id = ? AND banned_until > NOW()',
        [user.id]
      );
      
      if (banResult.rows.length > 0) {
        const ban = banResult.rows[0];
        const bannedUntil = new Date(ban.banned_until);
        const remainingMinutes = Math.ceil((bannedUntil.getTime() - Date.now()) / (1000 * 60));
        
        console.log(`⛔ User ${user.id} is temporarily banned until ${bannedUntil}`);
        return res.status(403).json({
          success: false,
          message: `Compte temporairement verrouillé. Réessayez dans ${remainingMinutes} minute(s).`,
          bannedUntil: bannedUntil.toISOString()
        });
      }
    } catch (banCheckError: any) {
      // If login_bans table doesn't exist, log warning but continue
      if (banCheckError.code === 'ER_NO_SUCH_TABLE') {
        console.warn('⚠️ login_bans table not found - run migration: create_session_and_ban_tables.sql');
      } else {
        throw banCheckError;
      }
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

    // ✅ NEW: Invalidate ALL existing sessions for this user (single-session enforcement)
    try {
      await database.query(
        'UPDATE sessions SET valid = FALSE WHERE user_id = ? AND valid = TRUE',
        [user.id]
      );
      console.log(`✅ Invalidated all previous sessions for user ${user.id}`);
    } catch (sessionError: any) {
      if (sessionError.code === 'ER_NO_SUCH_TABLE') {
        console.warn('⚠️ sessions table not found - run migration: create_session_and_ban_tables.sql');
      } else {
        throw sessionError;
      }
    }

    // ✅ NEW: Create new session in sessions table
    const sessionId = crypto.randomUUID();
    try {
      await database.query(
        'INSERT INTO sessions (id, user_id, valid, ip_address, user_agent, last_activity) VALUES (?, ?, TRUE, ?, ?, NOW())',
        [sessionId, user.id, ipAddress, userAgent]
      );
      console.log(`✅ Created new session ${sessionId.substring(0, 12)}... for user ${user.id}`);
    } catch (sessionError: any) {
      if (sessionError.code === 'ER_NO_SUCH_TABLE') {
        console.warn('⚠️ sessions table not found - continuing without session tracking');
      } else {
        throw sessionError;
      }
    }

    // Generate JWT token with session ID embedded
    const token = jwt.sign(
      {  
        id: user.id,
        email: user.email,
        isAdmin: user.is_admin,
        sessionId: sessionId  // ✅ NEW: Include session ID in JWT
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

// Register route (for new users)
router.post('/register', async (req, res) => {
  try {
    let { name, email, password } = req.body;

    console.log('📝 Registration attempt received for Medsaidabidi02 at 2025-09-09 15:17:20');
    console.log('📝 Registration data:', { name, email: email ? 'provided' : 'missing' });

    // Validate input
    if (!name || !email || !password) {
      console.log('❌ Missing required fields for registration by Medsaidabidi02');
      return res.status(400).json({
        success: false,
        message: 'Nom, email et mot de passe requis'
      });
    }

    // Normalize input
    email = email.trim().toLowerCase();
    name = name.trim();

    // Check if user already exists
    const existingUser = await database.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?', [email]);
    if (existingUser.rows.length > 0) {
      console.log('❌ User already exists with email:', email, 'by Medsaidabidi02');
      return res.status(409).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (not approved by default, not admin)
    const result = await database.query(
      'INSERT INTO users (name, email, password, is_admin, is_approved) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, false, false]
    );

    // Get the created user
    const newUser = await database.query(
      'SELECT id, name, email, is_admin, is_approved, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    console.log('✅ User registered successfully for Medsaidabidi02:', newUser.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès. En attente d\'approbation.',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('❌ Registration error for Medsaidabidi02:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription'
    });
  }
});

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

// Logout endpoint - invalidate session and set 1-hour ban to prevent account sharing
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
        
        // ✅ NEW: Invalidate session in sessions table
        try {
          await database.query(
            'UPDATE sessions SET valid = FALSE WHERE id = ? AND user_id = ?',
            [sessionId, userId]
          );
          console.log(`✅ Session ${sessionId?.substring(0, 12)}... invalidated`);
        } catch (sessionError: any) {
          if (sessionError.code === 'ER_NO_SUCH_TABLE') {
            console.warn('⚠️ sessions table not found - continuing without session invalidation');
          } else {
            throw sessionError;
          }
        }
        
        // ✅ NEW: Set 1-hour login ban to prevent immediate account sharing
        try {
          // Remove any existing ban first
          await database.query('DELETE FROM login_bans WHERE user_id = ?', [userId]);
          
          // Insert new ban
          await database.query(
            'INSERT INTO login_bans (user_id, banned_until, reason) VALUES (?, DATE_ADD(NOW(), INTERVAL 1 HOUR), ?)',
            [userId, 'Logout - anti-sharing cooldown']
          );
          
          console.log(`✅ 1-hour login ban set for user ${userId} to prevent account sharing`);
        } catch (banError: any) {
          if (banError.code === 'ER_NO_SUCH_TABLE') {
            console.warn('⚠️ login_bans table not found - continuing without ban');
          } else {
            throw banError;
          }
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