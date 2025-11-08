# cPanel Deployment Checklist

Use this checklist to ensure all steps are completed correctly during deployment.

## Pre-Deployment (Local Machine)

- [ ] **Frontend Build**
  - [ ] Run `cd frontend && npm install`
  - [ ] Run `npm run build:prod`
  - [ ] Verify `frontend/build/` directory exists
  - [ ] Verify `frontend/build/index.html` exists
  - [ ] Verify `frontend/build/static/` folder exists

- [ ] **Backend Build**
  - [ ] Run `cd backend && npm install`
  - [ ] Run `npm run build`
  - [ ] Verify `backend/dist/` directory exists
  - [ ] Verify `backend/dist/server.js` exists
  - [ ] Verify `backend/dist/app.js` exists

- [ ] **Configuration Files Ready**
  - [ ] `.htaccess` file updated with your cPanel username
  - [ ] `.htaccess` file updated with your domain
  - [ ] Backend `.env` file prepared with database credentials
  - [ ] Frontend `.env` file prepared with API URL

## cPanel Setup

- [ ] **Database Setup**
  - [ ] MySQL database created
  - [ ] Database user created
  - [ ] User added to database with ALL PRIVILEGES
  - [ ] Database credentials noted down:
    - Database name: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
    - Username: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
    - Password: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
    - Host: localhost
    - Port: 3306

- [ ] **Node.js Application Setup**
  - [ ] Node.js App created in cPanel
  - [ ] Node.js version 18+ selected
  - [ ] Application mode set to "Production"
  - [ ] Application root set to "backend"
  - [ ] Startup file set to "dist/server.js"
  - [ ] Virtual environment path noted down

## File Upload

- [ ] **Backend Files**
  - [ ] `backend/dist/` folder uploaded
  - [ ] `backend/migrations/` folder uploaded
  - [ ] `backend/package.json` uploaded
  - [ ] `backend/package-lock.json` uploaded
  - [ ] `backend/.env` uploaded (configured)

- [ ] **Frontend Files**
  - [ ] All files from `frontend/build/` uploaded to `public_html/`
  - [ ] `index.html` in `public_html/`
  - [ ] `static/` folder in `public_html/`
  - [ ] `manifest.json` in `public_html/`
  - [ ] All asset files copied

- [ ] **Configuration Files**
  - [ ] `.htaccess` uploaded to `public_html/`
  - [ ] `.htaccess` updated with correct paths and credentials

## Configuration

- [ ] **Backend .env File**
  - [ ] PORT=3000
  - [ ] NODE_ENV=production
  - [ ] DATABASE_URL updated with real credentials
  - [ ] All URLs use your actual domain (no localhost)
  - [ ] No port numbers in URLs
  - [ ] UPLOAD_PATH set to absolute path
  - [ ] JWT_SECRET is secure
  - [ ] Admin credentials set

- [ ] **.htaccess File**
  - [ ] PassengerAppRoot path updated
  - [ ] PassengerNodejs path updated
  - [ ] Database URL in SetEnv updated
  - [ ] Domain URLs updated (3 places)
  - [ ] All 'c2668909c' replaced with your username

- [ ] **File Permissions**
  - [ ] `.env` files set to 644
  - [ ] `.htaccess` set to 644
  - [ ] Directories set to 755
  - [ ] Regular files set to 644

## Dependencies and Migrations

- [ ] **SSH Access**
  - [ ] Connected to server via SSH
  - [ ] Navigated to `public_html/backend`
  - [ ] Activated Node.js virtual environment

- [ ] **Install Dependencies**
  - [ ] Ran `npm install --production`
  - [ ] No errors during installation
  - [ ] `node_modules/` folder created

- [ ] **Run Migrations**
  - [ ] Ran `node run-all-migrations.js`
  - [ ] All migrations executed successfully
  - [ ] Database tables created
  - [ ] No errors reported

## Application Startup

- [ ] **Restart Application**
  - [ ] Restarted via cPanel Node.js App manager
  - OR
  - [ ] Created `backend/tmp/restart.txt`
  - [ ] Application restarted successfully

- [ ] **Check Logs**
  - [ ] Checked Passenger logs for errors
  - [ ] No startup errors
  - [ ] Database connection successful
  - [ ] Server started message seen

## Testing

- [ ] **API Health Check**
  - [ ] `curl https://yourdomain.com/api/health` works
  - [ ] Returns JSON with status "OK"
  - [ ] Environment shows "production"

- [ ] **Frontend Loading**
  - [ ] Website loads at https://yourdomain.com
  - [ ] No 404 errors
  - [ ] No console errors in browser
  - [ ] Static assets load correctly

- [ ] **Database Connection**
  - [ ] No database errors in logs
  - [ ] API endpoints respond correctly

- [ ] **Admin Login**
  - [ ] Can navigate to login page
  - [ ] Can login with admin credentials
  - [ ] Dashboard loads after login
  - [ ] No authentication errors

- [ ] **Basic Functionality**
  - [ ] Navigation works
  - [ ] API calls succeed
  - [ ] Data loads from database
  - [ ] File uploads work (if applicable)

## Post-Deployment

- [ ] **Security**
  - [ ] Changed default admin password
  - [ ] SSL certificate installed (HTTPS working)
  - [ ] Sensitive files protected
  - [ ] Database credentials secure

- [ ] **Monitoring**
  - [ ] Bookmark log file location
  - [ ] Set up regular database backups
  - [ ] Document any custom configurations

- [ ] **Documentation**
  - [ ] Note deployment date
  - [ ] Document any issues and resolutions
  - [ ] Save backup of working configuration

## Troubleshooting Reference

If you encounter issues, check:

1. **Cannot connect to localhost:5001**
   - Verify .env has NODE_ENV=production
   - Check .htaccess PassengerAppRoot path
   - Restart application

2. **Request timeout**
   - Check Passenger logs
   - Verify Node.js dependencies installed
   - Check database connection

3. **404 on frontend routes**
   - Verify .htaccess RewriteRules
   - Check frontend files in public_html/
   - Clear browser cache

4. **Database errors**
   - Verify DATABASE_URL in .env
   - Check port is 3306 (not 3307)
   - Test database connection from SSH

5. **API errors**
   - Check Passenger logs
   - Verify migrations ran successfully
   - Test with curl commands

---

**Deployment Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Deployed By:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Server:** cPanel 128.0.21  
**Domain:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Notes:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
