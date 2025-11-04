import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import crypto from 'crypto';
import path from 'path';
import { Readable } from 'stream';

// Wasabi S3 Configuration
const wasabiConfig = {
  accessKeyId: process.env.WASABI_ACCESS_KEY || '',
  secretAccessKey: process.env.WASABI_SECRET_KEY || '',
  region: process.env.WASABI_REGION || 'eu-central-1',
  endpoint: process.env.WASABI_ENDPOINT || 'https://s3.eu-central-1.wasabisys.com',
};

const bucketName = process.env.WASABI_BUCKET_NAME || 'my-educational-platform';
const cdnDomain = process.env.CDN_DOMAIN || 'cdn.cliniquedesjuristes.com';

// Create S3 client
export const s3Client = new S3Client({
  region: wasabiConfig.region,
  endpoint: wasabiConfig.endpoint,
  credentials: {
    accessKeyId: wasabiConfig.accessKeyId,
    secretAccessKey: wasabiConfig.secretAccessKey,
  },
  forcePathStyle: true, // Required for Wasabi compatibility
});

// Validate Wasabi configuration
export const validateWasabiConfig = (): boolean => {
  const isValid = !!(
    wasabiConfig.accessKeyId &&
    wasabiConfig.secretAccessKey &&
    bucketName &&
    wasabiConfig.region
  );

  if (!isValid) {
    console.error('❌ Wasabi configuration is incomplete. Please check environment variables:');
    console.error('  - WASABI_ACCESS_KEY:', wasabiConfig.accessKeyId ? '✓' : '✗');
    console.error('  - WASABI_SECRET_KEY:', wasabiConfig.secretAccessKey ? '✓' : '✗');
    console.error('  - WASABI_BUCKET_NAME:', bucketName ? '✓' : '✗');
    console.error('  - WASABI_REGION:', wasabiConfig.region ? '✓' : '✗');
  }

  return isValid;
};

// Generate unique filename with proper extension
export const generateUniqueFilename = (originalFilename: string): string => {
  const ext = path.extname(originalFilename);
  const uniqueId = crypto.randomUUID();
  const timestamp = Date.now();
  return `${uniqueId}-${timestamp}${ext}`;
};

// Get CDN URL for a file
export const getCdnUrl = (key: string): string => {
  return `https://${cdnDomain}/${key}`;
};

// Upload file to Wasabi S3
export interface UploadOptions {
  file: Express.Multer.File | Buffer | Readable;
  folder?: string; // e.g., 'videos', 'thumbnails'
  filename?: string;
  contentType?: string;
  isPublic?: boolean;
}

export const uploadToWasabi = async (options: UploadOptions): Promise<{ key: string; url: string; size: number }> => {
  try {
    if (!validateWasabiConfig()) {
      throw new Error('Wasabi configuration is invalid');
    }

    const { file, folder = 'videos', filename, contentType, isPublic = true } = options;

    // Determine file properties with proper type checking
    let fileBuffer: Buffer;
    let fileSize: number;
    let mimeType: string;
    let originalName: string;

    // Type guard for Multer file
    const isMulterFile = (f: any): f is Express.Multer.File => {
      return f && typeof f === 'object' && 'buffer' in f && 'mimetype' in f && 'originalname' in f;
    };

    if (Buffer.isBuffer(file)) {
      fileBuffer = file;
      fileSize = file.length;
      mimeType = contentType || 'application/octet-stream';
      originalName = filename || 'file';
    } else if (file instanceof Readable) {
      throw new Error('Stream uploads should use uploadStreamToWasabi');
    } else if (isMulterFile(file)) {
      // It's a Multer file
      fileBuffer = file.buffer;
      fileSize = file.size;
      mimeType = file.mimetype;
      originalName = file.originalname;
    } else {
      throw new Error('Invalid file type provided');
    }

    // Generate unique filename if not provided
    const uniqueFilename = filename || generateUniqueFilename(originalName);
    const key = `${folder}/${uniqueFilename}`;

    console.log(`📤 Uploading to Wasabi: ${key} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable', // 1 year cache
      ...(isPublic ? { ACL: 'public-read' } : {}),
    });

    await s3Client.send(command);

    const cdnUrl = getCdnUrl(key);
    console.log(`✅ Upload successful: ${cdnUrl}`);

    return {
      key,
      url: cdnUrl,
      size: fileSize,
    };
  } catch (error) {
    console.error('❌ Error uploading to Wasabi:', error);
    throw new Error(`Failed to upload to Wasabi: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Upload large file using multipart upload
export const uploadStreamToWasabi = async (
  stream: Readable,
  options: {
    folder?: string;
    filename: string;
    contentType: string;
    fileSize: number;
    isPublic?: boolean;
  }
): Promise<{ key: string; url: string; size: number }> => {
  try {
    if (!validateWasabiConfig()) {
      throw new Error('Wasabi configuration is invalid');
    }

    const { folder = 'videos', filename, contentType, fileSize, isPublic = true } = options;
    const key = `${folder}/${filename}`;

    console.log(`📤 Starting multipart upload to Wasabi: ${key} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);

    // Use Upload from @aws-sdk/lib-storage for multipart upload
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: stream,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
        ...(isPublic ? { ACL: 'public-read' } : {}),
      },
      // Configure multipart upload
      queueSize: 4, // Number of concurrent uploads
      partSize: 50 * 1024 * 1024, // 50 MB per part (minimum for S3)
    });

    // Track progress
    upload.on('httpUploadProgress', (progress) => {
      if (progress.loaded && progress.total) {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        console.log(`📊 Upload progress: ${percentage}% (${progress.loaded}/${progress.total} bytes)`);
      }
    });

    await upload.done();

    const cdnUrl = getCdnUrl(key);
    console.log(`✅ Multipart upload successful: ${cdnUrl}`);

    return {
      key,
      url: cdnUrl,
      size: fileSize,
    };
  } catch (error) {
    console.error('❌ Error in multipart upload to Wasabi:', error);
    throw new Error(`Failed to upload stream to Wasabi: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Delete file from Wasabi S3
export const deleteFromWasabi = async (key: string): Promise<boolean> => {
  try {
    if (!validateWasabiConfig()) {
      throw new Error('Wasabi configuration is invalid');
    }

    console.log(`🗑️ Deleting from Wasabi: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`✅ File deleted successfully from Wasabi: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting from Wasabi: ${key}`, error);
    return false;
  }
};

// Check if file exists in Wasabi
export const fileExistsInWasabi = async (key: string): Promise<boolean> => {
  try {
    if (!validateWasabiConfig()) {
      return false;
    }

    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
};

// Extract key from CDN URL
export const extractKeyFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    
    // Handle CDN URLs - verify the hostname matches exactly
    if (urlObj.hostname === cdnDomain) {
      // CDN URL: https://cdn.cliniquedesjuristes.com/videos/file.mp4
      return urlObj.pathname.substring(1); // Remove leading slash
    } else if (urlObj.hostname.includes('wasabisys.com') && url.includes(bucketName)) {
      // Direct S3 URL from Wasabi
      const pathParts = urlObj.pathname.split('/');
      // Remove bucket name if present in path
      return pathParts.slice(2).join('/');
    }
    return null;
  } catch (error) {
    console.error('Error extracting key from URL:', error);
    return null;
  }
};

// Helper to determine folder from file type
export const getFolderFromFileType = (mimetype: string): string => {
  if (mimetype.startsWith('video/')) {
    return 'videos';
  } else if (mimetype.startsWith('image/')) {
    return 'thumbnails';
  } else {
    return 'files';
  }
};

console.log('🌐 Wasabi S3 client initialized');
console.log(`  - Region: ${wasabiConfig.region}`);
console.log(`  - Endpoint: ${wasabiConfig.endpoint}`);
console.log(`  - Bucket: ${bucketName}`);
console.log(`  - CDN Domain: ${cdnDomain}`);
console.log(`  - Config Valid: ${validateWasabiConfig() ? '✓' : '✗'}`);
