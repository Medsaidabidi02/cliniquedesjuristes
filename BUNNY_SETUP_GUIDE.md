# Bunny.net Configuration Guide

## Common Errors and Solutions

### Error 1: "Unknown column 'lesson_slug' in 'field list'"

**Solution**: You need to run the database migration first.

```bash
cd backend
npm run migrate:bunny
```

This will add the required `lesson_slug`, `path`, `course_id`, and `is_locked` columns to your videos table.

### Error 2: "Failed to upload video to Bunny.net"

**Solution**: The Bunny.net environment variables are not configured properly. Follow the steps below.

## Complete Setup Guide

### Step 0: Run Database Migration (REQUIRED)

**Before anything else**, you must run the database migration to add the required columns:

```bash
cd backend
npm run migrate:bunny
```

This script will:
- Add `course_id`, `lesson_slug`, `path`, and `is_locked` columns if missing
- Create necessary indexes
- Update existing records with default values
- Show you the final table structure

**What if the migration fails?**
- Make sure your MySQL server is running
- Verify your database credentials in `.env` or `.env-1.production`
- Check that the `videos` table exists in your database

### Step 1: Get Your Bunny.net Credentials

1. Log in to your Bunny.net account at https://dash.bunny.net/
2. Go to **Storage** > **Storage Zones**
3. Click on your storage zone (or create one if you don't have one)
4. Note down the following information:

   - **Storage Zone Name**: The name of your storage zone (e.g., "cliniquedesjuristesvideos")
   - **Password (FTP & API)**: Your write/full access password
   - **Read-only Password**: Your read-only password
   - **Hostname**: Usually `storage.bunnycdn.com`

5. Go to **CDN** > **Pull Zones**
6. Find or create a pull zone linked to your storage zone
7. Note down the **Pull Zone URL** (e.g., "https://your-zone.b-cdn.net")

### Step 2: Update Your Production Environment File

Edit your `.env-1.production` file (or create `.env` for local development) and add these variables:

```env
# Bunny.net Storage Configuration
BUNNY_HOSTNAME=storage.bunnycdn.com
BUNNY_USERNAME=your_storage_zone_name
BUNNY_PASSWORD=your_write_password_here
BUNNY_READONLY_PASSWORD=your_readonly_password_here
BUNNY_PORT=21
BUNNY_STORAGE_ZONE=your_storage_zone_name
BUNNY_PULL_ZONE_URL=https://your-zone.b-cdn.net
BUNNY_SECURITY_KEY=your_write_password_here
BUNNY_URL_EXPIRY_MINUTES=60
```

**Important**: 
- Replace `your_storage_zone_name` with your actual storage zone name
- Replace `your_write_password_here` with your actual FTP/API password
- Replace `your_readonly_password_here` with your actual read-only password
- Replace `your-zone.b-cdn.net` with your actual pull zone URL

### Step 3: Restart Your Server

After updating the environment variables, restart your backend server:

```bash
# If using systemd
sudo systemctl restart your-backend-service

# If using pm2
pm2 restart backend

# If running directly
# Stop the server (Ctrl+C) and start again
cd backend
npm run dev  # for development
# or
npm start    # for production
```

### Step 4: Test the Upload

Try uploading a video again through the admin panel. The upload should now work correctly.

## Understanding Common Errors

### "Unknown column 'lesson_slug' in 'field list'"

This means the database migration hasn't been run. Run `npm run migrate:bunny` in the backend directory.

### "Failed to upload video to Bunny.net"

This occurs when:
1. **Environment variables are missing**: The service cannot initialize without the required credentials
2. **Credentials are incorrect**: The password or storage zone name is wrong
3. **Network issues**: Cannot connect to Bunny.net servers
4. **Storage zone doesn't exist**: The specified storage zone name doesn't exist in your account

## Improved Error Handling

The latest version of the code now provides better error messages:

- **Before**: Generic "Failed to upload video to Bunny.net" 
- **After**: Specific messages like:
  - "BUNNY_USERNAME and BUNNY_PASSWORD environment variables are required. Please configure them in your .env file."
  - "BUNNY_STORAGE_ZONE environment variable is required. Please configure it in your .env file."
  - "Bunny.net service is not configured: [specific error]"

## Checking Configuration

To verify your configuration is correct:

1. **Check if environment variables are loaded**:
   ```bash
   cd backend
   node -e "require('dotenv').config(); console.log('BUNNY_USERNAME:', process.env.BUNNY_USERNAME); console.log('BUNNY_STORAGE_ZONE:', process.env.BUNNY_STORAGE_ZONE);"
   ```

2. **Check server logs** when it starts:
   - If configured correctly: Server starts normally
   - If missing credentials: You'll see a warning: "⚠️ Bunny.net service initialization failed"

3. **Test with a small file** first before uploading large videos

## Security Notes

- **Never commit** the production `.env` file with real credentials to git
- Keep the `.env` file in `.gitignore`
- Only commit `.env.example` with placeholder values
- Use different credentials for development and production
- The read-only password can be used for listing/checking files
- The write password should be kept secure and only accessible to the backend

## Common Issues

### Issue 1: "Network error" or "ENOTFOUND"
**Solution**: Check your internet connection and verify the hostname is correct (`storage.bunnycdn.com`)

### Issue 2: "403 Forbidden" or "Authentication failed"
**Solution**: Double-check your password. Copy it directly from Bunny.net dashboard without any extra spaces.

### Issue 3: "404 Not Found" when accessing videos
**Solution**: Verify your pull zone URL is correct and the pull zone is linked to your storage zone.

### Issue 4: Upload works but video won't play
**Solution**: 
1. Check if the pull zone is configured correctly
2. Verify CORS settings on your pull zone allow your domain
3. Ensure the signed URL generation is working (check BUNNY_SECURITY_KEY)

## Testing the Configuration

Use the provided test scripts to verify everything is working:

```bash
# Test upload
cd backend
npm run test:upload

# Test signed URL generation
npm run test:signedurl
```

If these tests pass, your configuration is correct!

## Getting Help

If you continue to have issues:

1. Check the backend server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test the credentials directly using Bunny.net's API:
   ```bash
   curl -X GET "https://storage.bunnycdn.com/YOUR_STORAGE_ZONE/" \
        -H "AccessKey: YOUR_PASSWORD"
   ```
4. Contact Bunny.net support if the API itself is not working

## Next Steps

Once configured correctly:
- Videos will upload directly to Bunny.net storage
- Users will get time-limited signed URLs for secure playback
- Files are organized in `/videos/{courseId}/{lessonSlug}.mp4` structure
- Thumbnails are stored in `/thumbnails/{courseId}/{lessonSlug}.jpg`

Your video platform is now using enterprise-grade CDN storage! 🎉
