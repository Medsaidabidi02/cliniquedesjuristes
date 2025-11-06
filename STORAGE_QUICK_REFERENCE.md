# Storage System Quick Reference

## Usage Guide for Phase 2 Storage Layer

---

## Quick Start

### 1. Upload File to Storage

```typescript
import { getStorageProvider, createStoragePath } from './services/storageFactory';

// Get storage provider (automatic based on config)
const provider = getStorageProvider();

// Create organized path
const path = createStoragePath('video', {
  courseId: 123,
  subjectId: 456,
  filename: 'my-video.mp4'
});

// Upload file
const result = await provider.upload(file, {
  path,
  contentType: 'video/mp4'
});

console.log(result.url);         // Storage URL
console.log(result.storageType); // 'local' or 'hetzner'
```

### 2. Generate Signed URL

```typescript
import { generateSignedUrl } from './services/signedUrl';

// Generate time-limited URL
const { url, expiresAt } = await generateSignedUrl(
  'videos/course-1/video.mp4',
  'hetzner',  // storage type
  900         // 15 minutes
);

console.log(url);       // https://hetzner.../video.mp4?Signature=...
console.log(expiresAt); // 2025-11-06T13:45:00Z
```

### 3. Check File Exists

```typescript
const provider = getStorageProvider('hetzner');

if (await provider.exists('videos/course-1/video.mp4')) {
  const metadata = await provider.getMetadata('videos/course-1/video.mp4');
  console.log(`Size: ${metadata.size} bytes`);
}
```

---

## Path Structures

### Videos
```
videos/course-{id}/subject-{id}/video-{id}.mp4
```

### HLS Streams
```
hls/course-{id}/subject-{id}/video-{id}/playlist.m3u8
hls/course-{id}/subject-{id}/video-{id}/segment-0.ts
hls/course-{id}/subject-{id}/video-{id}/segment-1.ts
```

### Thumbnails
```
thumbnails/course-{id}/subject-{id}/thumb-{id}.jpg
```

---

## Environment Configuration

### Minimal Setup (Local Only)
```env
DEFAULT_STORAGE_TYPE=local
```

### Full Setup (Hetzner)
```env
# Enable Hetzner
ENABLE_HETZNER=true
DEFAULT_STORAGE_TYPE=hetzner

# Hetzner credentials
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_REGION=fsn1
HETZNER_ACCESS_KEY=your-access-key
HETZNER_SECRET_KEY=your-secret-key
HETZNER_BUCKET=clinique-videos

# URL expiration
VIDEO_URL_EXPIRATION=900  # 15 minutes
```

---

## Common Operations

### Switch Storage Type

```typescript
// Use local storage
const localProvider = getStorageProvider('local');

// Use Hetzner storage
const hetznerProvider = getStorageProvider('hetzner');

// Use default from config
const defaultProvider = getStorageProvider();
```

### Create Path

```typescript
import { createStoragePath } from './services/storageFactory';

// Video path
const videoPath = createStoragePath('video', {
  courseId: 1,
  subjectId: 5,
  filename: 'lecture.mp4'
});
// "videos/course-1/subject-5/lecture.mp4"

// HLS manifest
const hlsPath = createStoragePath('hls', {
  courseId: 1,
  subjectId: 5,
  videoId: 10,
  filename: 'playlist.m3u8'
});
// "hls/course-1/subject-5/video-10/playlist.m3u8"
```

### Parse Path

```typescript
import { parseStoragePath } from './services/storageFactory';

const info = parseStoragePath('videos/course-1/subject-5/video.mp4');

console.log(info.type);      // 'video'
console.log(info.courseId);  // '1'
console.log(info.subjectId); // '5'
console.log(info.filename);  // 'video.mp4'
```

### Delete File

```typescript
const provider = getStorageProvider('hetzner');
await provider.delete('videos/course-1/old-video.mp4');
```

### Get Metadata

```typescript
const provider = getStorageProvider('hetzner');
const metadata = await provider.getMetadata('videos/course-1/video.mp4');

console.log(metadata.size);        // File size in bytes
console.log(metadata.contentType); // 'video/mp4'
```

---

## HLS Support

### Generate HLS URLs

```typescript
import { 
  generateHLSManifestSignedUrl,
  generateHLSSegmentSignedUrl 
} from './services/signedUrl';

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

### Batch URL Generation

```typescript
import { generateBatchSignedUrls } from './services/signedUrl';

const paths = [
  'hls/course-1/video-1/segment-0.ts',
  'hls/course-1/video-1/segment-1.ts',
  'hls/course-1/video-1/segment-2.ts'
];

const urlMap = await generateBatchSignedUrls(paths, 'hetzner', 900);

// Access individual URLs
const url0 = urlMap.get('hls/course-1/video-1/segment-0.ts').url;
```

---

## Video-Specific Operations

### Upload with Video Metadata

```typescript
const provider = getStorageProvider('hetzner');

const result = await provider.upload(file, {
  path: 'videos/course-1/subject-5/video-10.mp4',
  contentType: 'video/mp4',
  metadata: {
    videoId: '10',
    courseId: '1',
    subjectId: '5',
    uploadedBy: 'admin',
    uploadDate: new Date().toISOString()
  }
});
```

### Get Video Storage Provider

```typescript
import { getVideoStorageProvider } from './services/storageFactory';

const video = {
  id: 10,
  video_path: 'videos/course-1/video.mp4',
  storage_type: 'hetzner'
};

// Automatically uses video's storage type
const provider = getVideoStorageProvider(video);
```

### Generate Video URL

```typescript
import { generateVideoSignedUrl } from './services/signedUrl';

const video = {
  video_path: 'videos/course-1/video.mp4',
  storage_type: 'hetzner'
};

const { url, expiresIn, expiresAt } = await generateVideoSignedUrl(video);
```

---

## Configuration Access

### Get Video Config

```typescript
import { videoConfig } from './config/video';

const config = videoConfig();

console.log(config.tokenLifetime);           // 1800
console.log(config.urlExpiration);           // 900
console.log(config.tokenRefreshThreshold);   // 0.8
console.log(config.defaultStorageType);      // 'local' or 'hetzner'
```

### Get Hetzner Config

```typescript
import { getHetznerConfig, isHetznerEnabled } from './config/hetzner';

if (isHetznerEnabled()) {
  const config = getHetznerConfig();
  
  console.log(config.endpoint);        // https://...
  console.log(config.bucket);          // 'clinique-videos'
  console.log(config.region);          // 'fsn1'
}
```

---

## Error Handling

### Try-Catch Pattern

```typescript
try {
  const provider = getStorageProvider('hetzner');
  const result = await provider.upload(file, { path });
  console.log('Upload successful:', result.url);
} catch (error) {
  console.error('Upload failed:', error.message);
  
  // Fallback to local storage
  const localProvider = getStorageProvider('local');
  const result = await localProvider.upload(file, { path });
}
```

### Check URL Validity

```typescript
import { isSignedUrlValid, getTimeUntilExpiration } from './services/signedUrl';

const { expiresAt } = await generateSignedUrl(path, 'hetzner');

// Check if still valid
if (isSignedUrlValid(expiresAt)) {
  const remaining = getTimeUntilExpiration(expiresAt);
  console.log(`URL valid for ${remaining} more seconds`);
}
```

### Check Refresh Needed

```typescript
import { needsRefresh } from './services/signedUrl';

const { expiresAt } = await generateSignedUrl(path, 'hetzner', 900);

// Check if needs refresh (at 80% threshold)
if (needsRefresh(expiresAt, 0.8)) {
  console.log('URL needs refresh soon');
  const newUrl = await generateSignedUrl(path, 'hetzner', 900);
}
```

---

## Testing

### Test Local Storage

```typescript
const provider = getStorageProvider('local');

// Upload test
const testFile = { /* multer file */ };
const result = await provider.upload(testFile, {
  path: 'test/video.mp4'
});

// Check existence
const exists = await provider.exists('test/video.mp4');
console.log('File exists:', exists);

// Get metadata
const metadata = await provider.getMetadata('test/video.mp4');
console.log('File size:', metadata.size);

// Cleanup
await provider.delete('test/video.mp4');
```

### Test Hetzner Storage

```typescript
// Requires valid Hetzner credentials
const provider = getStorageProvider('hetzner');

// Upload test
const result = await provider.upload(testFile, {
  path: 'test/video.mp4',
  contentType: 'video/mp4'
});

// Generate signed URL
const url = await provider.getSignedUrl('test/video.mp4', {
  expiresIn: 60  // 1 minute for testing
});

console.log('Signed URL:', url);
console.log('Should contain Signature parameter');

// Cleanup
await provider.delete('test/video.mp4');
```

---

## Integration Example

### Complete Upload Flow

```typescript
import { getStorageProvider, createStoragePath } from './services/storageFactory';
import { generateVideoSignedUrl } from './services/signedUrl';

async function handleVideoUpload(file, courseId, subjectId, videoId) {
  try {
    // 1. Get storage provider
    const provider = getStorageProvider();
    
    // 2. Create organized path
    const path = createStoragePath('video', {
      courseId,
      subjectId,
      filename: `video-${videoId}.mp4`
    });
    
    // 3. Upload file
    const uploadResult = await provider.upload(file, {
      path,
      contentType: 'video/mp4',
      metadata: {
        videoId: videoId.toString(),
        courseId: courseId.toString(),
        subjectId: subjectId.toString()
      }
    });
    
    // 4. Save to database
    const video = {
      id: videoId,
      video_path: path,
      storage_type: provider.getType(),
      file_size: uploadResult.size,
      course_id: courseId,
      subject_id: subjectId
    };
    
    // Save video to database...
    
    // 5. Generate signed URL for immediate playback
    const { url, expiresAt } = await generateVideoSignedUrl(video);
    
    return {
      success: true,
      video,
      playbackUrl: url,
      expiresAt
    };
    
  } catch (error) {
    console.error('Video upload failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## Troubleshooting

### Issue: "HETZNER_ENDPOINT environment variable is required"
**Solution**: Set Hetzner credentials in .env or use local storage

### Issue: Signed URLs not working
**Solution**: Check AWS SDK is installed and credentials are correct

### Issue: File not found
**Solution**: Verify path structure matches createStoragePath format

### Issue: Upload fails to Hetzner
**Solution**: Check bucket permissions and CORS configuration

---

**Last Updated**: November 6, 2025
**Version**: Phase 2 Implementation
**Status**: ✅ Complete and tested
