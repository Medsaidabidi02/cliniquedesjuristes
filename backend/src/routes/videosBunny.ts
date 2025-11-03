import { Router, Request, Response } from 'express';
import { upload } from '../services/fileUpload';
import database from '../config/database';
import bunnyStorage from '../services/bunnyStorage';
import thumbnailGenerator from '../services/thumbnailGenerator';
import fs from 'fs';
import path from 'path';

const router = Router();

console.log('🎬 Bunny.net Video Upload API loaded - 2025-11-03');

// Simple auth bypass for development
const simpleAuth = (req: any, res: any, next: any) => {
  console.log('🔓 Using simple auth bypass for videos - Bunny.net version');
  req.user = { id: 1, name: 'Admin', email: 'admin@cliniquejuriste.com', is_admin: true };
  next();
};

/**
 * Upload video to Bunny.net Storage
 * Handles video file upload, thumbnail generation, and metadata storage
 */
router.post('/upload', simpleAuth, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req: any, res: Response) => {
  let videoFileBuffer: Buffer | null = null;
  let thumbnailFileBuffer: Buffer | null = null;
  let uploadedVideoPath: string | null = null;
  let uploadedThumbnailPath: string | null = null;

  try {
    const { title, description, subject_id, is_active } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    console.log('📤 POST /api/videos/upload - Bunny.net Upload');
    console.log('📝 Data:', { 
      title, 
      subject_id, 
      files: files ? Object.keys(files) : 'no files',
      user: req.user?.name 
    });
    
    // Validate required fields
    if (!title || !subject_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Title and subject_id are required',
        received: { title: !!title, subject_id: !!subject_id }
      });
    }
    
    if (!files?.video?.[0]) {
      return res.status(400).json({ 
        success: false,
        message: 'Video file is required',
        files_received: files ? Object.keys(files) : 'none'
      });
    }
    
    // Check if subject exists and get course_id
    const subjectCheck = await database.query(
      'SELECT s.id, s.title, s.course_id FROM subjects s WHERE s.id = ?', 
      [subject_id]
    );
    
    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Subject not found',
        subject_id: subject_id
      });
    }

    const subject = subjectCheck.rows[0];
    const courseId = subject.course_id;
    
    const videoFile = files.video[0];
    const thumbnailFile = files.thumbnail?.[0];
    
    console.log('📁 Files:', {
      video: {
        originalname: videoFile.originalname,
        filename: videoFile.filename,
        size: (videoFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        mimetype: videoFile.mimetype,
        path: videoFile.path
      },
      thumbnail: thumbnailFile ? {
        originalname: thumbnailFile.originalname,
        filename: thumbnailFile.filename,
        size: (thumbnailFile.size / 1024).toFixed(2) + ' KB',
        mimetype: thumbnailFile.mimetype
      } : 'none'
    });

    // Read video file into buffer
    console.log('📖 Reading video file...');
    videoFileBuffer = fs.readFileSync(videoFile.path);
    
    // Generate video path in Bunny.net
    const videoPath = bunnyStorage.generateVideoPath(courseId, videoFile.originalname);
    console.log(`📍 Video will be uploaded to: ${videoPath}`);
    
    // Upload video to Bunny.net
    console.log('☁️ Uploading video to Bunny.net...');
    const videoCdnUrl = await bunnyStorage.uploadFileToBunny({
      filePath: videoPath,
      fileBuffer: videoFileBuffer,
      contentType: videoFile.mimetype
    });
    uploadedVideoPath = videoPath;
    console.log(`✅ Video uploaded: ${videoCdnUrl}`);

    // Get video duration
    let duration = 0;
    try {
      console.log('⏱️ Extracting video duration...');
      duration = await thumbnailGenerator.getVideoDuration(videoFileBuffer);
      console.log(`✅ Video duration: ${duration} seconds`);
    } catch (durationError) {
      console.error('⚠️ Could not extract video duration:', durationError);
      // Continue without duration
    }

    // Handle thumbnail
    let thumbnailPath: string | null = null;
    if (thumbnailFile) {
      // User provided thumbnail
      console.log('📖 Reading user-provided thumbnail...');
      thumbnailFileBuffer = fs.readFileSync(thumbnailFile.path);
      thumbnailPath = bunnyStorage.generateThumbnailPath(courseId, videoFile.originalname);
      
      console.log('☁️ Uploading thumbnail to Bunny.net...');
      const thumbnailCdnUrl = await bunnyStorage.uploadFileToBunny({
        filePath: thumbnailPath,
        fileBuffer: thumbnailFileBuffer,
        contentType: 'image/jpeg'
      });
      uploadedThumbnailPath = thumbnailPath;
      console.log(`✅ Thumbnail uploaded: ${thumbnailCdnUrl}`);
    } else {
      // Generate thumbnail from video
      try {
        console.log('🎨 Generating thumbnail from video...');
        thumbnailFileBuffer = await thumbnailGenerator.generateThumbnailFromVideo({
          inputBuffer: videoFileBuffer,
          timestamp: 3,
          width: 640,
          height: 360
        });
        
        thumbnailPath = bunnyStorage.generateThumbnailPath(courseId, videoFile.originalname);
        
        console.log('☁️ Uploading generated thumbnail to Bunny.net...');
        const thumbnailCdnUrl = await bunnyStorage.uploadFileToBunny({
          filePath: thumbnailPath,
          fileBuffer: thumbnailFileBuffer,
          contentType: 'image/jpeg'
        });
        uploadedThumbnailPath = thumbnailPath;
        console.log(`✅ Generated thumbnail uploaded: ${thumbnailCdnUrl}`);
      } catch (thumbnailError) {
        console.error('⚠️ Could not generate thumbnail:', thumbnailError);
        // Continue without thumbnail
      }
    }

    // Clean up temporary files created by multer
    try {
      if (videoFile.path && fs.existsSync(videoFile.path)) {
        fs.unlinkSync(videoFile.path);
        console.log('🗑️ Cleaned up temp video file');
      }
      if (thumbnailFile?.path && fs.existsSync(thumbnailFile.path)) {
        fs.unlinkSync(thumbnailFile.path);
        console.log('🗑️ Cleaned up temp thumbnail file');
      }
    } catch (cleanupError) {
      console.error('⚠️ Error cleaning up temp files:', cleanupError);
    }

    // Get next order_index for this subject
    const orderResult = await database.query(
      'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM videos WHERE subject_id = ?',
      [subject_id]
    );
    const orderIndex = orderResult.rows[0].next_order;
    
    console.log('🔄 Inserting video metadata into database...');
    
    // Insert video record
    const insertResult = await database.query(`
      INSERT INTO videos (
        title, description, subject_id, video_path, file_path, thumbnail_path, 
        file_size, duration, order_index, is_active, mime_type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title.trim(),
      description?.trim() || '',
      parseInt(subject_id),
      videoPath,
      videoPath,
      thumbnailPath,
      videoFile.size,
      Math.floor(duration),
      orderIndex,
      is_active !== 'false',
      videoFile.mimetype
    ]);

    // Get the inserted video ID
    let videoId = null;
    if (insertResult.insertId) {
      videoId = insertResult.insertId;
    } else {
      const lastIdResult = await database.query('SELECT LAST_INSERT_ID() as id');
      videoId = lastIdResult.rows[0].id;
    }

    if (!videoId) {
      throw new Error('Could not determine video ID after insert');
    }

    // Fetch the complete video data
    const createdVideoResult = await database.query(`
      SELECT 
        v.*,
        s.title as subject_title,
        s.professor_name,
        c.title as course_title,
        c.id as course_id
      FROM videos v
      LEFT JOIN subjects s ON v.subject_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE v.id = ?
    `, [videoId]);

    const createdVideo = createdVideoResult.rows[0];

    console.log('✅ Video uploaded successfully:', {
      id: createdVideo.id,
      title: createdVideo.title,
      video_path: createdVideo.video_path,
      thumbnail_path: createdVideo.thumbnail_path,
      duration: createdVideo.duration,
      course_id: createdVideo.course_id
    });

    return res.status(201).json({
      success: true,
      message: 'Video uploaded successfully to Bunny.net',
      data: createdVideo,
      bunny: {
        videoPath: videoPath,
        thumbnailPath: thumbnailPath,
        cdnUrl: videoCdnUrl
      }
    });

  } catch (error) {
    console.error('❌ Video upload error:', error);

    // Rollback: Delete uploaded files from Bunny.net if database insert failed
    if (uploadedVideoPath) {
      try {
        console.log('🔄 Rolling back: Deleting video from Bunny.net...');
        await bunnyStorage.deleteFileFromBunny(uploadedVideoPath);
      } catch (deleteError) {
        console.error('⚠️ Failed to delete video during rollback:', deleteError);
      }
    }
    if (uploadedThumbnailPath) {
      try {
        console.log('🔄 Rolling back: Deleting thumbnail from Bunny.net...');
        await bunnyStorage.deleteFileFromBunny(uploadedThumbnailPath);
      } catch (deleteError) {
        console.error('⚠️ Failed to delete thumbnail during rollback:', deleteError);
      }
    }

    // Clean up temporary files
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files?.video?.[0]?.path && fs.existsSync(files.video[0].path)) {
        fs.unlinkSync(files.video[0].path);
      }
      if (files?.thumbnail?.[0]?.path && fs.existsSync(files.thumbnail[0].path)) {
        fs.unlinkSync(files.thumbnail[0].path);
      }
    } catch (cleanupError) {
      console.error('⚠️ Error cleaning up temp files:', cleanupError);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ 
      success: false,
      message: 'Video upload failed',
      error: errorMessage
    });
  }
});

/**
 * Get signed URL for video streaming
 * Requires user authentication and access validation
 */
router.get('/stream/:videoId', async (req: any, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    console.log(`🎬 GET /api/videos/stream/${videoId} - User: ${userId}`);

    // Get video information
    const videoResult = await database.query(`
      SELECT v.*, s.course_id, s.id as subject_id
      FROM videos v
      LEFT JOIN subjects s ON v.subject_id = s.id
      WHERE v.id = ?
    `, [videoId]);

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const video = videoResult.rows[0];

    // Check if video is free or requires enrollment
    if (!video.is_free && !video.is_active) {
      return res.status(403).json({ message: 'This video is not available' });
    }

    // If video is locked/paid, check user access
    if (!video.is_free) {
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Check if user has access to the course
      const courseId = video.course_id;
      if (courseId) {
        const enrollmentResult = await database.query(
          'SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ? AND is_active = true',
          [userId, courseId]
        );

        if (enrollmentResult.rows.length === 0) {
          return res.status(403).json({ message: 'You do not have access to this video' });
        }
      }
    }

    // Generate signed URL
    const signedUrl = bunnyStorage.generateSignedUrl(video.video_path);
    
    // Also generate thumbnail URL if available
    let thumbnailUrl = null;
    if (video.thumbnail_path) {
      thumbnailUrl = bunnyStorage.getPublicUrl(video.thumbnail_path);
    }

    console.log(`✅ Signed URL generated for video ${videoId}`);

    return res.json({
      success: true,
      streamUrl: signedUrl,
      thumbnailUrl: thumbnailUrl,
      video: {
        id: video.id,
        title: video.title,
        duration: video.duration,
        file_size: video.file_size
      }
    });

  } catch (error) {
    console.error('❌ Error generating stream URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error generating stream URL';
    return res.status(500).json({ 
      success: false,
      message: errorMessage
    });
  }
});

/**
 * Delete video from Bunny.net and database
 */
router.delete('/:id', simpleAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/videos/${id} - Bunny.net version`);
    
    // Get video info before deletion
    const videoInfo = await database.query('SELECT * FROM videos WHERE id = ?', [id]);
    
    if (videoInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const video = videoInfo.rows[0];
    
    // Delete from Bunny.net
    try {
      if (video.video_path) {
        console.log(`🗑️ Deleting video from Bunny.net: ${video.video_path}`);
        await bunnyStorage.deleteFileFromBunny(video.video_path);
      }
      
      if (video.thumbnail_path) {
        console.log(`🗑️ Deleting thumbnail from Bunny.net: ${video.thumbnail_path}`);
        await bunnyStorage.deleteFileFromBunny(video.thumbnail_path);
      }
    } catch (bunnyError) {
      console.error('⚠️ Error deleting from Bunny.net:', bunnyError);
      // Continue with database deletion even if Bunny.net deletion fails
    }
    
    // Delete from database
    await database.query('DELETE FROM videos WHERE id = ?', [id]);
    
    console.log(`✅ Video ${id} deleted successfully`);
    res.json({ 
      success: true,
      message: 'Video deleted successfully', 
      video: { id, title: video.title }
    });
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete video' 
    });
  }
});

export default router;
