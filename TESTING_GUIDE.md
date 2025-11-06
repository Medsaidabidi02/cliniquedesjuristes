# Testing Guide - Pulling Videos from Hetzner Bucket

This guide shows you how to test video playback from Hetzner S3 bucket on your local machine before deployment.

## Prerequisites

Before testing, you need:
1. A Hetzner Object Storage account with a bucket created
2. At least one test video uploaded to your bucket in HLS format
3. Your Hetzner credentials (Access Key, Secret Key, Endpoint)

## Step 1: Set Up Test Video on Hetzner

### Option A: Use a Public Test HLS Stream (Quick Test)

For quick testing without uploading your own video, you can temporarily use a public test HLS stream:

1. **Create a test video record in your database:**
   ```sql
   -- Connect to your database
   mysql -u root -p your_database_name
   
   -- Insert a test record that points to a public HLS stream
   INSERT INTO videos (
     title,
     description,
     subject_id,
     video_path,
     is_active,
     created_at,
     updated_at
   ) VALUES (
     'Test Video - Big Buck Bunny',
     'Test HLS stream from public source',
     1,  -- Make sure this subject_id exists in your subjects table
     'test/sample.m3u8',  -- This will be overridden in testing
     true,
     NOW(),
     NOW()
   );
   ```

2. **Temporarily modify backend for testing** (we'll revert this):
   
   Edit `backend/src/services/hetznerService.ts` to add a test override at the top of `getPublicVideoUrl`:
   
   ```typescript
   export const getPublicVideoUrl = (videoPath: string): string => {
     // TEMPORARY TEST OVERRIDE - Remove after testing
     if (videoPath === 'test/sample.m3u8') {
       const testUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
       console.log(`🧪 Using test HLS URL: ${testUrl}`);
       return testUrl;
     }
     // END TEST OVERRIDE
     
     if (!config.hetzner.enabled) {
       throw new Error('Hetzner storage is not enabled');
     }
     // ... rest of function
   ```

### Option B: Upload Your Own Test Video to Hetzner (Recommended)

1. **Convert a test video to HLS:**
   ```bash
   # Download a short test video or use your own
   # For example, download Big Buck Bunny trailer (60 seconds)
   wget http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4 -O test.mp4
   
   # Convert to HLS
   mkdir -p test-output
   ffmpeg -i test.mp4 \
     -c:v libx264 -c:a aac \
     -hls_time 6 \
     -hls_list_size 0 \
     -hls_segment_filename "test-output/segment_%03d.ts" \
     -f hls \
     test-output/output.m3u8
   ```

2. **Configure AWS CLI with your Hetzner credentials:**
   ```bash
   # Set your Hetzner credentials
   aws configure set aws_access_key_id YOUR_HETZNER_ACCESS_KEY
   aws configure set aws_secret_access_key YOUR_HETZNER_SECRET_KEY
   aws configure set region fsn1
   ```

3. **Upload to your Hetzner bucket:**
   ```bash
   # Replace with your actual values:
   # - BUCKET_NAME: Your Hetzner bucket name
   # - ENDPOINT: Your Hetzner endpoint (e.g., https://fsn1.your-objectstorage.com)
   
   BUCKET_NAME="your-bucket-name"
   ENDPOINT="https://fsn1.your-objectstorage.com"
   
   # Upload manifest
   aws s3 cp test-output/output.m3u8 \
     "s3://$BUCKET_NAME/test/output.m3u8" \
     --endpoint-url="$ENDPOINT" \
     --content-type "application/vnd.apple.mpegurl" \
     --cache-control "public, max-age=3600"
   
   # Upload segments
   aws s3 cp test-output/ \
     "s3://$BUCKET_NAME/test/" \
     --recursive \
     --exclude "*" \
     --include "*.ts" \
     --endpoint-url="$ENDPOINT" \
     --content-type "video/MP2T" \
     --cache-control "public, max-age=31536000"
   ```

4. **Verify upload:**
   ```bash
   # List files in bucket
   aws s3 ls "s3://$BUCKET_NAME/test/" --endpoint-url="$ENDPOINT"
   
   # Test public access
   curl -I "https://$ENDPOINT/$BUCKET_NAME/test/output.m3u8"
   # Should return 200 OK
   ```

5. **Insert test video in database:**
   ```sql
   INSERT INTO videos (
     title,
     description,
     subject_id,
     video_path,
     is_active,
     created_at,
     updated_at
   ) VALUES (
     'Test Video - From Hetzner',
     'Test video uploaded to Hetzner bucket',
     1,  -- Make sure this subject_id exists
     'test/output.m3u8',  -- Path in your bucket
     true,
     NOW(),
     NOW()
   );
   ```

## Step 2: Configure Backend for Testing

1. **Create backend `.env` file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `backend/.env` with your Hetzner credentials:**
   ```env
   # Server Configuration
   PORT=5001
   NODE_ENV=development
   
   # Database Configuration (update with your credentials)
   DATABASE_URL=mysql://username:password@localhost:3306/your_database_name
   
   # Security
   JWT_SECRET=test-jwt-secret-key
   JWT_EXPIRES_IN=24h
   
   # Hetzner Object Storage - UPDATE THESE VALUES!
   ENABLE_HETZNER=true
   HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
   HETZNER_BUCKET=your-bucket-name
   
   # HLS Streaming
   ENABLE_HLS=true
   
   # URLs
   FRONTEND_URL=http://localhost:3000
   API_URL=http://localhost:5001
   BASE_URL=http://localhost:5001
   
   # Admin Credentials
   DEFAULT_ADMIN_EMAIL=admin@test.com
   DEFAULT_ADMIN_PASSWORD=admin123
   ```

3. **Important: Replace placeholder values:**
   - `HETZNER_ENDPOINT`: Your actual Hetzner endpoint (find in Hetzner console)
   - `HETZNER_BUCKET`: Your bucket name
   - `DATABASE_URL`: Your database connection string

## Step 3: Configure Frontend for Testing

1. **Create frontend `.env` file:**
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. **Edit `frontend/.env`:**
   ```env
   REACT_APP_API_URL=http://localhost:5001
   ```

## Step 4: Start the Application

1. **Start the backend:**
   ```bash
   cd backend
   npm install  # If not already done
   npm run dev
   ```
   
   You should see output like:
   ```
   🎬 Videos API loaded - Hetzner HLS-only mode
   🚀 Server running on port 5001
   🎬 Hetzner HLS enabled: true
   ```

2. **In a new terminal, start the frontend:**
   ```bash
   cd frontend
   npm install  # If not already done
   npm start
   ```
   
   Browser should open at `http://localhost:3000`

## Step 5: Test Video Playback

1. **Navigate to videos page** in your browser (e.g., `http://localhost:3000/videos`)

2. **Open browser DevTools** (F12 or Right-click → Inspect)

3. **Go to Network tab** and filter by "m3u8"

4. **Click on a video** to play it

5. **Check the Network tab:**
   - You should see requests to your Hetzner endpoint (not localhost)
   - Example: `https://fsn1.your-objectstorage.com/your-bucket-name/test/output.m3u8`
   - Look for the `Remote Address` in the request headers

6. **Check the Console tab** for logs:
   - Look for: `🎬 Generated public HLS URL: https://...`
   - This confirms the URL being used

## Step 6: Verify It's Working

### Backend Verification

Check your backend terminal for these logs:
```
📋 GET /api/videos/1 - Fetching video with public URL
🎬 Generated public HLS URL: https://fsn1.your-objectstorage.com/your-bucket-name/test/output.m3u8
✅ Found video 1 with public HLS URL
```

### Frontend Verification

In browser console, you should see:
```
🎬 Loading HLS video: https://fsn1.your-objectstorage.com/your-bucket-name/test/output.m3u8
✅ HLS manifest parsed successfully
```

### Network Verification

In Network tab:
1. Find the `.m3u8` request
2. Check the **Request URL** - should start with your Hetzner endpoint
3. Check **Response Headers** - should include CORS headers if configured
4. Status should be `200 OK`

## Troubleshooting

### Issue 1: "Hetzner storage is not enabled"

**Cause:** `ENABLE_HETZNER` is not set to `true`

**Fix:**
```bash
# In backend/.env, make sure:
ENABLE_HETZNER=true
```

### Issue 2: Video still shows localhost URLs

**Cause:** Backend not properly configured or not restarted

**Fix:**
1. Stop backend (Ctrl+C)
2. Verify `backend/.env` has correct values
3. Restart: `npm run dev`
4. Check logs for: `🎬 Hetzner HLS enabled: true`

### Issue 3: CORS errors in browser

**Cause:** Hetzner bucket CORS not configured

**Fix:** Configure CORS on your bucket:
```bash
cat > cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket your-bucket-name \
  --cors-configuration file://cors-config.json \
  --endpoint-url=https://fsn1.your-objectstorage.com
```

### Issue 4: 403 Forbidden when accessing video

**Cause:** Bucket is not public

**Fix:** Make bucket public:
```bash
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket your-bucket-name \
  --policy file://bucket-policy.json \
  --endpoint-url=https://fsn1.your-objectstorage.com
```

### Issue 5: Cannot find video in database

**Fix:** Make sure you have a subject_id that exists:
```sql
-- Check existing subjects
SELECT id, title FROM subjects;

-- Update video with valid subject_id
UPDATE videos SET subject_id = 1 WHERE id = (SELECT MAX(id) FROM videos);
```

## Quick Test Checklist

- [ ] Hetzner bucket created
- [ ] Test video uploaded to bucket (or using public test stream)
- [ ] Bucket is public (returns 200 when curling .m3u8 URL)
- [ ] CORS configured on bucket
- [ ] `backend/.env` has `ENABLE_HETZNER=true`
- [ ] `backend/.env` has correct `HETZNER_ENDPOINT` and `HETZNER_BUCKET`
- [ ] Backend restarted after `.env` changes
- [ ] Frontend `.env` has `REACT_APP_API_URL=http://localhost:5001`
- [ ] Video record exists in database with correct `video_path`
- [ ] Browser DevTools Network tab shows requests to Hetzner (not localhost)

## Example: Complete Test Setup

Here's a complete example you can copy-paste (replace YOUR_* values):

```bash
# 1. Backend configuration
cd backend
cat > .env << 'EOF'
PORT=5001
NODE_ENV=development
DATABASE_URL=mysql://username:password@localhost:3306/your_db
JWT_SECRET=test-secret
JWT_EXPIRES_IN=24h
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_BUCKET=your-bucket-name
ENABLE_HLS=true
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5001
BASE_URL=http://localhost:5001
DEFAULT_ADMIN_EMAIL=admin@test.com
DEFAULT_ADMIN_PASSWORD=admin123
EOF

# 2. Frontend configuration  
cd ../frontend
cat > .env << 'EOF'
REACT_APP_API_URL=http://localhost:5001
EOF

# 3. Test video in database
mysql -u root -p your_database_name << 'EOF'
INSERT INTO videos (title, description, subject_id, video_path, is_active, created_at, updated_at)
VALUES ('Test Video', 'Test from Hetzner', 1, 'test/output.m3u8', true, NOW(), NOW());
EOF

# 4. Start services
cd backend && npm run dev &
cd frontend && npm start
```

Then open `http://localhost:3000` and play the video while watching the Network tab!

## After Testing

If you used the temporary test override in `hetznerService.ts`, remember to remove it before committing.
