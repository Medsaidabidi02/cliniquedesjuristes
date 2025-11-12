import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import database from '../config/database';

const router = Router();

console.log('📖 FIXED Subjects API loaded for Medsaidabidi02 - 2025-09-09 16:01:15');

// GET all subjects
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('📋 GET /api/subjects - Fetching subjects for Medsaidabidi02 at 2025-09-09 16:01:15');
    
    const result = await database.query(`
      SELECT 
        s.*,
        c.title as course_title,
        c.category as course_category,
        COUNT(DISTINCT v.id) as video_count
      FROM subjects s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN videos v ON s.id = v.subject_id AND v.is_active = true
      WHERE s.is_active = true AND c.is_active = true
      GROUP BY s.id
      ORDER BY c.id, s.order_index, s.created_at
    `);
    
    console.log(`✅ Found ${result.rows.length} subjects for Medsaidabidi02`);
    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Database error fetching subjects for Medsaidabidi02:', error);
    res.status(500).json({ 
      success: false,
      message: 'Database error fetching subjects',
      error: error.message 
    });
  }
});

// GET subjects by course ID
router.get('/course/:courseId', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    console.log(`📋 GET /api/subjects/course/${courseId} for Medsaidabidi02`);
    
    const result = await database.query(`
      SELECT 
        s.*,
        c.title as course_title,
        COUNT(DISTINCT v.id) as video_count
      FROM subjects s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN videos v ON s.id = v.subject_id AND v.is_active = true
      WHERE s.course_id = ? AND s.is_active = true AND c.is_active = true
      GROUP BY s.id
      ORDER BY s.order_index, s.created_at
    `, [courseId]);
    
    console.log(`✅ Found ${result.rows.length} subjects for course ${courseId} for Medsaidabidi02`);
    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error(`❌ Database error fetching subjects for course ${req.params.courseId} for Medsaidabidi02:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Database error fetching subjects',
      error: error.message 
    });
  }
});

// POST create subject
// ✅ ULTRA-FIXED: POST create new subject with bulletproof MySQL5 response handling
router.post('/', async (req, res) => {
  try {
    const { title, course_id, professor_name, hours, description, is_active } = req.body;
    
    console.log('📤 POST /api/subjects - Creating subject for Medsaidabidi02 at 2025-09-09 17:25:32');
    console.log('📝 Data:', { title, course_id, professor_name, hours, is_active });
    
    // Validate required fields
    if (!title || !course_id || !professor_name) {
      return res.status(400).json({ 
        success: false,
        message: 'Title, course_id, and professor_name are required',
        received: { title: !!title, course_id: !!course_id, professor_name: !!professor_name }
      });
    }
    
    // Check if course exists
    const courseCheck = await database.query('SELECT id, title FROM courses WHERE id = ?', [course_id]);
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found',
        course_id: course_id
      });
    }
    
    console.log('🔄 Inserting subject into database...');
    
    // ✅ ULTRA-FIXED: Use multiple approaches to ensure we get the subject ID
    let subjectId = null;
    let createdSubject = null;
    
    try {
      // Approach 1: Try direct INSERT and get insertId
      const insertResult = await database.query(`
        INSERT INTO subjects (
          title, course_id, professor_name, hours, description, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        title.trim(),
        parseInt(course_id),
        professor_name.trim(),
        parseInt(hours) || 0,
        description?.trim() || '',
        is_active !== false
      ]);
      
      console.log('✅ Insert result structure for Medsaidabidi02:', {
        type: typeof insertResult,
        keys: Object.keys(insertResult || {}),
        insertResult: insertResult
      });
      
      // Try multiple ways to extract the subject ID
      if (insertResult && typeof insertResult === 'object') {
        // Method 1: Direct insertId property
        if (insertResult.insertId) {
          subjectId = insertResult.insertId;
          console.log('✅ Got subject ID from insertResult.insertId:', subjectId);
        }
        // Method 2: insertId in rows array
        else if (insertResult.rows && insertResult.rows.length > 0 && insertResult.rows[0].insertId) {
          subjectId = insertResult.rows[0].insertId;
          console.log('✅ Got subject ID from insertResult.rows[0].insertId:', subjectId);
        }
        // Method 3: Check if insertResult is the ID itself
        else if (typeof insertResult === 'number') {
          subjectId = insertResult;
          console.log('✅ Got subject ID from direct result:', subjectId);
        }
        // Method 4: Check affectedRows and get LAST_INSERT_ID
        else if (insertResult.affectedRows && insertResult.affectedRows > 0) {
          console.log('🔄 Affected rows > 0, trying LAST_INSERT_ID()...');
          const lastIdResult = await database.query('SELECT LAST_INSERT_ID() as id');
          console.log('✅ LAST_INSERT_ID result:', lastIdResult);
          if (lastIdResult.rows && lastIdResult.rows[0] && lastIdResult.rows[0].id) {
            subjectId = lastIdResult.rows[0].id;
            console.log('✅ Got subject ID from LAST_INSERT_ID():', subjectId);
          }
        }
      }
      
      // Approach 2: If still no ID, try to find the most recent subject with our exact data
      if (!subjectId) {
        console.log('🔄 No subject ID found, searching by title and course...');
        const searchResult = await database.query(`
          SELECT id FROM subjects 
          WHERE title = ? AND course_id = ? AND professor_name = ? 
          ORDER BY created_at DESC 
          LIMIT 1
        `, [title.trim(), parseInt(course_id), professor_name.trim()]);
        
        if (searchResult.rows && searchResult.rows.length > 0) {
          subjectId = searchResult.rows[0].id;
          console.log('✅ Found subject ID by searching:', subjectId);
        }
      }
      
      // Approach 3: Last resort - get the most recent subject
      if (!subjectId) {
        console.log('🔄 Still no subject ID, getting most recent subject...');
        const recentResult = await database.query('SELECT id FROM subjects ORDER BY created_at DESC LIMIT 1');
        if (recentResult.rows && recentResult.rows.length > 0) {
          subjectId = recentResult.rows[0].id;
          console.log('⚠️ Using most recent subject ID as fallback:', subjectId);
        }
      }
      
      if (!subjectId) {
        throw new Error('Could not determine subject ID after insert - all methods failed');
      }
      
      // Now get the complete subject data with course info
      console.log(`🔄 Fetching complete subject data for ID: ${subjectId}`);
      const createdSubjectResult = await database.query(`
        SELECT 
          s.*,
          c.title as course_title,
          c.category as course_category
        FROM subjects s
        LEFT JOIN courses c ON s.course_id = c.id
        WHERE s.id = ?
      `, [subjectId]);
      
      if (!createdSubjectResult.rows || createdSubjectResult.rows.length === 0) {
        throw new Error(`Subject with ID ${subjectId} was inserted but cannot be retrieved`);
      }
      
      createdSubject = createdSubjectResult.rows[0];
      
      console.log('✅ Subject created successfully for Medsaidabidi02:', {
        id: createdSubject.id,
        title: createdSubject.title,
        course_id: createdSubject.course_id,
        course_title: createdSubject.course_title,
        professor_name: createdSubject.professor_name
      });
      
      // ✅ FIXED: Return comprehensive response structure
      return res.status(201).json({
        success: true,
        message: 'Subject created successfully',
        data: createdSubject,
        // Also include subject properties directly for backward compatibility
        id: createdSubject.id,
        title: createdSubject.title,
        course_id: createdSubject.course_id,
        professor_name: createdSubject.professor_name,
        hours: createdSubject.hours,
        description: createdSubject.description,
        is_active: createdSubject.is_active,
        created_at: createdSubject.created_at,
        updated_at: createdSubject.updated_at,
        // Include joined data
        course_title: createdSubject.course_title,
        course_category: createdSubject.course_category
      });
      
    } catch (dbError) {
      console.error('❌ Database operation failed for Medsaidabidi02:', dbError);
      throw new Error(`Database operation failed: ${dbError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Subject creation error for Medsaidabidi02:', error);
    
    // ✅ FIXED: Provide detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('❌ Error stack for Medsaidabidi02:', errorStack);
    
    return res.status(500).json({ 
      success: false,
      message: 'Database error creating subject',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
});

// GET single subject
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📋 GET /api/subjects/${id} for Medsaidabidi02`);
    
    const result = await database.query(`
      SELECT 
        s.*,
        c.title as course_title,
        c.category as course_category,
        COUNT(DISTINCT v.id) as video_count
      FROM subjects s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN videos v ON s.id = v.subject_id AND v.is_active = true
      WHERE s.id = ? AND s.is_active = true
      GROUP BY s.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Subject not found' 
      });
    }
    
    console.log(`✅ Found subject ${id} for Medsaidabidi02`);
    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error(`❌ Database error fetching subject ${req.params.id} for Medsaidabidi02:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Database error fetching subject',
      error: error.message 
    });
  }
});

// PUT update subject
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, professor_name, hours, order_index } = req.body;
    
    console.log(`📝 PUT /api/subjects/${id} for Medsaidabidi02`);
    
    // Check if subject exists
    const existingSubject = await database.query('SELECT * FROM subjects WHERE id = ? AND is_active = true', [id]);
    if (existingSubject.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Subject not found' 
      });
    }

    // Clean data
    const cleanTitle = title ? String(title).trim() : existingSubject.rows[0].title;
    const cleanDescription = description !== undefined ? (description ? String(description).trim() : null) : existingSubject.rows[0].description;
    const cleanProfessorName = professor_name ? String(professor_name).trim() : existingSubject.rows[0].professor_name;
    const cleanHours = hours !== undefined ? (hours ? parseFloat(String(hours)) : null) : existingSubject.rows[0].hours;
    const cleanOrderIndex = order_index !== undefined ? parseInt(String(order_index)) : existingSubject.rows[0].order_index;

    // Update subject
    await database.query(`
      UPDATE subjects 
      SET title = ?, description = ?, professor_name = ?, hours = ?, order_index = ?, updated_at = NOW()
      WHERE id = ?
    `, [cleanTitle, cleanDescription, cleanProfessorName, cleanHours, cleanOrderIndex, id]);

    // Get updated subject
    const updatedSubject = await database.query(`
      SELECT 
        s.*,
        c.title as course_title
      FROM subjects s
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `, [id]);

    console.log(`✅ Subject ${id} updated successfully for Medsaidabidi02`);
    res.status(200).json({
      success: true,
      data: updatedSubject.rows[0],
      message: 'Subject updated successfully'
    });
    
  } catch (error) {
    console.error(`❌ Database error updating subject ${req.params.id} for Medsaidabidi02:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Database error updating subject',
      error: error.message 
    });
  }
});

// DELETE subject (soft delete)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/subjects/${id} for Medsaidabidi02`);
    
    // Check if subject exists
    const existingSubject = await database.query('SELECT * FROM subjects WHERE id = ? AND is_active = true', [id]);
    if (existingSubject.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Subject not found' 
      });
    }

    // Soft delete
    await database.query('UPDATE subjects SET is_active = false, updated_at = NOW() WHERE id = ?', [id]);

    console.log(`✅ Subject ${id} deleted successfully for Medsaidabidi02`);
    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully'
    });
    
  } catch (error) {
    console.error(`❌ Database error deleting subject ${req.params.id} for Medsaidabidi02:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Database error deleting subject',
      error: error.message 
    });
  }
});

export default router;
export { router as subjectsRoutes };

console.log('📖 Subjects routes module loaded for Medsaidabidi02 at 2025-09-09 16:01:15');