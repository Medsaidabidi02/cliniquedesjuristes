# Session Management System - Implementation Guide

## Overview

This system implements a robust single active session per user with progressive cooldown for repeated login attempts from different browsers/devices. This prevents account sharing while allowing legitimate users to switch devices after logout.

## Key Features

### 1. Single Active Session per User
- Each user can have **only one active session** at a time
- Attempting to login while a session is active blocks the login
- Logging in from the **same browser/device** automatically invalidates the old session and creates a new one
- Logging in from a **different browser/device** blocks login and displays the session-active page
- **Stale sessions** (inactive for more than 24 hours) are automatically invalidated to allow login
- **Admin bypass**: Admin users can login anytime without session restrictions

### 2. Progressive Cooldown System
- First **5 login attempts** while another session is active are allowed (with warning)
- After 5 attempts, progressive cooldown is applied:
  - Attempt 6: 15 minutes
  - Attempt 7: 30 minutes
  - Attempt 8: 1 hour
  - Attempt 9: 2 hours
  - Attempt 10+: 4 hours (maximum)
- Cooldown is **reset immediately** when user logs out from the active session

### 3. Session-Active Page
- Dedicated page at `/session-active` for blocked login attempts
- Displays:
  - Message: "Your account is already active in another session"
  - Remaining attempts (if under 5)
  - Cooldown timer (if over 5 attempts)
- **Auto-refreshes** session status every 30 seconds
- Automatically redirects to login when session becomes available

### 4. Automatic Session Refresh
- Frontend polls `/auth/session-status` endpoint every 30 seconds
- Detects when the active session is terminated
- Seamless user experience - no manual refresh needed

## Database Schema

### Sessions Table
```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,          -- UUID session identifier
  user_id INT NOT NULL,                  -- Foreign key to users table
  valid BOOLEAN DEFAULT TRUE,            -- Session validity flag
  created_at TIMESTAMP DEFAULT NOW(),    -- Session creation time
  ip_address VARCHAR(45) NULL,           -- IP address of session
  user_agent VARCHAR(512) NULL,          -- Browser/device info
  last_activity TIMESTAMP NULL,          -- Last API request time
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Login Attempts Table
```sql
CREATE TABLE login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,          -- One record per user
  attempt_count INT DEFAULT 0,           -- Number of failed attempts
  cooldown_until DATETIME NULL,          -- When cooldown expires
  last_attempt_at TIMESTAMP DEFAULT NOW(), -- Last attempt timestamp
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Installation & Setup

### 1. Run Database Migration

```bash
cd backend
node run-migration.js
```

This will create the `sessions` and `login_attempts` tables.

### 2. Backend Setup

The backend code is already integrated. Just restart the server:

```bash
cd backend
npm run build
npm start
```

### 3. Frontend Setup

The frontend changes are integrated. Just install dependencies and build:

```bash
cd frontend
npm install
npm run build
npm start
```

## API Endpoints

### POST /api/auth/login
Login endpoint with session enforcement.

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
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com",
    "isAdmin": false
  }
}
```

**Session Active Response (403):**
```json
{
  "success": false,
  "message": "Votre compte est déjà actif dans une autre session. (Tentative 3/5)",
  "sessionActive": true,
  "attemptsRemaining": 2,
  "cooldownMinutes": 0
}
```

**Cooldown Active Response (403):**
```json
{
  "success": false,
  "message": "Votre compte est déjà actif dans une autre session. Cooldown actif: réessayez dans 15 minute(s).",
  "sessionActive": true,
  "cooldownMinutes": 15
}
```

### POST /api/auth/logout
Logout endpoint that invalidates session and resets attempt count.

**Request:**
```
Authorization: Bearer jwt-token-here
```

**Response (200):**
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

### GET /api/auth/session-status
Check if session is still valid (used by session-active page).

**Request:**
```
Authorization: Bearer jwt-token-here
```

**Response (200):**
```json
{
  "success": true,
  "sessionValid": true,
  "cooldownMinutes": 0
}
```

## User Flow Examples

### Scenario 1: Normal Login
1. User logs in from Browser A
2. Session created, JWT issued
3. User can access protected resources

### Scenario 2: Same Device Re-login
1. User logs in from Browser A
2. User logs in again from Browser A (same IP/user-agent)
3. Old session invalidated, new session created
4. Login succeeds immediately

### Scenario 3: Different Device Login (First Time)
1. User logs in from Browser A
2. User tries to login from Browser B (different IP/user-agent)
3. Login blocked with message: "Already active in another session (Attempt 1/5)"
4. Redirected to `/session-active` page

### Scenario 4: Progressive Cooldown
1. User tries to login from Browser B (5 times)
2. Attempts 1-5: Blocked with warning
3. Attempt 6: 15-minute cooldown applied
4. During cooldown: Login blocked with timer
5. After cooldown: Can try again

### Scenario 5: Legitimate Device Switch
1. User logs in from Browser A
2. User logs out from Browser A
3. Attempt count reset to 0
4. User logs in from Browser B immediately (no cooldown)
5. Login succeeds

## Security Features

1. **IP and User-Agent Tracking**: Detects different devices
2. **JWT with Session ID**: Token tied to specific session
3. **Session Validation**: Every API request validates session
4. **Automatic Cleanup**: Invalid sessions are tracked but can be cleaned periodically
5. **Progressive Penalties**: Discourages brute force attempts

## Configuration

Environment variables (optional):
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

## Testing

### Test Single Session
1. Login from Browser A
2. Try to login from Browser B
3. Should be blocked and redirected to session-active page

### Test Same Device
1. Login from Browser A
2. Close tab, open new tab
3. Login again from Browser A
4. Should succeed immediately

### Test Cooldown
1. Login from Browser A
2. Try to login from Browser B 6 times
3. Should see 15-minute cooldown message

### Test Logout Reset
1. Login from Browser A
2. Try to login from Browser B (3 times)
3. Logout from Browser A
4. Login from Browser B immediately
5. Should succeed (no cooldown)

## Troubleshooting

### Sessions table not found
Run the migration script:
```bash
cd backend
node run-migration.js
```

### Login always blocked
Check database:
```sql
-- View active sessions
SELECT * FROM sessions WHERE valid = TRUE;

-- Clear all sessions (testing only)
UPDATE sessions SET valid = FALSE;

-- Clear all login attempts
DELETE FROM login_attempts;
```

### Frontend not detecting session state
- Check browser console for API errors
- Verify `/auth/session-status` endpoint is accessible
- Check if JWT token is present in localStorage

## Future Enhancements

- Email notification when session is active elsewhere
- Session management page (view/revoke sessions)
- Configurable cooldown thresholds
- Admin override for locked accounts
- Geographic location tracking
