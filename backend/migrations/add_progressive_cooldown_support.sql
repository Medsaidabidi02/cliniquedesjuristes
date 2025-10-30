-- Migration: Add progressive cooldown support and enhanced session tracking
-- This migration adds device fingerprinting, session ownership, and device switch tracking
-- Run this SQL on your MySQL database AFTER create_session_and_ban_tables.sql

-- Add new columns to sessions table
ALTER TABLE sessions 
  ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(255) NULL COMMENT 'Device fingerprint for same-device detection',
  ADD COLUMN IF NOT EXISTS owner_label VARCHAR(512) NULL COMMENT 'Human-readable session ownership label',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this is the currently active session';

-- Add index for is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_is_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_device_fingerprint ON sessions(device_fingerprint);

-- Create device_switch_tracking table for progressive cooldown
CREATE TABLE IF NOT EXISTS device_switch_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  switch_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  from_device_fingerprint VARCHAR(255) NULL,
  to_device_fingerprint VARCHAR(255) NULL,
  from_ip VARCHAR(45) NULL,
  to_ip VARCHAR(45) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_switch_timestamp (switch_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Track device switches for progressive cooldown calculation';

-- Update login_bans table to support progressive cooldown levels
ALTER TABLE login_bans 
  ADD COLUMN IF NOT EXISTS cooldown_level INT DEFAULT 1 COMMENT 'Progressive cooldown level (1=1h, 2=6h, 3=24h)',
  ADD COLUMN IF NOT EXISTS switch_count INT DEFAULT 0 COMMENT 'Number of device switches in tracking window';

-- Show the updated table structures
SHOW CREATE TABLE sessions;
SHOW CREATE TABLE login_bans;
SHOW CREATE TABLE device_switch_tracking;
