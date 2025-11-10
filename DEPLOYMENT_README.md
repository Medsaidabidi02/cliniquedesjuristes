# 📚 cPanel Deployment Documentation

This directory contains all the files and guides needed to deploy the Clinique des Juristes application on cPanel hosting.

## 📖 Documentation Files

### Main Guides

1. **[CPANEL_DEPLOYMENT_GUIDE.md](CPANEL_DEPLOYMENT_GUIDE.md)** ⭐ START HERE
   - Complete step-by-step deployment guide
   - Detailed instructions for every component
   - Database setup, backend setup, frontend setup
   - Troubleshooting for common issues
   - **READ THIS FIRST for full deployment**

2. **[QUICK_SETUP_CHECKLIST.md](QUICK_SETUP_CHECKLIST.md)** 
   - Quick reference checklist format
   - 15 numbered steps to deploy
   - Perfect for second deployment or quick reference
   - All credentials in one place

3. **[CORS_403_TROUBLESHOOTING.md](CORS_403_TROUBLESHOOTING.md)** 🔧
   - Specific guide for CORS and 403 Forbidden errors
   - Step-by-step debugging process
   - Common scenarios and solutions
   - Testing procedures
   - **USE THIS if you get CORS or 403 errors**

### Configuration Files

4. **[.htaccess.frontend](.htaccess.frontend)**
   - Apache configuration for React frontend
   - Goes in: `/home/c2668909c/public_html/.htaccess`
   - Handles React Router routing
   - Prevents API redirect to React

5. **[.htaccess.backend](.htaccess.backend)** OR **[htaccess](htaccess)**
   - Apache/Passenger configuration for Node.js backend
   - Goes in: `/home/c2668909c/public_html/api/.htaccess`
   - Includes CORS headers
   - Environment variables
   - Passenger configuration

## 🚀 Quick Start

### For First-Time Deployment:
```
1. Read: CPANEL_DEPLOYMENT_GUIDE.md (full guide)
2. Follow: QUICK_SETUP_CHECKLIST.md (step-by-step)
3. Use: .htaccess.frontend and .htaccess.backend files
4. If issues: CORS_403_TROUBLESHOOTING.md
```

### For CORS/403 Issues:
```
1. Read: CORS_403_TROUBLESHOOTING.md
2. Verify: Both .htaccess files are correct
3. Test: Using provided curl commands
4. Fix: Follow the solutions in the guide
```

## 📁 File Structure After Deployment

```
/home/c2668909c/
├── public_html/                          # Root directory
│   ├── index.html                        # React frontend
│   ├── static/                           # React assets
│   ├── .htaccess                         # Frontend .htaccess
│   │
│   └── api/                              # Backend API
│       ├── dist/                         # Compiled backend
│       │   └── server.js
│       ├── node_modules/
│       ├── migrations/
│       ├── uploads/
│       ├── package.json
│       ├── .env                          # Backend environment
│       └── .htaccess                     # Backend .htaccess
│
└── nodevenv/                             # Node.js environment (auto-created)
    └── public_html/api/18/bin/node
```

## 🔑 Important Credentials

All credentials are documented in the guides, but here's a quick reference:

### Database
```
User:     c2668909c_clinique_user
Password: bKM8P}ZPWhH+{)Fg
Database: c2668909c_clinique_db
Host:     localhost
Port:     3306
```

### Admin Access
```
Email:    admin@cliniquedesjuristes.com
Password: admin123
```

### Domain
```
Main:     https://cliniquedesjuristes.com
API:      https://cliniquedesjuristes.com/api
```

## ✅ Deployment Checklist

- [ ] Read CPANEL_DEPLOYMENT_GUIDE.md
- [ ] Build backend locally (`npm run build`)
- [ ] Build frontend locally (`npm run build:prod`)
- [ ] Setup database in cPanel
- [ ] Import database migrations
- [ ] Upload backend files to `public_html/api/`
- [ ] Create backend `.env` file
- [ ] Create backend `.htaccess` file
- [ ] Setup Node.js app in cPanel
- [ ] Install backend dependencies
- [ ] Upload frontend files to `public_html/`
- [ ] Create frontend `.htaccess` file
- [ ] Setup SSL certificate
- [ ] Test API endpoint
- [ ] Test frontend
- [ ] Test login functionality
- [ ] Verify no CORS errors

## 🔧 Common Issues

### 403 Forbidden Error
→ See: CORS_403_TROUBLESHOOTING.md

### API Returns 404
→ Check: Node.js app is running in cPanel  
→ Verify: PassengerBaseURI is "/api" in backend .htaccess

### Database Connection Failed
→ Check: Port is 3306 (not 3307)  
→ Verify: Credentials in .env match database

### Frontend Blank Page
→ Check: index.html exists in public_html root  
→ Verify: Frontend .htaccess exists  
→ Review: Browser console for errors

### Node.js App Won't Start
→ Check: dist/server.js exists  
→ Verify: Dependencies installed  
→ Review: Application logs in cPanel

## 📞 Getting Help

### Before Asking for Help:

1. **Check Documentation:**
   - Read CPANEL_DEPLOYMENT_GUIDE.md thoroughly
   - Review CORS_403_TROUBLESHOOTING.md if applicable
   - Check QUICK_SETUP_CHECKLIST.md for missed steps

2. **Check Logs:**
   - cPanel Error Log: `/home/c2668909c/logs/error_log`
   - Node.js App Logs: cPanel → Setup Node.js App → View Logs
   - Browser Console: F12 → Console tab
   - Browser Network: F12 → Network tab

3. **Verify Configuration:**
   - Both .htaccess files uploaded correctly
   - All environment variables set
   - Node.js app is running
   - Database credentials correct

4. **Test Components:**
   ```bash
   # Test backend
   curl https://cliniquedesjuristes.com/api/health
   
   # Test CORS
   curl -H "Origin: https://cliniquedesjuristes.com" \
        -X OPTIONS \
        https://cliniquedesjuristes.com/api/health
   ```

### What to Include When Reporting Issues:

- [ ] Exact error message (from console or logs)
- [ ] Steps to reproduce the problem
- [ ] What you've already tried
- [ ] Relevant log entries
- [ ] Browser and version (if frontend issue)
- [ ] Screenshots of error (if helpful)

## 🔒 Security Reminders

After deployment:

1. **Change Default Passwords:**
   - Admin password (currently: admin123)
   - Database password if using default

2. **Update Secrets:**
   - Generate new JWT_SECRET
   - Generate new VIDEO_SECRET

3. **Review Permissions:**
   - Database user should have minimal required privileges
   - File permissions should be 755 for directories, 644 for files

4. **Enable Security Features:**
   - HTTPS only (disable HTTP)
   - Regular backups
   - Monitor logs for suspicious activity

5. **Keep Updated:**
   - Update Node.js version regularly
   - Update npm packages
   - Monitor security advisories

## 📊 Performance Optimization

### After Successful Deployment:

1. **Enable Caching:**
   - Already configured in .htaccess files
   - Verify browser caching works

2. **Monitor Resources:**
   - Check cPanel → Resource Usage
   - Monitor Node.js memory usage
   - Watch database performance

3. **Optimize Database:**
   - Add indexes for frequently queried fields
   - Regular maintenance and optimization

4. **Content Delivery:**
   - Consider CDN for static assets
   - Use Hetzner for video storage (already configured)

## 🎯 Success Criteria

Your deployment is successful when:

✅ Frontend loads at https://cliniquedesjuristes.com  
✅ API responds at https://cliniquedesjuristes.com/api/health  
✅ Can login with admin credentials  
✅ No CORS errors in browser console  
✅ No 403 Forbidden errors  
✅ API calls work from frontend  
✅ Database queries execute successfully  
✅ HTTPS is enabled and working  

## 📚 Additional Resources

### In This Repository:
- `backend/.env` - Backend environment template
- `frontend/.env` - Frontend environment template
- `backend/migrations/` - Database schema migrations
- `backend/package.json` - Backend dependencies
- `frontend/package.json` - Frontend dependencies

### External Resources:
- cPanel Documentation: https://docs.cpanel.net/
- Node.js Documentation: https://nodejs.org/docs/
- Passenger Documentation: https://www.phusionpassenger.com/docs/
- Apache mod_rewrite: https://httpd.apache.org/docs/current/mod/mod_rewrite.html

## 🔄 Updates and Maintenance

### Updating the Application:

1. **Backend Updates:**
   ```bash
   cd backend
   npm install    # Update dependencies
   npm run build  # Rebuild
   # Upload new dist/ folder to cPanel
   # Restart Node.js app in cPanel
   ```

2. **Frontend Updates:**
   ```bash
   cd frontend
   npm install                # Update dependencies
   npm run build:prod         # Rebuild
   # Upload new build/ contents to public_html/
   ```

3. **Database Updates:**
   - Create new migration file
   - Upload to server
   - Run via phpMyAdmin or SSH

### Backup Before Updates:
- Download current files
- Export database
- Document current configuration

## 📝 Notes

- All passwords and secrets in this documentation should be changed after first deployment
- The guides assume cPanel with Node.js support via Passenger
- Paths are specific to the user `c2668909c` - adjust for your account
- Port 3306 is standard for cPanel MySQL (not 3307 which is local development)

---

## 📄 Document Information

**Repository:** Medsaidabidi02/cliniquedesjuristes  
**Version:** 1.0  
**Last Updated:** 2024  
**Purpose:** Complete cPanel deployment documentation

---

## 🎉 Ready to Deploy?

Start with: **[CPANEL_DEPLOYMENT_GUIDE.md](CPANEL_DEPLOYMENT_GUIDE.md)**

Good luck! 🚀
