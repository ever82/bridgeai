"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rbac_1 = require("../rbac");
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
describe('RBAC Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = {
            user: { id: 'user-1', email: 'test@example.com' },
        };
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });
    describe('requireRole', () => {
        it('should call next() if user has required role', async () => {
            rbacService_1.rbacService.getUserRoles.mockResolvedValue([{ role: { name: 'admin' } }]);
            const middleware = (0, rbac_1.requireRole)('admin');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user?.roles).toContain('admin');
        });
        it('should return 401 if user is not authenticated', async () => {
            mockReq.user = undefined;
            const middleware = (0, rbac_1.requireRole)('admin');
            await middleware(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
            });
        });
        it('should return 403 if user does not have required role', async () => {
            rbacService_1.rbacService.getUserRoles.mockResolvedValue([{ role: { name: 'user' } }]);
            const middleware = (0, rbac_1.requireRole)('admin');
            await middleware(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({ code: 'FORBIDDEN' }),
            });
        });
        it('should allow access if user has any of the required roles', async () => {
            rbacService_1.rbacService.getUserRoles.mockResolvedValue([{ role: { name: 'moderator' } }]);
            const middleware = (0, rbac_1.requireRole)('admin', 'moderator');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('requirePermission', () => {
        it('should call next() if user has required permission', async () => {
            rbacService_1.rbacService.getUserPermissions.mockResolvedValue([
                { name: 'users:read', resource: 'users', action: 'read' },
            ]);
            const middleware = (0, rbac_1.requirePermission)('users:read');
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user?.permissions).toContain('users:read');
        });
        it('should return 403 if user lacks required permission', async () => {
            rbacService_1.rbacService.getUserPermissions.mockResolvedValue([
                { name: 'users:read', resource: 'users', action: 'read' },
            ]);
            const middleware = (0, rbac_1.requirePermission)('users:delete');
            await middleware(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: 'FORBIDDEN',
                    message: expect.stringContaining('users:delete'),
                }),
            });
        });
        it('should require all permissions when multiple are specified', async () => {
            rbacService_1.rbacService.getUserPermissions.mockResolvedValue([
                { name: 'users:read', resource: 'users', action: 'read' },
            ]);
            const middleware = (0, rbac_1.requirePermission)('users:read', 'users:write');
            await middleware(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
        });
    });
    describe('requireRoleLevel', () => {
        it('should call next() if user has sufficient role level', async () => {
            rbacService_1.rbacService.getUserRoles.mockResolvedValue([
                { role: { name: 'admin', level: 100 } },
            ]);
            const middleware = (0, rbac_1.requireRoleLevel)(50);
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return 403 if user role level is too low', async () => {
            rbacService_1.rbacService.getUserRoles.mockResolvedValue([
                { role: { name: 'user', level: 0 } },
            ]);
            const middleware = (0, rbac_1.requireRoleLevel)(50);
            await middleware(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
        });
    });
    describe('loadUserPermissions', () => {
        it('should load user roles and permissions into request', async () => {
            rbacService_1.rbacService.getUserRoles.mockResolvedValue([{ role: { name: 'admin' } }]);
            rbacService_1.rbacService.getUserPermissions.mockResolvedValue([
                { name: 'users:read', resource: 'users', action: 'read' },
            ]);
            await (0, rbac_1.loadUserPermissions)(mockReq, mockRes, mockNext);
            expect(mockReq.user?.roles).toEqual(['admin']);
            expect(mockReq.user?.permissions).toEqual(['users:read']);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should continue even if loading fails', async () => {
            rbacService_1.rbacService.getUserRoles.mockRejectedValue(new Error('DB Error'));
            await (0, rbac_1.loadUserPermissions)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should skip if user is not authenticated', async () => {
            mockReq.user = undefined;
            await (0, rbac_1.loadUserPermissions)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(rbacService_1.rbacService.getUserRoles).not.toHaveBeenCalled();
        });
    });
    describe('requireOwnership', () => {
        it('should call next() if user owns the resource', async () => {
            rbacService_1.rbacService.getUserPermissions.mockResolvedValue([]);
            const getOwnerId = jest.fn().mockResolvedValue('user-1');
            const middleware = (0, rbac_1.requireOwnership)(getOwnerId);
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should call next() if user is admin', async () => {
            rbacService_1.rbacService.getUserPermissions.mockResolvedValue([
                { name: '*:admin', resource: '*', action: 'admin' },
            ]);
            const getOwnerId = jest.fn().mockResolvedValue('user-2');
            const middleware = (0, rbac_1.requireOwnership)(getOwnerId);
            await middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return 403 if user does not own resource', async () => {
            rbacService_1.rbacService.getUserPermissions.mockResolvedValue([]);
            const getOwnerId = jest.fn().mockResolvedValue('user-2');
            const middleware = (0, rbac_1.requireOwnership)(getOwnerId);
            await middleware(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: 'FORBIDDEN',
                    message: expect.stringContaining('do not own'),
                }),
            });
        });
        it('should return 404 if resource not found', async () => {
            const getOwnerId = jest.fn().mockResolvedValue(null);
            const middleware = (0, rbac_1.requireOwnership)(getOwnerId);
            await middleware(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(404);
        });
    });
});
//# sourceMappingURL=rbac.test.js.map