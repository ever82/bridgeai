/**
 * Redis Client (lazy-initialized)
 * Manages Redis connection with support for:
 * - Master-slave replication
 * - Sentinel mode for high availability
 * - Connection pool management
 * - Health checks and automatic reconnection
 */
import Redis from 'ioredis';
/**
 * Get slave client - for read operations (load balancing)
 */
export declare function getSlaveClient(): Redis | null;
/**
 * Lazily-initialized Redis proxy for read operations
 */
export declare const redisRead: Redis;
/**
 * Lazily-initialized Redis proxy for write operations
 */
export declare const redisWrite: Redis;
/**
 * Main Redis proxy - defaults to master for writes
 */
export declare const redis: Redis;
/**
 * Initialize Redis connections
 */
export declare function initializeRedis(): Promise<void>;
/**
 * Close all Redis connections
 */
export declare function closeRedis(): Promise<void>;
/**
 * Check if Redis is connected
 */
export declare function isRedisConnected(): boolean;
/**
 * Get connection state
 */
export declare function getConnectionState(): 'disconnected' | 'connecting' | 'connected' | 'error';
/**
 * Perform health check on Redis connections
 */
export declare function healthCheck(): Promise<{
    healthy: boolean;
    master: boolean;
    slave: boolean;
    sentinel: boolean;
}>;
/**
 * Reconnect to Redis
 */
export declare function reconnectRedis(): Promise<void>;
/**
 * Get Redis connection statistics
 */
export declare function getRedisStats(): {
    connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
    hasMaster: boolean;
    hasSlave: boolean;
    hasSentinel: boolean;
    masterStatus?: string;
    slaveStatus?: string;
};
/** @internal Reset all connection state (for testing only) */
export declare function _resetState(): void;
declare const _default: {
    redis: Redis;
    redisRead: Redis;
    redisWrite: Redis;
    initializeRedis: typeof initializeRedis;
    closeRedis: typeof closeRedis;
    isRedisConnected: typeof isRedisConnected;
    getConnectionState: typeof getConnectionState;
    healthCheck: typeof healthCheck;
    reconnectRedis: typeof reconnectRedis;
    getRedisStats: typeof getRedisStats;
    _resetState: typeof _resetState;
};
export default _default;
//# sourceMappingURL=redis.d.ts.map