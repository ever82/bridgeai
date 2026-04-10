/**
 * RBAC Middleware Tests
 */
import { Request, Response, NextFunction } from 'express';
import {
  requireRole,
  requirePermission,
  requireRoleLevel,
  loadUserPermissions,
  requireOwnership,
  AuthenticatedRequest,
} from '../../src/middleware/rbac';
import { rbacService } from '../../src/services/rbacService';

// Mock RBAC service
jest.mock('../../src/services/rbacService', () => ({
  rbacService: {
    getUserRoles: jest.fn(),
    getUserPermissions: jest.fn(),
  },
}));

// Mock request context
jest.mock('../../src/middleware/requestContext', () => ({
  getRequestContext: jest.fn(() => ({
    logWarning: jest.fn(),
    logError: jest.fn(),
  })),
}));

describe('RBAC Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

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
      (rbacService.getUserRoles as jest.Mock).mockResolvedValue([
        { role: { name: 'admin' } },
      ]);

      const middleware = requireRole('admin');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.roles).toContain('admin');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = undefined;

      const middleware = requireRole('admin');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    });

    it('should return 403 if user does not have required role', async () => {
      (rbacService.getUserRoles as jest.Mock).mockResolvedValue([
        { role: { name: 'user' } },
      ]);

      const middleware = requireRole('admin');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      });
    });

    it('should allow access if user has any of the required roles', async () => {
      (rbacService.getUserRoles as jest.Mock).mockResolvedValue([
        { role: { name: 'moderator' } },
      ]);

      const middleware = requireRole('admin', 'moderator');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should call next() if user has required permission', async () => {
      (rbacService.getUserPermissions as jest.Mock).mockResolvedValue([
        { name: 'users:read', resource: 'users', action: 'read' },
      ]);

      const middleware = requirePermission('users:read');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.permissions).toContain('users:read');
    });

    it('should return 403 if user lacks required permission', async () => {
      (rbacService.getUserPermissions as jest.Mock).mockResolvedValue([
        { name: 'users:read', resource: 'users', action: 'read' },
      ]);

      const middleware = requirePermission('users:delete');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

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
      (rbacService.getUserPermissions as jest.Mock).mockResolvedValue([
        { name: 'users:read', resource: 'users', action: 'read' },
      ]);

      const middleware = requirePermission('users:read', 'users:write');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('requireRoleLevel', () => {
    it('should call next() if user has sufficient role level', async () => {
      (rbacService.getUserRoles as jest.Mock).mockResolvedValue([
        { role: { name: 'admin', level: 100 } },
      ]);

      const middleware = requireRoleLevel(50);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 if user role level is too low', async () => {
      (rbacService.getUserRoles as jest.Mock).mockResolvedValue([
        { role: { name: 'user', level: 0 } },
      ]);

      const middleware = requireRoleLevel(50);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('loadUserPermissions', () => {
    it('should load user roles and permissions into request', async () => {
      (rbacService.getUserRoles as jest.Mock).mockResolvedValue([
        { role: { name: 'admin' } },
      ]);
      (rbacService.getUserPermissions as jest.Mock).mockResolvedValue([
        { name: 'users:read', resource: 'users', action: 'read' },
      ]);

      await loadUserPermissions(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user?.roles).toEqual(['admin']);
      expect(mockReq.user?.permissions).toEqual(['users:read']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue even if loading fails', async () => {
      (rbacService.getUserRoles as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await loadUserPermissions(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip if user is not authenticated', async () => {
      mockReq.user = undefined;

      await loadUserPermissions(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(rbacService.getUserRoles).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('should call next() if user owns the resource', async () => {
      (rbacService.getUserPermissions as jest.Mock).mockResolvedValue([]);

      const getOwnerId = jest.fn().mockResolvedValue('user-1');
      const middleware = requireOwnership(getOwnerId);

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() if user is admin', async () => {
      (rbacService.getUserPermissions as jest.Mock).mockResolvedValue([
        { name: '*:admin', resource: '*', action: 'admin' },
      ]);

      const getOwnerId = jest.fn().mockResolvedValue('user-2');
      const middleware = requireOwnership(getOwnerId);

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 if user does not own resource', async () => {
      (rbacService.getUserPermissions as jest.Mock).mockResolvedValue([]);

      const getOwnerId = jest.fn().mockResolvedValue('user-2');
      const middleware = requireOwnership(getOwnerId);

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

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
      const middleware = requireOwnership(getOwnerId);

      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });
});
