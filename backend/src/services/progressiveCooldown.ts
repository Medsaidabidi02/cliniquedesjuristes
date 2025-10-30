import database from '../config/database';

/**
 * Progressive Cooldown Service
 * Manages device switch tracking and progressive ban escalation
 * 
 * Rules:
 * - 1st device switch: 1 hour cooldown
 * - 2+ switches in 24h: 6 hour cooldown
 * - 4+ switches in 24h: 24 hour cooldown
 */

const TRACKING_WINDOW_HOURS = 24;
const COOLDOWN_DURATIONS = {
  1: 1,   // Level 1: 1 hour
  2: 6,   // Level 2: 6 hours
  3: 24   // Level 3: 24 hours
};

interface DeviceSwitchInfo {
  userId: number;
  fromDeviceFingerprint: string | null;
  toDeviceFingerprint: string;
  fromIp: string | null;
  toIp: string;
}

/**
 * Record a device switch event
 */
export async function recordDeviceSwitch(info: DeviceSwitchInfo): Promise<void> {
  await database.query(
    `INSERT INTO device_switch_tracking 
     (user_id, from_device_fingerprint, to_device_fingerprint, from_ip, to_ip) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      info.userId,
      info.fromDeviceFingerprint,
      info.toDeviceFingerprint,
      info.fromIp,
      info.toIp
    ]
  );
  
  console.log(`📊 Recorded device switch for user ${info.userId}`);
}

/**
 * Count device switches for a user within the tracking window
 */
export async function getDeviceSwitchCount(userId: number): Promise<number> {
  const result = await database.query(
    `SELECT COUNT(*) as count 
     FROM device_switch_tracking 
     WHERE user_id = ? 
     AND switch_timestamp > DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [userId, TRACKING_WINDOW_HOURS]
  );
  
  return result.rows[0]?.count || 0;
}

/**
 * Calculate the appropriate cooldown level based on switch count
 * Returns: { level: 1|2|3, hours: 1|6|24 }
 */
export function calculateCooldownLevel(switchCount: number): { level: number; hours: number } {
  if (switchCount >= 4) {
    return { level: 3, hours: COOLDOWN_DURATIONS[3] };
  } else if (switchCount >= 2) {
    return { level: 2, hours: COOLDOWN_DURATIONS[2] };
  } else {
    return { level: 1, hours: COOLDOWN_DURATIONS[1] };
  }
}

/**
 * Set a login ban with progressive cooldown
 */
export async function setLoginBan(
  userId: number,
  reason: string = 'Device switch cooldown'
): Promise<{ level: number; hours: number; bannedUntil: Date }> {
  // Get current switch count
  const switchCount = await getDeviceSwitchCount(userId);
  const cooldown = calculateCooldownLevel(switchCount);
  
  // Calculate ban expiry
  const bannedUntil = new Date();
  bannedUntil.setHours(bannedUntil.getHours() + cooldown.hours);
  
  // Delete any existing ban first
  await database.query('DELETE FROM login_bans WHERE user_id = ?', [userId]);
  
  // Insert new ban
  await database.query(
    `INSERT INTO login_bans 
     (user_id, banned_until, reason, cooldown_level, switch_count) 
     VALUES (?, ?, ?, ?, ?)`,
    [userId, bannedUntil, reason, cooldown.level, switchCount]
  );
  
  console.log(`🚫 Set login ban for user ${userId}: Level ${cooldown.level} (${cooldown.hours}h) until ${bannedUntil.toISOString()}`);
  
  return { ...cooldown, bannedUntil };
}

/**
 * Check if a user is currently banned
 * Returns null if not banned, otherwise returns ban info
 */
export async function checkLoginBan(userId: number): Promise<{
  isBanned: boolean;
  bannedUntil?: Date;
  remainingMinutes?: number;
  cooldownLevel?: number;
  reason?: string;
}> {
  const result = await database.query(
    `SELECT banned_until, reason, cooldown_level, switch_count 
     FROM login_bans 
     WHERE user_id = ? AND banned_until > NOW()`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    return { isBanned: false };
  }
  
  const ban = result.rows[0];
  const bannedUntil = new Date(ban.banned_until);
  const remainingMs = bannedUntil.getTime() - Date.now();
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  
  return {
    isBanned: true,
    bannedUntil,
    remainingMinutes,
    cooldownLevel: ban.cooldown_level,
    reason: ban.reason
  };
}

/**
 * Clear a login ban (admin override)
 */
export async function clearLoginBan(userId: number): Promise<void> {
  await database.query('DELETE FROM login_bans WHERE user_id = ?', [userId]);
  console.log(`✅ Cleared login ban for user ${userId}`);
}

/**
 * Clear device switch history (admin override)
 */
export async function clearDeviceSwitchHistory(userId: number): Promise<void> {
  await database.query('DELETE FROM device_switch_tracking WHERE user_id = ?', [userId]);
  console.log(`✅ Cleared device switch history for user ${userId}`);
}

/**
 * Get device switch history for a user
 */
export async function getDeviceSwitchHistory(userId: number, limit: number = 10): Promise<any[]> {
  const result = await database.query(
    `SELECT * FROM device_switch_tracking 
     WHERE user_id = ? 
     ORDER BY switch_timestamp DESC 
     LIMIT ?`,
    [userId, limit]
  );
  
  return result.rows;
}

/**
 * Clean up old device switch records (older than tracking window)
 * Should be run periodically (e.g., daily cron job)
 */
export async function cleanupOldSwitchRecords(): Promise<number> {
  const result = await database.query(
    `DELETE FROM device_switch_tracking 
     WHERE switch_timestamp < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [TRACKING_WINDOW_HOURS]
  );
  
  const deletedCount = result.affectedRows || 0;
  console.log(`🧹 Cleaned up ${deletedCount} old device switch records`);
  
  return deletedCount;
}

/**
 * Clean up expired bans
 * Should be run periodically (e.g., daily cron job)
 */
export async function cleanupExpiredBans(): Promise<number> {
  const result = await database.query(
    'DELETE FROM login_bans WHERE banned_until < NOW()'
  );
  
  const deletedCount = result.affectedRows || 0;
  console.log(`🧹 Cleaned up ${deletedCount} expired bans`);
  
  return deletedCount;
}
