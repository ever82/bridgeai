import type { Request, Response, NextFunction } from 'express';

import { errorHandler } from '../errorHandler';
import { AppError, NotFoundError, ValidationError, UnauthorizedError } from '../../errors/AppError';
import { createMockRequest, createMockResponse, createMockNext } from '../../__tests__/helpers';
import { logger } from '../../utils/logger';

describe('errorHandler middleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest({
      path: '/api/v1/test',
      method: 'GET',
    });
    res = createMockResponse();
    next = createMockNext();

    // Add requestId to mock request
    (req as Request & { requestId?: string }).requestId = 'test-request-id';
  });

  describe('AppError handling', () => {
    it('should handle AppError with correct status code and response', () => {
      const error = new AppError('Custom error', 'CUSTOM_ERROR', 400);

      errorHandler(error, req, res, next);

      expect(res.statusCode).toBe(400);
      const responseBody = (res as unknown as { body: { success: boolean; message: string; errorCode: string } }).body;
      expect(responseBody.success).toBe(false);
      expect(responseBody.message).toBe('Custom error');
      expect(responseBody.errorCode).toBe('CUSTOM_ERROR');
    });

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('User');

      errorHandler(error, req, res, next);

      expect(res.statusCode).toBe(404);
      const responseBody = (res as unknown as { body: { message: string; errorCode: string } }).body;
      expect(responseBody.message).toBe('User not found');
      expect(responseBody.errorCode).toBe('RESOURCE_NOT_FOUND');
    });

    it('should handle ValidationError', () => {
      const error = new ValidationError('Email is required');

      errorHandler(error, req, res, next);

      expect(res.statusCode).toBe(400);
      const responseBody = (res as unknown as { body: { message: string; errorCode: string } }).body;
      expect(responseBody.message).toBe('Email is required');
      expect(responseBody.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should handle UnauthorizedError', () => {
      const error = new UnauthorizedError('Invalid token');

      errorHandler(error, req, res, next);

      expect(res.statusCode).toBe(401);
      const responseBody = (res as unknown as { body: { message: string; errorCode: string } }).body;
      expect(responseBody.message).toBe('Invalid token');
      expect(responseBody.errorCode).toBe('UNAUTHORIZED');
    });

    it('should include error details in response', () => {
      const details = { field: 'email', error: 'Invalid format' };
      const error = new ValidationError('Validation failed', details);

      errorHandler(error, req, res, next);

      const responseBody = (res as unknown as { body: { meta: { field: string; error: string } } }).body;
      expect(responseBody.meta.field).toBe('email');
      expect(responseBody.meta.error).toBe('Invalid format');
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic Error in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Database connection failed');

      errorHandler(error, req, res, next);

      expect(res.statusCode).toBe(500);
      const responseBody = (res as unknown as { body: { message: string; meta: { stack?: string } } }).body;
      expect(responseBody.message).toBe('Database connection failed');
      expect(responseBody.meta.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Sensitive database error');

      errorHandler(error, req, res, next);

      expect(res.statusCode).toBe(500);
      const responseBody = (res as unknown as { body: { message: string; meta?: { stack?: string } } }).body;
      expect(responseBody.message).toBe('Internal server error');
      expect(responseBody.meta?.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle ValidationError by name', () => {
      const error = new Error('Field validation failed');
      error.name = 'ValidationError';

      errorHandler(error, req, res, next);

      expect(res.statusCode).toBe(400);
      const responseBody = (res as unknown as { body: { errorCode: string } }).body;
      expect(responseBody.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should handle UnauthorizedError by name', () => {
      const error = new Error('Token expired');
      error.name = 'UnauthorizedError';

      errorHandler(error, req, res, next);

      expect(res.statusCode).toBe(401);
      const responseBody = (res as unknown as { body: { message: string; errorCode: string } }).body;
      expect(responseBody.message).toBe('Unauthorized');
      expect(responseBody.errorCode).toBe('UNAUTHORIZED');
    });

    it('should handle SyntaxError with body property', () => {
      const error = new SyntaxError('Unexpected token');
      // @ts-expect-error Adding body property for testing
      error.body = '{ invalid json';

      errorHandler(error, req, res, next);

      expect(res.statusCode).toBe(400);
      const responseBody = (res as unknown as { body: { message: string; errorCode: string } }).body;
      expect(responseBody.message).toBe('Invalid JSON payload');
      expect(responseBody.errorCode).toBe('INVALID_JSON');
    });
  });

  describe('Error logging', () => {
    it('should log error with request context', () => {
      const loggerSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      // Error should be logged with context
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });
});
