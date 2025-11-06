/**
 * Storage Factory
 * Creates and manages storage provider instances
 */

import { IStorageProvider, StorageType } from '../types/storage';
import { LocalStorageProvider } from './localStorage';
import { HetznerStorageProvider } from './hetznerStorage';
import { isHetznerEnabled, getDefaultStorageType } from '../config/hetzner';

// Singleton instances
let localProvider: LocalStorageProvider | null = null;
let hetznerProvider: HetznerStorageProvider | null = null;

/**
 * Get storage provider by type
 */
export const getStorageProvider = (type?: StorageType): IStorageProvider => {
  const storageType = type || getDefaultStorageType();
  
  if (storageType === 'hetzner') {
    if (!isHetznerEnabled()) {
      console.warn('⚠️ Hetzner storage requested but not enabled, falling back to local');
      return getLocalProvider();
    }
    return getHetznerProvider();
  }
  
  return getLocalProvider();
};

/**
 * Get local storage provider (singleton)
 */
export const getLocalProvider = (): LocalStorageProvider => {
  if (!localProvider) {
    localProvider = new LocalStorageProvider();
  }
  return localProvider;
};

/**
 * Get Hetzner storage provider (singleton)
 */
export const getHetznerProvider = (): HetznerStorageProvider => {
  if (!hetznerProvider) {
    if (!isHetznerEnabled()) {
      throw new Error('Hetzner storage is not enabled. Check environment variables.');
    }
    hetznerProvider = new HetznerStorageProvider();
  }
  return hetznerProvider;
};

/**
 * Create storage path with folder structure
 * Example: videos/courses/course-123/video-456.mp4
 */
export const createStoragePath = (
  type: 'video' | 'hls' | 'thumbnail',
  options: {
    courseId?: number | string;
    subjectId?: number | string;
    videoId?: number | string;
    filename: string;
  }
): string => {
  const parts: string[] = [];
  
  // Base path based on type
  if (type === 'video') {
    parts.push('videos');
  } else if (type === 'hls') {
    parts.push('hls');
  } else if (type === 'thumbnail') {
    parts.push('thumbnails');
  }
  
  // Add course folder if provided
  if (options.courseId) {
    parts.push(`course-${options.courseId}`);
  }
  
  // Add subject folder if provided
  if (options.subjectId) {
    parts.push(`subject-${options.subjectId}`);
  }
  
  // Add video folder for HLS (contains manifest + segments)
  if (type === 'hls' && options.videoId) {
    parts.push(`video-${options.videoId}`);
  }
  
  // Add filename
  parts.push(options.filename);
  
  const path = parts.join('/');
  console.log(`📁 Created storage path: ${path}`);
  
  return path;
};

/**
 * Parse storage path to extract components
 */
export const parseStoragePath = (path: string): {
  type: 'video' | 'hls' | 'thumbnail' | 'unknown';
  courseId?: string;
  subjectId?: string;
  videoId?: string;
  filename: string;
} => {
  const parts = path.split('/');
  const result: any = {
    filename: parts[parts.length - 1],
  };
  
  // Determine type from first part
  if (parts[0] === 'videos') {
    result.type = 'video';
  } else if (parts[0] === 'hls') {
    result.type = 'hls';
  } else if (parts[0] === 'thumbnails') {
    result.type = 'thumbnail';
  } else {
    result.type = 'unknown';
  }
  
  // Extract IDs from path
  for (const part of parts) {
    if (part.startsWith('course-')) {
      result.courseId = part.replace('course-', '');
    } else if (part.startsWith('subject-')) {
      result.subjectId = part.replace('subject-', '');
    } else if (part.startsWith('video-')) {
      result.videoId = part.replace('video-', '');
    }
  }
  
  return result;
};

/**
 * Get storage provider for a specific video
 * Uses the video's storage_type if available
 */
export const getVideoStorageProvider = (
  video: { storage_type?: string }
): IStorageProvider => {
  const storageType = (video.storage_type as StorageType) || getDefaultStorageType();
  return getStorageProvider(storageType);
};

console.log('🏭 Storage factory module loaded');
