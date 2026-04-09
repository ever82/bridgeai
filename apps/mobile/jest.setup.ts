import { cleanup } from '@testing-library/react-native';

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
