# Phase 2 Implementation Complete - Storage Layer

## Overview

Phase 2 successfully implements a flexible storage abstraction layer that supports both local filesystem and Hetzner Object Storage (S3-compatible), with signed URL generation for secure video access.

---

## What Was Implemented

### 1. Storage Abstraction Layer ✅

**Created Files:**
- `backend/src/types/storage.ts` - Storage interface definitions
- `backend/src/services/localStorage.ts` - Local filesystem provider
- `backend/src/services/hetznerStorage.ts` - Hetzner S3 provider
- `backend/src/services/storageFactory.ts` - Provider factory and path utilities
- `backend/src/services/signedUrl.ts` - Signed URL generation service

### 2. Configuration System ✅

**Created Files:**
- `backend/src/config/hetzner.ts` - Hetzner storage configuration
- `backend/src/config/video.ts` - Video system configuration
- `backend/.env.example` - Environment variable template

### 3. Dependencies Installed ✅

**NPM Packages:**
- `@aws-sdk/client-s3` - AWS S3 client for Hetzner
- `@aws-sdk/s3-request-presigner` - Signed URL generation

---

## Architecture

### Storage Provider Interface

```typescript
interface IStorageProvider {
  upload(file: File, options: UploadOptions): Promise<UploadResult>
  getSignedUrl(path: string, options?: SignedUrlOptions): Promise<string>
  delete(path: string): Promise<void>
  exists(path: string): Promise<boolean>
  getMetadata(path: string): Promise<{ size: number; contentType?: string }>
  getType(): StorageType
}
```

### Supported Storage Types

1. **Local Storage** (`'local'`)
   - Default implementation
   - Uses local filesystem
   - Compatible with existing MP4 system
   - Direct URLs for development

2. **Hetzner Storage** (`'hetzner'`)
   - S3-compatible cloud storage
   - Time-limited signed URLs
   - Support for HLS streaming
   - Scalable and CDN-ready

---

## Folder-Based Path Support

### Path Structure

The system now supports organized folder structures:

```
videos/course-{id}/subject-{id}/video-{id}.mp4
hls/course-{id}/subject-{id}/video-{id}/playlist.m3u8
hls/course-{id}/subject-{id}/video-{id}/segment-0.ts
thumbnails/course-{id}/subject-{id}/thumb-{id}.jpg
```

### Path Creation Example

```typescript
import { createStoragePath } from './services/storageFactory';

// Create video path
const videoPath = createStoragePath('video', {
  courseId: 123,
  subjectId: 456,
  videoId: 789,
  filename: 'lecture-01.mp4'
});
// Result: "videos/course-123/subject-456/lecture-01.mp4"

// Create HLS path
const hlsPath = createStoragePath('hls', {
  courseId: 123,
  subjectId: 456,
  videoId: 789,
  filename: 'playlist.m3u8'
});
// Result: "hls/course-123/subject-456/video-789/playlist.m3u8"
```

---

## Signed URL Generation

### Time-Limited URLs

All URLs are time-limited for security:

```typescript
import { generateSignedUrl } from './services/signedUrl';

// Generate signed URL for video
const result = await generateSignedUrl(
  'videos/course-1/video.mp4',
  'hetzner',
  900  // 15 minutes
);

// Result:
{
  url: "https://hetzner.../video.mp4?Signature=...",
  expiresIn: 900,
  expiresAt: Date,
  storageType: 'hetzner'
}
```

### HLS Support

Special support for HLS manifest and segments:

```typescript
import { generateHLSManifestSignedUrl, generateHLSSegmentSignedUrl } from './services/signedUrl';

// Manifest URL
const manifest = await generateHLSManifestSignedUrl(
  'hls/course-1/video-1/playlist.m3u8',
  'hetzner'
);

// Segment URL
const segment = await generateHLSSegmentSignedUrl(
  'hls/course-1/video-1/segment-0.ts',
  'hetzner'
);
```

---

## Configuration

### Environment Variables

```env
# Enable Hetzner storage
ENABLE_HETZNER=true

# Hetzner credentials
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_REGION=fsn1
HETZNER_ACCESS_KEY=your-access-key
HETZNER_SECRET_KEY=your-secret-key
HETZNER_BUCKET=clinique-videos

# Storage configuration
DEFAULT_STORAGE_TYPE=hetzner  # or 'local'

# URL expiration
VIDEO_URL_EXPIRATION=900  # 15 minutes
```

### Using Configuration

```typescript
import { videoConfig } from './config/video';
import { getHetznerConfig } from './config/hetzner';

// Get video config
const config = videoConfig();
console.log(config.urlExpiration);  // 900

// Get Hetzner config
const hetznerConfig = getHetznerConfig();
console.log(hetznerConfig.bucket);  // 'clinique-videos'
```

---

## Usage Examples

### 1. Upload to Local Storage

```typescript
import { getStorageProvider } from './services/storageFactory';

const provider = getStorageProvider('local');

const result = await provider.upload(file, {
  path: 'videos/course-1/video.mp4',
  contentType: 'video/mp4'
});

console.log(result.url);  // Direct URL
```

### 2. Upload to Hetzner Storage

```typescript
import { getStorageProvider } from './services/storageFactory';

const provider = getStorageProvider('hetzner');

const result = await provider.upload(file, {
  path: 'videos/course-1/video.mp4',
  contentType: 'video/mp4',
  metadata: {
    courseId: '1',
    uploadedBy: 'admin'
  }
});

console.log(result.storageType);  // 'hetzner'
```

### 3. Generate Signed URL

```typescript
import { generateVideoSignedUrl } from './services/signedUrl';

const video = {
  video_path: 'videos/course-1/video.mp4',
  storage_type: 'hetzner'
};

const { url, expiresAt } = await generateVideoSignedUrl(video);

console.log(url);        // Signed URL
console.log(expiresAt);  // Expiration date
```

### 4. Check File Existence

```typescript
import { getStorageProvider } from './services/storageFactory';

const provider = getStorageProvider('hetzner');

const exists = await provider.exists('videos/course-1/video.mp4');

if (exists) {
  const metadata = await provider.getMetadata('videos/course-1/video.mp4');
  console.log(`Size: ${metadata.size} bytes`);
  console.log(`Type: ${metadata.contentType}`);
}
```

### 5. Delete File

```typescript
import { getStorageProvider } from './services/storageFactory';

const provider = getStorageProvider('hetzner');

await provider.delete('videos/course-1/old-video.mp4');
```

---

## Backward Compatibility

### Automatic Fallback

The system automatically falls back to local storage if Hetzner is not configured:

```typescript
// If ENABLE_HETZNER=false or credentials missing
const provider = getStorageProvider('hetzner');
// Returns LocalStorageProvider instead
```

### Migration Path

Existing videos continue to work:

1. **Legacy videos** (storage_type not set):
   - Use default storage type from config
   - Can remain on local storage

2. **New videos**:
   - Can use Hetzner storage
   - Organized folder structure
   - Signed URLs for security

---

## Security Features

### 1. Time-Limited URLs

All URLs expire after configurable time (default 15 minutes):

```typescript
// URL expires in 15 minutes
const { url, expiresAt } = await generateSignedUrl(path, 'hetzner', 900);
```

### 2. AWS Signature v4

Hetzner storage uses AWS Signature Version 4 for signing:
- HMAC-SHA256 signing
- Cannot be forged without secret key
- Includes expiration timestamp

### 3. Content Type Validation

URLs include content-type for validation:

```typescript
// HLS manifest with proper content type
const url = await provider.getSignedUrl(path, {
  expiresIn: 900,
  responseContentType: 'application/vnd.apple.mpegurl'
});
```

---

## Path Organization

### Best Practices

1. **Use folder hierarchy** for organization:
   ```
   videos/course-{id}/subject-{id}/video-{id}.mp4
   ```

2. **Keep HLS segments together**:
   ```
   hls/course-{id}/subject-{id}/video-{id}/
     ├── playlist.m3u8
     ├── segment-0.ts
     ├── segment-1.ts
     └── segment-2.ts
   ```

3. **Use consistent naming**:
   ```
   videos/course-1/subject-5/video-123.mp4
   thumbnails/course-1/subject-5/thumb-123.jpg
   ```

---

## Testing

### Manual Testing

1. **Local storage test**:
   ```typescript
   const provider = getLocalProvider();
   await provider.upload(file, { path: 'test/video.mp4' });
   const url = await provider.getSignedUrl('test/video.mp4');
   console.log(url);  // Should work
   ```

2. **Hetzner storage test** (requires credentials):
   ```typescript
   const provider = getHetznerProvider();
   await provider.upload(file, { path: 'test/video.mp4' });
   const url = await provider.getSignedUrl('test/video.mp4', { expiresIn: 60 });
   console.log(url);  // Should have signature
   ```

---

## Next Steps (Phase 3)

### Database Schema Updates

Add support for new fields:

```sql
ALTER TABLE videos
  ADD COLUMN storage_type ENUM('local', 'hetzner') DEFAULT 'local',
  ADD COLUMN hls_manifest_path VARCHAR(500) NULL,
  ADD COLUMN is_segmented BOOLEAN DEFAULT FALSE,
  ADD COLUMN segment_duration INT DEFAULT 10;
```

### Route Updates

Update video routes to use new storage layer:
- `POST /api/videos` - Upload with storage selection
- `GET /api/videos/:id/playback-info` - Return signed URLs
- `POST /api/videos/token/refresh` - Refresh URLs

---

## Build Status

✅ **TypeScript compilation**: Success
✅ **All modules created**: 8 files
✅ **Dependencies installed**: @aws-sdk packages
✅ **Configuration complete**: Environment variables defined
✅ **Backward compatible**: Legacy system unaffected

---

## Files Created

1. **Configuration** (2 files):
   - `backend/src/config/hetzner.ts` - Hetzner config
   - `backend/src/config/video.ts` - Video config

2. **Types** (1 file):
   - `backend/src/types/storage.ts` - Storage interfaces

3. **Services** (4 files):
   - `backend/src/services/localStorage.ts` - Local provider
   - `backend/src/services/hetznerStorage.ts` - Hetzner provider
   - `backend/src/services/storageFactory.ts` - Factory + utilities
   - `backend/src/services/signedUrl.ts` - Signed URL service

4. **Environment** (1 file):
   - `backend/.env.example` - Environment template

**Total**: 8 files created, ~25KB of code

---

## Summary

Phase 2 successfully implements:

✅ **Storage abstraction** - Support for local and Hetzner
✅ **S3-compatible API** - Full AWS SDK integration
✅ **Signed URLs** - Time-limited secure access
✅ **Folder structure** - Organized path system (course/subject/video)
✅ **HLS support** - Ready for manifest and segments
✅ **Backward compatible** - Existing system unaffected
✅ **Type-safe** - Full TypeScript support
✅ **Configurable** - Environment-based configuration

**Ready for Phase 3**: Database schema updates and route integration.

---

*Phase 2 Completed: November 6, 2025*
*Build Status: ✅ Success*
*Next Phase: Database Schema Updates*
