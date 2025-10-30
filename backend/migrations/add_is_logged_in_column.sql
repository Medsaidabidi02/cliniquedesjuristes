-- Migration: Add is_logged_in column for simple one-session-per-user system
-- This implements a minimal single-session login system using just a boolean flag
-- and a session ID to track the current valid session
-- Run this SQL on your MySQL database

-- Add is_logged_in column to track if user is currently logged in
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_logged_in BOOLEAN DEFAULT FALSE;

-- Add current_session_id to track which session is currently valid
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session_id VARCHAR(255) DEFAULT NULL;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_is_logged_in ON users(is_logged_in);
CREATE INDEX IF NOT EXISTS idx_current_session_id ON users(current_session_id);

-- Reset all users to logged out state (safe on fresh install)
UPDATE users SET is_logged_in = FALSE, current_session_id = NULL;

-- Show the updated table structure
DESCRIBE users;
