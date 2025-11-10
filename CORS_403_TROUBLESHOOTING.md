# 🔧 CORS & 403 Error Troubleshooting Guide

## Understanding the Problem

### What is CORS?
CORS (Cross-Origin Resource Sharing) is a security feature that prevents web pages from making requests to a different domain than the one serving the page. When your frontend (https://cliniquedesjuristes.com) tries to call your backend API (https://cliniquedesjuristes.com/api), the browser checks if the backend allows this.

### Why 403 Forbidden Happens
A 403 error in the context of CORS typically means:
1. ❌ Backend is not sending proper CORS headers
2. ❌ Backend is rejecting the origin (your domain)
3. ❌ Preflight OPTIONS requests are failing
4. ❌ `.htaccess` is blocking the request

---

## 🔍 Diagnosis Steps

### Step 1: Check Browser Console
1. Open your site: `https://cliniquedesjuristes.com`
2. Open DevTools (Press F12)
3. Click on **Console** tab
4. Try to trigger an API call (e.g., login)
5. Look for errors like:
   - `Access to fetch at '...' has been blocked by CORS policy`
   - `No 'Access-Control-Allow-Origin' header is present`
   - `403 Forbidden`

### Step 2: Check Network Tab
1. In DevTools, click **Network** tab
2. Try the API call again
3. Look for failed requests (shown in red)
4. Click on a failed request
5. Check **Headers** section:
   - Look for `Access-Control-Allow-Origin` in Response Headers
   - Check if it matches your domain

### Step 3: Test API Directly
```bash
# Test basic endpoint
curl -v https://cliniquedesjuristes.com/api/health

# Test with CORS headers
curl -H "Origin: https://cliniquedesjuristes.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -v https://cliniquedesjuristes.com/api/health
```

**What to look for:**
- Response should be 200 or 204
- Should include header: `Access-Control-Allow-Origin: https://cliniquedesjuristes.com`
- Should include header: `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`

---

## ✅ Solution 1: Fix Backend .htaccess

### Current Location
`/home/c2668909c/public_html/api/.htaccess`

### Required CORS Headers
Ensure your backend `.htaccess` includes:

```apache
<IfModule mod_headers.c>
    # Allow requests from your domain
    Header always set Access-Control-Allow-Origin "https://cliniquedesjuristes.com"
    
    # Allow these HTTP methods
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    
    # Allow these request headers
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, Accept, X-Requested-With, X-Session-Token"
    
    # Allow credentials (cookies, authorization headers)
    Header always set Access-Control-Allow-Credentials "true"
    
    # Expose custom response headers to frontend
    Header always set Access-Control-Expose-Headers "Content-Range, X-Total-Count"
    
    # Handle preflight OPTIONS requests
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=204,L]
</IfModule>
```

### Common Mistakes to Avoid
❌ **Wrong:** `Header set Access-Control-Allow-Origin "*"`  
✅ **Right:** `Header always set Access-Control-Allow-Origin "https://cliniquedesjuristes.com"`

❌ **Wrong:** Missing `Header always` (use `always` not just `set`)  
✅ **Right:** `Header always set ...`

❌ **Wrong:** Including port in origin: `"https://cliniquedesjuristes.com:3000"`  
✅ **Right:** No port: `"https://cliniquedesjuristes.com"`

---

## ✅ Solution 2: Fix Backend Code (app.ts)

### Current Location
`backend/src/app.ts` (already correct in your repo)

### Verify CORS Configuration
```typescript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://cliniquedesjuristes.com',
      'https://www.cliniquedesjuristes.com'  // if you use www
    ]
  : ['http://localhost:3000', 'http://localhost:5001'];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin as string) !== -1) {
      return callback(null, true);
    }
    
    // Development fallback
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Session-Token'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
```

**If this is wrong or missing, you MUST rebuild and redeploy:**
```bash
cd backend
npm run build
# Re-upload dist/ folder to cPanel
```

---

## ✅ Solution 3: Fix Environment Variables

### Check NODE_ENV
The backend MUST know it's in production to use the correct CORS origins.

**In backend .env:**
```env
NODE_ENV=production
```

**In backend .htaccess:**
```apache
SetEnv NODE_ENV production
```

**Verify in cPanel:**
1. Go to Setup Node.js App
2. Check Environment Variables section
3. Ensure `NODE_ENV=production` is set

### Check URL Configuration
All URLs must match exactly (HTTPS, no ports):

**Backend .env:**
```env
FRONTEND_URL=https://cliniquedesjuristes.com
API_URL=https://cliniquedesjuristes.com
BASE_URL=https://cliniquedesjuristes.com
```

**Frontend .env (before build):**
```env
REACT_APP_API_URL=https://cliniquedesjuristes.com
```

❌ **Wrong:** `http://` or including `/api` or `:3000`  
✅ **Right:** Just the base domain with HTTPS

---

## ✅ Solution 4: Fix Frontend .htaccess

### Current Location
`/home/c2668909c/public_html/.htaccess`

### Required Configuration
```apache
# Enable Rewrite Engine
RewriteEngine On

# CRITICAL: Don't redirect API calls
RewriteCond %{REQUEST_URI} ^/api/ [NC]
RewriteRule ^api/(.*)$ /api/$1 [L,QSA]

# React Router fallback
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule . /index.html [L]

# CORS Headers
<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "https://cliniquedesjuristes.com"
    Header always set Access-Control-Allow-Credentials "true"
</IfModule>
```

**This ensures:**
- API requests are NOT redirected to React
- Frontend can communicate with backend
- CORS headers are set at Apache level

---

## ✅ Solution 5: Restart Everything

After making ANY changes:

### 1. Restart Node.js App
- Go to cPanel → Setup Node.js App
- Click **Restart**
- Wait for status to show "Running"

### 2. Clear Browser Cache
```
Chrome/Edge: Ctrl+Shift+Delete → Clear cache
Firefox: Ctrl+Shift+Delete → Clear cache
Safari: Cmd+Option+E
```

### 3. Test in Incognito/Private Mode
- This ensures no cached data interferes
- Open incognito window
- Navigate to your site
- Try API call again

---

## 🧪 Testing CORS Step-by-Step

### Test 1: OPTIONS Preflight Request
```bash
curl -X OPTIONS https://cliniquedesjuristes.com/api/health \
  -H "Origin: https://cliniquedesjuristes.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected Response:**
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://cliniquedesjuristes.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With, X-Session-Token
Access-Control-Allow-Credentials: true
```

### Test 2: Actual GET Request
```bash
curl -X GET https://cliniquedesjuristes.com/api/health \
  -H "Origin: https://cliniquedesjuristes.com" \
  -v
```

**Expected Response:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://cliniquedesjuristes.com
Access-Control-Allow-Credentials: true
Content-Type: application/json

{"status":"OK","message":"Clinique des Juristes API is running",...}
```

### Test 3: POST Request with Auth
```bash
curl -X POST https://cliniquedesjuristes.com/api/auth/login \
  -H "Origin: https://cliniquedesjuristes.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cliniquedesjuristes.com","password":"admin123"}' \
  -v
```

**Expected:**
- 200 OK response
- CORS headers present
- JSON response with token

---

## 🔍 Debugging Checklist

### Backend Checks
- [ ] `.htaccess` exists in `/home/c2668909c/public_html/api/`
- [ ] CORS headers are in `.htaccess` (mod_headers section)
- [ ] `NODE_ENV=production` in `.env` and `.htaccess`
- [ ] All URLs are HTTPS without ports
- [ ] Node.js app is running in cPanel
- [ ] `dist/server.js` exists and is up-to-date
- [ ] Backend code has CORS middleware (app.ts)

### Frontend Checks
- [ ] `.htaccess` exists in `/home/c2668909c/public_html/`
- [ ] API requests are NOT redirected to React
- [ ] `REACT_APP_API_URL=https://cliniquedesjuristes.com` (no /api)
- [ ] Frontend build is current
- [ ] No hardcoded localhost URLs in code

### Environment Checks
- [ ] SSL certificate is active (HTTPS works)
- [ ] No mixed content (HTTP/HTTPS mixing)
- [ ] Apache mod_headers is enabled (ask host if unsure)
- [ ] Firewall/security rules allow API traffic
- [ ] cPanel application logs show no errors

### Browser Checks
- [ ] Tested in incognito/private mode
- [ ] Cache cleared
- [ ] Console shows no CORS errors
- [ ] Network tab shows 200 responses (not 403)
- [ ] Request headers include `Origin`
- [ ] Response headers include `Access-Control-Allow-Origin`

---

## 🚨 Still Not Working?

### Step-by-Step Debug Process

#### 1. Verify Backend is Running
```bash
curl https://cliniquedesjuristes.com/api/health
```
If this fails → Backend is not running or not accessible

#### 2. Check if mod_headers is Enabled
Contact your hosting provider or check:
```bash
# Via SSH (if available)
apache2ctl -M | grep headers
```
Should show: `headers_module (shared)`

If not enabled → Contact hosting support to enable mod_headers

#### 3. Check Error Logs
```bash
# Via cPanel File Manager or SSH
tail -100 /home/c2668909c/logs/error_log
```
Look for:
- CORS-related errors
- Node.js errors
- Apache errors
- Database errors

#### 4. Test Without Browser
```bash
# If this works but browser doesn't, it's definitely CORS
curl -X POST https://cliniquedesjuristes.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cliniquedesjuristes.com","password":"admin123"}'
```

#### 5. Enable Debug Mode Temporarily
In `backend/src/app.ts`, temporarily add:
```typescript
app.use((req, res, next) => {
  console.log('Request Origin:', req.headers.origin);
  console.log('Request Method:', req.method);
  console.log('Request Path:', req.path);
  next();
});
```
Then check application logs to see what's being received

---

## 💡 Common Scenarios & Solutions

### Scenario 1: Works with curl, fails in browser
**Cause:** CORS issue  
**Solution:** Check browser console, fix CORS headers in .htaccess

### Scenario 2: Works in dev, fails in production
**Cause:** Environment mismatch  
**Solution:** 
- Verify `NODE_ENV=production`
- Check allowed origins include production domain
- Rebuild frontend with production API URL

### Scenario 3: OPTIONS request fails with 403
**Cause:** Preflight request not handled  
**Solution:** Add to backend .htaccess:
```apache
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=204,L]
```

### Scenario 4: POST/PUT works, GET fails (or vice versa)
**Cause:** Method not in allowed list  
**Solution:** Verify all methods in headers:
```apache
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH"
```

### Scenario 5: CORS works but still 403
**Cause:** Authentication/permission issue (not CORS)  
**Solution:** 
- Check if endpoint requires authentication
- Verify JWT token is being sent
- Check backend permission logic

---

## 📋 Quick Fix Template

If nothing else works, use this complete backend .htaccess:

```apache
# Minimal working CORS configuration
<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "https://cliniquedesjuristes.com"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    Header always set Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,Accept,X-Session-Token"
    Header always set Access-Control-Expose-Headers "Content-Length,Content-Range,X-Total-Count"
    Header always set Access-Control-Allow-Credentials "true"
    Header always set Access-Control-Max-Age "3600"
</IfModule>

# Handle OPTIONS
RewriteEngine On
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=204,L]

# Rest of Passenger config...
PassengerEnabled on
# ... etc
```

Save, restart Node.js app, clear cache, test.

---

## 📞 Getting More Help

### Check These Logs
1. **Apache Error Log:** `/home/c2668909c/logs/error_log`
2. **Node.js App Log:** cPanel → Setup Node.js App → View Logs
3. **Browser Console:** F12 → Console tab
4. **Browser Network:** F12 → Network tab → Headers

### Provide This Info When Asking for Help
- [ ] Exact error message from browser console
- [ ] Response status code (403, 404, 500, etc.)
- [ ] Request headers (from Network tab)
- [ ] Response headers (from Network tab)
- [ ] Node.js app status (Running/Stopped)
- [ ] Relevant log entries
- [ ] `.htaccess` configuration

---

## ✅ Success Indicators

You know CORS is working when:

✅ Browser console has NO CORS errors  
✅ Network tab shows 200 responses  
✅ Response headers include `Access-Control-Allow-Origin`  
✅ Can successfully login/make API calls  
✅ curl and browser both work  
✅ No 403 errors  

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Repository:** Medsaidabidi02/cliniquedesjuristes
