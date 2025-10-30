# Quick Setup Guide - Session System

## For Database Administrators

This guide provides quick setup instructions for the session-based login system.

---

## Step 1: Backup Database (IMPORTANT!)

Before making any changes, create a backup:

```bash
mysqldump -u your_user -p your_database > backup_before_session_system_$(date +%Y%m%d).sql
```

---

## Step 2: Run Migration

Connect to your database and run the migration script:

### Option A: Using MySQL Command Line

```bash
mysql -u your_user -p your_database < backend/migrations/create_session_and_ban_tables.sql
```

### Option B: Using phpMyAdmin or Database GUI

1. Open phpMyAdmin or your database management tool
2. Select your database
3. Go to "SQL" tab
4. Copy and paste the contents of `backend/migrations/create_session_and_ban_tables.sql`
5. Click "Go" or "Execute"

### Option C: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your database
3. File → Open SQL Script
4. Select `backend/migrations/create_session_and_ban_tables.sql`
5. Click Execute (⚡ icon)

---

## Step 3: Verify Tables Created

Run this query to verify tables were created successfully:

```sql
-- Check if tables exist
SHOW TABLES LIKE 'sessions';
SHOW TABLES LIKE 'login_bans';

-- Check table structure
DESCRIBE sessions;
DESCRIBE login_bans;
```

**Expected output:**

```
+----------------+--------------+------+-----+-------------------+
| Field          | Type         | Null | Key | Default           |
+----------------+--------------+------+-----+-------------------+
| id             | varchar(255) | NO   | PRI | NULL              |
| user_id        | int          | NO   | MUL | NULL              |
| valid          | tinyint(1)   | YES  |     | 1                 |
| created_at     | timestamp    | YES  |     | CURRENT_TIMESTAMP |
| ip_address     | varchar(45)  | YES  |     | NULL              |
| user_agent     | varchar(512) | YES  |     | NULL              |
| last_activity  | timestamp    | YES  |     | NULL              |
+----------------+--------------+------+-----+-------------------+

+--------------+--------------+------+-----+-------------------+
| Field        | Type         | Null | Key | Default           |
+--------------+--------------+------+-----+-------------------+
| id           | int          | NO   | PRI | NULL              |
| user_id      | int          | NO   | UNI | NULL              |
| banned_until | datetime     | NO   |     | NULL              |
| reason       | varchar(255) | YES  |     | NULL              |
| created_at   | timestamp    | YES  |     | CURRENT_TIMESTAMP |
+--------------+--------------+------+-----+-------------------+
```

---

## Step 4: Restart Backend Server

After database changes, restart your backend:

```bash
cd backend
npm run build
npm start
```

Or if using PM2:

```bash
pm2 restart backend
```

Or if running as a service:

```bash
sudo systemctl restart your-backend-service
```

---

## Step 5: Test the System

### Quick Test:

1. Log in to the application with test credentials
2. Check if session is created:
   ```sql
   SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1;
   ```
3. Log out
4. Check if ban is created:
   ```sql
   SELECT * FROM login_bans ORDER BY created_at DESC LIMIT 1;
   ```

### Full Testing:

See `TESTING_GUIDE.md` for comprehensive testing procedures.

---

## Optional: Set Up Cleanup Cron Job

Old invalid sessions should be cleaned up periodically.

### Create cleanup script:

**File: `/opt/scripts/cleanup_sessions.sql`**
```sql
-- Delete invalid sessions older than 30 days
DELETE FROM sessions 
WHERE valid = FALSE 
AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Delete expired bans
DELETE FROM login_bans 
WHERE banned_until < NOW();

-- Show cleanup results
SELECT 
  (SELECT COUNT(*) FROM sessions WHERE valid = TRUE) as active_sessions,
  (SELECT COUNT(*) FROM sessions WHERE valid = FALSE) as invalid_sessions,
  (SELECT COUNT(*) FROM login_bans WHERE banned_until > NOW()) as active_bans;
```

### Add to crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 3 AM)
0 3 * * * mysql -u your_user -pYOUR_PASSWORD your_database < /opt/scripts/cleanup_sessions.sql >> /var/log/session_cleanup.log 2>&1
```

**Note:** Replace `your_user`, `YOUR_PASSWORD`, and `your_database` with actual values.

---

## Monitoring Queries

### Check system health:

```sql
-- Active sessions per user
SELECT 
  u.email,
  COUNT(s.id) as active_sessions,
  MAX(s.last_activity) as last_seen
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.valid = TRUE
GROUP BY u.id, u.email
HAVING active_sessions > 0
ORDER BY active_sessions DESC, last_seen DESC;

-- Current bans
SELECT 
  u.email,
  lb.banned_until,
  TIMESTAMPDIFF(MINUTE, NOW(), lb.banned_until) as remaining_minutes,
  lb.reason
FROM login_bans lb
JOIN users u ON lb.user_id = u.id
WHERE lb.banned_until > NOW()
ORDER BY lb.banned_until;

-- Session activity in last 24 hours
SELECT 
  DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
  COUNT(*) as sessions_created
FROM sessions
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')
ORDER BY hour;
```

---

## Rollback Procedure (If Needed)

If you need to rollback the changes:

### 1. Stop backend server

```bash
pm2 stop backend
# or
sudo systemctl stop your-backend-service
```

### 2. Drop the new tables

```sql
DROP TABLE IF EXISTS login_bans;
DROP TABLE IF EXISTS sessions;
```

### 3. Restore from backup

```bash
mysql -u your_user -p your_database < backup_before_session_system_YYYYMMDD.sql
```

### 4. Revert code changes

```bash
git checkout main
git pull origin main
cd backend
npm run build
npm start
```

---

## Troubleshooting

### Problem: "Table doesn't exist" errors in logs

**Solution:** 
The migration wasn't run. Follow Step 2 again.

### Problem: Foreign key constraint errors

**Cause:** Users table doesn't exist or has different structure

**Solution:**
```sql
-- Check users table structure
DESCRIBE users;

-- If 'id' column is different type, migration needs adjustment
-- Contact development team
```

### Problem: Bans not expiring

**Cause:** Server timezone mismatch

**Check:**
```sql
SELECT 
  NOW() as current_time,
  @@global.time_zone as global_tz,
  @@session.time_zone as session_tz;
```

**Solution:**
Set MySQL timezone to match server:
```sql
SET GLOBAL time_zone = '+00:00';  -- Use UTC
-- or
SET GLOBAL time_zone = 'Europe/Paris';  -- Use specific timezone
```

Then restart MySQL:
```bash
sudo systemctl restart mysql
```

---

## Performance Considerations

### Indexes

The migration creates these indexes automatically:
- `sessions.user_id` - For fast user session lookups
- `sessions.valid` - For filtering active sessions
- `sessions.created_at` - For cleanup queries
- `login_bans.banned_until` - For ban expiry checks

### Table Sizes

Expected growth:
- **sessions**: ~100-500 bytes per row
  - If 1000 users, ~10 sessions/user = 10,000 rows ≈ 5 MB
  - With 30-day cleanup, stable size
  
- **login_bans**: ~50-100 bytes per row
  - Max one ban per user
  - Auto-expires after 1 hour
  - Minimal storage impact

### Database Load

Additional queries per request:
- **Login**: 3-4 queries (ban check, session invalidation, session creation, ban creation on logout)
- **Authenticated request**: 2 queries (session validation, last_activity update)

Impact: Negligible for most applications. Session table is indexed and queries are fast.

---

## Production Checklist

Before deploying to production:

- [ ] Database backup created
- [ ] Migration tested on staging environment
- [ ] Tables created successfully
- [ ] Backend server restarted
- [ ] Login/logout tested
- [ ] Session validation tested  
- [ ] Ban system tested
- [ ] Cleanup cron job configured
- [ ] Monitoring queries added to admin tools
- [ ] Team notified of changes
- [ ] Documentation shared with support team
- [ ] Rollback procedure tested

---

## Support Contacts

If you encounter issues:

1. Check `TESTING_GUIDE.md` for common problems
2. Review backend logs: `tail -f /path/to/backend/logs`
3. Check MySQL error log: `tail -f /var/log/mysql/error.log`
4. Contact development team with:
   - Error messages from logs
   - Results of verification queries (Step 3)
   - MySQL version: `SELECT VERSION();`

---

## Additional Resources

- **Complete Documentation**: `SESSION_SYSTEM_README.md`
- **Testing Guide**: `TESTING_GUIDE.md`
- **Migration Script**: `backend/migrations/create_session_and_ban_tables.sql`
