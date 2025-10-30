/**
 * Session Service - Consolidated session management
 * 
 * Handles all session operations including:
 * - Session creation and validation
 * - Active session checking
 * - Session invalidation
 * - Session activity updates (auto-refresh)
 * - Stale session cleanup
 */

import database from '../config/database';
import crypto from 'crypto';

export interface Session {
  id: string;
  userId: number;
  valid: boolean;
  createdAt: Date;
  lastActivity: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
  ownerLabel: string | null;
  isActive: boolean;
}

export interface CreateSessionParams {
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  ownerLabel?: string;
}

/**
 * Create a new session for a user
 * Invalidates all other sessions for this user first
 */
export async function createSession(params: CreateSessionParams): Promise<string> {
  const { userId, ipAddress, userAgent, deviceFingerprint, ownerLabel } = params;
  
  // Generate unique session ID
  const sessionId = crypto.randomUUID();
  
  try {
    // Start transaction
    await database.query('START TRANSACTION');
    
    // Invalidate all other sessions for this user
    await database.query(
      'UPDATE sessions SET valid = FALSE, is_active = FALSE WHERE user_id = ? AND valid = TRUE',
      [userId]
    );
    
    // Create new session
    await database.query(
      `INSERT INTO sessions 
       (id, user_id, valid, created_at, last_activity, ip_address, user_agent, device_fingerprint, owner_label, is_active) 
       VALUES (?, ?, TRUE, NOW(), NOW(), ?, ?, ?, ?, TRUE)`,
      [sessionId, userId, ipAddress || null, userAgent || null, deviceFingerprint || null, ownerLabel || null]
    );
    
    // Commit transaction
    await database.query('COMMIT');
    
    console.log(`✅ Created session ${sessionId.substring(0, 12)}... for user ${userId}`);
    return sessionId;
    
  } catch (error: any) {
    // Rollback on error
    await database.query('ROLLBACK');
    console.error('❌ Failed to create session:', error.message);
    throw error;
  }
}

/**
 * Get active session for a user
 * Returns null if no active session exists
 */
export async function getActiveSession(userId: number): Promise<Session | null> {
  try {
    const result = await database.query(
      `SELECT id, user_id as userId, valid, created_at as createdAt, 
              last_activity as lastActivity, ip_address as ipAddress, 
              user_agent as userAgent, device_fingerprint as deviceFingerprint,
              owner_label as ownerLabel, is_active as isActive
       FROM sessions 
       WHERE user_id = ? AND valid = TRUE AND is_active = TRUE
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as Session;
  } catch (error: any) {
    console.error('❌ Failed to get active session:', error.message);
    throw error;
  }
}

/**
 * Check if user has active session on different device
 * Returns session info if exists, null otherwise
 */
export async function checkActiveSessionOnDifferentDevice(
  userId: number,
  currentDeviceFingerprint: string
): Promise<Session | null> {
  try {
    const activeSession = await getActiveSession(userId);
    
    if (!activeSession) {
      return null;
    }
    
    // If device fingerprints match, it's the same device
    if (activeSession.deviceFingerprint === currentDeviceFingerprint) {
      console.log(`✅ Same device detected for user ${userId} - allowing session takeover`);
      return null; // Same device, no blocking
    }
    
    // Different device detected
    console.log(`🚫 Different device detected for user ${userId} - session already active`);
    return activeSession;
  } catch (error: any) {
    console.error('❌ Failed to check active session:', error.message);
    throw error;
  }
}

/**
 * Invalidate a session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  try {
    await database.query(
      'UPDATE sessions SET valid = FALSE, is_active = FALSE WHERE id = ?',
      [sessionId]
    );
    console.log(`✅ Invalidated session ${sessionId.substring(0, 12)}...`);
  } catch (error: any) {
    console.error('❌ Failed to invalidate session:', error.message);
    throw error;
  }
}

/**
 * Update session activity (for auto-refresh ping)
 */
export async function updateSessionActivity(sessionId: string): Promise<boolean> {
  try {
    const result = await database.query(
      'UPDATE sessions SET last_activity = NOW() WHERE id = ? AND valid = TRUE',
      [sessionId]
    );
    
    if (result.affectedRows > 0) {
      console.log(`🔄 Updated activity for session ${sessionId.substring(0, 12)}...`);
      return true;
    }
    
    console.log(`⚠️ Session ${sessionId.substring(0, 12)}... not found or invalid`);
    return false;
  } catch (error: any) {
    console.error('❌ Failed to update session activity:', error.message);
    throw error;
  }
}

/**
 * Validate if a session exists and is valid
 */
export async function validateSession(sessionId: string): Promise<boolean> {
  try {
    const result = await database.query(
      'SELECT id FROM sessions WHERE id = ? AND valid = TRUE',
      [sessionId]
    );
    return result.rows.length > 0;
  } catch (error: any) {
    console.error('❌ Failed to validate session:', error.message);
    return false;
  }
}

/**
 * Get all sessions for a user (for admin)
 */
export async function getUserSessions(userId: number): Promise<Session[]> {
  try {
    const result = await database.query(
      `SELECT id, user_id as userId, valid, created_at as createdAt,
              last_activity as lastActivity, ip_address as ipAddress,
              user_agent as userAgent, device_fingerprint as deviceFingerprint,
              owner_label as ownerLabel, is_active as isActive
       FROM sessions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows as Session[];
  } catch (error: any) {
    console.error('❌ Failed to get user sessions:', error.message);
    throw error;
  }
}

/**
 * Cleanup stale sessions (inactive for more than X minutes)
 */
export async function cleanupStaleSessions(inactiveMinutes: number = 30): Promise<number> {
  try {
    const result = await database.query(
      `UPDATE sessions 
       SET valid = FALSE, is_active = FALSE 
       WHERE valid = TRUE 
       AND last_activity < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [inactiveMinutes]
    );
    
    if (result.affectedRows > 0) {
      console.log(`🧹 Cleaned up ${result.affectedRows} stale sessions`);
    }
    
    return result.affectedRows;
  } catch (error: any) {
    console.error('❌ Failed to cleanup stale sessions:', error.message);
    return 0;
  }
}

/**
 * Get session statistics (for monitoring/admin)
 */
export async function getSessionStats(): Promise<{
  totalSessions: number;
  activeSessions: number;
  totalUsers: number;
  usersWithActiveSessions: number;
}> {
  try {
    const result = await database.query(`
      SELECT 
        COUNT(*) as totalSessions,
        SUM(CASE WHEN valid = TRUE THEN 1 ELSE 0 END) as activeSessions,
        COUNT(DISTINCT user_id) as totalUsers,
        COUNT(DISTINCT CASE WHEN valid = TRUE THEN user_id END) as usersWithActiveSessions
      FROM sessions
    `);
    
    return result.rows[0];
  } catch (error: any) {
    console.error('❌ Failed to get session stats:', error.message);
    throw error;
  }
}
