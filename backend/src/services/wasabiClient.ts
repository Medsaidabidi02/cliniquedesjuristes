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
  // Check if credentials exist and are not placeholder values
  const hasAccessKey = wasabiConfig.accessKeyId && 
                       wasabiConfig.accessKeyId.length > 0 && 
                       !wasabiConfig.accessKeyId.includes('${') &&
                       !wasabiConfig.accessKeyId.includes('}');
  
  const hasSecretKey = wasabiConfig.secretAccessKey && 
                       wasabiConfig.secretAccessKey.length > 0 && 
                       !wasabiConfig.secretAccessKey.includes('${') &&
                       !wasabiConfig.secretAccessKey.includes('}');
  
  const hasBucketName = bucketName && bucketName.length > 0;
  const hasRegion = wasabiConfig.region && wasabiConfig.region.length > 0;
  
  const isValid = !!(hasAccessKey && hasSecretKey && hasBucketName && hasRegion);

  if (!isValid) {
    console.warn('⚠️ Wasabi configuration is incomplete or using placeholders. Falling back to local storage.');
    console.warn('  To enable Wasabi S3, set these environment variables with actual values:');
    console.warn('  - WASABI_ACCESS_KEY:', hasAccessKey ? '✓' : '✗ (missing or placeholder)');
    console.warn('  - WASABI_SECRET_KEY:', hasSecretKey ? '✓' : '✗ (missing or placeholder)');
    console.warn('  - WASABI_BUCKET_NAME:', hasBucketName ? '✓' : '✗');
    console.warn('  - WASABI_REGION:', hasRegion ? '✓' : '✗');
  } else {
    console.log('✅ Wasabi S3 configuration validated successfully');
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
    const isMulterFile = (f: unknown): f is Express.Multer.File => {
      return (
        typeof f === 'object' && 
        f !== null && 
        'buffer' in f && 
        'mimetype' in f && 
        'originalname' in f &&
        Buffer.isBuffer((f as Express.Multer.File).buffer)
      );
    };

    if (Buffer.isBuffer(file)) {
      fileBuffer = file;
      fileSize = file.length;
      // Ensure contentType is always a string
      mimeType = (contentType && typeof contentType === 'string') ? contentType : 'application/octet-stream';
      originalName = (filename && typeof filename === 'string') ? filename : 'file';
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
    
    // Provide more specific error messages
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Detect common issues
      if (errorMessage.includes('does not exist')) {
        errorMessage = `Bucket '${bucketName}' does not exist. Please create the bucket in Wasabi console or check WASABI_BUCKET_NAME environment variable.`;
      } else if (errorMessage.includes('InvalidAccessKeyId') || errorMessage.includes('SignatureDoesNotMatch')) {
        errorMessage = 'Invalid Wasabi credentials. Please check WASABI_ACCESS_KEY and WASABI_SECRET_KEY environment variables.';
      } else if (errorMessage.includes('Access Denied')) {
        errorMessage = `Access denied to bucket '${bucketName}'. Please check bucket permissions and credentials.`;
      }
    }
    
    throw new Error(`Failed to upload to Wasabi: ${errorMessage}`);
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
    } else if (urlObj.hostname.endsWith('.wasabisys.com') && urlObj.hostname.startsWith('s3.')) {
      // Direct S3 URL from Wasabi - verify it's a proper Wasabi S3 URL
      // Expected format: s3.{region}.wasabisys.com
      const pathParts = urlObj.pathname.split('/');
      // Check if bucket name is in path
      if (pathParts.length > 2 && pathParts[1] === bucketName) {
        return pathParts.slice(2).join('/');
      }
      // Otherwise, entire path is the key
      return urlObj.pathname.substring(1);
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

// Only log initialization info, don't validate again (validation happens in fileUpload.ts)
console.log('🌐 Wasabi S3 client module loaded');
console.log(`  - Region: ${wasabiConfig.region}`);
console.log(`  - Endpoint: ${wasabiConfig.endpoint}`);
console.log(`  - Bucket: ${bucketName}`);
console.log(`  - CDN Domain: ${cdnDomain}`);
