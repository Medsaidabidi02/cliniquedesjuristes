import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import database from '../config/database';
import { optionalAuth } from '../middleware/auth';
import bunnyStorage from '../services/bunnyStorage';

const router = Router();

router.get('/stream-protected/:filename', optionalAuth, async (req: any, res) => {
  try {
    const { filename } = req.params;
    console.log(`🎬 Protected streaming requested for filename=${filename}`);

    // Find the video record by video_path or file_path
    const likePattern = `%${filename}`;
    const result = await database.query(`
      SELECT v.*, s.id as subject_id, s.course_id as subject_course_id
      FROM videos v
      LEFT JOIN subjects s ON v.subject_id = s.id
      WHERE v.video_path LIKE ? OR v.file_path LIKE ?
      LIMIT 1
    `, [likePattern, likePattern]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const video = result.rows[0];

    // Allow free videos without auth
    if (video.is_free) {
      console.log('🔓 Video is free - streaming without auth');
      // fall through to stream
    } else {
      // If not free, require either course enrollment or subject access
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required to access this video' });
      }

      const userId = Number(user.id);
      const courseId = video.subject_course_id || video.course_id || null;
      const subjectId = video.subject_id || null;

      let hasAccess = false;

      if (courseId) {
        const courseEnroll = await database.query('SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?', [userId, courseId]);
        if (courseEnroll.rows.length > 0) hasAccess = true;
      }

      if (!hasAccess && subjectId) {
        const subjectAccess = await database.query('SELECT 1 FROM user_subjects WHERE user_id = ? AND subject_id = ?', [userId, subjectId]);
        if (subjectAccess.rows.length > 0) hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have access to this video' });
      }
    }

    // Stream the file - check if it's a Bunny.net path or local path
    const videoPathFromDB = video.video_path || video.file_path;
    
    // If it's a Bunny.net path, redirect to CDN
    if (videoPathFromDB && (videoPathFromDB.startsWith('/videos/') || videoPathFromDB.startsWith('http'))) {
      const cdnUrl = videoPathFromDB.startsWith('http') 
        ? videoPathFromDB 
        : bunnyStorage.getCdnUrl(videoPathFromDB);
      console.log(`🔄 Redirecting to Bunny.net CDN: ${cdnUrl}`);
      return res.redirect(cdnUrl);
    }
    
    // Legacy: Stream from local file
    const videoPath = path.join('uploads/videos', filename);
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ message: 'Video file not found' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4'
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4'
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }

  } catch (error) {
    console.error('❌ Error in protected stream route:', error);
    res.status(500).json({ message: 'Error streaming video' });
  }
});

export default router;