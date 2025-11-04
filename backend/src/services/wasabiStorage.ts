import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();

// Wasabi S3 Client Configuration
const wasabiClient = new S3Client({
  endpoint: process.env.WASABI_ENDPOINT || 'https://s3.eu-central-2.wasabisys.com',
  region: process.env.WASABI_REGION || 'eu-central-2',
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY || '',
    secretAccessKey: process.env.WASABI_SECRET_KEY || '',
  },
  forcePathStyle: true, // Required for Wasabi
});

const BUCKET_NAME = process.env.WASABI_BUCKET || 'cliniquedesjuristes-storage';
const WASABI_BASE_URL = process.env.WASABI_BASE_URL || `https://s3.eu-central-2.wasabisys.com/${BUCKET_NAME}`;

console.log('🗄️ Wasabi Storage initialized');
console.log('  - Bucket:', BUCKET_NAME);
console.log('  - Region:', process.env.WASABI_REGION);
console.log('  - Endpoint:', process.env.WASABI_ENDPOINT);
console.log('  - Base URL:', WASABI_BASE_URL);

/**
 * Upload a file to Wasabi Storage
 * @param file - Multer file object
 * @param path - Target path in Wasabi (e.g., 'videos/course_123/video.mp4')
 * @param contentType - MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadToWasabi(
  file: Express.Multer.File,
  path: string,
  contentType?: string
): Promise<string> {
  try {
    console.log(`📤 Uploading to Wasabi: ${path}`);
    console.log(`  - Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Content-Type: ${contentType || file.mimetype}`);

    // Use multipart upload for large files
    const upload = new Upload({
      client: wasabiClient,
      params: {
        Bucket: BUCKET_NAME,
        Key: path,
        Body: file.buffer || Readable.from(file.stream || []),
        ContentType: contentType || file.mimetype,
        // Make the file publicly accessible
        ACL: 'public-read',
      },
    });

    await upload.done();

    const publicUrl = `${WASABI_BASE_URL}/${path}`;
    console.log(`✅ Uploaded successfully: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ Wasabi upload error:', error);
    throw new Error(`Failed to upload to Wasabi: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload a buffer to Wasabi Storage
 * @param buffer - File buffer
 * @param path - Target path in Wasabi
 * @param contentType - MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadBufferToWasabi(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  try {
    console.log(`📤 Uploading buffer to Wasabi: ${path}`);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await wasabiClient.send(command);

    const publicUrl = `${WASABI_BASE_URL}/${path}`;
    console.log(`✅ Buffer uploaded successfully: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ Wasabi buffer upload error:', error);
    throw new Error(`Failed to upload buffer to Wasabi: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a file from Wasabi Storage
 * @param path - Path of the file to delete
 */
export async function deleteFromWasabi(path: string): Promise<void> {
  try {
    // Extract the key from the full URL if needed
    let key = path;
    if (path.startsWith('http')) {
      const url = new URL(path);
      key = url.pathname.substring(1); // Remove leading slash
      // If path includes bucket name, remove it
      if (key.startsWith(`${BUCKET_NAME}/`)) {
        key = key.substring(BUCKET_NAME.length + 1);
      }
    }

    console.log(`🗑️ Deleting from Wasabi: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await wasabiClient.send(command);
    console.log(`✅ Deleted successfully: ${key}`);
  } catch (error) {
    console.error('❌ Wasabi delete error:', error);
    // Don't throw error on delete failures - file might not exist
    console.warn(`⚠️ Could not delete file from Wasabi: ${path}`);
  }
}

/**
 * List files in a directory in Wasabi Storage
 * @param prefix - Directory prefix (e.g., 'videos/course_123/')
 * @returns Array of file keys
 */
export async function listWasabiFiles(prefix: string): Promise<string[]> {
  try {
    console.log(`📋 Listing files in Wasabi with prefix: ${prefix}`);

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await wasabiClient.send(command);
    const files = response.Contents?.map(item => item.Key || '') || [];
    
    console.log(`✅ Found ${files.length} files`);
    return files;
  } catch (error) {
    console.error('❌ Wasabi list error:', error);
    throw new Error(`Failed to list files from Wasabi: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a file exists in Wasabi Storage
 * @param path - Path of the file to check
 * @returns True if file exists, false otherwise
 */
export async function fileExistsInWasabi(path: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    });

    await wasabiClient.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Generate a file path for Wasabi storage
 * @param type - Type of file ('videos', 'thumbnails', 'resources', 'blog')
 * @param identifier - Course ID or other identifier
 * @param filename - Name of the file
 * @returns The full path for Wasabi storage
 */
export function generateWasabiPath(type: 'videos' | 'thumbnails' | 'resources' | 'blog', identifier: string | number, filename: string): string {
  // Sanitize filename
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${type}/${identifier}/${sanitized}`;
}

/**
 * Get public URL for a Wasabi path
 * @param path - Path in Wasabi storage
 * @returns The public URL
 */
export function getWasabiUrl(path: string): string {
  // If already a full URL, return as is
  if (path.startsWith('http')) {
    return path;
  }
  
  return `${WASABI_BASE_URL}/${path}`;
}

export default {
  uploadToWasabi,
  uploadBufferToWasabi,
  deleteFromWasabi,
  listWasabiFiles,
  fileExistsInWasabi,
  generateWasabiPath,
  getWasabiUrl,
};
