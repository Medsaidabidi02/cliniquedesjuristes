"# Clinique des Juristes

Educational platform for legal courses with Bunny.net CDN integration.

## Quick Start

### Prerequisites
- Node.js >= 12.0.0
- MySQL 5+
- FFmpeg (for thumbnail generation)

### Installation

1. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

2. **Frontend Setup**
```bash
cd frontend
npm install
npm start
```

### Database Setup

Run the MySQL database setup:
```bash
cd frontend
node setup-mysql5-database.js
```

Apply migrations:
```bash
cd backend
# Run migration files in migrations/ directory
```

## Bunny.net Integration

This platform uses Bunny.net Storage for all media files:
- Videos: `/videos/{courseId}/{filename}.mp4`
- Thumbnails: `/thumbnails/{courseId}/{filename}.jpg`
- Materials: `/materials/{courseId}/{filename}.{ext}`

### Configuration

Configure Bunny.net in `backend/.env`:
```env
BUNNY_STORAGE_ZONE=your-storage-zone
BUNNY_WRITE_API_KEY=your-write-key
BUNNY_READ_API_KEY=your-read-key
BUNNY_CDN_URL=https://your-zone.b-cdn.net
```

## Testing

### Test Video Upload
Tests the admin upload endpoint and verifies files on Bunny.net:
```bash
cd backend
npm run test:upload
```

### Test Signed URLs
Tests signed URL generation and access control:
```bash
cd backend
npm run test:signedurl
```

### Manual Testing
1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm start`
3. Open http://localhost:3000
4. Login as admin
5. Upload a video via Admin Dashboard
6. View course content by clicking "Voir contenu"

## Development

- **Backend**: `cd backend && npm run dev` (Port 5001)
- **Frontend**: `cd frontend && npm start` (Port 3000)

## Documentation

See additional documentation:
- `BUNNY_NET_INTEGRATION.md` - Technical integration details
- `BUNNY_NET_TESTING_GUIDE.md` - Comprehensive testing guide
- `SECURITY_SUMMARY_BUNNY.md` - Security assessment

## Features

- ✅ Video upload to Bunny.net Storage
- ✅ Automatic thumbnail generation (FFmpeg)
- ✅ Signed URLs for secure streaming
- ✅ Access control (locked/unlocked videos)
- ✅ Dedicated course player page
- ✅ Admin upload interface
- ✅ Global CDN delivery

## Architecture

```
Backend (Node.js/Express)
├── Storage API Client (Bunny.net)
├── Thumbnail Generator (FFmpeg)
├── Signed URL Generation
└── Access Control

Frontend (React)
├── Course Player Page
├── Video List Sidebar
├── Admin Upload Interface
└── Video Streaming
```
