import { config } from '../config';

/**
 * Hetzner Object Storage Service
 * Provides public HLS video URLs from Hetzner S3-compatible storage
 */

/**
 * Generate a public video URL for HLS playback
 * @param videoPath - The S3 object key (e.g., "videos/course_1/lesson_1/output.m3u8")
 * @returns Public URL to the video file
 */
export const getPublicVideoUrl = (videoPath: string): string => {
  if (!config.hetzner.enabled) {
    throw new Error('Hetzner storage is not enabled');
  }

  if (!config.hetzner.endpoint || !config.hetzner.bucket) {
    throw new Error('Hetzner endpoint and bucket must be configured');
  }

  // Remove leading slash if present
  const cleanPath = videoPath.startsWith('/') ? videoPath.substring(1) : videoPath;

  // Build the public URL
  // Format: https://<HETZNER_ENDPOINT>/<BUCKET>/<video_path>
  const publicUrl = `${config.hetzner.endpoint}/${config.hetzner.bucket}/${cleanPath}`;

  console.log(`🎬 Generated public HLS URL: ${publicUrl}`);
  return publicUrl;
};

/**
 * Validate video path format
 * @param videoPath - The S3 object key to validate
 * @returns true if valid, false otherwise
 */
export const isValidVideoPath = (videoPath: string): boolean => {
  if (!videoPath || typeof videoPath !== 'string') {
    return false;
  }

  // Must end with .m3u8 (HLS manifest)
  if (!videoPath.endsWith('.m3u8')) {
    return false;
  }

  return true;
};

/**
 * Get CORS headers for HLS streaming
 * These headers should be configured in Hetzner bucket settings
 */
export const getRequiredCorsHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Range',
  };
};

/**
 * Get Cloudflare caching recommendations
 * These are documentation strings for configuration
 */
export const getCloudflareConfig = () => {
  return {
    description: 'Cloudflare caching configuration for HLS streaming',
    pageRule: {
      url: 'cdn.yourdomain.com/*',
      settings: {
        cacheLevel: 'Cache Everything',
        edgeCacheTTL: '1 year',
        browserCacheTTL: 'Respect Existing Headers',
      }
    },
    notes: [
      'HLS files (.m3u8 and .ts) are cached at the edge',
      'Video files will not be fetched from Hetzner repeatedly',
      'The player loads from Cloudflare automatically',
      'No backend proxying required',
      'Supports Range HTTP headers for partial responses (206)',
    ]
  };
};
