// Mock dependencies
jest.mock('../db/client', () => ({
  prisma: {
    match: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../services/matching/queryEngine', () => ({
  queryEngine: {
    execute: jest.fn(),
    resetInstance: jest.fn(),
  },
}));

import { QuerySubscriptionManager } from '../services/matching/querySubscriptionManager';
import { queryEngine } from '../services/matching/queryEngine';

describe('QuerySubscriptionManager', () => {
  let manager: QuerySubscriptionManager;

  beforeEach(() => {
    QuerySubscriptionManager.resetInstance();
    manager = QuerySubscriptionManager.getInstance();
    manager.destroy();
    jest.clearAllMocks();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('createSubscription', () => {
    it('should create a subscription for a user', async () => {
      (queryEngine.execute as jest.Mock).mockResolvedValue({
        data: [{ id: '1', status: 'active' }],
        cached: false,
      });

      const subscription = await manager.createSubscription(
        'user1',
        { where: { field: 'status', operator: 'eq', value: 'active' } }
      );

      expect(subscription).toHaveProperty('id');
      expect(subscription.userId).toBe('user1');
      expect(subscription.active).toBe(true);
    });

    it('should emit data event with initial results', async () => {
      const mockResults = [{ id: '1' }, { id: '2' }];
      (queryEngine.execute as jest.Mock).mockResolvedValue({ data: mockResults, cached: false });

      const eventHandler = jest.fn();
      manager.on('event', eventHandler);

      await manager.createSubscription(
        'user1',
        { where: { field: 'status', operator: 'eq', value: 'active' } }
      );

      expect(eventHandler).toHaveBeenCalled();
      const event = eventHandler.mock.calls[0][0];
      expect(event.type).toBe('data');
      expect(event.data.results).toEqual(mockResults);

      manager.off('event', eventHandler);
    });

    it('should emit error event when query fails', async () => {
      (queryEngine.execute as jest.Mock).mockRejectedValue(new Error('Query failed'));

      const eventHandler = jest.fn();
      manager.on('event', eventHandler);

      await manager.createSubscription(
        'user1',
        { where: { field: 'status', operator: 'eq', value: 'active' } }
      );

      const errorEvent = eventHandler.mock.calls.find((call: any) => call[0].type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent[0].error).toBe('Query failed');

      manager.off('event', eventHandler);
    });

    it('should throw when user reaches subscription limit', async () => {
      // Fill up to the limit (MAX_SUBSCRIPTIONS_PER_USER = 20)
      const dsl = { where: { field: 'status', operator: 'eq', value: 'active' } };
      (queryEngine.execute as jest.Mock).mockResolvedValue({ data: [], cached: false });

      for (let i = 0; i < 20; i++) {
        await manager.createSubscription(`user-limit-test`, dsl);
      }

      await expect(manager.createSubscription(`user-limit-test`, dsl)).rejects.toThrow(
        /Maximum subscriptions/
      );
    });
  });

  describe('removeSubscription', () => {
    it('should remove an existing subscription', async () => {
      (queryEngine.execute as jest.Mock).mockResolvedValue({ data: [], cached: false });

      const subscription = await manager.createSubscription(
        'user1',
        { where: { field: 'status', operator: 'eq', value: 'active' } }
      );

      const result = manager.removeSubscription(subscription.id);

      expect(result).toBe(true);
      expect(manager.getSubscription(subscription.id)).toBeUndefined();
    });

    it('should return false for non-existent subscription', () => {
      const result = manager.removeSubscription('non-existent-id');

      expect(result).toBe(false);
    });

    it('should emit subscription_removed event', async () => {
      (queryEngine.execute as jest.Mock).mockResolvedValue({ data: [], cached: false });

      const subscription = await manager.createSubscription(
        'user1',
        { where: { field: 'status', operator: 'eq', value: 'active' } }
      );

      const eventHandler = jest.fn();
      manager.on('event', eventHandler);

      manager.removeSubscription(subscription.id);

      const removedEvent = eventHandler.mock.calls.find((call: any) => call[0].type === 'subscription_removed');
      expect(removedEvent).toBeDefined();

      manager.off('event', eventHandler);
    });
  });

  describe('getSubscription', () => {
    it('should retrieve a subscription by id', async () => {
      (queryEngine.execute as jest.Mock).mockResolvedValue({ data: [], cached: false });

      const subscription = await manager.createSubscription(
        'user1',
        { where: { field: 'status', operator: 'eq', value: 'active' } }
      );

      const found = manager.getSubscription(subscription.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(subscription.id);
    });

    it('should return undefined for non-existent subscription', () => {
      const found = manager.getSubscription('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('getUserSubscriptions', () => {
    it('should return all subscriptions for a user', async () => {
      (queryEngine.execute as jest.Mock).mockResolvedValue({ data: [], cached: false });

      await manager.createSubscription(
        'user1',
        { where: { field: 'status', operator: 'eq', value: 'active' } }
      );
      await manager.createSubscription(
        'user1',
        { where: { field: 'score', operator: 'gte', value: 50 } }
      );

      const subs = manager.getUserSubscriptions('user1');

      expect(subs).toHaveLength(2);
    });

    it('should return empty array for user with no subscriptions', () => {
      const subs = manager.getUserSubscriptions('user-with-no-subs');

      expect(subs).toHaveLength(0);
    });
  });

  describe('handleHeartbeat', () => {
    it('should update lastPingAt and return true', async () => {
      (queryEngine.execute as jest.Mock).mockResolvedValue({ data: [], cached: false });

      const subscription = await manager.createSubscription(
        'user1',
        { where: { field: 'status', operator: 'eq', value: 'active' } }
      );

      const result = manager.handleHeartbeat(subscription.id);

      expect(result).toBe(true);
      const sub = manager.getSubscription(subscription.id);
      expect(sub?.lastPingAt).toBeInstanceOf(Date);
    });

    it('should return false for non-existent subscription', () => {
      const result = manager.handleHeartbeat('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('refreshSubscription', () => {
    it('should execute the query and emit data event', async () => {
      const mockExecute = queryEngine.execute as jest.Mock;
      mockExecute.mockResolvedValueOnce({ data: [], cached: false });

      const subscription = await manager.createSubscription(
        'user1',
        { where: { field: 'status', operator: 'eq', value: 'active' } }
      );

      // Reset to track calls for refresh
      mockExecute.mockResolvedValueOnce({ data: [], cached: false });

      await manager.refreshSubscription(subscription.id);

      expect(mockExecute).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return subscription statistics', async () => {
      (queryEngine.execute as jest.Mock).mockResolvedValue({ data: [], cached: false });

      await manager.createSubscription(
        'user1',
        { where: { field: 'status', operator: 'eq', value: 'active' } }
      );
      await manager.createSubscription(
        'user2',
        { where: { field: 'status', operator: 'eq', value: 'active' } }
      );

      const stats = manager.getStats();

      expect(stats.totalSubscriptions).toBe(2);
      expect(stats.activeUsers).toBe(2);
      expect(stats.subscriptionByStatus.active).toBe(2);
      expect(stats.subscriptionByStatus.inactive).toBe(0);
    });
  });

  describe('queueIncrementalUpdate', () => {
    it('should add update to queue', () => {
      manager.queueIncrementalUpdate({
        subscriptionId: 'sub1',
        updateType: 'insert',
        affectedIds: ['1', '2'],
      });

      const stats = manager.getStats();
      expect(stats.queuedUpdates).toBe(1);
    });

    it('should cap queue size at UPDATE_BATCH_SIZE', () => {
      for (let i = 0; i < 150; i++) {
        manager.queueIncrementalUpdate({
          subscriptionId: `sub${i}`,
          updateType: 'insert',
          affectedIds: ['1'],
        });
      }

      const stats = manager.getStats();
      expect(stats.queuedUpdates).toBeLessThanOrEqual(100); // UPDATE_BATCH_SIZE = 100
    });
  });

  describe('destroy', () => {
    it('should clear all subscriptions and timers', async () => {
      (queryEngine.execute as jest.Mock).mockResolvedValue({ data: [], cached: false });

      await manager.createSubscription('user1', { where: { field: 'status', operator: 'eq', value: 'active' } });
      await manager.createSubscription('user2', { where: { field: 'status', operator: 'eq', value: 'active' } });

      const statsBefore = manager.getStats();
      expect(statsBefore.totalSubscriptions).toBe(2);

      manager.destroy();

      const statsAfter = manager.getStats();
      expect(statsAfter.totalSubscriptions).toBe(0);
    });
  });
});