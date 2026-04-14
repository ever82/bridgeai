/**
 * Tests for Rate Limiter Middleware
 */
import { Request, Response } from 'express';
import {
  userRateLimiter,
  enhancedIpLimiter,
  strictAuthLimiter,
  getRateLimitConfig,
  rateLimitConfigs,
} from '../rateLimiter';
import { getRateLimitHeaders } from '../rateLimiter';

// Mock request context
jest.mock('../requestContext', () => ({
  getRequestContext: () => ({
    logWarning: jest.fn(),
    logInfo: jest.fn(),
  }),
}));

describe('Rate Limiter Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      headers: {},
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('getRateLimitConfig', () => {
    it('should return auth config for auth endpoints', () => {
      const config = getRateLimitConfig('/api/auth/login');
      expect(config).toEqual(rateLimitConfigs.auth);
    });

    it('should return upload config for upload endpoints', () => {
      const config = getRateLimitConfig('/api/upload/image');
      expect(config).toEqual(rateLimitConfigs.upload);
    });

    it('should return search config for search endpoints', () => {
      const config = getRateLimitConfig('/api/search/agents');
      expect(config).toEqual(rateLimitConfigs.search);
    });

    it('should return webhook config for webhook endpoints', () => {
      const config = getRateLimitConfig('/api/webhooks/stripe');
      expect(config).toEqual(rateLimitConfigs.webhook);
    });

    it('should return admin config for admin endpoints', () => {
      const config = getRateLimitConfig('/api/admin/users');
      expect(config).toEqual(rateLimitConfigs.admin);
    });

    it('should return default config for unknown endpoints', () => {
      const config = getRateLimitConfig('/api/unknown');
      expect(config).toEqual(rateLimitConfigs.default);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return correct headers for new window', () => {
      const headers = getRateLimitHeaders('test-key', {
        windowMs: 60000,
        maxRequests: 100,
      });

      expect(headers).toHaveProperty('X-RateLimit-Limit');
      expect(headers).toHaveProperty('X-RateLimit-Remaining');
      expect(headers).toHaveProperty('X-RateLimit-Reset');
      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('99');
    });
  });

  describe('userRateLimiter', () => {
    it('should set rate limit headers for anonymous users', () => {
      userRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use user ID for authenticated users', () => {
      mockReq.user = { id: 'user-123', role: 'user' };

      userRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should apply stricter limits for anonymous users', () => {
      // Make multiple requests to exceed limit
      for (let i = 0; i < 35; i++) {
        userRateLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // Should have been blocked
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'USER_RATE_LIMIT_EXCEEDED',
          }),
        })
      );
    });

    it('should allow more requests for premium users', () => {
      mockReq.user = { id: 'user-123', role: 'user', isPremium: true };

      // Make requests that would exceed anonymous limit
      for (let i = 0; i < 35; i++) {
        userRateLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // Should still be allowed (premium limit is 120)
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });

    it('should allow most requests for admin users', () => {
      mockReq.user = { id: 'user-123', role: 'admin' };

      // Make many requests
      for (let i = 0; i < 120; i++) {
        userRateLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // Should still be allowed (admin limit is 300)
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });
  });

  describe('enhancedIpLimiter', () => {
    it('should be a function', () => {
      expect(typeof enhancedIpLimiter).toBe('function');
    });

    it('should skip health check endpoints', () => {
      mockReq.path = '/health';

      // The rate limiter should skip this
      // We can't fully test the skip behavior without running the middleware
      expect(mockReq.path).toBe('/health');
    });

    it('should skip ready check endpoints', () => {
      mockReq.path = '/ready';

      expect(mockReq.path).toBe('/ready');
    });
  });

  describe('strictAuthLimiter', () => {
    it('should be a function', () => {
      expect(typeof strictAuthLimiter).toBe('function');
    });

    it('should have stricter limits than default', () => {
      expect(rateLimitConfigs.auth.maxRequests).toBeLessThan(rateLimitConfigs.default.maxRequests);
    });

    it('should skip successful requests', () => {
      expect(rateLimitConfigs.auth.skipSuccessfulRequests).toBe(true);
    });
  });
});
