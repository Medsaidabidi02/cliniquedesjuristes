/**
 * Local File System Storage Provider
 * Handles video storage on local filesystem (current implementation)
 */

import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { 
  IStorageProvider, 
  UploadOptions, 
  UploadResult, 
  SignedUrlOptions,
  StorageType 
} from '../types/storage';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;
  private baseUrl: string;

  constructor(baseDir: string = 'uploads', baseUrl: string = '') {
    this.baseDir = path.resolve(baseDir);
    this.baseUrl = baseUrl || process.env.API_URL || 'http://localhost:5001';
    
    // Ensure base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    
    console.log(`📁 Local storage provider initialized: ${this.baseDir}`);
  }

  /**
   * Upload a file to local storage
   */
  async upload(file: Express.Multer.File, options: UploadOptions): Promise<UploadResult> {
    try {
      // Construct full path
      const fullPath = path.join(this.baseDir, options.path);
      const directory = path.dirname(fullPath);
      
      // Ensure directory exists
      await fsPromises.mkdir(directory, { recursive: true });
      
      // Move file to destination
      if (file.path) {
        // File already saved by multer, move it
        await fsPromises.rename(file.path, fullPath);
      } else if (file.buffer) {
        // File in memory, write buffer
        await fsPromises.writeFile(fullPath, file.buffer);
      } else {
        throw new Error('File has no path or buffer');
      }
      
      // Get file size
      const stats = await fsPromises.stat(fullPath);
      
      console.log(`✅ File uploaded to local storage: ${options.path}`);
      
      return {
        path: options.path,
        url: `${this.baseUrl}/uploads/${options.path}`,
        size: stats.size,
        storageType: 'local',
      };
    } catch (error) {
      console.error('❌ Local storage upload error:', error);
      throw new Error(`Failed to upload file to local storage: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL (for local storage, just return the direct URL)
   */
  async getSignedUrl(filePath: string, options?: SignedUrlOptions): Promise<string> {
    // For local storage, we return the direct URL
    // In production, you might want to add a short-lived token
    const url = `${this.baseUrl}/uploads/${filePath}`;
    console.log(`🔗 Generated local URL: ${filePath}`);
    return url;
  }

  /**
   * Delete a file from local storage
   */
  async delete(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      
      if (await this.exists(filePath)) {
        await fsPromises.unlink(fullPath);
        console.log(`🗑️ File deleted from local storage: ${filePath}`);
      } else {
        console.warn(`⚠️ File not found for deletion: ${filePath}`);
      }
    } catch (error) {
      console.error('❌ Local storage delete error:', error);
      throw new Error(`Failed to delete file from local storage: ${error.message}`);
    }
  }

  /**
   * Check if a file exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      await fsPromises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(filePath: string): Promise<{ size: number; contentType?: string }> {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      const stats = await fsPromises.stat(fullPath);
      
      // Determine content type from extension
      const ext = path.extname(filePath).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.m3u8': 'application/vnd.apple.mpegurl',
        '.ts': 'video/mp2t',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
      };
      
      return {
        size: stats.size,
        contentType: contentTypeMap[ext],
      };
    } catch (error) {
      console.error('❌ Local storage metadata error:', error);
      throw new Error(`Failed to get metadata from local storage: ${error.message}`);
    }
  }

  /**
   * Get storage type
   */
  getType(): StorageType {
    return 'local';
  }

  /**
   * Get absolute file path
   */
  getAbsolutePath(filePath: string): string {
    return path.join(this.baseDir, filePath);
  }
}

console.log('📦 Local storage provider module loaded');
