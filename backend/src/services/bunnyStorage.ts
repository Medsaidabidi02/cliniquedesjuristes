import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';
import path from 'path';

// Bunny.net Storage API Configuration
const BUNNY_STORAGE_ZONE = 'cliniquedesjuristesvideos';
const BUNNY_STORAGE_HOST = 'storage.bunnycdn.com';
const BUNNY_WRITE_API_KEY = '2618a218-10c8-469a-9353-8a7ae921-7c28-499e';
const BUNNY_READ_API_KEY = '1fa435e1-2fbd-4c19-afb6-89a73265-0dbb-4756';
const BUNNY_CDN_URL = `https://${BUNNY_STORAGE_ZONE}.b-cdn.net`;

// Base URL for Bunny.net Storage API
const BUNNY_API_BASE = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}`;

interface BunnyUploadOptions {
  filePath: string;
  fileBuffer: Buffer;
  contentType?: string;
}

interface BunnyFileInfo {
  Guid: string;
  StorageZoneName: string;
  Path: string;
  ObjectName: string;
  Length: number;
  LastChanged: string;
  IsDirectory: boolean;
  ServerId: number;
  UserId: string;
  DateCreated: string;
  StorageZoneId: number;
}

/**
 * Upload a file to Bunny.net Storage
 * @param options Upload options including file path and buffer
 * @returns The CDN URL of the uploaded file
 */
export async function uploadFileToBunny(options: BunnyUploadOptions): Promise<string> {
  const { filePath, fileBuffer, contentType } = options;
  
  try {
    console.log(`📤 Uploading to Bunny.net: ${filePath}`);
    
    // Ensure the path starts with /
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const uploadUrl = `${BUNNY_API_BASE}${normalizedPath}`;
    
    console.log(`🔗 Upload URL: ${uploadUrl}`);
    
    const response = await axios.put(uploadUrl, fileBuffer, {
      headers: {
        'AccessKey': BUNNY_WRITE_API_KEY,
        'Content-Type': contentType || 'application/octet-stream',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    
    if (response.status === 201 || response.status === 200) {
      const cdnUrl = `${BUNNY_CDN_URL}${normalizedPath}`;
      console.log(`✅ File uploaded successfully: ${cdnUrl}`);
      return cdnUrl;
    } else {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error('❌ Bunny.net upload error:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        message: axiosError.message
      });
      throw new Error(`Bunny.net upload failed: ${axiosError.message}`);
    }
    throw error;
  }
}

/**
 * Delete a file from Bunny.net Storage
 * @param filePath Path to the file in Bunny.net Storage
 */
export async function deleteFileFromBunny(filePath: string): Promise<void> {
  try {
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const deleteUrl = `${BUNNY_API_BASE}${normalizedPath}`;
    
    console.log(`🗑️ Deleting from Bunny.net: ${deleteUrl}`);
    
    await axios.delete(deleteUrl, {
      headers: {
        'AccessKey': BUNNY_WRITE_API_KEY,
      },
    });
    
    console.log(`✅ File deleted successfully: ${filePath}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      // If file doesn't exist (404), consider it a success
      if (axiosError.response?.status === 404) {
        console.log(`ℹ️ File not found (already deleted): ${filePath}`);
        return;
      }
      console.error('❌ Bunny.net delete error:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message
      });
      throw new Error(`Bunny.net delete failed: ${axiosError.message}`);
    }
    throw error;
  }
}

/**
 * List files in a directory on Bunny.net Storage
 * @param directoryPath Path to the directory
 * @returns Array of file information
 */
export async function listFilesInBunny(directoryPath: string = '/'): Promise<BunnyFileInfo[]> {
  try {
    const normalizedPath = directoryPath.startsWith('/') ? directoryPath : `/${directoryPath}`;
    const listUrl = `${BUNNY_API_BASE}${normalizedPath}/`;
    
    console.log(`📋 Listing files in Bunny.net: ${listUrl}`);
    
    const response = await axios.get<BunnyFileInfo[]>(listUrl, {
      headers: {
        'AccessKey': BUNNY_READ_API_KEY,
      },
    });
    
    console.log(`✅ Found ${response.data.length} items in ${directoryPath}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      // If directory doesn't exist, return empty array
      if (axiosError.response?.status === 404) {
        console.log(`ℹ️ Directory not found: ${directoryPath}`);
        return [];
      }
      console.error('❌ Bunny.net list error:', {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message
      });
      throw new Error(`Bunny.net list failed: ${axiosError.message}`);
    }
    throw error;
  }
}

/**
 * Generate a signed URL for secure file access
 * @param filePath Path to the file in Bunny.net
 * @param expirationSeconds Expiration time in seconds (default: 4 hours)
 * @returns Signed URL
 */
export function generateSignedUrl(
  filePath: string,
  expirationSeconds: number = 4 * 60 * 60 // 4 hours default
): string {
  // For Bunny.net, we can use token authentication
  // The URL format is: https://zone.b-cdn.net/path?token=TOKEN&expires=TIMESTAMP
  
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const expires = Math.floor(Date.now() / 1000) + expirationSeconds;
  
  // Create token: base64(sha256(API_KEY + path + expires))
  const tokenBase = `${BUNNY_READ_API_KEY}${normalizedPath}${expires}`;
  const token = crypto
    .createHash('sha256')
    .update(tokenBase)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const signedUrl = `${BUNNY_CDN_URL}${normalizedPath}?token=${token}&expires=${expires}`;
  
  console.log(`🔐 Generated signed URL for: ${filePath} (expires in ${expirationSeconds}s)`);
  return signedUrl;
}

/**
 * Get public CDN URL (for public files like thumbnails)
 * @param filePath Path to the file
 * @returns Public CDN URL
 */
export function getPublicUrl(filePath: string): string {
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${BUNNY_CDN_URL}${normalizedPath}`;
}

/**
 * Ensure a directory path exists in Bunny.net Storage
 * This is done by attempting to list the directory
 * If it doesn't exist, we don't need to create it explicitly
 * as Bunny.net creates directories automatically when uploading files
 */
export async function ensureDirectoryExists(directoryPath: string): Promise<void> {
  try {
    await listFilesInBunny(directoryPath);
    console.log(`✅ Directory exists: ${directoryPath}`);
  } catch (error) {
    // Directory doesn't exist, but that's okay
    // It will be created when we upload a file to it
    console.log(`ℹ️ Directory will be created on first upload: ${directoryPath}`);
  }
}

/**
 * Generate file path for video
 * @param courseId Course ID
 * @param filename Original filename
 * @returns Path for Bunny.net storage
 */
export function generateVideoPath(courseId: number, filename: string): string {
  const ext = path.extname(filename);
  const sanitized = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `/videos/${courseId}/${sanitized}`;
}

/**
 * Generate file path for thumbnail
 * @param courseId Course ID
 * @param filename Original filename
 * @returns Path for Bunny.net storage
 */
export function generateThumbnailPath(courseId: number, filename: string): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const nameWithoutExt = path.parse(sanitized).name;
  return `/thumbnails/${courseId}/${nameWithoutExt}.jpg`;
}

/**
 * Generate file path for materials
 * @param courseId Course ID
 * @param filename Original filename
 * @returns Path for Bunny.net storage
 */
export function generateMaterialPath(courseId: number, filename: string): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `/materials/${courseId}/${sanitized}`;
}

export default {
  uploadFileToBunny,
  deleteFileFromBunny,
  listFilesInBunny,
  generateSignedUrl,
  getPublicUrl,
  ensureDirectoryExists,
  generateVideoPath,
  generateThumbnailPath,
  generateMaterialPath,
};
