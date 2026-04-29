/**
 * Rate Limiter Configuration
 *
 * Provides configurable rate limiting for different endpoints and user types.
 */
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
    message?: string;
}
export declare const rateLimitConfigs: {
    default: RateLimitConfig;
    auth: RateLimitConfig;
    upload: RateLimitConfig;
    search: RateLimitConfig;
    webhook: RateLimitConfig;
    admin: RateLimitConfig;
    reports: RateLimitConfig;
    sensitive: RateLimitConfig;
};
export declare const userTierLimits: {
    anonymous: {
        requestsPerMinute: number;
        burstLimit: number;
    };
    authenticated: {
        requestsPerMinute: number;
        burstLimit: number;
    };
    premium: {
        requestsPerMinute: number;
        burstLimit: number;
    };
    admin: {
        requestsPerMinute: number;
        burstLimit: number;
    };
};
export declare const endpointRateLimits: Array<{
    pattern: RegExp;
    config: RateLimitConfig;
}>;
export declare function getRateLimitConfig(path: string): RateLimitConfig;
export declare const rateLimitEnv: {
    redisUrl: string;
    useRedis: boolean;
    defaultWindowMinutes: number;
    defaultMaxRequests: number;
    trustProxy: boolean;
};
//# sourceMappingURL=rateLimit.d.ts.map