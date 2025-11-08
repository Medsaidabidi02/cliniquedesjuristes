import express from 'express';
import { AuthRequest, authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import database from '../config/database';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version';

console.log('📝 FIXED Blog API loaded for Medsaidabidi02 - 2025-09-09 15:15:29');

// Helper function to generate slug
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Helper function to decode JWT token safely
const decodeTokenSafely = async (req: AuthRequest): Promise<any> => {
  try {
    const header = (req.headers['authorization'] as string) || (req.headers['x-access-token'] as string);
    if (!header) return null;

    const parts = header.split(' ');
    let token = header;
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') token = parts[1];
    
    const decoded: any = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user info from DB
    const userResult = await database.query('SELECT id, is_admin, is_approved FROM users WHERE id = ?', [decoded.id]);
    if (userResult.rows.length === 0) return null;
    
    const user = userResult.rows[0];
    return {
      id: user.id,
      is_admin: user.is_admin || false,
      isAdmin: user.is_admin || false,
      is_approved: user.is_approved
    };
  } catch (e) {
    console.warn('[blog] Token decode failed - treating as unauthenticated for Medsaidabidi02');
    return null;
  }
};

/**
 * GET /api/blog
 * Public endpoint with authentication-aware behavior
 */
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    console.log('📋 GET /api/blog - Fetching posts for Medsaidabidi02 at 2025-09-09 15:15:29');
    
    const publishedParam = typeof req.query.published === 'string' ? req.query.published : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : null;

    // Decode token safely without failing the request
    const user = await decodeTokenSafely(req);
    if (user) {
      req.user = user;
      console.log(`✅ Authenticated request by user ${user.id} for Medsaidabidi02`);
    }

    // If caller explicitly asked for drafts (published=false) then require auth
    if (publishedParam === 'false') {
      if (!user || !user.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Access token required to view drafts',
          message: 'Authentication required to view drafts'
        });
      }

      // Admin sees all drafts
      if (user.is_admin) {
        const clauses: string[] = ['bp.published = false'];
        const values: any[] = [];
        if (search) {
          clauses.push('(bp.title LIKE ? OR bp.content LIKE ?)');
          values.push(`%${search}%`, `%${search}%`);
        }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `
          SELECT bp.*, u.name as author_name
          FROM blog_posts bp
          LEFT JOIN users u ON bp.author_id = u.id
          ${where}
          ORDER BY bp.created_at DESC
        `;
        const result = await database.query(sql, values);
        console.log(`✅ Found ${result.rows.length} draft posts for admin Medsaidabidi02`);
        return res.json({ success: true, posts: result.rows, data: result.rows });
      }

      // Regular user: only their own drafts
      const values: any[] = [user.id];
      const clauses = ['bp.published = false', 'bp.author_id = ?'];

      if (search) {
        clauses.push('(bp.title LIKE ? OR bp.content LIKE ?)');
        values.push(`%${search}%`, `%${search}%`);
      }

      const where = `WHERE ${clauses.join(' AND ')}`;
      const sql = `
        SELECT bp.*, u.name as author_name
        FROM blog_posts bp
        LEFT JOIN users u ON bp.author_id = u.id
        ${where}
        ORDER BY bp.created_at DESC
      `;
      const result = await database.query(sql, values);
      console.log(`✅ Found ${result.rows.length} own draft posts for user ${user.id} Medsaidabidi02`);
      return res.json({ success: true, posts: result.rows, data: result.rows });
    }

    // For published=true or no param:
    const clauses: string[] = [];
    const values: any[] = [];

    if (publishedParam === 'true') {
      clauses.push('bp.published = true');
    } else {
      // no explicit param
      if (!user) {
        clauses.push('bp.published = true');
      } else if (user.is_admin) {
        // admin: no published clause (sees all)
      } else {
        // regular authenticated: show published OR their own posts
        clauses.push('(bp.published = true OR bp.author_id = ?)');
        values.push(user.id);
      }
    }

    if (search) {
      clauses.push('(bp.title LIKE ? OR bp.content LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `
      SELECT bp.*, u.name as author_name
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      ${where}
      ORDER BY bp.created_at DESC
    `;
    const result = await database.query(sql, values);

    console.log(`✅ Found ${result.rows.length} blog posts for Medsaidabidi02`);
    return res.json({ success: true, posts: result.rows, data: result.rows });
  } catch (error) {
    console.error('❌ Error fetching posts for Medsaidabidi02:', error);
    res.status(500).json({ success: false, error: 'Error fetching posts', message: 'Internal server error' });
  }
});

// GET /api/blog/drafts - Get drafts visible to the caller
router.get('/drafts', authenticateToken, async (req, res) => {
  try {
    console.log('📋 GET /api/blog/drafts - Fetching drafts for Medsaidabidi02 at 2025-09-09 15:15:29');
    
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (user.is_admin || user.isAdmin) {
      const result = await database.query(`
        SELECT bp.*, u.name as author_name
        FROM blog_posts bp
        LEFT JOIN users u ON bp.author_id = u.id
        WHERE bp.published = false
        ORDER BY bp.created_at DESC
      `);
      console.log(`✅ Found ${result.rows.length} draft posts for admin Medsaidabidi02`);
      return res.json({ success: true, posts: result.rows, data: result.rows });
    } else {
      const result = await database.query(`
        SELECT bp.*, u.name as author_name
        FROM blog_posts bp
        LEFT JOIN users u ON bp.author_id = u.id
        WHERE bp.published = false AND bp.author_id = ?
        ORDER BY bp.created_at DESC
      `, [user.id]);
      console.log(`✅ Found ${result.rows.length} own draft posts for user ${user.id} Medsaidabidi02`);
      return res.json({ success: true, posts: result.rows, data: result.rows });
    }
  } catch (error) {
    console.error('❌ Error fetching drafts for Medsaidabidi02:', error);
    res.status(500).json({ success: false, error: 'Error fetching drafts' });
  }
});

// GET /api/blog/admin/stats - Get blog statistics (Admin only)
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 GET /api/blog/admin/stats - Fetching stats for admin Medsaidabidi02 at 2025-09-09 15:15:29');
    
    const [totalPosts, publishedPosts, draftPosts, totalAuthors] = await Promise.all([
      database.query('SELECT COUNT(*) as total_posts FROM blog_posts'),
      database.query('SELECT COUNT(*) as published_posts FROM blog_posts WHERE published = true'),
      database.query('SELECT COUNT(*) as draft_posts FROM blog_posts WHERE published = false'),
      database.query('SELECT COUNT(DISTINCT author_id) as total_authors FROM blog_posts')
    ]);

    const stats = {
      total_posts: parseInt(totalPosts.rows[0].total_posts),
      published_posts: parseInt(publishedPosts.rows[0].published_posts),
      draft_posts: parseInt(draftPosts.rows[0].draft_posts),
      total_authors: parseInt(totalAuthors.rows[0].total_authors)
    };

    console.log('✅ Blog stats calculated for admin Medsaidabidi02:', stats);
    res.json({ success: true, stats, data: stats });
  } catch (error) {
    console.error('❌ Error fetching blog stats for Medsaidabidi02:', error);
    res.status(500).json({ success: false, error: 'Error fetching blog stats' });
  }
});

// POST /api/blog/upload-image - Upload image for blog content

// GET /api/blog/:id - Get single blog post
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 GET /api/blog/${id} - Fetching single post for Medsaidabidi02 at 2025-09-09 15:15:29`);
    
    // Decode token safely without failing the request
    const user = await decodeTokenSafely(req);
    if (user) {
      req.user = user;
    }

    const result = await database.query(`
      SELECT bp.*, u.name as author_name
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      WHERE bp.id = ?
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Blog post not found' });
    }

    const post = result.rows[0];
    if (!post.published) {
      // draft: allow only author or admin
      if (!user || !(user.is_admin || user.isAdmin) && user.id !== post.author_id) {
        return res.status(403).json({ success: false, error: 'Access denied to draft' });
      }
    }

    console.log(`✅ Found blog post ${id} for Medsaidabidi02`);
    res.json({ success: true, post, data: post });
  } catch (error) {
    console.error(`❌ Error fetching blog post ${req.params.id} for Medsaidabidi02:`, error);
    res.status(500).json({ success: false, error: 'Error fetching blog post' });
  }
});

// POST /api/blog - Create new blog post
// POST /api/blog - Create new blog post (no file upload)
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('➕ POST /api/blog - Creating new post');
    
    const { title, content, excerpt, cover_image } = req.body;
    let published = req.body?.published === 'true' || req.body?.published === true ? true : false;
    const author_id = (req as any).user.id;

    console.log('📝 Blog post data:', { title, published, author_id });

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    // Generate unique slug
    let baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existingSlug = await database.query('SELECT id FROM blog_posts WHERE slug = ?', [slug]);
      if (existingSlug.rows.length === 0) break;
      slug = `${baseSlug}-${counter++}`;
    }

    // cover_image should be a URL provided by client
    const coverImageUrl = cover_image || null;

    const result = await database.query(`
      INSERT INTO blog_posts (title, slug, content, excerpt, cover_image, published, author_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [title, slug, content, excerpt, coverImageUrl, published, author_id]);

    // Get the created post
    const createdPost = await database.query('SELECT * FROM blog_posts WHERE id = ?', [result.insertId]);

    console.log('✅ Blog post created successfully:', createdPost.rows[0]);
    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      post: createdPost.rows[0],
      data: createdPost.rows[0]
    });
  } catch (error: any) {
    console.error('❌ Error creating blog post:', error);
    res.status(500).json({ success: false, error: 'Error creating blog post', details: error.message });
  }
});

// PUT /api/blog/:id - Update blog post
// PUT /api/blog/:id - Update blog post (no file upload)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 PUT /api/blog/${id} - Updating post`);
    
    const user = (req as any).user;

    // Check if post exists
    const existingPost = await database.query('SELECT * FROM blog_posts WHERE id = ?', [id]);
    if (existingPost.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Blog post not found' });
    }

    const post = existingPost.rows[0];
    const isAdmin = !!(user && (user.is_admin || user.isAdmin));
    const isAuthor = !!(user && user.id === post.author_id);

    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this post' });
    }

    const { title, content, excerpt, cover_image } = req.body;
    let published = undefined;
    if (typeof req.body.published !== 'undefined') {
      published = req.body.published === 'true' || req.body.published === true;
    }

    let updateFields: string[] = [];
    const params: any[] = [];

    if (title) {
      updateFields.push('title = ?');
      params.push(title);

      // Update slug if title changed
      if (title !== post.title) {
        let baseSlug = generateSlug(title);
        let slug = baseSlug;
        let counter = 1;
        while (true) {
          const existingSlug = await database.query('SELECT id FROM blog_posts WHERE slug = ? AND id != ?', [slug, id]);
          if (existingSlug.rows.length === 0) break;
          slug = `${baseSlug}-${counter++}`;
        }
        updateFields.push('slug = ?');
        params.push(slug);
      }
    }

    if (typeof content !== 'undefined') {
      updateFields.push('content = ?');
      params.push(content);
    }

    if (typeof excerpt !== 'undefined') {
      updateFields.push('excerpt = ?');
      params.push(excerpt);
    }

    if (typeof published !== 'undefined') {
      updateFields.push('published = ?');
      params.push(published);
    }

    // Handle cover image URL from client
    if (typeof cover_image !== 'undefined') {
      updateFields.push('cover_image = ?');
      params.push(cover_image);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    // Add updated_at and id
    updateFields.push('updated_at = NOW()');
    params.push(id);

    await database.query(`UPDATE blog_posts SET ${updateFields.join(', ')} WHERE id = ?`, params);

    // Get the updated post
    const updatedPost = await database.query('SELECT * FROM blog_posts WHERE id = ?', [id]);

    console.log(`✅ Blog post ${id} updated successfully for Medsaidabidi02`);
    res.json({
      success: true,
      message: 'Blog post updated successfully',
      post: updatedPost.rows[0],
      data: updatedPost.rows[0]
    });
  } catch (error) {
    console.error(`❌ Error updating blog post ${req.params.id} for Medsaidabidi02:`, error);
    res.status(500).json({ success: false, error: 'Error updating blog post' });
  }
});

// DELETE /api/blog/:id - Delete blog post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/blog/${id} - Deleting post at 2025-09-09 15:15:29`);
    
    const user = (req as any).user;

    const existingPost = await database.query('SELECT * FROM blog_posts WHERE id = ?', [id]);
    if (existingPost.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Blog post not found' });
    }

    const post = existingPost.rows[0];
    const isAdmin = !!(user && (user.is_admin || user.isAdmin));
    const isAuthor = !!(user && user.id === post.author_id);

    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this post' });
    }

    await database.query('DELETE FROM blog_posts WHERE id = ?', [id]);

    // Note: Image files must be deleted manually from storage if needed
    console.log(`✅ Blog post ${id} (${post.title}) deleted from database`);
    
    if (post.cover_image) {
      console.log(`⚠️ Note: Cover image must be deleted manually from storage: ${post.cover_image}`);
    }

    console.log(`✅ Blog post ${id} (${post.title}) deleted successfully`);
    res.json({ success: true, message: 'Blog post deleted successfully', data: { id, title: post.title } });
  } catch (error) {
    console.error(`❌ Error deleting blog post ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Error deleting blog post' });
  }
});

console.log('📝 Blog routes module loaded at 2025-09-09 15:15:29');

export { router as blogRoutes };
export default router;