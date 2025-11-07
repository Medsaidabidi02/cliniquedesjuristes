# Configuration Diagnostic Guide

This guide helps you verify that your Hetzner configuration is correct and that videos/thumbnails are pulling from Hetzner, not localhost.

## Step 1: Check Backend Configuration

### 1.1 Verify .env File Exists

```bash
cd backend
ls -la .env
```

If the file doesn't exist, create it:
```bash
cp .env.example .env
```

### 1.2 Check Environment Variables

Run this command to verify your Hetzner settings:

```bash
cd backend
cat .env | grep HETZNER
```

You should see:
```env
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_BUCKET=your-bucket-name
```

**Critical:** Replace `your-objectstorage.com` and `your-bucket-name` with YOUR ACTUAL values!

### 1.3 Verify Configuration is Loaded

Start your backend and check the logs:

```bash
cd backend
npm run dev
```

Look for these lines in the output:
```
🎬 Videos API loaded - Hetzner HLS-only mode
🚀 Server running on port 5001
🎬 Hetzner HLS enabled: true
```

If you see `🎬 Hetzner HLS enabled: false`, then `ENABLE_HETZNER` is not set to `true`.

## Step 2: Test Backend API Directly

### 2.1 Test Video Endpoint

Open a new terminal and run:

```bash
curl http://localhost:5001/api/videos | jq '.[0] | {id, title, hls_url, playback_url}'
```

**Expected Output:**
```json
{
  "id": 1,
  "title": "Your Video Title",
  "hls_url": "https://fsn1.your-objectstorage.com/your-bucket/videos/path/output.m3u8",
  "playback_url": "https://fsn1.your-objectstorage.com/your-bucket/videos/path/output.m3u8"
}
```

**Bad Output (Still localhost):**
```json
{
  "id": 1,
  "title": "Your Video Title",
  "hls_url": null,
  "playback_url": null
}
```

If `hls_url` is `null`, check your backend logs for errors like:
- `Hetzner storage is not enabled`
- `Hetzner endpoint and bucket must be configured`

## Step 3: Check Frontend Configuration

### 3.1 Verify Frontend .env

```bash
cd frontend
cat .env
```

Should show:
```env
REACT_APP_API_URL=http://localhost:5001
```

### 3.2 Restart Frontend

After any `.env` changes:
```bash
cd frontend
npm start
```

## Step 4: Browser Network Tab Verification

### 4.1 Open Developer Tools

1. Open your app in browser: `http://localhost:3000`
2. Press `F12` or Right-click → Inspect
3. Go to **Network** tab
4. Click the **filter** icon and select **XHR** 
5. Navigate to a page with videos

### 4.2 Check API Request

Look for request to `/api/videos`:

**Request URL should be:**
```
http://localhost:5001/api/videos
```

**Response should contain:**
```json
[
  {
    "id": 1,
    "title": "Video Title",
    "hls_url": "https://fsn1.your-objectstorage.com/bucket/path/output.m3u8",
    ...
  }
]
```

### 4.3 Check Video Playback Request

When you click play on a video:

1. Filter by `.m3u8` in Network tab
2. Look for the HLS manifest request

**Good (Pulling from Hetzner):**
```
Request URL: https://fsn1.your-objectstorage.com/your-bucket/videos/test/output.m3u8
Remote Address: [Hetzner IP]
```

**Bad (Still localhost):**
```
Request URL: http://localhost:5001/uploads/...
```

This means your backend `.env` is not configured correctly.

## Step 5: Common Issues & Fixes

### Issue 1: "Hetzner storage is not enabled"

**Symptom:** Backend logs show this error

**Cause:** `ENABLE_HETZNER` is not set to `true` (it's case-sensitive!)

**Fix:**
```bash
# Edit backend/.env
ENABLE_HETZNER=true  # Must be exactly "true" (lowercase)
```

Then restart backend.

### Issue 2: Videos show null URLs

**Symptom:** API returns `hls_url: null`

**Cause:** Backend can't generate URLs

**Check:**
1. Is `ENABLE_HETZNER=true`?
2. Is `HETZNER_ENDPOINT` set? (should start with https://)
3. Is `HETZNER_BUCKET` set?
4. Does video have valid `video_path` in database ending with `.m3u8`?

**Fix:**
```bash
# Verify database
mysql -u root -p your_database << 'EOF'
SELECT id, title, video_path FROM videos LIMIT 5;
EOF
```

Video paths should look like: `videos/course1/lesson1/output.m3u8` (NOT full URLs)

### Issue 3: Network tab shows localhost URLs

**Symptom:** Video requests go to `http://localhost:5001/uploads/...`

**Cause:** Old video paths in database OR backend not configured

**Fix:**

1. **Check backend logs** - Should show:
   ```
   🎬 Generated public HLS URL: https://fsn1.your-objectstorage.com/...
   ```

2. **Check database** - Video paths should NOT include localhost:
   ```sql
   -- Check current paths
   SELECT id, title, video_path FROM videos;
   
   -- Fix if needed (example)
   UPDATE videos 
   SET video_path = 'videos/course1/lesson1/output.m3u8'
   WHERE id = 1;
   ```

### Issue 4: CORS errors

**Symptom:** Browser console shows CORS error

**Cause:** Hetzner bucket CORS not configured

**Fix:** See HETZNER_SETUP.md section on CORS configuration.

## Step 6: Automatic Configuration Check Script

Create this script to automatically verify your configuration:

```bash
#!/bin/bash
# check-config.sh

echo "=== Hetzner Configuration Checker ==="
echo ""

# Check backend .env
echo "1. Checking backend/.env..."
if [ -f "backend/.env" ]; then
    echo "   ✅ backend/.env exists"
    
    if grep -q "ENABLE_HETZNER=true" backend/.env; then
        echo "   ✅ ENABLE_HETZNER=true"
    else
        echo "   ❌ ENABLE_HETZNER not set to true"
    fi
    
    if grep -q "HETZNER_ENDPOINT=https://" backend/.env; then
        ENDPOINT=$(grep "HETZNER_ENDPOINT" backend/.env | cut -d'=' -f2)
        echo "   ✅ HETZNER_ENDPOINT set: $ENDPOINT"
    else
        echo "   ❌ HETZNER_ENDPOINT not configured"
    fi
    
    if grep -q "HETZNER_BUCKET=" backend/.env; then
        BUCKET=$(grep "HETZNER_BUCKET" backend/.env | cut -d'=' -f2)
        echo "   ✅ HETZNER_BUCKET set: $BUCKET"
    else
        echo "   ❌ HETZNER_BUCKET not configured"
    fi
else
    echo "   ❌ backend/.env does not exist"
fi

echo ""
echo "2. Checking backend is running..."
if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    echo "   ✅ Backend is running on port 5001"
else
    echo "   ❌ Backend not running. Start it with: cd backend && npm run dev"
fi

echo ""
echo "3. Checking API response..."
RESPONSE=$(curl -s http://localhost:5001/api/videos 2>/dev/null)
if echo "$RESPONSE" | grep -q "hls_url"; then
    echo "   ✅ API returns hls_url field"
    
    # Check if it's a Hetzner URL
    if echo "$RESPONSE" | grep -q "https://"; then
        echo "   ✅ URLs point to Hetzner (https://)"
    else
        echo "   ⚠️  URLs might not be from Hetzner"
    fi
else
    echo "   ❌ API not returning hls_url field"
fi

echo ""
echo "4. Checking frontend/.env..."
if [ -f "frontend/.env" ]; then
    echo "   ✅ frontend/.env exists"
    
    if grep -q "REACT_APP_API_URL" frontend/.env; then
        API_URL=$(grep "REACT_APP_API_URL" frontend/.env | cut -d'=' -f2)
        echo "   ✅ REACT_APP_API_URL set: $API_URL"
    fi
else
    echo "   ❌ frontend/.env does not exist"
fi

echo ""
echo "=== Summary ==="
echo "If all checks pass (✅), your configuration is correct."
echo "If you see ❌, fix those issues and restart the backend."
echo ""
```

Save this as `check-config.sh` and run:

```bash
chmod +x check-config.sh
./check-config.sh
```

## Step 7: Complete Working Example

Here's a complete working example with REAL values (replace with yours):

### Backend .env

```env
# Server
PORT=5001
NODE_ENV=development

# Database  
DATABASE_URL=mysql://root:password@localhost:3306/clinique_db

# Security
JWT_SECRET=my-secret-key-12345
JWT_EXPIRES_IN=24h

# Hetzner - REPLACE THESE WITH YOUR ACTUAL VALUES!
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_BUCKET=my-video-bucket

# HLS
ENABLE_HLS=true

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5001
BASE_URL=http://localhost:5001

# Admin
DEFAULT_ADMIN_EMAIL=admin@test.com
DEFAULT_ADMIN_PASSWORD=admin123
```

### Frontend .env

```env
REACT_APP_API_URL=http://localhost:5001
```

### Test Video in Database

```sql
INSERT INTO videos (
  title, 
  description, 
  subject_id, 
  video_path,  -- S3 key ONLY, not full URL
  is_active,
  created_at,
  updated_at
) VALUES (
  'Test Video',
  'Test from Hetzner',
  1,
  'test/output.m3u8',  -- This is the S3 object key
  true,
  NOW(),
  NOW()
);
```

### Expected Backend Log

When you start the backend:
```
🎬 Videos API loaded - Hetzner HLS-only mode
🚀 Server running on port 5001
🌍 Environment: development
📡 API URL: http://localhost:5001
🎬 Hetzner HLS enabled: true
```

When you fetch videos:
```
📋 GET /api/videos - Fetching videos with public HLS URLs
🎬 Generated public HLS URL: https://fsn1.your-objectstorage.com/my-video-bucket/test/output.m3u8
✅ Found 1 videos with public URLs
```

### Expected Browser Network Tab

When video plays:
```
Name: output.m3u8
Type: application/vnd.apple.mpegurl
URL: https://fsn1.your-objectstorage.com/my-video-bucket/test/output.m3u8
Status: 200 OK
```

## Still Having Issues?

If videos are still pulling from localhost after following all steps:

1. **Stop both backend and frontend** (Ctrl+C)
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Delete node_modules** (optional, for clean start):
   ```bash
   cd backend && rm -rf node_modules && npm install
   cd ../frontend && rm -rf node_modules && npm install
   ```
4. **Verify `.env` files one more time**
5. **Start backend first**, check logs for "Hetzner HLS enabled: true"
6. **Then start frontend**
7. **Open browser in incognito mode** to avoid cache
8. **Check Network tab** while playing video

The key indicator is the backend log: `🎬 Generated public HLS URL: https://...`

If you don't see this, your backend configuration is wrong.
