import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bunnyStorage from './bunnyStorage';

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const imagesDir = path.join(uploadsDir, 'images');
const videosDir = path.join(uploadsDir, 'videos');
const blogDir = path.join(uploadsDir, 'blog');        // Add this
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');  // Add this

// Ensure directories exist
[uploadsDir, imagesDir, videosDir, blogDir, thumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Configure multer for local storage
export const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, videosDir);
    } else if (file.fieldname === 'thumbnail') {
      cb(null, thumbnailsDir);  // Use thumbnails directory
    } else if (file.fieldname === 'cover_image') {
      cb(null, blogDir);        // Use blog directory for blog images
    } else if (file.fieldname === 'image') {
      cb(null, imagesDir);      // Keep general images in images directory
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for security
// File filter for security
export const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Allowed image types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  // Allowed video types
  const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];

  if (file.fieldname === 'video') {
    if (allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Only MP4, AVI, MOV, WMV, WEBM allowed.'));
    }
  } else if (file.fieldname === 'thumbnail' || file.fieldname === 'cover_image' || file.fieldname === 'image') {
    // ✅ FIXED: Added 'thumbnail' to allowed field names
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Only JPG, PNG, WEBP allowed.'));
    }
  } else {
    // ✅ IMPROVED: Show what field names are allowed in error
    cb(new Error(`Unknown file field '${file.fieldname}'. Allowed fields: video, thumbnail, cover_image, image`));
  }
};
// Upload configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB for videos (changed from 500MB)
  }
});
// Helper functions
export const uploadImage = async (file: Express.Multer.File): Promise<string> => {
  // Sanitize filename to prevent path traversal
  const sanitizedFilename = path.basename(file.filename);
  const remotePath = `/images/${sanitizedFilename}`;
  const localPath = path.join(__dirname, '../../uploads/images', sanitizedFilename);
  
  try {
    const cdnUrl = await bunnyStorage.uploadFile(localPath, remotePath);
    
    // Optionally delete local file after successful upload
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    
    return cdnUrl;
  } catch (error) {
    console.error('❌ Failed to upload image to Bunny.net:', error);
    // Fallback to local URL if Bunny.net upload fails
    const baseUrl = process.env.BASE_URL || process.env.API_URL || 'http://localhost:5001';
    return `${baseUrl}/uploads/images/${sanitizedFilename}`;
  }
};

export const uploadVideo = async (file: Express.Multer.File, videoKey: string, courseId?: number): Promise<string> => {
  // Sanitize filename to prevent path traversal
  const sanitizedFilename = path.basename(file.filename);
  const courseFolder = courseId ? `course-${courseId}` : 'general';
  const remotePath = `/videos/${courseFolder}/${sanitizedFilename}`;
  const localPath = path.join(__dirname, '../../uploads/videos', sanitizedFilename);
  
  try {
    const cdnUrl = await bunnyStorage.uploadFile(localPath, remotePath);
    
    // Optionally delete local file after successful upload
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    
    // Return the remote path for database storage (not the full CDN URL)
    return remotePath;
  } catch (error) {
    console.error('❌ Failed to upload video to Bunny.net:', error);
    // Fallback to local path if Bunny.net upload fails
    return `uploads/videos/${sanitizedFilename}`;
  }
};

export const uploadThumbnail = async (file: Express.Multer.File, courseId?: number): Promise<string> => {
  // Sanitize filename to prevent path traversal
  const sanitizedFilename = path.basename(file.filename);
  const courseFolder = courseId ? `course-${courseId}` : 'general';
  const remotePath = `/thumbnails/${courseFolder}/${sanitizedFilename}`;
  const localPath = path.join(__dirname, '../../uploads/thumbnails', sanitizedFilename);
  
  try {
    const cdnUrl = await bunnyStorage.uploadFile(localPath, remotePath);
    
    // Optionally delete local file after successful upload
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    
    // Return the remote path for database storage
    return remotePath;
  } catch (error) {
    console.error('❌ Failed to upload thumbnail to Bunny.net:', error);
    // Fallback to local path if Bunny.net upload fails
    return `uploads/thumbnails/${sanitizedFilename}`;
  }
};

export const getSecureVideoUrl = async (videoPath: string): Promise<string> => {
  // If videoPath is already a full URL, return it
  if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    return videoPath;
  }
  
  // If it's a Bunny.net path, generate CDN URL
  if (videoPath.startsWith('/videos/') || videoPath.startsWith('/thumbnails/')) {
    return bunnyStorage.getCdnUrl(videoPath);
  }
  
  // Legacy: If it's a local path, return local URL
  const baseUrl = process.env.BASE_URL || process.env.API_URL || 'http://localhost:5001';
  return `${baseUrl}/${videoPath}`;
};

// Clean up old files (optional utility)
export const cleanupOldFiles = (maxAgeHours: number = 24) => {
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;

  [imagesDir, videosDir].forEach(dir => {
    fs.readdir(dir, (err, files) => {
      if (err) return;

      files.forEach(file => {
        const filePath = path.join(dir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;

          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlink(filePath, (err) => {
              if (!err) console.log(`🗑️ Cleaned up old file: ${file}`);
            });
          }
        });
      });
    });
  });
};