# Subject-Level Assignment Feature

## Overview
This feature enhances the existing course assignment functionality to support selective subject access for users. Admins can now assign either an entire course OR specific subjects from a course to users.

## Database Schema Changes

### Migration: `add_subject_level_assignments.sql`
A new migration file has been created that adds subject-level assignment support:

```sql
-- Adds subject_id column to user_courses table (nullable)
ALTER TABLE user_courses 
ADD COLUMN subject_id INT NULL DEFAULT NULL;

-- Adds foreign key constraint
ALTER TABLE user_courses 
ADD CONSTRAINT fk_user_courses_subject 
FOREIGN KEY (subject_id) REFERENCES subjects(id) 
ON DELETE CASCADE;

-- Performance indexes
CREATE INDEX idx_user_courses_subject_id ON user_courses(subject_id);
CREATE INDEX idx_user_course_subject ON user_courses(user_id, course_id, subject_id);

-- Unique constraint for user+course+subject combination
ALTER TABLE user_courses 
ADD UNIQUE KEY unique_user_course_subject (user_id, course_id, subject_id);
```

**To apply this migration:**
1. Connect to your MySQL database
2. Run the SQL file: `mysql -u username -p database_name < backend/migrations/add_subject_level_assignments.sql`

## API Changes

### POST /api/user-courses/enroll
**Enhanced to support subject-level enrollment**

**Request Body:**
```json
{
  "userId": 1,
  "courseId": 5,
  "subjectIds": [10, 11, 12]  // Optional: if omitted, enrolls in entire course
}
```

**Examples:**

1. **Enroll user in entire course (backward compatible):**
```bash
curl -X POST http://localhost:5000/api/user-courses/enroll \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "courseId": 5}'
```

2. **Enroll user in specific subjects:**
```bash
curl -X POST http://localhost:5000/api/user-courses/enroll \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "courseId": 5, "subjectIds": [10, 11]}'
```

**Response:**
```json
{
  "success": true,
  "message": "User enrolled in 2 subject(s)",
  "enrollment": {
    "userId": 1,
    "courseId": 5,
    "userName": "John Doe",
    "courseTitle": "Introduction to Law",
    "subjects": [
      {"subjectId": 10, "title": "Constitutional Law"},
      {"subjectId": 11, "title": "Criminal Law"}
    ],
    "subjectLevel": true
  }
}
```

### DELETE /api/user-courses/enroll
**Enhanced to support removing subject-level enrollments**

**Request Body:**
```json
{
  "userId": 1,
  "courseId": 5,
  "subjectIds": [10, 11]  // Optional: if omitted, removes entire course enrollment
}
```

### GET /api/user-courses/me
**Returns subject-level access information**

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": 5,
      "title": "Introduction to Law",
      "description": "...",
      "hasFullAccess": false,
      "subjects": [
        {
          "id": 10,
          "title": "Constitutional Law",
          "professor_name": "Prof. Smith",
          "hours": 20
        }
      ]
    }
  ],
  "courseIds": [5],
  "count": 1
}
```

### GET /api/user-courses/user/:id
**Admin endpoint - shows both course-level and subject-level assignments**

Same response format as `/me` but for any user (admin only).

## Frontend Changes

### ManageUserCourses Component
The admin panel now includes an enhanced UI for managing user course assignments:

**Features:**
1. **Course-level toggle**: Assign entire course with one click
2. **Expandable subject list**: Click "▶ Matières" to see available subjects
3. **Subject-level toggle**: Add/remove individual subjects
4. **Visual indicators**:
   - Green "✓ Cours complet": User has full course access
   - Blue "Partiel": User has some subjects assigned
   - Gray "Ajouter cours": No access yet

**Business Rules:**
- If user has full course access, individual subject toggles are disabled
- To manage subjects, first remove full course access
- Each subject can be individually toggled
- Visual count shows how many subjects are assigned

## Backward Compatibility

✅ **Fully backward compatible**

1. **Database:**
   - `subject_id` is nullable (NULL = full course access)
   - Existing enrollments remain unchanged
   - Migration is additive only (no data loss)

2. **API:**
   - Existing API calls without `subjectIds` work as before
   - Old code continues to work without modification
   - New functionality is opt-in via the `subjectIds` parameter

3. **Frontend:**
   - Existing course management UI still works
   - New subject UI is an enhancement
   - Gracefully handles both assignment types

## Testing Checklist

### Manual Testing

#### Backend Testing
- [ ] Test course-level enrollment (without subjectIds)
- [ ] Test subject-level enrollment (with subjectIds array)
- [ ] Test removing course-level enrollment
- [ ] Test removing subject-level enrollment
- [ ] Test GET /me returns correct access info
- [ ] Test GET /user/:id shows enrollments correctly
- [ ] Test duplicate prevention (same user+course+subject)
- [ ] Test validation (invalid subject IDs)
- [ ] Test validation (subjects from wrong course)

#### Frontend Testing
- [ ] Full course assignment toggle works
- [ ] Subject list expands/collapses
- [ ] Individual subject toggles work
- [ ] Full access prevents subject toggling
- [ ] Visual indicators show correct status
- [ ] Refresh updates enrollment status
- [ ] Multiple course management works

#### Backward Compatibility Testing
- [ ] Existing enrollments still work
- [ ] Old API calls (without subjectIds) work
- [ ] Mixed enrollments (some full, some partial) display correctly
- [ ] Migration doesn't break existing data

## Database Queries for Verification

### Check enrollment type
```sql
-- Full course access
SELECT * FROM user_courses WHERE subject_id IS NULL;

-- Subject-level access
SELECT * FROM user_courses WHERE subject_id IS NOT NULL;

-- All enrollments for a user with details
SELECT 
  u.name,
  c.title as course,
  s.title as subject,
  CASE 
    WHEN uc.subject_id IS NULL THEN 'Full Course'
    ELSE 'Subject Only'
  END as access_type
FROM user_courses uc
JOIN users u ON uc.user_id = u.id
JOIN courses c ON uc.course_id = c.id
LEFT JOIN subjects s ON uc.subject_id = s.id
WHERE u.id = 1;
```

## Rollback Instructions

If you need to rollback this feature:

```sql
-- Remove foreign key constraint
ALTER TABLE user_courses DROP FOREIGN KEY fk_user_courses_subject;

-- Remove indexes
DROP INDEX idx_user_courses_subject_id ON user_courses;
DROP INDEX idx_user_course_subject ON user_courses;

-- Remove unique constraint
ALTER TABLE user_courses DROP INDEX unique_user_course_subject;

-- Remove column
ALTER TABLE user_courses DROP COLUMN subject_id;

-- Restore old unique constraint (if it existed)
-- ALTER TABLE user_courses ADD UNIQUE KEY unique_user_course (user_id, course_id);
```

## Security Considerations

1. **Authorization**: All endpoints require admin authentication
2. **Validation**: Subject IDs are validated to belong to the specified course
3. **SQL Injection**: All queries use parameterized statements
4. **Data Integrity**: Foreign key constraints ensure referential integrity
5. **Cascade Deletion**: Deleting a subject automatically removes related enrollments

## Performance Considerations

1. **Indexes**: Added indexes on subject_id and composite index for lookups
2. **Query Optimization**: Uses LEFT JOIN to efficiently handle NULL subject_id
3. **Frontend**: Subjects are fetched once per course when modal opens
4. **Caching**: Frontend state management minimizes API calls

## Future Enhancements

Possible improvements for future versions:
1. Bulk subject assignment
2. Subject group templates (e.g., "First Year", "Second Year")
3. Time-limited subject access
4. Subject completion tracking
5. Subject prerequisites
6. Export/import of enrollment configurations
