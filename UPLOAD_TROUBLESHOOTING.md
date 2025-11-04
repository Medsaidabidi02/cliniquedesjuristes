# Upload Troubleshooting Guide

## Error: "Upload failed: 500 Internal Server Error"

This generic error can have several causes. Follow these steps to diagnose and fix the issue.

## Step 1: Check Backend Logs

The backend logs contain crucial diagnostic information. Look for these key log lines when the application starts:

### Storage Mode
```
📦 File upload storage: Local Storage
```
or
```
📦 File upload storage: Wasabi S3
```

This tells you which storage system is active.

### Wasabi Validation (if credentials are set)
```
✅ Wasabi S3 configuration validated successfully
```
or
```
⚠️ Wasabi configuration is incomplete or using placeholders. Falling back to local storage.
```

## Step 2: Check Upload Logs

When you attempt an upload, look for these debug messages:

```
📤 Uploading files...
🔍 uploadVideo called - useWasabi: false, hasBuffer: false, hasFilename: true
✅ Video uploaded: uploads/videos/abc-123.mp4 (using local storage)
```

### Key Information:
- **useWasabi**: Should be `false` for local storage, `true` for Wasabi
- **hasBuffer**: Should be `false` for local storage, `true` for Wasabi (memoryStorage)
- **hasFilename**: Should be `true` for local storage, `false` for Wasabi

## Step 3: Common Issues and Solutions

### Issue 1: "filename is undefined"

**Error Message:**
```
❌ Error uploading files: File upload failed: filename is undefined
```

**Cause:** Multer storage configuration mismatch

**Diagnosis:**
Check the debug log:
```
🔍 uploadVideo called - useWasabi: false, hasBuffer: true, hasFilename: false
```

This shows:
- useWasabi is false (should use local storage)
- hasBuffer is true (file in memory)
- hasFilename is false (no disk file)

**Problem:** The code thinks it should use local storage, but the file is in memory storage.

**Solution:**
This happens when the module is loaded with one configuration but the actual upload uses different settings. Restart the backend server:

```bash
# Stop the server
# Clear node cache if needed
rm -rf node_modules/.cache

# Restart
npm run dev
```

### Issue 2: "Bucket does not exist"

**Error Message:**
```
❌ Error uploading files: Failed to upload to Wasabi: The specified bucket does not exist
```

**Cause:** Wasabi credentials are set but bucket doesn't exist or name is wrong

**Solution:** 
See `VIDEO_STORAGE_GUIDE.md` - Either:
1. Remove/unset Wasabi credentials to use local storage
2. Create the bucket in Wasabi and ensure name matches configuration

### Issue 3: Upload works but video doesn't play

**Symptoms:** 
- Upload succeeds (status 201)
- Video appears in database
- But playback fails (404 or streaming error)

**Diagnosis:**
Check where the file actually is:

```bash
# For local storage:
ls -la backend/uploads/videos/

# Check the video_path in database matches actual file location
```

**Common causes:**
1. **Path mismatch**: Database has `videos/file.mp4` but file is at `uploads/videos/file.mp4`
2. **Missing file**: Upload succeeded in database but file write failed
3. **Permissions**: File exists but server can't read it

**Solution:**
```bash
# Fix permissions
chmod -R 755 backend/uploads/

# Check file ownership
ls -l backend/uploads/videos/
```

### Issue 4: Module configuration cached

**Symptoms:**
- Changed environment variables
- Restarted server
- Still seeing old behavior

**Cause:** The `useWasabi` variable is set at module load time (line 13 in fileUpload.ts)

**Solution:**
```bash
# Clear Node's require cache
rm -rf node_modules/.cache

# Or use nodemon/ts-node-dev for auto-reload
npm run dev
```

## Step 4: Verify Configuration

### For Local Storage (No Setup Needed):

1. **Check environment:**
```bash
# These should NOT be set or should be empty
echo $WASABI_ACCESS_KEY
echo $WASABI_SECRET_KEY
```

2. **Check .env file:**
```bash
# Should NOT have actual values, only placeholders
grep WASABI backend/.env
```

Expected output:
```
WASABI_ACCESS_KEY=${WASABI_ACCESS_KEY}
WASABI_SECRET_KEY=${WASABI_SECRET_KEY}
```

3. **Check directories exist:**
```bash
ls -la backend/uploads/
# Should show: images/ videos/ thumbnails/ blog/
```

4. **Check permissions:**
```bash
# Backend user needs write access
chmod -R 755 backend/uploads/
```

### For Wasabi S3:

1. **Check environment variables are set:**
```bash
echo $WASABI_ACCESS_KEY    # Should show actual key
echo $WASABI_SECRET_KEY    # Should show actual secret  
echo $WASABI_BUCKET_NAME   # Should show bucket name
```

2. **Verify bucket exists:**
- Log into Wasabi console
- Check bucket name matches exactly
- Verify bucket is in correct region

3. **Test credentials:**
```bash
# Use AWS CLI (compatible with Wasabi)
aws s3 ls s3://your-bucket-name \
  --endpoint-url=https://s3.eu-central-1.wasabisys.com \
  --profile wasabi
```

## Step 5: Enable Debug Mode

Add more verbose logging:

```typescript
// In backend/src/services/fileUpload.ts
console.log('=== FILE UPLOAD DEBUG ===');
console.log('useWasabi:', useWasabi);
console.log('storage type:', storage === multer.memoryStorage() ? 'memory' : 'disk');
console.log('WASABI_ACCESS_KEY set:', !!process.env.WASABI_ACCESS_KEY);
console.log('WASABI_ACCESS_KEY value:', process.env.WASABI_ACCESS_KEY?.substring(0, 5) + '...');
console.log('========================');
```

## Step 6: Test Upload Manually

### Test Local Storage Upload:

```bash
curl -X POST http://localhost:5001/api/videos \
  -F "title=Test Video" \
  -F "subject_id=1" \
  -F "video=@/path/to/test.mp4"
```

Check response:
```json
{
  "success": true,
  "id": 123,
  "video_path": "uploads/videos/abc-123.mp4"
}
```

Verify file exists:
```bash
ls -la backend/uploads/videos/abc-123.mp4
```

### Test with curl verbose:

```bash
curl -v -X POST http://localhost:5001/api/videos \
  -F "title=Test Video" \
  -F "subject_id=1" \
  -F "video=@test.mp4" 2>&1 | tee upload-debug.log
```

Look for:
- HTTP status code
- Response headers
- Error messages in response body

## Step 7: Check Database

If upload completes but has issues:

```sql
-- Check if video record was created
SELECT * FROM videos ORDER BY created_at DESC LIMIT 1;

-- Check the video_path value
SELECT id, title, video_path, file_path FROM videos WHERE id = <video_id>;
```

The path should match storage mode:
- **Local**: `uploads/videos/filename.mp4`
- **Wasabi**: `videos/filename.mp4`

## Step 8: Check Server Logs Location

Depending on how server is running:

```bash
# If using pm2
pm2 logs

# If using systemd
journalctl -u your-service-name -f

# If running directly
# Check terminal output where npm run dev/start was executed

# Check for log files
find backend -name "*.log"
```

## Emergency Reset

If nothing works, reset to clean state:

```bash
# 1. Stop the server

# 2. Remove all environment variables related to Wasabi
unset WASABI_ACCESS_KEY
unset WASABI_SECRET_KEY
unset WASABI_BUCKET_NAME
unset WASABI_REGION
unset WASABI_ENDPOINT
unset CDN_DOMAIN

# 3. Clear caches
rm -rf backend/node_modules/.cache
rm -rf backend/dist

# 4. Rebuild
cd backend
npm run build

# 5. Restart
npm run dev
```

You should see:
```
⚠️ Wasabi configuration is incomplete or using placeholders. Falling back to local storage.
📦 File upload storage: Local Storage
```

Now try uploading again.

## Getting Help

If still experiencing issues, gather this information:

1. **Backend startup logs** (first 50 lines)
2. **Upload attempt logs** (the request with error)
3. **Configuration check:**
```bash
echo "useWasabi: check startup logs"
ls -la backend/uploads/
env | grep WASABI
```

4. **Error message** from frontend console
5. **Network tab** showing the upload request/response

Share this in your issue report for faster diagnosis.
