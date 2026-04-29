/**
 * Enhanced Rate Limiter Middleware
 *
 * Provides IP-based, user-based, and endpoint-differentiated rate limiting
 * with X-RateLimit-* response headers.
 */
import { Request, Response, NextFunction } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';
import { rateLimitConfigs, getRateLimitConfig } from '../config/rateLimit';
export { rateLimitConfigs, getRateLimitConfig };
type RateLimitRequest = Request & {
    user?: any;
    token?: string;
};
/**
 * Get rate limit headers for response based on token bucket state.
 */
export declare function getRateLimitHeaders(identifier: string, config: {
    maxTokens: number;
    refillRate: number;
}): Record<string, string>;
/**
 * User-based rate limiter middleware using token bucket algorithm.
 * Each user/IP gets a bucket that refills tokens over time.
 * burstLimit is the bucket capacity; requestsPerMinute / 60 is the refill rate.
 */
export declare function userRateLimiter(req: RateLimitRequest, res: Response, next: NextFunction): void;
/**
 * Endpoint-differentiated rate limiter
 * Creates a rate limiter based on the endpoint being accessed
 */
export declare function endpointRateLimiter(): RateLimitRequestHandler;
/**
 * Enhanced IP-based rate limiter with tiered limits
 */
export declare const enhancedIpLimiter: RateLimitRequestHandler;
/**
 * Strict rate limiter for authentication endpoints
 */
export declare const strictAuthLimiter: RateLimitRequestHandler;
/**
 * Upload rate limiter
 */
export declare const uploadLimiter: RateLimitRequestHandler;
/**
 * Report creation rate limiter with false-report penalty tracking.
 *
 * Normal users: up to 5 reports per minute (from rateLimitConfigs.reports).
 * Penalty: users with 3+ dismissed reports in the past 30 days are
 * restricted to 1 report per minute.
 */
export declare const reportLimiter: RateLimitRequestHandler;
/**
 * Check whether a user has accumulated false-report penalties.
 * Must be called AFTER authentication middleware.
 *
 * Returns true (and throws 429) when the user has 3 or more dismissed
 * reports within the last 30 days, effectively reducing their allowance
 * to 1 report per minute.
 */
export declare function falseReportPenaltyCheck(req: RateLimitRequest, res: Response, next: NextFunction): void;
/**
 * Search rate limiter
 */
export declare const searchLimiter: RateLimitRequestHandler;
/**
 * Combined rate limiter that applies multiple strategies
 * Use this as the main rate limiting middleware
 */
export declare function combinedRateLimiter(): RateLimitRequestHandler;
/**
 * Reset user request store (for testing)
 */
export declare function resetUserRequestStore(): void;
//# sourceMappingURL=rateLimiter.d.ts.map