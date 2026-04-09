import * as request from 'supertest';
import app from '../../app';

/**
 * HTTP Request helpers for integration tests
 * Provides base classes and utilities for making HTTP requests
 */

/**
 * HTTP methods supported
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request options interface
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  timeout?: number;
}

/**
 * Response wrapper with additional utilities
 */
export interface TestResponse<T = unknown> {
  status: number;
  body: T;
  headers: Record<string, string>;
  text: string;
}

/**
 * Base request class for API testing
 * Provides chainable methods for building requests
 */
export class RequestBuilder {
  private httpMethod: HttpMethod = 'GET';
  private requestPath: string = '';
  private bodyData: unknown = null;
  private requestHeaders: Record<string, string> = {};
  private queryParams: Record<string, string> = {};
  private requestTimeout: number = 30000;

  /**
   * Set HTTP method
   */
  setMethod(method: HttpMethod): this {
    this.httpMethod = method;
    return this;
  }

  /**
   * Set request path
   */
  setPath(path: string): this {
    this.requestPath = path;
    return this;
  }

  /**
   * Set request body
   */
  setBody(data: unknown): this {
    this.bodyData = data;
    return this;
  }

  /**
   * Set request headers
   */
  setHeaders(headers: Record<string, string>): this {
    this.requestHeaders = { ...this.requestHeaders, ...headers };
    return this;
  }

  /**
   * Set authorization header
   */
  setAuth(token: string): this {
    this.requestHeaders.Authorization = `Bearer ${token}`;
    return this;
  }

  /**
   * Set query parameters
   */
  setQuery(params: Record<string, string | number | boolean>): this {
    this.queryParams = Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>);
    return this;
  }

  /**
   * Set request timeout
   */
  setTimeout(ms: number): this {
    this.requestTimeout = ms;
    return this;
  }

  /**
   * Execute the request
   */
  async execute<T = unknown>(): Promise<TestResponse<T>> {
    const methodLower = this.httpMethod.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
    let req = (request(app) as any)[methodLower](this.requestPath);

    // Set timeout
    req = req.timeout(this.requestTimeout);

    // Set headers
    Object.entries(this.requestHeaders).forEach(([key, value]) => {
      req = req.set(key, value);
    });

    // Set query parameters
    if (Object.keys(this.queryParams).length > 0) {
      req = req.query(this.queryParams);
    }

    // Set body for non-GET requests
    if (this.bodyData !== null && this.httpMethod !== 'GET') {
      req = req.send(this.bodyData);
    }

    const res = await req;

    return {
      status: res.status,
      body: res.body as T,
      headers: res.headers as Record<string, string>,
      text: res.text,
    };
  }
}

/**
 * Convenience methods for common request patterns
 */
export const Request = {
  /**
   * Create a new request builder
   */
  builder(): RequestBuilder {
    return new RequestBuilder();
  },

  /**
   * GET request
   */
  async get<T = unknown>(
    path: string,
    options: RequestOptions = {}
  ): Promise<TestResponse<T>> {
    const builder = new RequestBuilder()
      .setMethod('GET')
      .setPath(path);

    if (options.headers) {
      builder.setHeaders(options.headers);
    }

    if (options.query) {
      builder.setQuery(options.query);
    }

    if (options.timeout) {
      builder.setTimeout(options.timeout);
    }

    return builder.execute<T>();
  },

  /**
   * POST request
   */
  async post<T = unknown>(
    path: string,
    body: unknown,
    options: RequestOptions = {}
  ): Promise<TestResponse<T>> {
    const builder = new RequestBuilder()
      .setMethod('POST')
      .setPath(path)
      .setBody(body);

    if (options.headers) {
      builder.setHeaders(options.headers);
    }

    if (options.timeout) {
      builder.setTimeout(options.timeout);
    }

    return builder.execute<T>();
  },

  /**
   * PUT request
   */
  async put<T = unknown>(
    path: string,
    body: unknown,
    options: RequestOptions = {}
  ): Promise<TestResponse<T>> {
    const builder = new RequestBuilder()
      .setMethod('PUT')
      .setPath(path)
      .setBody(body);

    if (options.headers) {
      builder.setHeaders(options.headers);
    }

    if (options.timeout) {
      builder.setTimeout(options.timeout);
    }

    return builder.execute<T>();
  },

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    path: string,
    body: unknown,
    options: RequestOptions = {}
  ): Promise<TestResponse<T>> {
    const builder = new RequestBuilder()
      .setMethod('PATCH')
      .setPath(path)
      .setBody(body);

    if (options.headers) {
      builder.setHeaders(options.headers);
    }

    if (options.timeout) {
      builder.setTimeout(options.timeout);
    }

    return builder.execute<T>();
  },

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    path: string,
    options: RequestOptions = {}
  ): Promise<TestResponse<T>> {
    const builder = new RequestBuilder()
      .setMethod('DELETE')
      .setPath(path);

    if (options.headers) {
      builder.setHeaders(options.headers);
    }

    if (options.timeout) {
      builder.setTimeout(options.timeout);
    }

    return builder.execute<T>();
  },
};

/**
 * API base paths
 */
export const ApiPaths = {
  v1: (path: string) => `/api/v1${path}`,
  health: '/health',
  ready: '/ready',
  auth: {
    register: '/api/v1/auth/register',
    login: '/api/v1/auth/login',
    logout: '/api/v1/auth/logout',
    refresh: '/api/v1/auth/refresh',
    me: '/api/v1/auth/me',
  },
  users: {
    list: '/api/v1/users',
    detail: (id: string) => `/api/v1/users/${id}`,
    update: (id: string) => `/api/v1/users/${id}`,
    delete: (id: string) => `/api/v1/users/${id}`,
  },
  agents: {
    list: '/api/v1/agents',
    detail: (id: string) => `/api/v1/agents/${id}`,
    create: '/api/v1/agents',
    update: (id: string) => `/api/v1/agents/${id}`,
    delete: (id: string) => `/api/v1/agents/${id}`,
  },
};

/**
 * Default headers for JSON API requests
 */
export const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/**
 * Error response helper
 * Extracts error details from response for assertions
 */
export function extractError(response: TestResponse): {
  message: string;
  code?: string;
  details?: unknown;
} {
  if (!response.body || typeof response.body !== 'object') {
    return { message: response.text || 'Unknown error' };
  }

  const body = response.body as Record<string, unknown>;
  return {
    message: String(body.message || body.error || 'Unknown error'),
    code: body.errorCode as string | undefined,
    details: body.details,
  };
}

/**
 * Check if response is successful (2xx)
 */
export function isSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Check if response is client error (4xx)
 */
export function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * Check if response is server error (5xx)
 */
export function isServerError(status: number): boolean {
  return status >= 500 && status < 600;
}

/**
 * Request error handler for common error scenarios
 */
export async function withErrorHandling<T>(
  fn: () => Promise<TestResponse<T>>
): Promise<TestResponse<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      return {
        status: 408,
        body: { error: 'Request timeout' } as unknown as T,
        headers: {},
        text: 'Request timeout',
      };
    }

    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return {
        status: 503,
        body: { error: 'Service unavailable' } as unknown as T,
        headers: {},
        text: 'Service unavailable',
      };
    }

    throw error;
  }
}

export default {
  RequestBuilder,
  Request,
  ApiPaths,
  defaultHeaders,
  extractError,
  isSuccess,
  isClientError,
  isServerError,
  withErrorHandling,
};
