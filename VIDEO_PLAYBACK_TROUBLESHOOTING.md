# Video Playback Troubleshooting Guide

## Issue: Videos Upload Successfully But Won't Play

If videos are uploading to Bunny.net but won't play back, follow these steps to diagnose and fix the issue.

### Step 1: Verify Bunny.net Configuration

Check your `.env-1.production` or `.env` file for these variables:

```env
BUNNY_PULL_ZONE_URL=https://your-actual-pullzone.b-cdn.net
BUNNY_SECURITY_KEY=your_actual_security_key
BUNNY_STORAGE_ZONE=your_actual_storage_zone_name
BUNNY_PASSWORD=your_actual_password
```

**Important**: Replace the placeholder values with your actual Bunny.net credentials!

### Step 2: Check Pull Zone Configuration on Bunny.net

1. Log in to https://dash.bunny.net/
2. Go to **CDN** > **Pull Zones**
3. Find your pull zone (should match BUNNY_PULL_ZONE_URL)
4. Verify:
   - Pull Zone is **enabled** and **active**
   - Origin URL points to your storage zone
   - Token Authentication is configured (if using signed URLs)

### Step 3: Verify Storage and Pull Zone Are Linked

Your Pull Zone needs to be connected to your Storage Zone:

1. In Bunny.net dashboard, go to your **Pull Zone**
2. Check **Origin** settings
3. Make sure it's set to your Storage Zone: `storage.bunnycdn.com/your-storage-zone-name`

### Step 4: Check Token Authentication Setup

If using signed URLs (recommended for security):

1. In Pull Zone settings, go to **Security**
2. Enable **Token Authentication**
3. Set a **Token Authentication Key** (this should match your BUNNY_SECURITY_KEY)
4. Copy this key to your `.env` file as `BUNNY_SECURITY_KEY`

**Note**: If Token Authentication is disabled, videos might play without signed URLs, but this is less secure.

### Step 5: Verify File Upload Structure

Files should be uploaded to Bunny.net in this structure:

```
/videos/{courseId}/{lessonSlug}.mp4
/thumbnails/{courseId}/{lessonSlug}.jpg
```

To verify:
1. Log in to Bunny.net
2. Go to **Storage** > your storage zone
3. Browse to `/videos/` folder
4. You should see folders named with course IDs (e.g., `/videos/1/`, `/videos/2/`)
5. Inside each folder, video files named like `lesson-name.mp4`

### Step 6: Test Signed URL Generation

Check backend logs when trying to play a video:

```
📹 Video path from database: /videos/1/lesson-slug.mp4
🔐 Generated signed URL (expires in 60m): /videos/1/lesson-slug.mp4
✅ Generated signed URL for video 123
🔗 Signed URL: https://your-pullzone.b-cdn.net/videos/1/lesson-slug.mp4?token=...
```

If you see errors like:
- `BUNNY_PULL_ZONE_URL environment variable is required` → Configure env vars
- `Failed to generate signed URL` → Check BUNNY_SECURITY_KEY
- `Video path not configured` → Database doesn't have the video path

### Step 7: Test Video URL Directly

Copy the signed URL from backend logs and test it in your browser:

1. Open the signed URL in a new browser tab
2. The video should start downloading or playing
3. If you get 403 Forbidden → Token authentication issue
4. If you get 404 Not Found → File doesn't exist on Bunny.net or wrong path

### Step 8: Check Browser Console

Open browser DevTools (F12) > Console when trying to play a video:

**Common errors:**

```
Failed to load resource: 403 Forbidden
```
→ Token authentication not configured correctly

```
Failed to load resource: 404 Not Found
```
→ Video doesn't exist at that path on Bunny.net

```
CORS policy blocked
```
→ Need to configure CORS in Pull Zone settings

### Step 9: Configure CORS (If Needed)

If you see CORS errors:

1. Go to Pull Zone settings in Bunny.net
2. Find **CORS** settings
3. Add your domain: `https://cliniquedesjuristes.com`
4. Enable CORS for video requests

### Step 10: Alternative - Disable Token Authentication (Testing Only)

For testing purposes, you can temporarily disable token authentication:

1. In Pull Zone settings, disable **Token Authentication**
2. Videos will be publicly accessible (not recommended for production)
3. Update backend to generate simple URLs without tokens

**To use simple URLs without token authentication:**

The backend currently generates signed URLs. If your Pull Zone doesn't use token authentication, the videos might not play. You can temporarily test by accessing the URL without the token parameter.

## Common Issues and Solutions

### Issue: "Failed to generate signed URL"

**Cause**: Missing or incorrect environment variables

**Solution**:
```bash
# Check your .env file
cat backend/.env-1.production | grep BUNNY

# Make sure these are set with actual values (not placeholders):
BUNNY_PULL_ZONE_URL=https://your-real-pullzone.b-cdn.net
BUNNY_SECURITY_KEY=your-real-key
```

### Issue: Video URL returns 404

**Cause**: File doesn't exist on Bunny.net or wrong path structure

**Solution**:
1. Check Bunny.net Storage zone to verify file exists
2. Verify the path matches: `/videos/{courseId}/{lessonSlug}.mp4`
3. Check database `path` column has correct value

### Issue: Video URL returns 403

**Cause**: Token authentication is enabled but token is invalid

**Solution**:
1. Verify BUNNY_SECURITY_KEY matches your Pull Zone token key
2. Check token hasn't expired
3. Ensure token generation logic matches Bunny.net's expected format

### Issue: Videos uploaded to wrong folder

**Cause**: Course ID not being passed correctly

**Solution**:
Check the upload form is sending `course_id` correctly. The video should be uploaded to `/videos/{course_id}/lesson-slug.mp4`, not just `/lesson-slug.mp4`.

## Debug Checklist

- [ ] Environment variables configured with actual values (not placeholders)
- [ ] Pull Zone is active and linked to Storage Zone
- [ ] Token Authentication configured (if using signed URLs)
- [ ] Files exist on Bunny.net in correct folder structure
- [ ] CORS configured if needed
- [ ] Backend server restarted after env var changes
- [ ] Browser console shows no errors
- [ ] Signed URL works when tested directly in browser

## Quick Test Commands

```bash
# Test if backend can generate signed URLs
curl http://localhost:5001/api/videos/1/signed-url

# Check what's in the database
# (Use your MySQL client)
SELECT id, title, path, lesson_slug FROM videos LIMIT 5;

# Restart backend after config changes
cd backend
npm run dev
```

## Still Not Working?

If videos still won't play after following all steps:

1. Check backend logs for detailed error messages
2. Verify you can access Bunny.net directly: https://storage.bunnycdn.com/your-zone/videos/1/test.mp4
3. Test with a small video file first
4. Contact Bunny.net support if their service has issues

## Production Deployment Notes

For production:
1. Use Token Authentication (required for security)
2. Set appropriate token expiration time (default 60 minutes)
3. Configure CORS for your production domain
4. Use HTTPS for Pull Zone
5. Monitor Bunny.net bandwidth usage
6. Set up CDN caching rules if needed
