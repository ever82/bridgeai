/**
 * Redis Client (lazy-initialized)
 * Manages Redis connection for token blacklist and caching.
 * The client is created on first property access to avoid side effects at module load time.
 */

import Redis from 'ioredis';

// Redis Configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let _redisClient: Redis | null = null;

function createRedisClient(): Redis {
  const client = new Redis(REDIS_URL, {
    lazyConnect: true,
    retryStrategy: times => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  client.on('connect', () => {
    console.log('Redis connected successfully');
  });

  client.on('error', err => {
    console.error('Redis error:', err);
  });

  client.on('close', () => {
    console.log('Redis connection closed');
  });

  return client;
}

function getRedisClient(): Redis {
  if (!_redisClient) {
    _redisClient = createRedisClient();
  }
  return _redisClient;
}

/** Lazily-initialized Redis proxy – safe to import without triggering a connection. */
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    if (typeof prop !== 'string') {
      return undefined;
    }
    const client = getRedisClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export async function closeRedis(): Promise<void> {
  if (_redisClient) {
    await _redisClient.quit();
    _redisClient = null;
  }
}

export function isRedisConnected(): boolean {
  return _redisClient !== null && _redisClient.status === 'ready';
}
