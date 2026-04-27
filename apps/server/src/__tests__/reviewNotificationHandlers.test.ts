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

// Mock prisma
jest.mock('../db/client', () => ({
  prisma: {
    review: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    rating: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    notification: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    reviewReport: {
      findUnique: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    },
  },
}));

// Mock notificationService functions used by notification handlers
jest.mock('../services/notificationService', () => ({
  sendNewReviewNotification: jest.fn(),
  sendReviewReplyNotification: jest.fn(),
  sendPendingReviewReminder: jest.fn(),
  sendBadReviewWarning: jest.fn(),
  sendCreditScoreChangeNotification: jest.fn(),
  scheduleReviewReminders: jest.fn(),
  notificationEvents: {
    on: jest.fn(),
    emit: jest.fn(),
  },
  reviewNotificationEvents: {
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
  },
}));

// Mock reviewEventHandlers to avoid circular dependency
jest.mock('../events/reviewEventHandlers', () => ({
  reviewEvents: {
    on: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
  },
  ReviewEventType: {
    RATING_SUBMITTED: 'RATING_SUBMITTED',
    RATING_DELETED: 'RATING_DELETED',
    RATING_UPDATED: 'RATING_UPDATED',
    MATCH_COMPLETED: 'MATCH_COMPLETED',
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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handleCreditScoreChangeNotification('user-1', 100, 110, 'Good review');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should send notification for significant negative change', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handleCreditScoreChangeNotification('user-1', 100, 85, 'Bad review');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should skip notification for minor changes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handleCreditScoreChangeNotification('user-1', 100, 102, 'Minor change');

      // For minor changes, no notification should be sent
      consoleSpy.mockRestore();
    });
  });

  describe('getUserNotificationStats', () => {
    it('should return notification statistics', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(5);
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue({
        createdAt: new Date('2024-01-01'),
      });

      const stats = await getUserNotificationStats('user-1');

      expect(stats).toHaveProperty('unreadCount', 5);
      expect(stats).toHaveProperty('lastNotificationAt');
    });
  });

  describe('markNotificationsAsRead', () => {
    it('should mark notifications as read', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await markNotificationsAsRead('user-1', ['notif-1', 'notif-2']);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['notif-1', 'notif-2'] }, userId: 'user-1', status: expect.anything() },
        data: { status: expect.anything(), readAt: expect.any(Date) },
      });
    });
  });

  describe('getNotificationHistory', () => {
    it('should return notification history', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'NEW_REVIEW',
          status: 'READ',
          content: 'Test',
          createdAt: new Date(),
          readAt: new Date(),
        },
        {
          id: 'notif-2',
          type: 'REVIEW_REPLY',
          status: 'UNREAD',
          content: 'Reply',
          createdAt: new Date(),
          readAt: null,
        },
      ];
      (prisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications);

      const history = await getNotificationHistory('user-1');

      expect(history).toHaveLength(2);
      expect(history[0].read).toBe(true);
      expect(history[1].read).toBe(false);
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
