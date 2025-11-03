# Bunny.net Integration Guide

## Overview

This educational platform now uses Bunny.net Storage as the central file storage system for all uploads, downloads, and media playback. Videos, thumbnails, PDFs, and other assets are stored on and served from Bunny.net CDN.

## Features Implemented

### 1. Bunny.net Storage Integration
- All video uploads go directly to Bunny.net via FTP
- Thumbnails stored on Bunny.net
- Automatic file organization by course
- Efficient CDN delivery for fast video streaming
- Database stores Bunny.net CDN URLs

### 2. Video Player Page
- Dedicated page for watching videos (`/course/:courseId/video/:videoId`)
- Main video player with full controls
- Sidebar showing all course videos with thumbnails
- Click-to-play video switching without page reload
- Maintains authentication and access control logic
- Shows locked/unlocked status for each video

## Setup Instructions

### Prerequisites
- Node.js 12+ installed
- MySQL database running
- Bunny.net Storage Zone created

### Environment Configuration

Create `backend/.env` file with the following variables:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database Configuration
DATABASE_URL=mysql://user:password@localhost:3306/clinique_db

# Security
JWT_SECRET=your-secret-key
VIDEO_SECRET=your-video-secret-key
JWT_EXPIRES_IN=24h

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5001
BASE_URL=http://localhost:5001

# Bunny.net Storage Configuration
BUNNY_STORAGE_HOSTNAME=storage.bunnycdn.com
BUNNY_STORAGE_USERNAME=cliniquedesjuristesvideos
BUNNY_STORAGE_PASSWORD=2618a218-10c8-469a-93538a7ae921-7c28-499e
BUNNY_STORAGE_READONLY_PASSWORD=1fa435e1-2fbd-4c19-afb689a73265-0dbb-4756
BUNNY_STORAGE_PORT=21

# Bunny.net CDN Configuration
BUNNY_CDN_HOSTNAME=cliniquedesjuristesvideos.b-cdn.net
BUNNY_STORAGE_ZONE=cliniquedesjuristesvideos
```

### Installation

```bash
# Install all dependencies
npm run install:all

# Or install individually
cd backend && npm install
cd ../frontend && npm install
```

### Running Locally

```bash
# Run both backend and frontend together
npm run dev

# Or run individually:
# Backend (in one terminal)
cd backend && npm run dev

# Frontend (in another terminal)
cd frontend && npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

## Bunny.net Folder Structure

Files are organized in the following structure on Bunny.net:

```
/videos/
  /course-{courseId}/
    video-file-1.mp4
    video-file-2.mp4

/thumbnails/
  /course-{courseId}/
    thumbnail-1.jpg
    thumbnail-2.jpg

/materials/
  /course-{courseId}/
    document-1.pdf
    document-2.pdf

/blog/
  blog-image-1.jpg
  blog-image-2.jpg
```

### Manual Folder Creation

If needed, create these folders manually in your Bunny.net Storage Zone:
1. Login to Bunny.net dashboard
2. Go to Storage → Your Storage Zone
3. Create folders: `videos`, `thumbnails`, `materials`, `blog`
4. Create subfolders like `course-1`, `course-2` inside `videos` and `thumbnails`

## How It Works

### Video Upload Flow
1. Admin uploads video via admin dashboard
2. File is temporarily stored locally by multer
3. File is uploaded to Bunny.net via FTP
4. Bunny.net CDN URL is stored in database
5. Local temp file is deleted
6. Video is immediately available for streaming

### Video Playback Flow
1. User clicks "Voir contenu" (View content) on a course
2. User navigates to `/course/{courseId}/video/{videoId}` page
3. Video player loads video directly from Bunny.net CDN URL
4. Sidebar shows all course videos with thumbnails from Bunny.net
5. User can switch between videos without page reload

### Access Control
- Unchanged from original implementation
- Course enrollment required
- Subject-level access control maintained
- Locked videos appear with lock icon
- Authentication required for video playback

## API Changes

### New Endpoints

#### GET `/api/videos/url/:id`
Returns the video URL (Bunny.net CDN URL or local fallback)

**Response:**
```json
{
  "url": "https://cliniquedesjuristesvideos.b-cdn.net/videos/course-1/video.mp4",
  "source": "bunny"
}
```

### Modified Endpoints

#### POST `/api/videos`
Now uploads to Bunny.net instead of local storage

**Request:**
- `video` (file) - Video file
- `thumbnail` (file, optional) - Thumbnail image
- `title` (string) - Video title
- `description` (string) - Video description
- `subject_id` (number) - Subject ID

**Response:**
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": 1,
    "title": "Introduction",
    "video_path": "https://cliniquedesjuristesvideos.b-cdn.net/videos/course-1/video.mp4",
    "thumbnail_path": "https://cliniquedesjuristesvideos.b-cdn.net/thumbnails/course-1/thumb.jpg",
    ...
  }
}
```

#### DELETE `/api/videos/:id`
Now deletes from Bunny.net in addition to database

## Frontend Changes

### New Components

#### VideoPlayerPage (`/course/:courseId/video/:videoId`)
Full-screen video player page with:
- Main video player area
- Course breadcrumb navigation
- Video information display
- Sidebar with all course videos
- Thumbnail previews
- Duration display
- Locked/unlocked indicators

### Updated Components

#### CoursesPage
- Removed inline video modal
- Now navigates to VideoPlayerPage when clicking video
- Updated all video click handlers

#### Video Players
- `ProfessionalVideoPlayer.tsx` - Updated to handle Bunny.net URLs
- `CustomVideoPlayer.tsx` - Updated to handle Bunny.net URLs
- `VideoPreview.tsx` - Updated to handle Bunny.net thumbnail URLs

## Database Schema

Video records now store full Bunny.net CDN URLs:

```sql
videos table:
  - video_path: https://cliniquedesjuristesvideos.b-cdn.net/videos/course-1/video.mp4
  - file_path: https://cliniquedesjuristesvideos.b-cdn.net/videos/course-1/video.mp4 (same for compatibility)
  - thumbnail_path: https://cliniquedesjuristesvideos.b-cdn.net/thumbnails/course-1/thumb.jpg
```

### Migration for Existing Data

If you have existing local files, you'll need to:

1. Manually upload them to Bunny.net
2. Update the database records with new Bunny.net URLs

Example SQL update:
```sql
UPDATE videos 
SET video_path = 'https://cliniquedesjuristesvideos.b-cdn.net/videos/course-1/video.mp4',
    file_path = 'https://cliniquedesjuristesvideos.b-cdn.net/videos/course-1/video.mp4'
WHERE id = 1;
```

## Testing Checklist

### Backend Testing
- [ ] Video upload saves to Bunny.net
- [ ] Thumbnail upload saves to Bunny.net
- [ ] Video deletion removes from Bunny.net
- [ ] GET /api/videos returns Bunny.net URLs
- [ ] GET /api/videos/url/:id returns correct URL

### Frontend Testing
- [ ] Video player loads Bunny.net videos
- [ ] Thumbnails display correctly
- [ ] Video player page navigation works
- [ ] Video switching works without reload
- [ ] Locked/unlocked logic maintained
- [ ] Authentication required for viewing
- [ ] Access control (course/subject level) works
- [ ] Responsive design on mobile/tablet

### Integration Testing
- [ ] Upload video → appears in Bunny.net
- [ ] Upload video → playable immediately
- [ ] Click "Voir contenu" → navigates to video page
- [ ] Click video in sidebar → switches video
- [ ] Delete video → removes from Bunny.net

## Troubleshooting

### Connection Issues
- Verify Bunny.net credentials in `.env`
- Check firewall allows FTP connections (port 21)
- Ensure Storage Zone exists in Bunny.net

### Upload Failures
- Check file size limits (5GB max configured)
- Verify FTP credentials are correct
- Check Bunny.net storage quota

### Video Not Playing
- Verify CDN URL is accessible in browser
- Check CORS settings on Bunny.net
- Ensure video_path in database is correct Bunny.net URL

### FTP Connection Timeout
- Try using passive mode (already configured)
- Check network/firewall settings
- Verify Bunny.net service status

## Security Considerations

### Credentials
- Never commit `.env` file to git (already in .gitignore)
- Use read-only password for public endpoints
- Rotate passwords periodically

### Access Control
- All authentication logic preserved
- Course enrollment still required
- Subject-level access maintained
- Videos served from Bunny.net but access controlled by backend

## Future Enhancements

Potential improvements for production:
- [ ] Use Bunny.net API instead of FTP for uploads
- [ ] Implement upload progress tracking
- [ ] Add video transcoding via Bunny.net
- [ ] Use Bunny.net Stream for enhanced video delivery
- [ ] Add video analytics via Bunny.net
- [ ] Implement automatic thumbnail generation
- [ ] Add video preview/seeking thumbnails
- [ ] Enable adaptive bitrate streaming

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in backend console
3. Verify Bunny.net dashboard for file status
4. Check browser console for frontend errors

## Files Modified

### Backend
- `src/services/bunnyStorage.ts` - NEW: Bunny.net FTP service
- `src/services/fileUpload.ts` - Added Bunny.net upload helpers
- `src/routes/videos.ts` - Updated upload/delete/stream routes
- `package.json` - Added basic-ftp dependency
- `.env` - NEW: Environment configuration

### Frontend
- `src/pages/VideoPlayerPage.tsx` - NEW: Dedicated video player page
- `src/pages/CoursesPage.tsx` - Updated to navigate to video page
- `src/components/ProfessionalVideoPlayer.tsx` - Updated URL handling
- `src/components/CustomVideoPlayer.tsx` - Updated URL handling
- `src/components/VideoPreview.tsx` - Updated thumbnail handling
- `src/App.tsx` - Added video player route
- `src/lib/api.ts` - ESLint fix
- `src/lib/oneTabPolicy.ts` - ESLint fix

### Root
- `package.json` - NEW: Scripts for running dev environment

## License

This implementation follows the project's existing license.
