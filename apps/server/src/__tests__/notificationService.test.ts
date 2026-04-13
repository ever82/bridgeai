import {
  NotificationType,
  NotificationChannel,
  getNotificationPreferences,
  updateNotificationPreferences,
  isNotificationEnabled,
  sendNotification,
  sendNewReviewNotification,
  sendPendingReviewReminder,
  sendReviewReplyNotification,
  sendBadReviewWarning,
  sendCreditScoreChangeNotification,
  DEFAULT_PREFERENCES,
  notificationEvents,
} from '../services/notificationService';

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotificationPreferences', () => {
    it('should return default preferences for new user', () => {
      const prefs = getNotificationPreferences('new-user');
      expect(prefs).toEqual(DEFAULT_PREFERENCES);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update preferences correctly', () => {
      const updated = updateNotificationPreferences('user-1', {
        newReview: false,
        channels: [NotificationChannel.EMAIL],
      });

      expect(updated.newReview).toBe(false);
      expect(updated.channels).toEqual([NotificationChannel.EMAIL]);
      expect(updated.badReviewWarning).toBe(DEFAULT_PREFERENCES.badReviewWarning);
    });
  });

  describe('isNotificationEnabled', () => {
    it('should return true for enabled notifications', () => {
      const result = isNotificationEnabled('user-1', NotificationType.NEW_REVIEW);
      expect(result).toBe(true);
    });

    it('should return false for disabled notifications', () => {
      updateNotificationPreferences('user-2', { newReview: false });
      const result = isNotificationEnabled('user-2', NotificationType.NEW_REVIEW);
      expect(result).toBe(false);
    });
  });

  describe('sendNotification', () => {
    it('should send notification through enabled channels', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const eventListener = jest.fn();
      notificationEvents.once('notificationSent', eventListener);

      await sendNotification({
        userId: 'user-1',
        type: NotificationType.NEW_REVIEW,
        title: 'Test',
        body: 'Test body',
      });

      expect(eventListener).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should skip disabled notification types', async () => {
      updateNotificationPreferences('user-3', { newReview: false });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await sendNotification({
        userId: 'user-3',
        type: NotificationType.NEW_REVIEW,
        title: 'Test',
        body: 'Test body',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipped')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('sendNewReviewNotification', () => {
    it('should send new review notification', async () => {
      const eventListener = jest.fn();
      notificationEvents.once('pushSent', eventListener);

      await sendNewReviewNotification('user-1', 'Test User', 5, 'rating-1');

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.NEW_REVIEW,
          data: expect.objectContaining({ rating: 5 }),
        })
      );
    });
  });

  describe('sendPendingReviewReminder', () => {
    it('should send pending review reminder', async () => {
      const eventListener = jest.fn();
      notificationEvents.once('pushSent', eventListener);

      await sendPendingReviewReminder('user-1', 'match-1', 'Partner Name');

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.PENDING_REVIEW_REMINDER,
        })
      );
    });
  });

  describe('sendReviewReplyNotification', () => {
    it('should send review reply notification', async () => {
      const eventListener = jest.fn();
      notificationEvents.once('pushSent', eventListener);

      await sendReviewReplyNotification('user-1', 'Test User', 'rating-1');

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.REVIEW_REPLY,
        })
      );
    });
  });

  describe('sendBadReviewWarning', () => {
    it('should send bad review warning', async () => {
      const eventListener = jest.fn();
      notificationEvents.once('pushSent', eventListener);

      await sendBadReviewWarning('user-1', 1, -10, 'rating-1');

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.BAD_REVIEW_WARNING,
          data: expect.objectContaining({ rating: 1 }),
        })
      );
    });
  });

  describe('sendCreditScoreChangeNotification', () => {
    it('should send credit score increase notification', async () => {
      const eventListener = jest.fn();
      notificationEvents.once('pushSent', eventListener);

      await sendCreditScoreChangeNotification('user-1', 100, 110, 'Good review');

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.CREDIT_SCORE_CHANGE,
          title: '信用分提升',
          data: expect.objectContaining({
            previousScore: 100,
            newScore: 110,
            delta: 10,
          }),
        })
      );
    });

    it('should send credit score decrease notification', async () => {
      const eventListener = jest.fn();
      notificationEvents.once('pushSent', eventListener);

      await sendCreditScoreChangeNotification('user-1', 100, 90, 'Bad review');

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.CREDIT_SCORE_CHANGE,
          title: '信用分下降',
          data: expect.objectContaining({
            previousScore: 100,
            newScore: 90,
            delta: -10,
          }),
        })
      );
    });
  });
});
