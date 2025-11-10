# ⚡ Quick Setup Checklist - cPanel Deployment

## Before You Start
- [ ] Read CPANEL_DEPLOYMENT_GUIDE.md (full instructions)
- [ ] Have cPanel login credentials ready
- [ ] Have database credentials ready (see below)
- [ ] Have local environment with built frontend and backend

---

## 📋 Your Credentials (from .env files)

### Database
```
User:     c2668909c_clinique_user
Password: bKM8P}ZPWhH+{)Fg
Database: c2668909c_clinique_db
Host:     localhost
Port:     3306 (CRITICAL: use 3306 on cPanel, NOT 3307)
```

### Admin Account
```
Email:    admin@cliniquedesjuristes.com
Password: admin123
```

### Domain
```
Main Domain:  https://cliniquedesjuristes.com
API Endpoint: https://cliniquedesjuristes.com/api
```

---

## 🚀 Step-by-Step Deployment (15 Steps)

### Step 1: Build Locally
```bash
# Backend
cd backend
npm install
npm run build
# Creates: dist/ folder

# Frontend
cd ../frontend
npm install
npm run build:prod
# Creates: build/ folder
```

### Step 2: Setup Database in cPanel
- [ ] Log into cPanel
- [ ] Go to MySQL® Databases
- [ ] Verify database exists: `c2668909c_clinique_db`
- [ ] Verify user exists: `c2668909c_clinique_user`
- [ ] Verify user has ALL PRIVILEGES

### Step 3: Import Database Schema
- [ ] Go to phpMyAdmin
- [ ] Select database: `c2668909c_clinique_db`
- [ ] Import files from `backend/migrations/` in order:
  - [ ] 001_initial_schema.sql
  - [ ] 002_add_course_relations.sql
  - [ ] 003_add_video_hls.sql
  - [ ] (any other migration files)

### Step 4: Upload Backend Files
- [ ] In File Manager, create folder: `public_html/api`
- [ ] Upload to `public_html/api/`:
  - [ ] `dist/` folder (entire folder)
  - [ ] `package.json`
  - [ ] `package-lock.json`
  - [ ] `migrations/` folder
  - [ ] Either upload `node_modules/` OR run `npm install` via SSH

### Step 5: Create Backend .env
- [ ] In `public_html/api/`, create file: `.env`
- [ ] Copy content from `.htaccess.backend` file (environment variables section)
- [ ] Or copy from `backend/.env` and update port to 3306

**Quick .env template:**
```env
PORT=3000
NODE_ENV=production
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

### Step 6: Create Backend .htaccess
- [ ] In `public_html/api/`, create file: `.htaccess`
- [ ] Copy entire content from `.htaccess.backend` file
- [ ] **IMPORTANT:** Update Node.js version path if different:
  - Check cPanel → Setup Node.js App to see actual path
  - Update line: `PassengerNodejs "/home/c2668909c/nodevenv/public_html/api/18/bin/node"`
  - Replace `18` with your version number

### Step 7: Setup Node.js App in cPanel
- [ ] Go to cPanel → Setup Node.js App
- [ ] Click "Create Application"
- [ ] Configure:
  ```
  Node.js version:       18.x (or latest available)
  Application mode:      Production
  Application root:      public_html/api
  Application URL:       cliniquedesjuristes.com/api
  Application startup:   dist/server.js
  ```
- [ ] Click "Create"

### Step 8: Install Backend Dependencies
- [ ] In cPanel Node.js App page, click "Run NPM Install"
- [ ] Wait for completion (may take 2-5 minutes)
- [ ] OR via SSH: `cd /home/c2668909c/public_html/api && npm install --production`

### Step 9: Start Backend Application
- [ ] In cPanel Node.js App page, click "Start"
- [ ] Verify status shows "Running"
- [ ] If errors, check "View Logs"

### Step 10: Upload Frontend Files
- [ ] Compress `frontend/build/` to `build.zip`
- [ ] Upload to `public_html/`
- [ ] Extract in place
- [ ] Move all files from extracted `build/` to `public_html/` root
- [ ] Delete empty `build/` folder
- [ ] Verify structure:
  ```
  public_html/
  ├── index.html
  ├── static/
  ├── favicon.ico
  ├── logo192.png
  ├── logo512.png
  ├── manifest.json
  ├── robots.txt
  ├── asset-manifest.json
  └── api/
  ```

### Step 11: Create Frontend .htaccess
- [ ] In `public_html/` root, create file: `.htaccess`
- [ ] Copy entire content from `.htaccess.frontend` file

### Step 12: Setup SSL Certificate
- [ ] Go to cPanel → SSL/TLS Status
- [ ] Enable AutoSSL for `cliniquedesjuristes.com`
- [ ] Wait for activation (usually 1-2 minutes)
- [ ] Verify HTTPS works

### Step 13: Test Backend
```bash
# Test API health endpoint
curl https://cliniquedesjuristes.com/api/health

# Expected response:
# {"status":"OK","message":"Clinique des Juristes API is running",...}
```

- [ ] API returns 200 OK
- [ ] No 404 or 500 errors

### Step 14: Test Frontend
- [ ] Open browser: `https://cliniquedesjuristes.com`
- [ ] Frontend loads without blank page
- [ ] Open DevTools Console (F12)
- [ ] Check for JavaScript errors
- [ ] Check Network tab for failed requests

### Step 15: Test CORS & API Integration
- [ ] Try to login with admin credentials:
  - Email: `admin@cliniquedesjuristes.com`
  - Password: `admin123`
- [ ] Login should succeed
- [ ] Check DevTools:
  - [ ] No CORS errors in Console
  - [ ] No 403 Forbidden in Network tab
  - [ ] API calls to `/api/*` return 200

---

## ✅ Verification Checklist

### Backend Checks
- [ ] API health endpoint works: `curl https://cliniquedesjuristes.com/api/health`
- [ ] Node.js app shows "Running" in cPanel
- [ ] No errors in application logs
- [ ] Database connection successful
- [ ] Environment variables loaded correctly

### Frontend Checks
- [ ] Main site loads: `https://cliniquedesjuristes.com`
- [ ] No blank/white page
- [ ] No JavaScript errors in console
- [ ] Static assets load (images, CSS, JS)

### Integration Checks
- [ ] Can login with admin credentials
- [ ] API calls work (check Network tab)
- [ ] No CORS errors
- [ ] No 403 Forbidden errors
- [ ] No Mixed Content warnings

### Security Checks
- [ ] HTTPS enabled and working
- [ ] No HTTP redirect loops
- [ ] `.env` files not publicly accessible
- [ ] `.htaccess` files in place

---

## 🔧 Common Issues & Quick Fixes

### Issue: 403 Forbidden on API calls
**Fix:**
1. Check both `.htaccess` files are uploaded
2. Verify CORS headers in backend `.htaccess`
3. Restart Node.js app in cPanel
4. Clear browser cache
5. Test in incognito mode

### Issue: API returns 404
**Fix:**
1. Verify Node.js app is running
2. Check `PassengerBaseURI "/api"` in backend `.htaccess`
3. Ensure `dist/server.js` exists
4. Restart app

### Issue: Database connection error
**Fix:**
1. Use port **3306** not 3307
2. Verify credentials in `.env` and `.htaccess`
3. Test connection via phpMyAdmin
4. Check user has ALL PRIVILEGES

### Issue: Frontend blank page
**Fix:**
1. Check `index.html` exists in `public_html/` root
2. Verify frontend `.htaccess` exists
3. Check browser console for errors
4. Ensure build used correct API URL

### Issue: Node.js app won't start
**Fix:**
1. Check application logs in cPanel
2. Verify `dist/server.js` exists
3. Run `npm install` again
4. Check Node.js version compatibility
5. Review error logs: `/home/c2668909c/logs/error_log`

---

## 📁 Important Files Reference

### Files You Need to Create/Upload

1. **Backend .env**
   - Location: `/home/c2668909c/public_html/api/.env`
   - Source: Copy from `.htaccess.backend` or `backend/.env`

2. **Backend .htaccess**
   - Location: `/home/c2668909c/public_html/api/.htaccess`
   - Source: Copy from `.htaccess.backend`

3. **Frontend .htaccess**
   - Location: `/home/c2668909c/public_html/.htaccess`
   - Source: Copy from `.htaccess.frontend`

### Files to Upload

**Backend:**
- `backend/dist/` → `public_html/api/dist/`
- `backend/package.json` → `public_html/api/package.json`
- `backend/package-lock.json` → `public_html/api/package-lock.json`
- `backend/migrations/` → `public_html/api/migrations/`

**Frontend:**
- `frontend/build/*` → `public_html/*` (all files from build to root)

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ `https://cliniquedesjuristes.com` loads the frontend  
✅ `https://cliniquedesjuristes.com/api/health` returns OK  
✅ Can login with admin credentials  
✅ No CORS errors in browser console  
✅ No 403 errors in Network tab  
✅ API calls successfully reach backend  
✅ HTTPS is enabled and working  
✅ No console errors  

---

## 📞 Need More Help?

- Read full guide: **CPANEL_DEPLOYMENT_GUIDE.md**
- Check logs: `/home/c2668909c/logs/error_log`
- Check browser console (F12)
- Verify all credentials match
- Test each component individually

---

## 🚨 CRITICAL REMINDERS

1. ⚠️ Use port **3306** (NOT 3307) for database on cPanel
2. ⚠️ All URLs must be **HTTPS** without port numbers
3. ⚠️ Both `.htaccess` files are REQUIRED
4. ⚠️ Update Node.js path in backend `.htaccess` if version differs
5. ⚠️ Restart Node.js app after ANY changes to `.htaccess` or `.env`

---

**Last Updated:** 2024  
**Version:** 1.0  
**Repository:** Medsaidabidi02/cliniquedesjuristes
