/**
 * Storage Interface
 * Abstract interface for file storage operations
 */

export type StorageType = 'local' | 'hetzner';

export interface StorageConfig {
  type: StorageType;
  basePath?: string;
}

export interface UploadOptions {
  path: string;           // Relative path within storage (e.g., "videos/course-1/video.mp4")
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  path: string;           // Full path in storage
  url?: string;           // Direct URL (for local) or base URL (for cloud)
  size: number;
  storageType: StorageType;
}

export interface SignedUrlOptions {
  expiresIn?: number;     // In seconds
  responseContentType?: string;
}

/**
 * Abstract Storage Provider Interface
 */
export interface IStorageProvider {
  /**
   * Upload a file to storage
   */
  upload(file: Express.Multer.File, options: UploadOptions): Promise<UploadResult>;
  
  /**
   * Generate a signed URL for secure access
   */
  getSignedUrl(path: string, options?: SignedUrlOptions): Promise<string>;
  
  /**
   * Delete a file from storage
   */
  delete(path: string): Promise<void>;
  
  /**
   * Check if a file exists
   */
  exists(path: string): Promise<boolean>;
  
  /**
   * Get file metadata
   */
  getMetadata(path: string): Promise<{ size: number; contentType?: string }>;
  
  /**
   * Get storage type
   */
  getType(): StorageType;
}

console.log('📦 Storage types module loaded');
