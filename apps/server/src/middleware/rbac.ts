/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Provides role and permission-based access control for API endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import { rbacService } from '../services/rbacService';
import { getRequestContext } from './requestContext';

/**
 * Extended Request type with user info
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles?: string[];
    permissions?: string[];
  };
}

/**
 * Check if user has required role
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const context = getRequestContext(req);

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    try {
      const userRoles = await rbacService.getUserRoles(req.user.id);
      const roleNames = userRoles.map((ur) => ur.role.name);

      // Check if user has any of the allowed roles
      const hasRole = allowedRoles.some((role) => roleNames.includes(role));

      if (!hasRole) {
        context?.logWarning('Role access denied', {
          userId: req.user.id,
          requiredRoles: allowedRoles,
          userRoles: roleNames,
        });

        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          },
        });
        return;
      }

      // Attach roles to request for downstream use
      req.user.roles = roleNames;
      next();
    } catch (error) {
      context?.logError('Role check failed', { error });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Role verification failed' },
      });
    }
  };
}

/**
 * Check if user has required permission
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const context = getRequestContext(req);

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    try {
      const userPermissions = await rbacService.getUserPermissions(req.user.id);
      const permissionNames = userPermissions.map((p) => p.name);

      // Check if user has all required permissions
      const missingPermissions = requiredPermissions.filter(
        (perm) => !permissionNames.includes(perm)
      );

      if (missingPermissions.length > 0) {
        context?.logWarning('Permission access denied', {
          userId: req.user.id,
          requiredPermissions,
          missingPermissions,
          userPermissions: permissionNames,
        });

        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Access denied. Missing permissions: ${missingPermissions.join(', ')}`,
          },
        });
        return;
      }

      // Attach permissions to request for downstream use
      req.user.permissions = permissionNames;
      next();
    } catch (error) {
      context?.logError('Permission check failed', { error });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Permission verification failed' },
      });
    }
  };
}

/**
 * Check if user has required role level (for hierarchical roles)
 */
export function requireRoleLevel(minLevel: number) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const context = getRequestContext(req);

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    try {
      const userRoles = await rbacService.getUserRoles(req.user.id);
      const highestLevel = Math.max(...userRoles.map((ur) => ur.role.level));

      if (highestLevel < minLevel) {
        context?.logWarning('Role level access denied', {
          userId: req.user.id,
          requiredLevel: minLevel,
          userLevel: highestLevel,
        });

        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Access denied. Required role level: ${minLevel}`,
          },
        });
        return;
      }

      next();
    } catch (error) {
      context?.logError('Role level check failed', { error });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Role level verification failed' },
      });
    }
  };
}

/**
 * Middleware to load user roles and permissions into request
 * (non-blocking, for informational purposes)
 */
export async function loadUserPermissions(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.id) {
    next();
    return;
  }

  try {
    const [roles, permissions] = await Promise.all([
      rbacService.getUserRoles(req.user.id),
      rbacService.getUserPermissions(req.user.id),
    ]);

    req.user.roles = roles.map((ur) => ur.role.name);
    req.user.permissions = permissions.map((p) => p.name);
  } catch (error) {
    // Non-blocking error - continue without permissions
    console.error('Failed to load user permissions:', error);
  }

  next();
}

/**
 * Check resource ownership middleware
 * Verifies that the authenticated user owns the requested resource
 */
export function requireOwnership(getResourceOwnerId: (req: AuthenticatedRequest) => Promise<string | null>) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const context = getRequestContext(req);

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    try {
      const ownerId = await getResourceOwnerId(req);

      if (!ownerId) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Resource not found' },
        });
        return;
      }

      // Check if user is the owner or has admin permission
      const isOwner = ownerId === req.user.id;
      const userPermissions = await rbacService.getUserPermissions(req.user.id);
      const isAdmin = userPermissions.some((p) => p.resource === '*' || p.name === '*:admin');

      if (!isOwner && !isAdmin) {
        context?.logWarning('Resource ownership check failed', {
          userId: req.user.id,
          resourceOwnerId: ownerId,
        });

        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You do not own this resource.',
          },
        });
        return;
      }

      next();
    } catch (error) {
      context?.logError('Ownership check failed', { error });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Ownership verification failed' },
      });
    }
  };
}

export default {
  requireRole,
  requirePermission,
  requireRoleLevel,
  loadUserPermissions,
  requireOwnership,
};
