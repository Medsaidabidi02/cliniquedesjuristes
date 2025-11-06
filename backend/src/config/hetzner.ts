/**
 * Hetzner Object Storage Configuration
 * S3-compatible storage configuration for video files
 */

export interface HetznerConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}

/**
 * Get Hetzner storage configuration from environment variables
 */
export const getHetznerConfig = (): HetznerConfig => {
  const endpoint = process.env.HETZNER_ENDPOINT;
  const region = process.env.HETZNER_REGION || 'fsn1';
  const accessKeyId = process.env.HETZNER_ACCESS_KEY;
  const secretAccessKey = process.env.HETZNER_SECRET_KEY;
  const bucket = process.env.HETZNER_BUCKET || 'clinique-videos';

  // Validate required configuration
  if (!endpoint) {
    throw new Error('HETZNER_ENDPOINT environment variable is required');
  }
  
  if (!accessKeyId) {
    throw new Error('HETZNER_ACCESS_KEY environment variable is required');
  }
  
  if (!secretAccessKey) {
    throw new Error('HETZNER_SECRET_KEY environment variable is required');
  }

  return {
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    forcePathStyle: true, // Required for S3-compatible storage
  };
};

/**
 * Check if Hetzner storage is enabled
 */
export const isHetznerEnabled = (): boolean => {
  return process.env.ENABLE_HETZNER === 'true' && 
         !!process.env.HETZNER_ENDPOINT &&
         !!process.env.HETZNER_ACCESS_KEY &&
         !!process.env.HETZNER_SECRET_KEY;
};

/**
 * Get default storage type from environment
 */
export const getDefaultStorageType = (): 'local' | 'hetzner' => {
  const storageType = process.env.DEFAULT_STORAGE_TYPE?.toLowerCase();
  return storageType === 'hetzner' && isHetznerEnabled() ? 'hetzner' : 'local';
};

console.log('📦 Hetzner configuration module loaded');
