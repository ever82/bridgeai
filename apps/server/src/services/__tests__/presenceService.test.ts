import { presenceService, PresenceService, PresenceStatus } from '../presenceService';
import { connectionService } from '../connectionService';

describe('PresenceService', () => {
  let service: PresenceService;

  beforeEach(() => {
    service = new PresenceService();
  });

  afterEach(() => {
    service.destroy();
    connectionService.clearAllConnections();
  });

  describe('setPresence', () => {
    it('should set user presence', () => {
      const presence = service.setPresence('user-1', 'online');

      expect(presence.userId).toBe('user-1');
      expect(presence.status).toBe('online');
      expect(presence.deviceCount).toBe(0);
    });

    it('should set custom status', () => {
      const presence = service.setPresence('user-1', 'online', 'Working on project');
      expect(presence.customStatus).toBe('Working on project');
    });

    it('should update device count', () => {
      connectionService.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '192.168.1.1');

      const presence = service.setPresence('user-1', 'online');
      expect(presence.deviceCount).toBe(1);
    });
  });

  describe('getPresence', () => {
    it('should return existing presence', () => {
      service.setPresence('user-1', 'online');

      const presence = service.getPresence('user-1');

      expect(presence.status).toBe('online');
    });

    it('should return default offline presence for unknown user', () => {
      const presence = service.getPresence('unknown-user');

      expect(presence.userId).toBe('unknown-user');
      expect(presence.status).toBe('offline');
      expect(presence.deviceCount).toBe(0);
    });
  });

  describe('getPresenceForUsers', () => {
    it('should return presence for multiple users', () => {
      service.setPresence('user-1', 'online');
      service.setPresence('user-2', 'away');
      service.setPresence('user-3', 'busy');

      const presences = service.getPresenceForUsers(['user-1', 'user-2', 'user-3']);

      expect(presences).toHaveLength(3);
      expect(presences.map((p) => p.status)).toContain('online');
      expect(presences.map((p) => p.status)).toContain('away');
      expect(presences.map((p) => p.status)).toContain('busy');
    });
  });

  describe('isUserOnline', () => {
    it('should return true for online user', () => {
      service.setPresence('user-1', 'online');
      expect(service.isUserOnline('user-1')).toBe(true);
    });

    it('should return true for away user', () => {
      service.setPresence('user-1', 'away');
      expect(service.isUserOnline('user-1')).toBe(true);
    });

    it('should return false for offline user', () => {
      service.setPresence('user-1', 'offline');
      expect(service.isUserOnline('user-1')).toBe(false);
    });

    it('should return false for unknown user', () => {
      expect(service.isUserOnline('unknown')).toBe(false);
    });
  });

  describe('getOnlineUsersCount', () => {
    it('should count online and away users', () => {
      service.setPresence('user-1', 'online');
      service.setPresence('user-2', 'online');
      service.setPresence('user-3', 'away');
      service.setPresence('user-4', 'offline');
      service.setPresence('user-5', 'busy');

      expect(service.getOnlineUsersCount()).toBe(3);
    });
  });

  describe('getOnlineUsers', () => {
    it('should return all online users', () => {
      service.setPresence('user-1', 'online');
      service.setPresence('user-2', 'online');
      service.setPresence('user-3', 'offline');

      const onlineUsers = service.getOnlineUsers();

      expect(onlineUsers).toHaveLength(1);
      expect(onlineUsers[0].userId).toBe('user-1');
    });
  });

  describe('updateActivity', () => {
    it('should update last activity', () => {
      service.setPresence('user-1', 'online');
      const oldActivity = service.getPresence('user-1').lastActivityAt;

      // Wait a bit
      jest.advanceTimersByTime(1000);
      service.updateActivity('user-1');

      const newActivity = service.getPresence('user-1').lastActivityAt;
      expect(newActivity.getTime()).toBeGreaterThan(oldActivity.getTime());
    });

    it('should change status from away to online', () => {
      service.setPresence('user-1', 'away');
      service.updateActivity('user-1');

      expect(service.getPresence('user-1').status).toBe('online');
    });
  });

  describe('markOffline', () => {
    it('should mark user as offline', () => {
      service.setPresence('user-1', 'online');
      service.markOffline('user-1');

      expect(service.getPresence('user-1').status).toBe('offline');
      expect(service.getPresence('user-1').lastOnlineAt).toBeDefined();
    });

    it('should not change already offline user', () => {
      service.setPresence('user-1', 'offline');
      const lastOnline = service.getPresence('user-1').lastOnlineAt;

      service.markOffline('user-1');

      expect(service.getPresence('user-1').lastOnlineAt).toBe(lastOnline);
    });
  });

  describe('subscribeToPresence / unsubscribeFromPresence', () => {
    it('should add subscription', () => {
      service.subscribeToPresence('user-1', 'user-2');

      const subscribers = service.getSubscribers('user-2');
      expect(subscribers).toContain('user-1');

      const subscriptions = service.getSubscriptions('user-1');
      expect(subscriptions).toContain('user-2');
    });

    it('should remove subscription', () => {
      service.subscribeToPresence('user-1', 'user-2');
      service.unsubscribeFromPresence('user-1', 'user-2');

      const subscribers = service.getSubscribers('user-2');
      expect(subscribers).not.toContain('user-1');
    });
  });

  describe('unsubscribeAll', () => {
    it('should remove all subscriptions for user', () => {
      service.subscribeToPresence('user-1', 'user-2');
      service.subscribeToPresence('user-1', 'user-3');
      service.subscribeToPresence('user-1', 'user-4');

      service.unsubscribeAll('user-1');

      expect(service.getSubscriptions('user-1')).toEqual([]);
      expect(service.getSubscribers('user-2')).not.toContain('user-1');
      expect(service.getSubscribers('user-3')).not.toContain('user-1');
      expect(service.getSubscribers('user-4')).not.toContain('user-1');
    });
  });

  describe('onPresenceChange', () => {
    it('should register callback', () => {
      const callback = jest.fn();
      const unsubscribe = service.onPresenceChange('user-1', callback);

      service.setPresence('user-1', 'online');

      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });

    it('should allow unsubscribing callback', () => {
      const callback = jest.fn();
      const unsubscribe = service.onPresenceChange('user-1', callback);

      unsubscribe();

      service.setPresence('user-1', 'online');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return presence statistics', () => {
      service.setPresence('user-1', 'online');
      service.setPresence('user-2', 'online');
      service.setPresence('user-3', 'away');
      service.setPresence('user-4', 'busy');
      service.setPresence('user-5', 'offline');

      const stats = service.getStatistics();

      expect(stats.online).toBe(2);
      expect(stats.away).toBe(1);
      expect(stats.busy).toBe(1);
      expect(stats.offline).toBe(1);
      expect(stats.total).toBe(5);
    });
  });

  describe('clearAll', () => {
    it('should clear all presence data', () => {
      service.setPresence('user-1', 'online');
      service.setPresence('user-2', 'online');
      service.subscribeToPresence('user-1', 'user-2');

      service.clearAll();

      expect(service.getPresence('user-1').status).toBe('offline');
      expect(service.getSubscriptions('user-1')).toEqual([]);
    });
  });
});
