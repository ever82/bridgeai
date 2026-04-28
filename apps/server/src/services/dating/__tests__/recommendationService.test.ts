/**
 * Recommendation Service Tests
 * 约会推荐服务测试 (ISSUE-DATE002 c2)
 */

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  recordFeedback,
  getUserFeedbackHistory,
  invalidateCache,
  getRecommendationStatus,
} from '../recommendationService';

describe('RecommendationService', () => {
  beforeEach(() => {
    invalidateCache();
  });

  describe('recordFeedback', () => {
    it('should record user feedback', () => {
      recordFeedback('user-1', {
        targetProfileId: 'profile-1',
        action: 'like',
        createdAt: new Date().toISOString(),
      });

      const history = getUserFeedbackHistory('user-1');
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('like');
    });

    it('should record multiple feedbacks', () => {
      recordFeedback('user-2', {
        targetProfileId: 'profile-1',
        action: 'like',
        createdAt: new Date().toISOString(),
      });
      recordFeedback('user-2', {
        targetProfileId: 'profile-2',
        action: 'skip',
        createdAt: new Date().toISOString(),
      });

      const history = getUserFeedbackHistory('user-2');
      expect(history).toHaveLength(2);
    });

    it('should return empty history for unknown user', () => {
      const history = getUserFeedbackHistory('unknown-user');
      expect(history).toHaveLength(0);
    });
  });

  describe('getRecommendationStatus', () => {
    it('should return correct initial status', () => {
      const status = getRecommendationStatus('user-status-test', 'agent-status-test');
      expect(status.hasCachedRecommendations).toBe(false);
      expect(status.feedbackCount).toBe(0);
    });
  });
});
