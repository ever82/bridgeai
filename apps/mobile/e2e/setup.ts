import { cleanup, init } from 'detox';
import adapter from 'detox/runners/jest/adapter';
import specReporter from 'detox/runners/jest/specReporter';
import { DataCleanup } from './support/data-cleanup';
import { TestIsolation } from './support/test-isolation';

// Assign Detox adapter to Jest's jasmine
jasmine.getEnv().addReporter(adapter);

// Add custom spec reporter
jasmine.getEnv().addReporter(specReporter);

// Test timeout: 2 minutes
jest.setTimeout(120000);

beforeAll(async () => {
  await init();

  // Initialize test isolation
  TestIsolation.initialize();
});

beforeEach(async () => {
  // Generate unique test user ID for isolation
  const testUserId = TestIsolation.generateTestUserId();

  // Store in global for test access
  (global as any).testUserId = testUserId;
  (global as any).testTimestamp = Date.now();
});

afterEach(async () => {
  // Cleanup test data regardless of test result
  await DataCleanup.cleanupTestData((global as any).testUserId);

  // Reset app state if needed
  await device.reloadReactNative();
});

afterAll(async () => {
  await cleanup();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
