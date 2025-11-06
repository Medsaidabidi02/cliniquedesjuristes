import { Router } from 'express';
import database from '../config/database';
import { getPublicVideoUrl, isValidVideoPath } from '../services/hetznerService';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

console.log('🎬 Videos API loaded - Hetzner HLS-only mode');

/**
 * GET /api/videos
 * Get all videos with subject/course info
 * Returns public HLS URLs for each video
 */
router.get('/', async (req, res) => {
  try {
    console.log('📋 GET /api/videos - Fetching videos with public HLS URLs');
    
    const result = await database.query(`
      SELECT 
        v.*,
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
    
    // Transform videos to include public HLS URLs
    const videos = result.rows.map(video => {
      const videoPath = video.video_path;
      let publicUrl = null;
      
      if (videoPath && isValidVideoPath(videoPath)) {
        try {
          publicUrl = getPublicVideoUrl(videoPath);
        } catch (error) {
          console.error(`❌ Error generating URL for video ${video.id}:`, error);
        }
      }
      
      return {
        ...video,
        hls_url: publicUrl,
        playback_url: publicUrl,
      };
    });
    
    console.log(`✅ Found ${videos.length} videos with public URLs`);
    res.json(videos);
    
  } catch (error) {
    console.error('❌ Database error fetching videos:', error);
    res.status(500).json({ message: 'Database error fetching videos' });
  }
});

/**
 * GET /api/videos/admin/stats
 * Get video statistics
 */
router.get('/admin/stats', async (req, res) => {
  try {
    console.log('📊 GET /api/videos/admin/stats - Calculating stats');
    
    const [videosCount, subjectsWithVideos, totalSize] = await Promise.all([
      database.query(`
        SELECT 
          COUNT(*) as total_videos,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_videos
        FROM videos
      `),
      database.query(`
        SELECT COUNT(DISTINCT subject_id) as subjects_with_videos 
        FROM videos 
        WHERE subject_id IS NOT NULL AND is_active = true
      `),
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
    
    console.log('✅ Video stats calculated:', stats);
    res.json(stats);
    
  } catch (error) {
    console.error('❌ Error calculating video stats:', error);
    res.status(500).json({ message: 'Error calculating video statistics' });
  }
});

/**
 * GET /api/videos/:id
 * Get single video by ID with public HLS URL
 */
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 GET /api/videos/${id} - Fetching video with public URL`);
    
    const result = await database.query(`
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
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const video = result.rows[0];
    
    // Check access permissions
    if (!video.is_free) {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ 
          message: 'Authentication required to access this video',
          is_free: false 
        });
      }
      
      // Check if user has access
      const userId = Number(user.id);
      const courseId = video.course_id;
      const subjectId = video.subject_id;
      
      let hasAccess = false;
      
      if (courseId) {
        const courseEnroll = await database.query(
          'SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?',
          [userId, courseId]
        );
        if (courseEnroll.rows.length > 0) hasAccess = true;
      }
      
      if (!hasAccess && subjectId) {
        const subjectAccess = await database.query(
          'SELECT 1 FROM user_subjects WHERE user_id = ? AND subject_id = ?',
          [userId, subjectId]
        );
        if (subjectAccess.rows.length > 0) hasAccess = true;
      }
      
      if (!hasAccess) {
        return res.status(403).json({ 
          message: 'You do not have access to this video',
          requires_enrollment: true 
        });
      }
    }
    
    // Generate public HLS URL
    const videoPath = video.video_path;
    let publicUrl = null;
    
    if (videoPath && isValidVideoPath(videoPath)) {
      try {
        publicUrl = getPublicVideoUrl(videoPath);
      } catch (error) {
        console.error(`❌ Error generating URL for video ${id}:`, error);
        return res.status(500).json({ 
          message: 'Error generating video URL. Please contact support.' 
        });
      }
    } else {
      return res.status(404).json({ 
        message: 'Video file not available or invalid format' 
      });
    }
    
    console.log(`✅ Found video ${id} with public HLS URL`);
    res.json({
      ...video,
      hls_url: publicUrl,
      playback_url: publicUrl,
    });
    
  } catch (error) {
    console.error(`❌ Database error fetching video ${req.params.id}:`, error);
    res.status(500).json({ message: 'Database error fetching video' });
  }
});

/**
 * DELETE /api/videos/:id
 * Delete a video (admin only)
 * Note: Only deletes database record, not S3 files
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/videos/${id}`);
    
    // Get video info before deletion
    const videoInfo = await database.query('SELECT * FROM videos WHERE id = ?', [id]);
    
    if (videoInfo.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const video = videoInfo.rows[0];
    
    // Delete video record from database
    await database.query('DELETE FROM videos WHERE id = ?', [id]);
    
    console.log(`✅ Video ${id} deleted from database`);
    console.log(`⚠️ Note: S3 files must be deleted manually from Hetzner storage`);
    
    res.json({ 
      message: 'Video deleted successfully from database', 
      video: { id, title: video.title },
      note: 'S3 files must be deleted manually from Hetzner storage'
    });
    
  } catch (error) {
    console.error(`❌ Delete error:`, error);
    res.status(500).json({ message: 'Failed to delete video' });
  }
});

export default router;
export { router as videoRoutes };

console.log('🎬 Video routes module loaded - Hetzner public HLS only');
