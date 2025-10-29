# Session-Based Login System - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                             │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Login Page                                                │ │
│  │  - Email/Password form                                     │ │
│  │  - Shows ban message if user is banned                     │ │
│  │  - Shows session expired message if logged in elsewhere    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                 │                                │
│                                 ▼                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  AuthContext                                               │ │
│  │  - Manages auth state                                      │ │
│  │  - Calls auth service                                      │ │
│  │  - Initializes one-tab policy                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                 │                                │
│                                 ▼                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  One-Tab Policy (oneTabPolicy.ts)                          │ │
│  │  - Generates unique tab ID                                 │ │
│  │  - Claims active tab in localStorage                       │ │
│  │  - Sends heartbeat every 2 seconds                         │ │
│  │  - Listens for storage events from other tabs              │ │
│  │  - Logs out inactive tabs                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                 │                                │
│                                 ▼                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  API Client (api.ts)                                       │ │
│  │  - Adds Authorization header to requests                   │ │
│  │  - Intercepts 401 responses                                │ │
│  │  - Redirects to login on session expiration                │ │
│  │  - Shows appropriate error messages                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                       HTTP Requests
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Auth Routes (routes/auth.ts)                              │ │
│  │                                                             │ │
│  │  POST /api/auth/login                                      │ │
│  │  1. Check if user exists                                   │ │
│  │  2. Check if user is banned (login_bans table)             │ │
│  │  3. Validate password                                      │ │
│  │  4. Invalidate all existing sessions (SET valid = FALSE)   │ │
│  │  5. Create new session (with IP, user-agent)               │ │
│  │  6. Generate JWT with sessionId                            │ │
│  │  7. Return token + user data                               │ │
│  │                                                             │ │
│  │  POST /api/auth/logout                                     │ │
│  │  1. Decode JWT to get sessionId and userId                 │ │
│  │  2. Invalidate session (SET valid = FALSE)                 │ │
│  │  3. Delete any existing ban for user                       │ │
│  │  4. Create new 1-hour ban                                  │ │
│  │  5. Return success                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                 │                                │
│                                 ▼                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Auth Middleware (middleware/auth.ts)                      │ │
│  │                                                             │ │
│  │  For ALL authenticated requests:                           │ │
│  │  1. Extract JWT from Authorization header                  │ │
│  │  2. Decode JWT to get sessionId and userId                 │ │
│  │  3. Query sessions table for this session                  │ │
│  │  4. Check if session exists and valid = TRUE               │ │
│  │  5. If invalid → Return 401 "logged in elsewhere"          │ │
│  │  6. Update last_activity timestamp                         │ │
│  │  7. Attach user to request and continue                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE (MySQL)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  users                                                      │ │
│  │  - id (INT)                                                 │ │
│  │  - email (VARCHAR)                                          │ │
│  │  - password (VARCHAR, hashed)                               │ │
│  │  - is_admin (BOOLEAN)                                       │ │
│  │  - is_approved (BOOLEAN)                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                 │                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  sessions                                                   │ │
│  │  - id (VARCHAR, UUID) PRIMARY KEY                          │ │
│  │  - user_id (INT) FOREIGN KEY → users.id                    │ │
│  │  - valid (BOOLEAN) - Is session still active?              │ │
│  │  - created_at (TIMESTAMP)                                   │ │
│  │  - ip_address (VARCHAR)                                     │ │
│  │  - user_agent (VARCHAR)                                     │ │
│  │  - last_activity (TIMESTAMP)                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                 │                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  login_bans                                                 │ │
│  │  - id (INT) AUTO_INCREMENT PRIMARY KEY                     │ │
│  │  - user_id (INT) UNIQUE FOREIGN KEY → users.id             │ │
│  │  - banned_until (DATETIME) - When ban expires              │ │
│  │  - reason (VARCHAR)                                         │ │
│  │  - created_at (TIMESTAMP)                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flow Diagrams

### 1. Login Flow

```
User                  Frontend                Backend               Database
 │                       │                       │                     │
 │  Enter credentials    │                       │                     │
 ├──────────────────────>│                       │                     │
 │                       │  POST /auth/login     │                     │
 │                       ├──────────────────────>│                     │
 │                       │                       │  Check user exists  │
 │                       │                       ├────────────────────>│
 │                       │                       │<────────────────────┤
 │                       │                       │                     │
 │                       │                       │  Check for ban      │
 │                       │                       ├────────────────────>│
 │                       │                       │<────────────────────┤
 │                       │                       │  (No active ban)    │
 │                       │                       │                     │
 │                       │                       │  Validate password  │
 │                       │                       │  (bcrypt compare)   │
 │                       │                       │                     │
 │                       │                       │  Invalidate old     │
 │                       │                       │  sessions           │
 │                       │                       ├────────────────────>│
 │                       │                       │  UPDATE sessions    │
 │                       │                       │  SET valid = FALSE  │
 │                       │                       │<────────────────────┤
 │                       │                       │                     │
 │                       │                       │  Create new session │
 │                       │                       ├────────────────────>│
 │                       │                       │  INSERT INTO        │
 │                       │                       │  sessions           │
 │                       │                       │<────────────────────┤
 │                       │                       │                     │
 │                       │                       │  Generate JWT       │
 │                       │                       │  (with sessionId)   │
 │                       │                       │                     │
 │                       │  Return token + user  │                     │
 │                       │<──────────────────────┤                     │
 │                       │                       │                     │
 │                       │  Store token          │                     │
 │                       │  Start one-tab policy │                     │
 │                       │                       │                     │
 │  Redirect to dashboard│                       │                     │
 │<──────────────────────┤                       │                     │
 │                       │                       │                     │
```

### 2. Authenticated Request Flow

```
User                  Frontend                Backend               Database
 │                       │                       │                     │
 │  Navigate to page     │                       │                     │
 ├──────────────────────>│                       │                     │
 │                       │  GET /api/courses     │                     │
 │                       │  Auth: Bearer <token> │                     │
 │                       ├──────────────────────>│                     │
 │                       │                       │                     │
 │                       │                       │  Decode JWT         │
 │                       │                       │  Extract sessionId  │
 │                       │                       │                     │
 │                       │                       │  Validate session   │
 │                       │                       ├────────────────────>│
 │                       │                       │  SELECT * FROM      │
 │                       │                       │  sessions WHERE     │
 │                       │                       │  id = sessionId     │
 │                       │                       │<────────────────────┤
 │                       │                       │  valid = TRUE ✓     │
 │                       │                       │                     │
 │                       │                       │  Update activity    │
 │                       │                       ├────────────────────>│
 │                       │                       │  UPDATE sessions    │
 │                       │                       │  SET last_activity  │
 │                       │                       │<────────────────────┤
 │                       │                       │                     │
 │                       │                       │  Process request    │
 │                       │                       │  (get courses)      │
 │                       │                       │                     │
 │                       │  Return data          │                     │
 │                       │<──────────────────────┤                     │
 │                       │                       │                     │
 │  Display courses      │                       │                     │
 │<──────────────────────┤                       │                     │
 │                       │                       │                     │
```

### 3. Logout Flow

```
User                  Frontend                Backend               Database
 │                       │                       │                     │
 │  Click logout         │                       │                     │
 ├──────────────────────>│                       │                     │
 │                       │  POST /auth/logout    │                     │
 │                       │  Auth: Bearer <token> │                     │
 │                       ├──────────────────────>│                     │
 │                       │                       │                     │
 │                       │                       │  Decode JWT         │
 │                       │                       │  Extract sessionId  │
 │                       │                       │                     │
 │                       │                       │  Invalidate session │
 │                       │                       ├────────────────────>│
 │                       │                       │  UPDATE sessions    │
 │                       │                       │  SET valid = FALSE  │
 │                       │                       │<────────────────────┤
 │                       │                       │                     │
 │                       │                       │  Delete old ban     │
 │                       │                       ├────────────────────>│
 │                       │                       │  DELETE FROM        │
 │                       │                       │  login_bans         │
 │                       │                       │<────────────────────┤
 │                       │                       │                     │
 │                       │                       │  Create 1-hour ban  │
 │                       │                       ├────────────────────>│
 │                       │                       │  INSERT INTO        │
 │                       │                       │  login_bans         │
 │                       │                       │  banned_until =     │
 │                       │                       │  NOW() + 1 HOUR     │
 │                       │                       │<────────────────────┤
 │                       │                       │                     │
 │                       │  Return success       │                     │
 │                       │<──────────────────────┤                     │
 │                       │                       │                     │
 │                       │  Clear token          │                     │
 │                       │  Stop one-tab policy  │                     │
 │                       │                       │                     │
 │  Redirect to login    │                       │                     │
 │<──────────────────────┤                       │                     │
 │                       │                       │                     │
```

### 4. Multi-Device Login Flow

```
Device A              Device B              Backend               Database
  │                      │                     │                     │
  │ Login as User1       │                     │                     │
  ├─────────────────────────────────────────>│                     │
  │                      │                     │  Create Session A   │
  │                      │                     ├────────────────────>│
  │                      │                     │<────────────────────┤
  │ Using app...         │                     │                     │
  │                      │                     │                     │
  │                      │ Login as User1      │                     │
  │                      ├────────────────────>│                     │
  │                      │                     │  Invalidate Sess A  │
  │                      │                     ├────────────────────>│
  │                      │                     │  UPDATE sessions    │
  │                      │                     │  SET valid = FALSE  │
  │                      │                     │<────────────────────┤
  │                      │                     │                     │
  │                      │                     │  Create Session B   │
  │                      │                     ├────────────────────>│
  │                      │                     │<────────────────────┤
  │                      │                     │                     │
  │                      │ Using app...        │                     │
  │                      │                     │                     │
  │ Make API request     │                     │                     │
  ├─────────────────────────────────────────>│                     │
  │                      │                     │  Check Session A    │
  │                      │                     ├────────────────────>│
  │                      │                     │  valid = FALSE ✗    │
  │                      │                     │<────────────────────┤
  │                      │                     │                     │
  │ 401 Logged in elsewhere                   │                     │
  │<─────────────────────────────────────────┤                     │
  │                      │                     │                     │
  │ Show message         │                     │                     │
  │ Redirect to login    │                     │                     │
  │                      │                     │                     │
```

### 5. One-Tab Policy Flow

```
Tab 1                 Tab 2                 localStorage          
  │                      │                        │                
  │ Login                │                        │                
  ├──────────────────────────────────────────────>│                
  │ Set activeTabId = T1 │                        │                
  │                      │                        │                
  │ Start heartbeat      │                        │                
  │ (every 2 seconds)    │                        │                
  │                      │                        │                
  ├─ Set tabHeartbeat ───────────────────────────>│                
  │                      │                        │                
  ├─ Set tabHeartbeat ───────────────────────────>│                
  │                      │                        │                
  │                      │ Open new tab           │                
  │                      ├───────────────────────>│                
  │                      │ Set activeTabId = T2   │                
  │                      │                        │                
  │ Detect storage change│                        │                
  │<─────────────────────────────────────────────┤                
  │ activeTabId changed! │                        │                
  │ (T1 → T2)            │                        │                
  │                      │                        │                
  │ Call logout callback │                        │                
  │ Show message         │                        │                
  │ Redirect to login    │                        │                
  │                      │                        │                
  │                      │ Continue using app     │                
  │                      │                        │                
```

---

## Security Layers

```
┌────────────────────────────────────────────────────────┐
│  Layer 1: JWT Token Validation                         │
│  - Token signature verification                        │
│  - Token expiration check                              │
│  - Payload integrity                                   │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Layer 2: Session Database Validation                  │
│  - Session exists?                                     │
│  - Session is valid? (not invalidated)                │
│  - SessionId matches JWT?                              │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Layer 3: User State Validation                        │
│  - User exists?                                        │
│  - User is approved?                                   │
│  - User is not banned?                                 │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Layer 4: Activity Tracking                            │
│  - Update last_activity timestamp                      │
│  - Track IP address                                    │
│  - Track user-agent                                    │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
                 Request Allowed ✓
```

---

## Anti-Account-Sharing Mechanisms

### 1. Single Session Enforcement
```
User shares credentials → New login → Old session invalidated → First user kicked out
```

### 2. 1-Hour Ban After Logout
```
User logs out → 1-hour ban set → Can't immediately log in again → Discourages sharing
```

### 3. One-Tab Policy
```
Open 2nd tab → 1st tab logged out → Only one tab active → Can't use simultaneously
```

### 4. IP/User-Agent Tracking
```
Login from Device A → Session records IP & browser
Login from Device B → Different IP/browser visible in logs
Admin can detect suspicious patterns
```

---

## Data Flow Summary

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Frontend   │◄─────►│   Backend    │◄─────►│   Database   │
│              │       │              │       │              │
│ • Login UI   │       │ • Auth routes│       │ • users      │
│ • One-tab    │       │ • Middleware │       │ • sessions   │
│ • API calls  │       │ • Validation │       │ • login_bans │
└──────────────┘       └──────────────┘       └──────────────┘
      │                       │                       │
      │                       │                       │
      └───────────────────────┴───────────────────────┘
                              │
                    Session Lifecycle:
                    1. Create on login
                    2. Validate on every request
                    3. Update last_activity
                    4. Invalidate on new login
                    5. Invalidate on logout
                    6. Ban user for 1 hour
```

---

## Key Metrics

### Session Lifecycle
- **Creation**: On successful login
- **Duration**: Until logout or new login (JWT expires in 1h/7d)
- **Validation**: On every authenticated request
- **Invalidation**: On logout or new login elsewhere

### Ban Lifecycle
- **Creation**: On logout
- **Duration**: 1 hour
- **Expiration**: Automatic (checked on login)
- **Removal**: Manual by admin or automatic expiry

### Tab Policy
- **Heartbeat**: Every 2 seconds
- **Timeout**: 5 seconds
- **Detection**: Instant via localStorage events
- **Action**: Automatic logout of inactive tab

---

## System Capacity

### Database Storage
```
Sessions table:
- ~200 bytes per session
- 1000 users × 5 sessions avg = 5000 rows ≈ 1 MB
- With cleanup: stable size

Login_bans table:
- ~100 bytes per ban
- Max 1 ban per user
- 1000 users = 1000 rows ≈ 100 KB
- Auto-expires: minimal growth
```

### Performance Impact
```
Login: +4 queries (ban check, invalidation, creation, ban set)
Auth request: +2 queries (validation, update)
Impact: Negligible (<10ms per request with indexes)
```

---

## Monitoring Dashboard (Conceptual)

```
┌─────────────────────────────────────────────────────────┐
│                   Session Monitor                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Active Sessions: 247                                   │
│  Invalid Sessions: 1,432                                │
│  Active Bans: 12                                        │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Recent Logins (Last Hour)                      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  user1@example.com  │  192.168.1.1  │  Chrome  │   │
│  │  user2@example.com  │  192.168.1.5  │  Firefox │   │
│  │  user3@example.com  │  10.0.0.15    │  Safari  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Current Bans                                   │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  user4@example.com  │  Expires in: 45 min      │   │
│  │  user5@example.com  │  Expires in: 12 min      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Suspicious Activity                            │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  user6@example.com  │  3 logins, 3 IPs/hour   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Success Indicators

✅ **System is working correctly when:**
- Only 1 valid session per user at any time
- Login attempts after logout fail for 1 hour
- Opening new tab logs out old tab
- Session validation happens on every request
- IP and user-agent are tracked
- Old sessions are cleaned up
- No security vulnerabilities detected

---

## Documentation Files

1. **SESSION_SYSTEM_README.md** - Complete technical guide
2. **TESTING_GUIDE.md** - Step-by-step testing procedures
3. **QUICK_SETUP_GUIDE.md** - Installation and admin guide
4. **ARCHITECTURE_OVERVIEW.md** - This file (visual diagrams)
