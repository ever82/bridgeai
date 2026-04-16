"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
/**
 * Environment configuration loader
 * Loads environment variables with validation
 */
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
// Load environment variables
const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.dev';
(0, dotenv_1.config)({ path: envFile });
// Environment schema validation
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('3000'),
    API_URL: zod_1.z.string().url(),
    CLIENT_URL: zod_1.z.string().url(),
    // Database
    DATABASE_URL: zod_1.z.string(),
    DB_HOST: zod_1.z.string().default('localhost'),
    DB_PORT: zod_1.z.string().transform(Number).default('5432'),
    DB_NAME: zod_1.z.string(),
    DB_USER: zod_1.z.string(),
    DB_PASSWORD: zod_1.z.string(),
    // Redis
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    REDIS_DB_CACHE: zod_1.z.string().transform(Number).default('0'),
    REDIS_DB_SOCKET: zod_1.z.string().transform(Number).default('1'),
    REDIS_DB_QUEUE: zod_1.z.string().transform(Number).default('2'),
    // JWT
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('30d'),
    // AI
    ANTHROPIC_API_KEY: zod_1.z.string(),
    ANTHROPIC_BASE_URL: zod_1.z.string().url(),
    ANTHROPIC_MODEL: zod_1.z.string().default('claude-3-sonnet-20240229'),
    // S3
    S3_ENDPOINT: zod_1.z.string().default('localhost'),
    S3_PORT: zod_1.z.string().transform(Number).default('9000'),
    S3_USE_SSL: zod_1.z.string().transform((val) => val === 'true').default('false'),
    S3_ACCESS_KEY: zod_1.z.string(),
    S3_SECRET_KEY: zod_1.z.string(),
    S3_BUCKET_NAME: zod_1.z.string(),
    S3_PUBLIC_URL: zod_1.z.string().url(),
    // Security
    BCRYPT_ROUNDS: zod_1.z.string().transform(Number).default('10'),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).default('100'),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    // Features
    ENABLE_AI_FALLBACK: zod_1.z.string().transform((val) => val === 'true').default('true'),
    ENABLE_REQUEST_LOGGING: zod_1.z.string().transform((val) => val === 'true').default('true'),
    ENABLE_SWAGGER: zod_1.z.string().transform((val) => val === 'true').default('true'),
    // Logging
    LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
    LOG_PRETTY: zod_1.z.string().transform((val) => val === 'true').default('true'),
});
exports.env = envSchema.parse(process.env);
//# sourceMappingURL=env.js.map