/**
 * Rate Limiter Configuration
 *
 * Provides configurable rate limiting for different endpoints and user types.
 */
// Default configurations for different endpoints
export const rateLimitConfigs = {
    // General API rate limit
    default: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
    },
    // Limit for authentication endpoints
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 60,
        skipSuccessfulRequests: true,
        message: 'Too many login attempts, please try again later.',
    },
    // Upload endpoints
    upload: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 50,
        message: 'Upload limit exceeded, please try again later.',
    },
    // Search endpoints
    search: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30,
        message: 'Search rate limit exceeded, please slow down.',
    },
    // Webhook endpoints
    webhook: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 1000,
        message: 'Webhook rate limit exceeded.',
    },
    // Admin endpoints
    admin: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 200,
        message: 'Admin API rate limit exceeded.',
    },
    // Report creation (per-user, strict to prevent abuse)
    reports: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5,
        message: 'Report submission rate limit exceeded. Please wait before submitting another report.',
    },
    // Strict limit for sensitive operations
    sensitive: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 10,
        message: 'Sensitive operation limit exceeded.',
    },
};
// User tier rate limits (requests per minute)
export const userTierLimits = {
    anonymous: {
        requestsPerMinute: 30,
        burstLimit: 10,
    },
    authenticated: {
        requestsPerMinute: 60,
        burstLimit: 20,
    },
    premium: {
        requestsPerMinute: 120,
        burstLimit: 40,
    },
    admin: {
        requestsPerMinute: 300,
        burstLimit: 100,
    },
};
// Rate limit by endpoint patterns
export const endpointRateLimits = [
    // Authentication endpoints
    { pattern: /^\/api\/auth\//, config: rateLimitConfigs.auth },
    // Upload endpoints
    { pattern: /^\/api\/upload/, config: rateLimitConfigs.upload },
    // Search endpoints
    { pattern: /^\/api\/search/, config: rateLimitConfigs.search },
    // Webhook endpoints
    { pattern: /^\/api\/webhooks/, config: rateLimitConfigs.webhook },
    // Admin endpoints
    { pattern: /^\/api\/admin/, config: rateLimitConfigs.admin },
    // Sensitive operations
    { pattern: /^\/api\/users\/(delete|export)/, config: rateLimitConfigs.sensitive },
];
// Get rate limit config for a specific endpoint
export function getRateLimitConfig(path) {
    for (const endpoint of endpointRateLimits) {
        if (endpoint.pattern.test(path)) {
            return endpoint.config;
        }
    }
    return rateLimitConfigs.default;
}
// Environment-based configuration
export const rateLimitEnv = {
    // Redis URL for distributed rate limiting (optional)
    redisUrl: process.env.RATE_LIMIT_REDIS_URL,
    // Whether to use Redis for distributed rate limiting
    useRedis: process.env.RATE_LIMIT_USE_REDIS === 'true',
    // Default window size in minutes
    defaultWindowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10),
    // Default max requests per window
    defaultMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    // Trust proxy setting for getting client IP
    trustProxy: process.env.RATE_LIMIT_TRUST_PROXY === 'true',
};
//# sourceMappingURL=rateLimit.js.map