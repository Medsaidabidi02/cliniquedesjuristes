# Session-Based Login System - Implementation Guide

## Overview

This document explains the new session-based login system with anti-account-sharing features implemented in the Clinique des Juristes platform.

## Key Features

### 1. Single Active Session per User
- Each user can only have **one active session** at a time
- When a user logs in from a new location/device, all previous sessions are automatically invalidated
- The previous session will receive a "logged in elsewhere" error on next API request

### 2. Login Ban System (1 Hour)
- When a user logs out, a **1-hour login ban** is automatically set
- This prevents immediate account sharing after logout
- If a banned user tries to login, they receive: `"Compte temporairement verrouillé. Réessayez dans X minute(s)."`

### 3. One-Tab Policy
- Only **one browser tab** can be active per session
- Opening a new tab automatically logs out the previous tab
- Uses localStorage events for cross-tab communication

### 4. IP and User-Agent Tracking
- Each session tracks:
  - IP address
  - User agent (browser/device info)
  - Last activity timestamp
- Helps detect suspicious login patterns

## Database Schema

### Sessions Table
```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,          -- Unique session ID (UUID)
  user_id INT NOT NULL,                  -- Foreign key to users table
  valid BOOLEAN DEFAULT TRUE,            -- Session validity flag
  created_at TIMESTAMP DEFAULT NOW(),    -- Session creation time
  ip_address VARCHAR(45),                -- IP address of session
  user_agent VARCHAR(512),               -- Browser/device info
  last_activity TIMESTAMP,               -- Last API request time
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### LoginBans Table
```sql
CREATE TABLE login_bans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,          -- One ban per user
  banned_until DATETIME NOT NULL,        -- Ban expiration time
  reason VARCHAR(255),                   -- Ban reason
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Installation Steps

### 1. Run Database Migration

Execute the SQL migration to create the required tables:

```bash
# Connect to your MySQL database and run:
mysql -u your_user -p your_database < backend/migrations/create_session_and_ban_tables.sql
```

Or use your database management tool (phpMyAdmin, MySQL Workbench, etc.) to execute the SQL file.

### 2. Restart Backend Server

No code changes needed - the backend automatically detects and uses the new tables:

```bash
cd backend
npm run build
npm start
```

### 3. Frontend Already Updated

The frontend changes are already included. Just ensure dependencies are installed:

```bash
cd frontend
npm install
npm start
```

## How It Works

### Login Flow

1. **User submits credentials**
   ```
   POST /api/auth/login
   Body: { email, password }
   ```

2. **Backend checks for active ban**
   - Queries `login_bans` table
   - If banned, returns 403 with time remaining

3. **Backend validates credentials**
   - Checks email and password
   - Verifies user is approved

4. **Backend invalidates old sessions**
   ```sql
   UPDATE sessions SET valid = FALSE WHERE user_id = ? AND valid = TRUE
   ```

5. **Backend creates new session**
   ```sql
   INSERT INTO sessions (id, user_id, valid, ip_address, user_agent)
   VALUES (UUID(), userId, TRUE, ip, userAgent)
   ```

6. **Backend generates JWT**
   - Includes `sessionId` in token payload
   - Returns token to frontend

7. **Frontend stores token and starts one-tab policy**
   - Saves token to localStorage
   - Starts heartbeat to claim active tab

### Authentication Flow

1. **Frontend sends API request with JWT**
   ```
   Authorization: Bearer <token>
   ```

2. **Backend middleware validates JWT**
   - Decodes token to get `sessionId`
   - Queries database for session:
     ```sql
     SELECT * FROM sessions WHERE id = ? AND user_id = ?
     ```

3. **Backend checks session validity**
   - If session not found → `401 Session expired`
   - If `valid = FALSE` → `401 Logged in elsewhere`
   - If valid → Updates `last_activity` and allows request

### Logout Flow

1. **User clicks logout**
   ```
   POST /api/auth/logout
   ```

2. **Backend invalidates session**
   ```sql
   UPDATE sessions SET valid = FALSE WHERE id = ?
   ```

3. **Backend sets 1-hour login ban**
   ```sql
   DELETE FROM login_bans WHERE user_id = ?;
   INSERT INTO login_bans (user_id, banned_until, reason)
   VALUES (?, DATE_ADD(NOW(), INTERVAL 1 HOUR), 'Logout cooldown');
   ```

4. **Frontend clears auth data and stops one-tab policy**

### One-Tab Policy Flow

1. **Tab A: User logs in**
   - Generates unique `tabId`
   - Claims active tab: `localStorage.setItem('activeTabId', tabId)`
   - Starts heartbeat interval (every 2 seconds)

2. **Tab B: User opens new tab with same session**
   - Generates new `tabId`
   - Claims active tab: `localStorage.setItem('activeTabId', newTabId)`
   - This triggers storage event in Tab A

3. **Tab A: Detects storage change**
   - Sees `activeTabId` changed
   - Calls logout callback
   - Shows message: "Déconnecté - ouvert dans un autre onglet"
   - Redirects to login page

## Testing

### Test Single-Session Enforcement

1. Log in as User A in Browser 1
2. Log in as User A in Browser 2
3. Expected: Browser 1 receives "logged in elsewhere" error on next API request

### Test Login Ban

1. Log in as User A
2. Click logout
3. Try to log in again immediately
4. Expected: See error "Compte temporairement verrouillé. Réessayez dans 60 minute(s)."
5. Wait 1 hour (or manually delete ban from database)
6. Try login again
7. Expected: Login succeeds

### Test One-Tab Policy

1. Log in as User A in Tab 1
2. Open Tab 2 with same URL (while Tab 1 is still open)
3. Expected: Tab 1 shows logout message and redirects to login

## Security Considerations

### Preventing Account Sharing

The combination of these features makes account sharing very difficult:

1. **Single session** → Only one device can be logged in
2. **1-hour ban** → Can't quickly hand off the account
3. **One-tab policy** → Can't use multiple tabs simultaneously
4. **IP/User-agent tracking** → Suspicious patterns can be detected

### Session Cleanup

Old invalid sessions should be periodically cleaned up:

```sql
-- Delete invalid sessions older than 30 days
DELETE FROM sessions 
WHERE valid = FALSE 
AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Delete expired bans
DELETE FROM login_bans 
WHERE banned_until < NOW();
```

Consider setting up a daily cron job for this.

### Token Expiration

JWT tokens expire based on `JWT_EXPIRES_IN` environment variable:
- Production: 1 hour (default)
- Development: 7 days (default)

Even if token is valid, the session must also be valid in database.

## Configuration

### Environment Variables

```bash
# Backend .env
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h  # or 7d for dev
NODE_ENV=production
```

### Customizing Ban Duration

To change the 1-hour ban duration, edit `backend/src/routes/auth.ts`:

```typescript
// Change INTERVAL 1 HOUR to desired duration
await database.query(
  'INSERT INTO login_bans (user_id, banned_until, reason) VALUES (?, DATE_ADD(NOW(), INTERVAL 2 HOUR), ?)',
  [userId, 'Logout - anti-sharing cooldown']
);
```

### Customizing Heartbeat Interval

To change the one-tab heartbeat interval, edit `frontend/src/lib/oneTabPolicy.ts`:

```typescript
const HEARTBEAT_INTERVAL = 2000; // Change to desired milliseconds
const HEARTBEAT_TIMEOUT = 5000;  // Change timeout accordingly
```

## Troubleshooting

### "Session expired" errors after login

**Cause:** Sessions table doesn't exist or JWT doesn't include sessionId

**Fix:** 
1. Run the database migration
2. Restart backend server
3. Clear localStorage and log in again

### One-tab policy not working

**Cause:** localStorage might be blocked or different origins

**Fix:**
1. Check browser console for errors
2. Ensure both tabs are on same domain
3. Check if localStorage is enabled in browser settings

### Ban not expiring after 1 hour

**Cause:** Server timezone mismatch

**Fix:**
1. Check MySQL timezone: `SELECT NOW();`
2. Adjust server timezone if needed
3. Or use UTC consistently

## API Reference

### POST /api/auth/login

Login and create new session.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "isAdmin": false,
    "is_admin": false
  }
}
```

**Error Response (403) - Banned:**
```json
{
  "success": false,
  "message": "Compte temporairement verrouillé. Réessayez dans 45 minute(s).",
  "bannedUntil": "2025-10-29T19:00:00.000Z"
}
```

### POST /api/auth/logout

Logout, invalidate session, and set 1-hour ban.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

### Any Authenticated Endpoint

**Error Response (401) - Session Expired:**
```json
{
  "error": "Session expired - logged in from another device",
  "sessionExpired": true,
  "loggedInElsewhere": true
}
```

## Monitoring

### Check Active Sessions

```sql
-- See all active sessions
SELECT 
  s.id,
  s.user_id,
  u.email,
  s.ip_address,
  s.created_at,
  s.last_activity,
  TIMESTAMPDIFF(MINUTE, s.last_activity, NOW()) as idle_minutes
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.valid = TRUE
ORDER BY s.last_activity DESC;
```

### Check Current Bans

```sql
-- See all active bans
SELECT 
  lb.id,
  lb.user_id,
  u.email,
  lb.banned_until,
  TIMESTAMPDIFF(MINUTE, NOW(), lb.banned_until) as remaining_minutes,
  lb.reason
FROM login_bans lb
JOIN users u ON lb.user_id = u.id
WHERE lb.banned_until > NOW()
ORDER BY lb.banned_until;
```

### Session Statistics

```sql
-- Total active sessions by user
SELECT 
  u.email,
  COUNT(s.id) as active_sessions
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.valid = TRUE
GROUP BY u.id, u.email
HAVING active_sessions > 0
ORDER BY active_sessions DESC;
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend logs for error messages
3. Check browser console for frontend errors
4. Verify database tables were created correctly
