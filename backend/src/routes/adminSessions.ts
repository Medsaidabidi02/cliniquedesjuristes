import express from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { adminRateLimiter } from '../middleware/rateLimiter';
import {
  getUserSessions,
  invalidateSession,
  getSessionStats,
  cleanupStaleSessions
} from '../services/sessionService';
import {
  checkCooldown,
  resetAttempts
} from '../services/loginAttempts';

const router = express.Router();

// All routes require admin authentication and rate limiting
router.use(authenticateToken);
router.use(requireAdmin);
router.use(adminRateLimiter);

/**
 * GET /api/admin/sessions/stats
 * Get session statistics
 */
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const stats = await getSessionStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error getting session stats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/sessions/user/:userId
 * Get all sessions for a specific user
 */
router.get('/user/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    const sessions = await getUserSessions(userId);
    const activeSessions = sessions.filter(s => s.valid && s.isActive);
    
    res.json({
      success: true,
      userId,
      sessions,
      activeSessions,
      totalCount: sessions.length,
      activeCount: activeSessions.length
    });
  } catch (error) {
    console.error('❌ Error getting user sessions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/sessions/invalidate/:sessionId
 * Force invalidate a specific session
 */
router.post('/invalidate/:sessionId', async (req: AuthRequest, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    await invalidateSession(sessionId);
    
    console.log(`✅ Admin ${req.user?.id} invalidated session ${sessionId.substring(0, 12)}...`);
    
    res.json({
      success: true,
      message: 'Session invalidée avec succès'
    });
  } catch (error) {
    console.error('❌ Error invalidating session:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/sessions/invalidate-user/:userId
 * Force invalidate all sessions for a user
 */
router.post('/invalidate-user/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    const sessions = await getUserSessions(userId);
    let count = 0;
    
    for (const session of sessions) {
      if (session.valid) {
        await invalidateSession(session.id);
        count++;
      }
    }
    
    console.log(`✅ Admin ${req.user?.id} invalidated ${count} session(s) for user ${userId}`);
    
    res.json({
      success: true,
      message: `${count} session(s) invalidée(s) avec succès`,
      count
    });
  } catch (error) {
    console.error('❌ Error invalidating user sessions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/sessions/ban/:userId
 * Check cooldown status for a user
 */
router.get('/ban/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    const cooldownInfo = await checkCooldown(userId);
    
    res.json({
      success: true,
      userId,
      ...cooldownInfo
    });
  } catch (error) {
    console.error('❌ Error checking cooldown:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/sessions/ban/:userId
 * Clear login attempts for a user (admin override)
 */
router.delete('/ban/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    await resetAttempts(userId);
    
    console.log(`✅ Admin ${req.user?.id} cleared login attempts for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Tentatives de connexion réinitialisées avec succès'
    });
  } catch (error) {
    console.error('❌ Error clearing attempts:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/sessions/cleanup
 * Run cleanup tasks (remove stale sessions)
 */
router.post('/cleanup', async (req: AuthRequest, res) => {
  try {
    const { 
      inactiveMinutes = 30
    } = req.body;
    
    const results: any = {};
    
    // Clean up stale sessions (inactive for specified minutes)
    results.staleSessionsInvalidated = await cleanupStaleSessions(inactiveMinutes);
    
    console.log(`✅ Admin ${req.user?.id} ran cleanup tasks:`, results);
    
    res.json({
      success: true,
      message: 'Nettoyage effectué avec succès',
      results
    });
  } catch (error) {
    console.error('❌ Error running cleanup:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

console.log('🔐 Admin session routes loaded');

export default router;
