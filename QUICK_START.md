# Quick Start Guide - Adding Videos

This guide explains how to configure the application and add videos to your webapp after the Hetzner HLS migration.

## 1. Configure the API URL

The frontend currently uses `localhost:5001` by default. You need to configure it for your environment.

### For Development

1. Copy the frontend environment file:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Edit `.env`:
   ```env
   REACT_APP_API_URL=http://localhost:5001
   ```

3. Restart your frontend development server:
   ```bash
   npm start
   ```

### For Production

1. Edit `frontend/.env`:
   ```env
   REACT_APP_API_URL=https://yourdomain.com
   ```

2. Rebuild the frontend:
   ```bash
   cd frontend
   npm run build
   ```

**Note:** The API URL is set at build time, so you must rebuild the frontend whenever you change it.

### Alternative: Use Proxy (Development Only)

For development, you can use the proxy setting in `package.json` which is already configured:
```json
"proxy": "http://localhost:5001"
```

This allows the frontend to make requests to `/api/videos` without specifying the full URL.

## 2. How to Add Videos

Since the upload UI has been removed, videos must be added manually. Here's the complete workflow:

### Step 1: Install Required Tools

```bash
# Install FFmpeg (for video conversion)
# Ubuntu/Debian:
sudo apt-get install ffmpeg

# macOS:
brew install ffmpeg

# Windows: Download from https://ffmpeg.org/

# Install AWS CLI (for S3 upload)
# Ubuntu/Debian:
sudo apt-get install awscli

# macOS:
brew install awscli

# Windows: Download from https://aws.amazon.com/cli/
```

### Step 2: Configure Hetzner Credentials

```bash
# Configure AWS CLI with your Hetzner credentials
aws configure set aws_access_key_id YOUR_HETZNER_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_HETZNER_SECRET_KEY
aws configure set region fsn1
```

### Step 3: Convert Video to HLS

Create a script `convert-to-hls.sh`:

```bash
#!/bin/bash
# convert-to-hls.sh

if [ $# -lt 2 ]; then
    echo "Usage: ./convert-to-hls.sh input.mp4 output_directory"
    exit 1
fi

INPUT_VIDEO="$1"
OUTPUT_DIR="$2"

echo "Converting $INPUT_VIDEO to HLS..."
mkdir -p "$OUTPUT_DIR"

ffmpeg -i "$INPUT_VIDEO" \
  -c:v libx264 -c:a aac \
  -hls_time 6 \
  -hls_list_size 0 \
  -hls_segment_filename "$OUTPUT_DIR/segment_%03d.ts" \
  -f hls \
  "$OUTPUT_DIR/output.m3u8"

echo "✅ Conversion complete: $OUTPUT_DIR/output.m3u8"
echo "Files created:"
ls -lh "$OUTPUT_DIR"
```

Make it executable:
```bash
chmod +x convert-to-hls.sh
```

Usage:
```bash
./convert-to-hls.sh my-video.mp4 ./output/course1/lesson1
```

### Step 4: Upload to Hetzner

Create a script `upload-to-hetzner.sh`:

```bash
#!/bin/bash
# upload-to-hetzner.sh

if [ $# -lt 2 ]; then
    echo "Usage: ./upload-to-hetzner.sh local_directory s3_path"
    echo "Example: ./upload-to-hetzner.sh ./output/course1/lesson1 videos/course1/lesson1"
    exit 1
fi

LOCAL_DIR="$1"
S3_PATH="$2"
BUCKET="video-content"  # Change to your bucket name
ENDPOINT="https://fsn1.your-objectstorage.com"  # Change to your endpoint

echo "Uploading from $LOCAL_DIR to s3://$BUCKET/$S3_PATH/"

# Upload .m3u8 files with shorter cache
echo "Uploading manifest files (.m3u8)..."
find "$LOCAL_DIR" -name "*.m3u8" -exec \
  aws s3 cp {} "s3://$BUCKET/$S3_PATH/" \
    --endpoint-url="$ENDPOINT" \
    --content-type "application/vnd.apple.mpegurl" \
    --cache-control "public, max-age=3600" \;

# Upload .ts files with longer cache
echo "Uploading segment files (.ts)..."
find "$LOCAL_DIR" -name "*.ts" -exec \
  aws s3 cp {} "s3://$BUCKET/$S3_PATH/" \
    --endpoint-url="$ENDPOINT" \
    --content-type "video/MP2T" \
    --cache-control "public, max-age=31536000" \;

echo "✅ Upload complete to s3://$BUCKET/$S3_PATH/"
```

Make it executable:
```bash
chmod +x upload-to-hetzner.sh
```

Usage:
```bash
./upload-to-hetzner.sh ./output/course1/lesson1 videos/course1/lesson1
```

### Step 5: Add to Database

After uploading, add a record to your database. You can do this via SQL or your backend API.

#### Option A: Direct SQL

```sql
-- Connect to your database
mysql -u username -p database_name

-- Insert video record
INSERT INTO videos (
  title,
  description,
  subject_id,
  video_path,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Introduction to Law - Lesson 1',
  'This lesson covers the basics of law',
  1,  -- Change to your subject_id
  'videos/course1/lesson1/output.m3u8',  -- S3 key only, not full URL
  true,
  NOW(),
  NOW()
);
```

#### Option B: Using Backend API (If Available)

If you have database management tools or can access the backend directly:

```bash
# Example using curl (if you have an admin endpoint)
curl -X POST http://localhost:5001/api/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: ******" \
  -d '{
    "title": "Introduction to Law - Lesson 1",
    "description": "This lesson covers the basics of law",
    "subject_id": 1,
    "video_path": "videos/course1/lesson1/output.m3u8",
    "is_active": true
  }'
```

### Step 6: Verify

1. **Check S3 Upload:**
   ```bash
   aws s3 ls s3://video-content/videos/course1/lesson1/ \
     --endpoint-url=https://fsn1.your-objectstorage.com
   ```

2. **Test Public Access:**
   ```bash
   curl -I https://fsn1.your-objectstorage.com/video-content/videos/course1/lesson1/output.m3u8
   ```

3. **Check in Application:**
   - Open your webapp
   - Navigate to the videos section
   - The new video should appear in the list

## 3. Complete Example Workflow

Here's a complete example adding a new video:

```bash
# 1. Convert video
./convert-to-hls.sh my-lesson.mp4 ./output/course1/lesson1

# 2. Upload to Hetzner
./upload-to-hetzner.sh ./output/course1/lesson1 videos/course1/lesson1

# 3. Add to database (using mysql)
mysql -u root -p clinique_db << EOF
INSERT INTO videos (title, description, subject_id, video_path, is_active, created_at, updated_at)
VALUES (
  'Introduction to Law - Lesson 1',
  'Basics of law and legal systems',
  1,
  'videos/course1/lesson1/output.m3u8',
  true,
  NOW(),
  NOW()
);
EOF

# 4. Verify upload
aws s3 ls s3://video-content/videos/course1/lesson1/ \
  --endpoint-url=https://fsn1.your-objectstorage.com

# 5. Test public access
curl -I https://fsn1.your-objectstorage.com/video-content/videos/course1/lesson1/output.m3u8
```

## 4. Troubleshooting

### Problem: "Request URL is still localhost"

**Solution:** 
- For development: This is normal. The frontend makes requests to `localhost:5001`
- For production: Edit `frontend/.env` to set `REACT_APP_API_URL=https://yourdomain.com` and rebuild

### Problem: "Video doesn't play"

**Check:**
1. Backend is configured with correct Hetzner credentials in `backend/.env`
2. Video path in database is correct (no leading slash, ends with `.m3u8`)
3. S3 bucket is public and CORS is configured
4. Files are uploaded to correct location

### Problem: "Cannot connect to Hetzner"

**Check:**
1. AWS CLI is configured with correct credentials
2. Endpoint URL is correct
3. Bucket name is correct
4. Network allows outbound S3 connections

## 5. Backend Configuration

Don't forget to configure your backend `.env` file:

```env
# Copy example file
cd backend
cp .env.example .env

# Edit .env with your values:
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_BUCKET=video-content
ENABLE_HLS=true
DATABASE_URL=******localhost:3306/database_name
JWT_SECRET=your-secret-key
```

Then restart your backend:
```bash
npm run dev
```

## 6. Admin Panel Info

The admin panel (Video Management) now shows:
- ✅ List of existing videos
- ✅ Delete functionality
- ⚠️ **No upload button** - Use manual workflow above
- ℹ️ Instructions pointing to this guide

## Additional Resources

- **Detailed Setup:** See `HETZNER_SETUP.md` for complete Hetzner configuration
- **CDN Setup:** See `CLOUDFLARE_SETUP.md` for Cloudflare optimization
- **Architecture:** See `MIGRATION_SUMMARY.md` for system overview

## Quick Reference

| Task | Command |
|------|---------|
| Convert video | `./convert-to-hls.sh input.mp4 output/dir` |
| Upload to S3 | `./upload-to-hetzner.sh output/dir s3/path` |
| List S3 files | `aws s3 ls s3://bucket/path/ --endpoint-url=...` |
| Test URL | `curl -I https://endpoint/bucket/path/output.m3u8` |
| Restart backend | `cd backend && npm run dev` |
| Rebuild frontend | `cd frontend && npm run build` |
