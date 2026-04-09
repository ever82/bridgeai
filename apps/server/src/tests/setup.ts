// Test setup file - runs before each test file
import { setupTestDatabase, teardownTestDatabase, globalFixtures } from './helpers/database';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration-tests';

// Set test database URL
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ||
  'postgresql://test:test@localhost:5432/visionshare_test';

// Setup before all tests in each file
beforeAll(async () => {
  await setupTestDatabase();
});

// Teardown after all tests in each file
afterAll(async () => {
  await globalFixtures.cleanup();
  await teardownTestDatabase();
});

// Global test timeout (30 seconds)
jest.setTimeout(30000);

// Suppress console output during tests (optional)
// Uncomment to reduce noise in test output
// jest.spyOn(console, 'log').mockImplementation(() => {});
// jest.spyOn(console, 'info').mockImplementation(() => {});
// jest.spyOn(console, 'warn').mockImplementation(() => {});
// jest.spyOn(console, 'error').mockImplementation(() => {});
