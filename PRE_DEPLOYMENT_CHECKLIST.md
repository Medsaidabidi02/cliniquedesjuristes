# ✅ Pre-Deployment Checklist

Use this checklist to ensure you have everything ready BEFORE starting the cPanel deployment.

---

## 📋 Prerequisites Check

### Local Development Environment
- [ ] Node.js installed (version 12.0.0 or higher)
- [ ] npm installed
- [ ] Git installed
- [ ] Code editor available
- [ ] Terminal/command line access

### cPanel Access
- [ ] cPanel login credentials available
- [ ] cPanel URL known
- [ ] Hosting plan includes Node.js support
- [ ] SSH access available (optional but helpful)
- [ ] FTP credentials (if not using File Manager)

### Domain & SSL
- [ ] Domain name: `cliniquedesjuristes.com` pointing to cPanel server
- [ ] DNS propagated (use https://www.whatsmydns.net/)
- [ ] SSL certificate can be installed (AutoSSL or custom)

### Database
- [ ] MySQL database created: `c2668909c_clinique_db`
- [ ] Database user created: `c2668909c_clinique_user`
- [ ] Database password: `bKM8P}ZPWhH+{)Fg`
- [ ] User has ALL PRIVILEGES on database
- [ ] phpMyAdmin access confirmed

---

## 🔨 Build Preparation

### Backend Build
```bash
cd backend
npm install
npm run build
# Verify dist/ folder was created
ls -la dist/
# Should see server.js and other compiled files
```

- [ ] Backend dependencies installed
- [ ] TypeScript compiled successfully
- [ ] `dist/` folder exists
- [ ] `dist/server.js` exists
- [ ] No build errors

### Frontend Build
```bash
cd frontend
npm install
npm run build:prod
# Verify build/ folder was created
ls -la build/
# Should see index.html, static/, etc.
```

- [ ] Frontend dependencies installed
- [ ] React build completed successfully
- [ ] `build/` folder exists
- [ ] `build/index.html` exists
- [ ] `build/static/` folder exists
- [ ] No build errors
- [ ] Environment variable `REACT_APP_API_URL` set correctly

---

## 📁 Files to Upload

### Backend Files
Create a checklist of what you need to upload:

- [ ] `dist/` folder (entire folder with all .js files)
- [ ] `package.json`
- [ ] `package-lock.json`
- [ ] `migrations/` folder (all .sql files)
- [ ] `.env` file (create on server or upload prepared version)
- [ ] `.htaccess` file (copy from `.htaccess.backend`)
- [ ] Optional: `node_modules/` (or install via SSH/cPanel)

**Prepare these files:**
```bash
# Create a zip for easy upload
cd backend
zip -r backend-deploy.zip dist/ package.json package-lock.json migrations/
# Upload backend-deploy.zip to cPanel
```

### Frontend Files
- [ ] All files from `build/` folder:
  - [ ] `index.html`
  - [ ] `static/` folder
  - [ ] `favicon.ico`
  - [ ] `logo192.png`
  - [ ] `logo512.png`
  - [ ] `manifest.json`
  - [ ] `robots.txt`
  - [ ] `asset-manifest.json`
- [ ] `.htaccess` file (copy from `.htaccess.frontend`)

**Prepare these files:**
```bash
# Create a zip for easy upload
cd frontend/build
zip -r frontend-deploy.zip *
# Upload frontend-deploy.zip to cPanel
```

---

## 🔐 Configuration Files Ready

### Backend .env File
- [ ] Copy from `.env.production.backend` or create manually
- [ ] Database URL updated with correct port (3306)
- [ ] All URLs are HTTPS
- [ ] No port numbers in URLs
- [ ] Admin credentials set
- [ ] JWT secrets configured

**Quick Check:**
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=mysql://c2668909c_clinique_user:bKM8P}ZPWhH+{)Fg@localhost:3306/c2668909c_clinique_db
FRONTEND_URL=https://cliniquedesjuristes.com
API_URL=https://cliniquedesjuristes.com
BASE_URL=https://cliniquedesjuristes.com
```

### Backend .htaccess File
- [ ] Copy from `.htaccess.backend` in repo
- [ ] PassengerAppRoot path correct
- [ ] PassengerBaseURI is "/api"
- [ ] PassengerNodejs path updated (check Node.js version)
- [ ] All environment variables set
- [ ] CORS headers configured

### Frontend .htaccess File
- [ ] Copy from `.htaccess.frontend` in repo
- [ ] RewriteEngine On
- [ ] API pass-through rule present
- [ ] React Router fallback present
- [ ] CORS headers (optional but recommended)

---

## 🗄️ Database Preparation

### Schema Files Ready
- [ ] All migration files from `backend/migrations/`
- [ ] Files numbered/ordered correctly
- [ ] `001_initial_schema.sql`
- [ ] `002_add_course_relations.sql`
- [ ] `003_add_video_hls.sql`
- [ ] Any other migration files

### Database Access Verified
```bash
# Test connection (if you have SSH)
mysql -u c2668909c_clinique_user -p -h localhost -P 3306 c2668909c_clinique_db
# Enter password: bKM8P}ZPWhH+{)Fg
# Should connect successfully
```

- [ ] Can access phpMyAdmin
- [ ] Can select the database
- [ ] Can run queries
- [ ] User permissions verified

---

## 📚 Documentation Review

### Read These Documents
- [ ] Read CPANEL_DEPLOYMENT_GUIDE.md (at least skimmed)
- [ ] Read QUICK_SETUP_CHECKLIST.md
- [ ] Bookmarked CORS_403_TROUBLESHOOTING.md for reference
- [ ] Reviewed DEPLOYMENT_STRUCTURE_DIAGRAM.md

### Understand Key Concepts
- [ ] Know where frontend files go (public_html/)
- [ ] Know where backend files go (public_html/api/)
- [ ] Understand the two .htaccess files purpose
- [ ] Know how to restart Node.js app
- [ ] Know where to find logs

---

## 🛠️ Tools & Utilities

### File Transfer Method Chosen
- [ ] Option A: cPanel File Manager (web-based)
- [ ] Option B: FTP client installed (FileZilla, WinSCP, etc.)
- [ ] Option C: SSH/SCP access configured

### Backup Plan
- [ ] Can export database if needed
- [ ] Can download files if needed
- [ ] Know how to restore if something goes wrong

### Testing Tools
- [ ] curl installed (for API testing)
- [ ] Modern web browser (Chrome, Firefox, Edge)
- [ ] Browser DevTools knowledge (F12)
- [ ] Incognito/Private mode available

---

## ⏱️ Time Estimation

Estimated time for deployment:

```
Database Setup:           10-15 minutes
Backend Upload:           10-20 minutes (depending on connection)
Backend Configuration:    10-15 minutes
Node.js App Setup:        5-10 minutes
Frontend Upload:          5-10 minutes
Frontend Configuration:   5 minutes
SSL Setup:                5-10 minutes
Testing:                  15-30 minutes
Troubleshooting:          Variable (0-60 minutes)
─────────────────────────────────────
Total Estimated Time:     65-175 minutes (1-3 hours)
```

**Plan accordingly:**
- [ ] Have 2-3 hours available
- [ ] Not during peak business hours
- [ ] Have backup contact (if team deployment)

---

## 📞 Support Contacts

### Have These Ready
- [ ] Hosting provider support contact
- [ ] Hosting provider documentation URL
- [ ] Team members contact (if applicable)
- [ ] This repository URL for reference

### Information to Provide to Support
- [ ] cPanel username: `c2668909c`
- [ ] Domain: `cliniquedesjuristes.com`
- [ ] Node.js version required: 12.0.0+
- [ ] Database name: `c2668909c_clinique_db`

---

## 🚨 Emergency Rollback Plan

### Before You Start
- [ ] Know how to download current site files
- [ ] Know how to export database
- [ ] Have a backup of current state (if site exists)
- [ ] Know how to delete files if needed
- [ ] Know how to disable Node.js app

### If Something Goes Wrong
1. **Don't panic** - most issues are fixable
2. **Check logs** - error_log and application logs
3. **Refer to troubleshooting guide** - CORS_403_TROUBLESHOOTING.md
4. **Revert if necessary** - restore from backup
5. **Ask for help** - provide specific error messages

---

## ✅ Final Pre-Flight Check

### Right Before Deployment
- [ ] All files are built and ready
- [ ] All configuration files prepared
- [ ] Database credentials confirmed
- [ ] cPanel access confirmed
- [ ] Time allocated (2-3 hours)
- [ ] Documentation open and ready
- [ ] Coffee/tea prepared ☕
- [ ] Notifications silenced (focus time)

### Deployment Day Checklist
- [ ] No urgent deadlines today
- [ ] Internet connection stable
- [ ] Computer fully charged/plugged in
- [ ] All required files accessible
- [ ] Browser tabs organized
- [ ] Terminal windows ready

---

## 🎯 Success Criteria

You're ready to deploy when:

✅ Backend builds without errors  
✅ Frontend builds without errors  
✅ All configuration files prepared  
✅ Database credentials verified  
✅ cPanel access confirmed  
✅ Documentation reviewed  
✅ Time allocated  
✅ Backup plan in place  
✅ Support contacts ready  
✅ Feeling confident (or at least ready to try!)  

---

## 🚀 Ready to Deploy?

If all checkboxes above are checked, you're ready!

### Next Steps:
1. Open **QUICK_SETUP_CHECKLIST.md**
2. Follow steps 1-15 carefully
3. Refer to **CPANEL_DEPLOYMENT_GUIDE.md** for detailed explanations
4. Use **CORS_403_TROUBLESHOOTING.md** if you encounter issues

---

## 💡 Pro Tips

### Before Starting
1. **Clear your schedule** - Don't rush
2. **Read first, deploy second** - Understand before doing
3. **One step at a time** - Don't skip ahead
4. **Document as you go** - Note any deviations
5. **Test incrementally** - Verify each component

### During Deployment
1. **Keep calm** - Errors are normal
2. **Read error messages** - They usually tell you what's wrong
3. **Check logs frequently** - They're your best friend
4. **Don't make multiple changes at once** - Change one thing, test, repeat
5. **Use incognito mode** - Avoids cache issues

### After Deployment
1. **Test thoroughly** - Don't assume it works
2. **Monitor logs** - First 24 hours are critical
3. **Document issues** - Help future deployments
4. **Change default passwords** - Security first
5. **Celebrate success** - You earned it! 🎉

---

## 📝 Personal Notes

Use this space for your own notes during deployment:

```
Date of deployment: _______________
Time started: _______________
Time completed: _______________

Issues encountered:
1. ________________________________
2. ________________________________
3. ________________________________

Solutions applied:
1. ________________________________
2. ________________________________
3. ________________________________

What went well:
________________________________
________________________________

What to improve next time:
________________________________
________________________________
```

---

**Good luck with your deployment!** 🚀

You've got this! Follow the guides, take your time, and don't hesitate to refer back to the documentation.

---

**Checklist Version:** 1.0  
**Last Updated:** 2024  
**Repository:** Medsaidabidi02/cliniquedesjuristes
