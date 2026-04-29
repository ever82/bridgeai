/**
 * Socket.io Authentication Middleware
 *
 * Validates JWT tokens for Socket.io connections.
 * Implements connection limits per user.
 */
import type { Socket } from 'socket.io';
/**
 * Extended Socket type with user info
 */
export interface AuthenticatedSocket extends Socket {
    user?: {
        id: string;
        email: string;
        roles?: string[];
        permissions?: string[];
    };
}
/**
 * Socket.io authentication middleware
 * Implements JWT verification, permission checking, user association, and connection limits
 */
export declare function socketAuthMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void>;
/**
 * Optional authentication middleware (allows guest connections)
 */
export declare function optionalSocketAuthMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void>;
/**
 * Check if socket is authenticated
 */
export declare function isAuthenticated(socket: AuthenticatedSocket): boolean;
/**
 * Check if socket user has required permission
 */
export declare function hasPermission(socket: AuthenticatedSocket, permission: string): boolean;
/**
 * Check if socket user has required role
 */
export declare function hasRole(socket: AuthenticatedSocket, role: string): boolean;
declare const _default: {
    socketAuthMiddleware: typeof socketAuthMiddleware;
    optionalSocketAuthMiddleware: typeof optionalSocketAuthMiddleware;
    isAuthenticated: typeof isAuthenticated;
    hasPermission: typeof hasPermission;
    hasRole: typeof hasRole;
};
export default _default;
//# sourceMappingURL=auth.d.ts.map