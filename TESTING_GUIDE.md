# Testing Guide - Session-Based Login System

This guide provides step-by-step instructions for manually testing all the new session-based login features.

## Prerequisites

1. **Database Migration**: Ensure you've run the SQL migration:
   ```bash
   mysql -u your_user -p your_database < backend/migrations/create_session_and_ban_tables.sql
   ```

2. **Backend Running**: 
   ```bash
   cd backend
   npm run build
   npm start
   ```

3. **Frontend Running**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Test 1: Single Active Session per User

**Goal**: Verify only one device can be logged in at a time.

### Steps:

1. **Open Browser 1 (e.g., Chrome)**
   - Navigate to the login page
   - Log in with test credentials: `user@example.com` / `password123`
   - ✅ Expected: Login succeeds, redirected to dashboard

2. **Open Browser 2 (e.g., Firefox)**
   - Navigate to the login page
   - Log in with the **same credentials**: `user@example.com` / `password123`
   - ✅ Expected: Login succeeds, redirected to dashboard

3. **Go back to Browser 1**
   - Try to navigate to any protected page OR refresh the page
   - ✅ Expected: See error message "Session expired - logged in from another device"
   - ✅ Expected: Automatically redirected to login page with message:
     ```
     "Vous avez été déconnecté car vous vous êtes connecté sur un autre appareil."
     ```

### Database Verification:

```sql
-- Check sessions table - should see only 1 valid session for the user
SELECT id, user_id, valid, ip_address, created_at, last_activity
FROM sessions
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
ORDER BY created_at DESC
LIMIT 5;
```

Expected results:
- One session with `valid = TRUE` (Browser 2)
- One or more sessions with `valid = FALSE` (Browser 1)

---

## Test 2: 1-Hour Re-Login Ban

**Goal**: Verify users can't log in immediately after logout.

### Steps:

1. **Log in**
   - Navigate to the login page
   - Log in with test credentials: `user@example.com` / `password123`
   - ✅ Expected: Login succeeds

2. **Log out**
   - Click the logout button
   - ✅ Expected: Redirected to login page

3. **Try to log in again immediately**
   - Enter the same credentials: `user@example.com` / `password123`
   - Click "Sign in"
   - ✅ Expected: See error message:
     ```
     "Compte temporairement verrouillé. Réessayez dans 60 minute(s)."
     ```
   - ✅ Expected: Login fails with HTTP 403 status

4. **Wait 1 hour (or manually remove ban)**
   - Option A: Wait 60 minutes
   - Option B: Manually remove ban in database:
     ```sql
     DELETE FROM login_bans WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');
     ```

5. **Try to log in again**
   - Enter credentials: `user@example.com` / `password123`
   - ✅ Expected: Login succeeds

### Database Verification:

```sql
-- Check active bans
SELECT lb.id, u.email, lb.banned_until, 
       TIMESTAMPDIFF(MINUTE, NOW(), lb.banned_until) as remaining_minutes
FROM login_bans lb
JOIN users u ON lb.user_id = u.id
WHERE lb.banned_until > NOW();
```

Expected results after logout:
- One ban record for the user
- `remaining_minutes` should be approximately 60

---

## Test 3: One-Tab Policy

**Goal**: Verify only one browser tab can be active at a time.

### Steps:

1. **Open Tab 1**
   - Navigate to the login page
   - Log in with test credentials: `user@example.com` / `password123`
   - ✅ Expected: Login succeeds, redirected to dashboard
   - ✅ Expected: Can navigate normally

2. **Open Tab 2** (in the same browser window)
   - Right-click on Tab 1 and select "Duplicate Tab"
   - OR manually open a new tab and navigate to the same URL
   - ✅ Expected: Tab 2 loads normally and can navigate

3. **Go back to Tab 1**
   - Click on Tab 1
   - Try to navigate OR wait a few seconds
   - ✅ Expected: Tab 1 shows logout message:
     ```
     "Vous avez été déconnecté car vous avez ouvert une autre session dans un autre onglet."
     ```
   - ✅ Expected: Tab 1 automatically redirects to login page

4. **Tab 2 remains active**
   - Tab 2 should still work normally
   - ✅ Expected: Can navigate and use the application

### Browser Console Verification:

Open browser developer tools (F12) in both tabs and check console logs:

**Tab 1 (inactive):**
```
🔒 One-tab policy initialized for tab abc12345
⛔ Tab xyz67890 claimed active status. Logging out this tab...
👋 One-tab policy triggered logout for tab abc12345
🔄 Redirecting to /login
```

**Tab 2 (active):**
```
🔒 One-tab policy initialized for tab xyz67890
⚠️ Another tab (abc12345) was active. Taking over...
✅ Heartbeat updated
```

---

## Test 4: IP and User-Agent Tracking

**Goal**: Verify sessions track IP address and user-agent information.

### Steps:

1. **Log in from different locations/browsers**
   - Log in from Chrome
   - Log in from Firefox
   - Log in from mobile device (optional)

2. **Check database**
   ```sql
   SELECT 
     s.id,
     u.email,
     s.ip_address,
     s.user_agent,
     s.created_at,
     s.valid
   FROM sessions s
   JOIN users u ON s.user_id = u.id
   WHERE u.email = 'user@example.com'
   ORDER BY s.created_at DESC
   LIMIT 10;
   ```

### Expected Results:

- Each session should have different `ip_address` values (if logging in from different networks)
- Each session should have different `user_agent` values showing browser/device info:
  - Chrome: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/...`
  - Firefox: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:...) Gecko/...`
  - Mobile: `Mozilla/5.0 (iPhone; CPU iPhone OS ...`

---

## Test 5: Session Validation on Every Request

**Goal**: Verify sessions are validated on every authenticated API request.

### Steps:

1. **Log in and open browser dev tools**
   - Navigate to login page
   - Open Developer Tools (F12)
   - Go to Network tab
   - Log in with credentials

2. **Make API requests**
   - Navigate to different pages (courses, profile, etc.)
   - Each page load makes API requests

3. **Check request headers**
   - In Network tab, click on any API request
   - Go to "Headers" tab
   - ✅ Expected: See `Authorization: Bearer <token>` header

4. **Log in from another browser**
   - Open a different browser
   - Log in with the same credentials
   - This invalidates the first browser's session

5. **Go back to first browser**
   - Try to navigate to any page
   - Check Network tab for API responses
   - ✅ Expected: API returns 401 with:
     ```json
     {
       "error": "Session expired - logged in from another device",
       "sessionExpired": true,
       "loggedInElsewhere": true
     }
     ```
   - ✅ Expected: Frontend automatically redirects to login

---

## Test 6: Session Cleanup and Monitoring

**Goal**: Verify database tracking and cleanup queries work.

### Database Queries:

1. **Check all active sessions:**
   ```sql
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

2. **Check session statistics:**
   ```sql
   SELECT 
     u.email,
     COUNT(s.id) as total_sessions,
     SUM(CASE WHEN s.valid = TRUE THEN 1 ELSE 0 END) as active_sessions,
     SUM(CASE WHEN s.valid = FALSE THEN 1 ELSE 0 END) as inactive_sessions
   FROM users u
   LEFT JOIN sessions s ON u.id = s.user_id
   GROUP BY u.id, u.email
   HAVING total_sessions > 0
   ORDER BY total_sessions DESC;
   ```

3. **Check current bans:**
   ```sql
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

4. **Clean up old invalid sessions (optional):**
   ```sql
   -- Delete invalid sessions older than 30 days
   DELETE FROM sessions 
   WHERE valid = FALSE 
   AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
   
   -- Check results
   SELECT COUNT(*) as deleted_count FROM sessions WHERE valid = FALSE;
   ```

---

## Test 7: Error Handling and Edge Cases

### Test 7.1: Ban Expiry Edge Case

1. Set a ban that expires in 1 minute:
   ```sql
   INSERT INTO login_bans (user_id, banned_until, reason)
   VALUES (
     (SELECT id FROM users WHERE email = 'user@example.com'),
     DATE_ADD(NOW(), INTERVAL 1 MINUTE),
     'Test ban'
   );
   ```

2. Try to log in immediately → Should fail
3. Wait 61 seconds
4. Try to log in again → Should succeed

### Test 7.2: Multiple Logout Attempts

1. Log in successfully
2. Click logout button multiple times quickly
3. ✅ Expected: No errors, ban is set only once
4. Check database:
   ```sql
   SELECT COUNT(*) FROM login_bans 
   WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');
   ```
5. ✅ Expected: Only 1 ban record (not multiple)

### Test 7.3: Token Expiration vs Session Expiration

1. Log in with a very short token expiry (requires changing JWT_EXPIRES_IN to `1m`)
2. Wait 2 minutes
3. Try to make an API request
4. ✅ Expected: Token expired error
5. ✅ Expected: Redirected to login

---

## Test 8: Load Testing (Optional)

### Concurrent Login Test:

1. Create a simple script to test concurrent logins:
   ```bash
   # Install httpie if needed: pip install httpie
   
   # Test 10 concurrent logins
   for i in {1..10}; do
     http POST localhost:5001/api/auth/login \
       email=user@example.com \
       password=password123 &
   done
   wait
   ```

2. Check database:
   ```sql
   SELECT COUNT(*) as valid_sessions
   FROM sessions
   WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
   AND valid = TRUE;
   ```

3. ✅ Expected: Only 1 valid session (the last one)

---

## Common Issues and Troubleshooting

### Issue 1: "Session expired" immediately after login

**Cause:** Tables don't exist or JWT doesn't include sessionId

**Fix:**
```sql
-- Check if tables exist
SHOW TABLES LIKE 'sessions';
SHOW TABLES LIKE 'login_bans';

-- If missing, run migration
SOURCE backend/migrations/create_session_and_ban_tables.sql;
```

### Issue 2: One-tab policy not working

**Cause:** localStorage blocked or different origins

**Check:**
1. Open browser console in both tabs
2. Type: `localStorage.getItem('activeTabId')`
3. If null or error, localStorage is blocked

**Fix:** Enable localStorage in browser settings

### Issue 3: Ban not expiring

**Cause:** Server timezone mismatch

**Check:**
```sql
SELECT NOW() as current_time, @@global.time_zone, @@session.time_zone;
```

**Fix:** Ensure MySQL and application server use same timezone

---

## Success Criteria

All tests pass when:

✅ **Test 1**: Only one session is active per user, old sessions invalidated
✅ **Test 2**: 1-hour ban prevents immediate re-login after logout
✅ **Test 3**: Opening new tab logs out old tab automatically  
✅ **Test 4**: Sessions track IP address and user-agent correctly
✅ **Test 5**: Invalid sessions get 401 error on API requests
✅ **Test 6**: Database queries show correct session states
✅ **Test 7**: Edge cases handled gracefully without errors
✅ **Test 8**: System handles concurrent logins correctly

---

## Next Steps After Testing

1. **Monitor Production**: Set up alerts for unusual patterns
   - Multiple logins from different IPs for same user
   - High frequency of login bans
   - Sessions that never update last_activity

2. **Set Up Cleanup Cron Job**:
   ```bash
   # Add to crontab (runs daily at 3 AM)
   0 3 * * * mysql -u user -p database < /path/to/cleanup.sql
   ```

3. **Create Admin Dashboard** (optional):
   - Show active sessions per user
   - Display ban status and remaining time
   - Allow manual ban removal for support

4. **Add Monitoring Metrics**:
   - Track average session duration
   - Monitor ban trigger frequency
   - Alert on suspicious multi-IP logins
