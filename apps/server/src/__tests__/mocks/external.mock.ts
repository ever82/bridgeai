/**
 * External API mock utilities
 */
export const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
  create: jest.fn(() => mockAxios),
  defaults: {
    headers: {
      common: {},
    },
  },
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
};

/**
 * Mock fetch for external API calls
 */
export function mockFetch(response: Response | Promise<Response>): void {
  global.fetch = jest.fn(() => Promise.resolve(response)) as jest.Mock;
}

/**
 * Create a mock Response for fetch
 */
export function createMockResponse<T>(
  data: T,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options;

  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Mock file system operations
 */
export const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  appendFile: jest.fn(),
  unlink: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  exists: jest.fn(),
};

/**
 * Reset all external API mocks
 */
export function resetApiMocks(): void {
  Object.values(mockAxios).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });

  if (jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.Mock).mockReset();
  }
}
