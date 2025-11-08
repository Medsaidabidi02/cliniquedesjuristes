# Quick Troubleshooting Reference

## Common Deployment Issues & Solutions

### ❌ 403 Forbidden - htaccess syntax error

**Symptom:** "403 Forbidden - Server unable to read htaccess file, denying access to be safe"

**Root Causes:**
1. Invalid Apache directives (e.g., `<IfModule Litespeed>`)
2. Proxy rules to localhost (e.g., `RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L,QSA]`)
3. Duplicate Passenger configurations
4. Wrong paths in PassengerAppRoot or PassengerNodejs

**Solution:**
```bash
# 1. Remove ALL proxy rules to localhost - Passenger handles routing directly
# Delete lines like:
# RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L,QSA]

# 2. Remove duplicate Passenger configs - keep only ONE
# If you have both Node 16 and 18 configs, keep only the version you're using

# 3. Update paths to match YOUR setup:
PassengerAppRoot "/home/YOUR_USERNAME/public_html/YOUR_BACKEND_FOLDER"
PassengerNodejs "/home/YOUR_USERNAME/nodevenv/public_html/YOUR_BACKEND_FOLDER/18/bin/node"

# Common mistake: .htaccess says "backend" but folder is "api_backend"
# Fix: Change "backend" to "api_backend" in BOTH lines above

# 4. Test htaccess syntax:
apachectl configtest  # If available

# 5. Check Apache error logs:
tail -50 ~/logs/error_log
```

**Example of CORRECT Passenger config for api_backend folder:**
```apache
PassengerAppRoot "/home/c2668909c/public_html/api_backend"
PassengerBaseURI "/"
PassengerNodejs "/home/c2668909c/nodevenv/public_html/api_backend/18/bin/node"
PassengerAppType node
PassengerStartupFile dist/server.js
PassengerEnabled on
```

---

### ❌ Cannot find module 'express' (or other dependencies)

**Symptom:** Passenger logs show "Error: Cannot find module 'express'"

**Root Cause:** Dependencies not installed in backend folder

**Solution:**
```bash
# 1. Navigate to backend folder (use YOUR actual folder name)
cd ~/public_html/api_backend  # or ~/public_html/backend

# 2. Activate Node.js environment (use YOUR paths)
source ~/nodevenv/public_html/api_backend/18/bin/activate

# 3. Install dependencies
npm install --production

# 4. Verify installation
ls node_modules/ | wc -l  # Should show > 50

# 5. Restart application
mkdir -p tmp
touch tmp/restart.txt
```

---

### ❌ Cannot connect to server localhost:5001

**Symptom:** Browser shows "Cannot connect to server localhost:5001"

**Root Cause:** Application is referencing localhost:5001 instead of using Passenger

**Solution:**
```bash
# 1. Check backend/.env file
NODE_ENV=production  # MUST be production, not development

# 2. Verify .htaccess PassengerAppRoot
PassengerAppRoot "/home/your_username/public_html/backend"

# 3. Restart application
touch /home/your_username/public_html/backend/tmp/restart.txt

# 4. Check Passenger logs
tail -f ~/logs/passenger.log
```

**Prevention:** Ensure all .env files have production URLs (no localhost, no port numbers)

---

### ❌ Request Timeout

**Symptom:** Application times out when loading

**Root Cause:** Backend not starting or dependencies missing

**Solution:**
```bash
# 1. Check if dependencies are installed
cd /home/your_username/public_html/backend
ls -la node_modules/  # Should exist

# 2. Install dependencies if missing
source /home/your_username/nodevenv/backend/18/bin/activate
npm install --production

# 3. Check for syntax errors in compiled code
node dist/server.js  # Should start without errors

# 4. Restart application
touch tmp/restart.txt

# 5. Monitor logs for errors
tail -f ~/logs/passenger.log
```

**Prevention:** Always run `npm install --production` after uploading

---

### ❌ Database Connection Failed

**Symptom:** Error: "ECONNREFUSED" or "Access denied for user"

**Root Cause:** Incorrect database credentials or port

**Solution:**
```bash
# 1. Verify database credentials
cat backend/.env | grep DATABASE_URL
# Should be: mysql://user:pass@localhost:3306/dbname
# Note: Port MUST be 3306 (not 3307)

# 2. Test database connection
mysql -u your_db_user -p your_db_name
# If this fails, credentials are wrong

# 3. Check database exists in cPanel
# cPanel > MySQL Databases > Check if database is listed

# 4. Verify user has privileges
# cPanel > MySQL Databases > Check user is added to database

# 5. Update .env with correct credentials
vi backend/.env
# Then restart: touch backend/tmp/restart.txt
```

**Special Characters in Password:**
If password has special characters, URL-encode them:
- `@` becomes `%40`
- `#` becomes `%23`
- `&` becomes `%26`
- `+` becomes `%2B`
- etc.

Example: `Pass@123` → `Pass%40123`

---

### ❌ 404 Errors on Frontend Routes

**Symptom:** Page refreshes or direct URLs show 404

**Root Cause:** .htaccess not configured for React Router

**Solution:**
```bash
# 1. Verify .htaccess exists
ls -la /home/your_username/public_html/.htaccess

# 2. Check .htaccess has rewrite rules
cat public_html/.htaccess | grep RewriteRule
# Should include: RewriteRule ^(.*)$ /index.html [L,QSA]

# 3. Ensure RewriteEngine is On
cat public_html/.htaccess | grep RewriteEngine
# Should show: RewriteEngine On

# 4. Verify frontend files exist
ls public_html/index.html  # Must exist
ls -la public_html/static/  # Must exist

# 5. Check file permissions
chmod 644 public_html/.htaccess
chmod 644 public_html/index.html
```

---

### ❌ CORS Errors

**Symptom:** Browser console shows CORS policy errors

**Root Cause:** Frontend and backend URL mismatch

**Solution:**
```bash
# 1. Check frontend .env (before build)
cat frontend/.env
# REACT_APP_API_URL should match your domain

# 2. Check backend .env
cat backend/.env
# FRONTEND_URL and API_URL should match

# 3. Verify CORS configuration in backend/src/app.ts
# allowedOrigins should include your domain

# 4. Check .htaccess CORS headers
cat public_html/.htaccess | grep Access-Control
# Should set proper CORS headers

# 5. Rebuild frontend if .env changed
cd frontend
npm run build:prod
# Then re-upload build files
```

---

### ❌ Static Files Not Loading (CSS, JS)

**Symptom:** Website loads but no styling, console shows 404 for .js/.css files

**Root Cause:** Frontend build files not uploaded correctly

**Solution:**
```bash
# 1. Verify static folder exists
ls -la /home/your_username/public_html/static/

# 2. Check file structure
ls public_html/
# Should show: index.html, static/, manifest.json, etc.

# 3. Verify file permissions
chmod 755 public_html/static/
chmod 644 public_html/static/css/*
chmod 644 public_html/static/js/*

# 4. Check .htaccess doesn't block static files
cat public_html/.htaccess | grep -A 5 "RewriteCond"
# Should have: RewriteCond %{REQUEST_FILENAME} -f
#              RewriteRule .* - [L]

# 5. Clear browser cache
# Or test in incognito mode
```

---

### ❌ Application Doesn't Restart

**Symptom:** Changes not taking effect

**Root Cause:** Passenger not detecting restart signal

**Solution:**
```bash
# Method 1: Touch restart.txt
mkdir -p /home/your_username/public_html/backend/tmp
touch /home/your_username/public_html/backend/tmp/restart.txt

# Method 2: Restart via cPanel
# cPanel > Setup Node.js App > Click Restart button

# Method 3: Use passenger-config (if available)
passenger-config restart-app /home/your_username/public_html/backend

# Verify restart
tail -f ~/logs/passenger.log
# Should show new startup messages
```

---

### ❌ Migrations Failed

**Symptom:** Database tables not created, migration errors

**Root Cause:** Database permissions or syntax errors

**Solution:**
```bash
# 1. Check database connection
cd /home/your_username/public_html/backend
node -e "
const mysql = require('mysql2/promise');
require('dotenv').config();
const url = new URL(process.env.DATABASE_URL);
mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1)
}).then(() => console.log('✓ Connected')).catch(err => console.error('✗', err.message));
"

# 2. Check user privileges
mysql -u your_user -p
SHOW GRANTS;  # Should show CREATE, ALTER, DROP privileges

# 3. Run migrations with verbose output
node run-all-migrations.js

# 4. If specific migration fails, run manually
mysql -u your_user -p your_database < migrations/migration_file.sql

# 5. Check migration status
mysql -u your_user -p your_database
SELECT * FROM migrations;  # Shows which ran successfully
```

---

### ❌ File Upload Fails

**Symptom:** Cannot upload files, gets error

**Root Cause:** Upload directory permissions or size limits

**Solution:**
```bash
# 1. Create uploads directory
mkdir -p /home/your_username/public_html/backend/uploads
chmod 755 /home/your_username/public_html/backend/uploads

# 2. Check .env UPLOAD_PATH
cat backend/.env | grep UPLOAD_PATH
# Should be absolute path: /home/your_username/public_html/backend/uploads

# 3. Check file size limits in .htaccess
cat public_html/.htaccess | grep upload_max_filesize
# Increase if needed

# 4. Verify directory is writable
ls -la backend/ | grep uploads
# Should show: drwxr-xr-x ... uploads

# 5. Test upload permissions
touch backend/uploads/test.txt
# If this fails, fix permissions
```

---

## Quick Command Reference

```bash
# Restart application
touch ~/public_html/backend/tmp/restart.txt

# View logs
tail -f ~/logs/passenger.log

# Check application health
curl https://yourdomain.com/api/health

# Test database connection
mysql -u dbuser -p dbname

# Check Node.js version
source ~/nodevenv/backend/18/bin/activate
node --version

# Install dependencies
cd ~/public_html/backend
npm install --production

# Run migrations
node run-all-migrations.js

# Check file permissions
ls -la ~/public_html/

# Database backup
mysqldump -u dbuser -p dbname > backup_$(date +%Y%m%d).sql

# Clear Node.js cache
cd ~/public_html/backend
rm -rf node_modules
npm install --production
```

## Getting Help

1. **Check logs first:** `tail -f ~/logs/passenger.log`
2. **Verify configuration:** Review .env and .htaccess files
3. **Test API:** `curl https://yourdomain.com/api/health`
4. **Check browser console:** Press F12, look for errors
5. **Review deployment checklist:** Ensure all steps completed

## Prevention Checklist

Before deployment:
- [ ] All .env files use production settings
- [ ] No localhost or port numbers in URLs
- [ ] Database port is 3306 (not 3307)
- [ ] NODE_ENV=production in backend/.env
- [ ] .htaccess updated with your cPanel username
- [ ] All paths use absolute paths for cPanel
- [ ] Dependencies installed with npm install --production
- [ ] Migrations run successfully
- [ ] Application restarted after changes

---

**For detailed solutions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**
