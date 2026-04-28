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
declare let pubClient: RedisClientType | null;
declare let subClient: RedisClientType | null;
/**
 * Initialize Redis clients for Socket.io adapter
 */
export declare function initializeRedisAdapter(): Promise<{
    pubClient: RedisClientType | null;
    subClient: RedisClientType | null;
}>;
/**
 * Get Redis clients
 */
export declare function getRedisClients(): {
    pubClient: RedisClientType | null;
    subClient: RedisClientType | null;
};
/**
 * Close Redis connections
 */
export declare function closeRedisAdapter(): Promise<void>;
/**
 * Check if Redis adapter is connected
 */
export declare function isRedisAdapterConnected(): boolean;
export { pubClient, subClient };
declare const _default: {
    initializeRedisAdapter: typeof initializeRedisAdapter;
    getRedisClients: typeof getRedisClients;
    closeRedisAdapter: typeof closeRedisAdapter;
    isRedisAdapterConnected: typeof isRedisAdapterConnected;
};
export default _default;
//# sourceMappingURL=adapter.d.ts.map