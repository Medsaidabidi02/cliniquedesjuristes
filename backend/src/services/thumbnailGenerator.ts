import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

interface ThumbnailOptions {
  inputBuffer: Buffer;
  outputPath?: string;
  timestamp?: string | number; // seconds or timestamp string like '00:00:05'
  width?: number;
  height?: number;
}

/**
 * Generate a thumbnail from video buffer
 * @param options Thumbnail generation options
 * @returns Buffer containing the thumbnail image
 */
export async function generateThumbnailFromVideo(options: ThumbnailOptions): Promise<Buffer> {
  const {
    inputBuffer,
    timestamp = '00:00:03', // Default to 3 seconds
    width = 640,
    height = 360,
  } = options;

  return new Promise((resolve, reject) => {
    // Create temporary files for processing
    const tempDir = '/tmp';
    const tempInputPath = path.join(tempDir, `video-${Date.now()}.mp4`);
    const tempOutputPath = path.join(tempDir, `thumb-${Date.now()}.jpg`);

    try {
      // Write input buffer to temporary file
      fs.writeFileSync(tempInputPath, inputBuffer);
      console.log(`📝 Wrote video to temp file: ${tempInputPath}`);

      // Extract thumbnail using ffmpeg
      ffmpeg(tempInputPath)
        .screenshots({
          timestamps: [String(timestamp)],
          filename: path.basename(tempOutputPath),
          folder: tempDir,
          size: `${width}x${height}`,
        })
        .on('end', async () => {
          console.log('✅ Thumbnail generated with ffmpeg');
          
          try {
            // Read the generated thumbnail
            let thumbnailBuffer: Buffer = fs.readFileSync(tempOutputPath);

            // Optimize with sharp
            thumbnailBuffer = await sharp(thumbnailBuffer)
              .resize(width, height, { fit: 'cover' })
              .jpeg({ quality: 85 })
              .toBuffer();

            console.log('✅ Thumbnail optimized with sharp');

            // Clean up temp files
            fs.unlinkSync(tempInputPath);
            fs.unlinkSync(tempOutputPath);

            resolve(thumbnailBuffer);
          } catch (error) {
            console.error('❌ Error processing thumbnail:', error);
            // Clean up temp files
            try {
              if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
              if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
            } catch (cleanupError) {
              console.error('Error cleaning up temp files:', cleanupError);
            }
            reject(error);
          }
        })
        .on('error', (error: Error) => {
          console.error('❌ FFmpeg error:', error);
          // Clean up temp files
          try {
            if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
            if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
          } catch (cleanupError) {
            console.error('Error cleaning up temp files:', cleanupError);
          }
          reject(error);
        });
    } catch (error) {
      console.error('❌ Error in thumbnail generation:', error);
      // Clean up temp files
      try {
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }
      reject(error);
    }
  });
}

/**
 * Generate a simple fallback thumbnail from an image buffer
 * @param imageBuffer Input image buffer
 * @param width Thumbnail width
 * @param height Thumbnail height
 * @returns Optimized thumbnail buffer
 */
export async function generateFallbackThumbnail(
  imageBuffer: Buffer,
  width: number = 640,
  height: number = 360
): Promise<Buffer> {
  try {
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(width, height, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();

    console.log('✅ Fallback thumbnail generated');
    return thumbnailBuffer;
  } catch (error) {
    console.error('❌ Error generating fallback thumbnail:', error);
    throw error;
  }
}

/**
 * Get video duration from buffer
 * @param videoBuffer Video file buffer
 * @returns Duration in seconds
 */
export async function getVideoDuration(videoBuffer: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const tempPath = path.join('/tmp', `video-${Date.now()}.mp4`);
    
    try {
      fs.writeFileSync(tempPath, videoBuffer);
      
      ffmpeg.ffprobe(tempPath, (err, metadata) => {
        // Clean up temp file
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }

        if (err) {
          console.error('❌ Error getting video duration:', err);
          reject(err);
          return;
        }

        const duration = metadata.format.duration || 0;
        console.log(`✅ Video duration: ${duration} seconds`);
        resolve(duration);
      });
    } catch (error) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
      reject(error);
    }
  });
}

export default {
  generateThumbnailFromVideo,
  generateFallbackThumbnail,
  getVideoDuration,
};
