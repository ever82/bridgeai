/**
 * Performance Metrics Service
 *
 * In-process metrics collection for API response time tracking,
 * request counting, and percentile calculations.
 * Complements Sentry by providing real-time in-app metrics.
 */

interface TimingBucket {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
}

interface ApiMetrics {
  requests: {
    total: number;
    success: number;
    errors: number;
  };
  responseTimes: {
    byEndpoint: Map<string, TimingBucket>;
    global: TimingBucket;
  };
  activeConnections: number;
  dbQueries: {
    total: number;
    slow: number;
    byOperation: Map<string, TimingBucket>;
  };
  cache: {
    hits: number;
    misses: number;
  };
}

const globalTiming = (): TimingBucket => ({
  count: 0,
  totalMs: 0,
  minMs: Infinity,
  maxMs: 0,
});

let metrics: ApiMetrics = resetMetrics();

function resetMetrics(): ApiMetrics {
  return {
    requests: { total: 0, success: 0, errors: 0 },
    responseTimes: {
      byEndpoint: new Map(),
      global: globalTiming(),
    },
    activeConnections: 0,
    dbQueries: {
      total: 0,
      slow: 0,
      byOperation: new Map(),
    },
    cache: { hits: 0, misses: 0 },
  };
}

function updateBucket(bucket: TimingBucket, durationMs: number): void {
  bucket.count++;
  bucket.totalMs += durationMs;
  if (durationMs < bucket.minMs) bucket.minMs = durationMs;
  if (durationMs > bucket.maxMs) bucket.maxMs = durationMs;
}

/**
 * Record an API request response time
 */
export function recordRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
): void {
  metrics.requests.total++;
  if (statusCode >= 400) {
    metrics.requests.errors++;
  } else {
    metrics.requests.success++;
  }

  const endpoint = `${method} ${path}`;
  let bucket = metrics.responseTimes.byEndpoint.get(endpoint);
  if (!bucket) {
    bucket = globalTiming();
    metrics.responseTimes.byEndpoint.set(endpoint, bucket);
  }
  updateBucket(bucket, durationMs);
  updateBucket(metrics.responseTimes.global, durationMs);
}

/**
 * Record a database query
 */
export function recordDbQuery(operation: string, durationMs: number, slow = false): void {
  metrics.dbQueries.total++;
  if (slow) metrics.dbQueries.slow++;

  let bucket = metrics.dbQueries.byOperation.get(operation);
  if (!bucket) {
    bucket = globalTiming();
    metrics.dbQueries.byOperation.set(operation, bucket);
  }
  updateBucket(bucket, durationMs);
}

/**
 * Record a cache hit or miss
 */
export function recordCacheHit(): void {
  metrics.cache.hits++;
}

export function recordCacheMiss(): void {
  metrics.cache.misses++;
}

/**
 * Track active connections (increment/decrement)
 */
export function connectionOpened(): void {
  metrics.activeConnections++;
}

export function connectionClosed(): void {
  metrics.activeConnections--;
}

/**
 * Calculate percentile from a sorted array of values
 */
function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, idx)];
}

// Keep recent response times for percentile calculation (last 10k samples)
const recentResponseTimes: number[] = [];
const MAX_RECENT_SAMPLES = 10000;

/**
 * Record response time for percentile tracking
 */
export function recordResponseTimeForPercentile(durationMs: number): void {
  recentResponseTimes.push(durationMs);
  if (recentResponseTimes.length > MAX_RECENT_SAMPLES) {
    recentResponseTimes.shift();
  }
}

/**
 * Get percentile response times
 */
export function getResponseTimePercentiles(): {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
} {
  const sorted = [...recentResponseTimes].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

/**
 * Get a snapshot of all metrics
 */
export function getMetricsSnapshot(): {
  requests: ApiMetrics['requests'] & { successRate: number };
  responseTimes: {
    global: TimingBucket & { avgMs: number };
    byEndpoint: Array<{
      endpoint: string;
      count: number;
      avgMs: number;
      minMs: number;
      maxMs: number;
    }>;
    percentiles: ReturnType<typeof getResponseTimePercentiles>;
  };
  activeConnections: number;
  dbQueries: ApiMetrics['dbQueries'] & { slowRate: number };
  cache: ApiMetrics['cache'] & { hitRate: number };
  uptime: number;
} {
  const global = metrics.responseTimes.global;
  const requests = metrics.requests;
  const totalCacheOps = metrics.cache.hits + metrics.cache.misses;

  return {
    requests: {
      ...requests,
      successRate:
        requests.total > 0 ? Math.round((requests.success / requests.total) * 10000) / 100 : 0,
    },
    responseTimes: {
      global: {
        ...global,
        avgMs: global.count > 0 ? Math.round((global.totalMs / global.count) * 100) / 100 : 0,
      },
      byEndpoint: Array.from(metrics.responseTimes.byEndpoint.entries())
        .map(([endpoint, bucket]) => ({
          endpoint,
          count: bucket.count,
          avgMs: bucket.count > 0 ? Math.round((bucket.totalMs / bucket.count) * 100) / 100 : 0,
          minMs: Math.round(bucket.minMs * 100) / 100,
          maxMs: Math.round(bucket.maxMs * 100) / 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      percentiles: getResponseTimePercentiles(),
    },
    activeConnections: metrics.activeConnections,
    dbQueries: {
      ...metrics.dbQueries,
      slowRate:
        metrics.dbQueries.total > 0
          ? Math.round((metrics.dbQueries.slow / metrics.dbQueries.total) * 10000) / 100
          : 0,
    },
    cache: {
      ...metrics.cache,
      hitRate:
        totalCacheOps > 0 ? Math.round((metrics.cache.hits / totalCacheOps) * 10000) / 100 : 0,
    },
    uptime: process.uptime(),
  };
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetAllMetrics(): void {
  metrics = resetMetrics();
  recentResponseTimes.length = 0;
}
