# Database Indexing Recommendations for Performance

This document outlines recommended database indexes to improve query performance based on analysis of the codebase.

## Recommended Indexes

### 1. Sessions Table
The sessions table is frequently queried by user_id, especially for active sessions.

```sql
-- Index for user session queries
CREATE INDEX idx_sessions_user_id_valid ON sessions(user_id, valid, is_active);

-- Index for session activity updates
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);

-- Index for cleanup operations
CREATE INDEX idx_sessions_created_at ON sessions(created_at) WHERE valid = FALSE;
```

**Impact:** Improves performance of:
- `getUserSessions()` - O(log n) instead of O(n)
- `getActiveUserSessions()` - O(log n) instead of O(n)
- `cleanupOldSessions()` - Faster deletion of old sessions
- `cleanupStaleSessions()` - Faster identification of stale sessions

### 2. Courses Table
Courses are frequently queried with subjects and videos joined.

```sql
-- Index for active courses queries
CREATE INDEX idx_courses_is_active ON courses(is_active, created_at);

-- Index for category filtering
CREATE INDEX idx_courses_category ON courses(category) WHERE is_active = TRUE;
```

**Impact:** Improves performance of:
- Course list endpoint (GET /api/courses)
- Category filtering
- Course ordering by created_at

### 3. Subjects Table
Subjects are frequently queried by course_id.

```sql
-- Composite index for subject queries
CREATE INDEX idx_subjects_course_active ON subjects(course_id, is_active, order_index);
```

**Impact:** Improves performance of:
- Subject list by course (GET /api/subjects/course/:id)
- Course aggregation queries (counting subjects per course)
- Subject ordering

### 4. Videos Table
Videos are frequently queried by subject_id.

```sql
-- Composite index for video queries
CREATE INDEX idx_videos_subject_active ON videos(subject_id, is_active, order_index);

-- Index for video file lookups
CREATE INDEX idx_videos_video_path ON videos(video_path);
```

**Impact:** Improves performance of:
- Video list by subject
- Video aggregation in course queries
- Video file streaming lookups

### 5. User Courses Table
User course assignments are frequently queried.

```sql
-- Composite index for user course lookups
CREATE INDEX idx_user_courses_user_id ON user_courses(user_id, course_id);

-- Index for course-based lookups
CREATE INDEX idx_user_courses_course_id ON user_courses(course_id);
```

**Impact:** Improves performance of:
- User enrollment checks
- Course access validation
- User course list queries

### 6. Blog Posts Table
Blog posts are queried with various filters.

```sql
-- Composite index for published posts
CREATE INDEX idx_blog_posts_published ON blog_posts(published, created_at);

-- Index for author queries
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id, published);

-- Full-text search index for content
CREATE FULLTEXT INDEX idx_blog_posts_search ON blog_posts(title, content);
```

**Impact:** Improves performance of:
- Published posts listing
- Author-based queries
- Search functionality

### 7. Login Attempts Table
Login attempts are queried for rate limiting.

```sql
-- Index for user login attempt queries
CREATE INDEX idx_login_attempts_user ON login_attempts(user_id, attempted_at);

-- Index for IP-based rate limiting
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);
```

**Impact:** Improves performance of:
- Rate limiting checks
- Login attempt cleanup
- Security monitoring

## Implementation Notes

1. **Before creating indexes:**
   - Backup your database
   - Test in a development environment first
   - Monitor index size and performance impact

2. **Index maintenance:**
   - Regularly analyze index usage with `SHOW INDEX`
   - Remove unused indexes to reduce write overhead
   - Rebuild indexes periodically: `OPTIMIZE TABLE table_name`

3. **Trade-offs:**
   - Indexes speed up reads but slow down writes
   - Each index increases storage requirements
   - Over-indexing can hurt performance

## Performance Monitoring

After implementing indexes, monitor:

```sql
-- Check index usage
SHOW INDEX FROM table_name;

-- Check query execution plans
EXPLAIN SELECT ... FROM ...;

-- Monitor slow queries
SHOW FULL PROCESSLIST;
```

## Estimated Performance Improvements

Based on typical query patterns:
- **Courses endpoint:** 40-60% faster (with caching: 90% faster on cache hits)
- **User sessions:** 50-70% faster
- **Video queries:** 30-50% faster
- **Blog search:** 80-90% faster (with full-text index)

## Migration Script

Create a migration file to apply these indexes:

```sql
-- Run this as a single transaction
START TRANSACTION;

-- Sessions indexes
CREATE INDEX idx_sessions_user_id_valid ON sessions(user_id, valid, is_active);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);

-- Courses indexes
CREATE INDEX idx_courses_is_active ON courses(is_active, created_at);
CREATE INDEX idx_courses_category ON courses(category) WHERE is_active = TRUE;

-- Subjects indexes
CREATE INDEX idx_subjects_course_active ON subjects(course_id, is_active, order_index);

-- Videos indexes
CREATE INDEX idx_videos_subject_active ON videos(subject_id, is_active, order_index);

-- User courses indexes
CREATE INDEX idx_user_courses_user_id ON user_courses(user_id, course_id);

-- Blog posts indexes
CREATE INDEX idx_blog_posts_published ON blog_posts(published, created_at);

COMMIT;
```
