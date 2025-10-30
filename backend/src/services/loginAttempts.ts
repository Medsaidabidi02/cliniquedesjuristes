import database from '../config/database';

/**
 * Login Attempts Service
 * Tracks repeated login attempts while user already has an active session
 * Applies progressive cooldown after 5+ attempts
 */

interface LoginAttemptRecord {
  userId: number;
  attemptCount: number;
  cooldownUntil: Date | null;
  lastAttempt: Date;
}

/**
 * Record a failed login attempt (user tried to login while already logged in)
 */
export async function recordLoginAttempt(userId: number): Promise<void> {
  try {
    // Check if record exists
    const result = await database.query(
      'SELECT * FROM login_attempts WHERE user_id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create new record
      await database.query(
        'INSERT INTO login_attempts (user_id, attempt_count, last_attempt) VALUES (?, 1, NOW())',
        [userId]
      );
      console.log(`📊 Created login attempt record for user ${userId} (count: 1)`);
    } else {
      // Increment count
      await database.query(
        'UPDATE login_attempts SET attempt_count = attempt_count + 1, last_attempt = NOW() WHERE user_id = ?',
        [userId]
      );
      console.log(`📊 Incremented login attempt count for user ${userId}`);
    }
  } catch (error: any) {
    console.error('❌ Error recording login attempt:', error.message);
    throw error;
  }
}

/**
 * Get login attempt info for a user
 */
export async function getLoginAttempts(userId: number): Promise<LoginAttemptRecord | null> {
  try {
    const result = await database.query(
      'SELECT user_id as userId, attempt_count as attemptCount, cooldown_until as cooldownUntil, last_attempt as lastAttempt FROM login_attempts WHERE user_id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as LoginAttemptRecord;
  } catch (error: any) {
    console.error('❌ Error getting login attempts:', error.message);
    return null;
  }
}

/**
 * Calculate progressive cooldown based on attempt count
 * Starts at 15 minutes after 5 attempts, increases progressively
 */
export function calculateCooldown(attemptCount: number): number {
  if (attemptCount < 5) {
    return 0; // No cooldown for first 4 attempts
  }

  if (attemptCount === 5) {
    return 15; // 15 minutes for 5th attempt
  }

  if (attemptCount <= 10) {
    return 30; // 30 minutes for 6-10 attempts
  }

  if (attemptCount <= 15) {
    return 60; // 1 hour for 11-15 attempts
  }

  return 120; // 2 hours for 16+ attempts
}

/**
 * Check if user is in cooldown period
 */
export async function checkLoginCooldown(userId: number): Promise<{
  inCooldown: boolean;
  remainingMinutes: number;
  attemptCount: number;
}> {
  try {
    const attempts = await getLoginAttempts(userId);

    if (!attempts) {
      return { inCooldown: false, remainingMinutes: 0, attemptCount: 0 };
    }

    // Check if cooldown is active
    if (attempts.cooldownUntil) {
      const now = new Date();
      const cooldownEnd = new Date(attempts.cooldownUntil);

      if (cooldownEnd > now) {
        const remainingMs = cooldownEnd.getTime() - now.getTime();
        const remainingMinutes = Math.ceil(remainingMs / 60000);

        return {
          inCooldown: true,
          remainingMinutes,
          attemptCount: attempts.attemptCount
        };
      }
    }

    return {
      inCooldown: false,
      remainingMinutes: 0,
      attemptCount: attempts.attemptCount
    };
  } catch (error: any) {
    console.error('❌ Error checking login cooldown:', error.message);
    return { inCooldown: false, remainingMinutes: 0, attemptCount: 0 };
  }
}

/**
 * Apply cooldown after threshold is reached
 */
export async function applyCooldown(userId: number): Promise<{
  cooldownMinutes: number;
  cooldownUntil: Date;
}> {
  try {
    const attempts = await getLoginAttempts(userId);

    if (!attempts) {
      throw new Error('No login attempts record found');
    }

    const cooldownMinutes = calculateCooldown(attempts.attemptCount);
    
    if (cooldownMinutes === 0) {
      return { cooldownMinutes: 0, cooldownUntil: new Date() };
    }

    const cooldownUntil = new Date(Date.now() + cooldownMinutes * 60000);

    await database.query(
      'UPDATE login_attempts SET cooldown_until = ? WHERE user_id = ?',
      [cooldownUntil, userId]
    );

    console.log(`🚫 Applied ${cooldownMinutes} minute cooldown for user ${userId} until ${cooldownUntil.toISOString()}`);

    return { cooldownMinutes, cooldownUntil };
  } catch (error: any) {
    console.error('❌ Error applying cooldown:', error.message);
    throw error;
  }
}

/**
 * Reset login attempts (called after successful login)
 */
export async function resetLoginAttempts(userId: number): Promise<void> {
  try {
    await database.query(
      'DELETE FROM login_attempts WHERE user_id = ?',
      [userId]
    );
    console.log(`✅ Reset login attempts for user ${userId}`);
  } catch (error: any) {
    console.error('❌ Error resetting login attempts:', error.message);
  }
}

/**
 * Cleanup old attempt records (older than 30 days)
 */
export async function cleanupOldAttempts(): Promise<number> {
  try {
    const result = await database.query(
      'DELETE FROM login_attempts WHERE last_attempt < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    
    const deletedCount = result.affectedRows || 0;
    
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} old login attempt record(s)`);
    }
    
    return deletedCount;
  } catch (error: any) {
    console.error('❌ Error cleaning up old attempts:', error.message);
    return 0;
  }
}
