# Simple One-Session-Per-User System

## Overview

This document explains the **simple** one-session-per-user system implemented in the Clinique des Juristes platform. This system uses a minimal, database-driven approach with just a single boolean flag.

## Key Features

### ✅ One Active Session per User
- Each user can only be logged in **once at a time**
- When a user logs in from a new browser/device, the previous session automatically becomes invalid
- No complex session tables or token management needed

### ✅ Automatic Session Replacement
- If a user is already logged in and logs in again from another device, the old session is automatically replaced
- The old session will receive an error on the next API request

### ✅ Clean Logout
- When a user logs out, their `is_logged_in` flag is set to `FALSE`
- Next login will work normally (no login bans by default)

### ✅ Server Restart Handling
- All `is_logged_in` flags are automatically reset to `FALSE` on server restart
- This handles cases where users closed their browser without logging out

## Database Schema

### Users Table - New Column

```sql
ALTER TABLE users ADD COLUMN is_logged_in BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_is_logged_in ON users(is_logged_in);
```

That's it! Just **one column** added to the existing `users` table.

## Installation Steps

### 1. Run Database Migration

Execute the SQL migration to add the `is_logged_in` column:

```bash
# Connect to your MySQL database and run:
mysql -u your_user -p your_database < backend/migrations/add_is_logged_in_column.sql
```

Or use your database management tool (phpMyAdmin, MySQL Workbench, etc.) to execute the SQL file.

### 2. Restart Backend Server

The code changes are already in place. Just restart the server:

```bash
cd backend
npm run build
npm start
```

On startup, the server will automatically reset all `is_logged_in` flags to ensure a clean state.

## How It Works

### Login Flow

1. **User submits credentials**
   ```
   POST /api/auth/login
   Body: { email, password }
   ```

2. **Backend validates credentials**
   - Checks email and password
   - Verifies user is approved

3. **Backend sets is_logged_in = TRUE**
   ```sql
   UPDATE users SET is_logged_in = TRUE WHERE id = ?
   ```
   - If user was already logged in elsewhere, this replaces that session
   - Simple and atomic operation

4. **Backend generates JWT**
   - Includes unique `sessionId` in token payload (for tracking)
   - Returns token to frontend

5. **Frontend stores token**
   - Saves token to localStorage
   - Uses token for all subsequent API requests

### Authentication Flow

1. **Frontend sends API request with JWT**
   ```
   Authorization: Bearer <token>
   ```

2. **Backend middleware validates JWT**
   - Decodes token to get user ID
   - Queries database:
     ```sql
     SELECT id, email, is_admin, is_approved, is_logged_in 
     FROM users WHERE id = ?
     ```

3. **Backend checks is_logged_in flag**
   - If `is_logged_in = FALSE` → `401 Session expired (logged in elsewhere)`
   - If `is_logged_in = TRUE` → Allow request to continue

### Logout Flow

1. **User clicks logout**
   ```
   POST /api/auth/logout
   ```

2. **Backend sets is_logged_in = FALSE**
   ```sql
   UPDATE users SET is_logged_in = FALSE WHERE id = ?
   ```

3. **Frontend clears auth data**
   - Removes token from localStorage
   - Redirects to login page

### Server Restart Flow

1. **Server starts up**

2. **Reset all is_logged_in flags**
   ```sql
   UPDATE users SET is_logged_in = FALSE WHERE is_logged_in = TRUE
   ```

3. **Log the number of users reset**
   - Shows in console: "Reset is_logged_in flag for X user(s)"

## Testing

### Test Single-Session Enforcement

1. Log in as User A in Browser 1
2. Log in as User A in Browser 2
3. In Browser 1, make any API request (e.g., load dashboard)
4. **Expected**: Browser 1 receives "Session expired - logged in from another device" error
5. Browser 1 should redirect to login page

### Test Normal Logout and Re-login

1. Log in as User A
2. Click logout
3. **Expected**: Logout successful
4. Log in again as User A
5. **Expected**: Login succeeds immediately (no ban)

### Test Server Restart Handling

1. Log in as User A and User B
2. Stop the server (without users logging out)
3. Restart the server
4. **Expected**: Console shows "Reset is_logged_in flag for 2 user(s)"
5. Try to use the old tokens
6. **Expected**: Both users receive "Session expired" errors
7. Both users can log in again normally

### Test Closed Tab Without Logout

1. Log in as User A
2. Close browser tab/window (without clicking logout)
3. Restart the server OR wait for server restart
4. Open browser again and try to access protected page
5. **Expected**: Redirected to login (session expired)
6. Log in again
7. **Expected**: Login succeeds

## Comparison with Previous Complex System

### Previous System (Complex)
- ❌ Separate `sessions` table
- ❌ Session tracking with IPs and user agents
- ❌ Login ban table with 1-hour cooldowns
- ❌ One-tab policy with localStorage heartbeats
- ❌ Complex session invalidation logic
- ❌ Session cleanup cron jobs needed

### New System (Simple) ✅
- ✅ Just one boolean column `is_logged_in`
- ✅ No extra tables needed
- ✅ No login bans (optional feature removed for simplicity)
- ✅ No complex one-tab policy (optional feature removed)
- ✅ Simple UPDATE queries
- ✅ Auto-cleanup on server restart

## Security Considerations

### How It Prevents Account Sharing

1. **Only one device can be logged in** - The `is_logged_in` flag ensures only one active session
2. **Automatic session takeover** - New login immediately invalidates old session
3. **No gaps for sharing** - The moment someone else logs in, the first user is kicked out

### Session Validation

Every API request checks:
```sql
SELECT is_logged_in FROM users WHERE id = ?
```

If `is_logged_in = FALSE`, the request is rejected with a 401 error.

### Token Expiration

JWT tokens still expire based on `JWT_EXPIRES_IN` environment variable:
- Production: 1 hour (default)
- Development: 7 days (default)

However, even with a valid token, the `is_logged_in` flag must also be TRUE.

## Configuration

### Environment Variables

```bash
# Backend .env
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h  # or 7d for dev
NODE_ENV=production
```

### Optional: Add Login Cooldown

If you want to add a simple cooldown after logout (to further prevent sharing), you can add a `last_logout` timestamp:

```sql
ALTER TABLE users ADD COLUMN last_logout TIMESTAMP NULL;

-- On logout:
UPDATE users SET is_logged_in = FALSE, last_logout = NOW() WHERE id = ?

-- On login, check:
SELECT 
  TIMESTAMPDIFF(MINUTE, last_logout, NOW()) as minutes_since_logout
FROM users WHERE id = ?

-- If minutes_since_logout < 60, reject login
```

But this is **optional** and not included in the base simple system.

## Troubleshooting

### "Session expired" errors immediately after login

**Cause:** The `is_logged_in` column doesn't exist yet

**Fix:** 
1. Run the migration: `add_is_logged_in_column.sql`
2. Restart backend server
3. Try logging in again

### Users can't log in after server restart

**Cause:** This is expected behavior - all sessions are cleared on restart

**Fix:** Users just need to log in again. This is by design for security.

### Old complex session system still active

**Cause:** Both systems are running (graceful fallback)

**Fix:** The code gracefully handles both. If `is_logged_in` column exists, it uses the simple system. The old session system code remains for backward compatibility but won't interfere.

## API Reference

### POST /api/auth/login

Login and set `is_logged_in = TRUE`.

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
    "isAdmin": false
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Identifiants invalides"
}
```

### POST /api/auth/logout

Logout and set `is_logged_in = FALSE`.

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

**Error Response (401) - Logged In Elsewhere:**
```json
{
  "error": "Session expired - logged in from another device or logged out",
  "sessionExpired": true,
  "loggedInElsewhere": true
}
```

## Monitoring

### Check Currently Logged In Users

```sql
-- See all users currently logged in
SELECT 
  id,
  email,
  name,
  is_logged_in,
  updated_at as last_activity
FROM users
WHERE is_logged_in = TRUE
ORDER BY updated_at DESC;
```

### Count Active Sessions

```sql
-- Total number of active sessions
SELECT COUNT(*) as active_sessions
FROM users
WHERE is_logged_in = TRUE;
```

### Find Users Who Haven't Logged Out

```sql
-- Users who are marked as logged in (useful for monitoring)
SELECT 
  id,
  email,
  name,
  TIMESTAMPDIFF(HOUR, updated_at, NOW()) as hours_since_update
FROM users
WHERE is_logged_in = TRUE
ORDER BY updated_at;
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend logs for error messages
3. Verify the `is_logged_in` column was added correctly:
   ```sql
   DESCRIBE users;
   ```
4. Check that server logged the reset message on startup

## Advantages of This Simple Approach

1. **Easy to Understand** - Just one boolean flag, no complex state
2. **Minimal Database Changes** - Only one column added
3. **No Maintenance Needed** - No session cleanup, no expired records
4. **Reliable** - Database-driven, not dependent on memory or cache
5. **Atomic Operations** - Simple UPDATE queries, no race conditions
6. **Auto-Recovery** - Server restart cleans up all stale sessions
7. **Easy to Debug** - Just check one column in users table
8. **No External Dependencies** - Works with existing MySQL database

## Migration from Complex System

If you were using the previous complex session system:

1. The new simple system **coexists peacefully** with the old one
2. The code has graceful fallbacks for missing columns/tables
3. You can continue using the old system by not running the new migration
4. Or adopt the new simple system by running `add_is_logged_in_column.sql`
5. Both approaches achieve the same goal: **one session per user**

The simple system is recommended for most use cases unless you specifically need:
- Login bans after logout
- Detailed session tracking (IP, user agent)
- One-tab enforcement within same device

For the basic requirement of "one user, one session", the simple `is_logged_in` flag is the cleanest solution.
