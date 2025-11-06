import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'mysql://legal_app_user:ROOT@localhost:3307/legal_education_mysql5',
  jwtSecret: process.env.JWT_SECRET || 'legal-education-platform-super-secret-key-medsaidabidi02-2025-mysql5-version',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  apiUrl: process.env.API_URL || 'http://localhost:5001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  baseUrl: process.env.BASE_URL || process.env.API_URL || 'http://localhost:5001',
  hetzner: {
    enabled: process.env.ENABLE_HETZNER === 'true',
    endpoint: process.env.HETZNER_ENDPOINT || '',
    bucket: process.env.HETZNER_BUCKET || '',
  },
  hls: {
    enabled: process.env.ENABLE_HLS === 'true',
  },
  admin: {
    defaultEmail: process.env.DEFAULT_ADMIN_EMAIL || 'admin@cliniquejuriste.com',
    defaultPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  }
};