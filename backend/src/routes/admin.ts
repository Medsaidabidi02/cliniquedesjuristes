import express from 'express';
import { AuthRequest, requireAdmin } from '../middleware/auth';
import { upload, uploadVideo, uploadImage } from '../services/fileUpload';
import { generateVideoKey } from '../services/videoSecurity';
import bcrypt from 'bcrypt';
import database from '../config/database';

const router = express.Router();

console.log('👑 FIXED Admin API loaded for Medsaidabidi02 - 2025-09-09 15:18:39');

// Apply admin check to all routes
router.use(requireAdmin);

// ===== COURSE MANAGEMENT =====

// Create new course
router.post('/courses', upload.single('cover_image'), async (req: AuthRequest, res) => {
  try {
    const { title, description, excerpt, category_id, level } = req.body;
    const adminId = req.user!.id;

    console.log('📚 Creating course for Medsaidabidi02:', title);

    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    // Generate unique slug
    let baseSlug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existingSlug = await database.query('SELECT id FROM courses WHERE slug = ?', [slug]);
      if (existingSlug.rows.length === 0) break;
      slug = `${baseSlug}-${counter++}`;
    }

    let coverImageUrl = null;
    if (req.file) {
      coverImageUrl = await uploadImage(req.file);
      console.log('🖼️ Cover image uploaded for Medsaidabidi02:', coverImageUrl);
    }

    const result = await database.query(`
      INSERT INTO courses (title, slug, description, excerpt, cover_image, category, thumbnail_path, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, slug, description, excerpt, coverImageUrl, category_id, coverImageUrl, true]);

    // Get the created course
    const createdCourse = await database.query('SELECT * FROM courses WHERE id = ?', [result.insertId]);

    console.log('✅ Course created for Medsaidabidi02:', createdCourse.rows[0].id);
    res.status(201).json(createdCourse.rows[0]);
  } catch (error) {
    console.error('❌ Create course error for Medsaidabidi02:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Get all courses (admin view)
router.get('/courses', async (req: AuthRequest, res) => {
  try {
    console.log('📋 Getting all courses for admin Medsaidabidi02 at 2025-09-09 15:18:39');
    
    const result = await database.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT s.id) as subject_count,
        COUNT(DISTINCT v.id) as video_count,
        COALESCE(SUM(s.hours), 0) as total_hours
      FROM courses c
      LEFT JOIN subjects s ON c.id = s.course_id
      LEFT JOIN videos v ON s.id = v.subject_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    console.log(`✅ Found ${result.rows.length} courses for admin Medsaidabidi02`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get courses error for Medsaidabidi02:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Update course
router.put('/courses/:id', upload.single('cover_image'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, description, excerpt, category, is_active } = req.body;

    console.log(`🔄 Updating course ${id} for Medsaidabidi02 at 2025-09-09 15:18:39`);

    // Check if course exists
    const courseCheck = await database.query('SELECT id FROM courses WHERE id = ?', [id]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    let updateFields = [];
    const values = [];

    if (title) {
      updateFields.push('title = ?');
      values.push(title);
      
      // Update slug if title changed
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
      updateFields.push('slug = ?');
      values.push(slug);
    }

    if (description !== undefined) {
      updateFields.push('description = ?');
      values.push(description);
    }

    if (excerpt !== undefined) {
      updateFields.push('excerpt = ?');
      values.push(excerpt);
    }

    if (category !== undefined) {
      updateFields.push('category = ?');
      values.push(category);
    }

    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      values.push(is_active);
    }

    // Handle cover image
    if (req.file) {
      const coverImageUrl = await uploadImage(req.file);
      updateFields.push('cover_image = ?', 'thumbnail_path = ?');
      values.push(coverImageUrl, coverImageUrl);
      console.log('🖼️ New cover image uploaded for Medsaidabidi02:', coverImageUrl);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_at = NOW()');
    values.push(id);

    await database.query(`UPDATE courses SET ${updateFields.join(', ')} WHERE id = ?`, values);

    // Get updated course
    const updatedCourse = await database.query('SELECT * FROM courses WHERE id = ?', [id]);

    console.log(`✅ Course ${id} updated for Medsaidabidi02`);
    res.json(updatedCourse.rows[0]);
  } catch (error) {
    console.error(`❌ Update course error for Medsaidabidi02:`, error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// ===== SUBJECT MANAGEMENT =====

// Create new subject
router.post('/subjects', async (req: AuthRequest, res) => {
  try {
    const { course_id, title, description, professor_name, hours, order_index } = req.body;

    console.log('📖 Creating subject for Medsaidabidi02:', title);

    if (!course_id || !title || !professor_name) {
      return res.status(400).json({ error: 'Course ID, title, and professor name are required' });
    }

    // Check if course exists
    const courseCheck = await database.query('SELECT id FROM courses WHERE id = ?', [course_id]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get next order index if not provided
    let finalOrderIndex = order_index;
    if (!finalOrderIndex) {
      const maxOrder = await database.query('SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM subjects WHERE course_id = ?', [course_id]);
      finalOrderIndex = maxOrder.rows[0].next_order;
    }

    const result = await database.query(`
      INSERT INTO subjects (course_id, title, description, professor_name, hours, order_index, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [course_id, title, description || '', professor_name, hours || 0, finalOrderIndex, true]);

    // Get the created subject
    const createdSubject = await database.query('SELECT * FROM subjects WHERE id = ?', [result.insertId]);

    console.log('✅ Subject created for Medsaidabidi02:', createdSubject.rows[0].id);
    res.status(201).json(createdSubject.rows[0]);
  } catch (error) {
    console.error('❌ Create subject error for Medsaidabidi02:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// ===== VIDEO MANAGEMENT =====

// Upload video to subject
router.post('/videos', upload.single('video'), async (req: AuthRequest, res) => {
  try {
    const { subject_id, title, description, order_index, is_free } = req.body;

    console.log('🎥 Uploading video for Medsaidabidi02:', title);

    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    if (!subject_id || !title) {
      return res.status(400).json({ error: 'Subject ID and title are required' });
    }

    // Check if subject exists
    const subjectCheck = await database.query('SELECT id FROM subjects WHERE id = ?', [subject_id]);
    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    console.log('📁 Video file details for Medsaidabidi02:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename
    });

    // Get next order index if not provided
    let finalOrderIndex = order_index;
    if (!finalOrderIndex) {
      const maxOrder = await database.query('SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM videos WHERE subject_id = ?', [subject_id]);
      finalOrderIndex = maxOrder.rows[0].next_order;
    }

    // Generate video key for security
    const videoKey = generateVideoKey();
    const videoPath = req.file.filename; // Use the uploaded filename

    const result = await database.query(`
      INSERT INTO videos (subject_id, title, description, video_path, file_path, file_size, mime_type, order_index, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [subject_id, title, description || '', videoPath, videoPath, req.file.size, req.file.mimetype, finalOrderIndex, true]);

    // Get the created video
    const createdVideo = await database.query('SELECT * FROM videos WHERE id = ?', [result.insertId]);

    console.log('✅ Video uploaded for Medsaidabidi02:', createdVideo.rows[0].id);
    res.status(201).json(createdVideo.rows[0]);
  } catch (error) {
    console.error('❌ Upload video error for Medsaidabidi02:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// ===== BLOG MANAGEMENT =====

// Create new blog post
router.post('/blog', upload.single('cover_image'), async (req: AuthRequest, res) => {
  try {
    const { title, content, excerpt, is_featured } = req.body;
    const adminId = req.user!.id;

    console.log('📝 Creating blog post for Medsaidabidi02:', title);

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Generate unique slug
    let baseSlug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existingSlug = await database.query('SELECT id FROM blog_posts WHERE slug = ?', [slug]);
      if (existingSlug.rows.length === 0) break;
      slug = `${baseSlug}-${counter++}`;
    }

    let coverImageUrl = null;
    if (req.file) {
      coverImageUrl = await uploadImage(req.file);
      console.log('🖼️ Blog cover image uploaded for Medsaidabidi02:', coverImageUrl);
    }

    const result = await database.query(`
      INSERT INTO blog_posts (title, slug, content, excerpt, cover_image, author_id, published, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [title, slug, content, excerpt || '', coverImageUrl, adminId, true]);

    // Get the created blog post
    const createdPost = await database.query('SELECT * FROM blog_posts WHERE id = ?', [result.insertId]);

    console.log('✅ Blog post created for Medsaidabidi02:', createdPost.rows[0].id);
    res.status(201).json(createdPost.rows[0]);
  } catch (error) {
    console.error('❌ Create blog post error for Medsaidabidi02:', error);
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// ===== USER MANAGEMENT =====

// Get all users
router.get('/users', async (req: AuthRequest, res) => {
  try {
    console.log('👥 Getting all users for admin Medsaidabidi02 at 2025-09-09 15:18:39');
    
    const result = await database.query(`
      SELECT id, name, email, is_admin, is_approved, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    console.log(`✅ Found ${result.rows.length} users for admin Medsaidabidi02`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Get users error for Medsaidabidi02:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Approve user
router.post('/users/:id/approve', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    console.log(`✅ Approving user ${id} for admin Medsaidabidi02 at 2025-09-09 15:18:39`);

    await database.query('UPDATE users SET is_approved = true, updated_at = NOW() WHERE id = ?', [id]);

    // Get updated user
    const updatedUser = await database.query('SELECT id, name, email, is_admin, is_approved FROM users WHERE id = ?', [id]);

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ User ${id} approved by admin Medsaidabidi02`);
    res.json({ message: 'User approved successfully', user: updatedUser.rows[0] });
  } catch (error) {
    console.error(`❌ Approve user error for Medsaidabidi02:`, error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// ===== DASHBOARD STATISTICS =====

// Get dashboard stats
router.get('/dashboard/stats', async (req: AuthRequest, res) => {
  try {
    console.log('📊 Getting dashboard stats for admin Medsaidabidi02 at 2025-09-09 15:18:39');

    const [
      coursesCount,
      subjectsCount,
      videosCount,
      usersCount,
      blogPostsCount
    ] = await Promise.all([
      database.query('SELECT COUNT(*) as count FROM courses WHERE is_active = true'),
      database.query('SELECT COUNT(*) as count FROM subjects WHERE is_active = true'),
      database.query('SELECT COUNT(*) as count FROM videos WHERE is_active = true'),
      database.query('SELECT COUNT(*) as count FROM users'),
      database.query('SELECT COUNT(*) as count FROM blog_posts WHERE published = true')
    ]);

    const stats = {
      courses: parseInt(coursesCount.rows[0].count),
      subjects: parseInt(subjectsCount.rows[0].count),
      videos: parseInt(videosCount.rows[0].count),
      users: parseInt(usersCount.rows[0].count),
      blog_posts: parseInt(blogPostsCount.rows[0].count)
    };

    console.log('✅ Dashboard stats calculated for admin Medsaidabidi02:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Dashboard stats error for Medsaidabidi02:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ===== FILE MANAGEMENT =====

// Upload general file
router.post('/upload', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    console.log('📤 File upload for admin Medsaidabidi02 at 2025-09-09 15:18:39');

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    console.log('✅ File uploaded for Medsaidabidi02:', fileUrl);

    res.json({
      success: true,
      fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('❌ File upload error for Medsaidabidi02:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

console.log('👑 Admin routes module loaded for Medsaidabidi02 at 2025-09-09 15:18:39');

export { router as adminRoutes };
export default router;