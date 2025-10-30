# Quick Start Testing Guide - Progressive Cooldown System

## Overview
This guide provides step-by-step instructions to manually test all features of the progressive cooldown single-session authentication system.

## Prerequisites
- Backend server running
- Frontend server running
- Test user account created and approved
- Admin user account for admin tests
- Two different browsers (e.g., Chrome and Firefox) or devices

## Test Suite

### Test 1: Basic Login and Session Creation

**Objective:** Verify login creates a session with all metadata

**Steps:**
1. Open browser and navigate to login page
2. Open browser DevTools (F12) → Network tab
3. Login with test credentials
4. Check Response in Network tab for login request

**Expected Results:**
- ✅ Login successful (200 OK)
- ✅ Response includes `token`, `user`, and `ownerLabel`
- ✅ ownerLabel shows OS, browser, and timestamp (e.g., "Windows 10 — Chrome at 2025-10-30 14:22")
- ✅ Console shows device fingerprint generated
- ✅ Session health check started

**SQL Verification:**
```sql
SELECT id, user_id, valid, is_active, owner_label, device_fingerprint, last_activity 
FROM sessions 
WHERE user_id = YOUR_USER_ID 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Test 2: Single Session Enforcement (Cross-Device)

**Objective:** Verify only one active session per user

**Steps:**
1. Login in Browser A (e.g., Chrome)
2. Note the session details
3. Login with same account in Browser B (e.g., Firefox)
4. Return to Browser A
5. Try to access any protected page (e.g., courses)

**Expected Results:**
- ✅ Browser B login succeeds
- ✅ Browser A shows "logged in elsewhere" error on next API call
- ✅ Browser A redirects to login page
- ✅ Login page shows session message about being logged in elsewhere

**SQL Verification:**
```sql
-- Should show 2 sessions: one active (Browser B), one inactive (Browser A)
SELECT id, valid, is_active, owner_label 
FROM sessions 
WHERE user_id = YOUR_USER_ID 
ORDER BY created_at DESC 
LIMIT 2;
```

---

### Test 3: First Device Switch - 1 Hour Cooldown

**Objective:** Verify first device switch triggers 1-hour cooldown

**Steps:**
1. Login in Browser A
2. Click Logout
3. Immediately try to login again in Browser A

**Expected Results:**
- ✅ Logout successful
- ✅ Login attempt shows cooldown error
- ✅ Error message: "Compte temporairement verrouillé. Réessayez dans 60 minutes."
- ✅ Error includes remaining time and cooldown level

**SQL Verification:**
```sql
-- Should show active ban
SELECT user_id, banned_until, cooldown_level, switch_count, reason 
FROM login_bans 
WHERE user_id = YOUR_USER_ID;

-- Should show device switch recorded
SELECT * FROM device_switch_tracking 
WHERE user_id = YOUR_USER_ID 
ORDER BY switch_timestamp DESC 
LIMIT 1;
```

---

### Test 4: Progressive Cooldown Escalation

**Objective:** Verify cooldown escalates to 6h and 24h

**Steps:**
1. Clear ban: `DELETE FROM login_bans WHERE user_id = YOUR_USER_ID;`
2. Login from Device A → Logout
3. Login from Device B → Logout (2nd switch)
4. Try to login from Device A

**Expected Results:**
- ✅ After 2nd switch: "Réessayez dans 6 heures"
- ✅ Cooldown level should be 2

**For 24-hour test:**
5. Clear ban again
6. Perform 4 device switches within 24 hours
7. Try to login

**Expected Results:**
- ✅ After 4th switch: "Réessayez dans 24 heures"
- ✅ Cooldown level should be 3

**SQL Verification:**
```sql
-- Check switch count
SELECT COUNT(*) as switches 
FROM device_switch_tracking 
WHERE user_id = YOUR_USER_ID 
AND switch_timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR);

-- Check ban level
SELECT cooldown_level, switch_count 
FROM login_bans 
WHERE user_id = YOUR_USER_ID;
```

---

### Test 5: Same Device Exemption

**Objective:** Verify same device doesn't trigger excessive cooldown

**Steps:**
1. Clear any existing bans
2. Login in Chrome on Computer A
3. Logout
4. Login in Firefox on Computer A (same physical device)
5. Logout
6. Try to login again

**Expected Results:**
- ✅ May get 1-hour cooldown from logout
- ✅ Should NOT escalate to 6h or 24h
- ✅ Device fingerprints should be similar/same in database

**SQL Verification:**
```sql
-- Check if device fingerprints match
SELECT device_fingerprint, owner_label 
FROM sessions 
WHERE user_id = YOUR_USER_ID 
ORDER BY created_at DESC 
LIMIT 3;
```

---

### Test 6: One-Tab Policy

**Objective:** Verify only one tab can be active

**Steps:**
1. Login in Tab 1
2. Copy the URL
3. Open Tab 2 with same URL (Ctrl+T, paste)
4. Check Tab 1

**Expected Results:**
- ✅ Tab 2 shows black overlay with message
- ✅ Message: "Another tab is active"
- ✅ Instructions to use other tab or close it
- ✅ Tab 1 remains functional

**Alternative Test:**
1. Have Tab 1 active
2. Refresh Tab 2
3. Tab 1 should become inactive (overlay appears)
4. Tab 2 becomes active

---

### Test 7: Session Health Check / Keep-Alive

**Objective:** Verify session stays alive with pings

**Steps:**
1. Login
2. Wait 3 minutes (don't interact)
3. Check Network tab for ping requests
4. Wait 6 minutes total
5. Make any API call

**Expected Results:**
- ✅ Ping request sent every 5 minutes
- ✅ Ping endpoint: POST /api/auth/session/ping
- ✅ After 6 minutes, session still valid (no logout)

**SQL Verification:**
```sql
-- last_activity should be recent
SELECT last_activity, 
       TIMESTAMPDIFF(SECOND, last_activity, NOW()) as seconds_since_update 
FROM sessions 
WHERE user_id = YOUR_USER_ID AND valid = TRUE;
```

---

### Test 8: Session Expiry (No Pings)

**Objective:** Verify session expires without activity

**Steps:**
1. Login
2. Stop the frontend (close browser or disable JavaScript)
3. Wait 25+ minutes
4. Check database

**Expected Results:**
- ✅ Session marked as invalid due to inactivity
- ✅ Cleanup job would mark it as stale

**SQL Verification:**
```sql
-- Check last_activity
SELECT last_activity, valid, is_active 
FROM sessions 
WHERE user_id = YOUR_USER_ID 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Test 9: Admin - View Sessions

**Objective:** Verify admin can view user sessions

**Steps:**
1. Login as admin
2. Navigate to admin panel (or use API directly)
3. Call: GET /api/admin/sessions/user/USER_ID

**Expected Results:**
- ✅ Returns list of all sessions for user
- ✅ Shows which sessions are active
- ✅ Displays ownership labels
- ✅ Shows IP addresses and user agents

**Example API Call:**
```bash
curl http://localhost:5001/api/admin/sessions/user/123 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### Test 10: Admin - Force Logout

**Objective:** Verify admin can force invalidate sessions

**Steps:**
1. Test user logs in
2. Admin calls: POST /api/admin/sessions/invalidate-user/USER_ID
3. Test user tries to access protected page

**Expected Results:**
- ✅ Admin call succeeds
- ✅ Test user gets 401 Unauthorized
- ✅ Test user redirected to login

**Example API Call:**
```bash
curl -X POST http://localhost:5001/api/admin/sessions/invalidate-user/123 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### Test 11: Admin - Clear Ban

**Objective:** Verify admin can override cooldowns

**Steps:**
1. User has active cooldown ban
2. Admin calls: DELETE /api/admin/sessions/ban/USER_ID
3. User tries to login

**Expected Results:**
- ✅ Admin call succeeds
- ✅ User can login immediately
- ✅ No cooldown error

**Example API Call:**
```bash
curl -X DELETE http://localhost:5001/api/admin/sessions/ban/123 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### Test 12: Admin - Device Switch History

**Objective:** Verify admin can view device switch analytics

**Steps:**
1. User has performed multiple device switches
2. Admin calls: GET /api/admin/sessions/device-switches/USER_ID

**Expected Results:**
- ✅ Returns list of device switches
- ✅ Shows from/to device fingerprints
- ✅ Shows from/to IP addresses
- ✅ Shows timestamps

**Example API Call:**
```bash
curl http://localhost:5001/api/admin/sessions/device-switches/123?limit=10 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### Test 13: Rate Limiting - Login

**Objective:** Verify login rate limiting prevents brute force

**Steps:**
1. Attempt to login 6 times rapidly with wrong password
2. Check response on 6th attempt

**Expected Results:**
- ✅ First 5 attempts: "Invalid credentials"
- ✅ 6th attempt: "Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes."
- ✅ Status code: 429 Too Many Requests

---

### Test 14: Rate Limiting - Session Ping

**Objective:** Verify ping rate limiting prevents abuse

**Steps:**
1. Login and get token
2. Send 2 ping requests immediately (within 4 minutes)

**Expected Results:**
- ✅ First ping succeeds
- ✅ Second ping gets rate limited
- ✅ Error: "Trop de requêtes de ping. Veuillez attendre."

---

### Test 15: Device Fingerprinting

**Objective:** Verify device fingerprinting is working

**Steps:**
1. Open browser DevTools → Console
2. Login
3. Check console logs

**Expected Results:**
- ✅ Log: "📱 Device fingerprint generated: [hash]..."
- ✅ Fingerprint included in login request payload
- ✅ Backend logs show fingerprint received

---

## Quick Verification Checklist

After running all tests, verify:

- [ ] All tests passed
- [ ] No errors in backend logs
- [ ] No errors in browser console
- [ ] Database tables populated correctly
- [ ] Session ownership labels are human-readable
- [ ] Cooldowns escalate properly
- [ ] Same device detection works
- [ ] One-tab policy functional
- [ ] Session health checks running
- [ ] Admin controls functional
- [ ] Rate limiting active
- [ ] No security vulnerabilities

## Troubleshooting Common Issues

### Issue: Device fingerprint not generated
**Solution:** Check if @fingerprintjs/fingerprintjs is installed. Check browser console for errors.

### Issue: Cooldown not working
**Solution:** Verify device_switch_tracking table exists and is being populated. Check backend logs.

### Issue: One-tab policy not blocking
**Solution:** Ensure localStorage is enabled. Check if both tabs are on same origin.

### Issue: Session ping not happening
**Solution:** Check if sessionHealthCheck is started after login. Verify /api/auth/session/ping endpoint works.

### Issue: Rate limiting too strict
**Solution:** Adjust rate limiter configurations in backend/src/middleware/rateLimiter.ts

## Performance Benchmarks

Target response times:
- Login: < 500ms
- Session ping: < 100ms
- Admin session list: < 200ms
- Device switch query: < 50ms

If any operation exceeds 2x the target, investigate and optimize.

## Automated Testing (Future)

Consider creating automated tests for:
- API endpoint responses
- Database operations
- Rate limiting behavior
- Session lifecycle
- Progressive cooldown logic
- Admin operations

Example test frameworks:
- Backend: Jest, Mocha, Supertest
- Frontend: Jest, React Testing Library, Cypress
- E2E: Playwright, Cypress

## Report Template

After testing, document results:

```
Test Date: _______
Tester: _______
Environment: _______

Test Results:
- Test 1 (Login): ✅ Pass / ❌ Fail - Notes: _______
- Test 2 (Single Session): ✅ Pass / ❌ Fail - Notes: _______
...

Issues Found:
1. _______
2. _______

Recommendations:
1. _______
2. _______

Overall Status: Ready for Production / Needs Work
```
