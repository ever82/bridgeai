/**
 * Tests for security middleware
 */
import { Request, Response } from 'express';

import {
  xssProtection,
  sqlInjectionProtection,
  nosqlInjectionProtection,
  escapeHtml,
} from '../security';

// Mock request context
jest.mock('../requestContext', () => ({
  getRequestContext: () => ({
    logWarning: jest.fn(),
  }),
}));

describe('Security Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      path: '/test',
      method: 'POST',
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('xssProtection', () => {
    it('should allow safe content', () => {
      mockReq.body = { name: 'John Doe', message: 'Hello World' };

      xssProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block script tags in body', () => {
      mockReq.body = { content: '<script>alert(1)</script>' };

      xssProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'XSS_DETECTED',
          }),
        })
      );
    });

    it('should block javascript: protocol', () => {
      mockReq.body = { url: 'javascript:alert(1)' };

      xssProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should block event handlers', () => {
      mockReq.body = { content: '<img onerror=alert(1) src=x>' };

      xssProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should block iframes', () => {
      mockReq.body = { content: '<iframe src="evil.com"></iframe>' };

      xssProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should check query parameters', () => {
      mockReq.query = { search: '<script>alert(1)</script>' };

      xssProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should check nested objects', () => {
      mockReq.body = {
        user: {
          bio: '<script>alert(1)</script>',
        },
      };

      xssProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle arrays', () => {
      mockReq.body = {
        items: ['<script>alert(1)</script>'],
      };

      xssProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should call next() for safe requests', () => {
      mockReq.body = { safe: 'content' };

      xssProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('sqlInjectionProtection', () => {
    it('should allow safe content', () => {
      mockReq.body = { name: "John O'Brien", search: 'test query' };

      sqlInjectionProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block SQL UNION attack', () => {
      mockReq.body = { id: "1' UNION SELECT * FROM users--" };

      sqlInjectionProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SQL_INJECTION_DETECTED',
          }),
        })
      );
    });

    it('should block SQL comment attack', () => {
      mockReq.body = { id: '1; DROP TABLE users--' };

      sqlInjectionProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should check query parameters', () => {
      mockReq.query = { filter: "name=' OR '1'='1" };

      sqlInjectionProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('nosqlInjectionProtection', () => {
    it('should allow safe content', () => {
      mockReq.body = { name: 'John', age: 30 };

      nosqlInjectionProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block MongoDB operator in key', () => {
      mockReq.body = { $where: 'this.password.length > 0' };

      nosqlInjectionProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOSQL_INJECTION_DETECTED',
          }),
        })
      );
    });

    it('should block nested MongoDB operators', () => {
      mockReq.body = {
        user: {
          $ne: null,
        },
      };

      nosqlInjectionProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should check query parameters', () => {
      mockReq.query = { $gt: '' };

      nosqlInjectionProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('escapeHtml', () => {
    it('should escape < character', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape > character', () => {
      expect(escapeHtml('text>')).toBe('text&gt;');
    });

    it('should escape & character', () => {
      expect(escapeHtml('AT&T')).toBe('AT&amp;T');
    });

    it('should escape " character', () => {
      expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('should escape \' character', () => {
      expect(escapeHtml("it's")).toBe('it&#x27;s');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });
});
