# 🎬 Video System Migration Guide - HLS & Object Storage

## Overview

This document explains the modernized video system that supports:
- **HLS (HTTP Live Streaming)** for adaptive bitrate streaming
- **Hetzner Object Storage** for scalable cloud storage
- **Time-limited signed URLs** for secure access
- **Automatic token refresh** for seamless long playback
- **Full backward compatibility** with existing MP4 videos

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [How It Works](#how-it-works)
3. [Database Schema Changes](#database-schema-changes)
4. [Uploading Videos](#uploading-videos)
5. [Signed URLs](#signed-urls)
6. [Maintaining the System](#maintaining-the-system)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Before (Legacy)

```
User → Frontend → Backend API → Local Filesystem → MP4 Video
```

- All videos stored locally on server
- Single MP4 file per video
- Direct file serving
- 4-hour JWT token (no refresh)
- Server handles all bandwidth

### After (Modernized)

```
User → Frontend (hls.js) → Backend API → Signed URL Generator → Hetzner S3 → HLS Segments
                                ↓
                         Token Refresh (15 min)
```

- Videos can be stored locally OR on Hetzner Object Storage
- Support for MP4 (legacy) AND HLS (segmented)
- Time-limited signed URLs (15-minute expiration)
- Automatic token refresh at 80% lifetime (12 minutes)
- CDN-ready architecture

---

## How It Works

### Video Playback Flow

#### Step 1: User Requests Video

```javascript
// Frontend requests video playback info
const playbackInfo = await videoService.getVideoPlaybackInfo(videoId);
```

**Response:**
```json
{
  "url": "https://hetzner.../video.m3u8?Signature=...",
  "expiresAt": "2025-11-06T14:45:00Z",
  "expiresIn": 900,
  "storageType": "hetzner",
  "isHLS": true,
  "contentType": "application/vnd.apple.mpegurl"
}
```

#### Step 2: Video Player Loads

```javascript
// VideoPlayer component detects HLS format
if (playbackInfo.isHLS) {
  // Use hls.js for Chrome/Firefox or native for Safari
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(playbackInfo.url);
    hls.attachMedia(videoElement);
  } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
    videoElement.src = playbackInfo.url;
  }
}
```

#### Step 3: Automatic Token Refresh

```javascript
// Schedule refresh at 80% of expiration (12 of 15 minutes)
const refreshTime = playbackInfo.expiresIn * 0.8 * 1000;

setTimeout(async () => {
  const currentTime = videoElement.currentTime;
  const wasPlaying = !videoElement.paused;
  
  // Get new signed URL
  const newPlaybackInfo = await videoService.refreshVideoToken(videoId);
  
  // Update source seamlessly
  hls.loadSource(newPlaybackInfo.url);
  hls.once('manifestParsed', () => {
    videoElement.currentTime = currentTime;
    if (wasPlaying) videoElement.play();
  });
}, refreshTime);
```

**Result:** User watches video for hours without interruption!

---

## Database Schema Changes

### New Fields Added to `videos` Table

Run the migration script: `backend/migrations/add_hls_support.sql`

```sql
ALTER TABLE videos 
ADD COLUMN storage_type ENUM('local', 'hetzner') DEFAULT 'local';

ALTER TABLE videos 
ADD COLUMN hls_manifest_path VARCHAR(500) NULL;

ALTER TABLE videos 
ADD COLUMN is_segmented BOOLEAN DEFAULT FALSE;

ALTER TABLE videos 
ADD COLUMN segment_duration INT DEFAULT 10;

CREATE INDEX idx_videos_storage_type ON videos(storage_type);
CREATE INDEX idx_videos_is_segmented ON videos(is_segmented);
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `storage_type` | ENUM('local', 'hetzner') | Where video is stored |
| `hls_manifest_path` | VARCHAR(500) | Path to .m3u8 manifest file |
| `is_segmented` | BOOLEAN | True if video is HLS format |
| `segment_duration` | INT | Duration of each segment (seconds) |
| `video_path` | VARCHAR(500) | Path to video file (existing) |

### Example Records

**Legacy MP4 Video:**
```json
{
  "id": 1,
  "video_path": "video-1234.mp4",
  "storage_type": "local",
  "is_segmented": false,
  "hls_manifest_path": null
}
```

**Modern HLS Video:**
```json
{
  "id": 2,
  "video_path": "hls/course-1/subject-5/video-456/playlist.m3u8",
  "storage_type": "hetzner",
  "is_segmented": true,
  "hls_manifest_path": "hls/course-1/subject-5/video-456/playlist.m3u8",
  "segment_duration": 10
}
```

---

## Uploading Videos

### Method 1: Traditional MP4 Upload (Unchanged)

In the admin panel:
1. Click "Ajouter une Vidéo"
2. Select "📁 Fichier MP4" mode
3. Choose MP4 file from your computer
4. Fill in title, description, and subject
5. Click submit

**Result:** Video uploads to `uploads/videos/` directory

### Method 2: HLS Path Entry (New)

#### Prerequisites

1. **Transcode video to HLS format** using FFmpeg:

```bash
ffmpeg -i input.mp4 \
  -codec: copy \
  -start_number 0 \
  -hls_time 10 \
  -hls_list_size 0 \
  -f hls \
  playlist.m3u8
```

**Output:**
```
playlist.m3u8       (manifest file)
segment-0.ts        (video segment 1)
segment-1.ts        (video segment 2)
segment-2.ts        (video segment 3)
...
```

2. **Upload to Hetzner Object Storage** using AWS CLI:

```bash
# Configure AWS CLI for Hetzner
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set region fsn1

# Upload manifest
aws s3 cp playlist.m3u8 \
  s3://clinique-videos/hls/course-1/subject-5/video-123/ \
  --endpoint-url https://fsn1.your-objectstorage.com

# Upload all segments
aws s3 cp . \
  s3://clinique-videos/hls/course-1/subject-5/video-123/ \
  --recursive --exclude "*" --include "*.ts" \
  --endpoint-url https://fsn1.your-objectstorage.com
```

3. **Add video entry in admin panel:**
   - Toggle to "🎞️ HLS (.m3u8)" mode
   - Enter manifest path: `hls/course-1/subject-5/video-123/playlist.m3u8`
   - Select storage type: "☁️ Hetzner Object Storage"
   - Fill in title and description
   - Click submit

**Result:** Video entry created pointing to HLS manifest on Hetzner

### Folder Structure

Organize videos by course and subject:

```
hetzner://clinique-videos/
├── videos/
│   ├── course-1/
│   │   ├── subject-5/
│   │   │   ├── video-123.mp4
│   │   │   └── video-124.mp4
│   │   └── subject-6/
│   │       └── video-125.mp4
│   └── course-2/
│       └── subject-10/
│           └── video-126.mp4
├── hls/
│   ├── course-1/
│   │   ├── subject-5/
│   │   │   ├── video-123/
│   │   │   │   ├── playlist.m3u8
│   │   │   │   ├── segment-0.ts
│   │   │   │   └── segment-1.ts
│   │   │   └── video-124/
│   │   │       └── ...
│   │   └── subject-6/
│   │       └── ...
│   └── course-2/
│       └── ...
└── thumbnails/
    ├── course-1/
    │   └── subject-5/
    │       ├── thumb-123.jpg
    │       └── thumb-124.jpg
    └── course-2/
        └── ...
```

---

## Signed URLs

### What Are Signed URLs?

Signed URLs are temporary URLs that provide time-limited access to private resources.

**Components:**
```
https://hetzner.../video.m3u8
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=...
  &X-Amz-Date=20251106T144500Z
  &X-Amz-Expires=900
  &X-Amz-Signature=abc123...
```

### How They Work

1. **Backend generates signature** using AWS Signature Version 4
   - Uses Hetzner access key + secret key
   - Includes expiration timestamp
   - HMAC-SHA256 cryptographic signing

2. **Hetzner validates signature** on each request
   - Checks if signature matches
   - Checks if URL is expired
   - Returns 403 if invalid or expired

3. **Frontend refreshes URL** before expiration
   - At 80% of lifetime (12 of 15 minutes)
   - Gets new signed URL
   - Swaps video source seamlessly

### Security Benefits

✅ **Time-limited:** URLs expire after 15 minutes
✅ **Cannot be forged:** Requires secret key to generate
✅ **Cannot be extended:** Must request new URL
✅ **Private bucket:** Direct access blocked without signature
✅ **No URL sharing:** Expired URLs don't work

### Configuration

In `backend/.env`:

```env
# Hetzner Object Storage
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_REGION=fsn1
HETZNER_ACCESS_KEY=your-access-key-id
HETZNER_SECRET_KEY=your-secret-access-key
HETZNER_BUCKET=clinique-videos

# Signed URL Configuration
VIDEO_URL_EXPIRATION=900           # 15 minutes (in seconds)
TOKEN_REFRESH_THRESHOLD=0.8        # Refresh at 80% of lifetime
```

**Expiration Timeline:**
```
0s ------------- 720s (12m) ------------- 900s (15m)
Start           Refresh (80%)            Expire
```

---

## Maintaining the System

### Daily Operations

#### 1. Monitor Storage Usage

```bash
# Check Hetzner bucket size
aws s3 ls s3://clinique-videos --recursive --summarize \
  --endpoint-url https://fsn1.your-objectstorage.com
```

#### 2. Check Video Playback

- Monitor backend logs for signed URL generation
- Check for 403 errors (signature/expiration issues)
- Verify token refresh is working

#### 3. Backup Considerations

**Local Videos:**
```bash
# Backup uploads directory
tar -czf videos-backup-$(date +%Y%m%d).tar.gz uploads/videos/
```

**Hetzner Videos:**
```bash
# Sync to local backup
aws s3 sync s3://clinique-videos/ ./backup-videos/ \
  --endpoint-url https://fsn1.your-objectstorage.com
```

### Troubleshooting

#### Issue: Video won't play

**Check:**
1. Is signed URL expired? (check timestamp)
2. Is Hetzner endpoint reachable?
3. Are credentials correct in `.env`?
4. Is bucket set to private?

**Solution:**
```bash
# Test Hetzner connection
aws s3 ls s3://clinique-videos/ \
  --endpoint-url https://fsn1.your-objectstorage.com

# Check bucket ACL
aws s3api get-bucket-acl --bucket clinique-videos \
  --endpoint-url https://fsn1.your-objectstorage.com
```

#### Issue: Token refresh not working

**Check frontend console:**
```
Looking for:
✅ "🔄 Refreshing video URL..."
✅ "✅ Video URL refreshed successfully"

Not:
❌ "❌ Failed to refresh video URL"
```

**Check backend logs:**
```
Looking for:
✅ "🔄 POST /api/videos/token/refresh - Refreshing URL for video X"
✅ "✅ Refreshed signed URL for video X"
```

#### Issue: HLS segments not loading

**Check:**
1. Are all segments uploaded to Hetzner?
2. Is manifest (.m3u8) path correct?
3. Are segment paths in manifest correct?

**Validate manifest:**
```bash
# Download and inspect manifest
aws s3 cp s3://clinique-videos/hls/.../playlist.m3u8 - \
  --endpoint-url https://fsn1.your-objectstorage.com

# Should contain:
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
segment-0.ts
#EXTINF:10.0,
segment-1.ts
...
```

### Performance Optimization

#### 1. CDN Integration (Optional)

Add Cloudflare in front of Hetzner:
- Caches video segments at edge
- Reduces Hetzner bandwidth costs
- Faster delivery to users

#### 2. Multiple Quality Levels

Create adaptive HLS with multiple bitrates:

```bash
# High quality (1080p)
ffmpeg -i input.mp4 -c:v libx264 -b:v 5000k -s 1920x1080 \
  -hls_time 10 -hls_list_size 0 playlist_1080p.m3u8

# Medium quality (720p)
ffmpeg -i input.mp4 -c:v libx264 -b:v 2500k -s 1280x720 \
  -hls_time 10 -hls_list_size 0 playlist_720p.m3u8

# Low quality (480p)
ffmpeg -i input.mp4 -c:v libx264 -b:v 1000k -s 854x480 \
  -hls_time 10 -hls_list_size 0 playlist_480p.m3u8

# Create master playlist
cat > master.m3u8 << EOF
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
playlist_1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
playlist_720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480
playlist_480p.m3u8
EOF
```

**Result:** hls.js automatically selects best quality for user's bandwidth

---

## Configuration

### Backend Environment Variables

Complete `.env` file:

```env
# Database
DB_HOST=localhost
DB_PORT=3307
DB_USER=your-user
DB_PASSWORD=your-password
DB_NAME=clinique_db

# Server
NODE_ENV=production
PORT=3000

# JWT Authentication
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRATION=4h

# Hetzner Object Storage (Required for cloud storage)
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_REGION=fsn1
HETZNER_ACCESS_KEY=your-hetzner-access-key
HETZNER_SECRET_KEY=your-hetzner-secret-key
HETZNER_BUCKET=clinique-videos

# Video Configuration
DEFAULT_STORAGE_TYPE=hetzner        # or 'local'
VIDEO_URL_EXPIRATION=900            # 15 minutes in seconds
VIDEO_TOKEN_LIFETIME=1800           # 30 minutes in seconds
TOKEN_REFRESH_THRESHOLD=0.8         # Refresh at 80% of lifetime
MAX_TOKEN_REFRESHES_PER_HOUR=10     # Rate limit

# HLS Configuration
ENABLE_HLS=true
DEFAULT_SEGMENT_DURATION=10         # Segment duration in seconds

# Storage Paths (for folder organization)
VIDEO_BASE_PATH=videos
HLS_BASE_PATH=hls
THUMBNAIL_BASE_PATH=thumbnails

# Optional: Security Features
ENABLE_REFERRER_CHECK=false         # Domain referrer validation
ALLOWED_DOMAINS=clinique-des-juristes.fr
ENABLE_SESSION_BINDING=false        # Bind URLs to IP/session (advanced)
```

### Frontend Configuration

No configuration needed - automatically detects HLS and uses appropriate player.

### Hetzner Bucket Setup

1. **Create bucket:**
   - Name: `clinique-videos`
   - Region: Falkenstein (fsn1) or Nuremberg (nbg1)

2. **Generate access keys:**
   - Navigate to: Security → S3 Credentials
   - Click "Generate new credential"
   - Save Access Key ID and Secret Access Key

3. **Set bucket to private:**
   ```bash
   aws s3api put-bucket-acl --bucket clinique-videos --acl private \
     --endpoint-url https://fsn1.your-objectstorage.com
   
   # Block public access
   aws s3api put-public-access-block --bucket clinique-videos \
     --public-access-block-configuration \
       "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
     --endpoint-url https://fsn1.your-objectstorage.com
   ```

4. **Configure CORS (if needed):**
   ```bash
   aws s3api put-bucket-cors --bucket clinique-videos \
     --cors-configuration file://cors.json \
     --endpoint-url https://fsn1.your-objectstorage.com
   ```
   
   `cors.json`:
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://clinique-des-juristes.fr"],
         "AllowedMethods": ["GET", "HEAD"],
         "AllowedHeaders": ["*"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   ```

---

## Backward Compatibility

### No Breaking Changes ✅

**Existing MP4 videos continue working:**
- No migration required
- Same playback endpoints
- Same frontend components
- Same database structure (with new optional fields)

**Mixed environment supported:**
- Some videos as MP4 (local)
- Some videos as MP4 (Hetzner)
- Some videos as HLS (Hetzner)
- All work seamlessly together

### Migration Path

**Option 1: Keep as-is**
- Leave existing videos unchanged
- Use HLS for new videos only

**Option 2: Migrate to Hetzner (still MP4)**
- Upload MP4 files to Hetzner
- Update `storage_type` to 'hetzner'
- Keep `is_segmented` as false

**Option 3: Full modernization**
- Transcode existing MP4 to HLS
- Upload to Hetzner
- Update database records
- Best performance and features

---

## Testing Checklist

Before going to production:

- [ ] Database migration applied successfully
- [ ] Hetzner bucket created and configured as private
- [ ] Environment variables configured correctly
- [ ] Test MP4 video playback (local)
- [ ] Test MP4 video playback (Hetzner)
- [ ] Test HLS video playback
- [ ] Test signed URL generation
- [ ] Test signed URL expiration (wait 15 min)
- [ ] Test token refresh (watch console at 12 min)
- [ ] Test long playback session (2+ hours)
- [ ] Test cross-browser (Chrome, Firefox, Safari, Edge)
- [ ] Test mobile devices (iOS, Android)
- [ ] Monitor backend logs for errors
- [ ] Check Hetzner storage usage
- [ ] Verify backup procedures

---

## Support & Maintenance

### Key Files

**Backend:**
- `backend/src/routes/videos.ts` - Video API endpoints
- `backend/src/routes/videoStream.ts` - Protected streaming
- `backend/src/services/hetznerStorage.ts` - Hetzner S3 integration
- `backend/src/services/signedUrl.ts` - URL signing
- `backend/src/services/storageFactory.ts` - Storage provider selection
- `backend/src/config/hetzner.ts` - Hetzner configuration
- `backend/src/config/video.ts` - Video system configuration

**Frontend:**
- `frontend/src/components/VideoPlayer.tsx` - Video player with HLS
- `frontend/src/components/admin/VideoUploadForm.tsx` - Upload form
- `frontend/src/lib/videoService.ts` - Video API service

**Database:**
- `backend/migrations/add_hls_support.sql` - Schema migration

### Logging

**Backend logs show:**
```
🎬 GET /api/videos/123/playback-info - Generating signed URL
✅ Generated signed URL for video 123 (Hetzner)
🔄 POST /api/videos/token/refresh - Refreshing URL for video 123
✅ Refreshed signed URL for video 123
```

**Frontend console shows:**
```
🎬 Getting playback info for video 123...
✅ Playback info retrieved: { storageType: 'hetzner', isHLS: true }
🎬 HLS video detected, initializing HLS player
✅ Using hls.js for HLS playback
⏰ Scheduling URL refresh in 720 seconds
🔄 Refreshing video URL...
✅ Video URL refreshed successfully
```

### Getting Help

1. Check backend logs: `pm2 logs backend` or `docker logs backend-container`
2. Check frontend console in browser DevTools
3. Verify Hetzner connectivity with AWS CLI
4. Review this migration guide
5. Check environment variables are set correctly

---

## Summary

**What Changed:**
- ✅ Added HLS streaming support
- ✅ Added Hetzner Object Storage support
- ✅ Added time-limited signed URLs
- ✅ Added automatic token refresh
- ✅ Enhanced admin upload form

**What Didn't Change:**
- ✅ Existing MP4 videos still work
- ✅ Same frontend components (enhanced)
- ✅ Same API endpoints (extended)
- ✅ No breaking changes

**Benefits:**
- 🚀 Faster video loading (HLS segments)
- 📱 Adaptive quality (automatic)
- ☁️ Scalable storage (Hetzner)
- 🔒 Enhanced security (signed URLs)
- 💰 Lower bandwidth costs (CDN-ready)

**Next Steps:**
1. Run database migration
2. Configure Hetzner bucket
3. Set environment variables
4. Test with a few HLS videos
5. Gradually migrate existing content
6. Monitor and optimize

---

*Last updated: November 6, 2025*
*Version: 2.0*
