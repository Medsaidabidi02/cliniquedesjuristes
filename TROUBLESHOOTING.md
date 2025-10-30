# Troubleshooting Guide

## Common Issues and Solutions

### Frontend Build Error: Cannot find module '@fingerprintjs/fingerprintjs'

**Error:**
```
ERROR in src/lib/deviceFingerprint.ts:1:27
TS2307: Cannot find module '@fingerprintjs/fingerprintjs' or its corresponding type declarations.
> 1 | import FingerprintJS from '@fingerprintjs/fingerprintjs';
```

**Cause:** This error indicates you have a local file `src/lib/deviceFingerprint.ts` that is **NOT part of this repository**. Someone created this file locally, and it's trying to import a package that isn't installed and isn't needed.

**The session system does NOT use device fingerprinting.** It uses IP address + User-Agent for device detection.

**Solution:**

1. **Delete the file:**
   ```bash
   cd frontend
   rm src/lib/deviceFingerprint.ts
   ```

2. **Remove any imports:**
   Search your code for any imports of `deviceFingerprint` and remove them:
   ```bash
   # Search for imports
   grep -r "deviceFingerprint" src/
   
   # If found, remove those import lines
   ```

3. **Clean build:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm start
   ```

4. **Verify it's not tracked by git:**
   ```bash
   git status
   # The file should NOT appear (it's now in .gitignore)
   ```

**Why this happened:** The file `deviceFingerprint.ts` is now in `.gitignore` to prevent this issue. If you created it for testing, it's not needed - the session system already handles device detection using IP + User-Agent.

### Admin Cannot Login After Fresh Database Setup

**Issue:** Admin account shows "session already active" error even with fresh database.

**Root Causes:**
1. Migration script not run properly
2. Admin account not marked as `is_admin = TRUE` in database
3. Admin account not marked as `is_approved = TRUE` in database

**Solutions:**

1. **Run the migration script:**
   ```bash
   cd backend
   node run-migration.js
   ```

2. **Verify admin account in database:**
   ```sql
   SELECT id, email, is_admin, is_approved FROM users WHERE email = 'admin@example.com';
   ```
   
   Both `is_admin` and `is_approved` should be `1` (TRUE).

3. **Manually set admin flags if needed:**
   ```sql
   UPDATE users SET is_admin = TRUE, is_approved = TRUE WHERE email = 'admin@example.com';
   ```

4. **Clear any stale sessions:**
   ```sql
   DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = 'admin@example.com');
   DELETE FROM login_attempts WHERE user_id = (SELECT id FROM users WHERE email = 'admin@example.com');
   ```

### Session System Not Working

**Symptoms:**
- Users can login from multiple devices
- No session blocking occurring
- "Table doesn't exist" errors in backend logs

**Solution:**
1. Run the migration script to create the required tables:
   ```bash
   cd backend
   node run-migration.js
   ```

2. Verify tables exist:
   ```sql
   SHOW TABLES LIKE 'sessions';
   SHOW TABLES LIKE 'login_attempts';
   ```

3. Check table structure:
   ```sql
   DESCRIBE sessions;
   DESCRIBE login_attempts;
   ```

### Backend Won't Start - TypeScript Errors

**Solution:**
```bash
cd backend
npm install
npm run build
```

If errors persist, delete `node_modules` and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Frontend Won't Start - Dependencies Missing

**Solution:**
```bash
cd frontend
npm install
npm start
```

If errors persist:
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

## Admin Privileges

Admin users have special privileges:
- ✅ Bypass all session restrictions
- ✅ Can login from multiple devices simultaneously
- ✅ No cooldown applied
- ✅ No approval check (can login even if `is_approved = FALSE`)
- ✅ No session enforcement

Regular users have restrictions:
- ❌ Only one active session at a time
- ❌ Progressive cooldown after 5 failed attempts from different devices
- ❌ Must be approved (`is_approved = TRUE`)
- ❌ Cannot login if another session is active

## Need More Help?

Check the main documentation:
- `SESSION_MANAGEMENT_GUIDE.md` - Complete technical documentation
- `README.md` - General project documentation
