/**
 * Socket.io Redis Adapter
 *
 * Configures Redis adapter for multi-node Socket.io scaling.
 */
import { createClient, type RedisClientType } from 'redis';

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
    // Create pub client
    pubClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('[Redis] Max reconnection attempts reached');
            return new Error('Max reconnection attempts');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    // Create sub client (duplicate pub client config)
    subClient = pubClient.duplicate();

    // Setup error handlers
    pubClient.on('error', (err) => {
      console.error('[Redis] Pub client error:', err);
    });

    subClient.on('error', (err) => {
      console.error('[Redis] Sub client error:', err);
    });

    // Setup reconnect handlers
    pubClient.on('reconnecting', () => {
      console.log('[Redis] Pub client reconnecting...');
    });

    subClient.on('reconnecting', () => {
      console.log('[Redis] Sub client reconnecting...');
    });

    // Connect clients
    await pubClient.connect();
    await subClient.connect();

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
  return pubClient?.isOpen && subClient?.isOpen;
}

export { pubClient, subClient };
export default {
  initializeRedisAdapter,
  getRedisClients,
  closeRedisAdapter,
  isRedisAdapterConnected,
};
