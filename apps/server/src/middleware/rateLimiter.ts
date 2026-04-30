/**
 * Enhanced Rate Limiter Middleware
 *
 * Provides IP-based, user-based, and endpoint-differentiated rate limiting
 * with X-RateLimit-* response headers.
 */
import { Request, Response, NextFunction } from 'express';
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';

import { ApiResponse } from '../utils/response';
import {
  rateLimitConfigs,
  userTierLimits,
  getRateLimitConfig,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  rateLimitEnv,
} from '../config/rateLimit';

// Re-export for external use
export { rateLimitConfigs, getRateLimitConfig };

// Use any-typed request for rate limiting
type RateLimitRequest = Request & { user?: any; token?: string };

// In-memory store for user-based rate limiting using token bucket algorithm.
// For distributed deployments (multi-node), set RATE_LIMIT_USE_REDIS=true
// and configure RATE_LIMIT_REDIS_URL. The Redis-based implementation
// will use a Redis-based token bucket.
interface UserRequestRecord {
  tokens: number;
  maxTokens: number;
  refillRate: number; // tokens added per second
  lastRefill: number; // timestamp (ms) of last refill
}

const userRequestStore = new Map<string, UserRequestRecord>();

// Get client identifier (user ID if authenticated, IP otherwise)
function getClientIdentifier(req: RateLimitRequest): string {
  // If user is authenticated, use user ID
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  // Otherwise use IP address
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

// Get user tier for rate limiting
function getUserTier(req: RateLimitRequest): keyof typeof userTierLimits {
  if (req.user?.role === 'admin') return 'admin';
  if (req.user?.isPremium) return 'premium';
  if (req.user?.id) return 'authenticated';
  return 'anonymous';
}

// Clean up stale entries from the store (called periodically).
// Remove buckets that have been idle long enough to have fully refilled
// (i.e. no activity for at least maxTokens / refillRate seconds).
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, record] of userRequestStore.entries()) {
    const secondsToFull = record.maxTokens / record.refillRate;
    const staleMs = secondsToFull * 1000;
    if (record.lastRefill + staleMs <= now) {
      userRequestStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes (lazy start)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanupInterval(): void {
  if (process.env.NODE_ENV === 'test') return;
  if (cleanupInterval === null) {
    cleanupInterval = setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
  }
}

/**
 * Get rate limit headers for response based on token bucket state.
 */
export function getRateLimitHeaders(
  identifier: string,
  config: { maxTokens: number; refillRate: number }
): Record<string, string> {
  const record = userRequestStore.get(identifier);
  const now = Date.now();

  if (!record) {
    // No bucket yet — treat as full
    return {
      'X-RateLimit-Limit': config.maxTokens.toString(),
      'X-RateLimit-Remaining': (config.maxTokens - 1).toString(),
      'X-RateLimit-Reset': Math.ceil(now / 1000).toString(),
    };
  }

  // Compute current token count (without consuming)
  const elapsed = (now - record.lastRefill) / 1000;
  const currentTokens = Math.min(record.maxTokens, record.tokens + record.refillRate * elapsed);

  // Estimate when the next token will be available (if currently empty)
  let resetSeconds: number;
  if (currentTokens >= 1) {
    resetSeconds = Math.ceil(now / 1000);
  } else {
    const secondsToNextToken = (1 - currentTokens) / record.refillRate;
    resetSeconds = Math.ceil((now + secondsToNextToken * 1000) / 1000);
  }

  return {
    'X-RateLimit-Limit': config.maxTokens.toString(),
    'X-RateLimit-Remaining': Math.floor(currentTokens).toString(),
    'X-RateLimit-Reset': resetSeconds.toString(),
  };
}

/**
 * User-based rate limiter middleware using token bucket algorithm.
 * Each user/IP gets a bucket that refills tokens over time.
 * burstLimit is the bucket capacity; requestsPerMinute / 60 is the refill rate.
 */
export function userRateLimiter(req: RateLimitRequest, res: Response, next: NextFunction): void {
  // Lazy-start cleanup interval on first request
  startCleanupInterval();

  const identifier = getClientIdentifier(req);
  const tier = getUserTier(req);
  const tierConfig = userTierLimits[tier];

  const maxTokens = tierConfig.burstLimit;
  const refillRate = tierConfig.requestsPerMinute / 60; // tokens per second

  const now = Date.now();
  let record = userRequestStore.get(identifier);

  if (!record) {
    // Create a new bucket, starts full
    record = {
      tokens: maxTokens - 1, // consume 1 token for this request
      maxTokens,
      refillRate,
      lastRefill: now,
    };
    userRequestStore.set(identifier, record);

    // Set rate limit headers
    const headers = getRateLimitHeaders(identifier, { maxTokens, refillRate });
    res.set(headers);
    next();
    return;
  }

  // Refill tokens based on elapsed time
  const elapsedSeconds = (now - record.lastRefill) / 1000;
  record.tokens = Math.min(record.maxTokens, record.tokens + record.refillRate * elapsedSeconds);
  record.lastRefill = now;

  // Set rate limit headers before potentially consuming a token
  const headers = getRateLimitHeaders(identifier, { maxTokens, refillRate });

  if (record.tokens >= 1) {
    // Consume 1 token and allow the request
    record.tokens -= 1;
    res.set(headers);
    next();
  } else {
    // No tokens available — deny
    const retryAfter = Math.ceil((1 - record.tokens) / record.refillRate);
    res.set(headers);
    res
      .status(429)
      .json(
        ApiResponse.error(
          `Rate limit exceeded for ${tier} users. Please try again later.`,
          'USER_RATE_LIMIT_EXCEEDED',
          429,
          { retryAfter }
        )
      );
  }
}

/**
 * Endpoint-differentiated rate limiter
 * Creates a rate limiter based on the endpoint being accessed
 */
export function endpointRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req: RateLimitRequest) => {
      const config = getRateLimitConfig(req.path);
      return config.maxRequests;
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: RateLimitRequest) => {
      // Use user ID if available, otherwise IP
      return req.user?.id?.toString() || req.ip || 'unknown';
    },
    handler: (req: RateLimitRequest, res: Response) => {
      const config = getRateLimitConfig(req.path);
      res
        .status(429)
        .json(
          ApiResponse.error(
            config.message || 'Too many requests, please try again later.',
            'RATE_LIMIT_EXCEEDED',
            429
          )
        );
    },
    skip: (req: RateLimitRequest) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/ready';
    },
  });
}

/**
 * Enhanced IP-based rate limiter with tiered limits
 */
// Whitelist IPs that bypass rate limiting (loopback by default).
// Avoids hangs/blocks when local clients (curl, E2E, dev tools) hit /api/* routes.
const RATE_LIMIT_WHITELIST = (
  process.env.RATE_LIMIT_WHITELIST?.split(',') || ['127.0.0.1', '::1', '::ffff:127.0.0.1']
).map(s => s.trim());

function getRequestIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export const enhancedIpLimiter = rateLimit({
  windowMs: rateLimitConfigs.default.windowMs,
  max: rateLimitConfigs.default.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => getRequestIP(req),
  handler: (req: Request, res: Response) => {
    res
      .status(429)
      .json(
        ApiResponse.error(
          'Too many requests from this IP, please try again later.',
          'IP_RATE_LIMIT_EXCEEDED',
          429
        )
      );
  },
  skip: (req: Request) => {
    // Skip health checks
    if (req.path === '/health' || req.path === '/ready') return true;
    // Bypass entirely in test environment
    if (process.env.NODE_ENV === 'test') return true;
    // Skip whitelisted (loopback) IPs to prevent local clients from being rate limited
    const ip = getRequestIP(req);
    return RATE_LIMIT_WHITELIST.includes(ip);
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const strictAuthLimiter = rateLimit({
  windowMs: rateLimitConfigs.auth.windowMs,
  max: rateLimitConfigs.auth.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: rateLimitConfigs.auth.skipSuccessfulRequests,
  keyGenerator: (req: Request): string => {
    // Use combination of IP and username/email if available
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const username = req.body?.username || req.body?.email || '';
    return username ? `${ip}:${username}` : ip;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json(
      ApiResponse.error(rateLimitConfigs.auth.message!, 'AUTH_RATE_LIMIT_EXCEEDED', 429, {
        retryAfter: Math.ceil(rateLimitConfigs.auth.windowMs / 1000),
      })
    );
  },
  skip: () => {
    // Bypass auth rate limiting entirely in test environment
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * Upload rate limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: rateLimitConfigs.upload.windowMs,
  max: rateLimitConfigs.upload.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res
      .status(429)
      .json(ApiResponse.error(rateLimitConfigs.upload.message!, 'UPLOAD_RATE_LIMIT_EXCEEDED', 429));
  },
});

/**
 * Report creation rate limiter with false-report penalty tracking.
 *
 * Normal users: up to 5 reports per minute (from rateLimitConfigs.reports).
 * Penalty: users with 3+ dismissed reports in the past 30 days are
 * restricted to 1 report per minute.
 */
export const reportLimiter = rateLimit({
  windowMs: rateLimitConfigs.reports.windowMs,
  max: rateLimitConfigs.reports.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: RateLimitRequest): string => {
    const userId = req.user?.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return userId ? `report:user:${userId}` : `report:ip:${ip}`;
  },
  handler: (req: RateLimitRequest, res: Response) => {
    res.status(429).json(
      ApiResponse.error(rateLimitConfigs.reports.message!, 'REPORT_RATE_LIMIT_EXCEEDED', 429, {
        retryAfter: Math.ceil(rateLimitConfigs.reports.windowMs / 1000),
      })
    );
  },
  skip: () => {
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * Check whether a user has accumulated false-report penalties.
 * Must be called AFTER authentication middleware.
 *
 * Returns true (and throws 429) when the user has 3 or more dismissed
 * reports within the last 30 days, effectively reducing their allowance
 * to 1 report per minute.
 */
export function falseReportPenaltyCheck(
  req: RateLimitRequest,
  res: Response,
  next: NextFunction
): void {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    next();
    return;
  }

  // Dynamic import avoided — prisma is already available at module level via
  // lazy evaluation of this middleware (it runs per-request).
  // We import it inline to keep this file decoupled from the DB module at
  // the top level (rateLimiter is a general-purpose middleware).
  import('../db/client')
    .then(({ prisma }) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      // Count dismissed reports across both general reports and review reports
      return Promise.all([
        prisma.report.count({
          where: {
            reporterId: userId,
            status: 'DISMISSED',
            handledAt: { gte: thirtyDaysAgo },
          },
        }),
        prisma.reviewReport.count({
          where: {
            reporterId: userId,
            status: 'DISMISSED',
            handledAt: { gte: thirtyDaysAgo },
          },
        }),
      ]);
    })
    .then(([generalDismissed, reviewDismissed]) => {
      const dismissedCount = generalDismissed + reviewDismissed;
      if (dismissedCount >= 3) {
        res
          .status(429)
          .json(
            ApiResponse.error(
              'Your report privileges are temporarily restricted due to previous false reports.',
              'FALSE_REPORT_PENALTY',
              429,
              { dismissedRecent: dismissedCount }
            )
          );
      } else {
        next();
      }
    })
    .catch(() => {
      // If DB lookup fails, allow the request through rather than blocking
      next();
    });
}

/**
 * Search rate limiter
 */
export const searchLimiter = rateLimit({
  windowMs: rateLimitConfigs.search.windowMs,
  max: rateLimitConfigs.search.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res
      .status(429)
      .json(ApiResponse.error(rateLimitConfigs.search.message!, 'SEARCH_RATE_LIMIT_EXCEEDED', 429));
  },
});

/**
 * Combined rate limiter that applies multiple strategies
 * Use this as the main rate limiting middleware
 */
export function combinedRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Default max
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: RateLimitRequest): string => {
      const userId = req.user?.id;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      return userId ? `user:${userId}` : `ip:${ip}`;
    },
    handler: (req: RateLimitRequest, res: Response) => {
      res
        .status(429)
        .json(
          ApiResponse.error(
            'Too many requests, please try again later.',
            'RATE_LIMIT_EXCEEDED',
            429,
            { retryAfter: 900 }
          )
        );
    },
    skip: (req: RateLimitRequest) => {
      // Skip health checks, internal endpoints, and all rate limiting in test environment
      if (process.env.NODE_ENV === 'test') return true;
      return req.path === '/health' || req.path === '/ready' || req.path.startsWith('/internal/');
    },
  });
}

/**
 * Reset user request store (for testing)
 */
export function resetUserRequestStore(): void {
  userRequestStore.clear();
  if (cleanupInterval !== null) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
