/**
 * Tests for Cache decorators (@cached, @invalidateCache, @bustNamespaceCache)
 * and specialized cache functions
 * File: apps/server/src/services/cache.ts
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Redis mock state
const mockRedisInstance = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  dbsize: jest.fn(),
  info: jest.fn(),
  mget: jest.fn(),
  pipeline: jest.fn(),
  quit: jest.fn(),
  status: 'ready',
};

jest.mock('../../services/redis', () => ({
  redis: mockRedisInstance,
  isRedisConnected: jest.fn().mockReturnValue(true),
}));

import {
  cached,
  invalidateCache,
  bustNamespaceCache,
  cacheCreditScore,
  getCachedCreditScore,
  cacheAgentProfile,
  getCachedAgentProfile,
  invalidateAgentProfile,
  cacheMatchResults,
  getCachedMatchResults,
  invalidateMatchResults,
} from '../../services/cache';
import { isRedisConnected } from '../../services/redis';

describe('Cache Decorator Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isRedisConnected as jest.Mock).mockReturnValue(true);
    mockRedisInstance.status = 'ready';
  });

  // ==========================================================================
  // @cached Decorator
  // ==========================================================================
  describe('@cached decorator', () => {
    it('should cache method result and return cached on second call', async () => {
      class TestService {
        callCount = 0;

        @cached('user', (id: string) => id, 300)
        async getUser(id: string): Promise<{ id: string; name: string }> {
          this.callCount++;
          return { id, name: `User ${id}` };
        }
      }

      const service = new TestService();

      // First call - cache miss
      mockRedisInstance.get.mockResolvedValueOnce(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result1 = await service.getUser('123');
      expect(result1).toEqual({ id: '123', name: 'User 123' });
      expect(service.callCount).toBe(1);

      // Second call - cache hit
      mockRedisInstance.get.mockResolvedValueOnce(JSON.stringify({ id: '123', name: 'User 123' }));

      const result2 = await service.getUser('123');
      expect(result2).toEqual({ id: '123', name: 'User 123' });
      expect(service.callCount).toBe(1); // factory not called again
    });

    it('should use versioned key format', async () => {
      class TestService {
        @cached('profile', (userId: string) => userId, 600)
        async getProfile(userId: string): Promise<string> {
          return `profile-${userId}`;
        }
      }

      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      const service = new TestService();
      await service.getProfile('user-abc');

      // Key should be cache:profile:v1:user-abc
      expect(mockRedisInstance.get).toHaveBeenCalledWith('cache:profile:v1:user-abc');
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'cache:profile:v1:user-abc',
        600,
        expect.any(String)
      );
    });

    it('should not cache null or undefined results', async () => {
      class TestService {
        @cached('nullable', () => 'key', 300)
        async getNullable(): Promise<null> {
          return null;
        }
      }

      mockRedisInstance.get.mockResolvedValue(null);

      const service = new TestService();
      await service.getNullable();

      // Should NOT call setex because result is null
      expect(mockRedisInstance.setex).not.toHaveBeenCalled();
    });

    it('should not cache undefined results', async () => {
      class TestService {
        @cached('undef', () => 'key', 300)
        async getUndef(): Promise<undefined> {
          return undefined;
        }
      }

      mockRedisInstance.get.mockResolvedValue(null);

      const service = new TestService();
      await service.getUndef();

      expect(mockRedisInstance.setex).not.toHaveBeenCalled();
    });

    it('should generate different keys for different arguments', async () => {
      class TestService {
        @cached('item', (category: string, id: string) => `${category}:${id}`, 300)
        async getItem(category: string, id: string): Promise<string> {
          return `${category}-${id}`;
        }
      }

      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      const service = new TestService();
      await service.getItem('books', '001');
      await service.getItem('movies', '002');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('cache:item:v1:books:001');
      expect(mockRedisInstance.get).toHaveBeenCalledWith('cache:item:v1:movies:002');
    });
  });

  // ==========================================================================
  // @invalidateCache Decorator
  // ==========================================================================
  describe('@invalidateCache decorator', () => {
    it('should delete cache entry after method execution', async () => {
      class TestService {
        @invalidateCache('user')
        async updateUser(_id: string, _data: Record<string, unknown>): Promise<string> {
          return 'updated';
        }
      }

      mockRedisInstance.del.mockResolvedValue(1);

      const service = new TestService();
      const result = await service.updateUser('123', { name: 'New' });

      expect(result).toBe('updated');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('cache:user:v1:123');
    });

    it('should still return original method result after invalidation', async () => {
      class TestService {
        @invalidateCache('profile')
        async deleteProfile(_id: string): Promise<{ deleted: boolean }> {
          return { deleted: true };
        }
      }

      mockRedisInstance.del.mockResolvedValue(1);

      const service = new TestService();
      const result = await service.deleteProfile('456');

      expect(result).toEqual({ deleted: true });
    });

    it('should handle method with no arguments gracefully', async () => {
      class TestService {
        @invalidateCache('global')
        async resetAll(): Promise<void> {
          // no-op
        }
      }

      mockRedisInstance.del.mockResolvedValue(0);

      const service = new TestService();
      await service.resetAll();

      // No key to delete when first arg is empty
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // @bustNamespaceCache Decorator
  // ==========================================================================
  describe('@bustNamespaceCache decorator', () => {
    it('should invalidate all keys in namespace after method execution', async () => {
      class TestService {
        @bustNamespaceCache('user')
        async bulkUpdateUsers(): Promise<number> {
          return 5;
        }
      }

      mockRedisInstance.keys.mockResolvedValue(['cache:user:v1:123', 'cache:user:v1:456']);
      mockRedisInstance.del.mockResolvedValue(2);

      const service = new TestService();
      const result = await service.bulkUpdateUsers();

      expect(result).toBe(5);
      expect(mockRedisInstance.keys).toHaveBeenCalledWith('cache:user:v1:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('cache:user:v1:123', 'cache:user:v1:456');
    });

    it('should use custom version when provided', async () => {
      class TestService {
        @bustNamespaceCache('config', 'v2')
        async updateConfig(): Promise<void> {
          // no-op
        }
      }

      mockRedisInstance.keys.mockResolvedValue([]);
      mockRedisInstance.del.mockResolvedValue(0);

      const service = new TestService();
      await service.updateConfig();

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('cache:config:v2:*');
    });
  });

  // ==========================================================================
  // Specialized Cache Functions
  // ==========================================================================
  describe('credit score caching', () => {
    it('should cache credit score with correct key and TTL', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');

      await cacheCreditScore('user-1', 85, 'A');

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'cache:credit:score:user-1',
        300, // CacheTTL.CREDIT_SCORE
        JSON.stringify({ score: 85, level: 'A' })
      );
    });

    it('should retrieve cached credit score', async () => {
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({ score: 92, level: 'A+' }));

      const result = await getCachedCreditScore('user-1');

      expect(result).toEqual({ score: 92, level: 'A+' });
      expect(mockRedisInstance.get).toHaveBeenCalledWith('cache:credit:score:user-1');
    });

    it('should return null when credit score not cached', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await getCachedCreditScore('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('agent profile caching', () => {
    it('should cache agent profile', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');
      const profile = { id: 'agent-1', name: 'Agent Alpha' };

      await cacheAgentProfile('agent-1', profile);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'cache:agent:profile:agent-1',
        300,
        JSON.stringify(profile)
      );
    });

    it('should retrieve cached agent profile', async () => {
      const profile = { id: 'agent-1', name: 'Agent Alpha' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(profile));

      const result = await getCachedAgentProfile('agent-1');

      expect(result).toEqual(profile);
    });

    it('should invalidate agent profile cache', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      await invalidateAgentProfile('agent-1');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('cache:agent:profile:agent-1');
    });
  });

  describe('match results caching', () => {
    it('should cache match results', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');
      const results = [{ id: 'match-1' }, { id: 'match-2' }];

      await cacheMatchResults('user-1', results);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'cache:match:results:user-1',
        900, // CacheTTL.MATCH_RESULTS
        JSON.stringify(results)
      );
    });

    it('should retrieve cached match results', async () => {
      const results = [{ id: 'match-1' }];
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(results));

      const result = await getCachedMatchResults('user-1');

      expect(result).toEqual(results);
    });

    it('should invalidate match results cache', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      await invalidateMatchResults('user-1');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('cache:match:results:user-1');
    });

    it('should return null when match results not cached', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await getCachedMatchResults('nonexistent');

      expect(result).toBeNull();
    });
  });
});
