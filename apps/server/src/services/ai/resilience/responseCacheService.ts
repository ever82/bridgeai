/**
 * AI Response Cache Service
 * 响应缓存服务 - 相似请求缓存、TTL过期、降级时优先使用
 */

import { EventEmitter } from 'events';

import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  LLMProvider,
} from '../types';

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

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTtlMs: 5 * 60 * 1000,       // 5 minutes
  maxEntries: 1000,
  staleWhileRevalidateMs: 60 * 1000,  // 1 minute stale window
  similarityThreshold: 0.85,
};

/**
 * Simple hash function for generating cache keys
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Normalize text for similarity comparison (lowercase, trim, collapse whitespace)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Compute a similarity hash from a request for fuzzy matching
 */
function computeSimilarityHash(request: ChatCompletionRequest): string {
  const normalized = request.messages
    .map(m => `${m.role}:${normalizeText(m.content)}`)
    .join('|');
  return hashString(normalized);
}

/**
 * Compute Jaccard similarity between two strings at word level
 */
function computeSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeText(a).split(' '));
  const wordsB = new Set(normalizeText(b).split(' '));
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  if (union.size === 0) return 1;
  return intersection.size / union.size;
}

export class AIResponseCacheService extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    evictions: 0,
    similarityHits: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * Generate a cache key from a request
   */
  generateKey(request: ChatCompletionRequest): string {
    const parts = [
      request.model,
      `temp:${request.temperature ?? 0.7}`,
      `max:${request.maxTokens ?? 'default'}`,
      ...request.messages.map(m => `${m.role}:${normalizeText(m.content)}`),
    ];
    return hashString(parts.join('|'));
  }

  /**
   * Get a cached response by exact key
   */
  async get(key: string): Promise<ChatCompletionResponse | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      // Try similarity match before declaring miss
      const similarEntry = this.findSimilarEntry(key);
      if (similarEntry) {
        this.stats.similarityHits++;
        similarEntry.hitCount++;
        this.stats.hits++;
        this.emit('hit', { key, type: 'similarity' });
        return similarEntry.response;
      }
      this.stats.misses++;
      this.emit('miss', { key });
      return null;
    }

    const now = Date.now();

    if (now > entry.expiresAt + this.config.staleWhileRevalidateMs) {
      // Entry is too stale even for stale-while-revalidate
      this.cache.delete(key);
      this.stats.misses++;
      this.emit('miss', { key, reason: 'expired' });
      return null;
    }

    if (now > entry.expiresAt) {
      // Stale but within revalidation window - return but mark as stale
      this.stats.staleHits++;
      entry.hitCount++;
      this.stats.hits++;
      this.emit('hit', { key, type: 'stale' });
      return entry.response;
    }

    // Fresh hit
    entry.hitCount++;
    this.stats.hits++;
    this.emit('hit', { key, type: 'exact' });
    return entry.response;
  }

  /**
   * Get a cached response using a request object
   */
  async getByRequest(request: ChatCompletionRequest): Promise<ChatCompletionResponse | null> {
    const key = this.generateKey(request);
    return this.get(key);
  }

  /**
   * Store a response in the cache
   */
  async set(
    key: string,
    value: ChatCompletionResponse,
    ttlMs?: number
  ): Promise<void> {
    this.evictIfNeeded();

    const now = Date.now();
    const entry: CacheEntry = {
      response: value,
      createdAt: now,
      expiresAt: now + (ttlMs ?? this.config.defaultTtlMs),
      hitCount: 0,
      similarityHash: computeSimilarityHash({
        model: value.model,
        messages: [],
      } as ChatCompletionRequest),
      provider: value.model.includes('claude') ? 'claude' :
                value.model.includes('ernie') ? 'wenxin' : 'openai',
      model: value.model,
    };

    this.cache.set(key, entry);
    this.emit('set', { key, ttlMs: ttlMs ?? this.config.defaultTtlMs });
  }

  /**
   * Store a response using a request as key
   */
  async setByRequest(
    request: ChatCompletionRequest,
    response: ChatCompletionResponse,
    ttlMs?: number
  ): Promise<void> {
    const key = this.generateKey(request);
    await this.set(key, response, ttlMs);
  }

  /**
   * Get a stale response for degradation (ignores TTL completely)
   */
  getStaleResponse(request: ChatCompletionRequest): ChatCompletionResponse | null {
    // Try exact match first
    const key = this.generateKey(request);
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.staleHits++;
      this.emit('hit', { key, type: 'stale-degradation' });
      return entry.response;
    }

    // Try similarity match
    const similarEntry = this.findSimilarEntry(key);
    if (similarEntry) {
      this.stats.similarityHits++;
      this.emit('hit', { key, type: 'similarity-degradation' });
      return similarEntry.response;
    }

    return null;
  }

  /**
   * Warm the cache with pre-computed responses
   */
  async warmCache(
    entries: Array<{
      request: ChatCompletionRequest;
      response: ChatCompletionResponse;
      ttlMs?: number;
    }>
  ): Promise<void> {
    for (const entry of entries) {
      await this.setByRequest(entry.request, entry.response, entry.ttlMs);
    }
    this.emit('warmed', { count: entries.length });
  }

  /**
   * Invalidate entries by model
   */
  invalidateByModel(model: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.model === model) {
        this.cache.delete(key);
        count++;
      }
    }
    this.emit('invalidated', { reason: 'model', model, count });
    return count;
  }

  /**
   * Invalidate expired entries
   */
  purgeExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt + this.config.staleWhileRevalidateMs) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0,
    };
  }

  /**
   * Get all cache entries (for debugging)
   */
  getEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, staleHits: 0, evictions: 0, similarityHits: 0 };
    this.emit('cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private findSimilarEntry(key: string): CacheEntry | null {
    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = this.config.similarityThreshold;

    for (const [, entry] of this.cache) {
      const entryKey = this.generateKey({
        model: entry.model,
        messages: entry.response.choices.map(c => c.message),
      } as ChatCompletionRequest);

      const similarity = computeSimilarity(key, entryKey);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    return bestMatch;
  }

  private evictIfNeeded(): void {
    if (this.cache.size < this.config.maxEntries) return;

    // LRU eviction: remove entry with lowest hitCount and oldest createdAt
    let worstKey: string | null = null;
    let worstScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const score = entry.hitCount / Math.max(1, Date.now() - entry.createdAt);
      if (score < worstScore) {
        worstScore = score;
        worstKey = key;
      }
    }

    if (worstKey) {
      this.cache.delete(worstKey);
      this.stats.evictions++;
      this.emit('evicted', { key: worstKey });
    }
  }
}

export const responseCacheService = new AIResponseCacheService();
