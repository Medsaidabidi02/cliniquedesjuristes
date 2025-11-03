# Bunny.net Storage Integration

This document describes the Bunny.net Storage integration for the Clinique des Juristes platform.

## Overview

All video files, thumbnails, and related materials are stored in Bunny.net Storage and delivered via their global CDN network. This provides:

- **Fast global delivery**: Content delivered from edge locations worldwide
- **Scalability**: No storage limits on the server
- **Security**: Signed URLs for protected video content
- **Cost-effective**: Pay only for storage and bandwidth used

## Architecture

### Storage Structure

Files are organized in Bunny.net Storage with the following structure:

```
/videos/{courseId}/{filename}.mp4       - Video files
/thumbnails/{courseId}/{filename}.jpg   - Video thumbnails
/materials/{courseId}/{filename}.pdf    - Course materials
```

**Example:**
```
/videos/1/introduction-droit-civil.mp4
/thumbnails/1/introduction-droit-civil.jpg
/materials/1/syllabus.pdf
```

### Components

#### Backend Services

1. **bunnyStorage.ts** - Bunny.net Storage API client
   - `uploadFileToBunny()` - Upload files to storage
   - `deleteFileFromBunny()` - Delete files
   - `listFilesInBunny()` - List directory contents
   - `generateSignedUrl()` - Create time-limited signed URLs
   - `getPublicUrl()` - Get public CDN URLs (for thumbnails)

2. **thumbnailGenerator.ts** - Thumbnail generation using FFmpeg
   - `generateThumbnailFromVideo()` - Extract frame from video
   - `getVideoDuration()` - Get video duration
   - `generateFallbackThumbnail()` - Optimize image thumbnails

3. **videosBunny.ts** - API routes for Bunny.net operations
   - `POST /api/videos/bunny/upload` - Upload video with thumbnail
   - `GET /api/videos/bunny/stream/:videoId` - Get signed streaming URL
   - `DELETE /api/videos/:id` - Delete video from storage

#### Frontend Integration

1. **videoService.ts** - Video service layer
   - `getVideoStreamUrl()` - Fetch signed URL for streaming
   - `getThumbnailUrl()` - Get thumbnail CDN URL
   - `uploadVideo()` - Upload to Bunny.net endpoint

2. **VideoPlayer.tsx** - Video player component
   - Async URL loading for signed URLs
   - Support for Bunny.net streaming
   - Security features maintained

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Bunny.net Storage Configuration
BUNNY_STORAGE_ZONE=cliniquedesjuristesvideos
BUNNY_STORAGE_HOST=storage.bunnycdn.com
BUNNY_WRITE_API_KEY=2618a218-10c8-469a-9353-8a7ae921-7c28-499e
BUNNY_READ_API_KEY=1fa435e1-2fbd-4c19-afb6-89a73265-0dbb-4756
BUNNY_CDN_URL=https://cliniquedesjuristesvideos.b-cdn.net

# Signed URL Settings
SIGNED_URL_EXPIRATION=14400  # 4 hours in seconds
```

### Bunny.net Storage Credentials

- **Storage Zone**: `cliniquedesjuristesvideos`
- **API Hostname**: `storage.bunnycdn.com`
- **FTP Port**: 21 (Passive mode)
- **Write/Full Access Key**: `2618a218-10c8-469a-9353-8a7ae921-7c28-499e`
- **Read-Only Key**: `1fa435e1-2fbd-4c19-afb6-89a73265-0dbb-4756`

## Usage

### Uploading Videos

#### Backend (API)

```typescript
// Upload endpoint: POST /api/videos/bunny/upload
// Accepts multipart/form-data with:
// - video: File (required)
// - thumbnail: File (optional - will be auto-generated if not provided)
// - title: string (required)
// - description: string (optional)
// - subject_id: number (required)
// - is_active: boolean (optional)

// The endpoint will:
// 1. Upload video to /videos/{courseId}/{filename}.mp4
// 2. Generate/upload thumbnail to /thumbnails/{courseId}/{filename}.jpg
// 3. Store metadata in database
// 4. Return video data with Bunny.net paths
```

#### Frontend (Admin Upload)

```typescript
import { videoService } from './lib/videoService';

const formData = new FormData();
formData.append('title', 'Introduction au Droit Civil');
formData.append('description', 'Premier cours...');
formData.append('subject_id', '123');
formData.append('video', videoFile);
formData.append('thumbnail', thumbnailFile); // Optional

const video = await videoService.uploadVideo(
  formData,
  (progress) => console.log(`Upload: ${progress}%`),
  true  // useBunny = true
);
```

### Streaming Videos

#### Backend

```typescript
// Endpoint: GET /api/videos/bunny/stream/:videoId
// Returns: { streamUrl: string, thumbnailUrl: string, video: {...} }

// The endpoint will:
// 1. Verify user has access to the video
// 2. Generate a signed URL valid for 4 hours
// 3. Return the signed URL for streaming
```

#### Frontend

```typescript
// The videoService handles this automatically
const streamUrl = await videoService.getVideoStreamUrl(video);
// Returns signed Bunny.net URL or legacy URL
```

### Accessing Thumbnails

Thumbnails are public and don't require signed URLs:

```typescript
const thumbnailUrl = videoService.getThumbnailUrl(video);
// Returns: https://cliniquedesjuristesvideos.b-cdn.net/thumbnails/1/video.jpg
```

## Security

### Signed URLs

Videos use signed URLs for security:

1. **Token Generation**: SHA-256 hash of `API_KEY + path + expires`
2. **URL Format**: `https://zone.b-cdn.net/path?token=TOKEN&expires=TIMESTAMP`
3. **Expiration**: Default 4 hours (configurable via `SIGNED_URL_EXPIRATION`)
4. **Access Control**: Backend verifies user enrollment before generating signed URL

### Access Control

```typescript
// In videosBunny.ts route
// 1. Check if video is free
if (!video.is_free) {
  // 2. Verify user is authenticated
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // 3. Check course enrollment
  const enrollment = await checkEnrollment(userId, courseId);
  if (!enrollment) {
    return res.status(403).json({ message: 'Access denied' });
  }
}

// 4. Generate signed URL
const signedUrl = bunnyStorage.generateSignedUrl(video.video_path);
```

## File Operations

### Upload Flow

```
User uploads video → Multer temp storage → Read into buffer → 
Upload to Bunny.net → Generate thumbnail → Upload thumbnail → 
Store metadata in DB → Clean temp files → Return success
```

### Delete Flow

```
Delete request → Get video metadata from DB → 
Delete video from Bunny.net → Delete thumbnail from Bunny.net → 
Delete DB record → Return success
```

### Rollback on Error

If database insert fails after Bunny.net upload:
1. Delete uploaded video from Bunny.net
2. Delete uploaded thumbnail from Bunny.net
3. Clean temporary files
4. Return error

## Thumbnail Generation

Thumbnails are automatically generated from videos using FFmpeg:

```typescript
// Extract frame at 3 seconds
const thumbnail = await thumbnailGenerator.generateThumbnailFromVideo({
  inputBuffer: videoBuffer,
  timestamp: 3,  // seconds
  width: 640,
  height: 360
});

// Optimize with Sharp
const optimized = await sharp(thumbnail)
  .resize(640, 360, { fit: 'cover' })
  .jpeg({ quality: 85 })
  .toBuffer();
```

## Testing

### Test Script

Run the Bunny.net storage test:

```bash
cd backend
node test-bunny-storage.js
```

This tests:
- File upload
- Directory listing
- Signed URL generation
- File deletion

**Note**: Will fail in sandbox environments due to network restrictions. Works in production.

### Manual Testing

1. **Upload a video**:
   ```bash
   curl -X POST http://localhost:5001/api/videos/bunny/upload \
     -F "video=@test.mp4" \
     -F "title=Test Video" \
     -F "subject_id=1"
   ```

2. **Get stream URL**:
   ```bash
   curl http://localhost:5001/api/videos/bunny/stream/123
   ```

3. **Test playback**: Open signed URL in browser

## Monitoring

### Bunny.net Dashboard

Access the Bunny.net control panel to monitor:
- Storage usage
- Bandwidth consumption
- File statistics
- CDN performance

### Database Queries

Check uploaded videos:
```sql
SELECT id, title, video_path, thumbnail_path, file_size, duration 
FROM videos 
WHERE video_path LIKE '/videos/%'
ORDER BY created_at DESC;
```

## Troubleshooting

### Common Issues

1. **Upload fails with 403**
   - Check `BUNNY_WRITE_API_KEY` is correct
   - Verify API key has write permissions

2. **Video won't play**
   - Check signed URL hasn't expired (4 hour limit)
   - Verify user has access to the course
   - Check CORS settings if accessing from different domain

3. **Thumbnail not generated**
   - Verify FFmpeg is installed: `ffmpeg -version`
   - Check video format is supported
   - Review logs for FFmpeg errors

4. **File not found errors**
   - Check file was uploaded successfully
   - Verify correct storage zone name
   - Allow time for CDN propagation (usually <1 minute)

### Debug Logging

Enable detailed logging in development:

```typescript
// Backend - already enabled by default
console.log('📤 Uploading to Bunny.net:', filePath);
console.log('✅ Upload successful:', cdnUrl);

// Frontend
localStorage.setItem('debug', 'true');
```

## Migration

### Migrating Existing Videos

To migrate videos from local storage to Bunny.net:

1. **Read local video files**
2. **Upload to Bunny.net**
3. **Update database paths**
4. **Verify uploads**
5. **Delete local files**

Script template:
```typescript
import bunnyStorage from './src/services/bunnyStorage';
import database from './src/config/database';
import fs from 'fs';

async function migrateVideo(videoId: number) {
  const video = await database.query('SELECT * FROM videos WHERE id = ?', [videoId]);
  const localPath = `./uploads/videos/${video.file_path}`;
  const buffer = fs.readFileSync(localPath);
  
  const bunnyPath = bunnyStorage.generateVideoPath(video.course_id, video.file_path);
  await bunnyStorage.uploadFileToBunny({
    filePath: bunnyPath,
    fileBuffer: buffer,
    contentType: video.mime_type
  });
  
  await database.query('UPDATE videos SET video_path = ?, file_path = ? WHERE id = ?', 
    [bunnyPath, bunnyPath, videoId]);
    
  console.log(`✅ Migrated video ${videoId}`);
}
```

## Performance Optimization

### CDN Caching

Bunny.net automatically caches files at edge locations:
- **Videos**: Cached for 24 hours
- **Thumbnails**: Cached for 7 days
- **Purge cache**: Use Bunny.net dashboard if needed

### Bandwidth Optimization

- Use appropriate video quality (don't upload 4K if 1080p is sufficient)
- Generate multiple resolutions for adaptive streaming (future enhancement)
- Compress videos before upload when possible

### Storage Costs

Monitor and optimize:
- Delete unused videos promptly
- Archive old content to cheaper storage if needed
- Review storage usage monthly

## Future Enhancements

1. **Adaptive Streaming**: Generate multiple resolutions (360p, 720p, 1080p)
2. **HLS Support**: Create HLS playlists for better streaming
3. **Video Processing**: Automatic transcoding to optimal formats
4. **Analytics**: Track video views, watch time, engagement
5. **Direct Upload**: Browser → Bunny.net (skip backend server)
6. **Resumable Uploads**: Support for large file uploads with resume capability

## Resources

- [Bunny.net Storage API Docs](https://docs.bunny.net/reference/storage-api)
- [Bunny.net Dashboard](https://dash.bunny.net)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Video.js Player Library](https://videojs.com/) - Alternative player option

## Support

For issues or questions:
1. Check this documentation
2. Review logs in backend console
3. Test with the test script
4. Check Bunny.net status page
5. Contact Bunny.net support if needed
