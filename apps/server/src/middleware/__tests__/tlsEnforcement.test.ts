import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

import { tlsEnforcement } from '../tlsEnforcement';

describe('TLS Enforcement Middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let redirectUrl: string | null;
  let responseStatus: number | null;
  let responseBody: any;
  let headers: Record<string, string>;

  beforeEach(() => {
    redirectUrl = null;
    responseStatus = null;
    responseBody = null;
    headers = {};

    mockReq = {
      headers: {},
      originalUrl: '/api/test',
    };

    mockRes = {
      redirect(status: number, url: string) {
        responseStatus = status;
        redirectUrl = url;
        return mockRes as Response;
      },
      status(code: number) {
        responseStatus = code;
        return {
          json(body: any) {
            responseBody = body;
          },
        } as any;
      },
      setHeader(key: string, value: string) {
        headers[key] = value;
      },
      json(body: any) {
        responseBody = body;
      },
    } as Partial<Response>;

    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should skip enforcement in non-production environment', () => {
    process.env.NODE_ENV = 'development';
    const middleware = tlsEnforcement();

    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(redirectUrl).toBeNull();
  });

  it('should redirect HTTP to HTTPS in production', () => {
    process.env.NODE_ENV = 'production';
    mockReq!.headers = { host: 'example.com' };
    mockReq!.headers['x-forwarded-proto'] = 'http';

    const middleware = tlsEnforcement();
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(redirectUrl).toBe('https://example.com/api/test');
  });

  it('should set HSTS header for HTTPS requests in production', () => {
    process.env.NODE_ENV = 'production';
    mockReq!.headers['x-forwarded-proto'] = 'https';
    mockReq!.headers['host'] = 'example.com';

    const middleware = tlsEnforcement();
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(headers['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains; preload'
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should reject request without host in production', () => {
    process.env.NODE_ENV = 'production';
    mockReq!.headers['x-forwarded-proto'] = 'http';
    delete mockReq!.headers['host'];

    const middleware = tlsEnforcement();
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(responseStatus).toBe(400);
    expect(responseBody.error).toBe('HTTPS_REQUIRED');
  });
});
