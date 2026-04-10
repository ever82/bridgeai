/**
 * RBAC Service
 *
 * Provides role and permission management functionality.
 */
import { prisma } from '../lib/prisma';
import { auditService } from './auditService';

/**
 * Default system roles
 */
export const DEFAULT_ROLES = {
  USER: {
    name: 'user',
    displayName: '普通用户',
    description: '系统普通用户，拥有基本操作权限',
    level: 0,
    isSystem: true,
  },
  MODERATOR: {
    name: 'moderator',
    displayName: '版主',
    description: '内容版主，拥有内容管理权限',
    level: 50,
    isSystem: true,
  },
  ADMIN: {
    name: 'admin',
    displayName: '管理员',
    description: '系统管理员，拥有大部分管理权限',
    level: 100,
    isSystem: true,
  },
  SUPER_ADMIN: {
    name: 'super_admin',
    displayName: '超级管理员',
    description: '超级管理员，拥有所有系统权限',
    level: 999,
    isSystem: true,
  },
};

/**
 * Default system permissions
 */
export const DEFAULT_PERMISSIONS = [
  // User management
  { resource: 'users', action: 'read', name: 'users:read', description: '查看用户信息' },
  { resource: 'users', action: 'write', name: 'users:write', description: '修改用户信息' },
  { resource: 'users', action: 'delete', name: 'users:delete', description: '删除用户' },
  { resource: 'users', action: 'admin', name: 'users:admin', description: '用户管理权限' },

  // Agent management
  { resource: 'agents', action: 'read', name: 'agents:read', description: '查看Agent信息' },
  { resource: 'agents', action: 'write', name: 'agents:write', description: '修改Agent信息' },
  { resource: 'agents', action: 'delete', name: 'agents:delete', description: '删除Agent' },
  { resource: 'agents', action: 'admin', name: 'agents:admin', description: 'Agent管理权限' },

  // Content management
  { resource: 'content', action: 'read', name: 'content:read', description: '查看内容' },
  { resource: 'content', action: 'write', name: 'content:write', description: '创建/修改内容' },
  { resource: 'content', action: 'delete', name: 'content:delete', description: '删除内容' },
  { resource: 'content', action: 'moderate', name: 'content:moderate', description: '审核内容' },

  // System management
  { resource: 'system', action: 'read', name: 'system:read', description: '查看系统信息' },
  { resource: 'system', action: 'config', name: 'system:config', description: '系统配置' },
  { resource: 'system', action: 'admin', name: 'system:admin', description: '系统管理权限' },

  // RBAC management
  { resource: 'rbac', action: 'read', name: 'rbac:read', description: '查看权限信息' },
  { resource: 'rbac', action: 'write', name: 'rbac:write', description: '修改权限配置' },
  { resource: 'rbac', action: 'admin', name: 'rbac:admin', description: '权限管理权限' },
];

/**
 * Role-permission mappings for default roles
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  user: ['users:read', 'agents:read', 'agents:write', 'content:read', 'content:write'],
  moderator: [
    'users:read',
    'agents:read',
    'content:read',
    'content:write',
    'content:delete',
    'content:moderate',
  ],
  admin: [
    'users:read',
    'users:write',
    'agents:read',
    'agents:write',
    'agents:delete',
    'content:read',
    'content:write',
    'content:delete',
    'content:moderate',
    'system:read',
    'system:config',
    'rbac:read',
  ],
  super_admin: ['*:admin'], // Wildcard permission for all resources
};

/**
 * RBAC Service
 */
export class RBACService {
  private permissionCache: Map<string, { permissions: string[]; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ============================================================================
  // Role Management
  // ============================================================================

  /**
   * Initialize default roles and permissions
   */
  async initializeDefaults(): Promise<void> {
    // Create default permissions
    for (const perm of DEFAULT_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      });
    }

    // Create default roles
    for (const [key, roleData] of Object.entries(DEFAULT_ROLES)) {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: {},
        create: roleData,
      });

      // Assign permissions to role
      const permissionNames =
        DEFAULT_ROLE_PERMISSIONS[roleData.name as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];

      for (const permName of permissionNames) {
        const permission = await prisma.permission.findUnique({
          where: { name: permName },
        });

        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        }
      }
    }

    console.log('RBAC defaults initialized successfully');
  }

  /**
   * Get all roles
   */
  async getAllRoles() {
    return prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { level: 'desc' },
    });
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string) {
    return prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string) {
    return prisma.role.findUnique({
      where: { name },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Create a new role
   */
  async createRole(
    data: {
      name: string;
      displayName: string;
      description?: string;
      level?: number;
      permissionIds?: string[];
    },
    grantedBy?: string
  ) {
    const { permissionIds, ...roleData } = data;

    const role = await prisma.role.create({
      data: roleData,
    });

    // Assign permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    // Audit log
    await auditService.log({
      action: 'ROLE_CREATED',
      resource: 'role',
      resourceId: role.id,
      userId: grantedBy,
      details: { name: role.name, permissionIds },
    });

    return this.getRoleById(role.id);
  }

  /**
   * Update a role
   */
  async updateRole(
    id: string,
    data: {
      displayName?: string;
      description?: string;
      level?: number;
      permissionIds?: string[];
    },
    grantedBy?: string
  ) {
    const { permissionIds, ...roleData } = data;

    const role = await prisma.role.update({
      where: { id },
      data: roleData,
    });

    // Update permissions if provided
    if (permissionIds !== undefined) {
      // Remove existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Add new permissions
      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }

      // Invalidate cache for all users with this role
      await this.invalidateRoleCache(id);
    }

    // Audit log
    await auditService.log({
      action: 'ROLE_UPDATED',
      resource: 'role',
      resourceId: role.id,
      userId: grantedBy,
      details: { name: role.name, permissionIds },
    });

    return this.getRoleById(role.id);
  }

  /**
   * Delete a role (only non-system roles)
   */
  async deleteRole(id: string, deletedBy?: string): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    await prisma.role.delete({
      where: { id },
    });

    // Invalidate cache
    await this.invalidateRoleCache(id);

    // Audit log
    await auditService.log({
      action: 'ROLE_DELETED',
      resource: 'role',
      resourceId: id,
      userId: deletedBy,
      details: { name: role.name },
    });
  }

  // ============================================================================
  // Permission Management
  // ============================================================================

  /**
   * Get all permissions
   */
  async getAllPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(id: string) {
    return prisma.permission.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new permission
   */
  async createPermission(data: {
    resource: string;
    action: string;
    name: string;
    description?: string;
  }) {
    return prisma.permission.create({
      data,
    });
  }

  // ============================================================================
  // User Role Management
  // ============================================================================

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string) {
    return prisma.userRole.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        role: true,
      },
    });
  }

  /**
   * Get user's permissions (with caching)
   */
  async getUserPermissions(userId: string) {
    // Check cache
    const cached = this.permissionCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      // Return cached permissions mapped to permission objects
      return prisma.permission.findMany({
        where: {
          name: { in: cached.permissions },
        },
      });
    }

    // Get fresh permissions
    const userRoles = await this.getUserRoles(userId);
    const roleIds = userRoles.map((ur) => ur.roleId);

    const permissions = await prisma.permission.findMany({
      where: {
        roles: {
          some: {
            roleId: { in: roleIds },
          },
        },
      },
    });

    // Handle wildcard permissions
    const hasWildcard = permissions.some((p) => p.resource === '*' || p.name === '*:admin');
    let allPermissions = permissions;

    if (hasWildcard) {
      allPermissions = await prisma.permission.findMany();
    }

    // Update cache
    this.permissionCache.set(userId, {
      permissions: allPermissions.map((p) => p.name),
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return allPermissions;
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    grantedBy?: string,
    expiresAt?: Date
  ): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      update: {
        expiresAt,
        grantedBy,
      },
      create: {
        userId,
        roleId,
        grantedBy,
        expiresAt,
      },
    });

    // Invalidate cache
    this.invalidateUserCache(userId);

    // Audit log
    await auditService.log({
      action: 'ROLE_ASSIGNED',
      resource: 'user_role',
      resourceId: userId,
      userId: grantedBy,
      details: { roleId, roleName: role.name, expiresAt },
    });
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string, removedBy?: string): Promise<void> {
    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });

    // Invalidate cache
    this.invalidateUserCache(userId);

    // Audit log
    await auditService.log({
      action: 'ROLE_REMOVED',
      resource: 'user_role',
      resourceId: userId,
      userId: removedBy,
      details: { roleId },
    });
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return userRoles.some((ur) => ur.role.name === roleName);
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return (
      permissions.some(
        (p) => p.name === permissionName || p.name === '*:admin' || p.resource === '*'
      ) || permissions.some((p) => {
        // Check wildcard action for resource
        const [resource, action] = permissionName.split(':');
        return p.name === `${resource}:admin` || p.name === `${resource}:*`;
      })
    );
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Invalidate user permission cache
   */
  invalidateUserCache(userId: string): void {
    this.permissionCache.delete(userId);
  }

  /**
   * Invalidate cache for all users with a specific role
   */
  async invalidateRoleCache(roleId: string): Promise<void> {
    const userRoles = await prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    for (const { userId } of userRoles) {
      this.permissionCache.delete(userId);
    }
  }

  /**
   * Clear all permission caches
   */
  clearCache(): void {
    this.permissionCache.clear();
  }
}

// Export singleton instance
export const rbacService = new RBACService();
export default rbacService;
