import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or current directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || process.env.API_PORT || '4000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/dfz_messenger?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dfz_access_secret_key_change_in_production_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dfz_refresh_secret_key_change_in_production_2026',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN_DAYS: parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || '30', 10),
  
  STORAGE_DRIVER: process.env.STORAGE_DRIVER || 'local',
  UPLOAD_DIR: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
  
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  COOKIE_SAME_SITE: (process.env.COOKIE_SAME_SITE || 'lax') as 'lax' | 'strict' | 'none',
  
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@dfzmessenger.local',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminSecure2026!',
};
