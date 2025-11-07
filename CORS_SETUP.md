# CORS Setup Guide for Hetzner S3 Bucket

## 🚨 CRITICAL: CORS Configuration Required for Video Playback

If you see **"Network error loading video"** or videos fail to load in the browser, this is a **CORS (Cross-Origin Resource Sharing)** issue. Your Hetzner S3 bucket MUST be configured to allow cross-origin requests from your website.

## What is CORS?

CORS is a security mechanism that controls which websites can access resources from your S3 bucket. Without proper CORS configuration, browsers will block video playback from Hetzner.

## Step 1: Create CORS Configuration File

Create a file named `cors.json` with the following content:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Range"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

### Explanation:

- **AllowedOrigins**: `["*"]` allows ALL origins (websites). For production, replace with your domain:
  ```json
  "AllowedOrigins": ["https://yourdomain.com", "https://www.yourdomain.com"]
  ```

- **AllowedMethods**: `GET` and `HEAD` are required for video streaming

- **AllowedHeaders**: `*` allows all headers (required for Range requests)

- **ExposeHeaders**: Headers that browsers can access (needed for HLS playback)

- **MaxAgeSeconds**: How long browsers cache the CORS policy (1 hour)

## Step 2: Apply CORS Configuration to Hetzner Bucket

### Using AWS CLI (Recommended)

```bash
# Install AWS CLI if not already installed
# Ubuntu/Debian: sudo apt-get install awscli
# macOS: brew install awscli
# Windows: https://aws.amazon.com/cli/

# Configure AWS CLI for Hetzner
aws configure --profile hetzner
# Enter when prompted:
#   AWS Access Key ID: <your-hetzner-access-key>
#   AWS Secret Access Key: <your-hetzner-secret-key>
#   Default region: leave empty (press Enter)
#   Default output format: json

# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket your-bucket-name \
  --cors-configuration file://cors.json \
  --endpoint-url https://fsn1.your-objectstorage.com \
  --profile hetzner
```

### Using s3cmd

```bash
# Install s3cmd
pip install s3cmd

# Configure s3cmd
s3cmd --configure

# Apply CORS
s3cmd setcors cors.json s3://your-bucket-name
```

## Step 3: Verify CORS Configuration

```bash
# Check CORS configuration
aws s3api get-bucket-cors \
  --bucket your-bucket-name \
  --endpoint-url https://fsn1.your-objectstorage.com \
  --profile hetzner
```

Expected output:
```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "HEAD"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag", "Content-Length", "Content-Range"],
            "MaxAgeSeconds": 3600
        }
    ]
}
```

## Step 4: Test CORS in Browser

1. Open your website with DevTools (F12)
2. Go to **Network** tab
3. Play a video
4. Look for `.m3u8` or `.ts` requests
5. Check the **Response Headers** - you should see:
   ```
   access-control-allow-origin: *
   access-control-allow-methods: GET, HEAD
   access-control-expose-headers: ETag, Content-Length, Content-Range
   ```

## Step 5: Make Bucket Public (If Videos Still Don't Load)

Your bucket must also have public read access:

```bash
# Set bucket public read policy
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
EOF

# Apply policy
aws s3api put-bucket-policy \
  --bucket your-bucket-name \
  --policy file://bucket-policy.json \
  --endpoint-url https://fsn1.your-objectstorage.com \
  --profile hetzner
```

## Production CORS Configuration (Secure)

For production, restrict origins to your domain only:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://yourdomain.com",
        "https://www.yourdomain.com",
        "http://localhost:3000"
      ],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": [
        "Range",
        "Content-Type",
        "Authorization"
      ],
      "ExposeHeaders": [
        "ETag",
        "Content-Length",
        "Content-Range",
        "Accept-Ranges"
      ],
      "MaxAgeSeconds": 86400
    }
  ]
}
```

## Troubleshooting CORS Issues

### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause**: CORS not configured on bucket  
**Fix**: Apply CORS configuration (Step 2)

### Issue: Videos load but fail midway

**Cause**: Missing `Range` header support  
**Fix**: Ensure CORS allows `Range` in `AllowedHeaders`

### Issue: "403 Forbidden" errors

**Cause**: Bucket policy doesn't allow public read  
**Fix**: Apply public read policy (Step 5)

### Issue: CORS works but videos still don't play

**Causes**:
1. Video files not uploaded to S3
2. Incorrect `video_path` in database
3. Wrong `HETZNER_ENDPOINT` or `HETZNER_BUCKET` in `.env`

**Debug**:
```bash
# Test if file exists
curl -I https://YOUR-ENDPOINT/YOUR-BUCKET/videos/test/output.m3u8

# Should return: HTTP/2 200
# If 404, file doesn't exist or path is wrong
# If 403, permissions issue
```

## Mobile Browser Compatibility

iOS Safari and Android Chrome require:
- `crossOrigin="anonymous"` on video element (✅ already set)
- `playsInline` attribute (✅ already set)
- CORS properly configured (follow steps above)

## Cache Considerations

After applying CORS configuration:
1. Clear browser cache (Ctrl+Shift+Del)
2. Hard reload (Ctrl+Shift+R)
3. Test in incognito/private mode

Browsers cache CORS responses for `MaxAgeSeconds` (1 hour by default).

## Testing CORS Manually

```bash
# Test CORS with curl
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Range" \
     -X OPTIONS \
     https://YOUR-ENDPOINT/YOUR-BUCKET/videos/test/output.m3u8 -v
```

Look for these headers in the response:
```
< access-control-allow-origin: https://yourdomain.com
< access-control-allow-methods: GET, HEAD
< access-control-allow-headers: Range
```

## Summary Checklist

- [ ] CORS configuration created (`cors.json`)
- [ ] CORS applied to Hetzner bucket
- [ ] CORS verified with AWS CLI
- [ ] Bucket policy set to public read
- [ ] Video files uploaded to S3
- [ ] Database `video_path` matches S3 file location
- [ ] Backend `.env` configured with correct endpoint/bucket
- [ ] Tested in browser DevTools Network tab
- [ ] CORS headers visible in response
- [ ] Videos play successfully on desktop
- [ ] Videos play successfully on mobile

## Need Help?

Check these files:
- `HETZNER_SETUP.md` - Complete S3 setup guide
- `DIAGNOSTIC_GUIDE.md` - Troubleshooting common issues
- `TESTING_GUIDE.md` - Local testing workflow

**Still having issues?** Check browser console for specific error messages and compare with troubleshooting section above.
