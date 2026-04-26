/**
 * Socket.io Redis Adapter
 *
 * Configures Redis adapter for multi-node Socket.io scaling.
 */
import { Redis } from 'ioredis';

/**
 * Redis client type alias for ioredis
 */
type RedisClientType = Redis;

/**
 * Redis clients for adapter
 */
let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;

/**
 * Initialize Redis clients for Socket.io adapter
 */
export async function initializeRedisAdapter(): Promise<{
  pubClient: RedisClientType | null;
  subClient: RedisClientType | null;
}> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  // Skip if Redis is not configured
  if (!redisUrl || process.env.DISABLE_REDIS_ADAPTER === 'true') {
    console.log('[Socket.io] Redis adapter disabled');
    return { pubClient: null, subClient: null };
  }

  try {
    // Create pub client (ioredis handles connection automatically)
    pubClient = new Redis(redisUrl, {
      retryStrategy: retries => {
        if (retries > 10) {
          console.error('[Redis] Max reconnection attempts reached');
          return new Error('Max reconnection attempts');
        }
        return Math.min(retries * 100, 3000);
      },
      lazyConnect: false,
    });

    // Create sub client (new instance with same config)
    subClient = new Redis(redisUrl, {
      retryStrategy: retries => {
        if (retries > 10) {
          console.error('[Redis] Max reconnection attempts reached');
          return new Error('Max reconnection attempts');
        }
        return Math.min(retries * 100, 3000);
      },
      lazyConnect: false,
    });

    // Setup error handlers
    pubClient.on('error', err => {
      console.error('[Redis] Pub client error:', err);
    });

    subClient.on('error', err => {
      console.error('[Redis] Sub client error:', err);
    });

    // Setup reconnect handlers
    pubClient.on('reconnecting', () => {
      console.log('[Redis] Pub client reconnecting...');
    });

    subClient.on('reconnecting', () => {
      console.log('[Redis] Sub client reconnecting...');
    });

    // Wait for both clients to be ready
    await Promise.all([pubClient.ping(), subClient.ping()]);

    console.log('[Socket.io] Redis adapter connected:', redisUrl);

    return { pubClient, subClient };
  } catch (error) {
    console.error('[Socket.io] Failed to connect Redis adapter:', error);
    // Gracefully degrade to in-memory adapter
    pubClient = null;
    subClient = null;
    return { pubClient: null, subClient: null };
  }
}

/**
 * Get Redis clients
 */
export function getRedisClients(): {
  pubClient: RedisClientType | null;
  subClient: RedisClientType | null;
} {
  return { pubClient, subClient };
}

/**
 * Close Redis connections
 */
export async function closeRedisAdapter(): Promise<void> {
  try {
    if (pubClient) {
      await pubClient.quit();
      pubClient = null;
    }
    if (subClient) {
      await subClient.quit();
      subClient = null;
    }
    console.log('[Socket.io] Redis adapter disconnected');
  } catch (error) {
    console.error('[Socket.io] Error closing Redis adapter:', error);
  }
}

/**
 * Check if Redis adapter is connected
 */
export function isRedisAdapterConnected(): boolean {
  return pubClient?.status === 'ready' && subClient?.status === 'ready';
}

export { pubClient, subClient };
export default {
  initializeRedisAdapter,
  getRedisClients,
  closeRedisAdapter,
  isRedisAdapterConnected,
};
