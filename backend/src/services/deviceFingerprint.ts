import { Request } from 'express';
import crypto from 'crypto';

/**
 * Generate a device fingerprint from request metadata
 * This is a best-effort approach combining IP and User-Agent
 * Can be enhanced with client-side fingerprinting later
 */
export function generateDeviceFingerprint(req: Request, clientFingerprint?: string): string {
  if (clientFingerprint) {
    // If client provides a fingerprint (from @fingerprintjs/fingerprintjs or similar), use it
    return clientFingerprint;
  }

  // Fallback: generate from server-side data
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Create a hash from IP + User Agent
  const data = `${ip}:${userAgent}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  
  return hash.substring(0, 32); // Use first 32 chars
}

/**
 * Generate a human-readable session ownership label
 * Example: "Windows 10 — Chrome at 2025-10-29 14:22 — Paris"
 */
export function generateOwnershipLabel(
  userAgent: string,
  ipAddress: string,
  timestamp?: Date
): string {
  const time = timestamp || new Date();
  const dateStr = time.toISOString().substring(0, 16).replace('T', ' ');
  
  // Parse user agent for OS and browser
  const os = parseOS(userAgent);
  const browser = parseBrowser(userAgent);
  
  // For location, we just use IP for now (could integrate IP geolocation API)
  const location = parseLocation(ipAddress);
  
  return `${os} — ${browser} at ${dateStr}${location ? ` — ${location}` : ''}`;
}

/**
 * Parse operating system from user agent
 */
function parseOS(userAgent: string): string {
  if (!userAgent) return 'Unknown OS';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('windows nt 10.0')) return 'Windows 10';
  if (ua.includes('windows nt 6.3')) return 'Windows 8.1';
  if (ua.includes('windows nt 6.2')) return 'Windows 8';
  if (ua.includes('windows nt 6.1')) return 'Windows 7';
  if (ua.includes('windows')) return 'Windows';
  
  if (ua.includes('mac os x')) {
    const match = ua.match(/mac os x ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      return `macOS ${version}`;
    }
    return 'macOS';
  }
  
  if (ua.includes('iphone')) return 'iOS (iPhone)';
  if (ua.includes('ipad')) return 'iOS (iPad)';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('linux')) return 'Linux';
  
  return 'Unknown OS';
}

/**
 * Parse browser from user agent
 */
function parseBrowser(userAgent: string): string {
  if (!userAgent) return 'Unknown Browser';
  
  const ua = userAgent.toLowerCase();
  
  // Order matters: check more specific browsers first
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('chrome/')) return 'Chrome';
  if (ua.includes('safari/') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('firefox/')) return 'Firefox';
  if (ua.includes('msie') || ua.includes('trident/')) return 'Internet Explorer';
  
  return 'Unknown Browser';
}

/**
 * Parse location from IP address
 * For now, just returns a placeholder
 * TODO: Integrate with IP geolocation service (e.g., ipapi.co, ip-api.com)
 */
function parseLocation(ipAddress: string): string | null {
  if (!ipAddress || ipAddress === 'unknown' || ipAddress === '::1' || ipAddress.startsWith('127.')) {
    return 'Localhost';
  }
  
  // Private IP ranges
  if (
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('172.16.') ||
    ipAddress.startsWith('192.168.')
  ) {
    return 'Local Network';
  }
  
  // TODO: Call geolocation API here
  // For now, return null to omit location from label
  return null;
}

/**
 * Check if two device fingerprints represent the same physical device
 */
export function isSameDevice(fingerprint1: string, fingerprint2: string): boolean {
  return fingerprint1 === fingerprint2;
}
