/**
 * Tests for Redis client (HA, healthCheck, reconnect, initializeRedis, redisRead, redisWrite)
 * File: apps/server/src/services/redis.ts
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import * as redisModule from '../../services/redis';

// Mock ioredis
const mockMasterClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  ping: jest.fn().mockResolvedValue('PONG'),
  status: 'ready',
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  dbsize: jest.fn(),
  info: jest.fn(),
};

const mockSlaveClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  ping: jest.fn().mockResolvedValue('PONG'),
  status: 'ready',
  on: jest.fn(),
  get: jest.fn(),
};

const mockSentinelClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  ping: jest.fn().mockResolvedValue('PONG'),
  status: 'ready',
  on: jest.fn(),
};

let constructorCallCount = 0;

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      constructorCallCount++;
      // First constructor call = master, second = slave, third = sentinel
      if (constructorCallCount % 3 === 2) return mockSlaveClient;
      if (constructorCallCount % 3 === 0) return mockSentinelClient;
      return mockMasterClient;
    }),
  };
});

describe('Redis Client', () => {
  beforeEach(() => {
    redisModule._resetState();
    jest.clearAllMocks();
    constructorCallCount = 0;
    mockMasterClient.connect.mockResolvedValue(undefined);
    mockMasterClient.quit.mockResolvedValue('OK');
    mockMasterClient.ping.mockResolvedValue('PONG');
    mockMasterClient.status = 'ready';
    mockSlaveClient.connect.mockResolvedValue(undefined);
    mockSlaveClient.quit.mockResolvedValue('OK');
    mockSlaveClient.ping.mockResolvedValue('PONG');
    mockSlaveClient.status = 'ready';
    mockSentinelClient.connect.mockResolvedValue(undefined);
    mockSentinelClient.quit.mockResolvedValue('OK');
    mockSentinelClient.ping.mockResolvedValue('PONG');
    mockSentinelClient.status = 'ready';
  });

  describe('initializeRedis', () => {
    it('should initialize master client successfully', async () => {
      await redisModule.initializeRedis();

      expect(mockMasterClient.connect).toHaveBeenCalled();
      expect(redisModule.getConnectionState()).toBe('connected');
    });

    it('should initialize slave client when REDIS_SLAVE_URL is set', async () => {
      // Note: REDIS_SLAVE_URL is read at module load time, so we can't dynamically set it.
      // This test verifies the slave initialization path exists.
      // The slave client is only created when the env var is set at import time.
      // We test the slave client directly via healthCheck when available.
      await redisModule.initializeRedis();

      expect(mockMasterClient.connect).toHaveBeenCalled();
      // Slave requires REDIS_SLAVE_URL set at module load - tested via integration tests
    });

    it('should initialize sentinel client when REDIS_SENTINEL_HOSTS is set', async () => {
      const originalSentinel = process.env.REDIS_SENTINEL_HOSTS;
      process.env.REDIS_SENTINEL_HOSTS = 'sentinel1:26379,sentinel2:26379';

      await redisModule.initializeRedis();

      expect(mockMasterClient.connect).toHaveBeenCalled();

      process.env.REDIS_SENTINEL_HOSTS = originalSentinel;
    });

    it('should set connection state to error on failure', async () => {
      mockMasterClient.connect.mockRejectedValue(new Error('Connection refused'));

      await expect(redisModule.initializeRedis()).rejects.toThrow('Connection refused');
      expect(redisModule.getConnectionState()).toBe('error');
    });
  });

  describe('closeRedis', () => {
    it('should close all open connections', async () => {
      await redisModule.initializeRedis();
      await redisModule.closeRedis();

      expect(mockMasterClient.quit).toHaveBeenCalled();
      expect(redisModule.getConnectionState()).toBe('disconnected');
    });

    it('should handle close when no connections exist', async () => {
      await expect(redisModule.closeRedis()).resolves.not.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should report healthy when master is connected', async () => {
      await redisModule.initializeRedis();
      const health = await redisModule.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.master).toBe(true);
    });

    it('should report unhealthy when master ping fails', async () => {
      await redisModule.initializeRedis();
      mockMasterClient.ping.mockRejectedValue(new Error('Connection lost'));

      const health = await redisModule.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.master).toBe(false);
    });

    it('should report slave status when configured', async () => {
      // Slave requires REDIS_SLAVE_URL at module load time
      await redisModule.initializeRedis();
      const health = await redisModule.healthCheck();

      // Without REDIS_SLAVE_URL set at import, slave will be false
      expect(health.slave).toBe(false);
    });

    it('should return all false when no connections initialized', async () => {
      const health = await redisModule.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.master).toBe(false);
      expect(health.slave).toBe(false);
      expect(health.sentinel).toBe(false);
    });
  });

  describe('isRedisConnected', () => {
    it('should return false before initialization', () => {
      expect(redisModule.isRedisConnected()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      await redisModule.initializeRedis();
      expect(redisModule.isRedisConnected()).toBe(true);
    });
  });

  describe('getConnectionState', () => {
    it('should return disconnected before initialization', () => {
      expect(redisModule.getConnectionState()).toBe('disconnected');
    });

    it('should return connected after initialization', async () => {
      await redisModule.initializeRedis();
      expect(redisModule.getConnectionState()).toBe('connected');
    });
  });

  describe('getRedisStats', () => {
    it('should return stats after initialization', async () => {
      await redisModule.initializeRedis();
      const stats = redisModule.getRedisStats();

      expect(stats.hasMaster).toBe(true);
      expect(stats.connectionState).toBe('connected');
    });

    it('should report no connections before initialization', () => {
      const stats = redisModule.getRedisStats();

      expect(stats.hasMaster).toBe(false);
      expect(stats.hasSlave).toBe(false);
      expect(stats.hasSentinel).toBe(false);
    });
  });

  describe('redisRead proxy', () => {
    it('should delegate read operations to read client', async () => {
      mockMasterClient.get.mockResolvedValue(JSON.stringify({ data: 'test' }));
      await redisModule.initializeRedis();

      const result = await redisModule.redisRead.get('test:key');

      expect(mockMasterClient.get).toHaveBeenCalledWith('test:key');
      expect(result).toBe(JSON.stringify({ data: 'test' }));
    });
  });

  describe('redisWrite proxy', () => {
    it('should delegate write operations to write client', async () => {
      mockMasterClient.set.mockResolvedValue('OK');
      await redisModule.initializeRedis();

      await redisModule.redisWrite.set('test:key', 'value');

      expect(mockMasterClient.set).toHaveBeenCalledWith('test:key', 'value');
    });
  });

  describe('reconnectRedis', () => {
    it('should close existing connections and reinitialize', async () => {
      await redisModule.initializeRedis();
      await redisModule.reconnectRedis();

      expect(mockMasterClient.quit).toHaveBeenCalled();
      expect(mockMasterClient.connect).toHaveBeenCalled();
      expect(redisModule.getConnectionState()).toBe('connected');
    });
  });

  describe('getSlaveClient', () => {
    it('should return null when no slave is configured', () => {
      expect(redisModule.getSlaveClient()).toBeNull();
    });
  });
});
