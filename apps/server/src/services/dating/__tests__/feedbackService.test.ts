/**
 * Feedback Service Tests
 * 约会推荐反馈服务测试 (ISSUE-DATE002 c6)
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
  submitFeedback,
  getFeedbackSummary,
  getUserFeedbackHistory,
  hasFeedbackForProfile,
  FeedbackAction,
  SkipReason,
} from '../feedbackService';

describe('FeedbackService', () => {
  describe('submitFeedback', () => {
    it('should submit a like feedback', () => {
      const record = submitFeedback({
        userId: 'user-1',
        targetProfileId: 'profile-1',
        action: FeedbackAction.LIKE,
      });

      expect(record).toBeDefined();
      expect(record.action).toBe(FeedbackAction.LIKE);
      expect(record.userId).toBe('user-1');
      expect(record.id).toBeDefined();
    });

    it('should submit a skip feedback with reason', () => {
      const record = submitFeedback({
        userId: 'user-1',
        targetProfileId: 'profile-2',
        action: FeedbackAction.SKIP,
        skipReason: SkipReason.TOO_FAR,
      });

      expect(record.action).toBe(FeedbackAction.SKIP);
      expect(record.skipReason).toBe(SkipReason.TOO_FAR);
    });

    it('should submit feedback with accuracy rating', () => {
      const record = submitFeedback({
        userId: 'user-1',
        targetProfileId: 'profile-3',
        action: FeedbackAction.LIKE,
        accuracyRating: 4,
        matchScoreAtFeedback: 75,
      });

      expect(record.accuracyRating).toBe(4);
      expect(record.matchScoreAtFeedback).toBe(75);
    });
  });

  describe('getFeedbackSummary', () => {
    it('should return correct summary', () => {
      submitFeedback({
        userId: 'user-summary',
        targetProfileId: 'p-1',
        action: FeedbackAction.LIKE,
        accuracyRating: 4,
      });
      submitFeedback({
        userId: 'user-summary',
        targetProfileId: 'p-2',
        action: FeedbackAction.SKIP,
        skipReason: SkipReason.NOT_MY_TYPE,
      });
      submitFeedback({
        userId: 'user-summary',
        targetProfileId: 'p-3',
        action: FeedbackAction.LIKE,
        accuracyRating: 5,
      });

      const summary = getFeedbackSummary('user-summary');
      expect(summary.totalFeedback).toBe(3);
      expect(summary.likeCount).toBe(2);
      expect(summary.skipCount).toBe(1);
      expect(summary.likeRate).toBeCloseTo(2 / 3);
      expect(summary.avgAccuracyRating).toBe(4.5);
      expect(summary.topSkipReasons).toHaveLength(1);
      expect(summary.topSkipReasons[0].reason).toBe(SkipReason.NOT_MY_TYPE);
    });

    it('should return zero summary for unknown user', () => {
      const summary = getFeedbackSummary('unknown-user');
      expect(summary.totalFeedback).toBe(0);
      expect(summary.likeCount).toBe(0);
    });
  });

  describe('getUserFeedbackHistory', () => {
    it('should filter by action', () => {
      submitFeedback({
        userId: 'user-history',
        targetProfileId: 'p-1',
        action: FeedbackAction.LIKE,
      });
      submitFeedback({
        userId: 'user-history',
        targetProfileId: 'p-2',
        action: FeedbackAction.SKIP,
      });

      const likes = getUserFeedbackHistory('user-history', { action: FeedbackAction.LIKE });
      expect(likes).toHaveLength(1);
      expect(likes[0].action).toBe(FeedbackAction.LIKE);
    });

    it('should limit results', () => {
      for (let i = 0; i < 5; i++) {
        submitFeedback({
          userId: 'user-limit',
          targetProfileId: `p-${i}`,
          action: FeedbackAction.SKIP,
        });
      }

      const limited = getUserFeedbackHistory('user-limit', { limit: 2 });
      expect(limited).toHaveLength(2);
    });
  });

  describe('hasFeedbackForProfile', () => {
    it('should return true for existing feedback', () => {
      submitFeedback({
        userId: 'user-check',
        targetProfileId: 'p-exists',
        action: FeedbackAction.LIKE,
      });

      expect(hasFeedbackForProfile('user-check', 'p-exists')).toBe(true);
    });

    it('should return false for missing feedback', () => {
      expect(hasFeedbackForProfile('user-check', 'p-missing')).toBe(false);
    });
  });
});
