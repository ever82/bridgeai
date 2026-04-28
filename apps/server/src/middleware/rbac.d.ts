/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Provides role and permission-based access control for API endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
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
export declare function requireRole(...allowedRoles: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user has required permission
 */
export declare function requirePermission(...requiredPermissions: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Check if user has required role level (for hierarchical roles)
 */
export declare function requireRoleLevel(minLevel: number): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to load user roles and permissions into request
 * (non-blocking, for informational purposes)
 */
export declare function loadUserPermissions(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void>;
/**
 * Check resource ownership middleware
 * Verifies that the authenticated user owns the requested resource
 */
export declare function requireOwnership(getResourceOwnerId: (req: AuthenticatedRequest) => Promise<string | null>): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    requireRole: typeof requireRole;
    requirePermission: typeof requirePermission;
    requireRoleLevel: typeof requireRoleLevel;
    loadUserPermissions: typeof loadUserPermissions;
    requireOwnership: typeof requireOwnership;
};
export default _default;
//# sourceMappingURL=rbac.d.ts.map