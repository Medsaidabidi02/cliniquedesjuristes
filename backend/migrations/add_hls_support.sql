-- Migration: Add HLS and Object Storage Support to Videos Table
-- Date: 2025-11-06
-- Description: Adds fields for HLS streaming, storage type selection, and segmentation support

-- Add storage_type column (local or hetzner)
ALTER TABLE videos 
ADD COLUMN storage_type ENUM('local', 'hetzner') DEFAULT 'local' 
COMMENT 'Storage location: local filesystem or Hetzner Object Storage';

-- Add HLS manifest path
ALTER TABLE videos 
ADD COLUMN hls_manifest_path VARCHAR(500) NULL 
COMMENT 'Path to HLS manifest file (.m3u8) if video is segmented';

-- Add segmentation flag
ALTER TABLE videos 
ADD COLUMN is_segmented BOOLEAN DEFAULT FALSE 
COMMENT 'Indicates if video is in HLS segmented format';

-- Add segment duration for HLS
ALTER TABLE videos 
ADD COLUMN segment_duration INT DEFAULT 10 
COMMENT 'Duration of each HLS segment in seconds';

-- Create index on storage_type for faster queries
CREATE INDEX idx_videos_storage_type ON videos(storage_type);

-- Create index on is_segmented for faster HLS queries
CREATE INDEX idx_videos_is_segmented ON videos(is_segmented);

-- Update existing videos to ensure they have storage_type set
UPDATE videos 
SET storage_type = 'local', is_segmented = FALSE 
WHERE storage_type IS NULL OR is_segmented IS NULL;

-- Add comment to table
ALTER TABLE videos COMMENT = 'Video records supporting both MP4 and HLS formats with local and cloud storage';

