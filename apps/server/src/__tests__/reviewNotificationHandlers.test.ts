import {
  handleReviewCreatedNotification,
  handleReviewReplyNotification,
  handlePendingReviewReminder,
  handleBadReviewWarningNotification,
  handleCreditScoreChangeNotification,
  initializeReviewNotificationHandlers,
  reviewNotificationEvents,
  ReviewNotificationType,
  getUserNotificationStats,
  markNotificationsAsRead,
  getNotificationHistory,
} from '../events/reviewNotificationHandlers';
import { prisma } from '../db/client';
import { notificationEvents } from '../services/notificationService';

// Mock prisma
jest.mock('../db/client', () => ({
  prisma: {
    rating: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe('Review Notification Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleReviewCreatedNotification', () => {
    it('should send notification for new review', async () => {
      const mockRating = {
        id: 'rating-1',
        raterId: 'user-1',
        rateeId: 'user-2',
        score: 5,
        rater: { id: 'user-1', name: 'Test User', avatarUrl: null },
        ratee: { id: 'user-2', name: 'Recipient' },
        match: {
          demand: { agent: { user: { id: 'user-2' } } },
          supply: { agent: { user: { id: 'user-1' } } },
        },
      };

      (prisma.rating.findUnique as jest.Mock).mockResolvedValue(mockRating);

      const eventListener = jest.fn();
      reviewNotificationEvents.once(ReviewNotificationType.REVIEW_CREATED, eventListener);

      await handleReviewCreatedNotification('rating-1');

      expect(prisma.rating.findUnique).toHaveBeenCalledWith({
        where: { id: 'rating-1' },
        include: expect.any(Object),
      });
    });

    it('should handle missing rating gracefully', async () => {
      (prisma.rating.findUnique as jest.Mock).mockResolvedValue(null);

      await handleReviewCreatedNotification('rating-1');

      expect(prisma.rating.findUnique).toHaveBeenCalled();
    });
  });

  describe('handleReviewReplyNotification', () => {
    it('should send notification for review reply', async () => {
      const mockRating = {
        id: 'rating-1',
        raterId: 'user-1',
        rateeId: 'user-2',
        rater: { id: 'user-1', name: 'Test User' },
        ratee: { id: 'user-2', name: 'Responder' },
      };

      (prisma.rating.findUnique as jest.Mock).mockResolvedValue(mockRating);

      await handleReviewReplyNotification('rating-1', 'Thank you for your review!');

      expect(prisma.rating.findUnique).toHaveBeenCalledWith({
        where: { id: 'rating-1' },
        include: expect.any(Object),
      });
    });
  });

  describe('handlePendingReviewReminder', () => {
    it('should send reminder when user has not rated', async () => {
      (prisma.rating.findFirst as jest.Mock).mockResolvedValue(null);

      await handlePendingReviewReminder('match-1', 'user-1', 'Partner Name');

      expect(prisma.rating.findFirst).toHaveBeenCalledWith({
        where: {
          matchId: 'match-1',
          raterId: 'user-1',
        },
      });
    });

    it('should skip reminder when user already rated', async () => {
      (prisma.rating.findFirst as jest.Mock).mockResolvedValue({ id: 'rating-1' });

      await handlePendingReviewReminder('match-1', 'user-1', 'Partner Name');

      expect(prisma.rating.findFirst).toHaveBeenCalled();
    });
  });

  describe('handleBadReviewWarningNotification', () => {
    it('should send warning for bad reviews', async () => {
      const mockRating = {
        id: 'rating-1',
        rateeId: 'user-2',
        score: 1,
        ratee: { id: 'user-2', name: 'Recipient' },
      };

      (prisma.rating.findUnique as jest.Mock).mockResolvedValue(mockRating);

      await handleBadReviewWarningNotification('rating-1', -10);

      expect(prisma.rating.findUnique).toHaveBeenCalledWith({
        where: { id: 'rating-1' },
        include: expect.any(Object),
      });
    });

    it('should skip warning for good reviews', async () => {
      const mockRating = {
        id: 'rating-1',
        rateeId: 'user-2',
        score: 5,
        ratee: { id: 'user-2', name: 'Recipient' },
      };

      (prisma.rating.findUnique as jest.Mock).mockResolvedValue(mockRating);

      await handleBadReviewWarningNotification('rating-1', 5);

      expect(prisma.rating.findUnique).toHaveBeenCalled();
    });
  });

  describe('handleCreditScoreChangeNotification', () => {
    it('should send notification for significant positive change', async () => {
      const eventListener = jest.fn();
      notificationEvents.once('pushSent', eventListener);

      await handleCreditScoreChangeNotification('user-1', 100, 110, 'Good review');

      expect(eventListener).toHaveBeenCalled();
    });

    it('should send notification for significant negative change', async () => {
      const eventListener = jest.fn();
      notificationEvents.once('pushSent', eventListener);

      await handleCreditScoreChangeNotification('user-1', 100, 85, 'Bad review');

      expect(eventListener).toHaveBeenCalled();
    });

    it('should skip notification for minor changes', async () => {
      const eventListener = jest.fn();
      notificationEvents.once('pushSent', eventListener);

      await handleCreditScoreChangeNotification('user-1', 100, 102, 'Minor change');

      expect(eventListener).not.toHaveBeenCalled();
    });
  });

  describe('getUserNotificationStats', () => {
    it('should return notification statistics', async () => {
      const stats = await getUserNotificationStats('user-1');

      expect(stats).toHaveProperty('unreadCount');
      expect(stats).toHaveProperty('lastNotificationAt');
    });
  });

  describe('markNotificationsAsRead', () => {
    it('should mark notifications as read', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await markNotificationsAsRead('user-1', ['notif-1', 'notif-2']);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Marked 2 notifications as read')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('getNotificationHistory', () => {
    it('should return empty notification history', async () => {
      const history = await getNotificationHistory('user-1');

      expect(history).toEqual([]);
    });
  });

  describe('initializeReviewNotificationHandlers', () => {
    it('should setup all notification handlers', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      initializeReviewNotificationHandlers();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[NOTIFICATION] Review notification handlers initialized'
      );
      consoleSpy.mockRestore();
    });
  });
});
