# Video System Modernization - Phase 1 Analysis

## Executive Summary

This document provides a complete analysis of the current video system architecture for the Clinique des Juristes educational platform. The goal is to modernize the system to support HLS (HTTP Live Streaming) with segmented video playback, private Hetzner Object Storage, signed URLs for secure access, and automatic token refresh during long playback sessions while maintaining full backward compatibility with existing MP4 videos.

---

## 1. Project Structure & Technology Stack

### Backend
- **Framework**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: MySQL 5 (port 3307)
- **Entry Points**:
  - `backend/src/server.ts` - Server initialization
  - `backend/src/app.ts` - Express app configuration
  - `backend/dist/` - Compiled JavaScript output

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Create React App (react-scripts)
- **Styling**: Tailwind CSS
- **State Management**: React hooks (no Redux/MobX)

### Key Dependencies
**Backend:**
- `express` - Web framework
- `mysql2` - MySQL database driver
- `multer` - File upload handling
- `jsonwebtoken` - JWT authentication
- `bcrypt` - Password hashing
- `helmet` - Security middleware
- `cors` - CORS handling
- `sharp` - Image processing

**Frontend:**
- `react` & `react-dom` - UI framework
- `react-router-dom` - Routing
- `axios` - HTTP client
- `dompurify` - XSS protection
- `i18next` - Internationalization

---

## 2. Current Video System Architecture

### 2.1 Backend Entry Points

#### Main Server File
**Location**: `backend/src/server.ts`
- Initializes Express application
- Connects to MySQL database
- Starts HTTP server on port 5001 (configurable)

#### Application Configuration
**Location**: `backend/src/app.ts`
- Configures middleware (CORS, helmet, morgan, rate limiting)
- Sets up API routes
- Serves static files from `uploads/` directory
- Handles React app routing in production

### 2.2 API Routes

#### Video Routes
**Location**: `backend/src/routes/videos.ts`

**Endpoints:**
1. `GET /api/videos` - List all videos with subject/course info
2. `GET /api/videos/:id` - Get single video details
3. `GET /api/videos/admin/stats` - Get video statistics
4. `POST /api/videos` - Upload new video (with authentication)
5. `DELETE /api/videos/:id` - Delete video (with authentication)
6. `GET /api/videos/stream/:filename` - Stream video file (with range support)
7. `GET /api/videos/thumbnail/:filename` - Serve thumbnail image

**Current Implementation Details:**
- Uses simple auth bypass in development mode
- Supports partial content (HTTP 206) for video streaming
- Handles both `video_path` and `file_path` columns
- Implements file upload with multer
- Stores files locally in `uploads/videos/`
- Thumbnails stored in `uploads/thumbnails/`

#### Protected Streaming Route
**Location**: `backend/src/routes/videoStream.ts`

**Endpoint:**
- `GET /api/videoStream/stream-protected/:filename`

**Features:**
- Optional authentication with JWT
- Checks course enrollment and subject access
- Supports free videos without authentication
- Implements HTTP range requests for seeking
- Validates user permissions before streaming

### 2.3 Video Security Service

**Location**: `backend/src/services/videoSecurity.ts`

**Functions:**
1. `generateVideoKey()` - Generate random encryption key
2. `generateSecureVideoUrl(videoPath, userId)` - Create JWT-signed URL (4-hour expiry)
3. `verifyVideoAccess(token)` - Validate video access token
4. `getVideoFile(videoPath)` - Validate and return file path

**Current Security Model:**
- JWT-based access tokens
- 4-hour token expiration
- Server-side token verification
- No automatic token refresh mechanism

### 2.4 File Upload Service

**Location**: `backend/src/services/fileUpload.ts`

**Configuration:**
- Uses `multer` for multipart/form-data handling
- Storage: Local disk
- Video destination: `uploads/videos/`
- Thumbnail destination: `uploads/thumbnails/`
- File size limit: 5GB (configured in app.ts)
- Supported formats: Not explicitly validated

---

## 3. Database Schema

### 3.1 Videos Table

**Table Name**: `videos`

**Schema:**
```sql
CREATE TABLE videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- File storage
  file_path VARCHAR(500) NOT NULL,       -- Legacy field
  video_path VARCHAR(500) NOT NULL,      -- Current primary field (filename only)
  thumbnail_path VARCHAR(255),
  
  -- Metadata
  file_size BIGINT,
  duration INT,                          -- Seconds
  mime_type VARCHAR(100),
  
  -- Relationships
  course_id INT,                         -- FK to courses
  subject_id INT,                        -- FK to subjects
  order_index INT DEFAULT 0,
  
  -- Display/Preview
  thumbnail_url VARCHAR(255),            -- External URL (legacy)
  preview_url VARCHAR(255),              -- Preview video URL (legacy)
  
  -- Engagement
  views_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key Observations:**
1. Only stores filename in `video_path` (not full URL or path)
2. No field for storage type (local vs. cloud)
3. No HLS-specific fields (manifest path, segments)
4. No field indicating video format or streaming type
5. Both `file_path` and `video_path` exist for backward compatibility

### 3.2 Related Tables

**video_progress:**
```sql
CREATE TABLE video_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  video_id INT NOT NULL,
  user_id INT NOT NULL,
  position_seconds DOUBLE DEFAULT 0,
  watched_percentage INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (video_id, user_id),
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**video_likes:**
```sql
CREATE TABLE video_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  video_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (video_id, user_id),
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**user_courses:**
```sql
CREATE TABLE user_courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
```

---

## 4. Frontend Video System

### 4.1 Video Player Components

#### Standard Video Player
**Location**: `frontend/src/components/VideoPlayer.tsx`

**Features:**
- HTML5 `<video>` element
- Range request support for seeking
- Preview mode for non-authenticated users (10-second limit)
- Security features:
  - Disabled right-click context menu
  - Disabled keyboard shortcuts (Ctrl+S, F12, etc.)
  - Disabled drag and drop
  - Disabled text selection
  - controlsList="nodownload nofullscreen noremoteplaybook"
  - disablePictureInPicture
- Authentication token passed in URL query string
- Error handling and retry mechanism

**Props:**
```typescript
interface VideoPlayerProps {
  video: Video;
  isAuthenticated: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  maxPreviewTime?: number;
  className?: string;
  autoPlay?: boolean;
}
```

#### Professional Video Player
**Location**: `frontend/src/components/ProfessionalVideoPlayer.tsx`

**Enhanced Features:**
- Custom UI controls (play/pause, progress bar, volume, fullscreen)
- Playback speed control (0.25x to 2x)
- Keyboard shortcuts:
  - Space: Play/Pause
  - F: Fullscreen
  - M: Mute
  - Arrow keys: Seek/Volume
  - Escape: Close/Exit fullscreen
- Auto-hide controls after 3 seconds
- Buffering indicator
- 10-second preview limit enforcement
- French localization
- Extensive logging for debugging

### 4.2 Video Service

**Location**: `frontend/src/lib/videoService.ts`

**Class**: `VideoService`

**Key Methods:**
1. `getAllVideosWithSubjects()` - Fetch all videos
2. `getVideoStats()` - Get video statistics
3. `getVideosBySubject(subjectId)` - Filter by subject
4. `getVideoById(videoId)` - Get single video
5. `getUploadOptions()` - Get upload form options
6. `getVideoStreamUrl(video)` - **Build streaming URL**
7. `getVideoDownloadUrl(video)` - Build download URL
8. `getThumbnailUrl(video)` - Build thumbnail URL
9. `deleteVideo(id)` - Delete video
10. `uploadVideo(formData, onProgress)` - Upload with progress
11. `updateVideo(id, data)` - Update metadata
12. Utility functions for formatting (file size, duration, date)

**Current URL Building Logic:**
```typescript
getVideoStreamUrl(video: Video): string {
  const videoPath = video.video_path || video.file_path;
  if (videoPath) {
    return `${window.location.origin}/api/videos/stream/${videoPath}`;
  }
  return '';
}
```

**Important Note:** URL is built on the client side using only the filename from the database.

### 4.3 Video Interface

**Location**: `frontend/src/lib/videoService.ts`

```typescript
export interface Video {
  id: number;
  title: string;
  description?: string;
  subject_id?: number;
  course_id?: number;
  course_title?: string;
  subject_title?: string;
  professor_name?: string;
  video_path: string;          // Primary field
  file_path?: string;           // Legacy fallback
  file_size?: number;
  duration?: number;
  mime_type?: string;
  thumbnail_path?: string;
  preview_url?: string;
  is_active: boolean;
  order_index?: number;
  created_at: string;
  updated_at: string;
  views_count?: number;
  likes_count?: number;
}
```

---

## 5. Static File Serving

### 5.1 Express Static Middleware

**Configuration** (in `backend/src/app.ts`):
```typescript
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads/blog', express.static(path.join(__dirname, '../uploads/blog')));
app.use('/uploads/videos', express.static(path.join(__dirname, '../uploads/videos')));
app.use('/uploads/thumbnails', express.static(path.join(__dirname, '../uploads/thumbnails')));
```

**Directory Structure:**
```
backend/
├── uploads/
│   ├── videos/          # Video files (.mp4, etc.)
│   ├── thumbnails/      # Thumbnail images
│   └── blog/            # Blog images
```

### 5.2 File Access Patterns

**Current Access Methods:**
1. Direct static file serving: `/uploads/videos/{filename}`
2. Streaming endpoint with range support: `/api/videos/stream/{filename}`
3. Protected streaming: `/api/videoStream/stream-protected/{filename}`
4. Thumbnail serving: `/api/videos/thumbnail/{filename}`

---

## 6. Security & Authentication

### 6.1 Existing Security Middleware

**Location**: `backend/src/middleware/auth.ts`

**Middleware Functions:**
- `optionalAuth` - Validates JWT if present, continues without auth if not
- `requireAuth` - Enforces authentication
- JWT validation using `jsonwebtoken` library
- Token secret from environment variable

### 6.2 Current Video Security

**Access Control:**
1. Free videos accessible without authentication
2. Paid videos require:
   - User authentication (JWT token)
   - Course enrollment OR subject access
3. Checks `user_courses` and `user_subjects` tables

**Token System:**
- JWT tokens with 4-hour expiration
- No automatic refresh mechanism
- Token passed via Authorization header or query string

**Protection Mechanisms:**
- Context menu disabled
- Keyboard shortcuts blocked
- Download controls disabled
- Picture-in-picture disabled
- Text selection prevented

---

## 7. Video Upload Workflow

### 7.1 Upload Form
**Location**: `frontend/src/components/admin/VideoUploadForm.tsx`

**Process:**
1. User selects video file and thumbnail (optional)
2. Form validates:
   - Title required
   - Subject required
   - Video file required
   - File type validation
   - Size limit check (20GB for video, 10MB for thumbnail)
3. Creates FormData with multipart/form-data
4. Uploads via `videoService.uploadVideo()` with progress tracking

### 7.2 Backend Processing
**Location**: `backend/src/routes/videos.ts` - POST endpoint

**Steps:**
1. Authenticate user (simple auth bypass in dev)
2. Validate required fields (title, subject_id)
3. Validate video file presence
4. Check subject exists in database
5. Save files using multer:
   - Video → `uploads/videos/{randomName}.{ext}`
   - Thumbnail → `uploads/thumbnails/{randomName}.{ext}`
6. Calculate order_index for subject
7. Insert record into `videos` table
8. Return created video with full details

**File Naming:**
- Multer generates random filenames
- Original extension preserved
- Only filename stored in database (not full path)

---

## 8. Middleware & Helpers

### 8.1 File Upload Middleware

**Location**: `backend/src/services/fileUpload.ts`

**Configuration:**
```typescript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, 'uploads/videos/');
    } else if (file.fieldname === 'thumbnail') {
      cb(null, 'uploads/thumbnails/');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB
});
```

### 8.2 Database Helper

**Location**: `backend/src/config/database.ts`

**Wrapper Functions:**
- `query(sql, params)` - Execute SQL query
- Returns `{ rows, fields }` structure
- Handles MySQL 5 compatibility

---

## 9. Current Limitations & Issues

### 9.1 Scalability Issues
1. **Storage**: All videos stored on local filesystem
   - No content delivery network (CDN)
   - Single point of failure
   - Limited scalability

2. **Bandwidth**: Server handles all video streaming
   - Consumes server bandwidth
   - No edge caching
   - Potential bottleneck for multiple concurrent streams

3. **Security**: Simple token-based protection
   - 4-hour token expiration (too long for security, too short for long videos)
   - No automatic refresh
   - URLs can be shared within expiration window

### 9.2 Video Format Limitations
1. **Single Format**: Only standard MP4 files
   - No adaptive bitrate streaming
   - Fixed quality for all network conditions
   - Poor experience on slow connections

2. **No Segmentation**: Entire file must be seekable
   - Inefficient bandwidth usage
   - Slow initial load times
   - Large file transfers

3. **No HLS Support**: Cannot use industry-standard streaming
   - No compatibility with native iOS/Safari optimizations
   - Missing adaptive streaming benefits

### 9.3 Token Management
1. No automatic token refresh during playback
2. Long videos may exceed 4-hour token lifetime
3. User must re-authenticate mid-video

### 9.4 Missing Features
1. No video transcoding pipeline
2. No multi-quality support
3. No CDN integration
4. No analytics on playback quality
5. No support for DRM (Digital Rights Management)

---

## 10. Recommendations for Modernization

### 10.1 Priority 1: HLS Support
**Objective**: Enable HTTP Live Streaming with segmented video

**Requirements:**
- Support .m3u8 manifest files
- Store video segments (.ts files)
- Maintain backward compatibility with MP4
- Implement adaptive bitrate (optional)

**Changes Needed:**
- Database: Add HLS-specific fields
- Backend: Detect and serve HLS vs MP4
- Frontend: Integrate hls.js library

### 10.2 Priority 2: Hetzner Object Storage
**Objective**: Move video storage to Hetzner Object Storage

**Requirements:**
- S3-compatible API integration
- Signed URL generation with expiration
- Support for both HLS and MP4 files
- Maintain local storage for backward compatibility

**Changes Needed:**
- Backend: Hetzner storage service module
- Backend: Signed URL generation
- Database: Add storage_type field
- Frontend: Handle dynamic URLs

### 10.3 Priority 3: Secure Access with Token Refresh
**Objective**: Implement automatic token refresh during playback

**Requirements:**
- Short-lived access tokens (15-30 minutes)
- Automatic refresh before expiration
- Seamless user experience (no interruption)
- Rate limiting on token refresh

**Changes Needed:**
- Backend: Token refresh endpoint
- Backend: Shortened token lifetime
- Frontend: Automatic refresh logic
- Frontend: Error handling for token expiration

### 10.4 Priority 4: Backward Compatibility
**Objective**: Ensure existing MP4 videos continue to work

**Requirements:**
- Detect video format automatically
- Serve MP4 files as before
- Gradual migration path
- No breaking changes to API

**Changes Needed:**
- Backend: Format detection logic
- Database: Migration for new fields with defaults
- Frontend: Fallback to MP4 player

---

## 11. Implementation Strategy

### 11.1 Phase Approach

**Phase 2: Infrastructure Setup**
- Install dependencies (hls.js, AWS SDK, etc.)
- Configure Hetzner Object Storage credentials
- Create storage utility modules
- Set up environment variables

**Phase 3: Database Schema Updates**
- Create migration script
- Add new fields with defaults
- Test migration on development database
- Document rollback procedure

**Phase 4: Backend Enhancements**
- Implement Hetzner storage service
- Create signed URL generation
- Add token refresh endpoint
- Update video upload for HLS
- Modify streaming routes

**Phase 5: Frontend Updates**
- Install hls.js
- Update video player components
- Implement token refresh logic
- Add format detection
- Update video service

**Phase 6: Testing & Validation**
- Unit tests for new services
- Integration tests for upload/playback
- Cross-browser testing
- Performance testing
- Security audit

**Phase 7: Documentation & Migration**
- API documentation
- Configuration guide
- Migration guide for existing videos
- User guide for new features

### 11.2 Risk Mitigation

**Risks:**
1. Breaking existing functionality
   - Mitigation: Feature flags, gradual rollout
   
2. Performance degradation
   - Mitigation: Load testing, CDN setup
   
3. Token security issues
   - Mitigation: Security audit, rate limiting
   
4. Browser compatibility
   - Mitigation: Progressive enhancement, fallbacks

---

## 12. Technical Specifications

### 12.1 HLS Streaming
**Format**: HTTP Live Streaming (HLS)
**Container**: MPEG-2 Transport Stream (.ts)
**Manifest**: M3U8 playlist (.m3u8)
**Segment Duration**: 10 seconds (configurable)
**Codecs**: H.264/AVC video, AAC audio

### 12.2 Hetzner Object Storage
**API**: S3-compatible
**Authentication**: Access Key ID + Secret Access Key
**Endpoint**: Custom (e.g., fsn1.your-objectstorage.com)
**Bucket**: Configurable bucket name
**Region**: Configurable (e.g., fsn1)

### 12.3 Signed URLs
**Method**: Pre-signed S3 URLs
**Expiration**: 15-30 minutes (configurable)
**Algorithm**: AWS Signature Version 4
**Security**: HMAC-SHA256 signing

### 12.4 Token Refresh
**Method**: Dedicated REST API endpoint
**Frequency**: Before expiration (e.g., at 80% of lifetime)
**Limit**: Rate limited (max 10 refreshes per hour)
**Response**: New JWT token with extended expiration

---

## 13. Appendix

### 13.1 File Locations Reference

**Backend:**
- Server entry: `backend/src/server.ts`
- App config: `backend/src/app.ts`
- Video routes: `backend/src/routes/videos.ts`
- Protected streaming: `backend/src/routes/videoStream.ts`
- Video security: `backend/src/services/videoSecurity.ts`
- File upload: `backend/src/services/fileUpload.ts`
- Database config: `backend/src/config/database.ts`
- Auth middleware: `backend/src/middleware/auth.ts`

**Frontend:**
- Video player: `frontend/src/components/VideoPlayer.tsx`
- Pro player: `frontend/src/components/ProfessionalVideoPlayer.tsx`
- Video service: `frontend/src/lib/videoService.ts`
- Upload form: `frontend/src/components/admin/VideoUploadForm.tsx`

**Database:**
- Setup script: `frontend/setup-mysql5-database.js`
- Migrations: `backend/migrations/*.sql`

### 13.2 Environment Variables

**Current:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5001)
- `DB_HOST` - MySQL host
- `DB_PORT` - MySQL port (3307)
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT signing secret

**Required for Modernization:**
- `HETZNER_ENDPOINT` - Hetzner storage endpoint
- `HETZNER_ACCESS_KEY` - Access key
- `HETZNER_SECRET_KEY` - Secret key
- `HETZNER_BUCKET` - Bucket name
- `HETZNER_REGION` - Region (e.g., fsn1)
- `VIDEO_TOKEN_LIFETIME` - Token expiration (seconds)
- `ENABLE_HLS` - Feature flag for HLS support
- `STORAGE_TYPE` - Default storage (local/hetzner)

### 13.3 API Endpoints Summary

**Existing:**
- `GET /api/videos` - List videos
- `GET /api/videos/:id` - Get video
- `GET /api/videos/admin/stats` - Statistics
- `POST /api/videos` - Upload video
- `DELETE /api/videos/:id` - Delete video
- `GET /api/videos/stream/:filename` - Stream video
- `GET /api/videos/thumbnail/:filename` - Get thumbnail
- `GET /api/videoStream/stream-protected/:filename` - Protected stream

**New (Proposed):**
- `POST /api/videos/token/refresh` - Refresh access token
- `GET /api/videos/:id/manifest` - Get HLS manifest (signed URL)
- `GET /api/videos/:id/segments/:segment` - Get segment (signed URL)
- `POST /api/videos/:id/transcode` - Trigger HLS transcoding
- `GET /api/videos/:id/playback-info` - Get playback URLs and tokens

---

## Conclusion

The current video system is functional but limited to local MP4 playback. The modernization to HLS streaming with Hetzner Object Storage will provide:

1. **Better Performance**: Adaptive streaming, reduced server load
2. **Enhanced Security**: Short-lived signed URLs, automatic refresh
3. **Scalability**: Cloud storage, CDN-ready architecture
4. **Improved UX**: Faster loading, better buffering, quality adaptation

The implementation must prioritize backward compatibility to avoid disrupting existing users and content. A phased approach with feature flags will allow for safe deployment and testing.

**Next Steps**: Proceed to Phase 2 (Infrastructure Setup) to begin implementation.

---

*Document prepared: November 6, 2025*
*Version: 1.0*
*Status: Analysis Complete - Ready for Implementation*
