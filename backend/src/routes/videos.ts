import { Router } from 'express';
import { upload } from '../services/fileUpload';
import { uploadToWasabi, deleteFromWasabi, generateWasabiPath, getWasabiUrl } from '../services/wasabiStorage';
import path from 'path';
import fs from 'fs';
import database from '../config/database';
import crypto from 'crypto';

const router = Router();

console.log('🎬 FIXED Videos API loaded for Medsaidabidi02 - 2025-09-09 17:15:30');
console.log('🗄️ Wasabi Cloud Storage integration enabled');

// Simple auth bypass for development
const simpleAuth = (req: any, res: any, next: any) => {
  console.log('🔓 Using simple auth bypass for videos - Medsaidabidi02');
  req.user = { id: 1, name: 'Medsaidabidi02', email: 'admin@cliniquejuriste.com', is_admin: true };
  next();
};

// GET all videos with subject/course info
router.get('/', async (req, res) => {
  try {
    console.log('📋 GET /api/videos - Real data for Medsaidabidi02 at 2025-09-09 17:15:30');
    
    const result = await database.query(`
      SELECT 
        v.*,
        v.video_path,
        v.file_path,
        s.title as subject_title,
        s.professor_name,
        c.title as course_title,
        c.id as course_id
      FROM videos v
      LEFT JOIN subjects s ON v.subject_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE v.is_active = true
      ORDER BY v.created_at DESC
    `);
    
    // Transform data to ensure video_path is available
    const videos = result.rows.map(video => ({
      ...video,
      video_path: video.video_path || video.file_path // Fallback to file_path if video_path is null
    }));
    
    console.log(`✅ Found ${videos.length} videos for Medsaidabidi02`);
    res.json(videos);
    
  } catch (error) {
    console.error('❌ Database error for Medsaidabidi02:', error);
    res.status(500).json({ message: 'Database error fetching videos' });
  }
});

// ✅ ADDED: GET /api/videos/admin/stats endpoint
router.get('/admin/stats', async (req, res) => {
  try {
    console.log('📊 GET /api/videos/admin/stats - Stats for Medsaidabidi02 at 2025-09-09 17:15:30');
    
    const [videosCount, subjectsWithVideos, totalSize] = await Promise.all([
      // Total and active videos
      database.query(`
        SELECT 
          COUNT(*) as total_videos,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_videos
        FROM videos
      `),
      // Subjects with videos
      database.query(`
        SELECT COUNT(DISTINCT subject_id) as subjects_with_videos 
        FROM videos 
        WHERE subject_id IS NOT NULL AND is_active = true
      `),
      // Total file size
      database.query(`
        SELECT COALESCE(SUM(file_size), 0) as total_size 
        FROM videos 
        WHERE is_active = true
      `)
    ]);
    
    const stats = {
      total_videos: parseInt(videosCount.rows[0].total_videos),
      active_videos: parseInt(videosCount.rows[0].active_videos),
      subjects_with_videos: parseInt(subjectsWithVideos.rows[0].subjects_with_videos),
      total_size: parseInt(totalSize.rows[0].total_size)
    };
    
    console.log('✅ Video stats calculated for Medsaidabidi02:', stats);
    res.json(stats);
    
  } catch (error) {
    console.error('❌ Error calculating video stats for Medsaidabidi02:', error);
    res.status(500).json({ message: 'Error calculating video statistics' });
  }
});

// GET single video
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 GET /api/videos/${id} - Real data for Medsaidabidi02 at 2025-09-09 17:15:30`);
    
    const result = await database.query(`
      SELECT 
        v.*,
        v.video_path,
        v.file_path,
        s.title as subject_title,
        s.professor_name,
        c.title as course_title,
        c.id as course_id
      FROM videos v
      LEFT JOIN subjects s ON v.subject_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE v.id = ?
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const video = {
      ...result.rows[0],
      video_path: result.rows[0].video_path || result.rows[0].file_path
    };
    
    console.log(`✅ Found video ${id} for Medsaidabidi02`);
    res.json(video);
    
  } catch (error) {
    console.error(`❌ Database error fetching video ${req.params.id} for Medsaidabidi02:`, error);
    res.status(500).json({ message: 'Database error fetching video' });
  }
});

// ✅ POST upload new video with Wasabi Cloud Storage
router.post('/', simpleAuth, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, description, subject_id, is_active } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    console.log('📤 POST /api/videos - Upload to Wasabi for Medsaidabidi02');
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
      'SELECT s.id, s.title, s.course_id, c.title as course_title FROM subjects s LEFT JOIN courses c ON s.course_id = c.id WHERE s.id = ?', 
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
    const course_id = subject.course_id;
    
    const videoFile = files.video[0];
    const thumbnailFile = files.thumbnail?.[0];
    
    console.log('📁 Files for Medsaidabidi02:', {
      video: {
        originalname: videoFile.originalname,
        size: (videoFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        mimetype: videoFile.mimetype
      },
      thumbnail: thumbnailFile ? {
        originalname: thumbnailFile.originalname,
        size: (thumbnailFile.size / 1024).toFixed(2) + ' KB',
        mimetype: thumbnailFile.mimetype
      } : 'none'
    });
    
    // Generate unique filenames
    const videoExtension = path.extname(videoFile.originalname);
    const videoFileName = `${crypto.randomUUID()}-${Date.now()}${videoExtension}`;
    const thumbnailFileName = thumbnailFile 
      ? `${crypto.randomUUID()}-${Date.now()}${path.extname(thumbnailFile.originalname)}`
      : null;
    
    // Upload video to Wasabi
    console.log('☁️ Uploading video to Wasabi...');
    const videoWasabiPath = generateWasabiPath('videos', course_id, videoFileName);
    const videoUrl = await uploadToWasabi(videoFile, videoWasabiPath, videoFile.mimetype);
    console.log(`✅ Video uploaded to Wasabi: ${videoUrl}`);
    
    // Upload thumbnail to Wasabi if provided
    let thumbnailUrl = null;
    if (thumbnailFile && thumbnailFileName) {
      console.log('☁️ Uploading thumbnail to Wasabi...');
      const thumbnailWasabiPath = generateWasabiPath('thumbnails', course_id, thumbnailFileName);
      thumbnailUrl = await uploadToWasabi(thumbnailFile, thumbnailWasabiPath, thumbnailFile.mimetype);
      console.log(`✅ Thumbnail uploaded to Wasabi: ${thumbnailUrl}`);
    }
    
    // Get next order_index for this subject
    const orderResult = await database.query(
      'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM videos WHERE subject_id = ?',
      [subject_id]
    );
    const orderIndex = orderResult.rows[0].next_order;
    
    console.log('🔄 Inserting video into database...');
    
    // Insert video record into database with Wasabi URLs
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
      videoUrl,           // Store full Wasabi URL in video_path
      videoWasabiPath,    // Store Wasabi key in file_path for reference
      thumbnailUrl,       // Store full Wasabi URL for thumbnail
      videoFile.size,
      0,                  // Duration will need to be calculated separately
      orderIndex,
      is_active !== 'false',
      videoFile.mimetype
    ]);
    
    // Get the video ID
    let videoId = insertResult.insertId;
    
    if (!videoId) {
      // Fallback: try LAST_INSERT_ID()
      const lastIdResult = await database.query('SELECT LAST_INSERT_ID() as id');
      videoId = lastIdResult.rows[0]?.id;
    }
    
    if (!videoId) {
      // Last resort: search by video URL
      const searchResult = await database.query(
        'SELECT id FROM videos WHERE video_path = ? ORDER BY created_at DESC LIMIT 1',
        [videoUrl]
      );
      videoId = searchResult.rows[0]?.id;
    }
    
    if (!videoId) {
      throw new Error('Could not determine video ID after insert');
    }
    
    // Fetch the complete video data
    console.log(`🔄 Fetching complete video data for ID: ${videoId}`);
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
    
    if (!createdVideoResult.rows || createdVideoResult.rows.length === 0) {
      throw new Error(`Video with ID ${videoId} was inserted but cannot be retrieved`);
    }
    
    const createdVideo = createdVideoResult.rows[0];
    
    console.log('✅ Video uploaded to Wasabi successfully:', {
      id: createdVideo.id,
      title: createdVideo.title,
      video_path: createdVideo.video_path,
      thumbnail_path: createdVideo.thumbnail_path,
      subject_id: createdVideo.subject_id,
      subject_title: createdVideo.subject_title
    });
    
    return res.status(201).json({
      success: true,
      message: 'Video uploaded to Wasabi successfully',
      data: createdVideo,
      // Include properties directly for backward compatibility
      id: createdVideo.id,
      title: createdVideo.title,
      description: createdVideo.description,
      video_path: createdVideo.video_path,
      file_path: createdVideo.file_path,
      thumbnail_path: createdVideo.thumbnail_path,
      subject_id: createdVideo.subject_id,
      file_size: createdVideo.file_size,
      is_active: createdVideo.is_active,
      created_at: createdVideo.created_at,
      updated_at: createdVideo.updated_at,
      subject_title: createdVideo.subject_title,
      course_title: createdVideo.course_title,
      professor_name: createdVideo.professor_name,
      course_id: createdVideo.course_id
    });
    
  } catch (error) {
    console.error('❌ Video upload error for Medsaidabidi02:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('❌ Error stack for Medsaidabidi02:', errorStack);
    
    return res.status(500).json({ 
      success: false,
      message: 'Video upload failed',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
});

// DELETE video - with Wasabi deletion support
router.delete('/:id', simpleAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/videos/${id} for Medsaidabidi02`);
    
    // Get video info before deletion
    const videoInfo = await database.query('SELECT * FROM videos WHERE id = ?', [id]);
    
    if (videoInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const video = videoInfo.rows[0];
    
    // Delete video record from database
    await database.query('DELETE FROM videos WHERE id = ?', [id]);
    console.log(`✅ Video ${id} deleted from database`);
    
    // Delete from Wasabi if URLs are Wasabi URLs
    try {
      const videoPath = video.video_path || video.file_path;
      if (videoPath) {
        if (videoPath.startsWith('http')) {
          // It's a Wasabi URL
          console.log('☁️ Deleting video from Wasabi...');
          await deleteFromWasabi(videoPath);
        } else {
          // Legacy local file - try to delete locally
          const fullVideoPath = path.join('uploads/videos', videoPath);
          if (fs.existsSync(fullVideoPath)) {
            fs.unlinkSync(fullVideoPath);
            console.log(`🗑️ Deleted local video file: ${fullVideoPath}`);
          }
        }
      }
      
      if (video.thumbnail_path) {
        if (video.thumbnail_path.startsWith('http')) {
          // It's a Wasabi URL
          console.log('☁️ Deleting thumbnail from Wasabi...');
          await deleteFromWasabi(video.thumbnail_path);
        } else {
          // Legacy local file - try to delete locally
          const thumbPath = path.join('uploads/thumbnails', video.thumbnail_path);
          if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath);
            console.log(`🗑️ Deleted local thumbnail file: ${thumbPath}`);
          }
        }
      }
    } catch (fileError) {
      console.log('⚠️ Could not delete physical files:', fileError instanceof Error ? fileError.message : 'Unknown error');
    }
    
    console.log(`✅ Video ${id} deleted successfully for Medsaidabidi02`);
    res.json({ 
      message: 'Video deleted successfully', 
      video: { id, title: video.title }
    });
    
  } catch (error) {
    console.error(`❌ Delete error for Medsaidabidi02:`, error);
    res.status(500).json({ message: 'Failed to delete video' });
  }
});

// ✅ Serve video files - redirect to Wasabi or serve legacy local files
router.get('/stream/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    console.log(`🎬 Streaming video for Medsaidabidi02: ${filename}`);
    
    // If filename is a full Wasabi URL, redirect to it
    if (filename.startsWith('http')) {
      console.log(`↪️ Redirecting to Wasabi URL: ${filename}`);
      return res.redirect(filename);
    }
    
    // Try to serve legacy local file
    const videoPath = path.join('uploads/videos', filename);
    
    if (!fs.existsSync(videoPath)) {
      console.log(`❌ Video file not found: ${videoPath}`);
      return res.status(404).json({ 
        message: 'Video file not found. Videos are now served from Wasabi Cloud Storage.' 
      });
    }
    
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Support partial content for video streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
    
  } catch (error) {
    console.error(`❌ Video streaming error for Medsaidabidi02:`, error);
    res.status(500).json({ message: 'Error streaming video' });
  }
});

// ✅ Serve thumbnail files - redirect to Wasabi or serve legacy local files
router.get('/thumbnail/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    console.log(`🖼️ Serving thumbnail for Medsaidabidi02: ${filename}`);
    
    // If filename is a full Wasabi URL, redirect to it
    if (filename.startsWith('http')) {
      console.log(`↪️ Redirecting to Wasabi URL: ${filename}`);
      return res.redirect(filename);
    }
    
    // Try to serve legacy local file
    const thumbnailPath = path.join('uploads/thumbnails', filename);
    
    if (!fs.existsSync(thumbnailPath)) {
      console.log(`❌ Thumbnail file not found: ${thumbnailPath}`);
      return res.status(404).json({ 
        message: 'Thumbnail file not found. Thumbnails are now served from Wasabi Cloud Storage.' 
      });
    }
    
    res.sendFile(path.resolve(thumbnailPath));
    
  } catch (error) {
    console.error(`❌ Thumbnail serving error for Medsaidabidi02:`, error);
    res.status(500).json({ message: 'Error serving thumbnail' });
  }
});

export default router;
export { router as videoRoutes };

console.log('🎬 Video routes module loaded for Medsaidabidi02 at 2025-09-09 17:15:30');
