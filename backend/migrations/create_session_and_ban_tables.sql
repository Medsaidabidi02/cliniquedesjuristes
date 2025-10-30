-- Migration: Create Session and LoginBan tables for single-session login system
-- This implements a secure session management system with account-sharing prevention
-- Run this SQL on your MySQL database

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  last_activity TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_valid (valid),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Session tracking for single-device login enforcement';

-- Create login_bans table
CREATE TABLE IF NOT EXISTS login_bans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  banned_until DATETIME NOT NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_banned_until (banned_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Temporary login bans to prevent account sharing';

-- Show the created tables
SHOW CREATE TABLE sessions;
SHOW CREATE TABLE login_bans;
