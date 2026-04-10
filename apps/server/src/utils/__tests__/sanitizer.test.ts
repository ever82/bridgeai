/**
 * Sanitizer Tests
 */

import {
  sanitizeString,
  sanitizeObject,
  sanitizeBody,
  sanitizeUrl,
  sanitizeHeaders,
  createSanitizer,
} from '../sanitizer';

describe('Sanitizer', () => {
  describe('sanitizeString', () => {
    it('should redact password in JSON', () => {
      const input = '{"username":"test","password":"secret123"}';
      const result = sanitizeString(input);

      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('secret123');
    });

    it('should redact token in JSON', () => {
      const input = '{"token":"abc123","accessToken":"xyz789"}';
      const result = sanitizeString(input);

      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('abc123');
    });

    it('should mask phone numbers', () => {
      const input = 'Contact: 13812345678';
      const result = sanitizeString(input);

      expect(result).toBe('Contact: 138****5678');
    });

    it('should mask email addresses', () => {
      const input = 'Email: user@example.com';
      const result = sanitizeString(input);

      expect(result).toContain('***');
      expect(result).not.toContain('user@example.com');
    });

    it('should redact authorization header', () => {
      const input = 'authorization: Bearer token123';
      const result = sanitizeString(input);

      expect(result).toBe('authorization=[REDACTED]');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as unknown as string)).toBeNull();
      expect(sanitizeString(undefined as unknown as string)).toBeUndefined();
    });
  });

  describe('sanitizeObject', () => {
    it('should redact sensitive fields', () => {
      const input = {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123',
        email: 'user@example.com',
      };

      const result = sanitizeObject(input);

      expect(result.username).toBe('testuser');
      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.email).toBeDefined();
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: 'test',
          password: 'secret',
        },
        data: {
          token: 'abc123',
        },
      };

      const result = sanitizeObject(input);

      expect(result.user.password).toBe('[REDACTED]');
      expect(result.data.token).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const input = {
        users: [{ password: 'secret1' }, { password: 'secret2' }],
      };

      const result = sanitizeObject(input);

      expect(result.users[0].password).toBe('[REDACTED]');
      expect(result.users[1].password).toBe('[REDACTED]');
    });

    it('should handle custom sensitive fields', () => {
      const input = {
        customSecret: 'secret',
        normalField: 'normal',
      };

      const result = sanitizeObject(input, ['customSecret']);

      expect(result.customSecret).toBe('[REDACTED]');
      expect(result.normalField).toBe('normal');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null as unknown as Record<string, unknown>)).toBeNull();
      expect(sanitizeObject(undefined as unknown as Record<string, unknown>)).toBeUndefined();
    });
  });

  describe('sanitizeBody', () => {
    it('should sanitize string body', () => {
      const input = '{"password":"secret"}';
      const result = sanitizeBody(input);

      expect(result).toContain('[REDACTED]');
    });

    it('should sanitize object body', () => {
      const input = { password: 'secret', data: 'value' };
      const result = sanitizeBody(input) as Record<string, string>;

      expect(result.password).toBe('[REDACTED]');
      expect(result.data).toBe('value');
    });

    it('should return non-object body unchanged', () => {
      expect(sanitizeBody(123)).toBe(123);
      expect(sanitizeBody(true)).toBe(true);
    });
  });

  describe('sanitizeUrl', () => {
    it('should redact token query param', () => {
      const url = 'https://api.example.com/data?token=secret123&id=1';
      const result = sanitizeUrl(url);

      expect(result).toContain('[REDACTED]');
      expect(result).toContain('id=1');
      expect(result).not.toContain('secret123');
    });

    it('should handle invalid URL', () => {
      const url = 'not-a-valid-url?password=secret';
      const result = sanitizeUrl(url);

      expect(result).toContain('[REDACTED]');
    });

    it('should return empty string for empty input', () => {
      expect(sanitizeUrl('')).toBe('');
    });
  });

  describe('sanitizeHeaders', () => {
    it('should redact authorization header', () => {
      const headers = {
        'content-type': 'application/json',
        authorization: 'Bearer token123',
      };

      const result = sanitizeHeaders(headers);

      expect(result['content-type']).toBe('application/json');
      expect(result.authorization).toBe('[REDACTED]');
    });

    it('should redact cookie header', () => {
      const headers = {
        cookie: 'session=abc123',
      };

      const result = sanitizeHeaders(headers);

      expect(result.cookie).toBe('[REDACTED]');
    });

    it('should handle array header values', () => {
      const headers = {
        authorization: ['Bearer token1', 'Bearer token2'],
      };

      const result = sanitizeHeaders(headers);

      expect(result.authorization).toEqual(['[REDACTED]']);
    });

    it('should handle undefined header values', () => {
      const headers = {
        authorization: undefined,
      };

      const result = sanitizeHeaders(headers);

      expect(result.authorization).toBeUndefined();
    });
  });

  describe('createSanitizer', () => {
    it('should return sanitizer functions', () => {
      const sanitizer = createSanitizer();

      expect(sanitizer.string).toBeDefined();
      expect(sanitizer.object).toBeDefined();
      expect(sanitizer.body).toBeDefined();
      expect(sanitizer.url).toBeDefined();
      expect(sanitizer.headers).toBeDefined();
    });
  });
});
