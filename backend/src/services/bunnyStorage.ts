import * as ftp from 'basic-ftp';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface BunnyConfig {
  hostname: string;
  username: string;
  password: string;
  port: number;
  cdnHostname: string;
  storageZone: string;
}

class BunnyStorageService {
  private config: BunnyConfig;

  constructor() {
    this.config = {
      hostname: process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com',
      username: process.env.BUNNY_STORAGE_USERNAME || 'cliniquedesjuristesvideos',
      password: process.env.BUNNY_STORAGE_PASSWORD || '',
      port: parseInt(process.env.BUNNY_STORAGE_PORT || '21'),
      cdnHostname: process.env.BUNNY_CDN_HOSTNAME || 'cliniquedesjuristesvideos.b-cdn.net',
      storageZone: process.env.BUNNY_STORAGE_ZONE || 'cliniquedesjuristesvideos'
    };

    console.log('🐰 Bunny.net Storage Service initialized');
    console.log(`📦 Storage Zone: ${this.config.storageZone}`);
    console.log(`🌐 CDN Hostname: ${this.config.cdnHostname}`);
  }

  /**
   * Create FTP client connection
   */
  private async createClient(): Promise<ftp.Client> {
    const client = new ftp.Client();
    client.ftp.verbose = process.env.NODE_ENV === 'development';

    try {
      await client.access({
        host: this.config.hostname,
        user: this.config.username,
        password: this.config.password,
        port: this.config.port,
        // NOTE: Using FTP (not FTPS) for development. For production, set secure: true
        secure: false
      });

      console.log('✅ Connected to Bunny.net FTP server');
      return client;
    } catch (error) {
      console.error('❌ Failed to connect to Bunny.net FTP server:', error);
      throw new Error(`Bunny.net connection failed: ${error}`);
    }
  }

  /**
   * Upload a file to Bunny.net storage
   * @param localFilePath - Path to the local file
   * @param remotePath - Remote path on Bunny.net (e.g., '/videos/course1/video.mp4')
   * @returns CDN URL of the uploaded file
   */
  async uploadFile(localFilePath: string, remotePath: string): Promise<string> {
    const client = await this.createClient();

    try {
      // Ensure the remote path starts with /
      if (!remotePath.startsWith('/')) {
        remotePath = '/' + remotePath;
      }

      // Create directory structure if needed
      const remoteDir = path.dirname(remotePath);
      if (remoteDir && remoteDir !== '/') {
        await this.ensureDirectory(client, remoteDir);
      }

      // Upload the file
      console.log(`📤 Uploading to Bunny.net: ${localFilePath} -> ${remotePath}`);
      await client.uploadFrom(localFilePath, remotePath);
      console.log(`✅ File uploaded successfully to Bunny.net: ${remotePath}`);

      // Return the CDN URL
      const cdnUrl = this.getCdnUrl(remotePath);
      return cdnUrl;
    } catch (error) {
      console.error('❌ Failed to upload file to Bunny.net:', error);
      throw new Error(`Bunny.net upload failed: ${error}`);
    } finally {
      client.close();
    }
  }

  /**
   * Upload a buffer to Bunny.net storage
   * @param buffer - File buffer
   * @param remotePath - Remote path on Bunny.net
   * @returns CDN URL of the uploaded file
   */
  async uploadBuffer(buffer: Buffer, remotePath: string): Promise<string> {
    // Create a temporary file using OS temp directory for cross-platform compatibility
    const tempDir = path.join(os.tmpdir(), 'bunny-uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.writeFileSync(tempFilePath, buffer);

    try {
      const cdnUrl = await this.uploadFile(tempFilePath, remotePath);
      return cdnUrl;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  /**
   * Delete a file from Bunny.net storage
   * @param remotePath - Remote path on Bunny.net
   */
  async deleteFile(remotePath: string): Promise<void> {
    const client = await this.createClient();

    try {
      if (!remotePath.startsWith('/')) {
        remotePath = '/' + remotePath;
      }

      console.log(`🗑️ Deleting from Bunny.net: ${remotePath}`);
      await client.remove(remotePath);
      console.log(`✅ File deleted successfully from Bunny.net: ${remotePath}`);
    } catch (error) {
      console.error('❌ Failed to delete file from Bunny.net:', error);
      throw new Error(`Bunny.net delete failed: ${error}`);
    } finally {
      client.close();
    }
  }

  /**
   * Ensure a directory exists on Bunny.net (create if not exists)
   * @param client - FTP client
   * @param dirPath - Directory path
   */
  private async ensureDirectory(client: ftp.Client, dirPath: string): Promise<void> {
    const parts = dirPath.split('/').filter(p => p);
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;
      try {
        await client.cd(currentPath);
      } catch {
        // Directory doesn't exist, create it
        try {
          await client.ensureDir(currentPath);
          console.log(`📁 Created directory on Bunny.net: ${currentPath}`);
        } catch (error) {
          console.error(`❌ Failed to create directory ${currentPath}:`, error);
        }
      }
    }

    // Go back to root
    await client.cd('/');
  }

  /**
   * Get the CDN URL for a remote path
   * @param remotePath - Remote path on Bunny.net
   * @returns CDN URL
   */
  getCdnUrl(remotePath: string): string {
    // Remove leading slash if present
    const cleanPath = remotePath.startsWith('/') ? remotePath.substring(1) : remotePath;
    return `https://${this.config.cdnHostname}/${cleanPath}`;
  }

  /**
   * Extract remote path from CDN URL
   * @param cdnUrl - Full CDN URL
   * @returns Remote path
   */
  getRemotePathFromUrl(cdnUrl: string): string {
    const url = new URL(cdnUrl);
    return url.pathname;
  }

  /**
   * Check if a file exists on Bunny.net
   * @param remotePath - Remote path on Bunny.net
   */
  async fileExists(remotePath: string): Promise<boolean> {
    const client = await this.createClient();

    try {
      if (!remotePath.startsWith('/')) {
        remotePath = '/' + remotePath;
      }

      const list = await client.list(path.dirname(remotePath));
      const fileName = path.basename(remotePath);
      const exists = list.some(item => item.name === fileName);
      
      return exists;
    } catch (error) {
      console.error('❌ Failed to check file existence on Bunny.net:', error);
      return false;
    } finally {
      client.close();
    }
  }

  /**
   * Get file size on Bunny.net
   * @param remotePath - Remote path on Bunny.net
   */
  async getFileSize(remotePath: string): Promise<number> {
    const client = await this.createClient();

    try {
      if (!remotePath.startsWith('/')) {
        remotePath = '/' + remotePath;
      }

      const list = await client.list(path.dirname(remotePath));
      const fileName = path.basename(remotePath);
      const file = list.find(item => item.name === fileName);
      
      return file?.size || 0;
    } catch (error) {
      console.error('❌ Failed to get file size from Bunny.net:', error);
      return 0;
    } finally {
      client.close();
    }
  }

  /**
   * Generate a remote path for a file based on type and metadata
   */
  generateRemotePath(fileType: 'video' | 'thumbnail' | 'document' | 'blog', fileName: string, metadata?: { courseId?: number, subjectId?: number }): string {
    const timestamp = Date.now();
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const safeName = `${baseName}-${timestamp}${ext}`;

    switch (fileType) {
      case 'video':
        if (metadata?.courseId) {
          return `/videos/course-${metadata.courseId}/${safeName}`;
        }
        return `/videos/${safeName}`;

      case 'thumbnail':
        if (metadata?.courseId) {
          return `/thumbnails/course-${metadata.courseId}/${safeName}`;
        }
        return `/thumbnails/${safeName}`;

      case 'document':
        if (metadata?.courseId) {
          return `/materials/course-${metadata.courseId}/${safeName}`;
        }
        return `/materials/${safeName}`;

      case 'blog':
        return `/blog/${safeName}`;

      default:
        return `/${safeName}`;
    }
  }
}

// Export singleton instance
export const bunnyStorage = new BunnyStorageService();
export default bunnyStorage;
