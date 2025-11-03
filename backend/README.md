# Backend Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

**IMPORTANT**: You must create a `.env` file before running the application.

```bash
# Copy the example .env file
cp .env.example .env
```

Then edit `.env` and update the `DATABASE_URL` with your database credentials:
```env
DATABASE_URL=mysql://user:password@localhost:3306/clinique_db
```

**The Bunny.net credentials are already configured in the `.env.example` file** and will work for local testing.

### 3. Test Bunny.net Connection (Optional)
```bash
node setup-bunny-storage.js
```

This will:
- Test the connection to Bunny.net Storage
- Create the recommended folder structure
- Verify your credentials

**Note**: If you get an error about missing environment variables, make sure you completed step 2 above.

### 4. Run the Application
```bash
# Development mode
npm run dev

# Or from the root directory
cd ..
npm run dev
```

## Common Issues

### ❌ Error: BUNNY_STORAGE_USERNAME and BUNNY_STORAGE_PASSWORD must be set

**This means the `.env` file is missing!**

**Solution**:
1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Verify the file was created:
   ```bash
   ls -la .env
   ```
3. The Bunny.net credentials are already in `.env.example`, so they'll be copied automatically
4. You only need to update the `DATABASE_URL` line with your database credentials

### ❌ Error: Cannot find module 'dotenv' or 'basic-ftp'

**Solution**: Install dependencies first
```bash
npm install
```

### ❌ Connection Failed / FTP Error

**Possible causes**:
- Firewall blocking port 21
- Network issues
- Bunny.net service temporary unavailable

**Solutions**:
1. Check firewall settings allow FTP connections
2. Try again in a few moments
3. The application will still work - this is just for testing

### ❌ Database Connection Error

**Solution**:
1. Update `DATABASE_URL` in `.env` with your actual database credentials
2. Ensure MySQL is running
3. Verify the database exists

## Environment Variables

The `.env` file should contain:

### ⚠️ Required - YOU MUST UPDATE THIS
```env
DATABASE_URL=mysql://user:password@localhost:3306/clinique_db
```
**Replace `user`, `password`, and `clinique_db` with your actual values**

### ✅ Pre-configured - Already Set (no changes needed)
```env
BUNNY_STORAGE_HOSTNAME=storage.bunnycdn.com
BUNNY_STORAGE_USERNAME=cliniquedesjuristesvideos
BUNNY_STORAGE_PASSWORD=2618a218-10c8-469a-93538a7ae921-7c28-499e
BUNNY_STORAGE_PORT=21
BUNNY_CDN_HOSTNAME=cliniquedesjuristesvideos.b-cdn.net
```

## Folder Structure on Bunny.net

The application will create these folders automatically:
```
/videos/course-{id}/     - Course videos
/thumbnails/course-{id}/ - Video thumbnails
/materials/course-{id}/  - Course documents/PDFs
/blog/                   - Blog images
```

## Next Steps

After setup:
1. Start the application: `npm run dev`
2. Login as admin (admin@cliniquedesjuristes.com / admin123)
3. Upload a video with thumbnail
4. Check Bunny.net dashboard to see uploaded files
5. Navigate to a course and click "Voir contenu" to test the video player

## Additional Documentation

- `../BUNNY_NET_INTEGRATION.md` - Complete integration guide
- `../BUNNY_IMPLEMENTATION_SUMMARY.md` - Implementation details

