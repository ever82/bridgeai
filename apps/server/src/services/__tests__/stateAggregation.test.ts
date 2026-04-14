/**
 * State Aggregation Service Tests
 */
import { StateAggregationService } from '../stateAggregation';

describe('StateAggregationService', () => {
  let service: StateAggregationService;

  beforeEach(() => {
    service = new StateAggregationService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('queueUpdate', () => {
    it('queues updates correctly', () => {
      service.queueUpdate({
        type: 'status',
        targetId: 'user123',
        data: { online: true },
        priority: 'normal',
      });

      const stats = service.getStats();
      expect(stats.pendingUpdates).toBe(1);
      expect(stats.updatesBatched).toBe(1);
    });

    it('flushes high priority updates immediately', (done) => {
      service.on('batch:ready', (batch) => {
        expect(batch.updates).toHaveLength(1);
        done();
      });

      service.queueUpdate({
        type: 'status',
        targetId: 'user123',
        data: { online: true },
        priority: 'high',
      });
    });
  });

  describe('flushBatch', () => {
    it('flushes queued updates', (done) => {
      service.on('batch:ready', (batch) => {
        expect(batch.updates).toHaveLength(2);
        expect(batch.id).toBeDefined();
        expect(batch.timestamp).toBeDefined();
        done();
      });

      service.queueUpdate({
        type: 'status',
        targetId: 'user1',
        data: { online: true },
        priority: 'normal',
      });

      service.queueUpdate({
        type: 'status',
        targetId: 'user2',
        data: { online: false },
        priority: 'normal',
      });

      // Flush manually
      service.flushBatch();
    });

    it('deduplicates updates for same type/target', (done) => {
      service.on('batch:ready', (batch) => {
        // Should only have 1 update for user1 (the latest one)
        const user1Updates = batch.updates.filter((u: any) => u.targetId === 'user1');
        expect(user1Updates).toHaveLength(1);
        expect(user1Updates[0].data.online).toBe(false);
        done();
      });

      service.queueUpdate({
        type: 'status',
        targetId: 'user1',
        data: { online: true },
        priority: 'normal',
      });

      service.queueUpdate({
        type: 'status',
        targetId: 'user1',
        data: { online: false },
        priority: 'normal',
      });

      service.flushBatch();
    });
  });

  describe('cache', () => {
    it('caches data correctly', () => {
      service.setCache('user:123', { name: 'John', online: true });

      const data = service.getCache('user:123');
      expect(data).toEqual({ name: 'John', online: true });
    });

    it('returns undefined for non-existent cache', () => {
      const data = service.getCache('user:nonexistent');
      expect(data).toBeUndefined();
    });

    it('increments cache hits and misses', () => {
      service.setCache('user:123', { name: 'John' });

      service.getCache('user:123'); // hit
      service.getCache('user:123'); // hit
      service.getCache('user:456'); // miss

      const stats = service.getStats();
      expect(stats.cacheHits).toBe(2);
      expect(stats.cacheMisses).toBe(1);
    });

    it('invalidates cache correctly', () => {
      service.setCache('user:123', { name: 'John' });
      expect(service.getCache('user:123')).toBeDefined();

      service.invalidateCache('user:123');
      expect(service.getCache('user:123')).toBeUndefined();
    });

    it('invalidates cache by pattern', () => {
      service.setCache('user:123', { name: 'John' });
      service.setCache('user:456', { name: 'Jane' });
      service.setCache('group:123', { name: 'Group' });

      service.invalidateCachePattern('^user:');

      expect(service.getCache('user:123')).toBeUndefined();
      expect(service.getCache('user:456')).toBeUndefined();
      expect(service.getCache('group:123')).toBeDefined();
    });
  });

  describe('heartbeat', () => {
    it('returns correct interval based on activity level', () => {
      const highInterval = service.getHeartbeatInterval('conn1', 'high');
      const mediumInterval = service.getHeartbeatInterval('conn1', 'medium');
      const lowInterval = service.getHeartbeatInterval('conn1', 'low');

      expect(highInterval).toBe(10000);
      expect(mediumInterval).toBe(30000);
      expect(lowInterval).toBe(60000);
    });

    it('starts and stops heartbeat correctly', () => {
      const mockCallback = jest.fn();

      service.startHeartbeat('conn1', mockCallback, 'high');
      expect(service.getStats().activeHeartbeats).toBe(1);

      service.stopHeartbeat('conn1');
      expect(service.getStats().activeHeartbeats).toBe(0);
    });
  });

  describe('compression', () => {
    it('compresses large data', () => {
      const largeData = { items: Array(100).fill({ id: 1, name: 'test' }) };
      const result = service.compress(largeData);

      expect(result.compressed).toBe(true);
      expect(result.data._compressed).toBe(true);
    });

    it('does not compress small data', () => {
      const smallData = { id: 1 };
      const result = service.compress(smallData);

      expect(result.compressed).toBe(false);
    });

    it('decompresses data correctly', () => {
      const originalData = { items: [1, 2, 3] };
      const compressed = service.compress(originalData);
      const decompressed = service.decompress(compressed.data);

      expect(decompressed).toEqual(originalData);
    });

    it('returns original data if not compressed', () => {
      const data = { test: 'value' };
      const result = service.decompress(data);

      expect(result).toEqual(data);
    });
  });

  describe('stats', () => {
    it('returns correct stats', () => {
      service.queueUpdate({
        type: 'status',
        targetId: 'user1',
        data: {},
        priority: 'high',
      });

      service.setCache('key1', 'value1');
      service.getCache('key1');

      const stats = service.getStats();

      expect(stats.updatesBatched).toBe(1);
      expect(stats.updatesSent).toBe(1);
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheSize).toBe(1);
    });

    it('resets stats correctly', () => {
      service.queueUpdate({
        type: 'status',
        targetId: 'user1',
        data: {},
        priority: 'high',
      });

      service.resetStats();
      const stats = service.getStats();

      expect(stats.updatesBatched).toBe(0);
      expect(stats.updatesSent).toBe(0);
      expect(stats.cacheHits).toBe(0);
    });
  });
});
