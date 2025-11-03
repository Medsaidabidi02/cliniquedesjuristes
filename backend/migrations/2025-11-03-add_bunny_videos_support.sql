-- Migration: Add Bunny.net videos table support
-- Date: 2025-11-03
-- Description: Update videos table to store Bunny.net-hosted video metadata
-- Compatible with MySQL 5.x

-- First, check if videos table exists, if not create it
CREATE TABLE IF NOT EXISTS videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  filename VARCHAR(500) NOT NULL,
  filesize BIGINT DEFAULT 0,
  duration INT DEFAULT 0 COMMENT 'Duration in seconds',
  is_active BOOLEAN DEFAULT TRUE,
  mime_type VARCHAR(100) DEFAULT 'video/mp4',
  
  -- Legacy/existing fields
  subject_id INT COMMENT 'Reference to subjects table',
  video_path VARCHAR(500) COMMENT 'Local video path',
  file_path VARCHAR(500) COMMENT 'Local file path',
  thumbnail_path VARCHAR(1000) COMMENT 'Path to thumbnail',
  order_index INT DEFAULT 0,
  file_size BIGINT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: ALTER TABLE statements below will be executed by the migration script
-- They check for column existence before adding to ensure idempotency
