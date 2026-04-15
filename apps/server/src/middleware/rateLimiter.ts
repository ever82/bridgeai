/**
 * Enhanced Rate Limiter Middleware
 *
 * Provides IP-based, user-based, and endpoint-differentiated rate limiting
 * with X-RateLimit-* response headers.
 */
import { Request, Response, NextFunction } from 'express';
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';

import {
  rateLimitConfigs,
  userTierLimits,
  getRateLimitConfig,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  rateLimitEnv,
} from '../config/rateLimit';

// Extend Express Request type to include user property
interface RateLimitRequest extends Request {
  user?: {
    id?: string;
    role?: string;
    isPremium?: boolean;
  };
}

// In-memory store for user-based rate limiting (replace with Redis in production)
interface UserRequestRecord {
  count: number;
  resetTime: number;
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

// Clean up expired entries from the store (called periodically)
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, record] of userRequestStore.entries()) {
    if (record.resetTime <= now) {
      userRequestStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  identifier: string,
  config: typeof rateLimitConfigs.default
): Record<string, string> {
  const record = userRequestStore.get(identifier);
  const now = Date.now();

  if (!record || record.resetTime <= now) {
    // New window
    return {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': (config.maxRequests - 1).toString(),
      'X-RateLimit-Reset': Math.ceil((now + config.windowMs) / 1000).toString(),
    };
  }

  const remaining = Math.max(0, config.maxRequests - record.count);
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000).toString(),
  };
}

/**
 * User-based rate limiter middleware
 * Checks and updates rate limit for authenticated users
 */
export function userRateLimiter(req: RateLimitRequest, res: Response, next: NextFunction): void {
  const identifier = getClientIdentifier(req);
  const tier = getUserTier(req);
  const tierConfig = userTierLimits[tier];

  // Convert per-minute to window-based
  const windowMs = 60 * 1000; // 1 minute window for user-based limiting
  const maxRequests = tierConfig.requestsPerMinute;

  const now = Date.now();
  let record = userRequestStore.get(identifier);

  if (!record || record.resetTime <= now) {
    // Start new window
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    userRequestStore.set(identifier, record);
  } else {
    record.count++;
  }

  // Set rate limit headers
  const headers = getRateLimitHeaders(identifier, {
    windowMs,
    maxRequests,
  });
  res.set(headers);

  // Check if limit exceeded
  if (record.count > maxRequests) {
    res.status(429).json({
      success: false,
      error: {
        code: 'USER_RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded for ${tier} users. Please try again later.`,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      },
    });
    return;
  }

  next();
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
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: config.message || 'Too many requests, please try again later.',
        },
      });
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
export const enhancedIpLimiter = rateLimit({
  windowMs: rateLimitConfigs.default.windowMs,
  max: rateLimitConfigs.default.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Get real client IP behind proxy
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'IP_RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
      },
    });
  },
  skip: (req: Request) => {
    // Skip health checks
    return req.path === '/health' || req.path === '/ready';
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
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: rateLimitConfigs.auth.message!,
        retryAfter: Math.ceil(rateLimitConfigs.auth.windowMs / 1000),
      },
    });
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
    res.status(429).json({
      success: false,
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: rateLimitConfigs.upload.message!,
      },
    });
  },
});

/**
 * Search rate limiter
 */
export const searchLimiter = rateLimit({
  windowMs: rateLimitConfigs.search.windowMs,
  max: rateLimitConfigs.search.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'SEARCH_RATE_LIMIT_EXCEEDED',
        message: rateLimitConfigs.search.message!,
      },
    });
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
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
          retryAfter: 900, // 15 minutes in seconds
        },
      });
    },
    skip: (req: RateLimitRequest) => {
      // Skip health checks and internal endpoints
      return req.path === '/health' || req.path === '/ready' || req.path.startsWith('/internal/');
    },
  });
}

// Export the original limiters for backward compatibility
export { apiLimiter, authLimiter } from './rateLimit';

// Re-export config for tests and external use
export { getRateLimitConfig, rateLimitConfigs } from '../config/rateLimit';

/**
 * Reset user request store (for testing)
 */
export function resetUserRequestStore(): void {
  userRequestStore.clear();
}
