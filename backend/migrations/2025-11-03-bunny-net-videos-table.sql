-- Migration: Update videos table for Bunny.net Storage integration
-- Date: 2025-11-03
-- Description: Ensures videos table has all required fields for Bunny.net paths and metadata

-- Check if videos table exists, if not create it
CREATE TABLE IF NOT EXISTS videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  course_id INT,
  subject_id INT,
  video_path VARCHAR(500) NOT NULL COMMENT 'Path in Bunny.net storage: /videos/{courseId}/{filename}.mp4',
  file_path VARCHAR(500) NOT NULL COMMENT 'Legacy field, same as video_path',
  thumbnail_path VARCHAR(500) COMMENT 'Path in Bunny.net storage: /thumbnails/{courseId}/{filename}.jpg',
  file_size BIGINT COMMENT 'File size in bytes',
  duration INT COMMENT 'Video duration in seconds',
  mime_type VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE COMMENT 'If true, requires course enrollment',
  order_index INT DEFAULT 0,
  thumbnail_url VARCHAR(255),
  preview_url VARCHAR(255),
  views_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  INDEX idx_course_id (course_id),
  INDEX idx_subject_id (subject_id),
  INDEX idx_is_active (is_active),
  INDEX idx_is_locked (is_locked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add is_locked column if it doesn't exist (for existing tables)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE COMMENT 'If true, requires course enrollment';

-- Add lesson_slug column for better organization (optional)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS lesson_slug VARCHAR(255) COMMENT 'URL-friendly lesson identifier';

-- Update existing videos to have is_locked = false if NULL
UPDATE videos SET is_locked = FALSE WHERE is_locked IS NULL;

-- Add index on lesson_slug
ALTER TABLE videos ADD INDEX IF NOT EXISTS idx_lesson_slug (lesson_slug);

-- Log migration completion
SELECT 'Migration completed: videos table updated for Bunny.net integration' AS status;
