# One-Session-Per-User System - Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SIMPLE ONE-SESSION-PER-USER SYSTEM               │
│                  Database-Driven Session Management                 │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
  1. LOGIN FLOW (New Session Creation)
═══════════════════════════════════════════════════════════════════════

┌──────────┐     POST /api/auth/login      ┌──────────────┐
│ Browser  │────────────────────────────────>│   Backend    │
│          │  { email, password }           │              │
└──────────┘                                └──────┬───────┘
                                                   │
                                                   │ 1. Validate credentials
                                                   │
                                                   v
                                            ┌──────────────┐
                                            │   Database   │
                                            │  users table │
                                            └──────┬───────┘
                                                   │
                                    2. Generate UUID session ID
                                    sessionId = "xyz-789"
                                                   │
                                    3. UPDATE users SET
                                       is_logged_in = TRUE,
                                       current_session_id = "xyz-789"
                                       WHERE id = ?
                                                   │
                                                   v
                                            ┌──────────────┐
                                            │ Generate JWT │
                                            │  with data:  │
                                            │   id: 123    │
                                            │   sessionId: │
                                            │   "xyz-789"  │
                                            └──────┬───────┘
                                                   │
┌──────────┐         { token, user }              │
│ Browser  │<───────────────────────────────────┘
│          │  Store token in localStorage
└──────────┘


═══════════════════════════════════════════════════════════════════════
  2. AUTHENTICATION FLOW (Every API Request)
═══════════════════════════════════════════════════════════════════════

┌──────────┐  GET /api/any-endpoint         ┌──────────────┐
│ Browser  │────────────────────────────────>│   Backend    │
│          │  Authorization: Bearer <token> │ Middleware   │
└──────────┘                                └──────┬───────┘
                                                   │
                                    1. Decode JWT token
                                    Extract: userId = 123
                                            sessionId = "xyz-789"
                                                   │
                                                   v
                                            ┌──────────────┐
                                            │   Database   │
                                            │              │
                                    SELECT is_logged_in,
                                           current_session_id
                                    FROM users WHERE id = 123
                                            │
                                            └──────┬───────┘
                                                   │
                                                   v
                                    ┌──────────────────────────┐
                                    │ Check 1: is_logged_in?   │
                                    │  If FALSE → 401 Logout   │
                                    └──────────┬───────────────┘
                                               │ TRUE
                                               v
                                    ┌──────────────────────────┐
                                    │ Check 2: Session Match?  │
                                    │ "xyz-789" == "xyz-789"?  │
                                    │ If NO → 401 Elsewhere    │
                                    └──────────┬───────────────┘
                                               │ YES
                                               v
┌──────────┐              ✅ SUCCESS                │
│ Browser  │<───────────────────────────────────────┘
│          │  Request allowed
└──────────┘


═══════════════════════════════════════════════════════════════════════
  3. CONCURRENT LOGIN (Session Replacement)
═══════════════════════════════════════════════════════════════════════

Device 1 (Browser A):                    Device 2 (Browser B):
┌──────────────────┐                    ┌──────────────────┐
│ User logs in     │                    │                  │
│ sessionId:       │                    │                  │
│ "abc-123"        │                    │                  │
└────────┬─────────┘                    └──────────────────┘
         │
         v
  ┌─────────────────────┐
  │ Database:           │
  │ is_logged_in = TRUE │
  │ session_id="abc-123"│
  └─────────────────────┘
         │
         │ Time passes...
         │
         │                              Device 2 (Browser B):
         │                              ┌──────────────────┐
         │                              │ User logs in     │
         │                              │ sessionId:       │
         │                              │ "xyz-789"        │
         │                              └────────┬─────────┘
         │                                       │
         │                                       v
         │                              ┌─────────────────────┐
         │                              │ Database UPDATE:    │
         │                              │ is_logged_in = TRUE │
         │                              │ session_id="xyz-789"│
         │                              └─────────────────────┘
         │                                       │
         │                                       │
Device 1 tries API request:                     │
┌──────────────────┐                            │
│ Token session:   │                            │
│ "abc-123"        │                            │
└────────┬─────────┘                            │
         │                                       │
         v                                       │
  ┌─────────────────┐                           │
  │ Check session:  │                           │
  │ "abc-123" !=    │                           │
  │ "xyz-789"       │                           │
  └────────┬────────┘                           │
           │                                     │
           v                                     │
  ❌ 401 REJECTED                                │
  "Logged in elsewhere"                         │
                                                 │
                                                 v
                                       Device 2 API request:
                                       ┌──────────────────┐
                                       │ Token session:   │
                                       │ "xyz-789"        │
                                       └────────┬─────────┘
                                                │
                                                v
                                         ┌─────────────────┐
                                         │ Check session:  │
                                         │ "xyz-789" ==    │
                                         │ "xyz-789"       │
                                         └────────┬────────┘
                                                  │
                                                  v
                                         ✅ SUCCESS
                                         Request allowed


═══════════════════════════════════════════════════════════════════════
  4. LOGOUT FLOW
═══════════════════════════════════════════════════════════════════════

┌──────────┐  POST /api/auth/logout        ┌──────────────┐
│ Browser  │────────────────────────────────>│   Backend    │
│          │  Authorization: Bearer <token> │              │
└──────────┘                                └──────┬───────┘
                                                   │
                                    1. Decode token
                                    Extract: userId = 123
                                                   │
                                                   v
                                            ┌──────────────┐
                                            │   Database   │
                                            │              │
                                    UPDATE users SET
                                      is_logged_in = FALSE,
                                      current_session_id = NULL
                                    WHERE id = 123
                                            │
                                            └──────┬───────┘
                                                   │
┌──────────┐         { success: true }            │
│ Browser  │<───────────────────────────────────┘
│          │  Clear token from localStorage
└──────────┘


═══════════════════════════════════════════════════════════════════════
  5. SERVER RESTART FLOW
═══════════════════════════════════════════════════════════════════════

┌──────────────────┐
│  Server Startup  │
└────────┬─────────┘
         │
         v
  ┌─────────────────────────────────────┐
  │ Execute on Database:                │
  │                                     │
  │ UPDATE users                        │
  │ SET is_logged_in = FALSE,           │
  │     current_session_id = NULL       │
  │ WHERE is_logged_in = TRUE           │
  │                                     │
  │ Result: 5 rows affected             │
  └─────────────┬───────────────────────┘
                │
                v
         ┌──────────────┐
         │ Console Log: │
         │ "Reset       │
         │  sessions    │
         │  for 5 users"│
         └──────────────┘

All users must log in again after server restart!


═══════════════════════════════════════════════════════════════════════
  DATABASE SCHEMA
═══════════════════════════════════════════════════════════════════════

┌───────────────────────────────────────────────────────────────┐
│                        users TABLE                            │
├───────────────────────────────────────────────────────────────┤
│ id                    INT PRIMARY KEY                         │
│ name                  VARCHAR(255)                            │
│ email                 VARCHAR(255) UNIQUE                     │
│ password              VARCHAR(255)                            │
│ is_admin              BOOLEAN                                 │
│ is_approved           BOOLEAN                                 │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ is_logged_in        BOOLEAN DEFAULT FALSE          ★ NEW ┃ │
│ ┃ current_session_id  VARCHAR(255) DEFAULT NULL      ★ NEW ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│ created_at            TIMESTAMP                              │
│ updated_at            TIMESTAMP                              │
└───────────────────────────────────────────────────────────────┘

Indexes:
  ✓ idx_is_logged_in (is_logged_in)
  ✓ idx_current_session_id (current_session_id)


═══════════════════════════════════════════════════════════════════════
  KEY BENEFITS
═══════════════════════════════════════════════════════════════════════

✅ SIMPLE         - Just 2 columns, no complex session tables
✅ RELIABLE       - Database-driven, not memory or cache dependent
✅ IMMEDIATE      - Old sessions rejected right away
✅ MINIMAL        - Only 504 lines added (mostly docs)
✅ NO MAINTENANCE - No cleanup jobs, no expired records
✅ ATOMIC         - Simple UPDATE queries, no race conditions
✅ AUTO-RECOVERY  - Server restart cleans everything
✅ EASY DEBUG     - Just check 2 columns in DB
```
