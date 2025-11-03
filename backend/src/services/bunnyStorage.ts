import axios, { AxiosError } from 'axios';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';
import path from 'path';

interface BunnyConfig {
  hostname: string;
  username: string;
  password: string;
  readOnlyPassword: string;
  port: number;
  storageZone: string;
  pullZoneUrl?: string;
}

interface UploadResult {
  success: boolean;
  path: string;
  size?: number;
  error?: string;
}

interface FileInfo {
  path: string;
  size: number;
  lastModified: Date;
}

class BunnyStorageService {
  private config: BunnyConfig | null = null;
  private storageApiUrl: string = '';
  private initError: Error | null = null;

  constructor() {
    // Lazy initialization - don't fail on import
    try {
      this.initialize();
    } catch (error) {
      this.initError = error instanceof Error ? error : new Error('Failed to initialize Bunny.net service');
      console.warn('⚠️ Bunny.net service initialization failed:', this.initError.message);
      console.warn('⚠️ Bunny.net uploads will not work until environment variables are configured');
    }
  }

  private initialize() {
    this.config = {
      hostname: process.env.BUNNY_HOSTNAME || 'storage.bunnycdn.com',
      username: process.env.BUNNY_USERNAME || '',
      password: process.env.BUNNY_PASSWORD || '',
      readOnlyPassword: process.env.BUNNY_READONLY_PASSWORD || '',
      port: parseInt(process.env.BUNNY_PORT || '21'),
      storageZone: process.env.BUNNY_STORAGE_ZONE || '',
      pullZoneUrl: process.env.BUNNY_PULL_ZONE_URL
    };

    // Validate required configuration
    if (!this.config.username || !this.config.password) {
      throw new Error('BUNNY_USERNAME and BUNNY_PASSWORD environment variables are required. Please configure them in your .env file.');
    }

    if (!this.config.storageZone) {
      throw new Error('BUNNY_STORAGE_ZONE environment variable is required. Please configure it in your .env file.');
    }

    this.storageApiUrl = `https://storage.bunnycdn.com/${this.config.storageZone}`;
  }

  private ensureInitialized(): void {
    if (this.initError) {
      throw new Error(`Bunny.net service is not configured: ${this.initError.message}`);
    }
    if (!this.config) {
      throw new Error('Bunny.net service is not initialized');
    }
  }

  /**
   * Sanitize filename to prevent path traversal
   */
  private sanitizeFilename(filename: string): string {
    // Remove any path components and only keep the filename
    return filename.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '-');
  }

  /**
   * Generate proper file path for Bunny.net storage
   */
  generatePath(type: 'videos' | 'thumbnails' | 'materials' | 'avatars', courseId: number | string, filename: string): string {
    this.ensureInitialized();
    
    // Validate courseId
    const courseIdNum = typeof courseId === 'string' ? parseInt(courseId) : courseId;
    if (isNaN(courseIdNum) || courseIdNum <= 0) {
      throw new Error('Invalid courseId: must be a positive integer');
    }

    // Sanitize filename to prevent path traversal
    const safeFilename = this.sanitizeFilename(filename);
    
    if (!safeFilename) {
      throw new Error('Invalid filename after sanitization');
    }

    switch (type) {
      case 'videos':
        return `/videos/${courseIdNum}/${safeFilename}`;
      case 'thumbnails':
        return `/thumbnails/${courseIdNum}/${safeFilename}`;
      case 'materials':
        return `/materials/${courseIdNum}/${safeFilename}`;
      case 'avatars':
        return `/avatars/${courseIdNum}/${safeFilename}`;
      default:
        throw new Error(`Unknown file type: ${type}`);
    }
  }

  /**
   * Upload file using HTTP Storage API
   */
  async uploadViaHttp(
    localPath: string | Buffer,
    remotePath: string,
    retries: number = 3
  ): Promise<UploadResult> {
    this.ensureInitialized();
    
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📤 Uploading to Bunny.net (attempt ${attempt}/${retries}): ${remotePath}`);

        const fileData = Buffer.isBuffer(localPath) ? localPath : require('fs').readFileSync(localPath);
        const url = `${this.storageApiUrl}${remotePath}`;

        const response = await axios.put(url, fileData, {
          headers: {
            'AccessKey': this.config!.password,
            'Content-Type': 'application/octet-stream',
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        if (response.status === 201 || response.status === 200) {
          console.log(`✅ Successfully uploaded to Bunny.net: ${remotePath}`);
          return {
            success: true,
            path: remotePath,
            size: fileData.length
          };
        }

        throw new Error(`Unexpected response status: ${response.status}`);

      } catch (error) {
        lastError = error;
        console.error(`❌ Upload attempt ${attempt} failed:`, error instanceof AxiosError ? error.message : error);
        
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      path: remotePath,
      error: lastError instanceof Error ? lastError.message : 'Upload failed'
    };
  }

  /**
   * Upload file using FTP (passive mode)
   */
  async uploadViaFtp(
    localPath: string | Buffer,
    remotePath: string,
    retries: number = 3
  ): Promise<UploadResult> {
    this.ensureInitialized();
    
    const client = new ftp.Client();
    client.ftp.verbose = false;
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📤 Uploading via FTP (attempt ${attempt}/${retries}): ${remotePath}`);

        await client.access({
          host: this.config!.hostname,
          user: this.config!.username,
          password: this.config!.password,
          port: this.config!.port,
          secure: false,
          secureOptions: { rejectUnauthorized: false }
        });

        // Ensure directory exists
        const dir = path.dirname(remotePath);
        if (dir !== '/' && dir !== '.') {
          await client.ensureDir(dir);
        }

        // Upload file
        if (Buffer.isBuffer(localPath)) {
          const readable = Readable.from(localPath);
          await client.uploadFrom(readable, remotePath);
        } else {
          await client.uploadFrom(localPath, remotePath);
        }

        client.close();

        console.log(`✅ Successfully uploaded via FTP: ${remotePath}`);
        return {
          success: true,
          path: remotePath
        };

      } catch (error) {
        lastError = error;
        console.error(`❌ FTP upload attempt ${attempt} failed:`, error);
        client.close();
        
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      path: remotePath,
      error: lastError instanceof Error ? lastError.message : 'FTP upload failed'
    };
  }

  /**
   * Delete file from Bunny.net storage
   */
  async deleteFile(remotePath: string): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      console.log(`🗑️ Deleting from Bunny.net: ${remotePath}`);
      const url = `${this.storageApiUrl}${remotePath}`;

      await axios.delete(url, {
        headers: {
          'AccessKey': this.config!.password
        }
      });

      console.log(`✅ Successfully deleted from Bunny.net: ${remotePath}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to delete from Bunny.net:`, error instanceof AxiosError ? error.message : error);
      return false;
    }
  }

  /**
   * Check if file exists on Bunny.net
   */
  async fileExists(remotePath: string): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      const url = `${this.storageApiUrl}${remotePath}`;
      const response = await axios.head(url, {
        headers: {
          'AccessKey': this.config!.readOnlyPassword
        }
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(remotePath: string): Promise<FileInfo[]> {
    this.ensureInitialized();
    
    try {
      const url = `${this.storageApiUrl}${remotePath}/`;
      const response = await axios.get(url, {
        headers: {
          'AccessKey': this.config!.readOnlyPassword
        }
      });

      if (Array.isArray(response.data)) {
        return response.data.map((item: any) => ({
          path: `${remotePath}/${item.ObjectName}`,
          size: item.Length || 0,
          lastModified: new Date(item.LastChanged)
        }));
      }

      return [];
    } catch (error) {
      console.error('❌ Failed to list files:', error instanceof AxiosError ? error.message : error);
      return [];
    }
  }

  /**
   * Get public URL for a file (for non-signed access)
   */
  getPublicUrl(remotePath: string): string {
    this.ensureInitialized();
    
    if (this.config!.pullZoneUrl) {
      return `${this.config!.pullZoneUrl}${remotePath}`;
    }
    // Fallback to storage URL
    return `https://${this.config!.storageZone}.b-cdn.net${remotePath}`;
  }

  /**
   * Stream upload from buffer or file
   */
  async streamUpload(
    source: Buffer | string,
    remotePath: string,
    preferFtp: boolean = false
  ): Promise<UploadResult> {
    if (preferFtp) {
      return this.uploadViaFtp(source, remotePath);
    } else {
      return this.uploadViaHttp(source, remotePath);
    }
  }
}

export default new BunnyStorageService();
export { BunnyStorageService, UploadResult, FileInfo };
