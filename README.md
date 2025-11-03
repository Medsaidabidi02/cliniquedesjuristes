"# cliniquedesjuristes

## Bunny.net Storage Integration

This application uses Bunny.net for video storage and streaming. All videos and thumbnails are stored on Bunny.net CDN for optimal performance and global delivery.

### Features

- **Secure Video Streaming**: Time-limited signed URLs for video playback
- **Cloud Storage**: All media files stored on Bunny.net CDN
- **Direct Upload**: Admin can upload videos directly to Bunny.net
- **Locked Content**: Support for premium/locked videos with enrollment checks
- **Professional Player**: Dedicated video player page with lesson playlist

### Local Development Setup

#### Prerequisites

1. Node.js (v20+)
2. MySQL database
3. Bunny.net account with credentials

#### Installation

```bash
# Install dependencies for backend
cd backend
npm install

# Install dependencies for frontend
cd ../frontend
npm install

# Install root dependencies for test scripts
cd ..
npm install
```

#### Configuration

1. Copy the `.env.example` file to `.env` in the backend directory:

```bash
cd backend
cp .env.example .env
```

2. Update the `.env` file with your database and Bunny.net credentials:

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/database_name

# Bunny.net Storage
BUNNY_HOSTNAME=storage.bunnycdn.com
BUNNY_USERNAME=your_storage_zone_name
BUNNY_PASSWORD=your_write_password
BUNNY_READONLY_PASSWORD=your_readonly_password
BUNNY_STORAGE_ZONE=your_storage_zone_name
BUNNY_PULL_ZONE_URL=https://your-pullzone.b-cdn.net
BUNNY_URL_EXPIRY_MINUTES=60
```

#### Database Migration

Run the Bunny.net videos migration:

```bash
cd backend
# Using MySQL CLI
mysql -u username -p database_name < migrations/2025-11-03-add_bunny_videos_support.sql

# Or using the run-migration script
node run-migration.js migrations/2025-11-03-add_bunny_videos_support.sql
```

### Running the Application

#### Development Mode

Start both backend and frontend in development mode:

```bash
# Terminal 1 - Backend (from project root)
cd backend
npm run dev

# Terminal 2 - Frontend (from project root)
cd frontend
npm start
```

The backend will run on `http://localhost:5001` and the frontend on `http://localhost:3000`.

### Testing Bunny.net Integration

#### Test Video Upload

Test uploading a video to Bunny.net storage:

```bash
# Make sure backend is running (npm run dev in backend/)
# Then in another terminal from project root:
cd backend
npm run test:upload
```

This test will:
- Create a test video file
- Upload it to Bunny.net via the API
- Verify the file exists on Bunny.net storage
- Verify the database entry was created
- Clean up test files

#### Test Signed URL Generation

Test the signed URL generation and authorization:

```bash
# Make sure backend is running (npm run dev in backend/)
# Then in another terminal from project root:
cd backend
npm run test:signedurl
```

This test will:
- Request a signed URL for an unlocked video
- Verify URL structure and parameters
- Test access denial for locked videos
- Test rate limiting functionality

### API Endpoints

#### Video Upload to Bunny.net

```http
POST /api/videos/bunny/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
  - title: string (required)
  - description: string
  - course_id: number (required)
  - lesson_slug: string (required)
  - is_locked: boolean
  - video: file (required)
  - thumbnail: file (optional)
```

#### Get Signed Video URL

```http
GET /api/videos/:videoId/signed-url
Authorization: Bearer <token>

Response:
{
  "success": true,
  "videoUrl": "https://pullzone.b-cdn.net/videos/course/lesson.mp4?token=...&expires=...",
  "thumbnailUrl": "https://pullzone.b-cdn.net/thumbnails/course/lesson.jpg?token=...&expires=...",
  "expiresIn": 3600,
  "video": {
    "id": 1,
    "title": "Lesson Title",
    "description": "...",
    "duration": 600,
    "is_locked": false
  }
}
```

### Video Player Page

Access the video player page at:

```
/course/:courseId
```

Features:
- Center video player with HTML5 controls
- Right sidebar with lesson playlist
- Lock badges for premium content
- Automatic signed URL fetching
- Lesson switching without page reload
- Responsive design for mobile/tablet

### File Organization on Bunny.net

All files are organized in the following structure:

```
/videos/{courseId}/{lessonSlug}.mp4
/thumbnails/{courseId}/{lessonSlug}.jpg
/materials/{courseId}/{filename}.{ext}
/avatars/{userId}/{filename}.{ext}
```

### Security Features

- **Signed URLs**: Time-limited URLs that expire after configured duration
- **Authentication**: User must be logged in to access videos
- **Authorization**: Locked videos require enrollment or full access
- **Rate Limiting**: 100 requests per 15 minutes per IP for signed URLs
- **Server-side Credentials**: Bunny.net write credentials never exposed to frontend

### Troubleshooting

#### Video Upload Fails

1. Check Bunny.net credentials in `.env`
2. Verify storage zone name matches your Bunny.net account
3. Check backend logs for detailed error messages
4. Ensure disk space is available for temporary local files

#### Signed URL Returns 403

1. Check if video is locked and user has enrollment
2. Verify token generation is working (check backend logs)
3. Ensure Bunny.net Pull Zone is configured correctly
4. Check if signed URL has expired

#### Video Won't Play

1. Verify the video file exists on Bunny.net storage
2. Check Pull Zone URL configuration
3. Test the signed URL directly in browser
4. Check browser console for CORS or network errors

### Production Deployment

1. Update `.env` with production database and Bunny.net credentials
2. Build the frontend: `cd frontend && npm run build:prod`
3. Build the backend: `cd backend && npm run build:prod`
4. Set `NODE_ENV=production`
5. Configure CORS for production domains
6. Enable rate limiting and security headers
7. Run migrations on production database

### Support

For issues related to:
- Bunny.net storage: Check [Bunny.net Documentation](https://docs.bunny.net/)
- Video playback: Verify Pull Zone configuration
- Upload issues: Check backend logs and network tab

