# Video System Architecture Diagrams

## Current System Architecture (Pre-Modernization)

### 1. Current Video Upload Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         VIDEO UPLOAD FLOW                       │
└─────────────────────────────────────────────────────────────────┘

User (Admin)
    │
    │ Selects video file + thumbnail
    │
    ▼
┌─────────────────────┐
│  React Upload Form  │
│ (VideoUploadForm)   │
└──────────┬──────────┘
           │ FormData (multipart/form-data)
           │ - video: File (MP4)
           │ - thumbnail: File (JPG/PNG)
           │ - title, description, subject_id
           │
           ▼
┌─────────────────────┐
│  Frontend Service   │
│  (videoService.ts)  │
└──────────┬──────────┘
           │ XHR POST /api/videos
           │ Authorization: Bearer {JWT}
           │
           ▼
┌─────────────────────┐
│  Express Middleware │
│   CORS + Helmet     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Auth Middleware    │
│  (simpleAuth)       │ → Validates JWT token
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Multer Middleware  │
│  (fileUpload.ts)    │
└──────────┬──────────┘
           │ Saves to disk:
           │ - uploads/videos/{random}-{timestamp}.mp4
           │ - uploads/thumbnails/{random}-{timestamp}.jpg
           │
           ▼
┌─────────────────────┐
│  Videos Controller  │
│  (videos.ts)        │
└──────────┬──────────┘
           │ 1. Validate fields
           │ 2. Check subject exists
           │ 3. Calculate order_index
           │
           ▼
┌─────────────────────┐
│   MySQL Database    │
│   (videos table)    │
└──────────┬──────────┘
           │ INSERT INTO videos:
           │ - video_path: "12345-video.mp4"  (filename only)
           │ - file_path: "12345-video.mp4"   (same)
           │ - thumbnail_path: "12345-thumb.jpg"
           │ - file_size: 52428800
           │ - subject_id: 5
           │
           ▼
┌─────────────────────┐
│   Response JSON     │
│   (Created Video)   │
└─────────────────────┘
           │
           ▼
        User sees success message
```

### 2. Current Video Playback Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       VIDEO PLAYBACK FLOW                        │
└─────────────────────────────────────────────────────────────────┘

User
    │
    │ Clicks play on video
    │
    ▼
┌─────────────────────┐
│  React Video List   │
│  (VideoManagement)  │
└──────────┬──────────┘
           │ Fetches video metadata
           │ GET /api/videos
           │
           ▼
┌─────────────────────┐
│  Frontend Service   │
│  (videoService.ts)  │
└──────────┬──────────┘
           │ Builds URL:
           │ getVideoStreamUrl(video)
           │ → "http://localhost:5001/api/videos/stream/12345-video.mp4"
           │
           ▼
┌─────────────────────┐
│   Video Player      │
│ (VideoPlayer.tsx)   │
└──────────┬──────────┘
           │ <video src="...">
           │ Security features:
           │ - controlsList="nodownload"
           │ - disablePictureInPicture
           │ - Right-click disabled
           │
           ▼
┌─────────────────────┐
│  Browser Request    │
│  GET /api/videos/   │
│  stream/{filename}  │
└──────────┬──────────┘
           │ Headers:
           │ - Range: bytes=0-1048575  (for seeking)
           │
           ▼
┌─────────────────────┐
│  Express Router     │
│  (videos.ts)        │
└──────────┬──────────┘
           │ Route: GET /stream/:filename
           │
           ▼
┌─────────────────────┐
│  File System Read   │
│  fs.createReadStream│
└──────────┬──────────┘
           │ Reads: uploads/videos/12345-video.mp4
           │ Supports range requests
           │
           ▼
┌─────────────────────┐
│  HTTP Response      │
│  206 Partial Content│
└──────────┬──────────┘
           │ Headers:
           │ - Content-Range: bytes 0-1048575/52428800
           │ - Content-Type: video/mp4
           │ - Accept-Ranges: bytes
           │
           ▼
┌─────────────────────┐
│  Browser Player     │
│  (HTML5 video)      │
└──────────┬──────────┘
           │ Decodes and plays video
           │ Allows seeking (more range requests)
           │
           ▼
        User watches video
```

### 3. Current Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT SECURITY FLOW                        │
└─────────────────────────────────────────────────────────────────┘

User Login
    │
    ▼
┌─────────────────────┐
│  Auth Service       │
│  (auth.ts)          │
└──────────┬──────────┘
           │ Validates credentials
           │ Generates JWT token
           │ Expiration: 4 hours
           │
           ▼
┌─────────────────────┐
│  JWT Token Issued   │
│  localStorage       │
└──────────┬──────────┘
           │ Stored: authToken
           │
           ▼
Video Access Request
    │
    ▼
┌─────────────────────┐
│  Protected Stream   │
│ (videoStream.ts)    │
└──────────┬──────────┘
           │ 1. Extract JWT from header
           │ 2. Verify token signature
           │ 3. Check expiration
           │
           ▼
┌─────────────────────┐
│  Access Control     │
└──────────┬──────────┘
           │ Query database:
           │ - Is video free?
           │   YES → Allow access
           │   NO  → Check enrollment
           │
           ▼
┌─────────────────────┐
│ Enrollment Check    │
└──────────┬──────────┘
           │ SELECT from:
           │ - user_courses (course access)
           │ - user_subjects (subject access)
           │
           ▼
┌─────────────────────┐
│  Access Decision    │
└──────────┬──────────┘
           │
           ├─ Has Access? → Stream video
           │
           └─ No Access?  → 403 Forbidden
```

### 4. Database Schema (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                           │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│       courses        │
├──────────────────────┤
│ id (PK)              │
│ title                │
│ description          │
│ cover_image          │
│ category             │
│ is_active            │
│ created_at           │
│ updated_at           │
└───────┬──────────────┘
        │ 1
        │ (course_id)
        │ *
┌───────▼──────────────┐         ┌──────────────────────┐
│      subjects        │         │        videos        │
├──────────────────────┤         ├──────────────────────┤
│ id (PK)              │────┐    │ id (PK)              │
│ course_id (FK) ──────┘    │    │ title                │
│ title                │    └───→│ subject_id (FK)      │
│ description          │         │ course_id (FK)       │
│ professor_name       │         │                      │
│ hours                │         │ video_path ⭐        │
│ order_index          │         │ file_path (legacy)   │
│ is_active            │         │ thumbnail_path       │
│ created_at           │         │ file_size            │
│ updated_at           │         │ duration             │
└──────────────────────┘         │ mime_type            │
                                 │                      │
                                 │ order_index          │
                                 │ views_count          │
                                 │ likes_count          │
                                 │ is_active            │
                                 │ created_at           │
                                 │ updated_at           │
                                 └───────┬──────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
        ┌───────────────────┐ ┌──────────────────┐ ┌──────────────────┐
        │  video_progress   │ │   video_likes    │ │  user_courses    │
        ├───────────────────┤ ├──────────────────┤ ├──────────────────┤
        │ id (PK)           │ │ id (PK)          │ │ id (PK)          │
        │ video_id (FK) ────┤ │ video_id (FK) ───┤ │ user_id (FK)     │
        │ user_id (FK)      │ │ user_id (FK)     │ │ course_id (FK)   │
        │ position_seconds  │ │ created_at       │ │ assigned_at      │
        │ watched_%         │ └──────────────────┘ │ expires_at       │
        │ created_at        │                      │ is_active        │
        │ updated_at        │                      └──────────────────┘
        └───────────────────┘
```

---

## Target System Architecture (Post-Modernization)

### 5. Future HLS Upload Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      FUTURE HLS UPLOAD FLOW                      │
└─────────────────────────────────────────────────────────────────┘

User (Admin)
    │
    │ Selects video file
    │
    ▼
┌─────────────────────┐
│  React Upload Form  │
└──────────┬──────────┘
           │ Detects format: MP4 or HLS
           │
           ▼
┌─────────────────────┐
│  Upload Decision    │
└──────────┬──────────┘
           │
           ├─ MP4? → Current flow (backward compatible)
           │
           └─ HLS? → New flow ↓
                    │
                    ▼
         ┌─────────────────────┐
         │  Transcoding Queue  │  (Optional)
         │  FFmpeg/Cloud       │
         └──────────┬──────────┘
                    │ Creates:
                    │ - playlist.m3u8 (manifest)
                    │ - segment-0.ts
                    │ - segment-1.ts
                    │ - segment-2.ts
                    │ - ... (10-second chunks)
                    │
                    ▼
         ┌─────────────────────┐
         │  Hetzner Storage    │
         │  S3-Compatible API  │
         └──────────┬──────────┘
                    │ Uploads to:
                    │ s3://clinique-videos/
                    │   /hls/
                    │     /video-{id}/
                    │       playlist.m3u8
                    │       segment-0.ts
                    │       segment-1.ts
                    │       ...
                    │
                    ▼
         ┌─────────────────────┐
         │   MySQL Database    │
         └──────────┬──────────┘
                    │ INSERT with:
                    │ - video_path: "video-{id}/playlist.m3u8"
                    │ - storage_type: "hetzner"
                    │ - is_segmented: true
                    │ - segment_duration: 10
                    │
                    ▼
              Upload Complete
```

### 6. Future HLS Playback Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     FUTURE HLS PLAYBACK FLOW                     │
└─────────────────────────────────────────────────────────────────┘

User
    │
    │ Clicks play
    │
    ▼
┌─────────────────────┐
│  Frontend Service   │
└──────────┬──────────┘
           │ GET /api/videos/{id}/playback-info
           │
           ▼
┌─────────────────────┐
│  Backend API        │
└──────────┬──────────┘
           │ 1. Validate user access
           │ 2. Check video format
           │ 3. Generate signed URLs
           │
           ▼
┌─────────────────────┐
│  Format Detection   │
└──────────┬──────────┘
           │
           ├─ MP4? → Return: /api/videos/stream/{filename}
           │
           └─ HLS? → Continue ↓
                    │
                    ▼
         ┌─────────────────────┐
         │  Signed URL Gen     │
         │  (AWS Signature v4) │
         └──────────┬──────────┘
                    │ Creates time-limited URLs:
                    │ - Manifest: https://hetzner.../playlist.m3u8?Signature=...
                    │ - Segments: https://hetzner.../segment-*.ts?Signature=...
                    │ - Expiration: 15 minutes
                    │
                    ▼
         ┌─────────────────────┐
         │  Response JSON      │
         └──────────┬──────────┘
                    │ {
                    │   "type": "hls",
                    │   "manifest_url": "https://...",
                    │   "token": "jwt-for-refresh",
                    │   "expires_in": 900
                    │ }
                    │
                    ▼
         ┌─────────────────────┐
         │  React Player       │
         │  (with hls.js)      │
         └──────────┬──────────┘
                    │ 1. Initialize hls.js
                    │ 2. Load manifest
                    │ 3. Start playback
                    │ 4. Auto-refresh token at 80%
                    │
                    ▼
         ┌─────────────────────┐
         │  HLS.js Library     │
         └──────────┬──────────┘
                    │ 1. Parses .m3u8
                    │ 2. Requests segments
                    │ 3. Adaptive bitrate
                    │ 4. Buffer management
                    │
                    ▼
         ┌─────────────────────┐
         │  Hetzner CDN        │
         │  Edge Servers       │
         └──────────┬──────────┘
                    │ Delivers segments
                    │ (closest edge server)
                    │
                    ▼
              User watches video
              (smooth, adaptive quality)
```

### 7. Future Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUTURE TOKEN REFRESH FLOW                     │
└─────────────────────────────────────────────────────────────────┘

Video Playing
    │
    │ Token expires in 15 min
    │ Current time: 12 min (80%)
    │
    ▼
┌─────────────────────┐
│  Frontend Timer     │
│  (useEffect hook)   │
└──────────┬──────────┘
           │ Triggers at 80% of lifetime
           │
           ▼
┌─────────────────────┐
│  Token Refresh API  │
│  POST /api/videos/  │
│  token/refresh      │
└──────────┬──────────┘
           │ Body: {
           │   "video_id": 123,
           │   "current_token": "old-jwt"
           │ }
           │
           ▼
┌─────────────────────┐
│  Backend Validation │
└──────────┬──────────┘
           │ 1. Verify old token valid
           │ 2. Check user still has access
           │ 3. Rate limit check (max 10/hour)
           │
           ▼
┌─────────────────────┐
│  Generate New URLs  │
└──────────┬──────────┘
           │ 1. New signed URLs (15 min)
           │ 2. New JWT token
           │
           ▼
┌─────────────────────┐
│  Response           │
└──────────┬──────────┘
           │ {
           │   "manifest_url": "new-signed-url",
           │   "token": "new-jwt",
           │   "expires_in": 900
           │ }
           │
           ▼
┌─────────────────────┐
│  Update Player      │
└──────────┬──────────┘
           │ 1. Store new token
           │ 2. Update manifest URL
           │ 3. Continue playback seamlessly
           │
           ▼
    Video continues (no interruption)
```

### 8. Storage Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                       STORAGE COMPARISON                         │
└─────────────────────────────────────────────────────────────────┘

CURRENT SYSTEM (Local Storage)
┌───────────────────────────────────┐
│    Application Server             │
│  ┌─────────────────────────────┐  │
│  │  uploads/videos/            │  │
│  │  ├─ video1.mp4 (500MB)      │  │
│  │  ├─ video2.mp4 (800MB)      │  │
│  │  ├─ video3.mp4 (1.2GB)      │  │
│  │  └─ ... (100+ videos)       │  │
│  └─────────────────────────────┘  │
│           ▲                        │
│           │ Direct file access     │
│           │                        │
│  ┌────────┴──────────┐            │
│  │  Express Server   │            │
│  │  Port 5001        │            │
│  └───────────────────┘            │
└────────────┬──────────────────────┘
             │
             ▼
        User Browser
        (Downloads all traffic from server)

Issues:
❌ Server disk fills up
❌ No redundancy/backup
❌ Single point of failure
❌ Bandwidth bottleneck
❌ No CDN optimization


FUTURE SYSTEM (Hetzner Object Storage)
┌───────────────────────────────────┐
│    Application Server             │
│  ┌─────────────────────────────┐  │
│  │  Small local cache (optional)│ │
│  └─────────────────────────────┘  │
│           ▲                        │
│           │ Only API requests      │
│           │                        │
│  ┌────────┴──────────┐            │
│  │  Express Server   │            │
│  │  - Generates URLs │            │
│  │  - Validates access│           │
│  └───────────────────┘            │
└────────────┬──────────────────────┘
             │ Signed URLs
             ▼
┌───────────────────────────────────┐
│   Hetzner Object Storage          │
│  ┌─────────────────────────────┐  │
│  │  Bucket: clinique-videos    │  │
│  │  ├─ /hls/video-1/           │  │
│  │  │   ├─ playlist.m3u8       │  │
│  │  │   ├─ segment-0.ts        │  │
│  │  │   └─ segment-1.ts        │  │
│  │  ├─ /mp4/                   │  │
│  │  │   └─ legacy-videos.mp4   │  │
│  │  └─ /thumbnails/            │  │
│  └─────────────────────────────┘  │
│         │                          │
│         │ CDN Edge Servers         │
│         ▼                          │
│  ┌─────────────────────────────┐  │
│  │  Edge Location 1 (EU)       │  │
│  │  Edge Location 2 (US)       │  │
│  │  Edge Location 3 (Asia)     │  │
│  └─────────────────────────────┘  │
└────────────┬──────────────────────┘
             │
             ▼
        User Browser
        (Downloads from nearest edge)

Benefits:
✅ Unlimited storage
✅ Automatic redundancy
✅ CDN acceleration
✅ Global distribution
✅ Reduced server load
```

---

## Security Comparison

### Current Security Model
```
JWT Token (4 hours) → No Refresh → User may be interrupted
                                    ↓
                          Re-authentication required
```

### Future Security Model
```
JWT Token (30 min) → Auto-refresh at 80% → New token (30 min) → Continue
                      ↓
               Seamless playback
               No interruption
               Enhanced security (short-lived URLs)
```

---

## Implementation Phases Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION TIMELINE                       │
└─────────────────────────────────────────────────────────────────┘

Phase 1: Understanding ✅
├─ Analyze architecture
├─ Document current system
├─ Identify components
└─ Create implementation plan

Phase 2: Infrastructure Setup
├─ Install dependencies (hls.js, AWS SDK)
├─ Configure Hetzner credentials
├─ Create storage utilities
└─ Set up environment variables

Phase 3: Database Updates
├─ Add storage_type field
├─ Add hls_manifest_path field
├─ Add is_segmented flag
└─ Run migration scripts

Phase 4: Backend Development
├─ Hetzner storage service
├─ Signed URL generation
├─ Token refresh endpoint
├─ Update upload routes
└─ Update streaming routes

Phase 5: Frontend Development
├─ Install hls.js library
├─ Update VideoPlayer component
├─ Update ProfessionalVideoPlayer
├─ Add token refresh logic
└─ Add format detection

Phase 6: Testing & QA
├─ Unit tests
├─ Integration tests
├─ Cross-browser testing
├─ Performance testing
└─ Security audit

Phase 7: Documentation & Launch
├─ API documentation
├─ User guide
├─ Migration guide
└─ Deployment
```

---

*Diagrams created: November 6, 2025*
*Version: 1.0*
*Status: Phase 1 Complete*
