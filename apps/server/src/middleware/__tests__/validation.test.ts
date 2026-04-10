/**
 * Tests for validation middleware
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import {
  validate,
  validateBody,
  validateParams,
  validateQuery,
  sanitizeString,
  sanitizeObject,
} from '../validation';
import { ValidationError } from '../../errors';

// Mock request context
jest.mock('../requestContext', () => ({
  getRequestContext: () => ({
    logDebug: jest.fn(),
  }),
}));

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('validate', () => {
    const bodySchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });

    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
    });

    it('should pass validation with valid data', () => {
      mockReq.body = { name: 'John', email: 'john@example.com' };
      mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
      mockReq.query = { page: '1' };

      const middleware = validate({
        body: bodySchema,
        params: paramsSchema,
        query: querySchema,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
      expect(mockReq.body).toEqual({ name: 'John', email: 'john@example.com' });
      expect(mockReq.params).toEqual({ id: '550e8400-e29b-41d4-a716-446655440000' });
      expect(mockReq.query).toEqual({ page: 1 });
    });

    it('should fail validation with invalid body', () => {
      mockReq.body = { name: '', email: 'invalid-email' };

      const middleware = validate({ body: bodySchema });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0] as ValidationError;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details?.target).toBe('body');
    });

    it('should fail validation with invalid params', () => {
      mockReq.params = { id: 'invalid-uuid' };

      const middleware = validate({ params: paramsSchema });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0] as ValidationError;
      expect(error.details?.target).toBe('params');
    });

    it('should fail validation with invalid query', () => {
      mockReq.query = { page: '-1' };

      const middleware = validate({ query: querySchema });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = mockNext.mock.calls[0][0] as ValidationError;
      expect(error.details?.target).toBe('query');
    });

    it('should use default values from schema', () => {
      mockReq.query = {};

      const middleware = validate({ query: querySchema });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query).toEqual({ page: 1 });
    });

    it('should coerce types correctly', () => {
      mockReq.query = { page: '5' };

      const middleware = validate({ query: querySchema });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query).toEqual({ page: 5 });
      expect(typeof (mockReq.query as Record<string, unknown>).page).toBe('number');
    });
  });

  describe('validateBody', () => {
    const schema = z.object({
      title: z.string().min(1),
    });

    it('should validate body only', () => {
      mockReq.body = { title: 'Test' };

      const middleware = validateBody(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should fail with invalid body', () => {
      mockReq.body = { title: '' };

      const middleware = validateBody(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateParams', () => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    it('should validate params only', () => {
      mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      const middleware = validateParams(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should fail with invalid params', () => {
      mockReq.params = { id: 'invalid' };

      const middleware = validateParams(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateQuery', () => {
    const schema = z.object({
      search: z.string().optional(),
    });

    it('should validate query only', () => {
      mockReq.query = { search: 'test' };

      const middleware = validateQuery(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert(1)</script>')).toBe('alert(1)');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string fields in object', () => {
      const input = {
        name: '<script>alert(1)</script>',
        email: '  test@example.com  ',
        age: 25,
      };

      const result = sanitizeObject(input);

      expect(result.name).toBe('alert(1)');
      expect(result.email).toBe('test@example.com');
      expect(result.age).toBe(25);
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<script>test</script>',
        },
      };

      const result = sanitizeObject(input);

      expect(result.user.name).toBe('test');
    });
  });
});
