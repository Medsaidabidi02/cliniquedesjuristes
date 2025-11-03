import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'mysql://legal_app_user:ROOT@localhost:3307/legal_education_mysql5',
  jwtSecret: process.env.JWT_SECRET || 'legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  videoSecret: process.env.VIDEO_SECRET || process.env.JWT_SECRET || 'video-security-key-medsaidabidi02-2025', // ADD THIS LINE
  apiUrl: process.env.API_URL || 'http://localhost:5001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  baseUrl: process.env.BASE_URL || process.env.API_URL || 'http://localhost:5001',
  storage: {
    uploadsPath: process.env.UPLOAD_PATH || './uploads',
    // CHANGED: Increased from 500MB to 5GB (5 * 1024 * 1024 * 1024 bytes)
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5120') * 1024 * 1024, // 5120MB = 5GB
  },
  bunny: {
    storageZone: process.env.BUNNY_STORAGE_ZONE || 'cliniquedesjuristesvideos',
    storageHost: process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com',
    writeApiKey: process.env.BUNNY_WRITE_API_KEY || '2618a218-10c8-469a-9353-8a7ae921-7c28-499e',
    readApiKey: process.env.BUNNY_READ_API_KEY || '1fa435e1-2fbd-4c19-afb6-89a73265-0dbb-4756',
    cdnUrl: process.env.BUNNY_CDN_URL || 'https://cliniquedesjuristesvideos.b-cdn.net',
    signedUrlExpiration: parseInt(process.env.SIGNED_URL_EXPIRATION || '14400'), // 4 hours
  },
  admin: {
    defaultEmail: process.env.DEFAULT_ADMIN_EMAIL || 'admin@cliniquejuriste.com',
    defaultPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  }
};