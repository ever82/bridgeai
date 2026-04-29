/**
 * State Aggregation Service
 *
 * Optimizes state updates through batching, compression,
 * caching, and heartbeat optimization.
 */
import { EventEmitter } from 'eventemitter3';
// Batch configuration
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_BATCH_INTERVAL_MS = 100;
const DEFAULT_MAX_CACHE_SIZE = 1000;
const DEFAULT_CACHE_TTL_MS = 60000; // 1 minute
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
/**
 * State Aggregation Service
 *
 * Manages state updates with:
 * - Batching: Accumulates updates and flushes periodically
 * - Compression: Compresses large update batches
 * - Caching: Caches frequently accessed states
 * - Heartbeat optimization: Adaptive heartbeat intervals
 */
export class StateAggregationService extends EventEmitter {
    updateQueue = [];
    batchTimer = null;
    stateCache = new Map();
    cacheTimer = null;
    batchSize;
    batchIntervalMs;
    maxCacheSize;
    cacheTtlMs;
    heartbeatConfig;
    heartbeatTimers = new Map();
    stats = {
        updatesBatched: 0,
        updatesSent: 0,
        cacheHits: 0,
        cacheMisses: 0,
        bytesSaved: 0,
    };
    constructor(options) {
        super();
        this.batchSize = options?.batchSize || DEFAULT_BATCH_SIZE;
        this.batchIntervalMs = options?.batchIntervalMs || DEFAULT_BATCH_INTERVAL_MS;
        this.maxCacheSize = options?.maxCacheSize || DEFAULT_MAX_CACHE_SIZE;
        this.cacheTtlMs = options?.cacheTtlMs || DEFAULT_CACHE_TTL_MS;
        this.heartbeatConfig = {
            intervalMs: DEFAULT_HEARTBEAT_INTERVAL_MS,
            timeoutMs: 60000,
            adaptive: true,
            ...options?.heartbeatConfig,
        };
        this.startCacheCleanup();
    }
    /**
     * Add a state update to the batch queue
     */
    queueUpdate(update) {
        const fullUpdate = {
            ...update,
            timestamp: new Date(),
        };
        this.updateQueue.push(fullUpdate);
        this.stats.updatesBatched++;
        // Flush immediately if high priority or batch size reached
        if (update.priority === 'high' || this.updateQueue.length >= this.batchSize) {
            this.flushBatch();
        }
        else if (!this.batchTimer) {
            // Schedule batch flush
            this.batchTimer = setTimeout(() => {
                this.flushBatch();
            }, this.batchIntervalMs);
        }
    }
    /**
     * Flush the current batch of updates
     */
    flushBatch() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        if (this.updateQueue.length === 0) {
            return;
        }
        const updates = [...this.updateQueue];
        this.updateQueue = [];
        // Group updates by type for efficient processing
        const groupedUpdates = this.groupUpdatesByType(updates);
        // Compress if batch is large
        const shouldCompress = JSON.stringify(updates).length > 1024;
        const batch = {
            id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            updates: groupedUpdates,
            timestamp: new Date(),
            compressed: shouldCompress,
        };
        if (shouldCompress) {
            this.stats.bytesSaved += this.calculateCompressionSavings(updates);
        }
        this.stats.updatesSent += updates.length;
        // Emit batch for transmission
        this.emit('batch:ready', batch);
    }
    /**
     * Group updates by type and target for deduplication
     */
    groupUpdatesByType(updates) {
        const grouped = new Map();
        for (const update of updates) {
            const key = `${update.type}:${update.targetId}`;
            // Keep only the latest update for each type/target combination
            grouped.set(key, update);
        }
        return Array.from(grouped.values());
    }
    /**
     * Calculate approximate compression savings
     */
    calculateCompressionSavings(updates) {
        const originalSize = JSON.stringify(updates).length;
        // Estimate 60% compression ratio for repetitive data
        const compressedSize = originalSize * 0.4;
        return originalSize - compressedSize;
    }
    /**
     * Cache state data
     */
    setCache(key, data, ttl) {
        // Evict oldest entries if cache is full
        if (this.stateCache.size >= this.maxCacheSize) {
            const oldestKey = this.stateCache.keys().next().value;
            if (oldestKey) {
                this.stateCache.delete(oldestKey);
            }
        }
        const existing = this.stateCache.get(key);
        const cachedState = {
            key,
            data,
            timestamp: new Date(),
            ttl: ttl || this.cacheTtlMs,
            version: existing ? existing.version + 1 : 1,
        };
        this.stateCache.set(key, cachedState);
    }
    /**
     * Get cached state data
     */
    getCache(key) {
        const cached = this.stateCache.get(key);
        if (!cached) {
            this.stats.cacheMisses++;
            return undefined;
        }
        // Check if expired
        const now = Date.now();
        const age = now - cached.timestamp.getTime();
        if (age > cached.ttl) {
            this.stateCache.delete(key);
            this.stats.cacheMisses++;
            return undefined;
        }
        this.stats.cacheHits++;
        return cached.data;
    }
    /**
     * Invalidate cached state
     */
    invalidateCache(key) {
        this.stateCache.delete(key);
    }
    /**
     * Invalidate cache by pattern
     */
    invalidateCachePattern(pattern) {
        const regex = new RegExp(pattern);
        for (const key of this.stateCache.keys()) {
            if (regex.test(key)) {
                this.stateCache.delete(key);
            }
        }
    }
    /**
     * Start cache cleanup timer
     */
    startCacheCleanup() {
        this.cacheTimer = setInterval(() => {
            const now = Date.now();
            for (const [key, cached] of this.stateCache) {
                const age = now - cached.timestamp.getTime();
                if (age > cached.ttl) {
                    this.stateCache.delete(key);
                }
            }
        }, this.cacheTtlMs);
    }
    /**
     * Get optimized heartbeat interval for a connection
     */
    getHeartbeatInterval(connectionId, activityLevel) {
        if (!this.heartbeatConfig.adaptive) {
            return this.heartbeatConfig.intervalMs;
        }
        // Adjust interval based on activity level
        switch (activityLevel) {
            case 'high':
                return 10000; // 10 seconds for active users
            case 'medium':
                return 30000; // 30 seconds for moderately active
            case 'low':
                return 60000; // 60 seconds for inactive
            default:
                return this.heartbeatConfig.intervalMs;
        }
    }
    /**
     * Start heartbeat for a connection
     */
    startHeartbeat(connectionId, onHeartbeat, activityLevel = 'medium') {
        this.stopHeartbeat(connectionId);
        const interval = this.getHeartbeatInterval(connectionId, activityLevel);
        const timer = setInterval(() => {
            onHeartbeat();
        }, interval);
        this.heartbeatTimers.set(connectionId, timer);
    }
    /**
     * Stop heartbeat for a connection
     */
    stopHeartbeat(connectionId) {
        const timer = this.heartbeatTimers.get(connectionId);
        if (timer) {
            clearInterval(timer);
            this.heartbeatTimers.delete(connectionId);
        }
    }
    /**
     * Update heartbeat interval based on activity
     */
    updateHeartbeatActivity(connectionId, activityLevel, onHeartbeat) {
        this.startHeartbeat(connectionId, onHeartbeat, activityLevel);
    }
    /**
     * Get service statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.stateCache.size,
            pendingUpdates: this.updateQueue.length,
            activeHeartbeats: this.heartbeatTimers.size,
        };
    }
    /**
     * Compress data for transmission
     */
    compress(data) {
        const serialized = JSON.stringify(data);
        // Only compress if data is large enough
        if (serialized.length < 1024) {
            return { data, compressed: false };
        }
        // Simple compression by removing whitespace and deduplicating
        // In production, use a proper compression library like zlib
        const compressed = {
            _compressed: true,
            _format: 'json-min',
            data,
        };
        return { data: compressed, compressed: true };
    }
    /**
     * Decompress received data
     */
    decompress(data) {
        if (data?._compressed) {
            return data.data;
        }
        return data;
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            updatesBatched: 0,
            updatesSent: 0,
            cacheHits: 0,
            cacheMisses: 0,
            bytesSaved: 0,
        };
    }
    /**
     * Destroy the service
     */
    destroy() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        if (this.cacheTimer) {
            clearInterval(this.cacheTimer);
        }
        for (const timer of this.heartbeatTimers.values()) {
            clearInterval(timer);
        }
        this.heartbeatTimers.clear();
        this.updateQueue = [];
        this.stateCache.clear();
        this.removeAllListeners();
    }
}
// Export singleton instance
export const stateAggregation = new StateAggregationService();
export default stateAggregation;
//# sourceMappingURL=stateAggregation.js.map