/**
 * Tests for mask utilities
 */
import {
  maskPhone,
  maskEmail,
  maskIdCard,
  maskBankCard,
  maskPassport,
  maskString,
  maskObject,
  maskJson,
  maskLogMessage,
} from '../utils/mask';

describe('Mask Utils', () => {
  describe('maskPhone', () => {
    it('should mask phone number correctly', () => {
      expect(maskPhone('13812345678')).toBe('138****5678');
      expect(maskPhone('15098765432')).toBe('150****5432');
    });

    it('should return short strings unchanged', () => {
      expect(maskPhone('123')).toBe('123');
      expect(maskPhone('123456')).toBe('123456');
    });

    it('should handle empty strings', () => {
      expect(maskPhone('')).toBe('');
    });
  });

  describe('maskEmail', () => {
    it('should mask email correctly', () => {
      expect(maskEmail('test@example.com')).toBe('te**@example.com');
      expect(maskEmail('user123@gmail.com')).toBe('us**23@gmail.com');
    });

    it('should return invalid emails unchanged', () => {
      expect(maskEmail('not-an-email')).toBe('not-an-email');
      expect(maskEmail('ab@example.com')).toBe('ab@example.com');
    });
  });

  describe('maskIdCard', () => {
    it('should mask ID card correctly', () => {
      expect(maskIdCard('110101199001011234')).toBe('1101********1234');
      expect(maskIdCard('31010119850515201X')).toBe('3101********201X');
    });

    it('should return short strings unchanged', () => {
      expect(maskIdCard('1234567')).toBe('1234567');
    });
  });

  describe('maskBankCard', () => {
    it('should mask bank card correctly', () => {
      expect(maskBankCard('6222021234567890123')).toBe('6222*********0123');
      expect(maskBankCard('6222021234567890')).toBe('6222********7890');
    });

    it('should return short strings unchanged', () => {
      expect(maskBankCard('1234567')).toBe('1234567');
    });
  });

  describe('maskPassport', () => {
    it('should mask passport correctly', () => {
      expect(maskPassport('E12345678')).toBe('E1******78');
      expect(maskPassport('G98765432')).toBe('G9******32');
    });

    it('should return short strings unchanged', () => {
      expect(maskPassport('ABC')).toBe('ABC');
    });
  });

  describe('maskString', () => {
    it('should mask with default options', () => {
      expect(maskString('1234567890')).toBe('123****890');
    });

    it('should mask with custom options', () => {
      expect(maskString('1234567890', { preserveStart: 2, preserveEnd: 2, maskChar: '#' })).toBe('12######90');
    });

    it('should handle short strings', () => {
      expect(maskString('12345')).toBe('*****');
    });
  });

  describe('maskObject', () => {
    it('should mask sensitive fields in object', () => {
      const obj = {
        name: 'John',
        phone: '13812345678',
        email: 'john@example.com',
        idCard: '110101199001011234',
      };

      const masked = maskObject(obj);

      expect(masked.name).toBe('John');
      expect(masked.phone).toBe('138****5678');
      expect(masked.email).toBe('jo**@example.com');
      expect(masked.idCard).toBe('1101********1234');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          phone: '13812345678',
        },
      };

      const masked = maskObject(obj);

      expect(masked.user.name).toBe('John');
      expect(masked.user.phone).toBe('138****5678');
    });

    it('should handle null and undefined', () => {
      const obj = {
        name: 'John',
        phone: null,
        email: undefined,
      };

      const masked = maskObject(obj);

      expect(masked.name).toBe('John');
      expect(masked.phone).toBeNull();
      expect(masked.email).toBeUndefined();
    });
  });

  describe('maskJson', () => {
    it('should mask JSON string', () => {
      const json = JSON.stringify({
        name: 'John',
        phone: '13812345678',
      });

      const masked = maskJson(json);
      const parsed = JSON.parse(masked);

      expect(parsed.name).toBe('John');
      expect(parsed.phone).toBe('138****5678');
    });

    it('should return invalid JSON unchanged', () => {
      const invalid = 'not-json';
      expect(maskJson(invalid)).toBe(invalid);
    });
  });

  describe('maskLogMessage', () => {
    it('should mask phone numbers in logs', () => {
      const message = 'User 13812345678 logged in';
      expect(maskLogMessage(message)).toBe('User 138****5678 logged in');
    });

    it('should mask ID cards in logs', () => {
      const message = 'ID: 110101199001011234';
      expect(maskLogMessage(message)).toBe('ID: 1101********1234');
    });

    it('should mask emails in logs', () => {
      const message = 'Email: test@example.com';
      expect(maskLogMessage(message)).toBe('Email: te**@example.com');
    });

    it('should mask multiple sensitive fields', () => {
      const message = 'User 13812345678 with ID 110101199001011234 and email test@example.com';
      const masked = maskLogMessage(message);
      expect(masked).toContain('138****5678');
      expect(masked).toContain('1101********1234');
      expect(masked).toContain('te**@example.com');
    });
  });
});
