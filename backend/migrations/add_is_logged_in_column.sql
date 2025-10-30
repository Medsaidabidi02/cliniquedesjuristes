-- Migration: Add is_logged_in column for simple one-session-per-user system
-- This implements a minimal single-session login system using just a boolean flag
-- Run this SQL on your MySQL database

-- Add is_logged_in column to track if user is currently logged in
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_logged_in BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_is_logged_in ON users(is_logged_in);

-- Reset all users to logged out state (safe on fresh install)
UPDATE users SET is_logged_in = FALSE;

-- Show the updated table structure
DESCRIBE users;
