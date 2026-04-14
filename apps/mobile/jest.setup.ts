import { cleanup } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

// Mock environment variables before importing shared package
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.API_URL = 'http://localhost:3000';
process.env.CLIENT_URL = 'http://localhost:19006';
process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.REDIS_DB_CACHE = '0';
process.env.REDIS_DB_SOCKET = '1';
process.env.REDIS_DB_QUEUE = '2';
process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN = '7d';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.com';
process.env.ANTHROPIC_MODEL = 'claude-3-sonnet-20240229';
process.env.S3_ENDPOINT = 'localhost';
process.env.S3_PORT = '9000';
process.env.S3_USE_SSL = 'false';
process.env.S3_ACCESS_KEY = 'test';
process.env.S3_SECRET_KEY = 'test';
process.env.S3_BUCKET_NAME = 'test';
process.env.S3_PUBLIC_URL = 'http://localhost:9000';
process.env.BCRYPT_ROUNDS = '10';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.CORS_ORIGIN = '*';
process.env.ENABLE_AI_FALLBACK = 'true';
process.env.ENABLE_REQUEST_LOGGING = 'true';
process.env.ENABLE_SWAGGER = 'true';
process.env.LOG_LEVEL = 'debug';
process.env.LOG_PRETTY = 'true';

// Global test setup
beforeAll(() => {
  // Global setup before all tests
});

afterEach(() => {
  // Clean up after each test
  cleanup();
  jest.clearAllMocks();
});

afterAll(() => {
  // Global teardown after all tests
});
