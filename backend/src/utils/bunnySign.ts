import crypto from 'crypto';

interface SignedUrlOptions {
  expirationMinutes?: number;
  ipAddress?: string;
  allowedCountries?: string[];
  blockedCountries?: string[];
}

/**
 * Generate signed URL for Bunny.net Pull Zone or Storage
 * Implements token-based authentication for secure video playback
 */
class BunnySignService {
  private securityKey: string;
  private pullZoneUrl: string;
  private storageZone: string;

  constructor() {
    this.securityKey = process.env.BUNNY_SECURITY_KEY || process.env.BUNNY_PASSWORD || '2618a218-10c8-469a-93538a7ae921-7c28-499e';
    this.pullZoneUrl = process.env.BUNNY_PULL_ZONE_URL || 'https://cliniquedesjuristesvideos.b-cdn.net';
    this.storageZone = process.env.BUNNY_STORAGE_ZONE || 'cliniquedesjuristesvideos';
  }

  /**
   * Generate a signed URL with expiration time
   */
  generateSignedUrl(filePath: string, options: SignedUrlOptions = {}): string {
    const {
      expirationMinutes = parseInt(process.env.BUNNY_URL_EXPIRY_MINUTES || '60')
    } = options;

    // Calculate expiration timestamp
    const expirationTime = Math.floor(Date.now() / 1000) + (expirationMinutes * 60);

    // Ensure path starts with /
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

    // Build the base URL
    const baseUrl = `${this.pullZoneUrl}${normalizedPath}`;

    // Create the signature string: securityKey + normalizedPath + expirationTime
    const signatureString = `${this.securityKey}${normalizedPath}${expirationTime}`;

    // Generate SHA256 hash
    const hash = crypto.createHash('sha256').update(signatureString).digest('base64');

    // Make the hash URL-safe
    const token = hash
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Build final signed URL
    const signedUrl = `${baseUrl}?token=${token}&expires=${expirationTime}`;

    console.log(`🔐 Generated signed URL (expires in ${expirationMinutes}m): ${normalizedPath}`);

    return signedUrl;
  }

  /**
   * Generate a simple time-limited URL without complex token authentication
   * Use this if the pull zone doesn't have token authentication enabled
   */
  generateTimeLimitedUrl(filePath: string, expirationMinutes: number = 60): string {
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const baseUrl = `${this.pullZoneUrl}${normalizedPath}`;
    const expirationTime = Math.floor(Date.now() / 1000) + (expirationMinutes * 60);
    
    // Simple expiration check (requires server-side validation)
    return `${baseUrl}?exp=${expirationTime}`;
  }

  /**
   * Get storage zone base URL
   */
  getStorageBaseUrl(): string {
    return `https://${this.storageZone}.b-cdn.net`;
  }

  /**
   * Get pull zone base URL
   */
  getPullZoneUrl(): string {
    return this.pullZoneUrl;
  }

  /**
   * Verify if a token is valid (for custom implementation)
   */
  verifyToken(filePath: string, token: string, expires: number): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if expired
    if (currentTime > expires) {
      console.log('❌ Token expired');
      return false;
    }

    // Recreate the signature
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const signatureString = `${this.securityKey}${normalizedPath}${expires}`;
    const hash = crypto.createHash('sha256').update(signatureString).digest('base64');
    const expectedToken = hash
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return token === expectedToken;
  }
}

export default new BunnySignService();
export { BunnySignService, SignedUrlOptions };
