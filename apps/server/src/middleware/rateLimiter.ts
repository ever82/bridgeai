import { Request, Response, NextFunction } from 'express';
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../services/redis';

/**
 * Circuit Breaker State
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit open, rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening
  timeoutDuration: number;       // Time before attempting reset (ms)
  successThreshold: number;      // Successes required to close circuit
}

/**
 * Circuit Breaker for API protection
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      timeoutDuration: options.timeoutDuration || 60000, // 1 minute
      successThreshold: options.successThreshold || 2,
    };
  }

  /**
   * Check if request should be allowed
   */
  canExecute(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;
      case CircuitState.OPEN:
        if (Date.now() >= this.nextAttempt) {
          this.state = CircuitState.HALF_OPEN;
          return true;
        }
        return false;
      case CircuitState.HALF_OPEN:
        return true;
      default:
        return false;
    }
  }

  /**
   * Record successful request
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        console.log('[CircuitBreaker] Circuit closed');
      }
    }
  }

  /**
   * Record failed request
   */
  recordFailure(): void {
    this.failureCount++;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeoutDuration;
      console.log(`[CircuitBreaker] Circuit opened, retry after ${this.options.timeoutDuration}ms`);
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    nextAttempt: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
    };
  }
}

// Circuit breakers per route
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create circuit breaker for a route
 */
function getCircuitBreaker(route: string): CircuitBreaker {
  if (!circuitBreakers.has(route)) {
    circuitBreakers.set(route, new CircuitBreaker({
      failureThreshold: 5,
      timeoutDuration: 30000, // 30 seconds
      successThreshold: 2,
    }));
  }
  return circuitBreakers.get(route)!;
}

/**
 * Circuit breaker middleware
 */
export function circuitBreakerMiddleware(route: string = 'default') {
  const breaker = getCircuitBreaker(route);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!breaker.canExecute()) {
      res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again later.',
        errorCode: 'CIRCUIT_OPEN',
        retryAfter: Math.ceil((breaker.getMetrics().nextAttempt - Date.now()) / 1000),
      });
      return;
    }

    // Track response
    const originalSend = res.send.bind(res);
    res.send = function(body: unknown): Response {
      const statusCode = res.statusCode;

      if (statusCode >= 500) {
        breaker.recordFailure();
      } else {
        breaker.recordSuccess();
      }

      return originalSend(body);
    };

    next();
  };
}

/**
 * Redis-backed rate limiter
 */
function createRedisRateLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  handler?: (req: Request, res: Response) => void;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      const userId = (req as any).user?.id;
      const identifier = userId || req.ip;
      return `${options.keyPrefix}:${identifier}`;
    },
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: options.keyPrefix,
    }),
    handler: options.handler || ((req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
      });
    }),
  });
}

/**
 * Standard API rate limiter
 * 100 requests per 15 minutes per IP/user
 */
export const apiLimiter = createRedisRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  keyPrefix: 'ratelimit:api',
});

/**
 * Stricter rate limiter for auth endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = createRedisRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  keyPrefix: 'ratelimit:auth',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later.',
      errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * Rate limiter for write operations
 * 30 requests per minute per user
 */
export const writeLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each user to 30 write operations per minute
  keyPrefix: 'ratelimit:write',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Write operations limit exceeded. Please slow down.',
      errorCode: 'WRITE_RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * Rate limiter for search endpoints
 * 20 requests per minute per user
 */
export const searchLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each user to 20 searches per minute
  keyPrefix: 'ratelimit:search',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Search rate limit exceeded. Please try again later.',
      errorCode: 'SEARCH_RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * Burst rate limiter for high-traffic endpoints
 * Allows burst traffic but throttles sustained load
 */
export const burstLimiter = createRedisRateLimiter({
  windowMs: 1000, // 1 second
  max: 10, // 10 requests per second
  keyPrefix: 'ratelimit:burst',
});

/**
 * Get rate limit status for a user
 */
export async function getRateLimitStatus(
  identifier: string
): Promise<{
  remaining: number;
  resetTime: Date;
  total: number;
}> {
  const keys = ['ratelimit:api', 'ratelimit:auth', 'ratelimit:write', 'ratelimit:search'];
  const results: { remaining: number; resetTime: number; total: number }[] = [];

  for (const keyPrefix of keys) {
    const key = `${keyPrefix}:${identifier}`;
    const ttl = await redis.ttl(key);
    const current = await redis.get(key);
    const limit = keyPrefix.includes('auth') ? 5 :
                  keyPrefix.includes('write') ? 30 :
                  keyPrefix.includes('search') ? 20 : 100;

    results.push({
      remaining: Math.max(0, limit - (parseInt(current || '0', 10))),
      resetTime: Date.now() + (ttl * 1000),
      total: limit,
    });
  }

  // Return the most restrictive
  const mostRestrictive = results.reduce((prev, current) =>
    prev.remaining < current.remaining ? prev : current
  );

  return {
    remaining: mostRestrictive.remaining,
    resetTime: new Date(mostRestrictive.resetTime),
    total: mostRestrictive.total,
  };
}

/**
 * Reset rate limit for a user
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  const keys = ['ratelimit:api', 'ratelimit:auth', 'ratelimit:write', 'ratelimit:search'];

  for (const keyPrefix of keys) {
    const key = `${keyPrefix}:${identifier}`;
    await redis.del(key);
  }
}

/**
 * Middleware to add rate limit headers
 */
export function rateLimitHeaders(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    // Add rate limit info headers if available
    const remaining = res.getHeader('X-RateLimit-Remaining');
    if (remaining) {
      res.setHeader('X-RateLimit-Policy', '100;w=900');
    }
  });

  next();
}

export default {
  apiLimiter,
  authLimiter,
  writeLimiter,
  searchLimiter,
  burstLimiter,
  circuitBreakerMiddleware,
  getRateLimitStatus,
  resetRateLimit,
  rateLimitHeaders,
};
