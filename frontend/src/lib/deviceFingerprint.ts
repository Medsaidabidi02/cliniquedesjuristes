// If TypeScript reports "Cannot find module" here, either install the package/types:
//   npm install @fingerprintjs/fingerprintjs
// or keep the ignore below to suppress the error in this project.
// @ts-ignore: module may not have type declarations in this project
import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<any> | null = null;
let cachedFingerprint: string = '';

/**
 * Initialize and get device fingerprint
 * This is cached for the session to avoid repeated calculations
 */
export async function getDeviceFingerprint(): Promise<string> {
  // Return cached value if available
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  try {
    // Initialize the agent on first call
    if (!fpPromise) {
      fpPromise = FingerprintJS.load();
    }

    const fp = await fpPromise;
    const result = await fp.get();
    
    // The visitor identifier is a stable hash of the browser's characteristics
    cachedFingerprint = result.visitorId || generateFallbackFingerprint();
    
    console.log('📱 Device fingerprint generated:', cachedFingerprint.substring(0, 16) + '...');
    
    return cachedFingerprint;
  } catch (error) {
    console.error('❌ Error generating device fingerprint:', error);
    // Fallback to a simple browser-based hash
    cachedFingerprint = generateFallbackFingerprint();
    return cachedFingerprint;
  }
}

/**
 * Fallback fingerprint generation using basic browser properties
 */
function generateFallbackFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const components = [
    navigator.userAgent,
    navigator.language,
    window.screen.width + 'x' + window.screen.height,
    window.screen.colorDepth,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    navigator.platform
  ];
  
  // Add canvas fingerprint
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    components.push(canvas.toDataURL());
  }
  
  const fingerprint = components.join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const result = Math.abs(hash).toString(16);
  console.log('📱 Fallback device fingerprint generated:', result.substring(0, 16) + '...');
  
  return result;
}

/**
 * Clear cached fingerprint (useful for testing)
 */
export function clearCachedFingerprint(): void {
  cachedFingerprint = '';
  console.log('🧹 Cleared cached device fingerprint');
}
