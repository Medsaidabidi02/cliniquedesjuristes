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
  private config: BunnyConfig;
  private storageApiUrl: string;

  constructor() {
    this.config = {
      hostname: process.env.BUNNY_HOSTNAME || 'storage.bunnycdn.com',
      username: process.env.BUNNY_USERNAME || 'cliniquedesjuristesvideos',
      password: process.env.BUNNY_PASSWORD || '2618a218-10c8-469a-93538a7ae921-7c28-499e',
      readOnlyPassword: process.env.BUNNY_READONLY_PASSWORD || '1fa435e1-2fbd-4c19-afb689a73265-0dbb-4756',
      port: parseInt(process.env.BUNNY_PORT || '21'),
      storageZone: process.env.BUNNY_STORAGE_ZONE || 'cliniquedesjuristesvideos',
      pullZoneUrl: process.env.BUNNY_PULL_ZONE_URL
    };

    this.storageApiUrl = `https://storage.bunnycdn.com/${this.config.storageZone}`;
  }

  /**
   * Generate proper file path for Bunny.net storage
   */
  generatePath(type: 'videos' | 'thumbnails' | 'materials' | 'avatars', courseId: number | string, filename: string): string {
    switch (type) {
      case 'videos':
        return `/videos/${courseId}/${filename}`;
      case 'thumbnails':
        return `/thumbnails/${courseId}/${filename}`;
      case 'materials':
        return `/materials/${courseId}/${filename}`;
      case 'avatars':
        return `/avatars/${courseId}/${filename}`;
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
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📤 Uploading to Bunny.net (attempt ${attempt}/${retries}): ${remotePath}`);

        const fileData = Buffer.isBuffer(localPath) ? localPath : require('fs').readFileSync(localPath);
        const url = `${this.storageApiUrl}${remotePath}`;

        const response = await axios.put(url, fileData, {
          headers: {
            'AccessKey': this.config.password,
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
    const client = new ftp.Client();
    client.ftp.verbose = false;
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📤 Uploading via FTP (attempt ${attempt}/${retries}): ${remotePath}`);

        await client.access({
          host: this.config.hostname,
          user: this.config.username,
          password: this.config.password,
          port: this.config.port,
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
    try {
      console.log(`🗑️ Deleting from Bunny.net: ${remotePath}`);
      const url = `${this.storageApiUrl}${remotePath}`;

      await axios.delete(url, {
        headers: {
          'AccessKey': this.config.password
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
    try {
      const url = `${this.storageApiUrl}${remotePath}`;
      const response = await axios.head(url, {
        headers: {
          'AccessKey': this.config.readOnlyPassword
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
    try {
      const url = `${this.storageApiUrl}${remotePath}/`;
      const response = await axios.get(url, {
        headers: {
          'AccessKey': this.config.readOnlyPassword
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
    if (this.config.pullZoneUrl) {
      return `${this.config.pullZoneUrl}${remotePath}`;
    }
    // Fallback to storage URL
    return `https://${this.config.storageZone}.b-cdn.net${remotePath}`;
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
