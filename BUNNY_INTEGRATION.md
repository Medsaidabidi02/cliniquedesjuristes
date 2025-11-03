# Bunny.net Storage Integration Guide

## Overview

This project has been fully integrated with Bunny.net Storage to handle all media files (videos, thumbnails, images, etc.). All file uploads now go to Bunny.net's FTP storage and are delivered via their global CDN.

## What Changed

### Backend Changes

#### 1. New Bunny.net Storage Service
- **File**: `backend/src/services/bunnyStorage.ts`
- **Purpose**: Handles all FTP operations with Bunny.net
- **Features**:
  - File upload to Bunny.net
  - File deletion from Bunny.net
  - File listing
  - CDN URL generation
  - Connection testing
  - Folder structure setup

#### 2. Updated File Upload Service
- **File**: `backend/src/services/fileUpload.ts`
- **Changes**:
  - `uploadVideo()` now uploads to Bunny.net `/videos/{course-id}/` folder
  - `uploadThumbnail()` now uploads to Bunny.net `/thumbnails/{course-id}/` folder
  - `uploadImage()` now uploads to Bunny.net `/images/` folder
  - Local files are deleted after successful upload to Bunny.net

#### 3. Updated Video Routes
- **File**: `backend/src/routes/videos.ts`
- **Changes**:
  - Video upload route stores files on Bunny.net
  - Video streaming route redirects to Bunny.net CDN URLs
  - Thumbnail serving route redirects to Bunny.net CDN URLs
  - Video deletion also deletes from Bunny.net

#### 4. Updated Video Stream Routes
- **File**: `backend/src/routes/videoStream.ts`
- **Changes**:
  - Protected video streaming now redirects to Bunny.net CDN
  - Access control is maintained before redirect

#### 5. Updated Blog Routes
- **File**: `backend/src/routes/blog.ts`
- **Changes**:
  - Blog image uploads now go to Bunny.net `/blog/` folder

### Frontend Changes

#### 1. New Video Player Page
- **File**: `frontend/src/pages/VideoPlayerPage.tsx`
- **Purpose**: Dedicated page for watching videos
- **Features**:
  - Full-screen video player
  - Video list sidebar with thumbnails
  - Video switching without page reload
  - Access control and locking
  - Subject information display
  - Responsive design

#### 2. New Video Player Page Styles
- **File**: `frontend/src/styles/VideoPlayerPage.css`
- **Purpose**: Styling for the video player page

#### 3. Updated Courses Page
- **File**: `frontend/src/pages/CoursesPage.tsx`
- **Changes**:
  - "Voir contenu" button now navigates to dedicated video player page
  - Removed expandable video list from course cards

#### 4. Updated App Routes
- **File**: `frontend/src/App.tsx`
- **Changes**:
  - Added route: `/subject/:subjectId/video/:videoId?`

#### 5. Updated Video Service
- **File**: `frontend/src/lib/videoService.ts`
- **Changes**:
  - `getVideoStreamUrl()` now generates Bunny.net CDN URLs
  - `getThumbnailUrl()` now generates Bunny.net CDN URLs

### Configuration Changes

#### Environment Variables
- **File**: `backend/.env-1.production`
- **New Variables**:
  ```env
  BUNNY_STORAGE_HOSTNAME=storage.bunnycdn.com
  BUNNY_STORAGE_USERNAME=cliniquedesjuristesvideos
  BUNNY_STORAGE_PASSWORD=2618a218-10c8-469a-93538a7ae921-7c28-499e
  BUNNY_STORAGE_PORT=21
  BUNNY_CDN_HOSTNAME=cliniquedesjuristesvideos.b-cdn.net
  ```

## Bunny.net Folder Structure

```
Bunny.net Storage (cliniquedesjuristesvideos)
├── /videos/
│   ├── /course-1/
│   │   ├── video1.mp4
│   │   ├── video2.mp4
│   │   └── ...
│   ├── /course-2/
│   │   └── ...
│   └── /general/
│       └── (videos not associated with a specific course)
│
├── /thumbnails/
│   ├── /course-1/
│   │   ├── thumb1.jpg
│   │   ├── thumb2.jpg
│   │   └── ...
│   ├── /course-2/
│   │   └── ...
│   └── /general/
│       └── (thumbnails not associated with a specific course)
│
├── /materials/
│   └── (PDFs, documents, etc.)
│
├── /blog/
│   └── (blog cover images and content images)
│
└── /images/
    └── (general platform images)
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

The `basic-ftp` package has been added for FTP operations.

### 2. Configure Environment

Make sure your `.env` file includes the Bunny.net credentials:

```env
BUNNY_STORAGE_HOSTNAME=storage.bunnycdn.com
BUNNY_STORAGE_USERNAME=cliniquedesjuristesvideos
BUNNY_STORAGE_PASSWORD=2618a218-10c8-469a-93538a7ae921-7c28-499e
BUNNY_STORAGE_PORT=21
BUNNY_CDN_HOSTNAME=cliniquedesjuristesvideos.b-cdn.net
```

### 3. Build Backend

```bash
cd backend
npm run build
```

### 4. Setup Bunny.net Folder Structure

**Option A: Using JavaScript (requires build first)**
```bash
cd backend
npm run build
node setup-bunny-storage.js
```

**Option B: Using TypeScript (no build required)**
```bash
cd backend
npx ts-node setup-bunny-storage.ts
```

This script will:
- Automatically load environment variables from `.env-1.production` or `.env`
- Test the connection to Bunny.net
- Create the required folder structure
- Display the folder layout

**Note**: The script automatically loads Bunny.net credentials from your `.env-1.production` file. Make sure this file contains the required environment variables as shown in step 2.

### 5. Build Frontend

```bash
cd frontend
npm run build
```

## How It Works

### Video Upload Flow

1. User selects video and thumbnail files in admin dashboard
2. Files are temporarily saved to local `uploads/` directory via multer
3. Backend uploads files to Bunny.net using FTP:
   - Videos go to `/videos/course-{id}/{filename}`
   - Thumbnails go to `/thumbnails/course-{id}/{filename}`
4. Database stores Bunny.net paths (e.g., `/videos/course-1/video.mp4`)
5. Local temporary files are deleted
6. Upload succeeds and user sees confirmation

### Video Streaming Flow

1. User clicks on a course and selects "View content"
2. Frontend navigates to `/subject/{subjectId}/video`
3. VideoPlayerPage loads:
   - Fetches subject details
   - Fetches all videos for the subject
   - Checks user access permissions
4. When video is played:
   - videoService generates Bunny.net CDN URL
   - Example: `https://cliniquedesjuristesvideos.b-cdn.net/videos/course-1/video.mp4`
5. Video player streams directly from Bunny.net CDN
6. User can switch videos without page reload

### Access Control

- Access control is maintained on the frontend before video is loaded
- For protected streaming endpoint, access is checked before redirect to CDN
- Locked subjects/videos show lock icon and prevent playback

## CDN URLs

### Video URL Format
```
https://cliniquedesjuristesvideos.b-cdn.net/videos/course-{id}/{filename}
```

### Thumbnail URL Format
```
https://cliniquedesjuristesvideos.b-cdn.net/thumbnails/course-{id}/{filename}
```

### Blog Image URL Format
```
https://cliniquedesjuristesvideos.b-cdn.net/blog/{filename}
```

## Testing

### Test Video Upload
1. Login as admin
2. Navigate to admin dashboard
3. Go to Video Management
4. Upload a test video with thumbnail
5. Check that video appears in video list
6. Check console logs for Bunny.net upload confirmation

### Test Video Playback
1. Login as student
2. Navigate to Courses page
3. Click "View content" on an enrolled course
4. Verify navigation to video player page
5. Verify video plays from Bunny.net CDN
6. Check browser network tab for CDN URLs

### Test Access Control
1. Login as student without course enrollment
2. Try to access video player page
3. Verify access denied message
4. Enroll in course
5. Verify access granted

## Troubleshooting

### Connection Issues
If you get FTP connection errors:
- Verify credentials in `.env` file
- Check firewall settings
- Ensure port 21 is not blocked
- Try running `node setup-bunny-storage.js` to test connection

### Upload Failures
If uploads fail:
- Check Bunny.net account status
- Verify storage quota
- Check file permissions in `uploads/` directory
- Review backend console logs for detailed errors

### Video Not Playing
If videos don't play:
- Check browser console for CDN URL
- Verify file exists on Bunny.net
- Check CORS settings on Bunny.net
- Verify CDN hostname is correct

## Migration from Local Storage

If you have existing videos in local storage, you need to migrate them:

1. List all videos in database
2. For each video:
   - Download from local storage
   - Upload to Bunny.net using bunnyStorage.uploadFile()
   - Update database with new Bunny.net path
   - Delete local file

Example migration script (you'll need to create this):
```javascript
const videos = await database.query('SELECT * FROM videos');
for (const video of videos) {
  if (!video.video_path.startsWith('/videos/')) {
    // Still local, needs migration
    const localPath = path.join('uploads/videos', video.video_path);
    const remotePath = `/videos/course-${video.course_id}/${video.video_path}`;
    await bunnyStorage.uploadFile(localPath, remotePath);
    await database.query(
      'UPDATE videos SET video_path = ? WHERE id = ?',
      [remotePath, video.id]
    );
  }
}
```

## Performance Benefits

### Before (Local Storage)
- Videos streamed through Node.js backend
- Limited by server bandwidth and CPU
- No caching or CDN benefits
- High server load during video playback

### After (Bunny.net CDN)
- Videos delivered from global CDN
- Automatic geo-replication
- Edge caching for fast loading
- Zero server load for video delivery
- Reduced hosting costs
- Better streaming performance

## Security

- Bunny.net credentials stored in environment variables
- Access control maintained before CDN redirect
- FTP password is write-only (different from read password)
- CDN URLs are public but content is protected by access control logic

## Cost Considerations

- Storage: $0.01 per GB/month
- Traffic: $0.01 per GB (first 500 GB free)
- Free SSL and CDN included
- No minimum commitment

## Support

For Bunny.net support:
- Dashboard: https://panel.bunny.net
- Documentation: https://docs.bunny.net
- Support: support@bunny.net

## Notes

- All new uploads automatically go to Bunny.net
- Local storage is only used as temporary staging
- Video streaming is direct from CDN (no backend proxy)
- Folder structure is organized by course for better management
- CDN URLs are cached at the edge for fast delivery
