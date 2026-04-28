/**
 * Match Notification Service Tests
 * 约会推送通知服务测试 (ISSUE-DATE002 c3)
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
  sendDailyRecommendationNotification,
  sendNewMatchNotification,
  sendFeedbackRequestNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  getUserNotifications,
  markNotificationRead,
  MatchNotificationType,
} from '../matchNotificationService';

function createTestMatchScore(overrides = {}) {
  return {
    profileId: 'profile-1',
    agentId: 'agent-1',
    totalScore: 75,
    dimensions: [],
    highlights: ['共同兴趣爱好', '性格契合'],
    warnings: [],
    ...overrides,
  };
}

/** Set up test user with notifications enabled outside quiet hours */
function setupTestUser(userId) {
  updateNotificationPreferences(userId, {
    enabled: true,
    maxDailyNotifications: 100,
    quietHoursStart: '02:00',
    quietHoursEnd: '03:00',
  });
}

describe('MatchNotificationService', () => {
  describe('sendDailyRecommendationNotification', () => {
    it('should send daily recommendation notification', async () => {
      setupTestUser('user-notif-daily');
      const matches = [createTestMatchScore()];
      const notification = await sendDailyRecommendationNotification('user-notif-daily', matches);

      expect(notification).not.toBeNull();
      expect(notification!.type).toBe(MatchNotificationType.DAILY_RECOMMENDATION);
      expect(notification!.payload.title).toContain('推荐');
    });

    it('should handle zero matches', async () => {
      setupTestUser('user-notif-empty');
      const notification = await sendDailyRecommendationNotification('user-notif-empty', []);
      expect(notification).not.toBeNull();
      expect(notification!.payload.body).toContain('暂无');
    });
  });

  describe('sendNewMatchNotification', () => {
    it('should send new match notification', async () => {
      setupTestUser('user-notif-match');
      const match = createTestMatchScore({ totalScore: 85 });
      const notification = await sendNewMatchNotification('user-notif-match', match);

      expect(notification).not.toBeNull();
      expect(notification!.type).toBe(MatchNotificationType.NEW_MATCH);
      expect(notification!.payload.body).toContain('85');
    });
  });

  describe('sendFeedbackRequestNotification', () => {
    it('should send feedback request', async () => {
      setupTestUser('user-notif-feedback');
      const notification = await sendFeedbackRequestNotification('user-notif-feedback');
      expect(notification).not.toBeNull();
      expect(notification!.type).toBe(MatchNotificationType.FEEDBACK_REQUEST);
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return default preferences', () => {
      const prefs = getNotificationPreferences('user-prefs-new');
      expect(prefs.enabled).toBe(true);
      expect(prefs.maxDailyNotifications).toBe(3);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update preferences', () => {
      const updated = updateNotificationPreferences('user-prefs-update', {
        maxDailyNotifications: 5,
      });
      expect(updated.maxDailyNotifications).toBe(5);
    });
  });

  describe('getUserNotifications', () => {
    it('should return empty for new user', () => {
      const notifications = getUserNotifications('user-notif-new');
      expect(notifications).toHaveLength(0);
    });

    it('should return sent notifications', async () => {
      setupTestUser('user-notif-list');
      await sendDailyRecommendationNotification('user-notif-list', [createTestMatchScore()]);
      const notifications = getUserNotifications('user-notif-list');
      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  describe('markNotificationRead', () => {
    it('should mark notification as read', async () => {
      setupTestUser('user-notif-read');
      const notification = await sendDailyRecommendationNotification('user-notif-read', [
        createTestMatchScore(),
      ]);
      expect(notification).not.toBeNull();
      const result = markNotificationRead('user-notif-read', notification!.id);
      expect(result).toBe(true);
    });

    it('should return false for unknown notification', () => {
      const result = markNotificationRead('user-notif-read', 'unknown-id');
      expect(result).toBe(false);
    });
  });
});
