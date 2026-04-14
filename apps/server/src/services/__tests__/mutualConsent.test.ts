/**
 * Mutual Consent Model Tests
 * 双向同意状态管理模型测试
 */

import {
  MutualConsent,
  ConsentStatus,
  ReferralResult,
  createMutualConsent,
  updateUserDecision,
  expireConsent,
  isBothDecided,
  isMutualAccept,
  ConsentExpiredError,
  ConsentChangeLimitError,
} from '../../models/MutualConsent';

describe('MutualConsent Model', () => {
  describe('createMutualConsent', () => {
    it('should create a new mutual consent record', () => {
      const consent = createMutualConsent('ref_123', 'user_a', 'user_b');

      expect(consent).toBeDefined();
      expect(consent.referralId).toBe('ref_123');
      expect(consent.userAId).toBe('user_a');
      expect(consent.userBId).toBe('user_b');
      expect(consent.result).toBe(ReferralResult.PENDING);
    });

    it('should initialize both users with PENDING status', () => {
      const consent = createMutualConsent('ref_123', 'user_a', 'user_b');

      expect(consent.userAConsent.status).toBe(ConsentStatus.PENDING);
      expect(consent.userBConsent.status).toBe(ConsentStatus.PENDING);
      expect(consent.userAConsent.changedCount).toBe(0);
      expect(consent.userBConsent.changedCount).toBe(0);
    });

    it('should set expiration time correctly', () => {
      const consent = createMutualConsent('ref_123', 'user_a', 'user_b', {
        defaultTimeoutHours: 72,
      });

      const expectedExpiry = new Date(consent.createdAt.getTime() + 72 * 60 * 60 * 1000);
      expect(consent.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });
  });

  describe('updateUserDecision', () => {
    let consent: MutualConsent;

    beforeEach(() => {
      consent = createMutualConsent('ref_123', 'user_a', 'user_b');
    });

    it('should update user A decision to ACCEPTED', () => {
      const updated = updateUserDecision(consent, 'user_a', 'accept');

      expect(updated.userAConsent.status).toBe(ConsentStatus.ACCEPTED);
      expect(updated.userAConsent.decidedAt).toBeInstanceOf(Date);
    });

    it('should update user B decision to REJECTED', () => {
      const updated = updateUserDecision(consent, 'user_b', 'reject', 'not_interested');

      expect(updated.userBConsent.status).toBe(ConsentStatus.REJECTED);
      expect(updated.userBConsent.reason).toBe('not_interested');
    });

    it('should throw error when consent has expired', () => {
      // 创建一个已过期的同意记录
      const expiredConsent = {
        ...consent,
        expiresAt: new Date(Date.now() - 1000),
      };

      expect(() => updateUserDecision(expiredConsent, 'user_a', 'accept'))
        .toThrow(ConsentExpiredError);
    });

    it('should allow decision change within limit', () => {
      // 先做出决策
      let updated = updateUserDecision(consent, 'user_a', 'accept');
      expect(updated.userAConsent.changedCount).toBe(0);

      // 修改决策
      updated = updateUserDecision(updated, 'user_a', 'reject');
      expect(updated.userAConsent.changedCount).toBe(1);
      expect(updated.userAConsent.status).toBe(ConsentStatus.REJECTED);
    });

    it('should throw error when change limit exceeded', () => {
      // 模拟已达到变更次数限制
      const limitedConsent = {
        ...consent,
        userAConsent: {
          ...consent.userAConsent,
          status: ConsentStatus.ACCEPTED,
          changedCount: 3,
        },
      };

      expect(() => updateUserDecision(limitedConsent, 'user_a', 'reject'))
        .toThrow(ConsentChangeLimitError);
    });
  });

  describe('expireConsent', () => {
    it('should mark pending users as EXPIRED', () => {
      const consent = createMutualConsent('ref_123', 'user_a', 'user_b');

      // 用户A已决策，用户B未决策
      let updated = updateUserDecision(consent, 'user_a', 'accept');
      updated = {
        ...updated,
        expiresAt: new Date(Date.now() - 1000), // 已过期
      };

      const expired = expireConsent(updated);

      expect(expired.userAConsent.status).toBe(ConsentStatus.ACCEPTED); // 保持不变
      expect(expired.userBConsent.status).toBe(ConsentStatus.EXPIRED);
      expect(expired.result).toBe(ReferralResult.EXPIRED);
    });
  });

  describe('isBothDecided', () => {
    it('should return false when one user has not decided', () => {
      const consent = createMutualConsent('ref_123', 'user_a', 'user_b');
      const updated = updateUserDecision(consent, 'user_a', 'accept');

      expect(isBothDecided(updated)).toBe(false);
    });

    it('should return true when both users have decided', () => {
      let consent = createMutualConsent('ref_123', 'user_a', 'user_b');
      consent = updateUserDecision(consent, 'user_a', 'accept');
      consent = updateUserDecision(consent, 'user_b', 'accept');

      expect(isBothDecided(consent)).toBe(true);
    });
  });

  describe('isMutualAccept', () => {
    it('should return true when both users accept', () => {
      let consent = createMutualConsent('ref_123', 'user_a', 'user_b');
      consent = updateUserDecision(consent, 'user_a', 'accept');
      consent = updateUserDecision(consent, 'user_b', 'accept');

      expect(isMutualAccept(consent)).toBe(true);
    });

    it('should return false when one user rejects', () => {
      let consent = createMutualConsent('ref_123', 'user_a', 'user_b');
      consent = updateUserDecision(consent, 'user_a', 'accept');
      consent = updateUserDecision(consent, 'user_b', 'reject');

      expect(isMutualAccept(consent)).toBe(false);
    });
  });
});
