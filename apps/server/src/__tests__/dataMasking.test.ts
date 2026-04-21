import { describe, it, expect } from '@jest/globals';

import { maskObject, maskPhone, maskEmail, maskLogMessage } from '../utils/mask';

describe('Data Masking Middleware', () => {
  describe('maskObject for API responses', () => {
    it('should mask user PII in response data', () => {
      const user = {
        id: '123',
        name: 'John',
        phone: '13812345678',
        email: 'test@example.com',
        idCard: '110101199001011234',
        bankCard: '6222021234567890123',
      };

      const masked = maskObject(user);

      expect(masked.id).toBe('123');
      expect(masked.name).toBe('John');
      // phone matches mobile pattern → maskPhone → preserveStart=3, preserveEnd=4
      expect(masked.phone).toContain('138');
      expect(masked.phone).toContain('5678');
      expect(masked.phone).toContain('*');
      expect(masked.phone).not.toBe('13812345678');
      // email is sensitive field → masked
      expect(masked.email).not.toBe('test@example.com');
      expect(masked.email).toContain('@example.com');
      expect(masked.email).toContain('*');
      // idCard matches pattern → masked
      expect(masked.idCard).not.toBe('110101199001011234');
      expect(masked.idCard).toContain('*');
      // bankCard matches pattern → masked
      expect(masked.bankCard).not.toBe('6222021234567890123');
      expect(masked.bankCard).toContain('*');
    });

    it('should mask nested objects', () => {
      const response = {
        success: true,
        data: {
          user: {
            phone: '13812345678',
            email: 'user@example.com',
          },
        },
      };

      const masked = maskObject(response);

      expect(masked.success).toBe(true);
      expect(masked.data.user.phone).not.toBe('13812345678');
      expect(masked.data.user.phone).toContain('*');
      expect(masked.data.user.email).not.toBe('user@example.com');
      expect(masked.data.user.email).toContain('@example.com');
    });

    it('should handle arrays', () => {
      const users = [
        { id: '1', phone: '13812345678' },
        { id: '2', phone: '15098765432' },
      ];

      const masked = maskObject(users);
      expect(masked[0].phone).not.toBe('13812345678');
      expect(masked[0].phone).toContain('*');
      expect(masked[1].phone).not.toBe('15098765432');
      expect(masked[1].phone).toContain('*');
    });

    it('should handle null and undefined values', () => {
      const obj = { phone: null, email: undefined, idCard: '110101199001011234' };
      const masked = maskObject(obj);
      expect(masked.phone).toBeNull();
      expect(masked.email).toBeUndefined();
      expect(masked.idCard).toContain('*');
    });
  });

  describe('maskPhone', () => {
    it('should mask Chinese mobile numbers', () => {
      const masked = maskPhone('13812345678');
      expect(masked).toContain('138');
      expect(masked).toContain('5678');
      expect(masked).toContain('*');
      expect(masked).not.toBe('13812345678');
    });

    it('should handle edge cases', () => {
      expect(maskPhone('')).toBe('');
      expect(maskPhone('123')).toBe('123');
    });
  });

  describe('maskEmail', () => {
    it('should mask email addresses preserving domain', () => {
      const masked = maskEmail('test@example.com');
      expect(masked).toContain('@example.com');
      expect(masked).toContain('*');
      expect(masked).not.toBe('test@example.com');
    });

    it('should handle short local parts', () => {
      expect(maskEmail('ab@example.com')).toBe('ab@example.com');
    });
  });

  describe('maskLogMessage', () => {
    it('should mask phone numbers in logs', () => {
      const msg = 'User phone: 13812345678 called';
      const masked = maskLogMessage(msg);
      expect(masked).not.toContain('13812345678');
      expect(masked).toContain('138****5678');
    });

    it('should mask multiple types in one message', () => {
      const msg = 'User phone: 13812345678, ID: 110101199001011234';
      const masked = maskLogMessage(msg);
      expect(masked).not.toContain('13812345678');
      expect(masked).not.toContain('110101199001011234');
      expect(masked).toContain('*');
    });
  });
});
