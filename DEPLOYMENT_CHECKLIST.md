# Deployment Checklist - Progressive Cooldown System

## Pre-Deployment

### 1. Database Backup
- [ ] Create full database backup
- [ ] Verify backup is restorable
- [ ] Document current table structures

### 2. Environment Preparation
- [ ] Review and set JWT_SECRET in production
- [ ] Set JWT_EXPIRES_IN appropriately (recommend 1h for production)
- [ ] Ensure NODE_ENV=production
- [ ] Configure database connection strings

### 3. Code Review
- [ ] All changes reviewed and approved
- [ ] No console.log statements with sensitive data
- [ ] Rate limits configured appropriately
- [ ] CORS settings verified for production domains

## Deployment Steps

### Step 1: Database Migration
```bash
# Connect to production database
mysql -h your-db-host -u your-user -p your-database

# Run migration (IMPORTANT: Do this first!)
source backend/migrations/add_progressive_cooldown_support.sql

# Verify tables were created
SHOW TABLES LIKE 'device_switch_tracking';
SHOW TABLES LIKE 'sessions';
SHOW TABLES LIKE 'login_bans';

# Verify columns were added
DESCRIBE sessions;
DESCRIBE login_bans;
```

**Expected Results:**
- `sessions` table should have: `device_fingerprint`, `owner_label`, `is_active` columns
- `login_bans` table should have: `cooldown_level`, `switch_count` columns
- `device_switch_tracking` table should exist

### Step 2: Backend Deployment
```bash
# Build backend
cd backend
npm install
npm run build

# Test backend starts without errors
npm start

# Verify endpoints respond
curl http://localhost:5001/api/health
```

### Step 3: Frontend Deployment
```bash
# Build frontend
cd frontend
npm install
npm run build

# For production, copy build to appropriate location
# (depends on your deployment setup)
```

### Step 4: Smoke Tests

#### Test 1: Login Works
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

Expected: 200 OK with token and ownerLabel

#### Test 2: Session Ping Works
```bash
curl -X POST http://localhost:5001/api/auth/session/ping \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: 200 OK

#### Test 3: Admin Endpoints Work (if admin)
```bash
curl http://localhost:5001/api/admin/sessions/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Expected: 200 OK with stats

### Step 5: Monitoring Setup

#### Create Cleanup Cron Job
```bash
# Edit crontab
crontab -e

# Add daily cleanup at 2 AM
0 2 * * * curl -X POST http://localhost:5001/api/admin/sessions/cleanup \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cleanSessions":true,"cleanBans":true,"cleanSwitches":true,"cleanStale":true}' \
  >> /var/log/session-cleanup.log 2>&1
```

#### Setup Monitoring Queries
```sql
-- Active sessions
SELECT COUNT(*) FROM sessions WHERE valid = TRUE AND is_active = TRUE;

-- Active bans
SELECT COUNT(*) FROM login_bans WHERE banned_until > NOW();

-- Device switches in last 24h
SELECT COUNT(*) FROM device_switch_tracking 
WHERE switch_timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

## Post-Deployment Verification

### Functional Tests

#### Test 1: Single Session Enforcement
- [ ] Login from Device A
- [ ] Login from Device B (same account)
- [ ] Verify Device A gets "logged in elsewhere" error on next request
- [ ] Verify Device B can access protected endpoints

#### Test 2: Progressive Cooldown
- [ ] Login and immediately logout
- [ ] Try to login again
- [ ] Verify 1 hour cooldown message
- [ ] (Optionally) Clear ban from admin panel and verify login works

#### Test 3: Same Device Exemption
- [ ] Login from Chrome
- [ ] Login from Firefox (same computer)
- [ ] Verify no excessive cooldown (may still get 1h from logout, but not escalated)

#### Test 4: One-Tab Policy
- [ ] Login in one tab
- [ ] Open new tab with same URL
- [ ] Verify second tab shows "Another tab is active" overlay

#### Test 5: Session Health Check
- [ ] Login and wait 6+ minutes
- [ ] Make an API call
- [ ] Verify session is still valid (last_activity updated)

#### Test 6: Admin Controls
- [ ] Login as admin
- [ ] View user sessions: GET /api/admin/sessions/user/123
- [ ] Force logout: POST /api/admin/sessions/invalidate-user/123
- [ ] Clear ban: DELETE /api/admin/sessions/ban/123
- [ ] View device switches: GET /api/admin/sessions/device-switches/123

### Performance Tests

#### Check Response Times
```bash
# Login endpoint (should be < 500ms)
time curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Session ping (should be < 100ms)
time curl -X POST http://localhost:5001/api/auth/session/ping \
  -H "Authorization: Bearer TOKEN"
```

#### Check Database Performance
```sql
-- Should use index, check with EXPLAIN
EXPLAIN SELECT * FROM sessions 
WHERE user_id = 123 AND valid = TRUE AND is_active = TRUE;

-- Should be fast (< 10ms)
SELECT COUNT(*) FROM device_switch_tracking 
WHERE user_id = 123 AND switch_timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

### Security Verification

#### Rate Limiting
- [ ] Attempt 6 logins rapidly
- [ ] Verify rate limit error after 5 attempts
- [ ] Wait 15 minutes and verify can login again

#### Session Invalidation
- [ ] Login and get token
- [ ] Logout
- [ ] Try to use old token
- [ ] Verify 401 Unauthorized error

#### Device Fingerprinting
- [ ] Check browser console for fingerprint generation
- [ ] Verify fingerprint is included in login request
- [ ] Check backend logs for fingerprint matching

## Rollback Plan

### If Issues Occur

#### Quick Rollback (No Database Changes)
```bash
# Revert to previous code version
git checkout previous-commit

# Rebuild and deploy
npm run build
npm start
```

#### Full Rollback (With Database Changes)
```sql
-- Revert database changes
DROP TABLE IF EXISTS device_switch_tracking;
ALTER TABLE sessions DROP COLUMN device_fingerprint;
ALTER TABLE sessions DROP COLUMN owner_label;
ALTER TABLE sessions DROP COLUMN is_active;
ALTER TABLE login_bans DROP COLUMN cooldown_level;
ALTER TABLE login_bans DROP COLUMN switch_count;

-- Restore from backup if needed
```

**Note:** If sessions have been created with new schema, recommend leaving schema in place and just reverting code. The old code will ignore new columns gracefully.

## Monitoring After Deployment

### Day 1
- [ ] Check error logs every hour
- [ ] Monitor active sessions count
- [ ] Monitor failed login attempts
- [ ] Check for unusual ban patterns

### Week 1
- [ ] Review session statistics daily
- [ ] Check for any user complaints
- [ ] Monitor device switch frequency
- [ ] Review cooldown effectiveness

### Ongoing
- [ ] Weekly review of session stats
- [ ] Monthly cleanup of old data
- [ ] Quarterly review of cooldown thresholds
- [ ] Update documentation as needed

## Success Criteria

- [ ] All tests passing
- [ ] No increase in error rates
- [ ] User login success rate stable
- [ ] Session management working as expected
- [ ] Admin controls functional
- [ ] No security vulnerabilities detected
- [ ] Performance within acceptable range
- [ ] Monitoring and alerts configured
- [ ] Documentation complete and accessible
- [ ] Team trained on new system

## Contact and Escalation

**For Issues:**
1. Check logs: backend/logs and frontend browser console
2. Review troubleshooting guide in PROGRESSIVE_COOLDOWN_DOCS.md
3. Check database for unexpected states
4. If critical, execute rollback plan
5. Document issue and resolution for future reference

## Sign-off

- [ ] Database migration verified
- [ ] Backend deployed and tested
- [ ] Frontend deployed and tested
- [ ] Functional tests passed
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team notified

**Deployed by:** _________________  
**Date:** _________________  
**Environment:** Production / Staging / Development  
**Version/Commit:** _________________
