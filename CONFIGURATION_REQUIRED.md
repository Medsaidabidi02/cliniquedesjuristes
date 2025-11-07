# ⚠️ IMPORTANT: Configuration Required for Video Playback

## Issue: Videos Still Pulling from Localhost?

If you see videos pulling from `localhost` in the Network tab instead of Hetzner, **you need to configure your environment variables**.

The code is ready and working, but it requires YOUR Hetzner credentials to function.

## Quick Fix (3 Steps)

### Step 1: Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and **replace placeholder values**:

```env
# CRITICAL: Set these to YOUR actual values!
ENABLE_HETZNER=true
HETZNER_ENDPOINT=https://fsn1.YOUR-ACTUAL-ENDPOINT.com
HETZNER_BUCKET=your-actual-bucket-name
```

### Step 2: Restart Backend

```bash
cd backend
npm run dev
```

Look for this in the logs:
```
🎬 Hetzner HLS enabled: true
```

If you see `false`, your `.env` is not configured correctly.

### Step 3: Verify in Browser

1. Open DevTools → Network tab
2. Filter by `.m3u8`
3. Play a video
4. Check the Request URL - should be `https://YOUR-HETZNER-ENDPOINT/...`

## Automatic Configuration Checker

Run this script to verify your configuration:

```bash
./check-config.sh
```

It will check:
- ✓ `.env` files exist
- ✓ Hetzner credentials are set
- ✓ Backend is configured correctly
- ✓ API returns Hetzner URLs

## Why This Happens

The application **requires** Hetzner credentials to generate public URLs. Without them:

**Backend Logic:**
```typescript
export const getPublicVideoUrl = (videoPath: string): string => {
  if (!config.hetzner.enabled) {
    throw new Error('Hetzner storage is not enabled');  // ← You see this error
  }
  
  // Build URL from YOUR Hetzner credentials
  return `${HETZNER_ENDPOINT}/${HETZNER_BUCKET}/${videoPath}`;
}
```

**Without configuration:**
- `ENABLE_HETZNER` is not `true` → Function throws error
- `HETZNER_ENDPOINT` is empty → Cannot build URL
- Backend returns `null` for `hls_url`

**With correct configuration:**
- Backend generates: `https://fsn1.your-endpoint.com/your-bucket/videos/path/output.m3u8`
- Frontend plays from Hetzner
- Network tab shows Hetzner requests ✓

## Common Mistakes

### ❌ Mistake 1: Not creating `.env` file

**Wrong:**
```bash
# Just using .env.example
```

**Correct:**
```bash
cp .env.example .env
# Then edit .env with your values
```

### ❌ Mistake 2: Leaving placeholder values

**Wrong:**
```env
HETZNER_ENDPOINT=https://fsn1.your-objectstorage.com  # Still placeholder!
```

**Correct:**
```env
HETZNER_ENDPOINT=https://fsn1.actual-hetzner-endpoint.com  # Your real endpoint
```

### ❌ Mistake 3: Not restarting backend

**Wrong:**
```bash
# Edit .env but don't restart
```

**Correct:**
```bash
# After editing .env:
npm run dev  # Restart to load new config
```

### ❌ Mistake 4: ENABLE_HETZNER not exactly "true"

**Wrong:**
```env
ENABLE_HETZNER=True   # Capital T
ENABLE_HETZNER=TRUE   # All caps
ENABLE_HETZNER=1      # Number
```

**Correct:**
```env
ENABLE_HETZNER=true   # Lowercase "true"
```

## Detailed Guides

- **DIAGNOSTIC_GUIDE.md** - Step-by-step troubleshooting
- **TESTING_GUIDE.md** - How to test Hetzner integration
- **QUICK_START.md** - Complete setup workflow
- **HETZNER_SETUP.md** - Hetzner bucket configuration

## Need Help?

1. Run `./check-config.sh` to verify your configuration
2. Check backend logs for errors
3. See DIAGNOSTIC_GUIDE.md for detailed troubleshooting
4. Verify your Hetzner credentials in Hetzner Cloud Console

## Summary

✅ Code is working and ready
✅ You just need to add YOUR Hetzner credentials
✅ Edit `backend/.env` with your actual values
✅ Restart backend
✅ Videos will pull from Hetzner

**The application CANNOT pull from Hetzner without YOUR credentials configured!**
