/**
 * State Aggregation Service
 *
 * Optimizes state updates through batching, compression,
 * caching, and heartbeat optimization.
 */
import { EventEmitter } from 'eventemitter3';
/**
 * State update
 */
interface StateUpdate {
    type: string;
    targetId: string;
    data: any;
    priority: 'high' | 'normal' | 'low';
    timestamp: Date;
}
/**
 * Heartbeat config
 */
interface HeartbeatConfig {
    intervalMs: number;
    timeoutMs: number;
    adaptive: boolean;
}
/**
 * State Aggregation Service
 *
 * Manages state updates with:
 * - Batching: Accumulates updates and flushes periodically
 * - Compression: Compresses large update batches
 * - Caching: Caches frequently accessed states
 * - Heartbeat optimization: Adaptive heartbeat intervals
 */
export declare class StateAggregationService extends EventEmitter {
    private updateQueue;
    private batchTimer;
    private stateCache;
    private cacheTimer;
    private batchSize;
    private batchIntervalMs;
    private maxCacheSize;
    private cacheTtlMs;
    private heartbeatConfig;
    private heartbeatTimers;
    private stats;
    constructor(options?: {
        batchSize?: number;
        batchIntervalMs?: number;
        maxCacheSize?: number;
        cacheTtlMs?: number;
        heartbeatConfig?: Partial<HeartbeatConfig>;
    });
    /**
     * Add a state update to the batch queue
     */
    queueUpdate(update: Omit<StateUpdate, 'timestamp'>): void;
    /**
     * Flush the current batch of updates
     */
    flushBatch(): void;
    /**
     * Group updates by type and target for deduplication
     */
    private groupUpdatesByType;
    /**
     * Calculate approximate compression savings
     */
    private calculateCompressionSavings;
    /**
     * Cache state data
     */
    setCache(key: string, data: any, ttl?: number): void;
    /**
     * Get cached state data
     */
    getCache(key: string): any | undefined;
    /**
     * Invalidate cached state
     */
    invalidateCache(key: string): void;
    /**
     * Invalidate cache by pattern
     */
    invalidateCachePattern(pattern: string): void;
    /**
     * Start cache cleanup timer
     */
    private startCacheCleanup;
    /**
     * Get optimized heartbeat interval for a connection
     */
    getHeartbeatInterval(connectionId: string, activityLevel: 'high' | 'medium' | 'low'): number;
    /**
     * Start heartbeat for a connection
     */
    startHeartbeat(connectionId: string, onHeartbeat: () => void, activityLevel?: 'high' | 'medium' | 'low'): void;
    /**
     * Stop heartbeat for a connection
     */
    stopHeartbeat(connectionId: string): void;
    /**
     * Update heartbeat interval based on activity
     */
    updateHeartbeatActivity(connectionId: string, activityLevel: 'high' | 'medium' | 'low', onHeartbeat: () => void): void;
    /**
     * Get service statistics
     */
    getStats(): {
        updatesBatched: number;
        updatesSent: number;
        cacheHits: number;
        cacheMisses: number;
        bytesSaved: number;
        cacheSize: number;
        pendingUpdates: number;
        activeHeartbeats: number;
    };
    /**
     * Compress data for transmission
     */
    compress(data: any): {
        data: any;
        compressed: boolean;
    };
    /**
     * Decompress received data
     */
    decompress(data: any): any;
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Destroy the service
     */
    destroy(): void;
}
export declare const stateAggregation: StateAggregationService;
export default stateAggregation;
//# sourceMappingURL=stateAggregation.d.ts.map