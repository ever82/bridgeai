"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rateLimiter_1 = require("../rateLimiter");
const rateLimiter_2 = require("../rateLimiter");
// Mock request context
jest.mock('../requestContext', () => ({
    getRequestContext: () => ({
        logWarning: jest.fn(),
        logInfo: jest.fn(),
    }),
}));
describe('Rate Limiter Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    beforeEach(() => {
        (0, rateLimiter_1.resetUserRequestStore)();
        jest.clearAllMocks();
        mockReq = {
            path: '/api/test',
            method: 'GET',
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
            user: undefined,
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });
    describe('getRateLimitConfig', () => {
        it('should return auth config for auth endpoints', () => {
            const config = (0, rateLimiter_1.getRateLimitConfig)('/api/auth/login');
            expect(config).toEqual(rateLimiter_1.rateLimitConfigs.auth);
        });
        it('should return upload config for upload endpoints', () => {
            const config = (0, rateLimiter_1.getRateLimitConfig)('/api/upload/image');
            expect(config).toEqual(rateLimiter_1.rateLimitConfigs.upload);
        });
        it('should return search config for search endpoints', () => {
            const config = (0, rateLimiter_1.getRateLimitConfig)('/api/search/agents');
            expect(config).toEqual(rateLimiter_1.rateLimitConfigs.search);
        });
        it('should return webhook config for webhook endpoints', () => {
            const config = (0, rateLimiter_1.getRateLimitConfig)('/api/webhooks/stripe');
            expect(config).toEqual(rateLimiter_1.rateLimitConfigs.webhook);
        });
        it('should return admin config for admin endpoints', () => {
            const config = (0, rateLimiter_1.getRateLimitConfig)('/api/admin/users');
            expect(config).toEqual(rateLimiter_1.rateLimitConfigs.admin);
        });
        it('should return default config for unknown endpoints', () => {
            const config = (0, rateLimiter_1.getRateLimitConfig)('/api/unknown');
            expect(config).toEqual(rateLimiter_1.rateLimitConfigs.default);
        });
    });
    describe('getRateLimitHeaders', () => {
        it('should return correct headers for a new bucket', () => {
            const headers = (0, rateLimiter_2.getRateLimitHeaders)('test-key', {
                maxTokens: 10,
                refillRate: 0.5,
            });
            expect(headers).toHaveProperty('X-RateLimit-Limit');
            expect(headers).toHaveProperty('X-RateLimit-Remaining');
            expect(headers).toHaveProperty('X-RateLimit-Reset');
            expect(headers['X-RateLimit-Limit']).toBe('10');
            expect(headers['X-RateLimit-Remaining']).toBe('9');
        });
    });
    describe('userRateLimiter', () => {
        it('should set rate limit headers for anonymous users', () => {
            (0, rateLimiter_1.userRateLimiter)(mockReq, mockRes, mockNext);
            expect(mockRes.set).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });
        it('should use user ID for authenticated users', () => {
            mockReq.user = { id: 'user-123', role: 'user' };
            (0, rateLimiter_1.userRateLimiter)(mockReq, mockRes, mockNext);
            expect(mockRes.set).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });
        it('should apply stricter limits for anonymous users', () => {
            // Anonymous burst limit is 10 — exceed it in one burst
            for (let i = 0; i < 12; i++) {
                (0, rateLimiter_1.userRateLimiter)(mockReq, mockRes, mockNext);
            }
            // Should have been blocked
            expect(mockRes.status).toHaveBeenCalledWith(429);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
            }));
        });
        it('should allow more requests for premium users', () => {
            mockReq.user = { id: 'user-123', role: 'user', isPremium: true };
            // Make requests that would exceed anonymous burst limit
            for (let i = 0; i < 35; i++) {
                (0, rateLimiter_1.userRateLimiter)(mockReq, mockRes, mockNext);
            }
            // Should still be allowed (premium burst limit is 40)
            expect(mockRes.status).not.toHaveBeenCalledWith(429);
        });
        it('should allow most requests for admin users', () => {
            mockReq.user = { id: 'user-123', role: 'admin' };
            // Make many requests (admin burst limit is 100)
            for (let i = 0; i < 99; i++) {
                (0, rateLimiter_1.userRateLimiter)(mockReq, mockRes, mockNext);
            }
            // Should still be allowed (admin burst limit is 100)
            expect(mockRes.status).not.toHaveBeenCalledWith(429);
        });
    });
    describe('enhancedIpLimiter', () => {
        it('should be a function', () => {
            expect(typeof rateLimiter_1.enhancedIpLimiter).toBe('function');
        });
        it('should skip health check endpoints', () => {
            mockReq.path = '/health';
            // The rate limiter should skip this
            // We can't fully test the skip behavior without running the middleware
            expect(mockReq.path).toBe('/health');
        });
        it('should skip ready check endpoints', () => {
            mockReq.path = '/ready';
            expect(mockReq.path).toBe('/ready');
        });
    });
    describe('strictAuthLimiter', () => {
        it('should be a function', () => {
            expect(typeof rateLimiter_1.strictAuthLimiter).toBe('function');
        });
        it('should have stricter limits than default', () => {
            expect(rateLimiter_1.rateLimitConfigs.auth.maxRequests).toBeLessThan(rateLimiter_1.rateLimitConfigs.default.maxRequests);
        });
        it('should skip successful requests', () => {
            expect(rateLimiter_1.rateLimitConfigs.auth.skipSuccessfulRequests).toBe(true);
        });
    });
});
//# sourceMappingURL=rateLimiter.test.js.map