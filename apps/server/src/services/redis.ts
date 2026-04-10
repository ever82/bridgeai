/**
 * Redis Client
 * Manages Redis connection for token blacklist and caching
 */

import Redis from 'ioredis';

// Redis Configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client
export const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Handle Redis events
redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
redis.on('close', () => {
  console.log('Redis connection closed');
});


export async function closeRedis(): Promise<void> {
  await redis.quit();
}

export function isRedisConnected(): boolean {
  return redis.status === 'ready';
}
