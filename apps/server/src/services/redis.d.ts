/**
 * Redis Client (lazy-initialized)
 * Manages Redis connection for token blacklist and caching.
 * The client is created on first property access to avoid side effects at module load time.
 */
import Redis from 'ioredis';
/** Lazily-initialized Redis proxy – safe to import without triggering a connection. */
export declare const redis: Redis;
export declare function closeRedis(): Promise<void>;
export declare function isRedisConnected(): boolean;
//# sourceMappingURL=redis.d.ts.map