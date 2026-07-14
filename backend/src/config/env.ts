import 'dotenv/config';
import { z } from 'zod';

/**
 * env.ts — The only file that reads process.env directly.
 * All other modules import the `config` object from here.
 * Validates at boot time so the process fails fast on missing vars.
 */

const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_PATH: z.string().default('/api/v1'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // OTP
  OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(6),
  OTP_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(300),

  // Gemini AI
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_CHAT_MODEL: z.string().default('gemini-2.0-flash-lite'),
  GEMINI_VISION_MODEL: z.string().default('gemini-2.0-flash-lite'),
  GEMINI_TRANSLATION_MODEL: z.string().default('gemini-2.0-flash-lite'),
  AI_ANALYSIS_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),

  // Storage
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOADS_DIR: z.string().default('./uploads'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('ap-south-1'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  SIGNED_URL_EXPIRES_SECONDS: z.coerce.number().int().positive().default(900),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(15),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  // Socket.IO
  SOCKET_IO_PATH: z.string().default('/socket.io'),

  // Scheduler
  ZONE_RISK_RECOMPUTE_CRON: z.string().default('*/15 * * * *'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),

  // OAuth (optional at build time — needed for community reporter SSO)
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),

  // Email Resend provider
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('onboarding@resend.dev'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

/** Derived helpers */
export const isDev = config.NODE_ENV === 'development';
export const isProd = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

export const corsOrigins = config.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
