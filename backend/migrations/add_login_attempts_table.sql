-- Migration: Add login_attempts table for tracking repeated login attempts
-- This table tracks when users try to login while already having an active session

CREATE TABLE IF NOT EXISTS login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  cooldown_until DATETIME NULL,
  last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_attempt (user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_cooldown (cooldown_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: This replaces the logout-based cooldown system with attempt-based cooldown
-- Cooldown is only applied after 5+ attempts to login while already logged in
