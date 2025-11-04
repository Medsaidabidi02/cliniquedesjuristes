# Video Storage Configuration Guide

## Current Status

The system is configured for **dual-mode operation**:
- ✅ **Local Storage** - Active (default, no configuration needed)
- ⏸️ **Wasabi S3 + CDN** - Available but requires setup

## Understanding the Error

If you see this error:
```
Failed to upload files: The specified bucket does not exist
```

This means the system detected Wasabi credentials but couldn't connect to the bucket. This can happen when:

1. **Environment variables use placeholders** like `${WASABI_ACCESS_KEY}` instead of actual values
2. **Bucket doesn't exist** in your Wasabi account
3. **Credentials are incorrect** or expired
4. **Bucket name is wrong** in the configuration

## Quick Fix: Use Local Storage

If you want to use **local file storage** (which works immediately without any setup):

### Option 1: Remove or Comment Out Wasabi Variables

Edit your `.env` or environment configuration and remove/comment these lines:
```bash
# WASABI_ACCESS_KEY=...
# WASABI_SECRET_KEY=...
# WASABI_BUCKET_NAME=...
# WASABI_REGION=...
# WASABI_ENDPOINT=...
# CDN_DOMAIN=...
```

### Option 2: Clear Environment Variables

If using environment variables directly:
```bash
unset WASABI_ACCESS_KEY
unset WASABI_SECRET_KEY
unset WASABI_BUCKET_NAME
```

Then restart your application. The system will automatically detect the missing configuration and use local storage.

## Setting Up Wasabi S3 (Optional)

If you want to use Wasabi for better scalability and CDN caching:

### Step 1: Create Wasabi Account & Bucket

1. Sign up at [wasabi.com](https://wasabi.com)
2. Create a new bucket (note the exact name)
3. Generate access credentials (Access Key + Secret Key)
4. Note your region (e.g., `eu-central-1`)

### Step 2: Set Environment Variables

Set these with **actual values** (not placeholders):

```bash
export WASABI_ACCESS_KEY="your-actual-access-key-here"
export WASABI_SECRET_KEY="your-actual-secret-key-here"
export WASABI_BUCKET_NAME="your-bucket-name"
export WASABI_REGION="eu-central-1"
export WASABI_ENDPOINT="https://s3.eu-central-1.wasabisys.com"
export CDN_DOMAIN="cdn.cliniquedesjuristes.com"
```

**Important:** Replace the placeholder values with real ones from your Wasabi console.

### Step 3: Configure Cloudflare (Optional but Recommended)

For CDN caching benefits:
1. Add CNAME in Cloudflare DNS: `cdn.cliniquedesjuristes.com` → `s3.eu-central-1.wasabisys.com`
2. Enable proxy (orange cloud icon)
3. Set cache rules (see `WASABI_MIGRATION.md`)

### Step 4: Restart and Test

Restart your application and upload a test video. Check the logs for:
```
✅ Wasabi S3 configuration validated successfully
📦 File upload storage: Wasabi S3
```

## Checking Current Configuration

When the application starts, check the logs:

### Using Local Storage:
```
⚠️ Wasabi configuration is incomplete or using placeholders. Falling back to local storage.
📦 File upload storage: Local Storage
```

### Using Wasabi S3:
```
✅ Wasabi S3 configuration validated successfully
📦 File upload storage: Wasabi S3
```

## Comparison: Local vs Wasabi

| Feature | Local Storage | Wasabi S3 + CDN |
|---------|--------------|-----------------|
| **Setup** | ✅ None needed | ⚠️ Requires account & config |
| **Cost** | ✅ Free | 💰 $5.99/TB/month |
| **Scalability** | ⚠️ Limited by disk | ✅ Unlimited |
| **Performance** | ⚠️ Server dependent | ✅ CDN edge caching |
| **Backup** | ❌ Manual | ✅ Built-in redundancy |
| **Bandwidth** | ⚠️ Uses server bandwidth | ✅ Offloaded to CDN |

## Troubleshooting

### Error: "Bucket does not exist"
**Solution:** Create the bucket in Wasabi console or fix the bucket name in config.

### Error: "Invalid credentials"
**Solution:** Verify your Access Key and Secret Key are correct and active.

### Error: "Access Denied"
**Solution:** Check bucket permissions allow your credentials to upload files.

### Videos upload but don't play
**Solution:** If using Wasabi, ensure bucket has public-read permission for videos or configure signed URLs.

### System won't switch to Wasabi even with credentials
**Solution:** Check that credentials don't contain placeholder syntax like `${VARIABLE}`. The system specifically checks for this and will fallback to local storage if detected.

## For Developers

The system automatically detects configuration at startup:

```typescript
// In wasabiClient.ts
export const validateWasabiConfig = (): boolean => {
  // Checks for real values, not placeholders
  const hasAccessKey = wasabiConfig.accessKeyId && 
                       !wasabiConfig.accessKeyId.includes('${');
  // ... similar checks for other fields
}
```

The validation specifically rejects:
- Empty strings
- Placeholder syntax: `${VARIABLE_NAME}`
- Missing values

This ensures the system only attempts Wasabi connection when properly configured.

## Need Help?

- **Local storage issues:** Check file permissions on `uploads/` directory
- **Wasabi issues:** Review `WASABI_MIGRATION.md` for detailed setup
- **Security:** See `SECURITY.md` for credential management best practices
