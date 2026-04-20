/**
 * Performance Middleware Tests
 */

import { Request, Response } from 'express';

import {
  performanceMonitor,
  trackDatabaseQuery,
  trackMemoryUsage,
  performanceHeaders,
  RequestWithPerformance,
} from '../performance';

// Mock Sentry functions
jest.mock('../utils/sentry', () => ({
  startTransaction: jest.fn(() => ({
    setHttpStatus: jest.fn(),
    setTag: jest.fn(),
    setData: jest.fn(),
    finish: jest.fn(),
  })),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

describe('Performance Middleware', () => {
  let mockRequest: Partial<RequestWithPerformance>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test',
      route: { path: '/test' },
      url: '/test?foo=bar',
      headers: {
        'user-agent': 'test-agent',
        host: 'localhost:3000',
      },
      query: { foo: 'bar' },
    };

    mockResponse = {
      statusCode: 200,
      end: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      on: jest.fn(),
    };

    nextFunction = jest.fn();

    jest.clearAllMocks();
  });

  describe('performanceMonitor', () => {
    it('should track request start time', () => {
      performanceMonitor(
        mockRequest as RequestWithPerformance,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.performanceMetrics).toBeDefined();
      expect(mockRequest.performanceMetrics?.startTime).toBeLessThanOrEqual(Date.now());
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should add performance headers to response', () => {
      performanceHeaders(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should set X-Response-Time header', () => {
      let finishCallback: () => void;

      mockResponse.on = jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      performanceHeaders(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      finishCallback?.();

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Response-Time',
        expect.stringMatching(/\d+ms/)
      );
    });
  });

  describe('trackDatabaseQuery', () => {
    it('should track successful query duration', async () => {
      const mockQuery = jest.fn().mockResolvedValue('result');

      const result = await trackDatabaseQuery('findMany', 'User', mockQuery);

      expect(result).toBe('result');
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should track failed query and re-throw error', async () => {
      const error = new Error('Database error');
      const mockQuery = jest.fn().mockRejectedValue(error);

      await expect(
        trackDatabaseQuery('findMany', 'User', mockQuery)
      ).rejects.toThrow('Database error');
    });

    it('should warn on slow queries (>500ms)', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const slowQuery = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(() => resolve('result'), 600));
      });

      await trackDatabaseQuery('findMany', 'User', slowQuery);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Performance] Slow database query')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('trackMemoryUsage', () => {
    it('should log memory usage without throwing', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      expect(() => trackMemoryUsage()).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
