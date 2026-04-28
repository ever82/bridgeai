/**
 * Default system roles
 */
export declare const DEFAULT_ROLES: {
    USER: {
        name: string;
        displayName: string;
        description: string;
        level: number;
        isSystem: boolean;
    };
    MODERATOR: {
        name: string;
        displayName: string;
        description: string;
        level: number;
        isSystem: boolean;
    };
    ADMIN: {
        name: string;
        displayName: string;
        description: string;
        level: number;
        isSystem: boolean;
    };
    SUPER_ADMIN: {
        name: string;
        displayName: string;
        description: string;
        level: number;
        isSystem: boolean;
    };
};
/**
 * Default system permissions
 */
export declare const DEFAULT_PERMISSIONS: {
    resource: string;
    action: string;
    name: string;
    description: string;
}[];
/**
 * Role-permission mappings for default roles
 */
export declare const DEFAULT_ROLE_PERMISSIONS: {
    user: string[];
    moderator: string[];
    admin: string[];
    super_admin: string[];
};
/**
 * RBAC Service
 */
export declare class RBACService {
    private permissionCache;
    private readonly CACHE_TTL;
    /**
     * Initialize default roles and permissions
     */
    initializeDefaults(): Promise<void>;
    /**
     * Get all roles
     */
    getAllRoles(): Promise<({
        _count: {
            users: number;
        };
        permissions: ({
            permission: {
                id: string;
                name: string;
                createdAt: Date;
                action: string;
                description: string | null;
                updatedAt: Date;
                resource: string;
            };
        } & {
            id: string;
            createdAt: Date;
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        level: number;
        displayName: string;
        description: string | null;
        updatedAt: Date;
        isSystem: boolean;
    })[]>;
    /**
     * Get role by ID
     */
    getRoleById(id: string): Promise<({
        permissions: ({
            permission: {
                id: string;
                name: string;
                createdAt: Date;
                action: string;
                description: string | null;
                updatedAt: Date;
                resource: string;
            };
        } & {
            id: string;
            createdAt: Date;
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        level: number;
        displayName: string;
        description: string | null;
        updatedAt: Date;
        isSystem: boolean;
    }) | null>;
    /**
     * Get role by name
     */
    getRoleByName(name: string): Promise<({
        permissions: ({
            permission: {
                id: string;
                name: string;
                createdAt: Date;
                action: string;
                description: string | null;
                updatedAt: Date;
                resource: string;
            };
        } & {
            id: string;
            createdAt: Date;
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        level: number;
        displayName: string;
        description: string | null;
        updatedAt: Date;
        isSystem: boolean;
    }) | null>;
    /**
     * Create a new role
     */
    createRole(data: {
        name: string;
        displayName: string;
        description?: string;
        level?: number;
        permissionIds?: string[];
    }, grantedBy?: string): Promise<({
        permissions: ({
            permission: {
                id: string;
                name: string;
                createdAt: Date;
                action: string;
                description: string | null;
                updatedAt: Date;
                resource: string;
            };
        } & {
            id: string;
            createdAt: Date;
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        level: number;
        displayName: string;
        description: string | null;
        updatedAt: Date;
        isSystem: boolean;
    }) | null>;
    /**
     * Update a role
     */
    updateRole(id: string, data: {
        displayName?: string;
        description?: string;
        level?: number;
        permissionIds?: string[];
    }, grantedBy?: string): Promise<({
        permissions: ({
            permission: {
                id: string;
                name: string;
                createdAt: Date;
                action: string;
                description: string | null;
                updatedAt: Date;
                resource: string;
            };
        } & {
            id: string;
            createdAt: Date;
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        level: number;
        displayName: string;
        description: string | null;
        updatedAt: Date;
        isSystem: boolean;
    }) | null>;
    /**
     * Delete a role (only non-system roles)
     */
    deleteRole(id: string, deletedBy?: string): Promise<void>;
    /**
     * Get all permissions
     */
    getAllPermissions(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        action: string;
        description: string | null;
        updatedAt: Date;
        resource: string;
    }[]>;
    /**
     * Get permission by ID
     */
    getPermissionById(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        action: string;
        description: string | null;
        updatedAt: Date;
        resource: string;
    } | null>;
    /**
     * Create a new permission
     */
    createPermission(data: {
        resource: string;
        action: string;
        name: string;
        description?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        action: string;
        description: string | null;
        updatedAt: Date;
        resource: string;
    }>;
    /**
     * Get user's roles
     */
    getUserRoles(userId: string): Promise<({
        role: {
            id: string;
            name: string;
            createdAt: Date;
            level: number;
            displayName: string;
            description: string | null;
            updatedAt: Date;
            isSystem: boolean;
        };
    } & {
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        roleId: string;
        grantedBy: string | null;
    })[]>;
    /**
     * Get user's permissions (with caching)
     */
    getUserPermissions(userId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        action: string;
        description: string | null;
        updatedAt: Date;
        resource: string;
    }[]>;
    /**
     * Assign role to user
     */
    assignRole(userId: string, roleId: string, grantedBy?: string, expiresAt?: Date): Promise<void>;
    /**
     * Remove role from user
     */
    removeRole(userId: string, roleId: string, removedBy?: string): Promise<void>;
    /**
     * Check if user has a specific role
     */
    hasRole(userId: string, roleName: string): Promise<boolean>;
    /**
     * Check if user has a specific permission
     */
    hasPermission(userId: string, permissionName: string): Promise<boolean>;
    /**
     * Invalidate user permission cache
     */
    invalidateUserCache(userId: string): void;
    /**
     * Invalidate cache for all users with a specific role
     */
    invalidateRoleCache(roleId: string): Promise<void>;
    /**
     * Clear all permission caches
     */
    clearCache(): void;
}
export declare const rbacService: RBACService;
export default rbacService;
//# sourceMappingURL=rbacService.d.ts.map