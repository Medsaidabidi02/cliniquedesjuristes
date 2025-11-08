# Quick Reference Card - cPanel Deployment

## Pre-Deployment (Local Machine)
```bash
# 1. Build Everything
./prepare-deployment.sh

# 2. Configure Files in cpanel-deployment/
# - Edit backend/.env (database credentials, domain)
# - Edit .htaccess (cPanel username, domain)

# 3. Upload to Server
# backend/* → /public_html/backend/
# frontend-files/* → /public_html/
# .htaccess → /public_html/
```

## Server Setup (SSH)
```bash
# 1. Install Dependencies
cd ~/public_html/backend
source ~/nodevenv/backend/18/bin/activate
npm install --production

# 2. Run Migrations
node run-all-migrations.js

# 3. Restart App
mkdir -p tmp
touch tmp/restart.txt

# 4. Verify
cd ~/public_html
./verify-deployment.sh
```

## Testing
```bash
# API Health Check
curl https://yourdomain.com/api/health

# View Logs
tail -f ~/logs/passenger.log

# Test in Browser
https://yourdomain.com
```

## Must Update in Config Files

### backend/.env
```
DATABASE_URL=mysql://YOUR_USER:YOUR_PASS@localhost:3306/YOUR_DB
FRONTEND_URL=https://YOURDOMAIN.com
API_URL=https://YOURDOMAIN.com
BASE_URL=https://YOURDOMAIN.com
UPLOAD_PATH=/home/YOUR_USERNAME/public_html/backend/uploads
```

### .htaccess (6 locations)
```
# Lines 2, 3: Replace c2668909c with YOUR_USERNAME
PassengerAppRoot "/home/YOUR_USERNAME/public_html/backend"
PassengerNodejs "/home/YOUR_USERNAME/nodevenv/public_html/backend/18/bin/node"

# Line 31: Update DATABASE_URL
SetEnv DATABASE_URL mysql://YOUR_USER:YOUR_PASS@localhost:3306/YOUR_DB

# Lines 26-28: Update domain (3 places)
SetEnv API_URL https://YOURDOMAIN.com
SetEnv BASE_URL https://YOURDOMAIN.com
SetEnv FRONTEND_URL https://YOURDOMAIN.com
```

## Common Issues - Quick Fixes

### "Cannot connect to localhost:5001"
```bash
# Check .env has production settings
grep NODE_ENV backend/.env  # Should be production
grep localhost backend/.env  # Should find nothing
touch backend/tmp/restart.txt
```

### "Request timeout"
```bash
# Check logs
tail -f ~/logs/passenger.log

# Reinstall dependencies
cd ~/public_html/backend
npm install --production
touch tmp/restart.txt
```

### "Database error"
```bash
# Test connection
mysql -u YOUR_USER -p YOUR_DATABASE

# Check .env port is 3306 (not 3307)
grep DATABASE_URL backend/.env
```

### "404 on routes"
```bash
# Verify files
ls ~/public_html/index.html  # Must exist
ls ~/public_html/static/  # Must exist
cat ~/public_html/.htaccess | grep RewriteRule
```

## File Permissions
```bash
chmod 644 .htaccess
chmod 644 backend/.env
chmod 755 backend/
chmod 755 backend/dist/
chmod 755 backend/uploads/
```

## Useful Commands
```bash
# Restart app
touch ~/public_html/backend/tmp/restart.txt

# View logs
tail -f ~/logs/passenger.log

# Check Node version
node --version  # Should be v18+

# Database backup
mysqldump -u USER -p DB > backup.sql

# List processes
passenger-status

# Check app status
curl https://yourdomain.com/api/health
```

## Directory Structure (Final)
```
public_html/
├── backend/
│   ├── dist/           (compiled JS)
│   ├── migrations/     (SQL files)
│   ├── node_modules/   (npm packages)
│   ├── uploads/        (user uploads)
│   ├── .env           (CONFIG!)
│   ├── package.json
│   └── run-all-migrations.js
├── static/            (React CSS/JS)
├── index.html         (React app)
├── manifest.json
├── .htaccess         (CONFIG!)
└── verify-deployment.sh
```

## Login Credentials (Default)
```
URL: https://yourdomain.com
Email: admin@cliniquedesjuristes.com
Password: admin123
⚠️ CHANGE PASSWORD AFTER FIRST LOGIN!
```

## Support Resources
- **Full Guide**: DEPLOYMENT_GUIDE.md
- **Checklist**: DEPLOYMENT_CHECKLIST.md
- **Troubleshooting**: TROUBLESHOOTING.md
- **cPanel Docs**: https://docs.cpanel.net/cpanel/
- **Passenger Docs**: https://www.phusionpassenger.com/docs/

---
**Version**: 1.0 | **Target**: cPanel 128.0.21 | **Updated**: Nov 2025
