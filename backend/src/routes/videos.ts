import { Router } from 'express';
import { upload } from '../services/fileUpload';
import { generateSignedUrl, generateVideoSignedUrl } from '../services/signedUrl';
import { getVideoStorageProvider } from '../services/storageFactory';
import { videoConfig } from '../config/video';

import path from 'path';
import fs from 'fs';
import database from '../config/database';

const router = Router();

console.log('🎬 FIXED Videos API loaded for Medsaidabidi02 - 2025-09-09 17:15:30');

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

// GET video playback info with signed URL (for HLS or cloud storage)
router.get('/:id/playback-info', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🎬 GET /api/videos/${id}/playback-info - Generating signed URL`);
    
    const result = await database.query(`
      SELECT 
        v.*,
        v.video_path,
        v.file_path,
        v.storage_type,
        v.hls_manifest_path,
        v.is_segmented,
        s.title as subject_title,
        c.id as course_id
      FROM videos v
      LEFT JOIN subjects s ON v.subject_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE v.id = ?
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const video = result.rows[0];
    const config = videoConfig();
    
    // Determine video path (HLS manifest or regular video)
    const videoPath = video.is_segmented && video.hls_manifest_path 
      ? video.hls_manifest_path 
      : (video.video_path || video.file_path);
    
    // Check storage type
    const storageType = video.storage_type || 'local';
    const isHLS = video.is_segmented || videoPath.endsWith('.m3u8') || videoPath.includes('/hls/');
    
    let url = '';
    let expiresAt = null;
    let expiresIn = config.urlExpiration;
    
    if (storageType === 'hetzner' && process.env.ENABLE_HETZNER === 'true') {
      // Generate signed URL for Hetzner storage
      try {
        const signedUrlResult = await generateSignedUrl(
          videoPath,
          'hetzner',
          config.urlExpiration
        );
        url = signedUrlResult.url;
        expiresAt = signedUrlResult.expiresAt;
        console.log(`✅ Generated signed URL for video ${id} (Hetzner)`);
      } catch (error) {
        console.error(`❌ Failed to generate signed URL:`, error);
        return res.status(500).json({ message: 'Failed to generate video URL' });
      }
    } else {
      // Local storage - use streaming endpoint
      url = `/api/videos/stream/${videoPath}`;
      console.log(`✅ Generated local stream URL for video ${id}`);
    }
    
    res.json({
      url,
      expiresAt,
      expiresIn,
      storageType,
      isHLS,
      videoPath,
      contentType: isHLS ? 'application/vnd.apple.mpegurl' : 'video/mp4'
    });
    
  } catch (error) {
    console.error(`❌ Error getting playback info:`, error);
    res.status(500).json({ message: 'Error getting video playback info' });
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

// ✅ ULTRA-FIXED: POST upload new video with bulletproof MySQL5 response handling
// Supports both file upload and HLS path entry
router.post('/', simpleAuth, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      title, 
      description, 
      subject_id, 
      is_active,
      video_path,       // For HLS mode - direct path entry
      storage_type,     // 'local' or 'hetzner'
      is_segmented,     // true for HLS videos
      hls_manifest_path // Path to .m3u8 file
    } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    console.log('📤 POST /api/videos - Upload for Medsaidabidi02 at 2025-09-09 17:15:30');
    console.log('📝 Data:', { 
      title, 
      subject_id,
      video_path,
      storage_type,
      is_segmented,
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
    
    // Check if this is HLS path entry mode (no file upload)
    const isHLSMode = video_path && !files?.video?.[0];
    
    if (!isHLSMode && !files?.video?.[0]) {
      return res.status(400).json({ 
        success: false,
        message: 'Video file or video_path is required',
        files_received: files ? Object.keys(files) : 'none'
      });
    }
    
    // Validate HLS path format if provided
    if (isHLSMode && !video_path.endsWith('.m3u8')) {
      return res.status(400).json({
        success: false,
        message: 'HLS manifest path must end with .m3u8',
        received_path: video_path
      });
    }
    
    // Check if subject exists
    const subjectCheck = await database.query(
      'SELECT id, title FROM subjects WHERE id = ?', 
      [subject_id]
    );
    
    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Subject not found',
        subject_id: subject_id
      });
    }
    
    let videoFile = null;
    let thumbnailFile = null;
    let finalVideoPath = '';
    let finalStorageType = storage_type || 'local';
    let finalIsSegmented = is_segmented === 'true' || is_segmented === true;
    let finalHLSManifestPath = hls_manifest_path || null;
    let finalFileSize = 0;
    
    if (isHLSMode) {
      // HLS mode - use provided path
      console.log('🎞️ HLS mode detected - using provided manifest path');
      finalVideoPath = video_path;
      finalIsSegmented = true;
      finalHLSManifestPath = video_path;
      thumbnailFile = files?.thumbnail?.[0];
    } else {
      // Traditional file upload mode
      videoFile = files.video[0];
      thumbnailFile = files?.thumbnail?.[0];
      finalVideoPath = videoFile.filename;
      finalFileSize = videoFile.size;
      
      console.log('📁 Files for Medsaidabidi02:', {
        video: {
          filename: videoFile.filename,
          size: (videoFile.size / (1024 * 1024)).toFixed(2) + ' MB',
          mimetype: videoFile.mimetype
        },
        thumbnail: thumbnailFile ? {
          filename: thumbnailFile.filename,
          size: (thumbnailFile.size / 1024).toFixed(2) + ' KB',
          mimetype: thumbnailFile.mimetype
        } : 'none'
      });
    }
    
    // Get next order_index for this subject
    const orderResult = await database.query(
      'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM videos WHERE subject_id = ?',
      [subject_id]
    );
    const orderIndex = orderResult.rows[0].next_order;
    
    console.log('🔄 Inserting video into database...');
    
    // ✅ ULTRA-FIXED: Use multiple approaches to ensure we get the video ID
    let videoId = null;
    let createdVideo = null;
    
    try {
      // Approach 1: Try direct INSERT and get insertId
      const insertResult = await database.query(`
        INSERT INTO videos (
          title, description, subject_id, video_path, file_path, thumbnail_path, 
          file_size, duration, order_index, is_active, mime_type,
          storage_type, is_segmented, hls_manifest_path, segment_duration
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title.trim(),
        description?.trim() || '',
        parseInt(subject_id),
        finalVideoPath,                              // video_path
        finalVideoPath,                              // file_path (same for compatibility)
        thumbnailFile?.filename || null,
        finalFileSize,
        0,                                           // Duration
        orderIndex,
        is_active !== 'false',
        videoFile?.mimetype || 'application/vnd.apple.mpegurl',
        finalStorageType,                            // storage_type
        finalIsSegmented,                            // is_segmented
        finalHLSManifestPath,                        // hls_manifest_path
        10                                           // segment_duration (default 10s)
      ]);
      
      console.log('✅ Insert result structure for Medsaidabidi02:', {
        type: typeof insertResult,
        keys: Object.keys(insertResult || {}),
        insertResult: insertResult
      });
      
      // Try multiple ways to extract the video ID
      if (insertResult && typeof insertResult === 'object') {
        // Method 1: Direct insertId property
        if (insertResult.insertId) {
          videoId = insertResult.insertId;
          console.log('✅ Got video ID from insertResult.insertId:', videoId);
        }
        // Method 2: insertId in rows array
        else if (insertResult.rows && insertResult.rows.length > 0 && insertResult.rows[0].insertId) {
          videoId = insertResult.rows[0].insertId;
          console.log('✅ Got video ID from insertResult.rows[0].insertId:', videoId);
        }
        // Method 3: Check if insertResult is the ID itself
        else if (typeof insertResult === 'number') {
          videoId = insertResult;
          console.log('✅ Got video ID from direct result:', videoId);
        }
        // Method 4: Check affectedRows and get LAST_INSERT_ID
        else if (insertResult.affectedRows && insertResult.affectedRows > 0) {
          console.log('🔄 Affected rows > 0, trying LAST_INSERT_ID()...');
          const lastIdResult = await database.query('SELECT LAST_INSERT_ID() as id');
          console.log('✅ LAST_INSERT_ID result:', lastIdResult);
          if (lastIdResult.rows && lastIdResult.rows[0] && lastIdResult.rows[0].id) {
            videoId = lastIdResult.rows[0].id;
            console.log('✅ Got video ID from LAST_INSERT_ID():', videoId);
          }
        }
      }
      
      // Approach 2: If still no ID, try to find the most recent video with our exact data
      if (!videoId) {
        console.log('🔄 No video ID found, searching by video filename...');
        const searchResult = await database.query(`
          SELECT id FROM videos 
          WHERE video_path = ? AND title = ? AND subject_id = ? 
          ORDER BY created_at DESC 
          LIMIT 1
        `, [finalVideoPath, title.trim(), parseInt(subject_id)]);
        
        if (searchResult.rows && searchResult.rows.length > 0) {
          videoId = searchResult.rows[0].id;
          console.log('✅ Found video ID by searching:', videoId);
        }
      }
      
      // Approach 3: Last resort - get the most recent video
      if (!videoId) {
        console.log('🔄 Still no video ID, getting most recent video...');
        const recentResult = await database.query('SELECT id FROM videos ORDER BY created_at DESC LIMIT 1');
        if (recentResult.rows && recentResult.rows.length > 0) {
          videoId = recentResult.rows[0].id;
          console.log('⚠️ Using most recent video ID as fallback:', videoId);
        }
      }
      
      if (!videoId) {
        throw new Error('Could not determine video ID after insert - all methods failed');
      }
      
      // Now get the complete video data
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
      
      createdVideo = createdVideoResult.rows[0];
      
      console.log('✅ Video uploaded successfully for Medsaidabidi02:', {
        id: createdVideo.id,
        title: createdVideo.title,
        video_path: createdVideo.video_path,
        file_path: createdVideo.file_path,
        subject_id: createdVideo.subject_id,
        subject_title: createdVideo.subject_title
      });
      
      // ✅ FIXED: Return comprehensive response structure
      return res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: createdVideo,
        // Also include video properties directly for backward compatibility
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
        // Include joined data
        subject_title: createdVideo.subject_title,
        course_title: createdVideo.course_title,
        professor_name: createdVideo.professor_name,
        course_id: createdVideo.course_id
      });
      
    } catch (dbError) {
      console.error('❌ Database operation failed for Medsaidabidi02:', dbError);
      throw new Error(`Database operation failed: ${dbError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Video upload error for Medsaidabidi02:', error);
    
    // ✅ FIXED: Provide detailed error information
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

// DELETE video
router.delete('/:id', simpleAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/videos/${id} for Medsaidabidi02 at 2025-09-09 17:15:30`);
    
    // Get video info before deletion
    const videoInfo = await database.query('SELECT * FROM videos WHERE id = ?', [id]);
    
    if (videoInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const video = videoInfo.rows[0];
    
    // Delete video record from database
    await database.query('DELETE FROM videos WHERE id = ?', [id]);
    
    // Try to delete physical files (don't fail if files don't exist)
    try {
      const videoPath = video.video_path || video.file_path;
      if (videoPath) {
        const fullVideoPath = path.join('uploads/videos', videoPath);
        if (fs.existsSync(fullVideoPath)) {
          fs.unlinkSync(fullVideoPath);
          console.log(`🗑️ Deleted video file: ${fullVideoPath}`);
        }
      }
      
      if (video.thumbnail_path) {
        const thumbPath = path.join('uploads/thumbnails', video.thumbnail_path);
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
          console.log(`🗑️ Deleted thumbnail file: ${thumbPath}`);
        }
      }
    } catch (fileError) {
      console.log('⚠️ Could not delete physical files (they may not exist):', fileError.message);
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

// POST token refresh - Regenerate signed URL for video
router.post('/token/refresh', async (req, res) => {
  try {
    const { videoId } = req.body;
    console.log(`🔄 POST /api/videos/token/refresh - Refreshing URL for video ${videoId}`);
    
    if (!videoId) {
      return res.status(400).json({ message: 'videoId is required' });
    }
    
    const result = await database.query(`
      SELECT 
        v.id,
        v.video_path,
        v.file_path,
        v.storage_type,
        v.hls_manifest_path,
        v.is_segmented
      FROM videos v
      WHERE v.id = ? AND v.is_active = true
    `, [videoId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const video = result.rows[0];
    const config = videoConfig();
    
    // Determine video path
    const videoPath = video.is_segmented && video.hls_manifest_path 
      ? video.hls_manifest_path 
      : (video.video_path || video.file_path);
    
    const storageType = video.storage_type || 'local';
    
    if (storageType === 'hetzner' && process.env.ENABLE_HETZNER === 'true') {
      // Generate new signed URL
      try {
        const signedUrlResult = await generateSignedUrl(
          videoPath,
          'hetzner',
          config.urlExpiration
        );
        
        console.log(`✅ Refreshed signed URL for video ${videoId}`);
        
        res.json({
          url: signedUrlResult.url,
          expiresAt: signedUrlResult.expiresAt,
          expiresIn: config.urlExpiration,
          storageType: 'hetzner'
        });
      } catch (error) {
        console.error(`❌ Failed to refresh signed URL:`, error);
        return res.status(500).json({ message: 'Failed to refresh video URL' });
      }
    } else {
      // Local storage - return streaming URL (doesn't expire)
      const url = `/api/videos/stream/${videoPath}`;
      console.log(`✅ Refreshed local stream URL for video ${videoId}`);
      
      res.json({
        url,
        expiresAt: null,
        expiresIn: null,
        storageType: 'local'
      });
    }
    
  } catch (error) {
    console.error(`❌ Error refreshing token:`, error);
    res.status(500).json({ message: 'Error refreshing video token' });
  }
});

// ✅ FIXED: Serve video files with streaming support
router.get('/stream/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const videoPath = path.join('uploads/videos', filename);
    
    console.log(`🎬 Streaming video for Medsaidabidi02: ${filename} at 2025-09-09 17:15:30`);
    
    if (!fs.existsSync(videoPath)) {
      console.log(`❌ Video file not found: ${videoPath}`);
      return res.status(404).json({ message: 'Video file not found' });
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

// ✅ ADDED: Serve thumbnail files
router.get('/thumbnail/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const thumbnailPath = path.join('uploads/thumbnails', filename);
    
    console.log(`🖼️ Serving thumbnail for Medsaidabidi02: ${filename} at 2025-09-09 17:15:30`);
    
    if (!fs.existsSync(thumbnailPath)) {
      console.log(`❌ Thumbnail file not found: ${thumbnailPath}`);
      return res.status(404).json({ message: 'Thumbnail file not found' });
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
