import express from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import {
  getUserSessions,
  getActiveUserSessions,
  invalidateSession,
  invalidateUserSessions,
  getSessionStats,
  cleanupOldSessions,
  cleanupStaleSessions
} from '../services/sessionManager';
import {
  clearLoginBan,
  clearDeviceSwitchHistory,
  getDeviceSwitchHistory,
  checkLoginBan,
  cleanupExpiredBans,
  cleanupOldSwitchRecords
} from '../services/progressiveCooldown';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

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
    
    const count = await invalidateUserSessions(userId);
    
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
 * Check ban status for a user
 */
router.get('/ban/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    const banInfo = await checkLoginBan(userId);
    
    res.json({
      success: true,
      userId,
      ...banInfo
    });
  } catch (error) {
    console.error('❌ Error checking ban:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/sessions/ban/:userId
 * Clear login ban for a user (admin override)
 */
router.delete('/ban/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    await clearLoginBan(userId);
    
    console.log(`✅ Admin ${req.user?.id} cleared login ban for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Ban supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Error clearing ban:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/sessions/device-switches/:userId
 * Get device switch history for a user
 */
router.get('/device-switches/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    const switches = await getDeviceSwitchHistory(userId, limit);
    
    res.json({
      success: true,
      userId,
      switches,
      count: switches.length
    });
  } catch (error) {
    console.error('❌ Error getting device switches:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/admin/sessions/device-switches/:userId
 * Clear device switch history for a user (admin override)
 */
router.delete('/device-switches/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    await clearDeviceSwitchHistory(userId);
    
    console.log(`✅ Admin ${req.user?.id} cleared device switch history for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Historique des changements d\'appareils supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Error clearing device switches:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/admin/sessions/cleanup
 * Run cleanup tasks (remove old sessions, expired bans, etc.)
 */
router.post('/cleanup', async (req: AuthRequest, res) => {
  try {
    const { 
      cleanSessions = true, 
      cleanBans = true, 
      cleanSwitches = true,
      cleanStale = true 
    } = req.body;
    
    const results: any = {};
    
    if (cleanSessions) {
      results.sessionsDeleted = await cleanupOldSessions(30);
    }
    
    if (cleanStale) {
      results.staleSessionsInvalidated = await cleanupStaleSessions(24);
    }
    
    if (cleanBans) {
      results.bansDeleted = await cleanupExpiredBans();
    }
    
    if (cleanSwitches) {
      results.switchesDeleted = await cleanupOldSwitchRecords();
    }
    
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
