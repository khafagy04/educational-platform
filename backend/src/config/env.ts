import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  DATABASE_URL: z
    .url()
    .default('postgresql://platform:platform_dev_only@localhost:5432/educational_platform'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default('local-access-secret-change-before-production-2026'),
  REFRESH_TOKEN_PEPPER: z
    .string()
    .min(32)
    .default('local-refresh-pepper-change-before-production-2026'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  APP_URL: z.url().default('http://localhost:3000'),
  EMAIL_PROVIDER: z.enum(['local', 'smtp']).default('local'),
  EMAIL_FROM: z.string().min(3).optional(),
  EMAIL_TEST_RECIPIENT: z.email().optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  STORAGE_PROVIDER: z.enum(['local', 'r2']).default('local'),
  LOCAL_STORAGE_PATH: z.string().min(1).default('.local-storage'),
  R2_ENDPOINT: z.url().optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
  VIDEO_PROVIDER: z.enum(['local', 'cloudflare']).default('local'),
  VIDEO_PROVIDER_ACCOUNT_ID: z.string().min(1).optional(),
  VIDEO_PROVIDER_API_TOKEN: z.string().min(1).optional(),
  VIDEO_CUSTOMER_CODE: z.string().min(1).optional(),
  VIDEO_PLAYBACK_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
  PAYMENT_PROVIDER: z.enum(['local', 'fawaterk']).default('local'),
  API_PUBLIC_URL: z.url().default('http://localhost:4000'),
  FAWATERK_BASE_URL: z.url().default('https://staging.fawaterk.com/api/v2'),
  FAWATERK_API_TOKEN: z.string().min(1).optional(),
  FAWATERK_VENDOR_KEY: z.string().min(16).default('local-fawaterk-vendor-key-2026'),
  JOB_QUEUE_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  REDIS_URL: z.url().default('redis://localhost:6379'),
  ERROR_REPORTING_DSN: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.url().optional(),
  ),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  throw new Error(`Invalid environment configuration: ${z.prettifyError(parsedEnvironment.error)}`);
}

export const env = parsedEnvironment.data;
export const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
