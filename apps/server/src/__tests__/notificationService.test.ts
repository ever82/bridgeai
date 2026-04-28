/**
 * Notification Service Tests
 * Tests for notificationService and review notification functions
 */

import {
  getReviewNotificationPreferences,
  updateReviewNotificationPreferences,
  resetReviewNotificationPreferences,
  sendNewReviewNotification,
  sendPendingReviewReminder,
  sendReviewReplyNotification,
  sendBadReviewWarning,
  sendCreditScoreChangeNotification,
  DEFAULT_REVIEW_PREFERENCES,
  reviewNotificationEvents,
  ReviewNotificationType,
} from '../services/notificationService';
import { prisma } from '../db/client';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

// Mock prisma
jest.mock('../db/client', () => ({
  prisma: {
    notification: {
      create: jest.fn(),
    },
    rating: {
      findFirst: jest.fn(),
    },
    match: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetReviewNotificationPreferences();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getReviewNotificationPreferences', () => {
    it('should return default preferences for new user', () => {
      const prefs = getReviewNotificationPreferences('new-user');
      expect(prefs).toEqual(DEFAULT_REVIEW_PREFERENCES);
    });

    it('should return updated preferences after update', () => {
      updateReviewNotificationPreferences('user-1', {
        newReview: false,
        pendingReviewReminder: false,
      });
      const prefs = getReviewNotificationPreferences('user-1');
      expect(prefs.newReview).toBe(false);
      expect(prefs.pendingReviewReminder).toBe(false);
      expect(prefs.badReviewWarning).toBe(true);
    });
  });

  describe('updateReviewNotificationPreferences', () => {
    it('should update preferences correctly', () => {
      const updated = updateReviewNotificationPreferences('user-2', {
        newReview: false,
        creditScoreChange: false,
      });

      expect(updated.newReview).toBe(false);
      expect(updated.creditScoreChange).toBe(false);
      expect(updated.pendingReviewReminder).toBe(true);
    });

    it('should preserve unmodified preferences', () => {
      updateReviewNotificationPreferences('user-3', {
        badReviewWarning: false,
      });
      const prefs = getReviewNotificationPreferences('user-3');
      expect(prefs.newReview).toBe(true);
      expect(prefs.badReviewWarning).toBe(false);
    });
  });

  describe('sendNewReviewNotification', () => {
    it('should send new review notification', async () => {
      const eventListener = jest.fn();
      reviewNotificationEvents.on(ReviewNotificationType.NEW_REVIEW, eventListener);

      (mockedPrisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-1' });

      await sendNewReviewNotification('user-1', 'Test User', 5, 'rating-1');

      expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'REVIEW_RATING',
            title: '收到新评价',
          }),
        })
      );

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          ratingId: 'rating-1',
          rating: 5,
        })
      );

      reviewNotificationEvents.removeListener(ReviewNotificationType.NEW_REVIEW, eventListener);
    });

    it('should skip notification when preference is disabled', async () => {
      updateReviewNotificationPreferences('user-disabled', { newReview: false });

      await sendNewReviewNotification('user-disabled', 'Test User', 5, 'rating-1');

      expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('sendPendingReviewReminder', () => {
    it('should send pending review reminder', async () => {
      const eventListener = jest.fn();
      reviewNotificationEvents.on(ReviewNotificationType.PENDING_REVIEW_REMINDER, eventListener);

      (mockedPrisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-2' });

      await sendPendingReviewReminder('user-1', 'match-1', 'Partner Name');

      expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'REVIEW_REMINDER',
            title: '待评价提醒',
            content: '交易已完成，请对 Partner Name 进行评价',
          }),
        })
      );

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          matchId: 'match-1',
        })
      );

      reviewNotificationEvents.removeListener(
        ReviewNotificationType.PENDING_REVIEW_REMINDER,
        eventListener
      );
    });
  });

  describe('sendReviewReplyNotification', () => {
    it('should send review reply notification', async () => {
      const eventListener = jest.fn();
      reviewNotificationEvents.on(ReviewNotificationType.REVIEW_REPLY, eventListener);

      (mockedPrisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-3' });

      await sendReviewReplyNotification('user-1', 'Ratee Name', 'rating-1');

      expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'review_reply',
            title: '评价收到回复',
            content: 'Ratee Name 回复了您的评价',
          }),
        })
      );

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          ratingId: 'rating-1',
        })
      );

      reviewNotificationEvents.removeListener(ReviewNotificationType.REVIEW_REPLY, eventListener);
    });
  });

  describe('sendBadReviewWarning', () => {
    it('should send bad review warning', async () => {
      const eventListener = jest.fn();
      reviewNotificationEvents.on(ReviewNotificationType.BAD_REVIEW_WARNING, eventListener);

      (mockedPrisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-4' });

      await sendBadReviewWarning('user-1', 1, -10, 'rating-1');

      expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'review_bad_rating',
            title: '差评预警',
            content: '您收到了 1 星评价，信用分 -10 分',
            priority: 'HIGH',
          }),
        })
      );

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          ratingId: 'rating-1',
          creditDelta: -10,
        })
      );

      reviewNotificationEvents.removeListener(
        ReviewNotificationType.BAD_REVIEW_WARNING,
        eventListener
      );
    });
  });

  describe('sendCreditScoreChangeNotification', () => {
    it('should send credit score increase notification', async () => {
      const eventListener = jest.fn();
      reviewNotificationEvents.on(ReviewNotificationType.CREDIT_SCORE_CHANGE, eventListener);

      (mockedPrisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-5' });

      await sendCreditScoreChangeNotification('user-1', 100, 110, 'Good review');

      expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'credit_score_change',
            title: '信用分提升',
            content: '您的信用分 +10，当前 110 分。原因：Good review',
            data: expect.objectContaining({
              previousScore: 100,
              newScore: 110,
              delta: 10,
            }),
          }),
        })
      );

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          previousScore: 100,
          newScore: 110,
          delta: 10,
        })
      );

      reviewNotificationEvents.removeListener(
        ReviewNotificationType.CREDIT_SCORE_CHANGE,
        eventListener
      );
    });

    it('should send credit score decrease notification', async () => {
      const eventListener = jest.fn();
      reviewNotificationEvents.on(ReviewNotificationType.CREDIT_SCORE_CHANGE, eventListener);

      (mockedPrisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-6' });

      await sendCreditScoreChangeNotification('user-1', 100, 90, 'Bad review');

      expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'credit_score_change',
            title: '信用分下降',
            content: '您的信用分 -10，当前 90 分。原因：Bad review',
            data: expect.objectContaining({
              previousScore: 100,
              newScore: 90,
              delta: -10,
            }),
          }),
        })
      );

      reviewNotificationEvents.removeListener(
        ReviewNotificationType.CREDIT_SCORE_CHANGE,
        eventListener
      );
    });

    it('should skip when creditScoreChange preference is disabled', async () => {
      updateReviewNotificationPreferences('user-no-credit', { creditScoreChange: false });

      await sendCreditScoreChangeNotification('user-no-credit', 100, 110, 'Good review');

      expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
