# Complete cPanel Deployment Guide for Clinique des Juristes

## Version: cPanel 128.0.21
## Deployment Path: All files under public_html (no subdomains)

This guide provides step-by-step instructions for deploying the Clinique des Juristes application on cPanel 128.0.21. The application consists of a React frontend and Node.js backend (Express + TypeScript) integrated into a single directory structure.

---

## Prerequisites

Before starting, ensure you have:
- cPanel access with SSH enabled
- Node.js 18+ available (setup through cPanel Node.js selector)
- MySQL database created in cPanel
- Domain pointed to your cPanel server
- Access to cPanel File Manager or FTP/SFTP client

---

## Part 1: Pre-Deployment Preparation (On Your Local Machine)

### Step 1: Build the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build for production with correct API URL
npm run build:prod

# This creates a 'build' folder with all static files
```

**Verify:** Check that `frontend/build/` directory exists with `index.html`, `static/` folder, etc.

### Step 2: Build the Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# This creates a 'dist' folder with compiled JavaScript
```

**Verify:** Check that `backend/dist/` directory exists with `server.js`, `app.js`, and all compiled files.

---

## Part 2: cPanel Database Setup

### Step 3: Create MySQL Database

1. Log into cPanel
2. Go to **MySQL® Databases**
3. Create a new database:
   - Database name: `clinique_db` (cPanel will prefix it, e.g., `c2668909c_clinique_db`)
4. Create a database user:
   - Username: `clinique_user` (cPanel will prefix it)
   - Password: Use a strong password (save it securely)
5. Add user to database with **ALL PRIVILEGES**
6. Note down the full database credentials:
   - Host: `localhost`
   - Port: `3306` (default MySQL port in cPanel)
   - Database name: `c2668909c_clinique_db` (with your prefix)
   - Username: `c2668909c_clinique_user` (with your prefix)
   - Password: Your chosen password

### Step 4: Import Database Schema

You'll run migrations after deployment. For now, ensure the database is created and accessible.

---

## Part 3: cPanel Node.js Application Setup

### Step 5: Setup Node.js Application

1. In cPanel, go to **Setup Node.js App**
2. Click **Create Application**
3. Configure the application:
   - **Node.js version:** 18.x or higher
   - **Application mode:** Production
   - **Application root:** `backend` (or whatever you name your backend folder, e.g., `api_backend`)
   - **Application URL:** Leave blank (will use document root)
   - **Application startup file:** `dist/server.js`
   - **Passenger log file:** `logs/passenger.log` (optional)
4. Click **Create**
5. **Important:** Copy the command to enter the virtual environment (shown after creation)
   - It looks like: `source /home/c2668909c/nodevenv/backend/18/bin/activate`
   - **NOTE:** If your backend folder is named differently (e.g., `api_backend`), the path will reflect that

**CRITICAL:** Remember your backend folder name! You'll need to update it in:
- `.htaccess` file (2 locations: PassengerAppRoot and PassengerNodejs)
- All deployment commands throughout this guide

---

## Part 4: File Upload to cPanel

### Step 6: Upload Files via cPanel File Manager

**Upload Backend Files:**

1. Go to cPanel **File Manager**
2. Navigate to `public_html/backend/`
3. Upload these files/folders from your local `backend` directory:
   - `dist/` (entire folder - compiled backend code)
   - `migrations/` (database migration files)
   - `node_modules/` (or install later via SSH)
   - `package.json`
   - `package-lock.json`
   - `.env` (create from template - see Step 8)

**Upload Frontend Files:**

1. Navigate to `public_html/`
2. Upload ALL files from your local `frontend/build/` directory directly to `public_html/`:
   - `index.html`
   - `static/` folder
   - `manifest.json`
   - `favicon.ico`
   - All other build files

**Upload Configuration Files:**

1. Navigate to `public_html/`
2. Upload:
   - `.htaccess` (from repository root - see Step 9)

**Final Structure:**
```
public_html/
├── backend/
│   ├── dist/
│   │   ├── server.js
│   │   ├── app.js
│   │   └── ... (all compiled JS files)
│   ├── migrations/
│   ├── node_modules/
│   ├── package.json
│   ├── package-lock.json
│   └── .env
├── index.html (from frontend build)
├── static/ (from frontend build)
├── manifest.json (from frontend build)
├── .htaccess
└── ... (other frontend static files)
```

---

## Part 5: Configuration Files Setup

### Step 7: Configure Backend .env

Create `/home/c2668909c/public_html/backend/.env` with these contents:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration - UPDATE WITH YOUR CREDENTIALS
DATABASE_URL=mysql://c2668909c_clinique_user:YOUR_PASSWORD_HERE@localhost:3306/c2668909c_clinique_db

# Security
JWT_SECRET=legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version-production
VIDEO_SECRET=legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version-production
JWT_EXPIRES_IN=24h

# File Upload
MAX_FILE_SIZE=5120
UPLOAD_PATH=/home/c2668909c/public_html/backend/uploads

# URLs - NO PORTS! Use your actual domain
FRONTEND_URL=https://cliniquedesjuristes.com
API_URL=https://cliniquedesjuristes.com
BASE_URL=https://cliniquedesjuristes.com

# Admin Credentials
DEFAULT_ADMIN_EMAIL=admin@cliniquedesjuristes.com
DEFAULT_ADMIN_PASSWORD=admin123

# Hetzner Object Storage (S3-compatible) - Optional
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://nbg1.your-objectstorage.com
HETZNER_BUCKET=cliniquedesjuristes
HETZNER_ACCESS_KEY_ID=your_access_key_here
HETZNER_SECRET_ACCESS_KEY=your_secret_key_here

# HLS Streaming
ENABLE_HLS=true
```

**Important:** Replace:
- `YOUR_PASSWORD_HERE` with your actual database password
- `c2668909c` with your actual cPanel username prefix
- `cliniquedesjuristes.com` with your actual domain
- `backend` with your actual backend folder name if different (e.g., `api_backend`)
- Hetzner credentials if using object storage

### Step 7b: Configure .htaccess File

**CRITICAL:** The `.htaccess` file in the repository is a template. You MUST update it for your setup.

Edit `/home/c2668909c/public_html/.htaccess` and update these lines:

```apache
# Line 8 - Update username AND backend folder name
PassengerAppRoot "/home/YOUR_USERNAME/public_html/YOUR_BACKEND_FOLDER"

# Line 10 - Update username AND backend folder name AND Node version
PassengerNodejs "/home/YOUR_USERNAME/nodevenv/public_html/YOUR_BACKEND_FOLDER/18/bin/node"
```

**Example for user c2668909c with backend folder named api_backend:**
```apache
PassengerAppRoot "/home/c2668909c/public_html/api_backend"
PassengerNodejs "/home/c2668909c/nodevenv/public_html/api_backend/18/bin/node"
```

**Common Mistakes to Avoid:**
1. ❌ Leaving `backend` when your folder is `api_backend`
2. ❌ Adding proxy rules like `RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L,QSA]`
3. ❌ Having duplicate Passenger configuration blocks
4. ❌ Wrong Node.js version in path (should match cPanel setup)

**Verify your .htaccess:**
```bash
# Check the paths match your actual folders
cat ~/public_html/.htaccess | grep Passenger
```

### Step 8: Set File Permissions

```bash
# Connect via SSH
ssh your_cpanel_username@yourdomain.com

# Set correct permissions
chmod 644 /home/c2668909c/public_html/backend/.env
chmod 755 /home/c2668909c/public_html/backend/dist
chmod 755 /home/c2668909c/public_html/backend
chmod 644 /home/c2668909c/public_html/.htaccess
```

---

## Part 6: Install Dependencies and Run Migrations

### Step 9: Install Node.js Dependencies via SSH

```bash
# Connect via SSH
ssh your_cpanel_username@yourdomain.com

# Navigate to backend directory
cd public_html/backend

# Enter the Node.js virtual environment
source /home/c2668909c/nodevenv/backend/18/bin/activate

# Install production dependencies
npm install --production

# Verify installation
node --version  # Should show v18.x or higher
npm --version
```

### Step 10: Run Database Migrations

```bash
# Still in backend directory with virtual environment active
cd /home/c2668909c/public_html/backend

# Run migrations manually using Node.js
node -e "
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'c2668909c_clinique_user',
    password: 'YOUR_PASSWORD_HERE',
    database: 'c2668909c_clinique_db',
    multipleStatements: true
  });

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log('Running migrations...');
  for (const file of files) {
    console.log('Running:', file);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await connection.query(sql);
    console.log('✓', file);
  }

  await connection.end();
  console.log('All migrations completed successfully!');
}

runMigrations().catch(console.error);
"
```

**Or** create a migration script (recommended):

Create `public_html/backend/run-migrations.js`:
```javascript
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  
  const connection = await mysql.createConnection({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 3306,
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.slice(1),
    multipleStatements: true
  });

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('Running migrations...');
  for (const file of files) {
    console.log('Running:', file);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await connection.query(sql);
    console.log('✓', file);
  }

  await connection.end();
  console.log('All migrations completed successfully!');
}

runMigrations().catch(console.error);
```

Then run:
```bash
cd /home/c2668909c/public_html/backend
source /home/c2668909c/nodevenv/backend/18/bin/activate
node run-migrations.js
```

---

## Part 7: Restart Application

### Step 11: Restart the Node.js Application

**Option A: Via cPanel**
1. Go to **Setup Node.js App** in cPanel
2. Find your application
3. Click **Restart**

**Option B: Via SSH**
```bash
# Create/touch restart.txt file
touch /home/c2668909c/public_html/backend/tmp/restart.txt
```

**Option C: Using Passenger command**
```bash
# Find Passenger restart command for your app
passenger-config restart-app /home/c2668909c/public_html/backend
```

---

## Part 8: Verification and Testing

### Step 12: Test API Endpoints

**Test Health Check:**
```bash
curl https://cliniquedesjuristes.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Clinique des Juristes API is running",
  "timestamp": "2025-11-08T16:00:00.000Z",
  "environment": "production",
  "version": "1.0.0"
}
```

**Test Database Connection:**
Check application logs in cPanel or via SSH:
```bash
tail -f /home/c2668909c/logs/passenger.log
```

Look for:
- `✅ Database connected successfully`
- `🚀 Server running on port 3000` (or configured port)

### Step 13: Test Frontend

1. Open your browser and navigate to `https://cliniquedesjuristes.com`
2. Verify:
   - Homepage loads correctly
   - No console errors (press F12 to check)
   - Navigation works
   - API calls succeed (check Network tab in browser DevTools)

### Step 14: Test Admin Login

1. Navigate to the login page
2. Use credentials from `.env`:
   - Email: `admin@cliniquedesjuristes.com`
   - Password: `admin123`
3. Verify successful login and access to admin features

---

## Part 9: Troubleshooting Common Issues

### Issue 1: "Cannot connect to server localhost:5001"

**Cause:** Application trying to use hardcoded localhost:5001 instead of Passenger

**Solution:**
1. Verify `.htaccess` is properly configured (see below)
2. Ensure `.env` has `NODE_ENV=production`
3. Restart the application

### Issue 2: "Request timeout"

**Cause:** Application not starting or Passenger configuration error

**Solutions:**
1. Check Passenger logs:
   ```bash
   tail -f /home/c2668909c/logs/passenger.log
   ```

2. Verify Node.js version:
   ```bash
   source /home/c2668909c/nodevenv/backend/18/bin/activate
   node --version
   ```

3. Check for startup errors in logs

4. Ensure all dependencies are installed:
   ```bash
   cd /home/c2668909c/public_html/backend
   npm install --production
   ```

### Issue 3: Database Connection Failed

**Solutions:**
1. Verify database credentials in `.env`
2. Test database connection from SSH:
   ```bash
   mysql -u c2668909c_clinique_user -p c2668909c_clinique_db
   ```
3. Ensure user has correct privileges
4. Check that port is 3306 (not 3307)

### Issue 4: 404 Errors on Frontend Routes

**Cause:** `.htaccess` not properly configured for React Router

**Solution:** Ensure `.htaccess` has the correct rewrite rules (see configuration below)

### Issue 5: CORS Errors

**Cause:** Frontend and backend URL mismatch

**Solutions:**
1. Verify both frontend and backend `.env` files have matching URLs
2. Ensure no trailing slashes
3. Use HTTPS (not HTTP) if SSL is enabled
4. Check CORS configuration in `backend/src/app.ts`

### Issue 6: Static Files Not Loading

**Solutions:**
1. Verify frontend build files are in `public_html/` root
2. Check file permissions (should be 644 for files, 755 for directories)
3. Clear browser cache
4. Check for errors in browser console

---

## Part 10: Maintenance and Updates

### Deploying Updates

**For Backend Code Changes:**
```bash
# Local machine
cd backend
npm run build

# Upload new 'dist' folder to public_html/backend/

# SSH to server
ssh your_cpanel_username@yourdomain.com
touch /home/c2668909c/public_html/backend/tmp/restart.txt
```

**For Frontend Changes:**
```bash
# Local machine
cd frontend
npm run build:prod

# Upload all files from 'build' folder to public_html/
# Overwrite existing files

# No restart needed for frontend
```

**For New Migrations:**
```bash
# Upload new migration file to public_html/backend/migrations/
# SSH and run:
cd /home/c2668909c/public_html/backend
source /home/c2668909c/nodevenv/backend/18/bin/activate
node run-migrations.js
touch tmp/restart.txt
```

### Monitoring

1. **Check Application Status:**
   ```bash
   curl https://cliniquedesjuristes.com/api/health
   ```

2. **Monitor Logs:**
   ```bash
   tail -f /home/c2668909c/logs/passenger.log
   ```

3. **Database Backups:**
   - Use cPanel's backup feature regularly
   - Or use mysqldump:
     ```bash
     mysqldump -u c2668909c_clinique_user -p c2668909c_clinique_db > backup.sql
     ```

---

## Security Checklist

- [ ] Change default admin password after first login
- [ ] Use strong database password
- [ ] Keep JWT_SECRET secure and never commit to git
- [ ] Enable HTTPS (SSL certificate via cPanel)
- [ ] Set proper file permissions (644 for files, 755 for directories)
- [ ] Regularly update Node.js dependencies
- [ ] Keep cPanel and Node.js version updated
- [ ] Monitor access logs for suspicious activity
- [ ] Enable firewall rules if available
- [ ] Regular database backups

---

## Additional Resources

- **cPanel Documentation:** https://docs.cpanel.net/cpanel/
- **Node.js Selector:** https://docs.cpanel.net/cpanel/software/application-manager/
- **Passenger:** https://www.phusionpassenger.com/docs/
- **React Deployment:** https://create-react-app.dev/docs/deployment/

---

## Support

If you encounter issues not covered in this guide:
1. Check application logs in cPanel
2. Review Passenger logs for detailed error messages
3. Verify all environment variables are correctly set
4. Ensure all dependencies are installed
5. Contact your hosting provider's support if needed

---

**Deployment Guide Version:** 1.0  
**Last Updated:** November 2025  
**Application:** Clinique des Juristes  
**Target Platform:** cPanel 128.0.21
