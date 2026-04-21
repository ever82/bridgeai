import {
  handleRatingSubmitted,
  handleRatingDeleted,
  handleRatingUpdated,
  handleMatchCompleted,
  initializeReviewEventHandlers,
  reviewEvents,
  ReviewEventType,
} from '../events/reviewEventHandlers';
import {
  handleNewRating,
  creditScoreEvents,
  recalculateCreditScore,
  updateCreditScore,
  calculateRatingCreditDelta,
} from '../services/creditScoreService';
import { prisma } from '../db/client';
import { scheduleReviewReminders } from '../services/notificationService';

// Mock prisma and services
jest.mock('../db/client', () => ({
  prisma: {
    rating: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    creditRecord: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    match: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../services/creditScoreService', () => ({
  ...jest.requireActual('../services/creditScoreService'),
  handleNewRating: jest.fn(),
  getUserCreditScore: jest.fn(),
  recalculateCreditScore: jest.fn(),
  updateCreditScore: jest.fn(),
  calculateRatingCreditDelta: jest.fn(),
  creditScoreEvents: {
    on: jest.fn(),
    emit: jest.fn(),
  },
}));

// Mock notificationService
jest.mock('../services/notificationService', () => ({
  sendNewReviewNotification: jest.fn(),
  sendBadReviewWarning: jest.fn(),
  sendCreditScoreChangeNotification: jest.fn(),
  sendReviewReplyNotification: jest.fn(),
  sendPendingReviewReminder: jest.fn(),
  scheduleReviewReminders: jest.fn().mockResolvedValue(undefined),
  notificationEvents: {
    on: jest.fn(),
    emit: jest.fn(),
  },
  reviewNotificationEvents: {
    on: jest.fn(),
    emit: jest.fn(),
  },
  notificationService: {
    sendToUser: jest.fn(),
  },
}));

describe('Review Event Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleRatingSubmitted', () => {
    it('should handle good rating submission', async () => {
      const mockRating = {
        id: 'rating-1',
        raterId: 'user-1',
        rateeId: 'user-2',
        score: 5,
        match: { id: 'match-1' },
      };

      const mockRater = { id: 'user-1', name: 'Test User' };

      (prisma.rating.findUnique as jest.Mock).mockResolvedValue(mockRating);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockRater);
      (handleNewRating as jest.Mock).mockResolvedValue(undefined);

      const eventListener = jest.fn();
      reviewEvents.once(ReviewEventType.RATING_SUBMITTED, eventListener);

      await handleRatingSubmitted({
        ratingId: 'rating-1',
        matchId: 'match-1',
        raterId: 'user-1',
        rateeId: 'user-2',
        score: 5,
      });

      expect(handleNewRating).toHaveBeenCalledWith('rating-1');
    });

    it('should handle bad rating submission with warning', async () => {
      const mockRating = {
        id: 'rating-1',
        raterId: 'user-1',
        rateeId: 'user-2',
        score: 1,
        match: { id: 'match-1' },
      };

      const mockRater = { id: 'user-1', name: 'Test User' };

      (prisma.rating.findUnique as jest.Mock).mockResolvedValue(mockRating);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockRater);
      (handleNewRating as jest.Mock).mockResolvedValue(undefined);

      await handleRatingSubmitted({
        ratingId: 'rating-1',
        matchId: 'match-1',
        raterId: 'user-1',
        rateeId: 'user-2',
        score: 1,
      });

      expect(handleNewRating).toHaveBeenCalledWith('rating-1');
    });

    it('should handle missing rater gracefully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (handleNewRating as jest.Mock).mockResolvedValue(undefined);

      // Should not throw, just use anonymous name
      await handleRatingSubmitted({
        ratingId: 'rating-1',
        matchId: 'match-1',
        raterId: 'user-1',
        rateeId: 'user-2',
        score: 5,
      });

      expect(handleNewRating).toHaveBeenCalledWith('rating-1');
    });
  });

  describe('handleRatingDeleted', () => {
    it('should recalculate credit score after deletion', async () => {
      (recalculateCreditScore as jest.Mock).mockResolvedValue(100);

      const eventListener = jest.fn();
      reviewEvents.once(ReviewEventType.RATING_DELETED, eventListener);

      await handleRatingDeleted({
        ratingId: 'rating-1',
        matchId: 'match-1',
        raterId: 'user-1',
        rateeId: 'user-2',
        score: 5,
      });

      expect(recalculateCreditScore).toHaveBeenCalledWith('user-2');
    });
  });

  describe('handleRatingUpdated', () => {
    it('should adjust credit score when rating changes', async () => {
      (calculateRatingCreditDelta as jest.Mock).mockReturnValueOnce(5).mockReturnValueOnce(-10);
      (updateCreditScore as jest.Mock).mockResolvedValue({ id: 'record-1' });

      await handleRatingUpdated({
        ratingId: 'rating-1',
        matchId: 'match-1',
        raterId: 'user-1',
        rateeId: 'user-2',
        oldScore: 5,
        newScore: 1,
      });

      expect(updateCreditScore).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          delta: -15,
          reason: expect.stringContaining('updated'),
        })
      );
    });

    it('should not update when delta is zero', async () => {
      (calculateRatingCreditDelta as jest.Mock).mockReturnValue(5);

      await handleRatingUpdated({
        ratingId: 'rating-1',
        matchId: 'match-1',
        raterId: 'user-1',
        rateeId: 'user-2',
        oldScore: 5,
        newScore: 4,
      });

      expect(updateCreditScore).not.toHaveBeenCalled();
    });
  });

  describe('handleMatchCompleted', () => {
    it('should schedule review reminders', async () => {
      const completedAt = new Date();

      const eventListener = jest.fn();
      reviewEvents.once(ReviewEventType.MATCH_COMPLETED, eventListener);

      await handleMatchCompleted({
        matchId: 'match-1',
        completedAt,
      });

      expect(scheduleReviewReminders).toHaveBeenCalledWith('match-1', completedAt);
    });
  });

  describe('initializeReviewEventHandlers', () => {
    it('should setup all event listeners', () => {
      initializeReviewEventHandlers();

      expect(creditScoreEvents.on).toHaveBeenCalledWith(
        'creditScoreUpdated',
        expect.any(Function)
      );
    });
  });
});
