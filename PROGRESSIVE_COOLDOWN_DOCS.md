# Progressive Cooldown Single-Session System - Complete Documentation

## Overview

This document provides comprehensive information about the progressive cooldown single-session authentication system implemented in the Clinique des Juristes platform.

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Installation](#installation)
5. [API Documentation](#api-documentation)
6. [Frontend Integration](#frontend-integration)
7. [Admin Controls](#admin-controls)
8. [Testing Guide](#testing-guide)
9. [Configuration](#configuration)
10. [Monitoring](#monitoring)
11. [Troubleshooting](#troubleshooting)

## Features

### 1. Single Active Session per User
- Only one active session allowed per account at any moment
- When a new login occurs, all previous sessions are immediately invalidated
- Sessions include metadata: IP, user agent, device fingerprint, ownership label

### 2. Progressive Cooldown System
- **Level 1**: First device switch → 1 hour cooldown
- **Level 2**: 2+ switches in 24h → 6 hour cooldown
- **Level 3**: 4+ switches in 24h → 24 hour cooldown
- Cooldowns are automatically calculated based on device switch history

### 3. Same-Device Exemption
- Device switches on the same physical device (different browsers) don't trigger cooldowns
- Uses device fingerprinting for detection
- Provides better UX for legitimate users

### 4. Session Ownership Labels
- Human-readable labels showing session details
- Format: "Windows 10 — Chrome at 2025-10-30 14:22 — Paris"
- Helps users identify their active sessions

### 5. Elegant Tab Management
- One-tab policy: only one browser tab active per session
- Friendly overlay message for inactive tabs
- No forced logout, just informative blocking

### 6. Background Session Health Checks
- Frontend sends periodic pings (every 5 minutes)
- Keeps session alive and updates last activity
- Detects and handles stale sessions automatically

### 7. Admin Session Management
- View all sessions for any user
- Force invalidate sessions
- Clear cooldown bans
- View device switch history
- Run cleanup tasks

## Architecture

### Backend Components

```
backend/
├── services/
│   ├── deviceFingerprint.ts      # Device fingerprint generation and parsing
│   ├── progressiveCooldown.ts    # Cooldown logic and device switch tracking
│   └── sessionManager.ts         # Session CRUD operations
├── routes/
│   ├── auth.ts                   # Login, logout, session ping endpoints
│   └── adminSessions.ts          # Admin session management endpoints
└── migrations/
    └── add_progressive_cooldown_support.sql
```

### Frontend Components

```
frontend/
├── lib/
│   ├── deviceFingerprint.ts      # Client-side fingerprinting
│   ├── sessionHealthCheck.ts     # Background ping service
│   ├── auth.ts                   # Auth service with fingerprint integration
│   └── oneTabPolicy.ts           # Tab management
└── components/
    └── AlreadyLoggedIn.tsx       # Session blocked UI component
```

## Database Schema

### Sessions Table

```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  valid BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  device_fingerprint VARCHAR(255) NULL,
  owner_label VARCHAR(512) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_valid (valid),
  INDEX idx_is_active (is_active),
  INDEX idx_device_fingerprint (device_fingerprint)
);
```

### Login Bans Table

```sql
CREATE TABLE login_bans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  banned_until DATETIME NOT NULL,
  reason VARCHAR(255) NULL,
  cooldown_level INT DEFAULT 1,
  switch_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_banned_until (banned_until)
);
```

### Device Switch Tracking Table

```sql
CREATE TABLE device_switch_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  switch_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  from_device_fingerprint VARCHAR(255) NULL,
  to_device_fingerprint VARCHAR(255) NULL,
  from_ip VARCHAR(45) NULL,
  to_ip VARCHAR(45) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_switch_timestamp (switch_timestamp)
);
```

## Installation

### Step 1: Run Database Migration

```bash
# Connect to your MySQL database
mysql -u your_user -p your_database

# Run the migration
source backend/migrations/add_progressive_cooldown_support.sql
```

Or use your database management tool (phpMyAdmin, MySQL Workbench) to execute the SQL file.

### Step 2: Install Dependencies

**Backend:**
```bash
cd backend
npm install
npm run build
```

**Frontend:**
```bash
cd frontend
npm install
npm run build
```

### Step 3: Configure Environment Variables

```bash
# backend/.env
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h  # or 7d for development
NODE_ENV=production
```

### Step 4: Restart Services

```bash
# Backend
cd backend
npm start

# Frontend (if serving separately)
cd frontend
npm start
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login

Login and create a new session.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "deviceFingerprint": "abc123..."  // Optional, generated by client
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "ownerLabel": "Windows 10 — Chrome at 2025-10-30 14:22",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "isAdmin": false
  }
}
```

**Error Response (403) - Cooldown Active:**
```json
{
  "success": false,
  "message": "Compte temporairement verrouillé. Réessayez dans 45 minutes.",
  "isBanned": true,
  "bannedUntil": "2025-10-30T19:00:00.000Z",
  "remainingMinutes": 45,
  "cooldownLevel": 1,
  "reason": "Logout - progressive cooldown"
}
```

#### POST /api/auth/logout

Logout, invalidate session, and set progressive cooldown.

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

#### POST /api/auth/session/ping

Update session activity (keep-alive).

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Session updated"
}
```

### Admin Session Management Endpoints

All admin endpoints require authentication and admin privileges.

#### GET /api/admin/sessions/stats

Get session statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalSessions": 150,
    "activeSessions": 45,
    "totalUsers": 100,
    "usersWithActiveSessions": 40
  }
}
```

#### GET /api/admin/sessions/user/:userId

Get all sessions for a specific user.

**Response:**
```json
{
  "success": true,
  "userId": 123,
  "sessions": [...],
  "activeSessions": [...],
  "totalCount": 5,
  "activeCount": 1
}
```

#### POST /api/admin/sessions/invalidate/:sessionId

Force invalidate a specific session.

**Response:**
```json
{
  "success": true,
  "message": "Session invalidée avec succès"
}
```

#### POST /api/admin/sessions/invalidate-user/:userId

Invalidate all sessions for a user.

**Response:**
```json
{
  "success": true,
  "message": "3 session(s) invalidée(s) avec succès",
  "count": 3
}
```

#### GET /api/admin/sessions/ban/:userId

Check ban status for a user.

**Response:**
```json
{
  "success": true,
  "userId": 123,
  "isBanned": true,
  "bannedUntil": "2025-10-30T20:00:00.000Z",
  "remainingMinutes": 120,
  "cooldownLevel": 2,
  "reason": "Logout - progressive cooldown"
}
```

#### DELETE /api/admin/sessions/ban/:userId

Clear login ban for a user (admin override).

**Response:**
```json
{
  "success": true,
  "message": "Ban supprimé avec succès"
}
```

#### GET /api/admin/sessions/device-switches/:userId

Get device switch history.

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 10)

**Response:**
```json
{
  "success": true,
  "userId": 123,
  "switches": [
    {
      "id": 1,
      "switch_timestamp": "2025-10-30T14:00:00.000Z",
      "from_device_fingerprint": "abc123...",
      "to_device_fingerprint": "def456...",
      "from_ip": "192.168.1.1",
      "to_ip": "192.168.1.2"
    }
  ],
  "count": 1
}
```

#### DELETE /api/admin/sessions/device-switches/:userId

Clear device switch history (admin override).

**Response:**
```json
{
  "success": true,
  "message": "Historique des changements d'appareils supprimé avec succès"
}
```

#### POST /api/admin/sessions/cleanup

Run cleanup tasks.

**Request:**
```json
{
  "cleanSessions": true,
  "cleanBans": true,
  "cleanSwitches": true,
  "cleanStale": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Nettoyage effectué avec succès",
  "results": {
    "sessionsDeleted": 15,
    "staleSessionsInvalidated": 3,
    "bansDeleted": 5,
    "switchesDeleted": 20
  }
}
```

## Frontend Integration

### Device Fingerprinting

```typescript
import { getDeviceFingerprint } from './lib/deviceFingerprint';

// Get fingerprint (cached for session)
const fingerprint = await getDeviceFingerprint();
```

### Session Health Checks

```typescript
import { startSessionHealthCheck, stopSessionHealthCheck } from './lib/sessionHealthCheck';

// Start when user logs in
startSessionHealthCheck();

// Stop when user logs out
stopSessionHealthCheck();
```

### Using AlreadyLoggedIn Component

```typescript
import AlreadyLoggedIn from './components/AlreadyLoggedIn';

// Show when session is active elsewhere
<AlreadyLoggedIn 
  ownerLabel="Windows 10 — Chrome at 2025-10-30 14:22"
  onReturnToActive={() => {
    // Handle return to active session
  }}
/>
```

## Configuration

### Backend Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h  # Token expiration time

# Node Environment
NODE_ENV=production

# Database (if not using DATABASE_URL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

### Customizing Cooldown Durations

Edit `backend/src/services/progressiveCooldown.ts`:

```typescript
const COOLDOWN_DURATIONS = {
  1: 1,   // Level 1: 1 hour (change to desired hours)
  2: 6,   // Level 2: 6 hours
  3: 24   // Level 3: 24 hours
};
```

### Customizing Session Ping Interval

Edit `frontend/src/lib/sessionHealthCheck.ts`:

```typescript
// Session ping interval in milliseconds
const PING_INTERVAL = 5 * 60 * 1000;  // Change to desired interval
```

### Customizing One-Tab Policy

Edit `frontend/src/lib/oneTabPolicy.ts`:

```typescript
const HEARTBEAT_INTERVAL = 2000;  // 2 seconds
const HEARTBEAT_TIMEOUT = 5000;   // 5 seconds
```

## Monitoring

### Active Sessions Query

```sql
SELECT 
  s.id,
  s.user_id,
  u.email,
  s.owner_label,
  s.ip_address,
  s.created_at,
  s.last_activity,
  TIMESTAMPDIFF(MINUTE, s.last_activity, NOW()) as idle_minutes
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.valid = TRUE AND s.is_active = TRUE
ORDER BY s.last_activity DESC;
```

### Current Bans Query

```sql
SELECT 
  lb.id,
  lb.user_id,
  u.email,
  lb.banned_until,
  lb.cooldown_level,
  lb.switch_count,
  TIMESTAMPDIFF(MINUTE, NOW(), lb.banned_until) as remaining_minutes,
  lb.reason
FROM login_bans lb
JOIN users u ON lb.user_id = u.id
WHERE lb.banned_until > NOW()
ORDER BY lb.banned_until;
```

### Device Switch Analytics

```sql
SELECT 
  DATE(switch_timestamp) as date,
  COUNT(*) as switch_count,
  COUNT(DISTINCT user_id) as users_affected
FROM device_switch_tracking
WHERE switch_timestamp > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(switch_timestamp)
ORDER BY date DESC;
```

## Troubleshooting

### Issue: Sessions not being invalidated

**Symptom:** User can remain logged in after another device logs in.

**Solution:**
1. Check if migration was run successfully
2. Verify sessions table has the new columns
3. Check backend logs for errors
4. Ensure JWT includes `sessionId` field

### Issue: Cooldowns not working

**Symptom:** User can login immediately after logout.

**Solution:**
1. Verify login_bans table exists
2. Check device_switch_tracking table
3. Review backend logs during login attempt
4. Check if ban expiry logic is correct

### Issue: Device fingerprinting fails

**Symptom:** Same device treated as different device.

**Solution:**
1. Check browser console for fingerprinting errors
2. Verify @fingerprintjs/fingerprintjs is installed
3. Fallback fingerprint should still work
4. Consider using client-generated UUID stored in localStorage

### Issue: Session pings not updating

**Symptom:** Session expires even though user is active.

**Solution:**
1. Check browser console for ping errors
2. Verify /api/auth/session/ping endpoint is working
3. Check authentication token is valid
4. Ensure sessionHealthCheck is started after login

### Issue: One-tab policy not blocking

**Symptom:** Multiple tabs can be used simultaneously.

**Solution:**
1. Check if localStorage is enabled
2. Verify both tabs are on same domain
3. Check browser console for oneTabPolicy errors
4. Ensure oneTabPolicy is initialized after login

## Maintenance

### Daily Cleanup (Cron Job)

Create a daily cron job to clean up old data:

```bash
# Add to crontab
0 2 * * * curl -X POST http://localhost:5001/api/admin/sessions/cleanup \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cleanSessions":true,"cleanBans":true,"cleanSwitches":true,"cleanStale":true}'
```

Or create a script:

```bash
#!/bin/bash
# cleanup-sessions.sh

curl -X POST http://localhost:5001/api/admin/sessions/cleanup \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"cleanSessions":true,"cleanBans":true,"cleanSwitches":true,"cleanStale":true}' \
  && echo "Session cleanup completed successfully"
```

### Monitoring Dashboard

Consider setting up a monitoring dashboard to track:
- Active sessions count
- Active bans count
- Device switch frequency
- Failed login attempts due to cooldown
- Average session duration
- Peak concurrent users

## Security Considerations

1. **Token Security**: Use HTTPS in production to protect JWT tokens
2. **Fingerprint Privacy**: Device fingerprints are hashed and not personally identifiable
3. **Rate Limiting**: Consider adding rate limiting to login endpoint
4. **IP Logging**: Be compliant with data protection regulations (GDPR, etc.)
5. **Session Expiry**: Tokens expire based on JWT_EXPIRES_IN setting
6. **Admin Access**: Secure admin endpoints with proper authentication
7. **CORS**: Configure CORS properly for production domains

## Performance Considerations

1. **Database Indexing**: All tables have proper indexes for performance
2. **Session Pings**: 5-minute interval balances accuracy and server load
3. **Cleanup Tasks**: Run during off-peak hours to minimize impact
4. **Fingerprinting**: Cached on client to avoid repeated calculations
5. **One-Tab Policy**: Uses localStorage events for efficient cross-tab communication

## Support and Contribution

For issues, questions, or contributions:
1. Check this documentation first
2. Review backend and frontend logs
3. Test in development environment
4. Create detailed bug reports with steps to reproduce
5. Include relevant log snippets and error messages

## License

This implementation is part of the Clinique des Juristes platform.
