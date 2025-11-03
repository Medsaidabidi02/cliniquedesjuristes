# Bunny.net Integration - Testing Guide

This guide provides step-by-step instructions for testing the Bunny.net Storage integration.

## Prerequisites

Before testing, ensure:

1. ✅ FFmpeg is installed: `ffmpeg -version`
2. ✅ Backend dependencies installed: `cd backend && npm install`
3. ✅ Frontend dependencies installed: `cd frontend && npm install`
4. ✅ Environment variables configured in `backend/.env`
5. ✅ Database is running and accessible

## Environment Setup

### 1. Configure Environment Variables

Create/update `backend/.env`:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database Configuration
DATABASE_URL=mysql://legal_app_user:ROOT@localhost:3307/legal_education_mysql5

# Bunny.net Storage Configuration
BUNNY_STORAGE_ZONE=cliniquedesjuristesvideos
BUNNY_STORAGE_HOST=storage.bunnycdn.com
BUNNY_WRITE_API_KEY=2618a218-10c8-469a-9353-8a7ae921-7c28-499e
BUNNY_READ_API_KEY=1fa435e1-2fbd-4c19-afb6-89a73265-0dbb-4756
BUNNY_CDN_URL=https://cliniquedesjuristesvideos.b-cdn.net
SIGNED_URL_EXPIRATION=14400

# Security
JWT_SECRET=your-secret-key-here
VIDEO_SECRET=your-video-secret-here
JWT_EXPIRES_IN=24h

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5001
BASE_URL=http://localhost:5001
```

### 2. Start the Development Environment

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Terminal 3 - Database (if not already running):**
```bash
# MySQL 5 on port 3307
mysql.server start
```

## Test Scenarios

### Test 1: Bunny.net API Connection

**Description**: Verify that the backend can communicate with Bunny.net Storage API.

**Note**: This test will fail in sandbox environments due to network restrictions. It will work in production with proper network access.

```bash
cd backend
node test-bunny-storage.js
```

**Expected Output (in production)**:
```
🧪 Testing Bunny.net Storage Integration
============================================================

📤 Test 1: Uploading test file...
   Path: /test/test-1234567890.txt
   ✅ File uploaded successfully!
   URL: https://cliniquedesjuristesvideos.b-cdn.net/test/test-1234567890.txt

📋 Test 2: Listing files in /test/ directory...
   ✅ Found 1 file(s)
      - test-1234567890.txt (52 bytes)

🔐 Test 3: Generating signed URL...
   ✅ Signed URL generated:
   https://cliniquedesjuristesvideos.b-cdn.net/test/test-1234567890.txt?token=...

📥 Test 4: Verifying file download...
   ✅ File content verified correctly!

🗑️ Test 5: Deleting test file...
   ✅ File deleted successfully!

============================================================
✅ All tests completed successfully!
```

**Expected Output (in sandbox)**:
```
❌ Test failed: getaddrinfo ENOTFOUND storage.bunnycdn.com
```
This is expected and the integration will work in production.

### Test 2: Video Upload via Admin Interface

**Description**: Upload a video through the admin interface and verify it's stored in Bunny.net.

**Steps**:

1. **Login as Admin**
   - Navigate to: `http://localhost:3000`
   - Login with admin credentials
   - Go to Admin Dashboard

2. **Upload Video**
   - Click "Upload Video" or navigate to Video Management
   - Fill in the form:
     - **Title**: "Test Video - Introduction"
     - **Description**: "This is a test video upload"
     - **Course/Subject**: Select any active subject
     - **Video File**: Upload a small MP4 file (e.g., 5-10 MB for testing)
     - **Thumbnail** (optional): Upload a JPG image or leave empty for auto-generation
   - Click "Upload"

3. **Verify Upload**
   - Watch the progress bar reach 100%
   - Check for success message
   - Video should appear in the video list

4. **Check Backend Logs**
   Look for logs like:
   ```
   📤 POST /api/videos/bunny/upload - Bunny.net Upload
   📖 Reading video file...
   📍 Video will be uploaded to: /videos/1/test-video.mp4
   ☁️ Uploading video to Bunny.net...
   ✅ Video uploaded: https://cliniquedesjuristesvideos.b-cdn.net/videos/1/test-video.mp4
   ⏱️ Extracting video duration...
   ✅ Video duration: 30 seconds
   🎨 Generating thumbnail from video...
   ☁️ Uploading generated thumbnail to Bunny.net...
   ✅ Generated thumbnail uploaded
   🔄 Inserting video metadata into database...
   ✅ Video uploaded successfully
   ```

5. **Verify Database**
   ```sql
   SELECT id, title, video_path, thumbnail_path, file_size, duration 
   FROM videos 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   
   Expected:
   - `video_path`: `/videos/{courseId}/{filename}.mp4`
   - `thumbnail_path`: `/thumbnails/{courseId}/{filename}.jpg`
   - `file_size`: Size of uploaded video
   - `duration`: Duration in seconds

### Test 3: Video Playback with Signed URLs

**Description**: Test that videos can be streamed using signed URLs.

**Steps**:

1. **Navigate to Course Page**
   - Go to: `http://localhost:3000/courses`
   - Click on a course that has videos
   - Click "Voir contenu" or view course details

2. **Play Video**
   - Click on a video to play
   - Video player should load
   - Video should start playing

3. **Check Network Requests**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Filter by "videos" or "bunny"
   - Look for request to `/api/videos/bunny/stream/{videoId}`
   - Should return JSON with `streamUrl` containing signed Bunny.net URL
   - Example response:
     ```json
     {
       "success": true,
       "streamUrl": "https://cliniquedesjuristesvideos.b-cdn.net/videos/1/video.mp4?token=abc123&expires=1234567890",
       "thumbnailUrl": "https://cliniquedesjuristesvideos.b-cdn.net/thumbnails/1/video.jpg",
       "video": { ... }
     }
     ```

4. **Verify Signed URL**
   - Copy the `streamUrl` from response
   - Paste into browser (should play video)
   - Wait 4+ hours, try again (should fail - expired)

### Test 4: Thumbnail Display

**Description**: Verify thumbnails are displayed from Bunny.net CDN.

**Steps**:

1. **Navigate to Videos List**
   - Go to admin video management
   - Or browse courses page

2. **Check Thumbnail Images**
   - Right-click on a video thumbnail
   - Select "Inspect" or "Inspect Element"
   - Check the `src` attribute of the `<img>` tag
   - Should be: `https://cliniquedesjuristesvideos.b-cdn.net/thumbnails/{courseId}/{filename}.jpg`

3. **Verify Direct Access**
   - Copy thumbnail URL
   - Paste into new browser tab
   - Thumbnail should load (public, no authentication needed)

### Test 5: Access Control

**Description**: Test that video access is restricted based on user enrollment.

**Steps**:

1. **Test Unauthenticated Access**
   - Logout or use incognito mode
   - Try to access: `http://localhost:5001/api/videos/bunny/stream/1`
   - Expected: 401 Unauthorized (if video is not free)

2. **Test Enrolled User**
   - Login as user enrolled in course
   - Request stream URL for video in enrolled course
   - Expected: 200 OK with signed URL

3. **Test Non-Enrolled User**
   - Login as user NOT enrolled in course
   - Request stream URL for video in non-enrolled course
   - Expected: 403 Forbidden

4. **Test Free Videos**
   - Mark a video as `is_free = true` in database
   - Request stream URL without authentication
   - Expected: 200 OK with signed URL

### Test 6: Video Deletion

**Description**: Test that videos are deleted from both Bunny.net and database.

**Steps**:

1. **Delete via Admin Interface**
   - Go to admin video management
   - Find a test video
   - Click delete button
   - Confirm deletion

2. **Check Backend Logs**
   ```
   🗑️ DELETE /api/videos/1 - Bunny.net version
   🗑️ Deleting video from Bunny.net: /videos/1/test.mp4
   ✅ File deleted from Bunny.net
   🗑️ Deleting thumbnail from Bunny.net: /thumbnails/1/test.jpg
   ✅ File deleted from Bunny.net
   ✅ Video 1 deleted successfully
   ```

3. **Verify Database**
   ```sql
   SELECT * FROM videos WHERE id = 1;
   ```
   Expected: No rows (deleted)

4. **Verify Bunny.net** (if you have access)
   - Login to Bunny.net dashboard
   - Navigate to storage zone files
   - Confirm video and thumbnail are deleted

### Test 7: Thumbnail Auto-Generation

**Description**: Test that thumbnails are automatically generated from videos when not provided.

**Steps**:

1. **Upload Video Without Thumbnail**
   - Use admin interface
   - Upload video file
   - Do NOT upload thumbnail
   - Submit form

2. **Check Logs for Thumbnail Generation**
   ```
   🎨 Generating thumbnail from video...
   📝 Wrote video to temp file: /tmp/video-1234567890.mp4
   ✅ Thumbnail generated with ffmpeg
   ✅ Thumbnail optimized with sharp
   ☁️ Uploading generated thumbnail to Bunny.net...
   ✅ Generated thumbnail uploaded
   ```

3. **Verify Thumbnail Exists**
   - Check video list in admin
   - Thumbnail should be displayed
   - URL should be Bunny.net CDN URL

### Test 8: Large File Upload

**Description**: Test handling of large video files.

**Steps**:

1. **Prepare Large Video**
   - Use a video file > 100 MB (but < 1 GB for testing)

2. **Upload via Admin Interface**
   - Select large video file
   - Monitor progress bar
   - Should show incremental progress (0%, 10%, 20%... 100%)

3. **Monitor Backend**
   - Check memory usage (should not spike excessively)
   - Check temp file cleanup
   - Verify upload completes successfully

4. **Check Timeouts**
   - Upload should complete within 30 minutes
   - No timeout errors should occur

### Test 9: Error Handling & Rollback

**Description**: Test that errors are handled gracefully and rollback works.

**Steps**:

1. **Simulate Database Error**
   - Temporarily break database connection
   - Or set invalid `subject_id`
   - Try to upload video

2. **Check Rollback**
   - Backend should attempt to delete uploaded files from Bunny.net
   - Logs should show:
     ```
     ❌ Video upload error: ...
     🔄 Rolling back: Deleting video from Bunny.net...
     🔄 Rolling back: Deleting thumbnail from Bunny.net...
     ```

3. **Verify No Orphaned Files**
   - Check Bunny.net storage (if accessible)
   - No files should be left behind
   - Database should not have partial records

## Performance Testing

### Test 10: Upload Speed

**Description**: Measure upload performance to Bunny.net.

**Test Files**:
- Small: 10 MB video
- Medium: 100 MB video
- Large: 500 MB video

**Measure**:
- Time to upload to backend
- Time to upload to Bunny.net
- Total processing time (including thumbnail)

**Expected**: 
- Depends on network speed
- Should be comparable to direct FTP upload speeds
- Thumbnail generation adds 2-5 seconds

### Test 11: Streaming Performance

**Description**: Test video streaming quality and buffering.

**Steps**:

1. **Play Video**
   - Start playback
   - Monitor buffering
   - Seek to different positions

2. **Check Metrics**
   - Initial load time: < 2 seconds
   - Buffering during playback: Minimal
   - Seek response: < 1 second

3. **Test on Different Networks**
   - Fast WiFi
   - Slow 3G/4G
   - Should adapt and play smoothly

## Troubleshooting Common Issues

### Issue: Upload fails with "ENOTFOUND storage.bunnycdn.com"

**Cause**: Network blocked in sandbox environment

**Solution**: 
- Expected in development/sandbox
- Will work in production with internet access
- Test with Bunny.net test script to verify

### Issue: Thumbnail generation fails

**Cause**: FFmpeg not installed or video format not supported

**Solution**:
```bash
# Install FFmpeg
sudo apt-get install ffmpeg  # Ubuntu/Debian
brew install ffmpeg          # macOS

# Verify installation
ffmpeg -version
```

### Issue: Video won't play after upload

**Cause**: Signed URL expired or access denied

**Solution**:
- Check signed URL hasn't expired (4 hour limit)
- Verify user has access to course
- Check browser console for errors
- Verify CORS settings

### Issue: Database insert fails

**Cause**: Missing required fields or invalid data

**Solution**:
- Check all required fields are provided
- Verify `subject_id` exists in database
- Check `course_id` exists
- Review backend error logs

## Test Results Checklist

Use this checklist to track test completion:

- [ ] Test 1: Bunny.net API Connection (note: will fail in sandbox)
- [ ] Test 2: Video Upload via Admin Interface
- [ ] Test 3: Video Playback with Signed URLs
- [ ] Test 4: Thumbnail Display
- [ ] Test 5: Access Control
- [ ] Test 6: Video Deletion
- [ ] Test 7: Thumbnail Auto-Generation
- [ ] Test 8: Large File Upload
- [ ] Test 9: Error Handling & Rollback
- [ ] Test 10: Upload Speed (Performance)
- [ ] Test 11: Streaming Performance

## Production Deployment Testing

Before deploying to production:

1. **Update Environment Variables**
   - Use production database URL
   - Verify Bunny.net credentials
   - Set `NODE_ENV=production`

2. **Test in Production-Like Environment**
   - Deploy to staging server
   - Run all tests above
   - Monitor for 24 hours

3. **Verify Bunny.net Dashboard**
   - Check storage usage
   - Monitor bandwidth
   - Review file structure

4. **Load Testing**
   - Simulate multiple concurrent uploads
   - Test multiple concurrent streams
   - Monitor server resources

## Support

If you encounter issues during testing:

1. Check backend console logs
2. Check frontend browser console
3. Review `BUNNY_NET_INTEGRATION.md`
4. Check Bunny.net status page
5. Verify all environment variables are set correctly

## Automated Testing (Future)

Consider adding:
- Unit tests for Bunny.net service
- Integration tests for upload/download
- E2E tests with Cypress/Playwright
- Load testing with k6 or Artillery
