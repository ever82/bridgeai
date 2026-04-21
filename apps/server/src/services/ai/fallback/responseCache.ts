/**
 * Response Cache
 * LLM 响应缓存，支持 TTL 和 LRU 淘汰
 */

import { ChatCompletionRequest, ChatCompletionResponse } from '../types';

import { ResponseCache } from './strategies';

interface CacheEntry {
  response: ChatCompletionResponse;
  expiresAt: number;
  hitCount: number;
  createdAt: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

export class LRAResponseCache implements ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTtlMs: number;
  private maxSize: number;
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(options: { defaultTtlMs?: number; maxSize?: number } = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 5 * 60 * 1000; // 5 minutes
    this.maxSize = options.maxSize ?? 1000;
  }

  async get(key: string): Promise<ChatCompletionResponse | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hitCount++;
    this.stats.hits++;
    return entry.response;
  }

  async set(key: string, value: ChatCompletionResponse, ttlMs?: number): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      response: value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      hitCount: 0,
      createdAt: Date.now(),
    });
  }

  generateKey(request: ChatCompletionRequest): string {
    const messagesHash = request.messages
      .map(m => `${m.role}:${m.content}`)
      .join('|');
    const params = [
      request.model,
      String(request.temperature ?? ''),
      String(request.maxTokens ?? ''),
      String(request.topP ?? ''),
    ].join(',');
    return `${params}:${messagesHash}`;
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }
}
