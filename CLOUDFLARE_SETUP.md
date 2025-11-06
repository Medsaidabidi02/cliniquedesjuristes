# Cloudflare CDN Setup for HLS Streaming

This document describes how to configure Cloudflare to cache and serve HLS video content from Hetzner Object Storage.

## Overview

The platform uses Cloudflare as a CDN layer between users and Hetzner Object Storage to:
- Cache HLS manifest files (.m3u8) and segments (.ts)
- Reduce bandwidth costs on Hetzner
- Improve playback performance globally
- Handle high traffic loads efficiently

## Architecture

```
User Browser → Cloudflare CDN → Hetzner Object Storage
     ↓
   HLS.js Player
```

## Prerequisites

1. A Cloudflare account with your domain configured
2. Hetzner Object Storage bucket configured with public access
3. DNS records pointing your video subdomain to Cloudflare

## Configuration Steps

### 1. DNS Setup

Create a CNAME record for your video content:

```
Type: CNAME
Name: cdn (or your preferred subdomain)
Content: <your-hetzner-endpoint>.fsn1.your-objectstorage.com
Proxy status: Proxied (orange cloud enabled)
TTL: Auto
```

### 2. Page Rules Configuration

Navigate to **Rules → Page Rules** in Cloudflare dashboard and create a new rule:

**URL Pattern:**
```
cdn.yourdomain.com/*
```

**Settings:**

1. **Cache Level:** Cache Everything
   - Caches all content regardless of query strings or headers

2. **Edge Cache TTL:** 1 year (31536000 seconds)
   - HLS segments rarely change once created
   - Manifest files (.m3u8) should have shorter TTL if they're updated

3. **Browser Cache TTL:** Respect Existing Headers
   - Allows your backend to control browser caching via headers

4. **Origin Cache Control:** On
   - Respects cache headers from Hetzner

### 3. Caching Rules (Alternative to Page Rules)

For more granular control, use Cloudflare's new **Cache Rules**:

**For HLS Segments (.ts files):**
```
Rule name: Cache HLS Segments
When incoming requests match: 
  - File extension equals "ts"
Then:
  - Cache eligibility: Eligible for cache
  - Edge TTL: 1 year
  - Browser TTL: Respect existing headers
```

**For HLS Manifests (.m3u8 files):**
```
Rule name: Cache HLS Manifests
When incoming requests match:
  - File extension equals "m3u8"
Then:
  - Cache eligibility: Eligible for cache
  - Edge TTL: 1 hour (adjust based on your needs)
  - Browser TTL: 5 minutes
```

### 4. SSL/TLS Settings

**SSL/TLS Encryption Mode:** Full (strict)
- Ensures encrypted connection between Cloudflare and Hetzner

### 5. CORS Configuration

Ensure CORS headers are properly configured in your Hetzner bucket (see HETZNER_SETUP.md).

Cloudflare will pass these headers through to the browser.

### 6. Optimization Settings

Navigate to **Speed → Optimization**:

1. **Auto Minify:** 
   - Disable for video files (not applicable)
   
2. **Rocket Loader:**
   - Keep disabled for video pages (can interfere with HLS.js)

3. **Mirage:**
   - Not applicable to video content

### 7. Security Settings

**Under Attack Mode:** Be cautious
- Can interfere with video streaming if enabled

**DDoS Protection:** Recommended
- Protects against attacks without affecting legitimate traffic

## Testing Your Setup

### 1. Test CDN Caching

Check if Cloudflare is caching your content:

```bash
curl -I https://cdn.yourdomain.com/videos/sample/output.m3u8
```

Look for these headers in the response:
```
cf-cache-status: HIT  (cached) or MISS (not cached yet)
cf-ray: [ID]          (Cloudflare Ray ID)
```

### 2. Test HLS Playback

1. Open your video page in the browser
2. Open Browser DevTools → Network tab
3. Filter by "m3u8" and "ts"
4. Verify:
   - Files are loaded from your CDN domain
   - Response headers include `cf-cache-status: HIT`
   - No CORS errors in console

### 3. Test Geographic Performance

Use tools like:
- GTmetrix (multiple locations)
- WebPageTest (global testing)
- Cloudflare Analytics (real user metrics)

## Performance Optimization Tips

### 1. Cache Everything Aggressively

HLS segments never change once created, so aggressive caching is safe.

### 2. Use Tiered Caching

Enable **Tiered Cache** in Cloudflare to reduce requests to origin:
- Navigate to **Caching → Tiered Cache**
- Enable for your domain

### 3. Monitor Cache Hit Ratio

Target > 95% cache hit ratio:
- Navigate to **Analytics → Performance**
- Monitor "Cache Hit Ratio" metric

### 4. Purge Cache When Needed

If you update video content:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://cdn.yourdomain.com/videos/sample/output.m3u8"]}'
```

## Expected Headers

Your Hetzner bucket should return these headers (configured in bucket CORS):

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Allow-Headers: Range
Content-Type: application/vnd.apple.mpegurl (for .m3u8)
Content-Type: video/MP2T (for .ts)
Cache-Control: public, max-age=31536000 (for .ts files)
Cache-Control: public, max-age=3600 (for .m3u8 files)
```

## Common Issues

### Issue 1: CORS Errors

**Symptom:** Browser console shows CORS errors

**Solution:**
1. Verify CORS headers in Hetzner bucket
2. Check that Cloudflare is proxying (orange cloud enabled)
3. Ensure no custom headers are blocking CORS

### Issue 2: Low Cache Hit Ratio

**Symptom:** Most requests show `cf-cache-status: MISS`

**Solution:**
1. Check Page Rules are configured correctly
2. Verify Cache Level is "Cache Everything"
3. Ensure no query strings vary on each request

### Issue 3: Video Buffering

**Symptom:** Frequent buffering during playback

**Solution:**
1. Check Cloudflare Analytics for high latency
2. Enable Argo Smart Routing for better performance
3. Verify your Hetzner bucket is in optimal region

### Issue 4: 403 or 404 Errors

**Symptom:** Videos fail to load with 403/404

**Solution:**
1. Verify bucket permissions are public
2. Check file paths match exactly (case-sensitive)
3. Test direct Hetzner URL first

## Monitoring and Analytics

### Cloudflare Dashboard

Monitor these metrics:
- **Requests:** Total requests to your video content
- **Bandwidth:** Data transferred through Cloudflare
- **Cache Hit Ratio:** Percentage of requests served from cache
- **Threats:** Blocked malicious requests

### Custom Logging

Enable Cloudflare Logpush for detailed analytics:
- Navigate to **Analytics → Logs**
- Configure destination (e.g., S3, GCS, or HTTP endpoint)
- Analyze video access patterns

## Cost Optimization

### Cloudflare Costs

- **Free Plan:** Limited features, 100k requests/day
- **Pro Plan ($20/mo):** Polish, Mirage, better analytics
- **Business Plan ($200/mo):** Custom cache rules, faster support
- **Enterprise:** Custom pricing, dedicated support

### Bandwidth Savings

With proper caching:
- Expected cache hit ratio: > 95%
- Hetzner bandwidth reduction: ~95%
- Cost savings: Significant for high-traffic sites

## Security Considerations

### 1. Hotlink Protection

Prevent others from embedding your videos:

**Page Rule:**
```
URL: cdn.yourdomain.com/*
Setting: Hotlink Protection → On
```

Or use Cloudflare Workers for more control.

### 2. Token Authentication

For private content, implement signed URLs:
- Generate time-limited tokens on backend
- Verify tokens using Cloudflare Workers
- Block unauthorized access at edge

### 3. Rate Limiting

Protect against abuse:
- Navigate to **Security → Rate Limiting**
- Create rules to limit requests per IP

## Support

For issues:
1. Check Cloudflare status: https://www.cloudflarestatus.com/
2. Review Cloudflare Community: https://community.cloudflare.com/
3. Contact Cloudflare Support (paid plans)

## Additional Resources

- [Cloudflare Cache Documentation](https://developers.cloudflare.com/cache/)
- [HLS Streaming Best Practices](https://developers.cloudflare.com/stream/)
- [Cloudflare Workers for Video](https://developers.cloudflare.com/workers/)
