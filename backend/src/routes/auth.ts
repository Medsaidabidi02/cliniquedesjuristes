import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import database from '../config/database';
import { generateDeviceFingerprint, generateOwnershipLabel, isSameDevice } from '../services/deviceFingerprint';
import { 
  checkLoginBan, 
  setLoginBan, 
  recordDeviceSwitch, 
  getDeviceSwitchCount 
} from '../services/progressiveCooldown';
import {
  createSession,
  invalidateUserSessions,
  getActiveUserSessions,
  invalidateSession
} from '../services/sessionManager';

const router = express.Router();

console.log('🔐 FIXED Auth API loaded for Medsaidabidi02 - 2025-09-09 15:17:20');

const JWT_SECRET: string = process.env.JWT_SECRET || 'legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version';
// Make token lifetime configurable; longer in development for convenience
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || (process.env.NODE_ENV === 'production' ? '1h' : '7d');

// Login route with progressive cooldown and device tracking
router.post('/login', async (req, res) => {
  try {
    let { email, password, deviceFingerprint: clientDeviceFingerprint } = req.body;
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

    // ✅ Check for login ban (progressive cooldown)
    try {
      const banCheck = await checkLoginBan(user.id);
      
      if (banCheck.isBanned) {
        const hours = Math.floor((banCheck.remainingMinutes || 0) / 60);
        const minutes = (banCheck.remainingMinutes || 0) % 60;
        let timeMessage = '';
        
        if (hours > 0) {
          timeMessage = `${hours} heure${hours > 1 ? 's' : ''}`;
          if (minutes > 0) {
            timeMessage += ` et ${minutes} minute${minutes > 1 ? 's' : ''}`;
          }
        } else {
          timeMessage = `${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
        
        console.log(`🚫 User ${user.id} is banned for ${timeMessage}`);
        
        return res.status(403).json({
          success: false,
          message: `Compte temporairement verrouillé. Réessayez dans ${timeMessage}.`,
          isBanned: true,
          bannedUntil: banCheck.bannedUntil,
          remainingMinutes: banCheck.remainingMinutes,
          cooldownLevel: banCheck.cooldownLevel,
          reason: banCheck.reason
        });
      }
    } catch (banError: any) {
      // Gracefully handle if ban system not available
      console.warn('⚠️ Could not check login ban:', banError.message);
    }

    // Generate device fingerprint
    const deviceFingerprint = generateDeviceFingerprint(req, clientDeviceFingerprint);
    const ownerLabel = generateOwnershipLabel(userAgent, ipAddress);
    
    console.log(`📱 Device fingerprint: ${deviceFingerprint.substring(0, 16)}...`);
    console.log(`🏷️ Owner label: ${ownerLabel}`);

    // ✅ Check for existing active sessions (for same-device detection)
    let isSameDeviceLogin = false;
    try {
      const activeSessions = await getActiveUserSessions(user.id);
      
      if (activeSessions.length > 0) {
        // Check if any active session is from the same device
        for (const session of activeSessions) {
          if (session.deviceFingerprint && isSameDevice(session.deviceFingerprint, deviceFingerprint)) {
            isSameDeviceLogin = true;
            console.log(`✅ Same device detected - no cooldown will be applied`);
            break;
          }
        }
        
        // Record device switch if this is a different device
        if (!isSameDeviceLogin && activeSessions[0]) {
          await recordDeviceSwitch({
            userId: user.id,
            fromDeviceFingerprint: activeSessions[0].deviceFingerprint,
            toDeviceFingerprint: deviceFingerprint,
            fromIp: activeSessions[0].ipAddress,
            toIp: ipAddress
          });
          console.log(`📊 Device switch recorded for user ${user.id}`);
        }
      }
    } catch (sessionError: any) {
      console.warn('⚠️ Could not check existing sessions:', sessionError.message);
    }

    // ✅ Invalidate ALL existing sessions for this user (single-session enforcement)
    try {
      const invalidatedCount = await invalidateUserSessions(user.id);
      console.log(`✅ Invalidated ${invalidatedCount} previous session(s) for user ${user.id}`);
    } catch (sessionError: any) {
      console.warn('⚠️ Could not invalidate sessions:', sessionError.message);
    }

    // ✅ Create new session in sessions table
    let sessionId: string;
    try {
      sessionId = await createSession({
        userId: user.id,
        ipAddress,
        userAgent,
        deviceFingerprint,
        ownerLabel
      });
    } catch (sessionError: any) {
      console.warn('⚠️ Could not create session (table may not exist):', sessionError.message);
      // Fallback to old UUID generation if service fails
      sessionId = crypto.randomUUID();
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
      ownerLabel,
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

// Logout endpoint - invalidate session and set progressive cooldown ban
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
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        console.log(`🔐 Logout for user ${userId}, session ${sessionId?.substring(0, 12)}...`);
        
        // Get current session info for device detection
        let currentDeviceFingerprint: string | null = null;
        try {
          const sessionResult = await database.query(
            'SELECT device_fingerprint FROM sessions WHERE id = ? AND user_id = ?',
            [sessionId, userId]
          );
          
          if (sessionResult.rows.length > 0) {
            currentDeviceFingerprint = sessionResult.rows[0].device_fingerprint;
          }
        } catch (err: any) {
          console.warn('⚠️ Could not fetch session device fingerprint:', err.message);
        }
        
        // Invalidate session in sessions table
        try {
          await invalidateSession(sessionId);
        } catch (sessionError: any) {
          console.warn('⚠️ Could not invalidate session:', sessionError.message);
        }
        
        // ✅ Set progressive cooldown ban (unless same-device exemption applies)
        // For logout, we always apply the ban since user is manually logging out
        // If they log back in from the same device, the login flow will detect it
        try {
          const banInfo = await setLoginBan(userId, 'Logout - progressive cooldown');
          console.log(`🚫 Set ${banInfo.hours}h login ban (level ${banInfo.level}) for user ${userId} until ${banInfo.bannedUntil.toISOString()}`);
        } catch (banError: any) {
          console.warn('⚠️ Could not set login ban:', banError.message);
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

// Session ping endpoint - for background health checks
router.post('/session/ping', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Token d\'accès requis' });
    }

    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;
      const sessionId = decoded.sessionId;
      
      // Update session last activity
      await database.query(
        'UPDATE sessions SET last_activity = NOW() WHERE id = ? AND user_id = ?',
        [sessionId, userId]
      );
      
      res.json({
        success: true,
        message: 'Session updated'
      });
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
    }
  } catch (error) {
    console.error('❌ Session ping error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

console.log('🔐 Auth routes module loaded for Medsaidabidi02 at 2025-09-09 15:17:20');

export { router as authRoutes };
export default router;