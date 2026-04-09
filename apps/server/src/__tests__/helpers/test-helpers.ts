import type { Request, Response, NextFunction } from 'express';

/**
 * Test helper utilities
 */

interface MockResponse extends Response {
  statusCode: number;
  body: unknown;
  headers: Record<string, string | string[]>;
  cookies: Record<string, { value: string; options?: unknown }>;
}

/**
 * Create a mock Express Request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Request {
  const req = {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    ip: '127.0.0.1',
    method: 'GET',
    url: '/',
    path: '/',
    protocol: 'http',
    hostname: 'localhost',
    ...overrides,
  } as unknown as Request;

  return req;
}

/**
 * Create a mock Express Response object
 */
export function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    headers: {},
    cookies: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
    send(data: unknown) {
      this.body = data;
      return this;
    },
    setHeader(name: string, value: string | string[]) {
      this.headers[name] = value;
      return this;
    },
    getHeader(name: string) {
      return this.headers[name];
    },
    cookie(name: string, value: string, options?: unknown) {
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie(name: string) {
      delete this.cookies[name];
      return this;
    },
    end() {
      return this;
    },
  } as MockResponse;

  return res;
}

/**
 * Create a mock NextFunction
 */
export function createMockNext(): NextFunction {
  return jest.fn() as unknown as NextFunction;
}

/**
 * Create mock request/response/next for middleware testing
 */
export function createMockMiddlewareArgs(
  reqOverrides: Partial<Request> = {}
): {
  req: Request;
  res: MockResponse;
  next: NextFunction;
} {
  return {
    req: createMockRequest(reqOverrides),
    res: createMockResponse(),
    next: createMockNext(),
  };
}

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a valid UUID v4 for testing
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Type guard for error objects
 */
export function isError(obj: unknown): obj is Error {
  return obj instanceof Error ||
    (typeof obj === 'object' &&
      obj !== null &&
      'message' in obj &&
      typeof (obj as Error).message === 'string');
}
