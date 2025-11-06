/**
 * Signed URL Service
 * Generates time-limited signed URLs for secure video access
 */

import { getStorageProvider, getVideoStorageProvider } from './storageFactory';
import { videoConfig } from '../config/video';
import { StorageType } from '../types/storage';

export interface SignedUrlResult {
  url: string;
  expiresIn: number;
  expiresAt: Date;
  storageType: StorageType;
}

export interface HLSSignedUrlResult {
  manifestUrl: string;
  expiresIn: number;
  expiresAt: Date;
  storageType: StorageType;
}

/**
 * Generate a signed URL for a video file
 */
export const generateSignedUrl = async (
  filePath: string,
  storageType?: StorageType,
  expiresIn?: number
): Promise<SignedUrlResult> => {
  try {
    const config = videoConfig();
    const expiration = expiresIn || config.urlExpiration;
    const provider = getStorageProvider(storageType);
    
    const url = await provider.getSignedUrl(filePath, {
      expiresIn: expiration,
    });
    
    const expiresAt = new Date(Date.now() + expiration * 1000);
    
    console.log(`🔐 Generated signed URL: ${filePath} (expires in ${expiration}s)`);
    
    return {
      url,
      expiresIn: expiration,
      expiresAt,
      storageType: provider.getType(),
    };
  } catch (error) {
    console.error('❌ Signed URL generation error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Generate signed URL for a video based on video metadata
 */
export const generateVideoSignedUrl = async (
  video: {
    video_path: string;
    storage_type?: string;
  },
  expiresIn?: number
): Promise<SignedUrlResult> => {
  const provider = getVideoStorageProvider(video);
  const config = videoConfig();
  const expiration = expiresIn || config.urlExpiration;
  
  const url = await provider.getSignedUrl(video.video_path, {
    expiresIn: expiration,
  });
  
  const expiresAt = new Date(Date.now() + expiration * 1000);
  
  console.log(`🎬 Generated video signed URL: ${video.video_path}`);
  
  return {
    url,
    expiresIn: expiration,
    expiresAt,
    storageType: provider.getType(),
  };
};

/**
 * Generate signed URLs for HLS manifest (m3u8 file)
 */
export const generateHLSManifestSignedUrl = async (
  manifestPath: string,
  storageType?: StorageType,
  expiresIn?: number
): Promise<HLSSignedUrlResult> => {
  try {
    const config = videoConfig();
    const expiration = expiresIn || config.urlExpiration;
    const provider = getStorageProvider(storageType);
    
    const url = await provider.getSignedUrl(manifestPath, {
      expiresIn: expiration,
      responseContentType: 'application/vnd.apple.mpegurl',
    });
    
    const expiresAt = new Date(Date.now() + expiration * 1000);
    
    console.log(`🎬 Generated HLS manifest signed URL: ${manifestPath}`);
    
    return {
      manifestUrl: url,
      expiresIn: expiration,
      expiresAt,
      storageType: provider.getType(),
    };
  } catch (error) {
    console.error('❌ HLS manifest signed URL generation error:', error);
    throw new Error(`Failed to generate HLS manifest signed URL: ${error.message}`);
  }
};

/**
 * Generate signed URLs for HLS segments (ts files)
 */
export const generateHLSSegmentSignedUrl = async (
  segmentPath: string,
  storageType?: StorageType,
  expiresIn?: number
): Promise<SignedUrlResult> => {
  try {
    const config = videoConfig();
    const expiration = expiresIn || config.urlExpiration;
    const provider = getStorageProvider(storageType);
    
    const url = await provider.getSignedUrl(segmentPath, {
      expiresIn: expiration,
      responseContentType: 'video/mp2t',
    });
    
    const expiresAt = new Date(Date.now() + expiration * 1000);
    
    return {
      url,
      expiresIn: expiration,
      expiresAt,
      storageType: provider.getType(),
    };
  } catch (error) {
    console.error('❌ HLS segment signed URL generation error:', error);
    throw new Error(`Failed to generate HLS segment signed URL: ${error.message}`);
  }
};

/**
 * Generate batch signed URLs for multiple files
 */
export const generateBatchSignedUrls = async (
  filePaths: string[],
  storageType?: StorageType,
  expiresIn?: number
): Promise<Map<string, SignedUrlResult>> => {
  const results = new Map<string, SignedUrlResult>();
  
  const promises = filePaths.map(async (filePath) => {
    try {
      const result = await generateSignedUrl(filePath, storageType, expiresIn);
      results.set(filePath, result);
    } catch (error) {
      console.error(`❌ Failed to generate signed URL for ${filePath}:`, error);
      // Continue with other files even if one fails
    }
  });
  
  await Promise.all(promises);
  
  console.log(`📦 Generated batch signed URLs: ${results.size}/${filePaths.length}`);
  
  return results;
};

/**
 * Check if a signed URL is still valid
 */
export const isSignedUrlValid = (expiresAt: Date): boolean => {
  return expiresAt > new Date();
};

/**
 * Get time remaining until URL expiration (in seconds)
 */
export const getTimeUntilExpiration = (expiresAt: Date): number => {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diff / 1000));
};

/**
 * Check if URL needs refresh based on threshold
 */
export const needsRefresh = (expiresAt: Date, threshold: number = 0.8): boolean => {
  const config = videoConfig();
  const totalLifetime = config.urlExpiration;
  const remainingTime = getTimeUntilExpiration(expiresAt);
  const elapsedTime = totalLifetime - remainingTime;
  
  return elapsedTime >= (totalLifetime * threshold);
};

console.log('🔐 Signed URL service module loaded');
