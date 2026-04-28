/**
 * AI Response Cache Service
 * 响应缓存服务 - 相似请求缓存、TTL过期、降级时优先使用
 */
import { EventEmitter } from 'events';
import { ChatCompletionRequest, ChatCompletionResponse, LLMProvider } from '../types';
export interface CacheEntry {
    response: ChatCompletionResponse;
    createdAt: number;
    expiresAt: number;
    hitCount: number;
    similarityHash: string;
    provider: LLMProvider;
    model: string;
}
export interface CacheConfig {
    defaultTtlMs: number;
    maxEntries: number;
    staleWhileRevalidateMs: number;
    similarityThreshold: number;
}
export declare class AIResponseCacheService extends EventEmitter {
    private cache;
    private config;
    private stats;
    constructor(config?: Partial<CacheConfig>);
    /**
     * Generate a cache key from a request
     */
    generateKey(request: ChatCompletionRequest): string;
    /**
     * Get a cached response by exact key
     */
    get(key: string): Promise<ChatCompletionResponse | null>;
    /**
     * Get a cached response using a request object
     */
    getByRequest(request: ChatCompletionRequest): Promise<ChatCompletionResponse | null>;
    /**
     * Store a response in the cache
     */
    set(key: string, value: ChatCompletionResponse, ttlMs?: number): Promise<void>;
    /**
     * Store a response using a request as key
     */
    setByRequest(request: ChatCompletionRequest, response: ChatCompletionResponse, ttlMs?: number): Promise<void>;
    /**
     * Get a stale response for degradation (ignores TTL completely)
     */
    getStaleResponse(request: ChatCompletionRequest): ChatCompletionResponse | null;
    /**
     * Warm the cache with pre-computed responses
     */
    warmCache(entries: Array<{
        request: ChatCompletionRequest;
        response: ChatCompletionResponse;
        ttlMs?: number;
    }>): Promise<void>;
    /**
     * Invalidate entries by model
     */
    invalidateByModel(model: string): number;
    /**
     * Invalidate expired entries
     */
    purgeExpired(): number;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        hitRate: number;
        hits: number;
        misses: number;
        staleHits: number;
        evictions: number;
        similarityHits: number;
    };
    /**
     * Get all cache entries (for debugging)
     */
    getEntries(): CacheEntry[];
    /**
     * Clear the cache
     */
    clear(): void;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<CacheConfig>): void;
    private findSimilarEntry;
    private evictIfNeeded;
}
export declare const responseCacheService: AIResponseCacheService;
//# sourceMappingURL=responseCacheService.d.ts.map