/**
 * Referral Service Tests
 * 引荐服务测试
 */

import {
  createReferral,
  getReferral,
  processReferralDecision,
  getUserReferrals,
  cancelReferral,
} from '../dating/referralService';
import {
  ReferralStatus,
  ReferralType,
} from '../../models/ReferralRecord';

describe('Referral Service', () => {
  describe('createReferral', () => {
    it('should create a new referral with consent', async () => {
      const request = {
        userAId: 'user_a',
        userBId: 'user_b',
        matchData: {
          matchScore: 85,
          compatibilityFactors: ['兴趣', '生活方式'],
          agentConversationSummary: '测试摘要',
        },
        type: ReferralType.AGENT,
      };

      const result = await createReferral(request);

      expect(result.success).toBe(true);
      expect(result.referralId).toBeDefined();
      expect(result.consentId).toBeDefined();
    });
  });

  describe('processReferralDecision', () => {
    it('should process accept decision', async () => {
      // 先创建引荐
      const createResult = await createReferral({
        userAId: 'user_a',
        userBId: 'user_b',
        matchData: {
          matchScore: 85,
          compatibilityFactors: ['兴趣'],
          agentConversationSummary: '测试',
        },
      });

      // 用户A同意
      const decisionResult = await processReferralDecision({
        referralId: createResult.referralId!,
        userId: 'user_a',
        decision: 'accept',
      });

      expect(decisionResult.success).toBe(true);
      expect(decisionResult.result).toBe('pending');
    });

    it('should process mutual accept and create chat room', async () => {
      // 创建引荐
      const createResult = await createReferral({
        userAId: 'user_a',
        userBId: 'user_b',
        matchData: {
          matchScore: 90,
          compatibilityFactors: ['兴趣', '价值观'],
          agentConversationSummary: '非常匹配',
        },
      });

      // 双方同意
      await processReferralDecision({
        referralId: createResult.referralId!,
        userId: 'user_a',
        decision: 'accept',
      });

      const finalResult = await processReferralDecision({
        referralId: createResult.referralId!,
        userId: 'user_b',
        decision: 'accept',
      });

      expect(finalResult.success).toBe(true);
      expect(finalResult.result).toBe('mutual_accept');
      expect(finalResult.chatRoomId).toBeDefined();
    });

    it('should handle rejection correctly', async () => {
      const createResult = await createReferral({
        userAId: 'user_a',
        userBId: 'user_b',
        matchData: {
          matchScore: 70,
          compatibilityFactors: ['兴趣'],
          agentConversationSummary: '一般匹配',
        },
      });

      const result = await processReferralDecision({
        referralId: createResult.referralId!,
        userId: 'user_a',
        decision: 'reject',
        reason: 'not_interested',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getUserReferrals', () => {
    it('should return referrals for user', async () => {
      // 创建测试数据
      await createReferral({
        userAId: 'test_user',
        userBId: 'user_b',
        matchData: {
          matchScore: 80,
          compatibilityFactors: ['兴趣'],
          agentConversationSummary: '测试',
        },
      });

      const referrals = await getUserReferrals('test_user');

      expect(Array.isArray(referrals)).toBe(true);
      expect(referrals.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const referrals = await getUserReferrals('test_user', ReferralStatus.PENDING);

      expect(Array.isArray(referrals)).toBe(true);
      referrals.forEach(r => {
        expect(r.status).toBe(ReferralStatus.PENDING);
      });
    });
  });

  describe('cancelReferral', () => {
    it('should cancel referral by participant', async () => {
      const createResult = await createReferral({
        userAId: 'user_a',
        userBId: 'user_b',
        matchData: {
          matchScore: 80,
          compatibilityFactors: ['兴趣'],
          agentConversationSummary: '测试',
        },
      });

      const result = await cancelReferral(createResult.referralId!, 'user_a');

      expect(result).toBe(true);

      const referral = await getReferral(createResult.referralId!);
      expect(referral?.status).toBe(ReferralStatus.CANCELLED);
    });
  });
});
