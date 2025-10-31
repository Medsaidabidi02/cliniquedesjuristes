import database from '../config/database';
import crypto from 'crypto';

export interface Session {
  id: string;
  userId: number;
  valid: boolean;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
  ownerLabel: string | null;
}

/**
 * Create a new session
 */
export async function createSession(data: {
  userId: number;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  ownerLabel: string;
}): Promise<string> {
  const sessionId = crypto.randomUUID();
  
  await database.query(
    `INSERT INTO sessions 
     (id, user_id, valid, is_active, ip_address, user_agent, device_fingerprint, owner_label, last_activity) 
     VALUES (?, ?, TRUE, TRUE, ?, ?, ?, ?, NOW())`,
    [
      sessionId,
      data.userId,
      data.ipAddress,
      data.userAgent,
      data.deviceFingerprint,
      data.ownerLabel
    ]
  );
  
  console.log(`✅ Created session ${sessionId.substring(0, 12)}... for user ${data.userId}`);
  
  return sessionId;
}

/**
 * Invalidate all sessions for a user except the current one (optional)
 */
export async function invalidateUserSessions(
  userId: number,
  exceptSessionId?: string
): Promise<number> {
  let query = 'UPDATE sessions SET valid = FALSE, is_active = FALSE WHERE user_id = ? AND valid = TRUE';
  const params: any[] = [userId];
  
  if (exceptSessionId) {
    query += ' AND id != ?';
    params.push(exceptSessionId);
  }
  
  const result = await database.query(query, params);
  const count = result.affectedRows || 0;
  
  console.log(`🚫 Invalidated ${count} session(s) for user ${userId}`);
  
  return count;
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const result = await database.query(
    `SELECT id, user_id as userId, valid, is_active as isActive, created_at as createdAt, 
     last_activity as lastActivity, ip_address as ipAddress, user_agent as userAgent, 
     device_fingerprint as deviceFingerprint, owner_label as ownerLabel 
     FROM sessions WHERE id = ?`,
    [sessionId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as Session;
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: number): Promise<Session[]> {
  const result = await database.query(
    `SELECT id, user_id as userId, valid, is_active as isActive, created_at as createdAt, 
     last_activity as lastActivity, ip_address as ipAddress, user_agent as userAgent, 
     device_fingerprint as deviceFingerprint, owner_label as ownerLabel 
     FROM sessions WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  
  return result.rows as Session[];
}

/**
 * Get active sessions for a user
 */
export async function getActiveUserSessions(userId: number): Promise<Session[]> {
  const result = await database.query(
    `SELECT id, user_id as userId, valid, is_active as isActive, created_at as createdAt, 
     last_activity as lastActivity, ip_address as ipAddress, user_agent as userAgent, 
     device_fingerprint as deviceFingerprint, owner_label as ownerLabel 
     FROM sessions WHERE user_id = ? AND valid = TRUE AND is_active = TRUE ORDER BY last_activity DESC`,
    [userId]
  );
  
  return result.rows as Session[];
}

/**
 * Update session last activity
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  await database.query(
    'UPDATE sessions SET last_activity = NOW() WHERE id = ?',
    [sessionId]
  );
}

/**
 * Validate a session
 */
export async function validateSession(sessionId: string, userId: number): Promise<{
  valid: boolean;
  session?: Session;
  reason?: string;
}> {
  const result = await database.query(
    `SELECT id, user_id as userId, valid, is_active as isActive, created_at as createdAt, 
     last_activity as lastActivity, ip_address as ipAddress, user_agent as userAgent, 
     device_fingerprint as deviceFingerprint, owner_label as ownerLabel 
     FROM sessions WHERE id = ? AND user_id = ?`,
    [sessionId, userId]
  );
  
  if (result.rows.length === 0) {
    return {
      valid: false,
      reason: 'Session not found'
    };
  }
  
  const session = result.rows[0] as Session;
  
  if (!session.valid) {
    return {
      valid: false,
      session,
      reason: 'Session invalidated - logged in from another device'
    };
  }
  
  if (!session.isActive) {
    return {
      valid: false,
      session,
      reason: 'Session is no longer active'
    };
  }
  
  // Update activity
  await updateSessionActivity(sessionId);
  
  return {
    valid: true,
    session
  };
}

/**
 * Invalidate a specific session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  await database.query(
    'UPDATE sessions SET valid = FALSE, is_active = FALSE WHERE id = ?',
    [sessionId]
  );
  
  console.log(`🚫 Invalidated session ${sessionId.substring(0, 12)}...`);
}

/**
 * Clean up old invalid sessions
 * Should be run periodically (e.g., daily cron job)
 */
export async function cleanupOldSessions(daysOld: number = 30): Promise<number> {
  const result = await database.query(
    `DELETE FROM sessions 
     WHERE valid = FALSE 
     AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [daysOld]
  );
  
  const deletedCount = result.affectedRows || 0;
  console.log(`🧹 Cleaned up ${deletedCount} old sessions`);
  
  return deletedCount;
}

/**
 * Clean up stale sessions (no activity for a long time)
 */
export async function cleanupStaleSessions(hoursInactive: number = 24): Promise<number> {
  const result = await database.query(
    `UPDATE sessions 
     SET valid = FALSE, is_active = FALSE 
     WHERE valid = TRUE 
     AND last_activity < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [hoursInactive]
  );
  
  const count = result.affectedRows || 0;
  console.log(`🧹 Marked ${count} stale sessions as invalid`);
  
  return count;
}

/**
 * Get session statistics
 */
export async function getSessionStats(): Promise<{
  totalSessions: number;
  activeSessions: number;
  totalUsers: number;
  usersWithActiveSessions: number;
}> {
  const [total, active, users, activeUsers] = await Promise.all([
    database.query('SELECT COUNT(*) as count FROM sessions'),
    database.query('SELECT COUNT(*) as count FROM sessions WHERE valid = TRUE AND is_active = TRUE'),
    database.query('SELECT COUNT(DISTINCT user_id) as count FROM sessions'),
    database.query('SELECT COUNT(DISTINCT user_id) as count FROM sessions WHERE valid = TRUE AND is_active = TRUE')
  ]);
  
  return {
    totalSessions: total.rows[0]?.count || 0,
    activeSessions: active.rows[0]?.count || 0,
    totalUsers: users.rows[0]?.count || 0,
    usersWithActiveSessions: activeUsers.rows[0]?.count || 0
  };
}
