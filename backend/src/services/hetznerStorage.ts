/**
 * Hetzner Object Storage Provider
 * S3-compatible storage for video files with signed URL support
 */

import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getHetznerConfig } from '../config/hetzner';
import { 
  IStorageProvider, 
  UploadOptions, 
  UploadResult, 
  SignedUrlOptions,
  StorageType 
} from '../types/storage';

export class HetznerStorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const config = getHetznerConfig();
    
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
    });
    
    this.bucket = config.bucket;
    
    console.log(`☁️ Hetzner storage provider initialized: ${config.bucket}`);
  }

  /**
   * Upload a file to Hetzner Object Storage
   */
  async upload(file: Express.Multer.File, options: UploadOptions): Promise<UploadResult> {
    try {
      // Prepare file buffer
      const buffer = file.buffer || await this.readFileBuffer(file.path);
      
      if (!buffer) {
        throw new Error('File has no buffer or path');
      }

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: options.path,
        Body: buffer,
        ContentType: options.contentType || file.mimetype || 'application/octet-stream',
        Metadata: options.metadata || {},
      });

      await this.client.send(command);
      
      console.log(`✅ File uploaded to Hetzner storage: ${options.path}`);
      
      return {
        path: options.path,
        size: buffer.length,
        storageType: 'hetzner',
      };
    } catch (error) {
      console.error('❌ Hetzner storage upload error:', error);
      throw new Error(`Failed to upload file to Hetzner storage: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for secure access
   */
  async getSignedUrl(filePath: string, options?: SignedUrlOptions): Promise<string> {
    try {
      const expiresIn = options?.expiresIn || 900; // 15 minutes default
      
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
        ResponseContentType: options?.responseContentType,
      });

      const signedUrl = await awsGetSignedUrl(this.client, command, {
        expiresIn,
      });
      
      console.log(`🔗 Generated signed URL for: ${filePath} (expires in ${expiresIn}s)`);
      
      return signedUrl;
    } catch (error) {
      console.error('❌ Hetzner signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete a file from Hetzner Object Storage
   */
  async delete(filePath: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      });

      await this.client.send(command);
      
      console.log(`🗑️ File deleted from Hetzner storage: ${filePath}`);
    } catch (error) {
      console.error('❌ Hetzner storage delete error:', error);
      throw new Error(`Failed to delete file from Hetzner storage: ${error.message}`);
    }
  }

  /**
   * Check if a file exists in Hetzner Object Storage
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      console.error('❌ Hetzner storage exists check error:', error);
      throw error;
    }
  }

  /**
   * Get file metadata from Hetzner Object Storage
   */
  async getMetadata(filePath: string): Promise<{ size: number; contentType?: string }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      });

      const response = await this.client.send(command);
      
      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType,
      };
    } catch (error) {
      console.error('❌ Hetzner storage metadata error:', error);
      throw new Error(`Failed to get metadata from Hetzner storage: ${error.message}`);
    }
  }

  /**
   * Get storage type
   */
  getType(): StorageType {
    return 'hetzner';
  }

  /**
   * Helper: Read file buffer from path
   */
  private async readFileBuffer(filePath?: string): Promise<Buffer | null> {
    if (!filePath) return null;
    
    try {
      const fs = await import('fs');
      const { promises: fsPromises } = fs;
      return await fsPromises.readFile(filePath);
    } catch (error) {
      console.error('❌ Failed to read file buffer:', error);
      return null;
    }
  }

  /**
   * Generate signed URLs for HLS playlist and all segments
   */
  async getSignedHLSUrls(
    manifestPath: string,
    segmentPaths: string[],
    expiresIn: number = 900
  ): Promise<{ manifestUrl: string; segmentUrls: Map<string, string> }> {
    try {
      // Generate signed URL for manifest
      const manifestUrl = await this.getSignedUrl(manifestPath, { expiresIn });
      
      // Generate signed URLs for all segments
      const segmentUrls = new Map<string, string>();
      
      for (const segmentPath of segmentPaths) {
        const signedUrl = await this.getSignedUrl(segmentPath, { expiresIn });
        segmentUrls.set(segmentPath, signedUrl);
      }
      
      console.log(`🎬 Generated HLS signed URLs: 1 manifest + ${segmentPaths.length} segments`);
      
      return { manifestUrl, segmentUrls };
    } catch (error) {
      console.error('❌ HLS signed URLs generation error:', error);
      throw new Error(`Failed to generate HLS signed URLs: ${error.message}`);
    }
  }
}

console.log('☁️ Hetzner storage provider module loaded');
