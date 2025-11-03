import * as ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';

interface BunnyConfig {
  hostname: string;
  username: string;
  password: string;
  port: number;
  secure: boolean;
}

class BunnyStorageService {
  private config: BunnyConfig;

  constructor() {
    this.config = {
      hostname: process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com',
      username: process.env.BUNNY_STORAGE_USERNAME!,
      password: process.env.BUNNY_STORAGE_PASSWORD!,
      port: parseInt(process.env.BUNNY_STORAGE_PORT || '21'),
      secure: false // FTP mode (not FTPS)
    };
    
    // Validate required credentials
    if (!this.config.username || !this.config.password) {
      throw new Error('BUNNY_STORAGE_USERNAME and BUNNY_STORAGE_PASSWORD must be set in environment variables');
    }
  }

  /**
   * Creates an FTP client connection to Bunny.net
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
        secure: this.config.secure
      });
      
      console.log('✅ Connected to Bunny.net Storage');
      return client;
    } catch (error) {
      console.error('❌ Failed to connect to Bunny.net Storage:', error);
      throw new Error(`Bunny.net connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Uploads a file to Bunny.net storage
   * @param localFilePath - Path to the local file
   * @param remoteFilePath - Path on Bunny.net (e.g., /videos/course1/video.mp4)
   */
  async uploadFile(localFilePath: string, remoteFilePath: string): Promise<string> {
    const client = await this.createClient();
    
    try {
      // Ensure the file exists
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`Local file not found: ${localFilePath}`);
      }

      // Ensure remote directory exists
      const remoteDir = path.dirname(remoteFilePath);
      await this.ensureDirectory(client, remoteDir);

      // Upload the file
      console.log(`📤 Uploading ${localFilePath} to Bunny.net at ${remoteFilePath}`);
      await client.uploadFrom(localFilePath, remoteFilePath);
      
      console.log(`✅ File uploaded successfully to ${remoteFilePath}`);
      
      // Generate the CDN URL
      const cdnUrl = this.getCdnUrl(remoteFilePath);
      return cdnUrl;
      
    } catch (error) {
      console.error('❌ Upload to Bunny.net failed:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.close();
    }
  }

  /**
   * Downloads a file from Bunny.net storage
   * @param remoteFilePath - Path on Bunny.net
   * @param localFilePath - Path to save the file locally
   */
  async downloadFile(remoteFilePath: string, localFilePath: string): Promise<void> {
    const client = await this.createClient();
    
    try {
      console.log(`📥 Downloading ${remoteFilePath} from Bunny.net`);
      
      // Ensure local directory exists
      const localDir = path.dirname(localFilePath);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      await client.downloadTo(localFilePath, remoteFilePath);
      console.log(`✅ File downloaded successfully to ${localFilePath}`);
      
    } catch (error) {
      console.error('❌ Download from Bunny.net failed:', error);
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.close();
    }
  }

  /**
   * Deletes a file from Bunny.net storage
   * @param remoteFilePath - Path on Bunny.net
   */
  async deleteFile(remoteFilePath: string): Promise<void> {
    const client = await this.createClient();
    
    try {
      console.log(`🗑️ Deleting ${remoteFilePath} from Bunny.net`);
      await client.remove(remoteFilePath);
      console.log(`✅ File deleted successfully from Bunny.net`);
      
    } catch (error) {
      console.error('❌ Delete from Bunny.net failed:', error);
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.close();
    }
  }

  /**
   * Lists files in a directory on Bunny.net
   * @param remoteDir - Directory path on Bunny.net
   */
  async listFiles(remoteDir: string): Promise<ftp.FileInfo[]> {
    const client = await this.createClient();
    
    try {
      console.log(`📋 Listing files in ${remoteDir} on Bunny.net`);
      const files = await client.list(remoteDir);
      console.log(`✅ Found ${files.length} files in ${remoteDir}`);
      return files;
      
    } catch (error) {
      console.error('❌ List files from Bunny.net failed:', error);
      throw new Error(`List failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.close();
    }
  }

  /**
   * Ensures a directory exists on Bunny.net (creates if not exists)
   * @param client - FTP client instance
   * @param dirPath - Directory path to create
   */
  private async ensureDirectory(client: ftp.Client, dirPath: string): Promise<void> {
    if (dirPath === '/' || dirPath === '.') {
      return;
    }

    const parts = dirPath.split('/').filter(p => p);
    let currentPath = '/';

    for (const part of parts) {
      currentPath = path.posix.join(currentPath, part);
      try {
        await client.cd(currentPath);
      } catch (error) {
        // Directory doesn't exist, create it
        try {
          await client.ensureDir(currentPath);
          console.log(`📁 Created directory: ${currentPath}`);
        } catch (createError) {
          console.error(`❌ Failed to create directory ${currentPath}:`, createError);
        }
      }
    }
  }

  /**
   * Generates a CDN URL for a file path
   * @param remoteFilePath - Path on Bunny.net (e.g., /videos/course1/video.mp4)
   */
  getCdnUrl(remoteFilePath: string): string {
    // Remove leading slash if present
    const cleanPath = remoteFilePath.startsWith('/') ? remoteFilePath.substring(1) : remoteFilePath;
    
    // Construct the CDN URL
    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME || 'cliniquedesjuristesvideos.b-cdn.net';
    return `https://${cdnHostname}/${cleanPath}`;
  }

  /**
   * Checks if Bunny.net storage is properly configured
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.createClient();
      await client.list('/');
      client.close();
      console.log('✅ Bunny.net storage connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Bunny.net storage connection test failed:', error);
      return false;
    }
  }

  /**
   * Creates the required folder structure on Bunny.net
   */
  async setupFolderStructure(): Promise<void> {
    const client = await this.createClient();
    
    try {
      const folders = [
        '/videos',
        '/thumbnails',
        '/materials',
        '/blog',
        '/images'
      ];

      for (const folder of folders) {
        try {
          await client.ensureDir(folder);
          console.log(`✅ Created/verified folder: ${folder}`);
        } catch (error) {
          console.error(`❌ Failed to create folder ${folder}:`, error);
        }
      }

      console.log('✅ Bunny.net folder structure setup complete');
      
    } finally {
      client.close();
    }
  }
}

// Export singleton instance
export const bunnyStorage = new BunnyStorageService();
export default bunnyStorage;
