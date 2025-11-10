# 📊 cPanel Deployment Structure Diagram

## Overview

This document provides a visual representation of how the application is structured on cPanel.

---

## 🏗 Server Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    cliniquedesjuristes.com                       │
│                         (SSL/HTTPS)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Apache Web Server                           │
│                    (with mod_rewrite)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
                    ▼                    ▼
        ┌───────────────────┐  ┌──────────────────────┐
        │   Frontend Path   │  │   Backend Path       │
        │        /          │  │      /api/*          │
        └───────────────────┘  └──────────────────────┘
                    │                    │
                    ▼                    ▼
        ┌───────────────────┐  ┌──────────────────────┐
        │  React App        │  │  Node.js App         │
        │  (Static Files)   │  │  (via Passenger)     │
        │  public_html/     │  │  public_html/api/    │
        └───────────────────┘  └──────────────────────┘
                                         │
                                         ▼
                            ┌──────────────────────┐
                            │   MySQL Database     │
                            │   Port 3306          │
                            └──────────────────────┘
```

---

## 📁 Directory Structure on Server

```
/home/c2668909c/
│
├── 📂 public_html/                    ← Root web directory
│   │
│   ├── 📄 index.html                  ← React entry point
│   ├── 📄 .htaccess                   ← Frontend routing config
│   ├── 📄 favicon.ico
│   ├── 📄 logo192.png
│   ├── 📄 logo512.png
│   ├── 📄 manifest.json
│   ├── 📄 robots.txt
│   ├── 📄 asset-manifest.json
│   │
│   ├── 📂 static/                     ← React compiled assets
│   │   ├── 📂 css/
│   │   │   └── 📄 main.*.css
│   │   ├── 📂 js/
│   │   │   ├── 📄 main.*.js
│   │   │   └── 📄 *.chunk.js
│   │   └── 📂 media/
│   │       └── 📄 (images, fonts)
│   │
│   └── 📂 api/                        ← Backend API directory
│       ├── 📄 .htaccess               ← Backend config (CORS, Passenger)
│       ├── 📄 .env                    ← Environment variables
│       ├── 📄 package.json
│       ├── 📄 package-lock.json
│       │
│       ├── 📂 dist/                   ← Compiled TypeScript
│       │   ├── 📄 server.js           ← Main entry point
│       │   ├── 📄 app.js
│       │   ├── 📂 config/
│       │   ├── 📂 routes/
│       │   ├── 📂 services/
│       │   └── 📂 middleware/
│       │
│       ├── 📂 node_modules/           ← Dependencies
│       │   └── (npm packages)
│       │
│       ├── 📂 migrations/             ← Database schemas
│       │   ├── 📄 001_initial_schema.sql
│       │   ├── 📄 002_add_course_relations.sql
│       │   └── 📄 003_add_video_hls.sql
│       │
│       └── 📂 uploads/                ← File uploads (if not using Hetzner)
│           └── (uploaded files)
│
├── 📂 nodevenv/                       ← Node.js virtual environment
│   └── 📂 public_html/                  (auto-created by cPanel)
│       └── 📂 api/
│           └── 📂 18/                 ← Node.js version
│               └── 📂 bin/
│                   └── 📄 node        ← Node.js binary
│
├── 📂 logs/                           ← Server logs
│   ├── 📄 access_log                  ← HTTP access logs
│   └── 📄 error_log                   ← Error logs
│
└── 📂 tmp/                            ← Temporary files
    └── 📄 restart.txt                 ← Touch to restart app
```

---

## 🔄 Request Flow

### Frontend Request (e.g., https://cliniquedesjuristes.com/courses)

```
1. Browser requests: https://cliniquedesjuristes.com/courses
                              ↓
2. Apache receives request (port 443)
                              ↓
3. Checks public_html/.htaccess
                              ↓
4. Path doesn't match /api/* pattern
                              ↓
5. Path doesn't match existing file/directory
                              ↓
6. Rewrites to: /index.html
                              ↓
7. Serves: public_html/index.html (React app)
                              ↓
8. Browser loads React
                              ↓
9. React Router handles /courses route
                              ↓
10. Page renders client-side
```

### Backend API Request (e.g., https://cliniquedesjuristes.com/api/health)

```
1. Browser/Frontend requests: https://cliniquedesjuristes.com/api/health
                              ↓
2. Apache receives request (port 443)
                              ↓
3. Checks public_html/.htaccess
                              ↓
4. Path matches /api/* pattern → passes through
                              ↓
5. Checks public_html/api/.htaccess
                              ↓
6. Passenger sees PassengerEnabled on
                              ↓
7. Routes to Node.js app: dist/server.js
                              ↓
8. Express handles /api/health route
                              ↓
9. Returns JSON response with CORS headers
                              ↓
10. Apache adds additional CORS headers from .htaccess
                              ↓
11. Response sent to browser
```

---

## 🔐 CORS Headers Flow

### How CORS Headers Are Added

```
Frontend Request to Backend API
                ↓
┌────────────────────────────────────────┐
│  Browser sends preflight OPTIONS       │
│  Origin: https://cliniquedesjuristes.com│
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│  Apache .htaccess (public_html/api/)   │
│  Adds CORS headers:                    │
│  - Access-Control-Allow-Origin         │
│  - Access-Control-Allow-Methods        │
│  - Access-Control-Allow-Headers        │
│  - Access-Control-Allow-Credentials    │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│  Node.js Express CORS middleware       │
│  Validates origin and adds headers     │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│  Response sent with all CORS headers   │
│  Status: 204 (for OPTIONS)             │
│  Status: 200 (for actual request)      │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│  Browser validates CORS headers        │
│  Allows request if headers match       │
└────────────────────────────────────────┘
```

---

## 🗄️ Database Connection

```
Node.js Application
       ↓
DATABASE_URL from .env
mysql://c2668909c_clinique_user:password@localhost:3306/c2668909c_clinique_db
       ↓
┌──────────────────────┐
│  MySQL Connection    │
│  Host: localhost     │
│  Port: 3306          │
│  User: c2668909c_... │
└──────────────────────┘
       ↓
┌──────────────────────┐
│  Database:           │
│  c2668909c_clinique_db│
│                      │
│  Tables:             │
│  - users             │
│  - courses           │
│  - videos            │
│  - subjects          │
│  - blog_posts        │
│  - etc.              │
└──────────────────────┘
```

---

## 🚦 Routing Logic

### Frontend .htaccess Logic

```apache
Request comes in
    │
    ├─ Is it /api/* ?
    │   ├─ YES → Pass through to backend (don't rewrite)
    │   └─ NO → Continue
    │
    ├─ Does file exist?
    │   ├─ YES → Serve file directly
    │   └─ NO → Continue
    │
    ├─ Does directory exist?
    │   ├─ YES → Serve directory
    │   └─ NO → Continue
    │
    └─ Rewrite to /index.html (React Router handles it)
```

### Backend .htaccess Logic

```apache
Request comes in to /api/*
    │
    ├─ Is Passenger enabled?
    │   └─ YES → Route to Node.js
    │
    ├─ Which file to start?
    │   └─ PassengerStartupFile: dist/server.js
    │
    ├─ Which Node binary?
    │   └─ PassengerNodejs: /home/.../nodevenv/.../bin/node
    │
    ├─ Add CORS headers from mod_headers
    │
    └─ Pass request to Node.js Express app
```

---

## 🔑 Environment Variables Loading

### Priority Order (highest to lowest)

```
1. .htaccess SetEnv directives
       ↓
2. cPanel Node.js App Environment Variables
       ↓
3. .env file in application directory
       ↓
4. Default values in code
```

**Note:** `.htaccess` variables take precedence, so they override `.env` values.

---

## 📊 File Size Limits

```
┌─────────────────────────────────────────┐
│  Upload Size Limits (5GB configured)    │
├─────────────────────────────────────────┤
│  1. .htaccess LimitRequestBody          │
│     → 5368709120 bytes (5GB)            │
├─────────────────────────────────────────┤
│  2. Express body-parser limit           │
│     → { limit: '5gb' }                  │
├─────────────────────────────────────────┤
│  3. Environment MAX_FILE_SIZE           │
│     → 5120 MB (used in validation)      │
└─────────────────────────────────────────┘
```

---

## 🔄 Application Restart Methods

### Method 1: cPanel Interface
```
cPanel → Setup Node.js App → Click "Restart"
```

### Method 2: Touch restart.txt
```bash
touch /home/c2668909c/public_html/api/tmp/restart.txt
```

### Method 3: Restart Apache (if needed)
```
Contact hosting support
```

---

## 🌐 URL Mapping

```
Frontend URLs:
┌──────────────────────────────────────────────────────────┐
│ https://cliniquedesjuristes.com/          → React Home   │
│ https://cliniquedesjuristes.com/login     → React Login  │
│ https://cliniquedesjuristes.com/courses   → React Courses│
│ https://cliniquedesjuristes.com/about     → React About  │
│ (All handled by React Router)                            │
└──────────────────────────────────────────────────────────┘

Backend API URLs:
┌──────────────────────────────────────────────────────────┐
│ https://cliniquedesjuristes.com/api/health     → GET     │
│ https://cliniquedesjuristes.com/api/auth/login → POST    │
│ https://cliniquedesjuristes.com/api/courses    → GET     │
│ https://cliniquedesjuristes.com/api/videos     → GET     │
│ (All handled by Express routes)                          │
└──────────────────────────────────────────────────────────┘
```

---

## 📝 Key Configuration Files

```
┌─────────────────────────────────────────────────────────────┐
│ File                          Purpose                       │
├─────────────────────────────────────────────────────────────┤
│ public_html/.htaccess         Frontend routing, React Router│
│ public_html/api/.htaccess     Backend Passenger, CORS       │
│ public_html/api/.env          Environment variables         │
│ public_html/index.html        React app entry point         │
│ public_html/api/dist/server.js Node.js app entry point     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Monitoring & Logs

```
Log Files:
┌──────────────────────────────────────────────────────────────┐
│ /home/c2668909c/logs/error_log                               │
│   - Apache errors                                            │
│   - 403, 404, 500 errors                                     │
│   - .htaccess errors                                         │
├──────────────────────────────────────────────────────────────┤
│ /home/c2668909c/logs/access_log                              │
│   - All HTTP requests                                        │
│   - Status codes                                             │
│   - Response times                                           │
├──────────────────────────────────────────────────────────────┤
│ cPanel → Node.js App → View Logs                             │
│   - Node.js console.log output                               │
│   - Application errors                                       │
│   - Database connection logs                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Summary

### What Goes Where

```
┌───────────────────────┬──────────────────────────────────────┐
│ Component             │ Location                             │
├───────────────────────┼──────────────────────────────────────┤
│ React Build Files     │ public_html/                         │
│ Frontend .htaccess    │ public_html/.htaccess                │
│ Backend Code          │ public_html/api/dist/                │
│ Backend .htaccess     │ public_html/api/.htaccess            │
│ Backend .env          │ public_html/api/.env                 │
│ Node.js Binary        │ nodevenv/public_html/api/18/bin/node │
│ Database              │ MySQL on localhost:3306              │
│ Logs                  │ logs/                                │
└───────────────────────┴──────────────────────────────────────┘
```

---

**This diagram should help you understand how everything connects on cPanel!**
