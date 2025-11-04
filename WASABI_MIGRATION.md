# Wasabi S3 Video Storage Migration Guide

This document describes the migration from local video storage to Wasabi S3 with Cloudflare CDN caching.

## Overview

The application now supports **dual storage modes**:
- **Wasabi S3 + Cloudflare CDN** (production, recommended)
- **Local file storage** (development fallback)

The system automatically switches between these modes based on the presence of Wasabi credentials in the environment.

## Architecture

```
Video Upload Flow:
User → Backend API → Wasabi S3 → Cloudflare CDN → End User

Video Playback Flow:
User → Cloudflare CDN (cached) → Wasabi S3 (if not cached) → User
```

## Environment Configuration

### Required Environment Variables

Add these to your `.env` file (backend):

```bash
# Wasabi S3 Configuration
WASABI_ACCESS_KEY=your-access-key
WASABI_SECRET_KEY=your-secret-key
WASABI_BUCKET_NAME=my-educational-platform
WASABI_REGION=eu-central-1
WASABI_ENDPOINT=https://s3.eu-central-1.wasabisys.com
CDN_DOMAIN=cdn.cliniquedesjuristes.com
```

### Fallback Behavior

If Wasabi credentials are **not configured**, the system automatically falls back to:
- Local file storage using multer.diskStorage
- Files stored in `backend/uploads/videos/`
- URLs served directly from the backend

## Key Changes

### Backend Changes

1. **New Service: `wasabiClient.ts`**
   - S3-compatible client for Wasabi
   - Handles uploads, deletions, and URL generation
   - Supports multipart uploads for large files (>50MB)
   - Sets proper caching headers: `Cache-Control: public, max-age=31536000, immutable`

2. **Updated: `fileUpload.ts`**
   - Dual mode support (Wasabi vs Local)
   - Uses `multer.memoryStorage()` for Wasabi uploads
   - Helper functions: `uploadVideo()`, `uploadThumbnail()`, `uploadImage()`
   - Returns S3 keys for database storage

3. **Updated: `videos.ts` (routes)**
   - Modified upload endpoint to use Wasabi
   - Added CDN URL transformation helpers
   - Returns `video_url` and `thumbnail_url` in responses
   - Updated deletion to remove files from S3

4. **Updated: `config/index.ts`**
   - Added Wasabi configuration section

### Frontend Changes

1. **Updated: `videoService.ts`**
   - Added `video_url` and `thumbnail_url` to Video interface
   - Updated `getVideoStreamUrl()` to prioritize CDN URLs
   - Updated `getThumbnailUrl()` to prioritize CDN URLs
   - Backwards compatible with local storage URLs

2. **Updated Video Players**
   - `CustomVideoPlayer.tsx`
   - `VideoPreview.tsx`
   - `ProfessionalVideoPlayer.tsx`
   - `VideoManagement.tsx`
   - All now use `videoService` helpers instead of manual URL construction

## Cloudflare CDN Configuration

### Required Cloudflare Settings

1. **Create a CNAME record**:
   ```
   cdn.cliniquedesjuristes.com → s3.eu-central-1.wasabisys.com
   ```

2. **Enable Proxy** (orange cloud) for the CNAME

3. **Page Rules** (optional but recommended):
   ```
   URL: cdn.cliniquedesjuristes.com/*
   
   Settings:
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 year
   - Browser Cache TTL: 1 year
   ```

4. **Caching Settings**:
   - Respect existing headers: ON
   - Minimum Cache TTL: 1 year

## Database Schema

Video records store the **S3 key** (not the full URL) in `video_path`:

```sql
-- Example video_path values:
videos/abc123-1234567890.mp4
thumbnails/def456-0987654321.jpg
```

The backend constructs the full CDN URL when serving API responses:
```
https://cdn.cliniquedesjuristes.com/videos/abc123-1234567890.mp4
```

## Upload Process

### For Files < 50MB
1. File uploaded to backend (memory buffer)
2. Backend uploads to Wasabi using `PutObjectCommand`
3. S3 key stored in database
4. CDN URL returned to frontend

### For Files > 50MB
1. File uploaded to backend (memory buffer)
2. Backend uses multipart upload via `@aws-sdk/lib-storage`
3. Uploads in 50MB chunks with 4 concurrent streams
4. Progress tracking available
5. S3 key stored in database
6. CDN URL returned to frontend

## Security Features

1. **No credentials in frontend**
   - All S3 operations happen on backend
   - Frontend only receives CDN URLs

2. **Public read access**
   - Videos uploaded with `ACL: public-read`
   - Allows direct CDN access without signed URLs

3. **File validation**
   - Type checking (video/*, image/*)
   - Size limits (5GB for videos, 10MB for thumbnails)
   - Already implemented in `fileFilter`

## Performance Optimization

1. **Caching Headers**
   - Videos: `Cache-Control: public, max-age=31536000, immutable`
   - Cached at edge for 1 year
   - Reduces Wasabi bandwidth costs

2. **Multipart Upload**
   - Automatic for files > 50MB
   - 4 concurrent parts
   - 50MB per part
   - Faster upload speeds

3. **CDN Benefits**
   - Reduced latency (edge caching)
   - Lower Wasabi egress costs
   - Better video streaming performance
   - DDoS protection via Cloudflare

## Testing

### Test Video Upload
```bash
curl -X POST http://localhost:5001/api/videos \
  -F "title=Test Video" \
  -F "description=Test Description" \
  -F "subject_id=1" \
  -F "video=@test-video.mp4" \
  -F "thumbnail=@thumbnail.jpg"
```

### Expected Response
```json
{
  "success": true,
  "id": 123,
  "title": "Test Video",
  "video_path": "videos/uuid-timestamp.mp4",
  "video_url": "https://cdn.cliniquedesjuristes.com/videos/uuid-timestamp.mp4",
  "thumbnail_path": "thumbnails/uuid-timestamp.jpg",
  "thumbnail_url": "https://cdn.cliniquedesjuristes.com/thumbnails/uuid-timestamp.jpg"
}
```

### Verify Upload
1. Check Wasabi bucket: `my-educational-platform/videos/`
2. Access CDN URL directly: `https://cdn.cliniquedesjuristes.com/videos/uuid-timestamp.mp4`
3. Verify Cloudflare caching: Check response headers for `CF-Cache-Status`

## Migration Checklist

- [x] Install AWS SDK dependencies
- [x] Create Wasabi client service
- [x] Update backend configuration
- [x] Update file upload logic
- [x] Update video routes
- [x] Update frontend video service
- [x] Update all video players
- [x] Add environment variables
- [x] Test builds (backend + frontend)
- [ ] Configure Cloudflare DNS
- [ ] Test video upload to Wasabi
- [ ] Verify CDN caching
- [ ] Migrate existing videos (if any)
- [ ] Run security checks

## Migrating Existing Videos (Optional)

If you have videos in local storage that need to be migrated:

```bash
# Run from backend directory
node scripts/migrate-to-wasabi.js
```

(Note: Migration script needs to be created separately)

## Troubleshooting

### Videos not uploading
- Check Wasabi credentials in `.env`
- Verify bucket exists: `my-educational-platform`
- Check bucket permissions (must allow uploads)

### Videos not playing
- Verify CDN domain is proxied through Cloudflare
- Check CORS settings on Wasabi bucket
- Verify video URLs in API responses

### Cloudflare not caching
- Check Page Rules are active
- Verify Cache-Control headers are present
- Use Cloudflare dashboard to purge cache if needed

## Support

For issues related to:
- **Wasabi**: Check Wasabi console and access keys
- **Cloudflare**: Check DNS and Page Rules
- **Application**: Check backend logs for upload errors
