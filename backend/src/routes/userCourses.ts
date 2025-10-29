import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import database from '../config/database';

const router = express.Router();

console.log('📚 FIXED User-Courses API loaded for Medsaidabidi02 - 2025-09-09 15:14:06');

router.post('/enroll', authenticateToken, requireAdmin, async (req, res) => {
  // Temporary debug: log arrival and headers.auth
  console.log('[user-courses] POST /enroll received - headers.authorization =', req.headers.authorization ? '[RECEIVED]' : '[MISSING]');
  console.log('[user-courses] Request info:', { 
    method: req.method, 
    path: req.path, 
    ip: req.ip, 
    bodyPreview: req.body ? Object.keys(req.body) : null,
    timestamp: '2025-09-09 15:14:06',
    user: 'Medsaidabidi02'
  });

  try {
    const { userId, courseId } = req.body;
    console.log('📝 Enroll data for Medsaidabidi02:', { userId, courseId });

    if (!userId || !courseId) {
      return res.status(400).json({ success: false, message: 'userId and courseId required' });
    }

    // Check if user exists
    const userCheck = await database.query('SELECT id, name FROM users WHERE id = ?', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if course exists
    const courseCheck = await database.query('SELECT id, title FROM courses WHERE id = ?', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Avoid duplicate enrollment
    const exists = await database.query('SELECT 1 FROM user_courses WHERE user_id = ? AND course_id = ?', [userId, courseId]);
    if (exists.rows.length > 0) {
      console.log(`⚠️ User ${userId} already enrolled in course ${courseId} for Medsaidabidi02`);
      return res.json({ success: true, message: 'User already enrolled', enrolled: true });
    }

    // Enroll user in course
    await database.query('INSERT INTO user_courses (user_id, course_id, created_at) VALUES (?, ?, NOW())', [userId, courseId]);
    
    console.log(`✅ User ${userId} (${userCheck.rows[0].name}) enrolled in course ${courseId} (${courseCheck.rows[0].title}) by Medsaidabidi02`);
    res.json({ 
      success: true, 
      message: 'User enrolled in course',
      enrollment: {
        userId,
        courseId,
        userName: userCheck.rows[0].name,
        courseTitle: courseCheck.rows[0].title
      }
    });
  } catch (error) {
    console.error('❌ Error enrolling user for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Error enrolling user' });
  }
});

/**
 * DELETE /api/user-courses/enroll
 * Body: { userId: number, courseId: number }
 * Admin only: remove enrollment
 */
router.delete('/enroll', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // req.body for DELETE might be missing in some clients; handle both body and database.query
    const userId = req.body.userId ?? req.query.userId;
    const courseId = req.body.courseId ?? req.query.courseId;
    
    console.log('🗑️ DELETE /api/user-courses/enroll for Medsaidabidi02 at 2025-09-09 15:14:06');
    console.log('📝 Unenroll data:', { userId, courseId });

    if (!userId || !courseId) {
      return res.status(400).json({ success: false, message: 'userId and courseId required' });
    }

    // Check if enrollment exists
    const enrollmentCheck = await database.query(`
      SELECT uc.id, u.name as user_name, c.title as course_title
      FROM user_courses uc
      JOIN users u ON uc.user_id = u.id
      JOIN courses c ON uc.course_id = c.id
      WHERE uc.user_id = ? AND uc.course_id = ?
    `, [userId, courseId]);

    if (enrollmentCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const enrollment = enrollmentCheck.rows[0];

    // Remove enrollment
    await database.query('DELETE FROM user_courses WHERE user_id = ? AND course_id = ?', [userId, courseId]);

    console.log(`✅ Enrollment removed: ${enrollment.user_name} from ${enrollment.course_title} by Medsaidabidi02`);
    res.json({ 
      success: true, 
      message: 'Enrollment removed',
      removedEnrollment: {
        userId,
        courseId,
        userName: enrollment.user_name,
        courseTitle: enrollment.course_title
      }
    });
  } catch (error) {
    console.error('❌ Error removing enrollment for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Error removing enrollment' });
  }
});

/**
 * GET /api/user-courses/me
 * Authenticated: returns array of course ids user is enrolled in and optional course objects
 */
router.get('/me', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    console.log(`📋 GET /api/user-courses/me - User ${userId} for Medsaidabidi02 at 2025-09-09 15:14:06`);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const result = await database.query(`
      SELECT c.id, c.title, c.description, c.category, c.cover_image, c.is_active, c.thumbnail_path
      FROM user_courses uc
      JOIN courses c ON uc.course_id = c.id
      WHERE uc.user_id = ? AND c.is_active = true
      ORDER BY uc.created_at DESC
    `, [userId]);

    const courseIds = result.rows.map((r: any) => r.id);
    
    console.log(`✅ Found ${result.rows.length} enrolled courses for user ${userId} for Medsaidabidi02`);
    res.json({ 
      success: true, 
      courses: result.rows, 
      courseIds,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error fetching user enrollments for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Error fetching enrollments' });
  }
});

/**
 * GET /api/user-courses/user/:id
 * Admin: get enrollments for a specific user
 */
router.get('/user/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    console.log(`📋 GET /api/user-courses/user/${userId} - Admin database.query for Medsaidabidi02 at 2025-09-09 15:14:06`);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    // Check if user exists
    const userCheck = await database.query('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const result = await database.query(`
      SELECT c.id, c.title, c.description, c.category, c.cover_image, c.is_active, c.thumbnail_path,
             uc.created_at as enrolled_at
      FROM user_courses uc
      JOIN courses c ON uc.course_id = c.id
      WHERE uc.user_id = ?
      ORDER BY uc.created_at DESC
    `, [userId]);

    const courseIds = result.rows.map((r: any) => r.id);
    const user = userCheck.rows[0];
    
    console.log(`✅ Found ${result.rows.length} enrolled courses for user ${userId} (${user.name}) by admin Medsaidabidi02`);
    res.json({ 
      success: true, 
      user: user,
      courses: result.rows, 
      courseIds,
      count: result.rows.length
    });
  } catch (error) {
    console.error(`❌ Error fetching user enrollments (admin) for Medsaidabidi02:`, error);
    res.status(500).json({ success: false, message: 'Error fetching enrollments' });
  }
});

/**
 * GET /api/user-courses/course/:id
 * Admin: get all users enrolled in a specific course
 */
router.get('/course/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    console.log(`📋 GET /api/user-courses/course/${courseId} - Admin database.query for Medsaidabidi02 at 2025-09-09 15:14:06`);

    if (!courseId || isNaN(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course id' });
    }

    // Check if course exists
    const courseCheck = await database.query('SELECT id, title, description FROM courses WHERE id = ?', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const result = await database.query(`
      SELECT u.id, u.name, u.email, u.is_admin, u.is_approved,
             uc.created_at as enrolled_at
      FROM user_courses uc
      JOIN users u ON uc.user_id = u.id
      WHERE uc.course_id = ?
      ORDER BY uc.created_at DESC
    `, [courseId]);

    const userIds = result.rows.map((r: any) => r.id);
    const course = courseCheck.rows[0];
    
    console.log(`✅ Found ${result.rows.length} enrolled users for course ${courseId} (${course.title}) by admin Medsaidabidi02`);
    res.json({ 
      success: true, 
      course: course,
      users: result.rows, 
      userIds,
      count: result.rows.length
    });
  } catch (error) {
    console.error(`❌ Error fetching course enrollments (admin) for Medsaidabidi02:`, error);
    res.status(500).json({ success: false, message: 'Error fetching course enrollments' });
  }
});

/**
 * GET /api/user-courses/stats
 * Admin: get enrollment statistics
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 GET /api/user-courses/stats - Admin stats for Medsaidabidi02 at 2025-09-09 15:14:06');

    const [totalEnrollments, uniqueUsers, uniqueCourses, recentEnrollments] = await Promise.all([
      // Total enrollments
      database.query('SELECT COUNT(*) as total_enrollments FROM user_courses'),
      // Unique users with enrollments
      database.query('SELECT COUNT(DISTINCT user_id) as unique_users FROM user_courses'),
      // Unique courses with enrollments
      database.query('SELECT COUNT(DISTINCT course_id) as unique_courses FROM user_courses'),
      // Recent enrollments (last 7 days)
      database.query(`
        SELECT COUNT(*) as recent_enrollments 
        FROM user_courses 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `)
    ]);

    const stats = {
      total_enrollments: parseInt(totalEnrollments.rows[0].total_enrollments),
      unique_users: parseInt(uniqueUsers.rows[0].unique_users),
      unique_courses: parseInt(uniqueCourses.rows[0].unique_courses),
      recent_enrollments: parseInt(recentEnrollments.rows[0].recent_enrollments)
    };

    console.log('✅ Enrollment stats calculated for Medsaidabidi02:', stats);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error calculating enrollment stats for Medsaidabidi02:', error);
    res.status(500).json({ success: false, message: 'Error calculating enrollment statistics' });
  }
});

export { router as userCoursesRoutes };
export default router;

console.log('📚 User-Courses routes module loaded for Medsaidabidi02 at 2025-09-09 15:14:06');