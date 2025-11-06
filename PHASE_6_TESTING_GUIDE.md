# Phase 6: Comprehensive Testing Guide

## Overview

This guide provides detailed test scenarios and step-by-step instructions for validating the video system after implementing Phases 1-5.

---

## Test Categories

1. **HLS Segmented Video Loading**
2. **Long Playback Sessions**
3. **Token Refresh Mid-Playback**
4. **MP4 Backward Compatibility**
5. **Signed URL Expiration**
6. **Unauthorized Access Prevention**
7. **Course Permissions & User Progress**
8. **Cross-Browser Compatibility**
9. **Performance Testing**
10. **Error Handling**

---

## 1. HLS Segmented Video Loading

### Test 1.1: HLS Video Loads Successfully

**Objective:** Verify HLS videos load and play correctly.

**Prerequisites:**
- At least one HLS video uploaded to Hetzner
- Video entry in database with `.m3u8` path

**Steps:**

1. **Prepare Test Video:**
   ```bash
   # Upload HLS video to Hetzner (if not done)
   aws s3 sync ./hls-test-video/ \
     s3://clinique-videos/hls/course-1/subject-1/video-1/ \
     --endpoint-url https://fsn1.your-objectstorage.com
   ```

2. **Add Video Entry via Admin Panel:**
   - Go to: `/admin/videos`
   - Click: "Ajouter une Vidéo"
   - Select: Course and Subject
   - Toggle to: 🎞️ HLS mode
   - Enter path: `hls/course-1/subject-1/video-1/playlist.m3u8`
   - Select: Hetzner Object Storage
   - Submit

3. **Play Video:**
   - Navigate to course page
   - Click on the HLS video
   - Observe video player

**Expected Results:**
- ✅ Video player loads
- ✅ "Loading video..." appears briefly
- ✅ HLS badge visible (top-right corner)
- ✅ Video starts playing within 3 seconds
- ✅ Console shows: "🎬 HLS video detected, initializing HLS player"
- ✅ Console shows: "✅ HLS manifest loaded successfully"
- ✅ Video playback is smooth

**Failure Cases:**
- ❌ "Error playing video" → Check Hetzner credentials
- ❌ Infinite loading → Check manifest path
- ❌ 403 Forbidden → Verify signed URL generation

### Test 1.2: HLS Segments Load Progressively

**Objective:** Verify segments load on-demand (not all at once).

**Steps:**

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by: "ts" or "m3u8"
4. Play HLS video
5. Observe network requests

**Expected Results:**
- ✅ `playlist.m3u8` loads first
- ✅ `segment-0.ts` loads (first segment)
- ✅ `segment-1.ts` loads (second segment)
- ✅ Segments load progressively as video plays
- ✅ Not all segments load at once
- ✅ Each segment has signed URL with signature parameter

**Performance Check:**
- Initial manifest load: < 500ms
- First segment load: < 1000ms
- Subsequent segments: < 500ms

### Test 1.3: HLS Quality Adaptation (if multiple qualities)

**Objective:** Verify player adapts to network conditions.

**Prerequisites:**
- HLS video with multiple quality levels

**Steps:**

1. Play HLS video with multiple qualities
2. Open browser DevTools → Network tab
3. Throttle network to "Fast 3G"
4. Observe quality changes
5. Switch to "4G" or no throttling
6. Observe quality improves

**Expected Results:**
- ✅ Player starts with appropriate quality for network
- ✅ Quality decreases on slow network
- ✅ Quality increases on fast network
- ✅ Transitions are smooth (no buffering)

---

## 2. Long Playback Sessions

### Test 2.1: Multi-Hour Playback

**Objective:** Verify videos play continuously for extended periods.

**Steps:**

1. Start playing a long HLS video (> 1 hour)
2. Let it play for 2+ hours
3. Monitor for interruptions
4. Check token refreshes occur

**Expected Results:**
- ✅ Video plays continuously without stops
- ✅ Token refreshes occur automatically (every ~12 minutes)
- ✅ Console shows: "⏰ Scheduling URL refresh in X seconds"
- ✅ Console shows: "🔄 Refreshing video URL..."
- ✅ Console shows: "✅ Video URL refreshed successfully"
- ✅ No visible playback interruption during refresh
- ✅ Video position is maintained
- ✅ Playing state is preserved

**Test Duration:**
- Minimum: 30 minutes
- Recommended: 2 hours
- Extreme: 4+ hours

### Test 2.2: Pause and Resume During Long Session

**Objective:** Verify pause/resume works with token refresh.

**Steps:**

1. Start playing HLS video
2. Wait 5 minutes
3. Pause video
4. Wait 10 minutes (token should refresh)
5. Resume playback

**Expected Results:**
- ✅ Video pauses correctly
- ✅ Token refresh occurs even when paused
- ✅ Console shows refresh messages
- ✅ Resume works smoothly
- ✅ Video continues from paused position
- ✅ No buffering or errors

---

## 3. Token Refresh Mid-Playback

### Test 3.1: Automatic Token Refresh at 80%

**Objective:** Verify token refreshes at 80% of expiration time.

**Configuration:**
```env
VIDEO_URL_EXPIRATION=900  # 15 minutes
TOKEN_REFRESH_THRESHOLD=0.8  # 80%
```

**Calculation:**
- Expiration: 900 seconds (15 minutes)
- Refresh at: 720 seconds (12 minutes)

**Steps:**

1. Configure short expiration for testing:
   ```env
   VIDEO_URL_EXPIRATION=60  # 1 minute (for testing)
   ```

2. Restart backend server
3. Open browser console
4. Play HLS video
5. Observe console logs
6. Watch for refresh at ~48 seconds (80% of 60s)

**Expected Results:**
- ✅ Initial URL logged with expiration time
- ✅ Timer set for 48 seconds (80% of 60s)
- ✅ At ~48 seconds: "🔄 Refreshing video URL..."
- ✅ New URL received
- ✅ Video continues playing seamlessly
- ✅ Console shows: "✅ Video URL refreshed successfully"
- ✅ Current playback time maintained
- ✅ No visible glitch or pause

**Restore Configuration:**
```env
VIDEO_URL_EXPIRATION=900  # Back to 15 minutes
```

### Test 3.2: Multiple Consecutive Refreshes

**Objective:** Verify multiple refreshes work correctly.

**Steps:**

1. Use short expiration (60 seconds)
2. Play video for 5+ minutes
3. Observe 5+ refresh cycles
4. Verify each refresh is seamless

**Expected Results:**
- ✅ Each refresh happens at 80% mark
- ✅ All refreshes are successful
- ✅ Video never stops playing
- ✅ No cumulative delay or drift
- ✅ No memory leaks (check DevTools memory)

### Test 3.3: Refresh Failure Recovery

**Objective:** Verify graceful handling if refresh fails.

**Simulation:**

1. Play video
2. Before refresh time, disconnect backend server
3. Wait for refresh attempt
4. Observe behavior

**Expected Results:**
- ✅ Refresh attempt logged
- ✅ Error caught gracefully
- ✅ Video continues with old URL until expiration
- ✅ User sees error message when URL expires
- ✅ "Try again" button appears
- ✅ No console errors crash the app

---

## 4. MP4 Backward Compatibility

### Test 4.1: Old MP4 Videos Still Work

**Objective:** Verify existing MP4 videos play normally.

**Prerequisites:**
- Existing MP4 video in database (pre-Phase 1)

**Steps:**

1. Navigate to course with old MP4 video
2. Click video
3. Observe playback

**Expected Results:**
- ✅ Video loads with native player
- ✅ No HLS badge appears
- ✅ Console shows: "Standard MP4 video, using native playback"
- ✅ Video plays normally
- ✅ No HLS.js loaded
- ✅ All controls work (play, pause, seek, volume)
- ✅ Security features still active (no right-click, etc.)

### Test 4.2: MP4 Upload Still Works

**Objective:** Verify admins can still upload MP4 files.

**Steps:**

1. Go to admin panel: `/admin/videos`
2. Click: "Ajouter une Vidéo"
3. Keep mode on: 📁 Fichier MP4 (default)
4. Upload an MP4 file
5. Submit

**Expected Results:**
- ✅ Upload progress bar appears
- ✅ Upload completes successfully
- ✅ Video entry created
- ✅ Video playback works
- ✅ Uses native MP4 player (not HLS)

### Test 4.3: Mixed Environment (MP4 + HLS)

**Objective:** Verify MP4 and HLS videos coexist.

**Steps:**

1. Create course with both:
   - Some MP4 videos (old/new)
   - Some HLS videos
2. Play each video type
3. Switch between MP4 and HLS videos

**Expected Results:**
- ✅ All MP4 videos use native player
- ✅ All HLS videos use HLS.js or native HLS
- ✅ Switching between types works smoothly
- ✅ No conflicts or errors
- ✅ Each video uses correct player type

---

## 5. Signed URL Expiration

### Test 5.1: URL Expires After Configured Time

**Objective:** Verify signed URLs expire correctly.

**Configuration:**
```env
VIDEO_URL_EXPIRATION=60  # 1 minute for testing
```

**Steps:**

1. Generate signed URL via API:
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT" \
        https://api.example.com/api/videos/123/playback-info
   ```

2. Note the URL and expiration time
3. Access URL immediately (should work)
4. Wait 61 seconds
5. Access URL again

**Expected Results:**
- ✅ Initial access: 200 OK with video data
- ✅ After expiration: 403 Forbidden
- ✅ Error message: "Request has expired"
- ✅ No video data returned

### Test 5.2: URL Cannot Be Extended Manually

**Objective:** Verify expiration cannot be tampered with.

**Steps:**

1. Get signed URL
2. Manually modify expiration parameter in URL
3. Try to access

**Expected Results:**
- ✅ 403 Forbidden (signature invalid)
- ✅ URL modification breaks signature
- ✅ Cannot extend expiration manually

### Test 5.3: Expired URL Refresh Works

**Objective:** Verify UI handles expired URLs gracefully.

**Steps:**

1. Set short expiration (60 seconds)
2. Start playing video
3. Pause immediately
4. Wait 61 seconds (URL expires)
5. Try to resume playback

**Expected Results:**
- ✅ Resume triggers new URL request
- ✅ New signed URL generated
- ✅ Playback resumes successfully
- ✅ User may see brief "Loading..." message
- ✅ No error shown to user

---

## 6. Unauthorized Access Prevention

### Test 6.1: Unauthenticated User Cannot Access Videos

**Objective:** Verify authentication is required.

**Steps:**

1. Log out of application
2. Try to access video directly:
   ```
   https://example.com/courses/1/videos/5
   ```

**Expected Results:**
- ✅ Redirected to login page
- ✅ No video loads
- ✅ No signed URL generated

### Test 6.2: User Without Course Access Cannot Play

**Objective:** Verify course enrollment is checked.

**Steps:**

1. Log in as User A
2. User A is NOT enrolled in Course X
3. Try to access video from Course X

**Expected Results:**
- ✅ Access denied message
- ✅ No video player shown
- ✅ "Enroll in course" prompt displayed

### Test 6.3: Direct Hetzner URL Fails (Private Bucket)

**Objective:** Verify bucket is private.

**Steps:**

1. Get video path: `videos/course-1/subject-1/video-1/segment-0.ts`
2. Try to access directly:
   ```bash
   curl https://fsn1.your-objectstorage.com/clinique-videos/videos/course-1/subject-1/video-1/segment-0.ts
   ```

**Expected Results:**
- ✅ 403 Forbidden
- ✅ No video data returned
- ✅ Error: "Access Denied" or similar

### Test 6.4: Stolen Signed URL (Session Binding)

**Objective:** Verify session binding prevents URL sharing (if enabled).

**Prerequisites:**
```env
ENABLE_SESSION_BINDING=true
SESSION_BINDING_IP=true
```

**Steps:**

1. User A generates signed URL from IP 1.2.3.4
2. Copy signed URL
3. User B tries to access from IP 5.6.7.8

**Expected Results:**
- ✅ User A: Video plays normally
- ✅ User B: 403 Forbidden (IP mismatch)
- ✅ Error: "Session binding validation failed"

**Note:** Skip this test if session binding is disabled (default).

---

## 7. Course Permissions & User Progress

### Test 7.1: Progress Tracking Works

**Objective:** Verify video progress is saved.

**Steps:**

1. Start playing video
2. Watch for 2 minutes
3. Note current timestamp (e.g., 02:15)
4. Close browser
5. Reopen browser and navigate back to video

**Expected Results:**
- ✅ Video resumes from last position (02:15)
- ✅ Progress saved in database (`video_progress` table)
- ✅ Progress bar shows watched portion

### Test 7.2: Course Completion Updates

**Objective:** Verify course progress updates after watching.

**Steps:**

1. Start course with 3 videos
2. Watch video 1 to completion
3. Watch video 2 to 50%
4. Check course completion status

**Expected Results:**
- ✅ Video 1: Marked as complete (✓)
- ✅ Video 2: Shows 50% progress
- ✅ Course: Shows overall completion (e.g., 50%)
- ✅ Dashboard reflects progress

### Test 7.3: Subject Access Control

**Objective:** Verify subject-level permissions work.

**Steps:**

1. User enrolled in Course X, Subject A only
2. Try to access video from Subject B (same course)

**Expected Results:**
- ✅ Subject A videos: Accessible
- ✅ Subject B videos: Access denied
- ✅ "Unlock this subject" message shown

---

## 8. Cross-Browser Compatibility

### Test 8.1: Chrome/Chromium

**Steps:**

1. Open in Chrome
2. Play HLS video
3. Check DevTools console

**Expected Results:**
- ✅ Uses hls.js library
- ✅ Console shows: "✅ Using hls.js for HLS playback"
- ✅ Video plays smoothly
- ✅ All controls work
- ✅ Token refresh works

### Test 8.2: Firefox

**Steps:**

1. Open in Firefox
2. Play HLS video
3. Check DevTools console

**Expected Results:**
- ✅ Uses hls.js library
- ✅ Console shows: "✅ Using hls.js for HLS playback"
- ✅ Video plays smoothly
- ✅ All controls work
- ✅ Token refresh works

### Test 8.3: Safari (macOS/iOS)

**Steps:**

1. Open in Safari
2. Play HLS video
3. Check Web Inspector console

**Expected Results:**
- ✅ Uses **native HLS** support
- ✅ Console shows: "✅ Using native HLS support (Safari/iOS)"
- ✅ Video plays smoothly
- ✅ All controls work
- ✅ Token refresh works
- ✅ No hls.js loaded (not needed)

### Test 8.4: Edge

**Steps:**

1. Open in Microsoft Edge
2. Play HLS video
3. Check DevTools console

**Expected Results:**
- ✅ Windows: Uses hls.js
- ✅ iOS/Mobile: Uses native HLS
- ✅ Video plays smoothly

### Test 8.5: Mobile Browsers

**Devices to Test:**
- iPhone Safari
- Android Chrome
- Android Firefox

**Expected Results:**
- ✅ All load video correctly
- ✅ Touch controls work
- ✅ Fullscreen works
- ✅ Token refresh works
- ✅ Orientation change handled

---

## 9. Performance Testing

### Test 9.1: Initial Load Time

**Objective:** Measure video startup time.

**Steps:**

1. Clear browser cache
2. Open DevTools → Network tab
3. Navigate to video page
4. Start playing video
5. Measure time to first frame

**Target Metrics:**
- Page load: < 2 seconds
- Video player ready: < 1 second
- First frame: < 3 seconds total

**Measure:**
```javascript
// In browser console
performance.mark('video-start');
// Wait for video to start
performance.mark('video-playing');
performance.measure('video-load-time', 'video-start', 'video-playing');
console.log(performance.getEntriesByType('measure'));
```

### Test 9.2: Concurrent Users

**Objective:** Verify system handles multiple users.

**Test Setup:**
- 10+ users watching videos simultaneously
- Monitor server CPU/memory
- Monitor Hetzner bandwidth

**Expected Results:**
- ✅ All users play smoothly
- ✅ No server overload
- ✅ Signed URL generation < 100ms per request
- ✅ No rate limit errors (unless configured)

### Test 9.3: Network Recovery

**Objective:** Verify recovery from network interruption.

**Steps:**

1. Start playing HLS video
2. Disconnect internet
3. Wait 10 seconds
4. Reconnect internet

**Expected Results:**
- ✅ Video pauses during disconnection
- ✅ "Network error" may appear briefly
- ✅ Video resumes automatically on reconnection
- ✅ hls.js retries failed segments
- ✅ Playback continues from same position

---

## 10. Error Handling

### Test 10.1: Missing Video File

**Objective:** Verify graceful handling of missing files.

**Steps:**

1. Create video entry with non-existent path
2. Try to play video

**Expected Results:**
- ✅ Error message: "Error loading video"
- ✅ "Try again" button shown
- ✅ No console errors crash app
- ✅ User can navigate away

### Test 10.2: Invalid HLS Manifest

**Objective:** Verify handling of corrupt manifest.

**Steps:**

1. Upload invalid .m3u8 file
2. Try to play video

**Expected Results:**
- ✅ Error caught by hls.js
- ✅ Console shows: "❌ HLS error"
- ✅ User sees error message
- ✅ App remains stable

### Test 10.3: Backend Server Down

**Objective:** Verify frontend handles backend unavailability.

**Steps:**

1. Stop backend server
2. Try to play video

**Expected Results:**
- ✅ Network error caught
- ✅ Error message shown to user
- ✅ "Try again" button available
- ✅ No infinite loading
- ✅ No console errors crash app

---

## Automated Test Suite (Optional)

### Example Test with Playwright

```typescript
// tests/hls-playback.spec.ts

import { test, expect } from '@playwright/test';

test('HLS video loads and plays', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to video
  await page.goto('/courses/1/videos/5');
  
  // Wait for video player
  await page.waitForSelector('video');
  
  // Check HLS badge
  const hlsBadge = await page.locator('.hls-badge');
  await expect(hlsBadge).toBeVisible();
  
  // Play video
  await page.click('button.play-button');
  
  // Wait for video to start
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video && !video.paused && video.currentTime > 0;
  });
  
  // Verify playing
  const video = await page.locator('video');
  const isPaused = await video.evaluate(v => (v as HTMLVideoElement).paused);
  expect(isPaused).toBe(false);
  
  // Wait 2 seconds
  await page.waitForTimeout(2000);
  
  // Check progress
  const currentTime = await video.evaluate(v => (v as HTMLVideoElement).currentTime);
  expect(currentTime).toBeGreaterThan(0);
});

test('Token refresh works mid-playback', async ({ page }) => {
  // Set short expiration for testing
  // This requires backend configuration
  
  await page.goto('/courses/1/videos/5');
  await page.waitForSelector('video');
  
  // Listen for console logs
  const refreshLogs: string[] = [];
  page.on('console', msg => {
    if (msg.text().includes('Refreshing video URL')) {
      refreshLogs.push(msg.text());
    }
  });
  
  // Play video
  await page.click('button.play-button');
  
  // Wait for refresh (based on short expiration)
  await page.waitForTimeout(50000); // 50 seconds
  
  // Verify refresh occurred
  expect(refreshLogs.length).toBeGreaterThan(0);
  
  // Verify video still playing
  const video = await page.locator('video');
  const isPaused = await video.evaluate(v => (v as HTMLVideoElement).paused);
  expect(isPaused).toBe(false);
});
```

---

## Test Results Tracking

### Test Report Template

```markdown
## Test Execution Report

**Date:** 2025-11-06
**Tester:** [Name]
**Environment:** Production / Staging / Local

### Summary
- Total Tests: 25
- Passed: 23 ✅
- Failed: 2 ❌
- Skipped: 0

### Failed Tests

#### Test 3.2: Multiple Consecutive Refreshes
- **Status:** ❌ Failed
- **Issue:** Memory leak after 10+ refreshes
- **Details:** Browser memory increased from 150MB to 450MB
- **Action:** Investigate hls.js instance cleanup

#### Test 8.5: Mobile Browsers - Android Firefox
- **Status:** ❌ Failed
- **Issue:** Token refresh not triggering
- **Details:** setTimeout not reliable in background
- **Action:** Use Page Visibility API

### Performance Metrics
- Initial load time: 2.1s ✅
- First frame: 2.8s ✅
- Token refresh: < 100ms ✅
- Concurrent users (20): Stable ✅

### Browser Compatibility
- Chrome 120: ✅ Pass
- Firefox 121: ⚠️ Android issue
- Safari 17: ✅ Pass
- Edge 120: ✅ Pass

### Recommendations
1. Fix memory leak in token refresh
2. Improve Android Firefox compatibility
3. Add monitoring for failed refreshes
4. Document known issues
```

---

## What You Should Do

### Step 1: Environment Setup

1. **Configure Test Environment:**
   ```env
   # Use short expiration for faster testing
   VIDEO_URL_EXPIRATION=60  # 1 minute (testing only)
   VIDEO_TOKEN_LIFETIME=120  # 2 minutes (testing only)
   ```

2. **Prepare Test Data:**
   - Upload at least 2 HLS videos to Hetzner
   - Keep at least 2 MP4 videos in database
   - Create test user accounts with different permissions

### Step 2: Manual Testing (Priority 1)

Run these tests first:

1. ✅ **Test 1.1** - HLS video loads (Critical)
2. ✅ **Test 3.1** - Token refresh at 80% (Critical)
3. ✅ **Test 4.1** - MP4 backward compatibility (Critical)
4. ✅ **Test 5.1** - URL expiration (Critical)
5. ✅ **Test 6.3** - Private bucket (Critical)

### Step 3: Extended Testing (Priority 2)

Run these tests after priority 1 passes:

6. ✅ **Test 2.1** - Long playback sessions
7. ✅ **Test 3.2** - Multiple refreshes
8. ✅ **Test 7.1** - Progress tracking
9. ✅ **Test 8.1-8.5** - Cross-browser
10. ✅ **Test 9.1** - Performance

### Step 4: Document Results

1. Use test report template above
2. Document any failures with screenshots
3. Log issues in GitHub Issues
4. Update this guide with findings

### Step 5: Fix Issues

1. Prioritize critical failures
2. Fix and retest
3. Document changes
4. Update test cases if needed

### Step 6: Production Readiness

Before deploying to production:

- [ ] All critical tests pass
- [ ] Performance metrics meet targets
- [ ] Security tests pass
- [ ] Cross-browser tests pass
- [ ] Documentation complete
- [ ] Rollback plan ready
- [ ] Monitoring configured

---

## Testing Timeline

**Week 1: Core Functionality**
- Days 1-2: HLS playback tests (1.x)
- Days 3-4: Token refresh tests (3.x)
- Day 5: MP4 compatibility tests (4.x)

**Week 2: Security & Performance**
- Days 1-2: Security tests (6.x)
- Days 3-4: Performance tests (9.x)
- Day 5: Error handling (10.x)

**Week 3: Integration & Cross-Browser**
- Days 1-3: Cross-browser testing (8.x)
- Days 4-5: Integration tests (7.x)

**Week 4: Final Validation**
- Days 1-2: Regression testing
- Days 3-4: User acceptance testing
- Day 5: Production deployment preparation

---

## Tools & Resources

**Browser DevTools:**
- Network tab - Monitor requests
- Console - Check logs
- Performance - Measure metrics
- Application - Inspect storage

**Testing Tools:**
- Playwright/Cypress - Automated tests
- Postman - API testing
- JMeter - Load testing
- Lighthouse - Performance audit

**Monitoring:**
- Sentry - Error tracking
- Google Analytics - Usage metrics
- CloudWatch - AWS/Hetzner metrics
- Grafana - Custom dashboards

---

## Support

**Issues or Questions:**
- Check documentation first
- Review console logs
- Check network tab
- Consult phase completion guides

**Resources:**
- PHASE_1_SUMMARY.md - Overview
- PHASE_2_COMPLETE.md - Storage layer
- PHASE_3_COMPLETE.md - Frontend HLS
- PHASE_4_COMPLETE.md - Admin upload
- PHASE_5_SECURITY_GUIDE.md - Security

---

**Phase 6 Status**: Testing Guide Complete ✅
**Total Test Cases**: 25+
**Estimated Testing Time**: 2-4 weeks
**Ready for**: Production deployment after all tests pass
