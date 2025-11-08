# Clinique des Juristes - cPanel Deployment

A complete legal education platform with React frontend and Node.js backend, optimized for cPanel hosting.

## 🚀 Quick Start

For cPanel deployment, follow these steps:

### 1. Prepare Deployment Files

Run the preparation script on your local machine:

```bash
chmod +x prepare-deployment.sh
./prepare-deployment.sh
```

This will:
- Build the frontend for production
- Compile the backend TypeScript
- Create a deployment package with all necessary files

### 2. Configure for Your Server

Before uploading, edit these files in `cpanel-deployment/`:

**backend/.env:**
- Update `DATABASE_URL` with your cPanel database credentials
- Update all domain URLs from `cliniquedesjuristes.com` to your domain
- Update `c2668909c` with your cPanel username prefix

**.htaccess:**
- Update `c2668909c` with your cPanel username
- Update `cliniquedesjuristes.com` with your domain
- Update database credentials in `SetEnv DATABASE_URL`

### 3. Upload to cPanel

Upload files via File Manager or FTP:
- `backend/*` → `/public_html/backend/`
- `frontend-files/*` → `/public_html/`
- `.htaccess` → `/public_html/`

### 4. Setup via SSH

```bash
# Connect to your server
ssh your_username@yourdomain.com

# Navigate to backend
cd public_html/backend

# Activate Node.js environment
source /home/your_username/nodevenv/backend/18/bin/activate

# Install dependencies
npm install --production

# Run database migrations
node run-all-migrations.js

# Restart application
touch tmp/restart.txt
```

### 5. Verify Deployment

```bash
# Test API
curl https://yourdomain.com/api/health

# Expected response:
# {"status":"OK","message":"Clinique des Juristes API is running",...}
```

Visit your domain in a browser and test login with:
- Email: `admin@cliniquedesjuristes.com`
- Password: `admin123`

**Important:** Change the admin password after first login!

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete step-by-step deployment instructions
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Checklist to ensure nothing is missed

## 🏗️ Architecture

### Frontend
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **i18n:** React-i18next (Arabic, French, English)
- **Build:** Create React App

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MySQL 5.7+ (via mysql2)
- **Authentication:** JWT tokens
- **Server:** Phusion Passenger (via cPanel)

### Database
- **DBMS:** MySQL
- **ORM:** None (raw queries via mysql2)
- **Migrations:** SQL files in `backend/migrations/`

## 📁 Project Structure

```
.
├── frontend/                 # React frontend
│   ├── src/
│   ├── public/
│   ├── build/               # Production build output
│   └── package.json
│
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── server.ts       # Entry point
│   │   ├── app.ts          # Express app configuration
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── config/         # Configuration
│   ├── migrations/         # Database migrations
│   ├── dist/              # Compiled JavaScript
│   └── package.json
│
├── .htaccess              # Apache/Passenger configuration
├── DEPLOYMENT_GUIDE.md    # Complete deployment guide
├── DEPLOYMENT_CHECKLIST.md
└── prepare-deployment.sh  # Deployment preparation script
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=mysql://user:pass@localhost:3306/dbname
JWT_SECRET=your-secret-key
FRONTEND_URL=https://yourdomain.com
API_URL=https://yourdomain.com
```

**Frontend (.env):**
```env
REACT_APP_API_URL=https://yourdomain.com
REACT_APP_APP_NAME=Clinique Des Juristes
REACT_APP_ENVIRONMENT=production
```

### cPanel Requirements

- **Node.js:** 18+ (via cPanel Node.js selector)
- **MySQL:** 5.7+ or 8.0
- **PHP:** Not required (backend is Node.js)
- **SSL:** Recommended (HTTPS)
- **SSH Access:** Required for initial setup

## 🐛 Troubleshooting

### Cannot connect to localhost:5001

**Cause:** Application trying to use development configuration

**Solution:**
1. Verify `NODE_ENV=production` in backend/.env
2. Check .htaccess PassengerAppRoot path is correct
3. Restart application: `touch backend/tmp/restart.txt`

### Request Timeout

**Cause:** Application not starting or misconfigured

**Solution:**
1. Check Passenger logs: `tail -f ~/logs/passenger.log`
2. Verify Node.js dependencies: `cd backend && npm install --production`
3. Check database connection in .env

### Database Connection Failed

**Cause:** Incorrect database credentials or port

**Solution:**
1. Verify DATABASE_URL in backend/.env
2. Ensure port is 3306 (not 3307)
3. Test connection: `mysql -u username -p database_name`

### 404 on Frontend Routes

**Cause:** .htaccess not configured correctly

**Solution:**
1. Verify .htaccess is in public_html/
2. Check RewriteEngine and RewriteRules
3. Ensure frontend build files are in public_html/

## 🔐 Security

### Before Going Live

- [ ] Change default admin password
- [ ] Use strong database password
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set secure JWT_SECRET
- [ ] Review file permissions (644 for files, 755 for dirs)
- [ ] Enable rate limiting in production
- [ ] Setup regular database backups

### File Permissions

```bash
# Set correct permissions
chmod 644 .htaccess
chmod 644 backend/.env
chmod 755 backend/
chmod 755 public_html/
```

## 📊 Database Migrations

Migrations are SQL files in `backend/migrations/`. Run them with:

```bash
cd /home/username/public_html/backend
node run-all-migrations.js
```

This will:
- Create a migrations tracking table
- Run all pending migrations
- Skip already-executed migrations
- Show summary of results

## 🔄 Updating the Application

### Update Frontend

```bash
# Local machine
cd frontend
npm run build:prod

# Upload frontend/build/* to public_html/
# No restart needed
```

### Update Backend

```bash
# Local machine
cd backend
npm run build

# Upload backend/dist/* to public_html/backend/dist/

# On server via SSH
touch /home/username/public_html/backend/tmp/restart.txt
```

### New Database Migration

```bash
# Upload new .sql file to backend/migrations/

# On server via SSH
cd /home/username/public_html/backend
node run-all-migrations.js
touch tmp/restart.txt
```

## 📞 Support

### Useful Commands

```bash
# Check Node.js version
node --version

# Check application status
curl https://yourdomain.com/api/health

# View logs
tail -f ~/logs/passenger.log

# Restart application
touch ~/public_html/backend/tmp/restart.txt

# Database backup
mysqldump -u username -p database_name > backup.sql
```

### Log Files

- **Passenger:** `~/logs/passenger.log`
- **cPanel Error:** `~/public_html/error_log`
- **Apache:** Check cPanel Error Log section

## 🎯 Features

- **User Management:** Registration, authentication, roles
- **Course System:** Subjects, courses, videos
- **Video Streaming:** HLS support with Hetzner integration
- **Blog:** Content management system
- **Multilingual:** Arabic, French, English
- **Admin Panel:** User approval, content management
- **Session Management:** Single-device login enforcement
- **File Upload:** Chunked upload for large files

## 📝 License

Copyright © 2025 Clinique des Juristes

## 🙏 Acknowledgments

- Built with React and Express.js
- Deployed on cPanel with Phusion Passenger
- Database powered by MySQL

---

**For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

**Use the [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) to ensure successful deployment**
