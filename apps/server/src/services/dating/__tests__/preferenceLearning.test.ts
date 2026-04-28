/**
 * Preference Learning Service Tests
 * 用户偏好学习服务测试 (ISSUE-DATE002 c6)
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
  learnFromFeedback,
  getLearnedPreferences,
  getAdjustedWeights,
  getLearnedFilters,
  resetLearnedPreferences,
} from '../preferenceLearning';
import { FeedbackAction, SkipReason } from '../feedbackService';

function createTestFeedback(overrides = {}) {
  return {
    id: `fb-${Math.random().toString(36).slice(2, 8)}`,
    userId: 'user-learn',
    targetProfileId: 'profile-1',
    action: FeedbackAction.LIKE,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('PreferenceLearning', () => {
  beforeEach(() => {
    resetLearnedPreferences('user-learn');
  });

  describe('learnFromFeedback', () => {
    it('should return default preferences for empty feedback', () => {
      const prefs = learnFromFeedback({ userId: 'user-learn', feedbacks: [] });
      expect(prefs.learningVersion).toBe(1);
    });

    it('should update preferred score range based on liked feedbacks', () => {
      const feedbacks = [
        createTestFeedback({
          action: FeedbackAction.LIKE,
          matchScoreAtFeedback: 80,
        }),
        createTestFeedback({
          action: FeedbackAction.LIKE,
          matchScoreAtFeedback: 70,
        }),
      ];

      const prefs = learnFromFeedback({ userId: 'user-learn', feedbacks });
      expect(prefs.preferredScoreRange.min).toBeLessThanOrEqual(70);
    });

    it('should update skip reason weights', () => {
      const feedbacks = [
        createTestFeedback({
          action: FeedbackAction.SKIP,
          skipReason: SkipReason.TOO_FAR,
        }),
        createTestFeedback({
          action: FeedbackAction.SKIP,
          skipReason: SkipReason.TOO_FAR,
        }),
      ];

      const prefs = learnFromFeedback({ userId: 'user-learn', feedbacks });
      expect(prefs.skipReasonWeights[SkipReason.TOO_FAR]).toBeLessThan(0);
    });

    it('should increase learning version', () => {
      const feedbacks = [createTestFeedback()];
      const prefs = learnFromFeedback({ userId: 'user-learn', feedbacks });
      expect(prefs.learningVersion).toBeGreaterThan(1);
    });
  });

  describe('getAdjustedWeights', () => {
    it('should return normalized weights', () => {
      const weights = getAdjustedWeights('user-learn');
      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 5);
    });

    it('should have all 7 weight dimensions', () => {
      const weights = getAdjustedWeights('user-learn');
      expect(Object.keys(weights)).toHaveLength(7);
    });
  });

  describe('getLearnedFilters', () => {
    it('should return default min score for new user', () => {
      const filters = getLearnedFilters('user-filters-test');
      expect(filters.minScore).toBe(40);
    });
  });

  describe('resetLearnedPreferences', () => {
    it('should reset to defaults', () => {
      learnFromFeedback({
        userId: 'user-reset-test',
        feedbacks: [createTestFeedback()],
      });

      resetLearnedPreferences('user-reset-test');
      const prefs = getLearnedPreferences('user-reset-test');
      expect(prefs.learningVersion).toBe(1);
    });
  });
});
