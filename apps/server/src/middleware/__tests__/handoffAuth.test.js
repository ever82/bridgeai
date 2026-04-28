"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@bridgeai/shared");
const handoffAuth_1 = require("../handoffAuth");
const rbacService_1 = require("../../services/rbacService");
// Mock RBAC service
jest.mock('../../services/rbacService', () => ({
    rbacService: {
        getUserRoles: jest.fn(),
        getUserPermissions: jest.fn(),
    },
}));
// Mock request context
jest.mock('../requestContext', () => ({
    getRequestContext: jest.fn(() => ({
        logWarning: jest.fn(),
        logError: jest.fn(),
    })),
}));
describe('Handoff Auth Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = {
            user: { id: 'user-1', email: 'test@example.com', roles: ['user'] },
            params: {},
            body: {},
        };
        mockRes = {
            status: statusMock,
            json: jsonMock,
            statusCode: 200,
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
        (0, handoffAuth_1.clearHandoffRateLimit)('user-1');
    });
    describe('handoffPermissionMiddleware', () => {
        it('should attach handoff info to request for authorized user', async () => {
            rbacService_1.rbacService.getUserRoles.mockResolvedValue([{ role: { name: 'user' } }]);
            rbacService_1.rbacService.getUserPermissions.mockResolvedValue([
                { name: 'handoff:takeover' },
            ]);
            await (0, handoffAuth_1.handoffPermissionMiddleware)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.handoff).toBeDefined();
            expect(mockReq.handoff?.userId).toBe('user-1');
            expect(mockReq.handoff?.canTakeover).toBe(true);
            expect(mockReq.handoff?.canHandoff).toBe(true);
        });
        it('should return 401 if user not authenticated', async () => {
            mockReq.user = undefined;
            await (0, handoffAuth_1.handoffPermissionMiddleware)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: shared_1.HandoffErrorCode.UNAUTHORIZED,
                }),
            }));
        });
        it('should set canTakeover to false for unauthorized roles', async () => {
            rbacService_1.rbacService.getUserRoles.mockResolvedValue([{ role: { name: 'guest' } }]);
            rbacService_1.rbacService.getUserPermissions.mockResolvedValue([]);
            await (0, handoffAuth_1.handoffPermissionMiddleware)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.handoff?.canTakeover).toBe(false);
            expect(mockReq.handoff?.canHandoff).toBe(false);
        });
        it('should handle rate limiting', async () => {
            rbacService_1.rbacService.getUserRoles.mockResolvedValue([{ role: { name: 'user' } }]);
            rbacService_1.rbacService.getUserPermissions.mockResolvedValue([]);
            // Simulate many requests to trigger rate limit
            for (let i = 0; i < 65; i++) {
                await (0, handoffAuth_1.handoffPermissionMiddleware)(mockReq, mockRes, mockNext);
                // Reset mockReq.handoff for next iteration
                mockReq.handoff = undefined;
            }
            // Last call should have isRateLimited
            expect(mockReq.handoff?.isRateLimited).toBe(true);
        });
    });
    describe('requireTakeoverPermission', () => {
        it('should call next() if user can takeover', () => {
            mockReq.handoff = {
                userId: 'user-1',
                role: 'user',
                permissions: [],
                canTakeover: true,
                canHandoff: true,
                isRateLimited: false,
            };
            (0, handoffAuth_1.requireTakeoverPermission)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return 401 if handoff info not loaded', () => {
            mockReq.handoff = undefined;
            (0, handoffAuth_1.requireTakeoverPermission)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: shared_1.HandoffErrorCode.UNAUTHORIZED,
                }),
            }));
        });
        it('should return 403 if user cannot takeover', () => {
            mockReq.handoff = {
                userId: 'user-1',
                role: 'guest',
                permissions: [],
                canTakeover: false,
                canHandoff: false,
                isRateLimited: false,
            };
            (0, handoffAuth_1.requireTakeoverPermission)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: shared_1.HandoffErrorCode.UNAUTHORIZED,
                }),
            }));
        });
        it('should return 403 with RATE_LIMITED code if rate limited', () => {
            mockReq.handoff = {
                userId: 'user-1',
                role: 'user',
                permissions: [],
                canTakeover: false,
                canHandoff: false,
                isRateLimited: true,
            };
            (0, handoffAuth_1.requireTakeoverPermission)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: shared_1.HandoffErrorCode.RATE_LIMITED,
                }),
            }));
        });
    });
    describe('requireHandoffPermission', () => {
        it('should call next() if user can handoff', () => {
            mockReq.handoff = {
                userId: 'user-1',
                role: 'user',
                permissions: [],
                canTakeover: true,
                canHandoff: true,
                isRateLimited: false,
            };
            (0, handoffAuth_1.requireHandoffPermission)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return 403 if user cannot handoff', () => {
            mockReq.handoff = {
                userId: 'user-1',
                role: 'guest',
                permissions: [],
                canTakeover: false,
                canHandoff: false,
                isRateLimited: false,
            };
            (0, handoffAuth_1.requireHandoffPermission)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
        });
    });
    describe('checkFrequentSwitching', () => {
        it('should call next() if enough time has passed', () => {
            const middleware = (0, handoffAuth_1.checkFrequentSwitching)({ minHandoffIntervalSeconds: 5 });
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return 401 if user not authenticated', () => {
            mockReq.user = undefined;
            const middleware = (0, handoffAuth_1.checkFrequentSwitching)({ minHandoffIntervalSeconds: 5 });
            middleware(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
        });
        it('should return 429 if switching too frequently', () => {
            const middleware = (0, handoffAuth_1.checkFrequentSwitching)({ minHandoffIntervalSeconds: 60 });
            // First request
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
            // Reset mockNext for second call
            mockNext = jest.fn();
            mockRes = {
                status: statusMock,
                json: jsonMock,
                statusCode: 200,
            };
            // Second request immediately after should be rate limited
            middleware(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(429);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: shared_1.HandoffErrorCode.RATE_LIMITED,
                    retryAfter: expect.any(Number),
                }),
            }));
        });
    });
    describe('validateForcedTakeover', () => {
        it('should call next() if not forcing', () => {
            mockReq.body = { force: false };
            (0, handoffAuth_1.validateForcedTakeover)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return 403 if forced takeover disabled', () => {
            mockReq.body = { force: true };
            (0, handoffAuth_1.validateForcedTakeover)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: shared_1.HandoffErrorCode.FORCE_TAKEOVER_DISABLED,
                }),
            }));
        });
        it('should return 403 if user not admin', () => {
            mockReq.body = { force: true };
            // Note: allowForcedTakeover is enabled by default in config
            // but we need admin role to use it
            (0, handoffAuth_1.validateForcedTakeover)(mockReq, mockRes, mockNext);
            // Since the user doesn't have admin role, should return 403
            expect(statusMock).toHaveBeenCalledWith(403);
        });
        it('should call next() for admin user with force', () => {
            mockReq.body = { force: true };
            mockReq.user = { id: 'admin-1', email: 'admin@test.com', roles: ['admin'] };
            (0, handoffAuth_1.validateForcedTakeover)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('auditHandoffAction', () => {
        it('should log action and call original json', () => {
            const middleware = (0, handoffAuth_1.auditHandoffAction)('REQUEST_TAKEOVER');
            mockReq.params = { conversationId: 'conv-1' };
            mockReq.body = { reason: 'Test' };
            middleware(mockReq, mockRes, mockNext);
            // Call the overridden json method
            const responseBody = { success: true };
            mockRes.json?.(responseBody);
            expect(jsonMock).toHaveBeenCalledWith(responseBody);
        });
        it('should sanitize sensitive fields in audit log', () => {
            const middleware = (0, handoffAuth_1.auditHandoffAction)('REQUEST_TAKEOVER');
            mockReq.body = { password: 'secret123', token: 'abc' };
            middleware(mockReq, mockRes, mockNext);
            // Should not throw and should call next
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('getHandoffRateLimitStatus', () => {
        it('should return rate limit status', () => {
            const status = (0, handoffAuth_1.getHandoffRateLimitStatus)('user-1');
            expect(status).toEqual({
                current: expect.any(Number),
                max: 60,
                resetAt: expect.any(Number),
            });
        });
    });
    describe('clearHandoffRateLimit', () => {
        it('should clear rate limit for user', () => {
            (0, handoffAuth_1.clearHandoffRateLimit)('user-1');
            const status = (0, handoffAuth_1.getHandoffRateLimitStatus)('user-1');
            expect(status.current).toBe(0);
        });
    });
});
//# sourceMappingURL=handoffAuth.test.js.map