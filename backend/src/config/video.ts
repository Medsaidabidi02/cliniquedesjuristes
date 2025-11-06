/**
 * Video System Configuration
 * Centralized configuration for video storage, streaming, and security
 */

export interface VideoConfig {
  // Token configuration
  tokenLifetime: number;           // In seconds (default: 30 minutes)
  urlExpiration: number;            // In seconds (default: 15 minutes)
  tokenRefreshThreshold: number;    // Refresh at this % of lifetime (default: 0.8)
  maxTokenRefreshesPerHour: number; // Rate limit (default: 10)
  
  // HLS configuration
  enableHLS: boolean;
  defaultSegmentDuration: number;   // In seconds (default: 10)
  
  // Storage configuration
  defaultStorageType: 'local' | 'hetzner';
  
  // Path configuration
  videoBasePath: string;            // Base path for video files
  hlsBasePath: string;              // Base path for HLS files
  thumbnailBasePath: string;        // Base path for thumbnails
}

/**
 * Get video system configuration from environment variables
 */
export const getVideoConfig = (): VideoConfig => {
  return {
    // Token configuration
    tokenLifetime: parseInt(process.env.VIDEO_TOKEN_LIFETIME || '1800', 10), // 30 minutes
    urlExpiration: parseInt(process.env.VIDEO_URL_EXPIRATION || '900', 10),   // 15 minutes
    tokenRefreshThreshold: parseFloat(process.env.TOKEN_REFRESH_THRESHOLD || '0.8'),
    maxTokenRefreshesPerHour: parseInt(process.env.MAX_TOKEN_REFRESHES_PER_HOUR || '10', 10),
    
    // HLS configuration
    enableHLS: process.env.ENABLE_HLS === 'true',
    defaultSegmentDuration: parseInt(process.env.DEFAULT_SEGMENT_DURATION || '10', 10),
    
    // Storage configuration
    defaultStorageType: (process.env.DEFAULT_STORAGE_TYPE?.toLowerCase() === 'hetzner' ? 'hetzner' : 'local') as 'local' | 'hetzner',
    
    // Path configuration
    videoBasePath: process.env.VIDEO_BASE_PATH || 'videos',
    hlsBasePath: process.env.HLS_BASE_PATH || 'hls',
    thumbnailBasePath: process.env.THUMBNAIL_BASE_PATH || 'thumbnails',
  };
};

/**
 * Validate video configuration
 */
export const validateVideoConfig = (config: VideoConfig): boolean => {
  if (config.tokenLifetime < 60) {
    console.warn('⚠️ Token lifetime is less than 60 seconds, this may cause issues');
    return false;
  }
  
  if (config.urlExpiration < 60) {
    console.warn('⚠️ URL expiration is less than 60 seconds, this may cause issues');
    return false;
  }
  
  if (config.tokenRefreshThreshold < 0 || config.tokenRefreshThreshold > 1) {
    console.error('❌ Token refresh threshold must be between 0 and 1');
    return false;
  }
  
  if (config.defaultSegmentDuration < 1 || config.defaultSegmentDuration > 60) {
    console.warn('⚠️ Segment duration should be between 1 and 60 seconds');
  }
  
  return true;
};

// Export singleton instance
let configInstance: VideoConfig | null = null;

export const videoConfig = (): VideoConfig => {
  if (!configInstance) {
    configInstance = getVideoConfig();
    validateVideoConfig(configInstance);
  }
  return configInstance;
};

console.log('🎬 Video configuration module loaded');
