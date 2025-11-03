-- Migration: Add Bunny.net videos table
-- Date: 2025-11-03
-- Description: Create videos table to store Bunny.net-hosted video metadata

-- Create videos table if it doesn't exist
CREATE TABLE IF NOT EXISTS videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  lesson_slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  filename VARCHAR(500) NOT NULL,
  path VARCHAR(1000) NOT NULL COMMENT 'Path on Bunny.net storage',
  filesize BIGINT DEFAULT 0,
  duration INT DEFAULT 0 COMMENT 'Duration in seconds',
  thumbnail_path VARCHAR(1000) COMMENT 'Path to thumbnail on Bunny.net',
  is_locked BOOLEAN DEFAULT FALSE COMMENT 'Whether content requires payment',
  is_active BOOLEAN DEFAULT TRUE,
  mime_type VARCHAR(100) DEFAULT 'video/mp4',
  
  -- Legacy compatibility fields
  subject_id INT COMMENT 'Legacy: reference to subjects table',
  video_path VARCHAR(500) COMMENT 'Legacy: local video path',
  file_path VARCHAR(500) COMMENT 'Legacy: local file path',
  order_index INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_course_id (course_id),
  INDEX idx_lesson_slug (lesson_slug),
  INDEX idx_subject_id (subject_id),
  INDEX idx_is_locked (is_locked),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at),
  
  -- Unique constraint to prevent duplicate lessons per course
  UNIQUE KEY unique_course_lesson (course_id, lesson_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraints if courses and subjects tables exist
-- Note: This migration is idempotent and will not fail if constraints already exist

-- Alter existing videos table to add Bunny.net fields if they don't exist
ALTER TABLE videos 
  ADD COLUMN IF NOT EXISTS lesson_slug VARCHAR(255) AFTER course_id,
  ADD COLUMN IF NOT EXISTS path VARCHAR(1000) AFTER filename,
  ADD COLUMN IF NOT EXISTS filesize BIGINT DEFAULT 0 AFTER path,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE AFTER thumbnail_path,
  ADD INDEX IF NOT EXISTS idx_lesson_slug (lesson_slug),
  ADD INDEX IF NOT EXISTS idx_is_locked (is_locked);

-- Update existing records to have lesson_slug if null
UPDATE videos 
SET lesson_slug = CONCAT('lesson-', id) 
WHERE lesson_slug IS NULL OR lesson_slug = '';

-- Update path field to match video_path or file_path for existing records
UPDATE videos 
SET path = COALESCE(video_path, file_path, filename) 
WHERE path IS NULL OR path = '';

-- Ensure all videos have a course_id (fallback to subject's course_id if available)
UPDATE videos v
LEFT JOIN subjects s ON v.subject_id = s.id
SET v.course_id = s.course_id
WHERE v.course_id IS NULL OR v.course_id = 0;
