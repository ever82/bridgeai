/**
 * Tests for DDoS Protection Middleware
 */
import { Request, Response } from 'express';

import {
  ddosProtection,
  slowAttackProtection,
  trafficMonitor,
  getDDoSStats,
  manuallyBlockIP,
  unblockIP,
  getBlockedIPs,
  isMaliciousRequest,
} from '../ddosProtection';

// Mock request context
jest.mock('../requestContext', () => ({
  getRequestContext: () => ({
    logWarning: jest.fn(),
    logInfo: jest.fn(),
  }),
}));

// Type for mock request with writable properties
interface MockRequest extends Partial<Request> {
  ip: string;
  path: string;
  user?: Record<string, unknown>;
}

// Mock console methods
const originalWarn = console.warn;
const originalLog = console.log;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockFn = (...args: any[]) => any;

describe('DDoS Protection Middleware', () => {
  let mockReq: MockRequest;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let responseListeners: Map<string, MockFn[]>;

  beforeEach(() => {
    responseListeners = new Map();
    mockReq = {
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket: { remoteAddress: '127.0.0.1' } as any,
      headers: { 'user-agent': 'test-agent' },
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      headersSent: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      on: jest.fn((event: string, handler: MockFn) => {
        if (!responseListeners.has(event)) {
          responseListeners.set(event, []);
        }
        responseListeners.get(event)!.push(handler);
        return mockRes;
      }) as any,
    };
    mockNext = jest.fn();

    // Mock console
    console.warn = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    console.warn = originalWarn;
    console.log = originalLog;
  });

  describe('ddosProtection', () => {
    it('should allow whitelisted IPs', () => {
      mockReq.ip = '127.0.0.1';

      ddosProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should add DDoS protection headers', () => {
      ddosProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-DDOS-Protection', 'active');
    });

    it('should block requests when IP is already blocked', () => {
      const testIP = '192.168.1.100';
      mockReq.ip = testIP;

      // First block the IP
      manuallyBlockIP(testIP, 60, 'Test block');

      // Then make a request
      ddosProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'IP_BLOCKED',
          }),
        })
      );
    });

    it('should detect burst attacks', () => {
      const testIP = '10.0.0.1';
      mockReq.ip = testIP;

      // Simulate burst of requests
      for (let i = 0; i < 60; i++) {
        ddosProtection(mockReq as Request, mockRes as Response, mockNext);
      }

      // Should have logged warnings
      expect(console.warn).toHaveBeenCalled();
    });

    it('should skip health check endpoints', () => {
      mockReq.path = '/health';

      ddosProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('slowAttackProtection', () => {
    it('should be a function', () => {
      expect(typeof slowAttackProtection).toBe('function');
    });

    it('should return a middleware function', () => {
      const middleware = slowAttackProtection(5000);
      expect(typeof middleware).toBe('function');
    });

    it('should handle response finish', () => {
      const middleware = slowAttackProtection(5000);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Simulate response finish
      const finishHandlers = responseListeners.get('finish') || [];
      finishHandlers.forEach(handler => handler());

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('trafficMonitor', () => {
    it('should track traffic', () => {
      trafficMonitor(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('IP blocking functions', () => {
    it('should block an IP manually', () => {
      const result = manuallyBlockIP('192.168.1.1', 60, 'Test reason');
      expect(result).toBe(true);

      const blocked = getBlockedIPs();
      expect(blocked.some(b => b.ip === '192.168.1.1')).toBe(true);
    });

    it('should not block whitelisted IPs', () => {
      const result = manuallyBlockIP('127.0.0.1', 60, 'Test');
      expect(result).toBe(false);
    });

    it('should unblock an IP', () => {
      const ip = '192.168.1.2';
      manuallyBlockIP(ip, 60, 'Test');

      const result = unblockIP(ip);
      expect(result).toBe(true);
    });

    it('should return false when unblocking non-existent IP', () => {
      const result = unblockIP('192.168.1.999');
      expect(result).toBe(false);
    });
  });

  describe('getDDoSStats', () => {
    it('should return stats object', () => {
      const stats = getDDoSStats();

      expect(stats).toHaveProperty('activeBlocks');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('flaggedIPs');
      expect(stats).toHaveProperty('blockedIPs');
    });
  });

  describe('isMaliciousRequest', () => {
    it('should detect suspicious User-Agent', () => {
      mockReq.headers = { 'user-agent': '' };

      const result = isMaliciousRequest(mockReq as Request);

      expect(result.isMalicious).toBe(true);
      expect(result.reasons).toContain('Suspicious User-Agent');
    });

    it('should detect automated tools on non-API paths', () => {
      mockReq.headers = { 'user-agent': 'curl/7.68.0' };
      mockReq.path = '/some-page';

      const result = isMaliciousRequest(mockReq as Request);

      expect(result.reasons).toContain('Automated tool detected');
    });

    it('should allow normal requests', () => {
      mockReq.headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
      mockReq.path = '/api/users';

      const result = isMaliciousRequest(mockReq as Request);

      expect(result.isMalicious).toBe(false);
    });
  });
});
