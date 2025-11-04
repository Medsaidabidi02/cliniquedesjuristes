import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { 
  uploadToWasabi, 
  generateUniqueFilename, 
  getCdnUrl,
  validateWasabiConfig 
} from './wasabiClient';

// Check if Wasabi is configured - use S3 if configured, fallback to local storage
const useWasabi = validateWasabiConfig();

console.log(`📦 File upload storage: ${useWasabi ? 'Wasabi S3' : 'Local Storage'}`);

// Create uploads directories if they don't exist (for backward compatibility and fallback)
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

// Configure multer storage based on Wasabi availability
// For Wasabi: use memory storage to buffer files for upload
// For local: use disk storage
export const storage = useWasabi 
  ? multer.memoryStorage() 
  : multer.diskStorage({
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

// Helper functions - updated to use Wasabi when configured
export const uploadImage = async (file: Express.Multer.File): Promise<string> => {
  if (useWasabi && file.buffer) {
    // Upload to Wasabi S3
    try {
      const result = await uploadToWasabi({
        file,
        folder: 'images',
        filename: generateUniqueFilename(file.originalname),
        isPublic: true,
      });
      return result.url;
    } catch (error) {
      console.error('❌ Error uploading image to Wasabi, falling back to local:', error);
      // Fallback to local storage if S3 fails
      const baseUrl = process.env.BASE_URL || process.env.API_URL || 'http://localhost:5001';
      return `${baseUrl}/uploads/images/${file.filename}`;
    }
  } else {
    // Use local storage path
    const baseUrl = process.env.BASE_URL || process.env.API_URL || 'http://localhost:5001';
    return `${baseUrl}/uploads/images/${file.filename}`;
  }
};

export const uploadVideo = async (file: Express.Multer.File, videoKey?: string): Promise<string> => {
  if (useWasabi && file.buffer) {
    // Upload to Wasabi S3 and return the CDN URL
    try {
      const filename = generateUniqueFilename(file.originalname);
      const result = await uploadToWasabi({
        file,
        folder: 'videos',
        filename,
        contentType: file.mimetype,
        isPublic: true,
      });
      console.log(`✅ Video uploaded to Wasabi: ${result.url}`);
      // Return the S3 key for database storage (we'll construct CDN URL when fetching)
      return `videos/${filename}`;
    } catch (error) {
      console.error('❌ Error uploading video to Wasabi:', error);
      throw error;
    }
  } else {
    // Return the local path for database storage
    return `uploads/videos/${file.filename}`;
  }
};

export const uploadThumbnail = async (file: Express.Multer.File): Promise<string> => {
  if (useWasabi && file.buffer) {
    // Upload to Wasabi S3
    try {
      const filename = generateUniqueFilename(file.originalname);
      const result = await uploadToWasabi({
        file,
        folder: 'thumbnails',
        filename,
        contentType: file.mimetype,
        isPublic: true,
      });
      console.log(`✅ Thumbnail uploaded to Wasabi: ${result.url}`);
      // Return the S3 key for database storage
      return `thumbnails/${filename}`;
    } catch (error) {
      console.error('❌ Error uploading thumbnail to Wasabi:', error);
      throw error;
    }
  } else {
    // Return the local filename for database storage
    return file.filename;
  }
};

export const getSecureVideoUrl = async (videoPath: string): Promise<string> => {
  if (useWasabi) {
    // For Wasabi, videoPath should be like "videos/filename.mp4"
    // Return the CDN URL
    return getCdnUrl(videoPath);
  } else {
    // For local storage, construct the full URL
    const baseUrl = process.env.BASE_URL || process.env.API_URL || 'http://localhost:5001';
    return `${baseUrl}/${videoPath}`;
  }
};

// Export flag to check storage type
export const isUsingWasabi = useWasabi;

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