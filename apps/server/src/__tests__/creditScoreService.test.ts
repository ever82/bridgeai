import {
  calculateRatingCreditDelta,
  calculateReviewCountBonus,
  calculateReplyRateBonus,
  getUserCreditScore,
  updateCreditScore,
  recalculateCreditScore,
  REVIEW_CREDIT_CONFIG,
  creditScoreEvents,
} from '../services/creditScoreService';
import { prisma } from '../db/client';

// Mock prisma
jest.mock('../db/client', () => ({
  prisma: {
    creditScore: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    creditHistory: {
      create: jest.fn(),
    },
    rating: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userDevice: {
      count: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    match: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    connection: {
      count: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
    },
  },
}));

describe('Credit Score Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRatingCreditDelta', () => {
    it('should return positive delta for good ratings (>= 4)', () => {
      expect(calculateRatingCreditDelta(5)).toBe(REVIEW_CREDIT_CONFIG.GOOD_REVIEW_SCORE);
      expect(calculateRatingCreditDelta(4)).toBe(REVIEW_CREDIT_CONFIG.GOOD_REVIEW_SCORE);
    });

    it('should return negative delta for bad ratings (<= 2)', () => {
      expect(calculateRatingCreditDelta(1)).toBe(REVIEW_CREDIT_CONFIG.BAD_REVIEW_SCORE);
      expect(calculateRatingCreditDelta(2)).toBe(REVIEW_CREDIT_CONFIG.BAD_REVIEW_SCORE);
    });

    it('should return zero for neutral ratings (3)', () => {
      expect(calculateRatingCreditDelta(3)).toBe(0);
    });
  });

  describe('calculateReviewCountBonus', () => {
    it('should calculate bonus based on review count', () => {
      expect(calculateReviewCountBonus(5)).toBe(5);
      expect(calculateReviewCountBonus(10)).toBe(10);
    });

    it('should cap bonus at maximum', () => {
      expect(calculateReviewCountBonus(25)).toBe(REVIEW_CREDIT_CONFIG.MAX_REVIEW_COUNT_BONUS);
      expect(calculateReviewCountBonus(100)).toBe(REVIEW_CREDIT_CONFIG.MAX_REVIEW_COUNT_BONUS);
    });

    it('should return 0 for 0 reviews', () => {
      expect(calculateReviewCountBonus(0)).toBe(0);
    });
  });

  describe('calculateReplyRateBonus', () => {
    it('should return bonus when reply rate is >= threshold', () => {
      expect(calculateReplyRateBonus(10, 8)).toBe(REVIEW_CREDIT_CONFIG.REPLY_RATE_BONUS);
      expect(calculateReplyRateBonus(10, 10)).toBe(REVIEW_CREDIT_CONFIG.REPLY_RATE_BONUS);
    });

    it('should return 0 when reply rate is < threshold', () => {
      expect(calculateReplyRateBonus(10, 7)).toBe(0);
      expect(calculateReplyRateBonus(10, 5)).toBe(0);
    });

    it('should return 0 when no reviews', () => {
      expect(calculateReplyRateBonus(0, 0)).toBe(0);
    });
  });

  describe('getUserCreditScore', () => {
    it('should return latest credit score', async () => {
      const mockRecord = { score: 150, userId: 'user-1' };
      (prisma.creditScore.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const score = await getUserCreditScore('user-1');

      expect(score).toBe(150);
      expect(prisma.creditScore.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return default score when no records exist', async () => {
      (prisma.creditScore.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.creditScore.upsert as jest.Mock).mockResolvedValue({
        score: REVIEW_CREDIT_CONFIG.DEFAULT_SCORE,
        userId: 'user-1',
        level: 'general',
      });
      (prisma.creditHistory.create as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        agents: [],
      });
      (prisma.userDevice.count as jest.Mock).mockResolvedValue(0);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.match.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.match.count as jest.Mock).mockResolvedValue(0);
      (prisma.rating.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.connection.count as jest.Mock).mockResolvedValue(0);
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([]);

      const score = await getUserCreditScore('user-1');

      // When no cached score exists, calculateScore is called and returns a computed score
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1000);
    });
  });

  describe('updateCreditScore', () => {
    it('should update credit score and emit event', async () => {
      const currentScore = 100;
      const delta = 5;
      const newScore = currentScore + delta;

      (prisma.creditScore.findUnique as jest.Mock).mockResolvedValue({ score: currentScore });
      (prisma.creditScore.upsert as jest.Mock).mockResolvedValue({
        score: newScore,
        userId: 'user-1',
        level: 'good',
      });
      (prisma.creditHistory.create as jest.Mock).mockResolvedValue({
        id: 'history-1',
        score: newScore,
        delta,
      });

      const eventListener = jest.fn();
      creditScoreEvents.once('creditScoreUpdated', eventListener);

      const result = await updateCreditScore({
        userId: 'user-1',
        delta,
        reason: 'Test update',
        sourceType: 'TEST',
      });

      expect(result.score).toBe(newScore);
      expect(result.delta).toBe(delta);
      expect(eventListener).toHaveBeenCalledWith({
        userId: 'user-1',
        previousScore: currentScore,
        newScore,
        delta,
        reason: 'Test update',
        sourceType: 'TEST',
        sourceId: undefined,
      });
    });

    it('should cap score at minimum and maximum', async () => {
      (prisma.creditScore.findUnique as jest.Mock).mockResolvedValue({ score: 995 });
      (prisma.creditScore.upsert as jest.Mock).mockResolvedValue({
        score: REVIEW_CREDIT_CONFIG.MAX_SCORE,
        userId: 'user-1',
        level: 'excellent',
      });
      (prisma.creditHistory.create as jest.Mock).mockResolvedValue({
        id: 'history-1',
        score: REVIEW_CREDIT_CONFIG.MAX_SCORE,
        delta: 10,
      });

      const result = await updateCreditScore({
        userId: 'user-1',
        delta: 10,
        reason: 'Test update',
        sourceType: 'TEST',
      });

      expect(result.score).toBe(REVIEW_CREDIT_CONFIG.MAX_SCORE);
    });
  });

  describe('recalculateCreditScore', () => {
    it('should recalculate score based on all ratings', async () => {
      const ratings = [
        { score: 5 }, // good review
        { score: 5 }, // good review
        { score: 2 }, // bad review
      ];

      (prisma.rating.findMany as jest.Mock).mockResolvedValue(ratings);
      (prisma.creditScore.findUnique as jest.Mock).mockResolvedValue({ score: 100 });
      (prisma.creditScore.upsert as jest.Mock).mockResolvedValue({
        score: 108,
        userId: 'user-1',
        level: 'good',
      });
      (prisma.creditHistory.create as jest.Mock).mockResolvedValue({
        id: 'history-1',
        score: 108,
        delta: 8,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        agents: [],
      });
      (prisma.userDevice.count as jest.Mock).mockResolvedValue(0);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.match.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.match.count as jest.Mock).mockResolvedValue(0);
      (prisma.connection.count as jest.Mock).mockResolvedValue(0);
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([]);

      const newScore = await recalculateCreditScore('user-1');

      expect(prisma.rating.findMany).toHaveBeenCalledWith({
        where: { rateeId: 'user-1' },
      });
      expect(newScore).toBeGreaterThan(0);
    });

    it('should handle no ratings', async () => {
      (prisma.rating.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.creditScore.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.creditScore.upsert as jest.Mock).mockResolvedValue({
        score: REVIEW_CREDIT_CONFIG.DEFAULT_SCORE,
        userId: 'user-1',
        level: 'general',
      });
      (prisma.creditHistory.create as jest.Mock).mockResolvedValue({
        id: 'history-1',
        score: REVIEW_CREDIT_CONFIG.DEFAULT_SCORE,
        delta: REVIEW_CREDIT_CONFIG.DEFAULT_SCORE,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        agents: [],
      });
      (prisma.userDevice.count as jest.Mock).mockResolvedValue(0);
      (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.match.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.match.count as jest.Mock).mockResolvedValue(0);
      (prisma.connection.count as jest.Mock).mockResolvedValue(0);
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([]);

      const newScore = await recalculateCreditScore('user-1');

      expect(newScore).toBe(REVIEW_CREDIT_CONFIG.DEFAULT_SCORE);
    });
  });
});
