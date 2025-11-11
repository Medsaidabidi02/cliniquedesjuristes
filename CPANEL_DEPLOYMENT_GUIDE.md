# Complete cPanel Deployment Guide for Clinique des Juristes

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure on cPanel](#project-structure)
3. [Step-by-Step Deployment](#deployment-steps)
4. [Database Setup](#database-setup)
5. [Backend Configuration](#backend-configuration)
6. [Frontend Configuration](#frontend-configuration)
7. [CORS & 403 Error Fix](#cors-fix)
8. [Troubleshooting](#troubleshooting)
9. [Quick Reference](#quick-reference)

---

## 🔧 Prerequisites

### What You Need:
- ✅ cPanel hosting account with:
  - Node.js support (version 12.0.0 or higher)
  - MySQL 5.7+ database
  - SSH access (optional but recommended)
  - Sufficient disk space for uploads
- ✅ Domain: `cliniquedesjuristes.com`
- ✅ Access to cPanel File Manager or FTP client
- ✅ Your database credentials (from this repo's `.env` files)

### Existing Credentials (from your .env files):
```
Database User: c2668909c_clinique_user
Database Password: bKM8P}ZPWhH+{)Fg
Database Name: c2668909c_clinique_db
Database Host: localhost
Database Port: 3306 (on cPanel, use 3306 not 3307)

Admin Email: admin@cliniquedesjuristes.com
Admin Password: admin123
```

---

## 🏗 Project Structure on cPanel

### Directory Layout in cPanel:

```
/home/c2668909c/
├── public_html/                          # Main domain root (FRONTEND GOES HERE)
│   ├── index.html                        # React build output
│   ├── static/                           # React static assets
│   ├── asset-manifest.json
│   ├── favicon.ico
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   ├── robots.txt
│   ├── .htaccess                         # Frontend .htaccess (IMPORTANT!)
│   │
│   └── api/                              # Backend API subdirectory
│       ├── dist/                         # Compiled TypeScript
│       │   └── server.js                 # Main entry point
│       ├── node_modules/                 # Dependencies
│       ├── migrations/                   # Database migrations
│       ├── uploads/                      # File uploads (if not using Hetzner)
│       ├── package.json
│       ├── package-lock.json
│       ├── .env                          # Backend environment variables
│       └── .htaccess                     # Backend .htaccess (IMPORTANT!)
│
├── nodevenv/                             # Node.js virtual environment (auto-created by cPanel)
│   └── public_html/
│       └── api/
│           └── 18/                       # Node.js version
│               └── bin/
│                   └── node
│
└── logs/                                 # Server logs
    ├── access_log
    └── error_log
```

**Key Points:**
- Frontend (React build) goes in `/home/c2668909c/public_html/`
- Backend API goes in `/home/c2668909c/public_html/api/`
- cPanel creates the `nodevenv` directory automatically when you setup Node.js app

---

## 🚀 Step-by-Step Deployment

### STEP 1: Build the Application Locally

#### 1.1 Build Backend
```bash
# On your local machine
cd backend
npm install
npm run build

# This creates the 'dist' folder with compiled JavaScript
```

#### 1.2 Build Frontend
```bash
# On your local machine
cd frontend
npm install
npm run build:prod

# This creates the 'build' folder with optimized React app
```

---

### STEP 2: Setup MySQL Database in cPanel

#### 2.1 Create Database (if not already created)
1. Log into cPanel
2. Go to **MySQL® Databases**
3. Create database: `c2668909c_clinique_db` (or use existing)
4. Create user: `c2668909c_clinique_user` (or use existing)
5. Set password: `bKM8P}ZPWhH+{)Fg`
6. Add user to database with **ALL PRIVILEGES**

#### 2.2 Import Database Schema
1. Go to **phpMyAdmin** in cPanel
2. Select database `c2668909c_clinique_db`
3. Click **Import** tab
4. Upload and run migration files from `backend/migrations/` folder in this order:
   - `001_initial_schema.sql`
   - `002_add_course_relations.sql`
   - `003_add_video_hls.sql`
   - Any other migration files in numerical order

**OR** if you have SSH access:
```bash
mysql -u c2668909c_clinique_user -p c2668909c_clinique_db < backend/migrations/001_initial_schema.sql
# Enter password: bKM8P}ZPWhH+{)Fg
```

---

### STEP 3: Upload Backend Files

#### 3.1 Create API Directory
1. In cPanel **File Manager**, navigate to `public_html/`
2. Create new folder: `api`

#### 3.2 Upload Backend Files
Upload these files/folders from your local `backend/` directory to `public_html/api/`:

**Required Files:**
- ✅ `dist/` folder (entire folder with all compiled JS)
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `node_modules/` (OR install via SSH - see below)
- ✅ `migrations/` folder
- ✅ `.env` file (create/edit directly on server)
- ✅ `.htaccess` file (see configuration below)

**Upload Methods:**
- **Option A:** Use cPanel File Manager (compress to .zip first, upload, extract)
- **Option B:** Use FTP client (FileZilla, WinSCP)
- **Option C:** Use SSH/SCP

#### 3.3 Install Backend Dependencies (if not uploaded)
If you didn't upload `node_modules/`:

**Via SSH:**
```bash
cd /home/c2668909c/public_html/api
npm install --production
```

**OR via cPanel Terminal** (if available in your hosting plan)

---

### STEP 4: Configure Backend Environment

#### 4.1 Create/Edit `.env` in `public_html/api/`

Create file: `/home/c2668909c/public_html/api/.env`

```env
PORT=3000
NODE_ENV=production

# Database Configuration
# CRITICAL: Use port 3306 on cPanel (not 3307)
DATABASE_URL=mysql://c2668909c_clinique_user:bKM8P}ZPWhH+{)Fg@localhost:3306/c2668909c_clinique_db

# Security
JWT_SECRET=legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version-production
VIDEO_SECRET=legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version-production
JWT_EXPIRES_IN=24h

# File Upload
MAX_FILE_SIZE=5120
UPLOAD_PATH=./uploads

# URLs - CRITICAL: Must match your domain, NO PORTS!
FRONTEND_URL=https://cliniquedesjuristes.com
API_URL=https://cliniquedesjuristes.com
BASE_URL=https://cliniquedesjuristes.com

# Admin Credentials
DEFAULT_ADMIN_EMAIL=admin@cliniquedesjuristes.com
DEFAULT_ADMIN_PASSWORD=admin123

# Hetzner Object Storage (S3-compatible)
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://nbg1.your-objectstorage.com
HETZNER_BUCKET=cliniquedesjuristes

# HLS Streaming
ENABLE_HLS=true
```

**⚠️ IMPORTANT NOTES:**
- Database port MUST be `3306` on cPanel (not 3307)
- All URLs must be `https://` and WITHOUT port numbers
- FRONTEND_URL and API_URL should be the same (both your domain)
- Change `HETZNER_ENDPOINT` if you have actual Hetzner credentials

---

### STEP 5: Setup Node.js Application in cPanel

#### 5.1 Access Node.js App Manager
1. Log into cPanel
2. Find **Setup Node.js App** (might be in Software section)
3. Click **Create Application**

#### 5.2 Configure Node.js Application
Fill in these settings:

```
Node.js version:          18.x or 20.x (whatever's available and >= 12.0.0)
Application mode:         Production
Application root:         public_html/api
Application URL:          cliniquedesjuristes.com/api
Application startup file: dist/server.js
```

**Environment Variables** (add these in cPanel interface):
```
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://c2668909c_clinique_user:bKM8P}ZPWhH+{)Fg@localhost:3306/c2668909c_clinique_db
JWT_SECRET=legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version-production
VIDEO_SECRET=legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version-production
JWT_EXPIRES_IN=24h
MAX_FILE_SIZE=5120
UPLOAD_PATH=./uploads
FRONTEND_URL=https://cliniquedesjuristes.com
API_URL=https://cliniquedesjuristes.com
BASE_URL=https://cliniquedesjuristes.com
DEFAULT_ADMIN_EMAIL=admin@cliniquedesjuristes.com
DEFAULT_ADMIN_PASSWORD=admin123
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://nbg1.your-objectstorage.com
HETZNER_BUCKET=cliniquedesjuristes
ENABLE_HLS=true
```

Click **Create** or **Save**

#### 5.3 Install Dependencies via cPanel
After creating the app, cPanel should show a button "Run NPM Install"
- Click it to install dependencies
- Wait for completion (may take a few minutes)

#### 5.4 Start the Application
- Click **Start** or **Restart** button
- Application should start on internal port (cPanel handles routing)

---

### STEP 6: Create Backend `.htaccess`

Create file: `/home/c2668909c/public_html/api/.htaccess`

```apache
# Backend API .htaccess for cPanel Passenger
# Location: /home/c2668909c/public_html/api/.htaccess

# DO NOT REMOVE - CloudLinux Passenger Configuration
PassengerAppRoot "/home/c2668909c/public_html/api"
PassengerBaseURI "/api"
PassengerNodejs "/home/c2668909c/nodevenv/public_html/api/18/bin/node"
PassengerAppType node
PassengerStartupFile dist/server.js
PassengerAppStart dist/server.js

# Enable Passenger
PassengerEnabled on

# Environment - Production
SetEnv NODE_ENV production
SetEnv PORT 3000

# Database Configuration
SetEnv DATABASE_URL mysql://c2668909c_clinique_user:bKM8P}ZPWhH+{)Fg@localhost:3306/c2668909c_clinique_db

# Security
SetEnv JWT_SECRET legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version-production
SetEnv VIDEO_SECRET legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version-production
SetEnv JWT_EXPIRES_IN 24h

# File Upload
SetEnv MAX_FILE_SIZE 5120
SetEnv UPLOAD_PATH ./uploads

# URLs (NO PORTS!)
SetEnv FRONTEND_URL https://cliniquedesjuristes.com
SetEnv API_URL https://cliniquedesjuristes.com
SetEnv BASE_URL https://cliniquedesjuristes.com

# Admin Credentials
SetEnv DEFAULT_ADMIN_EMAIL admin@cliniquedesjuristes.com
SetEnv DEFAULT_ADMIN_PASSWORD admin123

# Hetzner Object Storage
SetEnv ENABLE_HETZNER true
SetEnv HETZNER_ENDPOINT https://nbg1.your-objectstorage.com
SetEnv HETZNER_BUCKET cliniquedesjuristes

# HLS Streaming
SetEnv ENABLE_HLS true

# CORS Headers - CRITICAL for fixing 403 errors
<IfModule mod_headers.c>
    # Allow requests from your domain
    Header always set Access-Control-Allow-Origin "https://cliniquedesjuristes.com"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, Accept, X-Requested-With, X-Session-Token"
    Header always set Access-Control-Allow-Credentials "true"
    Header always set Access-Control-Expose-Headers "Content-Range, X-Total-Count"
    
    # Handle preflight OPTIONS requests
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=204,L]
</IfModule>

# Increase timeout for video processing
<IfModule mod_fcgid.c>
    FcgidIOTimeout 300
    FcgidConnectTimeout 300
</IfModule>

# File upload size limit (5GB)
LimitRequestBody 5368709120

# Cache control for API responses
<FilesMatch "\.(json)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
</FilesMatch>
```

**⚠️ CRITICAL:** Update the Node.js path if your version differs:
- Check actual path in cPanel Node.js App manager
- Replace `18` with your actual Node.js version number

---

### STEP 7: Upload Frontend Files

#### 7.1 Upload React Build
1. Navigate to `public_html/` in File Manager
2. Upload ALL files from your local `frontend/build/` directory:
   - `index.html`
   - `favicon.ico`
   - `logo192.png`
   - `logo512.png`
   - `manifest.json`
   - `robots.txt`
   - `asset-manifest.json`
   - `static/` folder (entire folder with css, js, media)

**Method:**
- Compress `frontend/build/` to `build.zip`
- Upload to `public_html/`
- Extract in place
- Move all files from extracted `build/` folder to `public_html/` root
- Delete empty `build/` folder

#### 7.2 Verify Frontend Structure
Your `public_html/` should now look like:
```
public_html/
├── index.html          ← Main React app
├── static/             ← React assets
├── favicon.ico
├── logo192.png
├── logo512.png
├── manifest.json
├── robots.txt
├── asset-manifest.json
├── .htaccess           ← Frontend .htaccess (create in next step)
└── api/                ← Backend API folder
    └── (backend files)
```

---

### STEP 8: Create Frontend `.htaccess` (CRITICAL FOR ROUTING)

Create file: `/home/c2668909c/public_html/.htaccess`

```apache
# Frontend .htaccess for React Router + Backend API Routing
# Location: /home/c2668909c/public_html/.htaccess

# Enable Rewrite Engine
RewriteEngine On

# Force HTTPS (optional but recommended)
RewriteCond %{HTTPS} off
RewriteCond %{HTTP_HOST} ^(www\.)?cliniquedesjuristes\.com$ [NC]
RewriteRule ^(.*)$ https://cliniquedesjuristes.com/$1 [R=301,L]

# CRITICAL: Don't redirect API calls - let them pass to backend
RewriteCond %{REQUEST_URI} ^/api/ [NC]
RewriteRule ^api/(.*)$ /api/$1 [L,QSA]

# React Router: Serve static files first
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Exclude API paths from React Router
RewriteCond %{REQUEST_URI} !^/api/

# Send all other requests to React's index.html
RewriteRule . /index.html [L]

# CORS Headers for frontend (if needed)
<IfModule mod_headers.c>
    # Security headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    
    # Allow API communication
    Header always set Access-Control-Allow-Origin "https://cliniquedesjuristes.com"
    Header always set Access-Control-Allow-Credentials "true"
</IfModule>

# Cache control for static assets
<IfModule mod_expires.c>
    ExpiresActive On
    
    # Images
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/x-icon "access plus 1 year"
    
    # CSS and JavaScript
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType text/javascript "access plus 1 month"
    
    # HTML (no cache for main page)
    ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# Gzip Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css
    AddOutputFilterByType DEFLATE application/javascript application/json
    AddOutputFilterByType DEFLATE image/svg+xml
</IfModule>
```

---

## 🔒 CORS & 403 Error Fix

### Understanding the Issue
The 403 Forbidden error occurs when:
1. ❌ CORS headers are not properly set on the backend
2. ❌ Frontend and backend have mismatched origins
3. ❌ OPTIONS preflight requests are not handled
4. ❌ .htaccess is blocking legitimate requests

### Solution Checklist

#### ✅ Backend CORS Configuration
The backend (`backend/src/app.ts`) already has CORS configured:
```typescript
// This is already in your code - verify it's correct
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://cliniquedesjuristes.com',
      'https://www.cliniquedesjuristes.com'
    ]
  : [...localhost origins...];
```

#### ✅ .htaccess CORS Headers
Both .htaccess files (frontend and backend) include:
```apache
Header always set Access-Control-Allow-Origin "https://cliniquedesjuristes.com"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization, Accept, X-Requested-With, X-Session-Token"
Header always set Access-Control-Allow-Credentials "true"
```

#### ✅ Frontend API URL Configuration
Verify `frontend/.env`:
```env
REACT_APP_API_URL=https://cliniquedesjuristes.com
```

**NOT:**
- ❌ `https://cliniquedesjuristes.com:3000`
- ❌ `https://cliniquedesjuristes.com/api`
- ❌ `http://` (must be HTTPS in production)

### Testing CORS
```bash
# Test from command line
curl -H "Origin: https://cliniquedesjuristes.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -v https://cliniquedesjuristes.com/api/health

# Should return 204 with CORS headers
```

---

## 🔧 Troubleshooting

### Issue 1: 403 Forbidden Error

**Symptoms:**
- Browser shows 403 error when calling API
- Network tab shows blocked requests

**Solutions:**
1. ✅ Check both `.htaccess` files are uploaded
2. ✅ Verify CORS headers in backend `.htaccess`
3. ✅ Ensure `Access-Control-Allow-Origin` matches your domain exactly
4. ✅ Check cPanel error logs: `logs/error_log`
5. ✅ Verify Node.js app is running in cPanel
6. ✅ Clear browser cache and test in incognito mode

**Check Error Logs:**
```bash
# Via SSH or cPanel File Manager
tail -50 /home/c2668909c/logs/error_log
```

### Issue 2: API Returns 404

**Symptoms:**
- `/api/health` or other endpoints return 404
- Backend routes not working

**Solutions:**
1. ✅ Verify Node.js app is started in cPanel
2. ✅ Check `PassengerBaseURI "/api"` in backend .htaccess
3. ✅ Ensure `dist/server.js` exists and is compiled
4. ✅ Check application logs in cPanel Node.js App section
5. ✅ Restart the Node.js application

**Test Backend:**
```bash
curl https://cliniquedesjuristes.com/api/health
# Should return: {"status":"OK","message":"..."}
```

### Issue 2.5: API Hangs / No Response (curl hangs indefinitely)

**Symptoms:**
- `curl https://cliniquedesjuristes.com/api/health` hangs and never returns
- No response from API endpoints at all
- Have to press Ctrl+C to cancel the request

**Root Causes:**
This happens when Passenger cannot properly load or execute your Node.js application.

**Solutions:**

**1. ✅ CRITICAL: Ensure dist/server.js exports the Express app**

Your backend `src/server.ts` MUST export the Express app for Passenger:

```typescript
// At the end of src/server.ts
startServer();

// Export app for Passenger (cPanel)
export default app;
```

After adding this, rebuild:
```bash
cd backend
npm run build
# Re-upload dist/ folder to cPanel
```

**2. ✅ Check for duplicate Passenger directives in .htaccess**

Your `.htaccess` should have each Passenger directive ONLY ONCE:
```apache
# WRONG - duplicates will cause issues
PassengerAppRoot "/home/c2668909c/public_html/api"
PassengerAppRoot "/home/c2668909c/public_html/api"  # DUPLICATE!

# RIGHT - each directive appears once
PassengerAppRoot "/home/c2668909c/public_html/api"
PassengerBaseURI "/api"
PassengerNodejs "/home/c2668909c/nodevenv/public_html/api/20/bin/node"
PassengerAppType node
PassengerStartupFile dist/server.js
PassengerEnabled on
```

**3. ✅ Verify Node.js version in .htaccess matches your cPanel setup**

Check your actual Node.js version path:
```bash
# In cPanel → Setup Node.js App
# Look for: Node.js version: 20.x
# Then update .htaccess to match:
PassengerNodejs "/home/c2668909c/nodevenv/public_html/api/20/bin/node"
# Notice the "20" - must match your version!
```

**4. ✅ Ensure dependencies are installed**
```bash
cd /home/c2668909c/public_html/api
npm install --production
```

**5. ✅ Check if tmp/ directory exists for restart**
```bash
mkdir -p /home/c2668909c/public_html/api/tmp
touch /home/c2668909c/public_html/api/tmp/restart.txt
```

**6. ✅ Test if Node.js can run your app directly**
```bash
cd /home/c2668909c/public_html/api
node dist/server.js
# Should show startup messages
# Press Ctrl+C to stop
```

If this works, Passenger configuration is the issue. If this fails, check your code.

**7. ✅ Check Apache error logs (may be in different location)**
```bash
# Try these locations:
tail -50 ~/logs/error_log
tail -50 /usr/local/apache/logs/error_log
tail -50 /var/log/apache2/error.log

# Or ask hosting support where error logs are located
```

**8. ✅ Restart Passenger after ANY .htaccess change**
```bash
# Method 1: Touch restart file
touch /home/c2668909c/public_html/api/tmp/restart.txt

# Method 2: Via cPanel
# Go to: Setup Node.js App → Click "Restart"
```

**Quick Fix Checklist:**
- [ ] Backend exports app: `export default app;` at end of server.ts
- [ ] Rebuilt backend: `npm run build`
- [ ] Re-uploaded dist/ folder to server
- [ ] No duplicate Passenger directives in .htaccess
- [ ] Node.js version in .htaccess matches cPanel version
- [ ] Dependencies installed: `npm install --production`
- [ ] Restarted Passenger after changes

### Issue 3: Database Connection Error

**Symptoms:**
- Server logs show "ECONNREFUSED" or "Access denied"
- API endpoints return 500 errors

**Solutions:**
1. ✅ Verify database credentials in `.env` and `.htaccess`
2. ✅ Use port `3306` (not `3307`) for cPanel
3. ✅ Check user has ALL PRIVILEGES on database
4. ✅ Test connection via phpMyAdmin
5. ✅ Verify DATABASE_URL format:
   ```
   mysql://USER:PASSWORD@localhost:3306/DATABASE_NAME
   ```

**Test Database:**
```bash
# Via SSH
mysql -u c2668909c_clinique_user -p -h localhost -P 3306 c2668909c_clinique_db -e "SELECT 1;"
```

### Issue 4: Frontend Shows Blank Page

**Symptoms:**
- White/blank page loads
- Browser console shows errors

**Solutions:**
1. ✅ Check frontend `.htaccess` is present
2. ✅ Verify `index.html` is in `public_html/` root
3. ✅ Check browser console for JavaScript errors
4. ✅ Ensure `REACT_APP_API_URL` is correct in build
5. ✅ Rebuild frontend with correct environment variables

**Rebuild Frontend:**
```bash
cd frontend
REACT_APP_API_URL=https://cliniquedesjuristes.com npm run build
# Re-upload build files
```

### Issue 5: Node.js App Won't Start

**Symptoms:**
- cPanel shows "Stopped" status
- Restart button doesn't work
- Error in application logs

**Solutions:**
1. ✅ Check `package.json` has correct start script
2. ✅ Verify `dist/server.js` exists
3. ✅ Check Node.js version compatibility (>= 12.0.0)
4. ✅ Run `npm install` again
5. ✅ Check for syntax errors in TypeScript build
6. ✅ Review cPanel application error logs

**Check Application Logs:**
- In cPanel → Node.js Apps → Your App → View Logs
- Look for startup errors

### Issue 6: File Permissions Issues

**Symptoms:**
- Cannot upload files
- 500 errors on file operations
- Permission denied in logs

**Solutions:**
```bash
# Via SSH - Set correct permissions
cd /home/c2668909c/public_html/api

# Make uploads directory writable
chmod 755 uploads
chown c2668909c:c2668909c uploads

# Fix ownership of all files
chown -R c2668909c:c2668909c /home/c2668909c/public_html/api
chmod -R 755 /home/c2668909c/public_html/api
```

### Issue 7: Mixed Content Warnings

**Symptoms:**
- Browser blocks HTTP requests from HTTPS page
- Mixed content warnings in console

**Solutions:**
1. ✅ Ensure ALL URLs use `https://` (no `http://`)
2. ✅ Check `.env` files - no HTTP URLs
3. ✅ Force HTTPS in frontend `.htaccess` (already included)
4. ✅ Clear browser cache

---

## 📚 Quick Reference

### File Locations
```
Frontend .htaccess:  /home/c2668909c/public_html/.htaccess
Backend .htaccess:   /home/c2668909c/public_html/api/.htaccess
Backend .env:        /home/c2668909c/public_html/api/.env
Error logs:          /home/c2668909c/logs/error_log
Access logs:         /home/c2668909c/logs/access_log
```

### Important URLs
```
Main Site:     https://cliniquedesjuristes.com
API Health:    https://cliniquedesjuristes.com/api/health
Admin Login:   https://cliniquedesjuristes.com/login
```

### Default Credentials
```
Admin Email:    admin@cliniquedesjuristes.com
Admin Password: admin123

Database User:  c2668909c_clinique_user
Database Pass:  bKM8P}ZPWhH+{)Fg
Database Name:  c2668909c_clinique_db
```

### Essential Commands (via SSH)
```bash
# Navigate to API directory
cd /home/c2668909c/public_html/api

# Install dependencies
npm install --production

# Check Node.js version
node --version

# View logs
tail -50 /home/c2668909c/logs/error_log

# Test database connection
mysql -u c2668909c_clinique_user -p c2668909c_clinique_db

# Check file permissions
ls -la /home/c2668909c/public_html/api

# Restart app (if using command line)
touch /home/c2668909c/public_html/api/tmp/restart.txt
```

### Testing Checklist
```
□ Can access https://cliniquedesjuristes.com (frontend loads)
□ Can access https://cliniquedesjuristes.com/api/health (returns OK)
□ Can login with admin credentials
□ No CORS errors in browser console
□ No 403 errors in Network tab
□ API calls work (test with login)
□ Database queries execute successfully
□ File uploads work (if applicable)
□ Videos play correctly (if using Hetzner)
```

---

## 🎯 Post-Deployment Steps

### 1. Verify Everything Works
```bash
# Test API health
curl https://cliniquedesjuristes.com/api/health

# Test with browser
# Open: https://cliniquedesjuristes.com
# Try logging in with admin credentials
# Check browser console for errors
```

### 2. Enable SSL Certificate
1. In cPanel → SSL/TLS Status
2. Enable AutoSSL for your domain
3. Wait for certificate to activate
4. Verify HTTPS works without warnings

### 3. Setup Backups
1. cPanel → Backup Wizard
2. Configure automatic backups
3. Download initial backup
4. Store safely

### 4. Monitor Performance
1. Check cPanel → Metrics → Resource Usage
2. Monitor Node.js app memory usage
3. Watch database size and performance
4. Review logs regularly

### 5. Security Hardening
1. Change default admin password
2. Update JWT_SECRET to a unique value
3. Review and limit database privileges if needed
4. Enable fail2ban if available
5. Keep Node.js version updated

---

## 🚨 Common Mistakes to Avoid

1. ❌ Using `http://` instead of `https://` in production
2. ❌ Including port numbers in production URLs
3. ❌ Using database port 3307 instead of 3306 on cPanel
4. ❌ Forgetting to set NODE_ENV=production
5. ❌ Not installing dependencies after upload
6. ❌ Missing `.htaccess` files
7. ❌ Wrong CORS origin configuration
8. ❌ Not restarting Node.js app after changes
9. ❌ Uploading source TypeScript instead of compiled JavaScript
10. ❌ Not setting proper file permissions

---

## 📞 Need Help?

If you encounter issues not covered in this guide:

1. **Check cPanel Logs:**
   - Error log: `/home/c2668909c/logs/error_log`
   - Access log: `/home/c2668909c/logs/access_log`
   - App logs: cPanel → Node.js Apps → View Logs

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Check Console tab for JavaScript errors
   - Check Network tab for failed requests

3. **Verify Configuration:**
   - Compare your `.env` files with this guide
   - Check both `.htaccess` files are correct
   - Ensure all paths are absolute and correct

4. **Test Step by Step:**
   - Test backend: `curl https://cliniquedesjuristes.com/api/health`
   - Test frontend: Open site in browser
   - Test API call: Try login from frontend
   - Check CORS: Inspect Network tab headers

---

## ✅ Success Checklist

Before considering deployment complete:

- [ ] Database created and migrations run successfully
- [ ] Backend files uploaded to `public_html/api/`
- [ ] Backend `.env` configured with correct credentials
- [ ] Backend `.htaccess` created with Passenger config
- [ ] Node.js app created and started in cPanel
- [ ] Backend dependencies installed (node_modules)
- [ ] Frontend build files uploaded to `public_html/`
- [ ] Frontend `.htaccess` created for React Router
- [ ] SSL certificate active (HTTPS working)
- [ ] API health endpoint returns 200 OK
- [ ] Frontend loads without errors
- [ ] Can login with admin credentials
- [ ] No CORS errors in browser console
- [ ] No 403 errors in Network tab
- [ ] API calls successfully reach backend
- [ ] Database queries work correctly

---

## 🎉 Congratulations!

If all checks pass, your application is successfully deployed on cPanel!

**Next Steps:**
1. Test all functionality thoroughly
2. Create regular backups
3. Monitor logs for errors
4. Keep dependencies updated
5. Consider adding monitoring/alerting

**Security Reminders:**
- Change default admin password immediately
- Update JWT secrets to unique values
- Review database user privileges
- Enable HTTPS-only access
- Keep software updated

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** Deployment Guide for Clinique des Juristes  
**Repository:** Medsaidabidi02/cliniquedesjuristes
