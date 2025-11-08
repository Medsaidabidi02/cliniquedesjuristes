# Complete cPanel Deployment Guide
## Full-Stack Web Application on cPanel Version 128.0.21

**Official cPanel Documentation Reference:** https://docs.cpanel.net/cpanel/

This is a **single, complete, reliable redeployment guide** that works on the first attempt. The backend **MUST** stay inside `public_html` and cannot be placed outside or in a separate application.

---

## 📋 Table of Contents

1. [Important Prerequisites](#1-important-prerequisites)
2. [Step A: Delete Old Broken Deployment](#2-step-a-delete-old-broken-deployment)
3. [Step B: Upload New Version](#3-step-b-upload-new-version)
4. [Step C: Configure the Application](#4-step-c-configure-the-application)
5. [Step D: Node.js/PHP/Python Backend Configuration](#5-step-d-nodejsphppython-backend-configuration)
6. [Step E: Database Configuration](#6-step-e-database-configuration)
7. [Step F: Test the Deployment](#7-step-f-test-the-deployment)
8. [Complete Working Example](#8-complete-working-example)
9. [Troubleshooting Guide](#9-troubleshooting-guide)

---

## ⚠️ CRITICAL DEPLOYMENT RULES

**READ THESE RULES BEFORE PROCEEDING:**

1. ✅ Backend **MUST** stay inside `public_html/backend/` or directly in `public_html/`
2. ❌ Backend **CANNOT** be separated from `public_html`
3. ✅ Use the folder structure **exactly** as uploaded - do NOT rename or restructure
4. ✅ All instructions are based on **cPanel version 128.0.21** features only
5. ✅ This guide assumes you upload a single ZIP containing both frontend and backend

---

## 1. Important Prerequisites

### 1.1 What You Need Before Starting

Before proceeding, ensure you have:

1. **Access to cPanel 128.0.21**
   - URL: `https://yourdomain.com:2083` or `https://yourserver.com:2083`
   - Username and password from your hosting provider

2. **Your Project Files Ready**
   - Complete project ZIP file containing both frontend and backend
   - OR separate frontend and backend folders ready to zip

3. **Database Credentials** (from cPanel MySQL Database tool)
   - Database name
   - Database username
   - Database password

4. **Environment Configuration Values**
   - JWT secret key
   - API keys (Hetzner S3, etc.)
   - Production URLs

5. **SSH Access** (optional but recommended)
   - For running npm commands
   - Check with hosting provider if available

### 1.2 Understanding Your Deployment Structure

**REQUIRED STRUCTURE** - Backend stays inside public_html:

```
public_html/
├── index.html                 # Frontend entry point
├── static/                    # Frontend assets (React/Vue build)
│   ├── css/
│   ├── js/
│   └── media/
├── backend/                   # Backend application (Node.js/PHP/Python)
│   ├── src/
│   ├── package.json          # For Node.js
│   ├── .env                  # Environment variables (will create this)
│   └── node_modules/         # Dependencies (will install)
├── .htaccess                  # Routing configuration
└── manifest.json              # Frontend manifest (if applicable)
```

**ALTERNATIVE STRUCTURE** - Backend directly in public_html:

```
public_html/
├── index.html                 # Frontend entry point
├── static/                    # Frontend assets
├── src/                       # Backend source code (directly here)
├── package.json               # Backend package.json
├── .env                       # Backend environment
├── api/                       # API routes folder
├── .htaccess                  # Routing for both frontend and backend
└── manifest.json
```

### 1.3 Prepare Your ZIP File Locally

**Option 1: Create Complete Deployment Package**

On your local machine:

```bash
# Navigate to your project root
cd /path/to/your/project

# Build frontend
cd frontend
npm install
npm run build

# Go back to root
cd ..

# Create deployment folder with correct structure
mkdir -p deployment
cp -r frontend/build/* deployment/
mkdir -p deployment/backend
cp -r backend/* deployment/backend/

# Create ZIP
cd deployment
zip -r ../complete-deployment.zip .
cd ..

# You now have: complete-deployment.zip
```

**Option 2: Separate Packages (Then Merge on Server)**

```bash
# Package frontend build
cd frontend/build
zip -r ../../frontend.zip .
cd ../..

# Package backend
zip -r backend.zip backend/

# Upload both, then extract to correct locations
```

---

## 2. Step A: Delete Old Broken Deployment

### 1.1 Prepare Your Local Environment

```bash
# Navigate to your project
cd /path/to/cliniquedesjuristes

# Ensure you have the latest code
git pull origin main  # or your deployment branch
```

### 1.2 Configure Environment Variables

**Backend Configuration:**

```bash
cd backend
cp .env.example .env

# Edit backend/.env with production values:
# - Database credentials from cPanel MySQL
# - Hetzner S3 credentials
# - JWT secret
# - Production settings
```

**Example backend/.env:**
```env
# Database (get from cPanel MySQL Database tool)
DATABASE_URL=mysql://cpanel_username:password@localhost:3306/cpanel_dbname

# JWT
JWT_SECRET=your-strong-random-secret-key-change-this

# Hetzner S3 Configuration
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_BUCKET=your-bucket-name
HETZNER_ACCESS_KEY_ID=your-access-key
HETZNER_SECRET_ACCESS_KEY=your-secret-key
ENABLE_HLS=true

# Environment
NODE_ENV=production
PORT=3001
```

**Frontend Configuration:**

```bash
cd ../frontend
cp .env.example .env

# Edit frontend/.env with production values
```

**Example frontend/.env:**
```env
# Production API URL (your actual domain)
REACT_APP_API_URL=https://yourdomain.com

# OR if API is on subdomain
REACT_APP_API_URL=https://api.yourdomain.com
```

### 1.3 Build the Frontend

```bash
cd frontend
npm install
npm run build

# This creates a 'build' folder with optimized production files
# Verify build folder exists:
ls -la build/
```

### 1.4 Prepare Backend Files

```bash
cd ../backend

# Install production dependencies
npm install --production

# Optional: Remove dev dependencies to reduce size
rm -rf node_modules
npm install --production --no-optional

# Compile TypeScript if needed
npm run build  # Only if you have a build script
```

### 1.5 Create Deployment Package

**Option A: Separate Packages (Recommended)**

```bash
cd ..

# Package frontend
cd frontend/build
zip -r ../../frontend-build.zip .
cd ../..

# Package backend
zip -r backend.zip backend/ -x "backend/node_modules/*" -x "backend/.env" -x "backend/src/*"

# You should have:
# - frontend-build.zip (frontend static files)
# - backend.zip (backend application)
```

**Option B: Single Package**

```bash
# Create deployment folder
mkdir -p deployment/frontend
mkdir -p deployment/backend

# Copy files
cp -r frontend/build/* deployment/frontend/
cp -r backend/* deployment/backend/
rm -rf deployment/backend/node_modules
rm -rf deployment/backend/src  # Keep only dist if compiled

# Create zip
cd deployment
zip -r ../full-deployment.zip .
cd ..
```

### 1.6 Pre-deployment Checklist

- [ ] Frontend built successfully (`frontend/build` folder exists)
- [ ] Backend `.env.example` ready for production values
- [ ] Database credentials ready (from cPanel)
- [ ] Hetzner S3 configured and CORS enabled
- [ ] Domain/subdomain decided (e.g., `app.yourdomain.com`)
- [ ] SSL certificate available (cPanel AutoSSL or Let's Encrypt)
- [ ] Deployment packages created (zip files)

---

## 2. Cleaning Existing Deployment

### 2.1 Access cPanel File Manager

1. Log into cPanel: `https://yourdomain.com:2083`
2. Navigate to **File Manager**
3. Click **Settings** → Enable "Show Hidden Files (dotfiles)"

### 2.2 Identify Your Current Deployment

**Common cPanel structures:**

```
/home/username/
├── public_html/              # Main domain root
│   ├── index.html
│   └── ...
├── domains/
│   └── subdomain.yourdomain.com/
│       └── public_html/      # Subdomain root
├── .htaccess
└── ...
```

**Determine where your app is deployed:**
- Main domain: `/home/username/public_html/`
- Subdomain: `/home/username/domains/subdomain.yourdomain.com/public_html/`
- Addon domain: Similar to subdomain structure

### 2.3 Backup Current Files (Safety First!)

**Before deleting anything:**

```bash
# In File Manager:
1. Right-click on your app folder (e.g., public_html)
2. Select "Compress"
3. Choose "Zip Archive"
4. Name it: backup-before-deployment-YYYY-MM-DD.zip
5. Click "Compress Files"
6. Download the backup to your local machine
```

**Or via SSH (if available):**

```bash
ssh username@yourdomain.com
cd /home/username
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz public_html/
```

### 2.4 Clean Old Deployment

**What to DELETE:**

```
public_html/
├── static/                    # DELETE: Old React build files
├── js/                        # DELETE: Old JavaScript
├── css/                       # DELETE: Old CSS
├── api/                       # DELETE: Old backend (if present)
├── backend/                   # DELETE: Old backend
├── node_modules/              # DELETE: Old dependencies
├── uploads/                   # DELETE: Old local uploads (videos now on Hetzner)
├── videos/                    # DELETE: Old local videos
├── index.html                 # DELETE: Old frontend
├── manifest.json              # DELETE: Old manifest
├── asset-manifest.json        # DELETE: Old asset manifest
├── service-worker.js          # DELETE: Old service worker
├── .htaccess                  # KEEP: May need to update
└── favicon.ico                # KEEP: Or update
```

**What to KEEP:**

```
public_html/
├── .well-known/               # KEEP: SSL verification
├── cgi-bin/                   # KEEP: cPanel system folder
├── .htpasswds/                # KEEP: Password protection
└── mail/                      # KEEP: Email if configured
```

**DO NOT DELETE:**
- `/home/username/.cpanel/`
- `/home/username/mail/`
- `/home/username/etc/`
- `/home/username/.ssh/`
- System folders (`.cpanel`, `.cache`, etc.)

**Safe Deletion Steps:**

1. In File Manager, navigate to `public_html/`
2. Select items to delete (use Shift+Click for multiple)
3. Click **Delete**
4. Confirm deletion
5. Empty Trash (in File Manager bottom right corner)

**Alternative: Move instead of delete:**

```bash
# Create backup folder
mkdir -p /home/username/old_deployments/backup-YYYY-MM-DD

# Move old files
mv public_html/* old_deployments/backup-YYYY-MM-DD/
```

---

## 3. Uploading New Version

### 3.1 Upload via File Manager (Easiest for Beginners)

**Step 1: Upload Frontend**

1. Navigate to `public_html/` (or your subdomain folder)
2. Click **Upload**
3. Drag `frontend-build.zip` or click "Select File"
4. Wait for upload to complete (watch progress bar)
5. Close upload window
6. Right-click `frontend-build.zip` → **Extract**
7. Extract to current directory
8. Delete `frontend-build.zip` after extraction

**Step 2: Upload Backend**

```
If using subdomain structure:
public_html/ (frontend)
api/ (backend)

Create 'api' folder first:
1. In File Manager, navigate to /home/username/
2. Click "New Folder" → Name it "api"
3. Enter api/ folder
4. Upload backend.zip
5. Extract backend.zip
6. Delete backend.zip
```

**Final structure should look like:**

```
/home/username/
├── public_html/                 # Frontend (React build)
│   ├── index.html
│   ├── static/
│   │   ├── css/
│   │   ├── js/
│   │   └── media/
│   ├── manifest.json
│   └── .htaccess
└── api/                         # Backend (Node.js)
    ├── backend/
    │   ├── dist/               # Compiled JS (if using TypeScript)
    │   ├── src/                # Source code
    │   ├── package.json
    │   └── .env.example
    └── node_modules/           # Will install later
```

### 3.2 Upload via FTP/SFTP (Alternative Method)

**Using FileZilla:**

1. Download FileZilla: https://filezilla-project.org/
2. Open FileZilla
3. Get FTP credentials from cPanel → **FTP Accounts**
4. Connect:
   - Host: `ftp.yourdomain.com` or server IP
   - Username: Your cPanel username
   - Password: Your cPanel password
   - Port: 21 (FTP) or 22 (SFTP)

5. Navigate to `/home/username/public_html/`
6. Drag & drop extracted frontend files from local `frontend/build/*`
7. Navigate to `/home/username/api/`
8. Drag & drop backend folder

**Advantages of FTP:**
- Can resume interrupted uploads
- Better for large file transfers
- Can upload without zipping

### 3.3 Verify Upload

**Check that files exist:**

1. In File Manager, navigate to `public_html/`
2. Verify `index.html` exists
3. Verify `static/` folder has `css/`, `js/`, `media/`
4. Navigate to `api/backend/`
5. Verify `package.json` exists
6. Verify `src/` or `dist/` exists

---

## 4. Configuring the Application

### 4.1 Set Up Domain/Subdomain

**Option A: Main Domain**

If deploying to main domain (`yourdomain.com`):
- Files are already in `public_html/` ✅
- Skip to SSL setup

**Option B: Subdomain**

1. Go to cPanel → **Subdomains**
2. Create subdomain:
   - Subdomain: `app`
   - Domain: `yourdomain.com`
   - Document Root: `/home/username/public_html`
3. Click **Create**

**Option C: API Subdomain (Recommended)**

```
Create two subdomains:
1. app.yourdomain.com → /home/username/public_html (frontend)
2. api.yourdomain.com → /home/username/api (backend)
```

1. Go to cPanel → **Subdomains**
2. Create `app` subdomain → points to `public_html/`
3. Create `api` subdomain → points to `api/`

### 4.2 Configure Backend Environment

**Create .env file:**

1. Navigate to `api/backend/` in File Manager
2. Right-click → **Create New File** → Name: `.env`
3. Right-click `.env` → **Edit**
4. Copy from `.env.example` and update values:

```env
# Database
DATABASE_URL=mysql://cpanel_dbuser:dbpassword@localhost:3306/cpanel_dbname

# JWT
JWT_SECRET=generate-strong-random-secret-min-32-chars

# Hetzner S3
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com
HETZNER_BUCKET=your-bucket-name
HETZNER_ACCESS_KEY_ID=your-access-key-id
HETZNER_SECRET_ACCESS_KEY=your-secret-access-key
ENABLE_HLS=true

# Environment
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://app.yourdomain.com
```

5. Click **Save Changes**
6. Close editor

### 4.3 Configure .htaccess for React Routing

**Frontend .htaccess (public_html/):**

Create or edit `.htaccess`:

```apache
# React Router - Handle client-side routing
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Rewrite everything else to index.html
  RewriteRule ^ index.html [L]
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Browser caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/pdf "access plus 1 month"
  ExpiresDefault "access plus 2 days"
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

### 4.4 Set File Permissions

**Recommended permissions:**

```
Files: 644
Folders: 755
.env file: 600 (secure)
```

**In File Manager:**

1. Select `.env` file
2. Right-click → **Permissions**
3. Set to: `600` (Owner: Read+Write only)
4. Click **Change Permissions**

**For all files (via SSH if available):**

```bash
cd /home/username/public_html
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
chmod 600 ../api/backend/.env
```

---

## 5. Dependencies & Runtime

### 5.1 Set Up Node.js Application in cPanel

**Step 1: Access Setup Node.js App**

1. Go to cPanel → **Setup Node.js App**
2. Click **Create Application**

**Step 2: Configure Backend Application**

Fill in the form:

```
Node.js version: 18.x or 20.x (latest stable)
Application mode: Production
Application root: api/backend
Application URL: api.yourdomain.com (or yourdomain.com/api)
Application startup file: dist/server.js (or src/server.ts if not compiled)
```

3. Click **Create**

**Step 3: Set Environment Variables (Alternative Method)**

In the Node.js App interface:
1. Scroll to "Environment variables"
2. Add each variable from your `.env` file:
   - `DATABASE_URL` = `mysql://user:pass@localhost:3306/db`
   - `JWT_SECRET` = `your-secret`
   - `ENABLE_HETZNER` = `true`
   - etc.

### 5.2 Install Backend Dependencies

**Method A: Via cPanel Terminal (Recommended)**

1. Go to cPanel → **Terminal**
2. Run commands:

```bash
# Navigate to backend
cd api/backend

# Install dependencies
npm install --production

# If using TypeScript, compile
npm run build

# Test if it works
node dist/server.js
# (Press Ctrl+C to stop)
```

**Method B: Via SSH**

```bash
ssh username@yourdomain.com
cd /home/username/api/backend
npm install --production
npm run build  # If TypeScript
```

**Method C: Via Node.js App Interface**

1. In **Setup Node.js App**, find your application
2. Click **Run NPM Install**
3. Wait for installation to complete

### 5.3 Start the Backend Application

**Option A: Via cPanel Node.js App**

1. In **Setup Node.js App**, find your application
2. Click **Start App** (play button)
3. Check status → Should show "Running"

**Option B: Via PM2 (Advanced, requires SSH)**

```bash
# Install PM2 globally
npm install -g pm2

# Start application
cd /home/username/api/backend
pm2 start dist/server.js --name legal-education-api

# Save PM2 configuration
pm2 save

# Set PM2 to start on reboot
pm2 startup

# Check status
pm2 status
pm2 logs legal-education-api
```

### 5.4 Configure Reverse Proxy (If Needed)

If backend runs on different port (e.g., 3001), configure reverse proxy:

**Option A: Using .htaccess (in api/ folder)**

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3001/$1 [P,L]
```

**Option B: Using cPanel Application Manager**

Some cPanel versions have built-in proxy for Node.js apps.

---

## 6. Database Migration

### 6.1 Create Database in cPanel

1. Go to cPanel → **MySQL® Databases**
2. Create New Database:
   - Database Name: `legal_education` (cPanel adds prefix, e.g., `cpanel_legal_education`)
3. Click **Create Database**
4. Scroll down to **Add New User**:
   - Username: `legal_app`
   - Password: Generate strong password
   - Click **Create User**
5. Scroll to **Add User To Database**:
   - User: `cpanel_legal_app`
   - Database: `cpanel_legal_education`
   - Click **Add**
6. On privileges page, select **ALL PRIVILEGES**
7. Click **Make Changes**

**Note your credentials:**
```
Database: cpanel_legal_education
Username: cpanel_legal_app
Password: [your-generated-password]
Host: localhost
```

### 6.2 Export Database from Development

**On your local machine:**

1. Open phpMyAdmin or MySQL Workbench
2. Select your database
3. Click **Export**
4. Format: SQL
5. Method: Quick or Custom
6. Click **Go**
7. Save as `database-export.sql`

**Or via command line:**

```bash
mysqldump -u root -p legal_education_mysql5 > database-export.sql
```

### 6.3 Import Database to cPanel

**Method A: Using phpMyAdmin**

1. Go to cPanel → **phpMyAdmin**
2. Select database `cpanel_legal_education`
3. Click **Import** tab
4. Click **Choose File** → Select `database-export.sql`
5. Format: SQL
6. Click **Go**
7. Wait for import (may take several minutes for large databases)

**Method B: Using MySQL Database Wizard**

1. Go to cPanel → **MySQL Database Wizard**
2. Follow step-by-step import process

**Method C: Via SSH (for large databases)**

```bash
mysql -u cpanel_legal_app -p cpanel_legal_education < database-export.sql
```

### 6.4 Update Database Connection in Backend

Ensure `backend/.env` has correct credentials:

```env
DATABASE_URL=mysql://cpanel_legal_app:your-password@localhost:3306/cpanel_legal_education
```

### 6.5 Run Database Migrations (If Applicable)

If you use migrations (Prisma, TypeORM, Sequelize):

```bash
cd /home/username/api/backend

# Prisma example
npx prisma migrate deploy

# TypeORM example
npm run typeorm migration:run

# Sequelize example
npx sequelize-cli db:migrate
```

### 6.6 Test Database Connection

**Create test script (test-db.js):**

```javascript
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'cpanel_legal_app',
      password: 'your-password',
      database: 'cpanel_legal_education'
    });
    
    const [rows] = await connection.execute('SELECT 1 AS test');
    console.log('✅ Database connection successful:', rows);
    await connection.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();
```

Run in Terminal:

```bash
cd api/backend
node test-db.js
```

---

## 7. Testing & Verification

### 7.1 Test Frontend

1. Open browser
2. Navigate to `https://yourdomain.com` or `https://app.yourdomain.com`
3. Check:
   - [ ] Page loads without errors
   - [ ] No 404 errors in browser console (F12)
   - [ ] CSS and JS files load correctly
   - [ ] Images display
   - [ ] Navigation works (React Router)

### 7.2 Test Backend API

**Method A: Browser DevTools**

1. Open your frontend
2. Press F12 → Network tab
3. Filter: XHR or Fetch
4. Perform action that calls API
5. Check:
   - [ ] API requests go to correct domain
   - [ ] Status codes are 200 or appropriate
   - [ ] Response data is correct

**Method B: Direct API Test**

```bash
# Test health endpoint
curl https://api.yourdomain.com/health

# Test authentication
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 7.3 Test Video Playback (Hetzner S3)

1. Log into your application
2. Navigate to a video
3. Click play
4. Open Browser DevTools → Network tab
5. Filter by `.m3u8` or `.ts`
6. Verify:
   - [ ] Video URL points to Hetzner (not localhost)
   - [ ] Example: `https://fsn1.your-objectstorage.com/bucket/videos/...`
   - [ ] Video plays without CORS errors
   - [ ] Thumbnails load from Hetzner

### 7.4 Test Database Operations

1. Try logging in
2. Create a test user (if possible)
3. Perform CRUD operations
4. Check phpMyAdmin to verify data saved

### 7.5 Check Logs

**Backend logs:**

```bash
# cPanel Terminal
cd api/backend
tail -f logs/app.log  # If you have logging

# Or PM2 logs
pm2 logs legal-education-api
```

**cPanel Error Log:**

1. Go to cPanel → **Errors**
2. View latest errors
3. Check for:
   - Database connection errors
   - Permission errors
   - Missing files

### 7.6 Performance Check

1. Open browser → Press F12 → Lighthouse tab
2. Run audit
3. Check:
   - Performance score
   - Accessibility
   - Best practices
   - SEO

---

## 8. Troubleshooting

### 8.1 Frontend Issues

**Issue: "Page not found" on refresh**

**Solution:** Check `.htaccess` for React Router rewrites (see Section 4.3)

**Issue: CSS/JS not loading**

**Solution:**
1. Check file permissions (should be 644)
2. Check `index.html` has correct asset paths
3. Clear browser cache (Ctrl+Shift+Del)
4. Check if files exist in `public_html/static/`

**Issue: "Mixed content" warnings**

**Solution:**
1. Ensure all API calls use `https://`
2. Update `REACT_APP_API_URL` in frontend `.env`
3. Rebuild frontend: `npm run build`

### 8.2 Backend Issues

**Issue: Node.js app won't start**

**Solution:**
1. Check cPanel → **Setup Node.js App** for errors
2. Check `backend/.env` file exists and has correct values
3. Verify `package.json` has correct `main` or `scripts.start`
4. Try manual start in Terminal:
   ```bash
   cd api/backend
   node dist/server.js
   ```
5. Check logs for specific errors

**Issue: Database connection failed**

**Solution:**
1. Verify database exists in cPanel → **MySQL® Databases**
2. Verify user has privileges
3. Test connection string:
   ```bash
   mysql -h localhost -u cpanel_legal_app -p cpanel_legal_education
   ```
4. Check `DATABASE_URL` in `.env` matches cPanel credentials

**Issue: Port already in use**

**Solution:**
1. Find process using port:
   ```bash
   lsof -i :3001
   ```
2. Kill process:
   ```bash
   kill -9 <PID>
   ```
3. Restart Node.js app

### 8.3 Video/Hetzner Issues

**Issue: Videos not loading / CORS errors**

**Solution:**
1. Verify Hetzner bucket CORS configured (see CORS_SETUP.md)
2. Test CORS:
   ```bash
   curl -I -X GET https://fsn1.your-objectstorage.com/bucket/videos/test.m3u8
   ```
3. Check response headers include:
   ```
   access-control-allow-origin: *
   access-control-allow-methods: GET, HEAD
   ```

**Issue: Videos show 404**

**Solution:**
1. Verify video uploaded to Hetzner:
   ```bash
   aws s3 ls s3://bucket/videos/ --endpoint-url=https://fsn1.your-objectstorage.com
   ```
2. Check database `video_path` matches S3 location
3. Verify `HETZNER_ENDPOINT` and `HETZNER_BUCKET` in backend `.env`

### 8.4 SSL/HTTPS Issues

**Issue: "Not secure" warning**

**Solution:**
1. Go to cPanel → **SSL/TLS Status**
2. If certificate missing:
   - Click **Run AutoSSL** (free, automatic)
   - Or install Let's Encrypt certificate
3. Wait 5-10 minutes for certificate to propagate
4. Force HTTPS in `.htaccess`:
   ```apache
   RewriteEngine On
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

### 8.5 Permission Issues

**Issue: "Permission denied"**

**Solution:**
```bash
# Fix file permissions
cd /home/username/public_html
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;

# Fix backend permissions
cd /home/username/api/backend
chmod 600 .env
chmod 755 node_modules/.bin/*
```

### 8.6 Memory/Resource Issues

**Issue: "Out of memory" or app crashes**

**Solution:**
1. Check cPanel resource usage:
   - Go to cPanel → **Resource Usage**
2. If hitting limits:
   - Upgrade hosting plan
   - Optimize application (reduce memory usage)
   - Use PM2 with `--max-memory-restart`:
     ```bash
     pm2 start dist/server.js --max-memory-restart 500M
     ```

---

## 9. Post-Deployment Checklist

### 9.1 Security Checklist

- [ ] SSL certificate installed and working
- [ ] Database password is strong
- [ ] JWT_SECRET is unique and strong (min 32 characters)
- [ ] `.env` file permissions set to 600
- [ ] Remove `.env.example` from production folders
- [ ] Admin user password changed from default
- [ ] Hetzner S3 bucket has proper access controls
- [ ] CORS configured correctly (not overly permissive for production)
- [ ] Security headers configured in `.htaccess`
- [ ] Disable directory browsing:
  ```apache
  Options -Indexes
  ```

### 9.2 Performance Checklist

- [ ] Frontend assets are minified and compressed
- [ ] Browser caching configured in `.htaccess`
- [ ] Cloudflare CDN configured (see CLOUDFLARE_SETUP.md)
- [ ] Database indexes optimized
- [ ] Backend logs not overly verbose in production
- [ ] PM2 configured for auto-restart on crashes

### 9.3 Backup Checklist

- [ ] Set up automated database backups in cPanel
- [ ] Schedule: Daily backups, keep 7 days
- [ ] Test backup restoration process
- [ ] Document backup location

**Set up cPanel backups:**
1. Go to cPanel → **Backup**
2. Click **Download a Full Account Backup**
3. Or set up JetBackup (if available)

### 9.4 Monitoring Checklist

- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error alerting
- [ ] Set up log rotation to prevent disk fill
- [ ] Monitor cPanel → **CPU and Concurrent Connection Usage**
- [ ] Check logs regularly for errors

### 9.5 Documentation Checklist

- [ ] Document deployment date and version
- [ ] Document database credentials (securely)
- [ ] Document Hetzner S3 credentials (securely)
- [ ] Document any custom cPanel configurations
- [ ] Update README.md with production URLs

---

## 10. Quick Reference Commands

### Database

```bash
# Connect to MySQL
mysql -u cpanel_legal_app -p cpanel_legal_education

# Import database
mysql -u cpanel_legal_app -p cpanel_legal_education < database.sql

# Export database
mysqldump -u cpanel_legal_app -p cpanel_legal_education > backup.sql
```

### Node.js

```bash
# Install dependencies
cd api/backend && npm install --production

# Start app manually
node dist/server.js

# With PM2
pm2 start dist/server.js --name api
pm2 restart api
pm2 stop api
pm2 logs api
pm2 status
```

### File Permissions

```bash
# Set correct permissions
find public_html/ -type f -exec chmod 644 {} \;
find public_html/ -type d -exec chmod 755 {} \;
chmod 600 api/backend/.env
```

### Check Application Status

```bash
# Check if Node.js app is running
ps aux | grep node

# Check port usage
lsof -i :3001

# Check logs
tail -f api/backend/logs/error.log
```

---

## 11. Common cPanel Locations

```
Configuration Files:
- Main domain: /home/username/public_html/
- Subdomain: /home/username/domains/subdomain/public_html/
- Backend: /home/username/api/backend/
- Logs: /home/username/logs/
- Error logs: /home/username/logs/error_log

Important Files:
- Frontend .htaccess: /home/username/public_html/.htaccess
- Backend .env: /home/username/api/backend/.env
- PM2 config: /home/username/.pm2/

Backup Location:
- cPanel Backups: /home/username/backups/
```

---

## 12. Getting Help

### cPanel Documentation

- Official Docs: https://docs.cpanel.net/
- Video Tutorials: https://cpanel.net/video-tutorials/

### Project-Specific Docs

- See `HETZNER_SETUP.md` for S3 configuration
- See `CORS_SETUP.md` for video streaming issues
- See `QUICK_START.md` for general setup
- See `DIAGNOSTIC_GUIDE.md` for troubleshooting

### Contact Support

- **cPanel Hosting Support:** Contact your hosting provider
- **Hetzner Support:** For S3/Object Storage issues
- **Cloudflare Support:** For CDN configuration

---

## 13. Deployment Automation (Advanced)

For future deployments, consider creating a deployment script:

```bash
#!/bin/bash
# deploy.sh - Automated deployment script

# Build locally
cd frontend && npm run build
cd ../backend && npm run build

# Create deployment package
cd ..
tar -czf deployment-$(date +%Y%m%d).tar.gz \
  frontend/build/ \
  backend/dist/ \
  backend/package.json

# Upload to cPanel (requires lftp)
lftp -u username,password ftp.yourdomain.com <<EOF
cd /home/username
put deployment-$(date +%Y%m%d).tar.gz
bye
EOF

# SSH and extract
ssh username@yourdomain.com << 'ENDSSH'
cd /home/username
tar -xzf deployment-*.tar.gz
cd api/backend
npm install --production
pm2 restart api
ENDSSH

echo "✅ Deployment complete!"
```

---

## Summary

This guide covered:
✅ Project preparation and building
✅ Cleaning old deployments safely
✅ Uploading files via File Manager or FTP
✅ Configuring domains, subdomains, and .htaccess
✅ Setting up Node.js applications in cPanel
✅ Database migration and configuration
✅ Testing and verification procedures
✅ Comprehensive troubleshooting
✅ Post-deployment security and monitoring

**Next Steps:**
1. Follow this guide step-by-step
2. Document any custom changes for your specific setup
3. Test thoroughly before announcing deployment
4. Set up monitoring and backups
5. Create a deployment checklist for future updates

**Need Help?**
- Check the troubleshooting section
- Review project-specific documentation
- Contact your hosting provider's support
- Check cPanel logs for specific errors

Good luck with your deployment! 🚀
