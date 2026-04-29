/**
 * Redis Caching Layer
 * Provides high-performance caching for API responses and database queries
 *
 * Features:
 * - TTL-based caching
 * - Cache invalidation
 * - Cache warming
 * - Distributed cache support
 */
import { redis } from '../services/redis';
// Default cache configuration
const DEFAULT_TTL = parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10); // 5 minutes
const CACHE_KEY_PREFIX = process.env.CACHE_KEY_PREFIX || 'bridgeai:';
// Cache namespaces
export const CacheNamespaces = {
    USER: 'user:',
    AGENT: 'agent:',
    MATCH: 'match:',
    CREDIT: 'credit:',
    SEARCH: 'search:',
    RATE_LIMIT: 'rate_limit:',
    SESSION: 'session:',
    HEALTH: 'health:',
};
const stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
};
/**
 * Generate cache key with namespace
 */
function generateKey(namespace, key) {
    return `${CACHE_KEY_PREFIX}${namespace}${key}`;
}
/**
 * Get value from cache
 */
export async function get(namespace, key) {
    try {
        const fullKey = generateKey(namespace, key);
        const value = await redis.get(fullKey);
        if (value) {
            stats.hits++;
            return JSON.parse(value);
        }
        stats.misses++;
        return null;
    }
    catch (error) {
        stats.errors++;
        console.error('Cache get error:', error);
        return null;
    }
}
/**
 * Set value in cache
 */
export async function set(namespace, key, value, ttl = DEFAULT_TTL) {
    try {
        const fullKey = generateKey(namespace, key);
        const serialized = JSON.stringify(value);
        await redis.setex(fullKey, ttl, serialized);
        stats.sets++;
    }
    catch (error) {
        stats.errors++;
        console.error('Cache set error:', error);
    }
}
/**
 * Delete value from cache
 */
export async function del(namespace, key) {
    try {
        const fullKey = generateKey(namespace, key);
        await redis.del(fullKey);
        stats.deletes++;
    }
    catch (error) {
        stats.errors++;
        console.error('Cache delete error:', error);
    }
}
/**
 * Delete multiple values by pattern
 */
export async function delPattern(pattern) {
    try {
        const fullPattern = `${CACHE_KEY_PREFIX}${pattern}*`;
        const keys = await redis.keys(fullPattern);
        if (keys.length > 0) {
            await redis.del(...keys);
            stats.deletes += keys.length;
        }
    }
    catch (error) {
        stats.errors++;
        console.error('Cache delete pattern error:', error);
    }
}
/**
 * Check if key exists in cache
 */
export async function exists(namespace, key) {
    try {
        const fullKey = generateKey(namespace, key);
        const result = await redis.exists(fullKey);
        return result === 1;
    }
    catch (error) {
        stats.errors++;
        console.error('Cache exists error:', error);
        return false;
    }
}
/**
 * Get or set value (cache-aside pattern)
 */
export async function getOrSet(namespace, key, factory, ttl = DEFAULT_TTL) {
    // Try to get from cache
    const cached = await get(namespace, key);
    if (cached !== null) {
        return cached;
    }
    // Execute factory function
    const value = await factory();
    // Store in cache
    await set(namespace, key, value, ttl);
    return value;
}
/**
 * Get multiple values from cache
 */
export async function mget(namespace, keys) {
    try {
        const fullKeys = keys.map(key => generateKey(namespace, key));
        const values = await redis.mget(...fullKeys);
        return values.map((value) => {
            if (value) {
                stats.hits++;
                return JSON.parse(value);
            }
            stats.misses++;
            return null;
        });
    }
    catch (error) {
        stats.errors++;
        console.error('Cache mget error:', error);
        return keys.map(() => null);
    }
}
/**
 * Set multiple values in cache
 */
export async function mset(namespace, entries) {
    try {
        const pipeline = redis.pipeline();
        for (const entry of entries) {
            const fullKey = generateKey(namespace, entry.key);
            const serialized = JSON.stringify(entry.value);
            const ttl = entry.ttl ?? DEFAULT_TTL;
            pipeline.setex(fullKey, ttl, serialized);
        }
        await pipeline.exec();
        stats.sets += entries.length;
    }
    catch (error) {
        stats.errors++;
        console.error('Cache mset error:', error);
    }
}
/**
 * Increment value in cache
 */
export async function incr(namespace, key, amount = 1) {
    try {
        const fullKey = generateKey(namespace, key);
        const result = await redis.incrby(fullKey, amount);
        return result;
    }
    catch (error) {
        stats.errors++;
        console.error('Cache incr error:', error);
        return 0;
    }
}
/**
 * Decrement value in cache
 */
export async function decr(namespace, key, amount = 1) {
    try {
        const fullKey = generateKey(namespace, key);
        const result = await redis.decrby(fullKey, amount);
        return result;
    }
    catch (error) {
        stats.errors++;
        console.error('Cache decr error:', error);
        return 0;
    }
}
/**
 * Set expiration on key
 */
export async function expire(namespace, key, ttl) {
    try {
        const fullKey = generateKey(namespace, key);
        await redis.expire(fullKey, ttl);
    }
    catch (error) {
        stats.errors++;
        console.error('Cache expire error:', error);
    }
}
/**
 * Get TTL of key
 */
export async function ttl(namespace, key) {
    try {
        const fullKey = generateKey(namespace, key);
        return await redis.ttl(fullKey);
    }
    catch (error) {
        stats.errors++;
        console.error('Cache ttl error:', error);
        return -1;
    }
}
/**
 * Clear all cache entries
 */
export async function clear() {
    try {
        const pattern = `${CACHE_KEY_PREFIX}*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`Cleared ${keys.length} cache entries`);
        }
    }
    catch (error) {
        stats.errors++;
        console.error('Cache clear error:', error);
    }
}
/**
 * Get cache statistics
 */
export function getStats() {
    const totalRequests = stats.hits + stats.misses;
    const hitRate = totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;
    return {
        ...stats,
        hitRate: Math.round(hitRate * 100) / 100,
        totalRequests,
    };
}
/**
 * Reset cache statistics
 */
export function resetStats() {
    stats.hits = 0;
    stats.misses = 0;
    stats.sets = 0;
    stats.deletes = 0;
    stats.errors = 0;
}
/**
 * Cache decorator for functions
 * Automatically caches function results
 *
 * Usage:
 *   class UserService {
 *     @cached('user', (id) => id, 300)
 *     async getUser(id: string): Promise<User> { ... }
 *   }
 */
export function cached(namespace, keyGenerator, ttl = DEFAULT_TTL) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const fullKey = generateKey(namespace, keyGenerator(...args));
            return getOrSet(namespace, fullKey, () => originalMethod.apply(this, args), ttl);
        };
        return descriptor;
    };
}
/**
 * Invalidate cache by namespace
 */
export async function invalidateNamespace(namespace) {
    await delPattern(namespace);
}
/**
 * Cache warming - preload frequently accessed data
 */
export async function warmCache(namespace, keys, fetcher, ttl = DEFAULT_TTL) {
    console.log(`Warming cache for namespace: ${namespace}`);
    const promises = keys.map(async (key) => {
        const value = await fetcher(key);
        await set(namespace, key, value, ttl);
    });
    await Promise.all(promises);
    console.log(`Cache warming completed for ${keys.length} keys`);
}
/**
 * Distributed lock using Redis
 * Useful for preventing cache stampede
 */
export async function acquireLock(lockKey, ttl = 10) {
    const fullKey = `${CACHE_KEY_PREFIX}lock:${lockKey}`;
    const token = `${Date.now()}-${Math.random()}`;
    try {
        const acquired = await redis.set(fullKey, token, 'EX', ttl, 'NX');
        if (acquired === 'OK') {
            return {
                release: async () => {
                    // Only release if we still own the lock
                    const current = await redis.get(fullKey);
                    if (current === token) {
                        await redis.del(fullKey);
                    }
                },
            };
        }
        return null;
    }
    catch (error) {
        console.error('Lock acquisition error:', error);
        return null;
    }
}
export default {
    get,
    set,
    del,
    delPattern,
    exists,
    getOrSet,
    mget,
    mset,
    incr,
    decr,
    expire,
    ttl,
    clear,
    getStats,
    resetStats,
    invalidateNamespace,
    warmCache,
    acquireLock,
    CacheNamespaces,
};
//# sourceMappingURL=redis.js.map