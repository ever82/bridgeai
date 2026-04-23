/**
 * Environment configuration loader
 * Loads environment variables with validation
 */
import { z } from 'zod';

// Load environment variables from .env file (Node.js only, skip in browser)
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
if (isNode) {
  // Dynamic require to avoid bundling dotenv in browser
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { config } = require('dotenv');
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.dev';
  config({ path: envFile });
}

// Environment schema validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_URL: z.string().url().default('http://localhost:3001/api'),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().default(''),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default('5432'),
  DB_NAME: z.string().default(''),
  DB_USER: z.string().default(''),
  DB_PASSWORD: z.string().default(''),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_DB_CACHE: z.string().transform(Number).default('0'),
  REDIS_DB_SOCKET: z.string().transform(Number).default('1'),
  REDIS_DB_QUEUE: z.string().transform(Number).default('2'),

  // JWT
  JWT_SECRET: z.string().min(32).default('dev-jwt-secret-min-32-chars-long!!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32).default('dev-refresh-secret-min-32-chars!!'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // AI
  ANTHROPIC_API_KEY: z.string().default(''),
  ANTHROPIC_BASE_URL: z.string().url().default('https://api.anthropic.com'),
  ANTHROPIC_MODEL: z.string().default('claude-3-sonnet-20240229'),

  // S3
  S3_ENDPOINT: z.string().default('localhost'),
  S3_PORT: z.string().transform(Number).default('9000'),
  S3_USE_SSL: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
  S3_ACCESS_KEY: z.string().default(''),
  S3_SECRET_KEY: z.string().default(''),
  S3_BUCKET_NAME: z.string().default(''),
  S3_PUBLIC_URL: z.string().url().default('http://localhost:9000'),

  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  CORS_ORIGIN: z.string().default('*'),

  // Features
  ENABLE_AI_FALLBACK: z
    .string()
    .transform(val => val === 'true')
    .default('true'),
  ENABLE_REQUEST_LOGGING: z
    .string()
    .transform(val => val === 'true')
    .default('true'),
  ENABLE_SWAGGER: z
    .string()
    .transform(val => val === 'true')
    .default('true'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
  LOG_PRETTY: z
    .string()
    .transform(val => val === 'true')
    .default('true'),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
