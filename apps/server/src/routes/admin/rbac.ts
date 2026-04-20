/**
 * Admin RBAC Routes
 *
 * Routes for role and permission management (admin only).
 */
import { Router } from 'express';
import { z } from 'zod';

import { rbacService } from '../services/rbacService';
import { requireRole, requirePermission } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validation';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const createRoleSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  level: z.number().int().min(0).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

const updateRoleSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  level: z.number().int().min(0).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
});

const removeRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

const roleIdSchema = z.object({
  roleId: z.string().uuid(),
});

const userIdSchema = z.object({
  userId: z.string().uuid(),
});

// ============================================================================
// Role Routes
// ============================================================================

/**
 * @route   GET /api/v1/admin/rbac/roles
 * @desc    Get all roles
 * @access  Admin - rbac:read
 */
router.get(
  '/roles',
  requirePermission('rbac:read'),
  async (_req, res, next) => {
    try {
      const roles = await rbacService.getAllRoles();
      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/admin/rbac/roles/:roleId
 * @desc    Get role by ID
 * @access  Admin - rbac:read
 */
router.get(
  '/roles/:roleId',
  requirePermission('rbac:read'),
  validateParams(roleIdSchema),
  async (req, res, next) => {
    try {
      const { roleId } = req.params;
      const role = await rbacService.getRoleById(roleId);

      if (!role) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Role not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/admin/rbac/roles
 * @desc    Create a new role
 * @access  Admin - rbac:write
 */
router.post(
  '/roles',
  requirePermission('rbac:write'),
  validateBody(createRoleSchema),
  async (req, res, next) => {
    try {
      const role = await rbacService.createRole(req.body, req.user?.id);
      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'Role with this name already exists' },
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/admin/rbac/roles/:roleId
 * @desc    Update a role
 * @access  Admin - rbac:write
 */
router.put(
  '/roles/:roleId',
  requirePermission('rbac:write'),
  validateParams(roleIdSchema),
  validateBody(updateRoleSchema),
  async (req, res, next) => {
    try {
      const { roleId } = req.params;
      const role = await rbacService.getRoleById(roleId);

      if (!role) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Role not found' },
        });
        return;
      }

      if (role.isSystem && req.body.level !== undefined) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot modify system role level' },
        });
        return;
      }

      const updatedRole = await rbacService.updateRole(roleId, req.body, req.user?.id);
      res.json({
        success: true,
        data: updatedRole,
        message: 'Role updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/admin/rbac/roles/:roleId
 * @desc    Delete a role (non-system only)
 * @access  Admin - rbac:write
 */
router.delete(
  '/roles/:roleId',
  requirePermission('rbac:write'),
  validateParams(roleIdSchema),
  async (req, res, next) => {
    try {
      const { roleId } = req.params;
      await rbacService.deleteRole(roleId, req.user?.id);
      res.json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Role not found') {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Role not found' },
          });
          return;
        }
        if (error.message === 'Cannot delete system roles') {
          res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Cannot delete system roles' },
          });
          return;
        }
      }
      next(error);
    }
  }
);

// ============================================================================
// Permission Routes
// ============================================================================

/**
 * @route   GET /api/v1/admin/rbac/permissions
 * @desc    Get all permissions
 * @access  Admin - rbac:read
 */
router.get(
  '/permissions',
  requirePermission('rbac:read'),
  async (_req, res, next) => {
    try {
      const permissions = await rbacService.getAllPermissions();
      res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// User Role Assignment Routes
// ============================================================================

/**
 * @route   GET /api/v1/admin/rbac/users/:userId/roles
 * @desc    Get user's roles
 * @access  Admin - rbac:read
 */
router.get(
  '/users/:userId/roles',
  requirePermission('rbac:read'),
  validateParams(userIdSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const roles = await rbacService.getUserRoles(userId);
      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/admin/rbac/users/:userId/permissions
 * @desc    Get user's permissions
 * @access  Admin - rbac:read
 */
router.get(
  '/users/:userId/permissions',
  requirePermission('rbac:read'),
  validateParams(userIdSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const permissions = await rbacService.getUserPermissions(userId);
      res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/admin/rbac/assign-role
 * @desc    Assign role to user
 * @access  Admin - rbac:write
 */
router.post(
  '/assign-role',
  requirePermission('rbac:write'),
  validateBody(assignRoleSchema),
  async (req, res, next) => {
    try {
      const { userId, roleId, expiresAt } = req.body;
      const expiresAtDate = expiresAt ? new Date(expiresAt) : undefined;

      await rbacService.assignRole(userId, roleId, req.user?.id, expiresAtDate);
      res.json({
        success: true,
        message: 'Role assigned successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Role not found') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Role not found' },
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/admin/rbac/remove-role
 * @desc    Remove role from user
 * @access  Admin - rbac:write
 */
router.post(
  '/remove-role',
  requirePermission('rbac:write'),
  validateBody(removeRoleSchema),
  async (req, res, next) => {
    try {
      const { userId, roleId } = req.body;
      await rbacService.removeRole(userId, roleId, req.user?.id);
      res.json({
        success: true,
        message: 'Role removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Initialization Route
// ============================================================================

/**
 * @route   POST /api/v1/admin/rbac/initialize
 * @desc    Initialize default roles and permissions
 * @access  Super Admin only
 */
router.post(
  '/initialize',
  requireRole('super_admin'),
  async (_req, res, next) => {
    try {
      await rbacService.initializeDefaults();
      res.json({
        success: true,
        message: 'RBAC defaults initialized successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Permission Check Routes (for testing/debugging)
// ============================================================================

/**
 * @route   GET /api/v1/admin/rbac/check/:userId/:permission
 * @desc    Check if user has a specific permission
 * @access  Admin - rbac:read
 */
router.get(
  '/check/:userId/:permission',
  requirePermission('rbac:read'),
  async (req, res, next) => {
    try {
      const { userId, permission } = req.params;
      const hasPermission = await rbacService.hasPermission(userId, permission);
      res.json({
        success: true,
        data: { userId, permission, hasPermission },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
