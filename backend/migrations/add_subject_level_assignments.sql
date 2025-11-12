-- Migration: Add subject-level assignment support to user_courses table
-- This enables admins to assign entire courses OR specific subjects within a course to users
-- Date: 2025-10-29

-- Step 1: Add subject_id column (nullable to support both course-level and subject-level assignments)
ALTER TABLE user_courses 
ADD COLUMN subject_id INT NULL DEFAULT NULL 
AFTER course_id;

-- Step 2: Add foreign key constraint to subjects table
ALTER TABLE user_courses 
ADD CONSTRAINT fk_user_courses_subject 
FOREIGN KEY (subject_id) REFERENCES subjects(id) 
ON DELETE CASCADE;

-- Step 3: Add index for faster queries on subject assignments
CREATE INDEX idx_user_courses_subject_id ON user_courses(subject_id);

-- Step 4: Add composite index for faster lookups of user+course+subject combinations
CREATE INDEX idx_user_course_subject ON user_courses(user_id, course_id, subject_id);

-- Step 5: Modify the unique constraint to allow multiple subject assignments per user/course
-- First, check if there's an existing unique constraint on (user_id, course_id)
-- If it exists, we need to drop it and create a new one that includes subject_id

-- Drop the old unique constraint if it exists (constraint name may vary)
-- ALTER TABLE user_courses DROP INDEX unique_user_course;

-- Add new unique constraint that includes subject_id
-- This ensures a user can be enrolled in a course multiple times (once per subject)
-- But prevents duplicate enrollments for the same user+course+subject combination
-- Note: NULL values in subject_id are treated as distinct in MySQL unique constraints
ALTER TABLE user_courses 
ADD UNIQUE KEY unique_user_course_subject (user_id, course_id, subject_id);

-- Display updated table structure
DESCRIBE user_courses;

-- Add comments to document the schema
ALTER TABLE user_courses COMMENT = 
'User course and subject assignments. If subject_id is NULL, user has access to entire course. If subject_id is set, user only has access to that specific subject.';
