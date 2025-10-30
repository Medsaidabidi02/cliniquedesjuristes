# Frontend Library Files

This directory contains core frontend utilities and services.

## Important Notes

### Device Fingerprinting (NOT USED)

If you see an error about `deviceFingerprint.ts` or `@fingerprintjs/fingerprintjs`:

```
ERROR: Cannot find module '@fingerprintjs/fingerprintjs'
```

**This is NOT part of the repository.** The session system uses IP + User-Agent for device detection, not device fingerprinting.

**To fix:**
1. Delete the file if you created it locally:
   ```bash
   rm src/lib/deviceFingerprint.ts
   ```
2. Remove any imports of `deviceFingerprint` from your code
3. The file is now in `.gitignore` to prevent future issues

## Existing Files

- `api.ts` - API client for backend communication
- `auth.ts` - Authentication service (login, logout, session management)
- `AuthContext.tsx` - React context for authentication state
- `oneTabPolicy.ts` - Single-tab enforcement (browser tab management)
- `blog.ts` - Blog/article service
- `courses.ts` - Course management service
- `courseService.ts` - Extended course functionality
- `videoService.ts` - Video streaming and management
- `media.ts` - Media file handling

## Session Management

The session system is fully implemented in:
- Backend: `backend/src/routes/auth.ts` - Session enforcement logic
- Frontend: `auth.ts` + `AuthContext.tsx` - Client-side session handling
- UI: `pages/SessionActivePage.tsx` - Session conflict page

Device detection uses:
- IP address (from request)
- User-Agent string (browser/device info)

No additional fingerprinting library is needed or used.
