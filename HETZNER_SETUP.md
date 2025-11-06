# Hetzner Object Storage Setup for HLS Video Streaming

This document describes how to configure Hetzner Object Storage (S3-compatible) for hosting HLS video content.

## Overview

Hetzner Object Storage provides S3-compatible storage that's perfect for hosting large video files. Combined with Cloudflare CDN, it offers a cost-effective solution for video streaming.

## Prerequisites

1. Hetzner Cloud account
2. Object Storage enabled in your Hetzner project
3. S3-compatible client tool (AWS CLI, s3cmd, or Cyberduck)

## Initial Setup

### 1. Create Object Storage

1. Log in to [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Navigate to your project
3. Click **Object Storage** in the left sidebar
4. Click **Create Object Storage**
5. Choose your region:
   - `fsn1` (Falkenstein, Germany) - Europe
   - `nbg1` (Nuremberg, Germany) - Europe  
   - `hel1` (Helsinki, Finland) - Europe
6. Note down your credentials:
   - Access Key
   - Secret Key
   - Endpoint URL

### 2. Create a Bucket

#### Using Hetzner Console

1. In Object Storage section, click **Create Bucket**
2. Enter bucket name (e.g., `video-content`)
3. Click **Create**

#### Using AWS CLI

```bash
# Configure AWS CLI with Hetzner credentials
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set region fsn1

# Create bucket
aws s3 mb s3://video-content --endpoint-url=https://fsn1.your-objectstorage.com
```

## Bucket Configuration

### 1. Set Bucket to Public

Since we're using public HLS streaming (no signed URLs), make the bucket public:

#### Using AWS CLI

```bash
# Create public access policy
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::video-content/*"
    }
  ]
}
EOF

# Apply policy
aws s3api put-bucket-policy \
  --bucket video-content \
  --policy file://bucket-policy.json \
  --endpoint-url=https://fsn1.your-objectstorage.com
```

### 2. Configure CORS

HLS streaming requires proper CORS headers:

```bash
# Create CORS configuration
cat > cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": [
        "ETag",
        "Content-Length",
        "Content-Type",
        "Content-Range",
        "Accept-Ranges"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket video-content \
  --cors-configuration file://cors-config.json \
  --endpoint-url=https://fsn1.your-objectstorage.com
```

### 3. Configure Cache Headers

Set appropriate cache headers for HLS files:

#### For .m3u8 files (manifests)

```bash
# Upload with shorter cache time (manifests may change)
aws s3 cp video.m3u8 s3://video-content/videos/course1/ \
  --endpoint-url=https://fsn1.your-objectstorage.com \
  --content-type "application/vnd.apple.mpegurl" \
  --cache-control "public, max-age=3600" \
  --metadata-directive REPLACE
```

#### For .ts files (segments)

```bash
# Upload with longer cache time (segments never change)
aws s3 cp segment.ts s3://video-content/videos/course1/ \
  --endpoint-url=https://fsn1.your-objectstorage.com \
  --content-type "video/MP2T" \
  --cache-control "public, max-age=31536000" \
  --metadata-directive REPLACE
```

## Video Upload Workflow

### 1. Convert Videos to HLS

Use FFmpeg to convert MP4 to HLS format:

```bash
#!/bin/bash
# convert-to-hls.sh

INPUT_VIDEO="$1"
OUTPUT_DIR="$2"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Convert to HLS with multiple quality levels
ffmpeg -i "$INPUT_VIDEO" \
  -c:v libx264 -c:a aac \
  -hls_time 6 \
  -hls_list_size 0 \
  -hls_segment_filename "$OUTPUT_DIR/segment_%03d.ts" \
  -f hls \
  "$OUTPUT_DIR/output.m3u8"

echo "✅ Conversion complete: $OUTPUT_DIR/output.m3u8"
```

Usage:
```bash
./convert-to-hls.sh input.mp4 ./output/course1/lesson1
```

### 2. Upload to Hetzner

```bash
#!/bin/bash
# upload-hls-to-hetzner.sh

LOCAL_DIR="$1"
S3_PATH="$2"
BUCKET="video-content"
ENDPOINT="https://fsn1.your-objectstorage.com"

# Upload .m3u8 files with shorter cache
find "$LOCAL_DIR" -name "*.m3u8" -exec \
  aws s3 cp {} "s3://$BUCKET/$S3_PATH/" \
    --endpoint-url="$ENDPOINT" \
    --content-type "application/vnd.apple.mpegurl" \
    --cache-control "public, max-age=3600" \;

# Upload .ts files with longer cache
find "$LOCAL_DIR" -name "*.ts" -exec \
  aws s3 cp {} "s3://$BUCKET/$S3_PATH/" \
    --endpoint-url="$ENDPOINT" \
    --content-type "video/MP2T" \
    --cache-control "public, max-age=31536000" \;

echo "✅ Upload complete to s3://$BUCKET/$S3_PATH/"
```

Usage:
```bash
./upload-hls-to-hetzner.sh ./output/course1/lesson1 videos/course1/lesson1
```

### 3. Verify Upload

```bash
# List files in bucket
aws s3 ls s3://video-content/videos/course1/lesson1/ \
  --endpoint-url=https://fsn1.your-objectstorage.com

# Test public access
curl -I https://fsn1.your-objectstorage.com/video-content/videos/course1/lesson1/output.m3u8
```

## Backend Configuration

Update your `.env` file with Hetzner credentials:

```env
# Hetzner Object Storage
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_BUCKET=video-content

# HLS Streaming
ENABLE_HLS=true
```

## Database Schema

Store only the S3 object key in your database:

```sql
-- Example video record
INSERT INTO videos (
  title,
  subject_id,
  video_path,  -- S3 object key only
  is_active
) VALUES (
  'Introduction to Law',
  1,
  'videos/course1/lesson1/output.m3u8',  -- Not a full URL
  true
);
```

The backend will combine this with the Hetzner endpoint to generate the full URL:
```
https://fsn1.your-objectstorage.com/video-content/videos/course1/lesson1/output.m3u8
```

## Folder Structure

Organize your content logically:

```
video-content/  (bucket)
├── videos/
│   ├── course_1/
│   │   ├── lesson_1/
│   │   │   ├── output.m3u8
│   │   │   ├── segment_001.ts
│   │   │   ├── segment_002.ts
│   │   │   └── ...
│   │   ├── lesson_2/
│   │   └── ...
│   ├── course_2/
│   └── ...
└── thumbnails/
    ├── course_1_lesson_1.jpg
    └── ...
```

## Access Control

### Public Content (Current Setup)

All content is publicly accessible - anyone with the URL can view it.

**Pros:**
- Simple setup
- No backend overhead
- Works with Cloudflare CDN
- Lower latency

**Cons:**
- URLs can be shared
- No user-level access control

### Private Content (Future Enhancement)

For private content, you can implement:

1. **Signed URLs:**
   - Generate time-limited signed URLs in backend
   - User must request new URL when expired
   - Requires changes to current architecture

2. **Cloudflare Workers:**
   - Verify user tokens at edge
   - Block unauthorized requests before reaching storage
   - Maintains caching benefits

## Cost Estimation

### Hetzner Object Storage Pricing (as of 2024)

- **Storage:** €0.0119 per GB/month
- **Outbound traffic:** €0.01 per GB
- **Inbound traffic:** Free
- **API requests:** Free

### Example Costs

For 100GB of video content with 1TB/month traffic:

**Without Cloudflare CDN:**
- Storage: €1.19/month
- Traffic: €10.00/month (1TB × €0.01)
- **Total: €11.19/month**

**With Cloudflare CDN (95% cache hit):**
- Storage: €1.19/month
- Traffic: €0.50/month (50GB × €0.01)
- **Total: €1.69/month** (85% savings!)

## Monitoring

### Using AWS CLI

```bash
# Check bucket size
aws s3 ls s3://video-content --recursive --human-readable --summarize \
  --endpoint-url=https://fsn1.your-objectstorage.com

# List recent uploads
aws s3 ls s3://video-content/videos/ --recursive \
  --endpoint-url=https://fsn1.your-objectstorage.com \
  | sort -k1,2
```

### Using Hetzner Console

1. Navigate to **Object Storage** in Hetzner Cloud Console
2. Select your bucket
3. View storage usage and statistics

## Backup Strategy

### 1. Local Backups

Keep source videos locally:
```bash
# Backup script
rsync -av /path/to/source/videos/ /backup/videos/
```

### 2. Cross-Region Replication

For disaster recovery, replicate to another Hetzner region:
```bash
# Sync to backup bucket in different region
aws s3 sync s3://video-content s3://video-content-backup \
  --source-region fsn1 \
  --region nbg1
```

## Security Best Practices

1. **Rotate Access Keys Regularly:**
   ```bash
   # Generate new keys in Hetzner Console
   # Update .env file
   # Test new configuration
   # Revoke old keys
   ```

2. **Use IAM Policies:**
   - Create separate access keys for different applications
   - Limit permissions to minimum required

3. **Enable Bucket Versioning:**
   ```bash
   aws s3api put-bucket-versioning \
     --bucket video-content \
     --versioning-configuration Status=Enabled \
     --endpoint-url=https://fsn1.your-objectstorage.com
   ```

4. **Monitor Access Logs:**
   - Enable bucket logging
   - Review logs regularly for suspicious activity

## Troubleshooting

### Issue 1: 403 Forbidden

**Cause:** Bucket policy not configured correctly

**Solution:**
```bash
# Verify bucket policy
aws s3api get-bucket-policy \
  --bucket video-content \
  --endpoint-url=https://fsn1.your-objectstorage.com

# Re-apply public policy if needed
```

### Issue 2: CORS Errors

**Cause:** CORS not configured or incorrect

**Solution:**
```bash
# Check current CORS config
aws s3api get-bucket-cors \
  --bucket video-content \
  --endpoint-url=https://fsn1.your-objectstorage.com

# Re-apply CORS configuration
```

### Issue 3: Slow Upload Speeds

**Cause:** Network limitations or large files

**Solution:**
- Use multipart upload for large files
- Upload from server with better bandwidth
- Consider using Hetzner's data center location closer to your location

## Tools and Resources

### S3-Compatible Clients

- **AWS CLI:** Command-line interface (recommended)
- **s3cmd:** Alternative CLI tool
- **Cyberduck:** GUI client for Mac/Windows
- **S3 Browser:** Windows GUI client

### FFmpeg Resources

- [FFmpeg HLS Guide](https://ffmpeg.org/ffmpeg-formats.html#hls-2)
- [Adaptive Bitrate Streaming](https://trac.ffmpeg.org/wiki/EncodingForStreamingSites)

### Hetzner Documentation

- [Object Storage Docs](https://docs.hetzner.com/cloud/object-storage/)
- [S3 API Compatibility](https://docs.hetzner.com/cloud/object-storage/s3-api/)

## Support

For issues:
1. Check Hetzner status: https://status.hetzner.com/
2. Review Hetzner Docs: https://docs.hetzner.com/
3. Contact Hetzner Support: support@hetzner.com
