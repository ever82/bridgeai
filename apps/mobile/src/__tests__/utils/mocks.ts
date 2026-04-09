import { jest } from '@jest/globals';

/**
 * Mock implementations for common async operations
 */
export const mockAsyncStorage = {
  getItem: jest.fn(async (_key: string) => null),
  setItem: jest.fn(async (_key: string, _value: string) => {}),
  removeItem: jest.fn(async (_key: string) => {}),
};

/**
 * Mock navigation props for testing components with navigation
 */
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  setOptions: jest.fn(),
};

export const mockRoute = {
  key: 'test-route',
  name: 'TestScreen',
  params: {},
};

/**
 * Create a mock API response
 */
export function createMockResponse<T>(data: T, status = 200) {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {},
  };
}

/**
 * Create a mock API error
 */
export function createMockError(message: string, status = 500) {
  const error = new Error(message);
  return {
    ...error,
    response: {
      data: { message },
      status,
      statusText: 'Error',
    },
    isAxiosError: true,
  };
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock event
 */
export function createMockEvent(overrides = {}) {
  return {
    nativeEvent: {
      text: '',
      target: 0,
      ...overrides,
    },
  };
}
