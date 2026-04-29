/**
 * @jest-environment node
 */

import {
  notifyNewMatch,
  notifyHighMatchJob,
  notifyResumeViewed,
  notifyMatchStatusChange,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../jobMatchNotifications';
import { prisma } from '../../../db/client';
import { pushNotificationService } from '../../pushNotification';

// Mock dependencies
jest.mock('../../../db/client', () => {
  const mPrisma = {
    notificationPreference: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    notification: {
      count: jest.fn(),
    },
  };
  return { prisma: mPrisma };
});

jest.mock('../../pushNotification', () => ({
  pushNotificationService: {
    send: jest.fn(),
  },
}));

const mockedSend = pushNotificationService.send as jest.Mock;

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const defaultPayload = {
  userId: 'user-1',
  matchId: 'match-1',
  matchScore: 85,
  jobTitle: 'Senior Frontend Engineer',
};

// Helper: configure prisma mocks for a user that has notifications enabled.
// By default, the user has matchNotifications=true, no quiet hours, and
// dailyLimit=0 (unlimited). Tests can override individual fields.
function mockEnabledPreferences(overrides: Record<string, any> = {}) {
  (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue({
    userId: 'user-1',
    matchNotifications: true,
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    dailyLimit: 0,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('jobMatchNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // notifyNewMatch
  // -------------------------------------------------------------------------

  describe('notifyNewMatch', () => {
    it('should return sent=false with reason when match notifications are disabled', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        matchNotifications: false,
      });

      const result = await notifyNewMatch(defaultPayload);

      expect(result).toEqual({ sent: false, reason: 'match_notifications_disabled' });
      expect(pushNotificationService.send).not.toHaveBeenCalled();
    });

    it('should call pushNotificationService.send and return sent=true', async () => {
      mockEnabledPreferences();
      mockedSend.mockResolvedValue({ success: true, notificationId: 'notif-1' });

      const result = await notifyNewMatch(defaultPayload);

      expect(pushNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          title: '发现新匹配',
          category: 'match',
          data: expect.objectContaining({ matchId: 'match-1' }),
        })
      );
      expect(result).toEqual({ sent: true });
    });
  });

  // -------------------------------------------------------------------------
  // notifyHighMatchJob
  // -------------------------------------------------------------------------

  describe('notifyHighMatchJob', () => {
    it('should return sent=false when match notifications are disabled', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        matchNotifications: false,
      });

      const result = await notifyHighMatchJob(defaultPayload);

      expect(result).toEqual({ sent: false, reason: 'match_notifications_disabled' });
    });

    it('should send high-match notification with correct title and priority', async () => {
      mockEnabledPreferences();
      mockedSend.mockResolvedValue({ success: true, notificationId: 'notif-2' });

      const result = await notifyHighMatchJob(defaultPayload);

      expect(pushNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '发现高匹配度职位',
          category: 'match',
        })
      );
      expect(result).toEqual({ sent: true });
    });
  });

  // -------------------------------------------------------------------------
  // notifyResumeViewed
  // -------------------------------------------------------------------------

  describe('notifyResumeViewed', () => {
    it('should return sent=false when match notifications are disabled', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        matchNotifications: false,
      });

      const result = await notifyResumeViewed(defaultPayload);

      expect(result).toEqual({ sent: false, reason: 'match_notifications_disabled' });
    });

    it('should send resume-viewed notification', async () => {
      mockEnabledPreferences();
      mockedSend.mockResolvedValue({ success: true, notificationId: 'notif-3' });

      const result = await notifyResumeViewed({
        ...defaultPayload,
        candidateName: 'Alice',
      });

      expect(pushNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '简历已被查看',
          category: 'match',
        })
      );
      expect(result).toEqual({ sent: true });
    });
  });

  // -------------------------------------------------------------------------
  // notifyMatchStatusChange
  // -------------------------------------------------------------------------

  describe('notifyMatchStatusChange', () => {
    it('should return sent=false when match notifications are disabled', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        matchNotifications: false,
      });

      const result = await notifyMatchStatusChange('accepted', defaultPayload);

      expect(result).toEqual({ sent: false, reason: 'match_notifications_disabled' });
    });

    it('should send accepted notification with correct title', async () => {
      mockEnabledPreferences();
      mockedSend.mockResolvedValue({ success: true, notificationId: 'notif-4' });

      const result = await notifyMatchStatusChange('accepted', defaultPayload);

      expect(pushNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '匹配已被接受',
          category: 'match',
        })
      );
      expect(result).toEqual({ sent: true });
    });

    it('should send rejected notification with correct title', async () => {
      mockEnabledPreferences();
      mockedSend.mockResolvedValue({ success: true, notificationId: 'notif-5' });

      const result = await notifyMatchStatusChange('rejected', defaultPayload);

      expect(pushNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '匹配已被拒绝',
        })
      );
      expect(result).toEqual({ sent: true });
    });

    it('should send completed notification with correct title', async () => {
      mockEnabledPreferences();
      mockedSend.mockResolvedValue({ success: true, notificationId: 'notif-6' });

      const result = await notifyMatchStatusChange('completed', defaultPayload);

      expect(pushNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '匹配已完成',
        })
      );
      expect(result).toEqual({ sent: true });
    });
  });

  // -------------------------------------------------------------------------
  // Quiet hours and daily limit (tested via notifyNewMatch)
  // -------------------------------------------------------------------------

  describe('quiet hours and daily limit', () => {
    it('should return sent=false with reason quiet_hours during quiet hours', async () => {
      // Set quiet hours that cover the current time
      const now = new Date();
      const startH = String(now.getHours()).padStart(2, '0');
      const startM = String(now.getMinutes()).padStart(2, '0');
      const endH = String((now.getHours() + 2) % 24).padStart(2, '0');
      const endM = startM;

      mockEnabledPreferences({
        quietHoursEnabled: true,
        quietHoursStart: `${startH}:${startM}`,
        quietHoursEnd: `${endH}:${endM}`,
      });

      const result = await notifyNewMatch(defaultPayload);

      expect(result).toEqual({ sent: false, reason: 'quiet_hours' });
      expect(pushNotificationService.send).not.toHaveBeenCalled();
    });

    it('should return sent=false with reason daily_limit when daily limit is reached', async () => {
      // User has a dailyLimit of 5 and already received 5 today
      mockEnabledPreferences({ dailyLimit: 5 });
      (prisma.notification.count as jest.Mock).mockResolvedValue(5);

      const result = await notifyNewMatch(defaultPayload);

      expect(result).toEqual({ sent: false, reason: 'daily_limit' });
      expect(pushNotificationService.send).not.toHaveBeenCalled();
    });

    it('should allow notification when under daily limit', async () => {
      mockEnabledPreferences({ dailyLimit: 5 });
      (prisma.notification.count as jest.Mock).mockResolvedValue(4);
      mockedSend.mockResolvedValue({ success: true, notificationId: 'notif-dl' });

      const result = await notifyNewMatch(defaultPayload);

      expect(result).toEqual({ sent: true });
    });
  });

  // -------------------------------------------------------------------------
  // getNotificationPreferences
  // -------------------------------------------------------------------------

  describe('getNotificationPreferences', () => {
    it('should return user preferences', async () => {
      const pref = {
        userId: 'user-1',
        matchNotifications: true,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        dailyLimit: 10,
      };
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(pref);

      const result = await getNotificationPreferences('user-1');

      expect(result).toEqual(pref);
      expect(prisma.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return null when no preferences exist', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getNotificationPreferences('unknown-user');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // updateNotificationPreferences
  // -------------------------------------------------------------------------

  describe('updateNotificationPreferences', () => {
    it('should call upsert with correct data and return result', async () => {
      const updated = {
        userId: 'user-1',
        matchNotifications: false,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        dailyLimit: 5,
      };
      (prisma.notificationPreference.upsert as jest.Mock).mockResolvedValue(updated);

      const result = await updateNotificationPreferences('user-1', {
        matchNotifications: false,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        dailyLimit: 5,
      });

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: {
          matchNotifications: false,
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          dailyLimit: 5,
        },
        create: {
          userId: 'user-1',
          matchNotifications: false,
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          dailyLimit: 5,
        },
      });
      expect(result).toEqual(updated);
    });

    it('should only include provided fields in upsert data', async () => {
      const updated = { userId: 'user-1', matchNotifications: true, dailyLimit: 10 };
      (prisma.notificationPreference.upsert as jest.Mock).mockResolvedValue(updated);

      await updateNotificationPreferences('user-1', { dailyLimit: 10 });

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { dailyLimit: 10 },
        create: { userId: 'user-1', dailyLimit: 10 },
      });
    });
  });
});
