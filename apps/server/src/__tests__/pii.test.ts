import { describe, it, expect } from '@jest/globals';

import {
  piiManager,
  PIIField,
  PIIPermission,
  maskUserPII,
  UserPII,
} from '../models/user';

describe('PII Manager', () => {
  describe('canAccess', () => {
    it('should allow user to access their own phone', () => {
      expect(piiManager.canAccess(PIIField.PHONE, 'user', PIIPermission.READ_FULL)).toBe(true);
    });

    it('should allow admin to read masked phone', () => {
      expect(piiManager.canAccess(PIIField.PHONE, 'admin', PIIPermission.READ_MASKED)).toBe(true);
    });

    it('should not allow admin to read full phone without audit', () => {
      expect(piiManager.canAccess(PIIField.PHONE, 'admin', PIIPermission.READ_FULL)).toBe(false);
    });

    it('should deny access for invalid role', () => {
      expect(piiManager.canAccess(PIIField.PHONE, 'invalid', PIIPermission.READ_FULL)).toBe(false);
    });
  });

  describe('requiresMFA', () => {
    it('should require MFA for support accessing phone', () => {
      expect(piiManager.requiresMFA(PIIField.PHONE, 'support', PIIPermission.READ_MASKED)).toBe(true);
    });

    it('should not require MFA for user accessing own phone', () => {
      expect(piiManager.requiresMFA(PIIField.PHONE, 'user', PIIPermission.READ_FULL)).toBe(false);
    });
  });

  describe('requiresAudit', () => {
    it('should require audit for admin accessing phone', () => {
      expect(piiManager.requiresAudit(PIIField.PHONE, 'admin', PIIPermission.READ_MASKED)).toBe(true);
    });
  });

  describe('maskPII', () => {
    it('should mask phone number', () => {
      expect(piiManager.maskPII(PIIField.PHONE, '13812345678')).toBe('138****5678');
    });

    it('should mask email', () => {
      expect(piiManager.maskPII(PIIField.EMAIL, 'test@example.com')).toBe('te**@example.com');
    });

    it('should mask ID card', () => {
      expect(piiManager.maskPII(PIIField.ID_CARD, '110101199001011234')).toBe('1101********1234');
    });
  });

  describe('getPIIMetadata', () => {
    it('should return high sensitivity for ID card', () => {
      const metadata = piiManager.getPIIMetadata(PIIField.ID_CARD);
      expect(metadata.sensitivity).toBe('high');
      expect(metadata.category).toBe('identity');
    });

    it('should return medium sensitivity for phone', () => {
      const metadata = piiManager.getPIIMetadata(PIIField.PHONE);
      expect(metadata.sensitivity).toBe('medium');
      expect(metadata.category).toBe('contact');
    });
  });

  describe('listPIIFields', () => {
    it('should return all PII fields', () => {
      const fields = piiManager.listPIIFields();
      expect(fields).toContain(PIIField.PHONE);
      expect(fields).toContain(PIIField.EMAIL);
      expect(fields).toContain(PIIField.ID_CARD);
    });
  });
});

describe('maskUserPII', () => {
  const userData: UserPII = {
    phone: '13812345678',
    email: 'user@example.com',
    idCard: '110101199001011234',
    realName: '张三',
  };

  it('should return full data for user role', () => {
    const masked = maskUserPII(userData, 'user');
    expect(masked.phone).toBe('13812345678');
    expect(masked.email).toBe('user@example.com');
  });

  it('should mask data for admin role', () => {
    const masked = maskUserPII(userData, 'admin');
    expect(masked.phone).toBe('138****5678');
    expect(masked.email).toBe('us**@example.com');
    expect(masked.idCard).toBe('1101********1234');
  });

  it('should handle partial data', () => {
    const partialData: UserPII = { phone: '13812345678' };
    const masked = maskUserPII(partialData, 'admin');
    expect(masked.phone).toBe('138****5678');
    expect(masked.email).toBeUndefined();
  });
});
